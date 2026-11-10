# Remediation report

**Input:** `drag/production` at `45f5034d8`, which carries [`remediation-handoff.md`](remediation-handoff.md) with the clarified three-round retained rule. The production source there is `d7e7b0d3a`'s. **Governing records:** [`contract.md`](contract.md), and `DRD-14` to `DRD-23` in [`00-index.md`](00-index.md).

**Outcome:** steps 1 to 5 and 7 are implemented, and step 6 ran once. Commits, in order:

| Commit | Step | Content |
| --- | --- | --- |
| `147abd54c` | 1 | Root `rolldown`, size re-base, lint, format and TypeDoc gates |
| `b894e20ea` | 2 | `sortable` and `freeDrag` as internal classes, behavior preserved (`DRD-20`) |
| `03a280e2a` | 3, 4, 5, 7 | Kernel, built-ins, tests, README and stories |
| `b499eaee0` | 7 | drag2 and repository documents, `drag` scope in `entry.ts` |
| `70a2203d8` | 5, 6 | Paired judge, retained-object instrument, witnesses, mutations, re-judged reading |
| the commit carrying this report | 6, 8 | Validation readings, profile and attribution instruments, this report |

**Pending for the owner:** `DRO-4` (below). **Not decided here:** no cost, ceiling or control is accepted, and the size test is red on purpose (§Size).

## Step 1: toolchain and gates

- **`integrity-1`.** `npm uninstall rolldown -w @ydinjs/drag` removed the `1.1.5` pin and the nested lock entries, so `bench/size/measure.ts` resolves the root `1.2.15`. Both readings and the re-base are in [`2026-11-07-size-rebase.md`](measurements/2026-11-07-size-rebase.md). The control moved 2035 → 2024 and each ceiling moved by its row's toolchain change, which keeps each row's slack. **Check:** a detached worktree at `147abd54c`, `npm ci --ignore-scripts`, root `npm run build`, then `just test` in `packages/drag`: 273 of 273 passed, and `packages/drag/node_modules` held only `@types`.
- **`integrity-2`.** `.scripts/vitest-config.ts`: `forEngine` takes the project's name as a parameter, so neither the assertion nor `String(test?.name)` is needed. `oxlint`, `eslint` and the root `tsc` pass on it.
- **`integrity-3`.** `oxfmt` ran on `box-quad/tests/local-delta.browser.test.ts`, drag2's `contract/00-index.md` and `measurements/budget-rebases.md`. **Excluded from formatting instead:** `2026-11-06-compare.json` and `2026-11-06-instrument-proof.json`, named in `.oxfmtrc.json`. They would reflow by 13,890 and 1,654 diff lines, and the handoff forbids editing the 2026-11-06 files. `drag`'s `fmt-check` still fails on `probes/prototype/checks.json` and `cost.json`, as at `a1d31e0d2` and `d7e7b0d3a`.
- **`integrity-4`.** `typedoc.json` uses a new `tsconfig.docs.json` that includes `src` and not `tests`. `just docs-api-prepare` exits 0 with 8 warnings and no errors.

## Step 2: classes (`DRD-20`)

`sortable()` and `freeDrag()` each build one module-private `SortableBehavior` or `FreeDragBehavior`, pass it to `draggable` as the behavior, and return its `controller` field, a plain object whose arrow functions close over the kernel's controller and the instance. Hooks are prototype methods, and the kernel calls them as methods. Steps, disposers and listeners handed elsewhere are arrow fields created once per instance (`#updateInsertion`, `#invalidateGeometry`, `#retireAxis`, `#reloadCollection`, `#invalidateBounds`), or closures created once per operation where they close over it (the frame callback, the invalidation listener, the placeholder disposer). Operation values stay in `drag.state`. `panel` is gone (`cleanup-4`): the kernel's controller is the local `kernel`.

**One reading of `DRD-20` to confirm.** `freeDrag`'s `moveTo(point)` still creates its step per call. It carries the call's point, and `DRI-8` names `moveTo`'s closures as the case that keeps call order. A stable step with the point in an instance field would coalesce two calls, and a call before and after an `invalidate()` would then run in a different order. So `moveTo` is the exception to "never per call", and the source comment says so.

**Check:** the three-engine suite passed with 745 passed and 14 skipped, the count at `d7e7b0d3a`. The only test edit is the `WeakRef` destruction test, which now also counts `SortableBehavior` objects in a heap snapshot (`commands.countHeapObjects`). It was shown to fail when the instance is kept alive.

### Step-2 readings for `DRO-4`

Measured at `b894e20ea` against `147abd54c`, with the post-step-1 toolchain. Not accepted.

**Size, Brotli bytes:**

| Row | `147abd54c` | `b894e20ea` | Change |
| --- | --: | --: | --: |
| `draggable` alone (control) | 2024 | 2024 | 0 |
| `draggable` + `lift` | 4036 | 4036 | 0 |
| Examples: resize handle, drop zone, canvas group | 3164, 4315, 3176 | 3164, 4315, 3176 | 0 |
| `freeDrag` | 4842 | 4909 | +67 |
| `freeDrag` + `bounds` + `landing` | 5100 | 5170 | +70 |
| `sortable` + `y` | 6600 | 6654 | +54 |
| `sortable` + `xy` | 6478 | 6558 | +80 |
| `complete` | 6960 | 7025 | +65 |

The cause is the class form: private fields and their brand checks, and `this.#` reads where the closures read captured locals. The control row didn't move, which is the expected result for a change outside the kernel. Every row stayed under its ceiling.

