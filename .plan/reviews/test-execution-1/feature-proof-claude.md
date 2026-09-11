# Feature proof — test-execution redesign

**Read at commit:** `7aeaff260` (`drag2/fin-review`). The checkout advanced to `28e2066c8` during the pass; `git diff --name-only 7aeaff260 28e2066c8` is `.claude/agents/{cleanup,der,integrity}.md` only, so every file read and every command executed below is byte-identical to `7aeaff260`.
**Range under review:** `67af05288..7aeaff260` — `c1cab3031` (implementation) and `7aeaff260` (doc-only reconciliation of `architect-test-execution-model-r4.md`).
**Canonical contract read:** `.plan/test-execution-1/architect-test-execution-model-r4.md` in full at `7aeaff260`, plus `.plan/test-execution-1/implementer-test-execution-model.md`. Earlier revisions and the challenge documents were read only where r4 cites them.

## Lens

Falsification of the shipped configuration and production behaviour against r4. For each load-bearing property I designed the experiment that would show it false, ran it, and report what happened. Explicit clean results are reported as results.

## Method and isolation

Every non-mutating experiment ran against the shared checkout (read-only: test runs, config resolution, generation probes). **Every mutation-capable experiment ran in a detached worktree** at `7aeaff260` under my scratchpad, with `node_modules` symlinked from the main checkout and a private `@ydinjs/tproc` shadow so no shared build artefact was ever written.

Isolation verified at the end of the pass:

- `git status --porcelain` in `/workspaces/material-x` shows only untracked `.plan/reviews/test-execution-1/` (this report and the three sibling reports).
- `git diff --stat 28e2066c8 -- .` is empty, and `git write-tree` equals `git rev-parse HEAD^{tree}` (`e31049753cd66fcab96052baf088020ad48f1779`) — **no tracked file in the shared checkout was modified**.
- No `packages/**` artefact in the shared checkout was written: the two probes that patch a built artefact (`probe-tproc/index.js`) patch the worktree-local copy, restore it, and the restored bytes were checked by re-deriving byte-identical CSS output.
- Worktree left with the tracked tree restored (`git -C <wt> status --porcelain` shows only my untracked probe files).

Chromium is counted at the process level as **live browser instances**: processes whose `cmdline` begins with the Playwright `executablePath` `/usr/local/bin/chrome`. Verified by dumping the tree during a run — the browser parent carries that argv[0] and all 12 of its children (crashpad, zygote, gpu, utility, renderers) re-exec as `/opt/chrome/chrome`, so the anchored count is exactly the number of live browsers. This is a different (and sharper) metric than the "Chrome processes: 32/42" figures in the design and implementation records, which count the whole tree.

## Scope

**Executed, on the shipped tree:** the whole-repository `just test` run with 0.5 Hz cgroup and Chromium sampling; four filtered root runs; per-package runs of `box-quad`, `core`, `drag`, `tproc`, `vite-traits-plugin` and drag2's `cdp()` suite; both Zed test tasks; the one-shot guard and empty-run exemption through `createVitest`; root-config project/worker/reporter resolution with and without `--maxWorkers`; the `--sequence.shuffle` invariant; `--reporter=dot` survival; the CSS generation isolate (35 entries three ways, dependency discovery, snapshot race, failure recovery, in-flight invalidation, handle retention) and two real Vite dev servers.

**Mutation probes, worktree only:** the teardown primitive swapped to `ProjectBrowser.close()`; the workspace project list reversed, both resolved and executed end to end.

**Not covered.** Demonstrations 13–15 (the editor). No VS Code installation exists here either; I did not simulate an editor gesture and do not report those demonstrations as verified. `just build`, `just docs-build` and `just docs-dev` as whole recipes (demonstration 11) were not run — I exercised the dev-server path directly instead. Coverage runs, `vitest bench`, and the extension bundle were not re-read. I did not re-derive the design's own probe measurements (r4's fixtures); I measured the shipped code.

---

## Findings

