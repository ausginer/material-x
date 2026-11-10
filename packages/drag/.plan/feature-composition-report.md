# Feature-composition report

**Input:** `drag/feature-composition` at `304771e2d`, which carries [`feature-composition-handoff.md`](feature-composition-handoff.md). **Governing records:** `DRD-33`, `DRO-10`, `DRO-11` and `DRF-5` in [`00-index.md`](00-index.md), [`contract.md`](contract.md) DRI-9, DRI-13, DRI-17, DRI-18, DRI-20 and DRI-21, the [assessment](feature-composition-assessment.md) §3.2, §3.3, §7 and §10, and the [prototype](probes/feature-composition/README.md).

**Outcome:** the four items landed as four commits, in the handoff's order. `DRF-5`'s regression test fails without the repair in Chromium, Firefox and WebKit and passes with it. Every mutation fails as the prototype's did. The full suite passes in three engines in three consecutive runs at the end, and the landing test that failed once in the prototype failed in none of the 40 block runs and none of the full runs. **`DRO-11`'s default is built:** an accepted drop stays where it was dropped.

**One figure is not covered by `DRO-10`:** the `targets` slot charges `freeDrag` **+78 B Brotli** and `freeDrag + landing` **+59 B**, above the 45 B that `DRO-10` approves. `freeDrag + bounds + landing` is +43 B, inside it. The port's slot code is byte-identical in effect to the prototype's: with item 1's line removed from both states, the charge is +45, +44 and +35 B, the prototype's exact figures. The excess comes from compressing the slot together with item 1's line (§Size). Nothing was optimized.

Raw output for every run is in [`probes/feature-composition/implementation/`](probes/feature-composition/implementation/). Every engine run sourced `~/.cache/ms-playwright/webkit-env.sh`, and WebKit launched in every run.

## Commits

| Commit | Item |
| --- | --- |
| `304771e2d` | The base. `git diff 688613863 HEAD` over the handoff's paths was empty, and the working tree was clean |
| `8626b04fd` | 1. `DRF-5`: `freeDrag` measures its bounds again at each activation |
| `59cc79e74` | 2. The landing capability |
| `bfc2bfb0e` | 3. The drop-target capability and the `targets` slot |
| `11950690f` | 4. `RectIndex` under the class-encapsulation rule |
| the commit carrying this report | This report and its raw output |

**Not changed,** checked with `git diff 304771e2d HEAD`: `src/kernel/*`, `src/draggable.ts`, `src/free-drag/bounds.ts`, `src/sortable/layout-animation.ts`, `tests/activation.browser.test.ts` and `tests/hot-path.browser.test.ts`. Every size ceiling and control figure is unchanged. `grep -rniE 'lift|landing' src/kernel src/draggable.ts` finds nothing.

## Item 1: `DRF-5`

**The diff.** `FreeDragBehavior.activate` calls `this.bounds?.invalidate()` right after `this.#lifter.acquire(drag, visual)`, with a two-line comment. Nothing else in the source changes.

**The order property.** The invalidation precedes the operation's first `translate`, which is the first read of the bounds in the operation, because `translate` calls `#computeMotion` and that calls `bounds.apply`. So no operation clamps against a box measured before it activated (C4). After item 3, the call is still the statement after the acquisition, and `operation.translate()` is still the last statement of `activate`.

**The regression test:** "should clamp against bounds measured again after a scroll between operations (drag:DRF-5)" in `tests/free-drag.browser.test.ts`. A box in a 300 × 300 arena at `top: 200px`, inside a `position: fixed` 400 × 400 scrolling container whose content is 1200 px tall, with `bounds(arena)`. One drag and release, then `scrollTop = 150`, then a drag 80 px up, past the arena's top edge. One assertion of `{ arenaBefore, arenaAfter, boxTop }`, expected `{ 200, 50, 50 }`.

The drag is 80 px rather than the witness's 400 px, so the pointer stays inside the viewport. It still crosses the arena's top: the box's top is at 90 after the scroll and would reach 10 unclamped.

**Without the repair** ([`item1-witness-without-change.txt`](probes/feature-composition/implementation/item1-witness-without-change.txt)), the same failure in each engine:

| Engine   | Received                                            |
| -------- | --------------------------------------------------- |
| Chromium | `{ arenaBefore: 200, arenaAfter: 50, boxTop: 200 }` |
| Firefox  | `{ arenaBefore: 200, arenaAfter: 50, boxTop: 200 }` |
| WebKit   | `{ arenaBefore: 200, arenaAfter: 50, boxTop: 200 }` |

