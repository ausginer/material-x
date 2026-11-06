# A single-pass architecture for drag2: proposal and prototype

**2026-11-06. Input:** [`current-execution-flow.md`](current-execution-flow.md), whose source revision is `678a6ab18`. **Source read and prototyped against:** `d3058ea3b`, which renames and re-comments that revision. The flow record's stacks and counts were re-measured there (§6.4). **Status:** a proposal for owner review. No `D-*` is minted or amended, and no production source, contract or test changed. **Sources and results:** [`probes/single-pass/`](../../probes/single-pass/README.md).

## Summary

- **The idea.** Replace the action queue and the transactional frame pair with one synchronous pass over one session record. Foreign code reached during a step can only fill a request slot. One loop reads the slots between steps, in a fixed precedence. A sequence that continues past a callback names its next step in a slot, so the loop can decline to run it.
- **What goes away.** 8 phases become 3 plus the absence of a session. The queue, its 11 kernel tags and the 5 behavior tags go. The frame pair and about a dozen holding records go. So do the façade, the spec adapters and the transition adapters between the listener and the behavior. The recorded transform write goes from 15 library frames to 5, and the placeholder move from 18 to 5.
- **What it costs less of.** Lifecycle code falls from 2,553 to 1,200 lines, not counting comments. The complete sortable bundle falls from 11.5 KB to 8.7 KB Brotli, and free drag from 8.6 KB to 6.0 KB. The features, the lift, the axis rules and the rect cache are the production modules, unchanged.
- **The evidence.** A differential suite drives production and the prototype with the same scripts, using real mouse input. 76 of 83 scenarios produce identical consumer-visible traces, and the other 7 are pinned changes (§6.2). With the public entries pointed at the prototype, 479 of the 485 production browser tests that reach those entries pass, and all 6 failures are those pinned changes (§6.3). 17 of 18 deliberate defects in the prototype are caught, and the survivor is explained (§6.5).
- **What it does not establish.** 370 production browser tests are wired to the SPI this proposal removes, so they did not exercise the prototype. Allocation, retained heap and non-Chromium browsers were not measured (§7).
- **What the owner decides.** Whether "no step reads a request" is what the snapshot property means, and whether a fixed precedence may replace FIFO. Whether to accept seven consumer-visible changes. What happens to the public `kernel.js` tier, which loses its draft protection under any version of this design (§9).

## 1. What the flow record shows

The recorded drags are simple. In all three recordings, only `PENDING` and `ACTIVE` outlast one listener call. The whole drop runs inside `pointerup`. A synchronous drop nevertheless passes through five queue units, each of which re-validates identity and phase, and the release command waits in two holding slots between them.

The earlier records explain how this arose, and each step was reasonable. D-202 required that a request must not change a running unit, and made every continuation a queued unit so that its entry could be the boundary. FIFO then did not deliver the promises made from it: [F-436](request-ordering-coordinator.md), F-439 and the amendments D-203, D-206 and D-207 each added an entry reading, because an entry queued earlier could register a request that FIFO would apply too late. So the queue did not remove the checks. It moved them to unit entries, and added tags, identities, discards and holding records around them.

The question this report tests is whether the property D-202 wanted can be kept without the queue.

## 2. The alternative

### 2.1 The rules

1. **One pass.** The library runs only inside a pass: a native event, a frame callback, a settled verdict or an idle controller request. Passes do not nest, and one boolean refuses a nested one.
2. **One session.** One record holds the operation from admission until it is decided. Idle is the absence of the record. Three states outlast a pass: `PENDING`, `ACTIVE` and `RELEASING`.
3. **Requests go in slots.** A cancel, a destroy, an invalidation, a `moveTo`, a verdict and a throw each write a slot and return. Intake reads a slot only to enforce first-wins.
4. **One reader.** `#applyRequests` runs between steps and applies the slots in statement order. No step reads a slot. What the loop calls to apply a request may read another: applying a cancel reports a held fault, and free drag's deferred `moveTo` is dropped behind a held cancel. Both run between steps.
5. **A sequence names its next step.** A step that continues past foreign code assigns `session.next` instead of calling on. The loop runs it only if nothing outranks it.

This is the whole of the scheduling, taken from the prototype:

