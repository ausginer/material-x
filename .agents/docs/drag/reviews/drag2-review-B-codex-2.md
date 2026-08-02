# `drag2` Checkpoint B closure assessment

Date: 2026-08-02  
HEAD: `c7614c3ef9e99a5e446af5640364a5308b560024`

This is a read-only re-verification of the findings in `drag2-review-B-codex.md`, not a new audit or a fix pass. The implementation and contract changes since the original audit are the two commits `d581d7f2` (`drag: checkpoint B pass 1`) and `c7614c3e` (`drag: checkpoint B address issues`). No production or contract file was changed during this assessment.

The classifications mean:

- **CLOSED** — the original failure no longer reproduces and committed tests directly pin the repaired behavior;
- **PARTIALLY CLOSED** — the original reproduction is fixed, but the same boundary still has a narrower demonstrated hole or documented residue;
- **DEFERRED** — the issue still exists but the current plan explicitly assigns it to a later phase;
- **OBSOLETE** — the premise no longer applies; and
- **STILL OPEN** — the issue remains without a complete, later-phase closure.

No finding is obsolete. Of the 22 original findings, 4 are closed, 3 are partially closed, 9 are deferred, and 6 are still open.

## Executive closure result

The optional-feature composition cluster is much stronger than at the first audit. Layout animation now owns only snapshot members, excludes the dragged item, composes through additive `translate`, retargets continuously, and gives `vertical()` a settled-presentation read window. Custom-placeholder insertion and landing-animation acquisition now fail atomically. The timing-flaky Q-7 CI assertion is gone.

Checkpoint B should nevertheless **not close yet**, even under a narrow reading. The original B-01 reproduction using `updateItems()` is fixed, but the new Boolean admission latch is not nesting-safe. A handle resolver can synchronously dispatch another eligible `pointerdown`; the nested admission swaps the frame pair and its coordinates survive while the outer resolver overwrites the behavior fields. A temporary Chromium probe demonstrated an outer press at `y=10` activating after a move to `y=15` because a nested press at `y=100` had supplied the committed origin. That is a current transactional correctness failure, has no later-phase owner, and is not merely Phase 9/10/11 backlog.

Once that residual is closed, the remaining items divide cleanly into the Phase 9 public-surface freeze and the explicitly deferred Phase 10/11 work.

## Verification performed

- Focused browser regressions: `sortable.browser.test.ts`, `displacement.browser.test.ts`, `features.browser.test.ts`, and `q7.browser.test.ts`: **153 passed, 3 skipped**. The skips are the opt-in Q-7 timing measurements; the structural Q-7 gate ran.
- Focused packed-consumer and packaging suites: **11 passed**.
- The build completed successfully and the focused Vitest runs reported no type errors.
- Current Size Limit approximation:
  - minimal: **10,625 B Brotli**;
  - minimal + `layoutAnimation()`: **11,240 B**;
  - minimal + `landing()`: **11,024 B**;
  - complete: **11,948 B**.
- Temporary exact single-consumer Rolldown builds measured:
  - minimal: **29,079 B minified / 9,534 B Brotli**;
  - complete: **31,315 B minified / 10,264 B Brotli**. These are audit evidence, not the missing checked-in M-3 fixtures.
- Browser-like production probes against the built `kernel/dev.js` returned `DEV=true` when `process` was absent and threw a `TypeError` when `globalThis.process = {}`.
- One temporary nested-admission browser probe was created, run, and removed. It failed on the residual described under B-01. No temporary workspace probe or temporary consumer fixture remains.

## Correctness and contract findings

### B-01 — PARTIALLY CLOSED: admission dispatch isolation

**What changed.** `d581d7f2` added an `admitting` latch around native admission (`kernel/kernel.ts:271-287`, `700-719`). `dispatchKernel()` now enqueues behavior actions without draining while that latch is set (`:501-511`), and the outer boundary drains only after admission commits or abandons. The normative queue contract was amended to match.

**Original reproduction.** The original handle/visual resolver calling `updateItems()` no longer corrupts the frame. Replacements run after admission, can rebase or remove the pressed item, and preserve dispatch order.

