# Phase 22 — the bundle-structure entry

**Run 2026-08-22** against `e9590c3c`, on a clean tree, from a fresh `just build`. This is the second of Phase 22's four deliverables and it is read the way `plan.md` §Phase 22 states it: _composition costs across the full topology, and whether the subpath set is still the right shape with two behaviors and two axes._

**It re-measures rather than infers.** [M-3′](measurements/m3-prime.md) is the baseline, and P-06 and P-02's shrink have landed since it ran. Both recorded their own per-row deltas, and a delta recorded at landing is a claim about the tree at landing — so every figure below comes from a fresh build, and none is reconstructed by adding published deltas to M-3′'s table.

## Reproducibility

The six inputs [05](contract/05-lifecycle-invariants.md) §Measurements owed asks for. Five are unchanged from M-3′ because they are values in `bench/size/measure.ts` rather than flags, and the sixth is this run's tree.

| Input | Value |
| --- | --- |
| Workload and harness | `bench/size/measure.ts`, checked in, unmodified by this pass |
| Tree | `e9590c3c`, clean, `just build` immediately before measuring |
| Bundler | Rolldown **1.1.5** (workspace lockfile), `platform: 'neutral'`, ESM out, no aliases |
| Minifier / compression | Rolldown built-in `minify: true`; Brotli via `node:zlib` at default quality (**11**) |
| Engine | Node **v26.7.0**, Linux x86_64 |
| Sampling | None, and none is needed — the pipeline is deterministic, which `tests/bench/size.node.test.ts` asserts rather than assumes |

**One figure in this document is not produced by the checked-in harness** and is marked where it appears: the per-module attribution of the floor (§Where the fixed cost lives). It was taken by an ad-hoc script driving the same Rolldown configuration the harness declares, run from the package tree and discarded — **telemetry taken once**, not a standing assertion.

**The other one is no longer telemetry.** The bundled cost of the two root entries (§The two roots) was the second, and **F-77 closed on 2026-08-22**: both roots are declared compositions in `bench/size/measure.ts` and are asserted on every `just size`.

## The twelve declared rows

All figures Brotli bytes; `slack` is budget minus measurement; `mods` excludes the harness's synthetic entry.

| Composition | Brotli | Budget | Slack | Mods |
| --- | --: | --: | --: | --: |
| minimal | 11,139 | 11,260 | 121 | 31 |
| minimal (xy) | 10,801 | 10,940 | 139 | 30 |
| minimal + layoutAnimation | 11,571 | 11,700 | 129 | 32 |
| minimal + landing | 11,423 | 11,540 | 117 | 33 |
| complete | 11,849 | 11,970 | 121 | 34 |
| free drag minimal | 8,717 | 8,870 | 153 | 26 |
| free drag + bounds | 8,863 | 9,010 | 147 | 27 |
| free drag + landing | 9,016 | 9,170 | 154 | 28 |
| free drag complete | 9,162 | 9,310 | 148 | 29 |
| both behaviors | 13,396 | 13,520 | 124 | 47 |
| baseline A — feature-matched, non-composed | 11,566 | 11,680 | 114 | 30 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | 7,040 | 151 | 26 |

**Every row is under budget and every graph assertion passes.** `just size` exits 0.

**Marginal cost of each optional feature**, which is the property §Tree-shaking asserts and the one a budget cannot express on its own:

| Feature                  | Marginal |
| ------------------------ | -------: |
| `layoutAnimation()`      |     +432 |
| sortable `landing()`     |     +284 |
| both sortable optionals  |     +710 |
| `bounds()`               |     +146 |
| free-drag `landing()`    |     +299 |
| both free-drag optionals |     +445 |
| `y()` over `xy()`        |     +338 |

The two optionals are additive on both behaviors to within brotli's noise — 432 + 284 = 716 against a measured 710, and 146 + 299 = 445 against a measured 445. **Additivity is the observable, not the totals**: it is what "each optional feature adds only itself" looks like in bytes, and it is the byte-side companion to the graph absences.

## The topology tests

**The union identity holds at 47 = 47.** The combined composition pulls exactly the union of `complete` and `free drag complete`; no module appears in the combined graph and neither single graph, and none is lost. D-48's `kernel.js` split still holds at two behaviors, two axes and one landed optimization, and no export-topology question is opened.

**Nothing is emitted into more than one chunk**, in any of the twelve rows.

**Cross-behavior absence holds on all ten behavior rows.** No sortable composition reaches a `free-drag/` module and no free-drag composition reaches a `sortable/` module, asserted as a subtree prefix so the claim stays total over a growing tree.

**The exclusivity assertions hold, including the one that has actually failed.** The unselected axis is absent from every composition; `sortable/verified-refresh.js` is absent from `minimal (xy)` and present on all six rows that reach it. That second pair is the important one: it is the claim P-06 broke, D-102 held the budgets red over, and the implementation then satisfied. **The instrument caught a real topology mistake once, which is the only evidence that it would catch the next one.**

## The two roots, measured for the first time

`files.json` publishes **ten** runtime subpaths. `bench/size` declares compositions over **eight** of them. The two it has never weighed are `drag.js` and `kernel.js` — the shared-vocabulary root and the kernel tier.

That omission is not incidental to this deliverable, because [03](contract/03-feature-composition.md) §The export topology this requires opens by saying what a subpath is _for_:

> A separate subpath entry per optional **capability** is what makes the measurement honest: the minimal fixture's import graph physically cannot reach geometry it did not import, independent of bundler heuristics.

