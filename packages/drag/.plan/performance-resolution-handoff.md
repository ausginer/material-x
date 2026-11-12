# Performance resolution handoff

**For:** one `implementer` unit on `drag/performance`. **Base:** the commit that carries this handoff. Its `packages/drag/src` is `a9c323f6a`'s.

**Governing records:** `DRD-42`, `DRD-43`, `DRD-40`, `DRD-23`'s last bullet and `DRO-4` in [`00-index.md`](00-index.md), [`performance-plan.md`](performance-plan.md) §2 P1b, and [`performance-instrument-assessment.md`](performance-instrument-assessment.md). The previous unit is [`performance-instrument-handoff.md`](performance-instrument-handoff.md), and its [report](performance-instrument-report.md) holds the readings this unit starts from. Its driver method for the per-sample runs (§Resumed, item 4) applies here.

**Goal:** after this unit, the kernel per-sample test passes or fails by the source and not by how it is launched, with its sensitivity shown under its own warm pass. The move path and the cycle each have a row driven from inside the page, with a floor measured in two runs. The retained flag against the before arms is attributed.

## Boundaries

**Do not change:**

- anything under `src/`;
- any test other than item 1's, and in it anything other than the warm pass and the comment. Mutations and logs are temporary, are restored, and are never committed;
- `judge`, its rules, its 16 B per function, the rounds, and the A/A pass;
- every existing row's events, counts, waits and arms, and every existing injection and floor entry, including `ITERATIONS_PER_US`;
- the per-sample test's `< 16`, its 64 B interval and its 300 sampled moves, the `DRF-2` test, and every size ceiling, control and `absent` list;
- every recorded reading under `measurements/`.

**Machine state, for every browser run:** as in the previous unit. Nothing else from this session runs at the same time, and `nproc`, `node --version` and `uptime` are recorded before and after each run.

## Items

Items 1 and 2 are each one commit, in this order. Item 3 and the runs commit only their raw output and the report.

### 1. `DRD-42`: the per-sample test's warm pass

**Required properties:** `DRD-42` properties 1 to 5.

**Mutations,** at the sites of the [report](performance-instrument-report.md) §4. Each stores into a module-level variable, except M4:

| Mutation | Site |
| --- | --- |
| M1 | An array of four numbers per sample, in `Session`'s `#move`, after the button check |
| M2 | The same, in `Gesture.enter`, before `this.#running = true` |
| M3 | One object with two number properties per sample, at M1's site |
| M4, record only | One object with two number properties per sample, at M1's site, whose fields are read back into the sample's `x` and `y` and which isn't stored |

**Runs,** from `packages/drag`, with the warm pass in place and a temporary log of the kernel figure and the per-function bytes:

| Run | Launch | Runs | Required |
| --- | --- | --: | --- |
| U-A | `npx just test tests/hot-path.browser.test.ts -t 'allocate per sample only the CSS'` | 10 | Passes in every run |
| U-B | `npx just test tests/hot-path.browser.test.ts` | 5 | Passes in every run |
| M1, M2, M3, each in A | As U-A | 5 each | Fails in every run |
| M1, M2, M3, each in B | As U-B | 3 each | Fails in every run |
| M4 in A | As U-A | 3 | Record only |
| C | `npx just test`, the Chromium suite | 1 | Only the six size rows fail |

Use `--reporter=verbose`, as the previous unit's rerun did. **Report per run:** the kernel figure, pass or fail, and the per-function bytes. For each launch, report the minimum, median, maximum and failure count. For M4, say whether its function's key appears and at what figure.

### 2. `DRD-43`: rows driven from inside the page

**Required properties:** `DRD-43` properties 1 to 6, with these rows and entries.

**Rows,** each mirroring the CDP row named:

| New row | Mirrors | Rule |
| --- | --- | --- |
| In-page: 300 moves, one frame each, 20 items | "300 moves, one frame each, 20 items" | `exact-and-floor` |
| In-page: 300 moves, one frame each, 2,000 items | "300 moves, one frame each, 2000 items" | `exact-and-floor` |
| In-page: 50 activate-and-drop cycles, 20 items, no landing | "50 activate-and-drop cycles, 20 items, no landing" | `exact-and-floor` |
| In-page: driver alone, 300 moves | The 20-item move row's events and positions, on a 20-item list with no behavior mounted | `report` |

- The ids may differ in wording. Each must say that it is driven in the page and which row it mirrors.
- A move row's press and crossing may stay CDP input, before the window opens. In the cycle row every event of every cycle is in the window, because the press, activation and drop are what the row measures.
- The cycle row keeps the CDP row's wait between cycles and checks that every cycle ends, as the CDP row does.
- `bench/lab.ts` may get what the driver-alone row needs.
- All four are validation rows. They run with `--before`, in `--prove`'s A/A pass and with `--floors`. They don't run in a comparison with drag2 and the prototype.
- The header comment states what the rows drive in the page and why.

