'use client'
import { useEffect, useState } from 'react'
import ScorePill from '../../components/ScorePill'

type Row = {
  player: string
  market: string
  avgLine: number
  bestLine: number
  bestBook: string
  score: number
  total: number | null
  passDefRankAvg: number
  rushDefRankAvg: number
  matchup: string
  kickoff: string
}
type TopResp = { top: Row[]; market: string; book: string }

const LABEL: Record<string, string> = {
  player_reception_yds: 'Rec Yds',
  player_rush_yds: 'Rush Yds',
  player_receptions: 'Receptions',
  player_pass_yds: 'Pass Yds',
}
const MARKETS = Object.keys(LABEL)
const BOOKS = [
  { key: 'all',        label: 'All books' },
  { key: 'draftkings', label: 'DraftKings' },
  { key: 'fanduel',    label: 'FanDuel' },
  { key: 'betmgm',     label: 'BetMGM' },
]

export default function TopPage() {
  const [market, setMarket] = useState<string>('player_reception_yds')
  const [book, setBook] = useState<string>('all')
  const [data, setData] = useState<TopResp | null>(null)
  const [loading, setLoading] = useState(false)

  function load() {
    setLoading(true)
    setData(null)
    fetch(`/api/top?market=${encodeURIComponent(market)}&book=${encodeURIComponent(book)}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [market, book])

  return (
    <div className="space-y-6">
      <h1 className="h1">Top 10 props this week</h1>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {MARKETS.map(m => (
            <button
              key={m}
              className={`px-3 py-1 rounded-md border ${market === m
                ? 'bg-slate-200 text-slate-900 border-slate-300'
                : 'bg-slate-800 text-slate-200 border-slate-700'}`}
              onClick={() => setMarket(m)}
            >
              {LABEL[m]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-300">Book</div>
          <select
            className="bg-white text-slate-900 border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={book}
            onChange={e => setBook(e.target.value)}
          >
            {BOOKS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="text-slate-300">Loading…</div>}

      {data?.top?.length ? (
        <div className="grid gap-4">
          {data.top.map((r, i) => (
            <div key={r.player + r.market + i} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="h2">{i + 1}. {r.player}</div>
                <ScorePill score={r.score} />
              </div>

              <div className="mt-2 text-sm grid grid-cols-6 gap-2">
                <div>
                  <div className="text-slate-300">Market</div>
                  <div className="font-mono">{LABEL[r.market] ?? r.market}</div>
                </div>
                <div>
                  <div className="text-slate-300">Avg</div>
                  <div className="font-mono">{r.avgLine}</div>
                </div>
                <div>
                  <div className="text-slate-300">Best</div>
                  <div className="font-mono">{r.bestLine}</div>
                </div>
                <div>
                  <div className="text-slate-300">Book</div>
                  <div className="font-mono truncate">{r.bestBook}</div>
                </div>
                <div>
                  <div className="text-slate-300">Game</div>
                  <div className="font-mono truncate">{r.matchup}</div>
                </div>
                <div>
                  <div className="text-slate-300">Kickoff</div>
                  <div className="font-mono">{new Date(r.kickoff).toLocaleString()}</div>
                </div>
              </div>

              <div className="mt-2 text-xs text-slate-400">
                {r.total ? <>Total {r.total} • </> : null}
                {/pass|reception/.test(r.market)
                  ? <>Pass D rank (avg): {r.passDefRankAvg}</>
                  : <>Rush D rank (avg): {r.rushDefRankAvg}</>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && <div className="text-slate-300">No props found yet. Try switching market/book.</div>
      )}
    </div>
  )
}
