# `drag2` Checkpoint B audit

Date: 2026-08-02

Scope: the current Phase 8b implementation in `packages/drag2`, reviewed against `packages/drag2/.plan/contract/00-index.md` through `06-vertical-sortable-trace.md`, the Checkpoint B / Phase 8b criteria in `plan.md`, and the four requested quality layers. `packages/drag` was used only as the shipped migration baseline.

This is a review, not a fix set. No package source or permanent test file was changed. Two temporary browser probes were created, run, and removed; the only persisting change from this review is this document.

## Executive verdict

The private-kernel / private-runtime / construction-time-composition model is sound enough to continue. The queue, seam outcomes, cancellation precedence, request→seal→arm gate protocol, stale-attempt checks, and teardown ordering are all unusually defensive and held up well under review.

Checkpoint B should nevertheless **not be signed off yet**. Four observable correctness defects remain:

1. a reentrant `updateItems()` from an admission resolver swaps the frame pair underneath the still-running admission transaction and corrupts the gesture;
2. `layoutAnimation()` takes ownership of arbitrary DOM siblings rather than the sortable destination span;
3. the same feature replaces authored transforms while it animates;
4. a valid custom element placeholder can remove or reparent itself from `connectedCallback`, after which the behavior publishes a missing footprint and still calls `onStart`.

There are also two contract-freeze blockers to resolve before the public surface is frozen: landing coordinates disagree with the normative contract, and the current exports expose internal SPI types while omitting required public types.

| Layer | Assessment | Summary |
| --- | --- | --- |
| Correctness / contract | **Not ready** | Four confirmed behavior defects, one landing-contract mismatch, and planned Phase 9 surface debt. |
| Performance | **Promising, not signed off** | The allocation work is good, but raw visual writes are not frame-coalesced, vertical stores 6× the geometry it uses, and M-1/M-2 remain genuinely necessary. |
| Bundle size | **Borderline raw, healthy compressed** | Current estimates are ~28.3 kB minified for minimal and ~30.45 kB for complete; Size Limit reports 10.26–11.47 kB Brotli. Optional splitting works, but exact M-3 fixtures and budgets do not exist. |
| Maintainability | **Good local explanations, risky global shape** | Excellent comments and adversarial tests, offset by a 1,915-line kernel closure, stale entry documentation, duplicated SPI types, and important coverage gaps. |

No conventional code-execution, data-exfiltration, or cross-origin vulnerability was found. The security-like failures are local denial of service or DOM/state corruption when consumer-controlled callbacks, custom elements, or DOM structure interact with reentrant lifecycle boundaries.

## Verification performed

- `npx just typecheck` from `packages/drag2`: passed.
- `npx just build`: passed; 84 files emitted by the unbundled build.
- Full `npx just test`:
  - first run: 517 passed, one Q-7 timing assertion failed;
  - immediate clean rerun: all 518 passed, demonstrating that the Q-7 assertion is flaky rather than a persistent functional failure.
- `npx just size --json`:
  - minimal: 10,263 B Brotli;
  - minimal + `layoutAnimation()`: 10,776 B;
  - minimal + `landing()`: 10,647 B;
  - complete: 11,469 B.
- Temporary browser reproduction: a `handle()` resolver called `updateItems()` with a collection that removed the pressed item. The gesture did not start and reported an activation error, confirming the nested frame corruption below.
- Temporary browser reproduction: an unrelated `<hr>` between sortable items received a displacement animation after a placeholder move.
- Direct headless-Chrome probe: an element authored with `scale(2)` had computed transform `matrix(2, 0, 0, 2, 0, 0)` before animation, `matrix(1, 0, 0, 1, 0, 10)` during the current keyframes, and the authored matrix again only after cancellation.

## Correctness and contract findings

### B-01 — High: native admission is not transactionally isolated from behavior actions

`admit()` captures `rt.snapshot`, then calls consumer-controlled handle and visual resolvers in `sortable/spec.ts:184-217`. A resolver may call the already returned controller's `updateItems()`, which dispatches at `sortable/controller.ts:35-52`. Admission is deliberately outside the action queue, so `host.dispatch()` sees no running drain and immediately runs the collection action (`kernel/kernel.ts:482-490`, `1820-1843`).

