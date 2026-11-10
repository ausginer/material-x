# The `items()` copies under CONTRIBUTING §1.1

**Status, 2026-11-08: decided as `DRD-31`** in [`00-index.md`](00-index.md). The contract's `DRI-14` carries the consistency rule, and [`items-borrowing-handoff.md`](items-borrowing-handoff.md) implements it. The owner directed that the copies be removed, with the home gap saved at activation and at every rebase. This record is the evidence. Where it disagrees with `DRD-31` or `DRI-14`, those win.

**Revisions:**

- **At `57ddf4b89`,** on the owner's two questions about synchronous reentrancy and a cancel before the drop. The home is saved at every kept pull (§3), not captured at the drop. The rule is stated against the library's reads (§4), not against the current task.
- **At `357169a71`,** on the owner's keyboard case. A command runs `start` and its drop synchronously, so "one task, microtasks included" is not enough when the change starts in `onStart`. §4 now distinguishes code the library called from code it didn't, §5 and §7 add the keyboard cases and witnesses W4 and W5, and §8 separates supported use from use outside the contract.

**Read at:** `357169a71` on `drag/production`, from the commit's tree with `git show`. `src/` is the same as at `4e8ada3ec`, where the first version was read. The owner's uncommitted edits to `src/sortable/layout-animation.ts` and `src/free-drag.ts` were not read and were left as they were. Neither file reads the collection.

**Method:** reading only. No suite, probe or measurement ran. Each claim is marked:

- **[E]**: established by a recorded run or by the contract's text, with its source.
- **[R]**: a hypothesis from reading the source, which needs a test to become established.

**Governing rules:** CONTRIBUTING §1.1, especially its gate (a) and its rule that a precondition counts only when the integrator can meet it and find it, and §9. `DRI-1`, `DRI-2`, `DRI-8` and `DRI-14`, `DRD-25`'s third bullet, and `SortableConfig.items`'s documentation, which says "Each pull copies the returned array, so the consumer keeps its array and may change it at any time."

## 1. What the algorithm reads, and when

`#pull` (`sortable.ts:514–517`) copies on every call. It has three callers. [R] for the whole section.

| Pull | Kept until | Reads of `snapshot.items` | Consumer code inside a reading step |
| --- | --- | --- | --- |
| Admission, `#admission` (`:528`) | The end of the call. The admission's `state` doesn't keep it | `includes` over the event path, then `keyboardInsertion` for a command | `config.handle`, `config.visual` and `config.box` |
| Activation, `activate` (`:424`) | The next pull or the operation's end, as `operation.snapshot` | In the activation step: `includes`, and the home or keyboard gap. In each frame step: `y` and `xy`'s `resolve` and `moved`, and `RectIndex.refresh` when the version changed or the cache is dirty. In the pointer drop step: `resolve` again, and `indexOf` in `buildReorderRequest` (`:206`). At `settle`: `homeInsertion(this.snapshot, item)` (`:339`) | `config.box` inside `refresh`. The placeholder element's reactions inside `movePlaceholder`, which runs before `moved` |
| Rebase, the `invalidate` step (`:399`, `:236`) | As for activation | `reconcileCollection` reads only the new pull and the gap's two neighbors | As for activation |

**The axis caches assume that a version names a fixed list.** `RectIndex` re-measures only when the version changed or the cache is dirty (`rect-index.ts:110`). `LinearShift.moved` advances slots by index while the version is unchanged (`linear-shift.ts:125`). The library mints the version at each pull. The copy also makes the library the owner of the list behind each version.

**The read at `settle` is the one that runs after foreign code the library doesn't sequence.**

- It runs in whatever pass applies a decision. That includes a pass entered synchronously by `requestCancel()`. A request made while no pass runs applies before the call returns [E: `DRI-1`].
- `movePlaceholder` uses only the gap's `before` and `after` (`placement.ts:55–94`).

## 2. Scenarios

"Alias" means `#pull` keeps the returned array without copying it, and changes nothing else.

