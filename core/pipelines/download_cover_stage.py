# -*- coding: utf-8 -*-
"""阶段11：下载封面"""

import requests
from io import BytesIO
from pathlib import Path
from typing import Optional, TYPE_CHECKING

from PIL import Image

from core.base import PipelineStage

if TYPE_CHECKING:
    from core.context import PipelineContext
    from core.models import AudioFile


class CoverDownloader:
    """封面下载器"""

    @staticmethod
    def download(url: str, output_path: Path, timeout: int = 10, quality: int = 90) -> Optional[Path]:
        if not url:
            return None
        try:
            response = requests.get(url, timeout=timeout)
            if response.status_code == 200:
                img = Image.open(BytesIO(response.content))
                if img.mode in ("RGBA", "LA", "P"):
                    img = img.convert("RGB")
                img.save(output_path, "JPEG", quality=quality)
                return output_path
        except Exception as e:
            print(f"  ⚠ 封面下载失败: {e}")
        return None


@PipelineStage.register("DownloadCoverStage")
class DownloadCoverStage(PipelineStage):
    """阶段11：下载封面"""

    NAME = "下载封面"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """下载并嵌入封面（如果文件没有封面则下载）"""
        has_embedded = self._has_embedded_cover(audio_file.audio)
        cover_url = audio_file.scraped.get("cover_url")

        if not audio_file.output_path:
            context.note("没有输出路径，无法处理封面", status="warning")
            return audio_file

        # 原始文件已自带封面：不需要再下载，但这是合理的「有封面」
        if has_embedded:
            print(f"  ✓ 文件已有封面，跳过下载")
            context.note("文件已自带内嵌封面，无需下载")
            return audio_file

        # 没有内嵌封面，且刮削也没给封面地址 —— 这种情况文件最终会没有封面
        if not cover_url:
            context.note(
                "文件无内嵌封面，且刮削未返回封面地址，输出文件将没有封面",
                status="warning",
            )
            return audio_file

        temp_path = audio_file.output_path.parent / "cover_temp.jpg"
        downloaded = CoverDownloader.download(cover_url, temp_path)

        if downloaded:
            audio_file.scraped["_cover_path"] = downloaded
            context.note(f"已从刮削结果下载封面：{cover_url}")
        else:
            context.note(f"封面下载失败，输出文件将没有封面：{cover_url}", status="warning")
        return audio_file

    def _has_embedded_cover(self, audio) -> bool:
        """检查音频文件是否已嵌入封面"""
        if not audio:
            return False

        try:
            from mutagen.mp3 import MP3
            from mutagen.wave import WAVE
            from mutagen.flac import FLAC
            from mutagen.apev2 import APEv2

            if isinstance(audio, (MP3, WAVE)):
                return hasattr(audio, "tags") and audio.tags and "APIC" in audio.tags
            elif isinstance(audio, FLAC):
                return hasattr(audio, "pictures") and len(audio.pictures) > 0
            elif isinstance(audio, APEv2):
                return hasattr(audio, "tags") and audio.tags and "Cover Art" in audio.tags
        except Exception:
            pass
        return False