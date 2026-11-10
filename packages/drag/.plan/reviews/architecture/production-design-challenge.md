# Production design challenge

An independent challenge to the `@ydinjs/drag` architecture, made before production implementation is accepted. **The authoring architect decides each finding.** This record changes no decision, contract or source.

## Input and scope

| Read | Commit |
| --- | --- |
| [`00-index.md`](../../00-index.md), [`contract.md`](../../contract.md), [`implementation-handoff.md`](../../implementation-handoff.md) | `a1d31e0d2` |
| The production package, as a realization of the contract, and the probe subject | `d7e7b0d3a` on `drag/production` |
| The prototype, only to attribute a finding | `599684791` |

**Covered:** architectural contradictions, valid consumer flows the public API can't express, and guarantees under platform behavior and reentrancy. Each finding below was run with real input through Playwright, in Chromium, Firefox and WebKit, on 2026-11-07.

**Not covered:** performance, size, the implementation report, and a general audit of the production source. A guarantee that is not named here was not challenged. It is not shown to hold.

**Evidence:** [`probes.browser.test.ts.txt`](production-design-challenge/probes.browser.test.ts.txt) is the probe file. Run it as `packages/drag/tests/<name>.browser.test.ts` with `npx just test-engines <path> --silent=false`. [`results.txt`](production-design-challenge/results.txt) has every `PROBE` line, one per engine. Every probe test passed: the probes record what they see and assert nothing. The suite's `drag:DRI-6` check after each test, which fails on a refused trusted event, did not fail.

## Summary

| Local id | Tier | Claim | Engines |
| --- | --- | --- | --- |
| `challenge-1` | A | The lift's release erases a free-drag position committed in `onDrop`, so the README example ends at home | 3 of 3 |
| `challenge-2` | A, B | A pending press that misses its `pointerup` is never closed. A hover then activates it, and later presses are refused | 3 of 3 |
| `challenge-3` | A | Nested roots: one pointer starts two operations, lifts both elements, and reorders neither | 3 of 3 |
| `challenge-4` | A | `Escape` cancels the drag and also closes the modal dialog or `auto` popover that holds the list | 3 of 3 |
| `challenge-5` | A | A behavior that commits its move in `end` loses focus, so a second arrow press does nothing | 3 of 3 |
| `challenge-6` | A | A grab during a landing moves the visual away from the pointer by the remaining flight, up to about 80 px | 3 of 3 |
| `challenge-7` | A | Link items start a native drag, which cancels the operation | 2 of 3 |
| `challenge-8` | A | In free drag, a scroll during the drag puts the committed position away from the drop by the scroll distance | 3 of 3 |

## Demonstrated failures

### Free-drag commit erased by the release (`challenge-1`)

- **Finding.** In `freeDrag`, a position written in `onDrop` is overwritten before `onEnd`. The element returns home with no animation, and the result is still `accepted`.
- **Current behavior and contract.** `free-drag.ts` says of `onDrop`: "Commit the position, then resolve. An accepted drag does not move back". The README example writes `box.style.translate` in `onDrop`. `onDrop` is the verdict, so it runs while the presentation is held. `drag:DRI-9` step 5 then requires the visual's inline declarations to be "exactly as they were". The lift owns `translate`, `transform`, `position`, `top`, `left`, `width`, `height` and the margins (`LIFTED_PROPS`), and restores the values it captured at activation. The handoff requires a test for "exact inline style ... restoration on an accepted ... drop".
- **Why it is a problem.** Two requirements in the contract conflict. A free drag commits a position by writing the visual's own position properties. The release puts back the values from before the drag. In every lifted behavior, the verdict is the only hook where a commit happens before `end`.
- **Evidence.** Probes `P7b` (with `translate`, and with `left` and `top`): the box is at `[80, 60]` at release and at `[20, 20]` after, in all three engines, and the log shows `end:accepted`. Probe `P7c` commits the same value in `onEnd`, after the release, and the box stays at `[80, 60]`. The prototype at `599684791` has the same capture and restore in `draggable/presentation.ts`, so production inherited this. drag2 had no free-drag behavior.
- **Required property.** A position committed in the hook the API names for committing is still in place after the operation ends, and the contract and README name that hook.

### A pending press outlives a lost `pointerup` (`challenge-2`)

