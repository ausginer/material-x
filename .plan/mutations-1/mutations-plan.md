# A review's mutations as data, one runner, and a CI workflow that runs them in each engine

**Status: answered by the owner on 2026-11-26** ([answers](#the-owners-answers-2026-11-26)), **and minted as [`repo:RD-65`](../00-index.md) by the main architect the same day** (it said _"for the main architect to mint"_). **Ready for an implementer: unit 1.** Written by the architect on `repo/mutations-1`, from `origin/main` at `6aa5330e3`, on the coordinator's task of 2026-11-26. The labels `MU-1` to `MU-12` are local to this plan. The main architect mints them as one `RD` (see [Identifiers](#identifiers)).

**Where it comes from:**

- **`repo:RD-62`, with its trial amendment and its Q1 note,** on `repo/engines-2` (#295, `86a99581e`), which isn't merged yet. Property 5 says which mutations a feature proof repeats in the three engines. Property 4, as the trial amends it, has the review run them locally, one engine at a time.
- **The owner's answer to Q1, 2026-11-26,** on the architect's reading of the same day: _"Согласен с вариантом 1 (можно даже отдельный тулсет новым пакетом сделать 😅 Будем конкурента stryker'у писать). Пока его нет - (а)"_ ("I agree with option 1 (we could even make a separate toolset as a new package 😅 We'll write a Stryker competitor). Until it exists, (a)"). Option 1 is a unit's mutations as data, one shared runner, and a CI workflow that the reviewer dispatches.
- **What a review's mutation run costs now,** measured on 2026-11-26 ([timings](checks/timings.txt)).

## What exists, and what it costs

**The runners.** `.plan/**/probes/` holds 188 mutation runners in `.mjs`, `.ts`, `.py` and `.sh`. Those that run Vitest are one script copied many times:

- a list of `[name, file, from, to]` replacements, each required to match its file exactly once;
- for each mutation: write it, run `vitest run -c vitest.config.ts <files>` with `MX_TEST_ENGINES=<engine>`, print `## name | engine | N passed, M failed` and the failed rows' names, then restore the sources.

The differences are small:

- some apply several replacements in one mutation (`top-app-bar-1`), or add an import (`hidden-1`);
- some read Vitest's JSON reporter, others its text;
- some restore from memory, others with `git checkout -- src`.

**What no runner does:**

- **It doesn't record what a mutation should fail.** The reviewer reads the printed rows and judges them by hand.
- **It doesn't compare engines.** Property 5's last sentence, that a row caught in one engine and not another is a finding, is checked by eye.
- **It doesn't keep the reviewer's tree safe.** Each runner edits the sources of the checkout it runs in. Several say "run from a scratch copy" in a comment.

**The time.**

- One Vitest start costs about 6 s on a small file. The files of a typical unit take 52 to 58 s per run in each engine, 92–94 % of it in the tests.
- A feature proof usually has 12 to 26 mutations.
- A review of 20 mutations on files like `RF-142`'s is about 18 min of runs per engine, 55 min for the three, one at a time. This is an estimate from the measured runs, not a measured review.
- CI's `verify` takes about 12 min; its `firefox` job is the longest at 11m42s.

## The design

### MU-1 — A private workspace package, with no material-x in it

The runner is a new workspace package, `@ydinjs/mutator` in `packages/mutator/`, with the CLI `mutator` (Q2). It is **private** (`"private": true`) until the owner decides to publish it (Q1).

- **Nothing in it names material-x, `MX_TEST_ENGINES` or this repository's recipes.** What a repository needs is in a config file that the repository owns (MU-3).
- **It runs Vitest.** `vitest` is a peer dependency, at the majors the workspace tests against (CONTRIBUTING, _Dependencies of a published package_). A mutation tool that runs Vitest's browser mode in several engines, and mutates CSS and templates as well as code, is the gap that Stryker leaves (MU-12).
- **Why a package, and not a script in `.scripts/`:**
  - It has a public surface from its first day: the data format, the config and the CLI. A package gives that surface a boundary, a manifest and a `CHANGELOG`.
  - Its own tests run as a package's do, with no special case in the root.
  - Publishing it later becomes a change to the manifest and a release, not a move.
- **Why private first:** its data format and config will change during the first reviews that use it. CONTRIBUTING §8 lets an unreleased API change without compatibility, and a published one can't.
- **Cost:** a package's scaffolding, comparable to `size-limit-preset-rolldown` (`package.json`, `Justfile`, `tsconfig`, lint and format configs, Nx project), and its own tests. A script would avoid the scaffolding and would have to move later.

### MU-2 — A mutation file is data

A unit's mutations are a TypeScript module whose default export is a plain object typed by the package. The module has no functions, and the runner reads only the data.

**Required content:**

- **The runs:** which test files to run and from which directory: a package's directory, and its test files or patterns. A mutation file names one or more runs. A mutation in one package that another package's tests read names that package's run.
- **The engines,** for the file. A mutation may name its own set.
- **Each mutation:**
  - **a name,** unique in the file;
  - **its group,** in `RD-62` property 5's terms: the required property's mechanism, a mechanism that engines implement differently, doubted (it survived, was called equivalent, or the reviewer doubts it), or other. The report lists the groups, as property 5 requires;
  - **its edits:** one or more of _file, text, replacement_. Each text must occur exactly once in its file at the commit that is run;
  - **its expectation,** written before the run (MU-5).

**Why a module and not JSON or YAML:**

- Edits are code, and code spans lines. A template literal holds it as it is written, where JSON escapes every line break.
- The existing runners already hold their lists as JavaScript literals, so moving one over is mechanical.
- Node runs TypeScript directly, so the runner imports the file with no parser dependency. Its `import type` of the format is erased, so a file at an old commit runs too.

**Where it lives:** in the record. An implementer's file goes in the unit's `.plan/<unit>/`, and a review's in `.plan/reviews/<unit>/` (or the package's `.plan/`), beside the report it produced (MU-9).

### MU-3 — The repository's config says how its tests run

One config file at the repository's root, read from the runner's own checkout (MU-7), says:

- **setup:** the commands that make a fresh copy at a commit ready to test. Here: install, then the builds the tests need (`_test-builds`, which a fresh copy can't start without; [timings](checks/timings.txt)).
- **engines:** for each engine, its name and what selects it for a Vitest run. Here that is the environment variable `MX_TEST_ENGINES=<engine>` (`.scripts/vitest-config.ts`). For drag, the project names follow from it.
- **rebuilds:** for files that a test reads only after a build, a path pattern and the command that rebuilds it. A mutation that edits a matching file is followed by that command. Without it the mutation never reaches the test, and it looks like a survivor. Here: `packages/core/src/**` and the other packages the tests read built; material-x's own source runs through Vite, and needs none.

**A target whose harness differs from the config,** such as an old commit from before a rename, is run with a config that matches it (`--config`).

### MU-4 — Mutations are applied in a scratch copy, never in the invoking checkout

The runner creates a copy of the repository at the commit to run, sets it up (MU-3), and removes it at the end, also after a failure.

- **Locally,** the copy is a detached `git worktree` in a temporary directory. Measured: 1.7 s for the worktree, 9.8 s to install, 20 s for the builds, once per invocation and not per mutation ([timings](checks/timings.txt)). The reviewer's tree, and any other session's, is never edited.
- **In CI,** the runner's checkout and the target's checkout are separate directories of one job (MU-7).
- **Between mutations,** the runner writes the original text back. If a rebuild ran for the mutation, it runs again after the restore.
- **Before any run,** every edit of the file is checked against the commit: each text occurs exactly once. A file with a stale edit is refused before anything runs, and the refusal names each such edit.
- **Rejected: applying the mutation in a Vite `load` or `transform` hook,** in memory with no copy. It is faster and needs no restore. But a file that doesn't pass through Vite, or that a test reads built, is silently never mutated, and that reads as a survivor. A false survivor is a false finding, or a false "equivalent", which is worse. An edit on disk reaches whatever reads the file.

### MU-5 — An expectation is a prediction, and the report compares it

A mutation states one of two expectations:

- **It fails rows:** one or more row selectors. A selector is a test file and a text that a row's full name contains, so `"should write the semantics of a disabled handle"` covers the button-item and link-item rows of `RF-142` together. The expectation holds in an engine when every row that a selector covers fails.
- **It survives, with the reason:** the mutation is equivalent, or the reviewer expects no row to see it, and says why. The expectation holds when no row fails.

An expectation may differ by engine only with a reason, for a row with an engine condition or a property that only one engine shows.

**The outcome of a mutation in an engine:**

| Outcome | When |
| --- | --- |
| **as expected** | Every selected row failed (others that failed are listed), or nothing failed for _survives_. |
| **missed** | A selected row passed. The row is blind to the mechanism, or the prediction was wrong. |
| **caught** | _Survives_ was expected, and rows failed. The "equivalent" mutation isn't. |
| **void** | The unmutated run of that engine already fails a selected row. The row has no verdict there. |

A selector that covers no row in the unmutated run makes the file invalid. That selector is refused before anything runs, as a stale edit is.

**The reviewer still judges every outcome.** The runner reads _for the right reason_ only as far as the row's name goes, and the failure messages are in the report for the reviewer. A missed or caught outcome is a candidate finding, or a prediction the reviewer corrects in the file. A correction is a commit, so the record shows it.

### MU-6 — The engines are compared

A mutation that runs in several engines and fails a different set of rows in one of them is flagged **differs**. Only rows that ran in every engine compared count; a row that an engine skips doesn't. This is property 5's last sentence, made mechanical.

A per-engine expectation with its reason (MU-5) accounts for the difference, and the flag isn't raised. Otherwise the reviewer reads it: it is a finding, unless the row or the contract says why.

### MU-7 — A workflow that the reviewer dispatches runs the file in each engine

`.github/workflows/mutations.yml` runs on `workflow_dispatch` only, as the Safari workflow does (`RD-12` property 12).

- **Inputs:**
  - `ref`: the commit to run, which holds the mutation file;
  - `file`: the mutation file's path at that commit;
  - `shards`: how many legs each engine is split into, `1` by default.
- **The runner comes from the ref the workflow is dispatched on,** `main` or the review's branch, and the code under test from `ref`.
  - So a commit older than the runner can be run, and the acceptance run below depends on it.
  - The engines are the builds that `ref`'s lockfile pins, as in `verify`. Each leg installs them with `verify`'s `browser` action.
- **Legs:** one per engine and shard, each on its own runner, so "one engine at a time with nothing else running" holds in each.
  - A leg runs the unmutated files first, then its share of the mutations, one at a time.
  - It uploads its JSON report as an artifact.
- **A last job** gathers the legs' reports, computes MU-6's comparison, and writes the Markdown summary to the run's summary and as an artifact. It fails when any outcome is missed, caught or void, or any mutation differs. It isn't a required check, and gates nothing.
- **Permissions:** `contents: read`, no secret. Concurrency: one run per `ref` and `file`, none cancelled.
- **Cost, estimated:**
  - A leg's setup is about `verify`'s: checkout, `aube ci`, the browser, the builds, about 2 min.
  - Then one Vitest run of the files per mutation: 6 to 60 s each by the measured files.
  - 20 mutations on files like `RF-142`'s, at about 55 s a run with each leg's unmutated run, take about 21 min per engine with `shards: 1`, and about 10 min with `shards: 3`, the three engines in parallel. Nine legs is close to `verify`'s job count. The repository is public, so the minutes aren't billed. Running jobs share the plan's concurrency limit with `verify`, which then waits.
- **Nothing runs on a pull request by itself.** Rejected: running every changed mutation file on each push.
  - A mutation file is a record, so a commit that changes only records gets `verify`'s reduced run (`RD-15`) and no mutation job.
  - The file belongs to one review of one head. Run on every push, it would become a permanent suite whose edits go stale with each refactor (MU-9).

### MU-8 — The same CLI runs locally

`mutator run <file> [--ref <commit>] [--engine <name>…] [--only <mutation>…] [--config <path>]`:

- `--ref` is `HEAD` by default.
- Locally the file is read from the working tree, so an uncommitted file runs. In CI it is read from `ref`.
- An implementer runs it in Chromium. A reviewer runs it to reproduce one leg, or one mutation in one engine.
- The output is the same JSON and Markdown as a leg's.

### MU-9 — After the review, the file is the record, and nothing runs it again

The review cites the run, and saves its JSON report and its summary in the review's `checks/`, because Actions artifacts and logs expire. The file and its report stay in the record.

**A mutation file isn't a regression suite.** Its edits are valid at the commit it was run on, and they go stale as the code changes. A recheck writes its own file, which may copy entries from the first.

### MU-10 — The runner's evidence

**Its rows,** as node tests of the package, on a fixture package with a node project and a browser project. They cover:

- an edit that doesn't match exactly once, and a selector that covers no row, each refused before any run;
- the invoking checkout unchanged after a run and after a run that fails midway;
- each outcome of MU-5, and a per-engine expectation;
- MU-6's flag, and a skipped row that doesn't raise it;
- a rebuild that runs for a matching path and not for another.

**The acceptance run on a real review:**

1. Rewrite `RF-142`'s review runner (`.plan/reviews/disabled-item-1/probes/mutations.mjs`) as a mutation file, taking each mutation's expectation from its Chromium reading (`checks/mutations.txt`: 10 fail rows and 4 fail none).
2. Run it at `9173a25a1`, the head that the review read, locally in Chromium. Every outcome must be _as expected_.
3. Dispatch the workflow on the same commit in the three engines. Their outcomes and flags are read and recorded as information, not as a condition, because the review never ran Firefox or WebKit.
4. Change one expectation to a wrong prediction, and confirm that the run reports it _missed_ and fails.

### MU-11 — Old runners stay as they are

The 188 existing runners are records of runs already made (`RD-62` property 8), and they aren't migrated. MU-10's acceptance rewrite of `RF-142`'s review file is the only one. It stays beside the original as the record of the acceptance run.

### MU-12 — Why not Stryker

StrykerJS's Vitest runner documents that browser mode isn't supported. Every row here is a browser-mode test in three Playwright engines. It also runs single-threaded and turns off coverage, and as far as its documentation goes it mutates JavaScript and TypeScript, not CSS or HTML.

It also answers another question. It generates mutants from operators, hundreds per file and many of them equivalent, and asks how many the suite kills. Property 5 asks whether a row fails when the mechanism the reviewer names is removed, and only the reviewer's own mutations answer that.

Source: <https://stryker-mutator.io/docs/stryker-js/vitest-runner/>, read on 2026-11-26. The page has no date, so check its changelog before relying on this.

## `RD-62` after this unit, which ends Q1's interim (a)

**Not in this unit.** The amendment changes `.agents/docs/test-architecture.md` and the role definitions under `.claude/agents/`, which are project documentation. Project documentation is a unit of its own with its own pull request (`agent-workflow.md`, _One branch and one pull request per unit_). That unit follows this one's merge, and `RD-62`'s record entry is amended with it, so the record and the rule change together.

**What it amends, on `RD-62` as #295 leaves it:**

- **Property 5:** the three groups, and the engines they run in, are unchanged; Q1's answer, (a), is kept. What changes is where they run. A feature proof writes its mutations as a mutation file, commits it, and runs it with the workflow on the reviewed head. The review names the run and saves its report (MU-9). The mutations outside property 5's groups are read from the implementer's report, as now.
- **Property 4:** the _Locally_ bullet loses _"the mutations of property 5 in the engines that it names"_. It gains: the runner locally, to reproduce a leg or one mutation. The rules for a pending and a failed run are extended to the mutation run:
  - pending: the verdict for those mutations waits;
  - a leg that failed for a reason outside the tests: run it again;
  - an outcome other than _as expected_, or a _differs_ flag: the reviewer's to judge, as property 5 says.
- **Property 1, by Q3:** an implementer writes the unit's mutations as a mutation file and runs it locally in Chromium. The review can then run them in the three engines without copying them out of a script.
- **Texts:** `test-architecture.md`'s _Engines in development and in review_, `reviewer.md` and `implementer.md`; `handoff.md` if its clause on a feature proof names local mutation runs.

Q1's interim (a) ends when that unit merges.

## Units, in order

1. **This unit, `repo/mutations-1`:** this plan; the package (MU-1 to MU-6, MU-8), with its rows (MU-10); the repository's config (MU-3); the workflow (MU-7); the acceptance run, recorded in `.plan/mutations-1/` (MU-10). One pull request, opened by the implementer.
   - _Witness_ for the workflow: the acceptance dispatch itself, and a dispatch on a file whose edit is stale, which must refuse before any leg runs a test.
2. **The documentation unit:** `RD-62`'s amendment above, after unit 1 is on `main`.

## Identifiers

For the main architect to mint:

- **One `RD`** for the runner and its workflow, with MU-1 to MU-12 as its properties, or as many as he keeps. It is minted when the owner has answered Q1 to Q3, because Q1 and Q2 change MU-1.
- **In unit 2:** `RD-62` properties 1, 4 and 5 are amended in place with their former text, as the trial's amendment was, or by a successor if he reads the change as substantive (`documentation.md` §6).

## Questions for the owner

1. **Private package now, published later? Recommended.**
   - (a) Private workspace package, published when its format has held through a few reviews. Its API is free to change until then (CONTRIBUTING §8).
   - (b) Published from the start. This adds a README, a `CHANGELOG` with semver from version one, the release workflow, and the first publish, which takes your token steps (`releasing.md`, _The first publish of a package_). Every change to the format after that is a version.
   - (c) A script in `.scripts/`, which has no scaffolding and moves when you want a package.
2. **Its name.** Proposed: `@ydinjs/mutate`, with the CLI `mutate`. Other names are fine. The scope matters only if it's published.
3. **Do implementers write their mutations as data too? Recommended: yes.** Their mutations are then rerunnable in the three engines with no copying, and the review's report lists both groups from files. This amends `RD-62` property 1 and `implementer.md` in unit 2. If not, only reviews use the format, and an implementer's runner stays free-form.

### The owner's answers, 2026-11-26

**Dated 2026-11-26 by the architect,** relayed by the coordinator: _"1) (a) 2) может, `@ydinjs/mutator`? 🤔 Как будто бы `mutate` не очень отражает суть 🤔 3) да"_ ("1) (a) 2) maybe `@ydinjs/mutator`? It feels like `mutate` doesn't quite say what it is 3) yes").

- **Q1: (a).** A private workspace package now, published when its format has held through a few reviews. MU-1 says so.
- **Q2: `@ydinjs/mutator`,** in `packages/mutator/`, and its CLI is `mutator`. Nothing stands against the name. `@ydinjs/mutator` isn't on npm (the registry answers 404). The unscoped `mutator` is a different package from 2014 with no `bin`, so it can't clash with the CLI. No workspace binary has the name. MU-1 and MU-8 use it, and the question's `@ydinjs/mutate` and `mutate` are kept above as they were asked.
- **Q3: yes.** An implementer writes the unit's mutations as a mutation file and runs it in Chromium. Unit 2 amends `RD-62` property 1 and `implementer.md` with properties 4 and 5.

## After the feature proof, 2026-11-26

**Dated 2026-11-26 by the architect: `RD-66` supersedes parts of MU-4 to MU-8 and MU-10,** on #301's [feature proof](../reviews/mutations-1/feature-proof-claude.md), findings `reviewer-1`, `reviewer-3` and `reviewer-4`. The sections above stay as they were written, and `RD-66` in [the index](../00-index.md) states what is in force:

- **MU-7:** a dispatched run reads the file from the ref that it is dispatched on, with the runner and the config, and `ref` is only the code under test.
- **MU-4 and MU-8:** `run` has no `--workdir`, and every run applies its mutations in a worktree that it creates, in CI too.
- **MU-5 and MU-6:** a row that ran unmutated and doesn't run with the mutation has no verdict, and _void_ covers it. The comparison counts only rows that have a verdict in each engine.
- **MU-10 step 3:** the dispatch runs on `main` with `ref: 9173a25a1`.