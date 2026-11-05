# Recheck of the branch-regression repairs: RF-26, RF-27, RF-28 and the tier C items

**Tree read.** `c15042847b622a9f643c9068cbe2fd99af7c6272` on `drag2/fin-review2`, against `f1451268b`. `src/` is `f6172d3be770c3f37ea0a1d723960ace05d61c9b` at both.

**Subject.** [`request-application-claude.md`](../architecture/request-application-claude.md) §35.9 and §35.10, [`repo:RD-3` and `repo:RD-4`](../../../../../.plan/00-index.md), and [`verification-restored.md`](../../measurements/verification-restored.md) §The branch's regressions. Evidence is in [`probes/verification-regressions-recheck/`](../../probes/verification-regressions-recheck/): `readings.txt` for the lifecycle and `readings-build.txt` for the build, size and ignore readings.

**Where it ran.** A private worktree at the tip, with `npm ci`, `nx run-many -t build` for every package and no `.vite`. A second private worktree at `main` (`bfd2832db`, Vitest 4.1.10) served two comparisons only. Every scratch edit stayed in those worktrees, and they are removed. Chromium, one machine.

**Scope.** Bounded to `f1451268b..c15042847` and its required readings. I closed nothing, repaired nothing and merged nothing, and no statistical round ran. I did not repeat F-447's schedules, look into RF-29's rows or F-412, read the worker bound's value, or reopen D-208 or D-209.

## Result

**RF-26's, RF-27's and RF-28's required properties hold, and so do the tier C items. No gate 5a requirement is unmet.** `just test` still exits 1, only on failures `main` already has. Merging that way remains the owner's question (§35.8).

**Two tier C findings go to the architect. Neither comes from this diff, and neither is a gate under §35.8's terms:**

| Id | Tier | Claim |
| --- | --- | --- |
| reviewer-1 | C | With a reporter outside Vitest's base family, a real close failure gives exit 1 and no text, and the JSON report says `success: true`. The same at `main` |
| reviewer-2 | C | The refusal's sentence about `--sequence.*` is no longer true of `--sequence.shuffle`. That changed with Vitest 5, not here |

### The two kinds of failure, kept apart

| Kind | What | Status |
| --- | --- | --- |
| **Unmet requirement of this unit** | None | Nothing blocks the architect's closures |
| **Open finding, not a requirement of this unit** | reviewer-1, reviewer-2 | The architect's to weigh |
| **Baseline failure, `main`'s** | `TokenPackageProcessor` in every root run, `radio.visual` in one of the two plain root runs and in `material-x`'s package run | RF-29, not investigated |
| **Baseline row not seen** | `size.node` slots row, M-5 _should report a difference that tracks…_ | RF-29, F-412, not investigated |

## RD-3: one reporter, one close per boundary

**Counted directly, in the one-shot module, because §35.4 and §35.11 say nobody had.** `instrument.mjs.txt` logs each evaluation of that module, each instance and each `release` call.

| Reading | Evaluations | Instances | `release` calls | Reporter error or notice |
| --- | --: | --: | --: | --: |
| Whole root, `--reporter=dot --reporter=json` | 1 | 1 | 8, one per browser project | 0 |
| Two browser projects, each of default, `dot`, `verbose`, `json`, `dot` with `junit`, `github-actions`, `tap`, `minimal` | 1 | 1 | 1 | 0 |
| Each of the seven package configs, `drag2`'s through a selection, and the third config through `shipped` and `browser` | 1 | 1 | One per boundary | 0 |
| **Control:** two browser projects, `extends: false` removed | **17** | **3** | **3** | **16 notices** |

- **The control shows the instrument can see the defect,** and it confirms RD-3's causal reading: 17 evaluations with one line removed, one with it. It discharges §35.11's _I didn't count evaluations_ and _other packages' own configs were not run_. `test-architecture.md`'s _the config file is evaluated once_ holds as measured.
- **The plain root runs** each print eight `closed` lines, one per browser project at its own boundary, with no reporter error or plugin notice.
- **`--reporter=dot` keeps the boundary line,** printed after the dots rather than at a line start, so a `^closed` count reads 0 there.
- **`extends: false` moves nothing else I resolved.** Across the root's 16 projects, the fields `resolve.mjs.txt` reads differ only in the one-shot plugin's count, 1 against 2, and the plugin total.
- **The refusals survive.** A second run through the root config rejects with TE-D15's message. `--sequence.groupOrder` raises the group refusal. See reviewer-2 for `--sequence.shuffle`.

