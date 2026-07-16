# 🚀 Mikrus n8n Manager

> **The easiest way to install and manage n8n on Mikrus VPS.**  
[![Polski](https://img.shields.io/badge/lang-Polski-blue.svg)](README.md)

## 📖 About

**Mikrus n8n Manager** is a modern, GUI-based tool designed to simplify the deployment and management of [n8n](https://n8n.io) automation workflows on [Mikrus.pl](https://mikr.us/?r=pavvel) VPS instances.

**See the live application here:** [https://manager.cytr.us/](https://manager.cytr.us/)

---

## 🛠️ Architecture

The application consists of three parts:

1.  **Frontend (Next.js):** Beautiful dark interface with Aurora effect, terminal emulation, and real-time communication. Served statically by Backend.
2.  **Backend (Node.js/Express):** The bridge. Accepts login credentials, establishes SSH tunnel to your VPS, and uploads the Agent.
3.  **Agent (Node.js):** Lightweight script running on your server.

---

## 🚀 Getting Started

### Prerequisites
*   A VPS at [Mikrus.pl](https://mikr.us/?r=pavvel) (v2.1 or higher recommended).
*   Your SSH credentials (Host, Port, User, Password).

### Running on Mikrus (PM2)

```bash
# Clone the repository
git clone https://github.com/jurczykpawel/mikrus-n8n-manager.git /scripts/js/app
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

## 🎓 Expert Mode

For those who prefer the terminal, we strongly recommend learning SSH.
The application includes a built-in **Terminal Guide** that generates a configuration script for you.

### 🪄 SSH Setup - Your Terminal Best Friend

Configure SSH connection with a single command:

```bash
bash <(curl -s https://raw.githubusercontent.com/jurczykpawel/mikrus-toolbox/main/local/setup-ssh.sh)
```

**What does it do?**
1.  Asks for your server details (Host, Port, User).
2.  Generates a secure SSH key (if you don't have one).
3.  Uploads the public key to the server (enabling automatic login).
4.  Configures your `~/.ssh/config` file.

**Result:** instead of `ssh root@srv20.mikr.us -p 10107` (+ password) you just type `ssh mikrus`.

The script is 100% safe - it uses standard SSH mechanisms built into your system.

---

## 🤝 Troubleshooting

**Q: Installation hangs on "Resolving Host..."**
A: Check if you are using the correct SSH Port (e.g., 10107, NOT 22).

**Q: "EACCES: permission denied" in logs?**
A: Use the **"Hard Reset (Fix Docker)"** button in the Troubleshooting section. This fixes ownership of the `.n8n` directory which Docker sometimes claims as root.

**Q: Can I install Postgres on Mikrus 2.1?**
A: No. The application actively prevents this to avoid crashing your server due to OOM (Out Of Memory). Upgrade to Mikrus 3.0+.

---

## 🍺 Support

The manager is free. If your n8n runs thanks to it and it saves you hours of manual
setup — you can buy me a beer:

[![🍺 Buy me a beer](https://img.shields.io/badge/🍺_Buy_me_a_beer-FFDD00)](https://sellf.techskills.academy/checkout/tip-mikrus-n8n-manager?utm_source=github&utm_medium=readme&utm_campaign=tip-jar)

## 📜 License

MIT License. Created by **Lazy Engineer**. Vibecoded with Gemini ♊.
