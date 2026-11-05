# Verification restored before the merge: RF-24, RF-25 and F-447

**2026-11-04. Handoff:** [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §34.9. **Input:** `c867a14d0` on `drag2/fin-review2`. **`src/` tree:** `f6172d3be770c3f37ea0a1d723960ace05d61c9b`, unchanged. Evidence is in [`probes/verification-restored/`](../probes/verification-restored/).

| Gate | Commit | Result |
| --- | --- | --- |
| 3, RF-24 | `1da64ed9c` | `browser.api` deleted and the provider closed only if present |
| 4, RF-25 | `b046aff8a` | `react` and `react-dom` pinned to 19.3.1 |
| 5, F-447 | `39e32b58d` | One build in the node project's global setup |
| §34.4's comment | `9518d654a` | (ae)'s comment says what the slot returns |

**The final reading is clean for `packages/drag2`, in both runs.** The repository root's suite is not clean, and neither was it at the input (see [the root suite](#the-root-suite-is-not-clean)).

**Disposed 2026-11-05** ([`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §35): RF-24, RF-25 and F-447 are closed. Two of this record's root failures are regressions against `main`, and the handoff is §35.9.

**The regressions are repaired at `12cb95a93`** (see [the branch's regressions](#the-branchs-regressions-359)). The root run still exits 1 on failures `main` already has.

**Two things need the reviewer's attention:** gate 5's reproduction used a one-sided delay after the symmetric one did not reproduce, and I read _whole suite_ as `packages/drag2`'s suite.

## The final reading

A fresh worktree at `9518d654a`, after `npm ci` and the prerequisite builds, with no `.vite` directory. Chromium, one machine, `npx vitest run -c vitest.config.ts` in `packages/drag2`.

| Run |    Files |  Pass | Fail | Skipped |    Of |
| --- | -------: | ----: | ---: | ------: | ----: |
| 1   | 78 of 78 | 1,494 |    0 |      68 | 1,562 |
| 2   | 78 of 78 | 1,494 |    0 |      68 | 1,562 |

- **The sourcemap row passed in both runs.**
- **The total matches §34.9's scratch reading,** 1,493 pass and 1 fail of 1,562, once the witness row §34 cleared passes.
- **Why this scope.** §34.1 and §34.9 give 78 files and 1,548 and 1,562 rows, which is this package's suite. The root's has 163 files and about 2,700 rows.

## Built output and size

- **All 85 built `.js` and `.d.ts` files are byte-identical** between the fresh worktree's build and a build in the main checkout at `b046aff8a`, by SHA-256. The baseline was taken after gate 4 and before any test changed. `tsdown.config.ts` and `src/` are unchanged since the input.
- **All fifteen rows equal `d209-discarded-failures.md`'s table** in minified bytes, Brotli bytes, modules and ceiling. `measureAll()` output is in `final.txt`. **No ceiling moved.**
- **All seven controls pass.** `measure.ts` declares seven, and the suite that runs them reports no failure.

## Gate 3, RF-24

**The premise holds: `browser.api` is dead.** Read at the input, before any change:

| Reading | Result |
| --- | --- |
| Resolved `config.api`, each browser project | No host, a port from 63315 up, `allowWrite` and `allowExec` true. `browser.api` still holds `0.0.0.0:9876` and nothing reads it |
| Bound socket, one `material-x` browser file | `[::1]:63317`. Nothing on 9876 or `0.0.0.0` |

**§34.10's _the bound port was not observed_ is now observed.** The port is Vitest's browser default sequence, not its API default of 51204.

**After the repair:** the resolved values are the same apart from each project's port, which follows initialization order. The `browser/drag2` project bound `[::1]:63315`. The deprecation notice is gone.

| Check | Result |
| --- | --- |
| Root `just typecheck` | 15 of 15 tasks, no `error TS`. The two `.scripts/` errors are gone |
| `docs.node`, the four rows | All pass |
| TypeDoc over `typedoc.json`'s entries, warnings as errors | Exit 0, and all twelve entries converted, each with its members |
| The same, `./src/kernel.ts` alone (negative control) | **Exit 4,** 5 warnings naming unexported types. The gate can fail |
| `material-x`, `--project browser` | 8 of 8 files, 141 of 141 rows |
| `drag2`, `--project browser`, which holds the CDP rows | 40 of 42 files, 934 pass. The two failures were RF-25's files, at that commit |

**`forwardPorts`' 9876 in `.devcontainer/devcontainer.json` stays,** as §34.9 directs. Nothing binds it now. Removing it is a separate tidy.

## Gate 4, RF-25

- **Pins:** set with `npm i -w packages/drag2 -D -E`. `@types/*` stays, and the typecheck did not require a change.
- **Resolution from `packages/drag2`:** `react` and `react-dom` are 19.3.1, and `scheduler` is 0.28.0, all from the root.
- **`.vite`:** `packages/drag2/.vite` was removed before the read.
- **Both files load, and all 14 rows pass:** 11 in `react.browser` and 3 in `stories.browser`.

**The lockfile hunks cover three entries, not the two §34.9 names.** The workspace's two pins change, the nested `react-dom` goes, and so does the nested `scheduler@0.27.0`. That `scheduler` existed only for the nested `react-dom`, so removing it is a consequence of the repair and not a separate change. No other package moved.

## Gate 5, F-447

Each reading ran `consumer.node` and `size.node` together, with a scratch delay at the start of `tsdown.config.ts`'s `build:done`. The delay is not in any commit. The scratch diff is [`f447-scratch.diff.txt`](../probes/verification-restored/f447-scratch.diff.txt) and the logs are in `f447.txt`.

| Before the repair | Runs | Sourcemap row |
| --- | --: | --- |
| Both builds delayed equally: 3 s, 8 s, 20 s | 3 | Passed in all three |
| Only the second emitter delayed, 20 s | 6 | **Failed in 5, with exactly 32 entries each** |

**The symmetric delay cannot show the overlap.** `stripDeclarationMapReferences` walks the whole tree, so the first build's strip also strips the second's output when that output is already on disk. The builds emitted 0.07 to 0.5 s apart, so a longer equal delay only makes that more certain. The hook logs show the timing, and this reasoning is mine.

**A reader may hold that this was not the specified reproduction.** §34.9 says a scratch delay at that site with the two files together, and does not say whether it applies to both builds. The one-sided form meets those words and the 32-entry criterion. I took that as authorising the repair rather than stopping at the symmetric result. The reviewer should weigh this.

**What the reproduction shows, and what it does not.** A pack that overlaps another file's unstripped emit reddens this row with the recorded count. That matches the three recorded failures, but it does not prove those failures had this cause, because none of them was observed in the act.

**The repair.** [`tests/support/build-package.node.ts`](../../tests/support/build-package.node.ts) builds once, as the node project's global setup, before any file starts. `consumer.node` and `size.node` no longer build. `.scripts/vitest-config.ts` gains a `globalSetup` option that only `drag2` passes, and `packaging.node`'s reads are covered without touching that file.

| After the repair, three files together | Runs | Builds per run | Result |
| --- | --: | --: | --- |
| The same scratch as the six runs above | 6 | 1 | 68 of 68 in each |
| The one build forced to take the 20 s delay | 1 | 1 | 68 of 68 |

**The six runs alone would be vacuous.** With one build, that scratch's delay never fires, because the lock makes every build the first emitter. That single build count is itself the result. The forced run is what holds the window open, and a pre-created lock makes the delay fire.

**`should measure a graph built from nothing but this build` still means what it says.** `builtAt` is now provided by the setup, taken just before the build starts, and the row's comparison is unchanged. A planted `kernel/zz-orphan.js` dated 2020 reddens it, naming that file. The comments in `consumer.node` and `size.node` that said a test builds were corrected to match.

**A cost:** any run of the `drag2` node project now builds first, even for a single file that reads no output. A `drag2` browser-only run does not build, as read from the hook log.

## The root suite is not clean

**This is outside §34.9's required reading, and I am reporting it rather than deciding it.** `npx vitest run` from the repository root, in the fresh worktree:

| Failure | Root, repaired, run 1 | Root, repaired, run 2 | Root, input, once |
| --- | --- | --- | --- |
| `tproc`, `tests/DB/index.node.test.ts` does not load (`vi.unmock` outside top level) | Yes | Yes | Yes |
| `tproc`, `TokenPackageProcessor` _should apply inheritance and render declarations_ | Yes | Yes | Yes |
| `material-x`, `radio.visual` _should match the selection state matrix_ (29 pixels in run 1) | Yes | No | Yes |
| Unhandled reporter error: `browserContext.close`, through `release` in `vitest-one-shot.ts` | Yes | Yes | Yes |
| `drag2`, `size.node` _should fill exactly the slots the assembler fills_, 5 s timeout | No | No | Yes |
| RF-24's four rows and RF-25's two files | No | No | Yes |

| Run         |      Files |  Pass | Fail |
| ----------- | ---------: | ----: | ---: |
| Repaired, 1 | 160 of 163 | 2,643 |    2 |
| Repaired, 2 | 161 of 163 | 2,644 |    1 |
| Input       | 156 of 163 | 2,624 |    7 |

**None of the first four is new.** All four appear at the input, so this unit did not cause them, and I did not touch them. **Corrected 2026-11-05 (§35.3):** that compares against the unit's input only. Against `main`, the `tproc` load failure and the reporter error are new, and they enter with this branch's upgrade to Vitest 5. **The reporter error needs a decision.** It goes through the function gate 3 edits, and it reads as a provider closing over a browser that has already gone. `?.` does not address it, and it does not occur in `drag2`'s own runs. Vitest's own message says an unhandled error can mean false positives.

**The `size.node` timeout was seen once and is not explained.** Its absence from later runs is no evidence that the repair fixed it.

## The branch's regressions (§35.9)

**2026-11-05. Input:** `f1451268b`. **`src/` tree:** `f6172d3be770c3f37ea0a1d723960ace05d61c9b`, unchanged. Evidence is in [`probes/verification-regressions/`](../probes/verification-regressions/).

| Item | Commit | Result |
| --- | --- | --- |
| RF-26 | `45ccefa4b` | `assignGroupOrder` sets `extends: false` on every project |
| RF-27 | `18f3e959f` | `vi.unmock` moved to the top level, and nothing else in the file changed |
| RF-28 | `c95212956` | The setup provides a failure as a string, and `require-build.node.ts` raises it |
| Tier C | `12cb95a93` | The row's refusal, the third config, the worker comment, `COVERAGE.md` and `.gitignore` |

**No required reading failed, and no stop condition fired.** The only failures are `main`'s, listed below.

**The option's shape.** `DRAG2_NODE_GLOBAL_SETUP` became `DRAG2_NODE_BUILD`, one `NodeProjectBuild` value holding both the global setup and the setup file. The factory takes only that value, so a config can't pass one without the other through it. `build-package.node.ts` is still the only place that builds.

### Final runs

A fresh worktree at `12cb95a93`, after `npm ci` and `nx run-many -t build` for every package, with no `.vite` directory.

| Run | Files | Pass | Fail | Skipped | Of | `closed` lines | Reporter error or plugin notice |
| --- | --: | --: | --: | --: | --: | --: | --: |
| Root 1 | 161 of 163 | 2,644 | 2 | 68 | 2,714 | 8 | 0 |
| Root 2 | 162 of 163 | 2,645 | 1 | 68 | 2,714 | 8 | 0 |
| `drag2` 1 | 78 of 78 | 1,494 | 0 | 68 | 1,562 | none expected | 0 |
| `drag2` 2 | 78 of 78 | 1,494 | 0 | 68 | 1,562 | none expected | 0 |

**The eight lines are one per browser project, each at its own boundary.**

**The remaining failures, all in §35.3's baseline set:**

| Failure | Root 1 | Root 2 | Entry |
| --- | --- | --- | --- |
| `tproc` `TokenPackageProcessor` _should apply inheritance and render declarations_ | Failed | Failed | RF-29 |
| `material-x` `radio.visual` _should match the selection state matrix_ | Failed | Passed | RF-29 |
| `drag2` `size.node` slots row | Passed | Passed | RF-29 |
| `drag2` M-5 _should report a difference that tracks…_ | Passed | Passed | F-412 |

**These are not repaired, and nothing here permits merging with them open.** That question is §35.8's and the owner's. `DB/index.node` passes in both root runs, and `consumer.node`'s sourcemap row passes in all four, read as no failure naming it.

**Built output and size are as stated above.** All 85 built files match the baseline hashes taken at `b046aff8a`, and all fifteen rows match `final.txt`'s table. All seven controls pass in the runs. No ceiling moved.

### Scratch readings

The same worktree, after the runs above. No commit carries the scratch edits.

| Reading | Result |
| --- | --- |
| Syntax error in `src/drag.ts`, package config | 26 of 26 node files red, one `tsdown exited with 1`, output naming `src/drag.ts:67:16`, no `TypeError`, exit 1 |
| The same, root config, with `node/vite-traits-plugin` | Its 52 rows pass, and `drag2`'s 26 files are red, exit 1 |
| Builds, package config, node project | 1 |
| Builds, root config, `node/drag2` | 1 |
| Builds, third config, node project | 1 |
| Builds, package config, one browser file | 0 |
| Builds, package config, `--project shipped` | 0 |
| Planted `kernel/zz-orphan.js`, package, root and third configs | The row fails in each, naming the file |
| A config without the setup | The row fails: `expected undefined to be type of 'number'` |
| `--reporter=dot`, `browser/core` and `browser/box-quad` | `closed browser/core` prints, after the dots |
| `provider.close()` made to reject (added, for the handoff's _a real close failure stays loud_) | `Unhandled Reporter Error` naming the rejection, exit 1, with all 438 rows passing |
| Root `just typecheck` | Exit 0, no `error TS` |
| `docs.node`'s four rows | 4 pass |
| TypeDoc on `./src/kernel.ts` alone | Exit 4 |

**My first build-count reading was wrong and is discarded.** My scratch line put a raw newline into `tsdown.config.ts`, so every build failed and the log read 0. I repaired the line and repeated those five readings. The discarded lines are not in the evidence.

### For the recheck

- **Old attachment directories now show as untracked.** `.gitignore` no longer covers `.vitest-attachments`, as §35.7 directs, so a checkout holding one from before Vitest 5 lists it. The main checkout shows `packages/core/.vitest-attachments/` and `packages/material-x/.vitest-attachments/`, dated from earlier months. I left them in place and unstaged, so a `git add -A` there would sweep them in. A fresh worktree has none.
- **`.vitest` was not observed as a directory on disk.** `radio.visual` failed in root 1 and `git status` stayed empty, but I did not check that this failure wrote attachments.
- **`--project shipped` through the third config was not read.** §35.9 asks for it through the package config, which is what ran.
- **Not repeated:** the limit RD-4 accepts, an unforeseen throw in the setup ending the run.
- **RD-3 and RD-4's register text still says _handed off, not implemented_.** I left it for the architect.

## Limits

- **Each reading ran on one machine, in Chromium.** No statistical round ran. Two clean runs do not show that F-447 cannot recur from some other cause, and the repair's claim is structural: within the node project, no test builds.
- **A `just build` run by hand during a test run can still write the tree.** The property covers other tests only.
- **Other packages' suites were read only through the root run,** and `material-x`'s browser project on its own.
- **`npm i` and `npm ci` report one high-severity advisory.** I did not read it or compare it with the input.
- **The D-209 limits stand.** A, a3 and the rest of `request-application-claude.md` §34.6 are unchanged.

## What stays open

| Item | Owner | Next |
| --- | --- | --- |
| One fresh `reviewer` recheck, bounded to `c867a14d0..` and these readings | owner starts it | **Done** |
| Closing RF-24, RF-25 and F-447 | architect | **Done, 2026-11-05** |
| Whether the root suite's failures bear on the merge, and the reporter error | architect, then owner | **Decided at §35.3 and §35.8,** with one question left to the owner |
| The branch's regressions against `main` | the implementer | **Done at `12cb95a93`,** recorded here |
| One fresh `reviewer` recheck of that unit | owner starts it | §35.10 |
| Closing RF-26, RF-27 and RF-28 | architect | After the recheck |
| Merging with RF-29 and F-412 open, or repairing RF-29 first | owner | §35.8, not yet granted |
| The merge | owner | §32.1's gate 6 |