**300 moves, paired rule, 7 rounds, arms `before` (`147abd54c`), `production` (`b894e20ea`) and `control`:** raw output in [`2026-11-07-classes-moves.json`](measurements/2026-11-07-classes-moves.json).

| Row | Layouts | Script: higher in, median, A/A bound | Task: higher in, median, A/A bound | Verdict |
| --- | --- | --- | --- | --- |
| 20 items | 83 against 83 | 5 of 7, +25 µs, 48 µs | 4 of 7, +178 µs, 413 µs | No difference shown |
| 2,000 items | 83 against 83 | 2 of 7, −14 µs, 43 µs | 3 of 7, −51 µs, 761 µs | No difference shown |
| Free drag | 0 against 0 | 2 of 7, −6 µs, 39 µs | 2 of 7, −92 µs, 657 µs | No difference shown |

Timing figures are per move. This reading was taken before the step-6 instrument proof ran, by the same judge. "No difference shown" is not equality.

## Steps 3 to 5: decisions, tests, witnesses and mutations

Every new test names its entry and runs in Chromium, Firefox and WebKit with Playwright input, except where a row says otherwise. **Witness:** the same test file run against `45f5034d8`'s source in all three engines, recorded in [`2026-11-07-witnesses-at-45f5034d8.tsv`](measurements/2026-11-07-witnesses-at-45f5034d8.tsv). **Mutation:** a throwaway edit, run by [`mutations.py.txt`](measurements/mutations.py.txt), with the failing test recorded in [`2026-11-07-mutations.tsv`](measurements/2026-11-07-mutations.tsv) (Chromium).

### `DRD-14`: the lift owns what it writes

`onDrop`'s JSDoc says it decides and the commit goes in `onEnd`. The README lists the owned properties and commits in `onEnd`, and so does the free-drag story.

| Test | Base | Mutation |
| --- | --- | --- |
| `commit` › keep a translate committed in onEnd | passes (no defect) | — |
| `commit` › keep left and top committed in onEnd | passes (no defect) | — |
| `commit` › revert at release a write to a lifted property made during the lift | passes (no defect) | Keep a write made during the lift |
| `commit` › README quick start, free-drag example (two drags), scrolling-container example | quick start and free-drag pass; scrolling fails 3 of 3 | — |

The README's free-drag example at the base commits in `onDrop`, and its failure is `challenge-1`'s probe `P7b` (3 of 3). The example as it is now commits in `onEnd` and passes at base too, so its base run is no witness.

### `DRD-15`: release, landing, `end`, focus

`#conclude` now releases, starts the landing, and sets `end` as the next step, which restores focus in a `finally`. Without `start`, focus is restored right after release.

| Test (`order`) | Base | Mutation |
| --- | --- | --- |
| start the landing before the focus call | fails 3 of 3 | Restore focus before the landing starts |
| keep focus through two arrow presses that reorder in end | fails 3 of 3 | Restore focus before end |
| restore focus when end throws | fails 3 of 3 | Restore focus before end |
| restore focus when end requests destruction | fails 3 of 3 | Restore focus before end |
| no restore when destruction is requested before the terminal | fails 3 of 3 | — |

### `DRD-16`: scoped requests

`drag.requestStep` acts only while `this.#session === session`. `#release` runs once and records `releasedWith`, so a late `use` receives the outcome, or `null` only when destruction released the operation.

| Test (`scoped-requests`) | Base | Mutation |
| --- | --- | --- |
| no step through a retained drag while a later operation is active | fails 3 of 3 | Let `drag.requestStep` act after its operation |
| no step through a retained drag while idle | fails 3 of 3 | the same |
| a late disposer gets the outcome after destruction of a concluded operation | fails 3 of 3 | — |
| a late disposer gets `null` when destruction released its operation | passes (no defect) | — |

### `DRD-17`: input ownership

The pointer stream, `pointerdown` and `Escape` are read on the window in the capture phase. A pending press ends quietly on a sample whose `buttons` lacks the primary bit, and on a new primary `pointerdown`, which the root then admits. A module-level `WeakSet` of admitted events gives one admission per event across controllers. `#onEscape` prevents the default when the session has started and is undecided.

| Test (`input`) | Base | Mutation |
| --- | --- | --- |
| no hover activation after `pointerup` stopped on a child; next press reorders | fails 3 of 3 | Listen in the bubble phase |
| the same, stopped on an ancestor of the root | fails 3 of 3 | Listen in the bubble phase |
| end a press whose release the window never saw, at the next sample with no button | fails 3 of 3 | Skip the buttons check |
| admit a primary press while a press whose release was missed is pending | fails 3 of 3 | Refuse a press while one is pending |
| keep an active drag following the pointer when the page stops `pointermove` | fails 3 of 3 | Listen in the bubble phase |
| ignore a second pointer moving during a drag (`reviewer-6`) | passes (no defect) | — |
| reorder links marked `draggable="false"` | passes (no defect) | — |
| nested: reorder the inner list only, with no attribute | fails 3 of 3 | Offer an admitted event to an outer controller |
| nested: move a column from its header | passes (no defect) | — |
| nested: keyboard command on the inner list only | fails 3 of 3 | Offer an admitted event to an outer controller |
| `Escape`: cancel and keep a modal dialog open | fails 3 of 3 | Don't prevent `Escape`'s default |
| `Escape`: cancel and keep an `auto` popover open | fails 3 of 3 | the same |
| `Escape`: cancel a pending verdict and keep a modal dialog open | fails 3 of 3 | the same |
| `Escape`: not prevented before start | passes (no defect) | — |

"The release the window never saw" is produced by a page listener registered on the window before the press, which stops the `pointerup` before the kernel's listener. A release outside a real browser window was not produced.