That nested action does more than update `rt.snapshot`: its transaction commits and swaps `current` and `draft`. The outer `admit(event, draft)` still holds its old frame argument by reference, so its later `item` / `visual` / `snapshot` writes now mutate what became the committed frame. Admission then writes the kernel fields into the other frame and commits again, publishing `PENDING` with null sortable fields. Activation consequently fails rather than applying the collection update coherently.

The post-admission check at `kernel/kernel.ts:625-630` only tests whether the controller closed or an operation appeared; it cannot detect this frame swap. This violates I-2/I-3 frame publication safety and D-25/F-28's rule that a collection replacement publishes and then cancels/rebases rather than corrupting or disappearing from the gesture.

**Direction:** make native admission a queue boundary. Behavior actions raised inside it should enqueue but not drain until admission commits or abandons; `destroy()` must remain an immediate synchronous barrier. Add handle- and visual-resolver tests for update, removal, rebase, destroy, and multiple queued updates.

### B-02 — High: `layoutAnimation()` animates elements outside the sortable collection

`collect()` in `sortable/layout-animation.ts:55-90` walks every `previousElementSibling` / `nextElementSibling` between the placeholder and the anchor. It never checks `view.snapshot.items`, so headings, separators, buttons, custom elements, and other non-sortable siblings are measured and can receive a WAAPI transform at `:94-149`.

This is a correctness and ownership breach, not only extra work. Q-7 defines the affected set as destination-view **items** in the crossed span (`measurements/q7.md:59-75`), while the feature temporarily controls arbitrary consumer DOM and retains those elements in its animation map. A temporary browser probe confirmed that an interleaved `<hr>` receives an animation.

The sibling walk may also include the dragged semantic item on an upward drag from a middle slot. The default top-layer lift often gives that item a zero FLIP delta, but it is still measured; with a distinct `visual()` or other layout it can become an actual animation target.

**Direction:** constrain collection to snapshot membership and explicitly exclude the dragged item. The cleanest view likely needs the dragged identity or a destination-membership capability. Test first/middle/last drags, mixed siblings, shadow-root siblings, and a distinct inner visual.

### B-03 — High: displacement animation replaces authored transforms

The FLIP pass measures each element with its current transform at `sortable/layout-animation.ts:98-105`, then creates keyframes containing only `transform: translateY(...)` and `transform: translateY(0)` at `:128-134`. WAAPI's default composition is replacement, so an authored rotate, scale, skew, or translate disappears for the duration. The FLIP first frame therefore does not even reproduce the position that was measured when an authored transform contributed to that rect.

The existing test at `tests/sortable/features.browser.test.ts:607-623` pins the bare replacement keyframes and never gives a row an authored transform. The headless-Chrome probe described above confirms the visible loss.

This contradicts the contract's computed-transform retargeting / temporary-write model (`contract/03-feature-composition.md:595-609`).

**Direction:** animate the independent CSS `translate` property where supported, or use an explicitly additive transform strategy whose first and last states preserve the authored transform. Cover authored scale/rotate/translate, retargeting during an existing consumer animation, and teardown restoration.

### B-04 — High/medium: activation can publish a placeholder that removed or reparented itself

Activation registers removal and calls `current.item.after(placeholder)` at `sortable/spec.ts:249-258`. For a custom element, `connectedCallback` runs synchronously and may validly remove or reparent its own node without destroying the controller. The only post-insertion validation at `:260-274` checks whether the presentation signal was aborted. A still-live controller therefore publishes the absent or misplaced node into `rt.placeholder` / `rt.view` at `:294-302` and calls `onStart` at `:319-320`.

The result has no authoritative layout footprint until a later move happens to reinsert it, and release geometry may be computed from a disconnected zero rect. This violates the placeholder contract that the footprint is "never duplicated or lost" (`contract/03-feature-composition.md:496-505`).

**Direction:** after insertion, validate controller liveness and the exact expected parent/adjacency before publishing runtime state or notifying start. Classify a mismatch as activation failure. Add self-remove and reparent-self custom-element fixtures alongside the existing connectedCallback→destroy test.

### B-05 — Medium/high contract-freeze blocker: landing coordinates have two definitions

The implementation converts `LandingContext.from`, `.target`, and readiness-time `retarget(target)` to origin-relative deltas at `kernel/kernel.ts:1113-1121` and `:1565-1572`. The frozen contract's landing flow passes the viewport point from `anchorTarget` directly to `start` and `retarget` (`contract/02-kernel-behavior-contract.md`, Landing section). The package README explicitly acknowledges the disagreement at `packages/drag2/README.md:33`.