and D-56 deleted three subpaths on the converse — **a subpath carrying no runtime machinery measures nothing** — admitting exactly one exception, a type-only entry that makes no isolation claim to be checked. `sortable/feature.js` and `free-drag/feature.js` are that exception and are correctly out of scope: they emit `.d.ts` and no `.js`.

`drag.js` and `kernel.js` are not that exception. Both carry runtime machinery, both make an isolation claim in the contract's own table, and neither has ever been weighed. **Measured here:**

| Root | Brotli | Modules | What it pulls |
| --- | --: | --: | --- |
| `drag.js` — `{ DraggableError }` | **121** | **1** | `kernel/errors.js` only |
| `kernel.js` — `{ draggable }` | **6,514** | **12** | the kernel floor |

**The 121 B figure is the strongest evidence the three-root topology has ever had, and it is the check the contract asked for by name.** 03 §The export topology records a standing doubt about that topology:

> **Two independent arguments have now produced the same three-root topology, and that deserves suspicion rather than confidence.** The first was structural type dependency and it lasted one revision; the second is runtime-value sharing. Both were derived from the same table, by the same author, in the same week. The topology has never been checked against a consumer who did not already believe it — `tests/packaging.node.test.ts` asserts what the table says, not that the table is right.

A bundled measurement of the roots is precisely a check that does not depend on believing the table. It says: a consumer who wants `err instanceof DraggableError` and nothing else pays **one module**, not the 6.5 kB kernel — 121 bytes when this was written, **261 after D-132** put `STAGE_NAMES` inside the class's own reach. The argument for giving shared vocabulary its own root — that neither tier should have to import the other to name a symbol both hand out — is now a **measured** property rather than a derivation, and **the doubt at 03 §The export topology closes**.

**And the isolation is real but not structural, which is why a standing assertion is worth having.** ~~`src/kernel/errors.ts` imports thirteen runtime `FAILURE_*` constants from `./failures.ts` and uses them as computed keys in `STAGE_TO_CODE`, and `drag.js` still bundles to one module because Rolldown shakes `STAGE_TO_CODE` and `toDraggableError` away from the `DraggableError` class in the same module.~~ **The subject moved at D-132 and the sentence's claim did not.** `errors.ts` names `FailureStage` as a type only now, so the edge this paragraph guarded is gone from that module — and `drag.js` itself acquired the equivalent one, importing the twelve constants from `kernel/failures.js` in order to re-export them (D-132 §6). Measured at 0 B and 0 modules for a consumer taking only the two classes. **That is a tree-shaking outcome, not a guarantee**, exactly as before: one side effect in `failures.ts` and `drag.js` grows to carry it, silently, which is why the standing assertion is worth _more_ after the decision than before it.

That is exactly the failure mode the harness's own doctrine names — _a module can be pulled in, shaken down to almost nothing, and show up as a small delta that reads like success_ — applied to a subpath the harness does not measure. It was recorded as **F-77**, and F-77 is **closed**: both rows are declared, and the two regressions they were built for were each injected and each caught. See §F-77.

**One fact the roots' graphs turned out to carry, which this section did not know when it first weighed them.** `kernel.js` does not pull `kernel/errors.js` either — `draggable` alone never names the class — so the two roots are **disjoint** rather than nested. D-48's _neither tier should have to import the other to name a symbol both hand out_ therefore holds in both directions, not one, and that is now asserted rather than observed.

**`tests/packaging.node.test.ts` is not the missing assertion and should not be mistaken for it.** It walks the _source_ import graph from declared entrypoints and asserts physical unreachability _independent of any bundler's tree-shaking heuristics_ — which is a stronger claim where it applies and a different one here. On the source graph `drag.js` **does** reach `kernel/failures.js`. The 121 B is a statement about the bundled graph, and only a bundled-graph instrument can hold it.

## Where the fixed cost lives

**The cross-behavior shared set is 16 modules**, and this is the first run to enumerate it rather than count it:

`kernel.js`, and under `kernel/`: `errors`, `frames`, `input-policy`, `invalidation`, `kernel`, `lifetimes`, `pointer`, `presentation`, `protocol`, `queue`, `realm`, `reporter`, `seams` — thirteen. Plus `shared/landing-runner.js`. Plus **`@ydinjs/box-quad`**.

**M-3′'s prose breakdown of this set is wrong and the total is right.** It reads _"the fifteen under `kernel/` plus `shared/landing-runner.js`"_. There are **thirteen** under `kernel/`; the fourteenth is `kernel.js` at the package root, and the sixteenth is an **external package**, not a kernel module. The correction is recorded in [`m3-prime.md`](measurements/m3-prime.md); the union identity M-3′ actually asserted is unaffected, because it was scored over module sets rather than over that sentence.

**The floor, and what can and cannot be divided:**

| Reading | Brotli | Modules |
| --- | --: | --: |
| `kernel.js` alone (`draggable`) | 6,514 | 12 |
| a free-drag-only consumer, minimal | 8,717 | 26 |
| a free-drag-only consumer, complete | 9,162 | 29 |
| a two-behavior page | 13,396 | 47 |
| doubly-counted content, `complete` + `free drag complete` − `both behaviors` | 7,615 | (16 shared modules) |

**A brotli bundle does not decompose into a shared part and a specific part, and the last row must not be used as though it did.** It estimates content counted twice **between the two complete compositions**, both of which contain all sixteen shared modules. It may not be subtracted from `free drag minimal`, which contains only fifteen of them — `shared/landing-runner.js` arrives with `landing()`, not with `freeDrag()`.

