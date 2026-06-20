# -*- coding: utf-8 -*-
"""SQLite 持久化层。

存储「任务历史」与「单曲处理结果」，为 Dashboard / 详情页 等页面提供真实数据。
实时运行态（进度/日志）仍走内存与信号，不进数据库。

设计要点：
- 单文件嵌入式数据库，零配置；位置在系统应用数据目录。
- WAL 模式 + 一把写锁，兼容「多线程处理 + 单线程汇总写入 + GUI 线程读取」。
- 写入点天然单线程（pipeline 的结果在 as_completed 主循环串行汇总）。
- 不使用外键约束（仅靠 task_id 逻辑关联），避免约束带来的写入/删除耦合。
- 每张表都带 gmt_create / gmt_modified 两个业务无关的审计字段：
  gmt_create 插入时落库，gmt_modified 由触发器在每次 UPDATE 时自动刷新。

注意：SQLite 不支持 MySQL 的 `列 COMMENT '...'` 语法，列说明只能用 -- 行注释；
gmt_modified 的「自动更新」也无 ON UPDATE 语法，需用 TRIGGER 实现。
"""

import json
import os
import platform
import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional


APP_NAME = "OpenMusicTag"

# 统一的本地时间表达式（ISO 'T' 格式，与 _now() 保持一致），用于 DEFAULT 与触发器
_TS_SQL = "strftime('%Y-%m-%dT%H:%M:%S','now','localtime')"


def default_data_dir() -> Path:
    """返回各平台的应用数据目录（不存在则创建）。"""
    system = platform.system()
    if system == "Darwin":
        base = Path.home() / "Library" / "Application Support" / APP_NAME
    elif system == "Windows":
        base = Path(os.environ.get("APPDATA") or Path.home()) / APP_NAME
    else:
        xdg = os.environ.get("XDG_DATA_HOME")
        base = (Path(xdg) if xdg else Path.home() / ".local" / "share") / APP_NAME
    base.mkdir(parents=True, exist_ok=True)
    return base


def default_db_path() -> Path:
    return default_data_dir() / "data.db"


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


