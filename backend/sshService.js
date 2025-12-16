const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AGENT_SRC_DIR = path.join(__dirname, '../agent');

async function injectAgent({ host, port, username, password, privateKey, token, serverUrl, onProgress }) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        
        const connectConfig = {
            host,
            port,
            username,
            readyTimeout: 60000, // Increased for Mikrus
            debug: (msg) => console.log(`[${new Date().toISOString()}] [SSH DEBUG] ${msg}`),
            // Accept any host key (avoid "unknown host" hang/error)
            hostHash: 'sha1', 
            hostVerifier: () => true,
            // Force algorithms support for newer OpenSSH versions
            algorithms: {
                serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ssh-ed25519']
            },
            // Support for Keyboard Interactive (PAM)
            tryKeyboard: true
        };

        if (privateKey) {
            connectConfig.privateKey = privateKey.trim();
        } else {
            connectConfig.password = password;
        }
        
        conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
            console.log(`[SSH DEBUG] Keyboard-Interactive prompt received: ${prompts.length} prompts`);
            // Usually just one prompt for password. We auto-fill it with the password we have.
            const responses = prompts.map(() => password);
            finish(responses);
        });

        conn.on('ready', () => {
            console.log(`[SSH] Connected to ${host}`);
            if (onProgress) onProgress('SSH Connected. Checking Node.js environment...');
            
            const checkSystemNode = 'node -v && npm -v';
            const checkPortableNode = '/root/mikrus-manager/runtime/bin/node -v';
            const installPortableNodeCmd = 'mkdir -p /root/mikrus-manager/runtime && curl -sL https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz | tar -xJ -C /root/mikrus-manager/runtime --strip-components=1';

            // 1. Check System Node
            conn.exec(checkSystemNode, (err, stream) => {
                if (err) return _fail(conn, reject, err);
                
                stream.on('data', () => {}); 
                stream.on('close', (code) => {
                    if (code === 0) {
                        console.log('[SSH] System Node environment detected.');
                        if (onProgress) onProgress('System Node.js found. Uploading agent...');
                        _uploadFiles(conn, { token, serverUrl, onProgress }, resolve, reject);
                    } else {
                        // 2. Check Portable Node (Already installed?)
                        console.log(`[SSH] System Node missing (code ${code}). Checking existing portable runtime...`);
                        conn.exec(checkPortableNode, (chkErr, chkStream) => {
                            if (chkErr) return _fail(conn, reject, chkErr);
                            
                            chkStream.on('data', () => {});
                            chkStream.on('close', (chkCode) => {
                                if (chkCode === 0) {
                                    console.log('[SSH] Existing Portable Node found.');
                                    if (onProgress) onProgress('Znaleziono lokalny Node.js (Portable). Pomijam pobieranie.');
                                    _uploadFiles(conn, { token, serverUrl, onProgress }, resolve, reject);
                                } else {
                                    // 3. Install Portable Node
                                    console.log('[SSH] Installing Portable Node.js...');
                                    if (onProgress) onProgress('Node.js missing. Downloading standalone binary (bypass system errors)...');
                                    
                                    conn.exec(installPortableNodeCmd, (installErr, installStream) => {
                                        if (installErr) return _fail(conn, reject, installErr);
                                        installStream.on('data', (data) => console.log(`[Portable Install] ${data}`));
                                        installStream.on('close', (installCode) => {
                                            if (installCode === 0) {
                                                console.log('[SSH] Portable Node.js installed.');
                                                if (onProgress) onProgress('Portable Node.js ready. Uploading agent...');
                                                _uploadFiles(conn, { token, serverUrl, onProgress }, resolve, reject);
                                            } else {
                                                _fail(conn, reject, new Error(`Failed to download portable Node.js (exit code: ${installCode}). Check internet connection.`));
                                            }
                                        });
                                    });
                                }
                            });
                        });
                    }
                });
            });

        }).on('error', (err) => {
            reject(err);
        }).connect(connectConfig);
    });
}

