# -*- coding: utf-8 -*-
"""阶段2：提取原始标签"""

from typing import TYPE_CHECKING

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


@PipelineStage.register("ExtractRawTagsStage")
class ExtractRawTagsStage(PipelineStage):
    """阶段2：提取原始标签"""

    NAME = "提取原始标签"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """从文件中提取原始标签"""
        if not audio_file.audio:
            return audio_file

        tags = {}
        audio = audio_file.audio

        if hasattr(audio, "tags") and audio.tags:
            # MP3/WAV 使用 ID3 标签
            if hasattr(audio.tags, "get"):
                tags["title"] = str(audio.tags.get("TIT2", ""))
                tags["artist"] = str(audio.tags.get("TPE1", ""))
                tags["album"] = str(audio.tags.get("TALB", ""))
                tags["albumartist"] = str(audio.tags.get("TPE2", ""))
                tags["year"] = str(audio.tags.get("TDRC", ""))
                tags["genre"] = str(audio.tags.get("TCON", ""))
            else:
                # FLAC/APE 使用字典式标签
                tags["title"] = self._get_first(audio, "TITLE")
                tags["artist"] = self._get_first(audio, "ARTIST")
                tags["album"] = self._get_first(audio, "ALBUM")
                tags["albumartist"] = self._get_first(audio, "ALBUMARTIST")
                tags["year"] = self._get_first(audio, "DATE")
                tags["genre"] = self._get_first(audio, "GENRE")

        audio_file.raw_tags = tags
        return audio_file

    def _get_first(self, audio, key: str) -> str:
        value = audio.get(key)
        if isinstance(value, list):
            return str(value[0]) if value else ""
        return str(value) if value else ""