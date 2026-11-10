# Feature proof review: production `@ydinjs/drag`

**Reviewed tree:** `d7e7b0d3a` on `drag/production`, range `a1d31e0d2..d7e7b0d3a`. Every file was read at that commit. Probes ran in a detached worktree of the same commit.

**Governing records:** [`contract.md`](../../contract.md), [`00-index.md`](../../00-index.md), [`implementation-handoff.md`](../../implementation-handoff.md), [`implementation-report.md`](../../implementation-report.md), and the measurements under [`measurements/`](../../measurements/).

**Lens:** feature proof. This report states what is wrong and which property must hold. It proposes no fixes and no contract changes.

## Scope

**Covered:**

- **Contract coverage.** I read `src/draggable.ts`, `src/lift.ts`, `src/sortable.ts`, `src/free-drag.ts`, `src/fault.ts` and the `shared/` and `sortable/` modules that the contract names, and I checked each `DRI-1` to `DRI-18` clause and the public surface against the code.
- **The report's seven choices.** I checked each one against the code. Two of them have consumer-observable consequences, and I demonstrated both with probes.
- **The test audit.** I read the test names for every file, and the bodies where a claim depended on them. I checked the rows the report lists as unaudited. I ran two mutations that are not in the handoff's list.
- **Performance and size instruments.** I read `bench/compare.ts`, the lab fixtures, `bench/size/measure.ts`, the recorded JSON, the instrument proof, the retained-heap attribution and the landing trace. I re-derived verdicts from the raw rounds. I reproduced the size table and the landed-cycle layout counts.
- **The landing-layout miss.** I characterised it as an open question.

**Not covered:**

- Root gates (`lint`, `test`, `build`) and the report's statements about failures in other packages.
- Re-running the 32 recorded mutations or the instrument proof (`--prove`).
- Every row of `test-classification.tsv`. I checked only the rows the report lists as unaudited.
- Storybook stories, the README beyond the hook table and the `requestStep` section, the `accessibility.md` and `architecture.md` edits, and the drag2 integration. Those belong to other lenses.
- Physical touch and pen input (`drag:DRO-3`).

**Runs on this tree:**

- `just test-engines`: 754 passed and 14 skipped. That is the report's 745 plus my 9 probe tests.
- The Chromium suite: 276 passed, the report's 273 plus 3 probes.
- `node bench/size/measure.ts --prototype`: every row matches the report byte for byte.
- `node bench/compare.ts --rounds 2 --only "cycles, 20 items"`: 400 layouts against 350 and 350, as recorded. Concurrent review passes loaded the machine during this run, so its timing figures are unusable. One control round read about 1.27 s of script per cycle.

## Findings

Ids are local to this pass. Tiers follow [`review-findings.md`](../../../../../.agents/docs/review-findings.md).

| Id | Tier | Claim |
| --- | --- | --- |
| `reviewer-1` | A | A step requested through a retained `drag.requestStep` runs against a later operation's `Drag` |
| `reviewer-2` | A | A keyboard command whose item leaves the collection during activation reports a fault and runs `onStart`/`onEnd`, where `DRI-14` requires a quiet decline |
| `reviewer-3` | B | The `DRI-17` frame-coalescing test cannot fail: with coalescing removed, the whole suite passes |
| `reviewer-4` | B | The timing verdicts use the control's range as the floor, which hides differences that have the same sign in every interleaved round. The reading reports them as "no difference" |
| `reviewer-5` | B | The retained-heap instrument compares absolute heap across arms with a 0 B floor, and the reading overrides its flag with tools that are not in the tree |
| `reviewer-6` | C | Several contract obligations have no witness, including `DRI-9`'s order of focus restore (step 6) and landing start (step 7) |
| `reviewer-7` | A | **Unresolved architectural question.** A landed drop costs one layout more than both before arms (the miss the report returns) |

### Stale `drag.requestStep` reaches a later operation (`reviewer-1`, tier A, routed to the architect)

