# -*- coding: utf-8 -*-
"""SQLite 持久化层（core.storage.Storage）测试，使用临时数据库，不触碰用户目录。"""

import tempfile
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


class StorageLocationTests(unittest.TestCase):
    def test_default_data_dir_is_under_home(self):
        # 仅验证返回路径合理且可创建，不写入数据库
        d = default_data_dir()
        self.assertTrue(str(d).endswith("OpenMusicTag"))
        self.assertTrue(d.exists())


if __name__ == "__main__":
    unittest.main()
