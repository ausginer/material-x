# The `items()` copies under CONTRIBUTING §1.1

**Status, 2026-11-08: assessed by the architect, not decided.** No `DRD`, `DRF` or `DRO` entry is minted or amended. `DRD-25`'s copy bullet and `DRI-14` stand until the owner decides.

**Read at:** `4e8ada3ec` on `drag/production`, from the commit's tree with `git show`. The owner's uncommitted edit to `src/sortable/layout-animation.ts` was not read and was left as it was. That file doesn't read the collection.

**Method:** reading only. No suite, probe or measurement ran. The claim that the witness fails is by reading, and so is every cost.

**Governing rules:** CONTRIBUTING §1.1, especially its gate (a) and its rule that a precondition counts only when the integrator can meet it and find it, and §9. `DRI-14`, `DRD-25`'s third bullet, and `SortableConfig.items`'s documentation, which says "Each pull copies the returned array, so the consumer keeps its array and may change it at any time."

## 1. What the algorithm reads, and when

`#pull` (`sortable.ts:514–517`) copies on every call. It has three callers.

| Pull | Kept until | Reads of `snapshot.items` | Consumer code between the pull and a read |
| --- | --- | --- | --- |
| Admission, `#admission` (`:528`) | The end of the call. The admission's `state` doesn't keep it | `includes` over the event path, then `keyboardInsertion` for a command | `config.handle`, `config.visual` and `config.box` |
| Activation, `activate` (`:424`) | The next pull or the operation's end, as `operation.snapshot` | `includes`, the home or keyboard gap, then each frame in `y` and `xy`'s `resolve` and `moved`, and in `RectIndex.refresh` when the version changed or the cache is dirty | The placeholder factory, `onStart`, and `config.box` inside `refresh` |
| Rebase, the `invalidate` step (`:399`, `:236`) | As for activation | `reconcileCollection` reads only the new pull and the gap's two neighbors | As for activation |

After the drop, two reads remain:

- `buildReorderRequest` reads `from` in the drop step (`:206`), before `onReorder` runs in the next step.
- `#landingTarget` reads `homeInsertion(this.snapshot, item)` (`:339`) at `settle`, for a cancel or a reject with a landing composed. **This is the only read after the consumer has been asked to change its model.** `movePlaceholder` uses only the gap's `before` and `after` (`placement.ts:55–94`).

**The axis caches assume that a version names a fixed list.** `RectIndex` re-measures only when the version changed or the cache is dirty (`rect-index.ts:110`), and `LinearShift.moved` advances slots by index while the version is unchanged (`linear-shift.ts:125`). The library mints the version at each pull. The copy also makes the library the owner of the list behind each version.

**So the history the algorithm needs is narrow:**

- **Before the drop:** none. Each read needs the current collection as of the last pull, and that is the contract's intent.
- **At the drop:** `from`, which is computed then.
- **After the drop:** the item's home neighbors in the last pull, which are two element references.

Nothing reads the whole earlier list after the drop.

## 2. Scenarios

"Alias" means `#pull` keeps the returned array without copying it.

| Scenario | Class | With the copy | With an alias and nothing else |
| --- | --- | --- | --- |
| Between drags, or during a press, the consumer changes its array in place | Normal model update | Correct | Correct. No retained pull is read |
| The consumer changes its array in place in `onReorder`, and the verdict is pending when `Escape` or `requestCancel` arrives. This is the witness, `sortable.browser.test.ts:100` | Normal model update, then a user event | Lands at home | **Lands at the destination.** `homeInsertion` finds the item at `to` in the changed array. The release puts the item back at its DOM home, so the flight's first frame is off by the distance from home to the destination, and the witness fails |
| As above, but the consumer reverts its array in a listener on the verdict's `signal` | Normal model update | Correct | Correct. `#conclude` aborts the verdict before `settle` (`kernel/session.ts:571–579`) |
| The consumer rejects after changing its array, without reverting | Normal model update | Lands at home | Lands where the changed array puts the item |
| During a drag, the consumer replaces its array or returns a fresh one, such as `[...root.children]`, and calls `invalidate()` once the DOM shows the change | Normal model update | Correct. The copy duplicates an array the library already owns alone | Correct |
| During a drag, the consumer changes its array in place, the DOM updates in the same task, and `invalidate()` follows in that task. Lit, Vue, Svelte and Solid render synchronously or in a microtask | Normal model update, or a user event the consumer handles | Correct | Correct. No frame, pointer event or verdict callback can run inside the task |
| During a drag, the consumer changes its array in place and renders in a later task or frame, then calls `invalidate()` | Normal model update with a deferred renderer | Correct. The old copy and the old DOM agree until `invalidate()` | **Wrong for every frame in between.** `resolve` reads the new array with the old version's geometry. The placeholder can move to a wrong gap, or to an anchor that isn't in the container yet, which is a `sortable/anchor-outside-container` fault that cancels the drag |
| The consumer changes the collection during a drag and never calls `invalidate()` | Misuse under `DRI-14` | Stale, but each version is consistent | Stale and inconsistent. Both are outside the contract |
| The consumer changes the array inside `handle`, `visual`, `box` or the placeholder factory | Misuse | Unaffected | Can change a read in the same call. Outside any meetable use |
| Scroll, resize, pointer capture, focus or the top layer | Platform | — | — |