The implementation's delta model is internally coherent with `compose(x, y)`; the problem is that `LandingStart`, `LandingContext`, and `LandingHandle` are a planned public extension point. A custom runner written from the contract and one written from the implementation will interpret the same `Point` differently.

**Direction:** decide before Phase 9. Either amend the normative contract to say all three values are origin-relative deltas, or keep viewport points and expose the origin needed to convert them. Do not freeze the current ambiguous type.

### B-06 — Medium contract/bundle defect: production browsers enable dev assertions

The contract requires dev-only frame assertions to compile out (`contract/04-frame-slicing.md:337-340`). `kernel/dev.ts:10-22` admits that they do not. In an ordinary browser, `process` is absent, so `resolveDev()` returns `true`; production consumers run the key, descriptor, and retained-reference scans in `kernel/frames.ts:250-312` at construction/retirement and carry their messages in the bundle.

There is also a fragile environment edge: a browser page defining a partial `globalThis.process` without `env` makes `process.env['NODE_ENV']` throw during module initialization.

This is already carried as Phase 11 work, but it is a present contract failure and contributes to the size concern. Use a build-time constant and add a production-bundle assertion that diagnostic strings and the `process` reference are absent.

### B-07 — Medium, planned Phase 9 blocker: the current public surface exposes the SPI

`src/drag.ts:10-18` exports `ActivationScope`, `BehaviorInstall`, `BehaviorSpec`, `KernelHost`, `ResolutionCommand`, and `SeamRejection`, all explicitly internal under `contract/03-feature-composition.md:802-819`. At the same time it omits the required public `Point`, `DragErrorContext`, `FailureStage`, `DOMRealm`, and failure-stage constants from the frozen table at `:767-776`.

The emitted declarations consequently expose/import `kernel/spec.d.ts`. `SortableFeature` is also declared in internal `sortable/feature.d.ts` and re-exported, whereas the frozen topology says it is declared in `sortable.d.ts`.

This is expected Phase 9 debt rather than a surprise Phase 8b regression, but it must be an explicit release blocker. Add an exact export-name fixture, not only the current opacity/import smoke tests.

### B-08 — Low robustness risk: default landing does not locally roll back a post-`animate()` subscription throw

`sortable/landing.ts:75-90` creates an animation and immediately reads/subscribes to `animation.finished`. If a patched/polyfilled Animation throws after `visual.animate()` succeeds, `start` throws before returning a handle. The kernel can classify the failure, but its local `handle` is still undefined and it has nothing to destroy (`kernel/kernel.ts:1124-1153`), leaving the created animation writing until some external condition stops it.

Native current WAAPI is not expected to throw here, so this is a low-probability partial-acquisition risk rather than a current-browser defect. The acquisition should still cancel locally on any failure after `animate()` returns.

## Performance and allocation findings

### P-01 — Measurement-critical: visual rendering is per input sample, not per frame

Every active pointer sample copies the whole 15-field composed frame (`kernel/kernel.ts:1443-1460`, `kernel/frames.ts:199-204`), builds a transform string, and writes inline style (`sortable/spec.ts:328-345`). Only spatial search is rAF-coalesced. High-rate mice and pens can therefore perform several frame copies and visual writes per paint.

This is real repeated work, although its user impact still needs the planned M-1 trace. A plausible design keeps authoritative pointer commits synchronous while coalescing `lift.write` to rAF; release already performs the required final synchronous write at `sortable/spec.ts:572-582`.

### P-02 — Medium: the vertical cache stores and writes six scalars but reads one

`sortable/vertical.ts:40-47` defines a six-double stride and `:98-126` writes left/top/right/bottom/centreX/centreY. Only `CENTRE_Y` is read at `:153-176`. Because `vertical()` is intentionally axis-specific, the other five values are not shared with a future horizontal/grid feature.

The buffer is retained at its high-water power-of-two capacity across retirement (`:196-203`). A controller that once handled 100,000 items retains a 131,072 × 6 Float64 buffer, about **6.29 MB**, instead of about 1.05 MB for one scalar.

Use a one-value buffer unless a measured, named consumer needs the rest. Consider shrinking exceptionally large retained buffers on retirement separately.

### P-03 — Medium/low: a "cache hit" still reads placeholder geometry

