# -*- coding: utf-8 -*-
"""阶段13：清理临时文件"""

import os
from pathlib import Path
from typing import TYPE_CHECKING

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


@PipelineStage.register("CleanupStage")
class CleanupStage(PipelineStage):
    """阶段13：清理临时文件"""

    NAME = "清理临时文件"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """清理临时封面文件"""
        cover_path = audio_file.scraped.get("_cover_path")
        if cover_path and Path(cover_path).exists():
            try:
                os.remove(cover_path)
            except:
                pass
        return audio_file