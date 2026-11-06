# Architecture plan for the new `packages/drag`

**Status: recommendation, stopped for the owner's decisions.** No `D-*` was minted and no contract was changed. Section 11 lists the decisions, and section 10 is the implementation handoff they release.

**Inputs:** `7723f3e8a` for the pre-removal sources, the single-pass proposal, the flow record and the prototype. `b739c5449` for Part 3 of the independent model.

**Separate:** Baseline B and the references to deleted drag files are deferred integration work. They are reported in [`deferred-integration.md`](deferred-integration.md) and did not affect this analysis.

## 1. Recommendation

**Build the new package on the single-pass control model, keep the current presentation capabilities, and replace the public surface with a much smaller one.** The two prototypes answer three independent questions, so the choice is not one prototype against the other:

| Axis | Single-pass prototype | Independent prototype | Recommended |
| --- | --- | --- | --- |
| **Control** | Requests fill slots, and one loop applies them between steps | Consumer code runs after state is consistent, with nested commands applied synchronously | **Single-pass** |
| **Presentation** | Top-layer lift, live placeholder, cached geometry | Translate-only proposal, no placeholder, no top layer | **Single-pass's capabilities, with the independent model's click guard and additive tails** |
| **Surface** | Today's surface, kept for the differential | Plain options, no tiers, no error classes | **The independent model's plainness, with the capabilities above** |

**What this delivers, against production:**

| Measure | Production | Single-pass prototype | Recommended |
| --- | --- | --- | --- |
| Lifecycle code, lines without comments | 2,553 | 1,200 | Under 1,200, **estimated** |
| Complete composition, Brotli | 11,533 B | 8,740 B | About 8 KB, **estimated** |
| Free drag, Brotli | 8,627 B | 6,025 B | About 5.5 KB, **estimated** |
| Public runtime exports | `kernel.js` alone has 33 | Unchanged | About 10, plus string unions |
| Library frames, median sample | 15 | 5 | About 5, **estimated** |

**The largest simplification is in lifecycle and surface. Bytes fall by about 30%.** The independent prototype's 2.3 KB is not on offer at these capabilities. Section 4 prices what would have to go to get closer to it.

## 2. Owner constraints

From the brief for this unit:

- The target is a new implementation in `packages/drag`.
- Nothing is published. API, SPI and internal architecture may change, and no compatibility with the old API is required (CONTRIBUTING §8).
- Required capabilities and observable guarantees must be chosen explicitly.
- The owner wants substantial simplification without another long sequence of tiny units.
- Isolated probes are allowed. This unit does not implement the replacement or rewrite existing contracts.

Carried forward from the [reentrancy brief](../../drag2/.plan/reentrancy-redesign-brief.md) and CONTRIBUTING:

- A request and its application are separate, and a request must not change a running sequence.
- Runtime performance beats bytes by default. Extra reads, allocation or O(n) work on a hot path need measurement and owner approval (§0, §14).
- Correctness covers valid use, the end user, the platform and the library's own state. Misuse outside that domain gets no guard (§1.1).
- An export exists only if a consumer has to write that value (§4). Optional features pay for themselves (§7).

## 3. Control: single-pass

**The deciding evidence is synchronous foreign code running in the middle of a step.** Part 3's rule 4 was tested against declared callbacks, where it holds. A custom-element reaction is not a declared callback. The platform runs it synchronously inside the attribute write or DOM move that triggers it.

| Scenario, real Chromium and real mouse | Independent | Single-pass |
| --- | --- | --- |
| Reaction calls cancel during activation | `onEnd` **before** `onStart`, and an inline translate left on the item, still there after a later drag | `onStart`, then `onEnd:canceled`, clean, and the next drag works |
| Reaction calls destroy during activation | `onEnd` then `onStart`, with displacement left on a destroyed controller | `onStart` only, clean |
| Nested press in a reaction | Handled | Handled |
| Independent's own commit `disconnectedCallback`, with destroy, cancel or press | No defect observed | Not applicable |

**The independent model can be repaired, and the repair is this model.** Fixing it needs a flag that says a step is running and somewhere to hold a request until the step ends. That is `#running` and the slots, so the difference between the models shrinks to one loop. The loop also states the owner's request/application rule directly, which rule 4 does not.

**Keep from the single-pass proposal:**

