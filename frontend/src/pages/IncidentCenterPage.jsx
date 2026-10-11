import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Search, Sparkles, FileText, ArrowRight, Layers, Cpu, ShieldAlert, X, Clock, CheckCircle2 } from 'lucide-react';

export default function IncidentCenterPage({ userRole, onNavigate }) {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [rcaResult, setRcaResult] = useState(null);
  const [loadingRca, setLoadingRca] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/v1/incidents');
      const data = await res.json();
      setIncidents(data);
      if (data.length > 0 && !selectedIncident) {
        handleSelectIncident(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectIncident = async (inc) => {
    setSelectedIncident(inc);
    setLoadingRca(true);
    setRcaResult(null);
    try {
      const res = await fetch(`/api/v1/incidents/${inc.id}/analyze`, { method: 'POST' });
      setRcaResult(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRca(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-xs">
        <div>
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Incident Center & Multi-Modal Root Cause Workspace
          </h2>
          <p className="text-slate-400 font-mono">Master-detail operational workspace for RCA, evidence trace & remediation</p>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List Column */}
        <div className="lg:col-span-4 tech-panel p-4 space-y-3">
          <span className="font-mono text-xs font-bold text-slate-300 block">Incident Directory</span>

          <div className="space-y-2">
            {incidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <button
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className={`w-full text-left p-3 rounded-lg border font-mono text-xs transition-all ${
                    isSelected
                      ? 'bg-blue-950/60 border-blue-500 text-white'
                      : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-rose-400">{inc.incident_code}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                      {inc.severity}
                    </span>
                  </div>
                  <p className="font-sans font-medium text-slate-200 text-xs truncate">{inc.title}</p>
                  <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500">
                    <span>Svc: {inc.service_name}</span>
                    <span>{new Date(inc.detected_at).toLocaleTimeString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Detail Workspace */}
        <div className="lg:col-span-8 tech-panel p-6 space-y-6 font-mono text-xs">
          {selectedIncident ? (
            <div className="space-y-6">
              {/* Header Badge */}
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-400 text-sm">{selectedIncident.incident_code}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30 text-[10px]">
                      {selectedIncident.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/10 text-[10px]">
                      Status: {selectedIncident.status}
                    </span>
                  </div>
                  <h3 className="font-sans text-base font-bold text-white mt-1">{selectedIncident.title}</h3>
                  <p className="text-slate-400 text-[11px] font-sans mt-0.5">{selectedIncident.summary}</p>
                </div>
              </div>

              {loadingRca ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Sparkles className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
                  <p className="font-sans">Analyzing multi-modal telemetry evidence & runbook docs...</p>
                </div>
              ) : rcaResult ? (
                <div className="space-y-6">
                  {/* Primary Root Cause Highlight */}
                  <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-500/40 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-rose-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> PROBABLE ROOT CAUSE
                      </span>
                      <span className="text-slate-400">Confidence: {(rcaResult.rca.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-white font-bold font-sans text-xs">{rcaResult.rca.probable_root_cause}</p>
                  </div>

                  {/* Evidence Matrix */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-300 block">Telemetry Evidence Matrix</span>
                    <div className="space-y-2 font-mono">
                      <div className="p-3 bg-slate-950 rounded border border-white/5 space-y-1">
                        {[
                          ['CPU Usage', `${rcaResult.metrics.cpu_usage.toFixed(1)}%`, rcaResult.metrics.cpu_usage / 100],
                          ['Memory', `${rcaResult.metrics.memory_usage.toFixed(0)} MB`, rcaResult.metrics.memory_usage / 1024],
                          ['Request Latency', `${rcaResult.metrics.latency.toFixed(0)}ms`, rcaResult.metrics.latency / 1000],
                          ['HTTP 5xx Error Rate', `${(rcaResult.metrics.error_rate * 100).toFixed(1)}%`, rcaResult.metrics.error_rate * 4],
                          ['Pod Restarts', `${rcaResult.metrics.pod_restarts}`, rcaResult.metrics.pod_restarts / 10],
                        ].map(([label, value, ratio]) => (
                          <div key={label} className="flex justify-between text-slate-400">
                            <span>{label}:</span>
                            <span className={`${ratio > 0.6 ? 'text-rose-400' : ratio > 0.3 ? 'text-amber-400' : 'text-emerald-400'} font-bold`}>
                              {value} {'█'.repeat(Math.max(1, Math.min(10, Math.round(ratio * 10))))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SLM Explanation Card */}
                  <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-500/30 space-y-2">
                    <span className="font-bold text-blue-400 flex items-center gap-1.5 font-sans">
                      <FileText className="w-4 h-4" /> AI Incident Summary ({rcaResult.slm_analysis.source})
                    </span>
                    <p className="font-sans text-slate-200 leading-relaxed text-xs">{rcaResult.slm_analysis.slm_explanation}</p>
                  </div>

                  {/* Retrieved RAG Docs */}
                  {rcaResult.rag_retrieved_documents?.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-bold text-slate-300 block">Retrieved RAG Sources</span>
                      {rcaResult.rag_retrieved_documents.map((doc, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-slate-950 border border-purple-500/20 text-[11px] space-y-1">
                          <span className="font-bold text-purple-300">{doc.title}</span>
                          <p className="text-slate-400 font-sans">{doc.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-white/10">
                    <button
                      onClick={() => onNavigate('remediation')}
                      className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-sans text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                    >
                      Proceed to Action Approval →
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500">Select an incident from the directory to inspect.</div>
          )}
        </div>
      </div>
    </div>
  );
}