### `DRD-18`: activation

The kernel's quiet decline for a disconnected item was already in place. The lift now measures with a running flight and cancels it afterwards, in a `finally`. `sortable` pulls at activation for commands too: `state.direction` holds the command's direction, and the target is computed from the activation pull. The `-1` tests are gone (`cleanup-3`), and so is `keyboardInsertion`'s unreachable `-1` guard (`cleanup-5`).

| Test (`activation`) | Base | Mutation |
| --- | --- | --- |
| a custom behavior with an item disconnected during the press gets no hook | passes (no defect) | — |
| a command whose item leaves during the lift declines quietly | fails 3 of 3 | Skip the command activation pull |
| a command whose move becomes impossible during the lift declines quietly | fails 3 of 3 | — |
| a keyboard command lands from the old slot (`reviewer-6`) | passes (no defect) | — |
| a grab during an accepted landing keeps the visual within 1 px | fails 3 of 3 | Cancel the landing before measuring |
| the same during a rejected landing | fails 3 of 3 | the same |

The re-grab tests use a 20 s linear flight, so the flight moves well under 1 px between the press and the activation. With a 2 s flight the visual drifted 2.2 px in that interval in Chromium. That drift is the flight's motion before the threshold, which the contract leaves alone.

### `DRD-19`: free drag measured from home

`drop` reads `home()` once (`#home`) and `buildRequest` gives both deltas from home to the visual's top-left at the drop. Without `home` this equals the old pointer travel.

| Test (`commit`) | Base | Mutation |
| --- | --- | --- |
| scrolling container with `home`: commits where dropped, and a rejected drop lands home with no jump | fails 3 of 3 | Ignore `home` at the drop |
| without `home`, an unscrolled drag commits where dropped | passes (no defect) | — |

### `DRD-20`: controllers

`Gesture`'s `requestCancel`, `requestDestroy` and `use` are arrow fields.

| Test (`classes`) | Base | Mutation |
| --- | --- | --- |
| draggable controller methods detached | fails 3 of 3 | — |
| sortable and freeDrag controller methods detached | pass (already closures) | — |
| no `FreeDragBehavior` retained after destruction (Chromium) | fails (no class at base) | the same check kept alive an instance: fails |

### `DRD-21` and the review items

- `LinearShift(index)` and `RectIndex.advance(lo, hi, delta)` / `remeasurePlaceholder(placeholder)` work along y only, and `edge()` is gone. `RectIndex` grows by doubling and never shrinks.
- **`sortable/anchor-outside-container`** and **`sortable/insertion-placeholder-lost`** each have a test naming the message (`activation` › placeholder faults). Both pass at base, where the faults already existed.
- **`reviewer-3`:** `activation` › schedule one frame for several samples in one task. The mutation "Remove frame coalescing" reddens it, and nothing else did before.

### Discipline items

| Item | Done |
| --- | --- |
| `cleanup-1` | `Insertion.version` and `insertionAt`'s snapshot parameter removed |
| `cleanup-2` | One mapped type, `WritableLiftedDrag`, exported as a type from `draggable.ts` and used by the kernel and the lift. It was already in `lift`'s published signature, unnamed |
| `cleanup-3` | Commands are told apart by `state.direction` |
| `cleanup-4` | The `Window` is `window` / `#window` everywhere, the kernel's per-operation object is `drag`, its generic is `Operation`, `panel` is gone, and `describe` is `readMessage` |
| `cleanup-5` | Removed |
| `cleanup-6` | `LinearShift.#view`, `y()`'s `view` alias and the `DEV` export removed. `linear-shift.ts` reads `__DEV__` |
| `cleanup-7` | `ReadonlyFloat64Array` is a `type` |
| `cleanup-8` | `buildGeometry(drag, motion, window)` and `buildRequest(item, drag, motion, home, window)` |
| `cleanup-9` | Landing defaults live once, in `shared/timing.ts`. **Left duplicated, with a reason:** the `localDelta` fallback in `free-drag/geometry.ts` and `layout-animation.ts`, and the resolution brand and factories in the two `domain.ts` files. Sharing either needs a new module across two optional features (CONTRIBUTING §7) |
| `cleanup-10` | `bounds()` holds `held` and `stale` |
| `cleanup-11` | `freeDrag` names `handle` only when configured |

### Tests changed by the remediation

- `destruction` › tear down totally when requested from a listener: the page listener is now a window-capture listener registered before the press. The old root listener ran before the kernel only because the kernel listened on `document` in the bubble phase, which `DRD-17` replaces.
- `hot-path`: the lift's write is named `drag.translate` after the rename.

### Mutations

All 45 mutations make some test fail: the 32 existing ones, re-targeted at the current source, and the 13 from the handoff. The table in [`2026-11-07-mutations.tsv`](measurements/2026-11-07-mutations.tsv) gives the count and the first failing test of each. "Refuse a press while one is pending" first survived, because its test registered the hiding listeners after the press, behind the kernel's. The test was corrected, and it then failed under the mutation, passed in three engines, and failed at base in three.

## Step 6: validation

Rules as [`remediation-handoff.md`](remediation-handoff.md) states them at `45f5034d8`, applied by `judge` in `bench/compare.ts`. Chromium headless, one browser process, fresh pages, arms interleaved with a rotating first arm. Raw output: [`2026-11-07-compare.json`](measurements/2026-11-07-compare.json). Timing figures are per move, per press, per cycle or per reorder; layout counts are per run.

### The 2026-11-06 reading, re-judged

