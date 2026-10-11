import React, { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, TrendingUp, Cloud } from 'lucide-react';

export default function CostIntelligencePage() {
  const [costs, setCosts] = useState([]);

  useEffect(() => {
    fetchCosts();
  }, []);

  const fetchCosts = async () => {
    try {
      const res = await fetch('/api/v1/costs');
      setCosts(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const totalDaily = costs.reduce((acc, c) => acc + c.daily_cost, 0);
  const costAnomalies = costs.filter(c => c.is_anomaly);

  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 font-sans">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Cloud Cost Intelligence & Anomaly Detection
          </h2>
          <p className="text-slate-400 font-sans text-xs">Multi-provider spend tracking & cost anomaly rule (AWS, GCP, Azure demo data)</p>
        </div>

        <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
          SIMULATED CLOUD BILLING DATA
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="tech-panel p-4 space-y-1">
          <span className="text-[11px] text-slate-400">Total Daily Cloud Spend</span>
          <p className="text-xl font-bold text-white">${totalDaily.toFixed(2)} / day</p>
          <p className="text-[10px] text-slate-500">AWS, GCP & Azure Datasets</p>
        </div>

        <div className="tech-panel p-4 space-y-1">
          <span className="text-[11px] text-slate-400">Cost Anomalies Detected</span>
          <p className="text-xl font-bold text-amber-400">{costAnomalies.length} Flagged</p>
          <p className="text-[10px] text-amber-400">Rule: more than $200 / day</p>
        </div>

        <div className="tech-panel p-4 space-y-1">
          <span className="text-[11px] text-slate-400">Monthly Projection</span>
          <p className="text-xl font-bold text-blue-400">${(totalDaily * 30).toFixed(0)} / mo</p>
          <p className="text-[10px] text-slate-500">Within Budget Allocation</p>
        </div>
      </div>

      {/* Cost Table */}
      <div className="tech-panel p-5 space-y-3">
        <span className="font-bold text-white text-xs font-sans flex items-center gap-2">
          <Cloud className="w-4 h-4 text-blue-400" /> Cloud Resource Cost Breakdown
        </span>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-white/10">
              <tr>
                <th className="p-2.5">Cloud Provider</th>
                <th className="p-2.5">Service Resource</th>
                <th className="p-2.5">Resource ID</th>
                <th className="p-2.5">Daily Spend</th>
                <th className="p-2.5">Anomaly Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {costs.map((c) => (
                <tr key={c.id} className="hover:bg-white/5">
                  <td className="p-2.5 font-bold text-white">{c.provider}</td>
                  <td className="p-2.5 text-slate-200">{c.service_name}</td>
                  <td className="p-2.5 text-slate-400">{c.resource_id}</td>
                  <td className="p-2.5 font-bold text-emerald-400">${c.daily_cost.toFixed(2)}</td>
                  <td className="p-2.5">
                    {c.is_anomaly ? (
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                        ANOMALY (Score: {c.anomaly_score})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        Normal Baseline
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
