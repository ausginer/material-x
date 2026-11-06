# Independent drag architecture experiment

An architecture experiment started from external requirements only. It is not a production implementation, it mints no decision, and it compares itself with nothing. **Status:** model stated, prototype run, revised; stopped before any comparison with the existing system.

- **Date:** 2026-11-05.
- **Input revision:** `1c25e576c`, branch `drag2/architecture-independent`.
- **Prototype location:** `bench/architecture-independent/`.

## Independence and its limits

The brief forbids reading the `drag` and `drag2` implementation, tests, contracts, plans, reviews, traces and relevant history, and I read none of them. The experiment is still not perfectly blind, and a reader weighing any similarity to the existing system should discount these exposures:

- **Commit subjects shown before any work began.** Session start-up printed `drag2: apply lifecycle requests at execution boundaries`, `drag2: reconstruct the execution flow from three profile traces`, and `drag2: replace seam, unwind and bracket in internal names`. The first names a concept directly relevant to requirement 6. My own answer to that requirement (§5) must be read knowing I saw that subject.
- **General repository rules.** `CONTRIBUTING.md` Part I, §0, §1.1 and §13, read as instructed, carry incidental vocabulary and examples: _admission, movement, settlement, teardown_; _a re-entry latch on a per-sample path_; _`resolve` returns a position in the list_; _a press that never activates_; _an unbounded animation duration hangs a gate_. I read those sections with lines mentioning drag filtered out, and did not read the rest of Part II.
- **`.gitignore`.** A comment names an ambient `__DEV__` declaration in the package. It has no bearing on this model.

## Part 1 — Initial model

Written and committed before any prototype code existed. Later parts append; this part stays as written.

### 1. The model in one paragraph

**A drag is a transaction over one proposed value.** The consumer owns the truth: the order of the list's children, or the resting position of the free element. A session holds that truth's `origin` and a `proposal`, and until the proposal is accepted nothing changes except inline `translate` styles derived from those two values. Accepting applies the proposal to the truth; rejecting or cancelling discards it. Animations are decoration over that derivation and hold no truth, so stopping them at any moment leaves the correct picture.

### 2. Four rules

Everything else in the model follows from these.

1. **Propose, do not mutate.** Nothing is reparented during a session. Neighbours are displaced with `translate`, and DOM order changes once, at acceptance. The cost of a pointer sample therefore cannot include layout, and cancellation has no DOM order to undo.
2. **Animations carry no truth.** The style is always written to its destination at once. A motion is then an additive animation (`composite: 'add'`) of the delta from the old destination to the new one, running down to zero. Both values are known to the model, so no animation needs a DOM read, and interrupted motions sum rather than jump. **There is therefore no "landing" state:** a session is over at its verdict, and the remaining motion is a tail nobody has to wait for.
3. **One input vocabulary.** The machine knows `lift`, `propose`, `drop` and `cancel`. Pointer and keyboard are two adapters that produce them. Geometry belongs to a behaviour (`free` or `sort`), and the machine knows neither.
4. **A callback is the last thing a transition does, and the first terminal event wins.** A transition makes state and DOM consistent, then calls at most one callback. So a consumer's `cancel()` or `destroy()` can run synchronously from inside that callback with nothing left over to corrupt: no queue and no deferred command is needed. The only code that runs after a callback returns is the handling of `decide`'s return value, and that handling is guarded by the session's `AbortSignal`.

### 3. States

| State | Means | Entered by | Left by |
| --- | --- | --- | --- |
| `idle` | No session. No library style on any list item. | Creation; any end of session | Press; keyboard lift |
| `pressed` | Pointer down, under threshold. Nothing visible, no callback, no layout read. | Primary-button press on an item or handle | Threshold crossed → `moving`; release or cancel → `idle` silently |
| `moving` | Proposal live, following input. | Threshold crossed; keyboard lift | Drop → `deciding`; cancel → `idle` |
| `deciding` | Input released, verdict awaited. Item held at the proposal. | Drop | Accept, reject or cancel → `idle` |
| `destroyed` | Terminal. Every command is a no-op. | `destroy()` from any state | — |

