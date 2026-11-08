# The `items()` copies under CONTRIBUTING §1.1

**Status, 2026-11-08: assessed by the architect, not decided.** No `DRD`, `DRF` or `DRO` entry is minted or amended. `DRD-25`'s copy bullet and `DRI-14` stand until the owner decides.

**Revised at `57ddf4b89`** on the owner's two questions: synchronous reentrancy, and a cancel before the drop. The revision replaces two parts of the first version:

- **"Capture the home neighbors at the drop."** They are now saved at every pull the operation keeps (§3).
- **"Before the current task ends."** The rule is now stated against the library's reads (§4).

**Read at:** `57ddf4b89` on `drag/production`, from the commit's tree with `git show`. `src/` is the same as at `4e8ada3ec`, where the first version was read. The owner's uncommitted edit to `src/sortable/layout-animation.ts` was not read and was left as it was. That file doesn't read the collection.

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
- **Optional:** `buildReorderRequest` can take `from` from `home.index`, which comes from the same pull. That removes an `indexOf` and the drop step's last direct read of the array.

**Why not at the drop, as the first version proposed:** a cancel before the drop has no drop, and its `settle` would still read the array. That is the owner's case.

## 4. The consistency rule

With §3, the library reads a kept array only in these places [R]:

1. **In the step that pulls it:** admission, activation or rebase.
2. **In a frame step:** an animation-frame task.
3. **In a pointer drop step:** a `pointerup` task, or a synthetic `pointerup` that someone dispatches.
4. **In a command's drop step,** in the same pass as its activation.

It doesn't read the array in a cancel, a verdict completion, `settle`, release, `end` or destruction.

**So "before the current task ends" is not the right boundary, in either direction:**

- **Too weak without §3.** A synchronous `requestCancel()` reads the array inside the task.
- **Narrower than needed with §3.** What matters is that no frame step or drop step runs between an in-place change and `invalidate()`. The event loop runs a frame callback or a trusted `pointerup` only after the current task and its microtasks. So a renderer that commits in a microtask meets the rule.

**The remaining synchronous reentrancy is consumer code that the library calls inside a reading step:**

- `config.box` during `refresh`.
- A placeholder element's reactions during `movePlaceholder`, which `moved` follows.

A change made there is read in that same step. `onStart`, the placeholder factory, the verdict's `onReorder` and its signal, `onEnd`, and focus or `beforetoggle` listeners run outside reading steps. A change made in one of them, with `invalidate()` called there, is applied before the next step [E: `DRI-2`]. That includes a command's drop.

**Proposed wording, for `SortableConfig.items` and `DRI-14`:**

> `items()` is called at each admission, at activation, and by `invalidate()` during a drag. The library keeps the array it returns and doesn't copy it.
>
> - **Between drags, during a press, and from the drop on,** you may change the array however you like.
> - **From activation until the drop,** call `invalidate()` after a change to the collection, once the DOM shows it, as today. If you change the array in place, call `invalidate()` before the next animation frame or pointer event, and don't change it from `box` or from the placeholder's callbacks. Changing the array, the DOM and calling `invalidate()` in one task meets this, microtasks included, even with `requestCancel()` or `requestDestroy()` between them.
> - **Otherwise, return a new array** from `items()`, and leave the old one unchanged.

**When a new array is required:**

- **The DOM commit comes in a later task or frame than the model change.** Examples are a renderer that yields or schedules, a list that renders from its own animation frame, and a store batched by a timer.
- **The array is changed in place by code that the integrator doesn't sequence with `invalidate()`.** Examples are a shared store that other code mutates, and an `await` that separates the change from `invalidate()`.
- **The change has to be made from `box` or a placeholder callback.**

Returning `[...model]` from `items()` always meets the rule. That is the consumer's copy, made where the consumer knows it is needed.

**Correctness traded:**

- **An integrator who keeps the rule** gets today's behavior [R].
- **An integrator who breaks it** gets a wrong gap for the frames in between, or a `sortable/anchor-outside-container` fault that cancels the drag through the normal failure path [R].
- **What the copy gives today:** it makes that deferred-renderer style correct. Under the rule, that style has to return a new array.

## 5. Lifecycle cases under the proposal

