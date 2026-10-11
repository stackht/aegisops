// AegisOps static demo: an in-browser replacement for the FastAPI backend.
// Everything (simulation, models, RCA, policy, remediation, copilot) runs in the page; nothing is sent anywhere.
import { detectAnomaly, predictFailure, classifyHealth, overloadRisk } from './ml.js'

const iso = (d = new Date()) => d.toISOString()
const clone = (o) => JSON.parse(JSON.stringify(o))

// ------------------------------------------------------------------ seeded random numbers (repeatable demo)
let seed = 20260101
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const uniform = (a, b) => a + (b - a) * rand()

// ------------------------------------------------------------------ simulation state (telemetry bus)
function freshSim() {
  return {
    mode: 'SIMULATION',
    is_running: false,
    is_paused: false,
    clock_seconds: 0,
    current_scenario: null,
    target_service: 'checkout-service',
    intensity: 0.7,
    duration_seconds: 60,
    restarts: {},
    timeline: [{ timestamp: iso(), time_offset: '00:00', message: 'Simulation system initialized to Healthy Baseline.', type: 'INFO' }],
    services: {
      'checkout-service': { cpu: 24.5, memory: 180, latency: 45, error_rate: 0.01, health: 'HEALTHY', replicas: 3, desired: 3 },
      'payment-service': { cpu: 32, memory: 210, latency: 65, error_rate: 0.005, health: 'HEALTHY', replicas: 2, desired: 2 },
      'auth-service': { cpu: 15, memory: 120, latency: 25, error_rate: 0, health: 'HEALTHY', replicas: 2, desired: 2 },
      'inventory-service': { cpu: 18, memory: 150, latency: 35, error_rate: 0.002, health: 'HEALTHY', replicas: 2, desired: 2 },
      'notification-service': { cpu: 10, memory: 90, latency: 15, error_rate: 0, health: 'HEALTHY', replicas: 1, desired: 1 },
    },
    nodes: [
      { name: 'minikube-node-1', status: 'Ready', cpu: 28.4, memory: 42.1 },
      { name: 'minikube-node-2', status: 'Ready', cpu: 31.2, memory: 38.5 },
    ],
    pods: [
      { name: 'checkout-service-7f89d-abc1', service: 'checkout-service', node: 'minikube-node-1', status: 'Running', restarts: 0, memory_mb: 185 },
      { name: 'checkout-service-7f89d-abc2', service: 'checkout-service', node: 'minikube-node-2', status: 'Running', restarts: 0, memory_mb: 175 },
      { name: 'payment-service-5c64b-xyz1', service: 'payment-service', node: 'minikube-node-1', status: 'Running', restarts: 0, memory_mb: 215 },
      { name: 'payment-service-5c64b-xyz2', service: 'payment-service', node: 'minikube-node-2', status: 'Running', restarts: 0, memory_mb: 205 },
      { name: 'auth-service-4d89a-qwe1', service: 'auth-service', node: 'minikube-node-1', status: 'Running', restarts: 0, memory_mb: 120 },
    ],
  }
}

