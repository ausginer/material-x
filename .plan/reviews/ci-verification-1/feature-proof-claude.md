# CI verification, first unit — feature proof

**Commit files were read at:** `397e4ec14c2bfea569f2557527efd4b1cdbb0ea4` (`ci/verification`, read in a detached worktree; the tree was clean). **Diff reviewed:** `a8726c57d` (exclusive) → `397e4ec14` (inclusive), 51 commits.

**Governing records:** [`ci-verification-handoff.md`](../../ci-verification-1/ci-verification-handoff.md) §After the report at `316d2e839`: one review before merge, the list "What must hold", properties 1 to 7; [`ci-verification-design.md`](../../ci-verification-1/ci-verification-design.md); [`ci-verification-report.md`](../../ci-verification-1/ci-verification-report.md); `repo:RD-6` to `RD-13` and `repo:RF-33` to `RF-37` in [`00-index.md`](../../00-index.md); `drag:DRF-48` to `DRF-51` in [`packages/drag/.plan/00-index.md`](../../../packages/drag/.plan/00-index.md).

**Lens:** feature proof. Each of the seven properties is read against the diff and the tree. Nothing is repaired.

## Scope

**Covered.**

- `.github/workflows/verify.yml` and `.github/workflows/baselines.yml`, line by line, against `RD-6`, `RD-7` and `RD-13`.
- Every change under `packages/*/src/`: the nine TypeScript files and the five CSS files. The CSS files were compared with all whitespace removed.
- `packages/drag/tests/support/commands.node.ts`, `.scripts/safari-window.ts`, and the engine selection, providers and visual switch in `.scripts/vitest-config.ts`. Playwright 1.65.0's `mouse.move` and WebdriverIO's `Key` table were read in the installed packages.
- Every engine condition and every `fails`, `skipIf` and `runIf` marking in the test tree. Each was checked against its finding and against the report's and handoff's tables.
- The root `Justfile`'s `test`, `test-safari` and `_test-builds` recipes, drag's `test-engines`, the removal of material-x's visual recipes, and the devcontainer's browser installs.
- Records against the tree: `RD-6` to `RD-13`, the nine findings, the design's §3 to §5, the report's item 5 and 7 tables and its CI-run sections, and `.agents/docs/test-architecture.md` §CI policy and §What screenshots prove.
- One scratch reproduction, for `reviewer-1`. Its script and output are below.

**Not covered: these areas are unread, which isn't the same as clean.**

- No GitHub run, log, check or pull-request state was read. The run numbers and the durations in the report are taken as the report states them.
- No build, lint, typecheck or test was rerun. For property 3 I read the diffs and the saved [`lint-repairs-emitted.txt`](../../ci-verification-1/checks/lint-repairs-emitted.txt) and [`for-in-keys.txt`](../../ci-verification-1/checks/for-in-keys.txt). I didn't rebuild the packages.
- `.claude/` and `eslint.config.ts` were read only as far as `RD-10` and `RD-11` describe them. The size scripts (`.scripts/size-reading.ts`, `size-report.ts` and its tests) and `codecov.yml` weren't read beyond their use in `verify.yml`.
- Whether Safari's 16 px TransformedStage offset (`DRF-51`) or the two stalls (`DRF-49`, `DRF-50`) come from the commands. They are registered as open and not established, and I didn't reproduce them.

**Properties that hold, with no finding:**

- **Property 1, `verify` can fail.** Every gate job has `if: github.event.pull_request.draft != true`, and `verify` has `if: always() && github.event.pull_request.draft != true` (`verify.yml:30`, `:45`, `:88`, `:106`, `:137`). On a push or a manual run, `github.event.pull_request` is null, so every job runs. `verify` fails unless every result in `needs.*.result` is `success` (`:142`–`:146`), so a failed, cancelled, timed-out or skipped gate job fails it. It is skipped only when the pull request is a draft. `measurements` isn't in its list.
- **Property 5, engine conditions and disabled rows.** There are 10 disabled rows, 5 in Safari and 5 in Firefox, and none in Chromium. Each marking matches its engine and its kind: `it.fails` for a row that always fails, and `skipIf` for an intermittent row. Each cites its finding, and the report, the handoff's table and the registers list the same rows. The other new conditions meet `RD-12` property 5: `landing.browser.test.ts`'s `canEmulateReducedMotion` rows and its `afterEach`. No project configuration excludes a file per engine.
- **Property 6, local runs and `test-safari`.**
  - `MX_TEST_ENGINES` defaults to `chromium`, and the visual project needs `MX_TEST_VISUAL=1`, which only `verify.yml:69` and `baselines.yml:66` set.
  - material-x's visual recipes are removed, the devcontainer installs only Chromium, and drag's `test-engines` sets no engine list.
  - `test-safari` meets each item of `RD-12` property 6.

## Findings

