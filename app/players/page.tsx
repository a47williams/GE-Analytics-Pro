'use client'

import { useEffect, useMemo, useState } from 'react'

// ----- tiny types (kept loose so TS doesn't yell) -----
type Game = {
  eventId: string
  kickoff: string
  home: { abbr: string }
  away: { abbr: string }
}
type Row = {
  player: string
  market: string | null
  avgLine: number | null
  avgPrice: number | null
  bestLine: number | null
  bestPrice: number | null
  bestBook: string | null
  score: number
}
type PlayersResp = {
  eventId: string
  market: string | null
  propsAvailable: boolean
  players: Row[]
  note?: string
  proRequired?: boolean
  reason?: string
}
type FinderResp =
  | { found: true; mode: 'preseason' | 'week1'; event: { id: string; kickoff: string; away: string; home: string }; marketKeys: string[] }
  | { found: false; note?: string }

// pretty names for markets
const PRETTY: Record<string, string> = {
  player_anytime_td: 'Anytime TD',
  player_1st_td: 'First TD',
  player_last_td: 'Last TD',
  player_pass_yds: 'Pass Yds',
  player_pass_yds_alternate: 'Pass Yds (Alt)',
  player_rush_yds: 'Rush Yds',
  player_rush_yds_alternate: 'Rush Yds (Alt)',
  player_reception_yds: 'Rec Yds',
  player_reception_yds_alternate: 'Rec Yds (Alt)',
  player_receptions: 'Receptions',
}
const PRICE_MARKETS = new Set(['player_anytime_td', 'player_1st_td', 'player_last_td'])
const DEFAULT_MARKETS = [
  'player_anytime_td',
  'player_rush_yds_alternate',
  'player_reception_yds_alternate',
  'player_pass_yds_alternate',
  'player_receptions',
]

