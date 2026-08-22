# Phase 22 API refinement — independent review of D-108…D-111

- **Reviewer:** Claude
- **Date:** 2026-08-22
- **Subject:** the whole API slice — `39d2a031` (decisions), `266fcb82` (implementation), `d5aee1fd` (fresh-clone fix) — against [`api-surface.md`](../api-surface.md) and the public/package contracts D-108…D-111 implement
- **Tree:** `d5aee1fd` on `drag2/phase22-api`, working tree clean

**Scope.** The four decisions and the contracts they touch, by rebuilding, repacking and falsifying rather than by reading. F-81's instrument was not designed or implemented, as scoped. Every gate below was broken deliberately and restored; `git status --short` is empty at the close.

## Baseline

| Gate | Result |
| --- | --- |
| `npx just typecheck` | clean |
| `npx just test` | 58 files, **1131 passed, 116 skipped** |
| `npx just size` | green, all **14** rows within budget |
| tracked-files-only checkout → `clean-build`, `build`, `typecheck` | **all pass** |
| `npm pack --dry-run` from that checkout | **135 files, 0 missing from disk, 0 dangling `sourceMappingURL`** |

## Verdict

**Nothing blocks merge.** All four decisions land as specified, every gate that is supposed to hold them permanently discriminates when broken, and the fresh-checkout contract is genuinely repaired rather than locally green.

**Three findings, all documentation.** One matters: **API-01 — the published D-108 cost is computed against a stale baseline and absorbs 14–46 B of unrelated growth on seven of twelve rows.** The budgets and the landed figures are correct; only the attribution is wrong. It is the same stale list my P-02 closure review recorded as C-05 and which was never acted on.

| # | Finding | Class | Blocks merge |
| --- | --- | --- | --- |
| API-01 | the D-108 per-composition cost is measured against the previous docblock's stale figures, not the pre-slice tree | attribution | no |
| API-02 | a doc stating the shipped `sortable.js` surface is stale on both D-109 and D-110 | documentation, F-81's own class | no |
| API-03 | D-108's overturn condition names a measurement that was never taken | framing | no |

---

## What holds up

### D-108 — exactly the four intended checks, with channels and the hot boundary untouched

**The change is four sites and nothing else.** Diffed against `e086d058`: two `if (!DEV) { return; }` guards removed from `assertFrameShapesMatch` and `assertFrameScrubbed`, `if (DEV && staged !== null)` narrowed to `if (staged !== null)`, and one `if (DEV) { report(…) }` unwrapped. No other conditional moved.

**Error-reporting semantics are unchanged.** The two frame checks still reach the author through `assert` — a throw at the author's own `draggable()` call, with `assertFrameScrubbed` still wrapped in `guarded` at its call site — and the two seam sites still call `report()`, which routes to `reportError`/`console.error` and never to a consumer's `onError`. Un-gating changed which builds run them, not what happens when they fire.

**Read off the packed artifact rather than the source**, which is where F-78 lived:

| check | packed `kernel/` |
| --- | --- |
| `assertFrameShapesMatch` | `assert(sameKeys(Object.keys(a), Object.keys(b)), "drag: the two fram…` |
| `assertFrameScrubbed` | `const keys = Object.keys(frame); assert(sameKeys(keys, armedKeys)…` |
| `validateFrameDescriptors` | `for (const key of keys) { const descriptor = Object.getOwnProperty…` |
| `sameKeys` | present, 3 references |

All four have real bodies where the previous build shipped `function assertFrameShapesMatch(a, b) {}`.

**D-101's hot boundary is intact and the rule is now sharper, not weaker.** The whole package reads `__DEV__` at exactly **one** site — [verified-refresh.ts:59](../../src/sortable/verified-refresh.ts#L59) — `kernel/dev.ts` is deleted, and no `__DEV__` survives in any packed `.js`. The vocabulary gate moved from `['kernel', 'sortable']` to `['sortable']`, and it discriminates in both of the ways that matter: re-gating one of the four checks fails **two** rows, and adding a bare kernel-tier `DEV` binding fails the tier row on its own.

