# The runners' system packages, fetched once and installed offline — feature proof

**Files were read at:** `754f15174` (`repo/ci-deps-1`, the main checkout, clean), the head of pull request [#38](https://github.com/ausginer/material-x/pull/38). The last code commit is `b3980fbc9`. **Diff reviewed:** `26192a1a2..754f15174`, which covers `.github/actions/browser/action.yml` and `key.sh`, `.github/workflows/verify.yml` and `baselines.yml`, and the unit's records. **Records read at the same commit.**

**Governing records:** `repo:RD-21` (property 4 as amended at `754f15174`), `repo:RF-58`, `RD-6` properties 2 and 8, `RD-12` property 11 and `RD-15` property 5 in [`00-index.md`](../../00-index.md); the [handoff](../../ci-deps-1/ci-deps-handoff.md), items 1 and 1b and its stops; the implementer's [report](../../ci-deps-1/ci-deps-report.md) and its `checks/`, among them [`apt-no-download-source.txt`](../../ci-deps-1/checks/apt-no-download-source.txt).

**Lens:** feature proof. Each claim below is my own reading of the tree, the runs' logs or a local probe, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: the code meets `RD-21` and `RF-58` as amended, in every run I read, and witnesses 1 to 6 hold.**

- **A correction that makes witness 2 stronger.** The report reads the wrong runner image. Read correctly, the offline install ran on the slow pool, `20261111.127.1`, in four jobs, with no mirror contact (`reviewer-1`).
- **Two other Tier C findings:** a workflow comment that the amendment of property 4 left stale (`reviewer-2`), and an inferred edge case in the action's glob (`reviewer-3`).
- **No Tier A or Tier B defect.**
- `reviewer-1` corrects facts that the architect records `RD-21` from, so it is owed before that record. Whether it blocks the merge is the owner's call.

## Scope

**Covered.**

- **The `.github` diff, line by line:** the action's three steps and its fallback, `key.sh`, the `system-deps` job, each test job's `needs` and install step, `verify`'s lists in both modes, and `baselines.yml`'s step. Every third-party action that the unit uses is pinned to the same full hash as the workflows' existing use.
- **The forced miss and its revert.** `16ece6f4b` changes only the restore key, to `…-forced-miss`. `git diff 8b56cbf27 b3980fbc9 -- .github` is empty, so the revert is exact.
- **The records against the workflows:**
  - `RD-6` property 2: offline install, fallback, browser;
  - property 8: `verify` needs `system-deps`;
  - `RD-12` property 11;
  - `RD-15` property 5: reduced mode skips `system-deps`.
  - **`RD-21` properties 1 to 5:** on a hit, a leg ends after `lookup-only`; the key's five parts; one directory under `$RUNNER_TEMP`; the three warning reasons; the browser step only without the fallback.
- **Playwright 1.65.0's `install-deps --dry-run`,** read in `node_modules/playwright-core/lib/coreBundle.js`. It runs `apt-get install -s --no-install-recommends <list>` and no `apt-get update`. It sets `process.exitCode = 1` when any `Inst` line appears. So the check can fail, and it doesn't reach the mirror. No run took the _"the check found missing packages"_ branch, so that branch is unwitnessed in CI.
- **The logs of every browser job and `system-deps` leg** in runs 44254065323, 44258255489, 44259919530 and 44261296408. I read 32 jobs, through `gh run view --job <id> --log`, and recorded the runner image, the provisioner, the mirror and the cache key of each ([`checks/job-images.tsv`](checks/job-images.tsv)).
- **The `[noci]` run 44262721128** on `f8a8f2ba6`: `scope` and `records` succeeded, `system-deps` and every test job were skipped, and `verify` succeeded. The pull request's checks at `754f15174` show the same.
- **The recording workflow**, read only: `baselines.yml` checks out before the local action, on `ubuntu-24.04`. Its only change is the install step.

**Not covered.** These areas are unread, which isn't the same as clean.

- I ran no workflow, and no job missed on its own in any run.
- I didn't re-read apt's source for item 1b's cause. The warm runs witness the fix: 0 `archive.ubuntu.com` lines, and apt installed each set from the archives.
- I didn't re-time witness 4. I read the jobs' durations in the report's tables, not in the API.
- `actionlint` isn't installed, here or in the report.

## Findings

### reviewer-1 — Tier C: the report reads the provisioner's version as the runner image, so its release, its key and its pool reading are wrong

- **Observed:** each job's _Set up job_ log has a `Runner Image Provisioner` group (_"Hosted Compute Agent, Version: 20261103.629, Build Date: 2026-11-03"_) and a `Runner Image` group (_"Image: ubuntu-24.04, Version: 20261111.127.1"_ or `20261111.370.1`). In all 32 jobs I read, the provisioner is `20261103.629`, and the image is `20261111.127.1` or `20261111.370.1`. `key.sh` logged the key `system-deps-ubuntu24-20261111-X64-<engine>-playwright-1.65.0` in every job, so `ImageVersion` is the image's version, as `RD-21` property 1 assumes.
- **What the record says:**
  - the report: _"Every job of every run ran on runner image `20261103.629`, not the `20261111` release that the mirror reading saw, so every key's release is `20261103`"_, and _"The image's build number doesn't tell the two pools apart"_;
  - witness 2: _"the release was still `20261103`"_, and _"Which pools ran the offline install can't be read"_;
  - every `image` column of `cold-run.tsv`, `warm-run.tsv`, `forced-miss-run.tsv` and `revert-run.tsv` reads `20261103.629`;
  - the handoff's item 1b: _"If the runner image's release is still `20261103`, the `system-deps` legs hit"_.
- **What the logs show** ([`checks/job-images.tsv`](checks/job-images.tsv)):
  - **The build number tells the pools apart.** 13 jobs named a mirror. All 5 on `20261111.127.1` used `us-east-2.ec2.archive.ubuntu.com`, and all 8 on `20261111.370.1` used `azure.archive.ubuntu.com`. That is the mirror reading's pairing.
  - **The offline install ran on the incident pool.** On `20261111.127.1`, with no `archive.ubuntu.com` line, the offline install ran in `docs`, `firefox` and `chromium` of 44258255489, and in `docs` of 44261296408. The handoff asked for this reading: _"Record each job's runner image … If none ran on `20261111.127.1`, say so"_.
  - **The forced miss's pools:** `webkit` was cancelled on `20261111.127.1` through us-east-2, and `measurements` took 436 s there.
- **Consequence:** no workflow behavior is affected, and every witness's conclusion holds. Witness 2 is stronger than the report states. But the architect records `RD-21` and closes `RF-58` from this report, and the report states a false image, release and pool reading. It also says that a fact the handoff asked for can't be read.
- **Required property:** the report and its `checks/` name each job's runner image from the log's `Runner Image` group, and the key's release from `key.sh`'s output. Witness 2 states which jobs ran the offline install on `20261111.127.1`. The handoff's item 1b premise, _"still `20261103`"_, is corrected or marked as a misreading.
- **Routed** to the implementer for the report and its `checks/`, and to the architect for the handoff.

### reviewer-2 — Tier C: `system-deps`' comment in `verify.yml` still states property 4 as it was before the amendment

- **Observed:** `verify.yml`'s comment on `system-deps` ends: _"The limit covers WebKit's 125 MB from a slow mirror, and is the only place a slow mirror can fail a run."_
- **The requirement:** `RD-21` property 4, as amended at `754f15174`: _"**When every test job's restore hits**, that limit is the only place a slow mirror can still fail a run"_, and _"A test job whose own restore misses falls back to the mirror … and on the slow pool it can time out"_. The amendment records the sentence it replaced, but the comment still has that sentence's unconditional claim. Witness 3's `webkit` job is a counterexample to it.
- **Consequence:** a reader of the workflow is told that a test job can't time out on the mirror. A timed-out test job on a miss would then look like a different defect.
- **Required property:** the comment states the condition that property 4 now states.
- **Routed** to the implementer.

### reviewer-3 — Tier C, inferred and not observed: a hit whose entry holds no archive falls back to the mirror and reports a failed install

- **Observed in the code:** the action runs `apt-get install … --no-download "$DIR"/*.deb` with bash's default globbing. When the restored directory has no `.deb`, the pattern isn't expanded. apt then receives the literal path `…/system-deps/*.deb` (local probe in [`checks/job-images.tsv`](checks/job-images.tsv)).
- **Inferred:** that case occurs when the fetch leg downloads nothing because the image already has the engine's whole set. `system-deps` then saves an empty directory under the key. Every test job then:
  - hits;
  - fails the offline install on the unexpanded pattern;
  - writes _"the offline install failed"_;
  - runs `--print-uris` on the same pattern;
  - falls back to `playwright install --with-deps`, which runs `apt-get update` against the mirror.

  I didn't read what apt prints for the unexpanded path, or whether `actions/cache/save` stores an empty directory.

- **The requirement:** `RF-58`'s required property: _"no gate job contacts the Ubuntu mirror while the cache holds its engine's packages for the job's key"_. An empty set is a complete set for that image. `RD-21` property 2.4 says that the warning _"says which of the three happened"_. Here it would name a failure that didn't happen.
- **Consequence:** none today. Every engine's set is non-empty on `ubuntu-24.04` in every run read: 13, 40 and 185 archives. The fallback still installs correctly, and its index fetch is fast on both pools.
- **Required property:** a hit whose entry holds no archive passes to the dry-run check without reaching the mirror; or the record states that an empty set is treated as a miss.
- **Routed** to the architect. Whether this case is in scope is a call on the record.

## What holds

- **Witness 1 (cold), 44254065323.** Each leg missed, fetched and saved: Chromium 32.1 MB, Firefox 48.8 MB and WebKit 125 MB, the mirror reading's volumes. Two legs were on us-east-2, before any test job started. The five offline installs failed as the second stop records, and each job fell back and passed.
- **Witness 2 (warm), 44258255489 and 44261296408.** Every leg hit and ended after the lookup.
  - No log line names any `archive.ubuntu.com` host, in any of the 16 browser jobs and legs (my own grep of each log).
  - Each test job logged the engine's set as installed (`4 upgraded, 9 newly installed`, `0 upgraded, 40 newly installed` or `4 upgraded, 181 newly installed`), with no warning.
  - Each dry run printed _"All system dependencies are installed."_ (read in three jobs' logs, and in the report's tables for the others).
  - Every test job succeeded.
  - `RF-58`'s required property holds on both pools (`reviewer-1`).
- **Witness 3 (forced miss), 44259919530.** Each test job's warning names the miss, and each job falls back. Four jobs passed. `webkit` was cancelled on the slow pool. `RD-21` property 4, as amended, and `RF-58`'s amended required property both describe this outcome. Their _Not adopted_ entry records why the miss path is unchanged, and when it reopens.
- **Witness 4 (cost):** the report's readings agree with the job durations in its tables. A hit's leg takes 8 to 14 s.
- **Witness 5 (reduced mode)** and **witness 6 (the recording workflow)** hold, as read above.
- **The fetch and the install use one key and one directory,** from one script, in both workflows. The fetch's apt configuration is removed before the save. Only `system-deps` saves.

## Proposed canonical ids

None. The three findings are Tier C. They concern this unit's record and code under `RD-21` and `RF-58`, and the architect can date them there. That is a proposal, not an allocation.