### Item reviewer-1 — A watched change landing during a `.css.ts` evaluation fails that module's dev-server request with an error naming no file the developer touched (Tier A)

**Current behavior.** `discardGeneration()` calls `fail(current, …)`, which rejects **every pending request** with `CSS evaluation generation was discarded` (`packages/vite-custom-element-assets/src/css/generation.ts:66-77, 160-164`). The plugin's `watchChange` calls it for any tracked file or any `.css.ts` (`src/index.ts:256-260`), and `load` awaits `evaluate()` (`src/index.ts:208`), so the rejection surfaces as that module's load failure.

**Why it is a problem.** TE-D13's invalidation contract covers requests _arriving_ during a discard ("served by the next generation, never by the dying one") and covers rejecting pending requests only under **worker failure** ("A worker `error` or non-zero `exit` drops the generation and rejects every pending request with the underlying error"). Ordinary watch invalidation is not a failure, and TE-D16 explicitly keeps development watch and "repeated CSS generation on every rebuild" as a supported path. In that path a save now produces a transform error attributable to nothing the developer did. It is transient — the next request succeeds — but it is a behaviour the previous per-entry evaluator could not produce, and the record does not state it.

**Evidence.** At the generation API, on the shipped built artefact:

```
in-flight request during a discard: REJECTED: CSS evaluation generation was discarded
next request after the discard: len 4747
```

End to end through a real Vite dev server (worktree root, shipped `constructCSSTokens()`, HMR on), warming the generation, starting a transform, then appending to a tracked workspace-dependency artefact 700 ms later:

```
what the dev server returns for the in-flight module: LOAD FAILED: CSS evaluation generation was discarded
the next request: OK len=93
```

The window is the real evaluation time, not an artefact of the probe: the first cold entry measures ~480 ms (implementer) and a full 35-entry generation 2.56–2.67 s here. I used a deliberately slow entry only to land the change deterministically inside it.

