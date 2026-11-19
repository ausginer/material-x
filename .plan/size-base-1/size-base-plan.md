# Merge-base size reading — repair plan

**Status: proposed, and the owner chooses.** Written by the architect on 2026-11-19, on the coordinator's task, on `repo/size-base-1`. It plans the repair of `repo:RF-65`. **No identifier is minted and no record is edited:** the main slot's architect owns `RF-65`'s entry, `RD-7` and the index, and [Proposed record changes](#proposed-record-changes) lists what this plan asks of them.

- **First version,** at `a3ce6d8b3` (`7faee4441`): repair the base build inside `RF-65`'s direction. That is option (d) below.
- **Revised the same day, at `9300123a0`,** for the owner's question, relayed by the coordinator: _"Can't we keep main's size table in a file somewhere on main, and update it from main's build results? Building main again in every PR just to compare sizes… I'm even ready to give up the comparison if the idea with stored data doesn't work."_ He then added that any store will do, such as the wiki, an issue or a comment, an artifact, a cache entry or a third-party service. What he wants to avoid is building main in every pull request. The [options](#options) compare those stores, and the [recommendation](#recommendation) changes the repair to a stored reading. The first version's property 4, which named an instrument's failure, is dropped for less machinery.

Canonical entry: `RF-65` — CI's merge-base size reading has failed on every pull request since `RD-7` was implemented, so no size comment shows a base or a difference ([`00-index.md`](../00-index.md)).

## Cause

**The size reading builds each measured package with the package's own `just build`, which runs `tsdown` directly.** A direct `tsdown` run doesn't build the workspace packages that the build configuration and the instruments import, and a tree where only `aube ci` has run has none of them built. The head side reads only because an earlier step built them.

- **On CI, now.** #68's run 44446773137 at `a3ce6d8b3` has merge base `bc7fe07d6`, which is `main`'s tip. It fails the merge-base step as `RF-65` describes. The step logs `aube exec just build failed in …/_temp/base/packages/box-quad`, then `Cannot find module '…/_temp/base/node_modules/@ydinjs/vite-traits-plugin/index.js' imported from …/.scripts/tsdown-library.ts`, then the notice _"The merge base gave no machine-readable size reading"_. #66's run 44284889649 at `bdaf13ee2`, on merge base `a133bebee`, fails the same way ([CI excerpt](checks/ci-merge-base-failure.txt)).
- **In a fresh tree.** In a new worktree at `a3ce6d8b3` after `aube ci` only, `aube exec just size-reading` fails the same way. The architect built each missing package by hand and ran the reading again until it passed ([layers](checks/fresh-tree-layers.txt)). **Four packages are missing, not one:**

  | Missing build | Who needs it | How the reading fails without it |
  | --- | --- | --- |
  | `@ydinjs/vite-traits-plugin` | the builds of `box-quad`, `core`, `tproc`, `drag` and `material-x`, through `.scripts/tsdown-library.ts` | `tsdown` can't load its configuration |
  | `size-limit-preset-rolldown` | size-limit in `box-quad`, `core` and `material-x`, which loads the preset from the package's devDependencies | size-limit prints `{ "error": "… Cannot find module …/size-limit-preset-rolldown/index.js …" }`, and the script fails with `TypeError: rows.map is not a function` |
  | `@ydinjs/vite-custom-element-assets` | material-x's `build-prepare` (`.scripts/css/collect-props.ts`) and `build-lib` | `ERR_MODULE_NOT_FOUND` for `css/styles-import.js` |
  | `@ydinjs/tproc` | material-x's `build-prepare` (`src/text-field/styles/utils.ts`) | `ERR_MODULE_NOT_FOUND` for `selector.js` |

  With the four built, the reading exits 0 with 33 rows: `box-quad` 1, `core` 3, `material-x` 19, `drag` 10.

