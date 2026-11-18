# Report: `createContext` works on a page served over plain HTTP (`RF-61`)

**Input:** `repo/context-token-1` at `9a514e235`, the [handoff](context-token-handoff.md)'s item 1. **Governing record:** `repo:RF-61`, on `repo/work-queue-1`. **Result:** `090febe06`, pull request #39, which says `Refs` for `RF-61`: the entry has no issue yet. `RF-61`'s status is unchanged.

## Item 1. The token

**Changed:** `packages/core/src/controllers/useContext.ts`. `createContext` returns `` `ydin-context-${Math.random()}` ``. No `crypto` API remains. The prefix names the package for a reader of an event listener list. The string carries all of the double's bits, so the token has no shortened form. The JSDoc no longer says that the function requires HTTPS. It says that the token is a unique event type, that it isn't a secret, and that creating one is safe in any context and touches no document. `Context<T>` and the signature are unchanged.

**Added:** a `createContext` row in `packages/core/tests/controllers/useContext.browser.test.ts`. It replaces `Crypto.prototype.randomUUID` with `undefined`, as an insecure page has it, and restores the descriptor afterwards. With that in place, two tokens are distinct strings.

**Nothing else changed:** not `useContext` or `useProvider`, and not material-x's sources. No test or source depends on the token's format: a search of `core` and `material-x` for `randomUUID`, `uuid` and `createContext` finds only the calls and this row.

## Witnesses

1. **The row** fails before the repair in Chromium 158, Firefox 159 and WebKit 27.2 with `TypeError: crypto.randomUUID is not a function` ([before](checks/rf61-row-before.txt)). It passes after it, in all three.
2. **The import works.** The import probe, re-run after rebuilding core, resolves every entry from the LAN address in all three engines. Each element is defined and upgraded, and so it is from `localhost` ([after](checks/rf61-import-after.txt); [before](checks/rf61-import.txt)).
3. **The context channel still works.**
   - `useContext.browser.test.ts` passes locally in three engines: 45 tests, 15 per engine.
   - material-x's button-group tests pass locally in three engines, in the `browser` and `spec` projects: 210 tests in 6 file runs.
   - **The pull request's run** [44261598574](https://github.com/ausginer/material-x/actions/runs/44261598574) passed on its second attempt. On the first attempt, `scope`, `static`, `chromium`, `firefox`, `docs` and `measurements` passed. `webkit` was cancelled in `playwright install --with-deps webkit`, before any test ran: this is the runner pool's stall that `RD-21` addresses. The second attempt reran `webkit` and `verify` only, and both passed.
4. **The size** of `controllers/useContext.js`: 520 B before, 514 B after, under the repository's size-limit preset. A temporary `.size-limit.json` entry was used and not committed, and no budget is added ([reading](checks/rf61-size.txt)). The three budgeted rows didn't move.
5. `aube exec just typecheck` in `packages/core` exits 0. The handoff loop on both changed files ends with `just lint` at 0 errors.

**Outstanding:** none from this item. The architect closes `RF-61` from this report and the review.