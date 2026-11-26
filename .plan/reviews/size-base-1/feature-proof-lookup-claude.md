# RF-65's lookup paths and the push summary: narrowed feature proof

**Files were read at:** `d41499005` (`repo/size-base-1`, pull request [#72](https://github.com/ausginer/material-x/pull/72)'s head), in a detached scratch worktree outside the slots. **Diff reviewed:** `895878db4..d41499005`: `.github/workflows/verify.yml`'s _Sizes at the merge base_ and _Report_ steps, `.scripts/size-report.ts` (`BaseReading`, `readBase`, `renderSizeReport`, the command line), its tests, and the plan's implementation note. The record changes in `11017eaac..895878db4` are read as the governing text and aren't reviewed.

**Governing records:** `repo:RD-7` property 5, with the architect's amendment of 2026-11-19 on the [first feature proof](feature-proof-claude.md), and property 4. The [base-reading plan](../../size-base-1/size-base-plan.md)'s property 6 and its amendment of that day ([`00-index.md`](../../decisions/RD-7.md)).

**Lens:** feature proof, narrowed by the coordinator to the two fixes: amended properties 5 and 6 against the code, the implementer's [witness 7](../../size-base-1/checks/witness-7-lookup-paths.txt), the HTTP 403 path, and anything that could make every lookup fail silently. Every claim below is from my own reading or from a run I made. Those runs are saved in [`checks/feature-proof-lookup-cases.txt`](checks/feature-proof-lookup-cases.txt), with the harness. Nothing is repaired, no record is amended, and nothing was written to GitHub.

**Verdict: the fixes meet `RD-7` property 5 as amended and the plan's property 6 as amended.**

- I ran fifteen cases: four missing readings, seven failed lookups, a corrupt reading, a found reading, and a push and a manual run.
- Each has the right outcome: `missing=true`, or no output, or a downloaded file. Each gets the right sentence in the report, and each step and report exits 0.
- A missing permission (HTTP 403) on any of the three calls is a failed lookup.
- No failing call is silent.
- One finding, Tier C: a broken line wrap in `size-report.ts`'s module comment.

## How the cases ran

- **The step text is the workflow's own.** It is taken verbatim from `verify.yml` with the `yaml` package and run under `bash -e`, as GitHub Actions runs a step.
- **The real `gh` binary ran every case.** In all but the real-API cases it was pointed at a local mock of the API through gh's `http_unix_socket` setting, in a scratch `GH_CONFIG_DIR`, with a dummy token. Each mocked case lists the requests the mock received. None reached GitHub.
- **Nothing is substituted, unlike witness 7.** The workflow is still `verify.yml`, the branch `main` and the artifact name `size-reading`. In _found_, the zip that gh downloads holds a real `head-size.json`, so the step and the report run end to end with no file placed by hand.

| Case | API | Step outcome | Report's sentence |
| --- | --- | --- | --- |
| no push run | mock, 200, empty list | notice, `missing=true` | `main`'s run … stored no size reading |
| run without the artifact | real, run 44448397868, and mock | notice, `missing=true` | stored no size reading |
| expired artifact | mock, `expired: true` | notice, `missing=true` | stored no size reading |
| 403 on the run list | mock | warning, no output | the lookup … failed |
| 403 on the artifact list | mock | warning, no output | the lookup … failed |
| 403 on the zip | mock | warning, no output | the lookup … failed |
| 429 on the run list | mock | warning, no output | the lookup … failed |
| 500 on the run list | mock | warning, no output | the lookup … failed |
| API unreachable | mock socket absent | warning, no output | the lookup … failed |
| `git merge-base` fails | stub `git`, exit 128 | warning, no output | the lookup … failed |
| downloaded file isn't a reading | mock | `base reading: run 777`, file present | the lookup … failed |
| found | mock | `base reading: run 777, artifact 1`, file present | Brotli … at the merge base. `box-quad` shows `1100`, `+82` |
| push | — | step skipped | Brotli bytes at the head. Nothing about a base |
| manual run | — | step skipped | as push |

CI agrees on the real path. On run 44453760453 at `d41499005`, `measurements` (job 135323970811) logged the notice for merge base `91fc5d662` and succeeded. #72's comment, updated at 03:49:06Z, opens with _"`main`'s run for the merge base stored no size reading"_.

## Scope

**Covered.**

- **`RD-7` property 5, a missing reading.** No push run, or a run whose artifact list has no unexpired `size-reading`, writes `missing=true`. _Report_ then passes `--base-missing`, and the report says that none is stored.
  - The real API filters by name: run 44276375207 lists 21 artifacts, `?name=reading-0.02-hover` returns that one with `"expired": false`, and `?name=size-reading` returns none.
  - So the step's `[.artifacts[] | select(.expired | not)][0].id` reads the fields the API returns.
- **Property 5, a failed lookup.** Each call carries `|| failed`: `git merge-base`, both `gh api` calls, and `gh run download`. `failed` logs a warning and ends the step with exit 0 without writing an output. With no `missing` and no file, `readBase` returns `'failed'`, and the report says that the lookup failed, not that none is stored.
  - **The 403 path.** A 403 on any of the three calls takes this path. gh prints _"Resource not accessible by integration (HTTP 403)"_ and exits 1, as `gh help exit-codes` says for any failure. The step reads only exit statuses and the API's JSON, never gh's text.
  - **The same holds for 429, 500, an unreachable API and a failed `git merge-base`.**
- **Property 5, a run that looks up no base.** On `push` and `workflow_dispatch`, _Report_ passes neither `--base` nor `--base-missing`. `readBase` returns `null`, and the summary is _"Brotli bytes at the head. gzip at the head, where the instrument reports it."_ It says nothing about a stored reading. The table keeps its _Base_ column, with `—` in every row.
- **Property 4.** In every case the step and the report exit 0. The job succeeded on CI.
- **The plan's property 6 as amended.** It matches property 5 point for point. _"A download that fails after the reading was found"_ is the 403-on-the-zip case and the implementer's directory case.
- **A downloaded file that isn't a reading** is reported as a failed lookup. No record names this case. _"Not that none is stored"_ holds, and the implementation note states it: _"A `--base` file that is absent or holds no reading is a failed lookup."_
- **The tests.** `.scripts/size-report.node.test.ts` passes 20 of 20 at `d41499005`. The seven new or changed tests cover each `renderSizeReport` sentence and each `readBase` result. The workflow's shell has no unit test. Its witnesses are witness 7, my cases and CI.
- **Witness 7.** Its seven cases agree with mine where they overlap. My _found_ case removes its three substitutions and its hand-placed file. I didn't repeat its failed-download case, which makes `mkdir` fail. My 403-on-the-zip case fails the same call.

**Not covered.**

- **A real HTTP 403 from GitHub.** A probe against endpoints my token can't use was refused by this session's permissions, and I didn't retry it in any form. The 403 is the mock's, and the client and its exit status are the real `gh`'s.
- **A real expired artifact.** The mock gives `expired: true`. The real API returns the field, as shown.
- **A fork's pull request,** as in the first proof.
- **Lint and formatting of the changed files.** `static` passed at `d41499005` on CI (job 135323868022), and I didn't repeat it.

## Whether every lookup could fail silently

**No failing call is silent.** Every call that fails reaches `failed`. That gives a warning annotation in the run and _"the lookup … failed"_ in the comment, on every pull request that it affects.

**What would still read as an expected absence on every pull request** is a configuration that matches nothing, and nothing at this head does. Each of these gives "stored no size reading" until someone notices:

- **The artifact name drifts.** The name `size-reading` is written three times in two steps: the upload's `name:`, the artifact query's `?name=`, and the download's `--name`. A change to one of them would read as "missing".
- **The run filter matches no push run,** for example after `main` is renamed. A renamed `verify.yml` gives a 404 instead, which is a failed lookup.
- **`main`'s runs stop uploading,** for example if the upload step's condition changes.

Property 5 and the plan's property 6 define these cases as a missing reading: _"a run whose artifact list has no unexpired `size-reading`"_. So they aren't defects. At `d41499005`, the three names agree, and the filter finds `main`'s push runs (run 44448397868 for `91fc5d662`). The first pull request after the merge (witness 5) is still the one observation that would catch a mismatch.

## Findings

### `size-report.ts`'s module comment breaks a sentence across a short line

- **`reviewer-3`, Tier C.** Internal: a source comment.
- **Current behavior.** In the module comment, line 16 is _" * Every exceeded limit and"_, and the sentence continues on line 17. The paragraph above it was rewritten in this change, and the old wrap of that last sentence was kept.
- **Evidence.** `git show d41499005:.scripts/size-report.ts`, lines 9 to 18.
- **Required property.** The comment's paragraph reads as one wrapped paragraph, like the rest of the file.