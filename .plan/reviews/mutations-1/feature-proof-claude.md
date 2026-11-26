# `repo:RD-65` unit 1, `@ydinjs/mutator` (#300, #301): feature proof

**Files were read at:** `9a65f1a89`, the head of #301 (`repo/mutations-1`), in slot `e`. The unit's commits are `ef6a78b93`, `472edce31` and `9a65f1a89`, on `cf378ad2e`. Engines: the tool's node rows and the probes have no engine. The tool's run of the witnesses was in Playwright's Chromium, headless, on Linux.

**Subject:** `RD-65` in [`00-index.md`](../../00-index.md) with its properties 1 to 12 and the dated notes by the architect and the implementer, Mx Architect B's [plan](../../mutations-1/mutations-plan.md), the implementer's [report](../../mutations-1/mutations-report.md), the diff `cf378ad2e...9a65f1a89`, and `CONTRIBUTING.md`'s package rules: _Dependencies of a published package_, §1.1 and §8.

**Verdict: properties 1 to 3, 9, 11 and 12 hold as written. Properties 4 to 8 and 10 hold except where the findings say.** The invoking checkout is never touched when the tool makes its copy. No worktree and no lock is left after a success, a failure, `SIGINT` or `SIGTERM`. The acceptance run in Chromium reads as the implementer reports. Seven findings: four are tier B and three are tier C. `reviewer-3` is the architect's: the acceptance dispatch that the unit owes after the merge can't run at `9173a25a1` as recorded. **`verify` passed on the head:** run [45802312847](https://github.com/ausginer/material-x/actions/runs/45802312847), every job green. Its `chromium` job ran `node/mutator`'s 18 rows.

## Scope

**Covered:**

- **The package's source,** all of `packages/mutator/src/`, its manifest, its Nx project, its `Justfile`, its `tsconfig`, its Vitest config and its fixture.
- **The root's changes:** `mutator.config.ts`, the `node/mutator` project in `.scripts/vitest-config.ts` and `vitest.config.ts`, the root `Justfile`'s project lists, `tsconfig.json`, and the lockfile's new member.
- **The workflow,** `.github/workflows/mutations.yml`, read against property 7. Its three jobs' commands were emulated on the fixture, with the runner in a sparse `.mutator/` that has no manifest: `check`, four legs (`a` and `b`, two shards each) with `--workdir .`, and `summary` over the four reports. Every step ran as the workflow writes it, and the merged summary has every mutation in both engines.
- **The 18 node rows,** run here: 18 passed in 24 s. They also ran in CI's `chromium` job.
- **The implementer's evidence:** the two runs of [his file](../../mutations-1/mutator.mutations.ts), the acceptance file and its Chromium report, the wrong prediction, and `acceptance/stale.mutations.ts`. `mutator check` on the stale file exits with 2 and names the edit, at the head. The acceptance file's edits apply at `9173a25a1` and at the head alike.
- **The probes** ([script](probes/probes.sh), [transcript](checks/probes.txt)), on repositories made from the fixture in a scratch directory, each copy in the probe's own `TMPDIR`:
  - P1, a row that doesn't run;
  - P2, a per-engine expectation for one engine;
  - P3, signals;
  - P4, a `--workdir` that differs from the commit;
  - P5, two mutations with one name.
- **My witnesses,** run with the tool at the head in Chromium ([file](reviewer.mutations.ts), [summary](checks/reviewer-chromium.md), [report](checks/reviewer-chromium.json)). They cover four rows that the implementer's file leaves without a witness. Each run's worktree was the one that `mutator run` makes, which the owner's word allows, and the tool removed it. No other worktree, slot or clone of this repository was made.

**Not covered:**

- the workflow on GitHub's runners: its sparse checkout, the browser action from `.mutator/`, the artifacts and the summary job's step summary. It can't be dispatched before the merge.
- the acceptance file in Firefox and WebKit, which is the owed dispatch.
- the implementer's first acceptance run, made with a clone, which this proof didn't repeat.
- a run of the tool on the real repository through the full RF-142 file. The implementer's 12-minute Chromium run was read, not repeated.

## The worktree's limits

The owner's word covers the worktree that `mutator run` makes for one run, in a temporary directory, which the tool removes when the run ends, also after a failure, and nothing else. Read against it:

- **The invoking checkout.** Without `--workdir`, the tool reads only refs and objects (`git rev-parse`, `git show <commit>:<file>`), and it writes only the shared `.git/worktrees/` entry of its own copy. In each probe and in each row, `HEAD`, the refs, the worktree list and `git status --porcelain --ignored` read the same before and after the run, including after a failed run and after each signal. The setup's `postinstall`, `.scripts/link-tsserver.ts`, replaces the store's hardlink with a new file and leaves other checkouts' links alone. **With `--workdir`, the checkout that it names is the target, and that can be the invoking one:** `reviewer-4`.
- **A worktree left behind.**
  - **None after a success, a failure, a process-group `SIGINT` or `SIGTERM`:** P1 to P3, the rows, and both of my witness runs. `git worktree list` holds only the checkout afterwards, and no `mutator-*` directory remains in the temporary directory.
  - **After `SIGKILL`,** the next run removes the copy (the row _should remove a locked copy whose process no longer runs_).
  - **After `SIGTERM` to the tool's process alone,** the worktree's entry is removed, but the run's Vitest keeps running, recreates part of the copy's directory, and leaves it: `reviewer-5`.
- **A lock left behind:** none in any probe. The lock reason is `mutator <pid>`, and its owner is tested with `kill(pid, 0)`. That test is valid only in the PID namespace where the run started. Every slot is in the one devcontainer (`coordinator-setup.md`), so this holds today.

## The choices the implementer left to the reviewer

- **A row that ran and passed unmutated, and doesn't run with the mutation, counts as failed:** not accepted as implemented, `reviewer-1`.
- **_Survives_ is judged on rows that passed unmutated, and _void_ only for a selected row:** accepted. This is property 5's table: _void_ is "the unmutated run of that engine already fails a selected row".
- **A selector covers only the rows that ran unmutated in that engine, so a selector whose rows an engine skips is refused there:** accepted. Property 5 makes the file invalid for "a selector that covers no row of the unmutated run". The refusal comes after the unmutated run and before any mutation is applied, which is the earliest point where the rows are known. It matters for the owed dispatch: `reviewer-7`.
- **A `byEngine` expectation for any engine suppresses _differs_ for every engine:** not accepted, `reviewer-2`.
- **One application per mutation, run in each of its engines:** accepted. The engines still run one at a time. In CI each leg has one engine, so nothing changes there, and a local run rebuilds once per mutation.
- **The extra options:** `--shard`, `--report` and `--summary` are accepted. The workflow needs them, and they change nothing that property 8's four options do. `--workdir`: `reviewer-4`.
- **The groups of RF-142's mutations:** accepted. The four survivors are _doubted_, which `RD-62` property 5 defines as a mutation that "survived". The other ten are the implementer's attribution, not the review's, and the file's comment says so. A group changes only the summary's count line.
- **Exit codes:** accepted for `run` and `summary`. A leg's 2 is a separate issue: `reviewer-7`.

**Dismissed:** two mutations with one name hide the first one's _missed_ from the summary and from the exit code (P5). Property 2 and `format.ts` state that a name is unique in the file. An integrator can meet that term and can find it, so under `CONTRIBUTING.md` §1.1 (a) no check is owed. The lockfile's 27 `peer` entries under `packages/mutator/node_modules/` are the same as the `vite-*` packages' entries for their peers. aube installs none of them.

## The dispatches owed after the merge

GitHub dispatches only a workflow that is on the default branch. So both dispatches run `mutations.yml` from `main`:

1. **The acceptance run (property 10, step 3):** `file: .plan/mutations-1/acceptance/rf-142.mutations.ts` in the three engines, with the outcomes and flags recorded as information. **As recorded, with `ref: 9173a25a1`, it can't run:** `reviewer-3`.
2. **The witness of a stale edit (the unit's _Witness_):** `ref: main`, `file: .plan/mutations-1/acceptance/stale.mutations.ts`, `shards: 1`. Expected: `plan`'s `check` step exits with 2 and names _an edit that no longer matches_, and `leg` and `summary` are skipped. `check` reads the same locally at the head.

## Findings

### reviewer-1 — B — A mutation that only stops a test file from loading reads _as expected_, and the summary can't tell it from failed rows

- **Current behavior:** `judge` counts a row that passed unmutated as failed when the mutated run doesn't run it (`report.ts:88–91`). `runVitest` reads only `assertionResults` (`vitest.ts:84`), so a test file that fails to load adds no row, and its error message is lost. The Markdown summary writes `failed: <row>` for both cases (`report.ts:247`). Only the JSON report holds the message _the row did not run_ (`report.ts:96`).
- **Evidence:** P1. A mutation that breaks the parse of `src/math.ts`, predicted to fail _should clamp low_, reads _as expected (7)_. The summary says _every outcome is as expected_, and the run exits with 0. Every row's message in the JSON is _the row did not run_, and the summary contains no _did not run_.
  - No row holds the choice. The implementer's witness _a row that doesn't run counts as passing_ is predicted, and reads, _survives_.
  - The same reading follows for any cause that stops a file from running under one mutation, such as a browser that fails to start in one leg. Every `fails` prediction of that mutation then reads _as expected_.
- **Why it matters:** property 5's _as expected_ is "every row that a selector covers fails". A row that didn't run hasn't seen the mechanism. The summary is what the workflow publishes and what a review saves (property 9), and in it a broken import can't be told from a removed mechanism. That is the false kill that `RD-62` property 5 asks a review to rule out.
- **Required property:** an outcome is _as expected_ only for rows that ran and failed, or the summary distinguishes a row that didn't run from a row that failed. The reason that stopped the file is recorded in either case.
- **Routing:** the implementer. Property 5 names four outcomes, so a fifth state for a row that didn't run is the architect's call.

### reviewer-2 — B — A per-engine expectation for one engine suppresses _differs_ between the other engines

- **Current behavior:** `differs` returns `false` when any engine's result has any `byEngine` expectation (`report.ts:171–176`), whichever engines differ.
- **Evidence:** P2. A mutation runs in `a`, `b` and `c`, with a per-engine expectation for `a` alone ("a takes the other branch"). In `b` it fails _greet_. In `c` it fails _greet_ and _add_, and _add_ ran in both. The summary flags nothing and the run exits with 0. P2b is the same mutation in `b` and `c` with no per-engine expectation: it is flagged **differs** and exits with 1.
- **Why it matters:** property 6 says a mutation "is flagged _differs_, unless a per-engine expectation gives the reason". The reason given here is `a`'s. It explains nothing about `b` and `c`. With three engines, a per-engine expectation for WebKit hides a difference between Chromium and Firefox, which is `RD-62` property 5's last sentence.
- **Required property:** a per-engine expectation accounts only for the differences that its engine makes. Two engines whose expectation is the mutation's own are still compared.
- **Routing:** the implementer.

### reviewer-3 — B — The acceptance dispatch can't run at `9173a25a1`, because that commit doesn't hold the file

- **Current behavior:** property 7's `ref` is "the commit to run, which holds the mutation file". The workflow checks `ref` out and reads `file` from it (`plan` and `leg`), and the code under test is the same checkout. Property 10 and the plan's MU-10 step 3 dispatch the acceptance file "on the same commit", `9173a25a1`. The report and the implementer's note list it as owed after the merge "on `9173a25a1`".
- **Evidence:** `git cat-file -e 9173a25a1:.plan/mutations-1/acceptance/rf-142.mutations.ts` fails. The file was first committed in `9a65f1a89`. `mutator check` on the file reads clean at `9173a25a1` and at the head, so a dispatch with `ref: main` would run without a refusal, on code that differs from the review's (34 files under `packages/material-x` and `packages/core` differ from `9173a25a1`). The plan's MU-7 says "the acceptance run below depends on" running an older commit.
- **Why it matters:** the witness that the unit owes after the merge can't be made as recorded. A dispatch on `main` would succeed and look like the acceptance run while it reads other code.
- **Required property:** a dispatched run of property 10's acceptance reads `9173a25a1`'s code, and the record says which commit held the file.
- **Routing:** the architect. Properties 7 and 10 conflict for a file written after the commit it runs. Choosing a commit that holds both, or another input, is a contract decision. So is creating any ref for it.

### reviewer-4 — B — `--workdir` makes any checkout the target, including the invoking one: it isn't compared with the commit, and a signal leaves the mutation in it

- **Current behavior:** with `--workdir`, `run` makes no copy and applies the mutations in the named directory (`run.ts:165–173`). The edits are checked against `commit` in the invoking repository's objects, and then applied to the directory's files with `String.prototype.replace` (`run.ts:289`), which changes nothing when the text isn't there. The signal handler removes the copy, which is a no-op here, and calls `process.exit` (`run.ts:175`), so `withMutation`'s `finally` doesn't restore the sources.
- **Evidence:**
  - **P3c:** Ctrl-C (`SIGINT` to the process group) during a mutated run with `--workdir` exits with 130 and leaves `src/math.ts` modified in that checkout.
  - **P4:** a `--workdir` whose `src/math.ts` differs from the commit passes the edit check. The edit isn't applied, and the mutation reads _missed_ with exit 1, as a row blind to the mechanism would.
  - **The contract:** the option's only statement is `RunOptions.workdir`'s JSDoc, "An existing checkout of `commit` to run in, in place of a copy". The invoking checkout at `HEAD` satisfies it. The CLI's header lists the option with no condition.
- **Why it matters:** property 4 says mutations are applied "never in the invoking checkout", and property 8 names four options. The workflow needs `--workdir` for a disposable checkout of `ref`, where neither case harms anything. Locally the same option runs in a reviewer's tree and can leave a mutation there. It can also report a false _missed_ for an edit that the check accepted.
- **Required property:** property 4 holds for every option that the CLI accepts. A mutation is applied only where its edit was checked, and it is restored, or its checkout discarded, on every way that the run ends.
- **Routing:** the architect, because the option is outside property 8's four and it is a public-surface call. The restore on a signal is the implementer's.

### reviewer-5 — C — After `SIGTERM` to the tool alone, its Vitest keeps running and leaves files in the temporary directory that no later run removes

- **Current behavior:** the handler removes the worktree and exits (`run.ts:174–179`). It doesn't stop the child process. `removeStale` finds a leftover only through `git worktree list` (`copy.ts:37`).
- **Evidence:** P3a. During the run there are two worktrees and the lock `mutator <pid>`. Right after `SIGTERM`, there is one worktree and no lock, and the exit is 130. The run's Vitest is still running. When it ends, the temporary directory holds `mutator-*/copy/node_modules/.vite` (Vitest's cache, written into the removed copy's path) and `mutator-report-*/report.json`. P3b, Ctrl-C to the process group, leaves nothing. P3c leaves `mutator-report-*`, because the exit runs before `runVitest`'s `finally`.
- **Why it matters:** no checkout, worktree entry or lock is affected. The report's _"Removed when the run ends, after a success, a failure, `SIGINT` or `SIGTERM`"_ holds for the worktree's entry and not for its directory. An orphaned Vitest that keeps a browser running breaks `RD-62`'s "one engine at a time with nothing else running" for the next run. The exit status is 130, `SIGINT`'s, for `SIGTERM` too.
- **Required property:** a run that ends on a signal leaves no process and no file of its own behind, or the report states what it leaves.
- **Routing:** the implementer.

### reviewer-6 — C — Five of the 18 rows have no witness in the implementer's run, and the `--workdir` row doesn't see `--workdir` ignored

- **Current behavior:** the [second run](../../mutations-1/checks/mutator-chromium-2.json)'s 13 mutations fail 13 rows. No mutation fails these five: _as expected_, _missed_, _a survivor that fails no row as expected_, _a browser project_, and _--workdir_.
- **Evidence:** my witnesses ([summary](checks/reviewer-chromium.md)):
  - _a selected row that passes is never missed_ fails the _missed_ row;
  - _nothing is read as expected_ fails 8 rows, the _as expected_ row among them. The browser row and the `--workdir` row are among the 8 only because their outcome is read, not because of their own mechanism;
  - _a survivor is always caught_ fails 3 rows, the survivor row among them;
  - _--workdir is ignored_ fails no row, as predicted: the row reads the outcome, the checkout and the temporary directory's listing, and a copy in place of the workdir leaves the same three.
  - The browser row has no witness of its own mechanism, a mutation that the browser project alone sees.
- **Why it matters:** `RD-65` property 10 asks for rows for each outcome, and `RD-62` property 1 asks for their witnesses. Three now have one. The `--workdir` row holds the option's absence of a worktree, not its use of the directory, which is the mechanism that `reviewer-4` turns on.
- **Required property:** each of the 18 rows has a witness that removes the row's own mechanism and fails it, and the `--workdir` row fails when the named directory isn't the one run.
- **Routing:** the implementer.

### reviewer-7 — C — The summary tells the reviewer to run a refused leg again

- **Current behavior:** a leg accepts exit 1 and fails on any other code (`mutations.yml`, the `run` step's `|| [ $? -eq 1 ]`), so a selector refused in that leg's engine (exit 2) fails the leg and uploads no report. `summary` then prints _"A leg ended with failure, outside the tests: run it again"_ (`mutations.yml:181–183`).
- **Evidence:** read, not run. GitHub can't dispatch the workflow before the merge. The refusal per engine is the implementer's accepted reading above. The acceptance file has no per-engine expectation. It ran 193 rows with none skipped in Chromium, and no record says what Firefox and WebKit skip.
- **Why it matters:** a refused file is invalid in that engine, and running it again refuses it again. The leg's log has the refusal, and the summary's instruction points away from it. This is the first case where the owed acceptance dispatch can meet it.
- **Required property:** the summary distinguishes a leg that refused its file from a leg that failed for a reason outside the tests.
- **Routing:** the implementer.

## Checks

- `packages/mutator`: 18 rows, `aube exec -- vitest run -c vitest.config.ts`, 18 passed. Format, lint and typecheck were read from CI's `static` job, which passed. They weren't run here.
- This proof's files: `reviewer.mutations.ts` formatted with `oxfmt`. The root's oxlint and ESLint configs ignore `.plan/`, so lint doesn't apply. `mutator check` reads it clean at the head. `probes.sh` has no formatter. Markdown: `oxfmt`, the links checked by a scratch script, and `git diff --check`.
- CI: `verify` run 45802312847 on `9a65f1a89`, success. The `mutations` workflow has no run.