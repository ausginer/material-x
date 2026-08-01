# `drag2` Checkpoint A review

Date: 2026-08-01

Scope: `packages/drag2`, reviewed against `.agents/docs/drag/contract/00-index.md` through `06-vertical-sortable-trace.md` and the Checkpoint A exit criteria in `.agents/docs/drag/plan.md`.

This was a read-only review. No package source, tests, configuration, or contract files were changed.

## Executive summary

The architecture is substantially stronger than the shipped drag implementation: ownership is explicit, frame publication is transactional, the queue and attempt identities are carefully designed, and the tests exercise many adversarial paths. However, Checkpoint A should not be closed yet. Several lifecycle paths still violate the frozen contract, including teardown totality, terminal destruction, partial presentation acquisition, cancellation precedence, and `PromiseLike` handling. The current green suite does not cover those paths.

There is also an important status mismatch. This checkout is at the plan's actual Checkpoint A—Phases 0–6 complete—not after plan Phase 7. The Phase 7 assembler, feature types, branding, claims, and construction tests are absent. The README correctly says Phases 0–6 are complete. If “Phase 7” meant the seventh completed step when counting Phase 0, the repository and Checkpoint A are aligned; if it meant the plan heading “Phase 7 — Feature composition,” that phase has not landed.

No conventional remote-code-execution or data-exfiltration issue was found. The security-like risks are local denial of service and persistent DOM corruption when consumer-provided callbacks, thenables, placeholder elements, or landing runners behave adversarially or simply fail at an unlucky lifecycle boundary.

### Overall assessment

| Layer | Assessment | Main reason |
| --- | --- | --- |
| Correctness / contract | **Not ready** | Multiple reproducible I-6, D-29, I-22, failure-classification, and cleanup violations remain. |
| Performance | **Promising, not yet proven** | The scalar move path is compact, but it allocates a callback per active sample and still lacks M-1/M-2 measurements. |
| Bundle size | **Current result is invalid** | Every sortable entry is empty, so all four size compositions measure only the kernel. The packed package is also incomplete. |
| Maintainability | **Strong local documentation, high global complexity** | Comments are excellent, but lifecycle state is concentrated in two very large closures and several invariants remain prose-distributed. |

## Verification performed

- Full browser, node, and declaration suite: **10 files, 323 tests passed**, no type errors. The browser suite required permission to bind Vitest's local port.
- `npx just build`: passed.
- Current Size Limit results: all four named compositions report exactly **6,075 bytes Brotli**.
- `npm pack --dry-run` with a writable temporary npm cache confirmed that the tarball omits `kernel/`, even though emitted `drag.js` and `drag.d.ts` import it.
- Source/test inventory: about 5.5k implementation lines and 6.2k test lines.

The green suite is valuable, but it is not evidence that the missing cases below are safe. In particular, the teardown harness cannot currently inject several of the failures the contract matrix requires.

## Correctness and contract findings

### A-01 — Blocker: plan Phase 7 is absent from this checkout

Evidence:

- `packages/drag2/src/sortable.ts:1-7` is still `export {}`.
- The feature subpath files are empty stubs.
- No implementation of `assemble`, `FeatureContext`, `SortableContribution`, `InsertionGeometry`, `SortableFeature`, the opaque brand, `unbrandFeature`, or `claim` exists under `packages/drag2/src`.
- `packages/drag2/README.md` explicitly says “Phases 0–6 complete” and that `assemble()` is Phase 7.
- The Phase 7 construction tests—factory unwind, duplicate-axis cleanup, reverse retire order, and displacement capability isolation—are absent.

Impact: if the intended review baseline includes plan Phase 7, the reviewed code is incomplete. If the intended baseline is Checkpoint A as positioned in `plan.md`, this is a status-wording issue rather than an implementation defect.

Recommendation: resolve the phase-number interpretation before using this review as a Phase 7 sign-off. Do not treat the current export smoke test as proof: it only checks that imported namespaces are objects, so empty stubs pass.

### A-02 — High: terminal destruction during the join can write and callback after `destroy()`

