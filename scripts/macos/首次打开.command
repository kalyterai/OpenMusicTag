#!/bin/bash
#
# 首次打开 OpenMusicTag —— 双击本文件即可。
#
# 从 GitHub 下载的应用会被 macOS 打上「下载隔离」标记，未经 Apple 公证时
# 双击会被拦成「已损坏 / 无法验证开发者」。本脚本帮你解除该标记并启动应用。
# （应用本身已 ad-hoc 签名，可正常运行；这一步只去掉下载隔离。）

DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/OpenMusicTag.app"

if [ ! -d "$APP" ]; then
  echo "❌ 没找到 OpenMusicTag.app。"
  echo "   请确认本文件和 OpenMusicTag.app 在同一个文件夹里，再双击运行。"
  echo ""
  read -n 1 -s -r -p "按任意键关闭本窗口…"
  exit 1
fi

echo "正在解除下载隔离：$APP"
xattr -dr com.apple.quarantine "$APP" 2>/dev/null

echo "启动 OpenMusicTag…"
open "$APP"

echo ""
echo "✅ 已完成。以后可以直接双击 OpenMusicTag.app 打开，无需再运行本脚本。"
sleep 1