- **Finding.** Suppose a press is admitted and its `pointerup` does not reach `document`. The session then stays pending. The next mouse hover past the threshold activates it with no button held, and the item is lifted and follows the cursor. Each later press is refused, and the stuck operation never ends.
- **Current behavior and contract.** The kernel listens for `pointerup` on `document` in the bubble phase. `#move` does not read `event.buttons`. `#press` declines while `#session` is set. While pending, the root has no pointer capture, so no `lostpointercapture` ends the press. After activation, a lost `pointerup` becomes a cancel through `lostpointercapture`. `drag:DRI-6` promises that "the next real press works". The development refusal counter counts only refusals by `#running`, so this refusal is invisible to the suite.
- **Why it is a problem.** A component that stops `pointerup` propagation is common in widget code and framework handlers. In this case, a valid page leaves a lifted item fixed to the cursor until the user presses `Escape`. The suite's `drag:DRI-6` check passed during this probe, so the instrument can't detect the failure (tier B).
- **Evidence.** Probe `P1`, with the stop on a child of the item or on an ancestor of the root: after a click below the threshold and a 60 px hover, the log is `["start"]`, `r0` is `:popover-open` with `translate(0px, 60px)`, and a later press and release elsewhere changes nothing. With no stop (`P1-none`), nothing activates. Probe `P1b`: root capture is `false` after the hover activation, and both presses land on the lifted item itself, because it follows the cursor. All three engines. drag2 also listens on `document` and doesn't read `buttons`, so this isn't new in this design. It breaks a guarantee this contract states.
- **Required property.** An operation never activates without the button that admitted it still held. A press whose release the library missed doesn't block the next real press.

### Nested roots share one pointer (`challenge-3`)

- **Finding.** With a sortable list of columns and a sortable list of cards in each column, a drag on a card starts both operations. The kernel lifts the card and its column, and neither list reorders.
- **Current behavior and contract.** `drag:DRD-1` makes the pass single per controller. The contract has no rule for two controllers that admit the same pointer. The press bubbles to both roots, each `admit` accepts, and each activation calls `setPointerCapture` on its own root.
- **Why it is a problem.** Nested sortables, such as a board with columns of cards, are a common consumer flow. The default composition gives a visible failure and no fault. The working setup is `data-drag-ignore` on every inner item. It works, because the inner controller tests only the hops before its own item, but neither the contract nor the README says so.
- **Evidence.** Probe `P2` with no ignore marking: `inner0:start:card01` and `outer:start:col0`, with `col0` and `card01` both lifted during the drag, then `inner0:end:noop` and `outer:end:noop`. With `data-drag-ignore` on the cards: only the inner list starts, and it ends `accepted`. All three engines.
- **Required property.** One pointer drives at most one operation across nested roots, or the contract states the consumer's obligation and how a consumer meets it.

### `Escape` also closes the containing dialog or popover (`challenge-4`)

- **Finding.** `Escape` during a drag inside a modal `<dialog>` or an open `popover="auto"` cancels the drag, and the platform's close request then closes the container.
- **Current behavior and contract.** `drag:DRI-4`: "`Escape` cancels with `origin: 'escape'`". `#onEscape` does not prevent the key's default. drag2 behaved the same.
- **Why it is a problem.** A reorderable list in a settings dialog or a menu is a valid flow. The user's one key both cancels the drag and dismisses the surface. To prevent this, a consumer must track "an operation is running" from `onStart` to `onEnd`, including a pending verdict, and prevent the key's default itself.
- **Evidence.** Probe `P3`: the container is closed after `Escape`, and the log is `start`, `end:canceled`, in all three engines. Probe `P3c`: a page listener that prevents `Escape`'s default keeps the dialog open, and the drag still cancels, in all three engines.
- **Required property.** The contract states whether an `Escape` that cancels an operation also reaches the platform's close request.

### A commit in `end` loses focus (`challenge-5`)

- **Finding.** A custom behavior that moves its item in `end` leaves focus on `body`. A second `ArrowDown` then does nothing, which is the defect `drag:DRD-9` set out to remove.
- **Current behavior and contract.** `drag:DRI-12`: "A reorder does not lose focus." `drag:DRI-18`: DRI-12 holds for a custom behavior "with no code from its author beyond its hooks". The kernel records focus at the drop and restores it at step 6 of `drag:DRI-9`. `end` runs at step 8.
- **Why it is a problem.** `end` is a hook of the public API. Nothing in the contract or the README says a reorder written there is outside the guarantee. A behavior author who reads DRI-18 will expect focus to be kept.
- **Evidence.** Probe `P4`: committing in `drop` keeps focus on `r0` through two presses, and the order becomes `r1,r2,r0`. Committing in `end` leaves `activeElement` with no id after the first press, and the order stops at `r1,r0,r2`. All three engines.
- **Required property.** The contract names the hooks whose reorders keep focus, or the guarantee holds for every hook in which a behavior may reorder.

### A grab during a landing moves the visual off the pointer (`challenge-6`)

- **Finding.** Pressing the item during its landing and dragging moves the visual by the flight that remained, so the item stops being under the point that was grabbed.
- **Current behavior and contract.** `drag:DRI-13` cancels a landing at the next activation. Activation cancels the landing first, and the lift then measures the item's layout slot. The press position was hit-tested against the animated visual.
- **Why it is a problem.** A quick re-grab is a normal interaction. When the landing returns home after a rejection or a cancel, the item jumps to its home slot, and the pointer is left far from it.
- **Evidence.** Probe `P5b` (rejected, a 2,000 ms flight, re-grabbed after 300 ms): the visual is about 78 to 81 px from where it was pressed, in all three engines. Probe `P5` (accepted, a short flight) shows the same effect at about 9 px.
- **Required property.** A grab during a landing keeps the visual where the pointer took it, or the contract states the jump as a limit.