- **Every other package's build, alone in a fresh tree:** `box-quad`, `core`, `tproc` and `drag` fail on the plugin, and `material-x` fails first on `vite-custom-element-assets`. `vite-traits-plugin`, `vite-custom-element-assets` and `size-limit-preset-rolldown` build alone ([layers](checks/fresh-tree-layers.txt) §1). So every measured package fails as `box-quad` does. The reading stops at the first failure, which is why CI shows only `box-quad`'s.
- **nx already derives almost all of it.** nx's task graph for the measured packages' `build` target, read without building ([graphs](checks/task-graphs.txt)), orders the preset, `vite-custom-element-assets`, `tproc`, `core` and the plugin before the packages that need them. Some edges come from package.json dependencies. The others come from `implicitDependencies`: `core`, `tproc` and `material-x` set it to the plugin, and `material-x` also to `vite-custom-element-assets`. **The only missing edges are `box-quad:build` and `drag:build` to `vite-traits-plugin:build`.** `RF-65`'s _"none declares the plugin"_ is true of `box-quad` and `drag` only.
- **`RF-65`'s _Not established_ question has an answer.** `_package-builds` builds `box-quad` after the plugin by schedule, not by declaration. The graph has no edge between them. In run 44284889649 the plugin finished at 10:24:37.098 and `box-quad` at 10:24:38.107 ([CI excerpt](checks/ci-merge-base-failure.txt)). `box-quad` waits only for the preset, which finished at 37.228.
- **The root `just size` is ordered by schedule too.** In a fresh tree it exits 0. Only material-x's `size` target declares `dependsOn: ["^build"]`, and `nx.json`'s `targetDefaults` has no `size` key. So `box-quad:size`, `core:size` and `drag:size` depend on nothing. They passed only because nx ran material-x's five prerequisite builds before them at `--parallel=1` ([graphs](checks/task-graphs.txt)). Nothing failed, so this is a latent defect, not an observed one.

## Options

The letters follow the coordinator's task: (a) a committed file on `main`, (b) a reading that CI stores elsewhere, (c) no comparison, and (d) this plan's first version, which builds the base. The owner widened (a) and (b) to any store, so the wiki, an issue and a third-party service are rows of the same table.

What `RD-7` property 5 requires the comment to show: each row's reading at the head and at the merge base, the difference, the limit at the head, and _added_ or _removed_ marks. Today it requires both sides to be measured _"in the same job, on the same runner, each tree with its own instruments"_. Facts used below are in [alternatives facts](checks/alternatives-facts.txt).

- **CI time is not what (d) costs.** In #68's run 44446773137, the head reading took 6.4 s after `just test` had built the prerequisites. A repaired base reading adds `aube ci` from the cache (about 1 s), the same builds and the four prerequisite builds: about 10 s, estimated. `measurements` is outside the gate (`RD-7` property 4). It finished at 02:55:21 and `chromium`, which `verify` waits for, at 03:00:41. So the base build lengthens no pull request's wait. What (d) costs is a second build in every run, which the owner doesn't want.
- **`main` already measures itself.** `measurements` runs on every full push to `main` and writes the head reading to the job summary. Every store below only keeps that reading. None adds a build.

### The stores