**What is exact is containment, and it gives a bound in each direction.** A free-drag-only bundle strictly contains the twelve-module `draggable` floor, so **at least 6,514 B — about 75% — is kernel a free drag cannot run without**, and the eleven-module free-drag layer of that composition is **at most 2,203 B, about 25%**. It is a bound rather than a split because free drag also reaches three kernel modules the `draggable`-only floor does not (`kernel/errors.js`, `kernel/input-policy.js`, `kernel/invalidation.js`), and those sit inside the 2,203 B alongside the free-drag code.

> **Correction, 2026-08-22, and it is this document's own error.** The first version of this section subtracted the 7,615 B figure from `free drag minimal` and reported _~7.6 kB of shared infrastructure to get ~1.1 kB of free drag_, at _~87% shared_. That is wrong three ways: it subtracts a sixteen-module shared set from a composition holding fifteen of them; it treats a non-additive estimate as a term in an exact subtraction; and the residual it produces describes the **minimal** free-drag layer while reading as though it described all free-drag code. **The claim is withdrawn and replaced by the bounds above and the marginals below.** The two-behavior figure — 7,615 B of 13,396 B, ~57% — is unaffected, because there both compositions do contain all sixteen, and it is an estimate quoted as one.

**Three kernel modules are in every behavior composition and not in the `draggable`-only floor**: `kernel/errors.js`, `kernel/input-policy.js`, `kernel/invalidation.js`. So the effective floor for anyone who installs a behavior is **15 modules, not 12**, and the 6,514 B row understates it. `kernel.js` alone is not a deployment — nobody ships `draggable` without a behavior — which matters for §The declines below.

**Within the floor, by own code weight** — each module bundled with every import external, so only its own body is emitted, minified. Comments are gone, and cross-module minification is not modelled, so this ranks code weight rather than predicting shipped bytes:

| Module | Own minified | Brotli |
| --- | --: | --: |
| `kernel/kernel.js` | 10,810 | 3,784 |
| `kernel/presentation.js` | 3,039 | 1,258 |
| **`@ydinjs/box-quad`** (the two exports drag2 imports) | **2,036** | **962** |
| `kernel/frames.js` | 1,756 | 646 |
| `kernel/seams.js` | 1,428 | 657 |

> **Correction, 2026-08-22, and it is the same error class as the free-drag division above.** This table first published Rolldown's `renderedLength` — **45,024 / 10,425 / 9,205 / 6,291 / 5,371** — labelled _a pre-minification proxy, quoted for ordering rather than as shipped bytes_. **The label was not enough, because the proxy is not even reliable for ordering.** `renderedLength` counts JSDoc, and this codebase's comment density varies by an order of magnitude between modules: `kernel/seams.js` outranked both `box-quad` and `kernel/frames.js` on rendered bytes and is **below both** on code weight, and `sortable/verified-refresh.js` ranked fourth in the graph at 10,062 B rendered against **1,263 B** of own code — tenth. **A figure that has to be labelled as a proxy in the sentence that quotes it is a figure that should be measured properly instead**, which is what the table above now does.

**This corroborates M-2′ from an independent direction and that is the finding worth carrying.** M-2′ measured ~80% of per-controller _retained heap_ as common to both behaviors. This run bounds a free-drag consumer's _shipped bytes_ at **~75% common**. They are different quantities — space at runtime against bytes on the wire — and neither is evidence for the other. What they agree on is structural: **the kernel is the artifact and the behaviors are thin.** D-99 named that as prioritisation context and explicitly refused to make it a candidate; it is still context, and it is now context in two dimensions.

## The free-drag layer, reconciled against the source tree

**Added 2026-08-22 in response to a challenge to the withdrawn ~1.1 kB figure**, and it is the reconciliation that figure should have carried from the start. `src/free-drag/` holds **13** `.ts` files, which is not the number of modules any bundle contains.

|  | Modules | Which |
| --- | --: | --- |
| `src/free-drag/` source files | 13 | including `feature.ts` |
| of those, runtime-bearing | **12** | `feature.ts` is type-only — it emits `free-drag/feature.d.ts` and no `.js`, and never enters a runtime graph |
| plus the subpath root `src/free-drag.ts` | **13** | the full free-drag layer as a bundler sees it |
| reached by **free drag minimal** | **11** | root + `assemble`, `behavior`, `config`, `controller`, `domain`, `frames`, `geometry`, `runtime`, `slots`, `spec` |
| added by **free drag complete** | **+2** | `bounds.js`, `landing.js` — the two optional features |

So the counts reconcile exactly: 13 source files, one type-only, 12 runtime plus the root, and the complete composition reaches all 13. **The minimal composition reaches 11 of them, and that is the composition the withdrawn figure was computed from** — which is the second reason it could not have meant _all free-drag code_.

**What the layer costs is a marginal quantity, and marginals are exact where a decomposition is not:**

| Marginal | Brotli |
| --- | --: |
| the **complete** 13-module layer, added to a complete sortable page | **1,546** |
| the **minimal** 11-module layer, added to a complete sortable page | **1,396** |
| `bounds()` + `landing()` added to a standalone free drag | 445 |
| `bounds()` + `landing()` added to a page that already runs sortable's `landing()` | **150** |