- **Current behavior:** `Drag.requestStep` is the controller's function (`src/draggable.ts:634`, `requestStep: this.requestStep`). `#runStep` passes whatever session is running (`src/draggable.ts:503-509`). A step requested through the `drag` of a finished operation, while a later operation is active, receives the later operation's `Drag`. `drag.requestCancel` is scoped to its own operation (`src/draggable.ts:635-639`), and `terminals.browser.test.ts` "should not let a retained drag cancel a later operation" pins that scope for cancel only.
- **Requirement:** `DRI-8`: "The step receives **the operation's** `Drag` only from the end of activation until the drop or the decision ... Otherwise it receives `null`." `DRI-5` sets the same boundary for verdicts: a late completion "reaches nothing, including a later drag". `DRI-18` gives custom behaviors the same guarantees. The README's `requestStep` section introduces `drag.requestStep` beside `drag.requestCancel` and does not say that the two have different scopes.
- **Why it matters:** a custom behavior that keeps its `drag` in a timer or a listener writes into the next operation's state or view, with no error. The built-ins are not affected, because `sortable` cancels its frame task in a disposer and both built-ins scope their listeners to `drag.signal`.
- **Evidence:** probe P1. Operation 1 keeps its `drag` in `activate`. After operation 1 ends, a press on `#r2` starts operation 2, and the probe calls `first.requestStep(step)`. The step receives the `Drag` for `r2` in Chromium, Firefox and WebKit.
- **Property that must hold:** a step requested through an operation's `Drag` must not receive another operation's `Drag`, unless the architect states otherwise. The report lists this as choice 4. It settles a reading of "the operation's `Drag`" that the contract text does not support, so the decision belongs to the architect.

### A keyboard command does not decline when the item leaves during activation (`reviewer-2`, tier A, routed to the architect)

- **Current behavior:** `sortable`'s `activate` skips the second `items()` pull for a command (`src/sortable.ts:356-365`, report choice 2). The command's admission and its activation run in one pass, but foreign code still runs between them. The lift's `showPopover` dispatches `beforetoggle` synchronously, and the attribute and style writes queue custom-element reactions. If the item leaves the collection there, a pointer operation declines quietly, while a command proceeds on the stale snapshot.
- **Requirement:** `DRI-14`: "`items()` is pulled at each admission and again at activation ... An item no longer in the collection at activation declines the operation: no `onStart`, no `onEnd`, no report."
- **Evidence:** probe P2. A `beforetoggle` listener on `#r1` moves `#r1` into another container on the first open. The results were the same in all three engines:

  | Input | `onStart`/`onEnd` | Reports |
  | --- | --- | --- |
  | Pointer | none | none |
  | `ArrowDown` command | `start`, `end:canceled` | one `DragFault`, cause `sortable/anchor-outside-container` |

- **Property that must hold:** a command whose item is not in the collection at activation must have the same outcome as a pointer operation (`DRI-14`), or the contract must state the exception. The report presents choice 2 as narrower than a literal reading of `DRI-14`. The probe shows that the narrowing is observable.

### The coalescing witness for `DRI-17` cannot fail (`reviewer-3`, tier B)

- **Current behavior:** the test `hot-path.browser.test.ts` "should run the spatial search at most once per frame" counts `requestAnimationFrame` calls during one 8-step `pointerMove` and asserts `scheduled <= 8`. Without coalescing, 8 samples schedule at most 8 frames, so the assertion holds either way.
- **Evidence:**
  - **The mutation survives.** I removed the `handle === 0` guard in `createFrameTask.schedule` (`src/shared/invalidation.ts`). The full Chromium suite passed (276 tests), and so did the shipped `hot-path` file (6 tests).
  - **The property is observable.** Probe P3 dispatches five untrusted `pointermove` events in one task during a sortable drag. It counts 1 scheduled frame on the reviewed source and 5 under the mutation.
  - **Neither list has the mutation.** The handoff's mutation list does not include "remove coalescing", and the report's mutation table does not either.
- **Requirement:** `DRI-17`: "The spatial search is coalesced to a frame." The test claims this property by name.
- **Property that must hold:** a test that names coalescing must fail when coalescing is removed.

### Timing "no difference" verdicts that the paired rounds contradict (`reviewer-4`, tier B, routed to the architect and the owner for §0)