| Scenario | Class | With the copy | With an alias and nothing else |
| --- | --- | --- | --- |
| Between drags, or during a press, the consumer changes its array in place | Normal model update | Correct | Correct. No retained pull is read [R] |
| The consumer changes its array in place in `onReorder`, the verdict is pending, and then `Escape` arrives. This is the witness, `sortable.browser.test.ts:100` | Normal model update, then a user event | Lands at home [E] | **Lands at the destination.** The witness failed in Chromium, Firefox and WebKit with `#pull` returning the array uncopied: `expected 80 to be less than 1` [E: [composition report](composition-report.md) line 59] |
| During a drag, the consumer changes its array in place, calls `requestCancel()`, then updates the DOM and calls `invalidate()`, all in one task. This is the owner's case | Normal model update, then a cancel | Lands at home [R] | **The `settle` read sees the changed array while the DOM is still old.** A row added next to the item becomes an anchor outside the container, so `movePlaceholder` throws `sortable/anchor-outside-container`. The kernel reports it as a later fault, and the outcome stays canceled. A reordered neighbor gives a wrong landing target instead [R] |
| As the witness, but the consumer reverts its array in a listener on the verdict's `signal` | Normal model update | Correct | Correct. `#conclude` aborts the verdict before `settle` (`kernel/session.ts:571–579`) [R] |
| During a drag, the consumer returns a new array, and calls `invalidate()` once the DOM shows the change | Normal model update | Correct. The copy duplicates an array the library already owns alone | Correct [R] |
| During a drag, the consumer changes its array in place, and the DOM and `invalidate()` follow before the next frame or pointer event. Lit, Vue, Svelte and Solid render synchronously or in a microtask | Normal model update | Correct | Correct, unless a cancel comes between the change and `invalidate()`, as in the owner's case [R] |
| During a drag, the consumer changes its array in place, renders in a later task or frame, and then calls `invalidate()` | Normal model update with a deferred renderer | Correct. The old copy and the old DOM agree until `invalidate()` [R] | **Wrong for every frame in between.** `resolve` reads the new array against the old version's geometry. The placeholder can go to a wrong gap, or to an anchor not yet in the container, which faults and cancels the drag [R] |
| The consumer changes the collection during a drag and never calls `invalidate()` | Misuse under `DRI-14` | Stale, but each version is consistent | Stale and inconsistent. Both are outside the contract |
| The consumer changes the array inside `handle`, `visual`, `box` or a placeholder callback | Misuse | Unaffected | Can change a read in the same step |
| Scroll, resize, pointer capture, focus or the top layer | Platform | — | — |

**No user or platform event changes the array.** A user event reaches the array only through the consumer's own handler, which is then a normal model update.

## 3. Home before and after the drop

**Today the home is read from `this.snapshot` at `settle`** [R]. The snapshot is the activation pull, or the last rebase pull, so:

- **A cancel before the drop** lands at the item's neighbors in that pull. After a rebase, these are the neighbors in the new collection. This covers a lost adjacency or a removed item, which cancel inside the rebase step after `this.snapshot = next` (`:239`).
- **A cancel or a reject after the drop** lands at the neighbors in the last pull before the drop. `DRI-14` says a collection change after the drop no longer affects the operation [E]. `invalidate()` after the drop does nothing, because its step receives `null` [E: `DRI-8`].

**Proposed: save the home gap at every pull the operation keeps, and read only the saved gap at `settle`.** At activation and in `rebase`, `home = homeInsertion(pull, item)`, computed from the same pull that becomes `this.snapshot`. `#landingTarget` reads `this.home` and never `snapshot.items`.

- **Before the drop:** the saved gap is the latest pull's. That is the value today's `settle` read computes from the copy, so the established cancel behavior is kept, rebases and collection updates included [R]. A removed item's rebase saves `homeInsertion(next, item)` with `from` equal to `-1`, as today's read does. So that path is kept as it is, and it isn't examined further here.
- **After the drop:** the saved gap is still the last pull's, because nothing pulls after the drop. No read touches the array after the drop, so `onReorder` and later code may change it freely.
- **In the owner's case:** the cancel lands at the gap saved from the last pull, which matches the DOM at that moment. The later `invalidate()` finds the operation ended and does nothing [R].
- **Cost:**
  - **A pointer activation:** its first `insertion` is `homeInsertion(snapshot, item)`, which is never written in place, so the same object can serve as `home`. That adds no allocation.
  - **A command activation** adds one `Insertion`.
  - **Each rebase** adds one `Insertion`.
- **Not taken:** taking the request's `from` from the saved gap's index. `buildReorderRequest` keeps reading the retained array at the drop, where `DRI-14`'s rule makes it consistent. W4 guards a `from` taken from an older pull.

**Why not at the drop, as the first version proposed:** a cancel before the drop has no drop, and its `settle` would still read the array. That is the owner's case.

## 4. The consistency rule

With §3, the library reads a retained array only in these places [R]:

1. **In the step that pulls it:** activation or rebase.
2. **In a frame step:** an animation-frame callback.
3. **In a pointer drop step:** a `pointerup`, which may be a synthetic one that someone dispatches.
4. **In a command's drop step,** in the same synchronous pass as its activation and `start`. `buildReorderRequest` reads `indexOf` there (`sortable.ts:206`).

It doesn't read the array in a cancel, a verdict completion, `settle`, release, `end` or destruction. Before the drop, no microtask of the library's reads it, because a verdict exists only after the drop.