| Store | What writes it, and the permission | How a pull request finds its merge base's reading | Missing or stale | Retention | A fork's pull request |
| --- | --- | --- | --- | --- | --- |
| **(a) Committed file on `main`** | Nothing can. The "Main protection" ruleset requires a pull request and `verify`, and has no bypass actors. Adding one is a rule change that only the owner can make. The variants that remain: a workflow opens a refresh pull request after each merge, for the owner to merge; or each pull request commits its own reading | `git show <merge base>:<file>`, without a build | A refresh pull request lags until the owner merges it. A self-committed reading is wrong when the author forgets it, and the warning can't gate (`RD-7` property 4). Concurrent pull requests conflict on the rows they both change | Permanent | Yes |
| **Wiki** | The wiki is disabled (`has_wiki: false`). The owner would have to enable it, and the job pushes to the wiki's git repository with `contents: write`. This plan hasn't verified that `GITHUB_TOKEN` can push to a wiki | A file per commit in a clone of the wiki | Missing when `main`'s run didn't write it. Two `main` runs that push at once race | Permanent, and it grows | Yes, it's public |
| **Issue or comment** | `main`'s run, with `issues: write`, posts a comment for each commit on one dedicated issue | Page through that issue's comments for the commit | Missing when `main`'s run didn't write it | Permanent | Yes |
| **(b) Workflow artifact** | `main`'s run uploads its reading. Uploading needs no extra permission | Find `verify.yml`'s push run for the merge base's commit with the API, then `gh run download` it. This needs `actions: read`, which `scope` already uses for the same kind of lookup | Missing when `main`'s run for that commit hasn't uploaded yet, a pull request pushed within about 8 min of a merge, was reduced, or crashed. Never stale: one reading per commit | 90 days, the repository's setting and GitHub's maximum | Yes. A fork's token is read-only, which covers `actions: read`. Not observed here, because no fork has opened a pull request |
| **(b) Cache entry** | `main`'s run saves it under a key that names the commit. Saving needs no permission | Restore that exact key. A pull request's run may restore its base branch's caches | Missing as for the artifact, and also after an eviction | An entry unused for 7 days is evicted. Above 10 GB the least recently used go first. The repository holds 4.6 GB in 30 entries now, mostly aube stores and Node caches | Yes |
| **Third-party service** | A service such as Bencher, or Codecov's bundle analysis. The writer needs a secret token | The service's own comparison | The service's rules | The service's | A fork's job gets no secrets, so it can't upload. Codecov's bundle analysis measures its bundler plugin's output, not size-limit's rows or drag's compositions, so it would also replace `RD-7`'s instruments |

### The options in short

|  | (b) Stored by CI: the workflow artifact | (b) Stored by CI: the cache entry | (c) No comparison | (d) The base build (first version) |
| --- | --- | --- | --- | --- |
| **CI work** | Upload on `main`, about 2 s. Download on a pull request, about 2 s. Both estimated | As the artifact | The base step goes | About 10 s, estimated, off the critical path |
| **Machinery** | The base step's build becomes a lookup and a download. `main` gets one upload step. The job gets `actions: read` | One save step and one restore step | Less: the base step and the base, difference and mark code in `size-report.ts` (about 30 lines and their tests) go | None new: two declarations, one nx invocation instead of two `just build` calls, and one `nx.json` default |
| **What the comment loses** | A base for a merge base whose reading is missing or older than 90 days. Then the comment says "No base reading" and why | As (a), and more often: also after 7 idle days or an eviction | The base, the difference and the marks. material-x has no limits until its first release (`RD-24`), so its rows then show numbers with nothing to compare. A unit's own before-and-after reading (CONTRIBUTING §15, `RD-24` property 5) is the only signal, as it has been since #27 | Nothing |
| **`RD-7`** | Property 5's _"in the same job, on the same runner"_ becomes _"the reading that `main`'s own run took at the merge base, with that tree's instruments"_. Its **Why** _"depends on no artifact from an earlier run, which can be missing or expired"_ is reversed | As the artifact | Property 5 loses the base, the difference and the marks. `RD-24`'s _"the pull requests' comments show it"_ goes. `RF-65` closes by the amendment | Unchanged |
| **Comparability** | Two runs. Node is `26` without a minor version, and the runner image changes, so a difference can include the toolchain. `main`'s run that stored the base used the toolchain current when that commit merged | As the artifact | Not applicable | One job: the same toolchain on both sides |

## Recommendation

**(b), with the workflow artifact: main's own reading, kept as a workflow artifact of `main`'s push run and found by the merge base's commit.** The owner wants no base build in every pull request, and (a) keeps the whole comparison under that condition.

- **It adds the least of the stores.** The run that writes the reading measures `main` already. The lookup is the one `scope` already makes, with the permission it already has.
- **It finds any merge base, not only `main`'s tip.** One reading per commit can't be stale. A missing reading takes the report's existing "No base reading" path.
- **Its retention is fixed and long.** The cache is simpler to read, but an eviction that other caches cause can take a reading away. A committed file has no writer under the ruleset. The wiki and an issue add a public, editable store and noise in the work queue (`RD-22`). A third-party service needs secrets that a fork's job doesn't get.
- **(c) is the alternative if (b) still looks like too much.** It removes machinery instead of moving it, but it loses the comparison while material-x has no limits.
- **(d) costs no wall-clock time** and is the smallest change, but it builds `main` in every run, which the owner rejected.

