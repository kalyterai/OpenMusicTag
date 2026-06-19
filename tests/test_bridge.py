# -*- coding: utf-8 -*-
"""GUI Bridge 业务逻辑测试（不依赖真实音频文件，不联网，不启动事件循环）。

覆盖 gui/bridge.py 中前后端契约相关的真实逻辑：
- _build_pipeline_order：GUI 开关 -> Pipeline 阶段裁剪
- _is_music_file：扩展名识别
- scan_directory：目录扫描返回子文件夹（含 fileCount）与文件
- get_music_file_details：读取真实标签
- get_default_config / get_common_directories：默认值契约
"""

import math
import os
import struct
import sys
import tempfile
import unittest
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", message="urllib3 v2 only supports OpenSSL")

# 必须在导入 PyQt6 之前设置无界面后端
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

# bridge.py 位于 gui/ 目录，导入它需要把 gui/ 加入 path
GUI_DIR = Path(__file__).resolve().parent.parent / "gui"
sys.path.insert(0, str(GUI_DIR))

from PyQt6.QtWidgets import QApplication  # noqa: E402
from mutagen.wave import WAVE  # noqa: E402
from mutagen.id3 import TIT2, TPE1  # noqa: E402

import bridge as bridge_module  # noqa: E402
from bridge import Bridge  # noqa: E402
from core.config import AppConfig  # noqa: E402


_app = None


def setUpModule():
    """整个模块共享一个 QApplication（QObject 子类需要它存在）。"""
    global _app
    _app = QApplication.instance() or QApplication(["test"])


def create_test_wav(path: Path, duration_seconds: float = 0.05) -> None:
    """生成一个极小的单声道 WAV，避免依赖用户音频文件。"""
    sample_rate = 8000
    frame_count = int(sample_rate * duration_seconds)
    frames = bytearray()
    for index in range(frame_count):
        sample = int(12000 * math.sin(2 * math.pi * 440 * index / sample_rate))
        frames.extend(struct.pack("<h", sample))
    data_size = len(frames)
    header = (
        b"RIFF" + struct.pack("<I", 36 + data_size) + b"WAVE"
        + b"fmt " + struct.pack("<IHHIIHH", 16, 1, 1, sample_rate,
                                sample_rate * 2, 2, 16)
        + b"data" + struct.pack("<I", data_size)
    )
    path.write_bytes(header + bytes(frames))


class BuildPipelineOrderTests(unittest.TestCase):
    def setUp(self):
        self.bridge = Bridge(window=None)

    def test_default_order_matches_app_config(self):
        self.assertEqual(self.bridge._build_pipeline_order({}), AppConfig._default_order())

    def test_disabling_stages_via_camel_case_flags(self):
        order = self.bridge._build_pipeline_order({
            "enableMetadataScrape": False,
            "enableCoverDownload": False,
        })
        self.assertNotIn("ScrapeMetadataStage", order)
        self.assertNotIn("DownloadCoverStage", order)
        # 未关闭的阶段仍保留
        self.assertIn("LoadStage", order)
        self.assertIn("WriteTagsStage", order)

    def test_disabling_stages_via_snake_case_flags(self):
        order = self.bridge._build_pipeline_order({
            "enable_duplicate_check": False,
            "enable_filename_parse": False,
        })
        self.assertNotIn("CheckDuplicateStage", order)
        self.assertNotIn("ExtractFromFilenameStage", order)


class IsMusicFileTests(unittest.TestCase):
    def setUp(self):
        self.bridge = Bridge(window=None)

    def test_recognizes_supported_extensions_case_insensitive(self):
        self.assertTrue(self.bridge._is_music_file("song.mp3"))
        self.assertTrue(self.bridge._is_music_file("SONG.FLAC"))
        self.assertTrue(self.bridge._is_music_file("a.M4A"))

    def test_rejects_non_music_files(self):
        self.assertFalse(self.bridge._is_music_file("cover.jpg"))
        self.assertFalse(self.bridge._is_music_file("readme.txt"))


