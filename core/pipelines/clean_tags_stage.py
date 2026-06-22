# -*- coding: utf-8 -*-
"""阶段3：清理原始标签中的广告和乱码"""

from typing import TYPE_CHECKING

from core.base import PipelineStage

if TYPE_CHECKING:
    from core.context import PipelineContext
    from core.models import AudioFile


@PipelineStage.register("CleanRawTagsStage")
class CleanRawTagsStage(PipelineStage):
    """阶段3：清理原始标签中的广告和乱码"""

    NAME = "清理广告乱码"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """清理原始标签"""
        cleaned = {}
        changes = []
        for key, value in audio_file.raw_tags.items():
            new_value = self.clean_text(value)
            cleaned[key] = new_value
            if new_value != value:
                changes.append({"field": key, "before": value, "after": new_value})

        audio_file.raw_tags = cleaned
        if changes:
            context.note(f"清理了 {len(changes)} 个字段的广告/乱码", changes=changes)
        else:
            context.note("标签无需清理（未发现广告或乱码）")
        return audio_file