- One `Session` record, with idle as its absence. Three states: pending, active, releasing.
- `#running` refuses a nested pass. Foreign code can only fill a slot.
- `#applyRequests` is the only reader of the slots, with fixed precedence: destroy, deferred work, cancel, fault, verdict, next step.
- `session.next` only where a step continues past foreign code, which is the verdict round-trip and the keyboard path.

**Adopt from the independent model:**

| What | Why |
| --- | --- |
| **Click guard with its own pointer identity, expiring after that pointer's release** | `flow-1` is confirmed: after a reorder, the next outside click was swallowed on single-pass and delivered on independent. This is the one user-visible defect found in production |
| **A verdict signal that aborts only on cancel or destroy** | A success path must not fire a consumer's rollback listener. The gap probe confirms single-pass already behaves this way, so this states it as a guarantee |
| **Tails that outlive the session and are owned by the controller** | Answers `flow-8`, where a row animation is cut short at retire. Stopping a tail stays safe, and the tail set owns any cleanup that decoration needs |
| **The "propose, then commit" vocabulary** | The consumer owns DOM order, and the names should say so |

**Reject from the independent model:** nested synchronous commands (above), the modal keyboard (`accessibility.md` records one press per move as a deliberate choice with no modal state), and dropping realm, zoom and scale (section 4).

**What this model costs.** `Session` is mutable and shared, and discipline replaces the type-level draft protection. That is acceptable only if the tier stays private (section 6). It also gives up FIFO between kinds of request, which is decision 1 in section 11.

## 4. Presentation: keep the capabilities, price them openly

**Part 3 already showed performance doesn't decide this, and my measurement agrees.** Means per real move, 300 moves with one frame each, median of 3 runs in headless Chromium:

| Items | Arm | Layouts per run | Script µs | Task µs (range) |
| --- | --- | --- | --- | --- |
| 20 | Cached axis (`y`) | 41 | 138 | 1,714 (1,680–1,766) |
| 20 | Hit-test axis, no cache | 41 | 198 | 1,783 (1,760–1,813) |
| 20 | Independent | 1 | 89 | 1,527 (1,378–1,584) |
| 2,000 | Cached axis (`y`) | 41 | 154 | 2,980 (2,859–3,228) |
| 2,000 | Hit-test axis, no cache | 41 | 1,138 | **3,976 (3,864–3,997)** |
| 2,000 | Independent | 1 | 103 | 3,035 (2,724–3,062) |

**Capability is the discriminator:**

| Scenario | Independent | Single-pass |
| --- | --- | --- |
| Item dragged out of an `overflow:hidden` list | Clipped, pointer hits `HTML` | Stays on top |
| Later positioned panel over the list | Dragged item is covered | Stays on top |
| Ancestor `scale(.5)` | 30 px behind the pointer | 0 |
| Ancestor `zoom:2` | 60 px ahead of the pointer | 0 |
| Parent-controlled same-origin iframe | Never activates | Works |

Clipping is the one I would not give up: a scrollable list is the ordinary case, and a dragged row that vanishes at the scroller's edge is a visible defect. Part 4 of the independent record also leaves grids, wrapping, horizontal lists and writing modes untested, with a 30 px jump at non-uniform margins as an open question. The live placeholder gets all of those from real layout.

**The geometry cache stays.** I built a cache-free axis to price `rect-index` and `linear-shift`. It saves 1.08 KB Brotli and costs about 1 ms per move at 2,000 items, a third more task time, and it doesn't yet cover `xy` or tall-item hysteresis. Under §0 and §14 the cache wins.

**What each capability costs, for a decision to go further.** Minified bytes come from [the attribution](probes/architecture-plan/attribution.txt). Brotli figures are minified × 0.35 unless marked, so treat them as estimates.

| Capability | Minified | About Brotli | If removed |
| --- | --- | --- | --- |
| Top-layer lift and faithful geometry (`presentation`, `box-quad`) | 4,966 | 1.7 KB | Clipping, stacking and scale or zoom correctness go. A replacement visual has its own cost, so this overstates the saving |
| Geometry cache (`rect-index`, `linear-shift`) | 3,197 | 1.08 KB, measured | About 1 ms per move at 2,000 items. Needs owner approval |
| Row animation (`layout-animation`) | 889 | 0.3 KB | Already optional and tree-shaken |
| Realm-aware listeners | 267 | 0.1 KB | The iframe scenario above |
| Keyboard | 311 | 0.1 KB | **Not removable:** accessibility |