class ScanDirectoryTests(unittest.TestCase):
    def setUp(self):
        self.bridge = Bridge(window=None)

    def test_returns_subfolders_with_counts_and_top_level_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            artist = root / "周杰伦"
            artist.mkdir()
            (artist / "晴天.mp3").write_bytes(b"")
            (artist / "封面.jpg").write_bytes(b"")  # 非音乐，不计数
            create_test_wav(root / "顶层歌曲.wav")

            result = self.bridge.scan_directory(str(root))

            self.assertEqual(len(result["subfolders"]), 1)
            folder = result["subfolders"][0]
            self.assertEqual(folder["name"], "周杰伦")
            self.assertEqual(folder["fileCount"], 1)

            file_names = {f["name"] for f in result["files"]}
            self.assertIn("顶层歌曲.wav", file_names)

    def test_missing_path_returns_empty(self):
        result = self.bridge.scan_directory("/path/does/not/exist/xyz")
        self.assertEqual(result, {"subfolders": [], "files": []})


class MusicFileDetailsTests(unittest.TestCase):
    def setUp(self):
        self.bridge = Bridge(window=None)

    def test_reads_real_tags_and_duration(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "test.wav"
            create_test_wav(path)
            audio = WAVE(path)
            audio.add_tags()
            audio.tags.add(TIT2(encoding=3, text="测试标题"))
            audio.tags.add(TPE1(encoding=3, text="测试艺人"))
            audio.save()

            details = self.bridge.get_music_file_details(str(path))

            self.assertEqual(details["title"], "测试标题")
            self.assertEqual(details["artist"], "测试艺人")
            # 契约：始终返回完整字段集
            for key in ("title", "artist", "album", "year", "genre", "track", "duration"):
                self.assertIn(key, details)

    def test_missing_file_returns_empty_dict(self):
        self.assertEqual(self.bridge.get_music_file_details("/no/such/file.mp3"), {})


class DefaultsContractTests(unittest.TestCase):
    def setUp(self):
        self.bridge = Bridge(window=None)

    def test_default_config_shape(self):
        cfg = self.bridge.get_default_config()
        self.assertEqual(cfg["threads"], 4)
        self.assertIn(".mp3", cfg["formats"])
        self.assertTrue(cfg["enableCoverDownload"])

    def test_common_directories_are_nonempty_strings(self):
        dirs = self.bridge.get_common_directories()
        self.assertIsInstance(dirs, list)
        self.assertGreater(len(dirs), 0)
        self.assertTrue(all(isinstance(d, str) for d in dirs))


class BridgeStorageReadTests(unittest.TestCase):
    """bridge 的持久化读取 slot：注入临时 Storage，避免触碰用户目录。"""

    def setUp(self):
        from core.storage import Storage
        self._tmp = tempfile.TemporaryDirectory()
        self.bridge = Bridge(window=None)
        # 注入测试用的临时数据库（绕过懒加载的真实路径）
        self.bridge._storage = Storage(Path(self._tmp.name) / "data.db")

    def tearDown(self):
        self.bridge._storage.close()
        self._tmp.cleanup()

    def test_dashboard_stats_reflect_recorded_data(self):
        storage = self.bridge._storage
        task_id = storage.create_task("/in", "/out")
        storage.add_song(task_id, "success", size_bytes=2048)
        storage.add_song(task_id, "failed")
        storage.finish_task(task_id, "completed", success=1, failed=1)

        stats = self.bridge.get_dashboard_stats()
        self.assertEqual(stats["total_songs"], 1)
        self.assertEqual(stats["failed"], 1)
        self.assertEqual(stats["pending_tasks"], 0)

    def test_recent_tasks_and_activity_shapes(self):
        storage = self.bridge._storage
        tid = storage.create_task("/music/abc", "/out")
        storage.add_song(tid, "success")

        recent = self.bridge.get_recent_tasks(5)
        self.assertEqual(len(recent), 1)
        self.assertEqual(recent[0]["input_path"], "/music/abc")

        activity = self.bridge.get_daily_activity(7)
        self.assertEqual(len(activity), 7)
        self.assertIn("weekday", activity[0])


if __name__ == "__main__":
    unittest.main()
