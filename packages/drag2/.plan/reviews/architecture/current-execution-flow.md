# Current execution flow, reconstructed from three Chrome traces

**2026-11-05. Input:** three owner-recorded traces, listed in §1. **Source read:** `packages/drag2/src` at `678a6ab18`, tree `818f2e165`; `00761a58b` on `drag2/profile-scenarios` holds the same tree and adds the fixture pages. **Scope:** page load, controller construction, admission, activation, movement, drop and cleanup on the three recorded pointer paths. **Not in scope:** a replacement architecture or a performance comparison. Each scenario has one recording, so this record gives no durations and compares no costs.

Source citations are relative to `packages/drag2/src` at that revision, and the names are that revision's. Later commits on `drag2/terminology-ste` renamed several of them, so read the code with `git show 00761a58b:packages/drag2/src/<path>`. A bare `kernel.ts:N` means `kernel/kernel.ts`, and the public entry is written `src/kernel.ts`. Other short names (`seams.ts`, `execution.ts`, `linear-shift.ts`) are the only file of that name under `src`. `complete.ts` and `free-drag.ts` in a stack are the fixture pages under `bench/profile`. Trace times are milliseconds after the page's last `navigationStart`.

## Summary

- All three scenarios share one path: a native listener enters `ExecutionBracket`, which drains a FIFO queue through `ArmedController.handle`. The behaviors differ only in the callbacks reached from that path, and the stacks and CPU samples show this directly.
- **The two sortable recordings did not reach the same drop outcome, and neither followed the fixture README's drag.** The basic recording ended with the order unchanged, so it took the no-op drop. The animated recording ended `1,3,2,4…`. Their release differences come partly from this and not only from the composed features.
- In all three recordings, the only operation phases that outlast one listener or frame callback are `PENDING` and `ACTIVE`. The whole drop ran inside the `pointerup` listener, because each recorded verdict was synchronous.
- A real reorder changes what the browser does afterwards. Moving the dragged item with `insertBefore` while it is lifted was followed by no `beforetoggle` or `toggle` from the release and no `click`. By the code, the click suppressor then stays armed after the operation ends (§7, `flow-1`).

## Evidence labels

| Label | Meaning | What it can prove |
| --- | --- | --- |
| **[T]** | A trace record: an event, a stack trace on a style, layout, rAF or event record, an animation record, or a screenshot | The thing happened, at that place in the order |
| **[S]** | A CPU sample, taken about every 160 µs | The function ran. Absence proves nothing: `showPopover` has no sample in any recording, although [T] shows it ran |
| **[C]** | Read from the source; no trace record shows it | What the code says would happen |
| **[I]** | An inference from observations plus reasoning, with the reasoning stated | A conclusion that a targeted probe could still overturn |

## 1. What was recorded

|  | Basic | With animations | Free drag |
| --- | --- | --- | --- |
| Trace | [`sortable-basic.json`](../../../../../.plan/sortable-basic.json) | [`sortable-with-animations.json`](../../../../../.plan/sortable-with-animations.json) | [`free-drag.json`](../../../../../.plan/free-drag.json) |
| Page | `/sortable-basic.html` | `/` (`complete.ts`) | `/free-drag.html` |
| Composition | `sortable + y()` | `sortable + y() + landing() + layoutAnimation()` | `freeDrag` |
| Bundle | `sortable-basic-DV__F_mL.js` | `index-CRj5_xHl.js` | `free-drag-Czr09aRT.js` |
| Press | 623.2 | 616.9 | 687.0 |
| Listener calls before the first move callback (the threshold-crossing call is the last) | 5 | 5 | 2 |
| Move callbacks | 101 | 94 | 64 |
| Placeholder moves | 10 | 11 | none exists |
| Last move → release | 2691.7 → 2822.7 | 2726.9 → 2727.4 | 1804.0 → 1839.2 |
| Final screenshot | Order `1,2,3…`, 2846.1 | Order `1,3,2,4…`, 2947.4 | Box moved and left at the drop point, 1863.6 |
| README's expected result reached? | **No** (`1,3,4,5,6,7,2,8…`) | **No** (same expectation) | Yes, in kind |

Four conditions apply to every comparison below:

