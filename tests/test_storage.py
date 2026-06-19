# -*- coding: utf-8 -*-
"""SQLite 持久化层（core.storage.Storage）测试，使用临时数据库，不触碰用户目录。"""

import sqlite3
import tempfile
import time
import unittest
from datetime import datetime
from pathlib import Path

from core.storage import Storage, default_data_dir


class StorageTaskSongTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.storage = Storage(Path(self._tmp.name) / "test.db")

    def tearDown(self):
        self.storage.close()
        self._tmp.cleanup()

    def test_create_task_and_record_songs(self):
        task_id = self.storage.create_task("/in", "/out", threads=4)
        self.assertIsInstance(task_id, int)

        self.storage.add_song(task_id, "success", source_path="/in/a.mp3",
                              output_path="/out/a.mp3", artist="周杰伦",
                              title="晴天", album="叶惠美", size_bytes=1000)
        self.storage.add_song(task_id, "failed", source_path="/in/b.mp3")
        self.storage.add_song(task_id, "skipped", source_path="/in/c.mp3")

        songs = self.storage.get_task_songs(task_id)
        self.assertEqual(len(songs), 3)
        statuses = {s["status"] for s in songs}
        self.assertEqual(statuses, {"success", "failed", "skipped"})

    def test_finish_task_updates_summary(self):
        task_id = self.storage.create_task("/in", "/out")
        self.storage.finish_task(task_id, "completed", total=10, success=8,
                                 skipped=1, failed=1, size_bytes=5000, duration_ms=1234)
        task = self.storage.get_recent_tasks(1)[0]
        self.assertEqual(task["status"], "completed")
        self.assertEqual(task["success"], 8)
        self.assertEqual(task["duration_ms"], 1234)
        self.assertIsNotNone(task["finished_at"])

    def test_dashboard_stats_aggregates_across_tasks(self):
        t1 = self.storage.create_task("/in1", "/out")
        self.storage.add_song(t1, "success", size_bytes=1000)
        self.storage.add_song(t1, "success", size_bytes=2000)
        self.storage.add_song(t1, "failed")
        self.storage.finish_task(t1, "completed", success=2, failed=1)

        # 一个仍在运行的任务
        self.storage.create_task("/in2", "/out")

        stats = self.storage.get_dashboard_stats()
        self.assertEqual(stats["total_songs"], 2)
        self.assertEqual(stats["failed"], 1)
        self.assertEqual(stats["total_bytes"], 3000)
        self.assertEqual(stats["success_rate"], round(2 / 3 * 100, 1))
        self.assertEqual(stats["total_tasks"], 2)
        self.assertEqual(stats["pending_tasks"], 1)

    def test_dashboard_stats_empty_db(self):
        stats = self.storage.get_dashboard_stats()
        self.assertEqual(stats["total_songs"], 0)
        self.assertEqual(stats["success_rate"], 0.0)
        self.assertEqual(stats["total_bytes"], 0)

    def test_daily_activity_returns_full_window(self):
        task_id = self.storage.create_task("/in", "/out")
        self.storage.add_song(task_id, "success")
        self.storage.add_song(task_id, "success")

        activity = self.storage.get_daily_activity(days=7)
        self.assertEqual(len(activity), 7)
        # 每项含 date/weekday/count
        for item in activity:
            self.assertIn("date", item)
            self.assertIn("weekday", item)
            self.assertIn("count", item)
        # 今天应当计入 2 首
        today = datetime.now().date().isoformat()
        today_item = next(i for i in activity if i["date"] == today)
        self.assertEqual(today_item["count"], 2)

    def test_recent_tasks_ordered_desc(self):
        for i in range(3):
            self.storage.create_task(f"/in/{i}", "/out")
        recent = self.storage.get_recent_tasks(10)
        self.assertEqual(recent[0]["input_path"], "/in/2")
        self.assertEqual(recent[-1]["input_path"], "/in/0")


class StorageTagsAndDetailTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.storage = Storage(Path(self._tmp.name) / "test.db")

    def tearDown(self):
        self.storage.close()
        self._tmp.cleanup()

    def test_tags_round_trip_as_dict(self):
        task_id = self.storage.create_task("/in", "/out")
        meta = {"title": "晴天", "artist": "周杰伦", "year": "2003",
                "genre": "Pop", "track": "9"}
        sid = self.storage.add_song(task_id, "success", source_path="/in/a.mp3",
                                    title="晴天", artist="周杰伦", tags=meta)
        song = self.storage.get_song(sid)
        self.assertIsNotNone(song)
        self.assertEqual(song["tags"], meta)
        self.assertEqual(song["tags"]["year"], "2003")

    def test_empty_tags_parsed_as_empty_dict(self):
        task_id = self.storage.create_task("/in", "/out")
        sid = self.storage.add_song(task_id, "failed", source_path="/in/b.mp3")
        song = self.storage.get_song(sid)
        self.assertEqual(song["tags"], {})

    def test_get_song_missing_returns_none(self):
        self.assertIsNone(self.storage.get_song(99999))

    def test_pagination_offset_and_count(self):
        task_id = self.storage.create_task("/in", "/out")
        for i in range(5):
            self.storage.add_song(task_id, "success", source_path=f"/in/{i}.mp3")
        self.assertEqual(self.storage.count_task_songs(task_id), 5)
        page1 = self.storage.get_task_songs(task_id, limit=2, offset=0)
        page2 = self.storage.get_task_songs(task_id, limit=2, offset=2)
        self.assertEqual(len(page1), 2)
        self.assertEqual(len(page2), 2)
        # 无重叠（按 id DESC，page1 应是最新两条）
        self.assertNotEqual(page1[0]["id"], page2[0]["id"])

    def test_get_songs_filter_by_status(self):
        task_id = self.storage.create_task("/in", "/out")
        self.storage.add_song(task_id, "success")
        self.storage.add_song(task_id, "success")
        self.storage.add_song(task_id, "failed")
        self.assertEqual(self.storage.count_songs(), 3)
        self.assertEqual(self.storage.count_songs(status="success"), 2)
        self.assertEqual(len(self.storage.get_songs(status="failed")), 1)


class StorageAuditFieldsTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.storage = Storage(Path(self._tmp.name) / "test.db")

    def tearDown(self):
        self.storage.close()
        self._tmp.cleanup()

    def test_gmt_create_set_on_insert(self):
        task_id = self.storage.create_task("/in", "/out")
        task = self.storage.get_recent_tasks(1)[0]
        self.assertTrue(task["gmt_create"])
        self.assertTrue(task["gmt_modified"])

    def test_gmt_modified_bumped_by_trigger_on_update(self):
        task_id = self.storage.create_task("/in", "/out")
        before = self.storage.get_recent_tasks(1)[0]["gmt_modified"]
        time.sleep(1.1)  # ISO 精确到秒，需跨秒才能观测变化
        self.storage.finish_task(task_id, "completed", total=1, success=1)
        after = self.storage.get_recent_tasks(1)[0]["gmt_modified"]
        self.assertGreater(after, before)


class StorageMigrationTests(unittest.TestCase):
    """旧库（无 gmt_* / tags、带外键）升级后应被平滑迁移。"""

    def test_migrates_legacy_schema(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = Path(tmp) / "legacy.db"
            # 构造旧版表结构
            conn = sqlite3.connect(db)
            conn.executescript(
                "CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT,"
                " input_path TEXT NOT NULL, output_path TEXT NOT NULL, threads INTEGER,"
                " status TEXT, total INTEGER, success INTEGER, skipped INTEGER,"
                " failed INTEGER, bytes INTEGER, started_at TEXT, finished_at TEXT,"
                " duration_ms INTEGER);"
                "CREATE TABLE songs (id INTEGER PRIMARY KEY AUTOINCREMENT,"
                " task_id INTEGER NOT NULL, source_path TEXT, output_path TEXT,"
                " status TEXT, artist TEXT, album TEXT, title TEXT, bytes INTEGER,"
                " created_at TEXT);"
            )
            conn.execute(
                "INSERT INTO tasks (input_path, output_path, status, started_at)"
                " VALUES ('/in', '/out', 'completed', '2026-06-01T10:00:00')"
            )
            conn.execute(
                "INSERT INTO songs (task_id, status, created_at)"
                " VALUES (1, 'success', '2026-06-01T10:00:05')"
            )
            conn.commit()
            conn.close()

            # 用新版 Storage 打开，应自动迁移
            storage = Storage(db)
            task = storage.get_recent_tasks(1)[0]
            # 新列存在且旧行被回填
            self.assertEqual(task["gmt_create"], "2026-06-01T10:00:00")
            song = storage.get_task_songs(1)[0]
            self.assertEqual(song["gmt_create"], "2026-06-01T10:00:05")
            self.assertEqual(song["tags"], {})
            # 迁移后仍可正常写入带 tags 的新数据
            sid = storage.add_song(1, "success", tags={"title": "x"})
            self.assertEqual(storage.get_song(sid)["tags"], {"title": "x"})
            storage.close()


class StorageLocationTests(unittest.TestCase):
    def test_default_data_dir_is_under_home(self):
        # 仅验证返回路径合理且可创建，不写入数据库
        d = default_data_dir()
        self.assertTrue(str(d).endswith("OpenMusicTag"))
        self.assertTrue(d.exists())


if __name__ == "__main__":
    unittest.main()