Tails are not a state. A new press is accepted while tails run; a press during `deciding` is ignored.

### 4. What cancellation restores

"Appropriate" depends on whether the truth has changed yet, and only one state boundary decides that:

| Cancelled during | Truth afterwards | Visual afterwards |
| --- | --- | --- |
| `pressed` | Unchanged; nothing had started | Unchanged; the press may still become a click |
| `moving` | `origin` | Back at origin; tail if motion is configured |
| `deciding` | `origin`; `signal` aborts; late verdict is ignored | Back at origin |
| After acceptance, while a tail runs | The accepted value. Not reverted | Tail stops, element is at its accepted position |
| `idle`, `destroyed` | No-op | No-op |

`destroy()` is `cancel()`, then stopping all tails, then releasing every listener. It never reverts an earlier accepted commit.

### 5. Callbacks: cancel, destroy, throw

Four optional callbacks. `onStart` doubles as the veto (call `cancel()`), so there is no separate guard.

```ts
type Outcome = 'accepted' | 'rejected' | 'canceled';

type Callbacks<Value> = Readonly<{
  onStart?(value: Value): void;
  onChange?(value: Value): void;
  decide?(value: Value, signal: AbortSignal): boolean | Promise<boolean>;
  onEnd?(outcome: Outcome, value: Value): void;
}>;

type Controller = Readonly<{ cancel(): void; destroy(): void }>;

declare function movable(
  element: HTMLElement,
  options: FreeOptions,
): Controller;
declare function sortable(list: HTMLElement, options: SortOptions): Controller;
```

| Callback | Calls `cancel()` or `destroy()` | Throws or rejects |
| --- | --- | --- |
| `onStart` | Session ends; `onEnd('canceled')` nests inside the call | `reportError`, then cancel |
| `onChange` | Same | `reportError`, then cancel |
| `decide` | Cancel wins over any returned verdict | `reportError`, then treated as rejection |
| `onEnd` | Session already over: `cancel` is a no-op, `destroy` proceeds | `reportError`; state is already `idle` |

- `decide` absent means accept. A synchronous boolean commits in the same task, without a microtask hop.
- After the signal aborts, a settled promise is ignored in both directions, including rejections. Reporting them would turn every `fetch(url, { signal })` abort into noise.
- Nesting `onEnd` inside `cancel()` follows the precedent of `AbortController.abort()` firing listeners synchronously. A queue would make callbacks non-nesting, but then `destroy(); list.remove()` from a callback would run the removal before the destruction.

### 6. Requirements versus chosen guarantees

**Necessary — the requirements ask for these directly:** pointer drag of a free element; pointer sort; independently optional landing and neighbour animation; keyboard reordering; synchronous and asynchronous accept/reject; restoration on cancel; release on destroy; survival of `cancel`, `destroy` and `throw` from callbacks.

**Chosen — guarantees I add, each of which could be dropped:**

| Guarantee | Why I chose it | Cost |
| --- | --- | --- |
| Exactly one `onEnd` for every `onStart`, including on `destroy` | Consumers can pair acquire and release | A callback fires during destruction |
| Commands are synchronous, including from inside callbacks | "After `destroy()` returns, it is released" holds everywhere | `onEnd` can nest; rule 4 must be held by discipline |
| No layout during `moving` | Efficiency priority | Geometry cached; layout change during a session is unseen |
| A press under threshold costs no layout and fires no callback | A click must stay a click, cheaply | Listeners attached per press |
| Scrolling during a session keeps item and proposal correct | Wheel while dragging is ordinary use | One rect read per scroll frame |
| Focus stays on the item across a commit | Otherwise keyboard reordering loses its place | One refocus; `focusout` fires |
| Click that follows a real drag is suppressed | A dragged handle must not also activate | A short-lived capture listener |
| Errors reach `reportError`, never swallowed, never rethrown into `cancel()`'s caller | Commands must always complete | Errors appear on `window`, not at the call site |

**Deliberately absent:** auto-scroll; cross-list transfer; grids and wrapping; constraints or bounds; drag preview clones; long-press activation; announcements (the consumer has every callback it needs); reduced-motion detection (the consumer passes no animation); late-mutation detection.

