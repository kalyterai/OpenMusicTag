# -*- coding: utf-8 -*-
"""Tests for the music organizer pipeline using generated test files only."""

import contextlib
import io
import math
import struct
import tempfile
import unittest
import warnings
from pathlib import Path

warnings.filterwarnings(
    "ignore",
    message="urllib3 v2 only supports OpenSSL",
)

from mutagen.wave import WAVE

from core.config import AppConfig
from core.context import PipelineContext
from core.models import AudioFile
from core.pipeline import MusicOrganizerPipeline
from core.pipelines.check_duplicate_stage import CheckDuplicateStage
from core.pipelines.clean_tags_stage import CleanRawTagsStage
from core.pipelines.normalize_artist_stage import NormalizeArtistStage
from core.pipelines.scrape_metadata_stage import ScrapeMetadataStage


def create_test_wav(path: Path, duration_seconds: float = 0.05) -> None:
    """Create a tiny mono WAV file so tests never depend on user audio files."""
    sample_rate = 8000
    frame_count = int(sample_rate * duration_seconds)
    channel_count = 1
    bits_per_sample = 16
    byte_rate = sample_rate * channel_count * bits_per_sample // 8
    block_align = channel_count * bits_per_sample // 8

    frames = bytearray()
    for index in range(frame_count):
        sample = int(12000 * math.sin(2 * math.pi * 440 * index / sample_rate))
        frames.extend(struct.pack("<h", sample))

    data_size = len(frames)
    riff_size = 36 + data_size
    header = (
        b"RIFF"
        + struct.pack("<I", riff_size)
        + b"WAVE"
        + b"fmt "
        + struct.pack("<IHHIIHH", 16, 1, channel_count, sample_rate, byte_rate, block_align, bits_per_sample)
        + b"data"
        + struct.pack("<I", data_size)
    )

    path.write_bytes(header + bytes(frames))


