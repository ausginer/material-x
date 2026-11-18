# Handoff: the runners' system packages, fetched once up front and installed offline

**Recipient:** the implementer, in the main checkout. (It said slot `c`. The coordinator reassigned the unit on 2026-11-18.)

**Branch:** `repo/ci-deps-1`, from `origin/main` at `83a985b99`. **Input:** the architect's commit that adds this file.

**Begins after** the main slot's architect records the proposals below (`RD-17` properties 4 and 7). If the recorded entries differ, they bind, and the implementer returns here before implementing anything they change.

**Recorded 2026-11-18** by the main slot's architect, on the owner's choice of this plan over a custom CI image. The entries are `RF-58` and `RD-21`, with the amendments to `RD-6`, `RD-12` and `RD-15` in place, in [`../00-index.md`](../00-index.md). They bind. Where they differ from the proposals below:

- **The decision is `RD-21`, not `RD-20`,** because `RD-20` went to material-x's browser floor on `repo/traits-plugin-1`. Items 1 and 2 and the last section name `RD-21`. The proposal sections keep the number they proposed.
- **`RD-21` property 2.2 adds one requirement:** the offline install names the archive files themselves, so it doesn't depend on the versions in the runner's package lists. A fetch made after an `apt-get update` can hold a newer version than those lists name, such as Mesa's upgrade in Chromium's set. If apt can't install the files without the network, that is this handoff's second stop.
- **`RD-21` adds a reason about the cache's scope,** from GitHub's documentation: a pull request restores what `main`'s runs saved. Witness 1's cold run fills only the pull request's own scope.
- **The custom image** is recorded under _Not adopted_ as the owner's decision.

**Returned at the second stop on 2026-11-18,** after cold run 44254065323 ([report](ci-deps-report.md)). The architect read the cause in apt's source. Item 1b fixes it inside `RD-21` as recorded. See [The second stop](#the-second-stop-the-cause-and-item-1b).

