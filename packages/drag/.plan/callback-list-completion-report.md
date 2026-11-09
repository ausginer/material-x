# Callback list completion report

**Input:** `drag/feature-composition` at `cd69d1149`, which carries [`callback-list-completion-handoff.md`](callback-list-completion-handoff.md), with the owner's uncommitted `CallbackList` edit in the working tree. **Governing records:** `DRD-36`, `DRD-37`, `DRD-38` and `DRO-12` in [`00-index.md`](00-index.md), `DRD-35` as those amend it, §Disposition of the callback list report, and [`contract.md`](contract.md).

**Base check:** both steps succeeded before any edit.

1. `git status --short` showed only ` M packages/drag/src/kernel/callback-list.ts`.
2. `git diff | sha256sum` gave `8b3b9b97b7c136e31665a2f61a1b4a21e6cc7d6bda08161e0d50e460f785ff58`.

The owner's edit was not stashed, reset or rewritten. The implementation commit carries it together with the completion. The `drag/step-queue-model` and `drag/step-key-model` worktrees were not touched.

**Implementation commit:** `50ed18a17`. The raw output is [`2026-11-09-callback-list-completion.txt`](measurements/2026-11-09-callback-list-completion.txt).

**Outcome:** the three decisions are implemented, and M1 to M7 fail their named checks. M8 is reported as a warning, and lint exits with status 0. The suite passes in three engines, and the per-sample tests pass. `npx just lint` in the package exits with status 0, with one authorized deviation: the package's tsconfig now includes the probe. **Against `25a67d4a9`, every size row grows by 392 to 416 B minified and 130 to 146 B Brotli. Four rows that passed at the base fail.** No cost is accepted and no budget is re-based.

## Items

| Item | Change |
| --- | --- |
| 1. `CallbackList` (`DRD-36`) | The owner's representation and form are unchanged. Only comments changed. The class comment says that a list holds only the name of the array method it adds with, that a queue adds at the start of the array and a stack at the end, and that `run` takes the entry at the end for both. `add`'s JSDoc says where each kind adds. `run`'s JSDoc says that it removes the entry at the end of the array. No comment says that a list holds a direction function, or that `add` appends for both kinds |
| 2. Lint (`DRD-37`) | `packages/drag/eslint.config.ts` spreads the shared configuration and then adds one block for `**/*.{ts,tsx,mts,cts}` that sets `@typescript-eslint/unbound-method` to `off`. The block's comment gives the reason and cites `drag:DRD-37`. No other lint configuration changed. The removed directives are listed below |
| 3. `Drag` and `Lift` (`DRD-38`) | `Drag<Operation = unknown>` in `src/kernel/drag.ts` and `Lift` in `src/lift.ts` are `type` aliases of an object type wrapped in `Readonly<>`. The member-level `readonly` modifiers are dropped. Members, overloads, the generic default and JSDoc are otherwise unchanged. Every user typechecks without change |
| 4. The allocation probe | [`allocation.ts`](probes/callback-list/allocation.ts) measures each list as made, against a bare array. It keeps the rows after one add and one run, and labels them an observation. It writes through `process.stdout.write`, not `console.log`, and has no triple-slash reference. `oxlint .` and ESLint pass on it |
| 5. Tests | Only the directives were removed, plus two comments that the grep in item 2 requires to change (§Deviations) |
| 6. Documentation | No JSDoc on `Drag` or `Lift` became false. The README has no sentence about the list's direction, the lint rule or the declaration kind, so it is unchanged |

**Directives removed, 24 in all:**

| File | Count |
| --- | --- |
| `src/kernel/gesture.ts` | 1 `eslint-disable-next-line` |
| `src/sortable.ts` | 1 `eslint-disable-next-line` |
| `src/sortable/behavior.ts` | 2 `eslint-disable-next-line` |
| `tests/activation.browser.test.ts` | 1 `eslint-disable-next-line` |
| `tests/callback-list.browser.test.ts` | 4 `eslint-disable-next-line`, 3 block `eslint-disable` and their 3 `eslint-enable` |
| `tests/callback-list.declaration.test.ts` | 6 `eslint-disable-next-line` |
| `tests/hot-path.browser.test.ts` | 1 `eslint-disable-next-line` |
| `tests/landing.browser.test.ts` | 1 `eslint-disable-next-line` |
| `tests/order.browser.test.ts` | 1 `eslint-disable-next-line` |

Afterwards, `grep -rn 'unbound-method' packages/drag --include='*.ts' --include='*.tsx'` finds only the configuration's block.

## Mutations

Each one was applied to `50ed18a17`, run, and reverted. The tree was clean afterwards.

