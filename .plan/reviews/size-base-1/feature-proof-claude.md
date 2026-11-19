# RF-65's repair, the merge base's stored size reading: feature proof

**Files were read at:** `910c5e4b3` (`repo/size-base-1`, pull request [#72](https://github.com/ausginer/material-x/pull/72)'s head), in detached scratch worktrees outside the slots. **Diff reviewed:** `f7dfee61f..0021a710e`, the repair. `910c5e4b3` adds only the implementer's witnesses and the plan's implementation note, and differs from `0021a710e` only under `.plan/`.

**Governing records:** the [base-reading plan](../../size-base-1/size-base-plan.md), [The repair, for (b) with the artifact](../../size-base-1/size-base-plan.md#the-repair-for-b-with-the-artifact), properties 1 to 7, and [How a reviewer proves it](../../size-base-1/size-base-plan.md#how-a-reviewer-proves-it), witnesses 1 to 6. `repo:RD-7` property 5, as amended on 2026-11-19, and `repo:RF-65`, with its dated amendment of that day, at `f7dfee61f` ([`00-index.md`](../../00-index.md)). `repo:RD-6` property 9 is relevant to `reviewer-1`.

**Lens:** feature proof. Each claim below is my own reading of the tree, of GitHub (read-only), or of a run in a scratch worktree, unless it says otherwise. My runs are saved in [`checks/feature-proof-witnesses.txt`](checks/feature-proof-witnesses.txt). I ran them one at a time, in three new trees, and ran no `nx reset`. Nothing is repaired, no record is amended, and nothing was written to GitHub.

**Verdict: the repair meets properties 1 to 7.** Witnesses 1 to 3 hold as I re-ran them, to the byte, with the implementer's sha256. Witness 6 is already observed before the merge, on #72's own CI run. Witnesses 4 and 5 are pending until the merge, and the implementer's statement of how they will be read matches the code. Two findings, both Tier C, and neither blocks the merge:

- **`reviewer-1`, Tier C, for the main slot's architect:** `RD-6` property 9 says only `scope` adds `actions: read`. After the repair, `measurements` adds it too, and no record amends property 9.
- **`reviewer-2`, Tier C:** a push run's and a manual run's job summary says that _"`main`'s run for the merge base stored no size reading"_. That run looks up no merge base, and on a push to `main` it is the run that stores the reading.

## Scope

**Covered.**

- **Property 1.** `packages/box-quad/project.json` and `packages/drag/project.json` each declare `"implicitDependencies": ["@ydinjs/vite-traits-plugin"]`. No other `project.json` gains a declaration.
- **Property 2.** `.scripts/size-reading.ts` runs one `aube exec -- nx run-many -t build --projects=box-quad,core,material-x,drag --skipNxCache` from the root, then reads. The project list and the read list are both `MEASURED`. The script keeps no list of prerequisites and no longer runs a package's `just build`. The short project names resolve as they do in the root `just size` recipe: my witness 1 builds and reads all four.
- **Property 3.** `nx.json`'s `targetDefaults` has `"size": { "dependsOn": ["^build"] }`, and material-x's `project.json` has no `targets`. The root `just size` exits 0 in my witness-1 tree. Witness 3's second graph shows each `size` task depending on its package's prerequisite builds.
- **Property 4.** On `push`, _Store the reading_ uploads `${{ runner.temp }}/head-size.json` as the artifact `size-reading` and sets no `retention-days`. The repository's retention is 90 days (`artifact-and-log-retention`: `{"days":90,"maximum_allowed_days":90}`). The pin `cf430e03…` is `upload-artifact`'s tag `v7.0.2`, the same pin as `baselines.yml`. At that commit `archive` defaults to `true`, so the artifact is a zip with `head-size.json` at its root. `verify.yml` runs on `push` only for `main` (`on.push.branches: [main]`), so only `main` stores readings.
- **Property 5.** _Sizes at the merge base_ computes the merge base as before. It then queries `verify.yml`'s runs with `event=push&branch=main&head_sha=<merge base>` and runs `gh run download <run> --name size-reading --dir "$RUNNER_TEMP/base-reading"`. It adds no `git worktree`, no `aube ci` and no build. The job's `permissions` add `actions: read`, and the step's `GH_TOKEN` is `github.token`. _Report_ reads `--base "$RUNNER_TEMP/base-reading/head-size.json"`, which is where a downloaded `head-size.json` lands.
- **Property 6.** No run, no artifact, or a download that fails all take the `else` branch, which logs the notice and leaves no file. `size-report.ts`'s `readJSON` returns `null` for a missing file, and the report then prints _"**No base reading:** `main`'s run for the merge base stored no size reading, so only the head is reported."_ The job still succeeds: on #72's run 44451082302, `measurements` succeeded down that path. The new sentence replaces _"the merge base gave no machine-readable reading"_.
- **Property 7.** _Sizes at the head_, _Comment_, the marker, the fork condition and every size configuration are unchanged. The diff touches none of them.
- **Witness 1.** At `910c5e4b3`, after `aube ci` only, `aube exec just size-reading` exits 0 with 33 rows (`box-quad` 1, `core` 3, `material-x` 19, `drag` 10), sha256 `67cc657e…751ea52`, the implementer's. At `f7dfee61f`, the same commands exit 1 at `box-quad`'s `just build` with _"Cannot find module '…/node_modules/@ydinjs/vite-traits-plugin/index.js' imported from …/.scripts/tsdown-library.ts"_. PR #72's comment also lists 33 rows.
- **Witness 2.** In the witness-1 tree, after `nx run-many -t build --all --skipNxCache`, a second reading is byte-identical to witness 1's.
- **Witness 3.** In a third tree, after `aube ci` only, both graphs match the implementer's edge for edge. With `box-quad`'s declaration removed, `box-quad:build` loses its edge to `vite-traits-plugin:build`, and `drag:build` keeps its own. The restore left `git status` clean. The graphs built nothing: the plugin's `index.js` was still absent after both reads.
- **The tests.** The changed assertion in `.scripts/size-report.node.test.ts` checks the new sentence. The file passes, 13 of 13. The lookup is shell in the workflow and has no unit test. Its witnesses are the hand lookup and #72's run.
- **The implementer's three points,** weighed under [The implementer's points](#the-implementers-points).
- **Witnesses 4 to 6 as the implementer states them** ([witness 6 by hand](../../size-base-1/checks/witness-6-lookup.txt)), under [Witnesses 4 to 6](#witnesses-4-to-6).

**Not covered.**

- A fork's pull request. None has been opened, so a read-only token's `actions: read` and download are not observed.
- An expired artifact. gh's _"no valid artifacts found"_ path is observed only on runs that never had a `size-reading` artifact.
- A re-run of `measurements` on a `main` push run, where `upload-artifact`'s `overwrite: false` meets an earlier attempt's artifact. I didn't establish what GitHub does there. `measurements` has `continue-on-error`, so a failed upload can't fail the run.
- `just test`, typecheck and lint on the changed files. #72's run 44451082302 passed `static`, `chromium`, `firefox`, `webkit` and `docs` at this head. I didn't repeat them locally.

## Findings

### `RD-6` property 9 no longer describes the workflow's permissions

- **`reviewer-1`, Tier C.** Routed to the main slot's architect. The record needs an amendment, and the workflow is as the plan asks.
- **Current behavior.** `measurements` declares `contents: read`, `pull-requests: write` and `actions: read` (`verify.yml`). `RD-6` property 9 says: _"Only the measurement job adds `pull-requests: write` (`RD-7`), only `scope` adds `actions: read` (`RD-15`), …"_ ([`00-index.md`](../../00-index.md), `RD-6`).
- **Why it is a problem.** The record of the token's permissions is false at this head. When `RD-15` gave `scope` `actions: read`, that was recorded as an amendment of property 9, with the old text kept (_"Property 9 named no `actions: read`"_). `RD-7`'s amendment of 2026-11-19 lists what changes: _"property 5's base reading and the last bullet of **Why**"_. It doesn't name `RD-6`. The plan's property 5 requires the permission, but its [Proposed record changes](../../size-base-1/size-base-plan.md#proposed-record-changes) don't name property 9.
- **Evidence.** `git show 910c5e4b3:.github/workflows/verify.yml`, the `measurements` job's `permissions`. `git show 910c5e4b3:.plan/00-index.md`, `RD-6` property 9 and its _"What it said before"_ notes.
- **Required property.** `RD-6` property 9 lists every job that adds a permission, as the workflow declares it.
- **Tier C, not B:** no run behaves differently, and nothing reads property 9 at run time. A reader who audits the token's scope from the record misses one grant.

### A run that seeks no base says that `main`'s run stored none

- **`reviewer-2`, Tier C.** This is the implementer's point 1.
- **Current behavior.** _Report_ passes `--base "$RUNNER_TEMP/base-reading/head-size.json"` on every event. On `push` and `workflow_dispatch`, _Sizes at the merge base_ is skipped, so the file never exists. The job summary then opens with _"**No base reading:** `main`'s run for the merge base stored no size reading, so only the head is reported."_ On a push to `main`, the step before stores that run's own reading. The plan's implementation note records this as intended: _"A push run's summary says the same, because a push has no base reading either."_
- **Why it is a problem.** The sentence describes a lookup that the run didn't make, and on `main` it says the opposite of what the run did. `RD-7` property 5 ties the statement to a merge base: _"A merge base for which no reading is stored gives "no base reading", the report says that none is stored"_. On a push or a manual run, property 5 sends the report to the job summary and names no base. Witness 4 compares the artifact with this summary, so a witness reader sees the sentence next to the stored reading.
- **Pre-existing in kind.** Before the repair, the same summary said _"the merge base gave no machine-readable reading"_ on push runs, where no merge base was read either. The repair made the sentence more specific, and so more plainly false.
- **Evidence.** `verify.yml` at `910c5e4b3`: _Store the reading_ (`if: github.event_name == 'push'`), _Sizes at the merge base_ (`if: github.event_name == 'pull_request'`), and _Report_ (no condition). `renderSizeReport` chooses the sentence only from `base` being `null`, and the CLI has no other input that tells a missing reading from a lookup that wasn't made. Not observed on a push run, because no push run has the repair yet. Witness 4's run will show it.
- **Required property.** The report states that `main`'s run stored no reading only in a run that looked one up.
- **Tier C:** the summary is read by people, nothing parses the sentence, and the comment on a pull request is correct.

## The implementer's points

1. **The no-base sentence in a push run's summary.** A finding: `reviewer-2`.
2. **_"The lookup takes `verify.yml` push runs on `main`, so a pull request into another branch always shows 'No base reading'."_** Not a finding, and _"always"_ is too strong.
   - The `branch=main` filter excludes no reading: `verify.yml` runs on `push` only for `main`, and only a push uploads.
   - A pull request into branch `X` gets a base when its merge base with `origin/X` is a `main` commit whose push run stored a reading, as when `X` has no commits of its own after `main`. The lookup then finds that reading.
   - Otherwise the merge base is a commit of `X`, no push run exists for it, and "No base reading" is what `RD-7`'s amendment accepts: _"and when the merge base isn't a `main` commit"_.
   - Three of the repository's 45 pull requests targeted a branch other than `main` (`gh pr list --state all --limit 100` returns 45).
3. **`size-reading.ts` reads its four packages concurrently.** Not a finding.
   - Property 2 leaves the code to the implementer, and the plan's implementation note records the choice.
   - The instruments share no path. `size-limit-preset-rolldown` bundles each check into its own `mkdtemp` directory. `drag`'s `bench/size/measure.ts` uses its own `mkdtemp`. material-x's `.size-limit.ts` writes `complete.js` under material-x's own `node_modules/.cache/size-limit/`.
   - The removed comment, _"After `core`, because material-x's graph reads core's built output"_, was about a build inside the read. All builds now finish in the nx run before any read starts.
   - In the witness-1 tree, `f7dfee61f`'s sequential reader, copied in as a scratch file and run, gives a reading byte-identical to the concurrent one.
   - A failing instrument still fails the script. `Promise.all` reports the first failure in time, not in list order.

## Witnesses 4 to 6

The implementer's statement in [`witness-6-lookup.txt`](../../size-base-1/checks/witness-6-lookup.txt) matches the code, with these readings:

- **4.** _"The run lists an artifact `size-reading` holding `head-size.json`"_: yes, a zip with that one file at its root. Its job summary will carry `reviewer-2`'s sentence above the table that the artifact must match. #72's title carries no `[noci]`, and the merge changes the workflow and a script, so the first push run after the merge should be full. `scope` decides that, and I didn't run it.
- **5.** _"That commit or later"_ holds only for a later `main` commit whose push run was full. A run that `RD-15` reduces runs no `measurements` and stores nothing. In `main`'s last 12 push runs, `measurements` ran in every one, so none was reduced.
- **6.** **Already observed before the merge, on #72's own run** 44451082302 at `910c5e4b3`. The merge base is `91fc5d662`, `main`'s tip, whose push run 44448397868 has no `size-reading` artifact. The step logs _"no artifact matches any of the names or patterns provided"_ and the notice _"main's run for the merge base 91fc5d66201b052c5a1c88271102fda17fea75a2 stored no size reading"_. The comment opens with the new sentence and lists 33 rows, and `measurements` succeeded. That is the plan's witness 6 for the case of a run without an artifact. The plan's _"can only be observed after the merge"_ is too strong for 6. My hand lookups on `91fc5d662`, `bc7fe07d6` and `275ad0f5c` take the same branch.

## Observation, not a finding

**A failed lookup is reported as a missing reading.** `gh api … || run=""` and a failing `gh run download` both reach the `else` branch, so an API error, a rate limit or a missing permission gives the same notice and comment as a run that stored nothing. gh's own error stays in the step log. The plan's [Not adopted](../../size-base-1/size-base-plan.md#not-adopted) drops _"naming an instrument's failure"_ for the reading script on the same grounds, so I don't report it as a defect. If the lookup failed on every run, though, every comment would show "No base reading" as an expected absence. That is how `RF-65` went unnoticed. Witness 5 is the one observation that would catch it. The architect decides whether the plan's choice also covers the lookup.