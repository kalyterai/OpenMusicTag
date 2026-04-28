# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path

# 获取项目路径 - 使用绝对路径
spec_dir = Path('/Users/xiaozhuzhu/code/python/OpenMusicTag/gui')
project_path = spec_dir.parent
gui_path = spec_dir

# PyInstaller spec文件
block_cipher = None

# 数据文件
a = Analysis(
    [str(gui_path / 'launcher.py')],
    pathex=[str(project_path), str(gui_path)],
    binaries=[],
    datas=[
        (str(gui_path / 'dist'), 'dist'),
        (str(gui_path / 'logo.png'), '.'),
    ],
    hiddenimports=[
        'PyQt6',
        'PyQt6.QtWebEngineWidgets',
        'PyQt6.QtWebChannel',
        'setproctitle',
        'opencc',
        'mutagen',
        'musicbrainzngs',
        'requests',
        'PIL',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# 可执行文件配置
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='OpenMusicTag',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(gui_path / 'logo.png') if sys.platform != 'darwin' else None,
)

# macOS应用包
if sys.platform == 'darwin':
    app = BUNDLE(
        exe,
        name='OpenMusicTag.app',
        icon=str(gui_path / 'logo.png'),
        bundle_identifier='com.openmusictag.app',
        info_plist={
            'CFBundleName': 'OpenMusicTag',
            'CFBundleDisplayName': 'OpenMusicTag',
            'CFBundleShortVersionString': '1.0.0',
            'CFBundleVersion': '1.0.0',
            'NSHighResolutionCapable': 'True',
            'NSRequiresAquaSystemAppearance': 'False',
        },
    )