1. **Provenance holds.** Every source embedded in each trace's map matches `00761a58b` byte for byte, apart from `packages/box-quad/index.js`, which is a build output and not tracked there: 32/33, 35/36 and 27/28 files.
2. **Each trace holds load and interaction together**, with the press about 0.4–0.6 s after load. The README asks for separate recordings. Each path therefore runs for the first time with cold code, and lazy-compile time is not separated in these trace categories.
3. **The list drags differ from the README's script.** It asks for Item 2 to be dragged to the Item 7 row and held. The final orders in the table are read from the embedded screenshots, and the parity of the placeholder-move counts agrees with them (10 back to home, 11 net one slot) if each move crosses one row. The animated recording also released almost on top of its last move, not after a hold.
4. **Something else ran in the page.** Five url-less scripts were compiled before the page's module, with at least one in an `isolated` context, while the delivered HTML has no inline script. That is how a browser extension's content script appears [I]; its identity is unknown. Their last recorded calls fall before the press.

## 2. Flow

```text
LOAD        module top level                                                [S]
              sortable(...) | freeDrag(...) → draggable → new Kernel
              → construct → behavior factory → #arm → attach
            retained: pointerdown on root; keydown on root (sortable only)  [S+C]
                 │
                 │  pointermove before the press: no library listener       [T]
                 ▼
ADMISSION   pointerdown → #onPointerDown → runIngress → #admitPress         [T+S]
              behavior.admit → #mintOperation → commit PENDING              [S+C]
            acquires: 3 lifetimes, 4 document pointer listeners, Escape     [S+C]
                 ▼
PENDING     pointermove → dispatch(MOVE) → #handleMove → threshold test     [T+S]
                 │ crossing, in the same listener call
                 ▼
ACTIVATION  preventDefault, clear selection, arm click suppressor           [S+C]
            measure → acquireLift → showPopover → pointer capture           [T]
            commit ACTIVATING → activation effect → queue START_COMMITTED   [S+C]
              ├ sortable: insert placeholder, scroll/resize listeners       [T+S]
              └ free:     write the first transform                         [T]
            START_COMMITTED → commit ACTIVE                                 [S+C]
                 ▼
MOVE        pointermove → dispatch(MOVE) → #handleMove → moved              [T]
              ├ sortable: write transform, schedule one rAF                 [T]
              │    rAF → dispatch(spatial action) → resolve the gap         [T+S]
              │       └ gap changed: move placeholder, update rect cache    [T]
              │            └ animated: element.animate per displaced row    [T]
              └ free:     write transform only; no rAF                      [T]
                 ▼
DROP        pointerup, all inside one listener call                         [T]
            UP               commit RELEASING → motion.dispose → release transition
            OPEN_RESOLUTION  onReorder | onDrop | skipped when a no-op
            collection action, only if the consumer invalidated             [animated]
            RESOLUTION_SETTLED  commit SETTLING → measure target
                             commit FINALIZING → release presentation
                             → start landing (if composed) → finalized
            RETIRE           spec.retire → lifetimes.dispose → reset both frames
                 ▼
AFTER       browser: mouseup, lostpointercapture (no listener left)         [T]
            click → suppressor, when the browser generates one              [T]
            landing animation runs to completion, when composed             [T]
            retained: root listeners, controller state, §5                  [C]
```

The commit steps in this diagram are **[C]**: no trace record names a phase. The queue-unit order in the drop is **[S]** (§3.5).

## 3. Walkthrough

### 3.1 Load and construction

The page's script calls the public entry at module top level, and `src/sortable.ts:157` calls `draggable` at `src/kernel.ts:236`. That constructs `Kernel` (`kernel/kernel.ts:2616`) and enters `Kernel.construct` (`:2716`), which runs inside `ExecutionBracket.construct` (`kernel/execution.ts:204`). Samples show this chain in all three traces [S].

Inside it the factory runs first. For sortable that is `sortable/behavior.ts:102`, which pulls `items()`, copies it, runs `assemble` and builds `SortableBehavior`. Then `#arm` (`:2736`) composes the two frames, constructs `ArmedController` and calls `attach` (`:2532`). In the animated recording, samples show the `landing` and `y` installers running under `assemble`, and `addEventListener` under `attach` [S]. Free drag has no collection and no `command` member, so it binds no root `keydown` [C].

