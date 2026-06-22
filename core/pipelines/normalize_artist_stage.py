# -*- coding: utf-8 -*-
"""阶段4：标准化艺人名称"""

from typing import TYPE_CHECKING

from core.base import PipelineStage

if TYPE_CHECKING:
    from core.context import PipelineContext
    from core.models import AudioFile


@PipelineStage.register("NormalizeArtistStage")
class NormalizeArtistStage(PipelineStage):
    """阶段4：标准化艺人名称"""

    NAME = "标准化艺人"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """标准化艺人名称"""
        changes = []
        for key in ["artist", "albumartist"]:
            if key in audio_file.raw_tags and audio_file.raw_tags[key]:
                before = audio_file.raw_tags[key]
                after = self.normalize_artist(before)
                audio_file.raw_tags[key] = after
                if after != before:
                    changes.append({"field": key, "before": before, "after": after})
        # 同时清理 album 中的特殊字符
        if "album" in audio_file.raw_tags:
            before = audio_file.raw_tags["album"]
            after = self.cleanup_album(before)
            audio_file.raw_tags["album"] = after
            if after != before:
                changes.append({"field": "album", "before": before, "after": after})

        if changes:
            context.note("标准化了艺人/专辑名称", changes=changes)
        else:
            context.note("艺人/专辑名称已规范，无需改动")
        return audio_file