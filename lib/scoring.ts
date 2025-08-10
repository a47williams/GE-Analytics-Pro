import type { MatchupInputs, MatchupBreakdown } from '@/lib/types'

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x))
}

// Normalize helpers → output roughly 0..100
const norm = {
  // lower EPA allowed is better for defense, worse for offense; invert
  epaAllowed: (epa: number) => clamp(60 - epa * 100, 0, 100),
  successAllowed: (sr: number) => clamp(60 - sr * 60, 0, 100),
  yardsAllowed: (y: number, pos: string) => {
    const cap = pos === 'WR' ? 200 : pos === 'RB' ? 140 : 100
    return clamp((y / cap) * 100, 0, 100)
  },
  role: (routes: number, tShare: number, rShare: number) => {
    const r = clamp(routes / 35 * 100, 0, 100) * 0.5
    const t = clamp(tShare * 100, 0, 100) * 0.4
    const rush = clamp(rShare * 100, 0, 100) * 0.1
    return r + t + rush
  },
  trend: (last4: number, base: number) => {
    if (base <= 0) return 50
    const delta = (last4 - base) / base
    return clamp(50 + delta * 50, 0, 100)
  },
  vegas: (implied: number, total: number, spread: number) => {
    // more points & closer spreads tend to boost usage/TD odds
    const p = clamp((implied / Math.max(10, total)) * 100, 0, 100) * 0.7
    const s = clamp((30 - Math.abs(spread)) / 30 * 100, 0, 100) * 0.3
    return p + s
  },
  redZone: (rz: number) => clamp(rz * 100, 0, 100)
}

export function computeMatchupScore(input: MatchupInputs): MatchupBreakdown {
  const { role, dvoaLike, vegas } = input

  const defense =
    (norm.epaAllowed(dvoaLike.epaPerPlayAllowed) * 0.45) +
    (norm.successAllowed(dvoaLike.successRateAllowed) * 0.25) +
    (norm.yardsAllowed(dvoaLike.ydsPerGameAllowed, role.pos) * 0.30)

  const usage = norm.role(role.routesPerGame, role.targetShare, role.rushShare)
  const context = norm.vegas(vegas.impliedFor, vegas.total, vegas.spread)
  const trend = norm.trend(role.last4GamesPerGameYds, role.baselineYdsPerGame)
  const rz = norm.redZone(role.redZoneShare)

  const components = [
    { label: 'Opponent Adjusted Defense', value: defense, weight: 0.35 },
    { label: 'Role & Usage', value: usage, weight: 0.25 },
    { label: 'Vegas Context', value: context, weight: 0.15 },
    { label: 'Recent Trend (4g)', value: trend, weight: 0.15 },
    { label: 'Red-Zone Share', value: rz, weight: 0.10 },
  ]

  const score = clamp(
    components.reduce((acc, c) => acc + c.value * c.weight, 0),
    0, 100
  )

  return { score, components }
}
