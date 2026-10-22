#!/bin/zsh
set -euo pipefail

LABEL="com.pintu-ai.local"
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "此安装脚本仅适用于 macOS。Linux 请使用 systemd 配置。" >&2
  exit 1
fi
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(command -v node)"
SOURCE_PLIST="$PROJECT_DIR/service/$LABEL.plist"
TARGET_PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

mkdir -p "$HOME/Library/LaunchAgents" "$PROJECT_DIR/runtime/logs"
launchctl bootout "$DOMAIN" "$TARGET_PLIST" >/dev/null 2>&1 || true
"$NODE_BIN" --input-type=module - "$SOURCE_PLIST" "$TARGET_PLIST" "$PROJECT_DIR" "$NODE_BIN" "$PATH" <<'JS'
import fs from 'node:fs';
const [source, target, project, node, processPath] = process.argv.slice(2);
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
let plist = fs.readFileSync(source, 'utf8');
for (const [key, value] of Object.entries({ PROJECT_DIR: project, NODE_BIN: node, PROCESS_PATH: processPath })) {
  plist = plist.replaceAll(`__${key}__`, escape(value));
}
fs.writeFileSync(target, plist, { mode: 0o600 });
JS
chmod 600 "$TARGET_PLIST"
plutil -lint "$TARGET_PLIST"
launchctl bootstrap "$DOMAIN" "$TARGET_PLIST"
launchctl enable "$DOMAIN/$LABEL"
launchctl kickstart "$DOMAIN/$LABEL"

echo "品图 AI 本地服务已安装并启动：http://localhost:5176/china-full.html"
