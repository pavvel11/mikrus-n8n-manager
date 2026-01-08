# 🚀 Mikrus n8n Manager

> **The easiest way to install and manage n8n on Mikrus VPS.**  
> *Built by a Lazy Engineer for Lazy Engineers.*

[![Polski](https://img.shields.io/badge/lang-Polski-blue.svg)](README.md)

## 📖 About

**Mikrus n8n Manager** is a modern, GUI-based tool designed to simplify the deployment and management of [n8n](https://n8n.io) automation workflows on [Mikrus.pl](https://mikr.us) VPS instances.

**See the live application here:** [https://manager.cytr.us/](https://manager.cytr.us/)

---

## 🚀 Getting Started

### Prerequisites
*   A VPS at [Mikrus.pl](https://mikr.us/?r=pavvel) (v2.1 or higher recommended).
*   Your SSH credentials (Host, Port, User, Password).

### Running on Mikrus (PM2)

```bash
# Clone the repository
git clone https://github.com/pavvel11/mikrus-n8n-manager.git /scripts/js/app
cd /scripts/js/app

# Build frontend
cd frontend && npm install && npm run build
cd ..

# Install backend & Start
cd backend && npm install
pm2 start ../ecosystem.config.js
pm2 save
```

Open `https://manager.cytr.us/` (or your IP at port 3030).

---

## 🧯 Maintenance (VPS)

The application is managed by **PM2**.

1.  **Check status:** `pm2 status`
2.  **Restart Manager:** `pm2 restart mikrus-manager`
3.  **Check logs:** `pm2 logs mikrus-manager`

---

## 📜 License

MIT License. Created by **Lazy Engineer**. Vibecoded with Gemini ♊.
