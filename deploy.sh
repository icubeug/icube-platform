#!/bin/bash
echo "Uploading backend..."
rsync -avz --progress -e "ssh -i ~/.ssh/icube_server" --exclude='node_modules' --exclude='.env' ~/Desktop/isp-platform/isp-upgrade root@139.84.247.205:/opt/icube/

echo "Uploading frontend..."
rsync -avz --progress -e "ssh -i ~/.ssh/icube_server" --exclude='node_modules' --exclude='.next' --exclude='.env' ~/Desktop/isp-platform/isp-frontend root@139.84.247.205:/opt/icube/

echo "Rebuilding on server..."
ssh -i ~/.ssh/icube_server root@139.84.247.205 "cd /opt/icube/isp-upgrade && docker compose up -d --build && cd /opt/icube/isp-frontend && rm -rf /opt/icube/isp-frontend/.next && npm install && npm run build && pm2 restart icube-frontend"

echo "✅ Done! Visit https://icubeug.net"