The message in each is `AssertionError: expected { arenaBefore: 200, …(2) } to deeply equal { arenaBefore: 200, …(2) }`, with `- "boxTop": 50` and `+ "boxTop": 200`. `arenaAfter` shows that the scroll happened. These are the architect's witness figures.

**With the repair:** `tests/free-drag.browser.test.ts` passes in all three engines, 27 tests ([`item1-free-drag-engines.txt`](probes/feature-composition/implementation/item1-free-drag-engines.txt)). M8 below removes the line again at the end and the test fails.

## Item 2: the landing capability

**The diff.** It ports the prototype's hunks for these files:

- `src/lift.ts`;
- `src/lift/landing.ts`, which is new;
- `src/shared/landing.ts` and `src/shared/timing.ts`;
- the two landing entries and `sortable/behavior.ts`;
- `free-drag/behavior.ts`'s `Landing` type only.

It also adds the packaging for `lift/landing.js`: the `exports` entry and `lift` in `files` in `package.json`, `files.json`, `typedoc.json` and `ENTRIES`. It updates the JSDoc of `land`, `Landing` and `landing()`, and `README.md`'s lift section.

**Where it differs from the prototype:**

- **One name.** The local the prototype called `reduced` is `effectiveDuration`: it is the duration in effect, and it is reduced only under the preference.
- **The JSDoc.** `Landing`'s says where the cancel is called. `landing()`'s says what the animation is, and that it returns a new value per call and holds no state.

The shipped code is otherwise the prototype's, and so are the size figures.

**Required properties, by reading:**

- **`land(x, y, landing)`** calls `landing.timing` once. It then assigns `named = { x, y, duration, easing, landing }`, which copies `duration` and `easing` and keeps the `Landing`. The object that `timing` returned is not kept. The assignment follows the call, so when `timing` throws, nothing is recorded. The last call wins.
- **The release disposer** is the first registration, as before. It calls `named.landing.start(visual, visualSpace, dx, dy, duration, easing, window)` with `dx = displacement.x - (named.x - rect.x)` and `dy` likewise. So the displacement is read at release, as before. Its return value goes to `#runningAnimationCanceller`, which `acquire`'s `finally` and `cancelLanding` cancel, as before.
- **`lift.ts`** has no `animate`, no `matchMedia`, no `TOP_Z_INDEX` and no default timing, and it doesn't import `shared/timing.ts`. Its only import of `shared/landing.ts` is a type import.
- **Unchanged:** acquisition, the release, the failed-acquisition path, `cancelLanding`, and the two disposers' registration order. The landing disposer is still registered before the release disposer, so it runs after it.

**Test edits, with no assertion changed:**

- the five `land` call sites: three in `tests/landing.browser.test.ts`, one in `tests/authoring.declaration.test.ts` and two in `tests/fixtures/drop-zone.ts`;
- the title "…, including a custom behavior's `landing()`".

**The new test:** "should start no animation when no landing is composed", under `drag:DRI-13 landing`. The `DRF-3` witness passes with only its call-site edit.

**Size graph declarations:** `example: drop zone` now declares `shared/landing` present and `layout-animation` absent. `draggable + lift` already declares `shared/landing` absent, and its graph check passes.

**Checks:**

- typecheck passes;
- `npx just test` in Chromium: 346 passed, and the 3 failures are size rows (§Suites);
- `tests/landing.browser.test.ts`, `tests/activation.browser.test.ts` and `tests/authoring.declaration.test.ts` in three engines: 84 passed.

## Item 3: the drop-target capability

**The diff.** It ports the rest of the prototype:

- `src/free-drag/drop-targets.ts`, which is new;
- the slot in `behavior.ts`;
- `operation.ts`, `domain.ts`, `geometry.ts`, and `free-drag.ts`'s comment.

It also adds the packaging for `free-drag/drop-targets.js`, the JSDoc, and `README.md`'s free-drag paragraph and example. `tests/drop-targets.browser.test.ts` is the prototype's test file without the lift block, which item 2 placed. The seven `freeDrag + dropTargets` tests are under `drag:DRI-21`, and "one config across controllers" is under `drag:DRD-33 C2`. Apart from comments and those titles, the shipped code is the prototype's, as the ablation in §Size shows.

**The order properties, by reading:**

