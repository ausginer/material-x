# Recheck of the verification-restoration unit: RF-24, RF-25 and F-447

**Tree read.** `77871383eabe7bcb23dcd01d2b8a51ec86062572` on `drag2/fin-review2`, against the input `c867a14d0`. `src/` is `f6172d3be770c3f37ea0a1d723960ace05d61c9b` at both.

**Subject.** [`request-application-claude.md`](../architecture/request-application-claude.md) §34.9 and [`verification-restored.md`](../../measurements/verification-restored.md). Evidence is in [`probes/verification-recheck/`](../../probes/verification-recheck/).

**Where it ran.** Private worktrees at the tip, the input and `main` (`bfd2832db`), each with its own `npm ci` and builds. Every scratch change stayed in those worktrees, and they are removed. Chromium, one machine.

**Scope.** Bounded to `c867a14d0..77871383e` and these readings. It is not a new D-208 or D-209 review. I closed nothing, repaired nothing and merged nothing, and no statistical round ran.

## Result

**The three repairs do what §34.9 requires. I found no weakened assertion, no moved size row and no change to built output.** Both required package runs are clean.

**Five findings go to the architect, none of them in `src/`:**

| Id | Tier | Claim |
| --- | --- | --- |
| reviewer-1 | B | Each browser project's provider is closed 17 times at its group boundary in a root run, which is what raises the `browserContext.close` error |
| reviewer-2 | B | A failed build now reports `No test files found` and an unrelated `TypeError`, loses the build's own message, and stops every package in a root run |
| reviewer-3 | C | §34.9's stop condition fired on its plain reading, and the implementer continued on a reinterpretation, which the architect has not yet ruled on |
| reviewer-4 | C | Through `bench/shipped/vitest.config.ts`, the orphan row passes with no build and a planted orphan |
| reviewer-5 | C | Two statements still say that test files build |

**The root suite's failures can't be called standing on the input's evidence alone.** `main` is on Vitest 4.1.10, and this branch moved to 5.0.5. Two of the four failures the record reports at the input don't occur at `main`: the reporter error and `tproc`'s unloadable file. Whether those block the merge is for the architect, then the owner.

## The gates

| Check | Result | Evidence |
| --- | --- | --- |
| Two package runs, fresh worktree, `npm ci`, no `.vite` | **Each 78 of 78 files, 1,494 pass, 0 fail, 68 skipped, of 1,562, exit 0.** Equal to the record | `final.txt` |
| `src/` tree | Unchanged | `final.txt` |
| Built output | All 85 `.js` and `.d.ts` files byte-identical, tip against a build at the input itself | `final.txt` |
| Size | All fifteen rows equal `d209-discarded-failures.md`'s table in minified bytes, Brotli bytes and modules, with no budget or control violation. `bench/` is not in the diff, so no ceiling moved | `final.txt` |
| Controls | All seven `the declared controls` rows pass | `final.txt` |
| Assertions | No `expect`, `it`, `describe`, `skip`, timeout or `MINUTE` line changed in the test or config diff | the diff |
| `9518d654a..77871383e` | Records only, so the implementer's readings at `9518d654a` describe this code | the diff |

### Gate 3, RF-24

- **Shared config.** The resolved root config gives `globalSetup` to `node/drag2` and to none of the other fifteen projects. All eight browser projects resolve no host, a port from 63315 up, and `allowExec` and `allowWrite` true.
- **The block was dead.** By reading Vitest 5.0.5, `resolveApiServerConfig` takes `testConfig` and reads `config.api`, never `browser.api`. One `input-policy.browser` run at each tree bound only `[::1]` on one port, with nothing on 9876 or `0.0.0.0`, and all 25 rows passed, CDP rows included.
- **Typecheck.** Root `just typecheck`: 15 of 15 tasks and no `error TS`.

**TypeDoc can fail again, and the rows themselves show it,** not only a separate TypeDoc run. Each scratch change was reverted before the next:

| Scratch change at the tip | Rows red | TypeDoc exit |
| --- | --- | --- |
| None | None | 0 |
| An unexported type behind a public type in `kernel.ts` | Whole-run and kernel only | 4 |
| The same in `sortable.ts` | Whole-run and ordinary only | 4 |
| The same in `free-drag.ts` | Whole-run and free-drag only | 4 |
| `sortable/y.ts` removed from `typedoc.json` | Whole-run only, on the list of converted entries | 0 |
| `Point`'s export removed from `drag.ts` | All four | 3 |
| `browser.provider.close()` restored, the input's type error | All four | 3 |

**The last row is why the rows were blind at the input:** a `.scripts/` compile error stops TypeDoc at exit 3 before it reaches the surface. The three leak rows show that each tier's row discriminates on its own.

### Gate 4, RF-25

- **Resolution.** From `packages/drag2`, `react` and `react-dom` are 19.3.1 and `scheduler` is 0.28.0, all from the root's `node_modules`.
- **Lockfile.** Comparing the two lockfiles as JSON, exactly three entries differ: `packages/drag2` is modified, and its nested `react-dom` and `scheduler` are removed. `npm i --package-lock-only` at the tip leaves the file unchanged.
- **Load.** `react.browser` passes through both the package and root configs. Both files pass in the clean package runs and in the root run at the tip.

**Removing the nested `scheduler` is solely a consequence of removing the nested `react-dom`.** At the input, only two lockfile entries declare `scheduler`: the root's `react-dom`, which resolves the root's 0.28.0, and the nested `react-dom`. Of the entries under `packages/drag2/node_modules`, only `react-dom` declares it, and the workspace itself doesn't. The root's `scheduler` entry is unchanged. So §34.9's _confined to those two packages_ holds, with this one consequence the record states.

### Gate 5, F-447: the single build

| Run, with a build counter in the hook | Package config | Root config |
| --- | --- | --- |
| The whole `drag2` node project | 1 build, 441 pass | 1 build, 441 pass |
| One `drag2` browser file, no node project | 0 builds | 0 builds |
| `node/vite-traits-plugin` only | Not applicable | 0 builds |
| Three files, with the one build forced to take 20 s | 1 build, 68 of 68 | 1 build, 68 of 68 |

- **The ordering is Vitest's, by reading.** `runFiles` awaits `initializeGlobalSetup` before `pool.runTests`, so no file starts during the build.
- **No other builder exists.** `build-package.node.ts` is the only file under `tests/` or `bench/` that starts `tsdown`, and no other package's tests name a build.
- **The required property holds structurally:** no other test's build can write the tree `consumer.node` packs. A `just build` run by hand still can, as the record says.

**The orphan check keeps its meaning in both named configs.** The comparison is unchanged, and `builtAt` is still taken before the build. A planted `kernel/zz-orphan.js` dated 2020 reddens the row and names that file through both configs, and the row passes without it. The value is fixed at setup, so the minutes a root run spends in browser groups don't change it. The third config is reviewer-4.

**(ae)'s comment** says what §34.4 carried.

## The implementer's two calls

### Does the asymmetric delay demonstrate the overlap?

**Yes, as a mechanism. It doesn't prove the cause of the earlier failures.** I repeated it at the input with each builder identified, the pack timed, and the unstripped declarations counted in the package root:

| Schedule, at the input | Row | Unstripped at pack start, then pack end |
| --- | --- | --- |
| Both hooks delayed 20 s | Green | 0, then 0 |
| `consumer.node` emits first, `size.node`'s hook delayed 20 s | **Red, 32 entries** | 0, then **32** |
| `size.node` emits first, `consumer.node`'s hook delayed 20 s | Green | 0, then 0 |
| `consumer.node` alone, its own hook delayed 20 s | Green | 0, then 0 |
| Both, no delay | Green | **32**, then 0 |

**What this establishes:**