**Those last two rows are the same two modules at 445 B and 150 B, and the gap is the whole point.** `shared/landing-runner.js` is already paid for when sortable's `landing()` is composed, so free drag's `landing()` adds only its installer. **There is no context-free answer to _what does the free-drag layer cost_** — it costs what it costs against a stated base, and this document states one every time it quotes a number.

**The sanity check the challenge was really asking for.** The free-drag layer is **9,783 B of own minified code across its 13 modules**, `free-drag/spec.js` alone 4,957 B of it. Thirteen modules reaching a marginal 1,546 B compressed is Brotli doing ordinary work on ~9.8 kB of code against a bundle that already shares a dictionary with the kernel. **It is not thirteen nearly-empty modules**, and the withdrawn phrasing invited exactly that reading. (This paragraph first quoted **30,778 B rendered**; that figure counts JSDoc and is corrected with the table above.)

## What composition costs, and a contract question that closes with it

**283 B, or 2.4% of `complete`** — 11,849 B composed against baseline A's 11,566 B feature-matched hand-written build.

03 §What isolation cannot shake asks for exactly this and has been waiting on it:

> Measure the fixed cost too, and compare it against a hand-written, non-composed sortable […] That plumbing may well be entirely acceptable. It has not been weighed.

**It has now been weighed twice and it has not moved**: 289 B at M-3′, 283 B here, across P-06's new module and P-02's new branch.

> **Re-taken 2026-08-27, and it moved down for the first time: 221 B, 2.0% of `complete`** — 10,799 B against baseline A's 10,578 B. D-146 replaced the discovered contribution with per-key groups, which deleted `claim`, its five call sites, both `duplicate-contribution` identities and five nullable accumulator locals. **The second and third items in the list below are what shrank**, and the figure is quoted here rather than rewriting the 2026-08-22 measurement above, which was correct when it was taken. The stability claim survives in the form that matters: the overhead has never grown with the feature count, and the one time it moved, it fell. The composition machinery — the optional keys in `SortableContribution`, the assembler property reads and `claim` branches, the nullable slot fields and their null checks, the three always-present pipeline arrays — costs a stable 2.4% and does not grow as features are added to it. **That is the property worth having, more than the number**: an overhead that grew with the feature count would be an argument against the composition model, and this one does not.

## The declines

**No size candidate is earned.** The test applied is D-99's — a measurement changes a named decision or it is telemetry — and the user's framing of this deliverable: a candidate must be **material and locally removable**. Everything material here is not locally removable, and everything locally removable is either immaterial or refused by a standing decision.

| Considered | Size | Why it is declined |
| --- | --- | --- |
| **Split the kernel further** so `draggable`-only consumers ship less | 6,514 B floor | The `draggable`-only configuration **is not a deployment**. Nobody ships the kernel without a behavior, and the effective floor is 14 modules rather than 11. Optimizing a graph no consumer builds is optimizing telemetry |
| **Make keyboard sorting optional** | 379 B min / **221 B brotli** | Locally removable and **refused by decision**. Phase 16, D-32/D-33: keyboard sorting is a `BehaviorSpec` member rather than a feature precisely so a consumer cannot tree-shake away the second input mode. That is a deliberate accessibility position, and **a bundle pass may not reopen an accessibility decision on byte grounds** |
| **Make `kernel/input-policy.js` optional** | 469 B min / **234 B brotli** | The same class. It exists because of a release-blocking input-policy finding; making it composable would make the safe configuration the opt-in one |
| **Split `sortable/spec.js`** | 7,888 B min / **2,585 B brotli**, the largest behavior module | No measured problem attaches. A module boundary under `unbundle` is priced at ~60 B by the Phase 17 precedent, and the split buys nothing a consumer can tree-shake, because every composition that reaches `sortable.js` reaches all of it |
| **Trim or inline `@ydinjs/box-quad`** | 2,036 B min / **962 B brotli** | Not drag2's to remove, doing work D-72 and D-85 depend on, and its placement is already asserted — `tests/packaging.node.test.ts` holds the geometry package out of every _behavior_ module, and it is reached from `kernel/presentation.ts` by design |
| **Recover P-02's absorbed +34 B** | 34 B | Immaterial, and recovering it would mean re-opening a landed optimization to save a quarter of one row's remaining slack |
| **Composition overhead** | 283 B, 2.4% — **221 B, 2.0% since D-146** | The price of the architecture, stable across two feature additions and lower since the per-key groups deleted `claim`, and the thing 03 asked to have weighed rather than removed |

**The subpath set is the right shape.** Ten runtime entries, each carrying runtime machinery a composition either imports or does not; two type-only entries that measure nothing and say so, which D-56's rule admits by name. Two behaviors, two axes, and the union identity holds across all of it. **Nothing here argues for adding a subpath, and nothing argues for removing one.**

## The optimization question, answered — 2026-08-22 (D-107)

**The first pass closed this entry on accounting and structural verification: budgets, graph identities, attribution.** None of that is a search for something to remove. This section is that search, run afterwards and on its own terms, against one question — **does the packed artifact contain any material, locally removable cost actually worth optimizing?**

**Method, because it decides the answer.** Every figure below is an **ablation**: the composition is bundled and minified, a candidate is neutralised in the emitted code, the result is re-compressed, and the delta is the cost. Counting characters in the source would have priced all of this several times too high — Brotli removes most of what a source reading would bill. Nothing here changed a production file.

### The one material non-structural cost: error message text