**Committed pins and mutation cases.** The block at `tests/sortable/sortable.browser.test.ts:444-629` covers handle and visual resolvers, identity replacement, reverse-order rebase, pressed-item removal, multiple queued replacements, and reentrant `destroy()`. Those tests passed. They would fail if the new `if (admitting) return` were removed.

**What remains.** The latch is Boolean and `onPointerDown()` does not reject entry while it is already true. A nested `pointerdown` can open and commit a second admission, clear the Boolean while the outer admission is still active, and swap `current`/`draft`. The outer `spec.admit(event, draft)` then continues writing through the old object, which is now current. The temporary probe used outer item 0 at `y=10`, nested item 1 at `y=100`, then moved to `y=15`; item 0 started even though outer travel was only 5 px. This confirms mixed inner kernel coordinates and outer sortable fields rather than a theoretical concern.

Reject nested ingress while admission owns the boundary, or make admission ownership nesting-safe, and add this exact regression. **Owner: Checkpoint B / a foundational correctness follow-up; no later phase currently owns it.**

### B-02 — CLOSED: layout-animation ownership

**What changed.** `c7614c3e` replaced the unrestricted sibling set with the crossed span filtered through a versioned snapshot-membership `Set`, plus the still-in-flight set (`sortable/layout-animation.ts:47-142`). The dragged item is explicitly excluded; the placeholder and unrelated siblings fail membership. Rows removed by `updateItems()` are released and not reacquired.

**Original reproduction.** The interleaved `<hr>` no longer receives a displacement, and a middle dragged item is neither animated nor measured.

**Committed pins and mutation cases.** `displacement.browser.test.ts:375-521` pins dragged-item exclusion by output and read count, unrelated sibling and placeholder exclusion, removal from the collection, and all-or-nothing WAAPI tracking. The read-count pin is important: widening the set can produce only zero deltas and previously survived three behavioral mutations.

**What remains.** Nothing from B-02 in Chromium. Other engines remain a Phase 10 / infrastructure coverage issue, not an ownership defect observed at HEAD. **Owner: closed by Checkpoint B pass 2.**

### B-03 — CLOSED: authored transforms, retargeting, and vertical interaction

**What changed.** Displacement now animates the independent `translate` longhand with `composite: 'add'`, never `transform` (`layout-animation.ts:182-202`). Before a move it records the currently visible position, cancels every owned offset, lets the behavior move the placeholder and eagerly rebuild the axis against settled presentation geometry, then replays from the recorded position (`spec.ts:523-550`, `vertical.ts:196-217`). At most one tracked displacement is published per element.

**Original reproduction.** An authored scale/rotate is no longer replaced. Authored `translate` and concurrent consumer animations also remain composed. Interrupted displacement resumes from its visible midpoint, and enabling layout animation no longer changes vertical gap decisions.

**Committed pins and mutation cases.** `displacement.browser.test.ts:251-280` pins the Chromium additive-translate primitive; `:284-373` pins settled geometry and behavior equivalence; `:522-625` covers authored transform/translate and consumer animations; `:627-700` pins one-animation ownership and retarget continuity; `:702-749` bounds the real combined bracket reads. These passed.

**What remains.** The exact additive-composition assertions currently run only on Chromium. That is disclosed in the plan and belongs to later coverage, not to the fixed Chromium behavior. **Owner: closed by Checkpoint B pass 2.**

### B-04 — CLOSED: custom-placeholder structural validation

**What changed.** After `item.after(placeholder)` and its synchronous `connectedCallback`, activation now requires the placeholder to be connected and exactly adjacent to the dragged item before runtime publication or `onStart` (`sortable/spec.ts:287-329`). Failure stays within the activation seam, so the registered disposer removes the node and `FAILURE_ACTIVATION` is reported.

**Original reproduction.** Self-removal and self-reparenting now produce no `onStart`, one classified error, and no retained placeholder.

**Committed pins and mutation cases.** `sortable.browser.test.ts:706-859` covers destroy-on-connect, self-remove, self-reparent, detached list, same-parent movement, item reparenting, and a harmless custom-element connection. Those tests passed and pin both connectivity and adjacency conjuncts.

