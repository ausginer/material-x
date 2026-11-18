# Report: the runners' system packages, fetched once and installed offline

**Status: implemented, and the witnesses are read.** Witnesses 1, 2, 4, 5 and 6 hold. Witness 3 holds in four of five jobs. In `webkit`, the fallback ran on the slow mirror and the job was cancelled at its limit before its tests. That is a finding for the architect, and it is described below. The records' status in `00-index.md` doesn't change.

**Input:** the [handoff](ci-deps-handoff.md), items 1 and 1b, on `repo/ci-deps-1`. **Governing records:** `repo:RF-58` and `repo:RD-21`, with `RD-6` properties 2 and 8, `RD-12` property 11 and `RD-15` property 5 as `RD-21` amends them. **Pull request:** #38.

| Commit | What | Run |
| --- | --- | --- |
| `26192a1a2` | merges `origin/main` at `377ca72df`. `.plan/00-index.md` conflicted, and both RF-56 and RF-58 are kept. The lockfile didn't change | — |
| `ecb3b094d` | item 1: `system-deps`, `.github/actions/browser`, and `verify.yml` and `baselines.yml` | 44254065323 (cold) |
| `2c1fa4e22` | the second stop's record | — |
| `8b56cbf27` | item 1b: the restored directory is apt's archive cache, and a failed install runs `--print-uris` | 44258255489 (warm) |
| `16ece6f4b` | temporary: the action's key gets `-forced-miss` | 44259919530 (forced miss) |
| `b3980fbc9` | reverts `16ece6f4b` | 44261296408 (warm again) |

Every job of every run ran on runner image `20261103.629`, not the `20261111` release that the mirror reading saw, so every key's release is `20261103`. The image's build number doesn't tell the two pools apart. The mirror apt uses does: `us-east-2.ec2.archive.ubuntu.com` or `azure.archive.ubuntu.com`.

## Witness 1. Cold: holds

Run 44254065323 on `ecb3b094d`. Each `system-deps` leg missed, downloaded in download-only mode, and saved. Per job: [`checks/cold-run.tsv`](checks/cold-run.tsv).

| Leg | Mirror | Volume | Download step | Cache entry |
| --- | --- | --- | --- | --- |
| chromium | `us-east-2.ec2.archive.ubuntu.com` | 32.1 MB | 3 min 4 s | 32,058,051 B |
| firefox | `us-east-2.ec2.archive.ubuntu.com` | 48.8 MB | 5 min 52 s | 48,819,664 B |
| webkit | `azure.archive.ubuntu.com` | 125 MB | 16 s | 124,965,349 B |

The volumes match the [mirror reading](checks/mirror-reading.tsv). The slow mirror cost about 6 minutes in `system-deps`, before any test job started, as `RD-21` property 4 intends.

**In the same run, the offline install of item 1 failed in all five test jobs** with `E: Unable to fetch some archives` ([`checks/cold-run-docs-offline-install.log`](checks/cold-run-docs-offline-install.log)). Each job fell back to the mirror and passed. That was the handoff's second stop. The architect read the cause in apt's source: under `--no-download`, apt keeps only archives in its archive cache (handoff, _The second stop: the cause and item 1b_). Item 1b fixes it.

## Witness 2. Warm: holds

Read in run 44258255489 on `8b56cbf27`, and again in 44261296408 on `b3980fbc9`. Both are the hit case: the release was still `20261103`, so every `system-deps` leg hit the entries that the cold run saved, and ended after the lookup in 8 to 14 s. Per job: [`checks/warm-run.tsv`](checks/warm-run.tsv) and [`checks/revert-run.tsv`](checks/revert-run.tsv).

In each of `chromium`, `firefox`, `webkit`, `docs` and `measurements`, in both runs:

- the action wrote no warning;
- the log has no `Get:` from any `archive.ubuntu.com` host. The count of such lines is 0 in every job of both runs, `system-deps` included;
- apt installed the engine's set from the archives: 9 new packages and 4 upgrades for Chromium's set (`chromium`, `docs` and `measurements`), 40 new packages for Firefox, and 181 new packages and 4 upgrades for WebKit. These are the volumes of the mirror reading. No downgrade was asked for, and `--print-uris` never ran;
- the dry run printed _"All system dependencies are installed."_;
- the job's tests ran and passed.