## The repair, for (b) with the artifact

These properties hold after the repair. The implementer chooses the code. Properties 1 to 3 are the first version's. They no longer serve the base build, but `main`'s stored reading is now the base of every pull request, so it must not depend on schedule.

1. **Two declarations.** `box-quad` and `drag` each declare `@ydinjs/vite-traits-plugin` in `implicitDependencies` in their `project.json`, as `core` and `tproc` do. `drag` declares it even though it reaches the plugin through `box-quad`. Its own build imports the plugin through `.scripts/tsdown-library.ts`, so it mustn't depend on `box-quad`'s declaration. No other declaration is added, because nx derives every other prerequisite already.
2. **The reading builds through nx.** Before it reads, `.scripts/size-reading.ts` builds the packages it reads with one nx invocation of the `build` target, with `--skipNxCache` as the root recipes use it. nx's task graph then builds each package's prerequisites first. The script no longer runs a package's `just build` itself. The packages it builds and the packages it reads come from one list in the script, and it keeps no list of prerequisites. So the reading doesn't depend on `just test` running before it.
3. **The root `just size` is ordered by declaration.** `nx.json`'s `targetDefaults` gives `size` the dependency `["^build"]`, and material-x's `project.json` loses its own `size` entry, which then says the same thing. Each package's `size` recipe still builds its own package first.
4. **`main` stores its reading.** On a push to `main`, `measurements` uploads its head reading as an artifact of that run, with one fixed name. The upload's retention is the repository's: 90 days.
5. **A pull request reads its merge base's reading.** The base step computes the merge base as it does now. It finds `verify.yml`'s push run for that commit and downloads the artifact. It builds nothing and runs no worktree. `measurements` gets `actions: read`.
6. **A missing reading is stated.** No run, no artifact, or an expired artifact leaves no base file. The report then says "No base reading" and that `main`'s run for that commit stored none. The job succeeds, as `RD-7` property 4 requires. Today's sentence, _"the merge base gave no machine-readable reading"_, changes to fit.
7. **Unchanged:** the head side, the comment's form and marker, the fork rule (the comment only for this repository's own pull requests), and the size configurations.

The [repair probe](checks/repair-probe.txt) applied properties 1 and 2 by script in a fresh tree. The reading exited 0 with the same 33 rows, byte-identical to the reading taken after building every prerequisite by hand. The probe isn't the repair. It doesn't cover the other properties, and it isn't formatted.

**Out of scope:** the hand-kept project lists in the root `Justfile` (`_package-builds`, `build`, `typecheck-declarations` and the rest). After property 1, `_package-builds` builds `box-quad` after the plugin by declaration, and no list changes an outcome.

### Not adopted

- **The other stores and options:** [Recommendation](#recommendation).
- **Searching older ancestors when the merge base's reading is missing.** A reduced run changes only records and Markdown, so an ancestor's reading would often be right. But the search is machinery for a rare case, and "No base reading" is honest.
- **Naming an instrument's failure** (the first version's property 4). The script still fails, and the log shows it. The owner prefers less machinery.
- **Building every package (`nx run-many -t build --all`) in the reading.** It builds packages the reading doesn't need, and it orders nothing that the measured packages' graph doesn't order already.
- **The plugin as a devDependency of `box-quad` and `drag`.** nx would derive the same edge from it. But neither package's source imports the plugin: only the shared build helper does. It would also add a link and a lockfile change. `implicitDependencies` is how `core`, `tproc` and `material-x` declare it now.

## How a reviewer proves it

Each witness is saved in this record's `checks/` with the command, the commit and the output.