**741 B on `complete` — 6.3% of the bundle**, 825 B on `both behaviors`, 584 B on `free drag complete`. That is larger than any optional feature this package ships (`layoutAnimation()` is 432 B, `landing()` 284 B) and larger than P-06's entire module. It is the only thing the sweep found at that scale, and it splits cleanly in two.

| Class | Site | Compressed on `complete` | Recorded rationale for shipping it |
| --- | --- | --: | --- |
| **A1** — frame-part shape validation | `kernel/frames.ts` `validateFramePart` | **~276–300** | **Yes**, twice — contract 04 by name, and review 4 §28 |
| **A2** — `arm()` static spec validation | `kernel/kernel.ts` `config.actionTags`, `command.types` | **~152–161** | **None on record** |
| **B** — runtime and consumer-callback diagnostics | `sortable/spec`, `free-drag/spec`, `presentation`, `placement` | **424** | n/a — they fire in correct deployments |

**A1 and A2 are the same strings in every composition**, because both live in the kernel: together ~446–471 B on every row including the bare `kernel.js` root. A kernel saving pays everywhere, which is exactly the prioritisation shape D-99 described — so if anything here were removable, this is the half worth having. **An independent source-side audit run in parallel converged on the same two sites and the same figures** without seeing this document's numbers, which is the closest thing to a replication available here.

**A2 is the one with no cover, and it is worth stating plainly.** It validates behavior-author-supplied static spec once at `arm()`, it sits four lines above an `assertFrameShapesMatch` call that **is** `DEV`-guarded, and the comment beside it (_static spec data, validated once, exactly as `actionTags` is_, D-32) justifies validating **once** rather than validating **in production**. On the evidence in the repository it is the only thing in this sweep that looked like a live candidate.

### Both A halves are declined — and the decisive reason is not the one on record

**A1 has explicit normative cover. Contract [04](contract/04-frame-slicing.md) §Dev-only invariants decides it by name** — and D-108 has since applied that same discriminator to the four checks beside it, which now ship unconditionally too:

> Properties the type system cannot prove. All are `__DEV__`-gated and compile out of production. The kernel-key collision check is **not** here — it is a production check in `validateFramePart` (§Composition), because its failure mode is silent state corruption.

**The code says the same thing in the same words**, and `src/kernel/frames.ts` is not accidentally unguarded — it holds **both** families and keeps them apart deliberately. `assertFrameShapesMatch` and `assertFrameScrubbed` open with `if (!DEV) { return; }`; `validateFramePart` does not, and a comment where the dev-only block begins states why: _the kernel-key collision check is deliberately NOT here — it is a production check in `validateFramePart`, because its failure mode is silent state corruption rather than a stale reference._ **The module already imports `DEV`.** So this is not a gate someone forgot to apply; it is a gate someone declined to apply, in writing, twice.

**And the failure mode argument survives being re-read.** A malformed frame part does not throw later and elsewhere — it silently violates the fixed-record model the whole frame-slicing design rests on. `validateFramePart` runs once, at `arm()`, which both behaviors' `frames.ts` document (_`validateFramePart` rejects one at `arm()`_ / _rejects one in production_). **A once-per-controller check against silent state corruption is not defence in depth, and the standing rule that a budget may defer defence in depth does not reach it.**

**This is the keyboard and `input-policy` category**: a safety position taken on non-byte grounds, which a bundle pass may not reopen on byte grounds. **~290 B is the price of that position and it is now known**, which is the useful outcome — the position was made long ago and had never been costed.

**A2 has no such cover, and it is declined on an argument that reaches both — one that came out of trying to remove them.** The case for gating either is that `src/kernel/dev.ts` states a policy they appear to violate:

> The trade is that a **consumer** cannot turn them back on. That costs nothing today: these assertions check _behavior authoring_ — frame-part shape, reset exhaustiveness, unconsumed staged values — and **behavior authoring is not on the public surface** (contract 03 §public boundary). **The day it is, this needs revisiting**: either a dual build under an `exports` condition, or an inline `process.env.NODE_ENV` comparison at each site rather than a shared constant.

**That day has passed, and the conclusion inverts.** D-61 published `sortable/feature.js` as the ladder's second rung so a third party can author a feature without writing a behavior; D-70 added `free-drag/feature.js`; D-68 rebuilt `kernel.js` to publish `BehaviorFactory`'s whole structural closure — 33 values and 35 types — for the express purpose of letting someone author a behavior. Contract 03 §The public/internal boundary now reads _three tiers over three entry roots_. **Behavior authoring is on the public surface, and has been since Revision 2.1.**

So the premise that made author-facing validation cheap to strip is void. **Under the current surface these two blocks validate a published, supported, third-party authoring API**, and moving them behind `__DEV__` would strip validation from a public surface in exactly the build a third-party author ships. **A2 is declined for the same reason as A1, and A1's recorded rationale is now the weaker of its two arguments.**

**Superseded in part, 2026-08-24 — [D-118](plan.md), which is where a later pass reads the `command.types` half.** The decline above stands as made: it answers the **gating** question, on the ground that this code validates a published authoring API, and D-118 does not reopen that. What has moved is the validation itself. D-118 decided the loop's two surviving array-shape checks on `CODE_OF_SIZE.md` §1.1 — _whose invariant, not whose mistake_ — and **deleted both**: an empty array and an empty-string entry are supported spellings, and only the `pointerdown` collision remains. The **None on record** cell above is therefore true as of this run's date and not after it — a decision now covers part of A2, on non-byte grounds.

