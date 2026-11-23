import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { after, test } from 'node:test'
import { SlackEvents, signed } from '../slack-http.ts'

const SECRET = 'test-signing-secret', port = 18000 + Math.floor(Math.random() * 1000)
const ev = new SlackEvents({ signingSecret: SECRET, port })
after(() => ev.disconnect())
const post = (body: string, o: { ts?: number; secret?: string; type?: string } = {}) => {
  const ts = String(o.ts ?? Math.floor(Date.now() / 1000))
  const sig = `v0=${createHmac('sha256', o.secret ?? SECRET).update(`v0:${ts}:${body}`).digest('hex')}`
  return fetch(`http://127.0.0.1:${port}/slack/events`, { method: 'POST', body, headers: { 'content-type': o.type ?? 'application/json', 'x-slack-request-timestamp': ts, 'x-slack-signature': sig } })
}

test('a signature from another secret, an old timestamp or none is refused', () => {
  const now = Date.now(), ts = String(Math.floor(now / 1000)), sig = `v0=${createHmac('sha256', SECRET).update(`v0:${ts}:x`).digest('hex')}`
  assert.equal(signed(SECRET, ts, sig, 'x', now), true)
  assert.equal(signed(SECRET, ts, sig, 'y', now), false)
  assert.equal(signed('other', ts, sig, 'x', now), false)
  assert.equal(signed(SECRET, ts, sig, 'x', now + 301_000), false)
  assert.equal(signed(SECRET, undefined, sig, 'x', now), false)
})

test('events reach the listener, which acks; url_verification is answered; bad signatures never reach a listener', async () => {
  let connected = false; ev.on('connected', () => { connected = true })
  const heard: unknown[] = []
  ev.on('message', async ({ event, ack }) => { heard.push(event); await ack() })
  ev.on('slash_commands', async ({ body, ack }) => { await ack({ text: `got ${body.command}` }) })
  await ev.start()
  assert.ok(connected)
  assert.deepEqual(await (await post(JSON.stringify({ type: 'url_verification', challenge: 'abc' }))).json(), { challenge: 'abc' })
  assert.equal((await post(JSON.stringify({ type: 'event_callback', event: { type: 'message', text: 'hi' } }))).status, 200)
  assert.deepEqual(heard, [{ type: 'message', text: 'hi' }])
  assert.equal((await post(JSON.stringify({ type: 'event_callback', event: { type: 'message', text: 'evil' } }), { secret: 'wrong' })).status, 401)
  assert.equal((await post(JSON.stringify({ type: 'event_callback', event: { type: 'message', text: 'old' } }), { ts: Math.floor(Date.now() / 1000) - 600 })).status, 401)
  assert.equal(heard.length, 1)
  assert.equal((await post(JSON.stringify({ type: 'event_callback', event: { type: 'reaction_added' } }))).status, 200)
  assert.deepEqual(await (await post('command=%2Flookup&text=1', { type: 'application/x-www-form-urlencoded' })).json(), { text: 'got /lookup' })
})
