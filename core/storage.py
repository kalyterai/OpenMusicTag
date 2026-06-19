# -*- coding: utf-8 -*-
"""SQLite 持久化层。

存储「任务历史」与「单曲处理结果」，为 Dashboard / History 等页面提供真实数据。
实时运行态（进度/日志）仍走内存与信号，不进数据库。

设计要点：
- 单文件嵌入式数据库，零配置；位置在系统应用数据目录。
- WAL 模式 + 一把写锁，兼容「多线程处理 + 单线程汇总写入 + GUI 线程读取」。
- 写入点天然单线程（pipeline 的结果在 as_completed 主循环串行汇总）。
"""

import os
import platform
import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional


APP_NAME = "OpenMusicTag"


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


_SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    input_path  TEXT NOT NULL,
    output_path TEXT NOT NULL,
    threads     INTEGER,
    status      TEXT NOT NULL DEFAULT 'running',
    total       INTEGER DEFAULT 0,
    success     INTEGER DEFAULT 0,
    skipped     INTEGER DEFAULT 0,
    failed      INTEGER DEFAULT 0,
    bytes       INTEGER DEFAULT 0,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS songs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    source_path TEXT,
    output_path TEXT,
    status      TEXT NOT NULL,
    artist      TEXT,
    album       TEXT,
    title       TEXT,
    bytes       INTEGER DEFAULT 0,
    created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_songs_task   ON songs(task_id);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_status ON songs(status);
CREATE INDEX IF NOT EXISTS idx_tasks_started ON tasks(started_at);
"""


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
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock:
            self._conn.executescript(_SCHEMA)
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    # ========== 写入 ==========

    def create_task(self, input_path: str, output_path: str, threads: int = 4) -> int:
        with self._lock:
            cur = self._conn.execute(
                "INSERT INTO tasks (input_path, output_path, threads, status, started_at)"
                " VALUES (?, ?, ?, 'running', ?)",
                (str(input_path), str(output_path), int(threads), _now()),
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
        size_bytes: int = 0,
    ) -> int:
        with self._lock:
            cur = self._conn.execute(
                "INSERT INTO songs (task_id, source_path, output_path, status, artist,"
                " album, title, bytes, created_at)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (task_id, str(source_path), str(output_path), status, artist or "",
                 album or "", title or "", int(size_bytes or 0), _now()),
            )
            self._conn.commit()
            return cur.lastrowid

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
        return [dict(r) for r in rows]

    def get_task_songs(self, task_id: int, limit: int = 500) -> List[Dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM songs WHERE task_id=? ORDER BY id DESC LIMIT ?",
                (int(task_id), int(limit)),
            ).fetchall()
        return [dict(r) for r in rows]

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
