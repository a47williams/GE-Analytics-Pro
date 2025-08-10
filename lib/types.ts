export type Team = {
  id: string
  name: string
  abbr: string
}

export type Game = {
  id: string
  home: Team
  away: Team
  kickoff: string // ISO
  spread: number // home spread (-3.5 = home favored)
  total: number
  impliedHome: number
  impliedAway: number
}

export type PlayerRole = {
  playerId: string
  name: string
  team: string
  pos: 'QB' | 'RB' | 'WR' | 'TE'
  opp: string
  routesPerGame: number
  targetShare: number // 0..1
  rushShare: number // 0..1 (for RB/QB)
  redZoneShare: number // 0..1
  last4GamesPerGameYds: number
  baselineYdsPerGame: number
}

export type DefenseVsPos = {
  team: string
  pos: 'RB' | 'WR' | 'TE' | 'QB'
  epaPerPlayAllowed: number // opponent-adjusted
  successRateAllowed: number // 0..1
  ydsPerGameAllowed: number
}

export type MatchupInputs = {
  role: PlayerRole
  dvoaLike: DefenseVsPos
  vegas: { impliedFor: number; spread: number; total: number }
}

export type MatchupBreakdown = {
  score: number
  components: { label: string; value: number; weight: number }[]
}