class PipelineTextAndConfigTests(unittest.TestCase):
    def test_config_round_trip_and_supported_formats_are_normalized(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            config_path = tmp_path / "pipeline_config.json"
            config = AppConfig(
                input_path=tmp_path / "input",
                output_path=tmp_path / "output",
                threads=2,
                pipeline_order=["LoadStage"],
                stage_config={"LoadStage": {"supported_formats": [".WAV", ".MP3"]}},
            )

            config.to_json(config_path)
            loaded = AppConfig.from_json(config_path)

            self.assertEqual(loaded.input_path, tmp_path / "input")
            self.assertEqual(loaded.output_path, tmp_path / "output")
            self.assertEqual(loaded.threads, 2)
            self.assertEqual(loaded.pipeline_order, ["LoadStage"])
            self.assertEqual(loaded.get_supported_formats(), (".wav", ".mp3"))

    def test_clean_tags_converts_traditional_chinese_and_removes_ads(self):
        audio_file = AudioFile(path=Path("unused.wav"), ext=".wav")
        audio_file.raw_tags = {
            "title": "喜歡你 [下载广告] www.example.com",
            "artist": "G.E.M. 鄧紫棋",
            "album": "精選輯",
        }

        cleaned = CleanRawTagsStage().process(audio_file, context=None)

        self.assertEqual(cleaned.raw_tags["title"], "喜欢你")
        self.assertEqual(cleaned.raw_tags["artist"], "G.E.M. 邓紫棋")
        self.assertEqual(cleaned.raw_tags["album"], "精选辑")

    def test_normalize_artist_removes_gem_alias_and_keeps_collaboration(self):
        audio_file = AudioFile(path=Path("unused.wav"), ext=".wav")
        audio_file.raw_tags = {
            "artist": "G.E.M. 邓紫棋 & 周杰伦",
            "albumartist": "G.E.M. 邓紫棋",
            "album": "测试\uE000专辑",
        }

        normalized = NormalizeArtistStage().process(audio_file, context=None)

        self.assertEqual(normalized.raw_tags["artist"], "邓紫棋 & 周杰伦")
        self.assertEqual(normalized.raw_tags["albumartist"], "邓紫棋")
        self.assertEqual(normalized.raw_tags["album"], "测试专辑")

    def test_parse_filename_supports_common_patterns(self):
        config = AppConfig(input_path=Path("input"), output_path=Path("output"))
        context = PipelineContext(config)

        self.assertEqual(
            context.parse_filename("测试歌手 - 测试歌曲.wav"),
            {"artist": "测试歌手", "title": "测试歌曲"},
        )
        self.assertEqual(
            context.parse_filename("[测试歌手] 测试歌曲.flac"),
            {"artist": "测试歌手", "title": "测试歌曲"},
        )
        self.assertEqual(
            context.parse_filename("无分隔文件名.wav"),
            {"artist": "Unknown Artist", "title": "无分隔文件名"},
        )


class PipelineStageBehaviorTests(unittest.TestCase):
    def test_duplicate_stage_stops_pipeline_when_target_already_exists(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            output_path = tmp_path / "organized"
            existing_path = output_path / "测试歌手" / "测试专辑" / "测试歌手 - 测试歌曲.wav"
            existing_path.parent.mkdir(parents=True)
            existing_path.write_bytes(b"already here")

            config = AppConfig(input_path=tmp_path / "input", output_path=output_path)
            context = PipelineContext(config)
            audio_file = AudioFile(path=tmp_path / "测试歌曲.wav", ext=".wav")
            audio_file.raw_tags = {
                "artist": "测试歌手",
                "album": "测试专辑",
                "title": "测试歌曲",
            }

            with contextlib.redirect_stdout(io.StringIO()):
                CheckDuplicateStage().process(audio_file, context)

            self.assertFalse(context.should_continue())

    def test_scrape_metadata_stage_uses_fake_client_without_network(self):
        class FakeMusicBrainzClient:
            def search_with_album(self, title, artist, album):
                return {}

            def search(self, title, artist):
                return {
                    "recording-list": [
                        {
                            "title": title,
                            "artist-credit-phrase": artist,
                            "ext:score": "99",
                            "release-list": [
                                {
                                    "id": "release-1",
                                    "title": "测试专辑",
                                    "status": "Official",
                                    "date": "2024-05-01",
                                    "release-group": {"primary-type": "Album"},
                                }
                            ],
                        }
                    ]
                }

            def get_cover_art(self, release_id):
                return None

        config = AppConfig(input_path=Path("input"), output_path=Path("output"))
        context = PipelineContext(config)
        audio_file = AudioFile(path=Path("测试歌手 - 测试歌曲.wav"), ext=".wav")
        audio_file.raw_tags = {"artist": "测试歌手", "title": "测试歌曲"}

        stage = ScrapeMetadataStage()
        stage.client = FakeMusicBrainzClient()
        with contextlib.redirect_stdout(io.StringIO()):
            processed = stage.process(audio_file, context)

        self.assertEqual(processed.scraped["title"], "测试歌曲")
        self.assertEqual(processed.scraped["artist"], "测试歌手")
        self.assertEqual(processed.scraped["album"], "测试专辑")
        self.assertEqual(processed.scraped["year"], "2024")
        self.assertEqual(processed.scraped["genre"], "Album")
        self.assertEqual(processed.scraped["confidence"], 99)


class PipelineIntegrationTests(unittest.TestCase):
    def test_pipeline_processes_generated_wav_from_filename_to_written_tags(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            input_path = tmp_path / "input"
            output_path = tmp_path / "organized"
            input_path.mkdir()

            source_path = input_path / "测试歌手 - 测试歌曲.wav"
            create_test_wav(source_path)

            config = AppConfig(
                input_path=input_path,
                output_path=output_path,
                threads=1,
                pipeline_order=[
                    "LoadStage",
                    "ExtractRawTagsStage",
                    "CleanRawTagsStage",
                    "NormalizeArtistStage",
                    "ExtractFromFilenameStage",
                    "MergeMetadataStage",
                    "CalculateOutputPathStage",
                    "CopyFileStage",
                    "WriteTagsStage",
                    "CleanupStage",
                ],
            )

            pipeline = MusicOrganizerPipeline(config)
            with contextlib.redirect_stdout(io.StringIO()):
                result_path, skipped, metadata = pipeline.process_file(source_path)

            expected_path = output_path / "input" / "测试歌手 - 测试歌曲.wav"
            self.assertFalse(skipped)
            self.assertEqual(result_path, expected_path)
            self.assertIsInstance(metadata, dict)
            self.assertTrue(expected_path.exists())

            written = WAVE(expected_path)
            self.assertEqual(str(written.tags.get("TPE1")), "测试歌手")
            self.assertEqual(str(written.tags.get("TIT2")), "测试歌曲")


class PipelinePersistenceTests(unittest.TestCase):
    def test_process_records_task_and_song_in_storage(self):
        from core.storage import Storage

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            input_path = tmp_path / "input"
            output_path = tmp_path / "organized"
            input_path.mkdir()
            create_test_wav(input_path / "测试歌手 - 测试歌曲.wav")

            config = AppConfig(
                input_path=input_path,
                output_path=output_path,
                threads=1,
                pipeline_order=[
                    "LoadStage", "ExtractRawTagsStage", "CleanRawTagsStage",
                    "NormalizeArtistStage", "ExtractFromFilenameStage",
                    "MergeMetadataStage", "CalculateOutputPathStage",
                    "CopyFileStage", "WriteTagsStage", "CleanupStage",
                ],
            )

            storage = Storage(tmp_path / "data.db")
            pipeline = MusicOrganizerPipeline(config, storage=storage)
            with contextlib.redirect_stdout(io.StringIO()):
                pipeline.process()

            tasks = storage.get_recent_tasks(10)
            self.assertEqual(len(tasks), 1)
            self.assertEqual(tasks[0]["status"], "completed")
            self.assertEqual(tasks[0]["success"], 1)

            songs = storage.get_task_songs(tasks[0]["id"])
            self.assertEqual(len(songs), 1)
            self.assertEqual(songs[0]["status"], "success")
            # tags 应被解析为 dict（即便为空也不是字符串）
            self.assertIsInstance(songs[0]["tags"], dict)
            storage.close()


if __name__ == "__main__":
    unittest.main()
