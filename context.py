# -*- coding: utf-8 -*-
"""Pipeline 上下文 - 承载共享资源和通用方法"""

import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import AppConfig


class PipelineContext:
    """Pipeline 上下文 - 每次 process 调用创建新实例（线程安全）"""

    def __init__(self, config: AppConfig):
        self.config = config
        self.breakout = False  # 控制是否提前终止 pipeline

    def should_continue(self) -> bool:
        """检查是否继续执行后续阶段"""
        return not self.breakout

    def stop(self) -> None:
        """停止后续阶段执行"""
        self.breakout = True

    def continue_pipeline(self) -> None:
        """继续执行后续阶段"""
        self.breakout = False

    # ========== 文件名解析 ==========

    def parse_filename(self, filename: str) -> Dict[str, str]:
        """从文件名解析歌手和歌名"""
        name = Path(filename).stem
        patterns = [
            (r"^(.*?)\s*-\s*(.*?)$", "歌手 - 歌名"),
            (r"^\[(.*?)\]\s*(.*?)$", "[歌手]歌名"),
        ]

        for pattern, _ in patterns:
            match = re.match(pattern, name)
            if match:
                return {
                    "artist": match.group(1).strip(),
                    "title": match.group(2).strip(),
                }

        return {"artist": "Unknown Artist", "title": name}

    # ========== 外部服务 ==========

    @property
    def input_path(self) -> Path:
        return self.config.input_path

    @property
    def output_path(self) -> Path:
        return self.config.output_path

    def get_stage_config(self, stage_name: str) -> Dict[str, Any]:
        """获取指定阶段的配置"""
        return self.config.get_stage_config(stage_name)

    def get_supported_formats(self) -> tuple:
        """获取支持的文件格式"""
        return self.config.get_supported_formats()
