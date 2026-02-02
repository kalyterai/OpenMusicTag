# -*- coding: utf-8 -*-
"""阶段6：从文件名提取信息"""

from typing import TYPE_CHECKING

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


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
            tags.setdefault("title", info["title"])
            tags.setdefault("artist", info["artist"])

        return audio_file