One mapping trap: the bundle's anonymous root frame sits at generated position `0:0`, and the map names it after whichever source comes first (`insertionAt`, `createLandingTiming`, `DraggableError`). That frame is the module's top level, not those functions.

The drag has not started, and no library code runs for hover. The traces record 18, 19 and 30 `pointermove` events before the press, and none has a library call [T].

### 3.2 Admission

`pointerdown` reaches `#pointerDownHandler` (`kernel/kernel.ts:1240`), the one recorded call with that name in each trace [T]. The path is `#onPointerDown` (`:1207`) → `#openIngress` (`:1145`) → `runIngress` (`kernel/execution.ts:180`) → `#admitPress` (`:1090`) → `#runAdmission` (`:962`) → the behavior's `admit`, then `#mintOperation` (`:1022`) [S]. Sortable resolves the item through `#resolveItem` (`sortable/spec.ts:382`). Free drag tests the composed path against its root (`free-drag/spec.ts:317`).

`#mintOperation` builds the operation record and the three lifetimes, arms the four document pointer listeners and an Escape listener, then commits `PENDING` at `:1086` [C; `createOperationLifetimes` and `armCancelInput` have samples in basic]. The default action is deliberately not prevented here, and `mousedown` and `selectstart` still follow in the trace [T].

### 3.3 Threshold and activation

Each later `pointermove` calls `#pointerHandler` (`:929`), then `#onPointer` (`:896`), `dispatch` (`execution.ts:146`), `#drain`, `ActionQueue.apply`, `#step`, the bracket's callback (`kernel.ts:2595`), `handle` (`:2440`) and `#handleMove` (`:1856`) [T+S]. It copies the committed frame to the draft, writes the pointer position and swaps the frames. The threshold test at `:1892` uses the default of 8 in both behaviors.

The crossing sample does the whole activation inside its own listener call. The recorded order is [T+S]:

1. `getSelection().removeAllRanges()` and `#armClickSuppressor` (`:1175`). The sample inside `AbortSignal.any` is visible in basic.
2. `#acquireActivation` (`:1287`), reaching `acquireLift` (`kernel/presentation.ts:498`). `ancestry` and `neutralizeUA` have samples. The first style invalidation is at `presentation.ts:244`, `visual.style.boxSizing`.
3. `showPopover` at `presentation.ts:218`. `beforetoggle` dispatches inside it, and it forces a style update whose stack names that line [T].
4. Pointer capture (`kernel.ts:1345`) [C]. `gotpointercapture` arrives as a separate event afterwards [T].
5. `runActivationSeam` (`kernel/seams.ts:562`) calls `runTransition`, which is the source's name for the repeated sequence of copy the frame, call `prepare`, commit, call `effect`. `prepare` and `effect` appear under it [S], and the commit at `seams.ts:269` is `ACTIVATING` [C].
6. Sortable's effect inserts the placeholder (`sortable/spec.ts:720`) [T] and invalidates the rect cache (`:794`) [S]. Free drag's effect writes the first transform (`free-drag/spec.ts:448`) [T].
7. `START_COMMITTED` runs later in the same drain and commits `ACTIVE` (`kernel.ts:2188`) [S in basic, C for the commit].

`ACTIVATING` therefore lasts only inside that one drain.

### 3.4 Movement

**Common [T].** Every active sample records the same 15-frame stack, listed here from the listener inward: `kernel.ts:930`, `:905`, `execution.ts:160`, `:253`, `queue.ts:33`, `execution.ts:89`, `kernel.ts:2595`, `:2448`, `:1880`, `seams.ts:309`, `:500`, `kernel.ts:1853`, the behavior's `spec.moved` forwarder, the behavior's `moved`, and `presentation.ts:390`, the inline transform write.

**Sortable only [T].** `moved` also calls `#spatialFrame.schedule` (`sortable/spec.ts:850`), which requests a frame at `kernel/invalidation.ts:79`. The recordings show requests 1:1 with move samples, with 101 of 101 and 94 of 94 requested. None of the samples was merged into an earlier frame request here. The callback fires shortly after the sample, within the same frame, and the sequence then repeats. When the pointer stops, so do the callbacks: the basic recording's last callback is at 2692.2, and no library code runs until the release at 2822.7.

