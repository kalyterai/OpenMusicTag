# -*- coding: utf-8 -*-
"""阶段3：清理原始标签中的广告和乱码"""

from typing import TYPE_CHECKING

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


@PipelineStage.register("CleanRawTagsStage")
class CleanRawTagsStage(PipelineStage):
    """阶段3：清理原始标签中的广告和乱码"""

    NAME = "清理广告乱码"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """清理原始标签"""
        cleaned = {}
        for key, value in audio_file.raw_tags.items():
            cleaned[key] = self.clean_text(value)

        audio_file.raw_tags = cleaned
        return audio_file