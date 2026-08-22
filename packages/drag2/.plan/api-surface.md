# API surface — Phase 22's third entry

**Run 2026-08-22** on `e086d058` plus this commit, against a **fresh `just clean-build`**. The bundle entry closed at `d949cfeb` with no size candidate and no production change; this entry reads the published surface as one artifact and asks a different question — not _what does it cost_ but _what does it promise, and is the promise the one the record says it is_.

**Scope, as set.** The four already-recorded discrepancies, adjudicated into real defects versus stale records; the Revision 2.1 boundaries; and whether any API decision is required before finalization. Bundle optimization stays closed — nothing below is argued on bytes, and the one decision that moves bytes moves them **up**. Maintainability and documentation cleanup are out except where a defect is the API.

## Reproducibility

Every figure below is read off the built tree or off `package.json`, not off the record.

| Input | Value |
| --- | --- |
| Tree | `e086d058`, branch `drag2/phase22-api`, working tree clean at read time |
| Build | `npx just clean-build && npx just build` — tsdown, `dts: true`, `sourcemap: true`, `define: { __DEV__: 'false' }` |
| Surface | `package.json` `exports` — 12 subpaths plus `./package.json`; the emitted `.d.ts` at each target |
| Tarball | `npm pack --dry-run` — **135 files** |
| Suites | `just test --project node` — 14 files, 234 passed, 14 skipped; `just size` green |

**The export map is generated, not written.** `tsdown.config.ts` passes `files.json` through `.scripts/package-files.ts`, and regenerating it reproduces `package.json`'s block byte-for-byte including key order. That is worth stating first, because it settles a whole class of question by construction: `files.json` ↔ `exports` cannot drift, the `.js`-ful subpath style cannot go mixed, and condition order cannot go wrong in one entry and right in another. **All 24 export targets resolve on disk.** The one hand-maintained list is `package.json` `files`, and that is where this pass found its packaging defects — which is what one would predict.

## The four recorded items

### 1. F-78 is real, and neither remedy `dev.ts` names survives contact — **D-108**

**The finding holds.** `kernel/dev.ts` justifies stripping author-facing assertions on the premise that _behavior authoring is not on the public surface_, names its own revisit condition — _the day it is, this needs revisiting_ — and that day passed at Revision 2.1. The published build proves the consequence rather than implying it: `kernel/frames.js` ships `function assertFrameShapesMatch(a, b) {}` and `function assertFrameScrubbed(frame, armedKeys) {}`, both bodies folded to nothing, `sameKeys` and `validateFrameDescriptors` gone entirely. A third-party behavior author gets empty stubs and cannot fill them.

**What the finding did not know is how few sites there are, and where they run.** The whole set is four, and the enumeration is the decision:

| Site | Fires | Channel |
| --- | --- | --- |
| `frames.ts:269` `assertFrameShapesMatch` | once per `arm()` — per controller | throws, to the author's own `draggable()` call |
| `frames.ts:310` `assertFrameScrubbed` | inside `scrub()`, at operation retirement — twice per drag | `guarded`, so it reports |
| `seams.ts:422` unconsumed staged value | once per transaction open | `report` |
| `seams.ts:519` unclassified `host.fail()` | only on an already-failing path | `report`, beside an unconditional one |

**None is per-frame.** The per-frame dev work in this package is `sortable/verified-refresh.ts:585`, inside the applied-move path, and it is behind the **sortable's own** `DEV` binding under D-101 — a different flag in a different tier, and genuinely hot.

#### Both named remedies are rejected, on evidence

**A dual build under an `exports` condition — rejected, and the reason is structural rather than a preference.** Every internal edge in the emitted tree is a **relative** specifier: `grep` finds zero occurrences of `@ydinjs/drag2` in any emitted `.js` or `.d.ts`, and `sortable.js` reaches the kernel as `import { draggable } from "./kernel.js"` — the same file the map publishes as `./kernel.js`, reached by a path that never consults the map. **An `exports` condition is consulted only for bare-specifier imports**, so a `development` condition on `./kernel.js` would be invisible to `sortable.js`'s own edge. A kernel-tier author who imports `@ydinjs/drag2/kernel.js` and also composes `sortable()` would load **two kernel graphs**. That is not a state hazard — the only module-scope state in `kernel/` is immutable (`POINTER_OWNERS` and `COMMAND_OWNERS` are strings, `KERNEL_FRAME_KEY_SET` a derived `Set`) — but it produces **two `DraggableError` class identities**, and `drag.ts` documents `err instanceof DraggableError` as the supported consumer check, at both tiers, as the entire reason `drag.js` exists. Making the condition safe requires a **complete parallel tree** under the condition on all ten runtime subpaths so the graph resolves uniformly: roughly double the published JavaScript, to restore assertions whose executed form is a few hundred bytes.

