# OpenMusicTag 打包指南

## 跨平台打包支持

支持打包到以下平台：
- macOS (.app bundle)
- Windows (.exe)
- Linux (可执行文件)

## 前置要求

### 所有平台
```bash
# 安装Python依赖
pip install -r requirements-gui.txt

# 安装PyInstaller
pip install pyinstaller

# 安装setproctitle (macOS)
pip install setproctitle
```

### 前端构建
```bash
cd gui
npm install
```

## 打包步骤

### 使用打包脚本（推荐）

```bash
cd /Users/xiaozhuzhu/code/python/OpenMusicTag

# 打包macOS版本
python gui/build.py macos

# 打包Windows版本
python gui/build.py windows

# 打包Linux版本
python gui/build.py linux

# 打包所有平台
python gui/build.py all
```

### 手动打包

#### macOS
```bash
cd /Users/xiaozhuzhu/code/python/OpenMusicTag

# 构建前端
cd gui && npm run build && cd ..

# 复制logo
cp gui/src/assets/logo.png gui/logo.png

# 使用PyInstaller打包
pyinstaller --name=OpenMusicTag \
  --windowed \
  --noconfirm \
  --clean \
  --onedir \
  --add-data="gui/dist:dist" \
  --add-data="gui/logo.png:." \
  --icon="gui/logo.png" \
  --hidden-import=PyQt6 \
  --hidden-import=PyQt6.QtWebEngineWidgets \
  --hidden-import=PyQt6.QtWebChannel \
  --hidden-import=setproctitle \
  --hidden-import=opencc \
  --hidden-import=mutagen \
  --hidden-import=musicbrainzngs \
  --hidden-import=requests \
  --hidden-import=PIL \
  gui/launcher.py
```

#### Windows
```bash
# 类似macOS，但--add-data使用分号分隔
pyinstaller --name=OpenMusicTag \
  --windowed \
  --noconfirm \
  --clean \
  --onedir \
  --add-data="gui/dist;dist" \
  --add-data="gui/logo.png;." \
  --icon="gui/logo.png" \
  ...
```

#### Linux
```bash
# 类似macOS
pyinstaller --name=OpenMusicTag \
  --windowed \
  --noconfirm \
  --clean \
  --onedir \
  --add-data="gui/dist:dist" \
  --add-data="gui/logo.png:." \
  ...
```

## 输出文件

打包完成后，文件在 `dist/` 目录：

- **macOS**: `dist/OpenMusicTag.app` (应用包)
- **Windows**: `dist/OpenMusicTag/OpenMusicTag.exe` (可执行文件)
- **Linux**: `dist/OpenMusicTag/OpenMusicTag` (可执行文件)

## 创建安装包（可选）

### macOS
使用 create-dmg 创建DMG安装包：
```bash
brew install create-dmg
create-dmg \
  --volname "OpenMusicTag" \
  --window-pos 200 120 \
  --window-size 800 400 \
  --icon-size 100 \
  --icon "OpenMusicTag.app" 200 190 \
  --hide-extension "OpenMusicTag.app" \
  --app-drop-link 600 185 \
  OpenMusicTag.dmg \
  dist/OpenMusicTag.app
```

### Windows
使用 Inno Setup 或 NSIS 创建安装程序。

### Linux
创建DEB/RPM包或AppImage。

## 注意事项

1. **图标问题**: macOS上直接运行Python脚本会显示Python图标，打包成.app后会显示正确图标
2. **权限**: Linux上可能需要`chmod +x`添加执行权限
3. **依赖**: 确保所有平台都安装了必要的依赖
4. **测试**: 在每个平台上测试打包后的应用
