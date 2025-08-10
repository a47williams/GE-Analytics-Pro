import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const r = await fetch(`${url.origin}/api/games?mode=preseason`, { cache: 'no-store' })
  const data = await r.json()
  const games = Array.isArray(data?.games) ? data.games : []
  if (!games.length) return NextResponse.json({ error: 'no games found' }, { status: 404 })
  const list = games.slice(0, 10).map((g: any) => ({
    eventId: g.eventId, matchup: `${g.away?.abbr} @ ${g.home?.abbr}`, kickoff: g.kickoff
  }))
  return NextResponse.json({ firstEventId: games[0].eventId, examples: list })
}
