import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, Zap, Cpu, Database, Flame, AlertTriangle, Layers, Clock, CheckCircle2 } from 'lucide-react';

export default function SimulationControlPanel({ onScenarioTriggered }) {
  const [isOpen, setIsOpen] = useState(false);
  const [simStatus, setSimStatus] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState('cpu_saturation');
  const [targetService, setTargetService] = useState('checkout-service');
  const [intensity, setIntensity] = useState(0.7);
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/v1/simulation/status');
      setSimStatus(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleStart = async () => {
    try {
      await fetch('/api/v1/simulation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: selectedScenario,
          target_service: targetService,
          duration_seconds: duration,
          intensity: parseFloat(intensity)
        })
      });
      fetchStatus();
      if (onScenarioTriggered) onScenarioTriggered();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePause = async () => {
    try {
      await fetch('/api/v1/simulation/pause', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResume = async () => {
    try {
      await fetch('/api/v1/simulation/resume', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = async () => {
    try {
      await fetch('/api/v1/simulation/reset', { method: 'POST' });
      fetchStatus();
      if (onScenarioTriggered) onScenarioTriggered();
    } catch (err) {
      console.error(err);
    }
  };

  const scenarios = [
    { id: 'cpu_saturation', label: 'CPU Saturation (95%)', icon: Cpu },
    { id: 'memory_leak', label: 'Pod Memory Leak (OOM)', icon: Database },
    { id: 'pod_crash', label: 'Pod CrashLoopBackOff', icon: Flame },
    { id: 'traffic_spike', label: 'Traffic Surge (3.5k req/s)', icon: Zap },
    { id: 'cascading_failure', label: 'Cascading Microservice Failure', icon: AlertTriangle },
  ];

  return (
    <div className="bg-[#0B0F17] border-b border-white/10 px-6 py-2.5 text-xs text-slate-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>● SIMULATION MODE</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 font-mono">
            <span>Clock:</span>
            <span className="text-white font-bold">
              {simStatus ? `${Math.floor(simStatus.clock_seconds / 60).toString().padStart(2, '0')}:${(simStatus.clock_seconds % 60).toString().padStart(2, '0')}` : '00:00'}
            </span>
          </div>

          {simStatus?.current_scenario && (
            <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30 font-mono text-[11px]">
              Active: {simStatus.current_scenario} ({simStatus.target_service})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {simStatus?.is_running && !simStatus?.is_paused ? (
            <button onClick={handlePause} className="px-3 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1">
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          ) : simStatus?.is_paused ? (
            <button onClick={handleResume} className="px-3 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          ) : null}

          <button onClick={handleReset} className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-medium flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Reset Simulation
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" /> Simulation Controls ▾
          </button>
        </div>
      </div>

      {/* Expanded Control Drawer */}
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="font-bold text-white font-mono text-[11px] uppercase tracking-wider">Select Failure Scenario</h4>
            <div className="space-y-1.5">
              {scenarios.map((sc) => {
                const Icon = sc.icon;
                const isSelected = selectedScenario === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => setSelectedScenario(sc.id)}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between border transition-all ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 text-white font-semibold'
                        : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-blue-400" />
                      <span>{sc.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white font-mono text-[11px] uppercase tracking-wider">Target & Scenario Tuning</h4>

            <div className="space-y-2 font-mono">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Microservice</label>
                <select
                  value={targetService}
                  onChange={(e) => setTargetService(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="checkout-service">checkout-service</option>
                  <option value="payment-service">payment-service</option>
                  <option value="auth-service">auth-service</option>
                  <option value="inventory-service">inventory-service</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Load Intensity ({(intensity * 100).toFixed(0)}%)</label>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.1"
                  value={intensity}
                  onChange={(e) => setIntensity(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Scenario Duration (seconds)</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                >
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={120}>120 seconds</option>
                </select>
              </div>

              <button
                onClick={handleStart}
                className="w-full mt-2 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Play className="w-3.5 h-3.5" /> Inject Scenario
              </button>
            </div>
          </div>

          {/* Timeline Log */}
          <div className="space-y-2">
            <h4 className="font-bold text-white font-mono text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Simulation Timeline Event Log
            </h4>
            <div className="h-44 overflow-y-auto space-y-1.5 p-2 bg-slate-950 rounded border border-white/5 font-mono text-[11px]">
              {simStatus?.timeline?.map((ev, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-slate-500">{ev.time_offset}</span>
                  <span className={ev.type === 'CRITICAL' ? 'text-rose-400 font-bold' : ev.type === 'WARNING' ? 'text-amber-400' : 'text-slate-300'}>
                    {ev.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