**What remains.** Nothing from the original finding. **Owner: closed by Checkpoint B pass 1.**

### B-05 — STILL OPEN: landing coordinate semantics

**What changed.** No normative resolution landed. The implementation still converts `LandingContext.from`, `.target`, and readiness-time `retarget()` to origin-relative deltas (`kernel/kernel.ts:1160-1174`, `1619-1628`). The contract still declares `anchorTarget()` as a viewport point and its normative flow hands the resulting `target` directly to the runner. `kernel/spec.ts:151-170` does not label the three public point fields with a coordinate space.

**Original reproduction.** It still works by inspection: a custom runner written from the normative flow and one written from the README interpret the same `Point` differently. `packages/drag2/README.md:33` still explicitly admits the discrepancy.

**Committed pins and mutation cases.** None distinguishes exact coordinate values. Current runner doubles treat targets opaquely, so changing between raw viewport points and deltas would not fail them.

**What remains.** Choose one space, amend the normative text and public comments, and add initial/retarget exact-value tests before `LandingContext` freezes. **Owner: Phase 9 public surface; this is a Phase 9 blocker.**

### B-06 — DEFERRED: production `DEV` behavior

**What changed.** Nothing. `kernel/dev.ts:10-22` still resolves missing `process` to `true`, does not compile the guarded code out, and dereferences `process.env` without checking that `env` exists. The built output still contains the `process` branch, diagnostics, and assertion functions.

**Original reproduction.** It still works. The two direct artifact probes returned `DEV=true` in a browser-like global and a `TypeError` for a partial `process` object.

**Committed pins and mutation cases.** There is no production artifact test for stripping because stripping is not implemented. In-repo tests exercise the assertions only in development mode.

**What remains.** Introduce the planned build-time definition and assert that a production consumer contains neither the dev scans, diagnostic strings, nor a runtime `process` dependency. **Owner: explicitly Phase 11 M-3.**

### B-07 — DEFERRED: internal SPI exports and missing public exports

**What changed.** Nothing material. `src/drag.ts:10-18` still exports `ActivationScope`, `BehaviorInstall`, `BehaviorSpec`, `KernelHost`, `ResolutionCommand`, and `SeamRejection`; emitted `drag.d.ts` therefore reaches `kernel/spec.d.ts`. Required public `Point`, `DragErrorContext`, `FailureStage`, `DOMRealm`, and failure-stage values are still absent. `SortableFeature` is still physically declared in `sortable/feature.d.ts` and re-exported from `sortable.d.ts`.

**Original reproduction.** Importing the internal SPI from `drag.js` still typechecks, while imports required by the frozen table do not all resolve.

**Committed pins and mutation cases.** `exports.node.test.ts` pins subpath topology, and `consumer.node.test.ts` pins opaque `Behavior`/`SortableFeature` construction and packed declaration resolution. Neither asserts the exact allowed export-name set or rejects the currently exported SPI; both passed.

**What remains.** Complete the exact export table, declaration topology, public failure discriminants, and negative consumer fixture. **Owner: explicitly Phase 9; this is a Phase 9 blocker.**

### B-08 — CLOSED: landing acquisition rollback

**What changed.** `d581d7f2` keeps the newly created animation local until `finished.then(...)` is acquired successfully. An accessor or subscription throw increments the generation, cancels the local animation, and rethrows; only then is it published (`sortable/landing.ts:72-112`).

**Original reproduction.** A patched throwing `finished` accessor now leaves the animation idle and absent from the visual instead of leaking a writer.

**Committed pins and mutation cases.** `features.browser.test.ts:494-536` performs that exact mutation and asserts one classified failure, idle animation, and an empty animation list. The analogous displacement acquisition is pinned at `displacement.browser.test.ts:478-521`. Both passed.

**What remains.** Nothing from B-08. **Owner: closed by Checkpoint B pass 1.**

## Performance and allocation findings

### P-01 — DEFERRED: visual rendering still runs per input sample