The lift's three modes are the one reduction here I recommend with no capability argument. Ship `LIFT_FAITHFUL` behaviour alone and add `flat` or `in-place` only for a named use case. Outside their own tests, one reference story is the only use.

## 5. Required capabilities and observable guarantees

### Capabilities

| Capability | Decision |
| --- | --- |
| Pointer input (mouse, touch, pen), threshold, `handle`, capture on the root | Required |
| One-press-per-move keyboard on sortable | Required |
| Consumer-owned reorder with explicit accept or reject, synchronous or async, and an abort signal | Required |
| `y` and `xy` axes with variable item sizes, scroll during a drag | Required |
| Unclipped lifted visual with `visual` override, correct under scale and zoom | Required, decision 2 |
| Same-origin iframe realm and shadow DOM | Required. Single-pass passes both in Chromium |
| Live placeholder with a custom factory | Required, decision 2 |
| Opt-in landing and row animation, tree-shaken | Required |
| Free drag with verdict, `home`, `axis`, `bounds`, `onMove`, `moveTo` | Required |
| React and similar frameworks not disturbed | Required. The production suite passes through the prototype |
| Public `draggable()` and third-party behaviors (`kernel.js`) | **Dropped**, decision 4 |
| `...fragments` and merge tiers, `drag.js`, `feature.js`, `plugins` | **Dropped**, decision 4 |
| `onError`, `DraggableError`, `DraggableWarning`, `FAILURE_*`, stage and phase constants | **Dropped**, decision 3 |
| Lift modes other than faithful | **Dropped** until a use case is named |

### Guarantees

These are what the new package's tests assert through its public API. The prototype's differential and gap probe have exercised most of them, and section 9 lists the exceptions.

1. **A request never changes a running step.** It applies after that step and before the next, in the section 3 precedence. From idle it applies before the call returns.
2. **Terminals.** Every delivered `onStart` gets exactly one `onEnd`, unless destruction is applied first. No `onEnd` without `onStart`.
3. **Destruction.** Once applied, no callbacks run, and listeners, styles, popover state, placeholder and tails are gone. Every call returns the same promise, which settles after teardown. Destruction applied before the terminal step delivers no terminal, so a framework cleanup never receives a callback during unmount. A terminal already running finishes.
4. **Cancel.** The first cancel wins and keeps its reason. A cancel on an idle controller, or after the verdict completed, does nothing.
5. **Verdict.** The first completion wins. `then` is read once. A throwing `then` accessor or call is a fault. A late completion never reaches the page or a later drag. The signal aborts on cancel or destroy and never on acceptance.
6. **Reentrant input is refused**, including a nested press, and the next real press works. No trusted event is ever refused (see change 7).
7. **Faults.** Every fault reaches `reportError` exactly once as the original error, at the point it is caught. The first fault decides the outcome if none was decided yet. After the decision, a fault can't change the outcome.
8. **Release order.** The landing target is measured before release. Presentation is released before the landing and the terminal. The terminal runs in the verdict's task, and a tail doesn't delay it. Measure only when a landing is composed, which answers `flow-7` and removes one forced layout at each drop.
9. **Input policy.** A press is never prevented. Only the move that crosses the threshold is prevented. An activated drag swallows its own trailing click, including after a cancel with the button held. A press below the threshold keeps its click. **No later click is ever swallowed.**
10. **Collection.** `items()` is pulled at each admission, so a consumer who changes the list between drags doesn't need to call anything. `invalidate()` matters only during a drag. A surviving gap rebases, a lost adjacency cancels, a removed item cancels.
11. **Placeholder integrity.** A placeholder that removes or moves itself, or takes the list with it, ends the activation clean with no `onStart`. An anchor that leaves the container cancels the drag and reports the fault.
12. **Landing.** Additive, and cancelled by the next activation or destroy, but not by a press that never activates. A landing that can't run is skipped, and the outcome stands.
13. **Hot path.** No more layouts than the prototype for the same script, and no consumer callback's cost beyond the sample itself.

## 6. Public surface

The shape below is the recommendation. Names can change in review, but the count should not grow.

