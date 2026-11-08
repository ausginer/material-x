# `items()` borrowing handoff

**One bounded unit for one implementer.** It implements `DRD-31` in [`00-index.md`](00-index.md): `sortable` stops copying the array that `items()` returns, and the operation saves the item's home gap at activation and at every rebase. The contract's `DRI-14` states the consumer's consistency rule, and [`items-copy-assessment.md`](items-copy-assessment.md) is the evidence. Read `DRD-31`, `DRI-14` and the assessment's §3, §4 and §7 before starting.

**Base:** `drag/production` at the commit that carries this handoff, or a later one.

**The owner's uncommitted edits.** When this handoff was written, the working tree held the owner's edits to `src/free-drag.ts` and `src/sortable/layout-animation.ts`, and the owner was still changing them.

- **Leave every file outside this unit's scope as it is.** Stage only the paths this unit changes, by name.
- **If any file in scope has uncommitted changes when you start,** stop and return, without stashing, resetting or rewriting them. The files in scope are listed under item 2.

**Do not change:**

- **The kernel:** `src/kernel/*` and `src/draggable.ts`.
- **The collection and geometry helpers:**
  - `src/sortable/collection.ts`: `buildReorderRequest` keeps reading the snapshot at the drop;
  - `keyboard.ts` and `placement.ts`;
  - `axis.ts`, `y.ts`, `xy.ts`, `linear-shift.ts` and `rect-index.ts`.
- **The other modules:** `src/lift.ts`, `src/free-drag.ts`, `src/free-drag/*` and `src/sortable/layout-animation.ts`.
- **The instruments:** the kernel per-sample test, the `DRF-2` test, `bench/`, and every size ceiling.
- **The `.plan/` records,** other than your report.

**Not authorized:**

- no timing, and no `compare.ts` run;
- no measurement beyond the runs this handoff names;
- no accepted cost, and no re-based ceiling or threshold.

## Work, in order

### 1. The witnesses, against the base

**One commit, test files only.** Add W2 to W5 from the assessment's §7 to `tests/sortable.browser.test.ts`, in the `drag:DRI-14` collection block beside W1, "should land a canceled drag at home when the consumer reordered its own array".

- **Each test owns one array,** which `items()` returns and the test changes as the witness says. W5 returns the current value of a variable.
- **W2 and W3 compose a landing,** because only a landing reads the home.
- **Collect faults as the file already does.** W2, W3 and W5 assert that none was reported. Assert the results and requests exactly as §7 states them.
- **Name them by what they check,** for example:
  - "should land at home when a cancel comes between an in-place change and invalidate";
  - "should land at the rebased home when a drag is canceled after a rebase";
  - "should propose a command's reorder in the collection that onStart completed";
  - "should propose a command's reorder from the retained array when onStart replaces it and defers".

**Check:** W1 to W5 pass in Chromium, Firefox and WebKit at the base, where the copy carries them. **If one fails, stop and return** with the failure. A witness that fails at the base is describing different behavior from `DRD-31`'s premise.

### 2. `DRD-31`

**One commit.** **Files in scope:** `src/sortable.ts`, `src/sortable/domain.ts`, `README.md`, and `tests/sortable.browser.test.ts` only if item 1's tests need a fix.

**The source:**

- **`#pull` returns the array `items()` returned,** with its version and no copy.
- **The operation holds the home gap,** and the constructor only stores it, as `DRD-30` requires of both constructors.
  - **At activation,** `activate` computes the home gap from the activation pull and passes it to the constructor.
    - **A pointer operation** may pass its first insertion, because that is `homeInsertion(snapshot, item)` and no code writes an `Insertion` in place.
    - **A command** computes `homeInsertion(snapshot, item)` beside its keyboard target.
  - **`rebase` assigns the gap from the new pull,** in the statement group where it assigns the new snapshot, and before the item test. A removed item's rebase then saves what the read at `settle` computes today.
  - **`#landingTarget` moves the placeholder to the saved gap.** Nothing reads `snapshot.items` there any more.
- **Nothing else changes in behavior or order.**
  - `activate` keeps `DRD-30`'s order. Computing the gap is pure, and no acquisition moves.
  - `rebase` keeps its order: snapshot, item test, reconcile or cancel, then axis invalidation.
  - The request's `from` still comes from `buildReorderRequest` reading the snapshot at the drop. `DRD-31` rejects taking it from the saved gap.

**The documentation:**

- **`SortableConfig.items`:** a short form of `DRI-14`'s consistency rule. It must state:
  - the library keeps the returned array from activation until the drop, and doesn't copy it;
  - an in-place change in that window is completed before the library can read again. That means before a callback the library called returns, or within the microtasks of the consumer's own code, with the DOM showing the change and `invalidate()` called;
  - otherwise the consumer leaves the array unchanged and returns a new one;
  - no in-place change from `handle`, `visual`, `box` or the placeholder element's own callbacks.
- **`CollectionSnapshot`'s comment:** the array `items()` returned, which the library reads and never writes, with its version. It replaces "An immutable ordered copy of the collection".
- **`README.md`'s collection paragraph:** the same rule, with one example of each way to change the collection during a drag:
  - a synchronous in-place change followed by `invalidate()`;
  - a replaced array with deferred rendering.

  Name `onStart` as a callback where a microtask is too late.

**Checks:**

- the [handoff](../../../.agents/docs/handoff.md) loop on every changed file;
- `npx just typecheck` in `packages/drag`;
- the sortable file in Chromium, Firefox and WebKit, where W1 to W5 pass;
- `just test`, with every failure listed against the base run's failures. A failure that the base doesn't have is a result to report, not to fix by changing a test or a ceiling.

### 3. The mutations

Apply each mutation to item 2's source, run its witness in Chromium, record the failing assertion, and revert. Commit none of them.

| Witness | Mutation |
| --- | --- |
| W1 | `#landingTarget` computes the home from the retained array: `homeInsertion(this.snapshot, item)` |
| W2 | The same mutation |
| W3 | `rebase` doesn't update the saved gap |
| W4 | The drop's request takes `from` from the gap saved at activation |
| W5 | The drop's request takes its snapshot from a fresh `items()` call |

**A mutation that doesn't make its witness fail is a result.** Report it, and don't strengthen the test without returning first.

### 4. The report

Write `items-borrowing-report.md` in this directory, commit it with its raw output, and push. It records:

- the base commit, item 1's and item 2's commits, and the owner's edits that you left, by path;
- the diff of `src/sortable.ts` and `src/sortable/domain.ts`, with an argument for each order property in item 2;
- the documentation text as written;
- W1 to W5 in three engines, at the base and after item 2;
- item 3's table, with each failing assertion;
- `just test` and typecheck results against the base;
- **allocation, counted by reading,** with the [ownership report](ownership-report.md)'s rules, per press, per activation (pointer and command), per rebase and per drop. Nothing changes per sample;
- **size,** from the existing size check, for the `sortable` entry and the gates that include it, before and after. Report it without accepting it.