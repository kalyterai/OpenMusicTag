# -*- coding: utf-8 -*-
"""音频文件数据模型"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class AudioFile:
    """音频文件数据模型"""

    path: Path
    ext: str
    audio: Any = None  # mutagen 音频对象

    # 原始标签
    raw_tags: Dict[str, Any] = field(default_factory=dict)

    # 处理后的元数据
    metadata: Dict[str, str] = field(default_factory=dict)

    # 刮削的元数据
    scraped: Dict[str, Any] = field(default_factory=dict)

    # 最终元数据
    final_metadata: Dict[str, str] = field(default_factory=dict)

    # 输出路径
    output_path: Optional[Path] = None