**What changed.** No coalescing change landed. Each active sample still calls `begin()`/`commit()` and then `runMoved()` synchronously (`kernel/kernel.ts:1493-1515`); sortable writes the lift before scheduling only the spatial lookup (`sortable/spec.ts:385-399`). The controller-stable `runMoved` closure remains a positive earlier optimization.

**Original reproduction.** Static call tracing still shows one frame copy, transform-string construction, and style write per active pointer sample. There is no committed high-rate input trace or mutation pin.

**What remains / owner.** Measure generic versus specialized publication and decide whether visual writes can be coalesced without weakening synchronous state. **Owner: explicitly Phase 11 M-1.**

### P-02 — STILL OPEN: six-scalar vertical cache

**What changed.** `vertical()` gained eager settled measurement, but its storage did not shrink. `STRIDE` remains 6; refresh writes left/top/right/bottom/centreX/ centreY, while resolve reads only `CENTRE_Y` (`sortable/vertical.ts:40-47`, `98-179`). Retirement retains the high-water typed array.

**Original reproduction.** A 100,000-item high-water collection still retains a 131,072 × 6 Float64 buffer, approximately 6.29 MB. No test pins a reason for the five unused values.

**What remains / owner.** Reduce to the axis-specific scalar or justify the stride with measurement; consider a high-water shrink policy. The plan once specified the six-value stride, so this is not a plan-contract violation, but it remains a resource concern. **No exact phase owns it; place it in Phase 11's M-2 heap work.**

### P-03 — STILL OPEN: placeholder geometry on every resolve

**What changed.** The settled-read window changes when item geometry refreshes, not how the placeholder is read. Every resolve still calls `centreOf()`, and that calls `placeholder.getBoundingClientRect()` even when the item cache is clean (`vertical.ts:59-63`, `143-150`).

**Original reproduction.** The clean-cache path still performs one native layout-facing placeholder read. No committed call-count test asserts otherwise.

**What remains / owner.** Cache/invalidate the incumbent centre or document and measure why the read is preferable. **No explicit owner; closest fit is Phase 11 M-1.**

### P-04 — STILL OPEN: overlapping activation geometry reads

**What changed.** Presentation restoration became more robust, but activation still reads the target rect (`kernel.ts:758`), traverses its box space through `coordinates()` (`presentation.ts:383-402`), and later reads `offsetWidth` and `offsetHeight` for placeholder mechanics (`placement.ts:53-54`).

**Original reproduction.** The three geometry paths remain in the same activation. There is no activation-read-count fixture or mutation pin.

**What remains / owner.** Measure whether the box-quad result can supply the required offset-box semantics without broadening the public activation scope. **No explicit owner; add an activation case to Phase 11 M-1.**

### P-05 — STILL OPEN: collection-update/release allocation

**What changed.** Collection semantics gained broader integration coverage but the algorithms are unchanged. `copyUniqueItems()` still creates an array and a temporary `Set`; `destinationOf()` still filters a new array for reconciliation and proposal building (`sortable/collection.ts:41-59`, `66-123`, `166-204`).

**Original reproduction.** Each large replacement and release retains the same O(n) temporary-allocation shape. No allocation counter or direct collection test pins the current implementation.

**What remains / owner.** Fuse destination scans only if heap/GC evidence says the extra garbage matters. **No explicit owner; natural extension of Phase 11 M-2.**

## Bundle-size findings

### S-01 — DEFERRED: complete raw-minified consumer remains over 30 kB

**What changed.** Correctness fixes increased both fixed and optional code. Size Limit moved from 10,263/11,469 B Brotli minimal/complete to 10,625/11,948 B. A fresh exact audit-only consumer build measured 29,079 B minimal and 31,315 B complete minified, with 9,534/10,264 B Brotli respectively.

**Original reproduction.** The complete single consumer still exceeds a 30,000-byte raw-minified target, now by 1,315 B. Compressed transfer remains healthy, and optional splitting still works.

**Committed pins and mutation cases.** `.size-limit.json` names four unions but contains no budgets. No committed exact fixture would fail on this growth.

**What remains / owner.** Decide the authoritative raw/compressed budgets using the checked-in feature-matched baselines, then enforce them. **Owner: explicitly Phase 11 M-3.** The observed 30 kB raw concern remains real, but its decision and enforcement were deliberately deferred to that measurement gate.

