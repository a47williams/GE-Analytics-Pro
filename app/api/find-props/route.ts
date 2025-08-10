import { NextResponse } from 'next/server'

const WEEK1_START_UTC = Date.UTC(2025, 8, 4, 0, 0, 0) // 2025-09-04
const WEEK1_END_UTC   = Date.UTC(2025, 8, 10, 0, 0, 0) // 2025-09-10

async function listEvents(apiKey: string, sportKey: string, startMs: number, endMs: number) {
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/events?apiKey=${apiKey}&dateFormat=iso`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) return []
  const rows = await r.json() as any[]
  return rows
    .filter(e => {
      const t = Date.parse(e.commence_time)
      return t >= startMs && t < endMs
    })
    .sort((a, b) => Date.parse(a.commence_time) - Date.parse(b.commence_time))
}

async function getPlayerMarketKeys(apiKey: string, sportKey: string, eventId: string) {
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/events/${eventId}/markets?apiKey=${apiKey}&regions=us,us2`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) return []
  const data = await r.json()
  const keys = new Set<string>()
  for (const bm of data?.bookmakers ?? []) {
    for (const m of bm?.markets ?? []) {
      if (typeof m?.key === 'string' && m.key.startsWith('player_')) keys.add(m.key)
    }
  }
  return Array.from(keys).sort()
}

export async function GET(req: Request) {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No ODDS_API_KEY set' }, { status: 500 })

  const now = Date.now()
  // define the two windows we’ll scan
  const preseasonStart = now - 24 * 3600 * 1000
  const preseasonEnd = Math.min(WEEK1_START_UTC, now + 28 * 24 * 3600 * 1000)
  const week1Start = WEEK1_START_UTC
  const week1End = WEEK1_END_UTC

  const tries: { label: string; sport: string; start: number; end: number }[] = [
    { label: 'preseason', sport: 'americanfootball_nfl_preseason', start: preseasonStart, end: preseasonEnd },
    { label: 'week1', sport: 'americanfootball_nfl', start: week1Start, end: week1End },
  ]

  for (const t of tries) {
    const events = await listEvents(apiKey, t.sport, t.start, t.end)
    for (const ev of events.slice(0, 40)) {
      const keys = await getPlayerMarketKeys(apiKey, t.sport, ev.id)
      if (keys.length) {
        return NextResponse.json({
          found: true,
          mode: t.label,
          sportKey: t.sport,
          event: {
            id: ev.id,
            kickoff: ev.commence_time,
            away: ev.away_team,
            home: ev.home_team,
          },
          marketKeys: keys,
        })
      }
    }
  }

  return NextResponse.json({
    found: false,
    note: 'No player_* markets found in preseason or Week 1 yet for your key/region window.',
  })
}