### A close that really fails

I replaced `provider.close` once from inside `release`, leaving the statement that calls it unchanged, in both forms: rejecting without closing, and closing then rejecting.

| Selected reporter | Exit | The rejection printed |
| --- | --: | --- |
| Default, `dot`, `verbose`, `minimal`, `tree`, `json` with default | 1 | **Yes,** as `Unhandled Reporter Error`, naming the rejection |
| `json`, `junit`, `tap`, `tap-flat`, `github-actions`, `hanging-process` | 1 | **No.** See reviewer-1 |

- **Every repository route prints it:** `just test`, the package recipes and `bench/m2pp/run.ts`'s `--reporter=verbose`. Nothing tracked selects a reporter from the second row.
- **A whole root run with one real close failure** exits 1, prints it, keeps its 2,714 rows and shows the other seven boundaries' lines. The rejected project's line is absent, because `release` logs after the close. The headless Chrome count was 9 before and after each of these readings. Other sessions' processes are in that figure, so it shows nothing was left behind and not an absolute zero.

## RD-4: a failed build

A stray token appended to `src/drag.ts`, a different break from the implementer's.

| Reading | Result, each exit 1 |
| --- | --- |
| Package config, node project | 26 of 26 files red, one `tsdown exited with 1`, the output naming `src/drag.ts`, no `charCodeAt` `TypeError`, no `No test files found` |
| Third config, node project | The same |
| `--reporter=dot` | The same |
| `--reporter=json` | 26 failed files, each message opening `tsdown exited with 1` and carrying the output |
| Root, `node/drag2` with `node/vite-traits-plugin` and `browser/box-quad` | `drag2`'s 26 red, the other two projects' 11 files and 245 rows pass |
| **Whole root** | **All 85 files of the other six packages equal a clean root run in status and row counts** |

**In that whole-root reading, 33 of `drag2`'s files differ:** the 26 node files and 7 browser files. The browser files fail because they import the broken module, and six `TypeError` lines there are their `Failed to fetch dynamically imported module`, which is not the defect RF-28 recorded. One of the seven is M-6's census row, which passes on a clean tree. I did not trace why the break reaches it.

**The other foreseeable failures reach the files too,** each 26 of 26 in the package config:

| Failure | Message raised |
| --- | --- |
| `build:done` throws | `tsdown exited with 1`, with the hook's error in the output |
| Exit 7 | `tsdown exited with 7` |
| Killed by `SIGKILL` | `tsdown exited with 137` |
| The child can't start | `tsdown did not start: spawn … ENOENT` |

**The pair travels together.** Resolving every project of every config through Vitest's own API, `node/drag2` in the root's and `node` in `drag2`'s and the third config are the only three holding the global setup, and each also holds `require-build.node.ts`. No other project of any config holds either. `createNodeTestProject` is module-private, and `createDragTestConfig` takes only `NodeProjectBuild`, whose two fields are both required.

**The property holds through the one value that exists, as §35.9 allows.** By reading, `{ globalSetup: [...], setupFiles: [] }` written by hand would also type-check. In the other direction, a setup file with no global setup fails closed with an empty `Error`, because `inject` gives `undefined`. Neither is reachable through `DRAG2_NODE_BUILD`, so neither is a finding.

## The single build, the orphan row and the missing timestamp

**Builds, by two instruments:** a wrapper around the `tsdown` binary counts starts, and a line in `build:done` counts completions. The record's hook alone can't see a failed attempt, and the wrapper can.

| Run | Package config | Root config | Third config |
| --- | --: | --: | --: |
| Node project, whole | 1, 1, 441 pass | 1, 1, 441 pass | 1, 1, 441 pass |
| Whole suite | 1, 1 | 1, 1 | Not run |
| Browser only | 0, 0 | 0, 0 | Not applicable |
| `--project shipped` | 0, 0 | Not applicable | 0, 0, which the record left unread |
| `node/vite-traits-plugin` only | Not applicable | 0, 0 | Not applicable |

**F-447's property, by the reading the last recheck used:** the setup still awaits the one build before any file starts, `build-package.node.ts` remains the only builder, and the whole-suite starts count of 1 confirms that nothing else starts `tsdown`, `npm pack` included. The sourcemap row passes in the root reading where I read rows individually. No schedule was repeated, and F-447's cause stays unestablished.

**The orphan row, through all three configs:**

