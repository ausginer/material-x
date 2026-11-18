# Handoff: `createContext` works on a page served over plain HTTP

**Recipient:** the implementer, in slot `f`, which the architect created on 2026-11-18 as `cl` does.

**Branch:** `repo/context-token-1`, from `origin/main` at `377ca72df`. **Input:** the architect's commit that adds this file.

**Governing record:** `repo:RF-61`, Tier A. It is registered on `repo/work-queue-1` at `a9aa919d9` and amended there on 2026-11-18 with the reach read below. It isn't on `main` yet. The work-queue plan's first population lists it as an issue (`repo:RD-22`, on the same branch).

**Evidence:**

- the platform reading, `.plan/work-queue-1/checks/rf61-insecure-context.txt` on `repo/work-queue-1`: over plain HTTP from a host other than `localhost`, `crypto.randomUUID` is undefined and `crypto.getRandomValues` works, in all three engines;
- [the import witness](checks/rf61-import.txt) ([probe](checks/rf61-import-probe.mjs)), at `377ca72df` after a build, read in this slot.

**Why a unit of its own.** `RF-59`, on `repo/host-has-fallback-1`, is the same class of defect: work at import that fails a correct integration. But it changes material-x's `polyfills.ts` on a branch whose other items wait for the owner (`RF-40`). This repair changes `@ydinjs/core` alone. Neither change touches the other's files, and this one can merge on its own.

## What was read

- **The code,** at `377ca72df`. `createContext` returns `crypto.randomUUID()` (`core/src/controllers/useContext.ts:33`–`:35`). Its JSDoc says that it requires HTTPS. `material-x/src/button-group/button-group-context.ts:25` calls it when the module loads.
- **The token's job.** A token is the event type that `useContext` dispatches and `useProvider` listens for. Nothing reads its format: no source, and no test in `core` or `material-x`.
- **The import fails,** observed in Chromium 158, Firefox 159 and WebKit 27.2. On a page served from the container's LAN address over HTTP:
  - importing the button group, `mx-button` or `mx-text-field` rejects with `TypeError: crypto.randomUUID is not a function`;
  - no element is defined;
  - `mx-checkbox`, whose import graph doesn't reach the context, loads.

  From `localhost`, everything loads.

- **The reach is wider than the entry first said.** 9 of material-x's 20 exports import the context: every button, both button groups, and the text field, through its icon button. Plain HTTP from a LAN address is an ordinary development case: a development server opened from a phone, or from another machine.

## The repair, decided by the architect

**`createContext` derives its token from `Math.random()`.** No `crypto` API is used.

**Required properties:**

1. **It works in every context a page can run in,** secure or not. It uses no API that the platform restricts to secure contexts.
2. **Each token is a string,** because it is an event type. `Context<T>`'s type and `createContext`'s signature don't change.
3. **Tokens are distinct.** Two calls never return the same token in practice. That includes calls made by two copies of `@ydinjs/core` on one page, which is why a counter alone isn't enough: each copy would start from the same value.
4. **Creating a token does no other work.** It touches neither the document nor the DOM, so `button-group-context.ts`'s call at import stays harmless.

**Why `Math.random()`.**

- **The token isn't a secret.** The module exports it, and its events can be observed on the page. Only uniqueness matters.
- **Uniqueness is more than enough.** A double gives about 52 random bits. With a few dozen tokens on a page, the chance of any collision is below 2⁻⁴⁰. A version-4 UUID's 122 bits were never needed.
- **It is smaller and has no failure mode.** It needs no typed array and no hex conversion, which `getRandomValues` would. It isn't restricted by context in any engine. `crypto.getRandomValues`, which the coordinator suggested, also works in every context, but it buys nothing here and costs bytes (CONTRIBUTING Part I, _code size_).

**Not adopted.**

- **A UUID when `randomUUID` exists, with a fallback.** That is two paths for one property, and one of them is tested only on insecure pages.
- **Tokens as unique objects, with one shared event type,** as the Web Components Community Group's context protocol does. Identity would make uniqueness exact. But `Context<T>` is a public type of `@ydinjs/core`, and it would stop being a string. `useEvents` would also need one listener that compares keys. That is a redesign of the context channel, and a defect repair doesn't need one.
- **Creating the token lazily, on first use.** The call isn't expensive. Once the call can't fail, nothing remains to defer.

## Item 1. The token (one commit)

**Required:**