```ts
#applyRequests(): void {
  for (;;) {
    const session = this.#session;

    try {
      if (this.#destroyRequested) {
        // ...warn about a held fault, then:
        this.#teardown();
        return;
      }

      if (this.#flushRequested) {
        this.#flush(session);
      } else if (session?.cancel) {
        this.#applyCancel(session, session.cancel);
      } else if (session?.fault) {
        this.#fail(session, session.fault);
      } else if (session?.verdict) {
        this.#conclude(session, { type: 'verdict', value: session.verdict.value });
      } else if (session?.next) {
        const { next } = session;

        session.next = null;
        next();
      } else {
        return;
      }
    } catch (error) {
      this.#raise(error);
    }
  }
}
```

I-22's `DESTROY > CANCEL > FAILURE_CHECKPOINT` is now the order of these branches. So is "no round-trip after a registered cancel": the round-trip is a `next`, and a `next` runs last.

### 2.2 The same scenarios

```text
PRESS       pointerdown → enter → behavior.admit → open the session    PENDING
            acquires: lifetimes, document pointer listeners, Escape
MOVE        pointermove → enter → threshold test
              crossing: acquire the lift and capture → behavior.start  ACTIVE
                        (placeholder or first write; onStart last)
              active:   behavior.move
                          sortable: write, schedule one frame
                          free:     write, onMove
FRAME       sortable only: enter → resolve the gap, move the placeholder
DROP        pointerup → enter → close motion → behavior.propose        RELEASING
              next = the round-trip, or the conclusion for a no-op
            loop → round-trip → the verdict lands in its slot
            loop → conclude: decide, measure, release presentation,
                   landing, onEnd, retire                              (no session)
ASYNC       the verdict's continuation → enter → slot → loop → conclude
CANCEL      slot; idle: enter at once. The loop concludes as canceled
DESTROY     slot; idle: applied at once. The loop tears down, no terminal
KEYBOARD    keydown → enter → admit, open; next = activate;
            activate's last act is next = drop
```

## 3. What it removes

### 3.1 States

| Today | Proposed | Why that is enough |
| --- | --- | --- |
| `IDLE` | No session | The operation-is-gone reading needs no value |
| `PENDING` | Kept | Spans tasks |
| `ACTIVATING` | A position in `#activate` | The only behavior readers ask whether a lift exists, so they read `session.lift` |
| `ACTIVE` | Kept | Spans tasks |
| `RELEASING` | Kept, and it covers a pending verdict | Spans tasks when the verdict is async |
| `SETTLING`, `FINALIZING`, `REPORTING` | Positions in `#conclude` and `#fail` | Nothing outside the kernel reads them (below) |

This answers `flow-3`. At `d3058ea3b`, `sortable/spec.ts` and `free-drag/spec.ts` compare against `IDLE`, `ACTIVATING`, `ACTIVE` and `RELEASING` only. The other three phases are read only by kernel handlers that guard queue entries, and those entries no longer exist. They do appear in `src/kernel.ts`, because the kernel tier publishes the constants.

### 3.2 Holding records

| Today | Purpose today | Proposed |
| --- | --- | --- |
| Frame pair, `FrameTransaction`, draft and current, frame parts and resets | A failed `prepare` leaves committed state untouched | Removed. Steps compute into locals and assign afterwards (§5, G3) |
| `OperationRecord` and `ActivationRecord` | Two lifetimes of acquisition | One `Session`, with the lift fields null until activation |
| `OperationIdentity` and `#nextOperationId` | Stale queue entries and continuations | Removed. Nothing queued outlives its session, and the loop reads the live one |
| `AttemptSlots.command`, runner `#staged` | Hold the release command across units | A `session.next` closure |
| `AttemptSlots.resolution`, `ResolutionAttempt` | First-completion latch and stale verdicts | A `done` local in the round-trip's closures |
| `SettlementAttempt` | Carries input, lifetimes and target between phases | Locals in `#conclude` |
| `FailureCheckpoint`, `discard` closures, `#reporting`, `failureRegistered` | Queue a fault, supersede it, report it if discarded | One `session.fault` slot |
| `#actionTag`, `#actionArgument`, `PreparedCollection`, `Prepared` values | Pass data from `prepare` to `effect` | Locals |
| Runner's `#runningStage`, `#failureRequested`, `#warningMessage`, `#reentry` | One open phase, classification, nested-phase refusal | One `stage` field that the running step narrows |
| Behavior's `progress`, `pendingSpatial`, `#spatialSeq`, `#transaction.failure` | Failure mapping and latest-frame checks | `session.started`, `session.invoked`. The frame reads the session when it fires |

