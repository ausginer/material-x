# Handoff: the size re-base, the owner's source edit, the prototype arm's retirement, and the cleanup of five open findings

**Recipient:** the implementer. **Branch:** `drag/size-acceptance`. **Input:** the architect's record commit on `drag/size-acceptance` that rewrites this handoff, from `988643dc9`.

**Governing records,** in [`00-index.md`](00-index.md):

- `drag:DRD-68`, as amended on 2026-11-15, and `drag:DRO-20`: the ceilings until release;
- `drag:DRD-69` and `drag:DRO-21`: the owner's commit `988643dc9`, and no guarantee about a member's receiver. The contract is already amended;
- `drag:DRO-5`, answered on 2026-11-15: the prototype arm retires;
- `drag:DRF-15`, `DRF-17`, `DRF-18` (required property amended on 2026-11-15), `DRF-21` (how it is shown, decided on 2026-11-15) and `DRF-42`;
- §Disposition of the size acceptance;
- `drag:DRO-19`: the library code the tests run is the library code consumers receive.

**Scope:**

- `bench/size/measure.ts`, `bench/compare.ts`, `bench/heap-snapshot.ts` and the `Justfile`'s `compare` recipe comment;
- `src/shared/landing.ts`, and `src/shared/timing.ts`, which is deleted;
- in `src`, for `DRD-69`: `sortable/retirable.ts`, `sortable/invalidatable.ts`, `free-drag/drop-targets.ts`, `lift.ts`'s JSDoc, and the comments of the loops `988643dc9` changed;
- `README.md`;
- `tests/support/` (`harness.ts`, `commands.node.ts`, `browser-commands.ts`, and a new node-side module if item 4 needs one);
- the tests that define `row`, `focusableList` or the shared `makeBox`: `activation`, `keyboard`, `landing`, `order`, `focus`, `commit` and `free-drag`;
- `tests/classes.browser.test.ts`, `tests/callbacks.declaration.test.ts` and `tests/destruction.browser.test.ts`;
- witnesses under `probes/size-acceptance-cleanup/`.

**Library code changes only in items 2, 7, 8 and 9.** Item 2 moves two constants. Items 7 to 9 change types and comments, so apart from item 2 the emitted `.js` differs from the input's only in comments. A mutation is applied for a run and then reverted. It is never committed.

**Order:** item 1 first, so that the gate checks the rest. Then items 2 to 10, in any order, with items 5 and 6 proved by one run (item 5). Then the final re-measure.

## 1. Every ceiling and the control take their readings at `988643dc9` (`DRD-68`)

In `bench/size/measure.ts`, `COMPOSITIONS`:

| Row                         |    `budget` |   `control` |
| --------------------------- | ----------: | ----------: |
| draggable alone             | 2139 → 2189 | 2024 → 2189 |
| draggable + lift            | 4169 → 3932 |           — |
| example: resize handle      | 3313 → 3265 |           — |
| example: drop zone          | 4431 → 4570 |           — |
| example: canvas group       | 3314 → 3261 |           — |
| freeDrag                    | 4967 → 4984 |           — |
| freeDrag + bounds + landing | 5210 → 5465 |           — |
| sortable + y                | 6733 → 6533 |           — |
| sortable + xy               | 6617 → 6484 |           — |
| complete                    | 7065 → 7143 |           — |

No graph assertion or row changes.

**The rule, where the ceilings are written.** The `budget` docblock states that until the first release of `@ydinjs/drag`, each change the owner approves moves the ceiling to its reading, and names `drag:DRD-68`. After release, a reading over the ceiling is a decision again.

**Check:** at the commit with this item alone, `npx just size` exits 0, and its table reads the figures above. **If a row reads otherwise at the input, stop** and report the table. The architect read these figures at `988643dc9` after a fresh build.

## 2. `shared/timing.ts` goes (`DRF-15`)

`DEFAULT_LANDING_DURATION` and `DEFAULT_LANDING_EASING` become module-private constants of `src/shared/landing.ts`, with the module's one-line comment. `src/shared/timing.ts` is deleted.

**Expected, from the architect's probe at `3228d1f07`:**

- every row's Brotli figure is unchanged, and "example: drop zone", "freeDrag + bounds + landing" and "complete" each list one module fewer;
- the emitted tree loses `shared/timing.js` and its map. `shared/landing.js` changes.

## 3. The `tap` command goes (`DRF-17`)

`tap` is removed from `tests/support/commands.node.ts` and from its declaration in `tests/support/browser-commands.ts`. The comment in `tests/click-guard.browser.test.ts` about a synthesized tap stays: it explains why the next click comes from the mouse.

