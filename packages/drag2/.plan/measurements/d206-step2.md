# D-206 step 2 — the split and capture

> ~~**Implemented 2026-11-01, not yet accepted.** Acceptance is the step-2 feature review's, which this unit stops for before step 3.~~
>
> **Accepted 2026-11-01, at `877fb9612`**, by the architect on the step-2 feature proof ([`d206-step2-feature-proof-claude.md`](../reviews/fin-review2/d206-step2-feature-proof-claude.md)). Record [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §15. Two corrections to this record stay open and are the implementer's, due before `d206-requests.md` is written (§15.2):
>
> - **step2-A:** §Property 12's census counts six object-valued library constants. The tree has thirteen, because type-asserted initializers are missed;
> - **step2-B:** §Runtime counts the façade hop as an added call. It adds a field read, so the net is one call fewer.

**Canonical entry: `drag2:D-206`**, step 2 as `request-application-claude.md` §8 and §14.4 state it: D-201's properties 3, 4, 10 and 12 and its decomposition, as D-202 property 1 carries them. This record holds step 2's implementation status, its figures and its verification. It is **not** the decision's measurement record. `d206-requests.md` is written at step 6, and its absence is still the witness.

**Input.** `222445777` on `drag2/fin-review2`. Its `src/` is the `src/` accepted for step 1 at `44e2074f1`. The baseline suite at the input: 1,368 pass, ten fail, and two browser files do not load. The ten are six `size.node` controls and four `docs.node` surface rows. The two files are `react.browser` and `stories.browser`. This matches step 1's acceptance.

## Owner rulings during the step

Both were asked through the implementer's escalation channel and answered by the owner on 2026-11-01.

1. **Property 12 covers the existing binding.** The census found one module-level mutable binding at the input, `let verifying` in `src/sortable/rect-index.ts`. It was the switch the zero-read census flipped to turn off the development-only equivalence instrument. The ruling: removing it is within step 2's property-12 scope, and DEV-only status is not an exception. Use the smallest mechanism that keeps the instrument's default coverage and lets the zero-read test measure without it. Keep that control isolated from other controllers and tests, with no new module-level binding and no per-pointer allocation. Test configuration may change where necessary, with project routing verified (§Property 12).
2. **Architecture and runtime performance take priority over bundle size for this work.** The split breaches 13 Brotli budgets (§Composition). The ruling: budgets stay unchanged, with no re-base and no further pass spent only on recovering bytes. The attributed growth is recorded below as an **explicitly tolerated size cost for step 2, subject to verification of the implementation**. The ruling authorizes no runtime regression. Measured runtime evidence and call-path analysis are kept apart (§Runtime).

## What landed

| Item | Where |
| --- | --- |
| **The façade.** `Kernel` owns the realm, root, `ExecutionBracket`, ingress `AbortController` and one nullable `#armed` reference. Its members are `closed`, `destroy`, `cancel`, `dispatch`, `fail` and `construct`. Before publication, `cancel` is the idle no-op, `fail` is demoted silently, `dispatch` queues unchecked, and `destroy` and `closed` read the bracket. Three of the bracket's four callbacks forward to the armed controller. The fourth, teardown, runs the armed controller's share and then the ingress abort in a `finally` | `src/kernel/kernel.ts` |
| **The armed controller.** `ArmedController` is a kernel-internal, unexported class. It holds every handler and seam adapter, the current-operation and current-activation slots, the attempt slots, the tail, the click suppressor and the unit-local slots. Controller-scope context is `readonly` fields assigned only in its constructor: realm, root, bracket, ingress signal, spec, frame pair and driver. Its seam adapters and channels are `readonly` initialized fields. `#spec!`, `#frames!`, `#driver!` and every `!this.#spec`, `this.#spec?.` and `this.#spec!` are gone | `src/kernel/kernel.ts` |
| **Construction.** `#arm` validates, composes both frames, constructs the armed controller, publishes it, then attaches ingress, in that order. A throw unwinds: retire the spec once, reset whichever frames exist, abort ingress, withdraw the reference. After publication the unwind reports through the armed controller's channel. Before it, nothing is reported, as before | `src/kernel/kernel.ts` |
| **Property 4, capture at entry.** Each unit entry resolves the operation and activation records once, after its currency check, and passes them down. `#activate`, `#acquireActivation`, `#closeOperation`, `#openResolution`, `#openSettlement`, `#settleCancellation`, `#settlementLive`, `#measureTarget`, `#joinSettlement` and `#startTail` take them as parameters. `#acquireActivation` publishes the activation record and reads its scope back from the local | `src/kernel/kernel.ts` |
| **The settlement input as the seam's capability.** `SettlementAttempt` carries `input` and the operation's `lifetimes` beside the measurement, and is the settlement seam's capability for both phases. `AttemptSlots.settlementInput` is deleted. It is one record per settlement, and the failure report builds one too | `src/kernel/kernel.ts` |
| **The moved leaf takes the lift as its argument.** `SeamDriver.runLeaf` gains an optional argument that it hands to `run`. The per-sample closure stays one controller-stable closure, and `#runMoved` folds into it | `src/kernel/seams.ts`, `src/kernel/kernel.ts` |
| **Property 10, teardown deduplication.** Steps 3–6 are written once, in `#release`. They are reached only from `#retireOperation(identity)`, which keeps the stale-retirement no-op, and from the armed controller's `teardown()`, whose `finally` cancels the tail. The façade's step 7 aborts ingress in its own `finally`. The records are dropped after the frame resets. The `null`-identity retirement mode is removed. The activation discard retires the identity the committed frame names, and `PENDING`'s release retires its own. **A mint failure** builds the operation record as a local and publishes it only beside the `PENDING` commit. On failure it disposes that local's lifetimes and touches no frame and no published slot. It no longer calls `spec.retire` or resets either frame | `src/kernel/kernel.ts` |
| **Property 12.** `let verifying` and `setRefreshVerification` are deleted (§Property 12) | `src/sortable/rect-index.ts`, `.scripts/vitest-config.ts`, `vitest.config.ts`, `tests/sortable/zero-read.browser.test.ts` |
| Contract: 01 §Construction ownership's _the window belongs to arming_ paragraph now names the armed controller, which arming constructs once both frames exist and publishes before attaching ingress. It no longer names `#spec` published last | `.plan/contract/01-construction-ownership.md` |
| COVERAGE: §The split and capture, new. The two construction-window guard rows are re-cited at their new sites | `tests/COVERAGE.md` |

No published type, SPI member or consumer-visible outcome changes. `closed` stays readable and reports `CLOSED` only. The `context.declaration` rows still find `construct` as the only member the class adds to `BehaviorContext`.

## Cases

| Case | Rows |
| --- | --- |
| D-201 property 3 | `capture.node` — _should declare its controller-scope context readonly and definitely assigned_, _should assign its controller-scope context in the constructor alone_, _should test none of its controller-scope context for presence_ |
| D-201 property 4 | `capture.node` — _should be read only at unit entries, request intake, publication and retirement_, _should be written only by the statements that publish or retire them_, _should carry the settlement input as the seam capability rather than in a slot_ |
| D-201 property 10 | `capture.node` — _should write steps 3–6 once_, _should reach those steps only through retirement and physical teardown_, _should retire only an operation the caller names_; `kernel.browser` — _should dispose an operation whose input arming failed and retire nothing else_ |
| D-201 property 12 | `capture.node` — _should hold no mutable binding in src_, _should hold only these object-valued constants in library modules_ |
| **R19** (D-201 E6) | `features.browser` — _should keep calling the construction-time items and onEnd after the options object is reassigned_ |

The structural rows parse the source with the TypeScript compiler API. Each states its sites as an exact list, so a new reader fails until it is classified. **The slot-read list carries one entry outside the three places property 4 names: `#preparationValid`**, the driver's predicate. It reads the cancel request mid-unit through the operation slot, and it is one of the in-unit ledger reads step 3 deletes. Step 2 leaves it in place, as §14.4's out-of-scope list requires. Within a unit the slot cannot change before the unit's own retirement, so it names the record the entry resolved. This is the only remaining read of the slot below a unit entry. `#settlementLive`, also step 3's, now reads the cancel request from the record its unit resolved rather than from the slot. That is the same read of the same record. Neither read moved, and none was added.

**R19 holds at two capture points.** `mergeFragments` copies every slot into a fresh config, and the assembler copies `items` and `onEnd` from that into its slot record. Defeating the merge alone leaves R19 green. Defeating both reddens it (§Mutation census).

## What step 2 keeps from step 1

| §14.4 requirement | Evidence at this tree |
| --- | --- |
| Every step-1 row stays green, the five R30 rows and both null-command rows included | full suite (§Verification): no step-1 row is in the failing set |
| `OPEN_RESOLUTION` reads its five clauses at its entry, and nowhere else | `#handleOpenResolution`: identity, phase and held command first, then the cancel and failure clauses on the record it resolved. The records stay on the operation record. Registration is still written only in `#failOperation`, after the demotion return. The failure clause reddens the same 4 rows and the cancel clause the same 2 as at step 1 |
| Reviewer-B: a `destroy()` after a panic settles its promise, and its three `execution.node` rows stay green | green. Removing the fix reddens _should have settled its promise when destruction is requested after a panic_, 1 row, as at step 1. The bracket is untouched. The teardown it calls is now the façade's `#teardown`, and skipping the armed controller's share there reddens 38 rows |
| `closed` stays readable and reports `CLOSED` only | façade `closed` reads `#bracket.closed` |
| Property 13 | §Property 13 |
| D-200: no `Lifetime` or `ActionQueue` property changes | `lifetimes.ts`, `queue.ts` and `execution.ts` are unchanged |

## Composition

`just build`, read through `measureAll()` from `bench/size/measure.ts`. **Before** is the input's `src/`, measured in this tree before any edit. It reproduces `d204-step1.md` §D-206's "after" column byte for byte. **After** is this tree. Bytes. Brotli governs (§15).

| Row | min before | min after | Δ | Brotli before | Brotli after | **Δ** | budget | over |
| --- | --: | --: | --: | --: | --: | --: | --: | --: |
| minimal | 34,783 | 34,984 | +201 | 10,445 | 10,563 | **+118** | 10,549 | +14 |
| minimal (xy) | 34,102 | 34,303 | +201 | 10,315 | 10,451 | **+136** | 10,421 | +30 |
| minimal + layoutAnimation | 35,762 | 35,963 | +201 | 10,788 | 10,915 | **+127** | 10,887 | +28 |
| xy + layoutAnimation | 35,081 | 35,282 | +201 | 10,659 | 10,787 | **+128** | 10,776 | +11 |
| minimal + landing | 35,176 | 35,377 | +201 | 10,600 | 10,744 | **+144** | 10,695 | +49 |
| complete | 36,155 | 36,356 | +201 | 10,943 | 11,066 | **+123** | 11,033 | +33 |
| free drag minimal | 27,289 | 27,490 | +201 | 8,193 | 8,327 | **+134** | 8,266 | +61 |
| free drag + bounds | 27,755 | 27,956 | +201 | 8,348 | 8,482 | **+134** | 8,423 | +59 |
| free drag + landing | 27,682 | 27,883 | +201 | 8,351 | 8,487 | **+136** | 8,425 | +62 |
| free drag complete | 28,148 | 28,349 | +201 | 8,518 | 8,646 | **+128** | 8,576 | +70 |
| both behaviors | 43,551 | 43,753 | +202 | 12,374 | 12,534 | **+160** | 12,493 | +41 |
| vocabulary root — drag.js | 252 | 252 | 0 | 142 | 142 | **0** | 205 | — |
| kernel root — kernel.js | 20,232 | 20,429 | +197 | 6,261 | 6,389 | **+128** | 6,312 | +77 |
| baseline A — feature-matched, non-composed | 35,448 | 35,649 | +201 | 10,740 | 10,885 | **+145** | 10,855 | +30 |
| baseline B — shipped @ydinjs/drag sortable.js | 22,618 | 22,618 | 0 | 6,916 | 6,916 | **0** | 7,040 | — |

**No module entered or left any graph.** Module counts are equal on every row. **The two controls that cannot see the kernel did not move**, as predicted: `drag.js` reaches neither kernel module, and baseline B measures `@ydinjs/drag`. `rect-index.ts`'s deletion is under `DEV` and folds away, so it contributes nothing.

**Thirteen budget rows breach, by 11 to 77 B Brotli.** They are held red under the owner's ruling (§Owner rulings, 2): the growth is a tolerated size cost of step 2, subject to verification, and nothing is re-based. The six `size.node` control equalities stay red as at the input.

**The joint +201 B minified** was not decomposed by ablation (§15). It was attributed by diffing the unminified kernel bundle before and after:

- **The façade's forwarding edges.** The armed controller's members that the façade calls are public property names, which the minifier does not mangle: `handle`, `panic`, `teardown`, `beginPass`, `attach`, `report`, `dispatch`, `fail` and `cancel`. Each appears at its definition and at its call.
- **The armed controller's construction.** Seven constructor parameters and their field assignments, plus duplicated `realm` and `root` references.
- **The façade class.** Its fields, the forwarding bodies of `cancel`, `dispatch` and `fail`, and the `#teardown` wrapper.
- **Property 4's parameter threading**, across ten helpers, and the `input` and `lifetimes` fields on the settlement attempt.
- **Against these:** the `!this.#spec` tests, the `null` retirement mode, the duplicated steps 3–6, `#runMoved`, and the `settlementInput` slot and its clears.

One reduction was tried and reverted: running construction's post-publication unwind through `teardown()`. It is semantically the same sequence, but it measured +3 B minified and +19 B Brotli on `minimal` against the landed form. Per the owner's ruling, no further pass was spent on bytes.

## Runtime

**Measured.** M-1's harness, `tests/perf/m1.browser.test.ts`, with `VITE_DRAG_MEASURE=1` and `--reporter=verbose`. Its output is on stderr. The run used the end-to-end and allocation arms only, as 6 paired runs, alternating the input's `kernel.ts` and `seams.ts` with this tree's in the same session. Chromium, the package's browser project, this devcontainer.

| Arm | before, per run (µs) | median | after, per run (µs) | median |
| --- | --- | --: | --- | --: |
| one pointer sample, 50 rows | 10.94, 6.25, 12.50, 8.59, 5.86, 7.81 | ≈8.2 | 3.52, 3.91, 15.23, 25.78, 5.08, 12.50 | ≈8.8 |
| one pointer sample, 200 rows | 7.03, 3.71, 13.28, 8.40, 12.89, 5.08 | ≈7.7 | 3.52, 3.71, 14.06, 18.75, 11.33, 5.66 | ≈8.5 |
| allocation over 20,000 samples | 0.0 B per sample, every run | 0.0 | 0.0 B per sample, every run | 0.0 |

- **Allocation is measured: zero per sample on both trees.** That is I-26's structural check.
- **Timing is not resolved.** Run-to-run spread is 3.5 to 26 µs within one arm. The medians differ by less than that spread, in a direction this run cannot tell from noise. **No runtime claim is made from these figures, in either direction.** A resolving measurement is M-1's at step 6, under its own pacing policy.

**Analysis, not measurement.**

- **Per `MOVE`:** the bracket's handle callback now reads `#armed` and calls `handle` on it, which is one field read and one call more. The moved leaf receives the lift as an argument through `runLeaf` and `#runPhase`, which is one argument more, and the `#runMoved` hop is gone, which is one call less. Net: one field read and one argument more per active sample, no closure, no object.
- **Per settlement:** the attempt record grows from two fields to four and carries what the slot carried, so the object count is unchanged.
- **Per failure report:** one more object.
- **Per controller:** one more object, the armed controller, and one more closure, construction's unwind guard, which is created only on a failed construction.

## Property 12 — the module-binding census

Over every `.ts` and `.tsx` file under `src/`, by the TypeScript compiler API: top-level `let` and `var`, mutable `static` class fields, and top-level constants initialized with an object, an array or `new`.

| Class | at the input | at this tree |
| --- | --- | --- |
| module-level `let` / `var` | **1**: `sortable/rect-index.ts:515` `let verifying = true` | **0** |
| mutable `static` field | 0 | 0 |
| object-valued constants, library modules | 6: the three frame defaults (`DEFAULT_PART` ×2, `DEFAULT_FRAME`), `KERNEL_FRAME_KEYS`, `UA_PROPS` and `LIFTED_PROPS` | the same 6 |
| object-valued constants, story files | 13 Storybook story, metadata and label-table objects in the two `*.stories.tsx` | the same |

The six library constants are read and never written. The frame defaults are `Object.assign` sources. `UA_PROPS` and `LIFTED_PROPS` are iterated. `KERNEL_FRAME_KEYS` is exported and read only by tests. That was checked by reading every use. `capture.node` pins the list exactly, so a seventh is classified when it appears. Adding a module `let` and a mutable `static` to `kernel/types.ts` reddens the binding row with both named, then restored.

**The mechanism that replaced `verifying`.** The shared `.scripts/vitest-config.ts` gives `createDragTestProjects` an optional list of browser files that measure the code a consumer installs. When the list is non-empty, those files run in a `shipped` browser project of their own, with `__DEV__` defined `false`, and the ordinary `browser` project excludes them. drag2 names one file, `tests/sortable/zero-read.browser.test.ts`, through the exported `DRAG2_SHIPPED_BROWSER_TESTS`, and passes it in both its own config and the workspace config. `packages/drag` passes nothing and keeps its three projects. In `src/`, `DEV` gates only the equivalence instrument and its claim flag, so `DEV` false on that file is exactly the instrument off. Every other browser file, `g3-conformance` included, runs with it on. No `src/` state remains for a test to flip, and nothing per pointer sample changed.

**Routing, verified** with `vitest list --filesOnly --json`. Package mode: `browser` 39 files, `shipped` 1 (zero-read), `node` 25, `declaration` 9. Workspace mode: `browser/drag2` 39, `shipped/drag2` 1 (zero-read), `browser/drag` 8. **The define is what keeps the instrument out:** with `__DEV__` `true` in the `shipped` project, 5 of zero-read's 15 rows redden; with `false`, all 15 pass, and `g3-conformance` passes alongside.

## Mutation census

Each mutation was applied alone, run against **the whole suite** in every project, and restored. The tree is this unit's working tree before commit. Its `src/kernel/kernel.ts` and `src/kernel/seams.ts` are byte-identical to the committed files apart from one line the formatter rewrapped after the census. Counts exclude the rows red at this tree: the input's ten, the 13 budget rows, and the two browser files that do not load.

| Mutation | Rows red |
| --- | --- |
| a mint failure publishes the record and retires through steps 3–6, the input's behavior | 2 — the mint-failure row; _should reach those steps only through retirement and physical teardown_ |
| the moved leaf reads the activation slot instead of its argument | 1 — the slot-read row |
| the façade's teardown skips the armed controller | 38 |
| the façade's `#armed?.` guard dropped on `fail` / on `cancel` | 1 / 1 — the construction-window rows |
| the façade's `dispatch` assumes an armed controller during the window | 3 — R17/R23 and both R24 rows |
| construction's unwind resets the current frame unconditionally | 1 — _should reset no frame part when the first frame-part factory throws_ |
| `mergeFragments` reads the options lazily | **0** — the assembler's copy still holds R19 |
| the same, and the assembler calls `items` and `onEnd` through the merged config | 1 — R19 |
| reviewer-B's settled promise after an unrequested release removed | 1 — as at step 1 |
| `OPEN_RESOLUTION`'s failure clause dropped | 4 — as at step 1 |
| `OPEN_RESOLUTION`'s cancel clause dropped | 2 — as at step 1 |
| the release unit opens the round-trip inline | 11 — as at step 1's acceptance (§14.1) |
| the ingress abort outside its `finally` | **0** |
| the tail cancel outside its `finally` | **0** |
| `#release` drops the records before the frame resets | **0** |
| a stale retirement is not a no-op | **0** |
| construction's unwind keeps the armed reference | **0** |
| the armed controller published after attachment | **0** |

**The zeros, each with a reason:**

- **The two `finally`s.** Every foreign teardown step is individually unwound, so no throw reaches them. The `finally` keeps the rule true when a step is added.
- **The record drop.** Past step 5 nothing can observe the records. The order keeps `current.operation !== null` ⟹ `operation !== null` true by statement order (D-199 property 3).
- **The stale retirement.** No reachable path retires an operation that is no longer committed. The guard was unpinned at the input too, and D-199 property 6 carries it.
- **The unwind's reference, and publication order.** After a failed construction `draggable()` has thrown and no conforming caller holds the façade. During attachment the only foreign code is a patched `addEventListener`, and no row patches one to call `cancel()` or `fail()`.

The `invoke: null` R30 row stays an equivalent mutant of the failure clause, as recorded at step 1 (§14.3).

## Property 13 — the interim accounting, carried forward

The architect's `run.sh` was rerun at this tree and at the input's `src/`: P1, P2, P6, the model, the browser probes P4, P5 and P7, and P8. **The two outputs are identical as sets of lines.** Only the order of the parallel browser probes differs. Every model row is `ok`. So no probed consumer call sequence changed in this step, and the table in `d204-step1.md` §D-206 carries forward unchanged:

| Case | Outcome now |
| --- | --- |
| R1, R2, R4–R7, R9–R11, R13, R15, R17, R22–R30 | required, as at step 1 |
| R3 — cancel in `activation.prepare` | **baseline** (P5: rollback, retire, no `onStart`); step 3 |
| R8 — late cancel in `anchorTarget` | **baseline** (P4: first operation stays in `SETTLING`, second press admits nothing); step 3 |
| R19 | required, as a test (this step) |
| R12, R14, R16, R18, R20, R21 | not probed against `src/`; booked to steps 3 and 4 |

No probed row makes a consumer call that both the baseline and the target withhold. The one behavior change, a mint failure no longer calling `spec.retire` and the two frame resets, reaches behavior code only. It makes no consumer call in either direction, and D-201 property 10 decides it.

## Verification

- **Tests:** `just test`, every project. 1,368 pass and 23 fail, and the same two browser files do not load. The 23 are the input's ten and the 13 budget rows above. The 13 new rows all pass: eleven in `capture.node`, the mint-failure row and R19. Every step-1 row passes.
- **Lint** over the changed `.ts` files. Six eslint errors remain, the same six present in those files at `HEAD`: `seams.ts` `only-throw-error` ×2 and `no-unnecessary-condition` ×2, and `unbound-method` in `kernel.browser` and in `features.browser`. Their line numbers moved with the edits. `.scripts/vitest-config.ts` and `capture.node.test.ts` are clean under both linters. Markdown is formatted, and the linters report it as ignored.
- **Typecheck:** drag2 and drag show only the two `.scripts/vitest-*.ts` errors present at the input.
- `coverage.node` and `references.node` pass, so every COVERAGE citation resolves and the normative tree's paths exist.

## Limits

- **Runtime timing is unresolved** (§Runtime). The allocation figure is the only measured runtime evidence.
- **Browser runs used Chromium only.**
- **M-2's controller cost** with two objects was not measured. That is step 6's.
- **R19 is sortable-only.** Free drag's options capture was not given a row.
- **The structural rows are about source shape.** They read the parsed source, and an aliased access, such as `const self = this` and then `self.#operation`, would escape them. None exists.
- 01's other sections that name `#arm()` were read and remain true. 02 has no sentence about the kernel's object structure. The §5 contract rows still belong to the steps that make them true.

## Unresolved obligations

- **The 13 red budget rows** are a tolerated size cost under the owner's ruling, subject to the step-2 review. Re-basing them is not authorized here.
- **`#preparationValid`'s mid-unit slot read** goes when step 3 deletes the in-unit ledger reads. The slot-read row then loses its exception.
- **Reviewer-E and reviewer-F** are untouched, as §14.4 requires.
- **D-206 stays `Unimplemented (Remediation)`.** `d206-requests.md` is not created, F-432 to F-435 stay open, and D-200's independent acceptance is still pending.
- **Next:** stop for the step-2 independent feature review. Step 3 does not start before it.