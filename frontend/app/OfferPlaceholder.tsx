'use client';

import React from 'react';

export default function OfferPlaceholder({ onOpenGuide }: { onOpenGuide: () => void }) {
    return (
        <div className="mt-6 p-1 rounded-xl bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border border-orange-500/30 animate-in fade-in zoom-in">
            <div className="bg-[#0b0f19] p-4 rounded-lg">
                <h3 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">🔥 Gotowy na więcej?</h3>
                <p className="text-xs text-slate-400 mb-3">
                    Twój n8n działa! Teraz wybierz swoją ścieżkę rozwoju:
                </p>
                
                <div className="space-y-3">
                    {/* 1. Darmowy Poradnik */}
                    <button 
                        onClick={onOpenGuide}
                        className="interactive-target w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 text-white text-xs px-4 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-emerald-500/20 flex items-center justify-between group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🎓</span>
                            <div>
                                <span className="block text-emerald-400">Mistrz Terminala & Mikrusa</span>
                                <span className="text-[10px] text-slate-500 font-normal">Darmowy poradnik + Podstawy SSH</span>
                            </div>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>

                    {/* 2. Kurs Admin / DevOps */}
                    <a href="#" className="interactive-target block bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 text-white text-xs px-4 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-blue-500/20 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⚙️</span>
                            <div>
                                <span className="block text-blue-400">Zaawansowana Administracja n8n</span>
                                <span className="text-[10px] text-slate-500 font-normal">Kurs: Zewnętrzny Postgres, Backupy S3, Security</span>
                            </div>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </a>

                    {/* 3. Kurs Developer / Workflow */}
                    <a href="#" className="interactive-target block bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-orange-500/50 text-white text-xs px-4 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-orange-500/20 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⚡</span>
                            <div>
                                <span className="block text-orange-400">n8n Masterclass</span>
                                <span className="text-[10px] text-slate-500 font-normal">Kurs: Zaawansowane Workflowy, JavaScript, API</span>
                            </div>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </a>
                </div>
            </div>
        </div>
    );
}