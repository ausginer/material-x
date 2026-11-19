# Merge-base size reading — repair plan

**Status: proposed.** Written by the architect on 2026-11-19, on the coordinator's task, on `repo/size-base-1` at `a3ce6d8b3` (`origin/repo/mx-size-1`, stacked on #68). It plans the repair of `repo:RF-65` inside the direction that entry already gives. **No identifier is minted and no record is edited:** the main slot's architect owns `RF-65`'s entry and the index, and [Proposed record changes](#proposed-record-changes) lists what this plan asks of them.

Canonical entry: `RF-65` — CI's merge-base size reading has failed on every pull request since `RD-7` was implemented, so no size comment shows a base or a difference ([`00-index.md`](../00-index.md)). Its required property: in a tree where only `aube ci` has run, `aube exec just size-reading <output>` exits 0 and writes every row that the root `just size` measures.

## Cause

**The size reading builds each measured package with the package's own `just build`, which runs `tsdown` directly.** A direct `tsdown` run doesn't build the workspace packages that the build configuration and the instruments import, and a tree where only `aube ci` has run has none of them built. The head side reads only because an earlier step built them.

- **On CI, now.** #68's run 44446773137 at `a3ce6d8b3`, whose merge base is `main`'s tip `bc7fe07d6`, fails the merge-base step as `RF-65` describes: `aube exec just build failed in …/_temp/base/packages/box-quad`, then `Cannot find module '…/_temp/base/node_modules/@ydinjs/vite-traits-plugin/index.js' imported from …/.scripts/tsdown-library.ts`, then the notice _"The merge base gave no machine-readable size reading"_. #66's run 44284889649 at `bdaf13ee2`, on merge base `a133bebee`, fails the same way ([CI excerpt](checks/ci-merge-base-failure.txt)).
- **In a fresh tree.** In a new worktree at `a3ce6d8b3` after `aube ci` only, `aube exec just size-reading` fails the same way. The architect then built each missing package by hand and ran the reading again, until it passed ([layers](checks/fresh-tree-layers.txt)). **Four packages are missing, not one:**

  | Missing build | Who needs it | How the reading fails without it |
  | --- | --- | --- |
  | `@ydinjs/vite-traits-plugin` | the builds of `box-quad`, `core`, `tproc`, `drag` and `material-x`, through `.scripts/tsdown-library.ts` | `tsdown` can't load its configuration |
  | `size-limit-preset-rolldown` | size-limit in `box-quad`, `core` and `material-x`, which loads the preset from the package's devDependencies | size-limit prints `{ "error": "… Cannot find module …/size-limit-preset-rolldown/index.js …" }`, and the script fails with `TypeError: rows.map is not a function` |
  | `@ydinjs/vite-custom-element-assets` | material-x's `build-prepare` (`.scripts/css/collect-props.ts`) and `build-lib` | `ERR_MODULE_NOT_FOUND` for `css/styles-import.js` |
  | `@ydinjs/tproc` | material-x's `build-prepare` (`src/text-field/styles/utils.ts`) | `ERR_MODULE_NOT_FOUND` for `selector.js` |

  With the four built, the reading exits 0 with 33 rows: `box-quad` 1, `core` 3, `material-x` 19, `drag` 10.

- **Every other package's build, alone in a fresh tree:** `box-quad`, `core`, `tproc` and `drag` fail on the plugin, and `material-x` fails first on `vite-custom-element-assets`. `vite-traits-plugin`, `vite-custom-element-assets` and `size-limit-preset-rolldown` build alone ([layers](checks/fresh-tree-layers.txt) §1). So every measured package fails as `box-quad` does. The reading stops at the first failure, which is why CI shows only `box-quad`'s.
- **nx already derives almost all of it.** nx's task graph for the measured packages' `build` target, read without building ([graphs](checks/task-graphs.txt)), orders the preset, `vite-custom-element-assets`, `tproc`, `core` and the plugin before the packages that need them. The edges come from package.json dependencies and from `implicitDependencies`, which `core`, `tproc` and `material-x` already set to the plugin, and `material-x` also to `vite-custom-element-assets`. **The only missing edges are `box-quad:build` and `drag:build` to `vite-traits-plugin:build`.** `RF-65`'s _"none declares the plugin"_ is true of `box-quad` and `drag` only.
- **`RF-65`'s _Not established_ question has an answer.** `_package-builds` builds `box-quad` after the plugin by schedule, not by declaration. The graph has no edge between them, and in run 44284889649 the plugin finished at 10:24:37.098 and `box-quad` at 10:24:38.107 ([CI excerpt](checks/ci-merge-base-failure.txt)). `box-quad` waits only for the preset, which finished at 37.228.
- **The root `just size` is ordered by schedule too.** In a fresh tree it exits 0. Only material-x's `size` target declares `dependsOn: ["^build"]`, and `nx.json`'s `targetDefaults` has no `size` key. So `box-quad:size`, `core:size` and `drag:size` depend on nothing, and they passed only because nx ran material-x's five prerequisite builds before them at `--parallel=1` ([graphs](checks/task-graphs.txt)). Nothing failed, so this is a latent defect, not an observed one.

