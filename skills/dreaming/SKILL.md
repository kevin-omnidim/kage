---
name: dreaming
description: Use when the owner asks you to dream, run the dream now, do your dreaming, learn from today, or asks why a nightly dream did not run or what the dream does.
---

The dream is Kage's nightly review: it reads the threads that moved since the last dream, sends lessons through `dream_lessons` (the hub keeps only the ones its checks pass), tidies your memory, and runs any extra steps the owner's instructions add.

1. To dream now, the owner writes `dream` (or `dream now`) to you on its own. The hub starts the real dream at once, at any hour, with every step. Do not run the steps yourself in a normal thread: there `dream_lessons` does not exist, so the lessons step is lost. Tell the owner to send `dream`.
2. On its own clock it runs between 02:00 and 06:00 local time, only while every session is quiet, and only 12 hours after the last one. A Mac asleep through that window misses it; a dream the owner asks for counts as the last one.
3. It does not start while Kage is paused by the usage limit; the owner is told so.
4. To check it ran: `hub.log` shows `dream starts` and `dream lessons kept ...`; `kage dream undo` puts your memory back as it was before the last one.
