# -*- coding: utf-8 -*-
"""阶段4：标准化艺人名称"""

from typing import TYPE_CHECKING

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


@PipelineStage.register("NormalizeArtistStage")
class NormalizeArtistStage(PipelineStage):
    """阶段4：标准化艺人名称"""

    NAME = "标准化艺人"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """标准化艺人名称"""
        for key in ["artist", "albumartist"]:
            if key in audio_file.raw_tags and audio_file.raw_tags[key]:
                audio_file.raw_tags[key] = self.normalize_artist(
                    audio_file.raw_tags[key]
                )
        # 同时清理 album 中的特殊字符
        if "album" in audio_file.raw_tags:
            audio_file.raw_tags["album"] = self.cleanup_album(
                audio_file.raw_tags["album"]
            )
        return audio_file