No new run. The paired rule applied to the recorded raw data: [`2026-11-07-rejudged-2026-11-06.json`](measurements/2026-11-07-rejudged-2026-11-06.json). The two retained rows are not re-judged, because the new rule reads each round's growth between a 0-operation and a 200-operation page, and the recorded absolute heap does not carry it. **Caveat:** that run's `control` arm also ran the consumer's refocus in `onEnd` (§Faults found), so the A/A bounds of the cycle and keyboard rows include one extra `focus()` call per cycle.

| Row | Against | Metric | Higher in | Median paired difference | A/A bound | Verdict |
| --- | --- | --- | --: | --: | --: | --- |
| 300 moves, one frame each, 20 items | drag2 | layouts |  |  |  | at or below: 83 against 83 |
| 300 moves, one frame each, 20 items | drag2 | scriptUs | 2 of 7 | -29 µs | 55 µs | no difference shown |
| 300 moves, one frame each, 20 items | drag2 | taskUs | 6 of 7 | 84 µs | 790 µs | no difference shown |
| 300 moves, one frame each, 20 items | prototype | layouts |  |  |  | at or below: 83 against 83 |
| 300 moves, one frame each, 20 items | prototype | scriptUs | 4 of 7 | 11 µs | 55 µs | no difference shown |
| 300 moves, one frame each, 20 items | prototype | taskUs | 5 of 7 | 97 µs | 790 µs | no difference shown |
| 300 moves, one frame each, 2000 items | drag2 | layouts |  |  |  | at or below: 83 against 83 |
| 300 moves, one frame each, 2000 items | drag2 | scriptUs | 0 of 7 | -49 µs | 55 µs | no difference shown |
| 300 moves, one frame each, 2000 items | drag2 | taskUs | 3 of 7 | -96 µs | 947 µs | no difference shown |
| 300 moves, one frame each, 2000 items | prototype | layouts |  |  |  | at or below: 83 against 83 |
| 300 moves, one frame each, 2000 items | prototype | scriptUs | 2 of 7 | -7 µs | 55 µs | no difference shown |
| 300 moves, one frame each, 2000 items | prototype | taskUs | 2 of 7 | -44 µs | 947 µs | no difference shown |
| press and release below the threshold, 20 items, [...root.children] | drag2 | scriptUs | 2 of 7 | -25 µs | 53 µs | no difference shown |
| press and release below the threshold, 20 items, [...root.children] | drag2 | taskUs | 2 of 7 | -33 µs | 193 µs | no difference shown |
| press and release below the threshold, 20 items, [...root.children] | prototype | scriptUs | 3 of 7 | -12 µs | 53 µs | no difference shown |
| press and release below the threshold, 20 items, [...root.children] | prototype | taskUs | 2 of 7 | -60 µs | 193 µs | no difference shown |
| press and release below the threshold, 20 items, cached array | drag2 | scriptUs | 3 of 7 | -12 µs | 24 µs | no difference shown |
| press and release below the threshold, 20 items, cached array | drag2 | taskUs | 5 of 7 | 59 µs | 122 µs | no difference shown |
| press and release below the threshold, 20 items, cached array | prototype | scriptUs | 4 of 7 | 1 µs | 24 µs | no difference shown |
| press and release below the threshold, 20 items, cached array | prototype | taskUs | 4 of 7 | 37 µs | 122 µs | no difference shown |
| press and release below the threshold, 2000 items, [...root.children] | drag2 | scriptUs | 7 of 7 | 255 µs | 131 µs | FLAG slower |
| press and release below the threshold, 2000 items, [...root.children] | drag2 | taskUs | 7 of 7 | 284 µs | 212 µs | FLAG slower |
| press and release below the threshold, 2000 items, [...root.children] | prototype | scriptUs | 2 of 7 | -65 µs | 131 µs | no difference shown |
| press and release below the threshold, 2000 items, [...root.children] | prototype | taskUs | 2 of 7 | -119 µs | 212 µs | no difference shown |
| press and release below the threshold, 2000 items, cached array | drag2 | scriptUs | 2 of 7 | -15 µs | 38 µs | no difference shown |
| press and release below the threshold, 2000 items, cached array | drag2 | taskUs | 4 of 7 | 17 µs | 129 µs | no difference shown |
| press and release below the threshold, 2000 items, cached array | prototype | scriptUs | 3 of 7 | -3 µs | 38 µs | no difference shown |
| press and release below the threshold, 2000 items, cached array | prototype | taskUs | 2 of 7 | -22 µs | 129 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, no landing | drag2 | layouts |  |  |  | at or below: 250 against 300 |
| 50 activate-and-drop cycles, 20 items, no landing | drag2 | scriptUs | 3 of 7 | -217 µs | 347 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, no landing | drag2 | taskUs | 7 of 7 | 1804 µs | 2312 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, no landing | prototype | layouts |  |  |  | at or below: 250 against 250 |
| 50 activate-and-drop cycles, 20 items, no landing | prototype | scriptUs | 7 of 7 | 334 µs | 347 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, no landing | prototype | taskUs | 7 of 7 | 1364 µs | 2312 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, with landing | drag2 | layouts |  |  |  | FLAG more: 400 against 350 |
| 50 activate-and-drop cycles, 20 items, with landing | drag2 | scriptUs | 0 of 7 | -277 µs | 421 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, with landing | drag2 | taskUs | 5 of 7 | 479 µs | 1614 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, with landing | prototype | layouts |  |  |  | FLAG more: 400 against 350 |
| 50 activate-and-drop cycles, 20 items, with landing | prototype | scriptUs | 4 of 7 | 112 µs | 421 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, with landing | prototype | taskUs | 3 of 7 | -147 µs | 1614 µs | no difference shown |
| 50 activate-and-drop cycles, 2000 items, no landing | drag2 | layouts |  |  |  | at or below: 250 against 300 |
| 50 activate-and-drop cycles, 2000 items, no landing | drag2 | scriptUs | 2 of 7 | -529 µs | 805 µs | no difference shown |
| 50 activate-and-drop cycles, 2000 items, no landing | drag2 | taskUs | 7 of 7 | 3984 µs | 5413 µs | no difference shown |
| 50 activate-and-drop cycles, 2000 items, no landing | prototype | layouts |  |  |  | at or below: 250 against 250 |
| 50 activate-and-drop cycles, 2000 items, no landing | prototype | scriptUs | 4 of 7 | 36 µs | 805 µs | no difference shown |
| 50 activate-and-drop cycles, 2000 items, no landing | prototype | taskUs | 4 of 7 | 599 µs | 5413 µs | no difference shown |
| 50 activate-and-drop cycles, 2000 items, with landing | drag2 | layouts |  |  |  | FLAG more: 400 against 350 |
| 50 activate-and-drop cycles, 2000 items, with landing | drag2 | scriptUs | 2 of 7 | -331 µs | 2101 µs | no difference shown |
| 50 activate-and-drop cycles, 2000 items, with landing | drag2 | taskUs | 5 of 7 | 1817 µs | 11899 µs | no difference shown |
| 50 activate-and-drop cycles, 2000 items, with landing | prototype | layouts |  |  |  | FLAG more: 400 against 350 |
| 50 activate-and-drop cycles, 2000 items, with landing | prototype | scriptUs | 4 of 7 | 67 µs | 2101 µs | no difference shown |
| 50 activate-and-drop cycles, 2000 items, with landing | prototype | taskUs | 2 of 7 | -1468 µs | 11899 µs | no difference shown |
| 50 keyboard reorders, 20 items, with focus restoration | drag2 | layouts |  |  |  | at or below: 50 against 100 |
| 50 keyboard reorders, 20 items, with focus restoration | drag2 | scriptUs | 3 of 7 | -20 µs | 129 µs | no difference shown |
| 50 keyboard reorders, 20 items, with focus restoration | drag2 | taskUs | 4 of 7 | 42 µs | 324 µs | no difference shown |
| 50 keyboard reorders, 20 items, with focus restoration | prototype | layouts |  |  |  | at or below: 50 against 50 |
| 50 keyboard reorders, 20 items, with focus restoration | prototype | scriptUs | 4 of 7 | 97 µs | 129 µs | no difference shown |
| 50 keyboard reorders, 20 items, with focus restoration | prototype | taskUs | 5 of 7 | 167 µs | 324 µs | no difference shown |
| 50 keyboard reorders, 2000 items, with focus restoration | drag2 | layouts |  |  |  | at or below: 50 against 100 |
| 50 keyboard reorders, 2000 items, with focus restoration | drag2 | scriptUs | 4 of 7 | 3 µs | 182 µs | no difference shown |
| 50 keyboard reorders, 2000 items, with focus restoration | drag2 | taskUs | 1 of 7 | -309 µs | 357 µs | no difference shown |
| 50 keyboard reorders, 2000 items, with focus restoration | prototype | layouts |  |  |  | at or below: 50 against 50 |
| 50 keyboard reorders, 2000 items, with focus restoration | prototype | scriptUs | 4 of 7 | 64 µs | 182 µs | no difference shown |
| 50 keyboard reorders, 2000 items, with focus restoration | prototype | taskUs | 5 of 7 | 69 µs | 357 µs | no difference shown |
| free drag, 300 moves, one frame each | drag2 | layouts |  |  |  | at or below: 0 against 0 |
| free drag, 300 moves, one frame each | drag2 | scriptUs | 1 of 7 | -30 µs | 31 µs | no difference shown |
| free drag, 300 moves, one frame each | drag2 | taskUs | 3 of 7 | -3 µs | 531 µs | no difference shown |
| free drag, 300 moves, one frame each | prototype | layouts |  |  |  | at or below: 0 against 0 |
| free drag, 300 moves, one frame each | prototype | scriptUs | 5 of 7 | 2 µs | 31 µs | no difference shown |
| free drag, 300 moves, one frame each | prototype | taskUs | 4 of 7 | 34 µs | 531 µs | no difference shown |