# 说明：SQLite 无 COMMENT 语法，下面统一用 -- 注释描述每一列的业务含义。
_SCHEMA = f"""
-- 任务表：每一次「刮削/整理」批处理的汇总记录
CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,        -- 任务自增主键
    input_path   TEXT NOT NULL,                            -- 输入目录（可能是远端/网络路径）
    output_path  TEXT NOT NULL,                            -- 输出目录
    threads      INTEGER,                                  -- 并发线程数
    execution_config TEXT,                                 -- 本次执行配置（JSON 字符串）
    status       TEXT NOT NULL DEFAULT 'running',          -- 状态: running/completed/cancelled
    total        INTEGER DEFAULT 0,                        -- 扫描到的文件总数
    success      INTEGER DEFAULT 0,                        -- 成功处理数
    skipped      INTEGER DEFAULT 0,                        -- 跳过数（重复等）
    failed       INTEGER DEFAULT 0,                        -- 失败数
    bytes        INTEGER DEFAULT 0,                        -- 成功输出的总字节数
    started_at   TEXT NOT NULL,                            -- 业务：任务开始时间
    finished_at  TEXT,                                     -- 业务：任务结束时间
    duration_ms  INTEGER,                                  -- 业务：耗时（毫秒）
    log_path     TEXT,                                     -- 本次任务的详细日志文件（JSONL）路径
    gmt_create   TEXT NOT NULL DEFAULT ({_TS_SQL}),        -- 审计：记录创建时间（自动）
    gmt_modified TEXT NOT NULL DEFAULT ({_TS_SQL})         -- 审计：记录最后更新时间（触发器自动刷新）
);

-- 单曲表：每个音乐文件的处理结果与元数据快照
CREATE TABLE IF NOT EXISTS songs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,        -- 单曲自增主键
    task_id      INTEGER NOT NULL,                         -- 所属任务 id（逻辑关联，无外键约束）
    source_path  TEXT,                                     -- 源文件路径
    output_path  TEXT,                                     -- 输出文件路径
    status       TEXT NOT NULL,                            -- 结果: success/skipped/failed
    artist       TEXT,                                     -- 歌手（冗余，便于检索/排序）
    album        TEXT,                                     -- 专辑（冗余）
    title        TEXT,                                     -- 标题（冗余）
    tags         TEXT,                                     -- 完整标签元数据（JSON 字符串）
    bytes        INTEGER DEFAULT 0,                        -- 输出文件大小（字节）
    failed_stage TEXT,                                     -- 失败发生的环节名（成功/跳过为空）
    error_message TEXT,                                    -- 失败的错误摘要（成功/跳过为空）
    created_at   TEXT NOT NULL,                            -- 业务：处理完成时间
    gmt_create   TEXT NOT NULL DEFAULT ({_TS_SQL}),        -- 审计：记录创建时间（自动）
    gmt_modified TEXT NOT NULL DEFAULT ({_TS_SQL})         -- 审计：记录最后更新时间（触发器自动刷新）
);

CREATE INDEX IF NOT EXISTS idx_songs_task    ON songs(task_id);
CREATE INDEX IF NOT EXISTS idx_songs_artist  ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_status  ON songs(status);
CREATE INDEX IF NOT EXISTS idx_songs_created ON songs(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_started ON tasks(started_at);

-- 环节事件表：每首歌每个 pipeline 环节的执行结果，用于逐首排查 + 跨任务统计
CREATE TABLE IF NOT EXISTS song_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,        -- 事件自增主键
    task_id      INTEGER NOT NULL,                         -- 所属任务 id（逻辑关联）
    song_id      INTEGER,                                  -- 关联 songs.id（逻辑关联，可空）
    source_path  TEXT,                                     -- 源文件路径（冗余，便于无 join 排查）
    stage        TEXT NOT NULL,                            -- 环节名（PipelineStage.NAME）
    status       TEXT NOT NULL,                            -- 环节结果: ok/skipped/failed
    message      TEXT,                                     -- 错误或备注摘要
    duration_ms  INTEGER DEFAULT 0,                        -- 该环节耗时（毫秒）
    created_at   TEXT NOT NULL,                            -- 业务：事件记录时间
    gmt_create   TEXT NOT NULL DEFAULT ({_TS_SQL})         -- 审计：记录创建时间（自动）
);

CREATE INDEX IF NOT EXISTS idx_events_task         ON song_events(task_id);
CREATE INDEX IF NOT EXISTS idx_events_song         ON song_events(song_id);
CREATE INDEX IF NOT EXISTS idx_events_stage_status ON song_events(stage, status);

-- 艺人别名表：标签库中的广泛沉淀默认数据 + 用户自定义映射
CREATE TABLE IF NOT EXISTS artist_aliases (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,        -- 映射自增主键
    original     TEXT NOT NULL,                            -- 原始名称/别名
    standardized TEXT NOT NULL,                            -- 标准名称
    usage_count  INTEGER DEFAULT 0,                        -- 使用次数
    enabled      INTEGER NOT NULL DEFAULT 1,                -- 是否启用
    gmt_create   TEXT NOT NULL DEFAULT ({_TS_SQL}),        -- 审计：记录创建时间
    gmt_modified TEXT NOT NULL DEFAULT ({_TS_SQL})         -- 审计：记录最后更新时间
);

-- 清洗规则表：广告、乱码、版本后缀等文本替换规则
CREATE TABLE IF NOT EXISTS cleanup_rules (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,        -- 规则自增主键
    pattern      TEXT NOT NULL,                            -- 匹配模式
    replacement  TEXT DEFAULT '',                          -- 替换内容
    description  TEXT DEFAULT '',                          -- 规则说明
    enabled      INTEGER NOT NULL DEFAULT 1,                -- 是否启用
    gmt_create   TEXT NOT NULL DEFAULT ({_TS_SQL}),        -- 审计：记录创建时间
    gmt_modified TEXT NOT NULL DEFAULT ({_TS_SQL})         -- 审计：记录最后更新时间
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_alias_original ON artist_aliases(original);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cleanup_rule_pattern ON cleanup_rules(pattern);

-- 应用级设置表：保存语言、主题、上次资源库目录等全局偏好
CREATE TABLE IF NOT EXISTS app_settings (
    key          TEXT PRIMARY KEY,                          -- 设置键
    value        TEXT DEFAULT '',                           -- 设置值
    gmt_create   TEXT NOT NULL DEFAULT ({_TS_SQL}),         -- 审计：记录创建时间
    gmt_modified TEXT NOT NULL DEFAULT ({_TS_SQL})          -- 审计：记录最后更新时间
);

-- gmt_modified 自动刷新触发器（SQLite 无 ON UPDATE，靠 AFTER UPDATE 实现）
-- 默认 recursive_triggers=OFF，内部 UPDATE 不会再次触发本触发器，无递归。
CREATE TRIGGER IF NOT EXISTS trg_tasks_modified
AFTER UPDATE ON tasks FOR EACH ROW
BEGIN
    UPDATE tasks SET gmt_modified = {_TS_SQL} WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_songs_modified
AFTER UPDATE ON songs FOR EACH ROW
BEGIN
    UPDATE songs SET gmt_modified = {_TS_SQL} WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_artist_aliases_modified
AFTER UPDATE ON artist_aliases FOR EACH ROW
BEGIN
    UPDATE artist_aliases SET gmt_modified = {_TS_SQL} WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_cleanup_rules_modified
AFTER UPDATE ON cleanup_rules FOR EACH ROW
BEGIN
    UPDATE cleanup_rules SET gmt_modified = {_TS_SQL} WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_app_settings_modified
AFTER UPDATE ON app_settings FOR EACH ROW
BEGIN
    UPDATE app_settings SET gmt_modified = {_TS_SQL} WHERE key = OLD.key;
END;
"""

