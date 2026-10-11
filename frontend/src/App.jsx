import React, { useState, useEffect } from 'react';
import { 
  Activity, Server, AlertTriangle, ShieldCheck, Cpu, DollarSign, 
  BrainCircuit, Terminal, Search, ChevronRight, Layers, Command, RotateCcw
} from 'lucide-react';

import OverviewPage from './pages/OverviewPage';
import { subscribeTelemetry } from './demo/engine';
import InfrastructurePage from './pages/InfrastructurePage';
import AIMonitoringPage from './pages/AIMonitoringPage';
import IncidentCenterPage from './pages/IncidentCenterPage';
import AIAssistantPage from './pages/AIAssistantPage';
import CostIntelligencePage from './pages/CostIntelligencePage';
import RemediationPage from './pages/RemediationPage';
import SimulationControlPanel from './components/SimulationControlPanel';
import CommandPalette from './components/CommandPalette';
import SplashScreen from './components/SplashScreen';
import StitchBridgeBadge from './components/StitchBridgeBadge';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [wsConnected, setWsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [userRole, setUserRole] = useState('DevOps');
  const [slmOnline, setSlmOnline] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check SLM Health
    fetch('/api/v1/ai/health')
      .then(r => r.json())
      .then(d => setSlmOnline(d.ollama === 'online' || d.ollama === 'ready'))
      .catch(() => setSlmOnline(true));

    // Subscribe to the in-browser telemetry stream (static demo: no server)
    setWsConnected(true);
    const unsubscribe = subscribeTelemetry((data) => setTelemetry(data));
    return () => unsubscribe();
  }, [refreshTrigger]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'infrastructure', label: 'Infrastructure', icon: Server },
    { id: 'ai-monitoring', label: 'AI Intelligence', icon: BrainCircuit },
    { id: 'incidents', label: 'Incident Center', icon: AlertTriangle },
    { id: 'ai-assistant', label: 'SLM Copilot', icon: Terminal },
    { id: 'cost', label: 'Cloud Cost', icon: DollarSign },
    { id: 'remediation', label: 'Remediation', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#080B10] text-[#F3F5F7] font-sans antialiased selection:bg-blue-600 selection:text-white cyber-grid relative">
      {/* Animated Splash Screen */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Top Global Status Bar */}
      <header className="sticky top-0 z-40 bg-[#0B0F17]/90 backdrop-blur-md border-b border-white/10 px-6 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setShowSplash(true)} title="Click to launch boot splash">
            <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 group-hover:border-blue-400 transition-all shadow-sm shadow-blue-500/20">
              <BrainCircuit className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white font-mono flex items-center gap-2">
                AegisOps
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">v2.0</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">DEMO BUILD</span>
              </h1>
            </div>
          </div>

          {/* System Badges */}
          <div className="hidden md:flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              SIMULATION
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/10">
              K8s: SIMULATED
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/10">
              ML: READY
            </span>
            <span className={`px-2 py-0.5 rounded border ${slmOnline ? 'bg-purple-950 text-purple-300 border-purple-500/30 font-semibold' : 'bg-slate-900 text-slate-400 border-white/10'}`}>
              SLM: {slmOnline ? 'ONLINE' : 'DEMO TEMPLATE'}
            </span>
            <span className={`px-2 py-0.5 rounded border ${wsConnected ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30 font-semibold flex items-center gap-1' : 'bg-slate-900 text-slate-400 border-white/10'}`}>
              {wsConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              STREAM: {wsConnected ? 'LIVE' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Right Tools, Stitch Badge & Role */}
        <div className="flex items-center gap-2.5">
          <StitchBridgeBadge />

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 font-mono transition-all hover:border-blue-500/40"
          >
            <Command className="w-3.5 h-3.5 text-blue-400" />
            <span>Search (Ctrl+K)</span>
          </button>

          <button
            onClick={() => setShowSplash(true)}
            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-white transition-all"
            title="Re-launch Boot Splash Sequence"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-white/10 text-xs font-mono">
            <span className="text-slate-400">Role:</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="bg-transparent text-blue-400 font-bold cursor-pointer focus:outline-none"
            >
              <option value="Admin" className="bg-slate-900 text-slate-200">Admin</option>
              <option value="DevOps" className="bg-slate-900 text-slate-200">DevOps</option>
              <option value="Developer" className="bg-slate-900 text-slate-200">Developer</option>
              <option value="Viewer" className="bg-slate-900 text-slate-200">Viewer</option>
            </select>
          </div>
        </div>
      </header>

      {/* Simulation Control Panel Bar */}
      <SimulationControlPanel onScenarioTriggered={() => setRefreshTrigger(prev => prev + 1)} />

      {/* App Body Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Compact Cyber Sidebar */}
        <aside className="w-48 bg-[#0D121A]/90 backdrop-blur-md border-r border-white/10 p-3 space-y-1 flex flex-col justify-between shadow-xl">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-semibold shadow-sm shadow-blue-500/10 scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/5 text-[10px] text-slate-400 font-mono space-y-1">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              STITCH AI ENGINE
            </div>
            <div className="text-slate-500 truncate">Synthetic Telemetry Bus</div>
          </div>
        </aside>

        {/* Main Workspace with Smooth Entrance Animation */}
        <main key={activeTab} className="flex-1 p-6 overflow-y-auto space-y-6 animate-fade-in">
          {activeTab === 'overview' && <OverviewPage telemetry={telemetry} userRole={userRole} onNavigate={setActiveTab} />}
          {activeTab === 'infrastructure' && <InfrastructurePage telemetry={telemetry} />}
          {activeTab === 'ai-monitoring' && <AIMonitoringPage telemetry={telemetry} />}
          {activeTab === 'incidents' && <IncidentCenterPage userRole={userRole} onNavigate={setActiveTab} />}
          {activeTab === 'ai-assistant' && <AIAssistantPage />}
          {activeTab === 'cost' && <CostIntelligencePage />}
          {activeTab === 'remediation' && <RemediationPage userRole={userRole} />}
        </main>
      </div>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
        onTriggerScenario={(sc) => {
          fetch('/api/v1/simulation/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario: sc, target_service: 'checkout-service' })
          });
          setRefreshTrigger(prev => prev + 1);
        }}
      />
    </div>
  );
}

