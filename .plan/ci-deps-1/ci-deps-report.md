# Report: the runners' system packages, fetched once and installed offline

**Status: stopped at the handoff's second stop.** `apt-get install --no-download` needs the network for the cached archives, so every job fell back to the mirror. The method in `repo:RD-21` property 2.2 is returned to the architect, as the [handoff](ci-deps-handoff.md) directs. Witnesses 2 to 5 weren't run, because a warm run would read the same failure.

**Input:** `repo/ci-deps-1` at `ecb3b094d`, item 1 of the handoff, on `origin/main` at `377ca72df` (merge `26192a1a2`). **Pull request:** #38. **Governing records:** `repo:RF-58`, `repo:RD-21`, and `RD-6` properties 2 and 8, `RD-12` property 11 and `RD-15` property 5 as `RD-21` amends them.

## Cold run 44254065323

Every job ran on runner image `20261103.629`, not the `20261111` release that the mirror reading saw, so the cache key's release is `20261103`. All jobs succeeded, and `verify` succeeded. Per job: [`checks/cold-run.tsv`](checks/cold-run.tsv).

- **The fetch held,** which is witness 1. Each `system-deps` leg missed, downloaded in download-only mode and saved:

  | Leg | Mirror | Volume | Download step | Cache entry |
  | --- | --- | --- | --- | --- |
  | chromium | `us-east-2.ec2.archive.ubuntu.com` | 32.1 MB | 3 min 4 s | 32,058,051 B |
  | firefox | `us-east-2.ec2.archive.ubuntu.com` | 48.8 MB | 5 min 52 s | 48,819,664 B |
  | webkit | `azure.archive.ubuntu.com` | 125 MB | 16 s | 124,965,349 B |

  The volumes match the [mirror reading](checks/mirror-reading.tsv).

- **The offline install failed in all five test jobs.** Each restored its engine's archives (`HIT: true`). apt then read the package lists, listed the recommended packages it skips, and stopped with `E: Unable to fetch some archives, maybe run apt-get update or try with --fix-missing?`. The action wrote its warning, _"the offline install failed"_, and ran `playwright install --with-deps`, which fetched the whole set from the mirror. That includes `firefox` on the slow mirror `us-east-2.ec2.archive.ubuntu.com`. The `docs` job's step is in [`checks/cold-run-docs-offline-install.log`](checks/cold-run-docs-offline-install.log).

So the fallback kept the run correct, and it hid the failure. `RF-58`'s required property doesn't hold: the test jobs still reach the mirror while the cache holds their engine's packages.

## What the run doesn't show

apt's message doesn't name the archive it wanted to fetch, and the log has nothing more. **The cause is not read.** One explanation, unverified: when a given `.deb` has the same version as a candidate in the runner's package lists, apt may choose the repository's copy and not the local file, and `--no-download` then refuses it. A run with apt's debug output (`-o Debug::pkgAcquire=true`, or `apt-get install -s` on the same files) would establish which package and why.

## Next

The architect decides the offline method, or the next diagnostic. Item 1's code stays on the branch as it is, and its fallback keeps the gate correct meanwhile. The records' status in `00-index.md` doesn't change.