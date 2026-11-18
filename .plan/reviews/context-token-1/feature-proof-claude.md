# `createContext` over plain HTTP (`RF-61`) — feature proof

**Files were read at:** `ef8d5cf43` (`repo/context-token-1`, slot `f`, clean), the head of pull request [#39](https://github.com/ausginer/material-x/pull/39). **Diff reviewed:** `9a514e235..ef8d5cf43`. That is `packages/core/src/controllers/useContext.ts`, `packages/core/tests/controllers/useContext.browser.test.ts`, and the report with its `checks/`. **Records read at the same commit,** with `RF-61` read at `origin/repo/work-queue-1`.

**Governing records:** `repo:RF-61` (registered at `a9aa919d9`, amended at `a7ef0ff3f`, on `repo/work-queue-1`); the [handoff](../../context-token-1/context-token-handoff.md), its decision, required properties 1 to 4, item 1's witnesses and its stops; the implementer's [report](../../context-token-1/context-token-report.md) and its `checks/`.

**Lens:** feature proof. Each claim below is my own reading of the tree, CI or a local run, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: the repair holds.** `createContext` meets the handoff's properties 1 to 4, and `RF-61`'s required property holds. The witnesses hold, and I repeated three of them. Neither stop applies: no test or source depends on the token's format, and every entry imports from the LAN address. **The unit has no finding.**

- **One observation outside the unit's scope** (`reviewer-1`, Tier C): a material-x story calls `crypto.randomUUID` itself.

## Scope

**Covered.**

- **The source change, line by line.** `createContext` returns `` `ydin-context-${Math.random()}` ``.
  - **Property 1:** no `crypto` API remains, and `Math.random` isn't restricted by context.
  - **Property 2:** the result is a string. `Context<T>` and the signature are unchanged.
  - **Property 3:** `Number.prototype.toString` gives the shortest string that round-trips the double, so the token keeps every bit of the draw. Two copies of `@ydinjs/core` in one realm draw from the same generator, so their draws are successive values, not two sequences with the same start.
  - **Property 4:** the call touches no document.
- **The JSDoc:** _"Requires launch over HTTPS"_ is gone. The new text states the token's role, that it isn't a secret, and that creating one is safe in any context. The stray `A -` in `@returns` is also fixed.
- **The new row.** It replaces `Crypto.prototype.randomUUID` with `undefined` and restores the descriptor in `finally`. It asserts two string tokens that differ. Before the repair it fails in three engines with the `TypeError` (the implementer's [reading](../../context-token-1/checks/rf61-row-before.txt), which I didn't rerun). It can't fail for any reason except the property it tests.
- **Repeated locally in slot `f`,** in Chromium, Firefox and WebKit:
  - core's `useContext.browser.test.ts`: 3 files, 45 tests, all pass;
  - material-x's `tests/button-group`, `browser*` and `spec*` projects: 6 file runs, 210 tests, all pass. The visual project isn't included. The counts are the report's;
  - the import probe (`node .plan/context-token-1/checks/rf61-import-probe.mjs /workspaces/worktrees/f`), against slot `f`'s built packages. The built `core/controllers/useContext.js` returns the `Math.random` token, and no built `button-group` or `controllers` file names `randomUUID`. All 24 lines match [`rf61-import-after.txt`](../../context-token-1/checks/rf61-import-after.txt): each of the four entries resolves, defines and upgrades its element by the LAN address (`secure: false`) and by `localhost`, in all three engines.
- **The format stop.** In `packages/*/src`, the only `randomUUID` is the story in `reviewer-1`. No source or test reads a token's format.
- **CI:** run 44261598574 at `090febe06` succeeded on attempt 2. The report records attempt 1's `webkit` as cancelled in its install step, which is `RF-58`'s stall. The `[noci]` run at `ef8d5cf43` succeeded. The pull request is `CLEAN`, and its description says `Refs` for `RF-61`, as the handoff asks.

**Not covered.**

- I didn't rerun the row against the code before the repair, or the size reading (514 B after, 520 B before), because either one needs a change in slot `f`'s tree or its build. Both are the implementer's.
- I didn't run `typecheck` or `lint`. CI's `static` job passed at `090febe06`.

## Findings

### reviewer-1 — Tier C, outside the unit's scope: a material-x story calls `crypto.randomUUID`, so it throws over plain HTTP

- **Observed:** `packages/material-x/src/checkbox/checkbox.stories.tsx:93`, in the `WithLabel` story, calls `const id = crypto.randomUUID();` when it renders.
- **Inferred, not run:** in a Storybook served over plain HTTP from a LAN address, the platform reading that `RF-61` cites applies. There, `crypto.randomUUID` is undefined, so that story throws when it renders. The deployed docs site is served over HTTPS, so it isn't affected. Shipped code isn't affected either: stories aren't in the package's exports.
- **Why it is reported here:** it is the same platform restriction, in the same development case that `RF-61` names: a development server opened from a phone or from another machine. The handoff limits the unit to core (_"Nothing else changes … not material-x's sources"_), so this is outside the unit, and the unit is right not to change it.
- **Required property:** no story or docs code depends on an API that the platform restricts to secure contexts, or the record states that the docs need a secure context.
- **Routed** to the architect, to register or decline.

## Proposed canonical ids

None. `reviewer-1` is outside `RF-61`'s required property. The architect registers it or declines it. That is a proposal, not an allocation.