- **The factory's order: allocation, then `drag.use`, then `targets()`.** In `dropTargets`' returned function, the statements before `drag.use` are:
  - `rects`, `elements`, `stale` and `current`;
  - the `mark` and `resolve` closures;
  - `createFrameTask`, which only creates its closures and requests nothing until `schedule`.

  None of them calls consumer code. `drag.use(() => { frame.cancel(); mark(null); })` comes next, and then `elements = options.targets()`. **No statement that can run consumer code comes before the registration.**

- **Where the factory runs.** `activate` calls `this.config.targets?.(drag, this.window)` as an argument of `new FreeDragOperation(…)`. That is after the lift's acquisition and item 1's invalidation, and before the listener and the first `translate`. A throw from `targets()` therefore leaves the operation's release to restore the lift and run the tracker's disposer.
- **Ownership.**
  - The tracker exists only in `FreeDragOperation`'s `readonly #targets`.
  - `FreeDragBehavior` gains no field. Its fields are those at the base.
  - There is no field that is `null` between operations, and no non-null assertion on operation state.
  - The closure holds the operation's `Drag`. The operation holds the closure, so both become unreachable together.
- **The invalidation listener** is the operation itself, through `handleEvent()`, which invalidates the bounds and the tracker. It is registered when `this.bounds || this.config.targets`.
- **The `invalidate` step** receives `FreeDragOperation | null` under DRI-8. It invalidates the bounds and calls `operation?.handleEvent()`. Between operations it reaches only the bounds, and the next tracker starts stale.
- **Item 1's invalidation** is unmoved and precedes the first `translate`.
- **The request.** `buildRequest` receives `this.#targets?.current ?? null` after `this.#targets?.drop()`, so `target` is resolved at the release position, and is `null` without the capability.
- **No landing into the target.** `settle` is unchanged, so an accepted drop doesn't land (`DRO-11`).

**Checks:**

- typecheck passes;
- `npx just test` in Chromium: 353 passed, and the 4 failures are size rows;
- `tests/drop-targets.browser.test.ts` and `tests/free-drag.browser.test.ts` in three engines: 51 passed.

**Mutations, in Chromium** ([`mutations-item3.txt`](probes/feature-composition/implementation/mutations-item3.txt)). Each was applied to the item-3 source, run, and reverted from a snapshot. None was committed.

|  | Mutation | Failed | Prototype | Failing tests and assertions |
| --- | --- | --: | --: | --- |
| M1 | The release no longer removes the mark | 5 | 5 | mark-and-name, destroyed mid-drag, re-read on invalidate, `targets()` throws, one config across controllers. Each fails on `expected true to be false` for `data-drop-over` after the release |
| M2 | The invalidation step no longer reaches the operation | 1 | 1 | re-read on invalidate: `expected false to be true` |
| M3 | The operation's `handleEvent` no longer reaches the tracker | 2 | 2 | re-read on invalidate, re-read after a scroll: `expected false to be true` |
| M4 | No invalidation listener without `bounds` | 1 | 1 | re-read after a scroll: `expected false to be true` |
| M5 | `drop()` cancels the frame but doesn't resolve | 1 | 1 | resolve at the release with no frame: `expected [ null ] to deeply equal [ …(1) ]` |
| M6 | The release no longer cancels the frame | 0 | 0 | — |
| M7 | `targets()` pulled before the release is registered | 0 | 0 | — |
| M8 | Item 1's activation invalidation removed, against `tests/free-drag.browser.test.ts` | 1 | Not run | `DRF-5`'s test: `boxTop` 200 instead of 50 |

**A first attempt at the mutation runs was invalid, and is not counted.** The loop restored files with `git checkout`, which reverted the uncommitted item-3 edits to `behavior.ts` and `operation.ts`, and it couldn't restore the untracked `drop-targets.ts`. The edits were applied again, and the loop was run again restoring from snapshots. The rebuilt source measured byte-identical to the earlier reading on every probe row. `npx just test` and the three-engine run of the two files were repeated on it before the commit, with the results above.

## Item 4: `RectIndex`

**The diff** is [`rect-index.diff.txt`](probes/feature-composition/rect-index.diff.txt), applied unchanged with `git apply`. Its effects:

- `#values`, `#count`, `#items` and `#placeholderRect` are private;
- getters return them typed as `ReadonlyFloat64Array`, `number`, `readonly HTMLElement[]` and `ReadonlyFloat64Array`;
- `ReadonlyFloat64Array` gains `slice`, which `verifyEquivalence` calls;
- nothing is frozen, copied or allocated per read.

