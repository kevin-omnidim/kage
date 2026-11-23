import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { log } from '../runtime/log.ts'
import type { connectSlack } from './slack/connect.ts'

export function offlineSlack(name: string, dir: string) {
  const slack = {
    ids: { owner: '', bot: '', botDm: '', name, teammates: [] as string[] },
    ownerName: 'the owner', botUser: name, socket: undefined, afk: undefined,
    notifyOwner: async (text: string) => {
      try { mkdirSync(join(dir, 'web'), { recursive: true, mode: 0o700 }); appendFileSync(join(dir, 'web', 'notices.jsonl'), JSON.stringify({ text: text.slice(0, 4000), at: Date.now() }) + '\n', { mode: 0o600 }); return true }
      catch (e) { log('could not keep a note for the owner', e); return false }
    },
    failed: () => {}, placeOf: async (chat: string) => chat, nameOf: async (id: string) => id,
    replay: async () => undefined, allow: () => {}, start: async () => {},
  }
  return slack as unknown as Awaited<ReturnType<typeof connectSlack>>
}