Evidence: `packages/drag2/src/kernel/kernel.ts:1113-1181` commits `FINALIZING`, calls `spec.anchorTarget`, calls `LandingHandle.destroy()`, writes the final transform, releases presentation, calls `spec.finalized`, and queues retirement. There is no terminal-state revalidation after `anchorTarget` or after the runner's `destroy()`.

Reproduction paths:

1. `anchorTarget()` synchronously calls the controller's `destroy()` and returns a point.
2. `LandingHandle.destroy()` synchronously calls the controller's `destroy()`.

In either case teardown restores styles and clears ownership, but the join keeps its local lift-session reference and can write a transform back afterward. It can also invoke the terminal callback after `destroy()` returned.

Contract impact: violates I-6's synchronous terminal barrier and the rule that destroy never pins or permits later callbacks.

Required tests: both paths above, asserting no pin, no terminal callback, and exact restoration of authored inline styles.

### A-03 — High: teardown totality is defeated by the dev scrub assertion

Evidence: `packages/drag2/src/kernel/kernel.ts:375-389` wraps `scrubFrame(frame, resetFramePart)` with `guarded`, then calls `assertFrameScrubbed(frame, armedKeys)` outside the guard. In browser builds, `packages/drag2/src/kernel/dev.ts:17-25` resolves `DEV` to `true` when `process` is absent.

If `resetFramePart` throws before clearing a retained object, the guarded reset returns, the assertion throws, and the caller can skip the second frame scrub and later cleanup. The same assertion can replace the initiating error during a failed `arm()` unwind.

Contract impact: direct D-29/F-36 violation. The seven-step destroy path is not total in the environment where the dev diagnostics run most often.

Required tests are the four rows already owed by the matrix:

- current-frame reset throws and draft still scrubs;
- draft-frame reset throws and ingress still aborts;
- reset throws during failed-arm unwind without replacing the arm error;
- reset failures are reported rather than substituted for the initiating error.

### A-04 — High: `arm()` does not scrub a partially constructed frame pair

Evidence: `packages/drag2/src/kernel/kernel.ts:1729-1747` captures `armedKeys` only after both factories and the dev shape assertion succeed. Its catch block uses `armedKeys.length > 0` as the existence test before scrubbing.

If the second frame factory throws, or the two factories return different key sets and the shape assertion throws, at least one frame exists but `armedKeys` is still empty; neither produced frame is scrubbed.

Contract impact: contradicts construction unwind's “scrub whichever frame exists” requirement. It is also a future retention risk when a factory-created part initially contains DOM references.

Required tests: second-factory throw and shape-mismatch throw, each observing reset of every frame that was successfully constructed.

### A-05 — High: partial lift acquisition and composite release can strand styles

Evidence: `packages/drag2/src/kernel/presentation.ts:321-373` captures inline styles, mutates the visual, and only then acquires the top layer. If `showPopover()` throws, `acquireLift()` never returns a session, so the caller has no disposer to register and the earlier style/popover mutations remain.

The returned composite disposer has a second issue: it invokes the top-layer disposer before the style disposer without `finally`. A throwing `hidePopover()` or prior-popover restoration prevents inline style restoration.

Contract impact: violates the partial-activation cleanup row and the exact style restoration ownership guarantee.

Required tests:

- top-layer acquisition throws after style mutation;
- top-layer release throws and inline styles still restore;
- the original acquisition error is preserved if cleanup also fails.

### A-06 — High: activation can republish resources after reentrant destruction

Evidence: `packages/drag2/src/sortable/spec.ts:188-210` registers placeholder removal, inserts the placeholder, registers more resources, publishes `rt.placeholder`, `rt.lift`, and `rt.view`, then invokes `onStart`.

`current.item.after(placeholder)` can synchronously invoke a custom element's `connectedCallback`. If that callback destroys the controller, teardown runs inside the insertion. Once control returns, activation continues, registers against closed lifetimes, republishes private references, and invokes `onStart` after terminal destruction.

Contract impact: violates I-6 and the post-callback/reentrant-boundary principle behind D-26. It also retains resources in the behavior runtime after teardown.