**The coldness claim holds structurally.** The record argues _none is per-frame_ and names `assertFrameScrubbed` as the one a measurement would most plausibly overturn. I checked the call graph instead: `draggable()` calls `arm()` exactly once per controller, and all three `scrub()` sites are terminal — operation retirement, `runPhysicalTeardown`, and the arm-failure unwind. None is reachable per frame. (See API-03 on how the record words this.)

### D-109 — complete, and the collision set is exhaustive

Enumerated mechanically off the packed declarations rather than off the record. Exactly **five** names are exported from both ordinary roots:

| name | verdict |
| --- | --- |
| `AT_CONSUMER`, `AT_PROPOSAL`, `CancelStage` | kernel-sourced, identical by construction |
| `ResolveHandle` | `(item: HTMLElement) => HTMLElement \| null` in **both** — correctly unqualified |
| `ResolveElement` | `(item: HTMLElement) => HTMLElement` in **both** — correctly unqualified |

The three that met D-75's condition are gone from the collision set. **Zero** unqualified `OnStart`, `OnEnd` or `OnDragError` survives anywhere in the packed declarations, and both roots export all six qualified names. The rename reaches the declarations in `sortable/config.ts` and `free-drag/config.ts`, their uses in both `slots.ts`, and both runtime roots — not just the re-export lists.

**No accidental extra renames.** `OnMove`, `OnDrop` and `OnReorder` are single-root names, do not collide, and were correctly left alone; `ResolveHandle`/`ResolveElement` were left alone on the stated ground and I confirmed the declarations are byte-identical. The rule was run over the surface and applied exactly where it fires.

### D-110 — nameable from the ordinary tier, with no new leak

`sortable.ts` now carries `export type { AxisInstaller, SortableInstaller } from './sortable/feature.ts'` — a **type-only** re-export beside the sibling D-78 already ratified, so the runtime cost is zero and `drag.js` stays byte-identical at 121 B. The closure types (`FeatureContext`, `SortableContribution`, `InsertionGeometry`) stay declared at `sortable/feature.js`; the ordinary root publishes the name, not the tier — the same shape `AxisInstaller` has had since D-78, and the mirror of `free-drag.js`'s `FreeDragInstaller`. Removing the re-export fails the consumer fixture, which hoists `const hoistedPlugin: SortableInstaller` while importing only `sortable.js`.

### D-111 — repaired from a clean checkout, not locally green

I tested this the way the question asks: a checkout containing **only tracked files** (a `git worktree` at `d5aee1fd`, with node_modules linked from the monorepo root, so nothing untracked from the working tree could leak in).

| step | result |
| --- | --- |
| `src/globals.d.ts` present | **yes** — the `d5aee1fd` fix is what makes this true |
| `npx just clean-build && npx just build` | **succeeds**, 133 files |
| `npx just typecheck` | **clean** |
| `npm pack --dry-run` | **135 files** |
| packed files missing from disk | **0** |
| dangling `sourceMappingURL` across packed `.js` **and** `.d.ts` | **0** |

**F-79 is fixed end to end, not just asserted.** I planted orphans — `kernel/orphan.js`, `kernel/orphan.d.ts`, `shared/orphan.js`, and the root `landing-runner.js`/`.map` — and ran `clean-build`:

```
kernel/orphan.js       removed      shared/orphan.js       removed
kernel/orphan.d.ts     removed      landing-runner.js      removed
                                    landing-runner.js.map  removed
```

Every one of the directories that previously survived is now covered. **`type-fest` never crosses the boundary**: zero occurrences in any packed `.js` or `.d.ts`, and the packed manifest's `dependencies` is `@ydinjs/box-quad` alone.

