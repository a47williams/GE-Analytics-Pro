'use client'

import TeamLogo from './TeamLogo'

type Team = { name: string; abbr: string }
export type Game = {
  id: string
  eventId: string
  kickoff: string
  home: Team
  away: Team
  spread: number | null
  total: number | null
  impliedHome: number | null
  impliedAway: number | null
}
const dash = (v: number | null) => (v === null || Number.isNaN(v) ? '—' : String(v))

export default function MatchupCard({ games, hideNumbers = false }: { games: Game[]; hideNumbers?: boolean }) {
  if (!games?.length) return null
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {games.map(g => (
        <div key={g.id} className="card p-4 hover:translate-y-[-1px] transition-transform">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span title={g.away.abbr}><TeamLogo abbr={g.away.abbr} /></span>
              <span className="text-slate-400">@</span>
              <span title={g.home.abbr}><TeamLogo abbr={g.home.abbr} /></span>
            </div>
            <div className="text-sm text-slate-400">{new Date(g.kickoff).toLocaleString()}</div>
          </div>

          {!hideNumbers && (
            <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
              <div><div className="text-slate-300">Spread (home)</div><div className="font-mono">{dash(g.spread)}</div></div>
              <div><div className="text-slate-300">Total</div><div className="font-mono">{dash(g.total)}</div></div>
              <div><div className="text-slate-300">Imp Home</div><div className="font-mono">{dash(g.impliedHome)}</div></div>
              <div><div className="text-slate-300">Imp Away</div><div className="font-mono">{dash(g.impliedAway)}</div></div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
