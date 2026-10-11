import React, { useState, useEffect } from 'react';
import { BrainCircuit, Sparkles, AlertTriangle, Cpu, Activity, Gauge } from 'lucide-react';

export default function AIMonitoringPage({ telemetry }) {
  const [anomalies, setAnomalies] = useState([]);
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    fetchData();
  }, [telemetry]);

  const fetchData = async () => {
    try {
      const [anomRes, predRes] = await Promise.all([
        fetch('/api/v1/anomalies'),
        fetch('/api/v1/predictions')
      ]);
      setAnomalies(await anomRes.json());
      setPredictions(await predRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const ai = telemetry?.ai_summary?.worst;
  const dash = '...';
  const models = [
    { name: 'Isolation Forest Anomaly', status: 'READY', lastRun: 'Live (2s)', input: '5 Metrics', output: 'Score [0-1]', score: ai ? `${ai.anomaly_score.toFixed(2)} (${ai.is_anomaly ? ai.anomaly_severity : 'LOW'})` : dash },
    { name: 'Random Forest Failure Predictor', status: 'READY', lastRun: 'Live (2s)', input: '7 Features', output: 'Prob %', score: ai ? `${(ai.failure_probability * 100).toFixed(0)}% Risk` : dash },
    { name: 'Service Health Classifier', status: 'READY', lastRun: 'Live (2s)', input: '5 Metrics', output: 'Category', score: ai ? ai.health_class : dash },
    { name: 'Fuzzy Overload Risk', status: 'READY', lastRun: 'Live (2s)', input: '4 Fuzzy Inputs', output: 'Risk score', score: ai ? `${(ai.overload_risk_score * 100).toFixed(0)} / 100` : dash },
  ];
  const live = telemetry?.ai_summary?.services;
  const rows = live
    ? Object.entries(live).map(([name, v], i) => ({
        id: i, service_name: name, failure_probability: v.failure_probability, risk_level: v.failure_risk,
        overload_risk_score: v.overload_risk_score, top_contributing_features: [{ feature: v.top_feature }],
      }))
    : predictions;
  const mem = ai?.memberships;
  const topSet = (sets) => Object.entries(sets).sort((x, y) => y[1] - x[1])[0];
  const bars = mem ? [
    ['CPU Membership', ...topSet(mem.cpu)],
    ['Memory Membership', ...topSet(mem.memory)],
    ['Latency Membership', ...topSet(mem.latency)],
  ] : [];
  const trig = ai?.fuzzy_rule_triggers;

  return (
    <div className="space-y-6 font-mono text-xs">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-purple-400" />
          AI & Machine Learning Model Observability
        </h2>
        <p className="text-slate-400 font-sans text-xs">Model state, inference metrics, top feature attribution & fuzzy rule triggers</p>
      </div>

      {/* Model Observability Interface Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {models.map((m, idx) => (
          <div key={idx} className="tech-panel p-4 space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-white font-sans text-xs">{m.name}</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px]">
                {m.status}
              </span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-400">
              <div className="flex justify-between"><span>Last Run:</span><span className="text-white">{m.lastRun}</span></div>
              <div className="flex justify-between"><span>Input Vector:</span><span className="text-white">{m.input}</span></div>
              <div className="flex justify-between"><span>Current Score:</span><span className="text-purple-300 font-bold">{m.score}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Failure Predictor Outputs */}
        <div className="lg:col-span-2 tech-panel p-5 space-y-4">
          <span className="font-bold text-white text-xs font-sans flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Recent Failure Predictor Outputs (Random Forest)
          </span>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-white/10">
                <tr>
                  <th className="p-2.5">Service</th>
                  <th className="p-2.5">Failure Prob %</th>
                  <th className="p-2.5">Risk Level</th>
                  <th className="p-2.5">Overload Risk</th>
                  <th className="p-2.5">Top Risk Feature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {rows.slice(0, 5).map((pred) => (
                  <tr key={pred.id} className="hover:bg-white/5">
                    <td className="p-2.5 font-bold text-white">{pred.service_name}</td>
                    <td className="p-2.5 font-bold text-amber-400">
                      {(pred.failure_probability * 100).toFixed(1)}%
                    </td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pred.risk_level === 'CRITICAL' || pred.risk_level === 'HIGH'
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {pred.risk_level}
                      </span>
                    </td>
                    <td className="p-2.5 text-purple-300 font-bold">
                      {(pred.overload_risk_score * 100).toFixed(0)} / 100
                    </td>
                    <td className="p-2.5 text-slate-400 text-[11px]">
                      {pred.top_contributing_features?.[0]?.feature || 'cpu_usage'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Neuro-Fuzzy Membership UI */}
        <div className="tech-panel p-5 space-y-4">
          <span className="font-bold text-white text-xs font-sans flex items-center gap-2">
            <Gauge className="w-4 h-4 text-purple-400" /> Infrastructure Risk (Fuzzy Membership)
          </span>

          <div className="space-y-3 font-mono">
            <div className="text-[10px] text-slate-500">Service: {telemetry?.ai_summary?.worst_service || dash}</div>
            {bars.map(([label, level, value]) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>{label}:</span>
                  <span className={`${level === 'high' ? 'text-rose-400' : level === 'medium' ? 'text-amber-400' : 'text-emerald-400'} font-bold`}>{level.toUpperCase()} ({value.toFixed(2)})</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded overflow-hidden">
                  <div className={`${level === 'high' ? 'bg-rose-500' : level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'} h-full rounded`} style={{ width: `${Math.round(value * 100)}%` }} />
                </div>
              </div>
            ))}

            {/* Fuzzy rule degrees computed by the backend */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <span className="font-bold text-slate-300 text-[11px] block">Fuzzy Rule Degrees</span>
              {trig && (
                <>
                  <div className="p-2 bg-slate-950 rounded border border-white/5 text-[10px]">
                    <span className="text-rose-400 font-bold">CRITICAL:</span> CPU, memory and latency high, or CPU and errors high (fired {trig.rule_critical_triple_saturation})
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-white/5 text-[10px]">
                    <span className="text-amber-400 font-bold">HIGH:</span> memory high, or two of CPU / memory / latency high (fired {trig.rule_high_dual_saturation})
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-white/5 text-[10px]">
                    <span className="text-blue-400 font-bold">MEDIUM:</span> CPU, memory and latency all medium (fired {trig.rule_medium_moderate_load})
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