**A per-site `process.env.NODE_ENV` comparison — rejected.** The build is `platform: 'neutral'` and this is a browser drag library; a CDN or no-bundler consumer has no `process`, so an unguarded comparison is a hard `ReferenceError` **on the production path**, and `dev.ts` has already ruled out the `typeof` guard that would prevent it — _exactly what defeated folding before_. It trades a missing assertion for a crash.

#### The decision

> **D-108. Un-gate the four kernel author-facing checks. `kernel/dev.ts` retires; `sortable/verified-refresh.ts` keeps its own binding.**

**It follows contract 04's own discriminator rather than overruling it.** `frames.ts` states, in the comment that separates the two families, that the kernel-key collision check is a **production** check _because its failure mode is silent state corruption rather than a stale reference_. A part factory that is not deterministic and a reset that leaves a live reference are both silent state corruption — a retained element leaks a DOM node across every subsequent operation. **04's rule already classifies these as production checks**; the gate is what disagrees with the contract, not the un-gating.

**`validateFramePart` is the precedent and it is at the same site.** It runs unconditionally at `arm()` today, was ratified twice — contract 04 by name, review 4 §28 — and D-107 declined to gate it four days ago. These sit beside it, in the same file, in the same `arm()` path, against the same failure class.

**The reporting channel makes the cost near-zero for an ordinary consumer.** `report()` routes to `globalThis.reportError` or `console.error`; `host.fail()` is the channel that reaches `onError`, and `reporter.ts` states the separation is deliberate. So un-gating adds nothing to an application's error handler, and for a consumer composing only first-party behaviors these can never fire at all — they are conditioned on a behavior misbehaving.

**Nothing new is exposed.** `sourcemap: true` ships 50 `.js.map` files whose `sourcesContent` already embeds the complete original TypeScript, assertions and all. `tsdown.config.ts`'s _the published bundle has no dev assertions_ is true of the executed code and already false of the tarball.

**D-101 survives and is vindicated rather than weakened.** Its rule is that each tier binds `__DEV__` itself and neither reaches the other. Under D-108 the kernel's binding disappears because the kernel had no hot dev work; the sortable's stays because it does. The rule is what makes the asymmetry expressible.

**Cost, stated and unmeasured on purpose.** This **adds** bytes, four days after a pass that declined to remove them, and the two positions are one argument rather than two: D-107 declined to gate A1/A2 because gating would deepen F-78, and this closes F-78 from the other side. The added weight is the two `assert` messages, the two `report` messages, `sameKeys`, `validateFrameDescriptors` and two loops — all currently folded to nothing. **No number is guessed here.** Slack is 114–154 B and this will plausibly exceed it on some rows; **M-3′ licenses that re-base by name** — _a budget re-bases rather than a correctness fix shrinking_, and headroom _may never be spent to avoid landing a floor fix_. The measurement is owed at landing, not here.

**Why the window matters.** Un-gating makes a nondeterministic part factory **throw** at `arm()` where it is silent today. For a third-party behavior that currently appears to work, that is a breaking change — cheap now, expensive after publication. D-75 reasoned exactly this way about `DragErrorContext`: _the package has no released consumer, so symmetry costs one type name now and cannot be had later._ The same window is closing here, and two more decisions below stand in it.

**What would overturn D-108.** A measurement showing one of the four is not cold — most plausibly `assertFrameScrubbed`, which is per-key over two frames. If so, the split is per-site rather than wholesale: keep that one gated and un-gate the other three. The decision is per-site by construction and does not depend on all four being alike.

### 2. `kernel.d.ts`'s 35 against the table's 33 — a **stale record**, and the rule held

Counted mechanically off the emitted file: **68 exports, 33 values, 35 types**. Diffed against 02 §The vocabulary's enumeration:

```
values : contract 33, emitted 33 — exact match, both directions
types  : contract 33, emitted 35
  emitted and unlisted : BehaviorLiftSession, InheritedSpace
  listed and unemitted : none
```

