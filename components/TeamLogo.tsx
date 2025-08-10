'use client'

const TEAM_COLORS: Record<string, string> = {
  ARI: '#97233F', ATL: '#A71930', BAL: '#241773', BUF: '#00338D',
  CAR: '#0085CA', CHI: '#C83803', // brighter Bears orange for contrast
  CIN: '#FB4F14', CLE: '#311D00',
  DAL: '#003594', DEN: '#FB4F14', DET: '#0076B6', GB: '#203731',
  HOU: '#03202F', IND: '#002C5F', JAX: '#006778', KC: '#E31837',
  LV: '#000000', LAC: '#0080C6', LAR: '#003594', MIA: '#00B2A9',
  MIN: '#4F2683', NE: '#002244', NO: '#D3BC8D', NYG: '#0B2265',
  NYJ: '#125740', PHI: '#004C54', PIT: '#FFB612', SF: '#AA0000',
  SEA: '#002244', TB: '#D50A0A', TEN: '#4B92DB', WAS: '#5A1414',
}

type Props = { abbr: string; size?: number; title?: string }

export default function TeamLogo({ abbr, size = 28, title }: Props) {
  const key = (abbr || '').toUpperCase().trim()         // ← robust key
  const color = TEAM_COLORS[key] ?? '#6b7280'           // gray fallback
  const style: React.CSSProperties = {
    width: size, height: size, background: color, borderRadius: 9999,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 11, color: 'white', letterSpacing: 0.5,
  }
  return (
    <span title={title} style={style} aria-label={key}>
      {key}
    </span>
  )
}