The source says a clean frame reads no geometry, but every resolve calls `centreOf(placeholder)`, which calls `getBoundingClientRect()` (`sortable/vertical.ts:59-63`, `143-150`). Item geometry is cached; placeholder geometry is not. This is one native layout-facing read per spatial frame even when nothing is dirty.

Cache the placeholder centre with the index and refresh it through the same invalidation events, or narrow the comment/claim if the read proves cheaper than the additional state.

### P-04 — Medium/low: activation reads overlapping visual geometry three ways

Activation reads `getBoundingClientRect()` in `kernel/kernel.ts:700-706`, then `coordinates()` plus computed style in `kernel/presentation.ts:331-349`, then `offsetWidth` / `offsetHeight` for placeholder mechanics in `sortable/placement.ts:32-55`. The last read occurs after lift mutations and may force style/layout even though box-quad already has untransformed dimensions.

This is cold-path rather than move-path work, but it affects perceived lift latency. Measure whether `Box` can safely supply the placeholder's offset-box semantics before widening `ActivationScope`.

### P-05 — Medium/low: collection updates and release create avoidable O(n) garbage

`copyUniqueItems()` creates both an array copy and a temporary `Set` (`sortable/collection.ts:41-52`). Reconciliation and proposal building each call `destinationOf()`, which allocates another filtered array (`:55-59`, `66-123`, `:166-204`). This is not raw pointer work, but framework-driven collection updates can be frequent and large.

Keep immutable snapshots, but consider fusing skip-dragged scans or attaching identity/index metadata to a snapshot if measurement shows update/release GC.

### Positive performance observations

- Queue entries use reusable parallel arrays rather than wrapper objects.
- `runMoved` is controller-stable; the previous per-sample closure is gone.
- `FrameTask.schedule()` stores the latest scalar directly and coalesces spatial work without a protocol object.
- Release cancels pending frame work before resolving final geometry.
- The vertical nearest-centre search is a scalar scan with no per-search collection allocation.

M-1 and M-2 remain necessary rather than ceremonial: generic frame copy, closure-per-controller cost, and eager-vs-lazy frame-task ownership cannot be settled by inspection.

## Bundle-size findings

### S-01 — Current size is below 30 kB compressed but just above it as complete minified code

The checked-in Size Limit approximation reports 10.263 kB Brotli minimal and 11.469 kB complete. A direct minified sum of the transitive emitted JavaScript during this audit measured approximately **28,290 B minimal** and **30,452 B complete**. The user's 30 kB concern has therefore already been crossed in the uncompressed-minified interpretation, although not remotely in the compressed transfer interpretation.

For migration context, current `packages/drag/sortable` measures 6,977 B Brotli. That is not feature-matched, so the apparent +47% minimal / +64% complete difference must not be presented as composition overhead. M-3 correctly calls for both a feature-matched non-composed baseline and the shipped migration baseline.

The good news is that optional splitting works: layout animation adds about 513 B Brotli, landing 384 B, and all optional features about 1.21 kB. The fixed kernel/minimal graph is where size work belongs.

### S-02 — The current size gate is not yet a reproducible consumer measurement

`.size-limit.json` has no limits and weighs unions of built entry files, which the README itself calls an approximation (`README.md:50-52`). There are no checked-in exact consumer fixtures, saved bundler configuration, complete module graph assertions, or feature-matched baseline required by M-3.

This is planned Phase 11 work, but size should not be described as "proven" until it exists. Given the raw 30.45 kB result, execute M-3 before adding more fixed kernel surface and set budgets immediately afterward.

### S-03 — Low: several runtime members currently exist only for tests or diagnostics

Candidates to justify or remove before bundle freeze:

- `VisualLiftSession.baseTransform` (`kernel/presentation.ts:204-218`);
- `Lifetime.finalized` (`kernel/lifetimes.ts:26-31`, `51-56`);
- unused `FrameTask.flush()` (`kernel/invalidation.ts:38-45`, `80-85`);
- diagnostic-only `OperationIdentity.id` and `nextOperationId` (`kernel/frames.ts:14-18`, `kernel/kernel.ts:217`, `633`).

None is individually large, and tests may legitimately need internal observability. Together with the unstripped dev machinery, however, they are the kind of fixed cost M-3 should attribute rather than leave accidental.

## Maintainability and test findings

### M-01 — Medium: the package README describes a repository that no longer exists

