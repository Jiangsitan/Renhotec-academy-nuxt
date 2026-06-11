#!/bin/bash
# 启动 Nuxt 开发服务器（修复 macOS socket 路径过长问题）
cd "$(dirname "$0")"
export TMPDIR=/tmp/nu
mkdir -p "$TMPDIR"
exec npx nuxt dev --port 3000 "$@"
