# OpenMusicTag — 工作交接文档（给 Codex 续作）

> 本文件是任务交接说明。阅读后请按「待办」继续，遵守「关键约束」。
> 最后更新：2026-06-19 · 分支 `feature/0.0.2`

---

## 1. 项目概览

桌面端音乐刮削/整理工具。

- **后端**：Python 管道（`core/` 包）。`PipelineStage` / `PipelineRegistry` / `PipelineContext` / `AudioFile` / `MusicOrganizerPipeline`，按配置动态组装多个 Stage（加载→提取标签→清洗→标准化歌手→查重→刮削元数据→合并→计算路径→复制→封面→写标签→清理）。
- **GUI**：PyQt6 + QtWebEngine + QWebChannel，桥接到 React 前端（Vite + zustand + Tailwind）。入口 `gui/launcher.py` → `gui/main.py` → `gui/bridge.py`（`Bridge`/`MainWindow`/`ProcessingWorker`）。
- **持久化**：标准库 `sqlite3`，封装在 `core/storage.py`。
- **CLI**：`organizer.py` 是 `core.pipeline.main` 的瘦包装。

目录关键文件：
```
core/storage.py            # SQLite DAL（本轮重写）
core/pipeline.py           # 管道；process_file 现返回 (output_path, skipped, metadata)
core/models.py             # AudioFile（final_metadata 是刮削后完整元数据 dict）
gui/bridge.py              # QWebChannel 暴露给前端的所有 slot/signal
gui/src/components/Layout/index.jsx   # 布局（本轮修了滚动）
gui/src/pages/*.jsx        # Dashboard/Home/Settings/Workflow/Files...
tests/                     # unittest（无 pytest）
gui/src/**/*.test.jsx      # Vitest
```

---

## 2. 关键约束（务必遵守）

1. **每次改动后 `git add` + `commit` + `push`**（用户硬性要求；按逻辑步骤分提交，勿一次塞多件事）。提交信息中文，结尾加：
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
2. **QWebChannel 类型**：暴露给前端的 `@pyqtSlot` / `pyqtSignal` **禁止用 Python `dict`**。
   - dict 返回用 `result='QVariantMap'`；list 返回用 `result=list`（已映射 QVariantList，安全）；
   - signal 用 `pyqtSignal('QVariantMap')`。
   - 用 `dict` → C++ `PyQt_PyObject` → QWebChannel 无法序列化 → 运行时 SIGABRT。
   - 回归测试守门：`tests/test_bridge.py::WebChannelTypeSafetyTests`。
3. **不要再用 pyobjc 操作 NSWindow 做自定义标题栏**：`objc.objc_object(c_void_p=int(self.winId()))` 在本机（PyQt6 / 系统 Python 3.9 / macOS 26）**SIGSEGV**，`try/except` 拦不住。已回退保留原生标题栏。若要重做无边框风格，必须**和用户一起逐版本跑**，且延迟执行（QTimer.singleShot）+ 校验指针，或用成熟库。
4. **本环境无法运行/看到 GUI**（WebEngine 离屏不执行页面 JS；无 `timeout` 命令）。前端改动只能写、不能验证 → 任何 GUI 行为需让用户 `python3 gui/launcher.py` 跑后反馈，迭代式推进。
5. **SQLite 限制**：无 `列 COMMENT '...'` 语法（列说明用 `--` 注释）；无 `ON UPDATE CURRENT_TIMESTAMP`（用 TRIGGER）；`ALTER ADD COLUMN` 不允许函数默认值（新列先 NULL 再回填）。
6. **测试运行**（无 pytest）：
   ```
   # Python（仓库根目录）
   QT_QPA_PLATFORM=offscreen python3 -m unittest tests.test_storage tests.test_pipeline tests.test_bridge
   # 前端（gui/ 目录）
   npm test          # vitest run
   npm run build     # 验证构建
   ```

---

## 3. 本轮已完成（已提交并 push）

提交（新→旧）：
- `7c232c8` 修复：主内容区 `overflow:hidden` 导致**所有长页面无法下滑**（设置页最明显）。改 `gui/src/components/Layout/index.jsx` 为 `overflowY:auto + minHeight:0`。
- `e6dfc93` **DB 大改 + 新增 bridge 接口**：
  - `tasks`/`songs` 两表加 `gmt_create` / `gmt_modified` 审计字段（`DEFAULT` + `AFTER UPDATE` 触发器自动刷新 `gmt_modified`）。
  - **去除外键**（`songs.task_id` 仅逻辑关联，移除 `REFERENCES` 与 `PRAGMA foreign_keys`）。
  - `songs` 加 `tags` 列（JSON 字符串），持久化 `AudioFile.final_metadata`；读取时自动 `json.loads` 成对象（空则 `{}`）。
  - 列说明改用 `--` 注释（SQLite 无 COMMENT）。
  - **旧库自动迁移** `Storage._migrate()`：`PRAGMA table_info` 检测缺列 → `ALTER ADD COLUMN` → 回填（用 `started_at`/`created_at` 近似）。不丢历史。
  - `core/pipeline.py`：`process_file` 返回值由 2 元组改 **3 元组** `(output_path, skipped, metadata)`；`_record_song` 增 `tags` 参；成功分支把 `final_metadata` 落库。
  - **新增 bridge slot**（见 §4），为待办的 #4/#5 前端铺好后端。

