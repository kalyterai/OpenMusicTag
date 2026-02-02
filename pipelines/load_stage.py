# -*- coding: utf-8 -*-
"""阶段1：加载音频文件"""

from pathlib import Path
from typing import TYPE_CHECKING

from mutagen.apev2 import APEv2
from mutagen.flac import FLAC
from mutagen.mp3 import MP3
from mutagen.wave import WAVE

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


@PipelineStage.register("LoadStage")
class LoadStage(PipelineStage):
    """阶段1：加载音频文件"""

    NAME = "加载文件"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """加载文件并创建 mutagen 对象"""
        if not audio_file.path.exists():
            print(f"  ✗ 文件不存在: {audio_file.path}")
            return audio_file

        ext = audio_file.ext
        try:
            if ext == ".mp3":
                audio_file.audio = MP3(audio_file.path)
            elif ext == ".flac":
                audio_file.audio = FLAC(audio_file.path)
            elif ext == ".wav":
                audio_file.audio = WAVE(audio_file.path)
            elif ext == ".ape":
                audio_file.audio = APEv2(audio_file.path)
            else:
                print(f"  ⚠ 不支持的格式: {ext}")
        except Exception as e:
            print(f"  ✗ 无法读取文件: {e}")

        return audio_file