function freshDb() {
  const now = Date.now()
  const svc = (id, name, cpu, mem, lat, err, d, r) => ({
    id, name, namespace: 'default', health_status: 'HEALTHY', current_cpu_usage: cpu, current_memory_usage: mem,
    current_latency_ms: lat, current_error_rate: err, replicas_desired: d, replicas_ready: r, updated_at: iso(),
  })
  return {
    services: [
      svc(1, 'checkout-service', 24.5, 180, 45, 0.01, 3, 3), svc(2, 'payment-service', 32, 210, 65, 0.005, 2, 2),
      svc(3, 'auth-service', 15, 120, 25, 0, 2, 2), svc(4, 'inventory-service', 18, 150, 35, 0.002, 2, 2),
      svc(5, 'notification-service', 10, 90, 15, 0, 1, 1),
    ],
    nodes: [
      { id: 1, name: 'minikube-node-1', status: 'Ready', cpu_capacity_cores: 8, memory_capacity_bytes: 34359738368, cpu_usage_pct: 28.4, memory_usage_pct: 42.1 },
      { id: 2, name: 'minikube-node-2', status: 'Ready', cpu_capacity_cores: 8, memory_capacity_bytes: 34359738368, cpu_usage_pct: 31.2, memory_usage_pct: 38.5 },
    ],
    pods: [
      ['checkout-service-7f89d-abc1', 1, 'minikube-node-1', 22, 185], ['checkout-service-7f89d-abc2', 1, 'minikube-node-2', 25, 175],
      ['payment-service-5c64b-xyz1', 2, 'minikube-node-1', 30, 215], ['payment-service-5c64b-xyz2', 2, 'minikube-node-2', 34, 205],
      ['auth-service-4d89a-qwe1', 3, 'minikube-node-1', 15, 120],
    ].map(([name, sid, node, cpu, mem], i) => ({ id: i + 1, name, namespace: 'default', service_id: sid, node_name: node, status: 'Running', restart_count: 0, cpu_usage_pct: cpu, memory_usage_mb: mem })),
    deployments: [
      { id: 1, service_name: 'payment-service', version: 'v1.4.2', deployed_by: 'github-actions', deployed_at: iso(new Date(now - 15 * 60000)), status: 'SUCCESS' },
      { id: 2, service_name: 'checkout-service', version: 'v2.1.0', deployed_by: 'devops-john', deployed_at: iso(new Date(now - 2 * 3600000)), status: 'SUCCESS' },
    ],
    docs: [
      { title: 'Runbook: CPU Overload Mitigation in Payment Service', content: 'When CPU usage in payment-service exceeds 85% for more than 2 minutes, check for downstream latency or memory starvation. Recommended action: horizontal auto-scaling from N to N+2 replicas or restarting unhealthy pod instances.', tags: ['payment-service', 'cpu', 'scaling', 'hpa'] },
      { title: 'Runbook: OOMKilled & Memory Leak Troubleshooting', content: 'If a pod is terminated with OOMKilled status (exit code 137), analyze memory usage slope. Increase pod memory request/limit in deployment specification, or issue pod restart to temporarily release leaked heap buffer.', tags: ['memory', 'oomkilled', 'k8s', 'restart'] },
      { title: 'Kubernetes Troubleshooting: Cascading Service Latency', content: 'High error rates in checkout-service are frequently caused by upstream timeout degradation in payment-service or database lock contention. Always inspect payment-service CPU and connection pool metrics when checkout latency spikes.', tags: ['checkout-service', 'latency', 'cascading', 'rca'] },
      { title: 'Runbook: Deployment Rollback Procedures', content: 'If a newly deployed image tag introduces elevated HTTP 5xx errors or pod crashloops, trigger deployment rollback via `kubectl rollout undo deployment/<service-name>`. Policy allows auto-rollback for high severity incidents.', tags: ['deployment', 'rollback', 'ci-cd'] },
    ],
    costs: [
      { id: 1, provider: 'AWS', service_name: 'EKS Compute Cluster', resource_id: 'eks-prod-cluster-01', daily_cost: 145.5, currency: 'USD', is_anomaly: false, anomaly_score: 0, recorded_date: iso() },
      { id: 2, provider: 'AWS', service_name: 'RDS PostgreSQL', resource_id: 'rds-db-primary', daily_cost: 88.2, currency: 'USD', is_anomaly: false, anomaly_score: 0, recorded_date: iso() },
      { id: 3, provider: 'GCP', service_name: 'Cloud Storage Bucket', resource_id: 'gcp-logs-archive', daily_cost: 12.4, currency: 'USD', is_anomaly: false, anomaly_score: 0, recorded_date: iso() },
      { id: 4, provider: 'AWS', service_name: 'EC2 Payment Worker Group', resource_id: 'i-098a12bc4d5e', daily_cost: 240, currency: 'USD', is_anomaly: true, anomaly_score: 0.89, recorded_date: iso() },
    ],
    anomalies: [],
    predictions: [],
    incidents: [],
    rca: {},
    remediations: [],
    audit: [],
    ids: { anomaly: 1, prediction: 1, incident: 1000, remediation: 1, audit: 1 },
  }
}

let sim = freshSim()
let db = freshDb()
const listeners = new Set()

