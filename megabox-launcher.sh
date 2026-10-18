#!/usr/bin/env bash
# Megabox Launcher for Kubuntu / Linux (Safe GPU & Sandbox workaround)
DIR=""
export ELECTRON_ENABLE_LOGGING=1
exec npx electron "" --no-sandbox --disable-gpu ""