Required test: a custom placeholder element whose `connectedCallback` destroys the controller; assert no `onStart`, no republished runtime view, no connected placeholder, and no retained lift/visual references.

### A-07 — High: cancellation does not always outrank a failure checkpoint

Evidence: `cancel()` synchronously latches and queues `CANCEL` at `kernel.ts:488-495`; a later throw or `host.fail()` in the same seam queues `FAILED` at `kernel.ts:502-535`. When `CANCEL` settles immediately, the join can call the cancel terminal callback and queue `RETIRE`, but an already queued `FAILED` entry can run before `RETIRE` while the phase is `FINALIZING`.

Reproduction: while active, `moved()` calls `controller.cancel()` and then throws (or calls `host.fail`). The consumer can receive both a canceled result and an error report for the same operation.

Contract impact: violates I-22's `DESTROY > CANCEL > FAILURE_CHECKPOINT` precedence and terminal callback singularity.

Required tests: cancel-then-throw, cancel-then-fail, fail-then-cancel, and the same orderings from an action effect; assert exactly one terminal channel.

### A-08 — Medium-high: arbitrary `PromiseLike` objects can panic the controller

Evidence:

- `kernel.ts:1246-1248` reads an arbitrary `.then` getter outside the `invoke` try/catch.
- `kernel.ts:1308-1319` reads/invokes `.then` again outside that catch.
- `kernel.ts:984-991` invokes readiness `.then` without protection.

A throwing getter, a throwing `then()` implementation, or a getter returning a different value on the second read escapes the semantic failure path and reaches the queue panic path. This terminally destroys the controller rather than producing `SETTLED_REJECTED`/`FAILURE_REORDER_RESOLUTION` or `FAILURE_PRESENTATION_READY`.

Contract impact: the public types deliberately accept `PromiseLike`, not only native `Promise`; these are ordinary resolver/readiness failures, not kernel invariant violations.

Required tests for both resolution and readiness:

- throwing `then` accessor;
- throwing `then()` call;
- synchronous resolve followed by throw, with the first completion winning;
- a stateful getter proving `.then` is read only once.

### A-09 — Medium: distinct queued collection updates can share one version

Evidence: `packages/drag2/src/sortable/controller.ts:26-34` computes a new version as `rt.snapshot.version + 1`. During an existing drain, two calls to `updateItems()` can enqueue before either action publishes. Both capture the same applied version and produce distinct snapshots with the same version.

Impact: weakens version as snapshot identity and can make the future vertical geometry cache's `last-seen collection version` treat different orderings as the same collection. It can also make proposal diagnostics ambiguous.

Required test: call `updateItems()` twice from one `onStart` callback and assert strictly increasing queued versions.

### A-10 — Medium: failure stages exist but are not honored at their boundaries

Evidence:

- `packages/drag2/src/sortable/spec.ts:218-227` calls `lift.write` and `rt.frame.schedule` inside one `moved` callback. The outer kernel wrapper classifies either throw as `FAILURE_RENDERER_WRITE`, so `FAILURE_SCHEDULED_FRAME` is never produced.
- `FAILURE_INVALIDATION` is declared but has no source use. Scroll/resize calls `slots.invalidateInsertion` from a native listener. A throw there escapes the event boundary; direct invalidations are classified as whichever surrounding seam happens to call them.

Contract impact: observable `DragErrorContext.stage` can lie, and one native event path can bypass the classified failure mechanism entirely.

Checkpoint decision: scheduled-frame narrowing can be fixed within the existing seam. Invalidation is harder because `host.fail` is deliberately invalid outside a seam; resolving it may require a queued behavior action or another explicit operation-scoped capability. That SPI consequence should be settled now.

### A-11 — Medium: the spatial action lacks its normative ACTIVE-phase guard

Evidence: contract trace 06 requires `draft.phase === ACTIVE`. In `packages/drag2/src/sortable/spec.ts:233-255`, spatial preparation validates only attempt identity and `rt.view`. The generic behavior-action handler does not enforce per-tag phases.

Producer timing makes illegal execution difficult today, but a queued/replayed spatial action can commit and move the placeholder in a phase the legality table declares inert.