| Case | What answers it | Expected |
| --- | --- | --- |
| Press that never activates | The admission array, read only in its call | No copy, no rule [R] |
| Pointer activation, `Escape` before the drop, no change | `home` from the activation pull | As today [R] |
| Command | `home` from the activation pull. A change in `onStart` with `invalidate()` rebases before the drop step [E: `DRI-2`] | As today [R] |
| A change during the drag, by a new array, or in place within the rule, then `invalidate()`. The gap survives, then `Escape` | `home` from the rebase pull | Lands at the item's current neighbors, as today [R] |
| The same, but the gap is lost or the item removed | `home` saved in that rebase, read in the same pass | As today [R] |
| The owner's case: change in place, `requestCancel()`, DOM, `invalidate()` | `home` from the last pull | Lands at home with no fault. Today the same holds through the copy [R] |
| Drop, then a change in `onReorder`, a pending verdict, then `Escape` or a reject | `home` from the last pull before the drop | Lands at home [E for the copy; R for the proposal] |
| Accepted | No home: the destination | As today |
| Destruction | No `settle`, so no landing | As today [R: `DragDisposer`'s documentation in `kernel/drag.ts`] |

## 6. Gate (a) and cost

- **The admission copy fails the gate.** The array isn't kept, and the only consumer code between the pull and its reads is `handle`, `visual` and `box`. Removing this copy needs no new term.
- **With §3 and §4, the activation and rebase copies also fail the gate.** Normal use doesn't need them, and the one style they protect has a meetable, findable alternative that is stated on the option.
- **Without §4's term, the copies pass the gate** under "may change it at any time".
- **Choosing the term is a contract decision** (§1.1's last paragraph).
- **Cost, by reading:**
  - **The copy:** one array of `n` references per pull, with nothing per sample or per frame. That is one pull per press that never activates, two per activation, and one per `invalidate()` during a drag.
  - **The proposal:** at most one `Insertion` per command activation and per rebase.
  - **Not measured:** the runtime share of either.

## 7. Recommendation and witnesses

1. **Remove the admission copy, and change no consumer term.** Item 2 replaces the contract's sentence "each pull copies" in any case. Without item 2, the sentence would say that each pull the operation keeps is copied.
2. **The owner's choice: remove the activation and rebase copies, with §3's saved home and §4's wording.** I recommend it. If the term isn't accepted, keep these copies.
3. **Not recommended:**
   - Removing the copies without §3. The witness fails [E], and the owner's case faults [R].
   - Capturing the home only at the drop. That leaves the owner's case open [R].

**Focused witnesses for item 2.** Each must pass at `57ddf4b89`, where the copy carries it, and against the proposal. Each must fail against the stated mutation.

- **W1, existing:** `sortable.browser.test.ts:100`. **Mutation:** read the home from `this.snapshot` at `settle` with the copy removed. It fails [E for that state, recorded with the copy removed].
- **W2, the owner's case.** One array, which the test changes in place, and a landing composed, because only a landing reads the home. Grab an item and move it past the threshold within its home gap. Then, in one synchronous block:
  1. Insert a new row right after the item in the array.
  2. Call `controller.requestCancel()`.
  3. Insert the row into the DOM after the item.
  4. Call `invalidate()`.

  **Expected:** no fault is reported, and the result is canceled with origin `request`. **Mutation:** home read from the array at `settle`, which throws `sortable/anchor-outside-container` [R].

- **W3, a rebase and then a cancel before the drop.** At least five rows, one array, which the test changes in place, and a landing composed. Drag `r1` to the gap between `r3` and `r4`. Remove `r2`, the item's next neighbor, from the array and the DOM, and call `invalidate()` in the same task. The gap survives, and the item's slot doesn't move. Then press `Escape`.

  **Expected:** no fault, and at the flight's first frame the visual is where it was before `Escape`, as W1 checks. **Mutation:** home saved only at activation, whose `after` is the removed `r2`. `movePlaceholder` anchors on `after` first, so it throws [R]. Removing `r0` instead wouldn't discriminate, because the stale gap's `after` would still be connected.

No witness is owed for item 1, or for breaking §4's rule, which is outside the contract.

**What item 2 would amend:**

- `DRI-14`: §4's wording, which replaces "may change it at any time".
- `DRD-25`'s copy bullet: superseded by a new decision rather than edited.
- `SortableConfig.items`'s documentation.
- `CollectionSnapshot`'s comment, "An immutable ordered copy of the collection".