| Mutation | Result |
| --- | --- |
| M1. `queue()` passes `'push'` | `requests` › "should keep the order of moveTo closures in one pass" fails: `expected 100 to be close to 200` |
| M2. `stack()` passes `'unshift'` | `release` › "should run disposers last in first out, past a throw" fails: `expected [ 'first added', 'last added' ] to deeply equal [ 'last added', 'first added' ]` |
| M3. `run` calls the callback with no receiver | `callback-list` › "should call the axis and the sink on themselves" fails: `expected [ undefined ] to deeply equal [ { …(4) } ]` |
| M4. `has` ignores the receiver | `callback-list` › "should run one method once per receiver, in request order" fails: `expected [ 'start finished', 'a' ] to deeply equal [ 'start finished', 'a', 'b' ]` |
| M5. `drag.use(this.axis.retire)` | Typecheck fails: `src/sortable/behavior.ts(207,14): error TS2345`, `(this: InsertionGeometry) => void` not assignable to `(this: undefined, outcome: Outcome \| null) => void` |
| M6. `kernel.use(displacement.retire)` | Typecheck fails: `src/sortable.ts(59,16): error TS2345`, `(this: DisplacementSink) => void` not assignable to `(this: undefined) => void` |
| M7. The block moved before the shared configuration | `npx just lint` exits with status 1 and reports 27 `unbound-method` errors in 9 files: every site that had a directive. There are more errors than directives because each block `eslint-disable` covered several lines |
| M8. A `// eslint-disable-next-line @typescript-eslint/unbound-method` added in `gesture.ts` | Lint names it: `251:7 warning Unused eslint-disable directive (no problems were reported from '@typescript-eslint/unbound-method')`. **`npx just lint` exits with status 0** |

M7's first attempt cut the block at the wrong closing brace and produced an `oxlint` error in the configuration instead. It was reverted and run again, and the table gives the second run.

## Checks

- **Typecheck:** `npx just typecheck` at the root: 15 tasks succeeded.
- **The handoff loop** (fmt, lint-fix, fmt, lint) on every changed `.ts` file: no error.
- **`npx just lint` in `packages/drag`, with no file arguments:** `oxlint .` and ESLint report nothing, and it exits with status 0. Its output names no unused directive.
- **`DRD-37` property 2, `eslint --print-config`,** for `@typescript-eslint/unbound-method`:

  | Configuration | File | Setting |
  | --- | --- | --- |
  | `packages/drag` | `src/kernel/drag.ts` | `[0, { ignoreStatic: true }]` |
  | `packages/drag` | `tests/callback-list.declaration.test.ts` | `[0, { ignoreStatic: true }]` |
  | `packages/drag` | `.plan/probes/callback-list/allocation.ts` | `[0, { ignoreStatic: true }]` |
  | `packages/core` | `src/attribute.ts` | `[2, { ignoreStatic: true }]` |

- **`npx just test-engines`,** with `webkit-env.sh` sourced: 72 files and 1041 tests passed, with 18 skipped. Chromium passed 353, Firefox 344 and WebKit 344. Firefox and WebKit skip 9 each, by conditions already in the tests. These are the same counts as at `53c87f988`.
- **The per-sample tests in `hot-path.browser.test.ts`:** "should allocate per sample only the CSS string a lifted write needs" and its `drag:DRF-2` variant pass in Chromium. Firefox and WebKit skip them by their existing condition. `npx just test tests/hot-path.browser.test.ts`: 7 passed.
- **`npx just test`,** in Chromium with the node and declaration projects: 379 passed and 6 failed. All six are size rows that already failed at `53c87f988`. `example: canvas group`, which failed there, passes.

## Costs (`DRO-12`)

### Size

`node bench/size/measure.ts` at `25a67d4a9`, in a scratch worktree that was removed afterwards, gave the same figures as the [raw output](measurements/2026-11-09-callback-list.txt) at `f06a99c4f`. The two runs at `50ed18a17` were identical.

| Row | `25a67d4a9` min / br | `50ed18a17` min / br | Against the base | Against `53c87f988` |
| --- | --- | --- | --- | --- |
| draggable alone | 6321 / 2066 | 6737 / 2202 | +416 / +136 | −32 / −4 |
| draggable + lift | 11132 / 3838 | 11548 / 3975 | +416 / +137 | −32 / −6 |
| example: resize handle | 8978 / 3181 | 9394 / 3317 | +416 / +136 | −32 / −6 |
| example: drop zone | 12771 / 4462 | 13187 / 4608 | +416 / +146 | −32 / −6 |
| example: canvas group | 9114 / 3179 | 9530 / 3311 | +416 / +132 | −32 / −6 |
| freeDrag | 14770 / 4897 | 15186 / 5040 | +416 / +143 | −32 / 0 |
| freeDrag + bounds + landing | 15935 / 5331 | 16351 / 5475 | +416 / +144 | −32 / +3 |
| sortable + y | 19474 / 6345 | 19866 / 6475 | +392 / +130 | −32 / +1 |
| sortable + xy | 19293 / 6303 | 19685 / 6447 | +392 / +144 | −32 / 0 |
| complete | 21147 / 6968 | 21543 / 7106 | +396 / +138 | −32 / −8 |