```ts
import { sortable, ReorderResolution } from '@ydinjs/drag/sortable.js';
import { y } from '@ydinjs/drag/sortable/y.js';
import { landing } from '@ydinjs/drag/sortable/landing.js';

const list = sortable(root, {
  items: () => [...root.children] as HTMLElement[],
  axis: y(),
  landing: landing({ duration: 200 }),
  onReorder({ item, from, to, previous, next }, { signal }) {
    root.insertBefore(item, next);
    return ReorderResolution.accept();
  },
  onEnd(result) {
    // 'accepted' | 'noop' | 'rejected' | 'canceled'
  },
});

list.invalidate();
list.requestCancel(reason);
await list.requestDestroy();
```

| Entry | Exports |
| --- | --- |
| `sortable.js` | `sortable`, `ReorderResolution` |
| `sortable/y.js`, `sortable/xy.js` | `y`, `xy` |
| `sortable/landing.js`, `sortable/layout-animation.js` | `landing`, `layoutAnimation` |
| `free-drag.js` | `freeDrag`, `FreeDragResolution` |
| `free-drag/bounds.js`, `free-drag/landing.js` | `bounds`, `landing` |

**The choices that matter:**

- **Features are plain values under plain keys**, with no merge step. `SortableConfig` already has these keys, so only the fragments and the merge go. Each feature is reached only through its own import, so tree-shaking is preserved (§7).
- **Faults go to `reportError`, and the outcome goes to `onEnd`.** A consumer's throw reaches `window` as their own error with its own stack, and nothing wraps it. A fault that decides the drag is `{ type: 'canceled', origin: 'fault', reason: error }`. `origin` is a string union of `'request' | 'escape' | 'interrupted' | 'fault'`, so no constant is exported.
- **No consumer needs the error vocabulary.** Neither reference story file uses `onError` or a stage, and no package imports drag2 or legacy drag. `FAILURE_*` fails the §4 test because nobody has to write those values. This also removes the warning/error split that changes 1 and 3 turn on.
- **`AT_PROPOSAL` and `AT_CONSUMER` go.** A consumer whose `onReorder` ran already knows from its abort signal.
- **`requestCancel` and `requestDestroy` keep their names**, because a call inside a step really is deferred. The owner's brief asks for that separation, and the names state it.
- **`ReorderRequest` loses `version` and renames two fields.** `before` means the item ahead of the gap and `after` the item behind it, while `insertBefore(item, request.before)` reads as correct and is wrong. I made exactly this mistake in my own lab adapter, and my single-pass orders came out one slot short until I found it. `previous` and `next` make `insertBefore(item, next)` read correctly (§12).
- **Pulling `items()` at each admission closes a real trap.** Today a consumer who skips `invalidate()` drags against a stale order, which the single-pass proposal's §10 also reports. It adds one O(n) source read per press, not per sample. The handoff measures it, because §14 applies.

## 7. The seven behavior changes

**Accept all seven.** Three need a condition, and two become moot under the new surface.

| # | Change | Verdict | Assessment |
| --- | --- | --- | --- |
| 1 | `onError` requests destruction: production gives no `onEnd`, prototype gives `onEnd` then teardown | **Accept, then moot** | It was an artefact of the report and the terminal being separate steps. With no `onError`, nothing can request destruction between them. Guarantee 3 still covers a destroy requested earlier in the pass |
| 2 | A step's own platform throw is a fault, not a panic, and the controller survives | **Accept, with a condition** | The cited trigger is outside the domain under §1.1, but real ones exist: `setPointerCapture` on an inactive pointer, `showPopover` on a disconnected element, `insertBefore` from a hostile placeholder. **Condition:** the tests use one of these, because a `getSelection` override says nothing about the domain |
| 3 | `onEnd` requests destruction, then throws: warning becomes error | **Accept, then moot** | With no classes there is nothing to change. The throw reaches `reportError` |
| 4 | One order, terminal then warning, instead of two | **Accept** | D-209 already allows either. One route is simpler to state, and without a warning class the order reduces to "reported when caught" |
| 5 | Two `invalidate()` calls in one callback pull once | **Accept** | `invalidate()` is a payload-free signal, and pulling twice gains nothing. It fits guarantee 10 |
| 6 | Start fails with a cancel registered: no terminal | **Accept, with a condition** | It removes the only instance actually run of a class where a terminal fires with no start. **Condition:** assert the class with a cancel, destroy or fault at each stage before `onStart`, because this is a claim about a class resting on one case |
| 7 | `pointerup` dispatched inside `onMove` is refused and the real release drops | **Accept, with a condition** | It is reachable only by script. The proposal states this from knowledge of the platform and not from a check. **Condition:** count refused events with `isTrusted` true across the whole suite, in each browser, and require zero |

