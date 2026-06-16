#!/bin/zsh
set -euo pipefail

LABEL="com.pintu-ai.local"
PROJECT_DIR="/Users/xiaoyan/Documents/Three-dimensional square"
SOURCE_PLIST="$PROJECT_DIR/service/$LABEL.plist"
TARGET_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

mkdir -p "$HOME/Library/LaunchAgents" "$PROJECT_DIR/runtime/logs"
launchctl bootout "$DOMAIN" "$TARGET_PLIST" >/dev/null 2>&1 || true
cp "$SOURCE_PLIST" "$TARGET_PLIST"
chmod 600 "$TARGET_PLIST"
plutil -lint "$TARGET_PLIST"
launchctl bootstrap "$DOMAIN" "$TARGET_PLIST"
launchctl enable "$DOMAIN/$LABEL"
launchctl kickstart "$DOMAIN/$LABEL"

echo "品图 AI 本地服务已安装并启动：http://localhost:5176/china-full.html"
