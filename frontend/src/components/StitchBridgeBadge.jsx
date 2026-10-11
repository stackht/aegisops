import React, { useState } from 'react';
import { Sparkles, Layers, Eye, CheckCircle2, Palette, ShieldCheck, X } from 'lucide-react';

export default function StitchBridgeBadge() {
  const [modalOpen, setModalOpen] = useState(false);

  const designTokens = [
    { name: "Background Deep", value: "#080B10", type: "Color" },
    { name: "Panel Surface", value: "rgba(13, 18, 26, 0.85)", type: "Glass surface" },
    { name: "Primary Accent", value: "#3B82F6 (Blue-500)", type: "Color" },
    { name: "Success State", value: "#22C55E (Emerald-500)", type: "Color" },
    { name: "Warning State", value: "#F59E0B (Amber-500)", type: "Color" },
    { name: "Critical Danger", value: "#EF4444 (Red-500)", type: "Color" },
    { name: "Code Typography", value: "JetBrains Mono", type: "Font" },
    { name: "UI Typography", value: "Inter", type: "Font" },
  ];

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-medium transition-all shadow-sm hover:shadow-indigo-500/20 hover:scale-105"
        title="View Stitch MCP Design System & UI Specs"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
        <span>Stitch UI</span>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0B0F17] border border-indigo-500/30 w-full max-w-xl rounded-xl shadow-2xl p-6 space-y-5 text-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                    Stitch Design System
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      CONNECTED
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    AIOps Cybernetic Dark Observatory Framework v2.0
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Design Token Matrix */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                ACTIVE DESIGN TOKENS
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {designTokens.map((t, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-slate-900/90 border border-white/5 flex flex-col justify-between space-y-1">
                    <div className="text-[10px] text-slate-400">{t.name}</div>
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: t.value.split(' ')[0] }} />
                      <span className="truncate">{t.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Specs Summary */}
            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs font-mono space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                UX Specs & Micro-animations
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Stitch MCP design specs enforce dark minimal glassmorphism (`#080B10`), dynamic radar telemetry sweeps, micro-glow cards, and instant SLM context response.
              </p>
            </div>

            {/* Close Action */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-medium transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
