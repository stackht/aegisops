// In-browser versions of the AegisOps models. The trees were trained with scikit-learn and exported to
// models.json by scripts/export_models.py; this file only runs them (no backend needed).
import M from './models.json'

const clip = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const round = (v, n) => Math.round(v * 10 ** n) / 10 ** n

function leafOf(tree, x) {
  let i = 0
  let depth = 0
  while (tree.l[i] !== -1) {
    i = x[tree.f[i]] <= tree.t[i] ? tree.l[i] : tree.r[i]
    depth++
  }
  return { leaf: tree.v[i], depth }
}

// ---------- Isolation Forest (anomaly detection) ----------
function isoScore(x) {
  let total = 0
  for (const tr of M.iforest.trees) {
    const { leaf, depth } = leafOf(tr, x)
    total += depth + leaf
  }
  return -(2 ** (-(total / M.iforest.trees.length) / M.iforest.c_max))
}

export function detectAnomaly(f) {
  const x = [f.cpu_usage ?? 25, f.memory_usage ?? 200, f.latency ?? 40, f.error_rate ?? 0.005, f.pod_restarts ?? 0]
  const raw = isoScore(x)
  const offset = M.iforest.offset
  const score = clip(0.5 + (offset - raw) / 0.05, 0, 1)
  const isAnomaly = raw - offset < 0
  let severity = 'LOW'
  if (isAnomaly) severity = score > 0.8 ? 'CRITICAL' : score > 0.65 ? 'HIGH' : 'MEDIUM'
  return { is_anomaly: isAnomaly, anomaly_score: round(score, 3), severity }
}

// ---------- Random Forest failure predictor ----------
export function predictFailure(f) {
  const x = [f.cpu_usage ?? 25, f.memory_usage ?? 200, f.latency ?? 40, f.error_rate ?? 0.005, f.pod_restarts ?? 0, f.historical_failures ?? 0, f.node_cpu_usage ?? 30]
  let p = 0
  for (const tr of M.failure.trees) p += leafOf(tr, x).leaf
  p /= M.failure.trees.length
  const risk = p >= 0.75 ? 'CRITICAL' : p >= 0.5 ? 'HIGH' : p >= 0.25 ? 'MEDIUM' : 'LOW'
  const top = M.failure.features
    .map((name, i) => [name, M.failure.importances[i]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([feature, importance]) => ({ feature, importance: round(importance, 3) }))
  return { failure_probability: round(p, 3), risk, top_contributing_features: top }
}

// ---------- Random Forest health classifier ----------
export function classifyHealth(f) {
  const x = [f.cpu_usage ?? 25, f.memory_usage ?? 200, f.latency ?? 40, f.error_rate ?? 0.005, f.pod_restarts ?? 0]
  const k = M.classifier.classes.length
  const acc = new Array(k).fill(0)
  for (const tr of M.classifier.trees) {
    const v = leafOf(tr, x).leaf
    for (let c = 0; c < k; c++) acc[c] += v[c]
  }
  return M.classifier.classes[acc.indexOf(Math.max(...acc))]
}

// ---------- Fuzzy overload-risk engine ----------
const low = (v, a, b) => (v <= a ? 1 : v < b ? (b - v) / (b - a) : 0)
const med = (v, a, p, b) => (v > a && v <= p ? (v - a) / (p - a) : v > p && v < b ? (b - v) / (b - p) : 0)
const high = (v, a, p) => (v < a ? 0 : v < p ? (v - a) / (p - a) : 1)

export function overloadRisk(m) {
  const cpu = m.cpu_usage ?? 25
  const mem = ((m.memory_usage ?? 200) / 1024) * 100
  const lat = m.latency ?? 40
  const err = (m.error_rate ?? 0.005) * 100
  const cpuL = low(cpu, 0, 30), cpuM = med(cpu, 30, 60, 80), cpuH = high(cpu, 60, 80)
  const memL = low(mem, 0, 35), memM = med(mem, 35, 65, 85), memH = high(mem, 65, 85)
  const latL = low(lat, 0, 100), latM = med(lat, 100, 300, 800), latH = high(lat, 300, 800)
  const errH = high(err, 1, 5)
  const restH = high(m.pod_restarts ?? 0, 1, 4)
  const critical = Math.max(Math.min(cpuH, memH, latH), Math.min(cpuH, errH))
  const highDeg = Math.max(Math.min(cpuH, memH), Math.min(memH, latH), memH, Math.min(latH, errH), Math.min(restH, errH))
  const medium = Math.min(cpuM, memM, latM)
  const raw = critical * 0.95 + highDeg * 0.75 + medium * 0.5 + (1 - Math.max(critical, highDeg, medium)) * 0.15
  const score = clip(raw, 0, 1)
  const category = score >= 0.8 ? 'CRITICAL RISK' : score >= 0.6 ? 'HIGH RISK' : score >= 0.35 ? 'MEDIUM RISK' : 'LOW RISK'
  const r2 = (v) => round(v, 2)
  return {
    overload_risk_score: round(score, 3),
    risk_category: category,
    memberships: {
      cpu: { low: r2(cpuL), medium: r2(cpuM), high: r2(cpuH) },
      memory: { low: r2(memL), medium: r2(memM), high: r2(memH) },
      latency: { low: r2(latL), medium: r2(latM), high: r2(latH) },
      error_rate: { high: r2(errH) },
      restarts: { high: r2(restH) },
    },
    fuzzy_rule_triggers: {
      rule_critical_triple_saturation: r2(critical),
      rule_high_dual_saturation: r2(highDeg),
      rule_medium_moderate_load: r2(medium),
    },
  }
}