### 7. Efficiency budget

Stated as commitments so the prototype can refute them.

| Moment | Layout reads | Work |
| --- | --- | --- |
| `idle` | 0 | Two delegated listeners on the root. No per-item state, no registration |
| Press | 0 | Attach session listeners |
| Activation | One batched read, O(n) | Sort only. Free reads nothing |
| Pointer sample | 0 | O(log n) binary search, no object allocation; one `translate` write |
| Proposal change | 0 | O(\|Δ\|) writes, only for items whose displacement changed. Nothing when the proposal is unchanged |
| Scroll frame | 1 clean rect read | Re-project the last sample |
| Commit | One browser layout | One DOM move, O(\|from − to\|) style clears |

**Hit testing is memoryless.** `to` is a function of the dragged item's centre against midpoints measured at activation, never against displaced positions. So a pointer position has exactly one proposal, with no history to oscillate over. No `elementFromPoint`, no `requestAnimationFrame` batching (pointer events are already frame-aligned and a style write is cheap).

### 8. Keyboard

Modal, and the same transaction as a pointer drag: Space or Enter lifts, Arrow keys propose, Space or Enter drops, Escape or losing focus cancels. Only a key whose target is the item itself lifts, so a button inside an item keeps its own Space. The item must be focusable; that is a stated precondition rather than something the library adds.

**Rejected alternative:** `Alt+Arrow` committing each step. It avoids a lift step, but every keypress becomes a decision, so an asynchronous `decide` must either serialize presses or compose in-flight commits. That is a second transaction model for one input.

### 9. Assumptions

- One vertical, single-column list per controller. Items are the list's element children, or match a selector.
- **Uniform gap between items** while item heights may differ, so displacement can be predicted arithmetically. Otherwise the commit shows a small jump.
- Layout does not change during a session other than through scroll. A consumer changing it, or mutating the list while `moving` or `deciding`, calls `cancel()` first. That is a published precondition, not a runtime check.
- `touch-action` on the draggable area is the consumer's CSS. It cannot be set usefully once the touch has begun.
- `translate` is free for the library's use on these elements. Using it leaves the consumer's `transform` intact.
- A `decide` that never settles leaves the session in `deciding` until the consumer cancels. No timeout is added; `AbortSignal.timeout` is one line for a consumer who wants one.
- DOM order is applied by the library unless the consumer owns rendering, in which case the DOM is already reordered by the time `decide` resolves `true`.

### 10. Tradeoffs and rejected alternatives

| Alternative | Why it lost | What the model gives up |
| --- | --- | --- |
| Live DOM reordering per crossing | Layout on every crossing; capture and focus at risk; cancel must undo moves | Real reflow of neighbours during the drag |
| Native HTML drag and drop | Little control over the visual; no touch; keyboard still separate | Cross-window and file drags |
| Clone or ghost element | Extra node, style-copy problems, identity split | Freedom from the list's clipping and stacking context |
| Command queue (mailbox) | Deferred `destroy` breaks the "released on return" property | Callbacks that never nest |
| A `settling` state | Blocks input on decoration and needs its own cancel path | A single moment meaning "visually finished" |
| CSS transitions for motion | Consumer CSS can defeat them; `transitionend` may never fire; completion needs a fallback | Styling motion from a stylesheet alone |
| `getComputedStyle` retargeting | A read per interruption | Exact velocity continuity; additive motion is only continuous in position |

### 11. Hypotheses the prototype must test

| Id | Claim | Falsified by |
| --- | --- | --- |
| H1 | No layout during `moving`, and sample cost is independent of list size | Any layout in a sample; per-sample cost growing with n |
| H2 | Additive motion is position-continuous when interrupted and **across the commit's DOM move** | A jump above one frame's expected travel, or a lost animation |
| H3 | No `settling` state is needed | Any visible or logical defect needing a state to fix |
| H4 | Rule 4 alone keeps every `state × callback × {cancel, destroy, throw}` cell sound | Stuck state, leftover style or listener, late effect, wrong `onEnd` count |
| H5 | Predicted displacement equals real post-commit layout under uniform gap | A residual above half a pixel |
| H6 | Keyboard needs no machine path of its own | A machine branch on input kind other than the adapters; lost focus |
| H7 | One rect read per scroll frame keeps item and proposal correct | Item leaves the pointer, or proposal is wrong, after scroll |
| H8 | Capture from activation, not press, leaves clicks intact and suppresses only the post-drag click | A lost plain click, or a delivered post-drag click |

