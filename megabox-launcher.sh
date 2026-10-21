#!/usr/bin/env bash
# Megabox Launcher for Kubuntu (Wayland & X11 Native Auto-Switch)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# If launched from SSH/cron or headless terminal, inherit desktop socket
if [ -z "$WAYLAND_DISPLAY" ] && [ -S "/run/user/$(id -u)/wayland-0" ]; then
  export WAYLAND_DISPLAY="wayland-0"
  export XDG_RUNTIME_DIR="/run/user/$(id -u)"
fi

# Detect Wayland socket on host
if [ -n "$WAYLAND_DISPLAY" ] && [ -S "/run/user/$(id -u)/$WAYLAND_DISPLAY" ]; then
  exec /home/hizam/.local/bin/electron "$DIR" --ozone-platform=wayland --enable-features=UseOzonePlatform,WaylandWindowDecorations,WebRTCPipeWireCapturer --no-sandbox --disable-gpu-sandbox --remote-debugging-port=9222 "$@"
else
  exec /home/hizam/.local/bin/electron "$DIR" --no-sandbox "$@"
fi