## The repair

These properties hold after the repair. The implementer chooses the code.

1. **Two declarations.** `box-quad` and `drag` each declare `@ydinjs/vite-traits-plugin` in `implicitDependencies` in their `project.json`, as `core` and `tproc` do. `drag` declares it even though it reaches the plugin through `box-quad`: its own build imports the plugin through `.scripts/tsdown-library.ts`, so it mustn't depend on `box-quad`'s declaration. No other declaration is added, because nx derives every other prerequisite already.
2. **The reading builds through nx.** Before it reads, `.scripts/size-reading.ts` builds the packages it reads with one nx invocation of the `build` target, with `--skipNxCache` as the root recipes use it, so that nx's task graph builds each package's prerequisites first. It no longer runs a package's `just build` itself. The packages it builds and the packages it reads come from one list in the script, and the script keeps no list of prerequisites. Its doc comment states this.
3. **The root `just size` is ordered by declaration.** `nx.json`'s `targetDefaults` gives `size` the dependency `["^build"]`, and material-x's `project.json` loses its own `size` entry, which then says the same thing. Each package's `size` recipe still builds its own package first.
4. **An instrument's failure is named.** When an instrument's JSON isn't a list of rows, such as size-limit's `{ "error": … }` object, the script fails with the instrument's name (`box-quad: size-limit`) and the instrument's output. Today it fails with a `TypeError` that names neither.
5. **Unchanged:** `.github/workflows/verify.yml`, `.scripts/size-report.ts`, the size configurations, and the text of `RD-7` property 5. The merge-base step reads every base that contains the repair with that base's own instruments.

The [repair probe](checks/repair-probe.txt) applied properties 1 and 2 by script in a fresh tree. The reading exited 0 with the same 33 rows, byte-identical to the reading taken after building every prerequisite by hand. The probe isn't the repair: it doesn't cover properties 3 and 4, and it isn't formatted.

**Out of scope:** the hand-kept project lists in the root `Justfile` (`_package-builds`, `build`, `typecheck-declarations` and the rest). After property 1, `_package-builds` builds `box-quad` after the plugin by declaration, and no list changes an outcome.

### Why

- **The direction's place.** `RF-65` directs that the prerequisite is declared once, where the build order is derived. nx derives it for every other target already, and three packages declare the plugin there already. The two missing declarations complete the graph, and the reading and `just size` then use it.
- **A missing declaration fails, not passes by schedule.** With the reading on nx, a package that needs a build but doesn't declare it can still pass by schedule, as `box-quad` does today in `_package-builds`. Witness 3 checks the graph itself, so a reviewer doesn't rely on an exit code that schedule can produce.
- **Property 4** costs one check. Without it, the next base that can't give a reading shows a `TypeError` in its log and not the instrument's message, and the diagnosis repeats this plan's layering by hand.

### Not adopted

- **Building every package (`nx run-many -t build --all`) in the reading.** It builds packages the reading doesn't need, and it orders nothing that the measured packages' graph doesn't order already.
- **A build step in the workflow before the base reading,** such as `just _package-builds` in the base tree. The base tree's reading must work from that tree's own instruments (`RD-7` property 5), and a local reading in a fresh tree would still fail. It's also a second, hand-kept list.
- **The plugin as a devDependency of `box-quad` and `drag`.** nx would derive the same edge from it. But neither package's source imports the plugin, only the shared build helper does, and it would add a link and a lockfile change. `implicitDependencies` is how `core`, `tproc` and `material-x` say it now.

## How a reviewer proves it

Each witness is saved in this record's `checks/` with the command, the commit and the output.