### S-02 — DEFERRED: exact consumer measurement and reliable graph assertions

**What changed.** The packed-consumer suite is healthy and passed, but the size gate remains an unbudgeted union of emitted entries. No exact fixture, saved bundler configuration, feature-matched non-composed baseline, or checked-in module graph exists.

**Original reproduction.** It still works. `packaging.node.test.ts:25-28` parses only single-quoted `from './relative'` clauses; side-effect, double-quoted, and dynamic imports evade traversal. Its optional-isolation list names only the four current feature entry files, not future optional-only helpers. Passing the three packaging tests therefore does not prove the consumer graph.

**Committed pins and mutation cases.** The packaging and packed-consumer tests pin tarball completeness, current subpaths, declaration resolution, opacity, and the limited regex graph; all 11 focused tests passed. There is no parser self-test covering the missed syntaxes.

**What remains / owner.** Replace the source regex with the real bundler graph, check exact consumer fixtures and both baselines, and add budgets. **Owner: explicitly Phase 11 M-3.**

### S-03 — DEFERRED: test/diagnostic-only fixed runtime members

**What changed.** None of the original candidates was removed: `VisualLiftSession.baseTransform`, `Lifetime.finalized`, unused `FrameTask.flush()`, and diagnostic `OperationIdentity.id`/`nextOperationId` remain. The DEV machinery also still ships.

**Original reproduction.** Source-use tracing still finds `baseTransform` and `finalized` observed only by tests, no source caller of `FrameTask.flush()`, and no runtime comparison of operation IDs. Existing tests pin diagnostics and test observability, not production necessity.

**What remains / owner.** Attribute these fixed costs before keeping or removing them; do not optimize them individually without size evidence. **Owner: Phase 11 M-3, together with DEV stripping.**

## Maintainability and coverage findings

### M-01 — DEFERRED: stale package README

**What changed.** Nothing. `packages/drag2/README.md:12-27` still says only Phases 0–6 exist, feature modules are stubs, `assemble()` is absent, and `sortable.ts` is empty. The current package is complete through Phase 8b.

**Original reproduction.** Reading the entry documentation still gives a new contributor a false module/status map. No test pins documentation freshness.

**What remains / owner.** Rewrite status, usage, deviations, and migration guidance. **Owner: Phase 9 explicitly includes README and migration notes.**

### M-02 — DEFERRED: global control-flow shape and duplicated SPI types

**What changed.** The source gained valuable lifecycle explanations, but the global shape grew: `kernel.ts` is now 1,971 lines and `sortable/spec.ts` 872. `ActionTransition` and `SeamRejection` remain independently declared in `kernel/seams.ts` and `kernel/spec.ts`. No state/ownership navigation table or coverage map landed.

**Original reproduction.** A contributor still has to correlate closure slots, phase transitions, attempts, and lifetimes across one large executor; literal type drift remains possible. Tests exercise behavior, not navigability or type deduplication.

**What remains / owner.** Phase 10's coverage map should provide the navigation layer, and Phase 11 M-2 should settle whether the closure architecture itself changes. Type deduplication can accompany Phase 9 internal-surface cleanup. Mechanical splitting before those decisions is not warranted.

### M-03 — PARTIALLY CLOSED: important coverage gaps

**What changed.** The two remediation commits added extensive admission, placeholder, collection-integration, displacement ownership, authored-style, retargeting, settled-geometry, and read-count coverage. Most original Phase 8b animation boundary gaps are now directly pinned.

**Original reproduction.** The original mixed-sibling, authored-transform, non-first dragged item, and self-removing placeholder cases no longer reproduce.

**Committed pins and mutation cases.** The admission/custom-placeholder cases are in `sortable.browser.test.ts:444-859`; broad active-collection replacements are at `:1545-1727`; the composed displacement suite is `displacement.browser.test.ts`. These passed.