**Readers.** `y.ts` and `xy.ts` already destructure `values`, `count`, `placeholderRect` and `items` from the index once per resolution, before the candidate loop. `xy.ts`'s `moved` reads `index.count` and `index.values` once each, before its loop. `linear-shift.ts` reads `count` once. `verifyEquivalence` reads through the class's getters. **So no reader file needed a change,** and none was made.

**Checks:**

- typecheck passes;
- `npx just test` in Chromium: 353 passed, and the 4 failures are size rows;
- `tests/sortable.browser.test.ts`, `tests/hot-path.browser.test.ts` and `tests/landing.browser.test.ts` in three engines: 218 passed and 4 skipped.

## Suites

**`npx just test`, Chromium.** The only failures, at every point, are rows of `tests/size.node.test.ts`:

| Point | Passed | Failed | The failing rows |
| --- | --: | --: | --- |
| Base | 343 | 4 | the `draggable alone` control, `example: drop zone`, `freeDrag`, `freeDrag + bounds + landing`, as the assessment's base |
| Item 1 | 344 | 4 | the same four. One test added |
| Item 2 | 346 | 3 | the control, drop zone, `freeDrag + bounds + landing`. **`freeDrag` now passes,** at 4908 under its 4967 ceiling. Two tests added |
| Item 3 | 353 | 4 | the four of the base. `freeDrag` fails again, by 19 B. Eight tests added |
| Item 4 | 353 | 4 | the same four |

Each failing row is over a ceiling the handoff doesn't let me re-base, or is the control that `DRO-4` already records as moved. No row fails a graph check.

**`npx just test-engines`, Chromium, Firefox and WebKit:**

| Point      |     Files | Tests                  |
| ---------- | --------: | ---------------------- |
| Item 1     | 66 passed | 948 passed, 18 skipped |
| End, run 1 | 69 passed | 975 passed, 18 skipped |
| End, run 2 | 69 passed | 975 passed, 18 skipped |
| End, run 3 | 69 passed | 975 passed, 18 skipped |

## The landing-test failure (`tests/activation.browser.test.ts`, "a grab during a landing")

Twenty runs of the block with `-t "a grab during a landing"`, each in Chromium, Firefox and WebKit:

| Point                     | Runs | Failures |
| ------------------------- | ---: | -------: |
| Base, `304771e2d`         |   20 |        0 |
| After item 2, `59cc79e74` |   20 |        0 |

Every run passed its 6 tests: 2 tests in each of 3 engines ([`flake-base.txt`](probes/feature-composition/implementation/flake-base.txt), [`flake-item2.txt`](probes/feature-composition/implementation/flake-item2.txt)). None of the three full end runs failed it either. The base runs used a worktree at `304771e2d`, so that edits in the main checkout couldn't reach them. They ran alone, and no other browser run shared the machine.

**One deviation:** `npx just test-engines … -t "a grab during a landing"` splits the pattern into words in the recipe, so the runs call `npx vitest run -c vitest.engines.config.ts` directly. A first base attempt through the recipe ran the wrong filter, was stopped after one run, and is not counted.

## Size

**`node bench/size/measure.ts`,** minified and Brotli bytes, with the change from the previous point. The control, ceilings and rows are unchanged.

| Composition | Base | Item 1 | Item 2 | Item 3 | Item 4 |
| --- | --- | --- | --- | --- | --- |
| `draggable alone` | 6600 / 2138 | = | = | = | = |
| `draggable + lift` | 12056 / 4152 | = | 11411 / 3912 (−645 / −240) | = | = |
| `example: resize handle` | 9257 / 3249 | = | = | = | = |
| `example: drop zone` | 12855 / 4439 | = | 13050 / 4529 (+195 / +90) | = | = |
| `example: canvas group` | 9393 / 3248 | = | = | = | = |
| `freeDrag` | 15269 / 5075 | 15295 / 5078 (+26 / +3) | 14822 / 4908 (−473 / −170) | 15035 / 4986 (+213 / +78) | = |
| `freeDrag + bounds + landing` | 15954 / 5330 | 15980 / 5347 (+26 / +17) | 15987 / 5351 (+7 / +4) | 16200 / 5394 (+213 / +43) | = |
| `sortable + y` | 20533 / 6652 | = | 19884 / 6414 (−649 / −238) | = | 19936 / 6428 (+52 / +14) |
| `sortable + xy` | 20153 / 6594 | = | 19506 / 6349 (−647 / −245) | = | 19558 / 6362 (+52 / +13) |
| `complete` | 21552 / 7037 | = | 21557 / 7047 (+5 / +10) | = | 21609 / 7063 (+52 / +16) |

