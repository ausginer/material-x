# Feature proof: the release workflow (`RD-27`), PR #81

**Read at** `e73411cf4` on `repo/release-workflow-1`, against the [release workflow plan](../../release-workflow-1/release-workflow-plan.md) and `RD-27` in the [register](../../00-index.md). Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-20. The probes are in [`checks/release-workflow-probes.txt`](checks/release-workflow-probes.txt).

**Scope:**

- **Covered:** tasks 1 to 3 against the plan, the five claims of the implementer's [report](../../release-workflow-1/release-workflow-report.md), the four readings it makes where the plan is silent, and the workflow's security posture against a writer to a branch and against a forked pull request.
- **Not run:** the dispatched check run, the mutation dispatch and the first-release witnesses. They come after merge, and agents push no tag. The mutation dispatch was run locally instead, as `just release-check`, which shares the same code (probe 6).
- **Not readable from here:** npmjs.com's _Staged Packages_ page, which needs the owner's login, and the owner's settings O1 to O3, which don't exist yet.

**Verdict:** the checks, the pins, the permissions and npm's flags are as claimed, except one claim (the equivalent mutation). **One finding blocks the merge:** `reviewer-1`, a failed stage that leaves the run green. **Two block the first tag but not the merge,** because they need the architect's call: `reviewer-2` and `reviewer-3`, on what the owner checks before he approves.

