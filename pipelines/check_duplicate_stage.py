# -*- coding: utf-8 -*-
"""阶段5：检查文件是否已存在（重复检测）"""

from typing import TYPE_CHECKING

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


@PipelineStage.register("CheckDuplicateStage")
class CheckDuplicateStage(PipelineStage):
    """阶段5：检查文件是否已存在（重复检测）"""

    NAME = "检查重复"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """检查目标文件是否已存在"""
        tags = audio_file.raw_tags

        # 获取必要信息
        artist = tags.get("artist", "Unknown Artist")
        album = tags.get("album", "Unknown Album")
        title = tags.get("title", audio_file.path.stem)

        # 标准化文件名
        artist = self.format_path(artist)
        album = self.format_path(album)
        title = self.format_path(title)

        # 构建目标路径
        ext = audio_file.ext
        target_path = context.output_path / artist / album / f"{artist} - {title}{ext}"

        # 检查是否已存在
        if target_path.exists():
            print(f"  ⏭  文件已存在，跳过: {target_path.name}")
            context.stop()  # 停止后续阶段
            return audio_file

        return audio_file
