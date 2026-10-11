import React, { useState, useEffect } from 'react';
import { BrainCircuit, ShieldCheck, Activity, Terminal, Cpu, CheckCircle2, Zap } from 'lucide-react';

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const steps = [
    "Initializing Neural Observability Engine...",
    "Connecting Real-time Telemetry Bus...",
    "Checking Minikube K8s Cluster Health...",
    "Loading Isolation Forest Anomaly Models...",
    "Connecting Stitch MCP Design Framework...",
    "Mounting SLM Copilot (phi:latest)...",
    "AIOps Control Center Ready."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsDone(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 600);
          return 100;
        }
        const nextVal = prev + Math.floor(Math.random() * 15) + 8;
        const boundedVal = Math.min(nextVal, 100);
        
        // Update diagnostic text step based on progress
        const stepIdx = Math.min(
          Math.floor((boundedVal / 100) * steps.length),
          steps.length - 1
        );
        setCurrentStep(stepIdx);

        return boundedVal;
      });
    }, 180);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`fixed inset-0 z-50 bg-[#080B10] cyber-grid flex flex-col items-center justify-center p-6 transition-opacity duration-700 ${isDone ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Background Radial Glow */}
      <div className="absolute w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center space-y-6 glass-card p-8 rounded-2xl border border-blue-500/20 shadow-2xl">
        {/* Animated Cyber Icon Container */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Radar Sweep Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/40 animate-radar" />
          <div className="absolute inset-2 rounded-full border border-purple-500/30 animate-ping opacity-25" />
          
          <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <BrainCircuit className="w-9 h-9 animate-pulse" />
          </div>
        </div>

        {/* Title & Badge */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold">
            <Zap className="w-3.5 h-3.5 animate-bounce" />
            STITCH DESIGN SYSTEM CONNECTED
          </div>
          <h1 className="text-2xl font-bold font-mono text-white tracking-wide">
            AIOPS CONTROL CENTER
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Autonomous Cloud & Kubernetes Intelligence Engine
          </p>
        </div>

        {/* Diagnostic Terminal Step */}
        <div className="w-full bg-[#0B0F17] border border-white/10 rounded-lg p-3 font-mono text-left space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-white/10 pb-1.5">
            <span className="flex items-center gap-1.5 text-blue-400">
              <Terminal className="w-3.5 h-3.5" /> BOOT DIAGNOSTIC
            </span>
            <span className="text-emerald-400 font-bold">{progress}%</span>
          </div>

          <div className="text-xs text-slate-300 flex items-center gap-2">
            {progress < 100 ? (
              <Activity className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="truncate">{steps[currentStep]}</span>
          </div>

          {/* Diagnostic Checkmarks */}
          <div className="grid grid-cols-2 gap-1.5 pt-2 text-[10px] text-slate-400">
            <div className={`flex items-center gap-1 ${progress > 25 ? 'text-emerald-400' : 'text-slate-600'}`}>
              ✓ TELEMETRY STREAM
            </div>
            <div className={`flex items-center gap-1 ${progress > 50 ? 'text-emerald-400' : 'text-slate-600'}`}>
              ✓ ISOLATION FOREST
            </div>
            <div className={`flex items-center gap-1 ${progress > 75 ? 'text-emerald-400' : 'text-slate-600'}`}>
              ✓ MINIKUBE GATEWAY
            </div>
            <div className={`flex items-center gap-1 ${progress >= 100 ? 'text-emerald-400' : 'text-slate-600'}`}>
              ✓ SLM COPILOT (phi:latest)
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-1">
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-200 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Skip Button */}
        <button
          onClick={() => {
            setIsDone(true);
            if (onComplete) onComplete();
          }}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono underline cursor-pointer"
        >
          Skip Boot Sequence
        </button>
      </div>
    </div>
  );
}
