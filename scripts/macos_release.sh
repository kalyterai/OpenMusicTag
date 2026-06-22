#!/usr/bin/env bash
#
# OpenMusicTag · macOS 发布脚本（签名 → 打 DMG → 公证 → staple）
#
# 用法：
#   bash scripts/macos_release.sh              # 完整流程（构建 + 签名 + DMG + 公证）
#   bash scripts/macos_release.sh --no-build   # 跳过 PyInstaller，对已有 .app 操作
#   bash scripts/macos_release.sh --no-notarize  # 只签名 + 打 DMG，不公证
#   bash scripts/macos_release.sh --zip          # 额外产出 GitHub 分发用 zip
#                                                # （含 app + 首次打开.command）
#
# GitHub 免费分发（无 Developer 账号）典型用法：
#   bash scripts/macos_release.sh --zip --no-notarize
#   → 上传 dist/OpenMusicTag-mac.zip 到 Release，用户解压后双击「首次打开.command」
#
# 凭据（环境变量，二选一的方式提供公证凭据）：
#   DEV_ID_APP   "Developer ID Application: 你的名字 (TEAMID)"
#                未设置时自动降级为 ad-hoc 签名（本机可运行，但分发给别人会被拦）
#   方式 A（推荐，先一次性存好钥匙串档案）：
#       xcrun notarytool store-credentials omt-notary \
#         --apple-id you@example.com --team-id TEAMID --password <App 专用密码>
#     然后：  NOTARY_PROFILE=omt-notary
#   方式 B（直接传）：
#       APPLE_ID=you@example.com  TEAM_ID=TEAMID  APP_PASSWORD=<App 专用密码>
#
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GUI_DIR="$PROJECT_ROOT/gui"
DIST_DIR="$PROJECT_ROOT/dist"
APP="$DIST_DIR/OpenMusicTag.app"
ENTITLEMENTS="$GUI_DIR/entitlements.plist"
DMG="$DIST_DIR/OpenMusicTag.dmg"

DO_BUILD=1
DO_NOTARIZE=1
DO_ZIP=0
for arg in "$@"; do
  case "$arg" in
    --no-build) DO_BUILD=0 ;;
    --no-notarize) DO_NOTARIZE=0 ;;
    --zip) DO_ZIP=1 ;;
    *) echo "未知参数: $arg" >&2; exit 2 ;;
  esac
done

FIRST_RUN_HELPER="$PROJECT_ROOT/scripts/macos/首次打开.command"
ZIP="$DIST_DIR/OpenMusicTag-mac.zip"

DEV_ID_APP="${DEV_ID_APP:-}"
if [[ -z "$DEV_ID_APP" ]]; then
  echo "⚠️  未设置 DEV_ID_APP —— 使用 ad-hoc 签名。"
  echo "    产物只能在本机运行；分发给别人会被 Gatekeeper 拦截，且无法公证。"
  SIGN_ID="-"
  DO_NOTARIZE=0
else
  echo "✓ 使用签名身份：$DEV_ID_APP"
  SIGN_ID="$DEV_ID_APP"
fi

# ---------------------------------------------------------------------------
# 1. 构建（前端 + PyInstaller）
# ---------------------------------------------------------------------------
if [[ "$DO_BUILD" == "1" ]]; then
  echo "==> 构建前端"
  (cd "$GUI_DIR" && npm run build)
  cp "$GUI_DIR/src/assets/logo.png" "$GUI_DIR/logo.png"
  echo "==> PyInstaller 打包"
  (cd "$PROJECT_ROOT" && python -m PyInstaller --noconfirm --clean "$PROJECT_ROOT/OpenMusicTag.spec")
fi

