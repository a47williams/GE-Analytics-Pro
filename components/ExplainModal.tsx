'use client'

type Entry = { book: string; player: string; line: number | null; price: number | null }
type ExplainPrice = {
  kind: 'price'
  formula: string
  avgPrice: number
  impliedProb: number
  baseScore: number
  bestPrice: number | null
  bestBook: string | null
  totalContext: number | null
}
type ExplainLine = {
  kind: 'line'
  formula: string
  repLine: number
  cap: number
  baseScore: number
  bestLine: number | null
  bestBook: string | null
  totalContext: number | null
}
type Explain = ExplainPrice | ExplainLine

type Row = {
  player: string
  market: string | null
  score: number
  valueType: 'line' | 'price'
  sources: Entry[]
  explain: Explain
}

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

export default function ExplainModal({ row, onClose }: { row: Row; onClose: () => void }) {
  if (!row) return null
  const mlabel = PRETTY[row.market ?? ''] ?? row.market ?? ''

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-x-0 top-12 mx-auto max-w-2xl p-4">
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-400">Why this score?</div>
              <h2 className="h2">{row.player} — {mlabel}</h2>
            </div>
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div><span className="label">Score</span> <span className="ml-2 font-medium">{row.score}</span></div>
            <div><span className="label">Formula</span> <span className="ml-2">{row.explain.formula}</span></div>

            {row.explain.kind === 'price' ? (
              <>
                <div><span className="label">Average price</span> <span className="ml-2">{row.explain.avgPrice}</span></div>
                <div><span className="label">Implied probability</span> <span className="ml-2">{row.explain.impliedProb}%</span></div>
                {row.explain.bestPrice !== null && (
                  <div><span className="label">Best price</span> <span className="ml-2">{row.explain.bestPrice} at {row.explain.bestBook ?? '—'}</span></div>
                )}
              </>
            ) : (
              <>
                <div><span className="label">Representative line</span> <span className="ml-2">{row.explain.repLine}</span></div>
                <div><span className="label">Cap</span> <span className="ml-2">{row.explain.cap}</span></div>
              </>
            )}

            {row.explain.totalContext !== null && (
              <div><span className="label">Game total (context)</span> <span className="ml-2">{row.explain.totalContext}</span></div>
            )}
          </div>

          <div className="mt-6">
            <div className="label mb-2">Book lines/prices used</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/40">
                  <tr>
                    <th className="text-left p-2">Book</th>
                    <th className="text-right p-2">Line</th>
                    <th className="text-right p-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {row.sources.map((s, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="p-2">{s.book}</td>
                      <td className="p-2 text-right">{s.line ?? '—'}</td>
                      <td className="p-2 text-right">{s.price ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Notes: For alternate lines we pick the line closest to even money to represent “typical usage”. Scores are a simple,
              transparent scale (0–100) to compare options, not predictions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
