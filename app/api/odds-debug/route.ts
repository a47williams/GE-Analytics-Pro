import { NextResponse } from 'next/server'

type Bookmaker = { title?: string; key?: string; markets?: any[] }
type OddsEvent = { bookmakers?: Bookmaker[] }

export async function GET(req: Request) {
  try {
    const apiKey = process.env.ODDS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No ODDS_API_KEY set in .env.local' }, { status: 500 })
    }

    const url = new URL(req.url)
    const mode = (url.searchParams.get('mode') || '').toLowerCase() // 'week1' | 'preseason'
    const eventId = url.searchParams.get('eventId') || ''
    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
    }

    const regions = url.searchParams.get('regions') || 'us,us2,eu,uk'
    const markets = url.searchParams.get('markets') || 'spreads,totals,player_anytime_td'

    const SPORT =
      mode === 'preseason' ? 'americanfootball_nfl_preseason' : 'americanfootball_nfl'

    const oddsUrl =
      `https://api.the-odds-api.com/v4/sports/${SPORT}/events/${eventId}/odds` +
      `?apiKey=${apiKey}` +
      `&regions=${encodeURIComponent(regions)}` +
      `&markets=${encodeURIComponent(markets)}` +
      `&oddsFormat=american&dateFormat=iso`

    const r = await fetch(oddsUrl, { cache: 'no-store' })

    const summary: any = { status: r.status, bookmakers: 0, books: [] as string[] }

    if (r.headers.get('content-type')?.includes('application/json')) {
      const raw: OddsEvent | any = await r.json().catch(() => null)
      const books = Array.isArray(raw?.bookmakers) ? raw!.bookmakers! : []
      summary.bookmakers = books.length
      summary.books = books.map((b: Bookmaker) => b.title || b.key || 'book')
      if (!r.ok) summary.body = raw
    } else {
      summary.body = await r.text().catch(() => '')
    }

    return NextResponse.json({
      oddsUrl,
      sportKey: SPORT,
      usingKeySuffix: `***${apiKey.slice(-6)}`, // last 6 chars of the key so you can verify which key is live
      eventId,
      markets,
      regions,
      summary,
    })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