[[ -d "$APP" ]] || { echo "找不到 $APP，先运行不带 --no-build 的命令。" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 2. 由内向外签名（hardened runtime + entitlements）
#    嵌套的二进制必须先签，最后才签最外层的 .app。
# ---------------------------------------------------------------------------
echo "==> 签名嵌套二进制"
codesign_one() {
  codesign --force --timestamp --options runtime \
    --entitlements "$ENTITLEMENTS" --sign "$SIGN_ID" "$1"
}
# 先签所有 dylib / so / 独立可执行
find "$APP/Contents" \( -name "*.dylib" -o -name "*.so" \) -type f -print0 \
  | while IFS= read -r -d '' f; do codesign_one "$f"; done
# 嵌套的 .app（如 QtWebEngineProcess.app）与 Frameworks 里的可执行
find "$APP/Contents" -type d -name "*.app" -print0 \
  | while IFS= read -r -d '' nested; do
      [[ "$nested" == "$APP" ]] && continue
      codesign_one "$nested"
    done
find "$APP/Contents/Frameworks" -type f -perm +111 ! -name "*.dylib" ! -name "*.so" -print0 2>/dev/null \
  | while IFS= read -r -d '' f; do
      file "$f" | grep -q "Mach-O" && codesign_one "$f" || true
    done

echo "==> 签名 .app 主体"
codesign_one "$APP"

echo "==> 校验签名"
codesign --verify --deep --strict --verbose=2 "$APP"

# ---------------------------------------------------------------------------
# 3. 打 DMG
# ---------------------------------------------------------------------------
echo "==> 生成 DMG"
rm -f "$DMG"
if command -v create-dmg >/dev/null 2>&1; then
  create-dmg \
    --volname "OpenMusicTag" \
    --window-pos 200 120 --window-size 800 400 --icon-size 100 \
    --icon "OpenMusicTag.app" 200 190 --hide-extension "OpenMusicTag.app" \
    --app-drop-link 600 185 \
    "$DMG" "$APP" || true
fi
# create-dmg 偶尔在挂载阶段返回非零但 DMG 已生成；兜底用 hdiutil
if [[ ! -f "$DMG" ]]; then
  echo "   create-dmg 不可用/失败，改用 hdiutil"
  hdiutil create -volname "OpenMusicTag" -srcfolder "$APP" -ov -format UDZO "$DMG"
fi

if [[ -n "${DEV_ID_APP:-}" ]]; then
  echo "==> 签名 DMG"
  codesign --force --timestamp --sign "$DEV_ID_APP" "$DMG"
fi

# ---------------------------------------------------------------------------
# 3b. 打 zip（GitHub 分发用：app + 首次打开.command，保留权限）
# ---------------------------------------------------------------------------
if [[ "$DO_ZIP" == "1" ]]; then
  echo "==> 生成发布 zip"
  STAGE="$DIST_DIR/_ziproot/OpenMusicTag"
  rm -rf "$DIST_DIR/_ziproot" "$ZIP"
  mkdir -p "$STAGE"
  cp -R "$APP" "$STAGE/"
  if [[ -f "$FIRST_RUN_HELPER" ]]; then
    cp "$FIRST_RUN_HELPER" "$STAGE/"
    chmod +x "$STAGE/$(basename "$FIRST_RUN_HELPER")"
  fi
  # ditto 生成的 zip 能正确保留 .app 结构与可执行权限
  (cd "$DIST_DIR/_ziproot" && ditto -c -k --sequesterRsrc --keepParent "OpenMusicTag" "$ZIP")
  rm -rf "$DIST_DIR/_ziproot"
  echo "✓ 发布 zip：$ZIP"
fi

# ---------------------------------------------------------------------------
# 4. 公证 + staple
# ---------------------------------------------------------------------------
if [[ "$DO_NOTARIZE" == "1" ]]; then
  echo "==> 提交公证（会阻塞直到 Apple 返回结果）"
  if [[ -n "${NOTARY_PROFILE:-}" ]]; then
    xcrun notarytool submit "$DMG" --keychain-profile "$NOTARY_PROFILE" --wait
  elif [[ -n "${APPLE_ID:-}" && -n "${TEAM_ID:-}" && -n "${APP_PASSWORD:-}" ]]; then
    xcrun notarytool submit "$DMG" \
      --apple-id "$APPLE_ID" --team-id "$TEAM_ID" --password "$APP_PASSWORD" --wait
  else
    echo "❌ 已设置 DEV_ID_APP 但缺少公证凭据（NOTARY_PROFILE 或 APPLE_ID/TEAM_ID/APP_PASSWORD）。" >&2
    echo "   见脚本顶部说明。已生成签名 DMG，但未公证。" >&2
    exit 1
  fi
  echo "==> staple 公证票据"
  xcrun stapler staple "$DMG"
  xcrun stapler validate "$DMG"
  echo "✓ 公证完成：$DMG"
else
  echo "（已跳过公证）"
fi

echo ""
echo "✅ 完成 → $DMG"
[[ "$SIGN_ID" == "-" ]] && echo "   注意：ad-hoc 签名，别人打开需「右键 → 打开」绕过 Gatekeeper。"
