# Performance instrument handoff

**For:** one `implementer` unit on `drag/performance`. **Base:** the commit that carries this handoff. Its `packages/drag/src` and `tests` are `a9c323f6a`'s.

**Governing records:** `DRD-40`, `DRD-23`'s last bullet, `DRF-1` and `DRF-7` in [`00-index.md`](00-index.md), and [`performance-plan.md`](performance-plan.md) §2 P1. The earlier instrument unit is [`instrument-repair-handoff.md`](instrument-repair-handoff.md), and its [report](instrument-repair-report.md) holds the per-sample readings this unit continues.

**Goal:** after this unit, `compare.ts` selects the kernel by location and every injection applies; each judged row type has a measured detection floor; the record says what the kernel per-sample test's result depends on; and a baseline of `a9c323f6a`'s source is recorded with its raw readings.

## Boundaries

**Do not change:**

- anything under `src/`;
- any test file. Item 4 uses temporary edits that are restored and never committed;
- `judge`'s rules, its 16 B per function, the rounds, the A/A pass, and every scenario's events, counts and waits;
- each existing injection's `name`, `scenario`, `expect` and injected cost. Only its `file`, `find` and the form of its `replace` move. **Amended on 2026-11-10 by `DRD-41`:** the step-list injection's expectation changes to "doesn't flag", in item 2a;
- the per-sample test's `< 16`, its 64-byte interval and 300 samples, the `DRF-2` test's bound, and every size ceiling, control and `absent` list.

**Machine state, for every browser run:** nothing else from this session runs at the same time. Record `nproc`, `node --version` and `uptime` before and after each run. Chrome's version is in `compare.ts`'s JSON.

## Resumption after the return at `b8f1d1b35`

Added on 2026-11-10. The unit returned during item 2's proof: the step-list injection adds no bytes at the current source ([report](performance-instrument-report.md) §Returned). `DRD-41` decides it. Resume from the commit that carries this section.

| Item | State | What remains |
| --- | --- | --- |
| 1, `DRF-7` | Done at `f50f4a35a`. `DRF-7` is closed | Nothing. Don't repeat D1 to D3. The dry check runs again in 2a |
| 2, `DRF-1` | Done at `ab14380c1`. Properties 1 to 6 hold. N1, N2's 1 KB and N3 passed in the pre-check ([`n3-prove`](measurements/2026-11-10-performance-n3-prove.txt)) | Nothing apart from 2a. Don't repeat N3 or the key checks. N1, N2 and N4 are read from item 5 step 1, which runs anyway |
| 2a | New | One commit, below |
| 3, 4, 5 | Not run | As written, with item 2's proof table and item 5 step 1 as amended |

**The report.** Add a section "Resumed" to [`performance-instrument-report.md`](performance-instrument-report.md) for 2a and items 3 to 5. Don't rewrite its earlier sections.

### 2a. The step-list injection is the quiet witness (`DRD-41`)

**Required properties:** `DRD-41` properties 1 to 4. An injection says whether it must flag or must stay quiet. `--prove` fails on a quiet injection that flags as it does on a flagging injection that doesn't. The output names which expectation was broken.

**Verification:**

| Run | Required result |
| --- | --- |
| `--prove --dry`, with no browser | Exit 0. Seven injections apply, and the step-list injection is listed as expected to stay quiet |
| Q1: the four-number injection's expectation temporarily set to quiet, `--prove --only 'four numbers' --rounds 3`, with `--out` | Exit non-zero. The output names the injection and says that a quiet expectation was broken. Restore `compare.ts` and compare it byte for byte. Keep the raw output, labeled as a mutation |

Q1 also runs the A/A pass, at 3 rounds. That pass isn't a reading for this unit.

## Items

Items 1 to 3 are each one commit, in this order. Items 4 and 5 commit only their raw output and the report.

### 1. `DRF-7`: every injection applies, and a dry check proves it

**Required properties:** those of [`instrument-repair-handoff.md`](instrument-repair-handoff.md) §2, for all six injections at the current source: each applies exactly once and changes the bundle; `--prove` applies every selected injection before it launches a browser; a dry option stops after that pass, launches no browser, exits 0 when all apply, honors `--only`, and is documented in the header comment.

**The sites at `a9c323f6a`.** At `b01a0283d` none of the six `find` texts applied.