**Superseded at `30175e027`** by the [re-review](#re-review-at-30175e027) below: `reviewer-1`, `reviewer-4` and `reviewer-5` are fixed, and `reviewer-2` and `reviewer-3` are resolved by `RD-27`'s amendment. Nothing blocks there.

## Findings

### reviewer-1 — Tier B, blocks the merge: a failed `npm stage publish` leaves the `stage` job green, with a summary that says the package was staged

- **Current behavior:**
  - `release.yml:150` runs `npm stage publish … | tee "$RUNNER_TEMP/stage.txt"`.
  - The workflow sets no `shell`, so the step runs under `bash -e {0}`. Only `shell: bash` adds `-o pipefail` (GitHub's workflow syntax, `jobs.<job_id>.steps[*].shell`).
  - So the pipeline's status is `tee`'s, which is 0 whatever npm returns.
  - The step then goes on to write _"**Staged** `<tarball>` under `<dist-tag>`, with the stage id `not reported`"_ to the summary, and the job concludes `success`.
- **Why it is a problem:**
  - The run is the owner's signal that a stage exists.
  - Plan question 2 depends on it: _"If npm refuses a stage-only token for a new name, the first run shows it"_, and the fallback (staging it himself) starts from that.
  - With this defect, a refused token, a duplicate version or a failed OIDC exchange appears as a green run and a summary that says the package was staged.
- **Evidence:**
  - Probe 9 runs the step's lines with `false` in place of npm. Under `bash -e` it prints _"Staged, with the stage id not reported"_ and exits 0. Under `bash --noprofile --norc -eo pipefail` it exits 1.
  - Repository precedent: `safari.yml:90` sets `set -o pipefail` before its `| tee`.
  - The pack step's pipeline, `release.yml:100` (`aube pack … | jq`), has the same shape. There a failed pack still fails the job, because `jq` on empty input prints nothing (probe 9), and `release-check.ts package --tarball ""` throws its usage error. The job fails for the wrong stated reason, not silently.
- **Required property:** the `stage` job fails when `npm stage publish` fails, and its summary says _staged_ only after a stage that npm reported.

### reviewer-2 — Tier B, blocks the first tag, routed to the architect: the owner is told to match a sha256 that npm doesn't show

- **Current behavior:**
  - `releasing.md:29` (_"The file list and the sha256 must match the summary of the run's `prepare` job"_) and the plan's owner step 4 tell the owner to match a sha256 on npmjs.com.
  - The plan's task 2 witness says _"the summary's sha256 equals the approved tarball's `shasum`"_.
  - npm 11.21.2 computes a tarball's digests with `ssri` over `sha1` and `sha512` only (`lib/utils/tar.js:75-100`). Its log prints `shasum`, which is a SHA-1 hex digest, and `integrity`, a SHA-512.
  - The registry's `dist.shasum` is the same SHA-1. Nothing in the CLI computes a sha256.
- **Why it is a problem:**
  - The comparison that the owner's approval rests on has no counterpart on npm's side, as far as the CLI shows. The page itself couldn't be read from here.
  - The task 2 witness compares two different algorithms, so it can't hold as written.
- **Evidence:** probe 10, and `release-check.ts:791-794` and `:852-854`, which write only a sha256.
- **Required property:** the digest that the run records, and the one that the owner and the witness compare it with, are one algorithm that npm shows for a staged version, or the procedure states how the owner obtains it. Which digest, and through which command or page, is the architect's call, because it changes the plan's owner steps and task 2's witness.

### reviewer-3 — Tier B, blocks the first tag, routed to the architect: the owner's review can't tell a stage from a tag off `main` from his own release

- **Current behavior:**
  - The commit checks, _reachable from `origin/main`_ and _`verify` passed_, run inside the workflow file of the tagged commit.
  - Anyone who can push a tag can tag a commit off `main` whose `release.yml` omits those checks. The ruleset leaves creation open by design, and agents act through the owner's account.
  - The tag matches the environment `npm`'s deployment rule. The OIDC token then carries the environment `npm` and the workflow `release.yml`, which is all that the trusted publisher names, so the stage succeeds.
  - While the first publish's secret exists, that run can also read `NPM_STAGE_TOKEN`.
  - The owner's step 4 compares the staged tarball with _"the summary of the run's `prepare` job"_, and that run writes its own summary.
- **Why it is a problem:**
  - The plan accepts that _"a compromised workflow can at most stage a version that the owner rejects"_. That holds only if the owner's review, before he approves, can see that the run came from a tag on `main`.
  - `releasing.md` and the plan don't say to check the run's commit, or the provenance's source commit, before approving.
  - The provenance reading is step 6, after approval.
- **Evidence:**
  - `release.yml:59-72`: the commit checks are steps of the same file.
  - `release.yml:114,117`: the `if` and the environment.
  - The plan's _Protections_: the ruleset leaves creation alone, and the trusted publisher names the repository, `release.yml` and `npm`.
- **Required property:** before approving, the owner's procedure establishes that the staged version came from a run on a tag of a `main` commit. That needs either a check that doesn't run in the tagged commit's own workflow file, or a step the owner performs on GitHub or on the attestation. Which one is a design call.

### reviewer-4 — Tier C: the report's equivalent mutation isn't equivalent

- **Claim:** the report says that `<= 0` → `< 0` in the `latest` comparison (`release-check.ts:446`) survives because _"a version equal to the registry's `latest` is in the registry's version index, so `registry-version` refuses it first"_.
- **Evidence:**
  - `SEMVER` accepts build metadata, and `compareVersions` ignores it.
  - With the registry's `latest` at `1.0.0`, the head refuses `1.0.0+build.1` under `latest`, and the mutant passes it (probe 3).
  - The 35 tests pass on the mutant (probe 2).
- **Consequence:** small. npm normalizes the version and would refuse the duplicate at the stage, but the claim and the suite's coverage of that boundary are not as reported.
- **Required property:** the record says the mutant survives a reachable input. Either a fixture distinguishes it, or the report states why that input doesn't matter.

### reviewer-5 — Tier C: `RD-27` still says its tasks are unimplemented

- **Current behavior:** `.plan/00-index.md:1459` says _"**Unimplemented:** the plan's tasks 1 to 3, and the owner's settings O1 to O3"_. At `e73411cf4` the code for tasks 1 to 3 is on the branch, with its report, and only the after-merge proofs and O1 to O3 remain.
- **Required property:** the entry's status names what is implemented, at which commit, and what remains, as `RD-21`'s does.

## The implementer's claims

1. **`release-check.ts` and its 35 tests: holds, except the fourth mutation** (`reviewer-4`).
   - 35 pass (probe 1).
   - Every check in task 1's list has a fixture whose `toEqual` names that check and no other. The extra fixtures cover `tag`, `repository-directory` and `access`.
   - box-quad's intended pack passes, both as data and as a tarball.
   - The registry and the Actions API are injected.
   - `checkCommit` runs `git` on a temporary repository with a real `refs/remotes/origin/main`.
   - The consumer check runs `aube install --ignore-scripts` and the root's `tsc` with `npm_config_registry` at `127.0.0.1:9`.
   - I repeated three mutations and each was caught (probe 2).
   - The Actions query that `checkCommit` builds returns `main`'s `verify` push run on the real API, and nothing for a commit off `main` (probe 8).
2. **`just release-check box-quad`: holds.**
   - As on the branch, it fails on exactly `access`, `pack-excluded`, `pack-files`, `pack-required`, `repository-directory` and `repository-url`, with the same counts (probe 4).
   - With box-quad's property 1 applied, it passes. It packs the seven files and type-checks the consumer (probe 5). The sha256 differs from the implementer's because the one-line README differs.
   - The local mutation (`src/index.ts` in `files`) fails on `pack-excluded` alone (probe 6).
3. **`release.yml`: holds, read line by line.**
   - **Permissions:** `permissions: {}` at the top. `prepare` has `contents: read` and `actions: read`. `stage` has `id-token: write` and `actions: read`, with `environment: npm`, and runs only on `push`, whose only trigger here is the tag filter `@ydinjs/*@*`.
   - **Pins:** each SHA resolves to its stated tag through the GitHub API, and each is that action's latest release (probe 7). `download-artifact` v8.0.2 is new to the repository.
   - **Concurrency and cache:** concurrency is `release-${{ github.ref }}`, never cancelled. No cache: there is no `actions/cache`, nx runs with `--skipNxCache` and has no cloud setting, and setup-node v7.1.0's automatic cache applies only when `packageManager` names npm (its `action.yml`), while the root names `aube@2.10.0`.
   - **Not checked:** actionlint wasn't run. The defect it would most likely have reported is `reviewer-1`'s shell.
4. **npm's flags: hold** (probe 10).
   - `npm stage publish` is `Publish` with its params, so it takes `--tag`, `--access` and `--provenance`, and accepts a tarball spec, which runs no lifecycle scripts.
   - Its output is `+ <id> (staged with id <id>)`, and the job's `sed` reads that, falling back to _"not reported"_ for `(staged)`.
   - OIDC is tried first in a GitHub run with an id-token permission. Every failure keeps the configured token.
   - `npm trust github` takes `--file`, `--repo`, `--env` and `--allow-stage-publish`.
   - 11.21.2 is the newest 11.x older than 7 days. 11.21.3 was published on 2026-11-19.
5. **`releasing.md` and the `AGENTS.md` line: hold, apart from `reviewer-2` and `reviewer-3`.**
   - Every link and anchor resolves. `oxfmt --check` and `git diff --check` are clean.
   - It matches `RD-27` and the answers recorded at `e76b9badc`: no required reviewer, the token as the secret `NPM_STAGE_TOKEN` and its fallback, the `RD-16` exception, the 2FA settings, and the trusted publisher for stage only.
   - Its statements that tags can't move and that `npm` admits only tags describe O1 and O2, which don't exist yet. The section _The owner's settings_ names them.

## Rulings on the readings where the plan is silent

- **A check run runs the registry checks and skips only the commit checks: accepted.**
  - It is what the owner's step 1 needs, a release pull request's version read against the registry before its tag.
  - One consequence to know: once a package's manifest version is on the registry, a check run of that package fails at `registry-version`, before the pack checks run. So the plan's _"how the workflow itself is exercised"_ only works while the manifest's version is unpublished.
  - For box-quad, the mutation dispatch must be repeated before 1.0.0 is approved. The plan already orders it before the first tag.
- **Step 4 runs the `size` script, and a row with no limit passes: accepted as a reading of step 4's text, which refuses a row _over_ its ceiling.**
  - `RD-27` property 2 also says that at a first release _each_ row gets a ceiling.
  - Under this reading, that is enforced by review alone, and box-quad today has one row with no limit. A package with no `size` script passes too.
  - Whether the release should also refuse a row without a ceiling is the architect's question, not a defect here.
- **The local recipe doesn't run `aube ci`: accepted.** `RD-16` property 12, and `releasing.md:79` says so.
- **`aube pack --ignore-scripts`: accepted.**
  - It matches the plan's _Not adopted_ on `prepack`.
  - `npm stage publish` of a tarball runs no scripts either (`publish.js:100,223`), so nothing between the check and the stage builds anything.

## Security posture

- **A forked pull request** triggers nothing: the workflow has no `pull_request` or `pull_request_target` trigger.
- **A writer who dispatches on a branch:**
  - The run uses the branch's file. Its `stage` job is skipped by the `if`.
  - A modified file can't obtain the environment `npm`, because O1 admits only tags. Without the environment, an OIDC token fails the trusted publisher's environment claim, once O3 configures `--env npm`.
  - It reaches nothing that a branch push couldn't already.
- **A writer who pushes a tag** can stage. During the first publish's window, they can also read the stage-only token, which can stage any `@ydinjs` name for a day and publish `0.0.0-stage` placeholders. The gate is the owner's approval, and `reviewer-3` is the gap in what he checks before it.
- **Expressions:** no `${{ }}` is interpolated into a shell line. The tag, the input, the name, the directory and the outputs all reach `run:` through `env`, and `working-directory` isn't a shell.
- **Outputs:** values written to `GITHUB_OUTPUT` come from a git ref, which can't hold a newline, and from workspace paths.
- **Tokens in `prepare`:**
  - `GH_TOKEN` is set only on the release step, which runs before `aube ci`.
  - The checkout doesn't persist credentials, so install scripts see neither token.
  - The Actions runtime token is available to every step, as in any job.
- **The `stage` job** runs no repository code. It runs only setup-node, download-artifact and npm from the registry. The npm install is version-pinned, not integrity-pinned, like `verify`'s aube bootstrap.

## Re-review at `30175e027`

**Read at** `30175e027` on `repo/release-workflow-1`, on the coordinator's task of 2026-11-20. It covers:

- the implementer's fixes of `reviewer-1`, `reviewer-4` and `reviewer-5` (`a134e84fc`);
- the architect's decision on `reviewer-2` and `reviewer-3`: `RD-27`'s amendment, and the plan's [_Amendment: a release runs on `main`_](../../release-workflow-1/release-workflow-plan.md#amendment-a-release-runs-on-main) (`7ef9bcc57`, merged in `521d5d171`);
- the owner's answers (`644bbf1ed`);
- task 4 (`30175e027`).

The probes are items 11 to 17 of [`checks/release-workflow-probes.txt`](checks/release-workflow-probes.txt). The findings above stay as written at `e73411cf4`.

**Not run:** the dispatch proofs and the first-release witnesses, which come after the merge, and actionlint, which still isn't available.

**Pending:**

- **The O1 reading,** before the first tag: `gh api repos/ausginer/material-x/environments/npm` and its `deployment-branch-policies`. The owner hasn't created the environment.

**Verdict: nothing blocks.**

- `reviewer-1`, `reviewer-4` and `reviewer-5` are fixed.
- `reviewer-2` and `reviewer-3` are resolved by the amendment and implemented as it specifies, provided O1 is set as stated. Two new Tier C findings follow.

### What the earlier findings came to

- **`reviewer-1`, fixed.**
  - `defaults.run.shell: bash` (`release.yml:43-45`) gives every step `bash --noprofile --norc -eo pipefail`, so a failed `npm stage publish` or `aube pack` fails its step.
  - The implementer's [`pipefail-probe.txt`](../../release-workflow-1/checks/pipefail-probe.txt) agrees with this record's probe 9.
  - The new `2>&1 | tee` keeps pipefail's effect, and the implementer's [`task4-stage-probe.txt`](../../release-workflow-1/checks/task4-stage-probe.txt) shows the refused case exiting 1 with an empty summary.
- **`reviewer-4`, fixed.** The `1.0.0+build.1` fixture expects `latest`, and the `<` mutant now fails exactly one test (probe 12).
- **`reviewer-5`, fixed, with `reviewer-6` below.**
- **`reviewer-2`, resolved.**
  - The owner now compares the stage id and npm's `shasum`.
  - `release-check.ts`'s `tarballDigests` computes `shasum` (SHA-1, hex) and `integrity` (`sha512-` and base64) from the tarball's bytes. The fixture's constants equal `sha1sum`, `openssl dgst -sha512 -binary | base64` and `sha256sum` (probe 13).
  - npm computes the same two from the same bytes for a tarball spec (probe 10), so the summary's `shasum` is the one npm records.
  - `npm stage view <stage-id>` prints the id and the `shasum` (probe 14). npm's staged-publishing page tells the reviewer to check _"SHASUMs"_, but doesn't list the stage id among what _Staged Packages_ shows (probe 15). So the stage id is confirmed through `npm stage view`, which `releasing.md:34` offers beside the page.
  - The `stage` summary carries the stage id, the `shasum`, the tag, the commit and the transparency log's link. npm prints the link as a notice on stderr (probe 14), which `2>&1` captures.
- **`reviewer-3`, resolved, given O1.**
  - A tag push runs only `dispatch` (`release.yml:60-74`). It has `actions: write`, no checkout, and the tag through `env`.
  - `prepare` and `stage` run only on `workflow_dispatch` (`:77`, `:153`).
  - The release run's `checkCommit` requires `refs/heads/main`, a tag whose `^{commit}` equals `GITHUB_SHA`, and `verify`'s success on that commit. Each has a fixture that fails with only its check's name, and each was mutated and caught (probe 12).

### The rulings asked for

- **Does a `workflow_dispatch` made with the `GITHUB_TOKEN` create a run? Yes.** GitHub's `GITHUB_TOKEN` page: _"`workflow_dispatch` and `repository_dispatch` events always create workflow runs"_ (probe 15). `dispatch` grants `actions: write`, which the dispatch endpoint needs. The dispatched file must exist on the default branch, which it does once #81 merges.
- **Is the environment's branch rule matched against the dispatched run's ref? Yes.**
  - _"The deployment branch or tag rule is matched against the `GITHUB_REF` of the workflow run."_ For `workflow_dispatch`, `GITHUB_REF` is the _"Branch or tag that received dispatch"_, and `GITHUB_SHA` is its last commit (probe 15).
  - A run dispatched on `main` therefore has `refs/heads/main`.
  - The architect's reading holds. The rule must be a branch pattern, because _"Name patterns must be configured for branches or tags individually"_ (`reviewer-7`).
- **Can a writer still stage anything?**
  - **A branch dispatch with `tag` set: no.**
    - With `main`'s file, it fails at `ref`, and `stage`'s `if` is false.
    - With a modified file on the branch, the run's ref is `refs/heads/<branch>`, so the environment `npm` refuses the job. Its secret is then unavailable (_"only available to workflow jobs that reference the environment"_).
    - A job without the environment gets an OIDC token without the environment claim, which the trusted publisher names (O3, `--env npm`).
    - A dispatch on a tag ref, or a tag push of a commit off `main`, is refused the same way.
  - **A tag at `main`'s head, pushed by a writer, or a direct dispatch on `main` with such a tag: yes, and only `main`'s head.**
    - `main`'s own file runs every check, and stages the reviewed commit's build.
    - That is the same bytes the owner would release, at a time he didn't choose. He rejects it, and for a new name the `0.0.0-stage` placeholder appears.
    - The amendment's item 1 accepts this: only `main`'s reviewed code can stage, and the owner's approval stays the gate. This is not a finding.
  - **Racing a merge: fails closed.**
    - If `main` moves between the tag push and the dispatch, the dispatched run's `GITHUB_SHA` is the new head, and `tag-commit` refuses.
    - Once the run has started, checkout builds `GITHUB_SHA` (`actions/checkout`'s default for the event's ref), so a later merge changes nothing.
    - A re-run of a failed job keeps the original `GITHUB_SHA`, so it builds the tagged commit, which is on `main`.
- **Do the owner's approval steps match what the summaries and npm show? Yes,** with one limit and one wording note.
  - `releasing.md:32-36` (step 4) asks for:
    - the run's branch `main` and its success, which GitHub shows;
    - the tag and _M_, which the `stage` summary gives (`release.yml:203-204`);
    - the stage id and `shasum` against _Staged Packages_ or `npm stage view`. The summary gives both, and `npm stage view` prints both (probe 14).
  - **The limit:** whether the web page shows the stage id couldn't be read here, because it needs the owner's login, and npm's page doesn't list it.

### Findings

#### reviewer-6 — Tier C: `RD-27`'s status line still lists the architect's decisions as pending

- **Current behavior:** `.plan/00-index.md:1459` ends _"**Still pending:** … and the architect's decisions on the feature proof's `reviewer-2` and `reviewer-3`"_. The amendment block in the same entry records those decisions, and task 4 implements them.
- **Required property:** the status line names only what remains: the dispatch proofs, the first-release witnesses, and O1 to O3.

#### reviewer-7 — Tier C: the dispatch names `main` by its short name, and O1's reading must confirm a branch-type policy

- **Current behavior:**
  - `release.yml:73` runs `gh workflow run release.yml --ref main`.
  - The release tag ruleset covers only `refs/tags/@ydinjs/**`, so a writer can create a tag named `main`.
  - GitHub's documentation doesn't say how a dispatch resolves a short ref that names both a branch and a tag (probe 15), and this can't be tested without dispatching.
- **Consequence if it resolves to the tag:** the release runs that tag's file with `GITHUB_REF` `refs/tags/main`. A branch-type deployment policy `main` refuses the job, so the worst outcome is a release that fails, not a stage.
- **Required property:**
  - The dispatch names the branch unambiguously, or the record states why the ambiguity is harmless.
  - The O1 reading before the first tag confirms that the one deployment policy has `type` `branch` and `name` `main`, and that `can_admins_bypass` is `false`.

### Also checked

- **Permissions:**
  - `permissions: {}` at the top;
  - `dispatch`: `actions: write`;
  - `prepare`: `contents: read` and `actions: read`;
  - `stage`: `id-token: write` and `actions: read`, with `environment: npm`.
- **Conditions:** `dispatch` runs on `push`. `prepare` runs on `workflow_dispatch`. `stage` runs on `workflow_dispatch` with `inputs.tag != ''` and `github.ref == 'refs/heads/main'`. It `needs` `prepare`, so a skipped `prepare` skips it.
- **Pins:** unchanged since probe 7. No new `uses:`.
- **Expressions:** every `${{ }}` that reaches a shell line goes through `env`.
- **Concurrency:** a dispatched run's group is `release-<tag>` or `release-<package>`. A tag push's group is `release-dispatch-<tag>`, so the dispatched run never waits behind the run that dispatched it. Nothing is cancelled.
- **Inputs:**
  - `checkInputs` refuses both inputs and neither, before any other check.
  - The tag reaches `git rev-parse` only after `readTagRelease`'s `^@ydinjs/…@<semver>` match, so it can't be an option.
- **Other workflows:** none names the environment `npm`. `verify.yml`'s `deploy` uses `github-pages` (probe 16).
- **`releasing.md`:** its anchors resolve. `just fmt-check` and `git diff --check` are clean (probe 17).
- **Not checked:** the tag ruleset (O2) and the trusted publisher (O3), which the owner hasn't created yet.