The frame callback's path is `runNow` (`invalidation.ts:61`) → the closure at `sortable/spec.ts:338` → `Kernel.dispatch` (`kernel.ts:2659`) → `ArmedController.dispatch` (`:2494`) → `ExecutionBracket.dispatch` → the drain → `#handleBehaviorAction` (`:2416`) → `runTransition`. `prepareAction` calls `resolveInsertion`, and `effectAction` moves the placeholder when the gap changed. The placeholder-move stack is 18 frames [T].

The rect cache behaves as its comments describe, as far as the samples reach. `RectIndex.refresh` (`sortable/rect-index.ts:215`) has samples on the first frame after activation and again at the release in basic, and not in between [S]. Each gap change advances the cache by arithmetic in `LinearShift.moved` (`sortable/linear-shift.ts:271`). The first gap change of the drag forces layout once to measure the row step, at `linear-shift.ts:305` [T]. The placeholder's rect is re-read on the next resolve (`rect-index.ts:394`), and in the animated recording that read forced a style update three times [T]. Why only those three is not established.

**Animated only [T].** Each gap change starts one `element.animate` through `layout-animation.ts:170`, giving 11 animation starts for 11 placeholder moves. Two of them, started at 2611.90 and 2628.03, ended within about 16 ms because the next move replaced them. Samples in `remainingOf` (`:86`) match the rebase path at `:131–144` [S].

**Free drag only [T].** No rAF, no DOM read and no DOM write other than the transform. All 64 samples follow the common stack.

### 3.5 Drop and cleanup

The drop runs synchronously inside the `pointerup` listener in all three recordings, and the samples show the queue order directly [S]:

| Queue unit | Function | Basic | Animated | Free |
| --- | --- | --- | --- | --- |
| `UP` | `#handleUp` (`:1990`) → `#closeOperation` (`:1920`) | 2823.13 | 2727.73 | 1839.77 |
| `OPEN_RESOLUTION` | `#handleOpenResolution` (`:1969`) → `#openResolution` (`:1774`) | 2825.39 | 2728.53 | 1841.25 |
| Collection action | `#handleBehaviorAction` (`:2416`) | none | 2728.84 | none |
| `RESOLUTION_SETTLED` | `#handleResolutionSettled` (`:2064`) → `#openSettlement` (`:1691`) | 2825.73 | 2729.01 | 1841.86 |
| `RETIRE` | `#retireOperation` (`:649`) → `#release` (`:603`) | 2829.95 | 2730.55 | 1843.35 |

Inside those units:

- **`UP`.** Commits `RELEASING` (`:1934`) [C], then `motion.dispose` (`:1939`) aborts the document pointer listeners and runs the disposers in reverse order: the frame task's cancel, then capture release [C; the animated cancel's stack is T]. The release transition follows. Sortable's `prepareRelease` (`sortable/spec.ts:1137`) invalidates the cache and re-resolves, with a full `RectIndex.refresh` sampled in basic and animated [S]. Its effect moves the placeholder and writes the transform a last time [S for the write]. Free drag's `prepareRelease` builds the request from arithmetic [C].
- **`OPEN_RESOLUTION`.** The consumer's verdict: `onReorder` in animated, `onDrop` in free drag, nothing in basic.
- **`RESOLUTION_SETTLED`.** Commits `SETTLING`, closes cancellation, runs `#measureTarget` (`:1474`) and then `#joinSettlement` (`:1623`), which commits `FINALIZING` and releases presentation.
- **Presentation release.** The disposers run in reverse order of registration, which is visible in the basic trace: `placeholder.remove()` (`sortable/spec.ts:718`), then the top-layer restore (`presentation.ts:192`) and inline-style restore (`:149`) [T+S]. `finalized` then runs, and it has no `onEnd` to call, because none of the three pages supplies one [C].
- **`RETIRE`.** `spec.retire` (`:608`), `lifetimes.dispose` (`:613`), both frames reset (`:617`), then the operation and activation records dropped (`:639–640`) [S for the first and third, C otherwise].

After the listener returns, the browser dispatches `mouseup` and `lostpointercapture`. The capture event has no library call, because motion already removed that listener [T]. `pointermove` events after the release have no library call either: 18, 22 and 10 of them [T].

## 4. Where the scenarios differ