function _uploadFiles(conn, config, resolve, reject) {
    const { onProgress } = config;
    const remoteDir = '/root/mikrus-manager';
    
    // Ensure dir exists
    if (onProgress) onProgress(`Pakuję agenta i wysyłam (Stream)...`);
    
    try {
        // Create tarball buffer
        const tarBuffer = execSync(`tar -czf - -C "${AGENT_SRC_DIR}" .`);
        
        // 1. Stream Upload
        // We use 'cat' to write to a file from stdin. This avoids shell length limits.
        const uploadCmd = `mkdir -p ${remoteDir} && cat > ${remoteDir}/agent.tar.gz`;

        conn.exec(uploadCmd, (err, stream) => {
            if (err) return _fail(conn, reject, err);
            
            // Handle stream events
            stream.on('close', (code, signal) => {
                if (code !== 0) {
                    return _fail(conn, reject, new Error(`Upload stream failed with code ${code}`));
                }
                
                console.log('[SSH] Tarball uploaded via stream.');
                if (onProgress) onProgress('Archiwum wgrane. Rozpakowuję...');
                
                // 2. Extract
                const extractCmd = `tar -xzf ${remoteDir}/agent.tar.gz -C ${remoteDir}`;
                conn.exec(extractCmd, (extErr, extStream) => {
                    if (extErr) return _fail(conn, reject, extErr);
                    
                    extStream.on('close', (extCode) => {
                        if (extCode !== 0) {
                            return _fail(conn, reject, new Error(`Extraction failed with code ${extCode}`));
                        }
                        console.log('[SSH] Extraction complete.');
                        _installAndStart(conn, remoteDir, config, resolve, reject);
                    });
                    
                    extStream.on('data', () => {}); // Consume stdout
                });
            });
            
            stream.on('data', () => {}); // Consume stdout of 'cat' (should be empty)
            stream.stderr.on('data', (data) => console.log(`[Upload Stderr] ${data}`));

            // WRITE THE DATA
            // Writing large buffer might need chunking, but ssh2 usually handles it.
            // Let's write it at once, if it fails we can chunk it manually.
            stream.write(tarBuffer);
            stream.end();
        });

    } catch (e) {
        return _fail(conn, reject, new Error(`Failed to pack agent: ${e.message}`));
    }
}

function _installAndStart(conn, remoteDir, { token, serverUrl, onProgress }, resolve, reject) {
    if (onProgress) onProgress('Konfiguruję Systemd Service (Autostart)...');
    
    const portableNodePath = '/root/mikrus-manager/runtime/bin/node';
    const agentScript = `${remoteDir}/agent.js`;
    
    // Create config file first
    const configContent = JSON.stringify({
        SERVER_URL: serverUrl,
        AGENT_TOKEN: token
    });

    const serviceContent = `[Unit]
Description=Mikrus Manager Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${remoteDir}
ExecStart=${portableNodePath} ${agentScript}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`;

    // Commands:
    // 1. Write config.json
    // 2. Write service file
    // 3. Reload systemd and start service
    const cmd = `
        echo '${configContent}' > ${remoteDir}/config.json && \
        chmod 600 ${remoteDir}/config.json && \
        echo '${serviceContent}' > /etc/systemd/system/mikrus-agent.service && \
        systemctl daemon-reload && \
        systemctl enable mikrus-agent && \
        systemctl restart mikrus-agent
    `;

    conn.exec(cmd, (err, stream) => {
        if (err) return _fail(conn, reject, err);
        
        stream.on('data', () => {}); 
        stream.on('close', (code, signal) => {
            if (code !== 0) {
                 return _fail(conn, reject, new Error('Błąd konfiguracji Systemd (kod: ' + code + '). Upewnij się, że masz uprawnienia roota.'));
            }
            console.log('[SSH] Systemd service configured and started.');
            if (onProgress) onProgress('Agent zainstalowany jako usługa Systemd. Sukces!');
            conn.end();
            resolve({ success: true });
        });
    });
}

function _fail(conn, reject, err) {
    console.error(`[SSH Error] ${err.message}`);
    if (conn) conn.end();
    reject(err);
}

module.exports = { injectAgent };