- **Current behavior:** `judge` in `bench/compare.ts` compares the difference of arm medians with `spread(control)`, the range of the control arm over 7 rounds. This floor ignores the instrument's own interleaving. Each round runs every arm in one browser process, back to back. The reading itself names the dominant noise: "all arms slow together across rounds". A range across rounds contains exactly that drift, and a paired comparison inside a round removes it.
- **Evidence:** I re-derived the rounds from `2026-11-06-compare.json` (`raw`). Each figure is a per-round difference, production minus the before arm, then the number of rounds in which production was higher.

  | Row | Metric | Against | Median paired difference | Production higher | Control higher (same before arm) | Recorded verdict |
  | --- | --- | --- | --- | --- | --- | --- |
  | 50 cycles, 20 items, no landing | task | drag2 | +1,804 µs | 7 of 7 | 7 of 7 | no difference (floor 2,386) |
  | same | task | prototype | +1,364 µs | 7 of 7 | 5 of 7 | no difference (floor 2,386) |
  | same | script | prototype | +334 µs | 7 of 7 | 6 of 7 | no difference (floor 498) |
  | 50 cycles, 2,000 items, no landing | task | drag2 | +3,984 µs | 7 of 7 | 7 of 7 | no difference (floor 6,877) |

  Production minus control has no consistent sign on these rows (3 of 7 rounds higher on the first one), so the two copies of the same bundle agree with each other. The per-cycle task time on the first row is about 14,000 µs, so the excess is about 10 to 13 %.

- **Limits of this evidence:** I scanned 52 comparisons, so one 7-of-7 result could arise by chance. The control arm shows the same sign, but its readings share the before arms' rounds, so it is not an independent replicate. I could not re-measure on a quiet machine.
- **Instrument proof:** the instrument proof does not establish sensitivity on these rows. All five injections target the move, bytes and retained rows, and each ran with 3 rounds, not 7. The O(n) injection adds about 1.1 ms of script per move, and the task metric flagged it by only 12 µs (1,495 against a floor of 1,483).
- **Requirement:** handoff §5: "A difference within the control's spread is **no difference**. Above that, production is **slower**: find the cause, or report it for the owner's §0 decision", and "The instrument must prove itself first." `judge` applies the rule as written. The finding is that the rule's floor does not control the noise this instrument has, so the "no difference" verdicts on the cycle rows do not establish equality. The reading's own caveat ("can't exclude a smaller real cost") understates what the paired rounds show.
- **Property that must hold:** a "no difference" verdict must come from a noise control that can detect a difference of the size in question, and the record must not report equality where the interleaved rounds give the same sign every time.

### Retained-heap verdict overridden by tools that are not in the tree (`reviewer-5`, tier B)

- **Current behavior:** the retained rule subtracts one arm's absolute `JSHeapUsedSize` after destruction from another's. Heap after GC is nearly deterministic here (control spread 0 B, production 36 B), so the floor is 0 B, and any code-size difference between arms flags. In the recorded run, 200 operations flag +9,208 B against the prototype. The 0-operation row reads −1,308 B, so production also grows about 10.5 KB more than the prototype between 0 and 200 operations, measured inside each arm.
- **Dismissal:** the reading dismisses the flag through heap snapshots and rows at 100, 400 and 600 operations, taken "from temporary copies of the instrument". `2026-11-06-retained-attribution.txt` records their output, but the tree does not contain the scripts. `compare.json` still carries `FLAG slower` for this row. The attribution itself is plausible: object and closure totals agree within 144 B, and the difference is compiled code.
- **Requirement:** handoff §5: "No growth attributable to the library beyond the noise floor". The size and cost rows elsewhere follow the rule that the instrument decides and the record can be re-derived.
- **Property that must hold:** the record's acceptance of this rule must rest on an instrument that is in the tree and can separate retained library objects from code size, or the record must state that the rule was decided by manual attribution.

### Contract obligations with no witness (`reviewer-6`, tier C)

- **`DRI-9`, step 6 before step 7.** I moved the landing start before the focus restore inside `#conclude`. The full three-engine suite passed: 754 tests, 48 files. No test observes the order that the report keeps at the cost of a layout. See `reviewer-7`.
- **A pointerless operation with a landing.** These are classification rows L 107 and L 108, which the report lists as unaudited. No test composes `landing` with a keyboard command, so the landing origin for an operation that never translated is untested.
- **A second pointer's samples.** Row 36, also listed as unaudited. "should ignore a second pointer during a drag" dispatches only `pointerdown` and `pointerup` for pointer 77, so a foreign `pointermove` during a drag is not exercised. Row 58 (release) is covered by the same test. Row 35 (travel from the grab point) is covered by "should activate only at the threshold".
- **`DRI-4`, `pointercancel` to `origin: 'interrupted'`.** This is observed only in Chromium, through CDP touch (`click-guard.browser.test.ts`, `it.runIf(isChromium)`). Firefox and WebKit have no witness for this origin. The handoff asked for CDP touch, so this is a stated limit rather than a defect.
- **The report's audit statement is accurate.** The listed rows were unaudited, and the gaps above are what that audit would have found among them. I found no test outside these rows whose body contradicts its name, apart from `reviewer-3`.

