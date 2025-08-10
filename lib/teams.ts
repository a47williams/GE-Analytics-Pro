// lib/teams.ts
export const TEAM_ABBR: Record<string, string> = {
  'Arizona Cardinals': 'ARI','Atlanta Falcons': 'ATL','Baltimore Ravens': 'BAL','Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR','Chicago Bears': 'CHI','Cincinnati Bengals': 'CIN','Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL','Denver Broncos': 'DEN','Detroit Lions': 'DET','Green Bay Packers': 'GB',
  'Houston Texans': 'HOU','Indianapolis Colts': 'IND','Jacksonville Jaguars': 'JAX','Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV','Los Angeles Chargers': 'LAC','Los Angeles Rams': 'LAR','Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN','New England Patriots': 'NE','New Orleans Saints': 'NO','New York Giants': 'NYG',
  'New York Jets': 'NYJ','Philadelphia Eagles': 'PHI','Pittsburgh Steelers': 'PIT','San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA','Tampa Bay Buccaneers': 'TB','Tennessee Titans': 'TEN','Washington Commanders': 'WAS',
}

export type DefenseRanks = {
  // 1 = toughest defense, 32 = softest defense
  pass: number
  rush: number
}

/**
 * DEFENSE_RANKS
 * Start neutral (16 everywhere). Later, paste real ranks (1..32) per team.
 * Example when you have data:
 *   MIN: { pass: 24, rush: 10 }, PHI: { pass: 31, rush: 6 }, ...
 */
export const DEFENSE_RANKS: Record<string, DefenseRanks> = Object.fromEntries(
  Object.values(TEAM_ABBR).map((abbr) => [abbr, { pass: 16, rush: 16 }])
)
