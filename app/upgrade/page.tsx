'use client'

import { useState } from 'react'

export default function UpgradePage(){
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle'|'sending'|'ok'|'err'>('idle')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('sending')
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email })
      })
      if (!r.ok) throw new Error('bad')
      setStatus('ok')
      setEmail('')
    } catch {
      setStatus('err')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="h1">Upgrade to Pro</h1>
      <div className="card p-5 space-y-4">
        <p>Unlock real-time player props, more markets, and faster refresh windows.</p>
        <ul className="list-disc pl-6 text-slate-300 text-sm">
          <li>Live player props (Anytime TD, alt yards, receptions, and more)</li>
          <li>Multiple books + regions</li>
          <li>Faster refresh & deeper history</li>
        </ul>
        <div className="pt-2">
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              className="input flex-1"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              required
            />
            <button className="btn" disabled={status==='sending'}>
              {status==='sending' ? 'Adding…' : 'Join waitlist'}
            </button>
          </form>
          {status==='ok' && <div className="text-emerald-400 text-sm mt-2">You’re on the list — thanks!</div>}
          {status==='err' && <div className="text-red-400 text-sm mt-2">Something went wrong. Try again.</div>}
          <div className="text-xs text-slate-500 mt-2">We’ll email you when Pro is ready.</div>
        </div>
      </div>
    </div>
  )
}