Required tests: spatial action at `ACTIVATING`, `RELEASING`, `SETTLING`, and `FINALIZING` must discard without hooks, invalidation, or DOM writes.

### A-12 — Medium: placeholder factory results are trusted beyond the contract

Evidence: `packages/drag2/src/sortable/placement.ts:55-67` accepts whatever the custom factory returns and immediately mutates it. A factory can return a connected node, the sortable item, or the lifted visual. Activation can move and restyle that node, while teardown's placeholder disposer later removes it.

The same module only copies the item's `slot` when the item has one. If an unslotted item receives a custom placeholder with a preexisting slot, the stale slot remains, so the placeholder does not actually inherit the item's slot.

Impact: mistaken customization can remove the real item from the DOM or place the footprint into the wrong shadow-DOM slot.

Required tests: item-as-placeholder, visual-as-placeholder, connected-node placeholder, detached-fragment child, cross-realm/non-HTMLElement result, and unslotted item with a pre-slotted custom placeholder.

### A-13 — Medium: Phase 6 exposed a frozen-SPI workaround

Evidence: `packages/drag2/src/sortable/spec.ts:89-96` declares mutable `pendingFailure`; settlement prepare clears/writes it at lines 427 and 495, and effect consumes it at lines 513-515. The failure cannot travel through `PreparedSettlement`, which carries only readiness.

This is safe under today's strict non-reentrancy, but it is out-of-band publication from `prepare`, relies on manual clearing, and is exactly the kind of Phase 6 workaround Checkpoint A asks reviewers to detect.

Checkpoint decision: either explicitly accept and document why the slot is safe, or revise the prepared settlement value/input so stage and error travel through the transaction. Because no failing executable case was established, this review does not recommend silently changing the frozen SPI; it recommends making the decision explicit before the checkpoint closes.

### A-14 — Medium/low: collection identity uniqueness is undefined

`destinationOf()` filters every occurrence equal to the dragged element, while proposal construction uses `indexOf()` and therefore chooses the first occurrence. Duplicate element identities in `items` lead to inconsistent semantics.

Recommendation: declare uniqueness as a runtime-validated construction/update precondition or define duplicate behavior. Validation costs should be measured because a `Set` adds an allocation to collection replacement.

### A-15 — Low: `DOMRealm.isElement` is an unsound HTMLElement guard

`packages/drag2/src/kernel/realm.ts:32-39` checks only `nodeType === 1` but claims `value is HTMLElement`. It accepts SVG elements and spoofed objects. The helper is currently unused, making this cheap to correct before feature result validation relies on it.

## Performance assessment

### What is already good

- Queue entries use two parallel arrays rather than per-entry objects.
- Drain and panic callbacks are controller-stable.
- Native pointer events are queued by reference and released at the end of the synchronous drain.
- The lift composer uses captured scalars and allocates no `{x, y}` point.
- rAF work is coalesced with a presence flag and latest scalar attempt.
- The per-controller frame pair is fixed-shape, and `beginFrame` copies in place.
- Optional feature iteration is absent from the raw pointer path.

### P-01 — High: active MOVE allocates a callback per pointer sample

`kernel.ts:1348-1351` calls `driver.runLeaf(() => spec.moved(...), ...)`. The emitted minified bundle preserves the fresh arrow. This adds one closure to every active pointer sample, contradicting the trace's practical “one transform string” allocation account.

This can be removed without changing the SPI by hoisting one controller-stable adapter that reads the swappable `current` and `lift` slots.

### P-02 — Medium: inert placeholder results still run expensive pipelines

The canonical `movePlaceholder()` correctly avoids a DOM reinsert when the placeholder is already positioned, but it returns `void`. Consequently `sortable/spec.ts:307-321` runs every `beforeMove` hook, calls the writer, invalidates geometry, and runs every `afterMove` hook even for an inert result.

This becomes material when `layoutAnimation()` exists: an already-correct gap can trigger two full-list measurements and a cache rebuild. The contract trace says the writer reports whether a move occurred and invalidation follows only a real move.

### P-03 — Medium: pointer listeners are unnecessarily non-passive