**Both extras were ratified in writing, each by its own decision.** 07 §K-1: _the type surface gains exactly `BehaviorLiftSession`_. D-85: _`InheritedSpace` publishes at `kernel.js` as part of the scope's closure (D-68)_. Neither updated the total.

**So this is not an API defect and it is not drift either — the surface is exactly what D-68's rule derives.** Both names are reached through `ActivationScope`, which is precisely the class-A test. **What failed is that the rule is executable and the total is prose.** `tests/kernel/vocabulary.node.test.ts` checks its list _against the entries_, so it tracked both additions silently and correctly; nothing anywhere compares either against a written number. **Corrected in place** in 02 §The vocabulary and 03 §The export topology, and 02 now says the count is descriptive rather than normative — the rule is the contract, and a future addition satisfying it needs the sentence corrected, not its permission.

**No decision is required**, and inventing one would be the error the record already names: adding a number to be maintained where a rule is already enforced.

### 3. `drag.js.map` — a stale line, and the real defect is behind it

**The build is right and the record is wrong.** `drag.js` is a pure re-export facade — `src/drag.ts` is one value re-export and two `export type` lines — so the emitted chunk has zero mappings and rolldown emits **neither a map nor a `sourceMappingURL` comment**. It is a silent absence, not a broken link, and reproducible against rolldown 1.1.5 in isolation. `npm pack` confirms `drag.js.map` does not ship; npm ignores a missing allowlist entry. **As filed: cosmetic, and the `files` line should go.**

**But asking why one map was missing found a defect that is not cosmetic.** `just clean-build` computes its pathspecs from `files.json`, and a directory is only cleaned when an entrypoint contains a `/`. Run against the real tree:

```
after clean-build:  sortable/ removed   free-drag/ removed
                    kernel/ SURVIVES (42 files)   shared/ SURVIVES (4 files)
                    landing-runner.js SURVIVES
```

**`kernel/` and `shared/` are both shipped by `package.json` `files` and neither is ever cleaned.** So a module deleted from `src/kernel/` or `src/shared/` leaves its `.js`, `.js.map` and `.d.ts` on disk **inside the allowlist**, and the next `npm pack` publishes them.

**This is not hypothetical: it has already fired once.** A root-level `landing-runner.js` and `.map` sit in the package today, orphaned from when the source was `src/landing-runner.ts` before it moved to `src/shared/`. Their `sources` field still names the old path. **They do not reach the tarball — and only because that file happened to land outside the allowlist.** The same accident inside `kernel/` publishes. Recorded as **F-79**, remedied by **D-111**.

### 4. Revision 2.1's boundaries — verified, and they hold

Read against the built artifact rather than against the record:

- **Three tiers over three roots.** `drag.js` bundles to 121 B and one module; `kernel.js` to 6,514 B and twelve. Measured last pass, re-confirmed here, and asserted continuously since `aa68a19e`.
- **The runtime/type boundary is honoured in the map.** `sortable/feature.js` and `free-drag/feature.js` carry `types` and deliberately **no `default`** — `README.md` states the reason, and it is the right one: _an export-map `default` condition pointing at a file the build never writes is a packaging defect rather than a documentation nicety._ Disk agrees; both `.d.ts` exist with no `.js` sibling.
- **No `"."` entry, and the bare specifier fails** with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Deliberate — the generator has no path that can emit one, nothing in the repo imports it, and `tests/consumer.node.test.ts` imports only explicit subpaths.
- **`@ydinjs/box-quad` is correctly a runtime dependency** — a real unbundled import in `kernel/presentation.js`.

**The boundaries are sound. What is not sound is what sits inside them**, which is the next section.

## What reading the whole surface added

### Two ratified rules were not carried forward — **D-109**, **D-110**

Both are the same shape: a rule this package **wrote down and applied once**, then did not apply to the next case that met it. Neither is a matter of taste, and both close permanently at publication.

**D-109 — `OnStart`, `OnEnd` and `OnDragError` collide across the two ordinary roots, with different structures.**

```
sortable/config.d.ts:19  OnStart     = (item: HTMLElement) => void
free-drag/config.d.ts:5  OnStart     = (geometry: DragGeometry) => void
sortable/config.d.ts:30  OnEnd       = (result: ReorderTransactionResult) => void
free-drag/config.d.ts:8  OnEnd       = (result: FreeDragTransactionResult) => void
sortable/config.d.ts:20  OnDragError = (e, context: SortableErrorContext) => void
free-drag/config.d.ts:9  OnDragError = (e, context: FreeDragErrorContext) => void
```

