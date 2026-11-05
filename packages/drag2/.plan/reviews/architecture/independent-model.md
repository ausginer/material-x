# Independent drag architecture experiment

An architecture experiment started from external requirements only. It is not a production implementation, it mints no decision, and it compares itself with nothing. **Status:** model stated; prototype not yet run.

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