**What changes:** the cycle rows' 7-of-7 task differences (`reviewer-4`) stay **no difference shown**, because each median is inside that row's A/A bound. That is not equality. The press row at 2,000 items with `[...root.children]` is **slower** than drag2 under the paired rule, where the old floor rule had called it reported only. That is `DRO-1`'s known cost. The landed cycles' layout flag stands, as recorded.

### Instrument proof

Raw output: [`2026-11-07-instrument-proof-run1.txt`](measurements/2026-11-07-instrument-proof-run1.txt), [`2026-11-07-instrument-proof-run2.txt`](measurements/2026-11-07-instrument-proof-run2.txt) and [`2026-11-07-instrument-proof.json`](measurements/2026-11-07-instrument-proof.json) (run 2). Each injection runs as `production` against unpatched production, with a second copy of the injected bundle as its control, over 7 rounds (3 for the retained row and the byte rows).

| Injection | Row | Result |
| --- | --- | --- |
| About 1 ms of script per cycle, at the drop | 50 cycles, 20 items, no landing | **Flagged, run 1.** Script slower in 7 of 7, +1,051 µs, A/A bound 488 µs. Task: higher in 6 of 7, +1,290 µs, inside its 2,968 µs bound |
| One object of about 1 KB retained per operation past destruction | 200 operations, retained objects | **Flagged, run 1.** Retains more in 3 of 3, +207,384 B, bound 0 B |
| One O(n) walk per move | 300 moves, 2,000 items | **Flagged, run 1.** Script slower in 7 of 7, +917 µs, bound 512 µs |
| One forced layout per move | 300 moves, 20 items | **Flagged, run 2:** 365 layouts against 83. Run 1 wrote `min-height` on the lifted item, which forced no layout, and is not a reading |
| 1 KB allocated per move | Bytes per move | **Flagged, run 2:** `#move`, 1,049 B per move |
| One entry on the step list per frame | Bytes per move | **Flagged, run 2:** `requestStep`, 73 to 80 B per move |
| **A/A**: three copies of production on every validation row | All 12 | **No row flagged.** The retained row read 0 B in every round |