| Injection | Site |
| --- | --- |
| About 1 ms of script per cycle, at the drop | `sortable/operation.ts`, `drop`, before `buildReorderRequest(` |
| One object of about 1 KB retained per operation past destruction | `sortable/operation.ts`, `start` |
| One forced layout per move | `sortable/operation.ts`, `move`, before `this.#lift.translate(`. The write must force a layout. The 2026-11-07 run 1 wrote a style that forced none ([remediation report](remediation-report.md) §Instrument proof) |
| One O(n) walk per move | The same site, over the snapshot's items |
| 1 KB allocated per move | `kernel/session.ts`, `#move`, after the button check, where the sample's `x` and `y` are written. That assignment text occurs twice in the file, so the `find` needs context that makes it unique |
| One entry on the step list per frame | `kernel/gesture.ts`, `requestStep`, the idle branch: the step goes onto `#steps` and a pass with no step of its own is entered |

**Verification, with no browser:** `CHROME_EXECUTABLE` set to a path that doesn't exist. The dry run lists every injection as applied. D1 to D3 of that handoff each exit non-zero as it states. Restore `compare.ts` after each mutation. **By reading,** record each injection's call path from its scenario to its site.

### 2. `DRF-1`: the bytes rule selects the kernel by module location

**Required properties:**

1. The bytes reading keys a sampled frame by its module's path under the arm's `src` and its function name, such as `kernel/session.ts:#move`, as `stopHeapSampling` does for the tests. A frame with no script keeps its caller's key.
2. The rule flags a key whose module is under `kernel/` or is `draggable.ts`, at 16 B per move or more, and nothing else. It doesn't use a function's name. `isKernelFunction` is removed.
3. The keys hold for every arm built from this package's source: production, a patched copy in a temporary directory, and the `--before` arm. The drag2 and prototype arms aren't judged by this rule and must not fail the run.
4. `--rejudge` of a recording whose bytes keys carry no module doesn't report those rows as passing. It leaves them out with a printed note, as it does for the retained row.
5. `judge`'s comment states what the bytes rule checks. It now says "from the kernel and the lift", and the code checks only the kernel.
6. **A seventh gate injection,** `DRF-1`'s witness: an array of four numbers allocated on every sample in `Gesture.enter`, stored in a module-level variable, on "bytes per move by function, 20 items", expecting `/FLAG/`.

**Observed by the architect at `a9c323f6a`, with rolldown 1.2.15:** the unminified IIFE that `bundle` builds has a line `// src/<path>` at the start of each module, and a sampled frame has a line number. A source map is the alternative. Choose either; the proof decides.

**Proof:**

| Run | Required result |
| --- | --- |
| N1: the new injection, from item 5's `--prove` | Flags, under `kernel/gesture.ts:enter` |
| N2: "1 KB allocated per move", from the same run | Flags, under `kernel/session.ts:#move`. **Amended on 2026-11-10 by `DRD-41`:** it also required "one entry on the step list per frame" to flag |
| N4: "one entry on the step list per frame", from the same run | Doesn't flag. Report the injected arms' keys under `kernel/callback-list.ts` and `requestStep`, if they were sampled. Whether they appear isn't a condition |
| N3: the same four-number array in `sortable/operation.ts`'s `move`, as a temporary injection, `--prove --only`, 3 rounds | Doesn't flag. The raw reading shows it under `sortable/operation.ts:move` |

### 3. Detection floors: a graded series of injections that doesn't gate

**Required properties:**

1. The series runs under its own option, documented in the header comment, with `--only` and `--out`. `--prove` doesn't run it, and its result doesn't change any exit code. The dry check covers it.
2. Each entry runs as a `--prove` injection does: the injected copy as `production` and as `control`, unpatched source as `base`, with the same rounds.
3. Each entry records its verdicts and raw readings, with the median difference and the sign count, whether it flags or not.
4. **Every entry is a fixed amount of work or allocation, not a wait on `performance.now()`.** Chrome can coarsen that clock to 100 µs in a page that isn't cross-origin isolated. Calibrate the work once on this machine and record how. The size is nominal. The measured size is the reading's median script difference, and the report uses that.
5. The entries, each at the site of the gate injection on the same row:

| Row | Entries |
| --- | --- |
| 50 activate-and-drop cycles, 20 items, no landing | 300 µs and 100 µs of script per cycle, at the drop |
| 300 moves, one frame each, 20 items | 100 µs, 30 µs and 10 µs of script per move |
| Bytes per move by function, 20 items | One object with two number properties per sample, in `Session`'s `#move` |
| 200 operations, then destroy: retained JavaScript objects | One object with two number properties retained per operation |

### 4. The kernel per-sample test: what its result depends on

`hot-path` › "should allocate per sample only the CSS string a lifted write needs". **Investigation only.** Nothing in the test is changed or committed.

Add a temporary log of the kernel figure and the per-function bytes, so that a passing run is recorded too. Run in Chromium with `vitest.config.ts`. Restore every file afterwards.