1. **A fresh tree reads (`RF-65` witness 1).** In a new worktree at the repair's commit, after `aube ci` only, `aube exec just size-reading <file>` exits 0 and writes every row that the root `just size` measures: 33 at `a3ce6d8b3`, or the count the size configurations give at the repair's commit. In a new worktree at the parent commit, the same commands exit non-zero at `box-quad`'s build with the plugin's _"Cannot find module"_.
2. **The ordering changes nothing measured.** Witness 1's reading is byte-identical to a reading taken in a tree where every package was built first, for example after `aube exec -- nx run-many -t build --all --skipNxCache`.
3. **Declared, not scheduled.** `nx run-many … --graph=<file>`, read without building:
   - for `-t build --projects=box-quad,core,material-x,drag`, `vite-traits-plugin:build` is a dependency of `box-quad:build` and of `drag:build`;
   - for `-t size --projects=box-quad,core,drag,material-x`, each `size` task depends on its package's prerequisite builds.

   **Mutation:** with `box-quad`'s declaration removed, the first graph loses that edge. Restore it afterwards.

4. **An instrument's failure is named.** A mutation that makes size-limit print its `{ "error": … }` object, for example a row in `box-quad`'s `.size-limit.json` whose path doesn't exist. The reading then fails naming `box-quad: size-limit` and quoting the error. The architect saw size-limit print that object for a missing file. Restore the configuration afterwards.
5. **The report shows a real base comparison (`RF-65` witness 2).**
   1. **Locally, before merge.** Repeat the merge-base step's commands: a worktree at the repair's commit as the base, `aube ci`, `aube exec just size-reading base.json`. The head is the same commit plus a probe change that adds bytes to one measured entry. Then `aube exec just size-report --head head.json --base base.json --out report.md`. The Markdown shows a base and a difference for every row, and a non-zero difference only for the probed row. Save the Markdown. This writes nothing to GitHub.
   2. **On CI, before merge, if the owner allows it.** The workflow runs `pull_request` for any base branch, and `measurements` skips only drafts. A non-draft pull request from a probe branch onto `repo/size-base-1` has the repair as its merge base, so its comment shows the base and the difference. It writes to GitHub, so it needs the owner's approval. It's closed unmerged afterwards.
   3. **On CI, after merge.** The first pull request whose merge base on `main` contains the repair shows a base reading and the differences. A pull request whose merge base predates the repair still says "No base reading", as `RD-7` property 5 allows. That isn't a failure of the repair.

**Cost.** The probe's whole reading took 10.7 s in the dev container (12 processors), including every build. In run 44284889649, `measurements` took 2 min 44 s of its 10 min limit. Building the prerequisites again in the base tree adds seconds.

## What the closure needs

`RF-65` closes when:

- the repair is merged to `main`;
- witnesses 1 to 4 and 5.1 are saved in this record, and a feature proof has read them;
- witness 5.2 or 5.3 is observed, and its run and comment are recorded.

Between the merge and that observation, the entry is repaired and witness 2 is pending. Then the dated notes that `RF-65` caused are closed, as the main architect words them: `RD-7`'s _"the merge-base reading … has failed on every pull request"_, and `RD-24`'s _"the comment shows no base or difference while `RF-65` is open"_.

**The _added_ marks of material-x's rows** stay unobserved. #68 merges first, so the first base that contains the repair already has those rows. The [size plan](../mx-size-1/mx-size-plan.md) already says #68 doesn't owe them. A later added or removed row shows the marks.

## Order

This branch is stacked on #68. When #68 merges, `origin/main` is merged into it, never rebased (`RD-17`). The implementation is the next unit on this branch, for the implementer. Witness 5.2 needs the owner's decision, through the coordinator.

## Proposed record changes

For the main slot's architect. This plan doesn't edit them.

- **`RF-65`, _Why the head side reads_:** _"Each needs the plugin's build, and none declares the plugin"_ is wrong for three of the four packages. `core` and `tproc` declare it in `implicitDependencies`, and `material-x` does too. `box-quad` and `drag` don't. Add that the fresh-tree reading also lacks `size-limit-preset-rolldown`, `vite-custom-element-assets` and `tproc`, which nx derives already ([Cause](#cause)).
- **`RF-65`, _Not established_:** answered. `_package-builds` orders `box-quad` after the plugin by schedule only (run 44284889649).
- **`RF-65`, an observation to add:** the root `just size` orders `box-quad`, `core` and `drag`'s `size` tasks by schedule. It passes in a fresh tree today.
- **`RF-65`, _The architect's direction_:** add the link to this plan, its properties 1 to 5, its witnesses (which refine witnesses 1 and 2 and add 3 and 4), and its closure conditions.
- **No new decision.** The repair stays inside `RF-65`'s direction and `RD-7` property 5. The `size` default in `nx.json` is where the build order is derived, which the direction names.