## 8. The 370 unexercised tests

**Every test is classified one row at a time in [`test-classification.tsv`](probes/architecture-plan/test-classification.tsv), and the total is checked as 370.** They split into 195 that keep their guarantee, 97 where a decision here reshapes the guarantee, and 78 that test only mechanism.

| Guarantee | Kernel | Sortable | Keep | Revise | Drop | Scenarios, estimated |
| --- | --- | --- | --- | --- | --- | --- |
| Input policy and click suppression | 11 | 4 | 13 | 2 | 0 | 12 |
| Press admission, threshold, pointer identity | 10 | 3 | 13 | 0 | 0 | 10 |
| Reentrant input is refused | 3 | 3 | 6 | 0 | 0 | 4 |
| Cancel semantics and precedence | 24 | 2 | 12 | 14 | 0 | 14 |
| Destroy: request, application, totality | 29 | 11 | 33 | 7 | 0 | 20 |
| Verdict round-trip and thenables | 29 | 8 | 24 | 13 | 0 | 20 |
| Exactly one terminal, gated by start | 4 | 9 | 11 | 2 | 0 | 8 |
| Fault reporting | 42 | 6 | 0 | 48 | 0 | 6 |
| Release and presentation order | 10 | 4 | 13 | 1 | 0 | 10 |
| Landing tail, origin and target | 21 | 10 | 27 | 4 | 0 | 22 |
| Collection and rebase | 0 | 22 | 16 | 6 | 0 | 14 |
| Placeholder and movement | 0 | 27 | 27 | 0 | 0 | 18 |
| Mechanism, SPI or outside the domain | 59 | 19 | 0 | 0 | 78 | 0 |
| **Total** | **242** | **128** | **195** | **97** | **78** | **About 158** |

The classification is my judgement from the titles and, where a title was unclear, the test body. It has had no independent read. The row data lets a reviewer challenge any single call.

**The largest collapse is fault reporting.** 48 tests, 22 of them in `a fault destruction discards`, pin which report wins between two faults, a cancel and a destroy, under the warning/error split. Under guarantee 7 they reduce to about six scenarios. **If decision 3 goes the other way, this group's 48 tests come back,** and so does most of their machinery.

**What drops:** frames and drafts, dispatch tags, published phases, seam staging, the spatial guard, bracket exits, arm unwind and teardown scrubs. These test machinery that no longer exists. A smaller part is §1.1 misuse, such as a factory returning a non-element or a throwing `requestAnimationFrame`.

### What the gap probe ran

The single-pass proposal named this review as the most likely way it would fail, so I ran the highest-risk guarantees through production and the prototype with a real mouse, in a [34-scenario differential](probes/architecture-plan/gaps-summary.txt). **All 33 comparison scenarios match production, and the one positive control differs as it must.**

| Area | Scenarios that match production |
| --- | --- |
| Verdict | `then` accessor throws, is read once, `then()` throws, late rejection after cancel and after destroy doesn't reach the page, the signal stays unaborted on accept |
| Placeholder | Removes itself, reparents itself, moves within the list, takes the list out, takes the item out, destroy from connection, destroy from the factory, factory returns the item or a node in the document |
| Anchors and rebase | Sibling leaves unannounced, sibling leaves with `invalidate`, dragged item leaves, list reversed, item prepended |
| Admission | `handle` replaces the collection or removes the pressed item, destroy from `handle` or `visual`, `visual` throws |
| Platform | `beforetoggle` listener requests cancel or destroy, a list in a shadow root, an inner list nested inside an outer list's item |
| Landing | Duration function throws, refused duration, destroy from the duration function, tail survives a press below the threshold |

**Read this result with its limit.** It removes specific reasons to doubt the control model. It doesn't prove the new package, because the prototype reuses production's glue and feature modules, so equal traces say little about that shared code. The behaviours the handoff changes on purpose have no production oracle at all: the click guard, `reportError`, pulling at admission, tails that outlive the session.