**The finding is not the bytes; it is that `dev.ts`'s own revisit condition fired and nothing noticed.** It is recorded as **F-78**, and it points the other way from a size candidate — the remedies `dev.ts` names (a dual build under an `exports` condition, or a per-site `process.env.NODE_ENV` comparison) would give a third-party author their assertions back and cost the production bundle nothing. **That is an `exports`-map question and belongs to the API deliverable**, not here.

### Class B is declined on judgment, and the judgment is stated so it can be overturned

These are the messages that fire from **runtime conditions and consumer callbacks** — `onReorder resolved with a value that is not a ReorderResolution`, `moveTo() was given a point that is not finite`, `the dragged visual has no readable box space (disconnected, fragmented, or 3D-transformed)`, `the placeholder was detached or moved out of the list during the reorder commit`. Unlike Class A they **can** fire in a correct deployment, because the condition is the page's state or the consumer's own returned value rather than the developer's construction.

**Declined, for three reasons in descending strength:**

1. **They are the only specific information a production error handler ever receives.** ~~D-64 deliberately narrowed the consumer surface to a coarse `DraggableError.code` — four classes — with detail on the `cause`, so stripping the cause's message leaves a consumer with `presentation` and nothing else.~~ **D-132 changed the input to this reason and not its direction.** The consumer now receives a twelve-way `stage` and a message that names it in words, which is more than `presentation` and still far less than the cause — and D-132 §5.3 explicitly declines to read itself as licence to reopen this decline. A later size pass may; it must do so on its own argument.
2. **Contract 04's dev-gating rule does not admit them.** It gates _properties the type system cannot prove_ — assertions about invariants. The diagnostic text of an error that actually fires is not an assertion, and gating it would be applying a rule outside the domain it was written for.
3. **The exchange is bad on its face**: 424 B against the debuggability of every production drag failure.

**What would overturn this**: evidence that a supported deployment is bundle-constrained at a scale where 424 B matters — the same deployment-shape question D-99 asked of P-02 — or a design that keeps a machine-readable reason while dropping the prose, which is an API change and belongs to the API deliverable rather than here.

### Four sweeps that found nothing, recorded so they are not re-run

- **`__DEV__` folding is complete.** Zero occurrences of `__DEV__` survive in any built runtime file; the guarded blocks are gone, not merely inert.
- **`@ydinjs/box-quad` shakes correctly.** It exports five symbols and `kernel/presentation.ts` imports two. `cache`, `projection` and `quad` are **verifiably absent** from the bundled output, and the 259 B they would cost is not being paid. The exclusivity principle P-06 was held to already holds across this package boundary.
- **The largest single literal in the bundle is not a candidate.** `LIFTED_PROPS` in `kernel/presentation.ts` is 563 B raw — bigger than any error message — and **142–152 B compressed**. The list cannot shrink: its own doc block argues the longhand expansion is a correctness requirement, since restoring by shorthand calls `removeProperty('margin')` and permanently drops an authored `margin-left`, and `!important` priority is per-declaration and cannot be expressed as one shorthand entry. **Its encoding cannot improve either — the minifier has already collapsed the ~45-entry array into one dot-delimited string.** A source-level rewrite here would be re-doing work the toolchain does.
- **Cross-behavior duplication is real, was located, and costs almost nothing.** The parallel audit found it precisely: `claim<T>` in the two `assemble.ts` differs only in a label prefix (`sortable:` / `free drag:`), the `catch` unwind is byte-identical, and `MINTED`/`STARTED`/`RESOLVING`, `rejection`, `finalized` and `reportFailure` are identical across the two `spec.ts`. **Measured against the real combined bundle, the second copy of all of it totals ~187 B of 11,656 — 1.6% — and exactly 0 B for a consumer bundling one behavior**, which is every composition except `both behaviors`. De-duplicating would add import plumbing and a label parameter and claw back much of that.

  **The bundle-level reading agrees.** Free drag ships alone at 26,654 B minified → 9,162 B Brotli, **2.91:1**. Added to a page already running sortable, its 13 modules and 9,783 B of own minified code cost a marginal **1,546 B — 6.33:1**. The second behavior compresses more than twice as well as the first, because the first has already filled the window. **Source de-duplication would be competing with a compressor that has already found most of it**, for a share of 1.6% of one composition — and it is the broad architectural rewrite this pass was told not to propose.

### Two costs that are real and are not bundle costs

Recorded here because both were found by this sweep and neither belongs to it.

- **54.1% of the published JavaScript is comments** — 114,914 B of 212,229 B across 51 files, with `kernel/kernel.js` about half comment and `sortable.js` near nine-tenths. **The bundle cost is exactly zero**: every composition here is minified, and the budgets gate on Brotli after minification. It is a **tarball and unbundled-CDN** cost — a consumer who imports the package unbundled from a CDN, or who counts `node_modules` weight, pays all of it. That is a packaging question, not a composition one, and this document takes no position on it beyond recording the figure so the next reader does not mistake a large number for a bundle finding.
- **`@ydinjs/box-quad` declares no `"sideEffects": false`.** It costs nothing under Rolldown or Vite, and this package's own measurements are unaffected — the shaking is already clean. It matters for a **webpack** consumer, and it is a one-line change in another package. Noted, not actioned.

### Why the large costs are intrinsic

Ranked by own code weight rather than by rendered bytes, **three modules are 47% of the package's own code**: `kernel/kernel.js` at 10,810 B (21.5%), `sortable/spec.js` at 7,888 B (15.7%) and `free-drag/spec.js` at 4,957 B (9.9%). Those are the kernel state machine and the two behavior implementations. **They are large because they are what the library does**, and nothing in them is separable without removing a capability — which is the definition of not-locally-removable.

