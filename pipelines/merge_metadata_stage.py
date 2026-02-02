# -*- coding: utf-8 -*-
"""阶段8：合并元数据（优先使用刮削数据）"""

from typing import TYPE_CHECKING

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


@PipelineStage.register("MergeMetadataStage")
class MergeMetadataStage(PipelineStage):
    """阶段8：合并元数据（优先使用刮削数据）"""

    NAME = "合并元数据"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """合并原始标签和刮削数据"""
        scraped = audio_file.scraped
        raw = audio_file.raw_tags

        # 优先使用刮削数据，不填充默认值
        merged = {
            "title": scraped.get("title") or raw.get("title") or "",
            "artist": scraped.get("artist") or raw.get("artist") or "",
            "album": scraped.get("album") or raw.get("album") or "",
            "albumartist": scraped.get("albumartist") or raw.get("albumartist") or "",
            "year": scraped.get("year") or raw.get("year") or "",
            "composer": scraped.get("composer") or raw.get("composer") or "",
            "genre": scraped.get("genre") or raw.get("genre") or "",
            "description": scraped.get("description") or "",
        }

        audio_file.final_metadata = merged
        return audio_file