### The `.gitignore` follow-up admits exactly what it claims

The commit's own reasoning about why `!/packages/*/src` was a no-op is correct git semantics — a negation cannot re-include a file through a directory that was never excluded. Tested behaviourally rather than read:

| path | result |
| --- | --- |
| `packages/drag2/src/globals.d.ts` | admitted |
| `packages/drag2/src/deep/nested.d.ts` | admitted — `**` reaches any depth |
| `packages/drag2/src/foo.js` | **ignored** |
| `packages/drag2/src/foo.js.map` | **ignored** |
| `packages/drag2/src/foo.d.ts.map` | **ignored** |
| `packages/drag2/kernel/frames.d.ts` (generated) | **ignored** |

The premise the rule rests on also holds across the monorepo: **all nine packages build with `outDir: '.'`**, so no package emits declarations under `src/`, and `git status --untracked-files=all` shows **no** newly-admitted `.d.ts` anywhere. Authored declarations in, generated artifacts out.

### Every gate discriminates

Not inspected — broken. Each mutation applied to the tree, suite run, tree restored:

| mutation | rows failed |
| --- | --- |
| re-gate `assertFrameShapesMatch` behind `__DEV__` | **2** — the packed four-checks row _and_ the tier row |
| add a bare kernel-tier `DEV` binding | **1** — the tier row |
| drop `kernel` from `clean.extras` | **1** — _should clean every path it ships_ |
| re-add `drag.js.map` to `files` | **1** — _should pack every file its own allowlist names_ |
| drop the `SortableInstaller` re-export | **1** — _should compile a consumer against the packed declarations_ |
| disable `stripDeclarationMapReferences` | **1** — _should pack every sourcemap its modules point at_ |

The four-checks row asserts **five** message fragments across `kernel/frames.js` and `kernel/seams.js`, covering all four sites; the clean row asserts against the real `packageFilesToCleanPathspecs` derivation rather than against whatever the working tree happens to hold, and carries its own anti-vacuity check.

---

## Findings

### API-01 — the D-108 cost is measured against a stale baseline and absorbs 14–46 B of unrelated growth

**Observed.** `bench/size/measure.ts`, [`api-surface.md`](../api-surface.md) and D-108's ledger row all publish the cost as **283–340 B per composition**, with a per-row table.

**Evidence.** I built `e086d058` — the immediate pre-slice tree — and `d5aee1fd`, extracting exact brotli bytes from both by re-basing every budget to 1:

| row                 | claimed Δ | measured Δ | drift absorbed |
| ------------------- | --------- | ---------- | -------------- |
| minimal             | +330      | **+296**   | 34             |
| minimal (xy)        | +298      | **+284**   | 14             |
| + layoutAnimation   | +324      | **+303**   | 21             |
| + landing           | +340      | **+305**   | 35             |
| complete            | +331      | **+290**   | 41             |
| free drag minimal   | +290      | **+290**   | 0              |
| free drag + bounds  | +296      | **+296**   | 0              |
| free drag + landing | +291      | **+291**   | 0              |
| free drag complete  | +297      | **+297**   | 0              |
| both behaviors      | +336      | **+303**   | 33             |
| kernel root         | +283      | **+283**   | 0              |
| baseline A          | +328      | **+282**   | 46             |

**Every claimed delta is exactly `landed − stale`, where `stale` is the previous re-base docblock's _Landed figures_ list** — not `landed − pre-slice`. The rows that match perfectly are exactly the rows that list was still current for: the four free-drag rows, `kernel root`, `baseline B` and `drag.js`. Every row it was stale for is overstated, by exactly the amount D-103 (the P-06 remediation) and D-104 (the P-02 shrink) moved it after that list was written — 34, 14, 21, 35, 41, 33 and 46 B respectively, each reconciling to the individual figures in the P-06 and P-02 closure records.

**So the true D-108 cost is 282–305 B**, and _283–340 B_ is published in three places. The upper figure corresponds to no row.