**The owner's direction,** relayed by the coordinator on 2026-11-18: system dependencies are installed up front, at environment initialization, before any test starts. How is the architect's to establish.

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RD-6` property 2: plain runners, no container, and each job installs its engine with `playwright install --with-deps`. Property 8 covers `verify`'s list.
- `repo:RD-12` property 11 says the same of `webkit`.
- `repo:RD-15` property 5 covers the jobs that a reduced run skips.
- `repo:RD-16` covers installs, and the `aube exec --` form.
- `repo:RD-13` covers the recording workflow, which installs Chromium the same way.

**Evidence:** [the mirror reading](checks/mirror-reading.tsv), 19 jobs of runs 44237471520, 44238673598 and 44240485947.

## What was read

- **The stall is the `.deb` download, and only on one runner pool.** Every job that ran on runner image `20261111.127.1` used the mirror `us-east-2.ec2.archive.ubuntu.com`. All 12 of those jobs fetched their packages at 70 to 202 kB/s, or were cancelled at their job limit while fetching. All 7 jobs on `20261111.370.1` used `azure.archive.ubuntu.com`, at 8.2 to 45.9 MB/s. Both pools ran in the same runs, in the same minutes.
- **What is fast on both pools:**
  - the package indexes (`apt-get update`, 13.2 MB) took 1 to 10 s;
  - Playwright's browser downloads, from `cdn.playwright.dev`, finished in every job that reached them.
- **The volume per engine is the same on both pools:**
  - Chromium: 9 new packages and 4 upgrades, 32.1 MB, mostly fonts and Mesa;
  - Firefox: 40 new packages, 48.8 MB;
  - WebKit: 181 new packages and 4 upgrades, 125 MB.

  `docs` and `measurements` fetch Chromium's set. So five jobs per run fetch three sets, and Chromium's set is fetched three times. At 100 kB/s, Chromium's set takes about 5 minutes, which is `docs`'s whole limit. WebKit's takes about 21 minutes, against an 8-minute limit.

- **Playwright 1.65.0** (the root's exact pin) runs `apt-get update && apt-get install -y --no-install-recommends <its list>` as root. Its `install-deps --dry-run <engine>` simulates that install with `apt-get install -s` and exits non-zero if a required package is missing (read in `--help` in slot `c`).

## What "up front" can mean on a plain runner

Each job is a fresh virtual machine. A package installed in one job doesn't exist in another, so installing once for the whole run would need an image built with the packages. `RD-6`'s amendment of 2026-11-16 rules that out, on the owner's direction. That leaves two things a plain runner can do up front:

- **Fetch once, before any test job starts.** One job fetches each engine's packages from the mirror and keeps them in the Actions cache. It doesn't install them.
- **Install offline, at each job's initialization,** from those files. A slow mirror then can't stall or time out a test job, and nothing reaches the mirror while the cache holds the engine's files.

**If the owner meant an environment built with the packages,** that reverses `RD-6`'s plain-runner amendment, and it is the owner's call. Raise it before implementation. This plan doesn't assume it.

## Proposals for the main slot's architect

The identifiers are proposed. `RF-56` is on `repo/host-invariant-1` and `RF-57` is on `repo/declarations-check-1`, so the next free numbers here are `RF-58` and `RD-20`.

### 1. `RF-58`: the gate fetches each engine's system packages in each job, so a slow mirror times out jobs before any test runs

Tier C. **What:** this handoff's _What was read_ and the [reading](checks/mirror-reading.tsv). **Why it matters:** a job that times out tests nothing, its re-run lands on whichever pool the queue assigns, and #35 and #37 each needed several attempts. **Required property:** no gate job contacts the Ubuntu mirror while the cache holds its engine's packages, and when a job does reach the mirror, it happens before any test job starts. **Routed** to `RD-20`.

### 2. `RD-20`: one job fetches the engines' system packages up front, and every job that launches a browser installs them offline from the cache

Properties. The handoff items below are their form.

1. **The fetch job.** `system-deps` runs in a full run after `scope`, as a matrix over `chromium`, `firefox` and `webkit`.
   - **Each leg's cache key** is built from:
     - `ImageOS`;
     - the runner image's release, the part of `ImageVersion` before its first dot (`20261111`);
     - the runner's architecture;
     - the engine;
     - the exact `playwright` version in the root `package.json`.

     Two pools of the same release fetched the same packages (_What was read_). The build number differs between pools, so a key that included it would miss on whichever pool didn't fetch.

   - **On a hit,** the leg ends after the lookup. It doesn't install aube or the dependencies.
   - **On a miss,** Playwright still chooses the packages. An apt configuration sets download-only mode and a directory for the archives. Then `aube exec -- playwright install-deps <engine>` runs, so apt downloads exactly what Playwright's install would download on this image, and installs nothing. The directory is saved under the key. Each leg saves its own engine, so a re-run after a timeout doesn't fetch it again.
2. **Every job that launches a browser on Linux** installs through one local composite action, `.github/actions/browser`, with an `engine` input. That covers `chromium`, `firefox`, `webkit`, `docs`, `measurements`, and the recording workflow's job. The action does this:
   1. restores the engine's archives under the same key;
   2. **on a hit,** installs exactly those archives with `apt-get install --no-download`, without `apt-get update`, so it never reaches the mirror;
   3. checks the result with `aube exec -- playwright install-deps --dry-run <engine>`;
   4. **on a miss, or if the install or the check fails,** writes a warning annotation that names which happened. Then it runs today's `aube exec -- playwright install --with-deps <engine>`. The fallback keeps the job correct when the cache is wrong or missing;
   5. installs the browser with `aube exec -- playwright install <engine>`, which the fallback's command already does.
3. **Order.** Every job in property 2 that is in `verify.yml` `needs` `system-deps`. `verify` needs it too: in full mode it must succeed, and in reduced mode it is skipped. The recording workflow has no fetch job. It restores what `main`'s runs saved, and falls back on a miss.
4. **Timeouts.** The test jobs' limits don't change, because the install no longer depends on the mirror. `system-deps` has 30 minutes. A miss on the slow pool fetches WebKit's 125 MB in about 21 minutes at 100 kB/s, and a hit takes well under a minute. The timeout is the only place a slow mirror can now fail a run, and it fails before any test starts.
5. **What doesn't change:** the plain runners, the engines, the package list (still Playwright's), and the browser download. No mirror is reconfigured. `RD-9`'s visual environment is the same set of packages.

**Why.**

- **A fetch, not an install, up front.** On a plain runner that is the only work one job can do for the others (see above).
- **An offline install from exact files, not the cache plus `apt-get update`.** After an update, apt installs any newer version from the mirror, and Mesa's upgrade is in Chromium's set. A mirror publish between two runs would then reach the slow mirror again.
- **Playwright still names the packages,** through its own `install-deps`. Its `--dry-run` checks the offline install in every job, so a stale or partial cache leads to the fallback, not to a browser that fails to launch.
- **One job per engine, in parallel.** Each engine's set is what that engine needs on a fresh runner, so a Chromium job doesn't unpack WebKit's 181 packages. The three fetches run in parallel.
- **One composite action,** because six jobs in two workflows install engines (CONTRIBUTING §6).

**What it costs.** A full run's critical path gains the `system-deps` legs on a hit: runner allocation, checkout and three cache lookups. The implementer measures it (witness 4). The CI-speed unit's full run took 518 s.

**Not adopted.**

- **An image or container with the packages.** `RD-6` excludes it on the owner's direction. Playwright's image also adds a second place to pin its version.
- **Another mirror,** for example pointing apt at `azure.archive.ubuntu.com`. It couples the gate to one provider's mirror that the runner didn't choose. It also leaves every job on the mirror's path.
- **Caching the archives inside each test job,** with no fetch job. It adds nothing to the critical path, but on a miss up to five jobs fetch in parallel, Chromium's set three times, and a slow mirror stalls a test job. The owner's direction asks for the opposite.
- **Caching the browsers.** Their CDN wasn't the stall.
- **Removing packages from Chromium's set,** such as the fonts. The visual baselines were recorded with them (`RD-9`).

### 3. Amendments that `RD-20` makes

- **`RD-6` property 2:** _"a job installs its engine with `npx playwright install --with-deps <engine>`"_ becomes _"a job installs its engine's system packages offline from the cache that `system-deps` fills, falling back to `aube exec -- playwright install --with-deps <engine>`, and its browser with `aube exec -- playwright install <engine>` (`RD-20`)"_.
- **`RD-6` property 8:** `verify` also needs `system-deps`.
- **`RD-12` property 11:** _"installs its engine with `npx playwright install --with-deps webkit`"_ becomes _"installs its engine as `RD-6` property 2 says"_.
- **`RD-15` property 5:** a reduced run also skips `system-deps`. Property 2's list of the jobs that make a run full doesn't change, because those jobs need `system-deps`.

## Item 1. The fetch job and the composite action (one commit)

**Required:**

- `.github/actions/browser/action.yml`, as `RD-21` property 2 says.
  - **A `using: composite` action.** Any third-party action it uses is pinned to a full commit hash, as `RD-6` property 9 requires. `actions/cache/restore` and `actions/cache/save` take the same hash as the `actions/cache` that the workflows already use.
  - **The key is computed in one place,** in a step or script that both the fetch job and the action use, so the two can't disagree.
  - **The archive directory is outside the checkout,** under `$RUNNER_TEMP`.
- `verify.yml`:
  - the `system-deps` job, as `RD-21` property 1 says;
  - `chromium`, `firefox`, `webkit`, `docs` and `measurements` replace their `playwright install --with-deps` step with the action, at the same position, after `aube ci`, and need `system-deps`;
  - `verify` needs `system-deps`, and expects `success` in full mode and `skipped` in reduced mode;
  - the header comment names `repo:RD-21`.
- `baselines.yml` replaces its install step with the action.
- No recipe changes. Installing system packages is the workflow's job, as it is today.

## Item 2. The record (one commit, after the pull request's runs)

The report is `.plan/ci-deps-1/ci-deps-report.md`, with each witness's run identifiers and excerpts saved under `checks/`.

**Witnesses,** read in the pull request's runs:

1. **Cold.** The first run's `system-deps` legs miss, fetch and save. For each leg, record the runner image, the mirror, the volume (it should match the table), and the duration.
2. **Warm.** A second run (a new commit, or a re-run). Every leg hits. In each of `chromium`, `firefox`, `webkit`, `docs` and `measurements`:
   - the log's install step shows no `Get:` from any `archive.ubuntu.com` host;
   - the dry run reports that every dependency is installed;
   - the tests run.

   Record each job's runner image, so the reading shows which pools ran the offline install. If none ran on `20261111.127.1`, say so: the property doesn't depend on the pool, but the incident was on that one.

3. **The fallback.** In a temporary commit that changes the action's key so that it misses, the job writes the warning and installs with `--with-deps`, and its tests pass. Revert that commit in the next one. Save the annotation and the step's log.
4. **The cost.** Record `system-deps`'s duration on a hit, each job's install-step duration on a hit, and the run's wall time. Compare them with the table's fast-pool install steps (19 to 41 s) and the CI-speed unit's 518 s.
5. **Reduced mode.** A `[noci]` commit that changes only this unit's record gets a reduced run in which `system-deps` is skipped and `verify` succeeds.
6. **The recording workflow.** Read its YAML; it isn't run in this unit. Its install step is the action, with no other change.

**Stop and return to the architect** in any of these cases:

- download-only mode doesn't give `playwright install-deps` the full set, so a fresh hit's dry run fails;
- `apt-get install --no-download` refuses the archives or needs the network;
- a hit installs a package version older than the image's, so apt asks for a downgrade.

Each of these means that the key or the method is wrong, and the fallback would only hide it.

## The second stop: the cause and item 1b

Decided by the architect on 2026-11-18 at `2c1fa4e22`. Evidence: [`checks/apt-no-download-source.txt`](checks/apt-no-download-source.txt).

**The cause, read in apt's source,** at 2.7.14 (noble's release), 2.8.2 and `main`, which agree:

- With `--no-download`, apt keeps an archive only if it is already in `Dir::Cache::Archives`, under apt's own file name (`<name>_<version>_<arch>.deb`) and with the size its index gives. apt checks no other place.
- A `.deb` named on the command line outside that directory gets a `file:` URI and is queued like a download. `--no-download` then drops it and fails with _"Unable to fetch some archives"_. The `file:` URI isn't exempt.
- The action named `$RUNNER_TEMP/system-deps/*.deb`, and the archive cache was still `/var/cache/apt/archives/`. So every archive counted as a fetch, in every job and for every engine. That matches five failures out of five.
- The log agrees. apt printed its recommended packages while it resolved, and then failed before it lists the new packages, so the log names no package.

**The implementer's hypothesis** was that apt prefers the repository's copy of the same version. That isn't the cause. Whichever source apt chooses, the check above looks in the archive cache under the same file name, so the fix holds in both cases. No diagnostic run is needed before the fix. The fixed run is the test.

**Within `RD-21`.** The install is still `apt-get install --no-download` on the archive files, with no `apt-get update`, and the fallback doesn't change. `RD-21` property 2.2 now states the requirement it was missing. The mechanism is unchanged, so the owner doesn't need to decide anything.

### Item 1b. The offline install reads the restored directory as apt's archive cache (one commit)

**Required:**

- **The offline install sets `Dir::Cache::Archives` to the restored directory, for that one command.** It keeps naming the files, `--no-download` and `--no-install-recommends`. The fetch already stored each archive under apt's file name in that directory, because `system-deps` set the same option. So the key and the cache entries don't change, and the three entries from run 44254065323 remain valid.
- **A failed offline install names its missing archives in the log, before the fallback.** The command to use is the same install with `--print-uris` in place of `--no-download`. apt then prints each archive it would fetch and fetches nothing. The two options can't be combined, because `--no-download` fails first. The warning annotation doesn't change.
- The action's comment says why the archive cache is set: under `--no-download`, apt keeps only archives that are in its archive cache.
- **The action doesn't save the directory.** apt leaves its lock and `partial/` there. Only `system-deps` saves, and its directory comes from the fetch.

**Witnesses,** in the next run of the pull request. Item 2's numbering and requirements stand.

- **Witness 2 reads the next run, whether or not the legs hit.** If the runner image's release is still `20261103`, the `system-deps` legs hit. (**A misreading,** corrected on 2026-11-18 from the feature proof's `reviewer-1`: `20261103.629` is the runner image provisioner's version, not the image's. The image was `20261111.127.1` or `20261111.370.1` in every job read, so the key's release was `20261111`. The conclusion stands, because the key didn't change between the runs.) If the release changed, the legs miss, fetch and save before any test job starts, so they also give a cold reading of witness 1. Either way, every test job restores a hit and runs the offline install. Record which case happened.
- In each test job, witness 2 also needs the following. The install step succeeds without the warning. It shows no `Get:` from any `archive.ubuntu.com` host. The dry run then passes.
- **Then witnesses 3 to 6 as item 2 says.** Witness 3's forced miss doesn't reach the `--print-uris` branch, and it doesn't need to.
- **The handoff's three stops still apply.** In particular: if the dry run fails on a hit, download-only mode didn't give the full set. If apt asks for a downgrade, the key is wrong. If `--print-uris` lists any archive, record its lines in `checks/`. They name the archive and the stop.

## Item 3. The feature proof's three findings

Decided by the architect on 2026-11-18, on the [feature proof](../reviews/ci-deps-1/feature-proof-claude.md) at `299e8d55e`, read at `754f15174`. Witnesses 1 to 6 hold, and there are three Tier C findings. All three are accepted. The architect corrected item 1b's premise above. The rest is this item: two commits, the code first.

**Commit 1, the code** (`reviewer-2`, `reviewer-3`):

- **`verify.yml`'s comment on `system-deps`** states `RD-21` property 4 as amended. That limit is the only place a slow mirror can fail a run when every test job's restore hits. A test job whose own restore misses falls back and can time out.
- **A hit whose entry holds no archive is a complete set** for that image. The action skips the offline install and goes on to the dry-run check, without reaching the mirror. If the check fails, the warning says _"the check found missing packages"_, and the fallback runs as for any failed check. Today the unexpanded `"$DIR"/*.deb` would reach apt as a literal path, report a failed install that didn't happen, and fall back to the mirror. `RF-58`'s property covers an empty set too: the cache holds the engine's whole set for that key, which is none.
- **An empty set must also reach the test jobs as a hit.** Read in `actions/cache`'s source at the pinned hash whether `save` stores a directory that holds no file, and report it. If it doesn't, `system-deps` puts one marker file in the directory before it saves, so the entry exists.
- **Witnesses:**
  - the shell of the action's install step, run locally against an empty directory with `sudo`, `apt-get` and `aube` stubbed on `PATH`. It shows that the install is skipped and the check runs. Save it under `checks/`;
  - the pull request's next run on this commit. Every test job hits, writes no warning, has no `Get:` from any `archive.ubuntu.com` host, and passes, as in witness 2.

**Commit 2, the report** (`reviewer-1`):

- **Each job's runner image** comes from the log's `Runner Image` group (`20261111.127.1` or `20261111.370.1`), and the key's release from `key.sh`'s `key=` line. Correct the report's text and every `image` column in `checks/`, and add the provisioner's version as a column of its own if it is kept.
- **Witness 2 names the pool.** The offline install ran without contacting a mirror on `20261111.127.1`, the incident pool, in `docs`, `firefox` and `chromium` of 44258255489 and in `docs` of 44261296408. The review's [`checks/job-images.tsv`](../reviews/ci-deps-1/checks/job-images.tsv) has the pairing: 5 of 5 jobs on `.127.1` used `us-east-2.ec2.archive.ubuntu.com`, and 8 of 8 on `.370.1` used `azure.archive.ubuntu.com`.
- **Witness 3 names the pool** of the cancelled `webkit` job and of `measurements`: `20261111.127.1`.
- Add the new run of commit 1 to the run table and to witness 2.

**Then the architect** records `RD-21` as implemented and closes `RF-58`, from the corrected report and this review.

## Verification and handoff

- Follow [`.agents/docs/handoff.md`](../../.agents/docs/handoff.md): `aube exec just fmt-check` at the root covers the YAML and the Markdown. Check the report's links.
- No test changes. The gate's own runs are the test.
- Don't change the records' status in `00-index.md`. The main slot's architect records `RD-21` as implemented from the report and the review.
- Commit item 1, push `repo/ci-deps-1`, and ask the coordinator for the pull request, since the witnesses need its runs. Then commit item 2 and push.