- **`createContext`** meets properties 1–4 with `Math.random()`. The exact string form is the implementer's choice. A short fixed prefix that names the package helps a reader of an event listener list, and it costs a few bytes. A prefix is allowed, not required.
- **The JSDoc** drops _"Requires launch over HTTPS"_. It says that the token is a unique event type, and that creating one is safe in any context.
- **A row in `packages/core/tests/controllers/useContext.browser.test.ts`** fails before the change and passes after it, in all three engines:
  - with `crypto.randomUUID` made unavailable for the row, as it is on an insecure page, `createContext` returns a string, and two calls return different strings;
  - restore it afterwards;
  - the gate serves from `localhost`, which is a secure context, so this is how a gate row can reach the insecure case. Follow the [`test-component`](../../.claude/skills/test-component/SKILL.md) skill's rules where they apply to core's tests.
- **Nothing else changes:** not `useContext` or `useProvider`, not material-x's sources.

**Witnesses:**

1. **The new row,** before and after. Save the failure from before the change under `checks/`.
2. **The import works.** Rebuild, re-run [the import probe](checks/rf61-import-probe.mjs), and save its output as `checks/rf61-import-after.txt`. Every entry resolves from the LAN address in all three engines, and every element is defined and upgraded.
3. **The context channel still works.** `useContext.browser.test.ts` passes in all three engines. So do material-x's button group tests, whose buttons find their group through the context.
4. **The size,** recorded and not budgeted. Core's `.size-limit.json` has no entry for `controllers/useContext.js`. Measure it before and after with a temporary entry, which isn't committed, and record both results. No budget is added.
5. `aube exec just typecheck` and `aube exec just lint` exit 0. Follow [`.agents/docs/handoff.md`](../../.agents/docs/handoff.md) for the changed files.

**Stop and return to the architect** if any test depends on the token's format, or if the probe still fails from the LAN address after the change. The second would mean another import-time API needs a secure context.

## Item 2. The report

`.plan/context-token-1/context-token-report.md`: the row, each engine's result with the pull request's run identifiers, and the witnesses' outputs under `checks/`. Don't change `RF-61`'s status. The architect closes it from the report and the review, on the branch that carries the entry when this pull request merges.

## Verification and handoff

- Commit item 1, push `repo/context-token-1`, and ask the coordinator for the pull request. Then commit item 2 and push.
- **The pull request description says `Refs` and not `Closes`** for `RF-61`'s issue, if it exists by then. The entry is still on `repo/work-queue-1` (`RD-22` property 8: the entry and the issue change at the same merge).

## Disposition of the feature-proof review at `8f83af6a3`

**Decided 2026-11-18 by the architect,** on the [feature-proof review](../reviews/context-token-1/feature-proof-claude.md), which read the code at `ef8d5cf43`, relayed by the coordinator. Item 1 holds, its witnesses hold, and neither stop applies. The review has no finding in the unit. **`RF-61` closes when this pull request merges.**

| Finding | Disposition |
| --- | --- |
| `reviewer-1`: the checkbox's `WithLabel` story calls `crypto.randomUUID`, so it throws in a Storybook served over plain HTTP from a LAN address | **Accepted, Tier C. Registered as `repo:RF-62`** on `repo/work-queue-1`, beside `RF-61`. Not remediated in this unit |

**Why `reviewer-1` is registered.** It is `RF-61`'s platform restriction, in the development case that `RF-61` calls ordinary: a development server opened from a phone or from another machine. A story is how a developer sees a component there.

**Why it isn't folded into this unit.** This unit changes `@ydinjs/core` alone, and its proof is complete. A material-x change would widen the unit and need another proof, for a story that isn't in the package's exports.

**Where `RF-61`'s closure is written.** The entry is on `repo/work-queue-1`, which has no pull request, so this branch can't change it, and either branch can merge first.

- **After this pull request merges,** the architect writes the closure in `RF-61`'s entry, citing the merge commit. It goes on `repo/work-queue-1` if that branch hasn't merged by then, and otherwise on the main slot's branch at that time. Either way, it reaches `main` after this repair does.
- **Until then,** the entry says that the repair is on this branch and points here. That is true in either merge order.
- **Not now on `repo/work-queue-1`:** if that branch merged first, `main` would record `RF-61` closed while its `createContext` still called `randomUUID`.
- **Not on this branch:** the entry isn't here, and a copy would conflict with `repo/work-queue-1`'s in `00-index.md`.
- **If `RF-61`'s issue opens before the closure,** this pull request's `Refs` stands, and the pull request that carries the closure says `Closes` for it (`RD-22` property 8).