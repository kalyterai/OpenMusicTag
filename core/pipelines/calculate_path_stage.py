# -*- coding: utf-8 -*-
"""阶段9：计算输出路径"""

from typing import TYPE_CHECKING

from core.base import PipelineStage

if TYPE_CHECKING:
    from core.context import PipelineContext
    from core.models import AudioFile


@PipelineStage.register("CalculateOutputPathStage")
class CalculateOutputPathStage(PipelineStage):
    """阶段9：计算输出路径"""

    NAME = "计算输出路径"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """计算输出路径和文件名"""
        meta = audio_file.final_metadata

        raw_artist = meta.get("artist", "").strip()
        raw_album = meta.get("album", "").strip()
        raw_title = meta.get("title", "").strip()

        # 如果没有有效的歌手或专辑信息，保持原目录结构和文件名
        if not raw_artist or not raw_album or not raw_title:
            missing = [name for name, value in
                       (("艺人", raw_artist), ("专辑", raw_album), ("标题", raw_title))
                       if not value]
            original_dir = audio_file.path.parent.name
            target_dir = context.output_path / original_dir
            target_dir.mkdir(parents=True, exist_ok=True)
            output_path = target_dir / audio_file.path.name
            audio_file.output_path = output_path
            context.note(
                f"缺少{ '、'.join(missing) }，按原文件名归档：{output_path}",
                status="warning",
            )
            return audio_file

        # 有有效信息，使用转换后的值
        artist = self.format_path(raw_artist)
        album = self.format_path(raw_album)
        title = self.format_path(raw_title)

        # 构建路径
        target_dir = context.output_path / artist / album
        target_dir.mkdir(parents=True, exist_ok=True)

        new_filename = f"{artist} - {title}{audio_file.ext}"
        output_path = target_dir / new_filename

        audio_file.output_path = output_path
        context.note(f"按 艺人/专辑 结构归档：{output_path}")
        return audio_file