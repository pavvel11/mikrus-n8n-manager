const io = require('socket.io-client');
const { spawn, exec } = require('child_process');
const fs = require('fs');

// --- ERROR HANDLING (CRITICAL FOR DEBUGGING AGENT CRASHES) ---
process.on('uncaughtException', (err) => {
    fs.appendFileSync('agent.log', `\n[FATAL UNCAUGHT EXCEPTION]: ${err.stack || err.message}\n`);
    console.error('[FATAL UNCAUGHT EXCEPTION]:', err.stack || err.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    fs.appendFileSync('agent.log', `\n[FATAL UNHANDLED REJECTION]: ${reason}\n`);
    console.error('[FATAL UNHANDLED REJECTION]:', reason);
    process.exit(1);
});

// Configuration from Environment OR Config File
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

if (!SERVER_URL) {
    fs.appendFileSync('agent.log', '\n❌ FATAL: SERVER_URL is missing.\n');
    console.error('❌ FATAL: SERVER_URL is missing.');
    process.exit(1);
}

if (!TOKEN) {
    fs.appendFileSync('agent.log', '\n❌ FATAL: AGENT_TOKEN is missing.\n');
    console.error('❌ FATAL: AGENT_TOKEN is missing.');
    process.exit(1);
}

fs.appendFileSync('agent.log', `\n[INIT] Agent starting. Connecting to ${SERVER_URL} with token ${TOKEN.substring(0, 5)}...\n`);
console.log(`🔌 Agent starting. Connecting to ${SERVER_URL} with token ${TOKEN.substring(0, 5)}...`);

const socket = io(SERVER_URL, {
    auth: { token: TOKEN, type: 'agent' },
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 10000 // 10s connection timeout
});

socket.on('connect', () => {
    fs.appendFileSync('agent.log', '\n✅ Connected to Command Center.\n');
    console.log('✅ Connected to Command Center.');
    
    // Check if n8n is installed (simple directory check)
    const isInstalled = fs.existsSync('/root/.n8n') || fs.existsSync('/root/.pg_n8n');
    
    socket.emit('agent_ready', { 
        platform: process.platform,
        isInstalled
    });
});

socket.on('disconnect', (reason) => {
    fs.appendFileSync('agent.log', `\n⚠️ Disconnected: ${reason}\n`);
    console.log(`⚠️ Disconnected: ${reason}`);
});

socket.on('connect_error', (err) => {
    fs.appendFileSync('agent.log', `\n❌ Connection Error: ${err.message}\n`);
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
    'RESTART': {
        cmd: 'docker',
        args: ['restart', 'n8n']
    },
    'GET_BACKUP_FILE': {
        special: true
    }
};

// --- EXECUTION ENGINE ---
socket.on('execute_command', async (payload) => {
    const { command, id } = payload;
    
    fs.appendFileSync('agent.log', `\n[COMMAND] Received command: ${command} [${id}]\n`);
    console.log(`📥 Received command: ${command} [${id}]`);

    if (!COMMANDS[command]) {
        socket.emit('command_output', { id, type: 'error', data: `⛔ Command '${command}' not allowed.` });
        socket.emit('command_done', { id, exitCode: 1 });
        return;
    }

    const def = COMMANDS[command];

    if (def.special) {
         // Placeholder for now
        return;
    }

    try {
        const child = spawn(def.cmd, def.args || [], {
            cwd: '/root',
            shell: true 
        });

        child.stdout.on('data', (data) => {
            const text = data.toString();
            fs.appendFileSync('agent.log', text);
            process.stdout.write(text);
            socket.emit('command_output', { id, type: 'stdout', data: text });
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            fs.appendFileSync('agent.log', text);
            process.stderr.write(text);
            socket.emit('command_output', { id, type: 'stderr', data: text });
        });

        child.on('close', (code) => {
            fs.appendFileSync('agent.log', `\n🏁 Command ${command} finished with code ${code}\n`);
            console.log(`🏁 Command ${command} finished with code ${code}`);
            socket.emit('command_done', { id, exitCode: code });
        });

        child.on('error', (err) => {
             fs.appendFileSync('agent.log', `\n❌ Spawn error: ${err.message}\n`);
             console.error(`❌ Spawn error: ${err.message}`);
             socket.emit('command_output', { id, type: 'error', data: err.message });
             socket.emit('command_done', { id, exitCode: 1 });
        });

    } catch (e) {
        fs.appendFileSync('agent.log', `\n❌ Execution error: ${e.message}\n`);
        socket.emit('command_output', { id, type: 'error', data: e.message });
        socket.emit('command_done', { id, exitCode: 1 });
    }
});