| Context | Command, from `packages/drag` | Runs |
| --- | --- | --: |
| A: the test alone | `npx just test tests/hot-path.browser.test.ts -t 'allocate per sample only the CSS'` | 10 |
| B: its file | `npx just test tests/hot-path.browser.test.ts` | 10 |
| C: the Chromium suite | `npx just test` | 5 |
| D: alone, warmed | As A, with one temporary unsampled pass of the same 300-move loop before `startHeapSampling` | 10 |

**Mutations,** from [`instrument-repair-handoff.md`](instrument-repair-handoff.md) item 1, which were never run against this test:

| Mutation | Contexts | Runs each |
| --- | --- | --: |
| M1: an array of four numbers per sample in `#move`, after the button check, stored in a module-level variable | A, B | 5 |
| M2: the same in `Gesture.enter` | A, B | 5 |
| M3: one object with two number properties per sample, at M1's site. Record only | A, B | 3 |

**Record per run:** the kernel B per move, pass or fail, and the per-function bytes. In B and C, also the `DRF-2` test's figure. In B, the order of the tests that ran before it.

**Hypotheses to test, not conclusions:**

- **H1:** run alone, the kernel's code hasn't reached optimized code when sampling starts, so it allocates per sample what optimized code doesn't. In B and C, the earlier tests warm it. D tests this.
- **H2:** the spread within one context is the 64-byte sampling's granularity.

Report each context's minimum, median, maximum and failure count; whether D's distribution matches B's; and whether M1 and M2 fail in every run of each context. Say which hypothesis the evidence supports, or that neither does. **Don't choose a repair.** A trace of optimization through Chrome's `--js-flags` in a scratch configuration may help. It isn't owed.

### 5. The proof, the floors and the baseline

Run in this order, at the unit's last commit:

1. **`node bench/compare.ts --prove`,** with `--out`. The six injections expected to flag flag, the step-list injection doesn't flag, and the A/A pass is quiet on all 12 validation rows. **If it fails, stop here and return.** Don't take the baseline, and don't change an injection's cost or expectation. **Amended on 2026-11-10 by `DRD-41`:** it said "every gate injection flags (seven)".
2. **The series of item 3,** with `--out`.
3. **B1:** `node bench/compare.ts`, all rows, 7 rounds, arms drag2, prototype, production and control, with `--out`.
4. **B2:** the same, in a new process.
5. **B3:** `node bench/compare.ts --before a9c323f6a --rows validation`, with `--out`. This is the mode the optimization units use, here comparing the baseline with itself.
6. **For each row that flags slower against a before arm in both B1 and B2:** one `--profile --only <row>` run, with `--out`.
7. **`npx just size`.** Save the output. Name each red row and its excess. Change no ceiling.

**The baseline revision is `a9c323f6a`.** Its `src` is the unit's. Later units run `--before a9c323f6a`.

**Report for B1 and B2,** for each row: each verdict against drag2 and the prototype, with the sign count, median and A/A bound. Mark a verdict that differs between B1 and B2 as unstable. Report the profiles' top functions per arm without interpreting them.

## Verification

Follow [`handoff.md`](../../../.agents/docs/handoff.md) for `bench/compare.ts` and for the Markdown. In `packages/drag`:

| Check                                          | Required result |
| ---------------------------------------------- | --------------- |
| `npx just typecheck`, `npx just lint`          | Exit 0          |
| `git diff --stat a9c323f6a..HEAD -- src tests` | Empty           |
| Items 1 to 5                                   | As each states  |

No three-engine run is owed: nothing under `src/` or `tests/` changes. Context C is the Chromium suite run. Its expected failures are the six size rows and, in some runs, the per-sample test.

## Report

Write `performance-instrument-report.md` beside this file, with each item's results and the environment record. Put every raw output in `measurements/`, named `<date>-performance-<what>.{json,txt}`, unedited. A discarded run is kept with its reason. Push and stop.

## Return to the architect

Stop and return if:

- an injection can't be written at the current source with the same cost on the same scenario, the scenario doesn't reach its site, or the rule doesn't select its module;
- the kernel selection needs a change to the rule's threshold, to `judge` or to a scenario;
- `--prove` fails (§5 step 1), or B3 flags anything;
- any change needs an edit under `src/` or a committed test edit.

**Not a return, and reported:** a verdict that differs between B1 and B2, M1 or M2 passing in some run, and a floor coarser than you expected.

## After this unit

The architect reads the report and decides the per-sample test's repair and whether the floors are fine enough for optimization ([plan](performance-plan.md) §2 P2). `DRO-4`'s timing goes to the owner from B1 and B2.