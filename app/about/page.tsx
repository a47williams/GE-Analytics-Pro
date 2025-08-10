export default function AboutPage() {
  return (
    <div className="space-y-6">
      <h1 className="h1">About</h1>

      <div className="card p-5 space-y-3">
        <h2 className="h2">How the score works (0–100)</h2>
        <p className="text-slate-200">
          The score is for the <strong>player</strong>. <strong>Higher is better.</strong>
          <br />
          • <strong>100</strong> = dream spot (great usage/line) &nbsp;•&nbsp; <strong>50</strong> = average &nbsp;•&nbsp; <strong>0</strong> = avoid
        </p>

        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="card p-4">
            <div className="font-semibold mb-1">Quick legend</div>
            <ul className="space-y-1">
              <li><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" />90–100: Smash / top target</li>
              <li><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />75–89: Strong play</li>
              <li><span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-2" />60–74: Solid / fringe</li>
              <li><span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-2" />40–59: Meh / matchup dependent</li>
              <li><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2" />0–39: Tough spot / fade</li>
            </ul>
          </div>

          <div className="card p-4">
            <div className="font-semibold mb-1">What’s in the score today</div>
            <p className="text-slate-300">
              Right now we normalize from posted player prop lines (bigger line → larger score).
              Next up we’ll blend in defense-vs-position and recent trend.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          For informational/entertainment purposes only. Not betting advice. 21+ gamble responsibly.
        </p>
      </div>
    </div>
  )
}

