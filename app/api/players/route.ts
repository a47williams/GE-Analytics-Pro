import { NextResponse } from 'next/server'

/** Run on Node so our tiny in-memory cache works */
export const runtime = 'nodejs'
export const revalidate = 0

// -------- tiny in-memory cache (saves your API credits) --------
type Cached = { json: any; exp: number; status: number; ok: boolean }
const cache = new Map<string, Cached>()
function getCache(key: string): Cached | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.exp) { cache.delete(key); return null }
  return hit
}
function setCache(key: string, val: Cached, ttlSec: number) {
  cache.set(key, { ...val, exp: Date.now() + ttlSec * 1000 })
}

// -------- odds helpers --------
type Outcome = { name?: string; description?: string; price?: number; point?: number; line?: number; handicap?: number }
type Market = { key?: string; outcomes?: Outcome[] }
type Bookmaker = { title?: string; key?: string; markets?: Market[] }
type OddsEvent = { bookmakers?: Bookmaker[] }

const ALT_KEYS = new Set(['player_pass_yds_alternate','player_reception_yds_alternate','player_rush_yds_alternate'])
const PRICE_KEYS = new Set(['player_anytime_td','player_1st_td','player_last_td'])
const CAPS: Record<string, number> = {
  player_pass_yds: 400, player_pass_yds_alternate: 400,
  player_reception_yds: 160, player_reception_yds_alternate: 160,
  player_rush_yds: 160, player_rush_yds_alternate: 160,
  player_receptions: 12,
}
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const lineFrom = (o: Outcome) => num(o.point) ?? num(o.line) ?? num((o as any).handicap)
const playerName = (o: Outcome) => (o.description || o.name || '').trim()
const clamp100 = (n: number) => Math.max(0, Math.min(100, n))
const americanToProb = (price: number) => (price < 0 ? (-price) / ((-price) + 100) : 100 / (price + 100))

function pickRepresentativeAltLine(entries: { line: number | null; price: number | null }[]) {
  const both = entries.filter(e => e.line !== null && e.price !== null) as { line: number; price: number }[]
  if (!both.length) {
    const lines = entries.map(e => e.line).filter((x): x is number => x !== null)
    if (!lines.length) return { line: null, price: null }
    const avg = lines.reduce((a, b) => a + b, 0) / lines.length
    return { line: +avg.toFixed(1), price: null }
  }
  let best = both[0], bestDiff = Math.abs(americanToProb(best.price) - 0.5)
  for (const e of both) {
    const d = Math.abs(americanToProb(e.price) - 0.5)
    if (d < bestDiff) { best = e; bestDiff = d }
  }
  return { line: +best.line.toFixed(1), price: best.price }
}

