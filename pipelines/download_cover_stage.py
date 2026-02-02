# -*- coding: utf-8 -*-
"""阶段11：下载封面"""

import requests
from io import BytesIO
from pathlib import Path
from typing import Optional, TYPE_CHECKING

from PIL import Image

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


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
        cover_url = audio_file.scraped.get("cover_url")
        if not cover_url or not audio_file.output_path:
            return audio_file

        # 检查原始文件是否已经有封面
        if self._has_embedded_cover(audio_file.audio):
            print(f"  ✓ 文件已有封面，跳过下载")
            return audio_file

        temp_path = audio_file.output_path.parent / "cover_temp.jpg"
        downloaded = CoverDownloader.download(cover_url, temp_path)

        if downloaded:
            audio_file.scraped["_cover_path"] = downloaded
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