| Step | Basic | With animations | Free drag |
| --- | --- | --- | --- |
| Controller root and pointer capture target | The list; the lifted item is a child | The list; the lifted item is a child | The box: same element is captured and lifted [C] |
| Root `keydown` | Bound [C] | Bound [C] | Not bound [C] |
| Activation effect | Placeholder in DOM | Placeholder in DOM | First transform write, no DOM insertion |
| Scroll and resize listeners | Bound in activation [S] | Bound in activation [C] | Only with `bounds`; not composed [C] |
| Each move | Transform + rAF | Transform + rAF | Transform only |
| Gap change | Placeholder + cache | Placeholder + cache + 1 row animation | Not applicable |
| Pending frame at release | None | One, cancelled at `invalidation.ts:85` [T] | Not applicable |
| Verdict path | **No-op: `invoke: null`, no consumer call** [I] | `onReorder` → `insertBefore` [T] → `invalidate()` | `onDrop` → writes `translate` at `bench/profile/free-drag.ts:17` [T] |
| Queued action in the drop | None | Collection action [S] | None |
| Forced layout while measuring the target | None recorded | Yes, `sortable/spec.ts:1532` [T] | None; the target comes from arithmetic [C] |
| Popover hidden by the release | Yes, `presentation.ts:200` [T] | **No release-time `beforetoggle`** [T] | Yes, `presentation.ts:200` [T] |
| Landing animation | Not composed | Starts 2730.36, ends 2942.41 on `LI.item` [T] | Not composed |
| Row animations at drop | None | One still running; ended 2730.58, 86 ms after it started [T], against a 160 ms default [C] | None |
| Trailing `click` | Generated, suppressed at `kernel.ts:1191` [T] | **Not generated** [T] | Generated, suppressed [T] |

**Why basic is called a no-op [I].** The final order is unchanged. No record has a stack through `kernel.ts:1802`, the consumer call, unlike the other two. There is no `insertBefore` invalidation from the page script. `click` and the release `beforetoggle` both fired, which is what an unmoved item would produce. `buildReorderProposal` sets `noop` when the gap equals the origin (`sortable/collection.ts:195`), and `prepareRelease` then returns `{ invoke: null }` (`sortable/spec.ts:1228–1231`).

**Why the animated drop has no `beforetoggle` and no `click` [I].** `insertBefore` on the lifted item removes and reinserts it, and two layout invalidations at `complete.ts:41` are consistent with that [T]. The HTML specification hides a popover on removal without firing events, which would leave `visual.matches(':popover-open')` false at `presentation.ts:199`. `restore` drew no samples in this recording and did in the other two, though absence alone proves nothing [S]. For `click`, this matches Chromium's behaviour of not synthesizing a click once the `mousedown` target has been removed. That browser behaviour is from my knowledge of the engine and is not verified here. A recording that reorders on the basic page would separate this from the composition.

## 5. State and retained resources

### Phases

| Phase | Committed at | Recorded lifetime | Evidence |
| --- | --- | --- | --- |
| `IDLE` | Reset by `frames.retire` (`kernel.ts:617`) | Between operations | [C] |
| `PENDING` | `kernel.ts:1086` | From press to crossing; spans tasks | Function reached [S], phase [C] |
| `ACTIVATING` | `seams.ts:269` with `ACTIVATING` | Inside the crossing's drain | [S+C] |
| `ACTIVE` | `kernel.ts:2188` | Until `pointerup`; spans tasks | [S+C] |
| `RELEASING` | `kernel.ts:1934` | Inside the `pointerup` call here. An async verdict would make it span tasks [C] | [S+C] |
| `SETTLING` | `seams.ts:269` with `SETTLING` | Inside the `pointerup` call | [S+C] |
| `FINALIZING` | `kernel.ts:1632` | Inside the `pointerup` call | [S+C] |
| `REPORTING` | `seams.ts:269` with `REPORTING` | Not reached | [C] |

### Resources

