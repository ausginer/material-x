# `RF-59`'s repair — feature proof, handoff item 3

**Files were read at:** `0b6bc4d30` (`repo/host-has-fallback-1`, slot `e`, clean, equal to `origin`). **Diff reviewed:** `d23abc117` to `0b6bc4d30`. **Records read at the same commit.**

**Governing records:** `repo:RF-59` in [`00-index.md`](../../00-index.md); the [handoff](../../host-has-fallback-1/host-has-fallback-handoff.md)'s item 3 and _`RF-59`: the light-DOM selector, read_; the [report](../../host-has-fallback-1/host-has-fallback-report.md) and its witnesses under [`checks/`](../../host-has-fallback-1/checks/).

**Lens:** feature proof. Each claim below is my own reading of the tree or a local run, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: item 3 holds, except for witness 3's `visual` reading, which is still open.** One Tier C finding, `reviewer-1`, is against `RF-59`'s record and not the code. It goes to the architect.

## Scope

**Covered.**

- **The source change,** `packages/material-x/src/core/utils/polyfills.ts`, against each _Required_ point of item 3. That includes the JSDoc that item 1 requires.
- **The new rows,** `tests/core/utils/polyfills.browser.test.ts`, against the `test-component` skill. That covers placement, the suffix and its project, and the waits.
- **Witness 1.** I read the before and after transcripts and checked by reasoning that the import row discriminates. I didn't repeat the before run, because that would mean reverting source in slot `e`.
- **Witness 2.** I re-ran the head-import probe against slot `e`'s build. The output matches `rf59-head-import-after.txt` row for row.
- **Witness 3, the `browser` half.** I ran the `browser` project locally in Chromium, Firefox and WebKit: 33 file runs, 602 passed, 1 expected fail, exit 0.
- **The rendering claim,** read from the built sheets. Every `:host(:state(has-*))` in the text field and list item sheets is in the same selector list as the `:host:has()` selector it stands for.
- **Witness 4.** `typecheck` exits 0, `lint` on both changed files exits 0, and `fmt-check` is clean.
- **The report's links,** checked by script, and `git diff --check` on the commit.

My runs are in [`checks/feature-proof-runs.txt`](checks/feature-proof-runs.txt), and the pairing probe is [`checks/state-pairing-probe.mjs`](checks/state-pairing-probe.mjs).

**Not covered.**

- **The `visual` project.** It runs only in the gate's `chromium` job, and no pull request exists yet. The handoff's stop on a changed baseline is still to be read.
- **Items 1 and 2,** which wait for the owner's answer to `RF-40`.
- **Import-time effects in material-x modules other than `polyfills.ts`.** Item 3 and its witness are scoped to this module. I saw that `ripple.ts:44` evaluates `matchMedia('(forced-colors: active)')` at module scope. A media query neither touches the document nor computes a style, so I don't report it.

## Item 3, point by point

| Required | Observed |
| --- | --- |
| `HOST_HAS_SUPPORTED` goes, and the class and state are set on every `slotchange` in every engine | Gone. Nothing else in `packages/` or `.agents/` names it. `toggleState(innards, has-<name or default>, hasNodes)` runs unconditionally beside the class toggle, with the same `hasNodes`. This holds in the built `core/utils/polyfills.js` too. |
| Importing evaluates declarations only | The module scope holds imports, one string constant and two function declarations. `useFieldSizingContentPolyfill` reads `document` only when it is called. |
| The JSDoc | It names `has-<slot name>` and `has-default`, the build's rewrite, `hasSlottedFallbackVisitor`, and that the slot's `name` must agree with the class. It also states the three points: the state is set in every engine, because Firefox reports `:host:has()` as supported and doesn't match it; where both selectors match, they set the same declarations; and the function and the build's rewrite go together. |
| Nothing else changes | Outside `.plan/`, the diff touches `polyfills.ts` and the new test file only. |

## Witnesses

1. **The import row discriminates.**
   - The old code called `document.body.append` and a bare `getComputedStyle`. The spies replace `document.body.append` and `window.getComputedStyle`, so they catch both.
   - The `?fresh-import` URL is a separate entry in the module map. The before transcript reads `[1, 1]` in all three engines, so the fresh instance was evaluated: the cached instance had already run before the spies existed. An after pass therefore isn't vacuous.
   - No Vitest retry is configured, so a retried row can't pass against a cached module.

   The state row fails before in Chromium and WebKit and passes in Firefox. The old detection explains exactly that pattern.

2. **The head-import probe.** In my re-run, 48 of 48 rows have `defined=true` and no error, `classic-bundle` and `module-src-async` included. `classic-dynamic-import-list-item` reads `upgraded=false` in every engine. The implementer's reading explains why: the page holds `<mx-text-field>`, and that scenario defines `mx-list-item`. The before reading shows the same at `hold=0`.
3. **The rendering.**
   - **The `browser` project** passes in all three engines (above).
   - **Structurally,** each state selector is in the same selector list as its `:host:has()` counterpart: the text field's six, and the list item's six, which sit in three selector lists, one of them a nested `&` rule. A list's specificity is that of its most specific matching selector, and in Chromium and WebKit the `:host:has()` selector already matched. So when the state also matches there, it doesn't change the cascade. Firefox's path is unchanged.
   - **`visual` isn't read.** That is the known open witness.
4. **`typecheck`, `lint` and `fmt-check`** pass (above).

The new rows follow the `test-component` skill:

- the source is `src/core/utils`, and the rows are in `tests/core/utils`;
- the `.browser.test.ts` suffix routes them to the `browser` project;
- they render the real element;
- the state row waits with `expect.poll`, not a sleep. `tests/support` has no slot-settlement helper for it to use;
- cleanup comes from the shared setup.

## Findings

### reviewer-1 — `RF-59`'s _Required property_ still requires a detection that the decided repair removes

- **Tier:** C. The finding is internal to the record and has no consumer-observable effect. No instrument reads the sentence.
- **Current record:** `RF-59`'s _Required property_ bullet ends _"The detection gives the same answer as it does today."_ The _Changed 2026-11-18_ note replaced the lazy-detection direction, and the repair bullet says _"no detection"_. But `d23abc117` left this sentence as it was.
- **Why it matters:**
  - The code at `0b6bc4d30` has no detection, so the second half of the required property can't be checked against it.
  - Whoever closes `RF-59` from this review reads a required property that contradicts the repair.
  - The repair does meet the property that replaces the sentence, rendering unchanged in every engine. That property is the handoff's witness 3, and it isn't stated in the entry.
- **Evidence:** `.plan/00-index.md`, `RF-59` at `0b6bc4d30`: the _Required property_ bullet, against the _The repair, decided by the architect_ bullet. `git show d23abc117 -- .plan/00-index.md` changes the other bullets and not this one.
- **Required property:** `RF-59`'s required property agrees with its decided repair.
- **Routed to** the architect. This review doesn't amend the entry.