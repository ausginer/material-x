# `items()` borrowing report

**Input:** `drag/production` at `7b9d3c874`, which carries [`items-borrowing-handoff.md`](items-borrowing-handoff.md) and the owner's split of both behaviors into `behavior.ts` and `operation.ts`. **Governing records:** `DRD-31`, `DRI-14` and `DRD-30` in [`00-index.md`](00-index.md), and [`items-copy-assessment.md`](items-copy-assessment.md) §3, §4 and §7.

**Outcome:** `DRD-31` landed. `sortable` returns the `items()` array from each pull without a copy, and the operation saves the item's home gap at activation and at every rebase. A landing at home reads only that saved gap. W1 to W5 pass in three engines before and after the change, and each mutation makes its witness fail. **No cost is accepted, and no ceiling or control is re-based.** No timing reading was taken, and `compare.ts` was not run.

| Commit | Content |
| --- | --- |
| `a390dfa29` | Preparation: the corrections the owner's refactoring required (§Preparation). This is the baseline for every comparison below |
| `0e7e1c7ef` | Item 1: W2 to W5, test file only |
| `4ef33b96e` | Item 2: `DRD-31` in the source, the option's documentation, `CollectionSnapshot`'s comment and the README |
| the commit carrying this report | This report and [`2026-11-08-items-borrowing.txt`](measurements/2026-11-08-items-borrowing.txt) |

**The owner's edits.** The working tree was clean at `7b9d3c874`, so no uncommitted edit was left.

**Scope adapted to the split, as the owner directed.** The handoff's `src/sortable.ts` is now two files. `#pull`, `activate` and `SortableConfig.items` are in `src/sortable/behavior.ts`. `rebase`, the operation's snapshot and `#landingTarget` are in `src/sortable/operation.ts`. The operation's snapshot is `#query.snapshot`, because the operation keeps the axis query in its own object `#query`. The mutations target those locations.

Raw output for every run below is in [`2026-11-08-items-borrowing.txt`](measurements/2026-11-08-items-borrowing.txt).

## Preparation (`a390dfa29`)

Before the witnesses, the comments and tests that `bf7ebd2ee` and `7b9d3c874` made stale were corrected. No assertion and no expected value changed.

- **`src/sortable/operation.ts`.** The split left the class comment twice, and both copies said "It is also the query the axis rule reads". That was false after `bf7ebd2ee`, which moved the query into `#query`. One copy remains, without that sentence, and `#query` has its own comment: "The operation state the axis rule reads."
- **`src/sortable.ts` and `src/free-drag.ts` export `SortableConfig` and `FreeDragConfig` again.** `7b9d3c874` moved the two types into the behavior modules and didn't re-export them, so `npx just typecheck` failed in 12 files. The failures were the type imports in `tests/support/harness.ts`, `tests/commit.browser.test.ts`, `tests/free-drag.browser.test.ts` and `src/sortable.stories.tsx`, and the implicit-`any` errors that followed from them. Both types were public at `bb4b43b48`, and `DRD-30` says that the built-ins' options don't change. **The owner chose the re-export over changing the test imports.** This is a source change outside the comment-and-test scope, made on the owner's answer in this session.