Run 1 stopped at the fifth injection, whose patch text no longer matched the renamed source. Both defects of the injection list were fixed, and run 2 ran the three injections not yet flagged and the A/A pass.

### Readings

| Row | Against | Layouts | Script: higher in, median, bound | Task: higher in, median, bound | Verdict |
| --- | --- | --- | --- | --- | --- |
| 300 moves, one frame each, 20 items | drag2 | 83 / 83 | 1 of 7, -48 µs, 44 µs | 4 of 7, +23 µs, 719 µs | faster, script |
| 300 moves, one frame each, 20 items | prototype | 83 / 83 | 4 of 7, +1 µs, 44 µs | 3 of 7, -41 µs, 719 µs | no difference shown |
| 300 moves, one frame each, 2000 items | drag2 | 83 / 83 | 0 of 7, -64 µs, 53 µs | 3 of 7, -206 µs, 940 µs | faster, script |
| 300 moves, one frame each, 2000 items | prototype | 83 / 83 | 5 of 7, +9 µs, 53 µs | 4 of 7, +61 µs, 940 µs | no difference shown |
| press and release below the threshold, 20 items, [...root.children] | drag2 | — | 2 of 7, -2 µs, 27 µs | 6 of 7, +48 µs, 91 µs | no difference shown |
| press and release below the threshold, 20 items, [...root.children] | prototype | — | 4 of 7, +14 µs, 27 µs | 5 of 7, +26 µs, 91 µs | no difference shown |
| press and release below the threshold, 20 items, cached array | drag2 | — | 0 of 7, -31 µs, 32 µs | 3 of 7, -13 µs, 105 µs | no difference shown |
| press and release below the threshold, 20 items, cached array | prototype | — | 3 of 7, -4 µs, 32 µs | 3 of 7, -3 µs, 105 µs | no difference shown |
| press and release below the threshold, 2000 items, [...root.children] | drag2 | — | 7 of 7, +290 µs, 147 µs | 7 of 7, +295 µs, 306 µs | **slower, script** |
| press and release below the threshold, 2000 items, [...root.children] | prototype | — | 4 of 7, +6 µs, 147 µs | 4 of 7, +10 µs, 306 µs | no difference shown |
| press and release below the threshold, 2000 items, cached array | drag2 | — | 0 of 7, -26 µs, 29 µs | 5 of 7, +6 µs, 150 µs | no difference shown |
| press and release below the threshold, 2000 items, cached array | prototype | — | 2 of 7, -6 µs, 29 µs | 2 of 7, -25 µs, 150 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, no landing | drag2 | 250 / 300 | 2 of 7, -138 µs, 387 µs | 6 of 7, +1646 µs, 2639 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, no landing | prototype | 250 / 250 | 6 of 7, +260 µs, 387 µs | 6 of 7, +1294 µs, 2639 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, with landing | drag2 | 350 / 350 | 3 of 7, -37 µs, 259 µs | 5 of 7, +617 µs, 1574 µs | no difference shown |
| 50 activate-and-drop cycles, 20 items, with landing | prototype | 350 / 350 | 7 of 7, +299 µs, 259 µs | 7 of 7, +981 µs, 1574 µs | **slower, script** |
| 50 activate-and-drop cycles, 2000 items, no landing | drag2 | 250 / 300 | 1 of 7, -246 µs, 1612 µs | 6 of 7, +4111 µs, 8996 µs | no difference shown |
| 50 activate-and-drop cycles, 2000 items, no landing | prototype | 250 / 250 | 4 of 7, +9 µs, 1612 µs | 4 of 7, +799 µs, 8996 µs | no difference shown |
| 50 activate-and-drop cycles, 2000 items, with landing | drag2 | 350 / 350 | 3 of 7, -11 µs, 1594 µs | 7 of 7, +4124 µs, 6511 µs | no difference shown |
| 50 activate-and-drop cycles, 2000 items, with landing | prototype | 350 / 350 | 5 of 7, +722 µs, 1594 µs | 5 of 7, +1176 µs, 6511 µs | no difference shown |
| 50 keyboard reorders, 20 items, with focus restoration | drag2 | 50 / 100 | 3 of 7, -94 µs, 96 µs | 3 of 7, -72 µs, 160 µs | no difference shown |
| 50 keyboard reorders, 20 items, with focus restoration | prototype | 50 / 50 | 4 of 7, +28 µs, 96 µs | 5 of 7, +67 µs, 160 µs | no difference shown |

**Layouts:** at or below both before arms on every row. **A landed cycle reads 350 per 50 in every arm**, which closes `reviewer-7`'s miss (400 at `d7e7b0d3a`).

**Retained objects, 3 rounds, 200 operations, then destruction and forced GC:**