**Nothing in this sweep is both material and locally removable.** The largest identified cost is 741 B of error text: ~446–471 B of it validates a **published** third-party authoring surface, and the remaining 424 B is the only specific information a production error handler ever receives. **The bundle optimization question closes with no candidate** — and it closes having been asked properly rather than inferred from the accounting pass, which is the difference between _we found nothing_ and _we did not look_.

### The correction this sweep forced on the pass that preceded it

**Ranking modules by `renderedLength` was wrong, and it is the same error class as the free-drag division corrected above.** `renderedLength` counts JSDoc, and comment density in this package varies by an order of magnitude between modules, so the proxy distorted both the magnitudes and the order. Every decline in §The declines was quoted 3–8× too large:

| Quoted as | Actually |
| --- | --- |
| keyboard, ~1,534 B rendered | 379 B minified, **221 B Brotli** |
| `input-policy`, ~4,030 B rendered | 469 B minified, **234 B Brotli** |
| `sortable/spec.js`, 24,395 B rendered | 7,888 B minified, **2,585 B Brotli** |
| `box-quad`, 6,291 B rendered | 2,036 B minified, **962 B Brotli** |
| the free-drag layer, 30,778 B rendered | 9,783 B own minified |

**The declines themselves stand** — every one was made on a decision, not on a size — but a reader would have concluded that large savings were being left on the table, and they are not. **The lesson is the one this phase keeps relearning**: a figure that must be labelled a proxy in the sentence that quotes it should be measured properly instead. That is now four instances of one error class — P-02's superseded curve, P-01's unreachable regime, the free-drag division, and this.

## Headroom: do not re-base, and the condition that changes that

Slack runs **114–154 B** against M-3′'s uniform _measurement plus ~150 B_ rule — tightest at baseline A (114) and `minimal + landing` (117), loosest on the free-drag rows (147–154), which nothing has touched since M-3′.

**The drift is fully attributable and it is one landed change.** P-02's shrink cost +34 B on the `y()` compositions and +14 B on `minimal (xy)`, absorbed rather than re-based. **That absorption followed M-3′'s rule rather than bending it**: _a change that fits inside it silently is a change that added no module_ — and P-02 added no module. The free-drag rows did not move because P-02 does not reach them, which is itself a small confirmation that the erosion is the change it is claimed to be.

**Do not re-base, and the reason is that the instrument's sensitivity where it matters has not changed.** The failure this headroom exists to catch is a module appearing in a graph. Two modules have actually appeared in this package's history: `sortable/verified-refresh.js` at 361–388 B and `sortable/rect-index.js` at ~60 B. At 150 B of slack the first trips the budget and the second does not; at 117 B the first trips the budget and the second does not. **Nothing about what this instrument detects has moved**, and a re-base would spend real detection margin to make a table look uniform.

It would also invert the instinct D-102 ratified — _an absorbed number is a number nobody reads again_ — by establishing that headroom is restored on a schedule rather than on an event. M-3′'s own rule is that a budget re-bases **on purpose, with its reason written down**.

**The re-base conditions, stated so the next pass does not have to re-derive them:**

- a row goes negative; or
- erosion stops being attributable to a named landed change — at which point the number to investigate is the attribution, not the budget; or
- **L-11 lands.** `plan.md` §Phase 23 books five runtime cells onto two frozen entrypoints, and 05 §Measurements owed makes the frozen export map part of M-3 by construction, so that change re-measures M-3 whether or not it moves a byte. It is the next scheduled re-base event and it is not Phase 22's.

**Carried live as [SC-1](obligations.md) from 2026-08-22 (D-116)**, which is where a later pass reads these three. The register states them in the present tense and re-derives their citations against today's tree: `05 §Measurements owed` was never a heading in 05, so SC-1 cites [`05 §Measurements — landed 2026-08-02`](contract/05-lifecycle-invariants.md), where the frozen export map is one of the six stated reproducibility preconditions. The list above is the wording as decided and stands as it stands.

## F-77 — two published runtime roots carry no bundled-isolation assertion

**Closed 2026-08-22, by the harness change it asked for and by one it did not.** `drag.js` and `kernel.js` are now declared compositions in [`bench/size/measure.ts`](../bench/size/measure.ts), asserted on every `just size`. **No production code changed**, which was the condition.

| Row | Brotli | Budget | Graph assertion |
| --- | --: | --: | --- |
| `vocabulary root - drag.js` | **121 B** | **150 B** | `only: ['kernel/errors.js']` |
| `kernel root - kernel.js` | **6,514 B** | 6,660 B | `present` + no `sortable/`, no `free-drag/` |

**The graph half needed a capability the harness did not have.** The invariant is _`drag.js` reaches `kernel/errors.js` and nothing else_, and neither `absent` nor `absentPrefixes` can say it: the one module that must appear lives inside the one subtree that must not, and enumerating today's absences answers a total claim with a list that goes stale the moment `kernel/` gains a file. So `Composition` gains **`only`** — the bundled graph, exactly — which is the same vacuity argument that produced `absentPrefixes` and is reserved for roots whose whole point is what they do not reach.

**And the graph half alone would not have closed this.** The packed `kernel/errors.js` carries a **bare** `import "./failures.js"`: `tsdown` inlines the thirteen `FAILURE_*` constants as literals, so machinery arriving from `failures.ts` lands _inside_ `errors.js` and moves no module count at all. This section's own prediction — _one runtime reference from the error class to the stage map_ — is precisely that shape.

