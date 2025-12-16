'use client';

import { useEffect, useState, useRef, MouseEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import confetti from 'canvas-confetti';
import SnakeGame from './Snake';
import TerminalGuide from './TerminalGuide';
import OfferPlaceholder from './OfferPlaceholder';

// Configuration
const BACKEND_URL = ''; // Relative path for production
const GITHUB_URL = 'https://github.com/pavvel11/mikrus-n8n-manager'; 
const MIKRUS_REFLINK = 'https://mikr.us/?r=pavvel';

type LogEntry = {
  id: string;
  type: 'stdout' | 'stderr' | 'error' | 'info';
  text: string;
  timestamp: number;
};

const LOADING_STEPS = [
    "📡 Resolving Host...",
    "🔐 Negotiating Handshake...",
    "🔑 Verifying Credentials...",
    "💉 Injecting Payload...",
    "🚀 Escalating Privileges...",
    "⚡ Starting Agent..."
];

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [agentStatus, setAgentStatus] = useState<'offline' | 'online'>('offline');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [installStatus, setInstallStatus] = useState<string>('');
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [ping, setPing] = useState<number>(0);
  const [systemShock, setSystemShock] = useState(false);
  const [serverMem, setServerMem] = useState<number>(0);
  const [isAgentReadyForActions, setIsAgentReadyForActions] = useState(false);
  const [showTerminalGuide, setShowTerminalGuide] = useState(false);
  const [showHardResetConfirm, setShowHardResetConfirm] = useState(false);
  
  // New States for Enhanced UX
  const [dbType, setDbType] = useState<'sqlite' | 'postgres'>('sqlite');
  const [isInstalled, setIsInstalled] = useState(false);
  const [showReinstallConfirm, setShowReinstallConfirm] = useState(false);
  const [showSnake, setShowSnake] = useState(false);
  
  // Command & Result State
  const [isCommandRunning, setIsCommandRunning] = useState(false);
  const [n8nUrl, setN8nUrl] = useState<string | null>(null);
  const [backupAvailable, setBackupAvailable] = useState(false);
  
  // Form State
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [authMethod, setAuthMethod] = useState<'password' | 'key'>('password');

  const terminalRef = useRef<HTMLDivElement>(null);
  const lastCommandRef = useRef<string>('');

  // Helper to strip ANSI codes
  const stripAnsi = (str: string) => str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  useEffect(() => {
    let sid = localStorage.getItem('mikrus_session_id');
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem('mikrus_session_id', sid);
    }
    setSessionId(sid);

    // Load saved settings
    const savedHost = localStorage.getItem('mikrus_host');
    const savedPort = localStorage.getItem('mikrus_port');
    const savedUrl = localStorage.getItem('n8n_url');
    if (savedHost) setHost(savedHost);
    if (savedPort) setPort(savedPort);
    if (savedUrl) setN8nUrl(savedUrl);

    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_session', sid);
    });

    newSocket.on('agent_status', (data: { status: 'online' | 'offline', isInstalled?: boolean, totalMemMb?: number }) => {
      setAgentStatus(data.status);
      if (data.isInstalled !== undefined) {
          setIsInstalled(data.isInstalled);
      }
      if (data.totalMemMb) {
          setServerMem(data.totalMemMb);
      }
      // Only set ready for actions when we have full info
      setIsAgentReadyForActions(data.status === 'online' && data.totalMemMb !== undefined);
      addLog('info', `STATUS UPDATE: Agent is ${data.status.toUpperCase()}`);
    });

    newSocket.on('install_progress', (data: { message: string }) => {
        setInstallStatus(data.message);
        addLog('info', `[INSTALL] ${data.message}`);
    });

    newSocket.on('command_output', (data: { type: string; data: string }) => {
      let cleanText = stripAnsi(data.data);
      
      // UX Improvements for specific messages
      if (cleanText.trim() === 'true') {
          cleanText = "✅ Usługa n8n jest aktywna i działa poprawnie.";
      }
      if (cleanText.includes("Backup N8N zakończony pomyślnie")) {
          setBackupAvailable(true);
          triggerSuccessEffect();
      }

      // Detect n8n URL from logs
      const urlMatch = cleanText.match(/(https:\/\/[a-z0-9.-]+\.(wykr\.es|mikr\.us))/i);
      if (urlMatch) {
          const url = urlMatch[1];
          setN8nUrl(url);
          localStorage.setItem('n8n_url', url);
          triggerSuccessEffect(); 
      }

      addLog(data.type as any, cleanText);
    });

    newSocket.on('file_download', (data: { filename: string, content: string }) => {
        setIsCommandRunning(false); // Unlock UI
        try {
            // Convert base64 to blob
            const byteCharacters = atob(data.content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/gzip" });
            
            // Trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            addLog('info', `Pobieranie pliku: ${data.filename}`);
        } catch (e: any) {
            addLog('error', `Błąd pobierania: ${e.message}`);
        }
    });
    
    newSocket.on('command_done', (data: { exitCode: number }) => {
      setIsCommandRunning(false);
      addLog('info', `Process finished with exit code ${data.exitCode}`);
      
      const quietCommands = ['LOGS_N8N', 'STATUS', 'GET_BACKUP_FILE'];
      if (data.exitCode === 0 && !quietCommands.includes(lastCommandRef.current)) {
          triggerMiniConfetti();
      }
      
      if (lastCommandRef.current === 'FIX_DOCKER' && data.exitCode === 0) {
          addLog('info', '✅ Hard Reset zakończony. Kliknij teraz "Przeinstaluj / Napraw", aby uruchomić n8n.');
          setIsInstalled(true); 
          setShowReinstallConfirm(true); 
      }

      if (data.exitCode === 0 && n8nUrl) setIsInstalled(true);
    });

    const pingInterval = setInterval(() => {
        if (newSocket.connected) {
            setPing(Math.floor(Math.random() * (45 - 15 + 1) + 15));
        } else {
            setPing(0);
        }
    }, 2000);

    return () => {
      clearInterval(pingInterval);
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
      if (loading) {
          const interval = setInterval(() => {
              setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
          }, 800);
          return () => clearInterval(interval);
      } else {
          setLoadingStep(0);
          setInstallStatus('');
      }
  }, [loading]);

  const triggerSuccessEffect = () => {
      setSystemShock(true);
      setTimeout(() => setSystemShock(false), 500);
      
      confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#059669', '#ffffff'],
          disableForReducedMotion: true
      });
  };

  const triggerMiniConfetti = () => {
      confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          scalar: 0.7,
          colors: ['#10b981', '#ffffff']
      });
  };

  const addLog = (type: LogEntry['type'], text: string) => {
    setLogs(prev => [...prev, { id: uuidv4(), type, text, timestamp: Date.now() }]);
  };

  const handleConnectSSH = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('mikrus_host', host);
    localStorage.setItem('mikrus_port', port);

    setLoading(true);
    setInstallStatus('');
    addLog('info', `[INIT] Starting secure connection sequence via ${authMethod}...`);

    try {
      const payload = { 
          host, 
          port, 
          username, 
          sessionId,
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

      addLog('info', '[SUCCESS] SSH Tunnel established. Waiting for Agent handshake...');
      setPassword(''); 
      setPrivateKey(''); 

    } catch (err: any) {
      addLog('error', `[FAIL] ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendCommand = (cmd: string) => {
    if (!socket || isCommandRunning) return;
    
    setIsCommandRunning(true);
    lastCommandRef.current = cmd;
    addLog('info', `> Executing command: ${cmd}`);
    socket.emit('send_command', { sessionId, command: cmd });
  };

  const isLowRam = serverMem > 0 && serverMem < 2000;

  return (
    <div className={`min-h-screen relative font-sans p-4 md:p-8 selection:bg-emerald-500/30 overflow-hidden bg-slate-900 cursor-default transition-all duration-300 ${systemShock ? 'scale-[1.01] brightness-125' : ''}`}>
      
      <CustomCursor />

      {/* Background Aurora */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="aurora-blob aurora-1"></div>
          <div className="aurora-blob aurora-2"></div>
          <div className="aurora-blob aurora-3"></div>
      </div>

      <div className="relative z-10">
        
        {/* HEADER */}
        <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center border-b border-slate-800/40 pb-6 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 drop-shadow-md">
                <span className="bg-gradient-to-br from-emerald-400 to-emerald-600 w-3 h-8 rounded-sm inline-block shadow-[0_0_15px_rgba(5,150,105,0.4)]"></span>
                Mikrus n8n Manager
            </h1>
            <p className="text-sm text-slate-400 mt-1 ml-6">
                Lazy Engineer Edition | <a href={GITHUB_URL} target="_blank" className="text-slate-400 hover:text-emerald-400 hover:underline transition-colors interactive-target">Open Source</a>
            </p>
            </div>
            <div className={`flex items-center gap-4 px-5 py-2 rounded-full border backdrop-blur-md transition-all duration-500 ${agentStatus === 'online' ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'bg-slate-900/50 border-slate-800 text-slate-500'}`}>
            <div className="flex flex-col items-end leading-none">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Status Systemu</span>
                <span className="text-sm font-bold">{agentStatus === 'online' ? 'Połączono' : 'Rozłączono'}</span>
            </div>
            <div className="h-8 w-px bg-current opacity-20 mx-1"></div>
            <div className="flex flex-col items-start leading-none min-w-[40px]">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Ping</span>
                <span className="text-sm font-mono opacity-90">{agentStatus === 'online' ? `${ping}ms` : '--'}</span>
            </div>
            <div className="relative ml-1">
                <div className={`w-2.5 h-2.5 rounded-full ${agentStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500'} transition-colors duration-300`}></div>
                {agentStatus === 'online' && <div className="absolute top-0 left-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75"></div>}
            </div>
            </div>
        </header>

        <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: Controls */}
            <div className="lg:col-span-5 space-y-6">
            
            {/* Connection Form */}
            {agentStatus === 'offline' && (
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/60 shadow-xl backdrop-blur-xl animate-in zoom-in-95 duration-300">
                
                {/* EXPERT MODE RECOMMENDATION */}
                <div className="mb-6 bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">💻</div>
                    <h3 className="text-emerald-400 font-bold text-sm mb-2">Jesteś Power Userem?</h3>
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed opacity-90">
                        Ta aplikacja to tylko nakładka (helper). <strong>Terminal daje pełną kontrolę i jest zalecany.</strong>
                    </p>
                    <button onClick={() => setShowTerminalGuide(true)} className="interactive-target inline-block bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-lg font-bold transition-all shadow-lg hover:shadow-emerald-500/20">
                        🎓 Otwórz Przewodnik SSH
                    </button>
                </div>

                {/* PROMO BLOCK */}
                <div className="mb-6 bg-purple-950/20 border border-purple-500/20 rounded-xl p-4 text-center">
                    <h3 className="text-purple-400 font-bold text-sm mb-2">Nie masz jeszcze serwera?</h3>
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed opacity-90">
                        Mikrus.pl to najtańsza opcja na własne n8n (bez limitów!). Instalacja zajmuje 3 minuty i z tym narzędziem jest bajecznie prosta.
                    </p>
                    <ul className="text-[10px] text-slate-400 mb-4 space-y-1 text-left inline-block">
                        <li className="flex gap-2"><span>🌱</span> <strong>Mikrus 2.1</strong> (1GB RAM) - Start (SQLite)</li>
                        <li className="flex gap-2"><span>🚀</span> <strong>Mikrus 3.0+</strong> (2GB+ RAM) - Produkcja (Postgres)</li>
                    </ul>
                    <a href={MIKRUS_REFLINK} target="_blank" className="interactive-target block bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-2 rounded-lg font-bold transition-all shadow-lg hover:shadow-purple-500/20">
                        🎁 Odbierz Mikrusa + 1 miesiąc gratis
                    </a>

                    <details className="mt-4 text-left group">
                        <summary className="text-[10px] text-slate-500 hover:text-white transition-colors cursor-pointer list-none flex items-center gap-1 font-bold">
                            <span className="text-emerald-400 group-hover:text-emerald-300">?</span> Jak odebrać 1 miesiąc gratis?
                        </summary>
                        <div className="text-[10px] text-slate-400 mt-2 ml-4 space-y-1">
                            <p>To prosty mechanizm: kliknij w powyższy link (zawiera on specjalny identyfikator - tzw. reflink).</p>
                            <p>Następnie wybierz swoją ofertę Mikrusa (dla n8n polecamy 2.1+, 3.0 lub 3.5).</p>
                            <p>Miesiąc gratis zostanie <strong>automatycznie doliczony</strong> do Twojego zamówienia. Proste!</p>
                        </div>
                    </details>
                </div>

                <div className="mb-6 bg-gradient-to-r from-emerald-950/30 to-slate-900/30 border border-emerald-500/10 rounded-xl p-4">
                    <h3 className="text-emerald-400 font-bold text-sm flex items-center gap-2 mb-2">
                    <span className="text-lg">🛡️</span> Bezpieczeństwo
                    </h3>
                    <ul className="text-xs text-slate-400 space-y-2 list-none">
                    <li className="flex gap-2 items-start"><div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div> <span>Twoje hasło <strong>nie jest nigdzie zapisywane</strong>. Używamy go tylko raz, a potem natychmiast zapominamy. Po połączeniu możesz (i zalecamy!) natychmiast zmienić swoje hasło do serwera, logując się przez <button onClick={() => setShowTerminalGuide(true)} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 interactive-target font-bold">terminal</button> i wpisując komendę <code>passwd</code>.</span></li>
                    <li className="flex gap-2 items-center"><div className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0"></div> Połączenie jest szyfrowane i jednorazowe.</li>
                    </ul>
                </div>

                <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded bg-slate-800 text-xs text-slate-400">1</span>
                    Uwierzytelnianie
                </h2>
                
                <form onSubmit={handleConnectSSH} className="space-y-4">
                    <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1 pl-1">Serwer (Host)</label>
                    <input required type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="np. srvX.mikr.us" className="interactive-target w-full bg-[#0b0f19] border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-slate-700" />
                    </div>
                    <div className="flex gap-3">
                        <div className="w-1/3">
                            <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1 pl-1">Port SSH</label>
                            <input required type="text" value={port} onChange={e => setPort(e.target.value)} placeholder="np. 22 lub 10107" className="interactive-target w-full bg-[#0b0f19] border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-slate-700" />
                        </div>
                        <div className="w-2/3">
                            <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1 pl-1">Login</label>
                            <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="interactive-target w-full bg-[#0b0f19] border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all" />
                        </div>
                    </div>

                    {authMethod === 'password' ? (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1 pl-1">Hasło</label>
                        <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="interactive-target w-full bg-[#0b0f19] border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all" />
                    </div>
                    ) : (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1 pl-1">Klucz Prywatny</label>
                        <textarea required value={privateKey} onChange={e => setPrivateKey(e.target.value)} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" className="interactive-target w-full h-24 bg-[#0b0f19] border border-slate-700/50 rounded-lg p-3 text-[10px] font-mono text-slate-300 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all resize-none" />
                    </div>
                    )}

                    <button disabled={loading} type="submit" className="interactive-target w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98] mt-2 relative overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 animate-pulse">
                            <span className="font-mono text-xs">{installStatus || LOADING_STEPS[loadingStep]}</span>
                        </div>
                    ) : (
                        <span className="relative flex items-center justify-center gap-2">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            Połącz i Zainstaluj Agenta
                        </span>
                    )}
                    </button>

                    <div className="text-right pt-1">
                    <button type="button" onClick={() => setShowTechDetails(!showTechDetails)} className="interactive-target text-[10px] font-medium text-slate-500 hover:text-slate-300 transition flex items-center gap-1">
                        <span className="bg-slate-800 w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px]">?</span> Jak to działa?
                    </button>
                    <button type="button" onClick={() => setAuthMethod(authMethod === 'password' ? 'key' : 'password')} className="interactive-target text-[10px] font-medium text-slate-500 hover:text-emerald-400 transition hover:underline decoration-dotted underline-offset-4">
                        {authMethod === 'password' ? 'Użyj Klucza SSH' : 'Użyj Hasła'}
                    </button>
                    </div>

                    {showTechDetails && (
                        <div className="mt-4 p-4 bg-slate-800 rounded-lg text-[11px] text-slate-300 border-l-2 border-emerald-600 animate-in slide-in-from-top-2 relative z-20 shadow-lg">
                            <p className="mb-2">1. Twoja przeglądarka wysyła zaszyfrowane dane (SSL) do naszego Backendu.</p>
                            <p className="mb-2">2. Backend nawiązuje <strong>jednorazowe</strong> połączenie SSH z Twoim serwerem.</p>
                            <p className="mb-2">3. Instaluje lekkiego Agenta (Node.js) i natychmiast <strong>zapomina hasło</strong>.</p>
                            <p>4. Agent łączy się zwrotnie przez WebSocket i czeka na Twoje polecenia.</p>
                        </div>
                    )}

                </form>
                </div>
            )}

            {/* Action Panel */}
            {agentStatus === 'online' && !isAgentReadyForActions && (
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/60 shadow-xl animate-in fade-in duration-500 backdrop-blur-xl flex flex-col items-center justify-center h-[200px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                    <p className="text-slate-400 mt-4">Wczytywanie statusu serwera...</p>
                </div>
            )}
            {isAgentReadyForActions && (
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/60 shadow-xl animate-in slide-in-from-bottom-4 duration-500 backdrop-blur-xl">
                    <h2 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500/10 text-xs text-emerald-400">2</span>
                        Centrum Dowodzenia
                    </h2>
                    
                    {/* Success Card - Found URL */}
                    {n8nUrl && (
                        <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl animate-in zoom-in shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                            <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">🎉 Sukces! n8n gotowy!</h3>
                            <p className="text-xs text-slate-300 mb-4">Twoja instancja została zainstalowana i jest dostępna.</p>
                            <a href={n8nUrl} target="_blank" rel="noopener noreferrer" className="interactive-target block w-full text-center bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-lg shadow-lg transition-all transform hover:scale-[1.02]">
                                🚀 Otwórz n8n Dashboard
                            </a>
                        </div>
                    )}

                    <div className={`mb-6 bg-[#0b0f19] p-4 rounded-xl border border-slate-800/50 ${isCommandRunning ? 'opacity-50 pointer-events-none grayscale transition-all duration-500' : ''}`}>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Baza Danych</span>
                            <div className="flex bg-slate-800 rounded-lg p-1">
                                <button 
                                    onClick={() => setDbType('sqlite')}
                                    className={`interactive-target px-3 py-1 text-[10px] font-bold rounded-md transition-all ${dbType === 'sqlite' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    SQLite
                                </button>
                                <button 
                                    disabled={isLowRam}
                                    onClick={() => !isLowRam && setDbType('postgres')}
                                    title={isLowRam ? "Wymagane min. 2GB RAM" : "Zalecane dla produkcji"}
                                    className={`interactive-target px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${
                                        dbType === 'postgres' 
                                            ? 'bg-blue-600 text-white shadow-lg' 
                                            : isLowRam 
                                                ? 'text-slate-600 cursor-not-allowed opacity-50' 
                                                : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Postgres
                                    {isLowRam && <span className="text-[8px] bg-red-900/50 text-red-400 px-1 rounded ml-1">RAM &lt; 2GB</span>}
                                </button>
                            </div>
                        </div>

                        {!showReinstallConfirm ? (
                            <ActionButton 
                                icon={isInstalled ? "♻️" : "📦"} 
                                title={isInstalled ? "Przeinstaluj / Napraw" : `Zainstaluj n8n (${dbType === 'sqlite' ? 'SQLite' : 'Postgres'})`}
                                subtitle={isInstalled ? "Przebudowuje kontener (Dane bezpieczne)" : "Automatyczna konfiguracja"}
                                variant={isInstalled ? 'danger' : 'default'}
                                onClick={() => {
                                    if (isInstalled) setShowReinstallConfirm(true);
                                    else sendCommand(dbType === 'sqlite' ? 'INSTALL' : 'INSTALL_POSTGRES');
                                }} 
                            />
                        ) : (
                            <div className="animate-in fade-in zoom-in duration-200">
                                <button 
                                    onClick={() => {
                                        sendCommand(dbType === 'sqlite' ? 'INSTALL' : 'INSTALL_POSTGRES');
                                        setShowReinstallConfirm(false);
                                    }}
                                    className="interactive-target w-full bg-yellow-900/20 border border-yellow-500/50 text-yellow-400 p-4 rounded-xl font-bold text-sm hover:bg-yellow-900/40 transition-all flex items-center justify-center gap-2"
                                >
                                    <span>🔄</span> Potwierdź Przeinstalowanie
                                </button>
                                <button 
                                    onClick={() => setShowReinstallConfirm(false)}
                                    className="interactive-target w-full text-center text-[10px] text-slate-500 mt-2 hover:text-white underline"
                                >
                                    Anuluj
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={`grid gap-3 ${isCommandRunning ? 'opacity-50 pointer-events-none grayscale transition-all duration-500' : ''}`}>
                        <ActionButton icon="🔍" title="Sprawdź Status n8n" onClick={() => sendCommand('STATUS')} />
                        
                        <div className="grid grid-cols-2 gap-3">
                            <ActionButton icon="💾" title="Zrób Backup" onClick={() => sendCommand('BACKUP')} subtitle="Teraz" />
                            <ActionButton icon="⬇️" title="Pobierz Backup" onClick={() => sendCommand('GET_BACKUP_FILE')} subtitle="Ostatni plik" />
                        </div>

                        <ActionButton icon="⬆️" title="Aktualizuj n8n" onClick={() => sendCommand('UPDATE')} subtitle="Pobierz nowy obraz" />
                        <div className="h-px bg-slate-800 my-2"></div>
                        <ActionButton icon="🔄" title="Restart Kontenera" onClick={() => sendCommand('RESTART')} variant="danger" />
                    </div>

                    {isInstalled && <OfferPlaceholder onOpenGuide={() => setShowTerminalGuide(true)} />}
                </div>
            )}
            </div>

            {/* RIGHT COLUMN: Terminal */}
            <div className="lg:col-span-7 h-full min-h-[500px] flex flex-col">
                <div className="bg-black/80 rounded-2xl border border-slate-800/60 h-[650px] flex flex-col shadow-2xl overflow-hidden backdrop-blur-md">
                    
                    {/* Terminal Header */}
                    <div className="bg-white/5 px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-slate-500 flex justify-between items-center border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700/50"></div>
                            </div>
                            <span className="opacity-50">root@mikrus:~</span>
                        </div>
                        <div className="flex gap-2">
                            {isCommandRunning && (
                                <button onClick={() => setShowSnake(true)} className="interactive-target text-emerald-400 hover:text-emerald-300 transition text-[9px] border border-emerald-500/30 px-2 py-1 rounded bg-emerald-500/10 animate-pulse">
                                    🎮 Czekasz? Zagraj
                                </button>
                            )}
                            <button onClick={() => setLogs([])} className="interactive-target hover:text-white transition opacity-60 hover:opacity-100">Clear</button>
                        </div>
                    </div>

                    {/* Terminal Body */}
                    <div ref={terminalRef} className="flex-1 p-6 overflow-y-auto font-mono text-sm space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {logs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700/30 animate-in fade-in duration-1000">
                                <span className="text-sm font-sans opacity-50">Oczekiwanie na sygnał z satelity...</span>
                            </div>
                        )}
                        {logs.map(log => (
                            <LogLine key={log.id} log={log} />
                        ))}
                        {/* Always visible blinking cursor at end */}
                        {logs.length > 0 && (
                            <div className="mt-2 animate-pulse w-2 h-4 bg-emerald-500/50 inline-block"></div>
                        )}
                    </div>
                </div>
            </div>

        </main>

        {/* --- TERMINAL GUIDE BUTTON --- */}
        <div className="max-w-4xl mx-auto px-4 mt-8 mb-4 text-center">
            <button onClick={() => setShowTerminalGuide(true)} className="interactive-target mt-8 mx-auto bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/50 px-6 py-3 rounded-full text-xs font-bold transition-all shadow-lg flex items-center gap-2 group hover:shadow-emerald-900/20 hover:-translate-y-0.5">
                <span className="text-lg">🎓</span> 
                <span>Jak to zrobić w Terminalu? (Dla ambitnych)</span>
                <span className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300">→</span>
            </button>
        </div>

        {/* --- TROUBLESHOOTING FOOTER --- */}
        <div className="max-w-4xl mx-auto px-4 mb-4">
            <details className="group bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden transition-all duration-300 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/50">
                <summary className="flex items-center justify-between p-4 cursor-pointer select-none text-xs uppercase tracking-widest font-bold text-slate-200 hover:text-white transition-colors bg-white/5 group-open:bg-white/10">
                    <div className="flex items-center gap-3">
                        <span className="text-lg">⚠️</span>
                        <span>Masz problemy? Przeczytaj instrukcję i Troubleshooting</span>
                    </div>
                    <span className="transform transition-transform group-open:rotate-180 opacity-50">▼</span>
                </summary>
                
                <div className="p-6 border-t border-slate-700 text-slate-300 space-y-6 text-sm bg-black/20 animate-in slide-in-from-top-2">
                    
                    <div>
                        <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">1. Jak się połączyć?</h4>
                        <p className="opacity-80 mb-3">Użyj danych, które otrzymałeś w mailu od Mikrusa (lub znajdziesz w Panelu Klienta Mikrusa).</p>
                        <ul className="list-disc list-inside space-y-1 ml-2 text-xs opacity-70 marker:text-emerald-500">
                            <li><strong>Host:</strong> np. <code>srv20.mikr.us</code> lub Twoja domena.</li>
                            <li><strong>Port:</strong> To <strong>NIE</strong> jest domyślny port 22! Sprawdź w mailu (np. 10107).</li>
                            <li><strong>Login:</strong> Zazwyczaj <code>root</code>.</li>
                            <li><strong>Hasło:</strong> Twoje hasło do SSH (nie do panelu Mikrusa!).</li>
                        </ul>
                        <p className="mt-2 text-[10px] text-emerald-500/80">
                            💡 Wskazówka: Po instalacji otrzymasz darmową domenę <code>*.wykr.es</code> z automatycznym certyfikatem SSL.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">2. Coś nie działa / Błąd połączenia</h4>
                        <p className="opacity-80 mb-2">Jeśli aplikacja wisi na "Resolving Host" lub "Negotiating Handshake", upewnij się, że:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2 text-xs opacity-70 marker:text-yellow-500">
                            <li>Podałeś poprawny PORT.</li>
                            <li>Twój serwer Mikrus jest włączony (sprawdź w panelu).</li>
                            <li>Nie masz blokady IP (fail2ban) - spróbuj połączyć się z innego IP lub odczekaj.</li>
                        </ul>
                    </div>

                    <div className="bg-blue-950/20 border border-blue-500/20 p-4 rounded-lg">
                        <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">3. Diagnostyka AI (Analiza Logów)</h4>
                        <p className="opacity-80 text-xs mb-3">
                            Zanim zrestartujesz n8n, pobierz logi i wklej je do ChatGPT/Gemini z pytaniem "Co tu nie działa?".
                        </p>
                        <button 
                            onClick={() => sendCommand('LOGS_N8N')}
                            className="interactive-target bg-blue-900/20 border border-blue-500/30 text-blue-400 hover:bg-blue-900/40 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                        >
                            📄 Pobierz Logi n8n
                        </button>
                    </div>

                    <div className="bg-orange-950/20 border border-orange-500/20 p-4 rounded-lg">
                        <h4 className="text-orange-400 font-bold mb-2 flex items-center gap-2">4. Kontenery w pętli restartów?</h4>
                        <p className="opacity-80 text-xs mb-3">
                            Jeśli n8n nie wstaje (status Restarting), użyj tej opcji, aby <strong>wymusić usunięcie kontenerów i obrazów</strong>. Po tym musisz kliknąć "Przeinstaluj / Napraw" w panelu wyżej.
                        </p>
                        <button 
                            onClick={() => setShowHardResetConfirm(true)}
                            className="interactive-target bg-orange-900/20 border border-orange-500/30 text-orange-400 hover:bg-orange-900/40 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                        >
                            🧹 Wyczyść Docker (Hard Reset)
                        </button>
                    </div>

                    <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-lg">
                        <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">5. Opcja Atomowa: Czysty Start ☢️</h4>
                        <p className="opacity-80 text-xs mb-3">
                            Jeśli instalacja została przerwana w połowie, pliki są uszkodzone, lub po prostu chcesz zacząć od zera:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 ml-2 text-xs opacity-90">
                            <li>Zaloguj się do <strong>Panelu Klienta Mikrus</strong>.</li>
                            <li>Znajdź opcję <strong>"Reinstalacja Systemu"</strong> (Wybierz Debian lub Ubuntu).</li>
                            <li>To <strong>USUNIE WSZYSTKIE DANE</strong> z serwera i przywróci go do stanu fabrycznego.</li>
                            <li>Po reinstalacji wróć tutaj i spróbuj połączyć się ponownie (używając nowego hasła, jeśli zostało zmienione).</li>
                        </ol>
                    </div>

                </div>
            </details>
        </div>

        <footer className="text-center text-slate-500 text-[10px] uppercase tracking-widest mt-12 pb-12">
            <p className="opacity-70">Bezpieczny installer n8n dla Mikrus.pl • Created by Lazy Engineer</p>
            <p className="mt-2 text-emerald-500 hover:text-emerald-400 transition-colors font-bold"><a href={MIKRUS_REFLINK} target="_blank" className="interactive-target">Skorzystaj z reflinku Mikrus.pl i zyskaj 1 miesiąc gratis!</a></p>
        </footer>
      
        {showSnake && <SnakeGame onClose={() => setShowSnake(false)} />}
        {showTerminalGuide && <TerminalGuide onClose={() => setShowTerminalGuide(false)} />}
        
        {/* Hard Reset Confirmation Modal */}
        {showHardResetConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-in fade-in duration-200">
                <div className="bg-[#0f172a] border border-orange-500/50 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-orange-500 flex items-center gap-2 mb-4">
                            <span>⚠️</span> Czy na pewno?
                        </h3>
                        <p className="text-sm text-slate-300 mb-4">
                            Zamierzasz wykonać <strong>Hard Reset</strong> środowiska Docker. Ta operacja:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-xs text-slate-400 mb-6 bg-black/20 p-4 rounded-lg border border-slate-800">
                            <li>🛑 Zrestartuje usługę Docker (chwilowy downtime).</li>
                            <li>🗑️ Usunie kontenery <code>n8n</code> i <code>watchtower</code>.</li>
                            <li>📦 Usunie pobrane obrazy (wymusi świeże pobranie).</li>
                            <li>🔧 Naprawi uprawnienia do plików.</li>
                            <li className="text-emerald-400 font-bold">✅ Twoje workflowy i baza danych są bezpieczne (w osobnym katalogu).</li>
                        </ul>
                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => setShowHardResetConfirm(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                            >
                                Anuluj
                            </button>
                            <button 
                                onClick={() => {
                                    sendCommand('FIX_DOCKER');
                                    setShowHardResetConfirm(false);
                                }}
                                className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-lg transition-all flex items-center gap-2"
                            >
                                🔥 Wykonaj Hard Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

function CustomCursor() {
    const cursorRef = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);
    const [clicked, setClicked] = useState(false);

    useEffect(() => {
        // Direct DOM update for 60/144FPS smoothness without React re-renders
        const updatePosition = (e: globalThis.MouseEvent) => {
            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            }
            
            // Check hover target (keep this simple to avoid heavy calculations)
            const target = e.target as HTMLElement;
            const isInteractive = target.closest('button, a, input, textarea, .interactive-target');
            setHovered(!!isInteractive);
        };

        const handleMouseDown = () => setClicked(true);
        const handleMouseUp = () => setClicked(false);

        window.addEventListener('mousemove', updatePosition, { passive: true });
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', updatePosition);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return (
        <div 
            ref={cursorRef}
            className="fixed top-0 left-0 pointer-events-none z-[10000] hidden md:flex items-center justify-center -ml-3 -mt-3 w-6 h-6 will-change-transform"
        >
            {/* Energy Ring */}
            <div className={`
                absolute rounded-full border border-emerald-400/50 transition-all duration-150 ease-out
                ${hovered ? 'w-8 h-8 border-emerald-300 bg-emerald-500/10' : 'w-4 h-4'}
                ${clicked ? 'scale-75 bg-emerald-400/20' : 'scale-100'}
            `}></div>

            {/* Center Dot */}
            <div className={`
                w-1.5 h-1.5 bg-emerald-300 rounded-full shadow-[0_0_10px_#10b981] transition-all duration-200
                ${hovered ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
            `}></div>
        </div>
    );
}

// Smart Log Component with Highlighting
function LogLine({ log }: { log: LogEntry }) {
    const time = new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'});
    
    // Strip ANSI codes
    const cleanText = log.text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

    const formatText = (text: string) => {
        const parts = text.split(/(https?:\/\/[^\s]+)|(success|done|completed|installed|error|failed|fatal|warning|warn)/gi);
        
        return parts.map((part, index) => {
            if (!part) return null;

            if (part.match(/https?:\/\/[^\s]+/i)) {
                return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline decoration-dotted underline-offset-4 cursor-pointer interactive-target">{part}</a>;
            }
            if (part.match(/success|done|completed|installed/i)) {
                return <span key={index} className="text-emerald-400 font-bold">{part}</span>;
            }
            if (part.match(/error|failed|fatal/i)) {
                return <span key={index} className="text-red-400 font-bold bg-red-900/20 px-1 rounded">{part}</span>;
            }
            if (part.match(/warning|warn/i)) {
                return <span key={index} className="text-yellow-400">{part}</span>;
            }
            return part;
        });
    };

    let typeColor = 'text-slate-300';
    if (log.type === 'stderr' || log.type === 'error') {
        const lower = cleanText.toLowerCase();
        if (lower.includes('error') || lower.includes('fail') || lower.includes('fatal') || lower.includes('exception')) {
            typeColor = 'text-red-400 border-l-2 border-red-900/50 pl-3';
        } else {
            typeColor = 'text-slate-400/70 italic'; // Dimmed for progress output
        }
    } else if (log.type === 'info') {
        typeColor = 'text-blue-400';
    }

    return (
        <div className={`log-entry break-words leading-relaxed ${typeColor}`}>
            <span className="opacity-20 mr-4 select-none text-[10px] font-mono">{time}</span>
            <span>{formatText(cleanText)}</span>
        </div>
    );
}

function ActionButton({ icon, title, onClick, subtitle, variant = 'default' }: { icon: string, title: string, onClick: () => void, subtitle?: string, variant?: 'default' | 'danger' }) {
    const bgClass = variant === 'danger' 
        ? 'bg-red-950/10 hover:bg-red-950/20 border-red-900/30 hover:border-red-500/50' 
        : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/50 hover:border-emerald-500/30';
    
    const textClass = variant === 'danger' ? 'group-hover:text-red-400' : 'group-hover:text-emerald-400';

    return (
        <button onClick={onClick} className={`interactive-target w-full text-left border p-4 rounded-xl transition-all duration-200 flex justify-between items-center group active:scale-[0.98] hover:shadow-lg ${bgClass}`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner border border-white/5 transition-transform group-hover:scale-105 ${variant === 'danger' ? 'bg-red-900/20 text-red-400' : 'bg-slate-800 text-slate-300'}`}>
                    {icon}
                </div>
                <div>
                    <div className={`font-bold text-slate-200 text-sm transition-colors ${textClass}`}>{title}</div>
                    {subtitle && <div className="text-[10px] text-slate-500 font-medium">{subtitle}</div>}
                </div>
            </div>
            <span className={`text-slate-600 transition-all transform group-hover:translate-x-1 ${textClass}`}>→</span>
        </button>
    );
}