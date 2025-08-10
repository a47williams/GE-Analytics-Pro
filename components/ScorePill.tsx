export default function ScorePill({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-green-600/30 text-green-300' :
    score >= 60 ? 'bg-emerald-600/20 text-emerald-200' :
    score >= 45 ? 'bg-yellow-600/20 text-yellow-200' :
    score >= 30 ? 'bg-orange-600/20 text-orange-200' :
    'bg-red-600/20 text-red-200'
  return <span className={`badge ${color}`}>{Math.round(score)}</span>
}