**What is not wrong.** The **budgets** are correct — every one is the true landed figure plus ~150 B, and all 14 rows are green. The **landed figures** in the docblock are correct and match my measurement byte for byte. The qualitative conclusions all survive: no module appeared, the cost is roughly twice the headroom, `baseline B` and `drag.js` are unmoved, and M-3′'s re-base rule governs. The re-base also silently repairs the headroom drift my P-02 closure recorded at 114–139 B — every row is now uniformly 150–153 B under, which is the convention the docblock quotes.

**Why it is worth recording anyway.** The question this pass was asked is whether the re-base hides unrelated growth, and it does: 14–46 B per row of P-06 and P-02 cost is attributed to D-108. It is also **the same stale list** flagged as C-05 in [`p02-review-claude.md`](p02-review-claude.md) and left unacted; a docblock whose _Landed figures_ section is known to go stale was then used as a measurement baseline. And it is the class `api-surface.md` closes on by name — _a proxy read where the quantity was meant_, of which it counts four prior instances this phase. This is the fifth, taken inside the pass that names the pattern.

### API-02 — a doc stating the shipped surface is stale on both D-109 and D-110

**Observed.** [`docs/revision/revision-2.ts:269`](../../docs/revision/revision-2.ts#L269), under the heading _sortable.js — the ordinary tier_, states the shipped surface as present fact:

> `SortableConfig` and every alias it names — `ItemSource`, `OnReorder`, `OnStart`, `OnEnd`, `OnDragError`, `ResolveHandle`, `ResolveElement` — ship from `sortable.js`

**Evidence.** Three of those seven names no longer exist — D-109 renamed them — and `SortableInstaller`, which D-110 added to exactly this list of aliases `SortableConfig` names, is absent. The sentence is wrong in both directions after this slice.

It is prose inside a doc comment, so nothing type-checks it and nothing here reaches a consumer. But it is a statement of the current surface in a file whose surrounding rows (`n12`, `n14`) exist to assert that surface, and it is **F-81's own class** — a decision landing completely and the sentence describing the previous state left standing — inside the slice that names F-81 and deliberately leaves its instrument unbuilt. Worth noting precisely because the instrument would have caught it.

### API-03 — D-108's overturn condition names a measurement that was never taken

**Observed.** _What would overturn D-108_: _A measurement showing one of the four is not cold — most plausibly `assertFrameScrubbed`, which is per-key over two frames._ And, of the byte cost: _The measurement is owed at landing, not here._

**Evidence.** At landing, the **size** cost was measured and published. No runtime measurement of the four sites appears anywhere in the slice, so the decision's own stated overturn condition is left outstanding rather than discharged or withdrawn.

**The claim is nonetheless true, and I verified it structurally** — `arm()` is called exactly once per controller by `draggable()`, and all three `scrub()` call sites are terminal paths. A structural argument over the call graph is stronger evidence than a timing run would be, given P-01's null-control lesson two days ago. The finding is only that the record leaves an obligation open which its own reasoning had already closed by a better route, and should say so.

---

## Disposition

**Merge is not blocked.** The four decisions are implemented as written, held by gates that fail when broken, and the package contract is repaired from a genuinely clean checkout rather than in the working tree.

All three findings are records rather than code. **API-01 is the one to fix**, because a published per-composition cost that is wrong by up to 46 B on seven rows will be quoted by the next size pass exactly as this one quoted the list that produced it — and correcting it costs one table.

**LSP plugin - available; not used: this review turned on rebuilding two trees and diffing their brotli output, packing and inspecting the tarball, breaking six gates and running the suite, and testing `.gitignore` and `clean-build` behaviourally — build-and-observe questions rather than symbol-graph ones. The one symbol-shaped question, whether any collision across the two ordinary roots was missed, was answered by parsing the emitted export lists, which is the artifact the rule is about rather than the source.**