// -------- the API route --------
export async function GET(req: Request) {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No ODDS_API_KEY set in .env.local' }, { status: 500 })

  const url = new URL(req.url)
  const mode = (url.searchParams.get('mode') || '').toLowerCase()         // '' | 'preseason'
  const SPORT = mode === 'preseason' ? 'americanfootball_nfl_preseason' : 'americanfootball_nfl'

  const eventId = url.searchParams.get('eventId') || ''
  const requestedMarket = url.searchParams.get('market') || ''            // e.g. 'player_anytime_td'
  const regions = url.searchParams.get('regions') || 'us,us2'             // keep tight to save credits
  const booksParam = url.searchParams.get('books') || ''                  // optional: 'draftkings' etc.
  const booksFilter = booksParam.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

  if (!eventId) return NextResponse.json({ error: 'missing eventId' }, { status: 400 })

  // we always add 'totals' for game-total context in the explanation
  const markets = requestedMarket ? `${requestedMarket},totals` : 'player_anytime_td,totals'
  const oddsUrl =
    `https://api.the-odds-api.com/v4/sports/${SPORT}/events/${eventId}/odds` +
    `?apiKey=${apiKey}&regions=${encodeURIComponent(regions)}` +
    `&markets=${encodeURIComponent(markets)}` +
    `&oddsFormat=american&dateFormat=iso`

  // credit-friendly: 90s cache per unique request
  const cached = getCache(oddsUrl)
  let status = 200, ok = true, body: any = null
  if (cached) {
    ({ status, ok, json: body } = cached)
  } else {
    const r = await fetch(oddsUrl, { cache: 'no-store' })
    status = r.status
    ok = r.ok
    try { body = await r.json() } catch { body = null }
    if (ok) setCache(oddsUrl, { status, ok, json: body, exp: 0 }, 90)
  }

  // Handle blocked/credit errors nicely (show premium "Pro" gate + sample row)
  if (!ok) {
    const code = (body?.error_code || '').toUpperCase()
    const reason =
      code === 'OUT_OF_USAGE_CREDITS' ? 'OUT_OF_USAGE_CREDITS' :
      code === 'NOT_AUTHORIZED_FOR_PLAYER_MARKETS' ? 'NOT_AUTHORIZED_FOR_PLAYER_MARKETS' :
      `HTTP_${status}`

    const sample = [{
      player: 'Sample Player',
      market: requestedMarket || 'player_anytime_td',
      avgLine: null, bestLine: null, bestBook: '—',
      avgPrice: -105, bestPrice: -102,
      score: 51, valueType: 'price' as const, totalContext: 49.5,
      sources: [{ book: '—', player: 'Sample Player', line: null, price: -102 }],
      explain: {
        kind: 'price' as const,
        formula: 'score = impliedProbability(averageAmericanPrice) × 100',
        avgPrice: -105, impliedProb: 51.2, baseScore: 51, bestPrice: -102, bestBook: '—', totalContext: 49.5
      }
    }]

    return NextResponse.json({
      proRequired: true,
      reason,
      note:
        reason === 'OUT_OF_USAGE_CREDITS'
          ? 'We hit the free usage limit. Upgrade to Pro for live player props.'
          : reason === 'NOT_AUTHORIZED_FOR_PLAYER_MARKETS'
          ? 'This key does not include player prop markets. Upgrade to Pro to unlock.'
          : 'Live props are temporarily unavailable.',
      eventId, market: requestedMarket || null, propsAvailable: false, players: sample
    }, { status: 200 })
  }

  // ---- success path: build rows ----
  const ev: OddsEvent = body
  const allBooks = Array.isArray(ev.bookmakers) ? ev.bookmakers : []
  const books = booksFilter.length
    ? allBooks.filter(b => (b.key || b.title || '').toLowerCase() && booksFilter.includes((b.key || b.title || '').toLowerCase()))
    : allBooks

  // game total context
  let gameTotal: number | null = null
  for (const b of books) {
    const tot = b.markets?.find(m => m.key === 'totals')
    const o = tot?.outcomes?.find(x => typeof (x as any).point === 'number') as any
    if (o?.point != null) { gameTotal = Number(o.point); break }
  }

  type Entry = { book: string; player: string; line: number | null; price: number | null }
  const byPlayer = new Map<string, Entry[]>()

  for (const b of books) {
    for (const m of b.markets || []) {
      if (!requestedMarket || m.key !== requestedMarket) continue
      for (const o of m.outcomes || []) {
        const name = playerName(o)
        if (!name) continue
        const e: Entry = {
          book: b.title || b.key || 'book',
          player: name,
          line: lineFrom(o),
          price: num(o.price),
        }
        if (!byPlayer.has(name)) byPlayer.set(name, [])
        byPlayer.get(name)!.push(e)
      }
    }
  }

  type Explain =
    | { kind:'price'; formula:string; avgPrice:number; impliedProb:number; baseScore:number; bestPrice:number|null; bestBook:string|null; totalContext:number|null }
    | { kind:'line';  formula:string; repLine:number;  cap:number;   baseScore:number; bestLine:number|null;  bestBook:string|null; totalContext:number|null }

  type Row = {
    player: string
    market: string | null
    avgLine: number | null
    bestLine: number | null
    bestBook: string | null
    avgPrice: number | null
    bestPrice: number | null
    score: number
    valueType: 'line' | 'price'
    totalContext: number | null
    sources: Entry[]
    explain: Explain
  }

  const rows: Row[] = []
  const isAlt = ALT_KEYS.has(requestedMarket)
  const isPrice = PRICE_KEYS.has(requestedMarket)

  for (const [player, arr] of byPlayer) {
    if (!arr.length) continue

    if (isPrice) {
      const prices = arr.map(a => a.price).filter((x): x is number => x !== null)
      if (!prices.length) continue
      const avgP = prices.reduce((a, b) => a + b, 0) / prices.length
      let best = { price: prices[0], book: arr.find(a => a.price === prices[0])?.book || null }
      for (const a of arr) if (typeof a.price === 'number' && a.price > (best.price ?? -Infinity)) best = { price: a.price, book: a.book }
      const prob = americanToProb(avgP)
      const baseScore = clamp100(prob * 100)

      rows.push({
        player,
        market: requestedMarket,
        avgLine: null,
        bestLine: null,
        bestBook: best.book,
        avgPrice: Math.round(avgP),
        bestPrice: best.price ?? null,
        score: Math.round(baseScore),
        valueType: 'price',
        totalContext: gameTotal,
        sources: arr,
        explain: {
          kind: 'price',
          formula: 'score = impliedProbability(averageAmericanPrice) × 100',
          avgPrice: Math.round(avgP),
          impliedProb: +((prob) * 100).toFixed(1),
          baseScore: +baseScore.toFixed(0),
          bestPrice: best.price ?? null,
          bestBook: best.book,
          totalContext: gameTotal,
        },
      })
    } else {
      let repLine: number | null = null
      if (isAlt) {
        const rep = pickRepresentativeAltLine(arr)
        repLine = rep.line
      } else {
        const lines = arr.map(a => a.line).filter((x): x is number => x !== null)
        if (lines.length) repLine = +(lines.reduce((a, b) => a + b, 0) / lines.length).toFixed(1)
      }
      if (repLine === null) continue

      let bestLine: number | null = repLine
      let bestBook: string | null = arr.find(a => a.line === repLine)?.book ?? null
      for (const a of arr) if (typeof a.line === 'number' && a.line > (bestLine ?? -Infinity)) { bestLine = a.line; bestBook = a.book }

      const cap = CAPS[requestedMarket] ?? 120
      const baseScore = clamp100((repLine / cap) * 100)

      rows.push({
        player,
        market: requestedMarket,
        avgLine: repLine,
        bestLine,
        bestBook,
        avgPrice: null,
        bestPrice: null,
        score: Math.round(baseScore),
        valueType: 'line',
        totalContext: gameTotal,
        sources: arr,
        explain: {
          kind: 'line',
          formula: 'score = representativeLine ÷ cap × 100',
          repLine,
          cap,
          baseScore: +baseScore.toFixed(0),
          bestLine,
          bestBook,
          totalContext: gameTotal,
        },
      })
    }
  }

  rows.sort((a, b) => b.score - a.score)

  return NextResponse.json({
    eventId,
    market: requestedMarket || null,
    propsAvailable: rows.length > 0,
    players: rows,
    note: rows.length ? undefined : 'No outcomes found for this game/market.',
  })
}