**Which pools ran the offline install can't be read.** No job contacted a mirror, so no log names one. Both mirrors served the cold run and the forced-miss run on the same image `20261103.629`. The property doesn't depend on the pool.

## Witness 3. The fallback: holds in four jobs, and `webkit` was cancelled

Run 44259919530 on `16ece6f4b`, which made the action's restore key miss. `system-deps` still hit, because its key didn't change. Per job: [`checks/forced-miss-run.tsv`](checks/forced-miss-run.tsv).

In every test job, the action wrote `<engine>: the cache holds no archives for this key, so Playwright installs them from the mirror` and ran `playwright install --with-deps`.

| Job | Mirror | Fetch | Browser action | Result |
| --- | --- | --- | --- | --- |
| chromium | azure | 32.1 MB in 2 s | 27 s | tests passed |
| firefox | azure | 48.8 MB in 1 s | 21 s | tests passed |
| docs | azure | 32.1 MB in 7 s | 28 s | passed |
| measurements | us-east-2 | 32.1 MB in 6 min 19 s | 436 s | passed, inside its 10-minute limit |
| webkit | us-east-2 | cancelled while fetching | 475 s | **cancelled at its 8-minute limit, before its tests** |

The fallback's step logs are saved: [`checks/forced-miss-chromium-fallback.log`](checks/forced-miss-chromium-fallback.log) and [`checks/forced-miss-webkit-fallback.log`](checks/forced-miss-webkit-fallback.log). `verify` failed because `webkit` was cancelled, which is the gate's correct answer for that run. `b3980fbc9` reverts the commit.

**Finding, for the architect.** `RD-21` property 4 says that the test jobs' limits don't change because their install no longer depends on the mirror, and that `system-deps`' limit is the only place a slow mirror can still fail a run. That holds on a hit. On a miss in a test job, the fallback is today's install, and on the slow pool it still times out `webkit`, as `RF-58` describes. This run forced the miss, but the same path is taken whenever a test job misses or its offline install or check fails:

- an entry is evicted between `system-deps` and the test job;
- the recording workflow runs before `main` has saved;
- a pull request's `system-deps` leg fails to save.

The fallback keeps a job correct, not on time. Whether that is accepted for a miss, or the test jobs' limits or the fallback change, is not decided here.

## Witness 4. The cost: holds

From runs 44258255489 and 44261296408, both hits:

- **`system-deps` on a hit:** 8 to 14 s per leg, from job start to end. The three legs run in parallel.
- **The critical path:** the five browser jobs started 20 s and 17 s after `scope` ended, against 3 and 4 s for `static`, which needs only `scope`. So a hit adds about 13 to 17 s.
- **The browser action on a hit,** the offline install, the dry run and the browser download together: 21 to 41 s in the first run and 15 to 36 s in the second. The fast pool's `playwright install --with-deps` step took 19 to 41 s in the mirror reading, so the install takes about the fast pool's time on every pool.
- **Wall time:** 555 s and 513 s, against the CI-speed unit's 518 s. `firefox` ends last in both runs, at 498 s and 473 s.

## Witness 5. Reduced mode: holds

`[noci]` on `f8a8f2ba6`, which changed only this unit's record. Run 44262721128: _"B: b3980fbc9… (run 44261296408)"_, _"mode: reduced, because [noci], and every path in the range is a record or Markdown"_. `records` succeeded, `system-deps` was skipped with `static`, `chromium`, `firefox`, `webkit`, `docs` and `measurements`, and `verify` succeeded. Wall time 75 s.

## Witness 6. The recording workflow: holds

Read in `.github/workflows/baselines.yml`, and not run. Its only change since `83a985b99` is its install step. `aube exec -- playwright install --with-deps chromium` became `uses: ./.github/actions/browser` with `engine: chromium`, at the same position after `aube ci`.

## Verification and limits

- `aube exec just fmt-check` at the root passes. `git diff --check` is clean. I checked the links in this report by testing that each target file exists. The handoff's section is named, not linked by anchor.
- No local test applies. The gate's own runs are the test, and they are the runs above. `actionlint` isn't installed. I parsed the YAML files and checked the extracted shell with `bash -n`.
- Witness 2 can't say which pool ran the offline install (see above).
- The forced miss isn't a natural miss. No run in this unit saw a test job miss on its own.

## Next

The architect reads the finding of witness 3 and records `RD-21` from this report and the review.