### 12. Risks I expect

- **Stacking during a tail.** A dragged item has to paint above later siblings, and that style lives on a session that rule 2 says is already over. This is the most likely way H3 fails.
- **Re-grab during a tail.** `getBoundingClientRect` sees running animations, so activation must stop tails before measuring. A re-grabbed item would then visibly snap.
- **Tail destinations are only as good as H5.** The commit-spanning property assumes the prediction was exact.
- **`insertBefore` may disturb a running animation** on the moved element, which would break H2 at its most important moment.

## Part 2 — Prototype and results

Appended 2026-11-06. Part 1 above is unchanged; where the two disagree, this part and Part 3 win.

**What was built.** `bench/architecture-independent/drag.ts` holds the machine and both behaviours. `lab.ts` holds fixtures, misbehaving consumers and a live-reorder control. `probe.ts` drives them over CDP with real pointer, wheel, touch and key input.

- **Run it:** `node bench/architecture-independent/probe.ts [H1,H2,…]`, from a checkout whose `node_modules` holds Playwright.
- **Environment:** Chromium 156.0.8078.4, headless, on one machine. No other browser ran.
- **Evidence:** `bench/architecture-independent/results.json` holds the last full run: 61 of 61 checks pass.

That figure describes the prototype after the changes in Part 3. It does not mean the initial model passed. Several hypotheses failed first.

### Verdicts

| Id | Verdict | Evidence |
| --- | --- | --- |
| H1 | **Falsified, then replaced.** Neighbours trigger layout, and cost is not independent of list size | Table below |
| H2 | **Held.** | Frame-to-frame travel stayed at 1.00× the expected speed for a landing across the DOM move (`after()` does not disturb a running script animation) and for a neighbour mid-tail across the commit; 1.00× when retargeted repeatedly; 1.10× when rejected mid-landing |
| H3 | **Partly falsified.** No logical state is needed; a presentation duty does outlive the session | Change 2 |
| H4 | **Held,** with one correction to what counts as a callback (change 3) | 240 callback cells, 48 pending-verdict cells, 4 commands while moving, a late verdict arriving during the next session, and 3,000 random operations against a reference order: no violations |
| H5 | **Held within its assumption.** The assumption's consequence was understated | 0 px residual for equal, varied and fractional heights and for uniform block margins. **30 px** for non-uniform margins, where Part 1 said "a small jump" |
| H6 | **Partly falsified.** The machine is shared, but two keyboard defects appeared | One `pointerId === -1` test separates the adapters and nothing else branches on input kind. See changes 4 and 5 |
| H7 | **Held.** | After a 340 px wheel scroll, in an element and in the window, the item centre stayed exactly under the pointer and the commit used the scrolled proposal. One layout, from the first displacement |
| H8 | **Held,** after a guard was reshaped (change 6) | Plain, under-threshold and later clicks are delivered; post-drag clicks are suppressed, including a release after a mid-drag cancel. The `dragstart` guard is **not established**: see below |

Beyond the hypotheses:

- **Idle cost:** two root listeners, none per item, none global.
- **Session cost:** ten global listeners while a session runs, back to baseline afterwards.
- **After destruction:** no library listener remains, and a destroyed list is collectable.
- **Touch:** a real touch drag commits. A browser pan under `touch-action: pan-y` arrives as `pointercancel` and restores cleanly.

### Cost measurements

Medians of three runs of 300 real pointer moves oscillating over about nine items. Values are per move except layouts, which are totals for the run. Pointer-move events matched samples one to one. `flip` is the initial model as written. `seed` and `sticky` are the fixes tried. `control` reorders the DOM live, tuned fairly: it moves the neighbour rather than the dragged node, so it keeps capture, and it reads two rects per sample. **The control has no animation**, so it says nothing about FLIP costs.