Per-controller fields that stay: the current session, the two controller-scope request flags, the destroy promise, the landing animation, the click suppressor, the listener abort and the stage.

### 3.3 Queues

`ActionQueue`, the 11 kernel tags (`MOVE`, `UP`, `CANCEL`, `START_COMMITTED`, `RESOLUTION_SETTLED`, `FAILED`, `ERROR_REPORTED`, `RETIRE`, `ACTIVATE`, `RELEASE`, `OPEN_RESOLUTION`), the sortable's 3 tags, free drag's 2, tag validation, the discard walk and the drain. This is a queue of capacity one in one respect: `session.next` holds one continuation. It differs from the present queue in having no order to reason about, no argument retention and no entry validation.

### 3.4 Forwarding layers

- `Kernel` → `ArmedController` → `ExecutionLoop`'s constructor callbacks. There is one `Gesture` class.
- `createSortableSpec` and `createFreeDragSpec`, which exist because `BehaviorSpec` has nested namespaces and a class instance cannot be one.
- `#releaseTransition`, `#actionTransition`, `#settlementTransition`, `#activationPolicy`, `runActivationTransition`, `runReleaseTransition` and `#callMoved`.
- `BehaviorRunner`'s three call forms and the prepare/commit/effect driver.

This dissolves `flow-4`, `flow-5` and `flow-6`. The recorded stacks shrink, but §6.4 shows no established per-sample time difference, so the argument for removal is reasoning cost and bundle size, not speed.

## 4. What remains, and what each mechanism guarantees

"Evidence" names the mutant in §6.5 that breaks the guarantee, so a reader can see that the mechanism is load-bearing and not assumed.

| Mechanism | Guarantee | Evidence |
| --- | --- | --- |
| `#running` | A nested native event or request cannot interleave with a step. Covers a synchronous `dispatchEvent`, `showPopover`'s `beforetoggle` and custom-element reactions | M5 |
| Request slots | A request changes nothing the running step uses | M4, M6 |
| Loop order | `DESTROY` first, then deferred work, `CANCEL`, fault, verdict, next step | M1, M7, M10, M11, M12, M17 |
| `session.next` | No consumer round-trip opens after a registered destroy, cancel or fault | M1 |
| `done` latch in the round-trip | The first completion wins. An odd thenable cannot change the verdict | M2 |
| `session.cancel` first-wins, `session.verdict` check at intake | The first cancel keeps its reason. A cancel cannot overtake a completed verdict | M16, M18 |
| The loop reads `this.#session` | A stale verdict is never applied, with no identity check | Scenarios: late verdict after cancel and after destroy |
| `#conclude` and `#fail` are total, and clear the session | Exactly one terminal. A cancel after the decision is a no-op | M3 is the honest limit: see §6.5 |
| `session.started` | No start, no terminal | M8 |
| `motion`, `cancellation`, `presentation` lifetimes (unchanged) | Motion closes before the proposal. Escape and the abort signal outlive it. LIFO best-effort cleanup | M13, M9 |
| Statement order in `#conclude` | Target measured before release, presentation released before landing and terminal (I-23) | M15 |
| `stage` field with one catch per pass | A fault reports the stage the running step declared | Scenarios at stages 2, 4, 8, 14 |
| `#report` refusal after closing | No `onError` after applied destruction (I-36) | Scenarios: destroy while idle, active, pending |
| The click suppressor (unchanged, including `flow-1`) | An activated drag's click does not reach the page | M14 |

## 5. Costly guarantees, questioned

