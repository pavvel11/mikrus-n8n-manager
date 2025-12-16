'use client';

import { useState } from 'react';

// Script content as raw string (escaped for JS/Next.js)
// Using \u001b instead of \033 to avoid strict mode octal escape errors
const SCRIPT_CONTENT = `#!/bin/bash

# Kolory
GREEN='\u001b[0;32m'
BLUE='\u001b[0;34m'
YELLOW='\u001b[1;33m'
RED='\u001b[0;31m'
NC='\u001b[0m'

clear
echo -e "\${BLUE}=================================================\${NC}"
echo -e "\${BLUE}   🚀 MIKRUS SSH CONFIGURATOR - TRYB EKSPERTA    \${NC}"
echo -e "\${BLUE}=================================================\${NC}"
echo ""
echo -e "Ten skrypt skonfiguruje Twoje połączenie z Mikrusem tak,"
echo -e "abyś mógł połączyć się wpisując: \${GREEN}ssh\${NC} i wybraną przez Ciebie nazwę (np. \${GREEN}mikrus\${NC})"
echo ""

# 1. Pobieranie danych
read -p "Podaj nazwę hosta (np. srv20.mikr.us): " HOST
read -p "Podaj numer portu (np. 10107): " PORT
read -p "Podaj nazwę użytkownika (domyślnie: root): " USER
USER=\${USER:-root}
read -p "Jak chcesz nazwać ten serwer w terminalu? (domyślnie: mikrus): " ALIAS
ALIAS=\${ALIAS:-mikrus}

if [[ -z "$HOST" || -z "$PORT" ]]; then
    echo -e "\${RED}Błąd: Host i Port są wymagane!\${NC}"
    exit 1
fi

# 2. Generowanie klucza SSH
KEY_PATH="$HOME/.ssh/id_ed25519"
if [ ! -f "$KEY_PATH" ]; then
    echo -e "\${YELLOW}Generuję nowy klucz SSH...\${NC}"
    ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "mikrus_key"
else
    echo -e "\${GREEN}Znaleziono klucz SSH.\${NC}"
fi

# 3. Kopiowanie klucza
echo ""
echo -e "\${YELLOW}Podaj hasło do serwera (tylko ten jeden raz!):\${NC}"
ssh-copy-id -i "$KEY_PATH.pub" -p "$PORT" "$USER@$HOST"

if [ $? -ne 0 ]; then
    echo -e "\${RED}Błąd logowania. Sprawdź hasło.\${NC}"
    exit 1
fi

# 4. Config
CONFIG_FILE="$HOME/.ssh/config"
if ! grep -q "Host $ALIAS" "$CONFIG_FILE" 2>/dev/null; then
    touch "$CONFIG_FILE"
    echo "" >> "$CONFIG_FILE"
    echo "Host $ALIAS" >> "$CONFIG_FILE"
    echo "    HostName $HOST" >> "$CONFIG_FILE"
    echo "    Port $PORT" >> "$CONFIG_FILE"
    echo "    User $USER" >> "$CONFIG_FILE"
    echo "    IdentityFile $KEY_PATH" >> "$CONFIG_FILE"
    echo "    ServerAliveInterval 60" >> "$CONFIG_FILE"
    echo -e "\${GREEN}Dodano alias do $CONFIG_FILE\${NC}"
fi

echo ""
echo -e "\${BLUE}=================================================\${NC}"
echo -e "\${GREEN}   ✅ SUKCES! KONFIGURACJA ZAKOŃCZONA!   \${NC}"
echo -e "\${BLUE}=================================================\${NC}"
echo ""
echo -e "Od teraz możesz połączyć się wpisując: \${GREEN}ssh\${NC} i nazwę aliasu (np. \${GREEN}mikrus\${NC})"
echo ""
echo "Po zalogowaniu zobaczysz ekran powitalny:"
echo -e "\${BLUE}"
echo "           _ _"
echo " _ __ ___ (_) | ___ __ _   _ ___"
echo "| '_ \` _ \| | |/ / '__| | | / __|"
echo "| | | | | | |   <| |  | |_| \__ \  Serwery dla ludzi z pasją."
echo "|_| |_| |_|_|_|\_\_|   \__,_|___/"
echo -e "\${NC}"
echo "Wtedy możesz użyć komend:"
echo -e "➡️  \${YELLOW}n8n_install\${NC} (Instalacja)"
echo -e "➡️  \${YELLOW}n8n_update\${NC}  (Aktualizacja)"
echo ""
`;