1. **A fresh tree reads.** In a new worktree at the repair's commit, after `aube ci` only, `aube exec just size-reading <file>` exits 0. It writes every row that the root `just size` measures: 33 at `a3ce6d8b3`, or the count that the size configurations give at the repair's commit. In a new worktree at the parent commit, the same commands exit non-zero at `box-quad`'s build with the plugin's _"Cannot find module"_.
2. **The ordering changes nothing measured.** Witness 1's reading is byte-identical to a reading taken in a tree where every package was built first, for example after `aube exec -- nx run-many -t build --all --skipNxCache`.
3. **Declared, not scheduled.** `nx run-many … --graph=<file>`, read without building:
   - for `-t build --projects=box-quad,core,material-x,drag`, `vite-traits-plugin:build` is a dependency of `box-quad:build` and of `drag:build`;
   - for `-t size --projects=box-quad,core,drag,material-x`, each `size` task depends on its package's prerequisite builds.

   **Mutation:** with `box-quad`'s declaration removed, the first graph loses that edge. Restore it afterwards.

4. **`main` stores its reading.** The first push to `main` after the merge has the artifact. Its content is the same reading as that run's job summary, with every row.
5. **A pull request shows a real base comparison.** The first pull request whose merge base is a commit from witness 4 or later shows a base and a difference for every row. A probe change that adds bytes to one measured entry shows a non-zero difference for that row only. A pull request that has no other size change shows zero differences.
6. **A missing reading is stated.** A pull request whose merge base has no artifact, such as one that predates the merge, says "No base reading" and why, and `measurements` succeeds. The lookup can also be tried by hand with `gh` against a `main` commit without an artifact.

Witnesses 4 to 6 can only be observed after the merge, because only a push to `main` stores a reading. Before the merge, a reviewer reads the workflow and runs the lookup by hand with `gh`, read-only, against any `main` push run, where it finds no artifact. That shows the missing-reading path.

## What the closure needs

`RF-65` closes when:

- the owner has chosen, and the main architect has amended `RD-7` (or, for (d), not);
- the repair is merged to `main`;
- witnesses 1 to 3 are saved in this record, and a feature proof has read them;
- witnesses 4 to 6 are observed, and their runs and comments are recorded.

Between the merge and those observations, the entry is repaired and witnesses 4 to 6 are pending. The dated notes that `RF-65` caused are then closed, in the main architect's words: `RD-7`'s _"the merge-base reading … has failed on every pull request"_, and `RD-24`'s _"the comment shows no base or difference while `RF-65` is open"_.

**The _added_ marks of material-x's rows** stay unobserved. The first base that has a stored reading already has those rows. The [size plan](../mx-size-1/mx-size-plan.md) already says #68 doesn't owe them. A later added or removed row shows the marks.

**If the owner chooses (c),** `RF-65` closes by the amendment alone. The properties 1 to 3 are still worth their few lines, so that the head reading doesn't pass by schedule, but they aren't owed.

## Order

This branch carries `main` at `91fc5d662` (#68), merged at `9300123a0`, never rebased (`RD-17`). The owner chooses among (a) to (d), and for (b) between the artifact and the cache, through the coordinator. The main architect then records the choice and any amendment of `RD-7`, and the implementer implements it on this branch.

## Proposed record changes

For the main slot's architect. This plan doesn't edit them.

- **`RF-65`, _Why the head side reads_:** _"Each needs the plugin's build, and none declares the plugin"_ is wrong for three of the four packages. `core`, `tproc` and `material-x` declare it in `implicitDependencies`. `box-quad` and `drag` don't. Add that the fresh-tree reading also lacks `size-limit-preset-rolldown`, `vite-custom-element-assets` and `tproc`, which nx derives already ([Cause](#cause)).
- **`RF-65`, _Not established_:** answered. `_package-builds` orders `box-quad` after the plugin by schedule only (run 44284889649).
- **`RF-65`, an observation to add:** the root `just size` orders the `size` tasks of `box-quad`, `core` and `drag` by schedule. It passes in a fresh tree today.
- **`RF-65`, _The architect's direction_ and _Required property_:** link this plan. For (b), the required property becomes _"each pull request's comment compares the head with the reading that `main`'s own run stored for the merge base, or says that none is stored"_, with this plan's witnesses and closure. For (d), the current required property stays.
- **`RD-7` property 5 and its **Why**, for (b) or (c):** amended as the [options](#the-options-in-short) table says, dated, with the owner's words as the reason. This is the owner's decision to record. The main architect words it.