### reviewer-1 — Tier B — baselines.yml's write-token job can run a branch's code through a committed symlink at an accepted baseline path

**Proposed: blocks merge.** It is handoff property 2, and `RD-13` property 3 states the guarantee that fails.

**Current contract.** `RD-13` property 3: `propose` _"runs no code from the repository … It accepts from the artifact only paths that match `packages/*/tests/**/__screenshots__/**/*.png`."_ Its _Why_ says: _"The job that holds a write token runs none of it, so a branch can't use the token for anything except the proposal."_ The handoff's property 2 says: _"The job with the write token runs no repository code."_

**Current behavior.** `propose` has `contents: write`, `pull-requests: write` and `actions: write`, with `GH_TOKEN` in its environment (`baselines.yml:90`–`:95`).

- It checks out the recorded commit, the branch's own tree (`:99`–`:102`), and copies each listed path from the artifact over that tree with `cp`, then runs `git add` (`:126`–`:130`).
- `record` writes the artifact, `files.txt` and the copied files, after it runs the branch's code (`:53`–`:76`).
- The path filter (`:108`–`:116`) checks only the path's text.

So a branch can commit `packages/x/tests/__screenshots__/a.png` as a symlink to `../../../../.git/config`, and have its `record` run list that path and upload a git configuration as the file's contents. The path passes the filter. `cp` writes through the symlink into `.git/config`, and the next `git` command in the job reads it.

A key such as `core.fsmonitor` names a command, so `git add` runs that command with the job's environment. So does a `core.hooksPath` that points into the checked-out tree, at `git commit`. The token is in that environment.

**Evidence and reproduction.** The job's own commands were run in the scratchpad (git 2.47.3), in a clone at a commit whose only file is that symlink:

```sh
grep -vxE 'packages/[^/]+/tests/([^/]+/)*__screenshots__/([^/]+/)*[^/]+\.png' files.txt  # prints nothing: accepted
git checkout -q -B baselines/t "$SHA"
while IFS= read -r path; do mkdir -p "$(dirname "$path")"; cp "proposal/tree/$path" "$path"; git add -- "$path"; done < files.txt
```

```text
PAYLOAD-RAN
PAYLOAD-RAN
--- .git/config now:
[core]
	fsmonitor = "echo PAYLOAD-RAN >&2; touch …/ran; false"
```

The artifact's file was the clone's own `.git/config` with that `[core]` block appended. `git add` ran the command twice, and the marker file exists.

**Reach.** It takes a branch in this repository and a run, either through the label or through `workflow_dispatch`. So the person who exploits it already has write access. They gain a job token with `actions: write` and a path to run code that nobody reviewed. The person who adds the label to someone else's pull request relies on that property not to grant either.

**Required property.** No content that `record` or the recorded tree controls can make `propose` run code or write outside the proposal's baseline files, including through a path component of the checked-out tree that is a symlink.

### reviewer-2 — Tier C — any label, or a fork's branch with the same name, cancels a recording in progress

**Not blocking.**

**Current contract.** `RD-13` property 6: _"One recording per target runs at a time, and a newer one cancels the older one."_

**Current behavior.**

- The workflow runs on every `pull_request` `labeled` event, whatever the label (`baselines.yml:9`–`:10`).
- Its concurrency group is `baselines-<head_ref or ref_name>` with `cancel-in-progress: true`, and it applies to the whole run (`:19`–`:21`). The label check happens later, in `record`'s `if` (`:29`–`:30`).
- So a run started by another label, such as two labels added at once, cancels a recording in progress for the same branch. Its own jobs are then skipped.
- `head_ref` is a branch name without the repository. A fork's pull request whose head branch is called `main` or `ci/verification` lands in the same group as this repository's recording for that name, and any label on it cancels that recording.

**Evidence.** Read from the workflow file. GitHub evaluates workflow-level concurrency when it queues a run, before any job's `if`. This wasn't run.

**Required property.** Only a newer recording of the same target in this repository cancels a recording.

### reviewer-3 — Tier C — when `record` fails, the label stays on the pull request

**Not blocking.**

**Current contract.** `RD-13` property 2: _"After a labeled run, the workflow removes the label, so adding it again records again."_

**Current behavior.** The label is removed by a step of `propose` (`baselines.yml:162`–`:164`). `propose` `needs: record` and has no `if`, so it is skipped when `record` fails, for example when a visual row errors under `--update`, `npm ci` fails or the runner times out. The removal step then never runs, and the label stays on. Adding it again isn't possible until someone removes it.

**Evidence.** Read from the workflow file. GitHub skips a job whose `needs` didn't succeed unless the job's `if` says otherwise.

**Required property.** Every labeled run that `record`'s condition admits ends with the label removed, whatever `record`'s result.

### reviewer-4 — Tier C — handoff property 3 doesn't hold as worded at three `src/` sites, although the evidence shows no change in behavior

