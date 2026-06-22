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
  gui/main.py
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

## macOS 签名 + 公证 + DMG（分发必做）

> 不签名 / 不公证的 .app 发给别人，会被 Gatekeeper 拦成「无法打开，因为无法验证开发者」。
> 一键脚本：`scripts/macos_release.sh`，完成「签名 → 打 DMG → 公证 → staple」全流程。

### 前置：一次性准备
1. 加入 Apple Developer Program（$99/年），在 Xcode 或开发者后台生成
   **Developer ID Application** 证书并安装到登录钥匙串。
   核对：`security find-identity -v -p codesigning`（应能看到该证书）。
2. 生成 App 专用密码（appleid.apple.com → 登录与安全 → App 专用密码）。
3. 把公证凭据存进钥匙串（只需一次）：
   ```bash
   xcrun notarytool store-credentials omt-notary \
     --apple-id you@example.com --team-id TEAMID --password <App 专用密码>
   ```
4. 安装 create-dmg（可选，没有则脚本自动回退 hdiutil）：`brew install create-dmg`

### 发布
```bash
export DEV_ID_APP="Developer ID Application: 你的名字 (TEAMID)"
export NOTARY_PROFILE="omt-notary"
bash scripts/macos_release.sh           # 构建 + 签名 + DMG + 公证 + staple
```
产物：`dist/OpenMusicTag.dmg`（已公证，任何 Mac 双击即开）。

脚本要点：
- **由内向外逐个签名**所有 `.dylib`/`.so`、嵌套的 `QtWebEngineProcess.app`，最后才签外层 `.app`——
  PyInstaller 自带的 `codesign_identity` 只签主程序，对 QtWebEngine 不够。
- 启用 **hardened runtime + `gui/entitlements.plist`**（公证强制要求；QtWebEngine 需 JIT/库验证豁免）。
- 常用开关：`--no-build`（对已有 .app 操作）、`--no-notarize`（只签名打包不公证）。

### 没有开发者账号时
脚本检测不到 `DEV_ID_APP` 会自动降级为 **ad-hoc 签名**：本机能跑，但发给别人需让对方
「右键 → 打开」绕过 Gatekeeper，且无法公证。正式分发请走上面的账号流程。

## 其他平台安装包（可选）

### Windows
使用 Inno Setup 或 NSIS 创建安装程序（建议另行做代码签名，否则触发 SmartScreen）。

### Linux
创建DEB/RPM包或AppImage。

## 注意事项

1. **图标问题**: macOS上直接运行Python脚本会显示Python图标，打包成.app后会显示正确图标
2. **权限**: Linux上可能需要`chmod +x`添加执行权限
3. **依赖**: 确保所有平台都安装了必要的依赖
4. **测试**: 在每个平台上测试打包后的应用
