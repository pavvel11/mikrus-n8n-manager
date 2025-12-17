const io = require('socket.io-client');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

let isConnected = false;

// --- ERROR HANDLING --- 
process.on('uncaughtException', (err) => {
    try { fs.appendFileSync('agent.log', `\n[FATAL UNCAUGHT EXCEPTION]: ${err.stack || err.message}\n`); } catch(e){}
    console.error('[FATAL UNCAUGHT EXCEPTION]:', err.stack || err.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    try { fs.appendFileSync('agent.log', `\n[FATAL UNHANDLED REJECTION]: ${reason}\n`); } catch(e){}
    console.error('[FATAL UNHANDLED REJECTION]:', reason);
    process.exit(1);
});

// Helper to check installation state
function checkInstallation() {
    const fs = require('fs');
    const { execSync } = require('child_process');
    
    let isInstalled = false;
    let hasContainer = false;

    // 1. Check directories (Standard Manager install)
    if (fs.existsSync('/root/.n8n') || fs.existsSync('/root/.pg_n8n')) {
        isInstalled = true;
    }

    // 2. Check Docker containers (Manual/Legacy install)
    try {
        // Check if docker command exists first
        const dockerCheck = execSync('command -v docker || true').toString().trim();
        if (dockerCheck) {
            const containers = execSync("docker ps -a --format '{{.Names}}'").toString();
            if (containers.includes('n8n')) {
                hasContainer = true;
            }
        }
    } catch (e) {
        // Docker not installed or permission error - ignore
    }

    console.log(`[checkInstallation] isInstalled: ${isInstalled}, hasContainer: ${hasContainer}`);
    return { isInstalled, hasContainer };
}

let lastCpuUsage = process.cpuUsage();
let lastTime = Date.now();

// --- MAIN LOOP ---
setInterval(() => {
    if (!isConnected) return;

    try {
        // System Stats
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const load = os.loadavg()[0]; // 1 min load avg

        // Agent Stats
        const now = Date.now();
        const timeDiff = now - lastTime;
        const cpuDiff = process.cpuUsage(lastCpuUsage);
        
        lastTime = now;
        lastCpuUsage = process.cpuUsage();

        // CPU Usage in % (user + system) / time elapsed
        // cpuDiff is in microseconds (10^-6), timeDiff is in milliseconds (10^-3)
        // (microseconds / 1000) = milliseconds
        const usedMs = (cpuDiff.user + cpuDiff.system) / 1000;
        const agentCpuPercent = (usedMs / timeDiff) * 100;
        const agentRamMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

        // Format for dashboard
        const memMb = Math.round(usedMem / 1024 / 1024);
        const totalMemMb = Math.round(totalMem / 1024 / 1024);
        
        let installStatus = { isInstalled: false, hasContainer: false };
        try {
            installStatus = checkInstallation();
        } catch (e) {
            console.error('Error checking installation:', e.message);
        }

        socket.emit('agent_status', {
            status: 'online',
            ram: memMb,
            totalMemMb: totalMemMb,
            load: load.toFixed(2),
            isInstalled: installStatus.isInstalled,
            hasContainer: installStatus.hasContainer,
            agentStats: {
                ram: agentRamMb,
                cpu: agentCpuPercent.toFixed(2)
            }
        });
    } catch (err) {
        console.error('Main loop error:', err);
    }

}, 2000);

// Configuration
let SERVER_URL = process.env.SERVER_URL;
let TOKEN = process.env.AGENT_TOKEN;

if (!SERVER_URL || !TOKEN) {
    try {
        if (fs.existsSync('config.json')) {
            const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
            if (!SERVER_URL) SERVER_URL = config.SERVER_URL;
            if (!TOKEN) TOKEN = config.AGENT_TOKEN;
            console.log('loaded config from config.json');
        }
    } catch (e) {
        console.error('Failed to load config.json:', e.message);
    }
}

if (!SERVER_URL || !TOKEN) {
    console.error('❌ FATAL: Config missing.');
    process.exit(1);
}

console.log(`🔌 Agent starting. Connecting to ${SERVER_URL} with token ${TOKEN.substring(0, 5)}...`);

const socket = io(SERVER_URL, {
    auth: { token: TOKEN, type: 'agent' },
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 10000 
});

socket.on('connect', () => {
    isConnected = true;
    console.log('✅ Connected to Command Center.');
    const status = checkInstallation();
    socket.emit('agent_ready', { 
        platform: process.platform,
        isInstalled: status.isInstalled,
        hasContainer: status.hasContainer,
        totalMemMb: Math.round(os.totalmem() / 1024 / 1024)
    });
});
socket.on('disconnect', (reason) => {
    isConnected = false;
    console.log(`⚠️ Disconnected: ${reason}`);
});

socket.on('connect_error', (err) => {
    console.error('❌ Connection Error:', err.message);
});

// --- WHITELISTED COMMANDS --- 
const COMMANDS = {
    'STATUS': {
        cmd: 'docker',
        args: ['inspect', '-f', '{{.State.Running}}', 'n8n']
    },
    'INSTALL': {
        cmd: 'bash',
        args: ['-c', 'echo "T" | /bin/n8n_install'] 
    },
    'INSTALL_POSTGRES': {
        cmd: 'bash',
        args: ['-c', 'echo "T" | /bin/n8n_install_postgres']
    },
    'BACKUP': {
        cmd: '/bin/n8n_backup',
        args: ['RUN']
    },
    'UPDATE': {
        cmd: '/bin/n8n_update',
        args: []
    },
    'LOGS_N8N': {
        cmd: 'docker',
        args: ['logs', 'n8n']
    },
    'RESTART': {
        cmd: 'docker',
        args: ['restart', 'n8n']
    },
    'FIX_DOCKER': {
        cmd: 'bash',
        args: ['-c', 'echo "Restarting Docker Daemon..."; systemctl restart docker; sleep 5; echo "Killing containers..."; docker kill n8n || true; docker kill watchtower_n8n || true; echo "Removing containers..."; docker rm -f n8n || true; docker rm -f watchtower_n8n || true; echo "Removing images..."; docker rmi -f n8nio/n8n:latest containrrr/watchtower || true; docker system prune -f; echo "Fixing permissions..."; chown -R 1000:1000 /root/.n8n || true; chown -R 1000:1000 /root/.pg_n8n || true']
    },
    'GET_BACKUP_FILE': {
        special: true
    }
};

// --- EXECUTION ENGINE --- 
socket.on('execute_command', async (payload) => {
    const { command, id } = payload;
    
    console.log(`📥 Received command: ${command} [${id}]`);

    if (!COMMANDS[command]) {
        socket.emit('command_output', { id, type: 'error', data: `⛔ Command '${command}' not allowed.` });
        socket.emit('command_done', { id, exitCode: 1 });
        return;
    }

    const def = COMMANDS[command];

    // Special Handling for File Download
    if (command === 'GET_BACKUP_FILE') {
        const backupDir = '/backup/n8n';
        
        fs.readdir(backupDir, (err, files) => {
            if (err) {
                const msg = `Error reading backup directory: ${err.message}`;
                socket.emit('command_output', { id, type: 'error', data: msg });
                socket.emit('command_done', { id, exitCode: 1 });
                return;
            }

            // Filter .gz files
            const backupFiles = files.filter(f => f.endsWith('.gz'));

            if (backupFiles.length === 0) {
                socket.emit('command_output', { id, type: 'error', data: 'Brak plików backupu (.gz) w katalogu /backup/n8n/' });
                socket.emit('command_done', { id, exitCode: 1 });
                return;
            }

            // Sort by mtime (newest first)
            try {
                const sortedFiles = backupFiles.map(fileName => {
                    const stats = fs.statSync(`${backupDir}/${fileName}`);
                    return { name: fileName, mtime: stats.mtime.getTime() };
                }).sort((a, b) => b.mtime - a.mtime);

                const latestFile = sortedFiles[0];
                const fullPath = `${backupDir}/${latestFile.name}`;

                fs.readFile(fullPath, (readErr, data) => {
                    if (readErr) {
                        socket.emit('command_output', { id, type: 'error', data: `Read error: ${readErr.message}` });
                        socket.emit('command_done', { id, exitCode: 1 });
                        return;
                    }

                    // Send file as base64
                    socket.emit('file_download', {
                        filename: latestFile.name, 
                        content: data.toString('base64') 
                    });
                    
                    socket.emit('command_output', { id, type: 'stdout', data: `Wysyłanie pliku: ${latestFile.name} (${(data.length / 1024).toFixed(2)} KB)` });
                    socket.emit('command_done', { id, exitCode: 0 });
                });

            } catch (statErr) {
                socket.emit('command_output', { id, type: 'error', data: `Stat error: ${statErr.message}` });
                socket.emit('command_done', { id, exitCode: 1 });
            }
        });
        return;
    }

    try {
        const child = spawn(def.cmd, def.args || [], {
            cwd: '/root',
            shell: true 
        });

        child.stdout.on('data', (data) => {
            const text = data.toString();
            socket.emit('command_output', { id, type: 'stdout', data: text });
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            socket.emit('command_output', { id, type: 'stderr', data: text });
        });

        child.on('close', (code) => {
            console.log(`🏁 Command ${command} finished with code ${code}`);
            socket.emit('command_done', { id, exitCode: code });
            
                        // Refresh installation status after any command
                        const status = checkInstallation();
                        socket.emit('agent_ready', { 
                            platform: process.platform,
                            isInstalled: status.isInstalled,
                            hasContainer: status.hasContainer,
                            totalMemMb: Math.round(os.totalmem() / 1024 / 1024)
                        });
                    });
        child.on('error', (err) => {
             console.error(`❌ Spawn error: ${err.message}`);
             socket.emit('command_output', { id, type: 'error', data: err.message });
             socket.emit('command_done', { id, exitCode: 1 });
        });

    } catch (e) {
        socket.emit('command_output', { id, type: 'error', data: e.message });
        socket.emit('command_done', { id, exitCode: 1 });
    }
});