- **The overlap is observed directly.** In the red schedule the tree went from 0 to 32 unstripped declarations while `npm pack` ran.
- **The symmetric delay can't show it, as the implementer reasoned.** `consumer.node`'s strip ended 19.7 s after `size.node` emitted, so it stripped both builds' output. Its pack then read 0.
- **The record's one green run in six is explained in kind.** A row goes red only when `consumer.node` emits first. The record didn't log which file built, so that is my inference about its run 4.
- **The delay alone doesn't redden the row.** It needs a second builder.

**What it doesn't establish:**

- **That a delay-free run reaches a red row.** With no hook delay, the row stayed green in that run and at each of eight start offsets from 100 to 800 ms, one run each. F-447's entry records a similar failure to reproduce. The no-delay run does show that the tree held 32 unstripped declarations as `consumer.node` was about to pack, and `size.node`'s strip ended about 100 ms later. So the state is reachable without a delay, while the row going red on that state is not.
- **That the three recorded failures had this cause.** None was observed in the act. Their 32 entries and their passing alone fit the mechanism, but they don't exclude another cause. F-447's _inferred and not isolated_ stays accurate, and the record says the same.

**What gate 5 can rest on is the structural property, which doesn't depend on that cause.** Clean runs are not the evidence: the row passed on most runs before the repair too. A recurrence after this tree would mean some other cause.

### Do the two clean whole-suite runs cover the right scope?

**Yes, for §34.9's final reading.** §34.1's whole suite is 1,548 rows in 78 files, and §34.9's scratch whole suite is 1,562 rows in 78 files. Both are `packages/drag2`'s figures. A root run has 163 files and 2,713 rows at the tip, so the implementer's reading matches the text, and it was disclosed.

**That reading doesn't speak to the root.** The repository's `just test` is the root run, and it exits 1 at the input, at the tip and at `main`. §34.9 and §32.1's gates don't state whether the merge needs that run clean, so that question goes to the architect.

## The root failures, against the input and `main`

One root run per column. The input, tip and scratch runs carry the logging described under _Teardown through `release`_, which changes no statement that runs.

| Reading | `main`, Vitest 4.1.10 | Input, 5.0.5 | Tip, 5.0.5 | Tip, one reporter instance (scratch) |
| --- | --: | --: | --: | --: |
| Files passing | 154 of 157 | 156 of 163 | 160 of 163 | 161 of 163 |
| Rows failing, passing | 3, 2,466 | 7, 2,624 | 2, 2,643 | 1, 2,644 |
| Exit code | 1 | 1 | 1 | 1 |
| Reporter error `browserContext.close` | **No** | Yes | Yes | **No** |
| `tproc` `DB/index.node` | **Loads and passes, with a warning** | Does not load | Does not load | Does not load |
| `tproc` `TokenPackageProcessor` | Fails | Fails | Fails | Fails |
| `material-x` `radio.visual`, 29 pixels | Fails | Fails | Fails | Passes |
| `size.node` slots row, 5 s timeout | Fails | Fails | Passes | Passes |
| RF-24's four rows, RF-25's two files | Pass | Fail | Pass | Pass |

- **`tproc`'s two failures don't come from this unit.** Its own config fails the same two files at the input and the tip, and nothing under `packages/tproc` is in the diff.
- **`DB/index.node` is new against `main`, not standing.** Its test is unchanged from `main`, where 4.1.10 warns that `vi.unmock` is not at the top level and the single row passes. Under 5.0.5 the file refuses to load, so that row doesn't run.
- **`TokenPackageProcessor` and `radio.visual` already fail at `main`.** `radio.visual` is intermittent and passes alone at the tip, and its test and `src/radio` are unchanged from `main`. I didn't look into either.
- **The `size.node` timeout has now failed at `main` and at the input, and not at the tip.** That is three of three root runs before the repair across the record and this recheck, and none of four after. I take no cause from that. The row still has the default 5 s, so the record's _not explained_ stands.

### Teardown through `release`

**The input's teardown is preserved by this unit, and the input's teardown is not `main`'s.** Occurrence at the input alone would have hidden the second half.