### Open question: the landing-layout miss (`reviewer-7`, tier A, returned to the architect)

The report returns this miss to the architect, and it stays unresolved. This section characterises the miss. It does not propose a resolution.

- **What is measured:** 50 landed cycles read 400 layouts in production against 350 in both before arms, at 20 and at 2,000 items, in every one of the 7 recorded rounds. My 2-round run reproduced 400 against 350 and 350. Without a landing, production reads 250 against 300 (drag2) and 250 (prototype). With a cached array, keyboard rows read 50 against 100 and 50. The handoff's exact rule ("production is at or below both before arms") is therefore missed on the landed rows only.
- **Where the layout comes from:** in `#conclude`, the order is release, then `focused.focus(...)`, then `lift.land(landing)` (`src/draggable.ts:924-944`), as `DRI-9` steps 5 to 7 fix. The recorded trace shows production with a forced layout inside `#conclude`, followed by three rendering layouts. The prototype, and production without kernel focus but with a consumer refocus in `onEnd`, show the forced layout in `onEnd` (after the landing started), followed by two rendering layouts. Production without any focus call also reads 7, with three rendering layouts and no forced one. A forced layout taken before the flight starts does not absorb the layout the flight then needs. I read this from the trace and did not re-trace it.
- **When it occurs:** all of the following must hold. I derived the conditions from the code, and only the bench case was measured.
  1. The behavior has `lift`, and `settle` returns a landing.
  2. Focus was inside the item at the drop (`focusedWithin`, `src/draggable.ts:782`).
  3. After release, the document's focus is on `body` or nothing (`src/draggable.ts:929-933`). This is typical of an accepted reorder whose `insertBefore` moved the focused item.

  A rejected drop, a drop of an unfocused row, or a list whose rows are not focusable calls no `focus()`, so the extra layout should not occur. In the bench, rows have `tabIndex = 0`, so every press focuses its row.

- **Cost:** one layout per landed operation, not per sample. Layout time per cycle at 2,000 items is 6,665 µs, against 6,140 µs (prototype) and 5,506 µs (drag2). The control's own range is 4,810 to 7,457 µs. Script and task show no difference under the instrument's floor, with the caveat in `reviewer-4`.
- **The arms compared:** the before arms have no kernel focus restore. The lab gives them a consumer `moved.focus()` in `onEnd`, which runs after their landing starts. So the comparison is between the contract's order and the order a consumer would use.
- **The records that meet here:**
  - `DRI-9` fixes the release order with focus at step 6 and the landing at step 7.
  - `DRI-12` and `DRD-9` put focus restoration in the kernel.
  - `DRD-10` releases presentation before the landing.
  - The handoff §5 sets the exact layout rule.

  No guarantee requires both orders at once. The conflict is between a fixed order and an exact cost rule, and both come from the architect.

- **What does not pin the order:** see `reviewer-6`. With the two steps swapped, every test passes in all three engines, so the suite cannot discriminate between the current order and the swap.

## The seven choices in the report

| # | Choice | Matches the code | Assessment |
| --- | --- | --- | --- |
| 1 | Quiet decline for an item disconnected at activation | Yes: `#activate`, `src/draggable.ts:740-743`, before the lift and before `activate` | Applies to every behavior, not only `sortable`. A custom behavior gets no `activate` call. The README's hook table says `activate` runs when "the pointer crossed the threshold". The lift runs before `activate`, so a lifted behavior needs the check, because a lift on a disconnected visual would fault. The policy is disclosed, not silent, but `DRI-14` scopes the decline to `sortable` and the contract gives the kernel no decline of its own. **Open question for the architect**, not filed as a finding |
| 2 | A keyboard command skips the second pull | Yes | Has an observable consequence. See `reviewer-2` |
| 3 | `activate` and `start` are one step | Yes: `#activate` calls `activate`, then `start`, in one step | Within the contract. `DRI-3` requires only that `start` follow an `activate` that did not decline. A cancel requested during `activate` runs `start` and then `end:canceled`, and `requests.browser.test.ts` pins this. Consistent with `DRI-8`'s "end of activation" |
| 4 | `drag.requestStep` is the controller's function | Yes | Settles a reading that `DRI-8` does not support. See `reviewer-1` |
| 5 | `layoutAnimation` ignores reduced motion | Yes | Within the contract: `DRI-13` covers landings, and the vocabulary defines a landing as the visual's flight only. Neither the prototype nor drag2 honors reduced motion in `layoutAnimation`. The README states it |
| 6 | A factory that returns the dragged item reports, and its disposer removes the item | Yes | Within the contract: `PlaceholderFactory` states "Must return a detached element", and CONTRIBUTING prefers no defensive checks. A second test pins a related misuse: a factory result already in the document is moved, then removed |
| 7 | Legacy output removed beyond the named items | Cannot be verified: the files were ignored and are not recoverable from git | Handoff §1: "Work in a clean worktree, or tell the owner before removing that output from the main checkout." The report does not say whether the owner was told. **Verification limit, for the owner** |

