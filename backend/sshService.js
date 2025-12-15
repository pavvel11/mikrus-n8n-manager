const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const AGENT_SRC_DIR = path.join(__dirname, '../agent');

async function injectAgent({ host, port, username, password, privateKey, token, serverUrl }) {
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
            }
        };

        if (privateKey) {
            connectConfig.privateKey = privateKey.trim();
        } else {
            connectConfig.password = password;
        }
        
        conn.on('ready', () => {
            console.log(`[SSH] Connected to ${host}`);
            
            // Flow:
            // 1. Check Node/NPM
            // 2. Create Directory
            // 3. Upload Files
            // 4. Install Deps
            // 5. Start Agent
            
            conn.exec('node -v && npm -v', (err, stream) => {
                if (err) return _fail(conn, reject, err);
                
                let output = '';
                stream.on('data', (data) => { output += data; })
                      .on('close', (code) => {
                          if (code !== 0) {
                              return _fail(conn, reject, new Error('Node.js or NPM not found on server. Agent requires Node.js.'));
                          }
                          console.log('[SSH] Node environment detected.');
                          _uploadFiles(conn, { token, serverUrl }, resolve, reject);
                      });
            });

        }).on('error', (err) => {
            reject(err);
        }).connect(connectConfig);
    });
}

function _uploadFiles(conn, config, resolve, reject) {
    conn.sftp((err, sftp) => {
        if (err) return _fail(conn, reject, err);

        const remoteDir = '/root/mikrus-manager'; // Using root as typical for Mikrus, but could be ~ 
        
        // Ensure dir exists
        conn.exec(`mkdir -p ${remoteDir}`, (err, stream) => {
            if (err) return _fail(conn, reject, err);
            
            stream.on('close', () => {
                // Upload files
                const agentJs = fs.readFileSync(path.join(AGENT_SRC_DIR, 'agent.js'));
                const packageJson = fs.readFileSync(path.join(AGENT_SRC_DIR, 'package.json'));

                // Parallel upload (simple callback hell avoidance)
                let pending = 2;
                const checkDone = () => {
                    pending--;
                    if (pending === 0) {
                        console.log('[SSH] Files uploaded.');
                        _installAndStart(conn, remoteDir, config, resolve, reject);
                    }
                };

                sftp.writeFile(`${remoteDir}/agent.js`, agentJs, (err) => {
                    if (err) return _fail(conn, reject, err);
                    checkDone();
                });

                sftp.writeFile(`${remoteDir}/package.json`, packageJson, (err) => {
                    if (err) return _fail(conn, reject, err);
                    checkDone();
                });
            });
        });
    });
}

function _installAndStart(conn, remoteDir, { token, serverUrl }, resolve, reject) {
    console.log('[SSH] Installing dependencies and starting agent...');
    
    // Command explanation:
    // 1. cd to dir
    // 2. npm install (quietly)
    // 3. kill old agent if exists
    // 4. start new agent with nohup, redirect output to log, and disown process so SSH can close
    
    const cmd = "\n        cd " + remoteDir + " && \
        npm install --production --silent && \
        pkill -f \"node agent.js\" || true && \
        export SERVER_URL=\"" + serverUrl + "\" && \
        export AGENT_TOKEN=\"" + token + "\" && \
        nohup node agent.js > agent.log 2>&1 & exit\n    ";

    conn.exec(cmd, (err, stream) => {
        if (err) return _fail(conn, reject, err);
        
        stream.on('close', (code, signal) => {
            console.log('[SSH] Agent started.');
            conn.end();
            resolve({ success: true });
        });
    });
}

function _fail(conn, reject, err) {
    console.error(`[SSH Error] ${err.message}`);
    conn.end();
    reject(err);
}

module.exports = { injectAgent };