**What remains.** There is still no direct table/property/permutation suite for the pure `sortable/collection.ts` engine. Numeric domains remain unvalidated and undocumented: `threshold: NaN` still leaves a press pending because the distance comparison is permanently false; negative/non-finite landing and displacement durations are also passed through. There is no end-to-end sortable shadow-root press or iframe-hosted root (only the kernel realm has an iframe unit test), no real React `useLayoutEffect`/authored insertion/unmount fixture, and no Firefox or WebKit run; `.scripts/vitest-config.ts:99-104` names Chromium only.

**Owner.** Phase 10 owns the matrix, React mutations, and coverage map. The shadow/iframe rows are overdue Phase 8b criteria and should be carried into that phase explicitly. Numeric validation belongs at the Phase 9 surface freeze. Cross-engine execution has no scheduled owner and needs an infrastructure decision.

### M-04 — PARTIALLY CLOSED: Q-7 stability is fixed, its record is stale

**What changed.** `d581d7f2` replaced CI wall-clock ratios with deterministic read counts and moved timings behind `VITE_DRAG_MEASURE=1` with no timing assertions (`q7.browser.test.ts:246-301`). `c7614c3e` added a real composed layout/vertical read bound (`displacement.browser.test.ts:702-749`).

**Original reproduction.** The flaky `twoPasses < onePass * 2` correctness gate cannot reproduce because it is no longer in the ordinary suite. The focused run executed the structural tests and skipped the three opt-in timings.

**Committed pins and mutation cases.** Exact one-slot and full-view read counts pin the structural Q-7 answer; the real composition asserts a positive but sub-list bracket cost. The plan records why read counts were necessary: three widened-set mutations survived output-only tests.

**What remains.** `measurements/q7.md:15-18` still claims timings and ratios run in CI and cannot flake, and `:99-103` still says vertical rebuilds lazily on the next frame even though it now measures eagerly inside the settled bracket. The isolated Q-7 test manually performs its reads; the composed bound is the actual implementation pin, and its `< rows` bound is intentionally less exact.

**Owner.** The correctness gate itself is closed. Update the M-4 record during Phase 11 measurement finalization, or sooner as documentation maintenance.

### M-05 — DEFERRED: packaging graph parser remains incomplete

**What changed.** Nothing in the parser. It is still the single-quote `from`-clause regex described under S-02. The focused packaging tests pass, but none mutates import syntax to prove traversal completeness.

**Original reproduction.** A side-effect, double-quoted, or dynamic relative import still disappears from `reachableFrom()` and can bypass both ship-list coverage and optional isolation.

**What remains / owner.** Supersede the regex with the consumer bundler's module graph or a real lexer. **Owner: Phase 11 M-3.**

### M-06 — STILL OPEN: `PresentationView.insertion` cleanup

**What changed.** The view gained `item`, and the move bracket gained eager measurement, but cleanup did not land. `spec.ts:523` assigns `view.insertion`; there is no assignment back to `null`. New early returns after invalidation or measurement failure retain it too.

**Original reproduction.** The documented invariant in `runtime.ts:51-62` is still false after a successful or failed bracket. First-party hooks cannot currently observe the view outside a hook call, so this remains an internal future risk rather than a public behavior failure. No test captures the view and asserts its post-bracket state.

**What remains / owner.** Clear the field in `finally`, including every hook and measurement failure path, or change the documented lifetime/type to the actual last-insertion semantics. Add an internal lifecycle test. **No phase currently owns it; close before Phase 9 or carry it explicitly into Phase 10.**

## Closure table