## Contract coverage: clauses checked with no finding

- **Clauses I checked by reading:** `DRI-1` (idle requests apply before return), `DRI-2` (the precedence in `#applyRequests`), `DRI-3`, `DRI-4`, `DRI-5`, `DRI-6`, `DRI-7`, `DRI-10`, `DRI-11`, `DRI-13`, `DRI-15` and `DRI-16`. All match the code:
  - `DRI-5`: `then` is read once, the first completion wins, and the abort happens only on a cancel or destruction.
  - `DRI-6`: `#running` refuses a nested pass, and the harness's `afterEach` asserts no refusal of a trusted event in every test.
  - `DRI-7`: the slot is filled before `reportError`, and `cause` keeps identity.
  - `DRI-10`: one promise, teardown order, no terminal, and the guard survives destruction.
  - `DRI-11`: the four expiries, and `preventDefault` only on the crossing move.
  - `DRI-13`: additive flight, replacing elevation, and reduced motion in the lift.
  - `DRI-15`: placeholder checks, `aria-hidden` and `slot` mirroring.
  - `DRI-16`: `box-quad` throughout, with no ratio.
- **`DRI-9`:** matches steps 1 to 5 and 8. For steps 6 and 7, see `reviewer-6` and `reviewer-7`.
- **`DRI-8`:** matches, except the retained-`drag` case in `reviewer-1`.
- **`DRI-12`:** matches. The capture runs at the drop, or at the decision if no drop happened. The restore runs only onto `body` or `null` and is not done on destruction. `preventScroll` depends on the input.
- **`DRI-14`:** matches for pointer operations. For the exception, see `reviewer-2`.
- **`DRI-17`:** matches by reading and by the bytes row. For the coalescing witness, see `reviewer-3`.
- **`DRI-18`:** I reproduced the module graphs and sizes, and the declaration tests cover the type requirement.
- **Public surface:** entry points match the contract table. `Drag`, `LiftedDrag`, `DraggableController` and `Behavior` have no members beyond the contract. `draggable.js` also exports the internal type `LiftHold`, which is a type-only addition. The integrity lens owns the surface question.

## Probe code

These probes ran in a scratch worktree and are not part of the tree. P1 and P2 used `managed`, `basicSortable`, `press`, `grab` and `release` from `tests/support/harness.ts`.

```ts
// P1: a step requested through a retained drag
managed(list, {
  admit: (e) => ({ item: targetOf(e) }),
  activate(drag) {
    first ??= drag;
    return undefined;
  },
});
await dragAndDrop('#r0', 40);
await grab('#r2');
first!.requestStep((drag) => seen.push(drag ? drag.item.id : null)); // seen: ['r2']

// P2: the item leaves the collection during the lift
r1.addEventListener('beforetoggle', (e) => {
  if (armed && e.newState === 'open') {
    armed = false;
    parking.append(r1);
  }
});
basicSortable(list);
// Pointer: press #r1, move 40 px, release. Keyboard: r1.focus(), keyPress('ArrowDown').

// P3: five samples in one task
for (let i = 1; i <= 5; i += 1) {
  document.dispatchEvent(
    new PointerEvent('pointermove', {
      pointerId,
      clientX: x + i * 3,
      clientY: y + 20 + i * 9,
      bubbles: true,
    }),
  );
} // requestAnimationFrame calls: 1 on the reviewed source, 5 with the schedule guard removed
```

## Verification limits

- **Timing reproduction:** I could not reproduce timing under load, and I did not re-trace the landing layouts. The `reviewer-7` cause relies on the recorded trace, which agrees with the code path.
- **Not re-run:** the instrument proof, the 32 recorded mutations and the root gates.
- **Real devices:** physical touch and pen were not available (`drag:DRO-3`).
- **Concurrent passes:** during this review, another pass had an untracked `packages/drag/tests/zz-challenge.browser.test.ts` in the main checkout. My runs used a separate worktree at `d7e7b0d3a` and did not include that file.