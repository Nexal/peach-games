#!/bin/bash
cd /home/nexal/peach-games/web-app

# Start vite if not running
pgrep -f "vite --host" > /dev/null || (nohup npx vite --host > /tmp/vite.log 2>&1 &)
sleep 2

# Kill old tunnel
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# Start new tunnel
nohup npx cloudflared tunnel --url http://localhost:5173 > /tmp/cf-tunnel.log 2>&1 &
sleep 6

URL=$(grep -o 'https://[^ ]*trycloudflare.com' /tmp/cf-tunnel.log | tail -1)
echo "URL: $URL"
echo "$URL" > /tmp/peachgames-url.txt