**Why "one task, microtasks included" fails.** The owner's case [R]:

1. A command activates.
2. `onStart` changes the retained array in place, and schedules rendering and `invalidate()` in a microtask.
3. When `onStart` returns, the same pass runs the drop, which reads the changed array before that microtask.

The request's `from` then comes from the changed array, while its `to` comes from the activation pull. When the two are equal, the drop is taken as a no-op.

**The condition is whether the library can read the retained array before consistency is restored.** Consistency means the array changed, the DOM showing the change, and `invalidate()` called. Who is running decides the answer:

- **Code that the library called.** This is `onStart`, the placeholder factory, or a listener that a library DOM write triggers synchronously, such as focus or `beforetoggle`. The library continues the drag when the code returns, so the change must be complete by then.
  - An `invalidate()` called there is a deferred step. It runs before the library's next step [E: `DRI-2`], so it runs before a command's drop.
  - A microtask is too late.
- **Code the library didn't call.** This is the consumer's event handler, a timer, or an `await` continuation. The library next runs for a frame, for a pointer event, or for the consumer's own call.
  - The event loop delivers a frame callback or a trusted `pointerup` only after the current task and its microtasks. So the change can be completed in microtasks the code queues.
  - **An `await` is not the criterion.** What matters is whether a frame or pointer event can reach the library between the change and `invalidate()`. Changing the array after the `await` and completing in the same continuation is fine. Changing it before an `await` that waits on a timer, the network or a frame is not.
  - A `requestCancel()` or `requestDestroy()` before `invalidate()` reads nothing, with §3 [R].
- **`handle`, `visual`, `box`, and the placeholder element's own callbacks.** These run in the middle of a read, so an in-place change there is read in that same step.

**When replacement is required:** whenever the in-place condition can't be met. The consumer leaves the retained array unchanged, makes later `items()` calls return a new array, and calls `invalidate()` once the DOM shows the change. Until then, the library reads the retained array, which still matches the DOM, so rendering can be deferred freely. Typical cases:

- rendering scheduled from `onStart` or from another library callback;
- a renderer that commits in a later task or frame;
- a list that renders from its own animation frame;
- a store batched by a timer;
- a shared array that code the integrator doesn't sequence with `invalidate()` changes in place.

Returning `[...model]` from `items()` always meets the rule. That is the consumer's copy, made where the consumer knows it is needed.

**The wording is the contract's `DRI-14`.** `SortableConfig.items`'s documentation and the README carry a short form of it, written in the handoff.

## 5. Lifecycle cases