| Reading, whole root run | `main` | Input | Tip | Tip, one instance |
| --- | --: | --: | --: | --: |
| Closes per project at its boundary | 1 | **17** | **17** | 1 |
| Rejected closes | None | 1, at the first boundary | 1, at the first boundary | None |
| `provider` undefined at `release` | Not logged | 0 of 136 | 0 of 136 | 0 of 8 |
| Browser processes, peak, then at the end | 2, then 0 | 2, then 0 | 2, then 0 | 2, then 0 |

- **The edit changes nothing in these runs.** `provider` was present at all 136 calls in both trees, so `?.` never took its other branch, and the two logs match call for call. The statement that rejects is the same statement in both trees.
- **That branch is by reading only.** At the input an absent provider throws a `TypeError`. At the tip it is skipped and the orchestrators still close, as §34.9 asks. No run reached it, and I didn't construct one.
- **No browser leaked.** Browser processes returned to 0 in every run. At each rejection, the log shows the orchestrators already closed by another instance.
- **Rows don't appear to be affected, in this comparison only.** The rejection arrives at a boundary after the earlier group has settled, and the tip's total is 2,713 rows with or without it. This doesn't prove Vitest's _false positive_ warning can never apply.

## Findings

### Finding reviewer-1: 17 closes per boundary raise the reporter error (tier B, architect)

**Current behavior.** In a whole root run at both the input and the tip, the release reporter exists 17 times. So `release` runs 17 times concurrently on the same provider at each group boundary. In both of my runs, one close rejected at `1->2` with `browserContext.close: Target page, context or browser has been closed`. That surfaces as an _Unhandled Reporter Error_.

**Why it is a problem.** The root run is the repository's `just test`. By reading, `_checkUnhandledErrors` sets exit code 1, so this error alone fails a run whose rows all pass. `oneShotTestExecution`'s comment says the push is guarded and its summary says one provider released per boundary, and neither holds in a root run.

**Evidence.** `teardown.txt`, `root-readings.txt`:

- **The guard misses.** With two root projects selected, a scratch log read `guardHit=false` while reporters of the same class name were already present, and three instances were built. I didn't trace why the class has several copies.
- **The package config has one instance and one close.** That is why the record sees no such error in `drag2`'s own runs.
- **`main` closes once per boundary,** with the same `vitest-one-shot.ts`, byte for byte, under Vitest 4.1.10. `main` doesn't print the _applies the same plugin multiple times_ notice that 5.0.5 prints for these projects. That points at the upgrade, and I didn't bisect it.
- **The causal probe.** A scratch guard giving one instance gave one close per boundary and no reporter error, in one root run. `one-instance-probe.diff.txt` is a probe and not a proposed repair.
- **This is not caused by the diff:** `?.` is not on the failing path.

**Required property.** A root run releases each provider once per boundary, and teardown alone can't fail a run whose rows pass.

**Limit.** I didn't explain why only the first boundary rejected. The probe is one run of a race, though with one close there is no second close to race.

### Finding reviewer-2: a failed build no longer reports itself (tier B, architect)

**Current behavior.** With a syntax error in `src/drag.ts`, a forced non-zero exit from the build, or a plain `throw` in the setup, the run prints `No test files found, exiting with code 1` and a startup `TypeError: code.charCodeAt is not a function`. `tsdown exited` and the build's output never appear. In a root run with `node/vite-traits-plugin` also selected, no project's tests ran.

**At the input,** the same forced exit printed `Error: tsdown exited with 7`, failed the file that built, and let the others run: `packaging.node` passed its 14 rows.

**Why it is a problem.** The run still fails closed, with exit 1, so there is no false pass. But a `drag2` build error now misnames its cause, and in a shared root run it hides every other package's result. §34.9 asked for the single build and didn't weigh this. `build-package.node.ts`'s `fail(new Error(...))`, which exists to carry the build's output, never reaches the reader.