|  | Guarantee | What it costs today | Reachable failure without it | Proposal |
| --- | --- | --- | --- | --- |
| G1 | A request cannot change a running step (D-202, the owner's mandate) | The reason for most of the machinery | Yes: `onStart` destroys, and the rest of the step sees a closed controller | **Keep.** Slots and one reader provide it. See §9, O1 |
| G2 | Everything is FIFO (I-1) | Queue, tags, entry readings where FIFO was not enough (F-436, F-439, D-206, D-207) | Only through ordering nobody promised | **Replace with fixed precedence.** Costs changes 4 and 5 in §6.2 |
| G3 | Every `prepare` is transactional on a draft (I-2, I-3, I-5, I-16 to I-18, I-27, I-28) | Frame pair, copy per sample, frame parts, resets, `Draft` types and a 92-line transaction | A throw after a partial write. The failing step ends the operation anyway, and first-party steps assign last | **Withdraw.** Loses tier-A protection for a third-party behavior: §9, O3 |
| G4 | Eight named phases, published | Readers that do not exist (§3.1) | None | **Reduce to three.** Published constants change |
| G5 | Async completions validated twice (I-4) | Slots, identity, phase checks at both ends | Mutating this check away in the first prototype version changed nothing, so it was deleted | **One latch, one live-session read** |
| G6 | A native sample raised inside a callback is queued (I-1) | Part of the queue's job | Only a script's `dispatchEvent` from inside a callback. From my knowledge of the platform, real pointer events are not dispatched synchronously inside these calls; not verified exhaustively | **Refuse it.** Change 7 |
| G7 | A destroy requested in `onError` suppresses the terminal | Report and terminal must be two units | The consumer receives `onEnd` after asking to destroy. The published `requestDestroy` text already allows remaining callbacks of the running step | **Withdraw.** Change 1. It could be kept with a fourth state, which is not worth its branches |
| G8 | A throw from the kernel's own step panics and destroys the controller | Two failure routes, `throw null`, a re-entry flag | The tested trigger is a throwing `window.getSelection`. Under CONTRIBUTING §1.1 that override is outside the domain | **One route.** A step's throw is an ordinary fault. Only a throw escaping the loop panics. Change 2 |
| G9 | Discarded faults are walked and reported | Tag knowledge in the loop, closures per fault | None: the fault is in `session.fault`, and destruction or a cancel reports it | **Same outcome, no walk** |
| G10 | Spec validation at arm: action tags, the `pointerdown` command collision | Runtime checks and rollback paths | Tags no longer exist. The collision only matters for a third-party behavior | **Depends on O3.** Not in the prototype |
| G11 | Each spatial frame is checked three ways (`flow-6`) | Sequence number, stored value, comparison | `motion` cancels the frame, so a frame always fires for a live operation | **Remove** |
| G12 | Ten failure stages, published | One assignment per narrowing | Consumer-visible | **Kept as they are.** Whether a consumer needs ten is a separate question and was not examined |
| G13 | Three lifetimes per operation | Three `AbortController`s and `AbortSignal.any` per drag | Motion and cancellation really do end at different times | **Kept, unexamined.** Could shrink further. The prototype reuses the module |

## 6. The prototype

### 6.1 What it is

Three new files in a detached worktree at `d3058ea3b`: `gesture.ts` (the kernel, 609 lines without comments), `sortable.ts` (340) and `free-drag.ts` (251). Public signatures and config match production. These modules are imported unchanged: `presentation`, `lifetimes`, `pointer`, `invalidation`, `y`, `xy`, `rect-index`, `linear-shift`, `layout-animation`, `landing`, `placement`, `collection`, `keyboard`, `assemble`, `bounds`, `geometry`, the config and domain types. Those files were not edited, which is itself a result: the features do not depend on the queue or the frames, because the session object satisfies their structural `InsertionFrameView`.

It is not a replacement. Failed-construction rollback beyond the listener abort, and arm-time validation, are absent, and the kernel-tier SPI is not rebuilt.

### 6.2 The differential suite

83 scenarios run the same script against both implementations in Chromium. Pointer input is Playwright's real mouse, so capture, `click` and `lostpointercapture` are the browser's own. Keyboard, `pointercancel` and nested events are dispatched. A trace records every callback in order with its discriminating fields, whether a click reached the page, and the DOM left behind. After each scenario a further drag shows whether the controller still works. [The traces](../../probes/single-pass/parity-results.json.txt) are kept.

**76 traces are identical. The other 7 are required to differ, and each is pinned to the prototype's stated behavior:**

| # | Scenario | Production | Prototype | Assessment |
| --- | --- | --- | --- | --- |
| 1 | `onError` requests destruction | No `onEnd` | `onEnd`, then teardown | The report and the terminal are one step. G7 |
| 2 | A step's own platform call throws (`getSelection`) | Panic: controller destroyed, `stage: null` | Fault at `FAILURE_ACTIVATION`, controller lives | G8 |
| 3 | `onEnd` requests destruction, then throws | Warning, `superseded-by-destruction` | `DraggableError`, stage 14 | The consumer's own throw is still reported, in a different class. Keeping today's class would need a read in the catch |
| 4 | A step invalidates away its item, then throws | Warning, then `onEnd` | `onEnd`, then warning | Production has both orders, depending on the route. D-209 already says "before or after". The prototype has one |
| 5 | Two `invalidate()` calls in one callback | `items()` pulled twice | Pulled once | Coalesced. `invalidate()` is a signal with no payload, and the pull source is re-read |
| 6 | Start fails with a cancel already registered | `onEnd` for a drag `onStart` never announced | No terminal | Removes this instance of open F-442. The `started` gate should cover the class by construction, but only this instance was run |
| 7 | `pointerup` dispatched from inside `onMove` | Queued, the drop happens at once | Refused, the real release drops | G6 |

Changes 2, 3 and 6 need a fault to be visible at all. Changes 1, 4, 5 and 7 are reachable by correct code, and 1 and 5 are the ones most likely to be noticed.

### 6.3 The production browser suite, through the prototype

For this run only, a [small patch](../../probes/single-pass/swap-public-entries.patch.txt) made `src/sortable.ts` and `src/free-drag.ts` call the prototype. The browser project then ran unchanged.

|  | Tests | Passed | Failed |
| --- | --- | --- | --- |
| Baseline, unpatched (the browser project, excluding the parity suite) | 948 | 948 | 0 |
| Patched | 948 | 942 | 6 |
| Of those, in the 31 files that reach a public entry | 485 | 479 | 6 |

[The per-file result](../../probes/single-pass/production-suite-through-prototype.txt) is kept. A file counts as reaching a public entry when it imports one, read by pattern and per file. The 6 failures are `diagnostic-intake.browser.test.ts`, three tests in each behavior's fixture. They are changes 1, 2 and 3 above, and each states the old behavior as its expectation. Nothing else failed, including the React integration, the reference stories, the keyboard, input-policy, displacement and landing-space suites, and the free-drag lifecycle suite.

This was not clean from the start, and the failures earlier versions produced are worth recording. A first run had 17. Most were glue slips in the prototype: reading the landing timing after the `animate` lookup, calling a constraint with a receiver, classifying a `moveTo` effect at the wrong stage. One was a real design error: a callback that invalidates and then throws must have its deferred work land before the fault decides. Fixing it is what made a fault a slot in the loop, which also removed an in-sequence read and two ordering differences.

### 6.4 Measurements

| Measure | Production | Prototype |
| --- | --- | --- |
| Library frames, transform write, median sample | 15 | 5 |
| Library frames, deepest transform write | 18 | 6 |
| Library frames, placeholder move | 18 | 5 |
| Lifecycle code, lines without comments or blanks | 2,553 | 1,200 |
| Lifecycle source, raw lines | 8,168 | 1,628 |
| `sortable` + `y`, min / Brotli | 35,266 / 11,032 B | 23,833 / 8,265 B |
| `complete` composition, min / Brotli | 36,557 / 11,533 B | 25,121 / 8,740 B |
| `freeDrag`, min / Brotli | 27,984 / 8,627 B | 17,175 / 6,025 B |
| One active sample, µs, median of 7 (range) | 2.02 (1.71–4.03) | 2.54 (1.49–3.17) |

The frame counts match the flow record's 15 and 18 on production, which validates the instrument. The lifecycle set is `kernel.ts`, `behavior-runner.ts`, `execution.ts`, `queue.ts`, `transaction.ts`, `frames.ts`, `phases.ts`, `actions.ts`, `spec.ts` and each behavior's `spec`, `behavior`, `controller`, `frames` and `runtime`; 5,720 raw lines of shared modules are the same on both sides. The prototype's missing rollback and validation flatter its numbers slightly. Bundle figures are esbuild minify and Brotli 11, comparable with each other and not with `just size`. **The timing ranges overlap, and the medians swapped order between runs of this same code (an earlier run read 3.21 against 2.93), so no per-sample speed difference is established.** That supports `flow-5`'s caution: fewer frames are not, on this evidence, faster code. The timing dispatches one synthetic event object and no frame runs, so it is a coarse reading of the listener path.

### 6.5 Can the suite fail?

Equal traces mean little if the suite cannot see a defect, so 18 single changes were applied to `gesture.ts`, one at a time, and the parity scenarios were run against each.

| Mutant | Scenarios that caught it |
| --- | --- |
| M1 the next step runs ahead of a registered cancel | 3 |
| M2 a later completion overwrites the first | 1 |
| M3 the session is cleared at the end of the conclusion, not the start | **0, survived** |
| M4 a cancel from inside a pass applies at once | 4 |
| M5 passes may nest | 10 |
| M6 destruction from inside a pass applies at once | 4 |
| M7 a fault is read ahead of a cancel | 3 |
| M8 no start gate on the ordinary terminal | 1 |
| M9 teardown does not retire the live session | 11 |
| M10 deferred work runs after the next step | 3 |
| M11 a verdict is read ahead of a cancel | 1 |
| M12 destruction waits for a held cancel | 1 |
| M13 motion stays open across the drop | 10 |
| M14 the click suppressor is not armed | 61 |
| M15 the terminal runs before presentation is released | 1 |
| M16 a cancel is not first-wins | 1 |
| M17 a fault decides ahead of deferred work | 1 |
| M18 a cancel can overtake a completed verdict | 1 |

**M3 is a real result and it corrects a claim.** I had written that clearing the session first is what guarantees one terminal. It is not. Clearing it at the end changes nothing observable. Exactly one terminal rests on two other facts: `#conclude` and `#fail` are total, and the session is gone by the time they return. Clearing first is kept because a late cancel then finds no session and writes nothing, not because anything depends on it.

Six mutants caught the suite itself when they first ran. M15, M16 and M18 survived until scenarios looked inside `onEnd`, issued two cancels in one callback, and cancelled after a completed thenable. M7 and M8 survived because a pinned difference only asserted that the traces differed, so each pin now asserts the prototype's behavior. An identity check on the verdict survived, and because it was dead code, it was deleted. The kept results are from the final version, and the scenarios that catch each mutant are in [`mutants.json.txt`](../../probes/single-pass/mutants.json.txt). The mutants exercise only `gesture.ts`, not the two glue files.

## 7. What the prototype demonstrates, and what remains untested

| Area | Demonstrated | Untested |
| --- | --- | --- |
| **Asynchronous resolution** | Late accept, reject and rejection. A synchronous thenable, including one that then throws, and one completed from `items()` during a later pass. A press refused while a verdict is pending. A pointerless verdict | A thenable whose `then` accessor throws. Verdicts arriving between a real frame and a real pointer sample, under load |
| **Cancellation** | Escape, `requestCancel`, real lost capture, dispatched `pointercancel`. From `onStart`, `onReorder`, `onEnd`, `onMove` and a `box` resolver during release. Stage attribution at both stages, first-wins, the abort signal. Combined with a throw | A real touch `pointercancel`. A cancel from a landing or `home` callback |
| **Destruction** | While idle, pending, active and awaiting a verdict. From `onStart`, `onReorder`, `onError`, `onEnd`, a `box` resolver and a placeholder's `disconnectedCallback`. One promise. Inert afterwards, with styles restored | Destruction from a feature's retire hook, a factory or a frame-part factory, and the rest of the construction window. Disposer and retire-hook throws. The panic route itself: the scenarios no longer reach it, because only a library defect does |
| **Reentrancy** | A nested press from `handle` and `onStart`, a nested `pointerup`, invalidation from callbacks, custom-element reactions | Popover `beforetoggle` listeners that request things. Two controllers on one page, nested in one another |
| **Features** | `y`, `xy` (smoke), `landing`, `layoutAnimation`, `bounds` (smoke), keyboard. The production suites for displacement and geometry through the public entry | Touch, zoomed or transformed ancestry except as those suites cover it, shadow DOM and iframe realms except as they cover it |

Not established at all:

- **370 browser tests did not exercise the prototype.** `kernel/kernel.browser.test.ts` (242) and `sortable/sortable.browser.test.ts` (128) wire `draggable` and hand-built slots directly. They encode many of the two-fault orderings the contract cares about. Reviewing them is the most important remaining check.
- **Node and declaration tests** were not run, and many test the SPI this removes: about 4,200 lines in `behavior-runner`, `execution`, `capture`, `queue`, `transaction`, `frames`, `vocabulary` and `spec`.
- **Allocation and retained heap.** Removing the queue should remove F-443's 84 B per sample, and adds one or two closures per drop. Neither is measured. M-1, M-2 and the `shipped` project's zero-read census were not run.
- **Firefox and Safari.** Chromium only.
- **Types and tree-shaking.** Prototype types were checked. Published declarations, entry budgets and the module graph were not.

## 8. Tradeoffs

- **It gives up structural protection for discipline.** Today, `prepare` cannot touch committed state, by type. In this design, a step that assigns too early and then throws leaves that write behind. For first-party code the failing operation ends anyway. For a third-party behavior, it becomes a documented rule.
- **`Session` is mutable and shared.** Foreign code cannot reach it, and steps write it in a known order, but nothing enforces that a future feature will not retain it.
- **The loop's precedence is global.** FIFO let unrelated requests keep their relative order. Here, the order between kinds is fixed and within a kind there is one slot. A future request kind that needs order within itself would have to bring its own. The prototype's `moveTo` keeps only its latest value, so two calls in one callback land where the last says, and a malformed first call's fault is lost; no scenario covers that.
- **The contract work is large.** Most I-rows keep their statement and lose their mechanism. D-208's properties survive and its queue does not. 02, 04 and 05 would need rewriting, and the test suite's SPI-level files would need replacing and not porting.
- **It discards recent work.** The D-202 to D-209 implementation is accepted and tested. This is a reason to demand evidence, and it is not itself a reason to keep the mechanism: the properties it delivered are what this proposal tries to keep.
- **The rate of new guards should fall, for a structural reason.** A new callback adds a call and a new request adds a slot and one branch. Neither gives a step anything to re-check. That is the outcome the owner's [reentrancy brief](../../reentrancy-redesign-brief.md) asked for. It is an argument and not a measurement, and only a later feature will test it.

## 9. Owner decisions

**O1 — What does the snapshot property require?** The [brief](../../reentrancy-redesign-brief.md) says a request must not change a running sequence and that "a pending-request flag read throughout the running sequence" would not do. D-202 made that checkable as "no unit reads the ledger after its entry". This design keeps that statement with "step" in place of "unit": all reads are in one function, between steps. `session.next` is what makes that true for the round-trip. The difference is that continuation no longer passes through a FIFO, so order is by precedence. **Recommendation: accept.** If FIFO itself is a requirement, this design is rejected here.

**O2 — The seven changes in §6.2.** **Recommendation: accept all seven.** The ones worth a deliberate look are 1 (a terminal after a destroy request in `onError`) and 2 (a controller survives what used to panic).

**O3 — The `kernel.js` tier (D-48, D-68).** The behavior-authoring SPI cannot survive in its present form, because it is the prepare/commit/effect protocol. A smaller hook interface exists in the prototype, but it has no draft protection and exposes a mutable session. **Recommendation: make it internal until a third behavior exists.** The package is unreleased (CONTRIBUTING §8), which also lets G10 go. If the tier must stay public, this design needs a stated authoring discipline, and the bundle figures may change.

**O4 — Continue?** **Recommendation: yes, one bounded unit before any contract work.** Classify the 370 unexercised browser tests by the guarantee each asserts, and port those that assert a surviving one onto the session API, with the remaining §7 gaps as added scenarios. A real failure there is the most likely way this proposal falls. Only after that would an architect mint a decision and revise the contracts.

## 10. Other findings from this work

These are observations and not decisions. None was acted on.

- **`flow-1` was observed.** With real mouse input, after a reordering drop, the next click on an unrelated button outside the list did not arrive and the following one did. Production and the prototype behave the same, because the prototype copied the suppressor unchanged.
- **`bench/profile/complete.ts` says the next operation pulls the collection at admission.** The code at `#admitFrom` reads the published snapshot and does not pull. A second drag without `invalidate()` ran against a stale snapshot in this suite's first version, and the `G3-linear` development check reported it, in both implementations.
- **`flow-2`, `flow-7`, `flow-8` and `flow-9` are untouched.** The prototype keeps the same order for each.

## 11. Verification and limits

**Reproduction.** [`probes/single-pass/README.md`](../../probes/single-pass/README.md) has the commands. Every source, patch, script and result cited here is kept in that directory, and the worktree has been removed.

**Limits.** One machine, one browser, headless. Differential equality shows the same trace for that script, and nothing about other scripts. The scenarios were written by the author of the prototype, so they share its blind spots. The production suite and the mutants were added to counter that, and the production suite found what the scenarios had missed. No independent review has read this record or the prototype.

**Stopping boundary.** This record ends at the proposal. No production source or contract changed, and no decision was minted. The next action is the owner's, on §9.