export default function PlayersPage() {
  // choices
  const [windowSel, setWindowSel] = useState<'week1' | 'preseason'>('preseason')
  const [games, setGames] = useState<Game[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')

  const [mode, setMode] = useState<'' | 'preseason'>('preseason')
  const [market, setMarket] = useState<string>('player_anytime_td')

  const [marketOptions, setMarketOptions] = useState<string[]>(DEFAULT_MARKETS)
  const [bookFilter, setBookFilter] = useState<'all' | 'draftkings' | 'fanduel' | 'betmgm'>('all')

  // ui state
  const [loadingGames, setLoadingGames] = useState(false)
  const [loadingProps, setLoadingProps] = useState(false)
  const [loadingFind, setLoadingFind] = useState(false)
  const [data, setData] = useState<PlayersResp | null>(null)
  const [error, setError] = useState<string | null>(null)

  // load games into dropdown
  async function loadGames(win: 'week1' | 'preseason') {
    setLoadingGames(true); setError(null); setData(null)
    try {
      const r = await fetch(win === 'preseason' ? '/api/games?mode=preseason' : '/api/games', { cache: 'no-store' })
      const j = await r.json()
      const gs: Game[] = Array.isArray(j.games) ? j.games : []
      setGames(gs)
      const first = gs[0]
      setSelectedEventId(first ? first.eventId : '')
      setMode(win === 'preseason' ? 'preseason' : '')
    } catch (e: any) {
      setError(String(e.message || e))
    } finally {
      setLoadingGames(false)
    }
  }

  // load props for current selection
  async function loadProps() {
    if (!selectedEventId || !market) return
    setLoadingProps(true); setError(null)
    setData({ eventId: selectedEventId, market, propsAvailable: false, players: [], note: 'Loading…' })
    try {
      const params = new URLSearchParams()
      params.set('eventId', selectedEventId)
      params.set('market', market)
      if (mode === 'preseason') params.set('mode', 'preseason')
      if (bookFilter !== 'all') params.set('books', bookFilter)
      params.set('regions', 'us,us2')

      const r = await fetch(`/api/players?${params}`, { cache: 'no-store' })
      const json: PlayersResp = await r.json()

      if (json.proRequired) {
        // out of credits / not authorized → show premium message + preview
        setData(json)
        return
      }
      if (r.ok && (!json.propsAvailable || (json.players?.length ?? 0) === 0)) {
        setData({ eventId: selectedEventId, market, propsAvailable: false, players: [], note: 'No props posted yet for this game/market.' })
        return
      }
      if (!r.ok) throw new Error(json?.note || `HTTP_${r.status}`)
      setData(json)
    } catch (e: any) {
      setError(String(e.message || e))
      setData({ eventId: selectedEventId, market, propsAvailable: false, players: [], note: 'Could not load props for this game.' })
    } finally {
      setLoadingProps(false)
    }
  }

  // optional helper: auto-find a game that actually has props
  async function findPropsGame() {
    setLoadingFind(true); setError(null)
    try {
      const r = await fetch('/api/find-props', { cache: 'no-store' })
      const json: FinderResp = await r.json()
      if (!('found' in json) || !json.found) { setError(json?.note || 'No props found yet.'); return }
      const isPre = json.mode === 'preseason'
      setWindowSel(isPre ? 'preseason' : 'week1')
      setMode(isPre ? 'preseason' : '')
      setSelectedEventId(json.event.id)
      const opts = json.marketKeys.length ? json.marketKeys : DEFAULT_MARKETS
      setMarketOptions(opts)
      const pick = opts.includes('player_anytime_td') ? 'player_anytime_td' : (opts.find(k => k.endsWith('_alternate')) || opts[0])!
      setMarket(pick)
      await loadProps()
    } catch (e: any) {
      setError(String(e.message || e))
    } finally {
      setLoadingFind(false)
    }
  }

  // first load
  useEffect(() => { loadGames(windowSel) }, [windowSel])

  const valueType = useMemo<'line' | 'price' | null>(() => (
    market ? (PRICE_MARKETS.has(market) ? 'price' : 'line') : null
  ), [market])

  return (
    <div className="space-y-6">
      <h1 className="h1">Player Props</h1>

      {/* Controls card */}
      <div className="card p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-12 items-end">
          <div className="md:col-span-3">
            <div className="label mb-1">Quick start</div>
            <button onClick={findPropsGame} className="btn w-full" disabled={loadingFind}>
              {loadingFind ? 'Finding…' : 'Find props now'}
            </button>
          </div>

          <div className="md:col-span-3">
            <div className="label mb-1">Window</div>
            <select className="input" value={windowSel} onChange={e => setWindowSel(e.target.value as any)}>
              <option value="week1">Week 1</option>
              <option value="preseason">Preseason (upcoming)</option>
            </select>
          </div>

          <div className="md:col-span-6">
            <div className="label mb-1">Choose game</div>
            <select
              className="input"
              value={selectedEventId}
              onChange={(e) => { setSelectedEventId(e.target.value); setData(null); setError(null) }}
              disabled={loadingGames || games.length === 0}
            >
              {loadingGames && <option>Loading…</option>}
              {!loadingGames && games.length === 0 && <option>No games</option>}
              {!loadingGames && games.map(g => (
                <option key={g.eventId} value={g.eventId}>
                  {g.away.abbr} @ {g.home.abbr} — {new Date(g.kickoff).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <div className="label mb-1">Market</div>
            <select className="input" value={market} onChange={e => setMarket(e.target.value)}>
              <option value="" disabled>Choose a market…</option>
              {marketOptions.map(k => <option key={k} value={k}>{PRETTY[k] ?? k}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="label mb-1">Books</div>
            <select className="input" value={bookFilter} onChange={e => setBookFilter(e.target.value as any)}>
              <option value="all">All</option>
              <option value="draftkings">DraftKings</option>
              <option value="fanduel">FanDuel</option>
              <option value="betmgm">BetMGM</option>
            </select>
          </div>

          <div className="md:col-span-12">
            <button onClick={loadProps} className="btn" disabled={!selectedEventId || !market || loadingProps}>
              {loadingProps ? 'Loading…' : 'Load props'}
            </button>
          </div>
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}
        {!error && data?.note && !data?.proRequired && <div className="text-sm text-slate-400">{data.note}</div>}
        {data?.proRequired && (
          <div className="card p-3 border-emerald-700/40 bg-emerald-900/10">
            <div className="text-slate-200">Live player props are a <strong>Pro</strong> feature.</div>
            <div className="text-slate-400 text-xs">{data.note || 'Preview below. Upgrade to unlock.'}</div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/70 backdrop-blur-sm">
              <tr className="text-slate-300">
                <th className="text-left p-3">Player</th>
                <th className="text-left p-3">Market</th>
                <th className="text-right p-3">{valueType === 'price' ? 'Avg Price' : 'Avg Line'}</th>
                <th className="text-right p-3">{valueType === 'price' ? 'Best Price' : 'Best Line'}</th>
                <th className="text-left p-3">Best Book</th>
                <th className="text-right p-3">Score</th>
              </tr>
            </thead>
            <tbody className={data?.proRequired ? 'blur-[2px] select-none' : ''}>
              {loadingProps && [...Array(6)].map((_, i) => (
                <tr key={i} className="border-t border-slate-800">
                  <td className="p-3"><div className="skeleton h-4 w-44" /></td>
                  <td className="p-3"><div className="skeleton h-4 w-28" /></td>
                  <td className="p-3 text-right"><div className="skeleton h-4 w-16 ml-auto" /></td>
                  <td className="p-3 text-right"><div className="skeleton h-4 w-16 ml-auto" /></td>
                  <td className="p-3"><div className="skeleton h-4 w-20" /></td>
                  <td className="p-3 text-right"><div className="skeleton h-4 w-12 ml-auto" /></td>
                </tr>
              ))}

              {!loadingProps && data?.players?.length
                ? data.players.map((p, idx) => (
                    <tr key={`${p.player}-${p.market}-${idx}`} className="border-t border-slate-800 hover:bg-slate-900/40">
                      <td className="p-3">{p.player}</td>
                      <td className="p-3">{PRETTY[p.market ?? ''] ?? p.market}</td>
                      <td className="p-3 text-right">{(p.avgLine ?? p.avgPrice) ?? '—'}</td>
                      <td className="p-3 text-right">{(p.bestLine ?? p.bestPrice) ?? '—'}</td>
                      <td className="p-3">{p.bestBook ?? '—'}</td>
                      <td className="p-3 text-right">
                        <div className="inline-block min-w-[72px]">
                          <div className="h-2 bg-slate-800 rounded">
                            <div
                              className="h-2 rounded"
                              style={{ width: `${p.score}%`, background: p.score >= 67 ? '#16a34a' : p.score >= 40 ? '#f59e0b' : '#ef4444' }}
                            />
                          </div>
                          <div className="text-xs text-slate-400 mt-1 text-right">{p.score}</div>
                        </div>
                      </td>
                    </tr>
                  ))
                : (!loadingProps && (
                    <tr><td className="p-6 text-sm text-slate-400" colSpan={6}>
                      {selectedEventId && market ? 'No props posted yet for this game/market.' : 'Pick a game + market, or click “Find props now”.'}
                    </td></tr>
                  ))
              }
            </tbody>
          </table>
        </div>
        {data?.proRequired && <div className="p-3 text-center text-xs text-slate-400">Preview shown — Upgrade to unlock live props</div>}
      </div>

      <p className="text-xs text-slate-500">
        For informational/entertainment purposes only. Not betting advice. 21+ gamble responsibly.
      </p>
    </div>
  )
}