| Items | Arm | Layouts | Layout µs | Style µs | Script µs | Task µs (range) |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | `flip` | 33 | 10 | 65 | 86 | 1199 (1109–1691) |
| 20 | `seed` | 0 | 0 | 63 | 86 | 1158 (1155–1885) |
| 20 | `sticky` | 5 | 1 | 61 | 82 | 1185 (991–1423) |
| 20 | `control` | 32 | 9 | 54 | 83 | 1102 (1019–1708) |
| 2000 | `flip` | 33 | 177 | 166 | 85 | 1682 (1381–2066) |
| 2000 | `seed` | 0 | 0 | 354 | 90 | 3141 (2827–3686) |
| 2000 | `sticky` | 5 | 23 | 178 | 82 | 1405 (1391–2066) |
| 2000 | `control` | 32 | 184 | 174 | 100 | 1795 (1477–2170) |

How to read it:

- **Task time is dominated by things this harness cannot separate,** and one arm's task time varies by up to about 50% between runs. Only differences larger than that mean anything: `seed` at 2000 items, and the layout column.
- **Script is flat with list size, and style is not.** Style triples for a hundredfold list because of work the browser does, not library code. The sibling walk during style recalculation is the probable mechanism; I did not verify it.
- **Layout has a definite cause, established by the arms.** An item crossing between `translate: none` and a value costs a layout. About 1.6 ms per crossing at 2000 items.

**Activation** costs 0.25–0.7 ms of script at 20 items and 2.4–6.8 ms at 2000, across all runs. **A plain press and release** forces no layout at any size.

**Size,** minified and gzipped with esbuild, experiment arms included: 2.6 kB for everything, 2.3 kB for `sortable` alone, 1.6 kB for `movable` alone. `movable` still carries the keyboard adapter and scroll handler, because they live inside the shared machine. Tree-shaking cannot remove them.

### Do the probes discriminate?

A passing check only means something if it can fail, so I removed five guards from `drag.ts` in turn. The file was restored by checksum after each run.

| Guard removed | Result |
| --- | --- |
| Click guard | H8.c and H8.f fail. The undelivered click at the button in H8.c shows capture retargets it to the item |
| `composite: 'add'` replaced by `replace` | H2.d, H2.f and H2.i fail, with jumps of 22–44× expected travel. **H2.a still passes,** so it does not itself establish that additivity matters |
| Stale-verdict signal checks | H4.b and all three H4.g fail. Without them a late verdict **ends the following session**. The idle check in `finish` is not enough, which is why H4.g exists: I first ran this mutation without it and only saw an error-count difference |
| `tails.stop()` before measuring | H3.b fails, with a 21 px error in cached geometry |
| `dragstart` prevention | **Nothing fails.** H8.g passes without the guard, so CDP input apparently does not start a native drag here. The guard is unproven, and `selectstart` prevention has no probe at all |

## Part 3 — What changed

### Changes forced by a probe

1. **"No layout during `moving`" is withdrawn, and with it the main efficiency argument for rule 1.** This is the largest result of the experiment.
   - I expected transform-only sorting to beat live reordering categorically. As first modelled it did not: `flip` and the control are indistinguishable on every column at both sizes.
   - **Tried `seed`**, holding every item non-none for the session: zero layouts, but about twice the style and task time at 2000 items. Its numbers are worse overall, so it is rejected.
   - **Adopted `sticky`:** an item stays non-none from its first displacement until the session ends, and a contiguous range records what to clear. Layouts become bounded by distinct items touched rather than by crossings. That is about 8× less layout time than the control at 2000 items, with style unchanged and task time within noise.
   - **Consequence:** rule 1 now rests on lifecycle grounds. Cancellation has no DOM order to undo, nothing can lose capture or focus mid-drag, and neighbour motion needs no reads. Efficiency is a modest gain at large sizes and no gain at small ones.
