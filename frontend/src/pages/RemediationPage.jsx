import React, { useState, useEffect } from 'react';
import { ShieldCheck, Play, CheckCircle2, AlertTriangle, Lock, RefreshCw, Sparkles } from 'lucide-react';

export default function RemediationPage({ userRole }) {
  const [remediations, setRemediations] = useState([]);
  const [executingId, setExecutingId] = useState(null);
  const [executionLog, setExecutionLog] = useState(null);

  useEffect(() => {
    fetchRemediations();
  }, []);

  const fetchRemediations = async () => {
    try {
      const res = await fetch('/api/v1/remediation/actions');
      setRemediations(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecute = async (id) => {
    setExecutingId(id);
    setExecutionLog(null);
    try {
      const res = await fetch(`/api/v1/remediation/${id}/execute?user_role=${encodeURIComponent(userRole || 'DevOps')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setExecutionLog(data);
      fetchRemediations();
    } catch (err) {
      console.error(err);
    } finally {
      setExecutingId(null);
    }
  };

  const handleCreateDemoAction = async () => {
    try {
      // Target the service of the oldest open incident (fall back to payment-service when there is none)
      const incidents = await (await fetch('/api/v1/incidents')).json();
      const open = incidents.filter((i) => i.status === 'OPEN').slice(-1)[0];
      const svcName = open ? open.service_name : 'payment-service';
      await fetch('/api/v1/remediation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: open ? open.id : null,
          service_name: svcName,
          action_type: 'SCALE_DEPLOYMENT',
          target_resource: `deployment/${svcName}`,
          parameters: { replicas: 4 },
          user_role: userRole || 'DevOps',
          risk_level: 'LOW'
        })
      });
      fetchRemediations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 font-sans">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Remediation Approval Workspace & Recovery Verification
          </h2>
          <p className="text-slate-400 font-sans text-xs">Declarative (Prolog-style) policy authorization engine & recovery verification from telemetry</p>
        </div>
        <button
          onClick={handleCreateDemoAction}
          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold font-sans text-xs flex items-center gap-1 shadow"
        >
          <Sparkles className="w-3.5 h-3.5" /> Suggest Scale Action
        </button>
      </div>

      {/* Execution Verification Log Banner */}
      {executionLog && executionLog.error && (
        <div className="p-4 rounded bg-rose-950/60 border border-rose-500/40 space-y-1">
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Action Blocked by Policy</span>
          </div>
          <p className="text-slate-200 font-sans">{executionLog.error}</p>
        </div>
      )}
      {executionLog && !executionLog.error && (
        <div className={`p-4 rounded space-y-1 ${executionLog.status === 'SUCCESS' ? 'bg-emerald-950/60 border border-emerald-500/40' : 'bg-amber-950/60 border border-amber-500/40'}`}>
          <div className={`flex items-center gap-2 font-bold ${executionLog.status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'}`}>
            <CheckCircle2 className="w-4 h-4" />
            <span>{executionLog.status === 'SUCCESS' ? 'Remediation Executed & Recovery Verified' : `Remediation ${executionLog.status}`}</span>
          </div>
          <p className="text-slate-200 font-sans">{executionLog.verification_result}</p>
          <p className="text-[11px] text-slate-400">{executionLog.execution_details?.message}</p>
        </div>
      )}

      {/* Remediation Workspace Table */}
      <div className="tech-panel p-5 space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-white/10">
              <tr>
                <th className="p-2.5">Target Microservice</th>
                <th className="p-2.5">Action Type</th>
                <th className="p-2.5">Risk Level</th>
                <th className="p-2.5">Policy Decision</th>
                <th className="p-2.5">Execution Status</th>
                <th className="p-2.5 text-right">Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {remediations.map((rem) => {
                const isExecuting = executingId === rem.id;
                const isAllowed = rem.policy_decision === 'ALLOW';

                return (
                  <tr key={rem.id} className="hover:bg-white/5">
                    <td className="p-2.5 font-bold text-white">{rem.service_name}</td>
                    <td className="p-2.5 text-blue-400 font-semibold">{rem.action_type}</td>
                    <td className="p-2.5">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                        rem.risk_level === 'HIGH' ? 'bg-rose-950 text-rose-400 border border-rose-500/30' : 'bg-blue-950 text-blue-400 border border-blue-500/30'
                      }`}>
                        {rem.risk_level}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isAllowed
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                          : rem.policy_decision === 'REQUIRE_APPROVAL'
                          ? 'bg-amber-950 text-amber-400 border-amber-500/30'
                          : 'bg-rose-950 text-rose-400 border-rose-500/30'
                      }`}>
                        {rem.policy_decision}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        rem.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-900 text-slate-400'
                      }`}>
                        {rem.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      {rem.status === 'SUCCESS' ? (
                        <span className="text-emerald-400 text-xs flex items-center gap-1 justify-end font-sans font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleExecute(rem.id)}
                          disabled={isExecuting || rem.status === 'DENIED'}
                          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-sans text-xs flex items-center gap-1 ml-auto shadow disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5" />
                          {isExecuting ? 'Executing...' : rem.status === 'DENIED' ? 'Denied' : rem.policy_decision === 'REQUIRE_APPROVAL' ? 'Approve & Execute' : 'Execute'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