All three are exported unqualified from **both** `sortable.d.ts` and `free-drag.d.ts`. **D-75's rule, in the same file as one of them**: the two entries need _different structures under one name — **which is the only condition that qualifies a name**_ — and _the package has no released consumer, so symmetry costs one type name now and **cannot be had later**_. The condition is met exactly three times and was applied zero of them. The irony is local: D-75 renamed `DragErrorContext` to `SortableErrorContext`, and the alias that **names the renamed type** was left unqualified.

**Not vacuous, and the counter-case proves the rule is discriminating rather than blanket:** `ResolveHandle` and `ResolveElement` also collide and are structurally **identical**, so they are correctly left unqualified. The rule already distinguishes the two situations; it was simply not run over these three.

> **D-109. Qualify the three under D-75's own rule, before publication.** The spelling is the implementer's to match the existing `SortableErrorContext`/`FreeDragErrorContext` precedent. The decision is that they are qualified, not what they are called.

**D-110 — `SortableInstaller` is named by `SortableConfig` and is not published from `sortable.js`.**

`sortable/config.d.ts` uses it at two slots — `landing?: SortableInstaller` and `plugins?: readonly SortableInstaller[]` — and `sortable.d.ts` exports it **zero** times. The mirror does: `free-drag.d.ts` exports `FreeDragInstaller`, used at three slots. **D-78's rule, stated on the sibling type in the same tier**: _Published from `sortable.js` as well (D-78): `SortableConfig` names this slot, so an ordinary consumer must be able to hoist an installer into a typed `const`._ That argument is about `AxisInstaller` and holds verbatim for `SortableInstaller`.

**The consequence is the sharpest kind — must-name-and-cannot.** A sortable consumer who writes `const p: SortableInstaller = …` has to import the **types-only middle-tier entry** `sortable/feature.js` to type an ordinary-tier config slot. A free-drag consumer never does. That is the tier inversion D-48 and D-64 each exist to prevent, reached a third time by a third route.

> **D-110. Publish `SortableInstaller` from `sortable.js` under D-78's own rule.** It is a re-export of an existing declaration; the runtime cost is zero and the middle-tier publication is unaffected.

### Divergences with no recorded reason — **F-80**

Real, smaller, and **not decided here**, because each has a defensible reading and none violates a written rule. Every other divergence between the two configs carries a `D-nn`; these do not.

- **`axis` names two unrelated things.** `sortable`: `axis: AxisInstaller` — **required**, an installer (`y()`/`xy()`). `free-drag`: `axis?: DragAxis | AxisSource` — **optional**, `'both' | 'x' | 'y'` or a thunk. Aggravated by `AxisInstaller` beside `AxisSource`: both `Axis*`, both published, nothing in common. The free-drag meaning is the conventional one. **D-75's rule does not reach this** — that rule governs published type names, and `axis` is a config key — which is exactly why it is a finding and not a decision.
- **`threshold` is documented by deferral to a silent declaration.** `free-drag/config.d.ts:45` says _Same default and domain as the sortable's_; `sortable/config.d.ts:89` is `threshold?: number` with no comment, no unit and no default. The unit exists only at `kernel/spec.d.ts`, which the ordinary consumer is told not to import. **Neither ordinary entry states the default at all.**
- **Two callback asymmetries.** Free drag has `onMove`; the sortable has no per-sample callback. The sortable's `onStart` receives only the item while free drag's receives a full `DragGeometry`, so a sortable consumer cannot observe pointer state at activation.
- **`FailureStage`'s doc claims a consumer role D-64 removed.** `kernel/failures.ts` still says _It is **public**: a consumer receiving `onError` has to be able to discriminate it (D-30)_. D-64 took `stage` out of the error context; the ordinary entries publish neither `FailureStage` nor the `FAILURE_*` constants, and the callback no longer receives one. The type is correctly kernel-tier-only; **the sentence is what is stale.**

### The package contract — **D-111**

Four packaging facts, one decision, because they are one class: **the hand-maintained half of the package contract has drifted from what the build actually emits.**