| Arm | Growth per round (B) | `JSHeapUsedSize` at 200 operations (B, per round) |
| --- | --- | --- |
| drag2 | 15,064, 15,064, 15,064 | 1,824,844, 1,825,152, 1,825,052 |
| Prototype | 15,724, 15,724, 15,724 | 1,630,016, 1,630,016, 1,630,016 |
| Production | 20,456, 20,456, 20,456 | 1,652,376, 1,652,232, 1,652,256 |
| Control | 20,456, 20,456, 20,456 | 1,652,232, 1,652,252, 1,652,376 |

`D` against drag2 is +5,392 B in each round, and against the prototype +4,732 B. `A` is 0 B in each round, so the bound is 0 B. **Verdict: retains more than both before arms**, which goes to the owner as `DRO-4`.

### Flags and their attributed causes, for `DRO-4`

One reading per arm, with no optimization run. Raw output: [`2026-11-07-profile-landed-cycles.json`](measurements/2026-11-07-profile-landed-cycles.json), [`2026-11-07-profile-press.json`](measurements/2026-11-07-profile-press.json) and [`2026-11-07-retained-attribution.json`](measurements/2026-11-07-retained-attribution.json). A single profile has sampling noise of its own, so these are attributions and not measurements of the difference.

1. **50 landed cycles, 20 items: script slower than the prototype**, in 7 of 7 rounds, +299 µs per cycle against a 259 µs bound. Task time shows no difference (7 of 7 higher, +981 µs, inside the 1,574 µs bound). Self time per cycle, production minus prototype: `startLandingAnimation` about +200 µs (223 against the prototype's `#startLanding` at about 23), `getBoundingClientRect` +193 µs, `animate` +115 µs, and `lift` +172 µs against `acquireLift` −128 µs. The landing's share is `DRD-10`'s elevation, a second animation and a computed `position` read per landing, which the prototype doesn't have. Against drag2 the same row shows no difference.
2. **Press and release, 2,000 items, `[...root.children]`: script slower than drag2**, in 7 of 7 rounds, +290 µs per press against a 147 µs bound. The profile puts +337 µs per press in the consumer's `items` function. drag2 doesn't pull at a press, and the prototype shows no difference. This is `DRO-1`'s cost, unchanged by the remediation.
3. **Retained objects: more than both before arms**, +5,392 B against drag2 and +4,732 B against the prototype, per 200 operations. By constructor, production minus each before arm is +4,064 B of unnamed internal arrays. The remaining hundreds of bytes are object properties and strings. An earlier one-round run on the step-2 source read production's growth as 16,296 B against today's 20,456 B, so steps 3 to 5 added about 4.1 KB. **The likely holder is the backing table of the kernel's `admitted` `WeakSet`** (`DRD-17`): 200 admitted events would grow it to about 256 entries of 16 B, about 4 KB, if V8 keeps the table's capacity after its weak entries die. Neither the holder nor that behavior was confirmed by retainer. It is bounded by the largest number of events admitted between collections, and it is not per operation.

## Step 7: documents

- `packages/drag/README.md`: commit ownership with the property list, the free-drag example committing in `onEnd`, `home` in a scrolling container, `draggable="false"`, nesting without an attribute, `Escape`, scoped requests, detached controller methods, focus after `end`, one controller per root. `panel` is `controller`.
- Free-drag story commits in `onEnd`.
- `integrity-5`: drag2's README names the legacy `@ydinjs/drag` at `7723f3e8a` wherever it names the package, and `@ydinjs/drag/kernel` became `@ydinjs/drag2/kernel.js`. `accessibility.md` line 106 names the legacy package, the bare `Q-13` is `drag2:Q-13`, and the production section states the focus and `Escape` changes.
- `integrity-6`: `coordinator.md` names `@ydinjs/drag` as production and drag2 as its reference evidence.
- `integrity-7`: drag2's `05-lifecycle-invariants.md` reports only the feature-matched baseline, and `COVERAGE.md` says fourteen budget rows.
- `integrity-8`: `drag` is a row of `SCOPES`, over `.plan/00-index.md` and `.plan/contract.md`. A test resolves `drag:DRD-1` and `drag:DRI-7`.

## Size

Brotli bytes, `bench/size/measure.ts`, rolldown 1.2.15. Ceilings and the control are the re-based ones from step 1, and **none was moved after it**. The `d7e7b0d3a` column is that tree under 1.2.15 ([`2026-11-07-size-rebase.md`](measurements/2026-11-07-size-rebase.md)).

| Row | `d7e7b0d3a` | After step 2 | Now | Change over `d7e7b0d3a` | Ceiling | Result |
| --- | --: | --: | --: | --: | --: | --- |
| `draggable` alone (control 2024) | 2024 | 2024 | 2156 | +132 | 2139 | **Over by 17, control moved** |
| `draggable` + `lift` | 4036 | 4036 | 4146 | +110 | 4169 | Under |
| Example: resize handle | 3164 | 3164 | 3278 | +114 | 3313 | Under |
| Example: drop zone | 4315 | 4315 | 4406 | +91 | 4431 | Under |
| Example: canvas group | 3176 | 3176 | 3300 | +124 | 3314 | Under |
| `freeDrag` | 4842 | 4909 | 5047 | +205 | 4967 | **Over by 80** |
| `freeDrag` + `bounds` + `landing` | 5100 | 5170 | 5300 | +200 | 5210 | **Over by 90** |
| `sortable` + `y` | 6600 | 6654 | 6666 | +66 | 6733 | Under |
| `sortable` + `xy` | 6478 | 6558 | 6601 | +123 | 6617 | Under |
| `complete` | 6960 | 7025 | 7028 | +68 | 7065 | Under |

**So `just size`, `just test`'s size rows and the root `just size` are red on three rows, deliberately.** CONTRIBUTING §18: a pass landing over a ceiling ends in a decision, and this one is the owner's (`DRO-4`). The control row was expected to move, because the kernel changed. Re-basing it is the same decision.

**Causes, by change.** These were measured jointly, as landed. They were not ablated one by one, so the split is by reading the diff.

- **Kernel, +132 on every row that has it** (`DRD-15` to `DRD-17`, `DRD-20`): window-capture listening with a fifth event type, the `admitted` `WeakSet` and its two checks, the `buttons` check and `#endPending`, `Escape`'s conditional `preventDefault`, the scoped `drag.requestStep` closure per operation, `releasedWith` and the run-once guard in `#release`, `restoreFocus` as a function called from two places, and three controller methods as arrow fields.
- **Rows with the kernel and no built-in, +91 to +124**, less than the kernel row's +132. Compression shares tokens across modules, and the lift's own changes (the flight cancel's `finally`, the renames, `shared/timing.ts`) were not ablated, so the remainder is not attributed.
- **Classes, +54 to +80** on the built-in rows (step 2): private fields and `this.#` reads.
- **`freeDrag`, +68 more after step 2:** `#home`, the drop's `home()` read and the home-relative request, offset by the smaller geometry signatures (`cleanup-8`).
- **`sortable`, −57 to +12 after step 2:** `Insertion.version`, the axis parameters, `edge()`, the shrink policy and `DEV` were removed, which roughly pays for the kernel's growth. The activation pull for commands is about the same size as the branch it replaced.

## Step 8: gates

Handoff loop on every changed `.ts` and `.tsx` file: `fmt`, `lint-fix`, `fmt`, `lint`, which is clean, then `typecheck`, which is clean. Markdown and JSON are formatted with `oxfmt`, and `git diff --check` is clean. Changed Markdown links were checked by reading them; no repository instrument covers them outside drag2's normative tree.

**Package (`packages/drag`), at this commit's source:**

| Gate | Result |
| --- | --- |
| `lint`, `typecheck`, `build` | Pass |
| `fmt-check` | Fails on `probes/prototype/checks.json` and `cost.json` only, as at `a1d31e0d2` and `d7e7b0d3a` |
| `test` (Chromium) | 313 passed, **3 failed: the size rows of §Size**, left for the owner |
| `size` | **Fails on the same three rows** |
| `test-engines` | 872 passed, 16 skipped, at `03a280e2a`'s source, which `src` still is. The one test changed afterwards (`input` › admit a primary press while a pending one's release was missed) was re-run in all three engines: 3 passed |
| `docs-api-prepare` | Exit 0, 0 errors |

**Root, against `d7e7b0d3a` as a set of failures.** The `d7e7b0d3a` column is the integrity review's recorded run, not a new one.

| Gate | `d7e7b0d3a` | Now | Change |
| --- | --- | --- | --- |
| `typecheck` | Pass | Pass | — |
| `build` | Pass | Pass | — |
| `lint`, packages | Fails in `core`, `tproc`, `vite-custom-element-assets`, `drag2`, `material-x` | The same five | — The changed drag2 files lint clean |
| `lint`, repository files | 3 `oxlint` errors in `.scripts/vitest-config.ts` | 0 | **Repaired** (`integrity-2`) |
| `fmt-check`, packages | `box-quad`, `drag`, `drag2`, `material-x` | `drag` (the two prototype probes), `drag2` (`api-review-3-summary.md`), `material-x` (generated CSS) | **`box-quad` repaired.** The 2026-11-06 JSONs are excluded, not formatted |
| `fmt-check`, repository files | Pass | Pass | — |
| `size` | Pass | **Fails: `drag`'s three rows** | **New, for the owner** |
| `vitest run` | 2 failed: `TokenPackageProcessor`, `radio.visual` | 4 failed: `TokenPackageProcessor` and **`drag`'s three size rows** (`--maxWorkers=3`) | **Size rows new, for the owner.** `radio.visual` passed this time |

## Faults found

- **The 2026-11-06 A/A arm was not configured like production.** `compare.ts` gave the consumer's refocus in `onEnd` to every arm whose name didn't start with `production`, so `control` ran it and `production` didn't. The cycle and keyboard rows' A/A differences therefore include one `focus()` call per cycle. The re-judged bounds below carry it. The arm now states whether its library restores focus, and `control` runs exactly as production.
- **The development equivalence check pre-empts `anchor-outside-container` with `y()`** after a committed move. That is development-only behavior. The test reaches the fault before any move.
- **Two defects in the new injection list**, found by the proof itself and fixed before any reading was taken from it (§Instrument proof).
- **`00-index.md`'s status rows** still say `DRD-14` to `DRD-23` are unimplemented. The register is the architect's, so this report doesn't edit it.

## Returns to the architect

None. No stop condition was met: every guarantee held in all three engines, measuring with the flight gave the flight's offset in all three, scoped requests needed no tag, and window-capture listening kept the click-guard and touch-capture tests green.

## Limits

- Physical touch and pen were not available (`DRO-3`). A release outside a real window was simulated by a page listener.
- The retained-memory instrument counts JavaScript object, closure, array and string nodes in the whole page, so a difference in how V8 grows its own feedback and closure objects counts as retained. Attribution by constructor is in the raw output.
- Root gates at `d7e7b0d3a` are the failure set the integrity review recorded, not a fresh run.
- The machine ran other, idle agent sessions during the measurements. Load average was about 3 on 12 cores.