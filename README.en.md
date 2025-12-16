# 🚀 Mikrus n8n Manager

> **The easiest way to install and manage n8n on Mikrus VPS.**  
> *Built by a Lazy Engineer for Lazy Engineers.*

![Mikrus n8n Manager UI](https://github.com/TwojUser/mikrus-n8n-manager/assets/placeholder-image.png)

## 📖 About

**Mikrus n8n Manager** is a modern, GUI-based tool designed to simplify the deployment and management of [n8n](https://n8n.io) automation workflows on [Mikrus.pl](https://mikr.us) VPS instances.

Running n8n on low-resource LXC containers (like Mikrus) can be tricky due to dependency hell (glibc versions), memory constraints, and Docker restart loops. This tool handles all edge cases automatically.

### ✨ Key Features

*   **1-Click Installation:** Automatically detects system resources and installs the appropriate n8n version (SQLite for <2GB RAM, Postgres for >2GB RAM).
*   **Zero-Config Connection:** Connects via SSH using credentials from your Mikrus email. No manual terminal setup required.
*   **Portable Agent Architecture:** Injects a self-contained Node.js environment (Portable Node) to the server, bypassing system package managers (`apt`/`apk`) failures.
*   **Real-time Feedback:** See live logs from your server via WebSocket.
*   **Safety First:** Passwords are used only once for the SSH handshake and are never stored. The agent runs as a transient or Systemd service.
*   **Disaster Recovery:** Includes a "Hard Reset" (Nuclear Option) to unfreeze stuck Docker containers and fix permission errors automatically.
*   **Backup Manager:** Create and download backups of your n8n workflows/credentials directly from the browser.

---

## 🛠️ Architecture

The application consists of three parts:

1.  **Frontend (Next.js):** A beautiful, dark-themed UI with "Aurora" effects, terminal emulation, and real-time status updates via Socket.io.
2.  **Backend (Node.js/Express):** Acts as a bridge. It accepts your credentials, establishes a secure SSH tunnel to your VPS, and deploys the Agent.
3.  **The Agent (Node.js):** A lightweight script injected into your VPS. It runs locally on the server, executing Docker commands and streaming output back to the Frontend via WebSockets.

**Why "Portable Node"?**
Mikrus servers often run older Linux distributions. Installing modern Node.js (required for the Agent) via `apt` often fails. This project downloads a standalone, binary version of Node.js to `/root/mikrus-manager/runtime`, ensuring the Agent works on *any* Linux distro without touching system libraries.

---

## 🚀 Getting Started

### Prerequisites
*   A VPS at [Mikrus.pl](https://mikr.us/?r=pavvel) (v2.1 or higher recommended).
*   Your SSH credentials (Host, Port, User, Password).

### Running Locally (Docker)

```bash
# Clone the repository
git clone https://github.com/TwojUser/mikrus-n8n-manager.git
cd mikrus-n8n-manager

# Install dependencies & Build
cd frontend && npm install && npm run build
cd ..
cd backend && npm install

# Start the server
npm start
```

Open `http://localhost:3001` in your browser.

---

## 🛡️ Security

*   **Hot Potato Credentials:** Your password/private key is held in RAM only during the initial SSH handshake. Once the Agent is deployed, the credentials are wiped.
*   **Authorized Commands Only:** The Agent accepts only a strict whitelist of commands (`INSTALL`, `UPDATE`, `BACKUP`, `RESTART`, `FIX_DOCKER`). Arbitrary code execution is blocked.
*   **Standard SSH:** All initial communication happens over standard, encrypted SSH channels.

---

## 🎓 Expert Mode

For those who prefer the terminal, we strongly recommend learning SSH.
The application includes a built-in **Terminal Guide** that generates a configuration script for you.

You can also run the setup script directly:
```bash
./setup_mikrus.sh
```
This will configure your `~/.ssh/config` so you can connect simply by typing `ssh mikrus`.

---

## 🤝 Troubleshooting

**Q: Installation hangs on "Resolving Host..."**
A: Check if you are using the correct SSH Port (e.g., 10107, NOT 22).

**Q: "EACCES: permission denied" in logs?**
A: Use the **"Hard Reset (Fix Docker)"** button in the Troubleshooting section. This fixes ownership of the `.n8n` directory which Docker sometimes claims as root.

**Q: Can I install Postgres on Mikrus 2.1?**
A: No. The application actively prevents this to avoid crashing your server due to OOM (Out Of Memory). Upgrade to Mikrus 3.0+.

---

## 📜 License

MIT License. Created by **Lazy Engineer**.

*Disclaimer: This is a community project. As this is a new tool, its use allows for simple and fast n8n management, and any errors will be corrected on an ongoing basis.
*