测试现状：Python 38 + 前端 14 全绿，build 通过。

---

## 4. 新增 / 现有 bridge 接口（前端可直接调）

`gui/bridge.py` 中 `Bridge` 暴露（JS 侧通过 QWebChannel 调用，均返回 Promise）：

仪表盘/任务（已被 Dashboard 使用）：
- `get_dashboard_stats()` → map：`{total_songs, success, failed, success_rate, total_bytes, total_tasks, pending_tasks}`
- `get_recent_tasks(limit)` → list[task]
- `get_daily_activity(days)` → list[`{date, weekday, count}`]

歌曲列表/详情（**本轮新增，前端尚未接**）：
- `get_songs(limit, offset, status)` → list[song]（`status` 传 `""` 表示全部）
- `count_songs(status)` → int
- `get_task_songs(task_id, limit, offset)` → list[song]
- `count_task_songs(task_id)` → int
- `get_song(song_id)` → map：单曲完整详情，`tags` 字段是解析后的元数据对象（含 year/genre/track 等刮削字段）

目录扫描（**本轮新增懒加载，前端尚未接**）：
- `scan_directory_lazy(path)` → `{subfolders:[{name,path,fileCount:-1}], files:[{name,path,ext}]}`（秒返回，不做逐目录计数）
- `count_folder_files(path)` → int（前端只对**可见的几个**目录按需调用）
- 旧的 `scan_directory(path)`（会逐目录计数，远端慢）仍在，逐步用懒加载替代。
- `get_music_file_details(file_path)` → map：直接从磁盘文件读 mutagen 标签（title/artist/album/year/genre/track/duration）。

> song 对象字段：`id, task_id, source_path, output_path, status, artist, album, title, tags(对象), bytes, created_at, gmt_create, gmt_modified`。

---

## 5. 待办（按优先级）

### A. #5 歌曲详情页（前端，需用户跑）
做一个展示**音乐文件详情**的页面 —— 这是软件的核心价值，要把常见音频字段、尤其**刮削常用字段**展示出来。
- 数据源：`get_song(id)`（DB 里已处理过的）或 `get_music_file_details(path)`（任意磁盘文件）。
- 展示字段：标题/歌手/专辑/年份/流派/音轨/时长/比特率 + `tags` 里的全部刮削字段 + 封面（若有）+ 源/输出路径 + 文件大小。
- 仓库里有孤儿组件 `gui/src/pages` 下的 `SongDetail.jsx`/`SongList.jsx`/`Files.jsx`（当前未挂载到侧边栏），可复用或重写；侧边栏菜单在 `gui/src/components/Layout/Sidebar.jsx` 的 `menuItems`。

### B. #4 远端文件夹懒加载 / 分页（前端，需用户跑）
远端目录慢，要**异步 + 一次只加载几个**，减轻读取压力、契合人眼一次只看几个。
- 用 `scan_directory_lazy` 先秒出列表，再对**当前视口可见的**子目录调 `count_folder_files` 懒补 `fileCount`（建议 IntersectionObserver 或可见区批量，一次几个）。
- DB 歌曲列表用 `get_songs` + `count_songs` 做滚动分页 / 「加载更多」。

### C. SQLite 第二阶段（后端，本环境可测）
- **标签库/字典页**（`gui/src/pages` 标签库 `tags`）当前是 mock；歌手别名、清洗规则目前硬编码在 `core/base.py`。需要建字典表 + CRUD slot，把规则改为可编辑。
- **历史页**未挂载到侧边栏（`get_recent_tasks` 已有数据）。

### D. 标题栏 #5（旧需求，谨慎）
用户想去掉突兀的原生 macOS 标题栏（Codex 风格无边框）。**已知 pyobjc 方案会 SIGSEGV**，见约束 3，必须和用户逐版本跑。

### E. 清理
孤儿组件 `Files.jsx` / `SongList.jsx` / `SongDetail.jsx`（无挂载页面引用）——若 A 不复用则可删。

---

## 6. 给用户的待确认项（交接时一并问）
1. `python3 gui/launcher.py` 能否正常启动（前两次崩溃：dict→QVariantMap、pyobjc 段错误，均已修）。
2. 设置页是否已能下滑。
确认后再开 A/B 的前端。