- **31 emitted `.d.ts` files end in `//# sourceMappingURL=…d.ts.map`. Zero such maps exist anywhere in the monorepo, and `npm pack` ships zero.** Every one of those references is dangling **in the published tarball**. The cause is upstream — tsdown reuses one `sourcemap` option for the JS and dts passes, so `rolldown-plugin-dts` writes the comment and no chunk is produced — and it is repo-wide, not drag2's. Someone expected them: `package-files.ts` already lists `*.d.ts.map` in the clean pathspecs and `.gitignore` ignores them.
- **`files` lists `drag.js.map`, which is never emitted** (§3).
- **`clean-build` never cleans `kernel/` or `shared/`, both of which `files` ships** — F-79, with the root `landing-runner.js` orphan as proof it has already fired.
- **`type-fest` is in `dependencies` and is type-only.** Two `import type` uses, both consumed inside function bodies; **zero occurrences in any emitted `.js` or `.d.ts`**. It never crosses the declaration boundary, so no consumer needs it.

> **D-111. The published artifact must contain no reference to a file it does not ship, and `clean-build` must cover every directory `files` ships.** Four required properties, remedies left to the implementer: the dangling `.d.ts.map` references stop being published — either drop the comment or emit and ship the maps, and the choice is the monorepo's rather than drag2's; `drag.js.map` leaves `files`; `clean` covers `kernel`, `shared` and the root orphan; `type-fest` moves to `devDependencies`.

**Why this is in an API pass at all.** A tarball that names files it does not contain is a package-contract defect, and a clean step that cannot remove a shipped directory is how a deleted internal module becomes a published one. Neither is byte-optimization and neither is cosmetic tidying.

## The class this pass actually found — **F-81**

Four of the items above are the same defect, and it is not the one the brief anticipated:

| Instance | Decision that landed | Prose left standing |
| --- | --- | --- |
| F-78 | D-61, D-68, D-70 published behavior authoring | `dev.ts`: _behavior authoring is not on the public surface_ |
| §2 | D-85, 07 §K-1 each added a type | 02 and 03: _33 types_ |
| F-80 | D-64 removed `stage` from the consumer | `failures.ts`: _a consumer … has to be able to discriminate it_ |
| — | the published build bakes `__DEV__ = false` | `kernel.ts:474`: _`DEV` is true in an ordinary browser … so this is not a test-only path_ |

**In every one, the decision landed completely and the sentence that justified its predecessor was left in place.** None is a stale example or a typo; each is a **premise** that some later reader will act on, and F-78 is the proof, because someone did — D-107 nearly gated two more validators on it four days ago.

**The last row is worth its own line.** `kernel.ts:474` defends using `guarded` rather than throwing, on the ground that the path is not test-only because `DEV` is true in a browser. That is true in this repository and false in every consumer's. **Under D-108 the sentence becomes true again**, which is a useful independent check on the decision.

**Recorded as a finding rather than decided**, because the natural remedy is an instrument, and this ledger already has the model for one — `tests/decisions.node.test.ts` exists because F-63 was exactly this class in the decision tables. Whether the same treatment is worth extending to justifying prose in source doc blocks is a real question with a real cost, and it is not this pass's to settle unasked.

## What this pass does not decide

- **The spelling** of D-109's three qualified names, or D-111's four remedies. Both decisions state required properties; the mechanism is the implementer's.
- **F-80's four divergences.** Each needs an owner's call on whether it is a decision nobody wrote down or drift, and `axis` in particular has a real rename cost against no violated rule.
- **F-81's instrument.**
- **Anything in the bundle entry.** It stays closed at `d949cfeb`. D-108 moves bytes upward and is argued entirely on the authoring contract; if it forces a re-base, M-3′'s standing rule governs and no budget is widened to avoid a correctness fix.

## Corrections to the record made here

- **02 §The vocabulary and 03 §The export topology**: 33 types → **35**, with both additions attributed to the decisions that made them and the count marked descriptive.
- **A false finding was caught before it was written.** An early grep for the dev-assertion strings in the built tree found all of them and appeared to contradict D-107's _`__DEV__` folds completely_. It did not: the hits were in `frames.js.map`'s `sourcesContent` and in preserved JSDoc, and the emitted functions really are empty. **That is the fifth instance this phase of one error class** — P-02's superseded curve, P-01's unreachable regime, the free-drag division, D-106's `renderedLength` ranking, and this — **a proxy read where the quantity was meant.** The first four reached the record and were corrected on challenge; this one did not, because the built tree was checked against the minified artifact before anything was written down.