#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenMusicTag 启动器
用于在macOS上正确设置应用名称
"""

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROJECT_VENV_PYTHON = PROJECT_ROOT / ".venv" / "bin" / "python"


def _ensure_project_python() -> None:
    """Re-enter through the project uv environment when launched by system Python."""
    if not PROJECT_VENV_PYTHON.exists():
        return

    try:
        current = Path(sys.executable).resolve()
        expected = PROJECT_VENV_PYTHON.resolve()
    except OSError:
        return

    if current != expected:
        os.execv(str(expected), [str(expected), str(Path(__file__).resolve()), *sys.argv[1:]])


_ensure_project_python()

# 在导入任何其他模块之前设置环境变量
if sys.platform == 'darwin':
    # 设置macOS应用名称
    os.environ['QT_MAC_WANTS_LAYER'] = '1'
    os.environ['CFBundleName'] = 'OpenMusicTag'
    os.environ['CFBundleDisplayName'] = 'OpenMusicTag'
    
    # 尝试设置进程名称
    try:
        from setproctitle import setproctitle
        setproctitle('OpenMusicTag')
    except ImportError:
        try:
            import ctypes
            libc = ctypes.CDLL(None)
            # 尝试设置进程标题
            libc.prctl(15, b'OpenMusicTag', 0, 0, 0)
        except:
            pass

# 设置Python路径
sys.path.insert(0, str(Path(__file__).parent))

# 导入并运行主应用
if __name__ == "__main__":
    from main import main
    main()
