#!/bin/bash
set -e

# OpenMusicTag 启动脚本（macOS）

# 设置应用名称环境变量
export CFBundleName="OpenMusicTag"
export CFBundleDisplayName="OpenMusicTag"

# 获取脚本所在目录和项目根目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$( cd "$DIR/.." && pwd )"

if [ -x "$ROOT/.venv/bin/python" ]; then
    PYTHON="$ROOT/.venv/bin/python"
else
    PYTHON="${PYTHON:-python3}"
fi

# 启动应用
cd "$DIR"
exec "$PYTHON" main.py "$@"
