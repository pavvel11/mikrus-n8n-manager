'use client';

import { useState } from 'react';

const SETUP_CMD_BASH = 'bash <(curl -s https://raw.githubusercontent.com/pavvel11/mikrus-toolbox/main/local/setup-ssh.sh)';
const SETUP_CMD_PS1 = 'iwr -useb https://raw.githubusercontent.com/pavvel11/mikrus-toolbox/main/local/setup-ssh.ps1 | iex';

export default function TerminalGuide({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'mac' | 'windows'>('mac');
    const [copiedBash, setCopiedBash] = useState(false);
    const [copiedPs1, setCopiedPs1] = useState(false);

    const copyBashCmd = () => {
        navigator.clipboard.writeText(SETUP_CMD_BASH);
        setCopiedBash(true);
        setTimeout(() => setCopiedBash(false), 2000);
    };

    const copyPs1Cmd = () => {
        navigator.clipboard.writeText(SETUP_CMD_PS1);
        setCopiedPs1(true);
        setTimeout(() => setCopiedPs1(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>🎓</span> Zostań Ekspertem: Terminal SSH
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Zalecany sposób łączenia się z serwerem. Bezpieczniej, szybciej, profesjonalnie.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button 
                        onClick={() => setActiveTab('mac')}
                        className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors ${activeTab === 'mac' ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                    >
                        macOS / Linux
                    </button>
                    <button 
                        onClick={() => setActiveTab('windows')}
                        className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors ${activeTab === 'windows' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                    >
                        Windows 10/11
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto font-sans space-y-6 text-sm text-slate-300">
                    
                    {activeTab === 'mac' && (
                        <div className="space-y-6">
                            <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl">
                                <h3 className="text-emerald-400 font-bold mb-2">Automatyczna Konfiguracja (Zalecane)</h3>
                                <p className="mb-3">Przygotowaliśmy skrypt, który:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2 opacity-80 text-xs">
                                    <li>Wygeneruje bezpieczne klucze SSH.</li>
                                    <li>Wyśle je na Twój serwer (wpiszesz hasło tylko raz!).</li>
                                    <li>Stworzy alias, dzięki któremu połączysz się wpisując tylko <code>ssh mikrus</code>.</li>
                                </ul>

                                <div className="mt-4">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Wklej w Terminal i naciśnij Enter</p>
                                    <div className="relative group">
                                        <div className="bg-black p-4 rounded-lg font-mono text-xs border border-slate-800">
                                            <div className="flex gap-2 items-start">
                                                <span className="text-slate-500 select-none">$</span>
                                                <span className="text-emerald-400 break-all">{SETUP_CMD_BASH}</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            <button
                                                onClick={copyBashCmd}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded transition-all shadow-lg font-bold"
                                            >
                                                {copiedBash ? 'Skopiowano!' : 'Kopiuj'}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Skrypt poprowadzi Cię krok po kroku. Przygotuj dane z maila od Mikrusa (Host, Port, Hasło).</p>
                                </div>

                                {/* Sukces */}
                                <div className="mt-4 bg-[#05080f] p-4 rounded-lg border border-slate-800">
                                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">Po zakończeniu</p>
                                    <p className="mb-2 text-xs opacity-80">Połączysz się ze swoim serwerem wpisując po prostu:</p>
                                    <div className="bg-black/50 p-3 rounded-lg font-mono text-sm border border-slate-800 mb-3">
                                        <span className="text-slate-500 select-none">$ </span>
                                        <span className="text-emerald-400">ssh mikrus</span>
                                    </div>
                                    <pre className="text-[10px] text-blue-400 font-mono leading-none mb-3 overflow-x-auto">
{`           _ _
 _ __ ___ (_) | ___ __ _   _ ___
| '_ \` _ \| | |/ / '__| | | / __|
| | | | | | |   <| |  | |_| \__ \  Serwery dla ludzi z pasją.
|_| |_| |_|_|_|\_\_|   \__,_|___/`}
                                    </pre>
                                </div>
                            </div>

                            <div className="border-t border-slate-800 pt-6">
                                <h3 className="text-white font-bold mb-3">Metoda Ręczna (Dla ciekawskich)</h3>
                                <p className="mb-2">Otwórz aplikację <strong>Terminal</strong> i wpisz:</p>
                                <div className="bg-black p-3 rounded-lg font-mono text-xs border border-slate-800 mb-2">
                                    <span className="text-emerald-400">ssh</span> root@<span className="text-yellow-400">TWOJA_DOMENA</span> -p <span className="text-yellow-400">TWÓJ_PORT</span>
                                </div>
                                <p className="text-xs opacity-60">Zastąp <span className="text-yellow-400">kolorowe wartości</span> danymi z maila od Mikrusa.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'windows' && (
                        <div className="space-y-6">
                            <div className="bg-blue-950/20 border border-blue-500/20 p-4 rounded-xl">
                                <h3 className="text-blue-400 font-bold mb-2">Automatyczna Konfiguracja (Zalecane)</h3>
                                <p className="mb-3">Przygotowaliśmy skrypt PowerShell, który automatycznie:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2 opacity-80 text-xs">
                                    <li>Zainstaluje klienta OpenSSH (jeśli brakuje).</li>
                                    <li>Wygeneruje bezpieczne klucze SSH.</li>
                                    <li>Wyśle je na Twój serwer (wpiszesz hasło tylko raz!).</li>
                                    <li>Stworzy alias, dzięki któremu połączysz się wpisując tylko <code>ssh mikrus</code>.</li>
                                </ul>

                                <div className="mt-4">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Wklej w PowerShell i naciśnij Enter</p>
                                    <div className="relative group">
                                        <div className="bg-black p-4 rounded-lg font-mono text-xs border border-slate-800">
                                            <div className="flex gap-2 items-start">
                                                <span className="text-slate-500 select-none">PS&gt;</span>
                                                <span className="text-blue-400 break-all">{SETUP_CMD_PS1}</span>
                                            </div>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            <button
                                                onClick={copyPs1Cmd}
                                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition-all shadow-lg font-bold"
                                            >
                                                {copiedPs1 ? 'Skopiowano!' : 'Kopiuj'}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Skrypt poprowadzi Cię krok po kroku. Przygotuj dane z maila od Mikrusa (Host, Port, Hasło).</p>
                                </div>

                                {/* Sukces */}
                                <div className="mt-4 bg-[#05080f] p-4 rounded-lg border border-slate-800">
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">Po zakończeniu</p>
                                    <p className="mb-2 text-xs opacity-80">Połączysz się ze swoim serwerem wpisując po prostu:</p>
                                    <div className="bg-black/50 p-3 rounded-lg font-mono text-sm border border-slate-800">
                                        <span className="text-slate-500 select-none">PS&gt; </span>
                                        <span className="text-blue-400">ssh mikrus</span>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-800 pt-6">
                                <h3 className="text-white font-bold mb-3">Metoda Ręczna (Dla ciekawskich)</h3>
                                <p className="mb-2">Kliknij prawym przyciskiem na menu Start, wybierz <strong>Windows PowerShell</strong> (lub Terminal) i wpisz:</p>
                                <div className="bg-black p-3 rounded-lg font-mono text-xs border border-slate-800 mb-2">
                                    <span className="text-blue-400">ssh</span> root@<span className="text-yellow-400">TWOJA_DOMENA</span> -p <span className="text-yellow-400">TWÓJ_PORT</span>
                                </div>
                                <p className="text-xs opacity-60">Zastąp <span className="text-yellow-400">kolorowe wartości</span> danymi z maila od Mikrusa.</p>
                            </div>
                        </div>
                    )}

                    {/* PROMO COURSE BLOCK */}
                    <div className="mt-8 pt-8 border-t border-slate-800/50">
                        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-1 rounded-xl shadow-xl">
                            <div className="bg-[#0f172a] rounded-lg p-5 text-center">
                                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                                    Chcesz wycisnąć z Mikrusa 100%?
                                </h3>
                                <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                                    Terminal to dopiero początek. Naucz się stawiać własne usługi (nie tylko n8n), zabezpieczać serwer jak twierdzę i automatyzować wszystko bashowym skryptem.
                                </p>
                                <a href="#" className="interactive-target inline-block bg-slate-100 hover:bg-white text-slate-900 text-xs px-6 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-emerald-500/20 transform hover:-translate-y-0.5">
                                    🚀 Zapisz się na listę oczekujących (Kurs Zaawansowany)
                                </a>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}