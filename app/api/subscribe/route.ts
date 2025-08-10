import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok:false, error:'invalid_email' }, { status: 400 })
    }
    const file = path.join(process.cwd(), 'sql', 'waitlist.csv')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const row = `${new Date().toISOString()},${JSON.stringify(email)}\n`
    fs.appendFileSync(file, row, 'utf8')
    return NextResponse.json({ ok:true })
  } catch {
    return NextResponse.json({ ok:false, error:'server_error' }, { status: 500 })
  }
}
