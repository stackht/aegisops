import React, { useState, useEffect } from 'react';
import { Server, HardDrive, Cpu, RefreshCw, Box, Layers } from 'lucide-react';

export default function InfrastructurePage() {
  const [nodes, setNodes] = useState([]);
  const [pods, setPods] = useState([]);
  const [deployments, setDeployments] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [nodesRes, podsRes, depsRes] = await Promise.all([
        fetch('/api/v1/nodes'),
        fetch('/api/v1/pods'),
        fetch('/api/v1/deployments')
      ]);
      setNodes(await nodesRes.json());
      setPods(await podsRes.json());
      setDeployments(await depsRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-400" />
            Kubernetes & Infrastructure Topology
          </h2>
          <p className="text-xs text-slate-400">Node health, container pod status, and deployment specifications</p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-white/10"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Topology
        </button>
      </div>

      {/* Nodes Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {nodes.map((node) => (
          <div key={node.id} className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{node.name}</h3>
                  <span className="text-xs text-emerald-400 font-mono">● {node.status}</span>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-white/5">
                {node.cpu_capacity_cores} Cores • 32 GB RAM
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <p className="text-[11px] text-slate-400">Node CPU Load</p>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{node.cpu_usage_pct.toFixed(1)}%</p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${node.cpu_usage_pct}%` }} />
                </div>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                <p className="text-[11px] text-slate-400">Node Memory Load</p>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{node.memory_usage_pct.toFixed(1)}%</p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${node.memory_usage_pct}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pods Table */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Box className="w-5 h-5 text-blue-400" />
          Active Kubernetes Pod Instances ({pods.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-white/10">
              <tr>
                <th className="p-3">Pod Identifier</th>
                <th className="p-3">Namespace</th>
                <th className="p-3">Node</th>
                <th className="p-3">Restarts</th>
                <th className="p-3">Memory Footprint</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pods.map((pod) => (
                <tr key={pod.id} className="hover:bg-white/5 transition-all">
                  <td className="p-3 font-mono font-medium text-white">{pod.name}</td>
                  <td className="p-3 text-slate-400">{pod.namespace}</td>
                  <td className="p-3 text-slate-400 font-mono">{pod.node_name}</td>
                  <td className={`p-3 font-mono ${pod.restart_count > 0 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                    {pod.restart_count}
                  </td>
                  <td className="p-3 font-mono">{pod.memory_usage_mb.toFixed(1)} MB</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-medium border border-emerald-500/30">
                      {pod.status}
                    </span>
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
