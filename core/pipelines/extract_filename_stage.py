# -*- coding: utf-8 -*-
"""阶段6：从文件名提取信息"""

from typing import TYPE_CHECKING

from core.base import PipelineStage

if TYPE_CHECKING:
    from core.context import PipelineContext
    from core.models import AudioFile


@PipelineStage.register("ExtractFromFilenameStage")
class ExtractFromFilenameStage(PipelineStage):
    """阶段6：从文件名提取信息"""

    NAME = "解析文件名"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """如果原始标签缺失，从文件名提取"""
        tags = audio_file.raw_tags

        # 只有当 title 或 artist 为空时才从文件名提取
        if not tags.get("title") or not tags.get("artist"):
            info = context.parse_filename(audio_file.path.name)
            changes = []
            for key in ("title", "artist"):
                if not tags.get(key) and info.get(key):
                    before = tags.get(key, "")
                    tags[key] = info[key]
                    changes.append({"field": key, "before": before, "after": info[key]})
            if changes:
                context.note(f"标签缺失，从文件名补全 {len(changes)} 个字段", changes=changes)
            else:
                context.note("标签缺失但文件名也无法解析出有效信息", status="warning")
        else:
            context.note("标签完整，无需解析文件名")

        return audio_file