`packages/drag2/src/kernel/pointer.ts:44-46` installs document-level session pointer listeners with default `passive: false`, although those handlers never call `preventDefault`. Marking session listeners passive removes a potential scroll-blocking signal to the browser. The root `pointerdown` listener must stay non-passive because admission intentionally prevents default.

### P-04 — Low/medium: collection algorithms allocate and rescan

`packages/drag2/src/sortable/collection.ts:25-29` creates a filtered destination array, after which reconciliation/proposal construction scan again. This is not the raw move path, but large lists can make active collection replacement and release unnecessarily allocation-heavy. A direct scan that skips the dragged element can validate neighbors and compute indices without a temporary array.

Benchmark before accepting the extra implementation complexity.

### P-05 — Open M-1: generic frame copy remains unmeasured

Every raw pointer sample performs `Object.assign(draft, current)` over the composed frame before changing two pointer scalars. This preserves transactional safety, but the contract explicitly withdrew the assumption that its cost is irrelevant. M-1 still needs end-to-end comparison against a specialized pointer publication path across multiple frame shapes and engines.

### P-06 — Open M-2: cold-controller closure and heap cost

Each controller eagerly creates the frame task and the sortable spec closure graph. The frame callback and runtime form a retained cycle until controller collection. This is not a leak by itself, but cold-controller cost is real. Retain the planned eager-vs-lazy-vs-per-operation heap benchmark.

### P-07 — Admission is O(path × items)

`spec.admit` loops the composed path and runs `snapshot.items.includes()` for each node. This is outside the raw movement path, so it is not urgent, but a deep shadow path plus a very large collection can produce noticeable press latency. A snapshot identity set trades construction memory/allocation for faster admission; measure before changing.

## Bundle-size and packaging assessment

### B-01 — Blocker for packaging: the tarball omits runtime dependencies

`packages/drag2/package.json:6-12` includes the top-level drag files and `sortable/`, but not generated `kernel/`. Emitted `drag.js` imports `./kernel/kernel.js`; emitted `drag.d.ts` imports `./kernel/spec.js`.

An `npm pack --dry-run` tarball therefore contains a broken `drag.js` export and broken declarations. The current export test imports `src/*` directly, so it cannot detect this.

Recommendation: add a tarball/install fixture that imports every declared export from the packed package, not the source tree. The package is private now, but this must be fixed before any publication or realistic consumer measurement.

### B-02 — Current four-composition size result is false-green

All four `.size-limit.json` entries report exactly **6,075 B Brotli** because `sortable.js`, `vertical.js`, `callbacks.js`, and all optional feature entries are empty. Size Limit is effectively measuring only `drag.js` in every row.

Informal analytical readings from this review:

| Composition                                |        Brotli |
| ------------------------------------------ | ------------: |
| Current drag2 kernel only                  |       6,075 B |
| Shipped draggable                          |       5,795 B |
| Current kernel + dormant sortable behavior | about 8,691 B |
| Shipped combined drag/sortable             |      11,299 B |

The dormant-sortable number still excludes the assembler, vertical geometry, and callbacks feature, so it is not a budget candidate. It only indicates that the current direction is not obviously near 30 kB compressed.

No optional-feature tree-shaking conclusion is possible until real entrypoints exist. Do not set budgets from the current identical readings.

### B-03 — Production browser builds retain dev assertions

`DEV` becomes `true` when `process` is absent, which is the ordinary browser runtime. Emitted code therefore retains and executes frame key enumeration, descriptor validation, reference scans, and assertion messages.

This is acknowledged as Phase 11 debt in `dev.ts`, but it affects both size and teardown behavior today. The production mechanism must prove dead-code removal in emitted output; a runtime false branch alone is insufficient.

### B-04 — Dependency edge is appropriate

`@ydinjs/box-quad` is the only runtime dependency. It is legitimately reachable from kernel presentation and adds roughly 758 B Brotli to an analytical kernel bundle. No accidental optional-feature dependency edge exists yet, although optional feature isolation cannot be tested while those modules are empty.

## Maintainability assessment

### Strengths