### The gaps that remain

Ranked by the chance of changing the design:

1. **Two faults in one pass.** `session.fault` is one slot, so as prototyped a second fault could be lost, and the proposal's §8 says the same about a malformed `moveTo`. Guarantee 7 fixes this by reporting when caught and using the slot only to decide the outcome. Nothing has run that design. Tests: kernel rows 122, 124, 173, 219–241.
2. **Deferred work at release.** Collection work queued by a release, which then cancels or faults, now runs by precedence where FIFO used to order it. Only one form has run. Tests: kernel rows 77, 79–84, sortable rows 52–53.
3. **Disposer and retire-hook throws, and destruction from them.** Teardown totality is unprobed. Tests: kernel rows 120, 164, 169–170, sortable row 83.
4. **Late verdict into a later drag.** Partly run, with no scenario under real timing and load. Tests: kernel rows 70–71.
5. **Retained references after teardown.** Tests: sortable row 84, plus the heap measurements below.

## 9. Evidence still needed

In order of importance:

1. **Firefox and WebKit.** Nothing in either prototype or this plan has run outside Chromium. The click guard's expiry, top-layer lift, additive animation, capture and lost capture all depend on engine behaviour. **This is the largest open risk, and the handoff makes it an acceptance criterion.** It could overturn the guard's design, and less likely the top-layer choice.
2. **The new behaviours in section 8,** which have no production oracle and are only assertions until the guarantee suite runs on the new package.
3. **Allocation and retained heap.** F-443's 84 B per sample should disappear with the queue, and one or two closures per drop are added. Neither is measured, nor are M-1, M-2 or the zero-read census.
4. **Real touch and pen, on real hardware.** CDP mouse input is all that has run here. A real `pointercancel` from touch scrolling is the case most likely to differ.
5. **Elevation during a landing.** The independent model found a landing item painting under positioned siblings once its stacking context ended. Production's behaviour here has not been checked, and it could be a real defect in the recommended presentation.

## 10. Implementation handoff

**One unit, for one implementer, released by the decisions in section 11.** It delivers the new package with its tests, in one branch from `drag/rebuild` with this plan's branch merged.

**Goal.** A working `packages/drag` with the section 6 surface, the section 3 control model and the section 5 guarantees.

**Build it this way:**

- Start from the single-pass kernel and glue in `packages/drag2/.plan/probes/single-pass/`, and take the modules that were imported unchanged from drag2 at `7723f3e8a`: `presentation`, `lifetimes`, `pointer`, `invalidation`, `y`, `xy`, `rect-index`, `linear-shift`, `layout-animation`, `landing`, `placement`, `collection`, `keyboard`, `bounds`, `geometry`. Move them and simplify as the surface allows. Don't rewrite what works.
- Delete `assemble`, `protocol`, `warn-on-throw`, the error classes and stages, the merge and the fragments.
- Make the five behaviour changes the prototype doesn't have: the click guard, `reportError` with report-when-caught, pull at admission, tails owned by the controller, measure only with a landing.
- Keep the `Session` private. Nothing about it is exported or documented.

**Test it this way:**

- Write the guarantee suite from [`test-classification.tsv`](probes/architecture-plan/test-classification.tsv), through the public API with real input. Expect about 158 scenarios. Keep and revise rows are the requirement, and the count is not. Port the guarantee and not the test.
- Add the [gap scenarios](probes/architecture-plan/gaps.mts.txt) and the section 8 gaps as new scenarios.
- Check the suite can fail with one mutant per guarantee, as the single-pass proposal's §6.5 did, including the glue. It only covered `gesture.ts`.
- Run the suite in Chromium, Firefox and WebKit.

**Acceptance:**

| Check | Required |
| --- | --- |
| Guarantee suite, all three engines | Passes. A failure from an engine difference is reported, not worked around silently |
| Refused trusted events | Zero across the suite in each engine (change 7) |
| Each guarantee | At least one mutant caught |
| `flow-1` scenario | Next outside click delivered, trailing click still swallowed |
| Lifecycle code | Under 1,200 lines without comments |
| Complete and free-drag Brotli | No more than 8,740 B and 6,025 B, the prototype's figures. Set real budgets from the first measurement |
| `sortable` + `y` graph | Excludes `landing` and `layout-animation` code |
| Hot path, [cost script](probes/architecture-plan/cost.mts.txt) at 20 and 2,000 items | Layouts no more than 41 per run. Task time within noise of the `y` rows in section 4 |
| Press with 2,000 items | Measured and reported, because pulling at admission adds a read (§14) |
| Heap | Allocation per sample and retained after teardown, measured and reported |
| Size harness | A measurement with an unresolved import **fails**, with a negative test, and the harness declares its own control (§18) |
| Package checks | Typecheck, lint, format and the repository's published-declaration checks pass |