_DEFAULT_ARTIST_ALIASES = [
    ("G.E.M.", "邓紫棋", 42),
    ("GEM", "邓紫棋", 18),
    ("Jay Chou", "周杰伦", 128),
    ("Eason Chan", "陈奕迅", 86),
    ("JJ Lin", "林俊杰", 65),
    ("Mayday", "五月天", 54),
]

_DEFAULT_CLEANUP_RULES = [
    ("\\[mqms2\\]", "", "移除常见下载站标记", 1),
    ("www\\..*?\\.com", "", "移除网站广告", 1),
    ("QQ音乐", "", "移除平台标识", 1),
    ("酷狗音乐", "", "移除平台标识", 1),
    ("网易云音乐", "", "移除平台标识", 1),
    ("演唱会|演唱會", "", "移除演唱会后缀", 1),
    ("Live|LIVE", "", "移除 Live 标识", 1),
    ("\\s+", " ", "合并多余空白", 1),
]


class Storage:
    """任务/单曲结果的持久化访问层（线程安全）。"""

    def __init__(self, db_path: Optional[Any] = None):
        # 传 ":memory:" 可用于测试；默认落到应用数据目录
        if db_path is None:
            db_path = default_db_path()
        self.db_path = str(db_path)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._init_schema()
        self._migrate()

    def _init_schema(self) -> None:
        with self._lock:
            self._conn.executescript(_SCHEMA)
            self._conn.commit()

    def _migrate(self) -> None:
        """为升级前已存在的旧库补齐新增列并回填审计字段。"""
        with self._lock:
            def cols(table: str) -> set:
                rows = self._conn.execute(f"PRAGMA table_info({table})").fetchall()
                return {r["name"] for r in rows}

            task_cols = cols("tasks")
            song_cols = cols("songs")

            # ALTER ADD COLUMN 不允许函数默认值，新列先为 NULL，随后回填
            for table, existing in (("tasks", task_cols), ("songs", song_cols)):
                if not existing:
                    continue
                for col in ("gmt_create", "gmt_modified"):
                    if col not in existing:
                        self._conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} TEXT")
            if song_cols and "tags" not in song_cols:
                self._conn.execute("ALTER TABLE songs ADD COLUMN tags TEXT")
            if task_cols and "execution_config" not in task_cols:
                self._conn.execute("ALTER TABLE tasks ADD COLUMN execution_config TEXT")
            if song_cols and "failed_stage" not in song_cols:
                self._conn.execute("ALTER TABLE songs ADD COLUMN failed_stage TEXT")
            if song_cols and "error_message" not in song_cols:
                self._conn.execute("ALTER TABLE songs ADD COLUMN error_message TEXT")
            if task_cols and "log_path" not in task_cols:
                self._conn.execute("ALTER TABLE tasks ADD COLUMN log_path TEXT")

            # 回填旧数据的审计字段（用业务时间近似）
            self._conn.execute(
                "UPDATE tasks SET gmt_create = COALESCE(gmt_create, started_at),"
                " gmt_modified = COALESCE(gmt_modified, finished_at, started_at)"
                " WHERE gmt_create IS NULL OR gmt_modified IS NULL"
            )
            self._conn.execute(
                "UPDATE songs SET gmt_create = COALESCE(gmt_create, created_at),"
                " gmt_modified = COALESCE(gmt_modified, created_at)"
                " WHERE gmt_create IS NULL OR gmt_modified IS NULL"
            )
            self._conn.commit()
        self._seed_dictionary_defaults()

    def _seed_dictionary_defaults(self) -> None:
        """写入标签库默认数据；已存在则不覆盖用户修改。"""
        ts = _now()
        with self._lock:
            self._conn.executemany(
                "INSERT OR IGNORE INTO artist_aliases"
                " (original, standardized, usage_count, enabled, gmt_create, gmt_modified)"
                " VALUES (?, ?, ?, 1, ?, ?)",
                [(a, b, c, ts, ts) for a, b, c in _DEFAULT_ARTIST_ALIASES],
            )
            self._conn.executemany(
                "INSERT OR IGNORE INTO cleanup_rules"
                " (pattern, replacement, description, enabled, gmt_create, gmt_modified)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                [(p, r, d, e, ts, ts) for p, r, d, e in _DEFAULT_CLEANUP_RULES],
            )
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    # ========== 工具 ==========

    def get_setting(self, key: str, default: str = "") -> str:
        with self._lock:
            row = self._conn.execute(
                "SELECT value FROM app_settings WHERE key=?", (str(key),)
            ).fetchone()
        return str(row["value"]) if row and row["value"] is not None else default

    def set_setting(self, key: str, value: str) -> None:
        ts = _now()
        with self._lock:
            self._conn.execute(
                "INSERT INTO app_settings (key, value, gmt_create, gmt_modified)"
                " VALUES (?, ?, ?, ?)"
                " ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (str(key), str(value), ts, ts),
            )
            self._conn.commit()

    @staticmethod
    def _row_to_song(row: sqlite3.Row) -> Dict[str, Any]:
        """行转 dict，并把 tags JSON 字符串解析成对象。"""
        d = dict(row)
        raw = d.get("tags")
        if raw:
            try:
                d["tags"] = json.loads(raw)
            except (ValueError, TypeError):
                d["tags"] = {}
        else:
            d["tags"] = {}
        return d

    # ========== 写入 ==========

    @staticmethod
    def _row_to_task(row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        raw = d.get("execution_config")
        if raw:
            try:
                d["execution_config"] = json.loads(raw)
            except (ValueError, TypeError):
                d["execution_config"] = {}
        else:
            d["execution_config"] = {}
        return d

    def create_task(
        self,
        input_path: str,
        output_path: str,
        threads: int = 4,
        execution_config: Optional[Dict[str, Any]] = None,
    ) -> int:
        ts = _now()
        config_json = json.dumps(execution_config or {}, ensure_ascii=False)
        with self._lock:
            cur = self._conn.execute(
                "INSERT INTO tasks (input_path, output_path, threads, execution_config, status,"
                " started_at, gmt_create, gmt_modified)"
                " VALUES (?, ?, ?, ?, 'running', ?, ?, ?)",
                (str(input_path), str(output_path), int(threads), config_json, ts, ts, ts),
            )
            self._conn.commit()
            return cur.lastrowid

    def add_song(
        self,
        task_id: int,
        status: str,
        source_path: str = "",
        output_path: str = "",
        artist: str = "",
        album: str = "",
        title: str = "",
        tags: Optional[Dict[str, Any]] = None,
        size_bytes: int = 0,
        failed_stage: str = "",
        error_message: str = "",
    ) -> int:
        tags_json = json.dumps(tags, ensure_ascii=False) if tags else None
        ts = _now()
        with self._lock:
            cur = self._conn.execute(
                "INSERT INTO songs (task_id, source_path, output_path, status, artist,"
                " album, title, tags, bytes, failed_stage, error_message,"
                " created_at, gmt_create, gmt_modified)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (task_id, str(source_path), str(output_path), status, artist or "",
                 album or "", title or "", tags_json, int(size_bytes or 0),
                 failed_stage or None, error_message or None,
                 ts, ts, ts),
            )
            self._conn.commit()
            return cur.lastrowid

    def add_song_events(
        self,
        task_id: int,
        events: List[Dict[str, Any]],
        song_id: Optional[int] = None,
        source_path: str = "",
    ) -> None:
        """批量写入某首歌的环节事件（一次 executemany，避免逐条提交的写放大）。

        ``events`` 每项形如 ``{"stage": str, "status": str, "message": str,
        "duration_ms": int}``。
        """
        if not events:
            return
        ts = _now()
        rows = [
            (
                int(task_id),
                int(song_id) if song_id else None,
                str(source_path),
                str(e.get("stage", "")),
                str(e.get("status", "")),
                (e.get("message") or None),
                int(e.get("duration_ms", 0) or 0),
                ts,
                ts,
            )
            for e in events
        ]
        with self._lock:
            self._conn.executemany(
                "INSERT INTO song_events (task_id, song_id, source_path, stage, status,"
                " message, duration_ms, created_at, gmt_create)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rows,
            )
            self._conn.commit()

    def set_task_log_path(self, task_id: int, log_path: str) -> None:
        with self._lock:
            self._conn.execute(
                "UPDATE tasks SET log_path=? WHERE id=?", (str(log_path), int(task_id))
            )
            self._conn.commit()

    def finish_task(
        self,
        task_id: int,
        status: str,
        total: int = 0,
        success: int = 0,
        skipped: int = 0,
        failed: int = 0,
        size_bytes: int = 0,
        duration_ms: int = 0,
    ) -> None:
        # gmt_modified 由触发器自动刷新，这里不手动设置
        with self._lock:
            self._conn.execute(
                "UPDATE tasks SET status=?, total=?, success=?, skipped=?, failed=?,"
                " bytes=?, finished_at=?, duration_ms=? WHERE id=?",
                (status, int(total), int(success), int(skipped), int(failed),
                 int(size_bytes), _now(), int(duration_ms), task_id),
            )
            self._conn.commit()

    # ========== 读取 ==========

    def get_recent_tasks(self, limit: int = 10) -> List[Dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM tasks ORDER BY id DESC LIMIT ?", (int(limit),)
            ).fetchall()
        return [self._row_to_task(r) for r in rows]

    def get_task(self, task_id: int) -> Optional[Dict[str, Any]]:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM tasks WHERE id=?", (int(task_id),)
            ).fetchone()
        return self._row_to_task(row) if row else None

    def get_task_songs(
        self, task_id: int, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """分页获取某任务的单曲（默认每页 50，支持远端慢加载场景的增量拉取）。"""
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM songs WHERE task_id=? ORDER BY id DESC LIMIT ? OFFSET ?",
                (int(task_id), int(limit), int(offset)),
            ).fetchall()
        return [self._row_to_song(r) for r in rows]

    def get_task_events(
        self, task_id: int, status: Optional[str] = None, limit: int = 2000
    ) -> List[Dict[str, Any]]:
        """获取某任务的环节事件（可选只看某状态，如 ``failed``），用于逐首排查。"""
        sql = "SELECT * FROM song_events WHERE task_id=?"
        params: List[Any] = [int(task_id)]
        if status:
            sql += " AND status=?"
            params.append(str(status))
        sql += " ORDER BY song_id, id LIMIT ?"
        params.append(int(limit))
        with self._lock:
            rows = self._conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]

    def get_stage_failure_stats(
        self, task_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """按环节汇总各状态计数：用于「哪个环节最容易失败」的跨任务（或单任务）统计。

        返回每个环节一行：``{stage, total, ok, skipped, failed}``，按 failed 降序。
        """
        where = "WHERE task_id=?" if task_id else ""
        params: List[Any] = [int(task_id)] if task_id else []
        with self._lock:
            rows = self._conn.execute(
                f"SELECT stage,"
                f" COUNT(*) AS total,"
                f" SUM(CASE WHEN status='ok' THEN 1 ELSE 0 END) AS ok,"
                f" SUM(CASE WHEN status='skipped' THEN 1 ELSE 0 END) AS skipped,"
                f" SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed"
                f" FROM song_events {where}"
                f" GROUP BY stage ORDER BY failed DESC, total DESC",
                params,
            ).fetchall()
        return [dict(r) for r in rows]

    def count_task_songs(self, task_id: int) -> int:
        with self._lock:
            row = self._conn.execute(
                "SELECT COUNT(*) AS c FROM songs WHERE task_id=?", (int(task_id),)
            ).fetchone()
        return row["c"] if row else 0

    def get_songs(
        self, limit: int = 20, offset: int = 0, status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """全局分页获取单曲（可按 status 过滤），用于资源库/歌曲列表的增量加载。"""
        sql = "SELECT * FROM songs"
        params: List[Any] = []
        if status:
            sql += " WHERE status=?"
            params.append(status)
        sql += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([int(limit), int(offset)])
        with self._lock:
            rows = self._conn.execute(sql, tuple(params)).fetchall()
        return [self._row_to_song(r) for r in rows]

    def count_songs(self, status: Optional[str] = None) -> int:
        sql = "SELECT COUNT(*) AS c FROM songs"
        params: List[Any] = []
        if status:
            sql += " WHERE status=?"
            params.append(status)
        with self._lock:
            row = self._conn.execute(sql, tuple(params)).fetchone()
        return row["c"] if row else 0

    def get_song(self, song_id: int) -> Optional[Dict[str, Any]]:
        """获取单曲完整详情（含解析后的 tags 元数据），用于歌曲详情页。"""
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM songs WHERE id=?", (int(song_id),)
            ).fetchone()
        return self._row_to_song(row) if row else None

    def get_dashboard_stats(self) -> Dict[str, Any]:
        with self._lock:
            song_row = self._conn.execute(
                "SELECT"
                " SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) AS success,"
                " SUM(CASE WHEN status='failed'  THEN 1 ELSE 0 END) AS failed,"
                " COALESCE(SUM(CASE WHEN status='success' THEN bytes ELSE 0 END), 0)"
                " AS total_bytes"
                " FROM songs"
            ).fetchone()
            task_row = self._conn.execute(
                "SELECT"
                " COUNT(*) AS total_tasks,"
                " SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) AS pending_tasks"
                " FROM tasks"
            ).fetchone()

        success = song_row["success"] or 0
        failed = song_row["failed"] or 0
        processed = success + failed
        success_rate = round(success / processed * 100, 1) if processed else 0.0
        return {
            "total_songs": success,
            "success": success,
            "failed": failed,
            "success_rate": success_rate,
            "total_bytes": song_row["total_bytes"] or 0,
            "total_tasks": task_row["total_tasks"] or 0,
            "pending_tasks": task_row["pending_tasks"] or 0,
        }

    def get_daily_activity(self, days: int = 7) -> List[Dict[str, Any]]:
        """返回最近 ``days`` 天每天成功处理的歌曲数，按时间升序。

        每项形如 ``{"date": "2026-06-19", "weekday": "Thu", "count": 12}``。
        """
        today = datetime.now().date()
        start = today - timedelta(days=days - 1)
        with self._lock:
            rows = self._conn.execute(
                "SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count"
                " FROM songs WHERE status='success' AND substr(created_at, 1, 10) >= ?"
                " GROUP BY day",
                (start.isoformat(),),
            ).fetchall()
        counts = {r["day"]: r["count"] for r in rows}
        result = []
        for i in range(days):
            d = start + timedelta(days=i)
            iso = d.isoformat()
            result.append({
                "date": iso,
                "weekday": d.strftime("%a"),
                "count": counts.get(iso, 0),
            })
        return result

    # ========== 标签库 ==========

    @staticmethod
    def _row_to_rule(row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        d["enabled"] = bool(d.get("enabled"))
        return d

    def list_artist_aliases(self) -> List[Dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM artist_aliases ORDER BY usage_count DESC, id DESC"
            ).fetchall()
        return [self._row_to_rule(r) for r in rows]

    def add_artist_alias(self, original: str, standardized: str) -> int:
        ts = _now()
        with self._lock:
            cur = self._conn.execute(
                "INSERT INTO artist_aliases"
                " (original, standardized, usage_count, enabled, gmt_create, gmt_modified)"
                " VALUES (?, ?, 0, 1, ?, ?)",
                (original.strip(), standardized.strip(), ts, ts),
            )
            self._conn.commit()
            return cur.lastrowid

    def update_artist_alias(self, alias_id: int, original: str, standardized: str,
                            enabled: bool = True) -> None:
        with self._lock:
            self._conn.execute(
                "UPDATE artist_aliases SET original=?, standardized=?, enabled=? WHERE id=?",
                (original.strip(), standardized.strip(), 1 if enabled else 0, int(alias_id)),
            )
            self._conn.commit()

    def delete_artist_alias(self, alias_id: int) -> None:
        with self._lock:
            self._conn.execute("DELETE FROM artist_aliases WHERE id=?", (int(alias_id),))
            self._conn.commit()

    def list_cleanup_rules(self) -> List[Dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM cleanup_rules ORDER BY enabled DESC, id DESC"
            ).fetchall()
        return [self._row_to_rule(r) for r in rows]

    def add_cleanup_rule(self, pattern: str, replacement: str = "",
                         description: str = "", enabled: bool = True) -> int:
        ts = _now()
        with self._lock:
            cur = self._conn.execute(
                "INSERT INTO cleanup_rules"
                " (pattern, replacement, description, enabled, gmt_create, gmt_modified)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (pattern.strip(), replacement or "", description or "",
                 1 if enabled else 0, ts, ts),
            )
            self._conn.commit()
            return cur.lastrowid

    def update_cleanup_rule(self, rule_id: int, pattern: str, replacement: str = "",
                            description: str = "", enabled: bool = True) -> None:
        with self._lock:
            self._conn.execute(
                "UPDATE cleanup_rules SET pattern=?, replacement=?, description=?, enabled=?"
                " WHERE id=?",
                (pattern.strip(), replacement or "", description or "",
                 1 if enabled else 0, int(rule_id)),
            )
            self._conn.commit()

    def delete_cleanup_rule(self, rule_id: int) -> None:
        with self._lock:
            self._conn.execute("DELETE FROM cleanup_rules WHERE id=?", (int(rule_id),))
            self._conn.commit()
