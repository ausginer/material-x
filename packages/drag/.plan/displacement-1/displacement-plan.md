# Every row move is animated — plan

**Status: planned on 2026-11-25 by the architect, on `drag/displacement-1` from `main` at `e57c9f074`. Unimplemented.** The finding is [#265](https://github.com/ausginer/material-x/issues/265), whose body is its contract. The decision is [`DRD-72`](../00-index.md). This document has the design, the readings and the work list. #266 follows it, by `repo:RD-60`.

## Readings

Read at `e57c9f074` with real input, frame by frame, in Playwright's Chromium, Firefox and WebKit ([probe](probes/displacement.browser.test.ts.txt), [today](checks/before.txt), [the candidate](checks/candidate-sink.txt)). `layoutAnimation` is composed, with 300 ms and `linear`.

| Case | Today | With the candidate |
| --- | --- | --- |
| A slow pointer move | Smooth | Smooth |
| An arrow key, with the commit at once, after 100 ms, or moving the neighbor's node | The neighbor jumps in one frame | Smooth |
| A key move accepted after 400 ms and never committed | Jumps away and back | Smooth |
| A rejection after 400 ms, with `landing` and without | Jumps away and back | Smooth |
| A rejection at once, and `onReorder` that throws | Still | Still |
| A pointer drop whose last resolution moves the gap (a flick) | Each crossed row jumps | Smooth |
| `Escape` after a move, with `landing` and without | Jumps back | Smooth |
| A cancel right after `invalidate()` | Jumps back | Smooth |
| A key at 100 ms after a key, in the same and in the other direction | Jumps | Smooth |
| `xy()`: a key, a flick, `Escape`, a rejection | Jumps | Smooth |

- **The report's claims hold.** The sink is told from `updateInsertion` alone. `drop()` moves the placeholder with no report, and so does `#landingTarget`. Without a landing, the release of the placeholder moves the rows.
- **No record says that this is intended.** The header of `layout-animation.ts` says the opposite: the pushed items slide _"instead of jumping"_. `DRD-25` and `DRI-9` say nothing of it.
- **A row that is lifted while its row animation runs jumps,** today, by the distance that the animation still carries: from 29 to 51 px in the reading, where it stays at 29 with the candidate. The lift measures the row where it is drawn, and then the animation adds its offset again. `DRI-13` has this for a landing, and nothing has it for a row animation. A key move makes it easier to meet, because it now starts such animations.
- **A row that the commit moves in the DOM keeps its animation** in the three engines.
- **What a command needs:** nothing is measured at a command, because no resolution runs. The sink has to know each displaced row's place before the placeholder's write and after it. With `y()` that is one row, the crossed one. With `xy()` it is every row, because a move can wrap any of them.
- **Rects read** in a key move of a list of six: 2 without `displacement`, as today, 4 with it under `y()` and 12 under `xy()`. A drop after a resolved move reads the same as today. `Escape` after a move: 1, 5 and 11.
- **One case isn't smooth:** in Firefox, with a scroll while the verdict is pending, the row's report is 18 to 20 px short, in each run of `y()`, and the landing is as much too long. The distances sum to the page's own scroll, so the likely cause is scroll anchoring, which moved the page between the two reads. That isn't established. Only a list that is the page's scroll anchor meets it.

## Design

**The sink measures what the axis can't, around one write of the placeholder.** The axis rule reports what it already knows: a resolution's move, and a pointer drop's last resolution, whose geometry is warm. Every other move is a placeholder write that nothing resolved: a command's drop, and a return at the end of an operation. Around such a write the operation asks the sink to read the rows before it, and to read them again and report after it. The report is the difference, so it is what the write moved, whatever the axis and whatever the consumer did before.

**Why not the axis.** A candidate in which the axis measures ([diff](probes/candidate-axis.diff), [reading](checks/candidate-axis.txt)) is smooth in the same cases but one: a cancel right after `invalidate()`, because its cache is of the older collection. It costs 363, 253 and 370 B of Brotli in _sortable + y_, _sortable + xy_ and _complete_, against 235, 209 and 360 ([sizes](checks/sizes.txt)). It puts the code in the axes, which a composition without `displacement` carries too (`DRI-18`). It also needs the cache to be trusted after the drop, when the collection isn't read.

### Where the reports are

1. **`drop()`, right after the request is built and before the verdict.** A pointer drop that moves the placeholder reports through the axis's `moved`, and only with a sink, because `moved` without one reads a row. A command measures around the write. The consumer's commit comes after, so the placeholder is already at the destination, and the commit changes no row's place: the item has no flow footprint while it is lifted, and it goes beside the placeholder.
2. **`settle()`, before the landing target is read.** With a sink, an operation that ends with the placeholder away from where the item is moves it there first, and reports. It is home for a cancel, a rejection and a fault, and the item's own place for an accepted item that isn't beside the placeholder. `#landingTarget` then finds the placeholder in place and reads it once, as today.
3. **Not at the release.** With the placeholder already in place, the release moves no row.

**A fault is in the second.** A fault skips the landing, so the item's own visual goes back at once, but the drop has reported the rows. Without a report of the return they would be drawn back by a distance that the DOM no longer has. The candidate without it jumped when `onReorder` threw.

**A landing isn't needed.** The rows are the displacement's. Without `landing` the visual jumps, as today, and the rows don't.

### What isn't animated

- **Destruction.** It retires the sink, as today, and runs no hook (`DRI-10`).
- **A return that has no place to go:** an anchor that left the container, or a placeholder that the consumer moved or removed. The rows then carry nothing of the operation, so they jump once, and not twice. It adds no fault that the same composition without `displacement` doesn't report. One that a landing reports today it still reports.
- **What the consumer's commit moves itself,** apart from the library's write.

### The collection

`DRI-14` says that the library doesn't copy the array and reads nothing of it after the drop. A return comes after the drop, or when a cancel is applied, so the array can't be read then. **With `displacement`, the operation keeps its own list of the rows, from the activation's pull and from each rebase.** It holds elements, not the array, and it ends with the operation. Without `displacement` nothing is kept. `DRI-14` gets a sentence. The cost is one filtered copy for each activation and rebase, and n references for a drag.

### Accepted limits

- A return that comes while a scroll that the page itself anchors has not settled, by the Firefox reading above.
- A key move with a sink forces two layouts more, around the write. It is one key press.
- With `xy()` each such write reads every row twice. A list of 2,000 reads 4,000 rects for a key press. `xy()` already rebuilds the whole index for each resolved move.

## Work list

On `drag/displacement-1`. The contract is #265 at its pinned revision and `DRD-72`. Nothing here replaces them.

1. **Source.** `sortable/operation.ts`, `axis.ts`, `layout-animation.ts`, `y.ts`, `xy.ts` and `behavior.ts`, as the properties need. The candidate is a direction, and its forms aren't prescribed. `DisplacementSink` and `InsertionGeometry` are private (`DRD-39`), so their members are free.
2. **`layoutAnimation`'s options** become `timing` alone, by `DRD-72`. Every caller in the package follows: the tests, the story (which passes none) and `bench/lab.ts`.
3. **Rows, in Chromium, Firefox and WebKit, source and consumer projects:**
   - a key move, up and down, under `y()` and `xy()`: the crossed row's drawn position at the first frame after the press is where it was, its animation is the flow's distance, and it ends at its place. With a commit at once, after 100 ms, and one that moves the neighbor's node;
   - a pointer drop whose last resolution moves the gap;
   - `Escape`, `requestCancel`, a rejection at once and after 400 ms, an accepted move that is never committed, and `onReorder` that throws: each with `landing` and without, and the rows end with no animation left over and no frame that draws a row further from its place than the frame before;
   - a cancel right after `invalidate()`, and an array that the consumer empties while the verdict is pending;
   - a noop drop, and a return that has no place to go, report no more than today;
   - a list with no sink reads no rect more than at `e57c9f074`, in a key move, a drop and a cancel;
   - an item that is lifted while it is in flight is drawn where it was, and its row animation ends;
   - with the preference, no row starts an animation, and a change of it takes effect at the next report. `timing` is called at each start, and its values are used;
   - the order: the report comes before `onReorder`.
   - Each with a mutation: the report of `drop()` removed, the return's removed, the return's only with a landing, the fault's removed, the row's release at the activation removed, the preference not read, the array read after the drop.
4. **The existing rows** pass unchanged, except where they pass `duration`. `DRF-54`'s row isn't touched, and no wait is added. If it fails once more in CI, the failure is DRF-54's.
5. **The contract:** `DRI-14`'s sentence, `DRI-17`'s reading rule, a new `DRI-22` for displacement, the public surface's options, and a row of the change record. The **README** sentence _"`layoutAnimation`'s row animations do not change with that preference"_ and the JSDoc of `layout-animation.ts` follow.
6. **`.agents/docs/accessibility.md`'s two lines** (a bullet that rows ignore the preference, and the list of what is fulfilled) aren't in this branch, because project documentation has its own pull request. The coordinator takes the docs unit.
7. **Sizes:** the ceilings of the rows that grow move to the final readings (`DRO-20`), once the owner has approved the cost.
8. **Checks:** the drag suites one engine at a time, typecheck, format, lint, the declarations' check, `size`, the docs build and smoke. The size table is in the report.
9. **Stop** and return if a property needs a kernel change, if a row of a composition without a sink changes, if the array has to be read after the drop, or if an existing row's reading changes.

A feature proof is owed.