| Scratch state | Package | Root | Third |
| --- | --- | --- | --- |
| No plant | Passes | Passes | Passes |
| `kernel/zz-orphan.js`, dated 2020 | Red, names the file | Red, names the file | Red, names the file |
| `DRAG2_NODE_BUILD` removed from that config | Red, `expected undefined to be type of 'number'` | The same | The same |

**The refusal is what makes the last row red.** With the refusal line and the value both removed and an orphan planted, the row passes, which is the state reviewer-4 found.

## The diff

- **Assertions.** Across every `*.test.ts`, the changed lines are one added `expect`, its comment, and `vi.unmock` moved. No `it`, `describe`, `skip` or timeout line changes.
- **`tproc`.** Apart from the moved line and one blank line, the file is unchanged. The row passes through `tproc`'s config and the root's. **Both controls bite:** the file at `f1451268b` refuses to load, and with the line removed the row fails, receiving something other than its mock's instance. So the line's position and its presence both matter.
- **`src/` and built output.** The tree hash is unchanged. All 85 built `.js` and `.d.ts` files are byte-identical between builds at `f1451268b` and `c15042847`, in one worktree, and the lockfile is not in the diff. The failed-build readings left the tree identical once restored and rebuilt.
- **Size.** My `measureAll()` equals `verification-regressions/final.txt` and `d209-discarded-failures.md`'s table at `6386f12e1` on all fifteen rows, in minified bytes, Brotli bytes, modules and ceiling. The only `bench/` change is the third config's argument. No row is over its ceiling, and the seven controls pass.
- **Typecheck.** Root `just typecheck` exits 0 with no `error TS`, `docs.node`'s four rows pass, and TypeDoc on `./src/kernel.ts` alone exits 4.
- **Commits.** Four, in §35.9's order, plus the record. `12cb95a93..c15042847` is records only, so the record's readings describe this code.

## The root failures, against `main`'s baseline

**Baseline:** §35.3's list, which is `TokenPackageProcessor`, `radio.visual`, the `size.node` slots row and F-412's M-5 row.

| Reading, all with no scratch edit to `src/` | Files | Rows failing, passing, skipped, of | Failures |
| --- | --: | --- | --- |
| Plain root 1 | 161 of 163 | 2, 2,644, 68, 2,714 | `TokenPackageProcessor`, `radio.visual` |
| Plain root 2 | 162 of 163 | 1, 2,645, 68, 2,714 | `TokenPackageProcessor` |
| Root, instrumented, `dot` and `json` | 162 of 163 | 1, 2,645, 68, 2,714 | `TokenPackageProcessor` |
| Plain `drag2` package | 78 of 78 | 0, 1,494, 68, 1,562 | None |

**Everything failing is on the baseline list.** `DB/index.node` passes. A further root run with my first build counter also reddened `docs.node`'s four rows, and that was my instrument: see below. These runs are readings and not a rate.

## `.gitignore`

| Path | At the tip |
| --- | --- |
| `.vitest`, `.vitest/attachments/a.png` | Ignored by `/.vitest` |
| `packages/material-x/.vitest/attachments/a.png`, `packages/drag2/.vitest` | Ignored by `/packages/*/.vitest` |
| `packages/core/.vitest-attachments/a.png`, `.vitest-attachments/a.png` | Not ignored |
| `packages/material-x/tests/.vitest/a.png` | Not ignored |

**This discharges the record's _`.vitest` was not observed as a directory on disk_.** With a baseline replaced in the scratch, `radio.visual` failed for certain and attachments were written:

- **A root run wrote to the repository root's `.vitest/`, and a package run to that package's.** By reading, a project takes `attachmentsDir` from the root of the run, so both lines are needed. Vitest 5's default output files for `json` and `junit` also land under `.vitest/`.
- **`git status --short` stayed empty,** and `--ignored` lists both.
- **The control:** under `main`'s `.gitignore`, the same two paths show as untracked.

**The main checkout's two `.vitest-attachments` directories are from earlier runs.** They are as the record says, and I neither touched nor staged them. A `git add -A` there would sweep them in, so this report's commit names its paths.

## The discarded instrumentation reading

**It is a verification limit and carries no evidence, and no claim here rests on it.** The record says a raw newline in the scratch line broke every build, the log read 0, and those lines were discarded. They are not in `scratch.txt`, so what they showed can't be checked. That the implementer caught it and disclosed it is what the record can offer.

**What it does show is the limit of the instrument.** A completion log reading 0 can't by itself separate _no build ran_ from _the build failed_, so a zero needs a positive control.

**The replacement readings stand on what they carry:**