## 4. One definition of each shared helper (`DRF-18`, amended)

Each of these has one definition, and every former site imports it:

- **`row`,** from the five browser tests, and **`focusableList`,** from `keyboard`, `order` and `focus`, with `focus`'s optional parent: in `tests/support/harness.ts`.
- **`makeBox`,** the identical copy in `commit` and `free-drag`: in `tests/support/harness.ts`.
- **The heap snapshot's type, and the reading of its chunks** (subscribe, `HeapProfiler.takeHeapSnapshot`, unsubscribe, parse), from `tests/support/commands.node.ts`'s `countHeapObjects` and `bench/heap-snapshot.ts`'s `takeSnapshot`. It goes in one node-side module, which you choose. `bench/size/measure.ts` already imports from `tests/support`. **Each caller keeps its own garbage collection and its own count:** the test collects once, and the bench enables the profiler and collects twice. The unsubscribe runs even when the snapshot throws.

`PROTOTYPE_REVISION` goes in item 6.

**Unchanged:** `mount` in `commit` and in `free-drag`, and `makeBox` in `drop-targets`. They share a name, not a body.

**Check:** every test whose file changed passes, with the same titles and assertions.

## 5. `compare.ts` places each bundle line from the bundle's own mapping (`DRF-21`)

`bundle` and `moduleAt` place each line of the lab bundle in the module that holds its source. The placement comes from the bundle's own mapping, such as a source map or Rolldown's module data, and not from comment lines. A line the mapping can't place ends the run with an error. Keys keep their current form: the path under the arm's source root, or the path from the package for any other module. Every arm keys alike, including `--before`.

**Shown by,** at the tree with items 5 and 6, with each log under `probes/size-acceptance-cleanup/`:

1. **The placement before and after.** For the base arm at the input and at the repaired tree: the key of `RectIndex`'s methods, `directionOf` and `keyboardInsertion`, and the modules that have no marker line at the input.
2. **An allocation in `sortable/rect-index.ts`.** One allocation per call, injected by hand into a `sortable/rect-index.ts` method on the move path, applied for one run of the row _bytes per move by function, 20 items_ and reverted. The reading keys it under `sortable/rect-index.ts`. Save the diff beside the log.
3. **The bytes rule still selects the kernel.** `node bench/compare.ts --prove --only` with the three bytes injections: _1 KB allocated per move_ and _an array of four numbers per sample, in Gesture.enter_ flag, and _one entry on the step list per frame_ stays quiet. Run `--prove --dry` with the same `--only` first. **If one of the three doesn't apply, stop.** The architect dry-ran each at `3228d1f07`, and each applied.

**Not this item's:** the entries that `DRD-45` property 9 holds. A full `--prove`, `--floors` and the other stopped campaigns stay stopped.

## 6. The prototype arm retires (`DRO-5`)

- **`bench/size/measure.ts`:** `--prototype`, `PROTOTYPE_ROWS`, `measurePrototype`, `PROTOTYPE_REVISION`, and the comparison column go, with the docblock's sentence about them. The table and the gate are otherwise unchanged.
- **`bench/compare.ts`:** the prototype arm and `PROTOTYPE_REVISION` go. A comparison names its before arm with `--before <revision>`, and a run that needs a before arm and has none ends with an error that says so. `--prove`, `--floors`, `--rejudge`, `--profile`, `--attribute` and `--trace` keep their behavior for arms built from this package's source. The docblock and the `judge` defaults stop naming the prototype.
- **`--rejudge` of a recording that holds a prototype arm** may stop working. The report says whether it does. The recorded files stay unchanged.
- **The `Justfile`'s `compare` recipe** stops describing the comparison as being with the prototype.
- **No instrument, recipe or test reads `599684791`.** `git grep 599684791 -- packages/drag ':!packages/drag/.plan'` finds nothing.

**Check:** `node bench/size/measure.ts` runs and prints the table. Item 5's `--prove --only` run is this item's check for `compare.ts`.

## 7. No public statement about detached calls (`DRD-69` properties 1 to 3)

- **`README.md`:** `controller.use(lifter.cancelLanding)` becomes `controller.use(lifter.cancelLanding, lifter)`. No example calls or passes a member detached, and no sentence says which members work detached.
- **`src/lift.ts`:** `cancelLanding`'s JSDoc loses "It works when detached." Its form and the library's own sites don't change.
- **`tests/classes.browser.test.ts`:** `drag:DRD-20 detached controller methods` goes, and so does the file comment's claim that the members and `cancelLanding` work when detached. The rest of the file stays.