**Both regressions were injected, and each is caught by exactly one half:**

| Injected | Graph | Bytes | Caught by |
| --- | --- | --- | --- |
| `DraggableError` method returning `STAGE_TO_CODE` | unchanged, 1 module | **121 → 190 B** | the **budget**, `over budget by 40 B` |

> **The first injection is unwriteable since D-132** and is kept as the dated record it is. There is no `STAGE_TO_CODE` to reference, and `STAGE_NAMES` — which replaced it — was read by the constructor unconditionally, so for one day the regression it modelled _was_ the baseline, at 261 B. **D-133 withdrew that table and the root is 159 B**, so the shape this injection models is a regression again rather than the shipped state.
>
> ~~**What no longer holds is the last column.**~~ **Repaired 2026-08-26 by D-134.** This budget was **150** when the injection was measured, which is where `over budget by 40 B` comes from; D-130 re-based it to **300**, and at 300 the same 190 B artifact would have passed with 110 B to spare — so the budget half of this row caught nothing between that re-base and D-134.
>
> **The ceiling is 205 now, and it is calibrated against a re-run injection rather than against this one.** F-77's original shape names two deleted tables and cannot be written; the current regression class is a runtime need in `errors.ts` for a stage _value_, which lands as inlined literals inside the same single module. Measured on the landed tree: **159 → 220 B, graph unchanged at one module**, breaching 205 by 15 B. The derivation and the injection source are in the row's own comment in [`bench/size/measure.ts`](../bench/size/measure.ts). **The graph half is untouched** and the second injection below still models a live hazard.

| a side effect in `failures.ts` | **+`kernel/failures.js`** | 121 → 140 B, _still under_ | the **graph**, `pulls kernel/failures.js` |

Each mutation was built, measured, reverted and rebuilt; `git diff src/` is empty. **The two halves are not redundant** — neither regression trips the other's half — which is the strongest available evidence that this row is an instrument rather than a formality, and it is the same standard the `xy()`/P-06 exclusivity claim met by actually failing once.

**The budget is 29 B of headroom rather than the standing ~150 B, deliberately.** That convention is sized to _roughly one module_ against 8–13 kB compositions; on a 121 B root, one module's worth of slack is larger than the artifact, and the row would report success through exactly the growth it exists to prevent. Under the first regression every other row moved ~10 B and stayed green — this row is about seven times more sensitive to it, which is the whole reason for declaring it. `plan.md` §Phase 22 warns against closing F-77 _by widening a budget instead of adding the assertion_; the assertion is added, and the budget is **narrowed**.

A legitimate change to `DraggableError` re-bases this number visibly, under the standing rule that a budget re-bases rather than a fix shrinking.

## Corrections to the record

Three, all in documents this deliverable had to read, none affecting a landed decision:

1. **M-3′'s shared-set breakdown** — _"the fifteen under `kernel/` plus `shared/landing-runner.js`"_ — misattributes an external package and `kernel.js` to the `kernel/` subtree. The total of 16 is right. Corrected in place, marked.
2. **03 §Tree-shaking publishes the 2026-08-08 table** — five sortable rows, no free-drag rows, and a headroom sentence quoting _0.11–0.16 kB against budgets set at ~0.3 kB_. It is stale by two re-bases, and 05 §Measurements owed points at it as the live location. Refreshed against this run.
3. **`05 §What would reopen this` does not exist.** It is cited as the authority for _adding a subpath reopens what "minimal" means_ in `plan.md` §Phase 17 and in `bench/size/measure.ts`'s `minimal (xy)` comment. The doctrine is real and 05 §Measurements owed carries it — the frozen export map is part of M-3 — but the heading was never written. **Not fixed here**: one of the two citations is in a source file, and re-pointing a citation is not this document's to land. Recorded so the next pass over 05 either writes the section or re-points both. **Closed 2026-08-22 by D-112**: both citations now read `05 §Measurements — landed 2026-08-02`, and the class is instrumented — `tests/references.node.test.ts` resolves every citation in the normative tree, so a reference with no owner is now a failing test rather than a note.

## What this closes, and what it does not

**Closed.** Composition costs are re-measured across the full topology from a fresh build. The subpath set is affirmed at two behaviors and two axes, with no addition and no removal. Optional code stays out of every composition that cannot execute it, including the one exclusivity claim that has actually failed and been fixed. The fixed cost is located and bounded: a 16-module shared set at ~7.6 kB across the two complete compositions, and at least the 12-module, 6,514 B `draggable` floor — ~75% — inside any free-drag-only bundle. Composition overhead is weighed at 283 B and shown stable, which closes 03 §What isolation cannot shake. The three-root topology's standing doubt at 03 §The export topology closes on a measurement that does not depend on believing the table. **No size candidate is earned, and the bundle-structure entry closes as justified.**

**Not touched.** The API and maintainability deliverables are Phase 22's next two and nothing here anticipates them — in particular, `kernel.d.ts` emitting 35 types against the contract table's 33, and `drag.js.map` appearing in `package.json` `files` without existing on disk, are both **noted and deliberately left** to the API pass, where the packed declaration surface is the subject. §Check D-56 stays Phase R's. L-11 stays Phase 23's. P-02's stride sub-candidate, the committed-move forced flush and P-04/P-05 are untouched by this pass and remain what they were: named, unmeasured, and not started.