**Evidence.** `setup-and-orphan.txt`. The plain `throw` shows the message is lost when an error from this setup is printed, not in the child-process handling. I didn't trace further than that.

**Required property.** A failed build names itself and carries its output, and a repository-wide run's reach past one package's build failure is a stated decision.

### Finding reviewer-3: §34.9's stop condition (tier C, architect)

**Current behavior.** §34.9 says to widen the window with a scratch delay at the start of `build:done`, and: _if the row does not redden with 32 entries, the cause is excluded. Stop at the architect._ A delay at that site in one shared config applies to both builds, and that form did not redden. The implementer then delayed only the second emitter and treated that as authorising the repair. The record discloses this and asks for it to be weighed.

**Assessment.** The technical reasoning holds, as _The implementer's two calls_ shows, and §34.9's _cause is excluded_ would have been a false exclusion. But the stop was the architect's gate, and whether a delay at that site means both builds is an interpretation the implementer resolved in its own favor. I don't read this as a defect in the tree.

**Required property.** The architect states whether the one-sided reproduction discharges §34.9's first step before closing F-447.

### Finding reviewer-4: the orphan row is vacuous through the third config (tier C, architect)

**Current behavior.** `bench/shipped/vitest.config.ts` calls `createDragTestConfig` without the setup. Running its node project performs no build, `inject('builtAt')` is `undefined`, and `mtimeMs + 1000 < undefined` is never true. A planted orphan passed with exit 0. The same run at the input failed and named the file, because `size.node` built for itself.

**Why tier C.** No repository route runs that project: the config's own header and `bench/m2pp/run.ts` pass `--project shipped`. Nothing relies on this path.

**Required property.** The row can't pass without a build's timestamp, whichever config reaches it.

### Finding reviewer-5: two statements still say test files build (tier C, architect)

- **`.scripts/vitest-config.ts`, `NON_BROWSER_WORKERS`' comment:** _several files in this group spawn a build of their own_. No test file in the repository does now, and this is the reason given for the worker bound.
- **`tests/COVERAGE.md:991`:** _a `beforeAll` that already builds and measures every composition_. The commit corrected the same sentence in `size.node`.

**Required property.** The texts say what runs. §34.9 kept this unit to named changes, so whether these belong to it is the architect's call.

## Remaining blockers

**Nothing in this diff needs to change before the architect's closure, on my reading of §34.9. These decisions stay open:**

| Item | Owner | Question |
| --- | --- | --- |
| RF-24 and RF-25 closure | architect | Their required properties hold as read here |
| F-447 closure | architect | reviewer-3, and whether reviewer-2 bears on it. The property holds structurally. The cause stays unproven |
| reviewer-1 and the `DB/index.node` load failure | architect, then owner | Merging carries both onto `main`, which has neither. Are they gates? |
| `TokenPackageProcessor`, `radio.visual` | architect, then owner | They already fail at `main`. Do they bear on the merge? |
| Whether the root run must be clean to merge | architect, then owner | §32.1 doesn't say |
| The merge | owner | §32.1's gate 6 |

## Limits

- **Each reading ran once, on one machine, in Chromium,** apart from the two required package runs. Eight offsets are a search and not a rate.
- **The instrumentation is scratch.** It adds file appends and, at the pack, a tree scan of a few milliseconds. The clean package runs carried none.
- **`main` was read once, at its own dependency versions.** I attribute differences to the upgrade by version and by notice. I didn't bisect `01d88645f`, and other commits lie between.
- **Other packages' own configs were read only for `tproc`.** The rest came through the root runs.
- **Not read or driven:** `release`'s absent-provider path, the `npm` advisory the record names, and why `radio.visual` varies.
- **A root run leaves an untracked `.vitest/` directory,** at the input and the tip. I removed it in the scratch worktrees and didn't look further.
- **The Markdown linters ignore this report,** so it had `oxfmt` and `git diff --check`.
- **The D-209 limits are unchanged.** A, a3 and §34.6 stand, and nothing here speaks to them.