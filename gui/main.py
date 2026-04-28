#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""OpenMusicTag 桌面应用 - PyQt6 + WebEngine + React"""

import sys
import os
from pathlib import Path

# 确保 gui 目录在路径中
sys.path.insert(0, str(Path(__file__).parent))

from PyQt6.QtCore import QUrl
from PyQt6.QtWidgets import QApplication, QMainWindow, QMessageBox
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtGui import QIcon

from bridge import Bridge, MainWindow


def main():
    # 在创建QApplication之前设置应用属性（macOS需要）
    if sys.platform == 'darwin':
        # 设置macOS应用名称（显示在菜单栏）
        os.environ['QT_MAC_WANTS_LAYER'] = '1'
        # 设置macOS应用名称，确保菜单栏显示正确
        os.environ['CFBundleName'] = 'OpenMusicTag'
        os.environ['CFBundleDisplayName'] = 'OpenMusicTag'
        
        # 设置进程名称，这样Activity Monitor和Dock会显示正确的名称
        try:
            import ctypes
            libc = ctypes.CDLL(None)
            libc.prctl(15, b'OpenMusicTag', 0, 0, 0)
        except:
            pass
    
    # 使用应用名称作为参数，这会影响macOS的Dock显示
    app = QApplication(["OpenMusicTag.app"])  # .app后缀有助于macOS识别为应用
    
    # 设置应用信息
    app.setApplicationName("OpenMusicTag")
    app.setOrganizationName("OpenMusicTag")
    app.setOrganizationDomain("openmusictag.local")
    
    # 设置应用显示名称（macOS菜单栏）
    app.setApplicationDisplayName("OpenMusicTag")
    
    # 设置应用图标（Dock栏）
    icon_path = Path(__file__).parent / "logo.png"
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))

    # 创建并显示窗口
    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