## 8. No built-in declares `this` for a receiver check (`DRD-69` property 4)

- **`src/sortable/retirable.ts`:** `retire` declares no `this`, as `Invalidatable.invalidate` doesn't at `988643dc9`.
- **`src/free-drag/drop-targets.ts`:** `#resolve` and `#release` declare no `this`.
- **Every site that passes a built-in member to `requestStep` or `use` still passes its receiver.**
- **`tests/callbacks.declaration.test.ts`:** `passAlone` with `drag:DRD-35 capabilities declare their receiver`, and `passSwapped` with `drag:DRD-63 each built-in receiver is its own type`, go. That removes the unused `@ts-expect-error` at line 197. Imports that only they used go too. **The public receiver tests stay:** `drag:DRI-8 requestStep receiver typing`, `drag:DRI-9 and drag:DRI-10 use receiver typing` and `drag:DRD-35 the receiver is an object`.

**Check:** `npx just typecheck` exits 0. **If removing a `this` makes another line fail typecheck, stop** and report it.

## 9. TSDoc, and the comments the loop change made false (`DRD-69` properties 6 and 7)

- **`Invalidatable`** and its `invalidate` have a TSDoc comment. It says that `invalidate` marks what the implementer holds as stale and reads no layout, because scroll and resize call it many times a second, and who calls it at the implementing tree.
- **`Retirable`** and its `retire` have a TSDoc comment. It says that `retire` releases what the implementer holds, and where it runs, as `sortable` passes it to `use`.
- **False comments go.** At `988643dc9`, `RectIndex.collect` says "Locals, not repeated field reads inside the loops." Remove every comment in the loops that `988643dc9` changed that says a value is read into a local or read once.

## 10. The heap test's sentinel can detect a retained callback (`DRF-42`)

`drag:DRI-10 destruction` › _should retain no item, behavior, view or behavior instance after 3 operations and destruction_ (`tests/destruction.browser.test.ts:381`) meets `DRF-42`'s required property:

- at the sentinel's assertion, nothing the test controls holds the sentinel's object, apart from the callbacks it passed to the controller;
- the test's other assertions, its Chromium-only condition and its operations stay as they are. Its title states what its body checks.

**Witnesses,** each applied for one run and reverted, with logs under `probes/size-acceptance-cleanup/`:

- **A retained callback.** A mutation under `src` that keeps the consumer's options, or one of their callbacks, reachable after `requestDestroy`, and keeps no `SortableBehavior` instance. The sentinel's assertion fails, and the class count passes.
- **The proof's row 3.** A live controller, never destroyed, kept in the test's frame ([proof](reviews/final-cleanup/proof-reviewer.md) §The heap tests release their controllers). The sentinel's assertion fails.
- **Unmutated,** the test passes.

**Return to the architect** if the property needs a change under `src`, or a change to another assertion.

## The final re-measure (`DRD-68` property 3)

After the last item, run `npx just size`. The owner asked for every change in this unit, so under `DRO-20` each ceiling moves to its reading, in the unit's last commit. **Expected: no row moves.** Item 2's probe read no change, and the other items change tests, the bench, types and comments, which the minified gate doesn't count. The report gives each row's reading against `988643dc9` and names the item that moved any row.

**"draggable alone" is this pass's control row.** No item changes a file in its graph, so it reads exactly 2189. **A move is a stop.**

## Checks

- `npx just test` in `packages/drag` exits 0. **Any failing test is a stop**, apart from the tests that this handoff removes.
- `npx just test-engines --project browser --project browser/firefox --project shipped --project shipped/firefox` exits 0. WebKit isn't owed locally (`DRO-18`).
- `npx just typecheck` and `npx just lint` in `packages/drag` exit 0 on the edited files.
- The Verify steps of [`handoff.md`](../../../.agents/docs/handoff.md) for every edited file.
- **The emitted tree** against a build of `988643dc9`: item 2's changes, and comments and declarations from items 7 to 9. No other `.js` code differs.

**Stops.** A control that moves. A test that newly fails. Any stop named in an item. Report each with its reading or assertion. Don't adjust a test or a figure to pass.

## Report

`packages/drag/.plan/size-acceptance-cleanup-report.md`:

- each item's edits, as `file:line`;
- item 1's table, and the final table against `988643dc9`;
- item 5's three results and item 10's witnesses, with their logs;
- whether `--rejudge` still reads a recording that holds a prototype arm;
- the checks and their results;
- the comparison of the emitted tree;
- any stop, with its reading or assertion;
- the commits.

The unit stops at the pushed report. Next, the architect reads it.