| ID | Classification | Reproduction at HEAD | Planned owner |
| --- | --- | --- | --- |
| B-01 | **PARTIALLY CLOSED** | Original `updateItems()` case fixed; nested `pointerdown` still corrupts admission state | Checkpoint B follow-up |
| B-02 | **CLOSED** | Unrelated/dragged elements no longer animated | Closed in pass 2 |
| B-03 | **CLOSED** | Authored transforms survive; retarget/vertical interaction pinned | Closed in pass 2 |
| B-04 | **CLOSED** | Self-remove/reparent fails activation cleanly | Closed in pass 1 |
| B-05 | **STILL OPEN** | Runner coordinate contract remains ambiguous | Phase 9 blocker |
| B-06 | **DEFERRED** | Browser DEV remains enabled and unstripped | Phase 11 M-3 |
| B-07 | **DEFERRED** | Internal SPI still exported; required public surface incomplete | Phase 9 blocker |
| B-08 | **CLOSED** | Partial landing acquisition now cancels locally | Closed in pass 1 |
| P-01 | **DEFERRED** | Visual write remains per input sample | Phase 11 M-1 |
| P-02 | **STILL OPEN** | Six doubles retained per vertical slot | Phase 11 M-2 extension |
| P-03 | **STILL OPEN** | Clean resolve still reads placeholder rect | Phase 11 M-1 extension |
| P-04 | **STILL OPEN** | Activation still has overlapping geometry reads | Phase 11 M-1 extension |
| P-05 | **STILL OPEN** | Collection paths retain O(n) temporary arrays/Set | Phase 11 M-2 extension |
| S-01 | **DEFERRED** | Complete exact consumer is 31,315 B minified | Phase 11 M-3 |
| S-02 | **DEFERRED** | Exact checked-in fixtures/graphs/budgets absent | Phase 11 M-3 |
| S-03 | **DEFERRED** | Diagnostic/test-only fixed members remain | Phase 11 M-3 |
| M-01 | **DEFERRED** | README remains stale | Phase 9 |
| M-02 | **DEFERRED** | Large closure and duplicate SPI types remain | Phases 9–11 |
| M-03 | **PARTIALLY CLOSED** | Animation gaps closed; collection/numeric/platform/React gaps remain | Phases 9–10 plus infra decision |
| M-04 | **PARTIALLY CLOSED** | Stable gate landed; measurement record is stale | Phase 11 M-4 documentation |
| M-05 | **DEFERRED** | Regex graph still misses valid import forms | Phase 11 M-3 |
| M-06 | **STILL OPEN** | `view.insertion` remains non-null after bracket | Unassigned; before Phase 9 or Phase 10 |

## Remaining Phase 9 blockers

1. Resolve and pin the coordinate space of `LandingContext.from`, `.target`, and `LandingHandle.retarget()` (B-05).
2. Replace the interim SPI exports with the exact public/internal boundary, declaration topology, failure discriminants, and exact export fixture (B-07).
3. Define and validate/document public numeric option domains, especially `threshold`, before their behavior becomes API contract (M-03 residue).
4. Bring the README and migration guidance up to the implementation being frozen (M-01), and preferably remove the duplicated internal SPI declarations while touching that boundary (M-02).

B-01 is earlier than Phase 9 and must be closed before entering that freeze.

## Remaining Phase 10/11 and maintainability backlog

- **Phase 10:** direct pure collection cases or an explicit coverage mapping to equivalent integration cases; real React `useLayoutEffect` and authored DOM mutations; dragged-item unmount; end-to-end shadow-root and iframe roots; the matrix-to-test coverage map. Decide separately whether Firefox/WebKit enter the supported matrix.
- **Phase 11 M-1/M-2:** per-sample frame/style cost, placeholder clean-hit read, activation geometry overlap, vertical high-water storage, collection GC, and controller/frame-task heap policy.
- **Phase 11 M-3:** checked-in exact consumers, reliable bundler module graphs, both baselines, raw/compressed budgets, production DEV stripping, and fixed member attribution.
- **M-4 documentation:** update `measurements/q7.md` to the deterministic gate and eager settled-read implementation.
- **Unassigned maintainability:** make `PresentationView.insertion`'s actual lifetime match its documented invariant, and provide a contributor-facing lifecycle/ownership navigation layer without prematurely restructuring the executor.

## Narrow Checkpoint B verdict

**No.** The contribution/slot design, optional-feature ownership, animation composition, Q-7 structural gate, and minimal optional isolation are now credible. Phase 9/10/11 work should not be pulled backward merely to close this checkpoint. However, B-01's nesting hole is a demonstrated frame-publication failure at the native admission boundary and has no later-phase owner. Close and pin that one residual first; after it is fixed, Checkpoint B can close narrowly while the explicitly listed Phase 9 blockers and Phase 10/11 backlog remain open.