**Required property.** A watch invalidation is not an evaluation failure. Either a request in flight when its generation is discarded must be re-served by the next generation, or the record must state that it is failed and say what a dev-server consumer sees. **Routed** — which of the two holds is a contract decision (TE-D13's failure semantics), not a defect I can resolve.

### Item reviewer-2 — The whole-repository memory divergence reproduces independently at near-design duration, so the record's container-load explanation does not hold, and the headroom is ~7 % (Tier B)

**Current behavior / contract.** TE-F35 reclassifies Δ 5554 MiB as an _expectation_: "A later run is compared against it, and a divergence must be explained rather than absorbed." Two explanations are offered — container load (the shipped runs carried a higher baseline "inside a cgroup also holding an agent session and thirteen background Chrome processes") and reclaimable page cache — and a quiet-container remeasurement is scheduled as an implementation-review obligation.

**Why it is a problem.** Neither explanation survives an independent run, so the record currently carries a hypothesis where it should carry a fact, and the number a future pass compares against is wrong by ~30 %.

**Evidence.** One `npx just test` at `7aeaff260`, 0.5 Hz sampling of `memory.stat`'s `anon` and `memory.current`, `memory.max` 17 179 869 184 B:

| Quantity                                                 | Design (r4)  | Implementation | **This pass**              |
| -------------------------------------------------------- | ------------ | -------------- | -------------------------- |
| Duration                                                 | 63.56 s      | 71 s (71–86)   | **66.20 s**                |
| Baseline `memory.current`                                | 2015 MiB     | 3158–3538 MiB  | **4800 MiB**               |
| Peak `memory.current`                                    | 7570 MiB     | 11 671 MiB     | **12 156 MiB**             |
| Δ `memory.current`                                       | **5554**     | **7412**       | **7356**                   |
| Peak anonymous / Δ                                       | not measured | 9843 / 6685    | **10 395 / 6618**          |
| `memory.events.oom_kill`                                 | 0            | 0              | **0**                      |
| Files / tests                                            | 157 / 2467   | 157 / 2467     | **157 / 2467, 60 sk, 1 f** |
| Providers released at a boundary                         | 7 of 7       | 7 of 7         | **7 of 7**                 |
| `Failed to run the test` / `close timed out` / unhandled | —            | 0/0/0          | **0 / 0 / 0**              |

Two things follow that the record does not have:

1. **Container load is ruled out by duration.** My run took 66.20 s against the design's 63.56 s (+4 %), while the implementation's took 71–86 s (+12–35 %). CPU contention in my run was close to the design's, and the delta still landed at Δ 7356 — within 0.8 % of the implementation's Δ 7412 and 32 % above the design's Δ 5554.
2. **Page cache cannot account for it either.** Page cache is counted in `memory.current` and not in `anon`. My **anonymous** delta is 6618 MiB, which already exceeds the design's _total_ `memory.current` delta of 5554 MiB by ≥ 1064 MiB. Whatever the extra is, it is anonymous memory.

The most parsimonious remaining reading — which I did not test — is that the design's single sample is not representative of the shipped mechanism, since r4's own Evidence limits record that arm as "a probe configuration wrapping the real root config" with "the per-generation evaluator applied as a reverted patch to the untracked built plugin artefact".

The binding requirement is met, but narrowly: peak `memory.current` 12 156 MiB against the 13 107 MiB working ceiling leaves **951 MiB (7.3 %)**. Since the run needs ~7356 MiB of `memory.current` headroom, the ceiling is cleared only while the rest of the cgroup stays under ~5750 MiB. This cgroup read 5448 MiB at rest at the start of my pass and 11 133 MiB while one sibling review pass was running its own filtered root run — at which point a concurrent `just test` would not have fit.

**Required property.** The record must not carry an unexplained divergence as a scheduled hypothesis once the hypothesis is falsified: TE-F35's expectation figure and its two candidate explanations need restating against a reproduced delta, and the transferable quantity should be the anonymous delta (~6618–6685 MiB) rather than Δ 5554. **Routed** — amending TE-F35 is the architect's call, not a code defect. Nothing in the shipped implementation fails an acceptance signal.

### Item reviewer-3 — Demonstration 20 is recorded as discharged, but the Zed debug task runs no browser test at all (Tier B)

**Current behavior.** r4 demonstration 20 reads: "**The debug task is run mode.** `.zed/tasks.json`'s `vitest:debug` reaches a breakpoint with the CDP port attached, and saving the file while paused does **not** start a second execution." r4's implementation section records 16–25 as evidenced, unannotated. The implementation record's evidence for it is: "**The debug task is run mode.** `.scripts/zed-test.sh <file> "" debug` runs the file and **exits on its own**, which a watch session would not do."

On the shipped tree the debug task aborts before opening a page, for **every** browser test file:

```
$ bash .scripts/zed-test.sh "$PWD/packages/box-quad/tests/advanced.browser.test.ts" "" debug
Error: browser.newContext: "deviceScaleFactor" option is not supported with null "viewport"
 ❯ PlaywrightBrowserProvider.createContext  @vitest/browser-playwright/dist/index.js:1086
 Test Files   (1)
      Tests  no tests
EXIT=1 elapsed=2s
```

Same on `packages/core`. `DEBUG=1` sets `ui: true` (`.scripts/vitest-config.ts`), the browser UI nulls the viewport, and the factory's `contextOptions: { deviceScaleFactor: 1 }` is then rejected. The same file on a **node** project works (`packages/tproc/tests/TokenPackage.node.test.ts`: 3 passed, exit 0, 1 s), which is consistent with "runs the file and exits on its own" having been observed on a node file.

**Why it is a problem.** It is _not_ caused by this range. I reproduced the identical error under the pre-range command form with the current config —

```
$ DEBUG=1 vitest -c vitest.config.ts --no-file-parallelism --test-timeout=0 --watch tests/advanced.browser.test.ts
Error: browser.newContext: "deviceScaleFactor" option is not supported with null "viewport"
      Tests  no tests            (EXIT=124, i.e. watch never exits)
```

— and `git show c1cab3031 -- .scripts/vitest-config.ts` touches no `ui:`, `viewport`, `instances`, `deviceScaleFactor` or `contextOptions` line. So the defect predates the range. The problem is that the record treats demonstration 20 as discharged: the evidence offered establishes only that the process exits, which is also what a run producing zero tests and an unhandled error does. A reader of the round cannot tell that the debug path — one of the workflows TE-D16 explicitly preserves ("the task, its terminal and the CDP port survive unchanged") — does not work on the tree that shipped.

**Evidence.** Four executions, above: shipped debug task on `box-quad` browser (fails), on `core` browser (fails), on `tproc` node (passes), and pre-range command form on `box-quad` browser (same failure).

**Required property.** A demonstration is discharged by evidence that distinguishes it from its failure mode. Demonstration 20's distinguishing half — reaching a breakpoint with the CDP port attached — is not established and cannot be on this tree. **Routed**: the demonstration's status is the architect's to set, and the underlying `ui: true` / `deviceScaleFactor` conflict is a pre-existing defect outside this range that should be raised rather than absorbed into it.

### Item reviewer-4 — The torn-down-project marking check can never fire; the one-shot counter always throws first (Tier C)

**Current behavior.** TE-D12 requires "A project that has been torn down is marked, and a run that would execute a specification belonging to a marked project fails loudly", and TE-D15 keeps it "as defence in depth against the silent zero-module success TE-F11 produces" — i.e. as a second, independent check. `OneShotTestExecution.onTestRunStart` (`.scripts/vitest-one-shot.ts:42-70`) orders them: empty-list exemption, then `#consumed`, then `#released`.

`#released` is written only by `#release`, which is reached only from `onTestModuleStart`; a module start implies the run reached `#consumed = true`. Therefore `#released` non-empty ⇒ `#consumed` true, and the `reused` branch is unreachable: the `#consumed` throw always precedes it.

**Why it is a problem.** Low consequence — the loud failure the contract asks for does happen, with the other message. But the record credits two independent defences where the tree has one, and demonstration 6 ("A torn-down project fails loudly on reuse") is in fact satisfied by the consumed counter, not by the marking.

**Evidence.** Reading the three writers of the two fields, plus the executed second-run arm, which throws the `#consumed` message and never the `reused` one:

```
run 1 modules executed: 6
run 2 threw: this Vitest process has already executed a test run
run 2 events: ["runStart n=6"]        run 2 modules executed: 0
```

**Required property.** Either the marking is reachable defence in depth, or the record should say that reuse is caught by one check and the marking is a diagnostic. **Routed** — whether to keep the redundancy is a design call.

---

## Null results

Each is an experiment designed to break the property, reported because silence would not distinguish it from an unexamined area.

### 1. One root Vitest process, no Nx fan-out; per-package and root-config discovery intact — holds

- `Justfile` `test *ARGS: vitest run {{ ARGS }}`; no `nx run-many -t test` remains in `Justfile` or `package.json`; root `package.json` `"test": "vitest run"`.
- I verified TE-D8's premise myself rather than inheriting it: `nx.json`'s `targetDefaults` keys are `build, typecheck, docs:build, docs:dev, docs:api:build, docs:api:prepare` — **no `test`** — and no `packages/*/project.json` declares a `test` target. Removing Nx therefore removed no ordering.
- The root configuration resolves **15 projects** and globs **157 specifications**, matching the seven per-package configurations' contribution.
- Per-package invocation, executed: `box-quad` 193 passed; `core` 263 passed (25 files, incl. the typecheck project); `drag` 310 passed; `vite-traits-plugin` 52 passed; `tproc` 70 passed + its one pre-existing failure. Each ran its own `vitest.config.ts` with the one boundary closure its group structure predicts.
- The API the extension discovers through is intact and does not spend the lifecycle: `experimental_parseSpecifications` is present, parsed `node/vite-traits-plugin`'s 6 specs (test counts `1,1,1,2,4,1`), and after **two** parses a real run in the same process still executed all 6 modules. **This is the node API, not an editor gesture** — demonstrations 13–15 remain unverified by me.
- Both Zed tasks: the ordinary task (`zed-test.sh <file> ""` → `npm run test -- <file>` → `vitest run -c vitest.config.ts`) passed 47 tests and exited 0. The debug task is reviewer-3.

### 2. Grouping and worker bounds serialize correctly and do not depend on list order — holds

Resolved root configuration: browser projects at `groupOrder` 1–7 with `maxWorkers` 2; all eight non-browser projects at `groupOrder` 8 with `maxWorkers` 6 — one value, as `groupSpecs` requires. The runtime project list is **node-first**, i.e. not the declared order, and the assignment is still correct, so the reporter's reading of `config.sequence.groupOrder` rather than list position is load-bearing and works.

**Ordering probe, both halves.** In the worktree I reversed the fifteen-entry list in `createWorkspaceTestConfig`:

- _Resolution_: browser projects still get distinct 1–7 (now `drag2`=1 … `material-x`=7), non-browsers still all 8. `shared = browserCount + 1` is order-independent, so the non-browser group is always strictly last and the "final group is never released by a boundary" property cannot be inverted by reordering.
- _Execution_: the same four-project filtered run under the reversed list — **41 files, 699 tests passed**, three boundary closures, now in the permuted order (`drag` 2→3, `box-quad` 3→4, `core` 4→8), Chromium oscillating with peak 2 and returning to 0. Identical outcome to the unpermuted arm.

**Worker CLI contract.** Executed against `resolveRequestedWorkers` through the real factory: `--maxWorkers=3`→3, `--maxWorkers 4`→4, `--maxWorkers=50%`→`"50%"` (which resolves to 6 for _every_ project on 12 cores, preserving group equality), and `0`, `abc`, a bare `--maxWorkers`, and `--maxWorkers --reporter=dot` each **fail the configuration load** with the factory's own diagnostic. `NON_BROWSER_WORKERS` is `Math.max(floor(availableParallelism()/2),1)` = 6 < `cores-1` = 11, as TE-D14 now requires.

**Invariant fails loudly.** `vitest run -c vitest.config.ts --sequence.shuffle` in `packages/box-quad`: exit 1, zero test files executed, zero `✓`/`×` lines, message `browser projects must each have a distinct non-zero sequence.groupOrder … "browser (chromium)" (0)`.

### 3. Boundary teardown uses the provider, releases Chromium at the process level, is distinguishable from a logged no-op, and tolerates the later close — holds

- **Primitive correct at source, in the installed version.** `ProjectBrowser.close()` is `await this.vite.close()` on `parent.vite` (`@vitest/browser/dist/index.js:2530-2600`); the pool releases with `provider.close()` (`cli-api.BK8pd4xc.js:2488`) then `orchestrator.$close()` (`:2492`). `#release` calls exactly that pair, scoped to one project.
- **Released at the process level, not by log line.** Four browser projects filtered from the root config (groups 4,5,6 + node at 8): 699 tests passed, three closures, live Chromium instances `0 → 1 ↔ 2 → 0` with **peak 2** for three browser projects. In the whole-root run the trace is `0 → 1,2,1,2,1,2,1,2,1,2,1,2,1 → 0` across **seven** browser projects — never more than two browsers alive, ending at zero.
- **The log does not distinguish a taken boundary from a logged one; Chromium does.** Mutation arm in the worktree, changing only `#release` to `await browser.close()`: the log lines are _identical_ (`closed browser/core (chromium) (group 4) at boundary 4->5`, `closed browser/box-quad … 5->6`) while Chromium climbs monotonically `1 → 2 → 3 → 4` and never falls, and the run **hangs after the second close** and never completes. I reproduced the hang on two different project orderings. r4 records the hang as "the implementation's observation, not a property established here" because its fixture did not reproduce it — on the real suites it reproduces reliably, so TE-F33 is stronger than the record claims.
- **Tolerates the later `Vitest.close()`.** Source: the playwright provider's `close()` nulls `browser`/`browserPromise`, clears pages and contexts, and ends at `await browser?.close()` on null (`@vitest/browser-playwright/dist/index.js:1187-1207`). Executed: `close timed out` appears **0** times in every run, including the whole-root one.
- **Identity from the runtime object.** `#released` is a `Set<TestProject>` keyed by object; the teardown log carries the runtime names (`browser/material-x (chromium)`), not the configured ones.

### 4. The one-shot reporter is an instance, survives `--reporter`, exempts empty runs, and refuses before modules run — holds

- Resolved root reporters: `[["agent",…], OneShotTestExecution]` — exactly **one** instance across fifteen `configureVitest` invocations, an object and not a string.
- `--reporter=dot` (which replaces the configured list wholesale) on a four-project filtered root run: the reporter still fired, still released all three providers at their boundaries, 699 tests passed. Same for the reversed-list arm.
- The carrier reaches plugin-less projects: `vite-traits-plugin`'s node project carries no plugins of its own and its runs are guarded (below).
- Empty run does not spend the lifecycle: with `watch: true` and an impossible filter, the reporter saw `runStart n=0` / `runEnd modules=0 errors=0` and Vitest raised `FilesNotFoundError` — confirming r4's **corrected** reading of TE-F27 (`watch: true` alone does not suppress it) — and the real run afterwards in the same process executed all 6 modules.
- Second consuming execution: throws `this Vitest process has already executed a test run`, **0 modules started**, and no `onTestRunEnd` — the unbalanced start r4 states as an accepted consequence, observed exactly as written.
- The `bench` escape hatch costs nothing today: no `vitest bench` invocation exists in any `Justfile` or `package.json`.

### 5. Runs that take no boundary closure conform; the whole root releases all seven — holds

`packages/box-quad`, whose entire configuration is one browser project: **0 boundary closures**, 193 tests passed, exit 0, Chromium `0 → 1 → 0`, no `close timed out`. The whole-root run produced all seven closures in exactly the order the record prints, `1->2` through `7->8`.

### 6. The CSS generation isolate — holds on all five sub-properties I could test

- **35/35 byte-identical** (sha-256 per entry) across one shared generation forward, the same reversed, and one fresh generation per entry. Timings 2.67 s / 2.56 s / 19.04 s.
- **Dependency set complete**: 123 distinct files — 88 `packages/material-x`, **29 `packages/tproc`** (10 built `.js` artefacts, `default-theme.json`, 14 token-table JSON files), 3 under a real `node_modules`, 3 elsewhere. Reproduces the record's 123/88/29 exactly, including the built artefacts and the JSON inputs.
- **No snapshot race.** I specifically looked for one: the deps arrive on a _different_ MessagePort from the evaluation reply, so a returned snapshot could be short. Five trials, each a fresh generation, comparing the snapshot returned immediately against one taken 800 ms later for an already-resolved module: delta **0** every time.
- **Failed generations are discarded.** A `.css.ts` that throws rejects with its own message and a stack pointing at the entry; a sibling entry keeps working byte-identically across the failure; and the corrected file then evaluates **in the same process** (`:host{color:red}`) — i.e. the poisoned isolate did not survive, which is what TE-F20 requires.
- **Rebuilt workspace dependency observed without a restart**, end to end through a real Vite dev server: the watcher registers the dependency's directories although they sit outside the Vite root (`probe-tproc`, `probe-tproc/DB`); appending an export to a **built artefact** fires `watchChange`; the next request produces CSS carrying the change (`--probe-export-count: 3 → 4`); restoring the artefact returns byte-identical output.
- **Demonstration 10's distinguishing half, which no previous pass demonstrated**, holds: with two entries sharing one dependency, a change to the dependency invalidated **both** cached transform results and both re-evaluated (`--a: 3→5`, `--b: 3→5`), not only the entry that resolved it first.
- **No parent-side handle prevents exit**: after `releaseGeneration()` the probe processes exited in 3–22 ms, and `close timed out` appears zero times in every Vitest run including the whole-root one.
- **Process-wide sharing is sound, now checked rather than asserted** (an r4 "ground to attack"): `ConstructCSSTokensOptions` has exactly one member, `isProd`, and it is consumed by `compileCSS` and the `transform` hook — both downstream of evaluation. No consumer option can reach the isolate.

### 7. Test watch retired without collateral damage — holds

`--watch` survives nowhere in the tree except as prose in `test-architecture.md`; the `pkill -f 'vitest.*browser'` line is gone while the CDP-port `pkill` is kept; `.vscode/settings.json` sets `vitest.watchOnStartup: false`; both docs gained the lifecycle statement. Build and dev watch are untouched — `handleHotUpdate`, `addWatchFile` and `watchChange` are all present and I exercised all three against a live dev server (null result 6). `browser.api.allowExec` resolves to `true` on all seven browser projects, and drag2's `input-policy.browser.test.ts`, which calls `cdp()` at `:148` and `:1332`, passes 25/25. Ordinary IDE execution and the debug task's breakpoint half are reviewer-3 and the editor boundary.

### 8. The root run stays under the ceiling with no new failure mode — holds

157 files, 2467 passed, 60 skipped, 1 failed (null result 9 below); 7/7 providers released at boundaries; `Failed to run the test` 0; `close timed out` 0; unhandled errors 0; `memory.events.oom_kill` 0; Chromium back to 0. Peak anonymous 10 395 MiB and peak `memory.current` 12 156 MiB, both under the 13 107 MiB working ceiling. The delta itself is reviewer-2 and is reported as evidence, not as a failure.

### 9. The remaining `tproc` failure is not caused by this range — independently attributed

I did not inherit the "pre-existing" label.

- The failure at `7aeaff260`, per-package: `tests/TokenPackageProcessor.node.test.ts:75 > should apply inheritance and render declarations`, `AssertionError: expected { 'state-layer.opacity': 0.08 } to deeply equal { 'container.color': 'red', …(1) }`. 1 failed | 70 passed.
- The **identical** failure, same assertion text, at `67af05288` — the commit immediately before the range — run from a separate worktree at that commit with its own `.scripts/vitest-config.ts`: 1 failed | 70 passed.
- `git diff --stat 67af05288 7aeaff260 -- packages/tproc` is empty, and `packages/tproc`'s last commit is `8b8b7be27` (2026-07-17), **416 commits before HEAD** and an ancestor of the branch point from `main`.
- The whole-root run at `7aeaff260` produces the same single failure, so the migration neither introduces nor masks any other.

**Conclusion: the range does not cause it.** It remains outside this work by instruction.

---

## On the verification boundary

I preserved it. No editor gesture was performed or simulated, and I report demonstrations 13–15 as unverified by me.

Asked whether the record states the boundary honestly: **it does, and consistently.** r4 carries it in four places — the Evidence limits ("The editor was read, not run, and is not installed here … **Every VS Code conclusion in this record is source-derived**, and none is editor-observed"), the corrections list ("revision 2's phrasing 'the installed extension' overstated that"), the demonstration list ("13–15 are untouched"), and the closing obligations ("stay **owner-executed**"). The implementation record matches it without softening ("the ordinary-gesture confirmation in a running editor is not performed and is not simulated"). I found no sentence in either document that claims an editor observation.

The one place the boundary is _adjacent_ to a discharged claim is reviewer-3: demonstration 20 is a **Zed** task, not a VS Code one, so it is inside the verifiable region and was verified only in the half that does not distinguish success from failure.

## What would have falsified each property, and did not

For the record, since a clean result is only meaningful with its attack named: reordering the project list (2); swapping the teardown primitive to the call r4 says is wrong, which did falsify the _logged-vs-taken_ distinction exactly as designed (3); running with `--reporter=dot`, which replaces the configured reporter list (4); filtering to a single browser project so that no boundary exists (5); comparing an immediate dependency snapshot against a settled one across a two-port delivery race, patching a built workspace artefact under a live dev server, and breaking then fixing an entry in one process (6); and running the failing `tproc` suite at the commit before the range (9).
