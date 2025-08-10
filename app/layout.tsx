import './globals.css'
import Link from 'next/link'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Gridiron Edge – NFL Matchups',
  description: 'Daily NFL player vs defense matchup scores for bettors and DFS players.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-800 sticky top-0 z-40 backdrop-blur bg-[color:var(--bg)]/80">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="font-semibold">Gridiron Edge</Link>
            <nav className="flex gap-6 text-sm text-slate-300">
              <Link href="/">Today</Link>
              <Link href="/players">Comparator</Link>
              <Link href="/about">About</Link>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
        <footer className="container py-10 text-xs text-slate-400">
          <p>
            For informational/entertainment purposes only. Not betting advice. 21+ gamble responsibly.
          </p>
        </footer>
      </body>
    </html>
  )
}
