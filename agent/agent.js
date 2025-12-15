const io = require('socket.io-client');
const { spawn, exec } = require('child_process');
const fs = require('fs');

// Configuration from Environment
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TOKEN = process.env.AGENT_TOKEN;

if (!TOKEN) {
    console.error('❌ FATAL: AGENT_TOKEN is missing.');
    process.exit(1);
}

console.log(`🔌 Connecting to ${SERVER_URL} with token ${TOKEN.substring(0, 5)}...`);

const socket = io(SERVER_URL, {
    auth: { token: TOKEN, type: 'agent' },
    reconnection: true,
    reconnectionAttempts: 5
});

socket.on('connect', () => {
    console.log('✅ Connected to Command Center.');
    socket.emit('agent_ready', { platform: process.platform });
});

socket.on('disconnect', () => {
    console.log('⚠️ Disconnected.');
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
        // We wrap in bash to handle piping "yes" to the script for the Proxy question
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
        // Special command handled separately
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

    // Special Handling for File Download logic (if we implement streaming file later)
    if (def.special) {
         // Placeholder for now
        return;
    }

    try {
        const child = spawn(def.cmd, def.args || [], {
            cwd: '/root',
            shell: true // Safe here because we control cmd/args strictly above
        });

        child.stdout.on('data', (data) => {
            const text = data.toString();
            process.stdout.write(text); // Local log
            socket.emit('command_output', { id, type: 'stdout', data: text });
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            process.stderr.write(text); // Local log
            socket.emit('command_output', { id, type: 'stderr', data: text });
        });

        child.on('close', (code) => {
            console.log(`🏁 Command ${command} finished with code ${code}`);
            socket.emit('command_done', { id, exitCode: code });
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
