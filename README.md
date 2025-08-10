# Gridiron Edge – NFL Matchups (Starter)

A minimal **Next.js + TypeScript + Tailwind** project that scores daily NFL **player vs defense** matchups (0–100) and shows the components behind the score. Uses **mock data** for now so you can run it instantly.

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

## What’s inside

- **/app** – App Router pages:
  - `/` Today’s Games (mock odds/implied totals)
  - `/players` Player Comparator (scores + breakdown)
  - `/about` Scoring methodology
- **/app/api** – API routes returning mock games and players.
- **/lib/scoring.ts** – Transparent scoring function and weights.
- **/sql/schema.sql** – Postgres schema (optional, for real data later).

## Connect real data (later)

1. **Odds & schedule:** The Odds API (free tier) → compute implied totals; store in `odds` table.  
2. **Performance/roles:** Use `nflfastR` historical data to derive defense vs pos and baseline/trend stats.  
3. **Injuries/depth (optional):** SportsDataIO / Sportradar feeds.

You can adapt the `/app/api/*` routes to fetch from your DB instead of mock JSON.

## Environment

Create `.env.local` when you add APIs (placeholders in `.env.example`).

## License

MIT – ship it!
