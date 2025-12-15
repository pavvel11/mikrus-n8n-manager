'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const BACKEND_URL = ''; // Relative path for production (served by same backend)

type LogEntry = {
  id: string;
  type: 'stdout' | 'stderr' | 'error' | 'info';
  text: string;
  timestamp: number;
};

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [agentStatus, setAgentStatus] = useState<'offline' | 'online'>('offline');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [host, setHost] = useState('');
  const [port, setPort] = useState(''); // Mikrus often uses random high ports
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [authMethod, setAuthMethod] = useState<'password' | 'key'>('password');

  const terminalRef = useRef<HTMLDivElement>(null);

  // Initialize Session & Socket
  useEffect(() => {
    // Generate or retrieve session ID
    let sid = localStorage.getItem('mikrus_session_id');
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem('mikrus_session_id', sid);
    }
    setSessionId(sid);

    // Load saved host and port
    const savedHost = localStorage.getItem('mikrus_host');
    const savedPort = localStorage.getItem('mikrus_port');
    if (savedHost) setHost(savedHost);
    if (savedPort) setPort(savedPort);

    // Connect Socket
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Connected to Backend');
      newSocket.emit('join_session', sid);
    });

    newSocket.on('agent_status', (data: { status: 'online' | 'offline' }) => {
      setAgentStatus(data.status);
      addLog('info', `Agent is now ${data.status.toUpperCase()}`);
    });

    newSocket.on('command_output', (data: { type: string; data: string }) => {
      addLog(data.type as any, data.data);
    });
    
    newSocket.on('command_done', (data: { exitCode: number }) => {
      addLog('info', `Command finished with exit code ${data.exitCode}`);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (type: LogEntry['type'], text: string) => {
    setLogs(prev => [...prev, { id: uuidv4(), type, text, timestamp: Date.now() }]);
  };

  const handleConnectSSH = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save credentials immediately (better UX for retries)
    localStorage.setItem('mikrus_host', host);
    localStorage.setItem('mikrus_port', port);

    setLoading(true);
    addLog('info', `Initiating SSH connection via ${authMethod}...`);

    try {
      const payload = { 
          host, 
          port, 
          username, 
          sessionId,
          // Conditionally send password or privateKey
          password: authMethod === 'password' ? password : undefined,
          privateKey: authMethod === 'key' ? privateKey : undefined
      };

      const res = await fetch(`${BACKEND_URL}/api/connect-ssh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');

      addLog('info', 'SSH Connection successful. Agent installed. Waiting for agent...');
      // Clear sensitive data from memory
      setPassword(''); 
      setPrivateKey(''); // Clear private key after successful connection

    } catch (err: any) {
      addLog('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendCommand = (cmd: string) => {
    if (!socket) return;
    addLog('info', `> Sending command: ${cmd}`);
    socket.emit('send_command', { sessionId, command: cmd });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-mono p-4 md:p-8">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">Mikrus n8n Manager</h1>
          <p className="text-sm text-slate-500">Lazy Engineer Edition</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-500">Agent Status:</span>
          <span className={`px-2 py-1 rounded text-xs font-bold ${agentStatus === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {agentStatus}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Connection Form (Only show if offline) */}
          {agentStatus === 'offline' && (
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
              <h2 className="text-lg font-bold mb-4 text-white">1. Connect Server</h2>
              <form onSubmit={handleConnectSSH} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Host (IP or Domain)</label>
                  <input required type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="srvX.mikr.us" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-emerald-500 outline-none transition" />
                </div>
                <div className="flex gap-2">
                    <div className="w-1/3">
                        <label className="block text-xs text-slate-400 mb-1">Port</label>
                        <input required type="text" value={port} onChange={e => setPort(e.target.value)} placeholder="22" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-emerald-500 outline-none transition" />
                    </div>
                    <div className="w-2/3">
                        <label className="block text-xs text-slate-400 mb-1">User</label>
                        <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-emerald-500 outline-none transition" />
                    </div>
                </div>

                {authMethod === 'password' ? (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="block text-xs text-slate-400 mb-1">Password</label>
                    <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-emerald-500 outline-none transition" />
                    <p className="text-[10px] text-slate-500 mt-1">Hasło jest używane TYLKO raz. Nie zapisujemy go.</p>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="block text-xs text-slate-400 mb-1">Private Key (OpenSSH PEM)</label>
                    <textarea required value={privateKey} onChange={e => setPrivateKey(e.target.value)} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-2 text-[10px] font-mono focus:border-emerald-500 outline-none transition resize-none" />
                  </div>
                )}

                <button disabled={loading} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition">
                  {loading ? 'Connecting...' : 'Connect & Install Agent'}
                </button>

                <div className="text-right">
                  <button type="button" onClick={() => setAuthMethod(authMethod === 'password' ? 'key' : 'password')} className="text-[10px] text-slate-600 hover:text-emerald-500 transition underline decoration-dotted">
                    {authMethod === 'password' ? 'Advanced: Auth via Private Key' : 'Back to Password Auth'}
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* Action Panel (Only show if online) */}
          {agentStatus === 'online' && (
             <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-lg font-bold mb-4 text-white">2. Actions</h2>
                <div className="space-y-3">
                    <button onClick={() => sendCommand('STATUS')} className="w-full text-left bg-slate-700 hover:bg-slate-600 p-3 rounded text-sm transition flex justify-between items-center group">
                        <span>🔍 Check Status</span>
                        <span className="text-slate-500 group-hover:text-emerald-400">Run &rarr;</span>
                    </button>
                    <button onClick={() => sendCommand('INSTALL')} className="w-full text-left bg-slate-700 hover:bg-slate-600 p-3 rounded text-sm transition flex justify-between items-center group">
                        <span>📦 Install n8n (SQLite)</span>
                        <span className="text-slate-500 group-hover:text-emerald-400">Run &rarr;</span>
                    </button>
                    <button onClick={() => sendCommand('BACKUP')} className="w-full text-left bg-slate-700 hover:bg-slate-600 p-3 rounded text-sm transition flex justify-between items-center group">
                        <span>💾 Create Backup</span>
                        <span className="text-slate-500 group-hover:text-emerald-400">Run &rarr;</span>
                    </button>
                    <button onClick={() => sendCommand('UPDATE')} className="w-full text-left bg-slate-700 hover:bg-slate-600 p-3 rounded text-sm transition flex justify-between items-center group">
                        <span>⬆️ Update n8n</span>
                        <span className="text-slate-500 group-hover:text-emerald-400">Run &rarr;</span>
                    </button>
                     <button onClick={() => sendCommand('RESTART')} className="w-full text-left bg-slate-700 hover:bg-slate-600 p-3 rounded text-sm transition flex justify-between items-center group">
                        <span>🔄 Restart Container</span>
                        <span className="text-slate-500 group-hover:text-emerald-400">Run &rarr;</span>
                    </button>
                </div>
             </div>
          )}
        </div>

        {/* RIGHT COLUMN: Terminal */}
        <div className="lg:col-span-2">
            <div className="bg-black rounded-lg border border-slate-800 h-[600px] flex flex-col shadow-2xl overflow-hidden">
                <div className="bg-slate-800 px-4 py-2 text-xs text-slate-400 flex justify-between items-center border-b border-slate-700">
                    <span>Terminal Output</span>
                    <button onClick={() => setLogs([])} className="hover:text-white">Clear</button>
                </div>
                <div ref={terminalRef} className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-1">
                    {logs.length === 0 && <span className="text-slate-600 italic">Waiting for connection...</span>}
                    {logs.map(log => (
                        <div key={log.id} className={`${log.type === 'stderr' || log.type === 'error' ? 'text-red-400' : log.type === 'info' ? 'text-blue-400' : 'text-slate-300'}`}>
                            <span className="opacity-30 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className="whitespace-pre-wrap">{log.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}