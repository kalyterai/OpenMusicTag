# -*- coding: utf-8 -*-
"""阶段10：复制文件"""

import shutil
import subprocess
from pathlib import Path
from typing import TYPE_CHECKING

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


def safe_copy(src: Path, dst: Path) -> bool:
    """安全复制文件，处理 SMB 权限问题"""
    try:
        shutil.copy(str(src), str(dst))
        return True
    except PermissionError:
        try:
            subprocess.run(["cp", "-f", str(src), str(dst)], check=True)
            return True
        except Exception as e:
            print(f"  系统 cp 也失败: {e}")
            return False
    except Exception as e:
        print(f"  复制失败: {e}")
        return False


@PipelineStage.register("CopyFileStage")
class CopyFileStage(PipelineStage):
    """阶段10：复制文件"""

    NAME = "复制文件"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """复制文件到输出路径"""
        if not audio_file.output_path:
            return audio_file

        print(f"  复制到: {audio_file.output_path}")
        if safe_copy(audio_file.path, audio_file.output_path):
            return audio_file
        else:
            print(f"  ✗ 复制失败")
            audio_file.output_path = None
            return audio_file