function addTimeline(message, type = 'INFO') {
  const mm = Math.floor(sim.clock_seconds / 60)
  const ss = sim.clock_seconds % 60
  sim.timeline.unshift({ timestamp: iso(), time_offset: `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, message, type })
  if (sim.timeline.length > 50) sim.timeline.pop()
}

// ------------------------------------------------------------------ failure scenarios (one step = one tick)
function applyScenarioStep() {
  if (!sim.is_running || sim.is_paused || !sim.current_scenario) {
    for (const s of Object.values(sim.services)) {
      s.cpu = Math.max(5, Math.min(100, s.cpu + uniform(-0.8, 0.8)))
      s.latency = Math.max(10, Math.min(2000, s.latency + uniform(-1.5, 1.5)))
    }
    return
  }
  sim.clock_seconds += 1
  const t = sim.clock_seconds
  const name = sim.target_service
  const svc = sim.services[name] || sim.services['checkout-service']
  const progress = Math.min(1, t / Math.max(1, sim.duration_seconds))
  const sc = sim.current_scenario.toLowerCase()

  if (sc === 'cpu_spike' || sc === 'cpu_saturation') {
    svc.cpu = Math.min(98.5, 35 + progress * 62 * sim.intensity)
    svc.latency = Math.min(950, 45 + progress * 520 * sim.intensity)
    svc.error_rate = Math.min(0.12, 0.005 + progress * 0.08 * sim.intensity)
    if (t === 5) addTimeline(`Workload CPU load rising on ${name} (CPU: ${svc.cpu.toFixed(1)}%).`, 'WARNING')
    else if (t === 15) { addTimeline(`Threshold breached: ${name} CPU at ${svc.cpu.toFixed(1)}%. Isolation Forest anomaly detected.`, 'CRITICAL'); svc.health = 'DEGRADED' }
    else if (t === 25) { addTimeline(`Critical CPU saturation on ${name} (CPU: ${svc.cpu.toFixed(1)}%, Latency: ${svc.latency.toFixed(0)}ms). Incident created.`, 'CRITICAL'); svc.health = 'CRITICAL' }
  } else if (sc === 'memory_leak') {
    svc.memory = Math.min(980, 180 + progress * 760 * sim.intensity)
    if (svc.memory > 800) { svc.health = 'CRITICAL'; svc.error_rate = 0.15 } else if (svc.memory > 500) svc.health = 'DEGRADED'
    if (t === 10) addTimeline(`Heap allocation footprint climbing rapidly on ${name} (${svc.memory.toFixed(0)}MB).`, 'WARNING')
    else if (t === 20) addTimeline(`Memory starvation threshold exceeded (${svc.memory.toFixed(0)}MB). Pod OOMKilled risk HIGH.`, 'CRITICAL')
    else if (t === 28) addTimeline('Pod instance terminated with exit code 137 (OOMKilled). Incident created.', 'CRITICAL')
  } else if (sc === 'pod_crash' || sc === 'crash_loop') {
    svc.health = 'CRITICAL'; svc.error_rate = 0.25; svc.cpu = 12
    for (const p of sim.pods) if (p.service === name) { p.status = 'CrashLoopBackOff'; p.restarts = Math.min(15, p.restarts + (t % 6 === 0 ? 1 : 0)) }
    if (t % 10 === 0) addTimeline(`K8s Event: BackOff restart container in pod ${name}-pod (Restarts: ${sim.pods[0].restarts}).`, 'CRITICAL')
  } else if (sc === 'traffic_spike') {
    svc.cpu = Math.min(92, 25 + progress * 65)
    svc.latency = Math.min(680, 40 + progress * 550)
    svc.error_rate = Math.min(0.06, 0.001 + progress * 0.05)
    if (t === 8) addTimeline(`Ingress traffic surging to 3,200 req/s on ${name}.`, 'WARNING')
    else if (t === 18) addTimeline(`Predictive autoscaler flags replica exhaustion risk for ${name}.`, 'WARNING')
  } else if (sc === 'network_latency') {
    svc.latency = Math.min(1200, 45 + progress * 1100)
    svc.error_rate = Math.min(0.18, 0.002 + progress * 0.16)
    if (t === 12) addTimeline(`Network socket connection delay spike on ${name} (Latency: ${svc.latency.toFixed(0)}ms).`, 'WARNING')
  } else if (sc === 'cascading_failure') {
    const pay = sim.services['payment-service']
    const chk = sim.services['checkout-service']
    pay.cpu = Math.min(96, 30 + t * 3)
    pay.health = t > 10 ? 'CRITICAL' : 'DEGRADED'
    if (t > 8) {
      chk.latency = Math.min(850, 45 + (t - 8) * 40)
      chk.error_rate = Math.min(0.15, 0.01 + (t - 8) * 0.01)
      chk.health = t < 15 ? 'DEGRADED' : 'CRITICAL'
    }
    if (t === 5) addTimeline('Cascading root event: payment-service CPU and thread starvation initiated.', 'CRITICAL')
    else if (t === 12) addTimeline('Dependency propagation: checkout-service latency spiking due to payment-service timeout.', 'CRITICAL')
    else if (t === 20) addTimeline('Cascade complete: downstream checkout-service HTTP 504 gateway timeouts registered.', 'CRITICAL')
  }
}

// ------------------------------------------------------------------ policy engine (Prolog-style rule table)
const POLICIES = {
  Admin: { SCALE_DEPLOYMENT: { LOW: 'ALLOW', HIGH: 'ALLOW' }, RESTART_POD: { LOW: 'ALLOW', HIGH: 'ALLOW' }, ROLLBACK_DEPLOYMENT: { LOW: 'ALLOW', HIGH: 'REQUIRE_APPROVAL' }, DELETE_RESOURCE: { LOW: 'REQUIRE_APPROVAL', HIGH: 'DENY' } },
  DevOps: { SCALE_DEPLOYMENT: { LOW: 'ALLOW', HIGH: 'REQUIRE_APPROVAL' }, RESTART_POD: { LOW: 'ALLOW', HIGH: 'REQUIRE_APPROVAL' }, ROLLBACK_DEPLOYMENT: { LOW: 'REQUIRE_APPROVAL', HIGH: 'REQUIRE_APPROVAL' }, DELETE_RESOURCE: { LOW: 'DENY', HIGH: 'DENY' } },
  Developer: { SCALE_DEPLOYMENT: { LOW: 'REQUIRE_APPROVAL', HIGH: 'DENY' }, RESTART_POD: { LOW: 'REQUIRE_APPROVAL', HIGH: 'DENY' }, ROLLBACK_DEPLOYMENT: { LOW: 'DENY', HIGH: 'DENY' }, DELETE_RESOURCE: { LOW: 'DENY', HIGH: 'DENY' } },
  Viewer: { SCALE_DEPLOYMENT: { LOW: 'DENY', HIGH: 'DENY' }, RESTART_POD: { LOW: 'DENY', HIGH: 'DENY' }, ROLLBACK_DEPLOYMENT: { LOW: 'DENY', HIGH: 'DENY' }, DELETE_RESOURCE: { LOW: 'DENY', HIGH: 'DENY' } },
}
export function evaluateAction(role, actionType, riskLevel, target) {
  const r = role || 'DevOps'
  const action = actionType.toUpperCase()
  const risk = riskLevel.toUpperCase()
  const actionPolicy = (POLICIES[r] || POLICIES.Viewer)[action] || { LOW: 'DENY', HIGH: 'DENY' }
  let decision = actionPolicy[risk] || 'REQUIRE_APPROVAL'
  let reason
  if (['kube-system', 'database-primary'].includes(target.toLowerCase()) && action === 'DELETE_RESOURCE') {
    decision = 'DENY'
    reason = 'Production core infrastructure deletion strictly prohibited by policy rule.'
  } else if (decision === 'ALLOW') reason = `Action '${action}' with risk level '${risk}' allowed for role '${r}'.`
  else if (decision === 'REQUIRE_APPROVAL') reason = `Action '${action}' requires explicit senior DevOps/Admin human approval.`
  else reason = `Role '${r}' is unauthorized to perform action '${action}' under risk policy.`
  return { decision, policy_rule_matched: `rule(${r}, ${action}, ${risk}) -> ${decision}`, reason }
}

// ------------------------------------------------------------------ root cause analysis
const DEPENDENCIES = {
  'checkout-service': ['payment-service', 'inventory-service', 'auth-service'],
  'payment-service': ['auth-service'],
  'inventory-service': ['auth-service'],
  'notification-service': ['auth-service'],
  'auth-service': [],
}
function analyzeIncident(service, m, deployments) {
  const evidences = []
  const candidates = []
  const contributing = []
  const cpu = m.cpu_usage, mem = m.memory_usage, err = m.error_rate, restarts = m.pod_restarts
  if (cpu > 85) {
    evidences.push({ evidence_type: 'METRIC_SPIKE', source: 'Prometheus', description: `${service} CPU usage saturated at ${cpu.toFixed(1)}% (threshold 80%).`, payload: { cpu_usage: cpu } })
    candidates.push({ cause: `${service} CPU saturation causing thread starvation and high latency.`, confidence: 0.88, score_bonus: 0.35 })
  }
  const memoryLeak = mem > 512
  const crashLoop = restarts > 2 && !memoryLeak && cpu <= 85
  if (memoryLeak || restarts > 2) {
    evidences.push({ evidence_type: 'POD_RESTART', source: 'kube-state-metrics', description: `Pod restarts detected (${restarts} restarts) with memory footprint at ${mem.toFixed(1)}MB.`, payload: { memory_mb: mem, restarts } })
  }
  if (memoryLeak) candidates.push({ cause: `Memory leak or OOMKilled termination in ${service} leading to pod instability.`, confidence: 0.85, score_bonus: 0.3 })
  else if (crashLoop) candidates.push({ cause: `Pod instability: repeated container crashes (CrashLoopBackOff) in ${service}.`, confidence: 0.86, score_bonus: 0.3 })
  if (err > 0.05) evidences.push({ evidence_type: 'HIGH_ERROR_RATE', source: 'cAdvisor/Ingress', description: `Elevated HTTP 5xx error rate measured at ${(err * 100).toFixed(1)}%.`, payload: { error_rate: err } })
  const metricBased = candidates.length > 0
  for (const dep of deployments) {
    if (dep.service_name === service || (DEPENDENCIES[service] || []).includes(dep.service_name)) {
      evidences.push({ evidence_type: 'DEPLOYMENT_EVENT', source: 'CI/CD Pipeline', description: `Recent deployment of ${dep.service_name} version ${dep.version} occurred recently.`, payload: dep })
      const text = `Recent code deployment (${dep.version}) of ${dep.service_name} may have introduced a performance regression or unhandled exception.`
      if (metricBased) { contributing.push(text); candidates.push({ cause: text, confidence: 0.75, score_bonus: 0.2 }) }
      else candidates.push({ cause: text, confidence: 0.9, score_bonus: 0.4 })
    }
  }
  for (const d of DEPENDENCIES[service] || []) candidates.push({ cause: `Upstream dependency bottleneck or failure propagation from ${d}.`, confidence: 0.7, score_bonus: 0.2 })
  let cause, confidence
  if (!candidates.length) { cause = `Transient network jitter or unclassified load anomaly on ${service}.`; confidence = 0.6 } else {
    const best = [...candidates].sort((a, b) => b.confidence - a.confidence)[0]
    cause = best.cause; confidence = best.confidence
  }
  return {
    probable_root_cause: cause,
    confidence_score: Math.round(confidence * 100) / 100,
    evidence_summary: evidences.length ? evidences.map((e) => e.description).join('; ') : 'No critical anomaly thresholds breached.',
    evidences, candidate_causes: candidates, contributing_factors: contributing,
  }
}

// ------------------------------------------------------------------ retrieval + explanation (demo template)
function retrieve(query, topK = 2) {
  const q = new Set(query.toLowerCase().split(/\s+/))
  const scored = db.docs.map((d) => {
    const words = new Set((d.title + ' ' + d.content + ' ' + d.tags.join(' ')).toLowerCase().split(/\s+/))
    let score = 0
    for (const w of q) if (words.has(w)) score++
    return [score, d]
  })
  scored.sort((a, b) => b[0] - a[0])
  return scored.slice(0, topK).map(([, d]) => ({ title: d.title, content: d.content }))
}
function extractAction(service, rootCause) {
  const rc = rootCause.toLowerCase()
  if (rc.includes('crashloop') || rc.includes('crashes')) return { action_type: 'RESTART_POD', target_resource: `pod/${service}-unhealthy-instance`, parameters: { grace_period: 30 }, risk_level: 'LOW', reason: 'Restart the crash-looping pod so that Kubernetes recreates it from a clean state.' }
  if (rc.includes('cpu') || rc.includes('saturation')) return { action_type: 'SCALE_DEPLOYMENT', target_resource: `deployment/${service}`, parameters: { replicas: 4 }, risk_level: 'LOW', reason: 'Scale deployment replicas from 2 to 4 to relieve CPU saturation.' }
  if (rc.includes('memory') || rc.includes('oom')) return { action_type: 'RESTART_POD', target_resource: `pod/${service}-unhealthy-instance`, parameters: { grace_period: 30 }, risk_level: 'LOW', reason: 'Restart pod instance to release memory leak heap space.' }
  if (rc.includes('deployment') || rc.includes('code')) return { action_type: 'ROLLBACK_DEPLOYMENT', target_resource: `deployment/${service}`, parameters: { revision: 'previous' }, risk_level: 'HIGH', reason: 'Rollback deployment to previous stable revision.' }
  return { action_type: 'SCALE_DEPLOYMENT', target_resource: `deployment/${service}`, parameters: { replicas: 3 }, risk_level: 'LOW', reason: 'Scale deployment to handle load pressure.' }
}
function explain(code, service, cause, evidence, docs) {
  const ref = docs.length ? ` Referenced Runbook: '${docs[0].title}'.` : ''
  return {
    slm_explanation: `Incident ${code} targeting microservice '${service}' was triggered by anomalous telemetry. The primary root cause is determined to be: ${cause}. Collected Evidence: ${evidence}.${ref}`,
    suggested_remediation: extractAction(service, cause),
    source: 'Demo SLM (deterministic template)',
  }
}

// ------------------------------------------------------------------ incidents and remediation
function openIncident(scenario, svcName) {
  scenario = scenario.toLowerCase()
  let svc = db.services.find((s) => s.name === svcName) || db.services[0]
  svcName = svc.name
  let title, severity, summary
  if (scenario === 'cpu_spike' || scenario === 'cpu_saturation') {
    svc.current_cpu_usage = 94.5; svc.current_latency_ms = 420; svc.current_error_rate = 0.08
    title = `CPU Saturation & Latency Spike on ${svcName}`; severity = 'HIGH'; summary = `Synthetic CPU overload simulation triggered on ${svcName}.`
  } else if (scenario === 'memory_leak') {
    svc.current_memory_usage = 920; svc.current_error_rate = 0.12; sim.restarts[svcName] = 3
    title = `Pod OOMKilled Memory Leak on ${svcName}`; severity = 'CRITICAL'; summary = 'Memory footprint reached 920MB triggering memory leak alarm.'
  } else if (scenario === 'pod_crash' || scenario === 'crash_loop') {
    svc.current_error_rate = 0.25; sim.restarts[svcName] = 6
    title = `Pod CrashLoopBackOff on ${svcName}`; severity = 'CRITICAL'; summary = 'Pod instance crashed repeatedly with exit code 137.'
  } else return null
  svc.health_status = 'CRITICAL'
  svc.updated_at = iso()
  const inc = { id: db.ids.incident, incident_code: `INC-${db.ids.incident}`, title, service_name: svcName, severity, status: 'OPEN', detected_at: iso(), resolved_at: null, summary, evidences: [], rca_result: null }
  db.ids.incident++
  db.incidents.push(inc)
  return inc
}

function startScenario(name, target, duration, intensity) {
  Object.assign(sim, { current_scenario: name, target_service: target, duration_seconds: duration, intensity, clock_seconds: 0, is_running: true, is_paused: false })
  addTimeline(`Simulation scenario '${name}' started targeting '${target}' (Duration: ${duration}s).`, 'INFO')
}

const APPROVER_ROLES = ['Admin', 'DevOps']
function verify(svc, action) {
  const ok = svc.current_cpu_usage < 60 && svc.current_latency_ms < 200 && svc.current_error_rate < 0.02 && svc.current_memory_usage < 450
  const reading = `CPU ${svc.current_cpu_usage.toFixed(1)}%, memory ${svc.current_memory_usage.toFixed(0)} MB, latency ${svc.current_latency_ms.toFixed(0)} ms, error rate ${(svc.current_error_rate * 100).toFixed(1)}%`
  return ok ? [true, `RECOVERY VERIFIED after ${action}: ${reading} are within healthy limits.`] : [false, `RECOVERY NOT VERIFIED after ${action}: ${reading} still exceed healthy limits.`]
}
function syncSimulation(name, svc) {
  const s = sim.services[name]
  if (s) Object.assign(s, { cpu: svc.current_cpu_usage, memory: svc.current_memory_usage, latency: svc.current_latency_ms, error_rate: svc.current_error_rate, health: svc.health_status, replicas: svc.replicas_ready, desired: svc.replicas_desired })
  if (sim.target_service === name && sim.is_running) { sim.is_running = false; addTimeline(`Remediation recovered ${name}; failure scenario stopped.`, 'INFO') }
  delete sim.restarts[name]
  for (const p of sim.pods) if (p.service === name) { p.status = 'Running'; p.restarts = 0 }
}
function createRemediation(b) {
  const role = b.user_role || 'DevOps'
  const risk = b.risk_level || 'LOW'
  const pol = evaluateAction(role, b.action_type, risk, b.service_name)
  const status = { ALLOW: 'APPROVED', REQUIRE_APPROVAL: 'PENDING_APPROVAL', DENY: 'DENIED' }[pol.decision] || 'PENDING_APPROVAL'
  const rem = { id: db.ids.remediation++, incident_id: b.incident_id ?? null, service_name: b.service_name, action_type: b.action_type, target_resource: b.target_resource, parameters: b.parameters || {}, risk_level: risk, status, policy_decision: pol.decision, approved_by: null, executed_at: null, verification_result: null, created_at: iso() }
  db.remediations.push(rem)
  return rem
}
function executeRemediation(id, user, role) {
  const rem = db.remediations.find((r) => r.id === id)
  if (!rem) return { error: 'Remediation action not found' }
  if (rem.status === 'SUCCESS') return { error: 'Action was already executed successfully.' }
  if (rem.status === 'REJECTED' || rem.status === 'DENIED' || rem.policy_decision === 'DENY') return { error: 'Action is denied by the authorization policy and cannot be executed.' }
  if (rem.policy_decision === 'REQUIRE_APPROVAL' && !APPROVER_ROLES.includes(role)) return { error: `Action requires approval by an Admin or DevOps user; role '${role}' cannot approve it.` }
  rem.approved_by = user
  rem.executed_at = iso()
  const params = rem.parameters || {}
  const svc = db.services.find((s) => s.name === rem.service_name)
  let exec = { success: false, message: 'Unknown action' }
  if (rem.action_type === 'SCALE_DEPLOYMENT') {
    const n = params.replicas ?? 4
    exec = { success: true, message: `[Simulated K8s] Scaled deployment '${rem.service_name}' in namespace 'default' to ${n} replicas.` }
    if (svc) { svc.replicas_desired = n; svc.replicas_ready = n; svc.current_cpu_usage = Math.max(15, svc.current_cpu_usage * 0.4); svc.current_latency_ms = Math.max(20, svc.current_latency_ms * 0.3); svc.current_error_rate = Math.min(svc.current_error_rate, 0.001) }
  } else if (rem.action_type === 'RESTART_POD') {
    exec = { success: true, message: `[Simulated K8s] Pod '${rem.service_name}' in namespace 'default' deleted to initiate auto-restart.` }
    if (svc) { svc.current_memory_usage = 180; svc.current_cpu_usage = Math.min(svc.current_cpu_usage, 25); svc.current_latency_ms = Math.min(svc.current_latency_ms, 45); svc.current_error_rate = Math.min(svc.current_error_rate, 0.001) }
  } else if (rem.action_type === 'ROLLBACK_DEPLOYMENT') {
    exec = { success: true, message: `[Simulated K8s] Rolled back deployment '${rem.service_name}' in namespace 'default' to the ${params.revision || 'previous'} revision.` }
    if (svc) {
      svc.current_cpu_usage = Math.max(15, svc.current_cpu_usage * 0.45); svc.current_latency_ms = Math.max(20, svc.current_latency_ms * 0.35)
      svc.current_memory_usage = Math.min(svc.current_memory_usage, 220); svc.current_error_rate = Math.min(svc.current_error_rate, 0.001)
      const latest = db.deployments.filter((d) => d.service_name === rem.service_name).sort((a, b) => b.deployed_at.localeCompare(a.deployed_at))[0]
      if (latest) latest.status = 'ROLLED_BACK'
    }
  }
  if (exec.success && svc) {
    const [ok, message] = verify(svc, rem.action_type)
    svc.health_status = ok ? 'HEALTHY' : 'DEGRADED'
    svc.updated_at = iso()
    rem.status = ok ? 'SUCCESS' : 'UNVERIFIED'
    rem.verification_result = message
    syncSimulation(rem.service_name, svc)
    if (ok && rem.incident_id) {
      const inc = db.incidents.find((i) => i.id === rem.incident_id)
      if (inc) { inc.status = 'RESOLVED'; inc.resolved_at = iso(); inc.summary = `Resolved automatically via remediation action ${rem.action_type}.` }
    }
  } else { rem.status = 'FAILED'; rem.verification_result = `Execution failed: ${exec.message}` }
  db.audit.push({ id: db.ids.audit++, username: user, action: `EXECUTE_${rem.action_type}`, resource: rem.target_resource, details: { remediation_id: rem.id, role, result: exec }, timestamp: iso() })
  return { status: rem.status, verification_result: rem.verification_result, execution_details: exec }
}

// ------------------------------------------------------------------ AI analysis and copilot
function modelsFor(f) {
  return { anomaly: detectAnomaly(f), failure: predictFailure(f), health: classifyHealth(f), fuzzy: overloadRisk(f) }
}
function analyseServices() {
  const per = {}
  for (const s of db.services) {
    const f = { cpu_usage: s.current_cpu_usage, memory_usage: s.current_memory_usage, latency: s.current_latency_ms, error_rate: s.current_error_rate, pod_restarts: sim.restarts[s.name] || 0 }
    const m = modelsFor(f)
    per[s.name] = {
      anomaly_score: m.anomaly.anomaly_score, is_anomaly: m.anomaly.is_anomaly, anomaly_severity: m.anomaly.severity,
      failure_probability: m.failure.failure_probability, failure_risk: m.failure.risk, top_feature: m.failure.top_contributing_features[0].feature,
      health_class: m.health, overload_risk_score: m.fuzzy.overload_risk_score, overload_category: m.fuzzy.risk_category,
      memberships: m.fuzzy.memberships, fuzzy_rule_triggers: m.fuzzy.fuzzy_rule_triggers,
    }
  }
  const worst = Object.keys(per).sort((a, b) => (per[b].overload_risk_score + per[b].failure_probability + per[b].anomaly_score) - (per[a].overload_risk_score + per[a].failure_probability + per[a].anomaly_score))[0]
  return { worst_service: worst, worst: per[worst], services: per }
}
function systemContext() {
  const lines = Object.entries(sim.services).map(([n, d]) => `- ${n}: Health=${d.health}, CPU=${d.cpu.toFixed(1)}%, Memory=${d.memory.toFixed(1)}MB, Latency=${d.latency.toFixed(0)}ms, Errors=${(d.error_rate * 100).toFixed(1)}%, Replicas=${d.replicas}/${d.desired}`).join('\n')
  const open = db.incidents.filter((i) => i.status !== 'RESOLVED').reverse()
  const incText = open.length ? open.slice(0, 3).map((i) => { const r = db.rca[i.id]; return `- [${i.incident_code}] ${i.title} (Severity: ${i.severity}, Status: ${i.status}, Service: ${i.service_name})${r ? ` | RCA: ${r.probable_root_cause}` : ''}` }).join('\n') : 'No active incidents detected. All services operating normally.'
  const a = db.anomalies[db.anomalies.length - 1]
  const p = db.predictions[db.predictions.length - 1]
  const rems = db.remediations.slice(-2).reverse()
  return `=== CURRENT CLUSTER SYSTEM STATE ===
Mode: ${sim.mode}
Simulation Clock: ${sim.clock_seconds}s
Active Scenario: ${sim.current_scenario || 'Healthy Baseline'}

MONITORED MICROSERVICES TELEMETRY:
${lines}

ACTIVE INCIDENTS:
${incText}

AI/ML OBSERVABILITY:
${a ? `Latest Anomaly: ${a.service_name} (Score: ${a.anomaly_score}, Severity: ${a.severity})` : 'No metric anomalies currently flagged.'}
${p ? `Failure Prediction: ${p.service_name} (Prob: ${(p.failure_probability * 100).toFixed(1)}%, Risk: ${p.risk_level})` : 'Failure Risk: LOW'}

REMEDIATION STATUS:
${rems.length ? rems.map((r) => `- ${r.action_type} on ${r.service_name} (Policy: ${r.policy_decision}, Status: ${r.status})`).join('\n') : 'None pending'}
====================================`
}

// ------------------------------------------------------------------ the mock REST API
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export function handle(method, url, body) {
  const u = new URL(url, 'http://demo.local')
  const path = u.pathname.replace(/^\/api\/v1/, '')
  const q = u.searchParams
  let m

  if (method === 'GET') {
    if (path === '/services') return json(clone(db.services))
    if (path === '/nodes') return json(clone(db.nodes))
    if (path === '/pods') return json(clone(db.pods))
    if (path === '/deployments') return json(clone([...db.deployments].sort((a, b) => b.deployed_at.localeCompare(a.deployed_at))))
    if (path === '/anomalies') return json(clone([...db.anomalies].reverse().slice(0, 50)))
    if (path === '/predictions') return json(clone([...db.predictions].reverse().slice(0, 50)))
    if (path === '/incidents') return json(clone(db.incidents))
    if ((m = path.match(/^\/incidents\/(\d+)$/))) { const i = db.incidents.find((x) => x.id === +m[1]); return i ? json(clone(i)) : json({ detail: 'Incident not found' }, 404) }
    if (path === '/remediation/actions') return json(clone([...db.remediations].reverse()))
    if (path === '/costs') {
      for (const c of db.costs) { const an = c.daily_cost > 200 || c.is_anomaly; c.is_anomaly = an; c.anomaly_score = an ? Math.round(Math.min(1, c.daily_cost / 250) * 100) / 100 : 0.12 }
      return json(clone(db.costs))
    }
    if (path === '/ai/health') return json({ ollama: 'demo', model: 'None (demo mode)', provider: 'Demo SLM (deterministic template)', slm_available: false, demo_mode: true, rag: 'ready', latency_ms: 0 })
    if (path === '/simulation/status') return json(simStatus())
  }
  if (method === 'POST') {
    if (path === '/ai/analyze') {
      const svcName = body.service_name || 'checkout-service'
      const f = { cpu_usage: body.cpu_usage ?? 25, memory_usage: body.memory_usage ?? 200, latency: body.latency ?? 40, error_rate: body.error_rate ?? 0.005, pod_restarts: body.pod_restarts ?? 0 }
      const r = modelsFor(f)
      if (r.anomaly.is_anomaly) db.anomalies.push({ id: db.ids.anomaly++, timestamp: iso(), service_name: svcName, metric_name: 'multi_variate_cpu_latency', metric_value: f.cpu_usage, anomaly_score: r.anomaly.anomaly_score, severity: r.anomaly.severity, is_anomaly: true, details: null })
      db.predictions.push({ id: db.ids.prediction++, timestamp: iso(), service_name: svcName, failure_probability: r.failure.failure_probability, risk_level: r.failure.risk, overload_risk_score: r.fuzzy.overload_risk_score, top_contributing_features: r.failure.top_contributing_features })
      const svc = db.services.find((s) => s.name === svcName)
      if (svc) Object.assign(svc, { current_cpu_usage: f.cpu_usage, current_memory_usage: f.memory_usage, current_latency_ms: f.latency, current_error_rate: f.error_rate, health_status: r.health, updated_at: iso() })
      return json({ service_name: svcName, health_classification: r.health, anomaly_detection: r.anomaly, failure_prediction: r.failure, neuro_fuzzy_overload_risk: r.fuzzy })
    }
    if ((m = path.match(/^\/incidents\/(\d+)\/analyze$/))) {
      const inc = db.incidents.find((x) => x.id === +m[1])
      if (!inc) return json({ detail: 'Incident not found' }, 404)
      const svc = db.services.find((s) => s.name === inc.service_name)
      const metrics = { cpu_usage: svc.current_cpu_usage, memory_usage: svc.current_memory_usage, latency: svc.current_latency_ms, error_rate: svc.current_error_rate, pod_restarts: sim.restarts[inc.service_name] || 0 }
      const rca = analyzeIncident(inc.service_name, metrics, db.deployments.filter((d) => d.service_name === inc.service_name).map((d) => ({ service_name: d.service_name, version: d.version })))
      const docs = retrieve(`${inc.service_name} ${rca.probable_root_cause}`, 2)
      const slm = explain(inc.incident_code, inc.service_name, rca.probable_root_cause, rca.evidence_summary, docs)
      db.rca[inc.id] = { probable_root_cause: rca.probable_root_cause, confidence_score: rca.confidence_score, evidence_summary: rca.evidence_summary, slm_explanation: slm.slm_explanation, suggested_fix: slm.suggested_remediation.reason, created_at: iso() }
      inc.rca_result = db.rca[inc.id]
      return json({ incident_id: inc.id, incident_code: inc.incident_code, metrics, rca, rag_retrieved_documents: docs, slm_analysis: slm })
    }
    if (path === '/ai/chat') {
      const message = (body.message || '').trim()
      if (!message) return json({ detail: 'Message prompt cannot be empty' }, 400)
      const ctx = systemContext()
      return json({
        response: `Based on current cluster telemetry context:\n${ctx}\n\nNote: demo mode is active; this response is generated by a deterministic template from the verified system state, not by a language model.`,
        provider: 'demo_template', model: 'None (demo mode)', source: 'Demo template (deterministic telemetry summary)', rag_sources: retrieve(message, 2), slm_available: false, latency_ms: 0,
      })
    }
    if (path === '/remediation/create') return json(createRemediation(body))
    if ((m = path.match(/^\/remediation\/(\d+)\/execute$/))) return json(executeRemediation(+m[1], q.get('user_name') || 'DevOps Lead', q.get('user_role') || 'DevOps'))
    if (path === '/simulation/start') {
      startScenario(body.scenario || 'cpu_saturation', body.target_service || 'checkout-service', body.duration_seconds ?? 60, body.intensity ?? 0.7)
      openIncident(body.scenario || 'cpu_saturation', body.target_service || 'checkout-service')
      return json(simStatus())
    }
    if (path === '/simulation/trigger') {
      startScenario(body.scenario, body.service_name || 'checkout-service', 60, 0.7)
      openIncident(body.scenario, body.service_name || 'checkout-service')
      return json({ message: `Simulation scenario '${body.scenario}' successfully triggered on ${body.service_name}.` })
    }
    if (path === '/simulation/pause') { sim.is_paused = true; addTimeline('Simulation clock paused.', 'WARNING'); return json(simStatus()) }
    if (path === '/simulation/resume') { sim.is_paused = false; addTimeline('Simulation clock resumed.', 'INFO'); return json(simStatus()) }
    if (path === '/simulation/reset') {
      sim = freshSim()
      db = freshDb()
      addTimeline('Simulation state reset to healthy nominal baseline.', 'INFO')
      return json(simStatus())
    }
  }
  return json({ detail: 'Not found' }, 404)
}

function simStatus() {
  return {
    mode: sim.mode, is_running: sim.is_running, is_paused: sim.is_paused, clock_seconds: sim.clock_seconds, current_scenario: sim.current_scenario,
    target_service: sim.target_service, intensity: sim.intensity, duration_seconds: sim.duration_seconds, timeline: sim.timeline.slice(0, 20),
    services: clone(sim.services), nodes: clone(sim.nodes), pods: clone(sim.pods),
  }
}

// ------------------------------------------------------------------ telemetry stream (replaces the WebSocket)
function telemetryPayload() {
  return {
    type: 'telemetry.update',
    timestamp: performance.now() / 1000,
    simulation: { mode: sim.mode, is_running: sim.is_running, is_paused: sim.is_paused, clock_seconds: sim.clock_seconds, current_scenario: sim.current_scenario, timeline: sim.timeline.slice(0, 20) },
    ai_summary: analyseServices(),
    open_incidents_count: db.incidents.filter((i) => i.status === 'OPEN').length,
    total_anomalies_count: db.anomalies.length,
    services: Object.entries(sim.services).map(([name, d]) => ({ name, health_status: d.health, cpu_usage: d.cpu, memory_usage: d.memory, latency_ms: d.latency, error_rate: d.error_rate, replicas: `${d.replicas}/${d.desired}` })),
  }
}

let timer = null
function ensureTimer() {
  if (timer) return
  timer = setInterval(() => {
    applyScenarioStep()
    if (listeners.size) {
      const payload = telemetryPayload()
      listeners.forEach((fn) => fn(payload))
    }
  }, 2000)
}

export function subscribeTelemetry(fn) {
  listeners.add(fn)
  ensureTimer()
  fn(telemetryPayload())
  return () => listeners.delete(fn)
}

// Replace window.fetch for /api/v1 so the existing pages work unchanged.
export function installDemoApi() {
  const realFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url
    if (url.startsWith('/api/v1')) {
      let body = {}
      try { body = init.body ? JSON.parse(init.body) : {} } catch { body = {} }
      return Promise.resolve(handle((init.method || 'GET').toUpperCase(), url, body))
    }
    return realFetch(input, init)
  }
}
