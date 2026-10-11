import React, { useState, useEffect } from 'react';
import { Search, Terminal, Cpu, Database, Flame, Zap, Activity, Server, AlertTriangle, DollarSign, ShieldCheck, X } from 'lucide-react';

export default function CommandPalette({ isOpen, onClose, onNavigate, onTriggerScenario }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const commands = [
    { type: 'NAV', label: 'Go to Overview', target: 'overview', icon: Activity },
    { type: 'NAV', label: 'Go to Infrastructure', target: 'infrastructure', icon: Server },
    { type: 'NAV', label: 'Go to AI Intelligence', target: 'ai-monitoring', icon: Terminal },
    { type: 'NAV', label: 'Go to Incident Center', target: 'incidents', icon: AlertTriangle },
    { type: 'NAV', label: 'Go to SLM Assistant', target: 'ai-assistant', icon: Terminal },
    { type: 'NAV', label: 'Go to Cloud Cost', target: 'cost', icon: DollarSign },
    { type: 'NAV', label: 'Go to Remediation', target: 'remediation', icon: ShieldCheck },

    { type: 'SIM', label: 'Run Simulation: CPU Saturation (95%)', scenario: 'cpu_saturation', icon: Cpu },
    { type: 'SIM', label: 'Run Simulation: Pod Memory Leak (OOMKilled)', scenario: 'memory_leak', icon: Database },
    { type: 'SIM', label: 'Run Simulation: Pod CrashLoopBackOff', scenario: 'pod_crash', icon: Flame },
    { type: 'SIM', label: 'Run Simulation: Traffic Surge (3.5k req/s)', scenario: 'traffic_spike', icon: Zap },
    { type: 'SIM', label: 'Run Simulation: Cascading Microservice Failure', scenario: 'cascading_failure', icon: AlertTriangle },
  ];

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (cmd) => {
    if (cmd.type === 'NAV') {
      onNavigate(cmd.target);
    } else if (cmd.type === 'SIM') {
      onTriggerScenario(cmd.scenario);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="tech-panel-elevated w-full max-w-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden space-y-0">
        <div className="flex items-center px-4 py-3 border-b border-white/10 bg-slate-950">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or simulation scenario... (Ctrl+K)"
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 font-mono">No matching commands found.</div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(cmd)}
                  className="w-full text-left flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-all text-xs text-slate-200"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-blue-400" />
                    <span>{cmd.label}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-white/5">
                    {cmd.type}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
