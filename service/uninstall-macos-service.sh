#!/bin/zsh
set -euo pipefail

LABEL="com.pintu-ai.local"
TARGET_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

launchctl bootout "$DOMAIN" "$TARGET_PLIST" >/dev/null 2>&1 || true
rm -f "$TARGET_PLIST"

echo "品图 AI 本地常驻服务已卸载"
