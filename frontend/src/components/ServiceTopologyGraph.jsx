import React from 'react';

export default function ServiceTopologyGraph({ services = [] }) {
  const getStatus = (name) => {
    const svc = services.find(s => s.name === name);
    return svc ? svc.health_status : 'HEALTHY';
  };

  const getColor = (status) => {
    if (status === 'CRITICAL') return '#EF4444';
    if (status === 'DEGRADED') return '#F59E0B';
    return '#22C55E';
  };

  const nodes = [
    { id: 'frontend', name: 'frontend-proxy', x: 260, y: 30, status: 'HEALTHY' },
    { id: 'checkout-service', name: 'checkout-service', x: 260, y: 110, status: getStatus('checkout-service') },
    { id: 'payment-service', name: 'payment-service', x: 140, y: 190, status: getStatus('payment-service') },
    { id: 'inventory-service', name: 'inventory-service', x: 380, y: 190, status: getStatus('inventory-service') },
    { id: 'auth-service', name: 'auth-service', x: 260, y: 270, status: getStatus('auth-service') },
  ];

  const links = [
    { from: 'frontend', to: 'checkout-service' },
    { from: 'checkout-service', to: 'payment-service' },
    { from: 'checkout-service', to: 'inventory-service' },
    { from: 'payment-service', to: 'auth-service' },
    { from: 'inventory-service', to: 'auth-service' },
  ];

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div className="w-full bg-[#0B0F17] rounded-lg border border-white/10 p-4 font-mono">
      <div className="flex justify-between items-center mb-2 text-xs">
        <span className="font-bold text-slate-300">Microservice Dependency & Topology Graph</span>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Healthy</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"/> Degraded</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"/> Critical</span>
        </div>
      </div>

      <svg viewBox="0 0 520 320" className="w-full h-56">
        {/* Link Edges */}
        {links.map((link, idx) => {
          const source = nodeMap[link.from];
          const target = nodeMap[link.to];
          return (
            <line
              key={idx}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="#334155"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const color = getColor(node.status);
          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <rect
                x="-70"
                y="-18"
                width="140"
                height="36"
                rx="6"
                fill="#111823"
                stroke={color}
                strokeWidth="1.5"
              />
              <circle cx="-50" cy="0" r="4" fill={color} />
              <text
                x="-38"
                y="4"
                fill="#F3F5F7"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                {node.name.length > 15 ? node.name.slice(0, 13) + '..' : node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
