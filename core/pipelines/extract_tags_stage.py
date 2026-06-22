# -*- coding: utf-8 -*-
"""阶段2：提取原始标签"""

from typing import TYPE_CHECKING

from core.base import PipelineStage

if TYPE_CHECKING:
    from core.context import PipelineContext
    from core.models import AudioFile


@PipelineStage.register("ExtractRawTagsStage")
class ExtractRawTagsStage(PipelineStage):
    """阶段2：提取原始标签"""

    NAME = "提取原始标签"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """从文件中提取原始标签"""
        if not audio_file.audio:
            context.note("没有可用的音频对象，无法提取标签", status="warning")
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
        present = [k for k in ("title", "artist", "album", "year", "genre") if tags.get(k)]
        if present:
            summary = "，".join(f"{k}={tags[k]}" for k in present)
            context.note(f"读取到内嵌标签：{summary}")
        else:
            context.note("文件没有可读的内嵌标签（标题/艺人/专辑均为空）", status="warning")
        return audio_file

    def _get_first(self, audio, key: str) -> str:
        value = audio.get(key)
        if isinstance(value, list):
            return str(value[0]) if value else ""
        return str(value) if value else ""