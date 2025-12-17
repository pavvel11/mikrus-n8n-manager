'use client';

import { useEffect, useState } from 'react';

interface ServerMonitorProps {
    status: 'online' | 'offline';
    ramUsage: number; // MB
    totalRam: number; // MB
    loadAvg: number;
    agentStats: { ram: number, cpu: string };
}

export default function ServerMonitor({ status, ramUsage, totalRam, loadAvg, agentStats }: ServerMonitorProps) {
    const [loadHistory, setLoadHistory] = useState<number[]>(new Array(20).fill(0));

    // Update history for sparkline
    useEffect(() => {
        if (status === 'online') {
            setLoadHistory(prev => {
                const next = [...prev.slice(1), loadAvg];
                return next;
            });
        }
    }, [loadAvg, status]);

    // RAM Calculations
    const ramPercent = totalRam > 0 ? Math.min(100, Math.round((ramUsage / totalRam) * 100)) : 0;
    
    // Load Calculations (assuming Mikrus usually has 1 or 2 vCores, Load > 2 is heavy)
    const loadPercent = Math.min(100, (loadAvg / 2) * 100); 

    const getLoadLabel = (load: number) => {
        if (load < 0.5) return { text: 'Niskie', color: 'text-emerald-400' };
        if (load < 1.0) return { text: 'Średnie', color: 'text-yellow-400' };
        return { text: 'Wysokie', color: 'text-red-400' };
    };
    
    const loadLabel = getLoadLabel(loadAvg);

    // Color logic
    const getRamColor = (p: number) => {
        if (p > 85) return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]';
        if (p > 60) return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]';
        return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]';
    };

    return (
        <div className={`relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-md p-5 transition-all duration-500 ${status === 'offline' ? 'opacity-50 grayscale' : 'opacity-100'}`}>
            
            {/* Background Grid Decoration */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent h-[20%] w-full animate-scanline pointer-events-none"></div>

            {/* Agent Stats (Top Right) */}
            <div className="absolute top-2 right-3 text-[9px] font-mono text-slate-600 opacity-70">
                Agent: <span className="text-slate-400">{agentStats?.ram || 0}MB</span> | CPU: <span className="text-slate-400">{agentStats?.cpu || '0.00'}%</span>
            </div>

            {/* Disclaimer (Bottom Right) */}
            <div className="absolute bottom-1 right-3 text-[8px] text-slate-700 opacity-50 select-none">
                (Dane poglądowe)
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* RAM MODULE */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Memory Module</span>
                        <span className="text-xs font-mono text-emerald-400">{ramUsage} MB / {totalRam} MB</span>
                    </div>
                    
                    {/* RAM Bar */}
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative group">
                        <div 
                            className={`h-full transition-all duration-700 ease-out ${getRamColor(ramPercent)} relative`}
                            style={{ width: `${ramPercent}%` }}
                        >
                            <div className="absolute right-0 top-0 h-full w-[2px] bg-white/50 animate-pulse"></div>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <span className="text-[10px] text-slate-500">{ramPercent}% Usage</span>
                    </div>
                </div>

                {/* LOAD MODULE (Sparkline) */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Obciążenie CPU</span>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${loadAvg > 1.0 ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                            <span className={`text-xs font-bold ${loadLabel.color}`}>{loadLabel.text} <span className="opacity-50 text-[10px]">({loadAvg.toFixed(2)})</span></span>
                        </div>
                    </div>

                    {/* Simple CSS/SVG Sparkline */}
                    <div className="h-8 w-full bg-slate-800/50 rounded border border-slate-700/50 relative overflow-hidden flex items-end gap-[2px] p-[2px]">
                        {loadHistory.map((val, i) => {
                            const h = Math.min(100, (val / 2) * 100); // Normalize to ~2.0 load max height
                            return (
                                <div 
                                    key={i} 
                                    className={`flex-1 rounded-sm transition-all duration-300 ${val > 1.0 ? 'bg-yellow-500/60' : 'bg-emerald-500/60'}`}
                                    style={{ height: `${Math.max(5, h)}%` }}
                                ></div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-600">
                        <span>-60s</span>
                        <span>now</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