**Attribution:**

- **Item 1:** the one invalidation call, on the `freeDrag` rows only.
- **Item 2:** the landing animation, the elevation constant and the default timing leave the lift. Lifted compositions that compose no landing lose them. Compositions that compose `landing()` gain `Landing`'s object form. The drop-zone fixture now imports `landing()`, where it used to get the lift's default.
- **Item 3:** the slot's call sites, which are the `targets` key's read, the constructor parameter and field, the calls in `move` and `drop`, the request's `target`, and the listener's move to the operation.
- **Item 4:** the getters, on the sortable rows only.
- **`draggable alone`** is byte-identical at every point (C10).

**The composition probe,** [`compose.ts.txt`](probes/feature-composition/compose.ts.txt) copied to `bench/compose-probe.ts`, which is not committed. These are the rows the instrument lacks, at every point:

| Composition | Base | Item 1 | Item 2 | Item 3 = end | Carries, end |
| --- | --- | --- | --- | --- | --- |
| `draggable + lift + landing` | n/a | n/a | 12251 / 4246 | 12251 / 4246 | landing animation, landing timing |
| `freeDrag + landing` | 15449 / 5172 | 15475 / 5166 | 15482 / 5179 | 15695 / 5238 | landing animation, landing timing |
| `freeDrag + dropTargets` | n/a | n/a | n/a | 15705 / 5217 | drop targets |
| `freeDrag + dropTargets + landing` | n/a | n/a | n/a | 16365 / 5473 | landing animation, landing timing, drop targets |

At the end, `freeDrag`, `draggable + lift` and `sortable + y` carry no landing animation, and no composition without `dropTargets` carries its marker. The instrument's graph check of `free-drag/drop-targets` as absent from `freeDrag` and `freeDrag + bounds + landing` passes (C7).

**The slot's charge against `DRO-10`.** This is item 3 against its parent, item 2:

| Composition | Item 2 | Item 3 | Charge | `DRO-10`, up to 45 B | Prototype |
| --- | --- | --- | --- | --- | --- |
| `freeDrag` | 14822 / 4908 | 15035 / 4986 | +213 / **+78** | **Not covered** | +209 / +45 |
| `freeDrag + landing` | 15482 / 5179 | 15695 / 5238 | +213 / **+59** | **Not covered** | — / +44 |
| `freeDrag + bounds + landing` | 15987 / 5351 | 16200 / 5394 | +213 / +43 | Covered | — / +35 |

**Why the figures differ from the prototype's** ([`compose-slot-ablation.txt`](probes/feature-composition/implementation/compose-slot-ablation.txt)). The prototype measured the slot over a lift split without item 1. Item 1's line was removed from both states and the probe run again:

- the parent read `freeDrag` 4903, `freeDrag + landing` 5174 and `freeDrag + bounds + landing` 5357;
- item 3 read 4948, 5218 and 5392, and `freeDrag + dropTargets` 5209 and `freeDrag + dropTargets + landing` 5465.

So the charge is +45, +44 and +35 B, and every one of those figures is the prototype's. The port reproduces the prototype exactly. **The extra 33 B and 15 B on the first two rows come from compressing the slot together with item 1's line.** Minified, the charge is +213 B both with and without that line. CONTRIBUTING §15 says not to add ablations. The joint figure, +78 B, is the one that landed and the one that counts.

## Allocation, counted by reading

These are counted with the [ownership report](ownership-report.md)'s rules. A count covers JavaScript objects and functions that library code creates at a site it owns. It excludes closure contexts, strings, objects the platform returns and array backing-store growth.

- **Per `freeDrag` activation without `dropTargets`:** nothing added. `config.targets?.()` short-circuits. The listener, when `bounds` is configured, is the operation itself, where it used to be the behavior's existing `invalidate` closure. The operation gains one field, which holds `null`. Item 1's call allocates nothing.
- **Per `freeDrag` activation with `dropTargets`:** 3 objects and 11 functions.
  - **Objects:** the `rects` array, the frame task, and the tracker.
  - **Functions:** `mark`, `resolve`, the frame callback, the frame task's `fire`, `schedule` and `cancel`, the release disposer, and the tracker's `current` getter, `move`, `drop` and `invalidate`.
  - The `targets()` array is the consumer's.