**Out of scope:** removing drag2, its contracts or its records, Baseline B and the deleted-file references, a Material X integration, and new capabilities such as auto-scroll or cross-list transfer.

**Stop and return to the architect if** a guarantee can't hold without a second reader of the slots, a real-engine failure undermines the click guard or the top-layer lift, or the kernel grows a queue, a phase beyond the three states, or a transaction. Any of these would mean the model is wrong and not merely the code.

**Record.** The contract for `packages/drag` is written after this unit, from what survives. Drag2's 02, 04 and 05 are not revised first.

## 11. Decisions for the owner

Each has a recommended answer. The first three change the handoff most.

| # | Decision | Recommendation | If the answer differs |
| --- | --- | --- | --- |
| 1 | Control model: single-pass, with fixed precedence and no FIFO between kinds of request | **Accept** | Requiring FIFO rejects this design, and the queue comes back |
| 2 | Keep the top-layer lift and the live placeholder, at about 8 KB complete | **Accept** | A translate-based presentation saves perhaps 1.2 KB more for the placeholder and part of 1.7 KB for the lift. It loses clipping, stacking, scale and any-layout, and needs its own probe round first |
| 3 | Replace `onError`, the classes and the stages with `reportError` plus `origin: 'fault'` on `onEnd` | **Accept** | Programmatic fault handling needs `onError`, which brings back the 48 fault tests and the change 1 and 3 questions |
| 4 | No public `kernel.js`, `feature.js`, `drag.js`, fragments or third-party behaviors until a third behavior exists | **Accept** | A public tier needs a stated authoring discipline, because the `Session` has no draft protection, and the bytes rise |
| 5 | Accept the seven changes, with the conditions in section 7 | **Accept** | Each rejected change needs its own mechanism |
| 6 | Destruction delivers no terminal, even when `onStart` ran | **Accept.** It protects framework cleanup from callbacks during unmount. The promise tells a consumer when it is done | Pairing every `onStart` with an `onEnd` is the simpler rule to state, but it delivers a callback during teardown, and the independent model's defects above happened on that path |

Decisions 3 and 4 are the ones that make this much smaller than the single-pass prototype. Decision 2 is the one that keeps it from being as small as the independent one.

## 12. Verification and limits

**Run for this record, on one machine in headless Chromium with a real mouse:**

| Evidence | Result |
| --- | --- |
| [Foreign code and capability matrix](probes/architecture-plan/lab-results.json.txt) | Sections 3 and 4 |
| [Cost per move](probes/architecture-plan/cost.json.txt) | Section 4 |
| [Byte attribution](probes/architecture-plan/attribution.txt) | Sections 1 and 4 |
| [Gap differential](probes/architecture-plan/gaps-summary.txt) | Section 8 |
| [Classification](probes/architecture-plan/test-classification.tsv) | Section 8, total asserted by [its script](probes/architecture-plan/classify.py.txt) |

[The probe README](probes/architecture-plan/README.md) has the commands.

**Limits:**

- **Estimates are labelled.** The recommended surface was not built. Its bytes, its lines and the 158 scenario count come from attribution and judgement. Part of the surface's saving could be wrong by a few hundred bytes.
- **Not independent.** I wrote the lab, the classification and this recommendation, and my scenarios share my blind spots. No reviewer has read them. The foreign-code scenarios were written after the independent model's Part 3, and they target a condition it did not test.
- **Headless timing.** Cost figures are main-thread metrics through CDP, with no paint or compositing cost on real hardware. The range on the independent arm at 2,000 items is wide.
- **The two prototypes are unequal.** The independent prototype is deliberately small and has been tested on its own terms. Finding defects there is not a verdict on its author's goals.

**Stopping boundary.** No replacement code was written. The next action is the owner's six decisions, after which the architect mints them and section 10 can be released.