**Over a ceiling at `50ed18a17`:**

- **Newly over, having passed at the base:** `draggable alone`, by 63 B over its 2139 B ceiling; `example: resize handle`, by 4 B over 3313 B; `freeDrag`, by 73 B over 4967 B; and `complete`, by 41 B over 7065 B.
- **Already over, and now further:** `example: drop zone`, 31 → 177 B over 4431 B; `freeDrag + bounds + landing`, 121 → 265 B over 5210 B; and `draggable alone`'s control, moved by 42 → 178 B.
- **Back under compared with `53c87f988`:** `example: canvas group`, 3 B under its 3314 B ceiling.

`DRD-37` and `DRD-38` change no emitted code, so the whole difference is the `CallbackList`.

### Allocation, measured

`node --expose-gc .plan/probes/callback-list/allocation.ts`, three runs, Node v26.13.0. Each figure is the heap growth across 200,000 retained instances, read after a full collection, divided by 200,000.

| Row                             | Run 1   | Run 2   | Run 3   |
| ------------------------------- | ------- | ------- | ------- |
| bare array, empty               | 32.0 B  | 32.0 B  | 32.0 B  |
| `queue()`, empty                | 72.1 B  | 72.1 B  | 72.1 B  |
| `stack()`, empty                | 72.0 B  | 72.0 B  | 72.0 B  |
| _Observation:_ bare array, used | 179.1 B | 177.5 B | 179.2 B |
| _Observation:_ `queue()`, used  | 239.5 B | 239.5 B | 239.7 B |
| _Observation:_ `stack()`, used  | 239.2 B | 239.1 B | 239.2 B |

**A list as made retains 72 B, against 32 B for a bare array: 40 B more per list.** At `53c87f988` it was 128 B, so 96 B more. A used queue and a used stack now retain the same, within 0.5 B. At `53c87f988` a used stack retained about 70 B more than a used queue.

### Allocation, counted by reading, against `25a67d4a9`

The base holds three bare arrays: `Gesture`'s `#disposers` and `#steps`, and `Session`'s `#disposers`.

| Where | Count | Measured |
| --- | --- | --- |
| Per controller (kernel) | Two lists and their two arrays, where the base has two arrays | +80 B |
| Per admitted press or command | The session's list and its array, where the base has one array. A press that never activates pays it too, because the session opens at admission | +40 B |
| Per `sortable` controller | Two functions fewer: the arrow-function fields `#invalidateGeometry` and `#retireAxis`. With `displacement`, a third fewer: the wrapper around `displacement.retire` | Not measured |
| Per step requested during a pass, and per `use` call | Two array slots where the base uses one. No object. A queue's `add` now moves the waiting entries with `unshift`, where the previous version's `run` moved them. Nothing measures that, because timing is deferred | Not measured |
| Per sample, and per step requested while idle | Nothing. An idle request enters its own pass and adds nothing to the list. The per-sample tests pass | — |

## Deviations

1. **`packages/drag/tsconfig.json` includes `./.plan/probes/callback-list/allocation.ts`.** Once `oxlint` passed, ESLint stopped on the probe with "was not found by the project service", because no tsconfig included `.plan/`. That failure already existed at `f06a99c4f`. `just lint` runs `oxlint` first, and `oxlint` failed there, so ESLint never ran. The handoff forbids any other lint configuration change. I raised it, and the owner authorized including that one file, with no glob. Typecheck and lint now cover the probe, and Node's types come from the base configuration. The probe's comment says that the tsconfig includes it.
2. **Two comments in `tests/callback-list.declaration.test.ts` changed besides the directives.** Item 5 allows only the directive removals, but the grep in item 2 must find nothing outside the configuration, and both comments named `unbound-method`. One explained a directive that was removed, and is gone with it. The other said that "neither `tsc` nor `unbound-method`" reports a private method passed with no receiver. It now says that typecheck doesn't report it, and that lint doesn't check this package for it (`drag:DRD-37`). No assertion changed.

## Findings

Not minted. The architect records findings.

1. **M8: an unused `unbound-method` directive doesn't fail lint.** ESLint reports it as a warning, and `npx just lint` exits with status 0. `DRD-37` property 3, "the package's lint reports no unused directive", is therefore kept by reading the output, not by the exit status.
2. **Size:** four rows that passed at `25a67d4a9` fail at `50ed18a17`, and three failing results fail by more (§Size). Against `53c87f988`, every row is 32 B smaller minified, and Brotli moves by −8 to +3 B.
3. **The disposition of the previous report attributed the lint failure at `f06a99c4f` to `oxlint` alone.** ESLint would also have failed on the probe, as Deviation 1 says.

## Next

The owner reads the figures under `DRO-12` and answers `DRO-13`, and the architect reads this report. No combined review starts before both. No PR is opened.