2. **Elevation outlives the session.**
   - Predicted in §12, and missed by my first probe. H3.a passed because unpositioned siblings paint beneath any stacking context. Once items were `position: relative`, ordinary consumer styling, the landing item painted under item 4.
   - **Fix:** `data-dragging` is removed when the element's tails end, through a small `whenStill`. It runs synchronously when tails are stopped, so a late animation event cannot touch a newer session.
   - **Verdict:** rule 2's "no landing state" survives as logic, not as a complete statement. Decoration can owe a cleanup, and the tail set has to own it.
3. **Keyboard steps do not animate the dragged item.**
   - `scrollIntoView` reads the animated box. With rapid key presses the item's earlier tails kept it apparently in view, and it finished 1,700 px outside the scroller.
   - **Fix:** the item jumps and its neighbours still animate. The requirements only ask for these animations on pointer sorting, so this removes a guarantee nobody asked for.
4. **Focus is recorded at lift, not read at commit.** A consumer-owned DOM move blurs the item before `commit` runs, so reading `activeElement` there finds nothing to restore.

### Changes found while writing, before any probe

5. **The `AbortSignal` could not do all three jobs in rule 4.** One signal as listener scope, consumer signal and stale-verdict guard would abort on acceptance too, firing a consumer's rollback listener on success. It is now two controllers: the listener scope always ends, and the decision aborts only on cancellation. **An abort listener is also a second consumer callback in a terminal transition,** so rule 4's "at most one callback" is false as written. It runs after the state is consistent and before `onEnd`, and H4.d confirms `destroy()` from there is sound.
6. **The click guard cannot belong to the session.**
   - A session cancelled with the button still held must still swallow the click at release. So the guard arms at activation and lives until that pointer's release, on its own controller tied to the controller's lifetime.
   - **The fuzz then found a real bug in it:** the guard compared against the machine's current `pointerId`, so a keyboard session started meanwhile left it listening forever. It now keeps its own pointer identity.
   - **A consequence I chose:** destroying mid-drag releases the guard too, so the later release does deliver a click (`H8.destroyMidDragThenRelease`). "Destroyed means released, on return" won over click suppression.

### Corrections to Part 1's tables

7. **`destroyed` is not a state.** Aborting the root listeners makes every command a natural no-op, so §3 has four states, and no flag was needed.
8. **`cancel()` after acceptance does not stop a tail.** §4's row contradicted its own `idle` row. Cancel is a no-op on an idle controller, the tail finishes at the accepted position, and only `destroy` stops tails.
9. **A consumer's own `releasePointerCapture` is not seen at once.** The platform defers it to the next pointer event, so restoration waits for that event.

### Revised rules

1. **Propose, do not mutate.** Justified by lifecycle simplicity, with bounded rather than zero layout.
2. **Animations carry no truth.** Stopping them is always safe, but the tail set owns the cleanups that decoration needs.
3. **One input vocabulary.** Unchanged, apart from keyboard steps not animating the dragged item.
4. **Consumer code runs only after the state is consistent, and the first terminal event wins.** "At most one callback" is dropped: an abort listener and then `onEnd` may both run.

The model stayed understandable through all of this. It still has four states, one `finish`, and one place where code follows a callback. No change added a state or a queue.

### Probe changes a reader should check

I changed expectations in these places, so a passing row should not be read as an unmoved goalpost:

- **H1.a** now requires layouts bounded by touched items, because the original claim was false. The `flip` arm in the table preserves the original result.
- **H1.b** covers script only. Style growth is reported above, not asserted.
- **H2.b** turned out to measure a neighbour with no running tail. I renamed it and added H2.i for the case it was meant to cover.
- **H3.a** was strengthened by making items positioned.
- **H4.a** had two artefacts. On keyboard, a final Space after a mid-session cancel is correctly a new lift, so the gesture no longer presses it. On the free element, an inline `0px 0px` serializes as `0px`.
- **H4.c,** for a consumer's capture release, now observes after the next pointer event (change 9).
- **H4.g** was added after a mutation showed nothing covered a late verdict arriving during the next session.
- **H8.g** still passes but proves nothing about native drag, as the mutation table shows.
- **The H2 and H7 thresholds** (1.6×, 2.6×, 6.5×, ±1 slot) were set before the first run. Observed values are far inside the first three and exact for the fourth.