| Case | What answers it | Expected |
| --- | --- | --- |
| Press that never activates | The admission array, read only in its call | No copy, no rule [R] |
| Pointer activation, `Escape` before the drop, no change | The home gap from the activation pull | As today [R] |
| Pointer activation, and `onStart` completes an in-place change with `invalidate()` before it returns | The rebase runs after the activation step, before any frame | As today [R] |
| Command, with no change | The home gap and the keyboard target from the activation pull | As today [R] |
| Command, and `onStart` completes an in-place change with `invalidate()` before it returns | The rebase runs before the drop [E: `DRI-2`]. The request comes from the rebased pull | `from` and `to` index the new collection, as today with the copy [R]. Witness W4 |
| Command, and `onStart` replaces the array and defers rendering and `invalidate()` to a microtask | The drop reads the unchanged retained array. The late `invalidate()` finds the drop done and does nothing [E: `DRI-8`] | The request describes the collection as last pulled, as today with the copy [R]. Witness W5 |
| Command, and `onStart` changes the retained array in place and defers to a microtask | Outside the contract | By reading, `from` comes from the changed array and `to` from the activation pull, so a no-op is possible |
| A change during the drag, by a new array or in place within the rule, then `invalidate()`. The gap survives, then `Escape` | The home gap from the rebase pull | Lands at the item's current neighbors, as today [R]. Witness W3 |
| The same, but the gap is lost or the item removed | The home gap saved in that rebase, read in the same pass | As today [R] |
| The owner's first case: change in place, `requestCancel()`, DOM, `invalidate()` | The home gap from the last pull | Lands at home with no fault, as today through the copy [R]. Witness W2 |
| Drop, then a change in `onReorder`, a pending verdict, then `Escape` or a reject | The home gap from the last pull before the drop | Lands at home [E for the copy; R for the proposal]. Witness W1 |
| Accepted | No home: the destination | As today |
| Destruction | No `settle`, so no landing | As today [R: `DragDisposer`'s documentation in `kernel/drag.ts`] |

## 6. Gate (a) and cost

- **The admission copy fails the gate.** The array isn't kept, and the only consumer code between the pull and its reads is `handle`, `visual` and `box`.
- **With §3 and `DRI-14`'s rule, the activation and rebase copies also fail the gate.** Normal use doesn't need them, and the one style they protected has a meetable, findable alternative that the option states.
- **Cost, by reading, not accepted:**
  - **Saved:** one array of `n` references per pull. That is one pull per press that never activates, two per activation, and one per `invalidate()` during a drag.
  - **Added:** one `Insertion` per command activation and per rebase.
  - **Unchanged:** nothing changes per sample or per frame.
  - **Not measured:** the runtime share of either.

## 7. Witnesses

Each witness must pass at the handoff's base, where the copy carries it, and after the change. Each must fail against its stated mutation, applied to the changed source.

- **W1, existing:** `sortable.browser.test.ts:100`. **Mutation:** read the home from the retained array at `settle`. It fails [E for the equivalent state with the copy removed: [composition report](composition-report.md) line 59].
- **W2, a cancel between an in-place change and `invalidate()`.** One array, changed in place, with a landing composed, because only a landing reads the home. Grab an item and move it past the threshold within its home gap. Then, in one synchronous block:
  1. Insert a new row right after the item in the array.
  2. Call `controller.requestCancel()`.
  3. Insert the row into the DOM after the item.
  4. Call `invalidate()`.

  **Expected:** no fault is reported, and the result is canceled with origin `request`. **Mutation:** read the home from the retained array at `settle`. The new row is then an anchor outside the container, which throws `sortable/anchor-outside-container` [R].

- **W3, a rebase and then a cancel before the drop.** At least five rows, one array changed in place, and a landing composed.
  1. Drag `r1` to the gap between `r3` and `r4`.
  2. Remove `r2`, the item's next neighbor, from the array and the DOM, and call `invalidate()` in the same task. The gap survives, and the item's slot doesn't move.
  3. Press `Escape`.

  **Expected:** no fault, and at the flight's first frame the visual is where it was before `Escape`, as W1 checks. **Mutation:** save the home only at activation. Its `after` is then the removed `r2`, and `movePlaceholder` anchors on `after` first, so it throws [R]. Removing `r0` instead wouldn't discriminate.

- **W4, a command whose `onStart` completes an in-place change.** Rows `r0` to `r3`, one array that `items()` returns.
  1. Focus `r1` and press `ArrowDown`.
  2. In `onStart`: insert a new row `n` at the start of the array and of the DOM, then call `invalidate()`, all before returning.
  3. `onReorder` records its request, applies `insertBefore(item, next)`, and accepts.

  **Expected:** the request is `{ item: r1, from: 2, to: 3, previous: r2, next: r3 }`, the result is accepted, and no fault is reported. **Mutation:** take the request's `from` from a pull older than the rebase, for example the home gap saved at activation. `from` is then 1 [R].

- **W5, a command whose `onStart` replaces the array and defers.** The same rows, with `items()` returning the current value of a variable.
  1. Focus `r1` and press `ArrowDown`.
  2. In `onStart`: assign a new array with `n` first to the variable, leaving the retained array unchanged. Queue a microtask that inserts `n` at the start of the DOM and calls `invalidate()`.
  3. `onReorder` as in W4.

  **Expected:**
  - the request is `{ item: r1, from: 1, to: 2, previous: r2, next: r3 }`, from the retained array;
  - the result is accepted, and `onEnd` runs once;
  - the microtask's `invalidate()` changes nothing;
  - no fault is reported.

  **Mutation:** build the request from a fresh `items()` call at the drop. `from` is then 2 [R].

No witness is owed for removing the admission copy, or for use outside the contract.

## 8. Supported use and use outside the contract

**Supported,** under `DRI-14`:

- any change between drags, during a press, and from the drop on, including an in-place change in `onReorder`;
- an in-place change completed before the library can read again: before a library-called callback returns, or within the microtasks of code the library didn't call, with no frame or pointer event first. A `requestCancel()` or `requestDestroy()` may come in between;
- replacement, with rendering deferred as far as the consumer likes and `invalidate()` once the DOM shows the change;
- an `items()` that returns a fresh array on every call.

**Outside the contract,** and not detected:

- an in-place change that the library can read before `invalidate()`. Examples are a change in `onStart` that defers rendering or `invalidate()` to a microtask, and a change before an `await` on a timer, the network or a frame;
- an in-place change from `handle`, `visual`, `box` or the placeholder element's own callbacks;
- a change during a drag without `invalidate()`.

By reading, the outcome is a wrong gap for the frames in between, a request whose `from` comes from the changed array (so a command may become a no-op), or a `sortable/anchor-outside-container` fault that cancels the drag through the normal failure path.