**Gate injections, expected to flag** (`DRD-23`). Each is fixed work in the form of the floor entries:

| Injection | Site | Row |
| --- | --- | --- |
| 30 µs of script per move, in the page | `MOVE_SITE` | In-page, 300 moves, 20 items |
| 300 µs of script per cycle, in the page | `DROP_SITE` | In-page, 50 cycles |

**Graded entries,** under `--floors`, which doesn't gate:

| Row | Entries, nominal |
| --- | --- |
| In-page, 300 moves, 20 items | 30, 10, 5 and 2 µs of script per move, at `MOVE_SITE` |
| In-page, 50 cycles | 300, 100 and 30 µs of script per cycle, at `DROP_SITE` |

**Verification, with no browser:** `--prove --dry` lists nine injections as applied, with the step-list injection quiet, and exits 0. `--floors --dry` lists all fourteen entries as applied and exits 0.

**Same path.** Report, for production in every round of item 4's B3' run, the layout count of each in-page row next to its CDP row's in B3. A difference isn't a return when the gate injection flags and every cycle ends. Explain it if you can.

### 3. `DRO-4`: the retained row's attribution

One `node bench/compare.ts --attribute --only '200 operations'` run, with drag2, the prototype, production and control, with `--out`. **Report** each arm's growth per constructor, the constructors whose growth differs between production and each before arm, and whether production's excess grows with the number of operations or is a fixed amount. To tell the two apart, record any additional reading you use, and keep it out of the instrument. Don't interpret beyond that.

### 4. Runs, in this order, at the unit's last code commit

1. The dry checks of item 2.
2. Item 1's runs.
3. **F1:** `node bench/compare.ts --floors --only 'in the page'`, or the text that selects exactly the seven new entries, with `--out`.
4. **F2:** the same, in a new process.
5. Item 3.
6. **`node bench/compare.ts --prove`,** with `--out`. Every injection expected to flag flags, the quiet witness stays quiet and is counted, and the A/A pass is quiet on every validation row, including the four new ones.
7. **B3':** `node bench/compare.ts --before a9c323f6a --rows validation`, with `--out`. Nothing flags. This is the new rows' baseline.

**Report for F1 and F2,** per new row and per entry: the verdict, the sign count, the median and the A/A bound, each round's difference and A/A difference, and the ratio of the largest absolute A/A difference to the median one. Then, per row: the floor in each run as `DRD-43` property 6 defines it, whether it is stable, and the sufficiency figure of property 7. That figure uses production's median per event and the driver-alone row's median from B3'. **Don't judge sufficiency yourself.** Give the figures.

**Report for B3',** for each new row: production's median script, task and layouts per event, each verdict with its sign count, median and bound, and the driver-alone row's median per arm.

## Verification

Follow [`handoff.md`](../../../.agents/docs/handoff.md) for `bench/compare.ts`, `bench/lab.ts`, the test file and the Markdown. In `packages/drag`:

| Check | Required result |
| --- | --- |
| `npx just typecheck`, `npx just lint` | Exit 0 |
| `git diff --stat a9c323f6a..HEAD -- src` | Empty |
| `git diff --stat a9c323f6a..HEAD -- tests` | Only `tests/hot-path.browser.test.ts`, in item 1's commit |
| Items 1 to 4 | As each states |

The test change is a Chromium-only test, so the Chromium suite run in item 1 is the suite run this unit owes. No three-engine run is owed.

## Report

Write `performance-resolution-report.md` beside this file, with each item's results and the environment record. Put every raw output in `measurements/`, named `<date>-resolution-<what>.{json,txt}`, unedited. A discarded run is kept with its reason. Push and stop.

## Return to the architect

Stop and return if:

- under the warm pass, U-A fails in any run, or M1, M2 or M3 passes in any run;
- an in-page row needs a change under `src/`, or can't be driven through the library's listeners without one, or a cycle doesn't end. Record what you tried;
- `--prove` fails, or B3' flags anything. Record F1, F2 and item 3 first, because they run before;
- any change needs a committed test edit outside item 1, or a change to `judge`, a rule, a round count or an existing row.

**Not a return, and reported:** a floor that is unstable or above the sufficiency figure, M4 showing or not showing, a layout count that differs from the CDP row's, and the attribution's result.

## After this unit

The architect reads F1 and F2 against `DRD-43` property 7. A row that meets it opens P3 on that row, with the baseline being B3' for the in-page rows and B1 to B3 for the CDP rows. An unstable or insufficient floor leads to a decision on `judge`'s bound or on events per reading, from these readings. The attribution goes to the owner with `DRO-4`.