## Part 4 — Untested

**Platform**

- **Firefox and WebKit, entirely.** That includes additive `translate` animation, animation survival across a DOM move, the click guard's `setTimeout` expiry, `dragstart`, and the deferred capture behaviour. Every result above is Chromium's.
- **Paint, compositing and frame timing on real hardware.** The harness measures main-thread metrics headlessly, and `seed`'s task-time penalty is the only paint-sensitive signal. **"No object allocation" in a sample** is by inspection only (one string per write) and was not measured.
- **Real hand input.** Moves arrive over CDP. Real pointer cadence, coalescing and pen were not exercised. Touch was synthetic. **A real native drag or text selection could not be provoked,** so those two guards are unproven.

**Consumer environment**

- **Shadow DOM.** `document.activeElement` returns the host and `closest` stops at the boundary, so focus retention and handle matching are expected to fail inside a shadow root as written.
- **Framework rendering.** A re-render during `moving` or `deciding` can wipe inline `translate`. Only a same-task consumer DOM move was tested.
- **Scaled or zoomed ancestors.** Pointer deltas are written as `translate` pixels, which is wrong under an ancestor `scale`.
- **Assistive technology and `prefers-reduced-motion`.** The first is left to the consumer's callbacks, the second to the consumer passing no motion. Neither was exercised.
- **Native `<button>` items.** Activation on Space keyup after a keyboard drop is untested. Only an inner button and `tabindex` items were.

**Stated assumptions, not exercised**

- Consumer mutation of the list, or layout change, during a session. Accepting after a neighbour was removed would throw from `after()`. That is a published precondition, but its failure path was not tried.
- Horizontal lists, grids, wrapping, RTL and writing modes, cross-list transfer, auto-scroll.
- Free-element scroll compensation is **not implemented**; `rescroll` is empty for `movable`.

**Open design questions the experiment did not settle**

- **Non-uniform gaps.** A 30 px jump at commit is not small. Reading real positions after the DOM move and playing the difference as a correcting tail looks cheap, since that layout happens anyway. It was not tried.
- **Very large lists.** Activation at 2000 items is several milliseconds; 10,000 was not measured.
- **A "visually finished" signal.** The model offers none, and a consumer wanting one has only their own timer.
- **A stale `cancel()`.** A cancel from an earlier session's closure hits the current session, because `cancel` belongs to the controller. The value object is also reused per controller, so a consumer must copy it to keep it past `onEnd`.

## Part 5 — Verification and handoff

- **Typecheck:** `tsc -p bench/architecture-independent/tsconfig.json` is clean.
- **Formatting:** `oxfmt` ran on all changed files.
- **Lint:** surviving `oxlint` findings are listed below rather than resolved by hand. `eslint` also reports two `prefer-destructuring` errors, one each in `drag.ts` and `probe.ts`. Markdown is unsupported by `oxlint`. The last full probe run followed the last lint-fix, and `drag.ts` matches its pre-mutation checksum.

| File | Rule | Count |
| --- | --- | --- |
| `probe.ts` | `no-await-in-loop` (real input is sequential by nature) | 175 |
| `probe.ts` | `max-depth` | 33 |
| `lab.ts` | `no-bitwise` (fuzz PRNG) | 11 |
| `probe.ts` | `no-console` | 5 |
| `drag.ts` | `no-multi-assign` | 4 |
| `probe.ts` | `no-unsafe-member-access` | 2 |
| `lab.ts` | `no-use-before-define` | 2 |
| `drag.ts`, `probe.ts` | `no-bitwise` | 1 each |
| `drag.ts` | `no-use-before-define` | 1 |
| `lab.ts` | `no-mutable-exports`, `operator-assignment`, `no-multi-assign` | 1 each |

**Scope and limits.** Prototype only: no existing file changed, and neither implementation was imported. Independence is qualified by the exposures listed at the top. No decision was minted.

**Stopping boundary.** Per the brief, this stops before any comparison with the existing system. The one bounded next task, if the owner wants it, is that comparison, taking Part 3 as the claims to compare rather than Part 1.