- The contract and source comments explain intent, failure policy, and ownership unusually well.
- Kernel and behavior state are physically private rather than widened through a shared runtime type.
- Attempts use explicit identity and double validation.
- Failure, cancellation, and best-effort reporting channels are conceptually distinct.
- The frame slice types make several illegal writes unrepresentable.
- The tests are named clearly and generally follow one-logic-part-per-test.

### M-01 — High cognitive load is concentrated in two closures

`createKernel()` is about 1,755 lines and `createSortableSpec()` about 637 lines. They combine machine state, attempts, settlement gates, teardown, failure classification, and action legality. Roughly fifty non-null assertions encode phase ownership informally.

The comments make the code reviewable, but a new contributor must hold the contract table, queue order, nullable private slots, and callback reentrancy in their head simultaneously. Future extraction should target pure attempt/gate mechanics and legality tables, while avoiding runtime plugin descriptors or new hot-path indirection.

### M-02 — Phase legality is distributed prose

The normative legality table lives in contract 02, but guards are spread across handlers and behavior action implementations. A-11 is one instance of drift. Consider colocating phase masks/predicates with handlers or adding dev assertions that mechanically exercise every action × phase row.

### M-03 — Teardown tests currently give false confidence

`tests/kernel/kernel.browser.test.ts` has a test named “should complete every later step after spec.retire throws,” but the harness's `retire()` only records a call and never throws. `SpecOverrides` omits `retire` and `resetFramePart`, so the required teardown injections cannot be expressed through the shared harness. This explains how A-03 survives with all 323 tests green.

Recommendation: make every foreign teardown boundary injectable and implement the exact matrix rows rather than tests whose names merely resemble them.

### M-04 — Duplicated/dead declarations and state

- `ActionTransition` and `SeamRejection` are declared in both `kernel/seams.ts` and `kernel/spec.ts`; the seam copies are unused.
- `SettlementAttempt.relinquished` is initialized and written but never read, so it does not enforce or expose I-24 despite costing one field per settlement.
- `SORTABLE_ACTION_TAGS` is declared in `sortable/runtime.ts`, while `sortable/spec.ts` hardcodes `actionTags: 2`.
- `NOOP_START` and `DEFAULT_THRESHOLD` are currently dead until feature assembly lands.

Consolidate after resolving the phase baseline; some dead values are expected Phase 7 scaffolding, while duplicated SPI types are present-day drift.

### M-05 — Destroyed controllers retain controller-lifetime graphs

Ordinary operation retirement and terminal controller destroy both call the same `spec.retire()`, so sortable must preserve `rt.snapshot`, slots, callbacks, root, realm, and frame task for the next operation. A caller retaining a destroyed controller therefore retains the last items and most of the controller graph; `updateItems` also remains callable but inert at the host boundary.

This may be an accepted JavaScript ownership rule (“retaining the controller retains its configuration”), but contract 01's teardown wording suggests references are dropped. Decide and document it. A terminal-only behavior hook or controller wrapper would be needed for stronger heap release without breaking ordinary retirement.

### M-06 — Documentation/build status issues

- `packages/drag2/Justfile` writes TypeDoc output into `docs/api/drag`, colliding with the shipped package rather than using `drag2`.
- `typedoc.json` does not yet include the eventual feature entrypoints; this is expected Phase 9 work.
- `drag.ts` currently exports internal SPI types that contract 03 says must be private at the final public surface; also expected Phase 9 work.

## Recommended Checkpoint A disposition

Do not exit Checkpoint A yet. The minimum correctness closure should cover:

1. A-02 through A-08 with executable regressions.
2. A-07 precedence in both call orders.
3. A-10's invalidation-stage SPI decision.
4. An explicit accept/change decision for A-13's `pendingFailure` workaround.
5. A tarball consumer test for B-01.
6. Clarification that the repository is before plan Phase 7, unless that work exists on another branch or unshared change set.

Performance work should stay evidence-driven. Remove the clearly accidental per-MOVE closure and inert displacement work, but keep M-1/M-2 as measurements rather than redesigning the frame/closure model from intuition. Bundle budgets must wait until the minimal real public composition exists; the current 6,075 B rows are not measurements of sortable compositions.