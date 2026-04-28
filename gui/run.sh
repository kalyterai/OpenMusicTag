#!/bin/bash
# OpenMusicTag 启动脚本（macOS）

# 设置应用名称环境变量
export CFBundleName="OpenMusicTag"
export CFBundleDisplayName="OpenMusicTag"

# 获取脚本所在目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 启动应用
cd "$DIR"
python3 main.py "$@"
