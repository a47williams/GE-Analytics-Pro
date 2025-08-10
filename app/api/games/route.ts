import { NextResponse } from 'next/server'

const TEAM_ABBR: Record<string, string> = {
  'Arizona Cardinals': 'ARI','Atlanta Falcons': 'ATL','Baltimore Ravens': 'BAL','Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR','Chicago Bears': 'CHI','Cincinnati Bengals': 'CIN','Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL','Denver Broncos': 'DEN','Detroit Lions': 'DET','Green Bay Packers': 'GB',
  'Houston Texans': 'HOU','Indianapolis Colts': 'IND','Jacksonville Jaguars': 'JAX','Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV','Los Angeles Chargers': 'LAC','Los Angeles Rams': 'LAR','Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN','New England Patriots': 'NE','New Orleans Saints': 'NO','New York Giants': 'NYG',
  'New York Jets': 'NYJ','Philadelphia Eagles': 'PHI','Pittsburgh Steelers': 'PIT','San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA','Tampa Bay Buccaneers': 'TB','Tennessee Titans': 'TEN','Washington Commanders': 'WAS',
}

const WEEK1_START_UTC = Date.UTC(2025, 8, 4, 0, 0, 0)
const WEEK1_END_UTC   = Date.UTC(2025, 8, 10, 0, 0, 0)

type Outcome = { name: string; point?: number }
type Market = { key: string; outcomes: Outcome[] }
type Bookmaker = { title: string; key?: string; markets: Market[] }
type OddsEvent = {
  id: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: Bookmaker[]
}

function abbr(name: string) {
  return TEAM_ABBR[name] ?? name.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 3)
}
function impliedFrom(total?: number, homeSpread?: number) {
  if (typeof total !== 'number' || typeof homeSpread !== 'number') return { home: null, away: null }
  const home = +(total / 2 - homeSpread / 2).toFixed(1)
  const away = +(total - home).toFixed(1)
  return { home, away }
}
function pickTotalsAny(books?: Bookmaker[]) {
  for (const b of books ?? []) {
    const m = b.markets?.find(x => x.key === 'totals')
    const o = m?.outcomes?.find(x => typeof x.point === 'number')
    if (o?.point !== undefined) return Number(o.point)
  }
  return undefined
}
function pickHomeSpreadAny(books: Bookmaker[] | undefined, homeTeam: string, awayTeam: string) {
  for (const b of books ?? []) {
    const m = b.markets?.find(x => x.key === 'spreads')
    if (!m) continue
    const home = m.outcomes?.find(o => o.name === homeTeam && typeof o.point === 'number')?.point
    if (typeof home === 'number') return home
    const away = m.outcomes?.find(o => o.name === awayTeam && typeof o.point === 'number')?.point
    if (typeof away === 'number') return -away
  }
  return undefined
}

export async function GET(req: Request) {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No ODDS_API_KEY set' }, { status: 500 })

  const url = new URL(req.url)
  const mode = (url.searchParams.get('mode') || '').toLowerCase()
  const SPORT = mode === 'preseason' ? 'americanfootball_nfl_preseason' : 'americanfootball_nfl'

  // window
  const now = Date.now()
  let startMs: number, endMs: number, windowMode = 'REGULAR'
  if (mode === 'preseason') {
    const yday = 24 * 3600 * 1000, plus28 = 28 * 24 * 3600 * 1000
    startMs = now - yday
    endMs = Math.min(WEEK1_START_UTC, now + plus28)
    windowMode = 'PRESEASON_UPCOMING'
  } else if (now < WEEK1_START_UTC) {
    startMs = WEEK1_START_UTC; endMs = WEEK1_END_UTC; windowMode = 'WEEK_1_LOCKED'
  } else {
    const seven = 7 * 24 * 3600 * 1000
    startMs = now; endMs = now + seven; windowMode = 'ROLLING_7D'
  }

  // 1) main odds feed (has spreads/totals)
  const oddsUrl =
    `https://api.the-odds-api.com/v4/sports/${SPORT}/odds` +
    `?apiKey=${apiKey}&regions=us,us2,eu,uk&markets=spreads,totals&oddsFormat=american&dateFormat=iso`
  let games: any[] = []
  try {
    const r = await fetch(oddsUrl, { cache: 'no-store' })
    if (r.ok) {
      const data = (await r.json()) as OddsEvent[]
      games = (data || [])
        .filter(ev => {
          const t = Date.parse(ev.commence_time)
          return t >= startMs && t < endMs
        })
        .map(ev => {
          const total = pickTotalsAny(ev.bookmakers)
          const homeSpread = pickHomeSpreadAny(ev.bookmakers, ev.home_team, ev.away_team)
          const implied = impliedFrom(total, homeSpread)
          return {
            id: ev.id,
            eventId: ev.id,
            kickoff: ev.commence_time,
            home: { name: ev.home_team, abbr: abbr(ev.home_team) },
            away: { name: ev.away_team, abbr: abbr(ev.away_team) },
            spread: typeof homeSpread === 'number' ? homeSpread : null,
            total: typeof total === 'number' ? total : null,
            impliedHome: implied.home,
            impliedAway: implied.away,
          }
        })
        .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
    }
  } catch {}

  // 2) fallback: events → per-event odds
  if (!games.length) {
    const eventsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/${SPORT}/events?apiKey=${apiKey}&dateFormat=iso`,
      { cache: 'no-store' }
    )
    if (eventsRes.ok) {
      const evs: { id: string; commence_time: string; home_team: string; away_team: string }[] = await eventsRes.json()
      const inWin = evs.filter(e => {
        const t = Date.parse(e.commence_time)
        return t >= startMs && t < endMs
      }).sort((a, b) => Date.parse(a.commence_time) - Date.parse(b.commence_time)).slice(0, 20)

      const enriched = await Promise.all(inWin.map(async e => {
        try {
          const one =
            `https://api.the-odds-api.com/v4/sports/${SPORT}/events/${e.id}/odds` +
            `?apiKey=${apiKey}&regions=us,us2,eu,uk&markets=spreads,totals&oddsFormat=american&dateFormat=iso`
          const r = await fetch(one, { cache: 'no-store' })
          if (!r.ok) throw new Error(String(r.status))
          const d = (await r.json()) as OddsEvent
          const total = pickTotalsAny(d.bookmakers)
          const homeSpread = pickHomeSpreadAny(d.bookmakers, e.home_team, e.away_team)
          const implied = impliedFrom(total, homeSpread)
          return {
            id: e.id,
            eventId: e.id,
            kickoff: e.commence_time,
            home: { name: e.home_team, abbr: abbr(e.home_team) },
            away: { name: e.away_team, abbr: abbr(e.away_team) },
            spread: typeof homeSpread === 'number' ? homeSpread : null,
            total: typeof total === 'number' ? total : null,
            impliedHome: implied.home,
            impliedAway: implied.away,
          }
        } catch {
          return {
            id: e.id,
            eventId: e.id,
            kickoff: e.commence_time,
            home: { name: e.home_team, abbr: abbr(e.home_team) },
            away: { name: e.away_team, abbr: abbr(e.away_team) },
            spread: null, total: null, impliedHome: null, impliedAway: null,
          }
        }
      }))
      games = enriched
    }
  }

  return NextResponse.json({
    games,
    window: { mode: windowMode, startISO: new Date(startMs).toISOString(), endISO: new Date(endMs).toISOString() },
  })
}