- **Per measurement of the targets:** one `DOMRect` per target, which the platform returns, stored in place in `rects`. `rects` grows only at the first measurement of an operation. A measurement happens at the first resolution and after an invalidation.
- **Per frame:** `drag.requestStep(resolve)` passes a function that already exists.
- **Per lifted activation without a landing:** unchanged. `named` stays `null`, and nothing calls `timing` or `start`.
- **Per lifted activation with a landing:** unchanged in count. `land` makes one record, and `timing` returns one object, as `landing()`'s timing did at the base. `start` is a module function, so the release allocates what the base's `startLandingAnimation` did.
- **Per `landing()` call,** which is configuration and not per operation: 1 object and 1 function, where the base made 1 function. `start` is shared.
- **Per sample:** nothing. `move()` only calls `frame.schedule()`, which requests a frame when none is pending. `RectIndex`'s getters return the existing fields. The per-sample test, `tests/hot-path.browser.test.ts`, passes in every Chromium run above and in the three-engine runs.

## Costs, reported and not accepted

None is accepted here. The assessment's figures (§7, §8) are given beside each.

| Cost | Measured here | Assessment |
| --- | --- | --- |
| **The `targets` slot** on compositions without `dropTargets` | **+78 B** `freeDrag`, **+59 B** `freeDrag + landing`, +43 B `freeDrag + bounds + landing`, all +213 B minified. **Above `DRO-10`'s 45 B on the first two** | +45, +44, +35 |
| **The `bounds` repair (`DRF-5`)** | +26 B minified on both `freeDrag` rows. Brotli is +3 B on `freeDrag` and +17 B on `freeDrag + bounds + landing`, and −6 B on `freeDrag + landing` | +3, +17 |
| **The landing capability,** on lifted compositions without a landing | −240 B `draggable + lift`, −170 B `freeDrag`, −238 B `sortable + y`, −245 B `sortable + xy` | −172 to −240 |
| **The landing capability,** on compositions with a landing | +4 B `freeDrag + bounds + landing`, +13 B `freeDrag + landing`, +10 B `complete` | +2 to +27 |
| **The landing capability,** on the drop-zone fixture | +90 B Brotli, +195 B minified | +90 |
| **The drop-target capability, when composed** | +231 B Brotli and +670 B minified over `freeDrag`, and +235 B and +670 B over `freeDrag + landing` | 261 B and 670 B |
| **Per operation, with `dropTargets`** | 3 objects and 11 functions, and one `DOMRect` per target per measurement | the same list |
| **`RectIndex`'s encapsulation** | +52 B minified, and +14, +13 and +16 B Brotli on `sortable + y`, `sortable + xy` and `complete` | +13 to +16 |

The drop-target capability measures smaller over `freeDrag` than in the assessment because `freeDrag` itself grew with item 1. The capability's own bytes are the prototype's: in the ablation, `freeDrag + dropTargets` reads 5209, the assessment's figure.

**Size rows.** `example: drop zone` now declares the landing it composes. `draggable + lift + landing`, `freeDrag + dropTargets` and `freeDrag + dropTargets + landing` have no row in the instrument, because a new row needs a ceiling and ceilings wait for `DRO-4`. The four failing rows above stay failing.

## Limits

- **M6.** A late frame's `requestStep` through a released `Drag` does nothing (DRI-8). So the release's `frame.cancel()` is cleanup that no test observes.
- **M7.** Nothing that needs release exists before the pull, so the order can't be observed. C4 requires the order, and it is established by reading (§Item 3).
- **The throw test** passes against the first prototype as well. Its defect was retention, which no behavior shows. So no test witnesses the factory's ordering or the operation's ownership of the tracker. Both are read from the source.
- **C8 for `dropTargets`** is established by reading only. The per-sample test composes no drop targets.
- **The landing-test failure** in the prototype's second run is still not reproduced and not attributed. Its counts are above.
- **The per-sample allocation test runs only in Chromium,** as before.
- **No timing was measured,** and nothing was optimized.

## Next

**The owner** reads the costs, and decides whether the `targets` slot's +78 B and +59 B are accepted, since `DRO-10` covers 45 B. `DRO-11`'s default is built. **The combined review is a separate unit,** and was not started.