#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenMusicTag 打包脚本
支持跨平台打包：macOS, Windows, Linux
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

# 项目路径
PROJECT_ROOT = Path(__file__).parent.parent
GUI_DIR = PROJECT_ROOT / 'gui'
DIST_DIR = PROJECT_ROOT / 'dist'


def install_pyinstaller():
    """安装PyInstaller"""
    print("安装PyInstaller...")
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'], check=True)


def build_frontend():
    """构建前端"""
    print("构建前端...")
    os.chdir(GUI_DIR)
    subprocess.run(['npm', 'run', 'build'], check=True)


def copy_logo():
    """复制logo到gui目录"""
    src = GUI_DIR / 'src' / 'assets' / 'logo.png'
    dst = GUI_DIR / 'logo.png'
    if src.exists():
        shutil.copy2(src, dst)
        print(f"复制logo: {src} -> {dst}")


def build_macos():
    """构建macOS应用"""
    print("\n=== 构建macOS应用 ===")
    
    # 安装setproctitle
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'setproctitle'], check=True)
    
    # 使用PyInstaller打包
    os.chdir(PROJECT_ROOT)
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--name=OpenMusicTag',
        '--windowed',
        '--noconfirm',
        '--clean',
        '--onedir',
        f'--add-data={GUI_DIR / "dist"}:dist',
        f'--add-data={GUI_DIR / "logo.png"}:.',
        f'--icon={GUI_DIR / "logo.png"}',
        '--hidden-import=PyQt6',
        '--hidden-import=PyQt6.QtWebEngineWidgets',
        '--hidden-import=PyQt6.QtWebChannel',
        '--hidden-import=setproctitle',
        '--hidden-import=opencc',
        '--hidden-import=mutagen',
        '--hidden-import=musicbrainzngs',
        '--hidden-import=requests',
        '--hidden-import=PIL',
        str(GUI_DIR / 'launcher.py')
    ]
    
    subprocess.run(cmd, check=True)
    
    # 创建dmg文件（如果create-dmg可用）
    app_path = PROJECT_ROOT / 'dist' / 'OpenMusicTag.app'
    if app_path.exists():
        print(f"✓ macOS应用已创建: {app_path}")
        print("可以手动创建DMG安装包，或使用以下命令:")
        print("  create-dmg --volname 'OpenMusicTag' --window-pos 200 120 --window-size 800 400 --icon-size 100 --icon 'OpenMusicTag.app' 200 190 --hide-extension 'OpenMusicTag.app' --app-drop-link 600 185 OpenMusicTag.dmg dist/OpenMusicTag.app")


def build_windows():
    """构建Windows应用"""
    print("\n=== 构建Windows应用 ===")
    
    os.chdir(PROJECT_ROOT)
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--name=OpenMusicTag',
        '--windowed',
        '--noconfirm',
        '--clean',
        '--onedir',
        f'--add-data={GUI_DIR / "dist"};dist',
        f'--add-data={GUI_DIR / "logo.png"};.',
        f'--icon={GUI_DIR / "logo.png"}',
        '--hidden-import=PyQt6',
        '--hidden-import=PyQt6.QtWebEngineWidgets',
        '--hidden-import=PyQt6.QtWebChannel',
        '--hidden-import=opencc',
        '--hidden-import=mutagen',
        '--hidden-import=musicbrainzngs',
        '--hidden-import=requests',
        '--hidden-import=PIL',
        str(GUI_DIR / 'launcher.py')
    ]
    
    subprocess.run(cmd, check=True)
    
    exe_path = PROJECT_ROOT / 'dist' / 'OpenMusicTag' / 'OpenMusicTag.exe'
    if exe_path.exists():
        print(f"✓ Windows应用已创建: {exe_path}")
        print("可以使用Inno Setup或NSIS创建安装程序")


def build_linux():
    """构建Linux应用"""
    print("\n=== 构建Linux应用 ===")
    
    os.chdir(PROJECT_ROOT)
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--name=OpenMusicTag',
        '--windowed',
        '--noconfirm',
        '--clean',
        '--onedir',
        f'--add-data={GUI_DIR / "dist"}:dist',
        f'--add-data={GUI_DIR / "logo.png"}:.',
        f'--icon={GUI_DIR / "logo.png"}',
        '--hidden-import=PyQt6',
        '--hidden-import=PyQt6.QtWebEngineWidgets',
        '--hidden-import=PyQt6.QtWebChannel',
        '--hidden-import=opencc',
        '--hidden-import=mutagen',
        '--hidden-import=musicbrainzngs',
        '--hidden-import=requests',
        '--hidden-import=PIL',
        str(GUI_DIR / 'launcher.py')
    ]
    
    subprocess.run(cmd, check=True)
    
    exe_path = PROJECT_ROOT / 'dist' / 'OpenMusicTag' / 'OpenMusicTag'
    if exe_path.exists():
        print(f"✓ Linux应用已创建: {exe_path}")
        print("可以创建DEB/RPM包或AppImage")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='OpenMusicTag 打包脚本')
    parser.add_argument('platform', choices=['macos', 'windows', 'linux', 'all'], 
                       help='目标平台')
    parser.add_argument('--install-pyinstaller', action='store_true',
                       help='安装PyInstaller')
    
    args = parser.parse_args()
    
    # 清理旧的构建
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    
    # 安装PyInstaller
    if args.install_pyinstaller:
        install_pyinstaller()
    
    # 构建前端
    build_frontend()
    
    # 复制logo
    copy_logo()
    
    # 根据平台构建
    if args.platform == 'all':
        build_macos()
        build_windows()
        build_linux()
    elif args.platform == 'macos':
        build_macos()
    elif args.platform == 'windows':
        build_windows()
    elif args.platform == 'linux':
        build_linux()
    
    print("\n✓ 打包完成!")
    print(f"输出目录: {DIST_DIR}")


if __name__ == '__main__':
    main()
