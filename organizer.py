#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""极空间 NAS 音乐整理工具 - 使用配置化 Pipeline"""

from pathlib import Path
from config import AppConfig
from pipeline import MusicOrganizerPipeline


def main():
    """主函数：交互式设置"""
    print("=" * 60)
    print("极空间 NAS 音乐整理工具 (Configurable Pipeline)")
    print("功能：繁简转换 | 去广告乱码 | 刮削元数据 | 智能整理")
    print("=" * 60)

    nas_path = "/Volumes/z2pro/test_music"
    output_path = '/Volumes/z2pro/test_music2'
    threads = 4
    # 初始化配置
    config = AppConfig(
        input_path=Path(nas_path),
        output_path=Path(output_path),
        threads=threads
    )

    # 创建管道并处理
    pipeline = MusicOrganizerPipeline(config)
    pipeline.process()


if __name__ == "__main__":
    main()
