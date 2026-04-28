# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['/Users/xiaozhuzhu/code/python/OpenMusicTag/gui/launcher.py'],
    pathex=[],
    binaries=[],
    datas=[('/Users/xiaozhuzhu/code/python/OpenMusicTag/gui/dist', 'dist'), ('/Users/xiaozhuzhu/code/python/OpenMusicTag/gui/logo.png', '.')],
    hiddenimports=['PyQt6', 'PyQt6.QtWebEngineWidgets', 'PyQt6.QtWebChannel', 'setproctitle', 'opencc', 'mutagen', 'musicbrainzngs', 'requests', 'PIL'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='OpenMusicTag',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['/Users/xiaozhuzhu/code/python/OpenMusicTag/gui/logo.png'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='OpenMusicTag',
)
app = BUNDLE(
    coll,
    name='OpenMusicTag.app',
    icon='/Users/xiaozhuzhu/code/python/OpenMusicTag/gui/logo.png',
    bundle_identifier=None,
)