**Not blocking.** Routed to the architect, because whether behavior-equivalent output meets the property is a reading of the property.

**Current contract.** Handoff property 3: _"Each change under `packages/*/src/` is a lint repair whose emitted JavaScript is unchanged, or a `u` or `v` flag on a pattern that matches the same strings (item 5)."_

**Current behavior.** Three repairs change the emitted JavaScript. The report's item 5 table discloses each, and [`lint-repairs-emitted.txt`](../../ci-verification-1/checks/lint-repairs-emitted.txt) shows them:

| Site | Emitted change | Equivalence |
| --- | --- | --- |
| `packages/tproc/src/processToken.ts:157` | `` `${String(textTransform)}` `` becomes `` `${textTransform}` `` | Differs only for a `Symbol`, which token JSON can't hold. Both call ToString, which throws for a null-prototype object in either form |
| `packages/vite-custom-element-assets/src/css/generation.ts:256` | `const generation = current ??= create(); const id = generation.requests += 1;` becomes four statements | The same reads and writes in the same order. Equivalent by the language's semantics |
| `packages/vite-traits-plugin/src/analyze.ts:85` | `for..in` becomes `for..of Object.keys(…)` | Differs only for inherited enumerable keys. `walk` reaches only non-null objects (`:77`), and the probe found none with such keys among 102,733 `oxc-parser` objects ([`for-in-keys.txt`](../../ci-verification-1/checks/for-in-keys.txt)) |

**What holds.**

- The six other TypeScript files change types only, or add the `u` flag to three ASCII patterns.
- The five CSS files are equal once whitespace is removed, which I checked at the reviewed commit.

**Required property.** The architect states whether property 3 is met by a demonstrated behavior equivalence at these three sites, or whether it requires byte-identical output.

### reviewer-5 — Tier C — Safari's `pointerMove` rounds every coordinate to a whole pixel, and Playwright's doesn't

**Not blocking.**

**Current contract.** `RD-12` property 4: each WebdriverIO command has _"the same name, arguments, result and coordinate frame as its Playwright implementation"_. The report says: _"`steps` interpolates from the kept position as Playwright does."_

**Current behavior.** The WebdriverIO branch sends `Math.round(from + (to - from) * step / count)` for each step, the target included (`packages/drag/tests/support/commands.node.ts:146`–`:153`). Playwright 1.65.0 sends `fromX + (x - fromX) * (i / steps)` unrounded (`playwright-core/lib/coreBundle.js:22969`). drag's harness passes fractional coordinates, for example `start.x + dx / 2` (`tests/support/harness.ts:181`). So the Safari pointer can land up to 0.5 px from where the same call puts the Chromium or Firefox pointer. Its kept position is also the unrounded target (`:156`), not where the pointer is.

The frame is the same, the top-level viewport in both. Only the precision differs, and neither the record nor the command's comment states it. Whether WebDriver requires whole-pixel coordinates wasn't established here.

**Required property.** The Safari command's coordinates agree with Playwright's, or the record states the difference and the reason for it, so that a sub-pixel discrepancy in Safari isn't read as a product difference.

### reviewer-6 — Tier C — three statements in the tree are contradicted by the tree at the reviewed commit

**Not blocking.** Property 7.

- **`.agents/docs/test-architecture.md:158`:** _"there is no pull-request workflow and no pinned verification image"_. Line `:169` says that the gate and its pinned environment _"neither exists yet"_. `verify.yml` and `RD-9`'s pinned environment exist at `397e4ec14`. Until the owner adds the branch rule, _"nothing here currently blocks a merge"_ remains true. The handoff's _After the review_ lists no change to this document.
- **`.scripts/vitest-config.ts:241`–`:242`**, the comment on `createChromiumProvider`: _"Every engine is the build that the exact `playwright` dependency pins."_ Safari isn't pinned (`RD-12` property 7). The comment on `createEngineProvider` a few lines below says so correctly.
- **The design's §4,** at `ci-verification-design.md:105`: _"Visual baselines: 23 files"_. `RD-9`'s reading carries the correction to 19, and the design doesn't.

**Required property.** Each document and comment in the tree states the gate, the engines' pinning and the baseline count as the tree and the decisions do. The first item needs this when `RD-6` is marked implemented.

## Summary for routing

| Local id | Tier | Property | Blocks merge (proposed) |
| --- | --- | --- | --- |
| `reviewer-1` | B | 2 (`RD-13` property 3) | **Yes** |
| `reviewer-2` | C | 2 (`RD-13` property 6) | No |
| `reviewer-3` | C | 2 (`RD-13` property 2) | No |
| `reviewer-4` | C | 3 | No; the architect reads the property |
| `reviewer-5` | C | 4 (`RD-12` property 4) | No |
| `reviewer-6` | C | 7 | No |

Properties 1, 5 and 6 hold. These ids are local to this pass, and no canonical id is minted here.