`packages/drag2/README.md:12-26` says only Phases 0–6 are complete, feature modules are stubs, `assemble()` does not exist, and `sortable.ts` is empty. The current package has the full Phase 8b composition. This is the first document a new contributor sees, so it materially undermines otherwise strong source comments. Update status, module map, examples, known deviations, and current measurement state now.

### M-02 — Medium: core control flow is understandable locally but hard to hold globally

`kernel/kernel.ts` is 1,915 lines in one closure and `sortable/spec.ts` is 803. Privacy and call-site performance are valid reasons not to split them mechanically, but lifecycle state is spread across dozens of closure slots and helpers. The planned phase/action coverage map and a concise state/ownership table beside the implementation would give contributors a reliable navigation layer without adding runtime abstraction.

There is also literal SPI duplication: `ActionTransition` and `SeamRejection` are separately declared in `kernel/seams.ts:59-84` and `kernel/spec.ts:96-103`, `212-228`. Define each once to prevent drift.

### M-03 — Medium: important logic and Phase 8b boundaries lack direct coverage

- `sortable/collection.ts` is a 205-line pure engine with no direct table-driven test. Browser suites cover selected paths, mostly while dragging item 0. Add start/end/internal survival, first/middle/last home gaps, version mismatch, missing item, range/neighbour mismatch, and permutation/property cases.
- Optional-feature tests do not cover mixed non-item siblings, authored row transforms, non-first dragged items, or custom placeholder self-removal.
- The Phase 8b exit rows for shadow-DOM press and iframe-hosted roots are not exercised end-to-end through the optional composition.
- Phase 10's real React `useLayoutEffect`, insertion above the placeholder, new keyed item in the destination gap, and dragged-item unmount remain absent. Those are planned work, but they are sign-off blockers rather than optional polish.
- Numeric options accept `NaN`/infinity/negative values. In particular a `NaN` threshold makes every press remain pending until pointer-up, with no diagnostic (`kernel/kernel.ts:1464-1469`). Validate or document the numeric domain.

### M-04 — Medium/low: Q-7's CI assertion is flaky and the harness is narrower than its claims

The full suite failed once at `tests/perf/q7.browser.test.ts:227-234` because `twoPasses < onePass * 2` did not hold, then passed unchanged on rerun. That is a timing flake in a test whose header says it cannot become one (`:6-10`).

The test comment at `:228-230` also says forced layout is the expensive part, while the checked-in result concludes the read loop dominates (`measurements/q7.md:49-55`). Its `readAll` writes two scalars per item (`q7.browser.test.ts:120-127`) rather than vertical's six, and its "span" case omits WAAPI creation, keyframes, promises, maps, and cancellation. The Q-7 ratio is useful evidence for choosing a span, but not an end-to-end cost claim for the implemented feature.

Keep the measurement as a manually interpreted benchmark record, move unstable ratios out of the ordinary correctness gate, and add a real feature trace.

### M-05 — Low: packaging graph checks can silently miss imports

`tests/packaging.node.test.ts:25-28` finds only single-quoted `from './relative'` syntax. Side-effect imports, double quotes, and dynamic imports bypass both ship-list traversal and optional-feature isolation. Use the bundler's module graph or a real module lexer, especially for M-3.

### M-06 — Low: `PresentationView.insertion` violates its documented lifetime

`sortable/runtime.ts:45-56` says `insertion` is null outside the displacement bracket. `sortable/spec.ts:462-480` sets it before hooks but never clears it, including early failure paths. Current first-party code only reads it inside hooks, so this is not an observable bug today; it is a false invariant and a future footgun. Clear it in `finally` or document the actual last-move semantics.

## Recommended order

1. Fix B-01 first; it violates the transactional foundation rather than one optional behavior.
2. Fix B-02 and B-03 together, then add mixed-sibling, non-first-item, and authored-transform fixtures.
3. Close B-04 with post-insertion structural validation.
4. Resolve the landing coordinate contract before Phase 9 freezes public types.
5. Complete the Phase 9 export surface and remove internal SPI exports.
6. Strip dev code, run M-1/M-2/M-3, and set size budgets before claiming performance or bundle sign-off.
7. Update the README and land the coverage map so the fixes do not increase the package's contributor-only knowledge burden.

With those blockers closed, the architecture is a credible replacement candidate: the defects are concentrated at reentrant DOM/consumer boundaries and in one optional animation feature, not in the settlement state machine's core ownership model.