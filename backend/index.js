require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { injectAgent } = require('./sshService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Serve Agent Files (for manual installation)
const path = require('path');
app.use('/dl', express.static(path.join(__dirname, '../agent')));

// Serve Frontend (Static Export)
const FRONTEND_BUILD_DIR = path.join(__dirname, '../frontend/out');
app.use(express.static(FRONTEND_BUILD_DIR));

// --- API ROUTES ---

app.post('/api/connect-ssh', async (req, res) => {
    const { host, port, username, password, privateKey, sessionId } = req.body;

    if (!host || !username || (!password && !privateKey) || !sessionId) {
        return res.status(400).json({ error: 'Missing credentials (password or private key required)' });
    }

    // Determine my own URL to tell the agent where to connect back
    // In dev: check env or guess. In prod: must be configured.
    const serverUrl = process.env.PUBLIC_URL || `http://${req.hostname}:${process.env.PORT || 3001}`;

    console.log(`[API] Initiating SSH connection for session ${sessionId}...`);

    try {
        await injectAgent({
            host,
            port: parseInt(port) || 22,
            username,
            password,
            privateKey,
            token: sessionId,
            serverUrl
        });
        res.json({ success: true, message: 'Agent installed and started.' });
    } catch (err) {
        console.error('[API] SSH Injection Failed:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- WEBSOCKET LOGIC ---

io.on('connection', (socket) => {
    const { token, type } = socket.handshake.auth;

    if (type === 'agent') {
        // --- AGENT CONNECTED ---
        console.log(`🤖 Agent connected for session: ${token}`);
        socket.join(token);
        
        // Notify frontend
        io.to(token).emit('agent_status', { status: 'online' });

        // Forward outputs from Agent to Frontend
        socket.on('command_output', (data) => {
            io.to(token).emit('command_output', data);
        });

        socket.on('command_done', (data) => {
            io.to(token).emit('command_done', data);
        });

        socket.on('disconnect', () => {
            console.log(`🤖 Agent disconnected: ${token}`);
            io.to(token).emit('agent_status', { status: 'offline' });
        });

    } else {
        // --- FRONTEND CONNECTED ---
        // Frontend sends 'join_session' event manually or via auth
        // Let's assume frontend sends a specific join event
        
        socket.on('join_session', (sessionId) => {
            console.log(`🖥️ Frontend joined session: ${sessionId}`);
            socket.join(sessionId);

            // Check if Agent is already in this room
            const room = io.sockets.adapter.rooms.get(sessionId);
            if (room) {
                for (const clientId of room) {
                    const clientSocket = io.sockets.sockets.get(clientId);
                    if (clientSocket && clientSocket.handshake.auth.type === 'agent') {
                        // Found an agent! Tell the frontend.
                        socket.emit('agent_status', { status: 'online' });
                        break;
                    }
                }
            }
        });

        // Frontend sends command -> We relay to Agent in the room
        socket.on('send_command', (payload) => {
            const { sessionId, command } = payload;
            console.log(`⚡ Command ${command} -> Session ${sessionId}`);
            // Broadcast to the room (Agent will pick it up)
            // We use .to(sessionId) but we need to make sure we don't loop back to frontend if logic changes
            // Sending to all in room except sender is socket.to(sessionId).emit...
            // But Agent is just a listener.
            io.to(sessionId).emit('execute_command', { command, id: payload.id || Date.now() });
        });
    }
});

const PORT = process.env.PORT || 3001;

// SPA Fallback: For any other request, send index.html
// Using app.use() without a path acts as a catch-all for any request not handled above
app.use((req, res) => {
    // Only send index.html for GET requests
    if (req.method === 'GET') {
        res.sendFile(path.join(FRONTEND_BUILD_DIR, 'index.html'));
    } else {
        res.status(404).json({ error: 'Not Found' });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