export default function TerminalGuide({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'mac' | 'windows'>('mac');
    const [copied, setCopied] = useState(false);

    // Decode Base64 to string with UTF-8 support
    const getScriptContent = () => {
        return SCRIPT_CONTENT; // Now it's a direct string
    };

    const copyScript = () => {
        navigator.clipboard.writeText(getScriptContent());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadScript = () => {
        const element = document.createElement("a");
        const file = new Blob([getScriptContent()], {type: 'text/x-sh'});
        element.href = URL.createObjectURL(file);
        element.download = "setup_mikrus.sh";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
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
                                <h3 className="text-emerald-400 font-bold mb-2">🚀 Automatyczna Konfiguracja (Zalecane)</h3>
                                <p className="mb-3">Przygotowaliśmy skrypt, który:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2 opacity-80 text-xs">
                                    <li>Wygeneruje bezpieczne klucze SSH.</li>
                                    <li>Wyśle je na Twój serwer (wpiszesz hasło tylko raz!).</li>
                                    <li>Stworzy alias, dzięki któremu połączysz się wpisując tylko <code>ssh mikrus</code>.</li>
                                </ul>
                                
                                <div className="mt-4">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Krok 1: Pobierz lub skopiuj skrypt</p>
                                    <div className="relative group">
                                        <pre className="bg-black/50 p-4 rounded-lg font-mono text-xs text-slate-400 overflow-x-auto border border-slate-800 max-h-32 whitespace-pre-wrap">
                                            {getScriptContent()}
                                        </pre>
                                        <div className="absolute top-2 right-2 flex gap-2">
                                            <button 
                                                onClick={downloadScript}
                                                className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded transition-all shadow-lg font-bold flex items-center gap-1"
                                            >
                                                ⬇️Pobierz .sh
                                            </button>
                                            <button 
                                                onClick={copyScript}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded transition-all shadow-lg font-bold"
                                            >
                                                {copied ? 'Skopiowano!' : 'Kopiuj'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Krok 2: Uruchom w Terminalu</p>
                                    <div className="bg-black p-4 rounded-lg font-mono text-xs border border-slate-800">
                                        <div className="flex gap-2">
                                            <span className="text-slate-500">$</span>
                                            <span className="text-emerald-400">nano setup_mikrus.sh</span> <span className="text-slate-500"># Wklej treść (Cmd+V) i zapisz (Ctrl+O, Enter, Ctrl+X)</span>
                                        </div>
                                        
                                        {/* GIF Placeholder */}
                                        <div className="my-4 text-center">
                                            <img 
                                                src="/gifs/terminal_run_script.gif" 
                                                alt="Instrukcja uruchamiania skryptu w terminalu" 
                                                className="rounded-lg shadow-lg mx-auto w-full max-w-sm" 
                                            />
                                        </div>

                                        <div className="flex gap-2 mt-2">
                                            <span className="text-slate-500">$</span>
                                            <span className="text-emerald-400">chmod +x setup_mikrus.sh</span> <span className="text-slate-500"># Nadaj uprawnienia</span>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-slate-500">$</span>
                                            <span className="text-emerald-400">./setup_mikrus.sh</span> <span className="text-slate-500"># Uruchom</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Krok 3: Sukces */}
                                <div className="mt-4 bg-[#05080f] p-4 rounded-lg border border-slate-800">
                                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">Krok 3: Sukces! 🎉</p>
                                    <p className="mb-2 text-xs opacity-80">Gdy połączysz się przez <code>ssh mikrus</code>, zobaczysz taki ekran. Wtedy możesz użyć komend:</p>
                                    <pre className="text-[10px] text-blue-400 font-mono leading-none mb-3 overflow-x-auto">
{`           _ _
 _ __ ___ (_) | ___ __ _   _ ___
| '_ \` _ \| | |/ / '__| | | / __|
| | | | | | |   <| |  | |_| \__ \  Serwery dla ludzi z pasją.
|_| |_| |_|_|_|\_\_|   \__,_|___/`}
                                    </pre>
                                    <div className="flex gap-4 text-xs font-mono">
                                        <span className="text-yellow-400">n8n_install</span>
                                        <span className="text-yellow-400">n8n_update</span>
                                    </div>
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
                                <h3 className="text-blue-400 font-bold mb-2">Windows 10 / 11 (PowerShell)</h3>
                                <p className="mb-3">Nie potrzebujesz już programu PuTTY! Windows ma wbudowanego klienta SSH.</p>
                                
                                <ol className="list-decimal list-inside space-y-3 ml-2">
                                    <li>Kliknij prawym przyciskiem na menu Start i wybierz <strong>Windows PowerShell</strong> (lub Terminal).</li>
                                    <li>Wpisz komendę (podstawiając swoje dane z maila):
                                        <div className="bg-black p-3 rounded-lg font-mono text-xs border border-slate-800 mt-2 mb-1 text-slate-300">
                                            ssh root@<span className="text-yellow-400">srvX.mikr.us</span> -p <span className="text-yellow-400">10107</span>
                                        </div>
                                    </li>
                                    <li>Jeśli łączysz się pierwszy raz, wpisz <code>yes</code>, aby potwierdzić odcisk klucza.</li>
                                    <li>Podaj hasło (uwaga: podczas wpisywania nic nie widać na ekranie!).</li>
                                    <li>Po zalogowaniu zobaczysz logo Mikrusa. Wpisz <code>n8n_install</code> aby zainstalować.</li>
                                </ol>
                            </div>

                            <div className="border-t border-slate-800 pt-6">
                                <h3 className="text-white font-bold mb-3">Jak wygenerować klucze na Windows?</h3>
                                <p className="mb-2">W PowerShell możesz również wygenerować klucze, aby logować się bez hasła:</p>
                                <div className="bg-black p-3 rounded-lg font-mono text-xs border border-slate-800 space-y-2">
                                    <div><span className="text-slate-500"># 1. Generowanie klucza</span></div>
                                    <div className="text-blue-400">ssh-keygen -t ed25519</div>
                                    <div><span className="text-slate-500"># 2. Wyświetlenie klucza publicznego (skopiuj go!)</span></div>
                                    <div className="text-blue-400">cat $env:USERPROFILE\.ssh\id_ed25519.pub</div>
                                </div>
                                <p className="mt-3 text-xs opacity-80">
                                    Następnie zaloguj się na serwer (hasłem), otwórz plik <code>~/.ssh/authorized_keys</code> (np. edytorem <code>nano</code>) i wklej skopiowany klucz w nowej linii.
                                </p>
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