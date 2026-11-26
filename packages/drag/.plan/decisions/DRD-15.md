#### DRD-15 — The landing starts before focus, and focus returns after `end`

**Status:** active, implemented at `b91db2818`

**DRI-9's tail becomes: release, then the landing starts, then `end` runs as the next step, and focus is restored when `end` returns or throws, inside that step. An operation without `start` restores right after release. This amends the place `DRD-9` gave the restore, and not its rule.**

Decides `drag/architecture:challenge-5` and `drag/production:reviewer-7`, and gives `reviewer-6`'s missing witness an order to pin.

- **`end` is a hook a behavior may reorder in.** Restoring before it left focus on `body` after a reorder there, in all three engines, so a second arrow press did nothing.
- **The layout:** the recorded trace gives 7 layouts per landed cycle when the landing starts before the focus call, and 7 when a consumer refocuses in `onEnd`, against 8 now. Both before arms read 7. **This is expected, not measured, until the remediation's validation runs.**
- **A destruction applied before the terminal still removes `end` and the restore together (DRI-10).** A destruction requested inside `end` applies after that step, so the restore has run.
- **No `try` is needed around the landing for focus's sake.** The restore no longer follows it in the same block.