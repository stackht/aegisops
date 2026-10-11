import React, { useState, useEffect } from 'react';
import { 
  Activity, Server, AlertTriangle, ShieldCheck, Cpu, DollarSign, 
  TrendingUp, Clock, ArrowRight, Sparkles, CheckCircle2, AlertOctagon
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ServiceTopologyGraph from '../components/ServiceTopologyGraph';

export default function OverviewPage({ telemetry, userRole, onNavigate }) {
  const [services, setServices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [dailyCost, setDailyCost] = useState(null);

  useEffect(() => {
    fetchData();
  }, [telemetry]);

  const fetchData = async () => {
    try {
      const [svcRes, incRes, costRes] = await Promise.all([
        fetch('/api/v1/services'),
        fetch('/api/v1/incidents'),
        fetch('/api/v1/costs')
      ]);
      setServices(await svcRes.json());
      setIncidents(await incRes.json());
      const costs = await costRes.json();
      setDailyCost(costs.reduce((sum, c) => sum + c.daily_cost, 0));
    } catch (err) {
      console.error(err);
    }
  };

  const activeIncidents = incidents.filter(i => i.status === 'OPEN' || i.status === 'INVESTIGATING');
  const criticalCount = services.filter(s => s.health_status === 'CRITICAL').length;
  const systemHealth = criticalCount > 0 ? 'CRITICAL' : activeIncidents.length > 0 ? 'DEGRADED' : 'HEALTHY';

  // Dynamic telemetry chart points
  const chartData = [
    { time: 'T-20s', cpu: 22, latency: 42, errors: 0.1 },
    { time: 'T-15s', cpu: 25, latency: 45, errors: 0.1 },
    { time: 'T-10s', cpu: 28, latency: 48, errors: 0.2 },
    { time: 'T-5s', cpu: 45, latency: 85, errors: 0.3 },
    { time: 'NOW', cpu: telemetry?.services?.[0]?.cpu_usage || 24.5, latency: telemetry?.services?.[0]?.latency_ms || 45.0, errors: (telemetry?.services?.[0]?.error_rate || 0.01) * 100 },
  ];

  return (
    <div className="space-y-6">
      {/* System Health Status Header */}
      <div className={`p-4 rounded-lg border flex items-center justify-between font-mono ${
        systemHealth === 'CRITICAL'
          ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          : systemHealth === 'DEGRADED'
          ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
          : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${systemHealth === 'CRITICAL' ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
          <div>
            <span className="text-xs text-slate-400">CLUSTER SYSTEM STATUS</span>
            <h2 className="text-lg font-bold tracking-wide">{systemHealth}</h2>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          <span>Active Incidents: </span>
          <span className="text-white font-bold">{activeIncidents.length}</span>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="tech-panel p-4 space-y-1">
          <span className="text-[11px] text-slate-400">Monitored Services</span>
          <p className="text-xl font-bold text-white">{services.length || 5}</p>
          <p className="text-[10px] text-emerald-400">● 5 Active Nodes</p>
        </div>

        <div className="tech-panel p-4 space-y-1">
          <span className="text-[11px] text-slate-400">Isolation Forest Anomaly</span>
          <p className="text-xl font-bold text-amber-400">
            {telemetry?.ai_summary ? `${telemetry.ai_summary.worst.anomaly_score.toFixed(2)} (${telemetry.ai_summary.worst.is_anomaly ? telemetry.ai_summary.worst.anomaly_severity : 'LOW'})` : '...'}
          </p>
          <p className="text-[10px] text-slate-400">Worst service: {telemetry?.ai_summary?.worst_service || '...'}</p>
        </div>

        <div className="tech-panel p-4 space-y-1">
          <span className="text-[11px] text-slate-400">Failure Predictor Risk</span>
          <p className="text-xl font-bold text-purple-400">
            {telemetry?.ai_summary ? `${(telemetry.ai_summary.worst.failure_probability * 100).toFixed(0)}% Risk` : '...'}
          </p>
          <p className="text-[10px] text-slate-400">Random Forest Model (live)</p>
        </div>

        <div className="tech-panel p-4 space-y-1">
          <span className="text-[11px] text-slate-400">Daily Cloud Billing</span>
          <p className="text-xl font-bold text-emerald-400">{dailyCost !== null ? `$${dailyCost.toFixed(2)} / day` : '...'}</p>
          <p className="text-[10px] text-slate-400">AWS / GCP Simulated</p>
        </div>
      </div>

      {/* Realtime Chart & Topology Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Telemetry Stream Chart */}
          <div className="tech-panel p-5 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white font-mono flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Real-time Cluster Telemetry Stream
              </span>
              <span className="font-mono text-[11px] text-emerald-400">● Live Stream</span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="time" stroke="#64748B" fontSize={10} fontFamily="JetBrains Mono" />
                  <YAxis stroke="#64748B" fontSize={10} fontFamily="JetBrains Mono" />
                  <Tooltip contentStyle={{ backgroundColor: '#0D121A', borderColor: '#334155', borderRadius: '6px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                  <Area type="monotone" dataKey="cpu" name="CPU (%)" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="latency" name="Latency (ms)" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Microservices Status Grid */}
          <div className="tech-panel p-5 space-y-3">
            <span className="font-bold text-white font-mono text-xs flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" /> Monitored Microservices Health
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-2.5">Service</th>
                    <th className="p-2.5">CPU %</th>
                    <th className="p-2.5">Latency ms</th>
                    <th className="p-2.5">Error %</th>
                    <th className="p-2.5">Replicas</th>
                    <th className="p-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {services.map((svc) => (
                    <tr key={svc.id} className="hover:bg-white/5">
                      <td className="p-2.5 font-bold text-white">{svc.name}</td>
                      <td className={`p-2.5 ${svc.current_cpu_usage > 80 ? 'text-rose-400 font-bold' : ''}`}>
                        {svc.current_cpu_usage.toFixed(1)}%
                      </td>
                      <td className={`p-2.5 ${svc.current_latency_ms > 200 ? 'text-amber-400 font-bold' : ''}`}>
                        {svc.current_latency_ms.toFixed(0)} ms
                      </td>
                      <td className="p-2.5">{(svc.current_error_rate * 100).toFixed(1)}%</td>
                      <td className="p-2.5">{svc.replicas_ready}/{svc.replicas_desired}</td>
                      <td className="p-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          svc.health_status === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            : svc.health_status === 'DEGRADED'
                            ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {svc.health_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Topology & Incidents */}
        <div className="space-y-6">
          <ServiceTopologyGraph services={services} />

          {/* Active Incident List */}
          <div className="tech-panel p-5 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Active Incidents
              </span>
              <button onClick={() => onNavigate('incidents')} className="text-blue-400 hover:text-blue-300 font-mono text-[11px]">
                Inspect →
              </button>
            </div>

            <div className="space-y-2">
              {activeIncidents.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-mono">
                  No active incidents detected.
                </div>
              ) : (
                activeIncidents.map((inc) => (
                  <div key={inc.id} className="p-3 rounded bg-slate-950 border border-rose-500/30 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-bold text-rose-400">{inc.incident_code}</span>
                      <span className="text-[10px] text-rose-300 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-500/30">{inc.severity}</span>
                    </div>
                    <p className="text-xs font-medium text-white">{inc.title}</p>
                    <button
                      onClick={() => onNavigate('incidents')}
                      className="w-full mt-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-mono font-medium"
                    >
                      Analyze Root Cause →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