| Resource | Acquired | Released | Evidence |
| --- | --- | --- | --- |
| Root `pointerdown`, root `keydown` | `attach` | Ingress abort at teardown, never reached here | Bind [S in animated], rest [C] |
| Frame pair, queue, driver, behavior, slots | Construction | Controller life | [C] |
| Collection snapshot and source identity | Construction; replaced by the collection action | Controller life | [S for the action] |
| Operation record and 3 lifetimes | Admission | Dropped at `RETIRE` | [S+C] |
| Document `pointermove`, `pointerup`, `pointercancel`, `lostpointercapture` | Admission | `motion.dispose` at `UP` | No calls afterwards [T] |
| Document `keydown` for Escape | Admission | `cancellation.dispose` in settlement | Arm [S in basic], release [C] |
| Click suppressor listener | Threshold crossing | First click, next press **on root**, or teardown | Fired [T in two recordings], unconsumed in the third [T] |
| Inline-style lease and top-layer lease | Activation | Presentation release | [T] |
| Pointer capture | Activation | `motion.dispose` | Browser events [T] |
| Placeholder | Activation effect | First in presentation release | [T] |
| Window `scroll` and `resize` listeners | Sortable activation | `motion.dispose` | Bind [S in basic], release [C] |
| Frame request | Each sortable move | Fires, or cancelled at `motion.dispose` | [T] |
| Rect cache | First frame after activation | `items` cleared at retire; the `Float64Array` stays | Fill [S], retire [C] |
| Row animations | Each displaced row | Finish, are replaced, or are cancelled at retire | [T] for the records; cause of the retire end is [I] |
| Landing `Animation` | Join | Finishes by itself; the object stays in `#landingAnimation` until the next activation or teardown | End [T], slot [C] |

## 6. Established only by reading the code

The recordings do not exercise, and this record does not confirm from a trace:

- Any phase value, frame field, `#private` field or queue content. These traces name functions and browser events, not state.
- The outcome of the guards at each queue unit's entry. The functions ran, but which branch each guard took is not recorded.
- Escape, `pointercancel`, `lostpointercapture` with a live listener, `requestCancel`, destruction, teardown, keyboard commands, an async verdict, a rejected verdict and every failure path, including `REPORTING`.
- A second drag, so `#cancelLandingAnimation` at activation (`kernel.ts:1298`) and the suppressor's disarm at the next press.
- Microtask callbacks. `animation.finished.then` in `layout-animation.ts:190` is not attributed, and 13 `RunMicrotasks` records in the animated trace do not identify what ran.
- Whether the rect cache's `settle` ran. It has no samples.

`InvalidateLayout` and `ScheduleStyleRecalculation` record only the first write that dirties the document, so a later write in the same batch leaves no record. `item.before(placeholder)` at `sortable/spec.ts:1495` is an example: it may have run in the animated drop and would not appear.

## 7. Worth investigating

These are questions and not findings, with no canonical IDs and no decision. Each one states how far the evidence reaches.

**`flow-1` — The click suppressor can stay armed after a real reorder.** Observed: an activated drop that moved the item produced no `click`, so the one-shot was not consumed [T]. From the code: it is disarmed by a click, a press on **root**, or teardown (`kernel.ts:1220`, `:1189–1204`), and it is a capture listener on the document that calls `preventDefault` and `stopPropagation`. The contract's disarm table says "the next `pointerdown`" and states that a one-shot must not survive to eat an unrelated click ([`02-kernel-behavior-contract.md`](../../contract/02-kernel-behavior-contract.md), _The suppressor is ingress-shaped and armed at activation_). A press outside the root is never seen by the root listener, so the next click outside the list would appear to be swallowed [I, not observed]. This one needs a direct probe first, since a user-visible effect is likely if it holds. I did not establish whether an existing test covers this combination.

**`flow-2` — A consumer's DOM move runs on an element the library still holds lifted.** `onReorder` moves the item while it still has its popover state, fixed position and inline styles, and the library then finds the popover closed, repairs the placeholder's position relative to the item, and forces layout to measure [T+I]. Nothing paints in between, since it is one task [T]. The question is which parts of the release's logic are written for this order and which are incidental, given that the no-op and free-drag drops take a different route through the same code.

**`flow-3` — What reads the short-lived phases?** `ACTIVATING`, `RELEASING`, `SETTLING` and `FINALIZING` each lived inside one call in these recordings. A map of who reads each one, and which distinctions an async verdict or a consumer callback actually needs, would show which are load-bearing. Async verdicts make `RELEASING` span tasks, and this recording set does not include one.

**`flow-4` — Five queue units and several holding records for one synchronous drop.** The drop's units each re-validate identity and phase, and the release command passes through two slots, the driver's `#staged` and `#attempts.command`. Three attempt or record types are involved: `ResolutionAttempt`, `SettlementAttempt` and `AttemptSlots`. Motion is disposed from up to three sites, all latched (`kernel.ts:1939`, `:1447`, `:613`). The comments explain each guard against re-entrant consumer code. The question is which guards a reachable sequence can actually fail, because these recordings never reach one.