### Link items cancel at a native drag (`challenge-7`)

- **Finding.** When the items are `<a href>` elements, moving the pointer starts the platform's own drag, and its `pointercancel` cancels the operation.
- **Current behavior and contract.** `drag:DRI-11`: "A press is never prevented." The `draggable` JSDoc and the README name `touch-action` and `user-select` as the consumer's obligations. They don't name native drag.
- **Why it is a problem.** A reorderable list of links, such as tabs or bookmarks, is a valid flow. With no setting it fails: the drag either cancels at once or never starts.
- **Evidence.** Probe `P6`: in Chromium the log is `start`, `end:canceled`, after `dragstart` and `pointercancel`. In Firefox nothing starts, because the native drag begins before the 8 px threshold. In WebKit under Playwright no native drag happens, and the reorder succeeds. With `draggable = false` on the links, all three engines reorder.
- **Limit.** Playwright intercepts native drags in Chromium, so real-browser timing is not established.
- **Required property.** The contract or the README states the obligation for elements that are natively draggable, or the library covers them.

### Free drag ignores a scroll during the drag (`challenge-8`)

- **Finding.** `localDeltaX` and `localDeltaY` are pointer travel converted with the activation-time `visualSpace`. If a scrolling ancestor scrolls during the drag, committing them puts the element away from where it was dropped by the scroll distance.
- **Current behavior and contract.** `drag:DRI-16` lists scrolling containers as a required environment. The README tells a consumer to commit `localDeltaX` and `localDeltaY`. Auto-scroll is out of scope, so scrolling by the wheel is how a user reaches a far target.
- **Evidence.** Probe `P7d` (commit in `onEnd`, to avoid `challenge-1`): the visual is at top `60` at release, and the committed element is at `-40` after a 100 px `scrollTop` change, in all three engines.
- **Required property.** The free-drag request gives a value that keeps a committed element where it was dropped in a scrolled container, or the documentation says what `localDelta*` excludes.

## Hypotheses, from reading only

None of these was run.

- **No activation by time.** Activation needs a `pointermove` that crosses the threshold, and `activate` can only decline. A press-and-hold lift with no movement, the common touch pattern for lists that also scroll, can't be expressed. A behavior can only reject a move that comes too early. `drag:DRO-3` names `pointercancel` from touch scrolling, but not this gap.
- **`null` from a disposer that isn't destruction.** `drag.use` after release passes `this.#destroyed ? null : session.decision`. After a release below the threshold the decision is `null`. After a destroyed controller, a concluded operation also gives `null`. `drag:DRI-10` defines `null` as destruction.
- **Keys during a pending keyboard verdict.** `#command` returns before any admission when a session exists, so it prevents nothing, and the arrow key's default scroll runs while an asynchronous `onReorder` is pending.
- **A controller created again on each list change.** A framework effect that depends on the items destroys the controller while the verdict waits for the commit. Under `drag:DRI-10`, `onEnd` and the landing are then lost. The suite's React fixture keeps one controller, so this flow is untested.

## Challenged without a failure

- **`drag:DRI-6`, refusal by `#running`.** No trusted event was refused in any probe, across 60 runs in three engines. The finding in `challenge-2` is a separate path, which the counter does not see.
- **`Escape` with the default prevented by the page.** The kernel's cancel still applies (`P3c`).

## Questions for the authoring architect

1. **`challenge-1`:** Which hook owns a lifted behavior's commit? If it is the verdict, what does `drag:DRI-9` step 5 restore? If it is `end`, the free-drag JSDoc and README change. A commit in `end` shows no frame at home only while `end` runs in the decision's task, as `drag:DRI-9` step 8 requires.
2. **`challenge-2`:** Is "the button is still held" part of admission, of activation, or of both? Is a `pointerup` that never reaches `document` in scope for `drag:DRI-6`?
3. **`challenge-3`:** Do nested roots belong to the contract? If they do, which root wins, and is `data-drag-ignore` on inner items the published answer?
4. **`challenge-4`:** Is an `Escape` that cancels an operation consumed by the library, or is a dialog's close request the consumer's to stop?
5. **`challenge-5`:** Does `drag:DRI-12` cover a reorder in `end`, or does `drag:DRI-18` name the hooks it covers?
6. **`challenge-8`:** Is `localDelta*` meant to answer "where do I commit", or is it only pointer travel?

## Limits

- The probes ran the production source at `d7e7b0d3a` as the realization of the contract. A finding is attributed to the architecture only when the contract text requires or allows the behavior, as each entry states.
- Mouse input only. The browsers were headless, under Playwright. There was no touch, pen or physical device.
- In the first all-engine run, `P1b` and `P5b` timed out in Firefox at the harness's 15 s limit. The run recorded in `results.txt` passed in all three engines.
- The untracked `reviews/production/discipline-cleanup.md` belongs to another session and was not read.