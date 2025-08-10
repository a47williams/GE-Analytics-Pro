import { headers } from 'next/headers'
import MatchupCard from '../components/MatchupCard'

type Team = { name: string; abbr: string }
type Game = {
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
type GamesResp = {
  games: Game[]
  window?: { mode?: string; startISO?: string; endISO?: string }
  _debug?: { dates: { date: string; events: number; hadOdds: number }[] }
}

function fmtRange(startISO?: string, endISO?: string) {
  if (!startISO || !endISO) return ''
  const start = new Date(startISO)
  const end = new Date(endISO)
  const endDisplay = new Date(end.getTime() - 1)
  const s = start.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
  const e = endDisplay.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
  return `${s}–${e}`
}

export default async function TodayPage() {
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const base = `${proto}://${host}`

  const res = await fetch(`${base}/api/games?mode=preseason`, { cache: 'no-store' })
  const data: GamesResp = await res.json()
  const games = Array.isArray(data.games) ? data.games : []
  const anyOdds = games.some(g => g.total !== null || g.spread !== null)

  return (
    <div className="space-y-6">
      <h1 className="h1">Today</h1>

      {data.window?.startISO && data.window?.endISO ? (
        <div className="text-sm text-slate-400">
          Showing: {fmtRange(data.window.startISO, data.window.endISO)}
          {data.window.mode ? ` • ${data.window.mode.replaceAll('_', ' ')}` : ''}
        </div>
      ) : null}

      {!anyOdds && (
        <div className="card p-4 text-sm">
          No preseason odds from ESPN right now. You’ll still see the matchups.
          We can plug in a paid feed later for spreads/totals + player props.
        </div>
      )}

      {games.length ? (
        <MatchupCard games={games} hideNumbers={!anyOdds} />
      ) : (
        <div className="card p-4 text-sm">No games in this window yet.</div>
      )}

      <p className="text-xs text-slate-500">
        For informational/entertainment purposes only. Not betting advice. 21+ gamble responsibly.
      </p>
    </div>
  )
}