- **In `scratch.txt`,** the 1-build lines carry 441, 441 and 43 passes, which a failed build couldn't give under RD-4. The 0-build lines sit between lines reading 1, so the hook was alive.
- **The third config's `43 passed` is `size.node` alone,** not the whole node project as the table's _node project_ suggests. §35.9 didn't require this reading, and mine covers the whole project, with 1 start, 1 completion and 441 passes.
- **My independent counts agree** on every reading the two share, by an instrument that also sees a failed attempt.

**The site misfired on me too.** My first hook line used `process.env.REVIEW_BUILDS`, which TypeDoc's compile refuses, so `docs.node`'s four rows went red with TypeDoc exit 3 in the readings that ran it. Each count still read 1 and 1. I corrected the form and repeated those readings, and `readings-build.txt` states which. The zero readings from the first form kept their wrapper counts and were bracketed by readings of 1.

## Findings

### Finding reviewer-1: a selected reporter can reduce a close failure to an exit code (tier C, architect)

**Current behavior.** `provider.close()` rejecting once, under `--reporter=json`, `junit`, `tap`, `tap-flat`, `github-actions` or `hanging-process` alone, gives exit 1 and prints nothing about it. Under `json` alone, `.vitest/json/output.json` holds `success: true`, 0 failures of 438, and no mention of the rejection.

**Why it is a problem.** RD-3 and RF-26 say a provider that really fails to close stays loud, and TE-D12 says a teardown failure is distinguishable. On these reporters the run fails with no stated reason. It does fail closed, and there is no false pass by exit code. A tool reading only the JSON report would read a pass.

**Why tier C.** No tracked route selects these reporters, so nothing the repository relies on depends on it.

**Not a regression, and not caused by this diff.** At `main`, under 4.1.10, the same rejection prints under the default reporter and not under `json` or `tap`. By reading, the summary that prints unhandled errors belongs to Vitest's base reporter (`cli-api.De07GUeT.js:7931`, `:8293`). Adding `--reporter=default` beside `json` restores it.

**Evidence.** `readings.txt`, _Forced close failure_.

**Required property.** The record states whether _a real close failure stays loud_ covers a run whose only reporters don't print unhandled errors. The architect decides whether that is an accepted limit or something more.

### Finding reviewer-2: the refusal's `--sequence.*` sentence is no longer true of `--sequence.shuffle` (tier C, architect)

**Current behavior.** `.scripts/vitest-one-shot.ts`'s group refusal ends: _A --sequence.\* flag on the command line replaces the configured sequence object wholesale and erases it._ At `main`, `--sequence.shuffle` with two browser projects raises that refusal. At the tip it doesn't: the run exits 0, 438 rows pass, and the boundary line prints at `4->5`, so the groups stay serialized. `--sequence.groupOrder=0` and `=7` still raise it.

**Why it is a problem.** The sentence overstates what the flag does at 5.0.5. Nothing goes wrong as a result, because serialization holds where the refusal doesn't fire. It can only mislead a reader whose flag did raise the refusal.

**Not caused by this diff.** With `extends: false` removed, `--sequence.shuffle` also raises no refusal. So it arrives with Vitest 5, at `01d88645f`, and §35.9 left this file's text alone unless a statement is wrong. I noticed it while checking TE-D15's refusals and went no further.

**Evidence.** `readings.txt`, _TE-D15's refusals_.

**Required property.** The refusal states what a command-line flag does at the Vitest version in use.

## Limits

- **Single readings on one machine, in Chromium.** The plain root and package runs are not a rate, and each lifecycle reading ran once per config.
- **Not forced:** a close failure in the final group, which the pool closes at the end of the run rather than `release`. The diff doesn't touch that path.
- **The resolved-config comparison covers the fields in `resolve.mjs.txt`,** not a project's whole Vite config. The plain runs' equal totals are the other evidence that nothing else moved.
- **The `b046aff8a` baseline hashes the record cites aren't committed,** so I compared against a build at `f1451268b` instead. The last recheck's reading carries the comparison further back.
- **`main` was run only for the two comparisons named here.** Its failure baseline is §35.3's, as the task asked, and not a new reading of mine.
- **The editor was not driven,** and TE-D15 already names the editor as the design's weakest evidence.
- **The `TypeError` at this Vitest version's setup path wasn't traced.** RD-4 takes it as given, and it no longer appears in these readings.

## Next

**The architect** weighs reviewer-1 and reviewer-2, updates RD-3's and RD-4's _handed off, not implemented_, and decides the closures of RF-26, RF-27 and RF-28. **The owner** answers §35.8 and merges.