import { createHmac, timingSafeEqual } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { listen } from './webhook.ts'
import { log } from '../runtime/log.ts'

const MAX_BODY = 1 << 20

export function signed(secret: string, ts: string | undefined, sig: string | undefined, body: string, now = Date.now()) {
  if (!ts || !sig || !/^\d+$/.test(ts) || Math.abs(now / 1000 - Number(ts)) > 300) return false
  const want = Buffer.from(`v0=${createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')}`)
  const got = Buffer.from(sig)
  return got.length === want.length && timingSafeEqual(got, want)
}

export class SlackEvents extends EventEmitter {
  private server?: ReturnType<typeof listen>
  private o: { signingSecret: string; port: number; host?: string }
  constructor(o: { signingSecret: string; port: number; host?: string }) { super(); this.o = o }

  start() {
    if (this.server) return Promise.resolve()
    this.server = listen((req, res) => {
      const reply = (code: number, body?: unknown) => {
        if (res.headersSent) return
        res.writeHead(code, { 'content-type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body))
      }
      if (req.method !== 'POST') return reply(405)
      let raw = '', size = 0
      req.on('data', (d: Buffer) => { size += d.length; if (size > MAX_BODY) { reply(413); req.destroy() } else raw += d })
      req.on('end', () => {
        if (!signed(this.o.signingSecret, req.headers['x-slack-request-timestamp'] as string, req.headers['x-slack-signature'] as string, raw)) return reply(401)
        let body: Record<string, unknown>
        try { body = String(req.headers['content-type']).startsWith('application/x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(raw)) : JSON.parse(raw) } catch { return reply(400) }
        if (body.type === 'url_verification') return reply(200, { challenge: body.challenge })
        const ack = async (response?: unknown) => reply(200, response)
        const type = body.command ? 'slash_commands' : body.type === 'event_callback' ? String((body.event as { type?: string })?.type) : ''
        if (!type || !this.listenerCount(type)) return reply(200)
        this.emit(type, { event: body.event, body, ack, retry_num: Number(req.headers['x-slack-retry-num'] ?? 0) })
      })
    }, this.o.port, this.o.host)
    return this.server.listening.then(() => { log(`slack events on port ${this.o.port}`); this.emit('connected') })
  }

  disconnect() {
    const s = this.server; this.server = undefined
    s?.close()
    return Promise.resolve()
  }
}
