#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""通用音乐刮削软件 - 使用配置化 Pipeline"""

from pathlib import Path

from config import AppConfig
from pipeline import MusicOrganizerPipeline


def main():
    """主函数：交互式设置"""
    print("=" * 60)
    print("通用音乐刮削软件 (Configurable Pipeline)")
    print("功能：繁简转换 | 去广告乱码 | 刮削元数据 | 智能整理")
    print("=" * 60)

    input_path = "/path/to/music"
    output_path = "/path/to/music_organized"
    threads = 8
    # 初始化配置
    config = AppConfig(
        input_path=Path(input_path), output_path=Path(output_path), threads=threads
    )

    # 创建管道并处理
    pipeline = MusicOrganizerPipeline(config)
    pipeline.process()


if __name__ == "__main__":
    main()
