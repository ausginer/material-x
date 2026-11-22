# box-quad's 1.0.0 release pull request — feature proof and the readings before the tag

**Files were read at:** `fe0e52467` (`box-quad/release-1`, PR #121), in slot `b`. The pull request's head and `origin`'s branch were both `fe0e52467` when I read them. **Diff reviewed:** the merge base with `origin/main` to `fe0e52467`, and in it task 5's `e6bee2a9e`, the mutation `b88246b90` and its revert `758a8174a`.

**Governing records:** the [release plan](../../box-quad-release-1/box-quad-release-plan.md): [Reconciliation with `main` (2026-11-22)](../../box-quad-release-1/box-quad-release-plan.md#reconciliation-with-main-2026-11-22), [The release pull request](../../box-quad-release-1/box-quad-release-plan.md#the-release-pull-request) and its _What the reviewer reads before the tag_, and task 5 as amended. Also [`checks/implementation.txt`](../../box-quad-release-1/checks/implementation.txt), [`releasing.md`](../../../.agents/docs/releasing.md#one-release), `repo:RD-27` property 3, and the [release-workflow plan](../../release-workflow-1/release-workflow-plan.md#implementation) for O1 to O3.

**Lens:** feature proof, by a reviewer who didn't implement the pull request. Each claim below is my own reading or my own run. The transcript is [`checks/feature-proof-r2.txt`](checks/feature-proof-r2.txt). I only read GitHub: I dispatched nothing, tagged nothing and changed no setting. Nothing is repaired, and no record is amended.

**Verdict: the pull request meets the plan, and O1 to O3 are in place.** Two Tier C findings concern the record, and neither blocks the release. **This report's commit moves the pull request's head.** So the merge waits for one more check run, which `releasing.md` step 1 requires and which I didn't dispatch ([Before the merge](#before-the-merge)).

## Scope

**Covered.**

- **Task 5 against the plan as amended.**
  - `browserslist` 4.29.4 lists only the core set: `and_chr`, `and_ff`, `chrome`, `edge`, `firefox`, `ios_saf` and `safari`, with no downstream browser. The lowest versions are Chrome and Edge 130, Firefox 132, and Safari 18.2 on macOS and iOS. Android lists only today's versions, `and_chr` 156 and `and_ff` 158, as the reconciliation says.
  - baseline-browser-mapping 2.11.31's `getCompatibleVersions({ targetYear: 2024 })` gives `chrome_android` 130 and `firefox_android` 132, and the same desktop and iOS versions as `browserslist`.
  - The README's table equals these readings: the desktop and iOS versions are `browserslist`'s, and the Android versions are baseline-browser-mapping's.
  - **Build byte identity.** I built `index.js`, `index.js.map` and `index.d.ts` at `fe0e52467`, and again from a `git archive` of `7d0d36999`, the commit before the field. `cmp` finds them identical, and their sha256s equal the ones in the implementer's transcript.
  - **Pack.** `aube pack --dry-run` lists exactly `CHANGELOG.md`, `LICENSE`, `README.md`, `index.d.ts`, `index.js`, `index.js.map` and `package.json`, at `@ydinjs/box-quad@1.0.0`. The packed `package.json` has `"browserslist": ["baseline 2024"]`, and the tarball's sha256 is `d8c430e3…`.
  - `aube exec just release-check box-quad` exits 0, with the same shasum, integrity and sha256.
  - **The README against `RD-27` property 3.** The README says that box-quad 1.x supports Baseline 2024, and it names each core browser's lowest version. It also says that the floor stays for the whole 1.x line, and that only a new major version raises it. The field has no `with downstream`. The README has no record identifier, `oxfmt --check` is clean, and so is `git diff --check`.
- **The two runs.**
  - **The mutation run** [44998336728](https://github.com/ausginer/material-x/actions/runs/44998336728) has `headSha` `b88246b90`, and its conclusion is `failure`. `b88246b90` differs from its parent `e6bee2a9e` only by `"src/index.ts"` in box-quad's `files`. `prepare` failed at _Pack and check the tarball_ with `pack-excluded: src/index.ts`, and `dispatch` and `stage` were skipped. `758a8174a`'s tree equals `e6bee2a9e`'s.
  - **The head run** [44998449442](https://github.com/ausginer/material-x/actions/runs/44998449442) has `headSha` `fe0e52467`, and its conclusion is `success`. `prepare` passed, and `dispatch` and `stage` were skipped. Its summary names the dist-tag `latest`, the seven files, and the shasum `97d36a5b…`, integrity and sha256 of my local pack.
  - `verify` passed on the pull request at `fe0e52467` (run 44998551535).
- **The feature reading still holds.** `git diff 315a18ad1 HEAD -- packages/box-quad/src packages/box-quad/tsdown.config.ts` is empty.
- **O1, through the API.** The environment `npm` has `can_admins_bypass: false`, `custom_branch_policies: true` and `protected_branches: false`. Its only protection rule is the branch policy, so it has no required reviewer. `deployment-branch-policies` lists one policy, of type `branch`, named `main`.
- **O2.** The ruleset `Release tags` (id 27829590) is active, with target `tag`. It blocks `deletion`, `update` and `non_fast_forward`, has no bypass actor, and `current_user_can_bypass` is `never`. Its stored pattern is `refs/tags/@ydinjs/**/*`, and the records write `refs/tags/@ydinjs/**`. I confirmed that the two patterns cover the same tags, for this release. The two branch rulesets use the same form, `refs/heads/backup/**/*` and `refs/heads/proto/**/*`. When I asked GitHub which rules apply to `backup/x` and `proto/x`, names with no directory between, it returned those rulesets, and it returned none for `nomatch/x`. So `**/*` matches `@ydinjs/box-quad@1.0.0`. That reading uses the branch endpoint, because GitHub has no endpoint that does the same for tags. The extra `non_fast_forward` rule only narrows what can happen to a tag.
- **O3.** `NPM_STAGE_TOKEN` is a secret of the environment `npm`, created 2026-11-22 07:15:29 UTC. The repository's only secret is `CODECOV_TOKEN`.

**Not covered.** Tasks 1 to 4, which the [first feature proof](feature-proof-claude.md) reviewed and which this pull request doesn't change. The [baseline reading](../../box-quad-release-1/checks/baseline-reading.txt) itself, which is still valid because `src/` hasn't changed. The token's expiry, which the API doesn't show. Everything after the merge: the tag, the staged version and the registry reading.

## Findings

### The head run isn't in the tree (`reviewer-3`)

- **Tier:** C.
- **Claim:** the plan's proof 5 asks the record to hold both runs, with the head run's summary, and asks for a dated line in the release-workflow report that names both. Proof 4 says that a commit after the head run needs another check run. Together, the two proofs can't both hold.
- **Current state:** [`checks/implementation.txt`](../../box-quad-release-1/checks/implementation.txt) and the release-workflow report's line of 2026-11-22 name only the mutation run. The head run, 44998449442, is named only in the pull request's description, which isn't part of the tree. The implementer disclosed this in the plan's _Done 2026-11-22_ paragraph and in the transcript.
- **Why it matters:** the record that later releases reuse doesn't say how the plan is to be met. This report puts 44998449442's `headSha`, conclusion and summary in the tree. Because of proof 4, that commit then needs a run of its own ([Before the merge](#before-the-merge)). The release-workflow report's line still names the mutation run only.
- **Evidence:** the plan's _The release pull request_, proofs 4 and 5; `git diff 758a8174a fe0e52467`; the transcript's _The head run_.
- **Required property:** the plan says how to record a pre-merge check run that follows the last commit, and the release record and the release-workflow report agree with it. This is the plan's wording, so it goes to the architect.

### The ruleset's pattern is written differently in the records (`reviewer-4`)

- **Tier:** C.
- **Claim:** `Release tags` stores `refs/tags/@ydinjs/**/*`. [`releasing.md`](../../../.agents/docs/releasing.md), the release-workflow plan's O2 and the release plan write `refs/tags/@ydinjs/**`.
- **Why it matters:** the two patterns cover the same tags, as GitHub's own matcher showed in [Scope](#scope), so the setting isn't wrong. But a later reader who compares the API with the records finds a mismatch and has to repeat this reading to clear it.
- **Evidence:** `gh api repos/ausginer/material-x/rulesets/27829590`; the transcript's _O2_.
- **Required property:** the records and the stored setting agree, or the records say that the stored form is `**/*`. The setting belongs to the owner, and the wording belongs to the architect.

## Before the merge

This report is committed on `box-quad/release-1`, so the pull request's head moves off `fe0e52467`. [`releasing.md`](../../../.agents/docs/releasing.md#one-release) step 1 requires a check run that passes on the pull request's head, and the plan's proof 4 says that a commit after the head run needs another one. The commit changes only `.plan/`, which the pack excludes, so the tarball should stay `d8c430e3…`. That expectation isn't a run, though. **The owner may merge once `gh workflow run release.yml --ref box-quad/release-1 -f package=box-quad` passes with `headSha` equal to the new head, and `verify` passes on that head.** I don't dispatch it, because this pass is read-only on GitHub. After the merge, the owner may tag _M_ as [`releasing.md`](../../../.agents/docs/releasing.md#one-release) steps 2 to 4 describe, while _M_ is `main`'s head and before `NPM_STAGE_TOKEN` expires.