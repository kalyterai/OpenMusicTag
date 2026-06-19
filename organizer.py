#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""OpenMusicTag 命令行入口。

参数解析与批处理逻辑统一在 ``core.pipeline.main``，本文件只是保留项目根目录下
一个便捷入口，等价于 ``python -m core.pipeline``。

用法::

    python organizer.py <输入目录> [-o 输出目录] [-t 线程数]
"""

from core.pipeline import main

if __name__ == "__main__":
    main()