No test file needed a change. The four browser failures at the base come from a source defect, not from stale tests (§Findings outside this unit's scope).

## Item 1: the witnesses (`0e7e1c7ef`)

The witnesses are in the `drag:DRI-14 collection` block, after W1. Each test owns one array. A row the test adds comes from a local `makeRow`, which builds the same row as `makeList`.

| Witness | Test | What it asserts |
| --- | --- | --- |
| W1 | "should land a canceled drag at home when the consumer reordered its own array" | Existing |
| W2 | "should land at home when a cancel comes between an in-place change and invalidate" | `r1` is grabbed 12 px, within its home gap, with a landing composed. In one synchronous block, the test inserts a row after `r1` in the array, calls `requestCancel()`, inserts the row into the DOM and calls `invalidate()`. Asserts no fault and one result: canceled, origin `request`, reason `undefined`, request `null` |
| W3 | "should land at the rebased home when a drag is canceled after a rebase" | Five rows and a landing. `r1` moves 90 px, to the gap between `r3` and `r4`. In one task, `r2` is removed from the array and the DOM, and `invalidate()` is called. Asserts that the drag is still running, then presses `Escape`. Asserts no fault, the log `start`, `end:canceled`, and the visual at its held position at the flight's first frame, as W1 checks |
| W4 | "should propose a command's reorder in the collection that onStart completed" | `ArrowDown` on `r1`. `onStart` inserts a row first in the array and the DOM, then calls `invalidate()`. Asserts the request `{ item: r1, from: 2, to: 3, previous: r2, next: r3 }`, one accepted result and no fault |
| W5 | "should propose a command's reorder from the retained array when onStart replaces it and defers" | `items()` returns a variable's current value. `onStart` assigns a new array with the row first, and queues a microtask that renders it and calls `invalidate()`. Asserts the request `{ item: r1, from: 1, to: 2, previous: r2, next: r3 }` and one accepted result. It asserts that the late `invalidate()` pulled nothing: the pull count after the run equals the count just before that call. It also asserts no fault |

W3's check that the drag is still running is not in §7. It makes sure that the gap survived the rebase. Without it, a rebase that cancels would also end in `end:canceled` and pass W3 for the wrong reason.

**At the baseline (`0e7e1c7ef`, whose source is `a390dfa29`'s): W1 to W5 pass in Chromium, Firefox and WebKit,** 15 of 15.

## Item 2: `DRD-31` (`4ef33b96e`)

### Source

```diff
--- src/sortable/behavior.ts
+    // A pointer operation starts in its home gap, so one object serves as both.
+    const home = homeInsertion(snapshot, drag.item);
     const insertion =
       state.direction === null
-        ? homeInsertion(snapshot, drag.item)
+        ? home
         : keyboardInsertion(snapshot, drag.item, state.direction);
 …
       snapshot,
+      home,
       insertion,
 …
   #pull(): CollectionSnapshot {
     this.#version += 1;
-    return { items: [...this.config.items()], version: this.#version };
+    return { items: this.config.items(), version: this.#version };
   }

--- src/sortable/operation.ts
+  /**
+   * The item's gap in the pull that is the operation's collection. A landing at
+   * home reads it, so no cancel, verdict or release reads the consumer's array.
+   */
+  #home: Insertion;
 …
+    home: Insertion,
     insertion: Insertion,
 …
+    this.#home = home;
 …
   rebase(next: CollectionSnapshot): void {
     this.#query.snapshot = next;
+    this.#home = homeInsertion(next, this.#drag.item);
 …
     } else {
-      movePlaceholder(
-        this.#context.placeholder,
-        homeInsertion(this.#query.snapshot, this.#query.item),
-      );
+      movePlaceholder(this.#context.placeholder, this.#home);
     }

--- src/sortable/domain.ts
-/** An immutable ordered copy of the collection, and its version. */
+/** The array `items()` returned, which the library reads and never writes, and its version. */
```

The full diff, with the documentation, is `git diff 0e7e1c7ef 4ef33b96e`.

### Order properties

- **`#pull` returns the array `items()` returned, with its version and no copy.** The version is incremented first, as before.
- **The constructor only stores the gap.** `this.#home = home` is an assignment beside the other field assignments, as `DRD-30` requires.
- **`activate` keeps `DRD-30`'s order.** The steps are: the lift, the pull, the item test, the home gap, the insertion and its test, the placeholder, the frame task, the axis retirement, the invalidation listener, the operation, and then the axis invalidation. `homeInsertion` is pure: it reads `snapshot.items` and allocates an object, and it acquires and registers nothing. So computing it before the insertion test moves no acquisition. A pointer operation passes one object as both `home` and `insertion`. Nothing writes an `Insertion` in place, because the type is `Readonly`, and `#query.insertion` is only reassigned.
- **A command computes `homeInsertion(snapshot, item)` beside its keyboard target,** from the same pull.
- **`rebase` keeps its order:** the snapshot, the item test, the reconcile or cancel, then the axis invalidation. The gap is assigned in the same statement group as the snapshot, before the item test. For a removed item, `homeInsertion(next, item)` gives `index: -1`, `before: null` and `after: next.items[0]`. That is what the read at `settle` computed before this change, and the cancel inside the same step then lands there.
- **`#landingTarget` reads only `#home`.** No `settle`, decision, verdict, release or destruction reads the retained array.
- **The request's `from` still comes from `buildReorderRequest`,** which reads `#query.snapshot` at the drop. The drop's code is unchanged.

### Documentation, as written

**`SortableConfig.items`** (`src/sortable/behavior.ts`):

> The collection, pulled at each admission, at activation, and on `invalidate()` during a drag. It holds no duplicates and is in DOM order under `root`.
>
> The library keeps the array returned at activation, or at the last `invalidate()`, until the drop, and doesn't copy it. In that window, change it in place only when the change is complete before the library can read again: the array changed, the DOM showing the change, and `invalidate()` called. In a callback the library called, such as `onStart`, complete it before the callback returns. In your own code, such as an event handler, a timer or an `await` continuation, complete it within the microtasks that code queues. Otherwise leave the array unchanged, return a new array from later calls, and call `invalidate()` once the DOM shows the change. Never change it in place from `handle`, `visual`, `box` or the placeholder element's own callbacks. Between drags, during a press and from the drop on, change it freely.

**`CollectionSnapshot`** (`src/sortable/domain.ts`): "The array `items()` returned, which the library reads and never writes, and its version."

**`README.md`**, after the existing collection paragraph:

> The library keeps the array `items()` returned at activation, or at the last `invalidate()`, until the drop, and doesn't copy it. Between drags, during a press, and from the drop on, including in `onReorder`, change your array however you like. During a drag, change it in one of two ways:
>
> - **In place,** when the change is complete before the library can read again: the array changed, the DOM showing the change, and `invalidate()` called. In a callback the library called, complete it before the callback returns. A microtask is too late in `onStart`, because a keyboard command drops as soon as `onStart` returns. In your own code, such as an event handler, a timer or an `await` continuation, complete it within the microtasks that code queues.
> - **By replacement,** otherwise. Leave the array unchanged, return a new one from later calls, and call `invalidate()` once the DOM shows the change. Rendering may then wait, because the kept array still matches the DOM.
>
> Never change the array in place from `handle`, `visual`, `box` or the placeholder element's own callbacks, which run in the middle of a read.

It is followed by two examples: `insertRow`, which changes the array and the DOM in place and then calls `invalidate()` synchronously, and `prependRow`, which replaces the array and renders and calls `invalidate()` in an animation frame.

### Checks

| Check | At `0e7e1c7ef` (baseline) | At `4ef33b96e` |
| --- | --- | --- |
| W1 to W5, three engines | 15 passed | 15 passed |
| `tests/sortable.browser.test.ts`, three engines | 6 failed, 135 passed (141) | 6 failed, 135 passed (141). The same 6: the two `layoutAnimation` tests in each engine |
| `just test` (Chromium and node) | At `a390dfa29`, before the witnesses: 7 failed, 335 passed (342) | 7 failed, 339 passed (346). The same 7, and the 4 new witnesses pass |
| `npx just typecheck` | Passes | Passes |
| Handoff loop (fmt, lint-fix, fmt, lint) on each changed `.ts` file | Clean | Clean |
| `README.md` | — | `oxfmt` and `git diff --check` clean. No Markdown linter is configured. The section adds no link |

**The 7 failures are the same at both ends, and none comes from this unit:**

- three size rows: `draggable alone`'s control moved by 99 B, `freeDrag` is 102 B over its ceiling, and `freeDrag + bounds + landing` is 110 B over. These rows include no sortable module. They also fail at `bb4b43b48`, before the owner's refactoring, with 99, 130 and 143 B;
- four browser tests that `layoutAnimation` drives: `destruction` › "should cancel a running landing and the row animations", `destruction` › "should retain no item, behavior, view or behavior instance after 3 operations and destruction", and `sortable` › "should animate displaced rows with layoutAnimation, in xy() too" and "should keep a row animation past the terminal, until destruction". All four pass at `bb4b43b48` (§Findings outside this unit's scope).

## Item 3: mutations

Each mutation was applied to `4ef33b96e`'s `src/sortable/operation.ts`, and its witness was run in Chromium. The file was then restored, and no mutation was committed. Each diff is in the raw output.

| Witness | Mutation | Failing assertion |
| --- | --- | --- |
| W1 | `#landingTarget` moves the placeholder to `homeInsertion(this.#query.snapshot, this.#query.item)` | `sortable.browser.test.ts:144`: the top differs from the dropped position by 80 px, where less than 1 is expected |
| W2 | The same mutation | `:168`, `expect(faults).toEqual([])`: one `DragFault`, `sortable/anchor-outside-container` |
| W3 | `rebase` doesn't assign `#home` | `:196`, `expect(faults).toEqual([])`: one `DragFault`, `sortable/anchor-outside-container` |
| W4 | The drop's request takes `from` from the gap saved at activation, in a field the constructor sets and `rebase` doesn't touch | `:241`: the request has `from: 1`, where 2 is expected |
| W5 | The drop's request is built from `{ items: config.items(), version: 0 }` | `:295`: no request at all, where one with `from: 1` is expected. The fresh pull gives `from: 2`, which equals `to: 2`, so the drop is a no-op and `onReorder` isn't called. That is the no-op outcome that `DRD-31` describes |

Every mutation made its witness fail.

## Allocation

**Counted by reading the source at `0e7e1c7ef` and `4ef33b96e`,** under the [ownership report](ownership-report.md)'s rules. Counted: JavaScript objects and functions that library code creates at a site it owns, including array literals and their iterators. Not counted: closure contexts, strings, objects the platform returns and array backing-store growth. `n` is the length of the array `items()` returns.

| When | Before | After | Change |
| --- | --- | --- | --- |
| Per press or command admission (one pull) | Snapshot, array of `n` references, the spread's iterator | Snapshot | **−1 array of `n` references, −1 iterator** |
| Per pointer activation (one pull) | Snapshot, array, iterator, home `Insertion` | Snapshot, home `Insertion`, also the first insertion | **−1 array, −1 iterator** |
| Per command activation (one pull) | Snapshot, array, iterator, keyboard `Insertion` | Snapshot, home `Insertion`, keyboard `Insertion` | **−1 array, −1 iterator, +1 `Insertion`** |
| Per rebase (one pull) | Snapshot, array, iterator, reconciled `Insertion` when the gap survives | Snapshot, home `Insertion`, reconciled `Insertion` when the gap survives | **−1 array, −1 iterator, +1 `Insertion`** |
| Per drop | The request | The request | None |
| Per landing at home (a cancel or a reject with `landing` composed) | `homeInsertion` at `settle`: 1 `Insertion` | None | **−1 `Insertion`** |
| Per sample and per frame | — | — | None. No sample or frame path changed |

- **A command that declines because its move is no longer possible** now allocates its home `Insertion` before the keyboard target's test. That is one more `Insertion` on that decline. A pointer activation that declines because the item left returns before either gap is computed.
- **The operation has one more field,** `#home`. That adds no allocation.
- **The spread's iterator** may be removed by the engine for a plain array. It is counted because the rules count iterators. The array itself is always allocated.

## Size

`just size`, Brotli bytes with minified bytes in parentheses. `0e7e1c7ef`'s source is `a390dfa29`'s. The preparation only adds type exports, which leave no runtime bytes.

| Row | `0e7e1c7ef` | `4ef33b96e` | Change | Ceiling |
| --- | --: | --: | --: | --- |
| `sortable` + `y` | 6670 (20395) | 6657 (20412) | −13 (+17) | 6733, passes |
| `sortable` + `xy` | 6585 (20011) | 6601 (20028) | +16 (+17) | 6617, passes with 16 B of slack |
| complete | 7048 (21537) | 7055 (21554) | +7 (+17) | 7065, passes |
| `draggable` alone, `draggable` + `lift`, the three examples, both `freeDrag` rows | unchanged | unchanged | 0 | These rows include no sortable module. `draggable` alone and both `freeDrag` rows fail as at the baseline |

The minified size grows by 17 bytes in all three sortable rows. The new code is the field, the constructor parameter and its assignment, and the `homeInsertion` call in `rebase`. The removed code is the spread and the `homeInsertion` call in `#landingTarget`. The three Brotli changes differ in sign, so this change has no single Brotli cost. These figures are reported, not accepted.

## Findings outside this unit's scope

- **`layoutAnimation` throws on every report and settle at `7b9d3c874`.** `bf7ebd2ee` changed the sink from an object literal of closures to the class `LayoutAnimationDisplacementSink`, whose `report` and `settle` read `this`. `SortableBehavior.activate` passes `this.displacement.settle`, and `SortableOperation.updateInsertion` passes `this.#behavior.displacement?.report`, both without their object. A probe calling both methods detached gives `TypeError: Cannot read properties of undefined (reading '#options')` and `(reading '#running')`. That causes the four browser failures above, which pass at `bb4b43b48`. The connection to the retention test is inferred: the test composes `layoutAnimation`, and it fails only after this change. The fix is in `layout-animation.ts`, `behavior.ts` or `operation.ts`, outside this unit. **The owner chose to have it reported and not fixed here.**
- **The `draggable` alone control and both `freeDrag` ceilings fail at the baseline and before the refactoring.** No sortable module is in those rows, so this unit doesn't affect them.

## Limits

- Firefox and WebKit are Playwright's builds in the user's cache. WebKit ran with `~/.cache/ms-playwright/webkit-env.sh`, because without it WebKit doesn't launch on this host. Chromium is the image's browser.
- The mutations ran in Chromium only, as the handoff says.
- Allocation is counted by reading. No heap or timing instrument was run.

## Next

The owner inspects the branch. The combined review isn't started.