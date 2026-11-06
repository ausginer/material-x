# Architecture plan for the new `packages/drag`

**Status: provisional design, stopped at the prototype handoff.** Section 10 is the one next task, under the [prototype checkpoint](../../../.agents/docs/agent-workflow.md#architecture-prototypes). The owner tries the result and decides afterwards. Section 11 separates what the owner has already ruled from what stays provisional. No `D-*` was minted and no contract was changed.

**Inputs:** `7723f3e8a` for the pre-removal sources, the single-pass proposal, the flow record and the prototype. `b739c5449` for Part 3 of the independent model. `f7c988220` on `drag/rebuild` for the prototype checkpoint.

**Separate:** Baseline B and the references to deleted drag files are deferred integration work. They are reported in [`deferred-integration.md`](deferred-integration.md) and did not affect this analysis.

## 1. Recommendation

**Build the new package on the single-pass control model, keep the current presentation capabilities, and replace the public surface with a much smaller one.** The two prototypes answer three independent questions, so the choice is not one prototype against the other:

| Axis | Single-pass prototype | Independent prototype | Recommended |
| --- | --- | --- | --- |
| **Control** | Requests fill slots, and one loop applies them between steps | Consumer code runs after state is consistent, with nested commands applied synchronously | **Single-pass** |
| **Presentation** | Top-layer lift, live placeholder, cached geometry | Translate-only proposal, no placeholder, no top layer | **Single-pass's capabilities, with the independent model's click guard and additive tails** |
| **Surface** | Today's surface, kept for the differential | Plain options, no tiers, no error classes | **The independent model's plainness, with the capabilities above and one public behavior-authoring API** |

**What this delivers, against production:**

| Measure | Production | Single-pass prototype | Recommended |
| --- | --- | --- | --- |
| Lifecycle code, lines without comments | 2,553 | 1,200 | Under 1,200, **estimated** |
| Complete composition, Brotli | 11,533 B | 8,740 B | About 8 KB, **estimated** |
| Free drag, Brotli | 8,627 B | 6,025 B | About 5.5 KB, **estimated** |
| Public runtime exports | `kernel.js` alone has 33 | Unchanged | About 12, plus string unions |
| Library frames, median sample | 15 | 5 | About 5, **estimated** |

**The largest simplification is in lifecycle and surface. Bytes fall by about 30%.** The independent prototype's 2.3 KB is not on offer at these capabilities. Section 4 prices what would have to go to get closer to it.

The estimates predate the owner's clarifications in section 2 and have not been rebuilt. **They are not limits on the prototype,** which reports real figures in their place.

## 2. Owner constraints

From the brief for this unit:

- The target is a new implementation in `packages/drag`.
- Nothing is published. API, SPI and internal architecture may change, and no compatibility with the old API is required (CONTRIBUTING §8).
- Required capabilities and observable guarantees must be chosen explicitly.
- The owner wants substantial simplification without another long sequence of tiny units.
- Isolated probes are allowed. This unit does not implement the replacement or rewrite existing contracts.

Added by the owner after reading this plan:

- **Custom behaviors remain a required extension point,** with possible Readymag use. This reverses my earlier recommendation to make the tier private.
- **`onError` is removed and the platform's `reportError` is used.** The design must address typed identification of library reports and preservation of the original cause.
- **Request/application separation remains required.**
- **The next step is a runnable prototype.** The owner tries the API and representative interactions, including authoring a custom behavior, before full implementation. Full parity, exhaustive mutations and production acceptance follow that evaluation.

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
- **A behavior never receives the `Session`.** It gets a read-only view and the request methods (section 6). The slots, `next` and the state stay out of its reach, so the public tier can't reopen the rule above.

**Adopt from the independent model:**

| What | Why |
| --- | --- |
| **Click guard with its own pointer identity, expiring after that pointer's release** | `flow-1` is confirmed: after a reorder, the next outside click was swallowed on single-pass and delivered on independent. This is the one user-visible defect found in production |
| **A verdict signal that aborts only on cancel or destroy** | A success path must not fire a consumer's rollback listener. The gap probe confirms single-pass already behaves this way, so this states it as a guarantee |
| **Tails that outlive the session and are owned by the controller** | Answers `flow-8`, where a row animation is cut short at retire. Stopping a tail stays safe, and the tail set owns any cleanup that decoration needs |
| **The "propose, then commit" vocabulary** | The consumer owns DOM order, and the names should say so |

**Reject from the independent model:** nested synchronous commands (above), the modal keyboard (`accessibility.md` records one press per move as a deliberate choice with no modal state), and dropping realm, zoom and scale (section 4).

**What this model costs.** Discipline replaces the type-level draft protection. Withholding the `Session` protects the library's state, but a behavior's own state has no such protection: a behavior method called from foreign code mid-step has to defer its write through `requestApply`, as `moveTo` does. That is a documented rule and not a structure, and whether authors can live with it is an assumption the prototype tests (section 10). The model also gives up FIFO between kinds of request, which stays provisional in section 11.

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
| Unclipped lifted visual with `visual` override, correct under scale and zoom | Required, provisional, item 2 in section 11 |
| Same-origin iframe realm and shadow DOM | Required. Single-pass passes both in Chromium |
| Live placeholder with a custom factory | Required, provisional, item 2 in section 11 |
| Opt-in landing and row animation, tree-shaken | Required |
| Free drag with verdict, `home`, `axis`, `bounds`, `onMove`, `moveTo` | Required |
| React and similar frameworks not disturbed | Required. The production suite passes through the prototype |
| **Custom behaviors through a public `draggable()`** | **Required, by the owner.** One authoring API, which `sortable` and `freeDrag` also use. Section 6 |
| A behavior with no lift: its own rendering, or none, keeping pointer identity, capture, threshold, click guard, cancel and terminals | Required, **provisional**. Resize handles and multi-element moves need it |
| `...fragments` and merge tiers, `drag.js`, `feature.js`, `plugins` | **Dropped.** A smaller extension point, such as a third-party `axis`, is an open question in section 10 |
| `onError` | **Removed, by the owner** |
| `DraggableError`, `DraggableWarning`, `FAILURE_*`, stage and phase constants | **Dropped.** One `DragFault` class replaces the two classes, section 6 |
| Lift modes other than faithful | **Dropped** until a use case is named |

### Guarantees

These are the observable behavior the design has to deliver through its public API, and what production tests assert after the owner's evaluation. The earlier prototype's differential and gap probe have exercised most of them, and section 9 lists the exceptions. Guarantee 14 and the `DragFault` part of 7 are new and have run nowhere.

1. **A request never changes a running step.** It applies after that step and before the next, in the section 3 precedence. From idle it applies before the call returns.
2. **Terminals.** Every delivered `onStart` gets exactly one `onEnd`, unless destruction is applied first. No `onEnd` without `onStart`.
3. **Destruction.** Once applied, no callbacks run, and listeners, styles, popover state, placeholder and tails are gone. Every call returns the same promise, which settles after teardown. Destruction applied before the terminal step delivers no terminal, so a framework cleanup never receives a callback during unmount. A terminal already running finishes.
4. **Cancel.** The first cancel wins and keeps its reason. A cancel on an idle controller, or after the verdict completed, does nothing.
5. **Verdict.** The first completion wins. `then` is read once. A throwing `then` accessor or call is a fault. A late completion never reaches the page or a later drag. The signal aborts on cancel or destroy and never on acceptance.
6. **Reentrant input is refused**, including a nested press, and the next real press works. No trusted event is ever refused (see change 7).
7. **Faults.** Every fault reaches `reportError` exactly once, at the point it is caught, as a `DragFault` whose `cause` is the thrown value by identity, whatever that value is. The first fault decides the outcome if none was decided yet, and `onEnd` carries that same instance. After the decision, a fault can't change the outcome. An `error` listener runs inside the pass, so it can only fill a slot: a cancel it requests after the deciding fault changes nothing, and a destroy it requests is applied before the terminal step, under guarantee 3.
8. **Release order.** The landing target is measured before release. Presentation is released before the landing and the terminal. The terminal runs in the verdict's task, and a tail doesn't delay it. Measure only when a landing is composed, which answers `flow-7` and removes one forced layout at each drop.
9. **Input policy.** A press is never prevented. Only the move that crosses the threshold is prevented. An activated drag swallows its own trailing click, including after a cancel with the button held. A press below the threshold keeps its click. **No later click is ever swallowed.**
10. **Collection.** `items()` is pulled at each admission, so a consumer who changes the list between drags doesn't need to call anything. `invalidate()` matters only during a drag. A surviving gap rebases, a lost adjacency cancels, a removed item cancels.
11. **Placeholder integrity.** A placeholder that removes or moves itself, or takes the list with it, ends the activation clean with no `onStart`. An anchor that leaves the container cancels the drag and reports the fault.
12. **Landing.** Additive, and cancelled by the next activation or destroy, but not by a press that never activates. A landing that can't run is skipped, and the outcome stands.
13. **Hot path.** No more layouts than the prototype for the same script, and no consumer callback's cost beyond the sample itself.
14. **Custom behaviors get the same guarantees.** 1 to 9 and 13 hold for a behavior through the public API, with no code from its author beyond its hooks. It can't reach a slot. A hook's throw is a fault, and its author writes no `try`. `end` runs only if `start` was reached, with no flag to set. Work it schedules itself enters a pass through `run`. Importing `draggable` alone brings no sortable, axis, cache or landing code.

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
| `draggable.js` | `draggable` |
| `fault.js` | `DragFault` |

### Authoring a custom behavior

The shape below is provisional, and the implementer may reshape it (section 10). Hooks are optional except `admit`.

```ts
import { draggable } from '@ydinjs/drag/draggable.js';

const panel = draggable(root, {
  threshold: 4,
  lift: true, // false: no top layer, the behavior renders

  admit(event) {
    const item = (event.target as Element).closest<HTMLElement>('.card');
    return item && { item, state: { over: null as Element | null } };
  },
  activate(drag) {}, // Everything that can fail. A throw: no `start`, no `end`
  start(drag) {}, // The consumer's notification, last
  move(drag) {
    drag.translate(drag.x - drag.originX, drag.y - drag.originY);
  },
  drop(drag) {
    return (signal) => save(drag.item, { signal }); // Or null to skip the verdict
  },
  settle(drag, outcome) {
    return outcome.type === 'verdict' ? null : home(drag); // Landing target, or null
  },
  end(drag, outcome) {},
  apply(drag) {}, // Runs between steps, after `requestApply`, or at once when idle
});

panel.run(step); // Enter a pass from the behavior's own frame or listener
panel.requestApply();
panel.requestCancel(reason);
await panel.requestDestroy();
```

**What a behavior receives:** the elements it named at admission, its own `state`, the pointer and origin, `translate` when lifted, `use(dispose)` for cleanup that runs even on destruction, and the `signal` of the operation. **What it doesn't receive:** the `Session`, its slots, its state or `next`.

`sortable` and `freeDrag` are written on this API with no private path, so it can't drift from what they need. Whether that is achievable is the first thing the prototype tests.

**The choices that matter:**

- **Features are plain values under plain keys**, with no merge step. `SortableConfig` already has these keys, so only the fragments and the merge go. Each feature is reached only through its own import, so tree-shaking is preserved (§7).
- **Faults go to `reportError` as a `DragFault`, and the outcome goes to `onEnd`.** The wrapper below answers the owner's two requirements. A fault that decides the drag is `{ type: 'canceled', origin: 'fault', reason: fault }`, the same instance that was reported, so `result.reason.cause` is the original. `origin` is a string union of `'request' | 'escape' | 'interrupted' | 'fault'`, so no constant is exported.
- **No consumer needs the rest of the error vocabulary.** Neither reference story file uses `onError` or a stage, and no package imports drag2 or legacy drag. `FAILURE_*` fails the §4 test because nobody has to write those values. One class also removes the warning/error split that change 3 turns on. `DragFault` passes the §4 test, because a consumer writes `event.error instanceof DragFault`.
- **`AT_PROPOSAL` and `AT_CONSUMER` go.** A consumer whose `onReorder` ran already knows from its abort signal.
- **`requestCancel` and `requestDestroy` keep their names**, because a call inside a step really is deferred. The owner's brief asks for that separation, and the names state it.
- **`ReorderRequest` loses `version` and renames two fields.** `before` means the item ahead of the gap and `after` the item behind it, while `insertBefore(item, request.before)` reads as correct and is wrong. I made exactly this mistake in my own lab adapter, and my single-pass orders came out one slot short until I found it. `previous` and `next` make `insertBefore(item, next)` read correctly (§12).
- **Pulling `items()` at each admission closes a real trap.** Today a consumer who skips `invalidate()` drags against a stale order, which the single-pass proposal's §10 also reports. It adds one O(n) source read per press, not per sample. The prototype report measures it, because §14 applies.

### Identifying a library report and keeping its cause

**Provisional choice: wrap every report in one `DragFault`, with the thrown value as `cause`, and report in the library's own realm.**

```ts
addEventListener('error', (event) => {
  if (event.error instanceof DragFault) {
    track(event.error.cause);
  }
});
```

| Option | Typed identification | Thrown `null`, string or symbol | Original value | A tool reading only `event.message` |
| --- | --- | --- | --- | --- |
| **Report the original unchanged** | None, so it isn't a candidate | Delivered | Identity | Sees the original |
| **Report the original and mark it in a `WeakSet`** | Through an exported predicate | **`WeakSet.add` throws**, observed, so these can't be identified | Identity | Sees the original |
| **`DragFault` with `cause`, chosen** | `instanceof` | Delivered and typed, observed | Identity, under `.cause` | **Sees only the wrapper's message**, observed |

[Observed in Chromium and Firefox](probes/architecture-plan/report-error.json.txt), with [this script](probes/architecture-plan/report-error.mts.txt):

- **Cause.** An error, `null`, `undefined`, a string, a symbol, a frozen error and an object with a throwing `message` getter each arrived once, typed, with `cause` identical to the thrown value.
- **Timing.** `reportError` dispatches synchronously inside the caller. A throwing listener doesn't reach the caller.
- **Realm.** With the library in the parent and the root in an iframe, the library's `reportError` is heard by the parent and the root's by the iframe. After the iframe is removed, the root's is heard by nobody and throws nothing, while the library's is still heard.
- **What gets lost.** The event's `message` and the wrapper's `stack` don't contain the original's message.

**So:**

- **The wrapper's message includes the original's when it can be read.** The read is foreign code, so it is wrapped to stay total, and the object with the throwing getter above is the check. This keeps the text for a tool that ignores `cause`. The original's stack frames still live only under `.cause`.
- **The library's realm, not the root's,** because a consumer's global handler is installed where the consumer loaded the library, and a removed iframe would otherwise lose the report silently.
- **No stage or step field.** The original's stack answers where it came from, and the plan dropped those values for having no consumer. An open question in section 10 tests this.

**Limits.** WebKit didn't run. Whether each engine's DevTools prints the `cause` wasn't observed: the CDP exception description in Chromium omits it, and that isn't the DevTools console. Two copies of the package would make `instanceof` false, leaving `name === 'DragFault'`.

## 7. The seven behavior changes

**Accept six, provisionally. Change 1 no longer applies.** Three need a condition, and one becomes moot under the new surface.

| # | Change | Verdict | Assessment |
| --- | --- | --- | --- |
| 1 | `onError` requests destruction: production gives no `onEnd`, prototype gives `onEnd` then teardown | **No longer applies: production's outcome returns** | **Correction: I had this as moot, and it isn't.** `reportError` dispatches synchronously, so a global `error` listener can request destruction during the report, exactly as `onError` could. Under guarantee 7 the report happens when the fault is caught, before the terminal step, so the destruction is applied first and no `onEnd` runs. That follows guarantee 3 and matches production, not the earlier prototype. Focused check 4 pins it |
| 2 | A step's own platform throw is a fault, not a panic, and the controller survives | **Accept, with a condition** | The cited trigger is outside the domain under §1.1, but real ones exist: `setPointerCapture` on an inactive pointer, `showPopover` on a disconnected element, `insertBefore` from a hostile placeholder. **Condition:** the tests use one of these, because a `getSelection` override says nothing about the domain |
| 3 | `onEnd` requests destruction, then throws: warning becomes error | **Accept, then moot** | With one class there is nothing to change. The throw reaches `reportError` as a `DragFault` |
| 4 | One order, terminal then warning, instead of two | **Accept** | D-209 already allows either. One route is simpler to state, and with one class the order reduces to "reported when caught" |
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

**The largest collapse is fault reporting.** 48 tests, 22 of them in `a fault destruction discards`, pin which report wins between two faults, a cancel and a destroy, under the warning/error split. Under guarantee 7 they reduce to about six scenarios. **Bringing back `onError` or split classes would bring these 48 tests back,** and most of their machinery.

**What drops:** frames and drafts, dispatch tags, published phases, seam staging, the spatial guard, bracket exits, arm unwind and teardown scrubs. These test machinery that no longer exists. A smaller part is §1.1 misuse, such as a factory returning a non-element or a throwing `requestAnimationFrame`.

**The owner's clarification changes one thing here, and I did not reclassify.** About 30 of the 78 dropped rows test the shape of the old SPI, such as dispatch tags, `arm` and `command.types`. They still don't port, because the protocol they test is gone. But I dropped them partly because the tier was going private, and now the tier stays with a new API, which needs authoring scenarios that none of the 370 supply. Expect the 158 to grow, by a number to be set from what the prototype shows.

The fault group's collapse still holds, because one class removes the same split. The wrapper adds an identity assertion and not a new group.

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

**Read this result with its limit.** It removes specific reasons to doubt the control model. It doesn't prove the new package, because the prototype reuses production's glue and feature modules, so equal traces say little about that shared code. The behaviours the handoff changes on purpose have no production oracle at all: the click guard, `DragFault` through `reportError`, pulling at admission, tails that outlive the session, public authoring.

### The gaps that remain

Ranked by the chance of changing the design:

1. **Two faults in one pass.** `session.fault` is one slot, so as prototyped a second fault could be lost, and the proposal's §8 says the same about a malformed `moveTo`. Guarantee 7 fixes this by reporting when caught and using the slot only to decide the outcome. Nothing has run that design. Tests: kernel rows 122, 124, 173, 219–241. The prototype covers this.
2. **Deferred work at release.** Collection work queued by a release, which then cancels or faults, now runs by precedence where FIFO used to order it. Only one form has run. Tests: kernel rows 77, 79–84, sortable rows 52–53. The prototype covers this.
3. **Disposer and retire-hook throws, and destruction from them.** Teardown totality is unprobed. Tests: kernel rows 120, 164, 169–170, sortable row 83.
4. **Late verdict into a later drag.** Partly run, with no scenario under real timing and load. Tests: kernel rows 70–71.
5. **Retained references after teardown.** Tests: sortable row 84, plus the heap measurements below.

## 9. Evidence still needed

In order of importance:

1. **Firefox and WebKit.** Nothing in either earlier prototype has run outside Chromium. Only the `reportError` probe has run in Firefox. The click guard's expiry, top-layer lift, additive animation, capture and lost capture all depend on engine behaviour. **This is the largest open risk, so the prototype's focused checks run there.** It could overturn the guard's design, and less likely the top-layer choice.
2. **The new behaviours in section 8,** which have no production oracle. The prototype checks the risky ones, and the rest are assertions until the guarantee suite runs on the new package.
3. **Allocation and retained heap.** F-443's 84 B per sample should disappear with the queue, and one or two closures per drop are added. Neither is measured, nor are M-1, M-2 or the zero-read census. This follows the prototype.
4. **Real touch and pen, on real hardware.** CDP mouse input is all that has run here. A real `pointercancel` from touch scrolling is the case most likely to differ.
5. **Elevation during a landing.** The independent model found a landing item painting under positioned siblings once its stacking context ended. Production's behaviour here has not been checked, and it could be a real defect in the recommended presentation.

## 10. Prototype handoff

**One bounded unit for one implementer: a runnable prototype the owner can try.** It is not the production package. It is evidence for the design, its code may be reused, and full parity, exhaustive mutations and production acceptance come after the owner has evaluated it.

**Base.** A new branch from `drag/rebuild`, with `drag/architecture-plan` merged in. I checked that merge and it has no conflicts. drag2 stays untouched.

**Location.** `packages/drag/prototype/`, with the library in its `src/` and the pages beside it. A top-level `packages/drag/src` would make Storybook collect the package, and would suggest production. The package stays `private` with no `exports`.

**Launch.** One command, `npx just prototype` from `packages/drag`, starting a Vite server and printing the URL. Pages and examples import `@ydinjs/drag/...` through an alias, so their source reads as a consumer's would. The directory has a `tsconfig.json` so that types work while the owner writes a behavior.

### Build

- Start from the single-pass kernel and glue in `packages/drag2/.plan/probes/single-pass/`.
- **Copy** the working modules from `packages/drag2/src`: `presentation`, `lifetimes`, `pointer`, `invalidation`, `y`, `xy`, `rect-index`, `linear-shift`, `layout-animation`, `landing`, `placement`, `collection`, `keyboard`, `bounds`, `geometry`. Simplify them only where the surface requires it.
- Leave out `assemble`, `protocol`, `warn-on-throw`, the error classes and stages, the merge and the fragments.
- Implement the section 6 surface: `sortable`, `freeDrag`, `draggable` and `DragFault`.
- Implement the behaviour the earlier prototype lacks: the click guard, `DragFault` reported when caught, pull at admission, controller-owned tails, measure only with a landing, and `lift: false`.

**Required properties of the authoring API.** Hook names and shapes in section 6 may change, and the implementer reports any change. These may not:

1. `sortable` and `freeDrag` use only the public API. **Every private path they need is reported, and not silently kept.**
2. A behavior can't reach a request slot, `next` or the state. Read-only types are enough, with no runtime freezing (§1.1).
3. A request made from any hook, reaction or `error` listener during a step doesn't change that step.
4. A hook's throw is a fault with no `try` in the behavior, and `end` runs only if `start` was reached with no flag to set.
5. The kernel allocates nothing per sample on the move path.

### Pages

Each shows a live log of callbacks, reported faults and their causes. Example behaviors are short, readable files, because the owner reads them as much as runs them.

| Page | The owner tries |
| --- | --- |
| **Sortable list** | Variable heights, a scrolling clipped container, a handle, the keyboard, adding and removing items. Toggles for landing and row animation, and for a verdict that accepts, rejects, waits or throws |
| **Sortable grid** | `xy` with mixed sizes |
| **Free drag** | `bounds`, `axis`, `home`, `moveTo`, and the same verdict toggles |
| **Environments** | Ancestor scale and zoom, a later positioned panel, a shadow root, a parent-controlled same-origin iframe |
| **Requests** | A custom-element reaction and a listener that cancel, destroy or press during activation, drop and landing, with the order on screen, so request and application can be seen apart |
| **Faults** | Throw an error, `null`, a string and a hostile object from each hook. Shows `instanceof`, identity of `cause`, the matching `onEnd`, and a global listener that requests destruction. The owner reads the DevTools console here |
| **Custom behaviors** | The three below, and an empty `scratch` behavior to edit with hot reload |

**Example behaviors.** Each stresses something different, and they are assumed shapes, not known Readymag flows.

| Behavior | It tests |
| --- | --- |
| **Resize handle** | The smallest useful behavior, with no lift and no verdict. Should be about 30 lines |
| **Drop zone** | Lift, hit-testing under the pointer, an async verdict that can reject, and landing home |
| **Canvas group move** | Multi-selection with no lift inside a scaled canvas, snapping guides, its own frame task through `run`, its own controller method through `requestApply`, rollback on cancel and on destroy, and a save that can fail |

### Focused checks

Scripted with real input, kept beside the prototype, and run with one command. **Run them in Chromium, Firefox and WebKit.** Firefox downloaded and launched here through `npx playwright install firefox`. WebKit downloaded but failed to launch, and Playwright's check lists missing system libraries, so try `npx playwright install-deps webkit` in the container. If an engine still can't run, say so and don't substitute one.

| # | Assumption | Check | If it fails |
| --- | --- | --- | --- |
| 1 | The click guard can be exact on every engine | The `flow-1` scenario: next outside click delivered and trailing click swallowed, including after a cancel with the button held, and a press below the threshold keeping its click | The guard's design changes |
| 2 | Top-layer lift and additive landing work on every engine | Clipping, stacking, scale, zoom, the landing's target, and the elevation of a landing item against positioned siblings (section 9, item 5) | Presentation is reopened |
| 3 | The single-pass rule holds through the public API | The section 3 reaction scenarios on a custom behavior, as well as on `sortable` | The model is wrong, return to me |
| 4 | Reporting when caught is correct and total | Two faults in one pass, a fault during destruction, a throw from a `use` disposer, the hostile values, and exactly one report each. A global `error` listener that requests cancel leaves `origin: 'fault'`, and one that requests destroy delivers no `onEnd` (guarantee 7) | Guarantee 7 changes |
| 5 | Precedence is an acceptable replacement for FIFO | Collection work queued by a release that then cancels or faults (section 8, gap 2) | FIFO question returns to the owner |
| 6 | No trusted event is refused | Count refused `isTrusted` events across the checks and page drivers, per engine, and require zero (change 7) | Change 7 is withdrawn |
| 7 | A late verdict can't reach a later drag | Under real timing, after cancel and after destroy | The verdict design changes |

### Report

Observations and estimates are kept separate. **None of these figures is an acceptance limit.**

- **Size.** Minified and Brotli for `draggable` alone, each example behavior, `freeDrag`, `sortable` + `y`, and complete. Module attribution, and lines without comments for the lifecycle code. A measurement with an unresolved import must fail.
- **Cost.** The [cost script](probes/architecture-plan/cost.mts.txt) at 20 and 2,000 items against the section 4 rows, layouts per run, and a press at 2,000 items, because pulling at admission adds a read (§14).
- **Authoring.** Which hooks each example used, what it had to do by hand, and every place the rule in section 3 was awkward to follow.
- **Missing.** Every section 5 capability and guarantee not delivered, with known defects.

### Not in this unit

The guarantee suite and its scenario count, one mutant per guarantee, budgets, heap campaigns, real-device touch and pen, published-package configuration, public documentation, the contract, and new capabilities such as auto-scroll or cross-list transfer. Removing drag2, Baseline B and the deleted-file references stay in [`deferred-integration.md`](deferred-integration.md). Report these as absent, and don't start any of them.

### Stop and return

**Stop at the working prototype with the report in `packages/drag/.plan/prototype-report.md`, finalized and pushed, and hand it to the owner.** Don't continue into production work.

**Return to me first if** a guarantee can't hold without a second reader of the slots, the kernel grows a queue, a phase beyond the three states or a transaction, `sortable` can't be written on the public API without exposing the `Session`, or a real-engine failure undermines the click guard or the top-layer lift. Any of these would mean the model is wrong and not merely the code.

### Open questions for the owner's evaluation

1. **What would Readymag actually need?** I have no requirements, so the canvas behavior is my assumption. A named flow would replace it and could change `lift: false`, multi-element and coordinate-space support.
2. **Is a whole-behavior extension point enough?** The old tier could also add a custom `axis` or plugin to `sortable` without rewriting it. The prototype leaves that out, so the owner can judge whether it is missed.
3. **Is the `requestApply` rule tolerable** for a behavior's own state, once you have written one? This is the main cost of having no draft protection.
4. **Does `DragFault` read well in the console and your logs?** Should it also name the step or the root? The default is neither.
5. **Does a destroy with no `end` suit custom behaviors,** or do you find yourself writing `use` cleanup that an `end` would have covered? Item 6 in section 11.

## 11. Choices: settled by the owner, and provisional

**Nothing here is minted.** A `D-*` follows the owner's evaluation, for the design that survives it.

**Settled by the owner:**

| # | Original question | Owner's answer | Effect |
| --- | --- | --- | --- |
| 3 | `reportError` in place of `onError` | **Remove `onError`, use `reportError`,** with typed identification and the original cause addressed | The fault tests stay collapsed. The `DragFault` design in section 6 is mine and provisional |
| 4 | Public behavior tier | **Custom behaviors are required.** I had recommended private, and that is withdrawn | `draggable` is public, and a behavior can't reach the `Session`. Fragments and merge tiers stay dropped, provisionally |
| Part of 1 | Request/application separation | **Required** | The control model has to keep it |

**Provisional, tested by the prototype, and decided by the owner afterwards:**

| # | Choice | Provisional answer | If the answer differs |
| --- | --- | --- | --- |
| 1 | Single-pass, with fixed precedence and no FIFO between kinds of request | **Used** | Requiring FIFO rejects this design, and the queue comes back |
| 2 | Keep the top-layer lift and the live placeholder, at about 8 KB complete (estimated) | **Used** | A translate-based presentation saves perhaps 1.2 KB more for the placeholder and part of 1.7 KB for the lift. It loses clipping, stacking, scale and any-layout, and needs its own probe round first |
| 5 | The seven changes as assessed in section 7, with its conditions | **Used** | Each rejected change needs its own mechanism |
| 6 | Destruction delivers no terminal, even when `onStart` ran | **Used.** It protects framework cleanup from callbacks during unmount. The promise tells a consumer when it is done | Pairing every `onStart` with an `onEnd` is the simpler rule to state, but it delivers a callback during teardown, and the independent model's defects above happened on that path |
| 7 | `DragFault` with `cause`, in the library's realm, section 6 | **Used** | Reporting the original keeps stacks simplest but gives up typed identification |
| 8 | Whole-behavior extension only, with `lift: false` | **Used** | A third-party `axis` or plugin adds a second public seam |

## 12. Verification and limits

**Run for this record, on one machine in headless Chromium with a real mouse, except the `reportError` probe, which has no mouse:**

| Evidence | Result |
| --- | --- |
| [Foreign code and capability matrix](probes/architecture-plan/lab-results.json.txt) | Sections 3 and 4 |
| [Cost per move](probes/architecture-plan/cost.json.txt) | Section 4 |
| [Byte attribution](probes/architecture-plan/attribution.txt) | Sections 1 and 4 |
| [Gap differential](probes/architecture-plan/gaps-summary.txt) | Section 8 |
| [Classification](probes/architecture-plan/test-classification.tsv) | Section 8, total asserted by [its script](probes/architecture-plan/classify.py.txt) |
| [`reportError` with a wrapper](probes/architecture-plan/report-error.json.txt), in Chromium and Firefox | Section 6 |

[The probe README](probes/architecture-plan/README.md) has the commands.

**Limits:**

- **Estimates are labelled.** The recommended surface was not built. Its bytes, its lines and the 158 scenario count come from attribution and judgement, and predate the public authoring API. Part of the surface's saving could be wrong by a few hundred bytes.
- **The authoring API is a sketch.** It has never run, and I derived it by reading the prototype's `Behavior` interface and what `sortable` and `freeDrag` use from it.
- **Not independent.** I wrote the lab, the classification and this recommendation, and my scenarios share my blind spots. No reviewer has read them. The foreign-code scenarios were written after the independent model's Part 3, and they target a condition it did not test.
- **Headless timing.** Cost figures are main-thread metrics through CDP, with no paint or compositing cost on real hardware. The range on the independent arm at 2,000 items is wide.
- **The two prototypes are unequal.** The independent prototype is deliberately small and has been tested on its own terms. Finding defects there is not a verdict on its author's goals.

**Stopping boundary.** No replacement code was written. The next action is the prototype unit in section 10, and after it the owner's evaluation.