**`flow-5` — Forwarding layers on every sample.** The recorded stacks have 15 frames to the transform write and 18 to the placeholder move. Part of that depth is one-line forwarding: `createSortableSpec`'s object to `SortableBehavior` (`sortable/spec.ts:1623–1705`), the same shape in free drag, `Kernel.dispatch` to `ArmedController.dispatch` to `ExecutionBracket.dispatch`, and the bracket's constructor callbacks. These are frame counts, not costs. V8 may inline them, and nothing here measures it.

**`flow-6` — Three layers of "latest frame request wins" in sortable.** `#spatialSeq` numbers each move, the frame task stores the latest value, and `#operation.pendingSpatial` is compared with it in `prepareAction` (`sortable/spec.ts:891–895`). A frame callback reaches `dispatch` with no unit running, so the drain runs at once [C]. It is not clear from the code when that comparison can fail, and these recordings show one request per sample. It also deserves a look alongside what `#spatialFrame.cancel` already guarantees.

**`flow-7` — Measuring at drop when nothing will use it.** Basic has no landing composed and no move to make, yet it re-resolves through a full rect refresh and measures the placeholder [S]. A comment at `kernel.ts:1462` says the measurement does not depend on whether an animation follows, so this is deliberate today. The question is whether the reason still holds for a composition without `landing`, and for the no-op route.

**`flow-8` — A row animation cut short at drop.** The animated recording's last row animation ended at 2730.58, in the same task as `RETIRE`, 86 ms after it started, against a 160 ms default duration. `layout-animation.ts:119–125` cancels running contributions at retire, which is the likely cause [I]. Whether the row visibly jumps was not established, because the screenshots are too coarse to show it. Separately, the row and landing animations carry non-zero `compositeFailed` values (16 and 80). A non-zero value means the compositor did not take them, so they run on the main thread; this record draws no cost conclusion from that.

**`flow-9` — The recordings themselves.** Before these traces are used to compare anything, re-record the drag the README specifies, ideally without the isolated-world scripts, and with a reordering drop on the basic page. The existing recordings are still good evidence for the paths they took.

## 8. Verification and limits

**Method.** Each trace was parsed from `traceEvents` and its main thread selected by `EventDispatch` count. Positions were mapped through `metadata.sourceMaps` with `@jridgewell/trace-mapping`. `FunctionCall` and `stackTrace` positions are 1-based and name call sites. CPU `callFrame` positions are 0-based and name function starts. CPU profiles were rebuilt from `ProfileChunk` samples and `timeDeltas`. Sampled and recorded order were read separately, and every source line cited was read at the revision named above. The analysis scripts were scratch work and are not retained, so this paragraph is what a repeat needs.

**Traces preserved byte for byte.** These files were committed as recorded, at their original paths:

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `.plan/sortable-basic.json` | 6,557,192 | `9dd8e001f611c0b6160c9b2be42eef2387f1cdefa447ef4eadbdc8bbece42889` |
| `.plan/sortable-with-animations.json` | 6,665,401 | `7f3d0b20937013f6b0a5f4f556c42ee7185bba864e6ee8d0b81dc8cdb4ab96fc` |
| `.plan/free-drag.json` | 4,082,791 | `d1435179f84bbcf35cfb602f4b1b73a75e3908ed9f4133712af6020d2f6a1286` |

**Known gate interaction.** `oxfmt --check . '!packages/**'`, the root `fmt-check`, reports these three files, and the root `fmt` would rewrite them, because `.oxfmtrc.json` does not exclude `.plan/*.json`. Formatting them would break the byte preservation above. No configuration was changed; the owner decides between an ignore entry and formatted traces.

**Limits.** One recording per scenario, with cold code, in the owner's browser. Sampling can miss short functions, and native frames are named only sometimes. Screenshots are low resolution: the item orders were legible, and pixel positions were not. No source, fixture or contract changed. No decision was minted or amended.

**Stopping boundary.** This record ends at the reconstruction. Any follow-up is the owner's to order; `flow-1` is the one with a likely user-visible effect.