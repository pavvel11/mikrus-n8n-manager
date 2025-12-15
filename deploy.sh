#!/bin/bash

# --- KONFIGURACJA ---
MIKRUS_USER="mikrus"      # Twój user w configu SSH (~/.ssh/config) lub user@ip
REMOTE_DIR="scripts/js/app" # Gdzie aplikacja leży na serwerze
PM2_APP_NAME="n8n-manager"
TEMP_DIR="deploy_temp"

# Kolory
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}🚀 Rozpoczynam deployment Mikrus n8n Manager...${NC}"

# 1. Build Frontend
echo -e "${GREEN}🏗️  Budowanie Frontendu (Next.js)...${NC}"
cd frontend
npm install
npm run build
cd ..

# 2. Prepare Dist Folder
echo -e "${GREEN}📦 Pakowanie plików...${NC}"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR/backend
mkdir -p $TEMP_DIR/agent
mkdir -p $TEMP_DIR/frontend/out

# Backend: Kopiuj kod, pomiń node_modules
cp backend/package.json $TEMP_DIR/backend/
cp backend/*.js $TEMP_DIR/backend/

# Agent: Kopiuj kod
cp agent/package.json $TEMP_DIR/agent/
cp agent/*.js $TEMP_DIR/agent/

# Frontend: Kopiuj zbudowany static export
cp -r frontend/out/* $TEMP_DIR/frontend/out/

# 3. Upload
echo -e "${GREEN}📤 Wysyłanie plików na serwer (${MIKRUS_USER})...${NC}"
# Tworzymy katalog jeśli nie istnieje
ssh $MIKRUS_USER "mkdir -p $REMOTE_DIR"

# Wysyłamy zawartość tymczasowego folderu
scp -r $TEMP_DIR/* $MIKRUS_USER:$REMOTE_DIR/

# 4. Remote Update & Restart
echo -e "${GREEN}🔄 Instalacja zależności i restart PM2...${NC}"
ssh $MIKRUS_USER "
    cd $REMOTE_DIR/backend && 
    npm install --production && 
    pm2 restart $PM2_APP_NAME || pm2 start index.js --name $PM2_APP_NAME --node-args='--max-old-space-size=128'
"

# Cleanup
rm -rf $TEMP_DIR
echo -e "${GREEN}✅ Deployment zakończony sukcesem!${NC}"
