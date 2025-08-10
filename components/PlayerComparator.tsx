'use client'
import { useEffect, useState } from 'react'
import ScorePill from './ScorePill'

type GameRow = {
  eventId: string
  kickoff: string
  home: { abbr: string; name: string }
  away: { abbr: string; name: string }
}
type GamesResp = { games: GameRow[] }

type PlayerRow = {
  player: string
  teamContext: string
  market: string
  avgLine: number
  bestLine: number
  bestBook: string
  score: number
  valueType?: 'line' | 'price'
}
type PlayersResp = {
  event?: {
    id: string
    matchup: string
    kickoff: string
    total: number | null
    passDefRankAvg: number
    rushDefRankAvg: number
  }
  players: PlayerRow[]
  markets?: string[]
  selectedMarket?: string | null
  book?: string
  availableMarkets?: string[]
  error?: string
  note?: string
}

// labels
const LABEL: Record<string, string> = {
  player_anytime_td: 'Anytime TD',
  player_1st_td: '1st TD',
  player_last_td: 'Last TD',
  player_pass_yds: 'Pass Yds',
  player_pass_tds: 'Pass TDs',
  player_pass_attempts: 'Pass Att',
  player_pass_completions: 'Pass Comp',
  player_pass_interceptions: 'Pass INTs',
  player_rush_yds: 'Rush Yds',
  player_rush_attempts: 'Rush Att',
  player_reception_yds: 'Rec Yds',
  player_receptions: 'Receptions',
  player_field_goals: 'FG Made',
  player_sacks: 'Sacks',
  player_solo_tackles: 'Solo Tackles',
  player_tackles_assists: 'Tackles+Ast',
}

const DEFAULT_MARKET = 'player_anytime_td'
const BOOKS = [
  { key: 'all',        label: 'All books' },
  { key: 'draftkings', label: 'DraftKings' },
  { key: 'fanduel',    label: 'FanDuel' },
  { key: 'betmgm',     label: 'BetMGM' },
]

export default function PlayerComparator() {
  const [games, setGames] = useState<GameRow[]>([])
  const [eventId, setEventId] = useState<string>('')
  const [market, setMarket] = useState<string>(DEFAULT_MARKET)
  const [book, setBook] = useState<string>('draftkings') // DK first for preseason
  const [data, setData] = useState<PlayersResp | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/games?mode=preseason')
      .then(r => r.json())
      .then((d: GamesResp) => {
        const gs = Array.isArray(d.games) ? d.games : []
        setGames(gs)
        if (gs.length) setEventId(gs[0].eventId)
      })
      .catch(() => setGames([]))
  }, [])

  useEffect(() => {
    if (!eventId) return
    setLoading(true)
    setData(null)
    fetch(
      `/api/players?mode=preseason&eventId=${encodeURIComponent(eventId)}&market=${encodeURIComponent(
        market
      )}&book=${encodeURIComponent(book)}`
    )
      .then(r => r.json())
      .then((d: PlayersResp) => setData(d))
      .catch(e => setData({ players: [], error: String(e) }))
      .finally(() => setLoading(false))
  }, [eventId, market, book])

  const gameLabel = (g: GameRow) =>
    `${g.away.abbr} @ ${g.home.abbr} — ${new Date(g.kickoff).toLocaleString()}`

  // show + sign for positive American odds
  const fmtVal = (row: PlayerRow, v: number) =>
    row.valueType === 'price' ? (v > 0 ? `+${v}` : `${v}`) : v.toFixed(1)

  return (
    <div className="space-y-4">
      {/* Market tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(LABEL).map(k => (
          <button
            key={k}
            className={`px-3 py-1 rounded-md border ${
              market === k
                ? 'bg-slate-200 text-slate-900 border-slate-300'
                : 'bg-slate-800 text-slate-200 border-slate-700'
            }`}
            onClick={() => setMarket(k)}
          >
            {LABEL[k]}
          </button>
        ))}
      </div>

      {/* Book picker */}
      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-300">Book</div>
        <select
          className="bg-white text-slate-900 border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={book}
          onChange={e => setBook(e.target.value)}
        >
          {BOOKS.map(b => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      {/* Game picker */}
      <div className="card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-300">Choose game</div>
        <select
          className="bg-white text-slate-900 border border-slate-300 rounded-md px-3 py-2 text-sm w-full md:w-[640px]"
          value={eventId}
          onChange={e => setEventId(e.target.value)}
        >
          {games.map(g => (
            <option key={g.eventId} value={g.eventId}>
              {gameLabel(g)}
            </option>
          ))}
          {!games.length && <option value="">(no games in this window yet)</option>}
        </select>
      </div>

      {/* Loading / errors */}
      {loading && <div className="text-slate-300">Loading props…</div>}
      {data?.error && <div className="card p-4 text-sm">Couldn’t load players: {data.error}</div>}

      {/* Empty state + suggestions */}
      {!loading && (!data || !data.players?.length) && (
        <div className="card p-4 text-sm space-y-3">
          <div>
            No {LABEL[market] ?? market} props for this game yet ({book}).
          </div>

          {!!data?.availableMarkets?.length && (
            <div>
              <div className="text-slate-300 mb-1">Props found for this game:</div>
              <div className="flex flex-wrap gap-2">
                {data.availableMarkets.map(m => (
                  <button
                    key={m}
                    className="px-3 py-1 rounded-md border bg-slate-800 text-slate-200 border-slate-700"
                    onClick={() => setMarket(m)}
                  >
                    {LABEL[m] ?? m}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              className="btn"
              onClick={() => {
                setLoading(true)
                fetch(
                  `/api/players?mode=preseason&findAnyWithProps=true&market=${encodeURIComponent(
                    market
                  )}&book=${encodeURIComponent(book)}`
                )
                  .then(r => r.json())
                  .then((d: PlayersResp) => setData(d))
                  .finally(() => setLoading(false))
              }}
            >
              Find a game with props
            </button>
          </div>
        </div>
      )}

      {/* Players list */}
      {data?.players?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.players.map((p, i) => (
            <div key={p.player + p.market + i} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="h2">{p.player}</div>
                <ScorePill score={p.score} />
              </div>

              <div className="mt-2 text-sm grid grid-cols-4 gap-2">
                <div>
                  <div className="text-slate-300">Market</div>
                  <div className="font-mono">{LABEL[p.market] ?? p.market}</div>
                </div>
                <div>
                  <div className="text-slate-300">{p.valueType === 'price' ? 'Avg price' : 'Avg line'}</div>
                  <div className="font-mono">{fmtVal(p, p.avgLine)}</div>
                </div>
                <div>
                  <div className="text-slate-300">{p.valueType === 'price' ? 'Best price' : 'Best line'}</div>
                  <div className="font-mono">{fmtVal(p, p.bestLine)}</div>
                </div>
                <div>
                  <div className="text-slate-300">Book</div>
                  <div className="font-mono truncate">{p.bestBook}</div>
                </div>
              </div>

              {data.event && (
                <div className="mt-2 text-xs text-slate-400">
                  {data.event.total ? <>Total {data.event.total} • </> : null}
                  {/pass|reception/.test(p.market)
                    ? <>Pass D rank (avg): {data.event.passDefRankAvg}</>
                    : <>Rush D rank (avg): {data.event.rushDefRankAvg}</>}
                </div>
              )}

              <div className="mt-2 text-xs text-slate-400">{p.teamContext}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