**No user or platform event changes the array.** A user event reaches the array only through the consumer's own handler. That handler is then a normal model update, in one of the rows above.

## 3. Gate (a), applied

**At the admission pull, the copy fails the gate.** The array isn't kept, and the only consumer code between the pull and its reads is `handle`, `visual` and `box`. Changing the collection there is not correct integration under any contract text. Removing this copy needs no new consumer term: "may change it at any time" still holds, because no read crosses a point where the consumer's normal code runs.

**At the activation and rebase pulls, the copy passes gate (a) only because the current contract grants "may change it at any time".** The copy really protects two cases:

1. **The post-drop home read**, in normal use. It needs two references, not a list. If the home gap is captured at the drop, the case is covered without the copy. `DRI-14` already says that after the drop, a collection change no longer affects the operation. Capturing the gap then costs one `Insertion` per drop, or two fields on the operation. `buildReorderRequest` already computes `indexOf` there.
2. **An in-place change during a drag, with the DOM and `invalidate()` arriving in a later task.** Only this case needs a consumer term to replace the copy.

A term that can replace the copy, written on `items` and in `DRI-14`:

> From activation until the drop, the library reads the array that `items()` last returned. If you change that array in place in this window, update the DOM and call `invalidate()` before the current task ends. Otherwise, return a new array. Outside this window, you may change the array at any time.

The term is meetable: replacing the array is always possible. It is findable, because it sits on the option. Its only restriction falls on an integrator who changes the array in place and also renders after the task, while a drag is active. **This is a real restriction on one integration style.** It is not a restriction on a mistake. Whether that is acceptable is a contract decision for the owner, under §1.1's last paragraph.

**Correctness traded:** with the term, an integrator who breaks it gets wrong placement for the frames in between, or a fault that cancels the drag. The second is the package's normal failure path, so nothing breaks silently past the operation. Without the term, the copy makes that integration style correct.

## 4. Cost, by reading

- **Each pull allocates one array of `n` references.** There is one pull per press that never activates, and two per activation, plus one per `invalidate()` during a drag. Nothing is copied per sample or per frame.
- **The copy is linear and is not on the sample path.** `DRO-1`'s figures don't separate it, so its runtime share is unmeasured. When `items()` returns `[...root.children]`, the consumer's own copy is larger than the library's.
- **The home capture adds one object or two fields per drop.**

## 5. Recommendation

1. **Remove the admission copy, and change no consumer term.** The only change to the contract's text is that "each pull copies" becomes "each pull the operation keeps is copied". The witness is unaffected.
2. **For the activation and rebase copies, the choice is the owner's. I recommend removing them, together with the home capture and the term in §3.** The copy's remaining protection covers one integration style that has a simple alternative. Normal use, including the witness, is preserved by two references captured at the drop rather than by `n` copied at every pull. **If the owner doesn't accept the term, keep these copies.** Without the term, gate (a) is open and the copy is the cheapest correct answer.
3. **Not recommended: removing the copies without the home capture.** It fails the witness, and the witness is normal use.

**What a decision for item 2 would amend:**

- `DRI-14`: the term, which replaces "may change it at any time".
- `DRD-25`'s copy bullet: superseded by a new decision rather than edited.
- The `items` documentation on `SortableConfig`.
- `CollectionSnapshot`'s comment, "An immutable ordered copy of the collection".

**Witnesses owed:**

- The existing witness stays as it is. Removing the home capture must make it fail.
- One new test: during a drag, `items()` returns one array that the test changes in place, followed by `invalidate()` in the same task. The gap must rebase as in "should rebase a surviving gap on invalidate during a drag".
- Item 1 needs no witness, because no observable behavior changes.