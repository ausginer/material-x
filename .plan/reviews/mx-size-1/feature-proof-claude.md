# material-x's size rows (`RD-24`, `RF-45`): feature proof

**Files were read at:** `2a6231671` (`repo/mx-size-1`, from `origin`), detached in a scratch worktree outside the slots. **Diff reviewed:** `b77795e25..2a6231671`. That is `packages/material-x/.size-limit.ts`, material-x's `package.json`, `project.json`, `tsconfig.json` and `Justfile`, the root `Justfile`, `.scripts/size-reading.ts`, `package-lock.json`, the plan's implementation note, and the plan's two new `checks/`. `b77795e25` is a merge of `main` and isn't reviewed. Pull request [#68](https://github.com/ausginer/material-x/pull/68)'s head is now `335a545a1`, which merges `main` again and re-reads the rows. That commit is outside this proof, except where CI's comment on it is cited.

**Governing records:** `repo:RD-24` and its properties 1 to 8 in the [size plan](../../mx-size-1/mx-size-plan.md#decision-registered-as-repord-24), the plan's [Implementation](../../mx-size-1/mx-size-plan.md#implementation) steps 1 to 4, `repo:RF-45`, and `repo:RD-7` property 5 ([`00-index.md`](../../00-index.md)). The rows have no ceiling until material-x's first publication. The ceiling witness (step 6) isn't part of this unit.

**Lens:** feature proof. Each claim below is my own reading of the tree, of CI, or of a local run in the scratch worktree, unless it says otherwise. My runs are saved in [`checks/feature-proof-probes.txt`](checks/feature-proof-probes.txt). Nothing is repaired, and no record is amended.

**Verdict: the unit meets properties 1 to 4 and 8, and its share of properties 5 to 7.** The rows, the instrument, the ordering and the reading hold. I reproduced the reading to the byte. The root `just size`'s `--parallel=1` is the smallest change that closes the ordering hazard (_Serialization_, below).

- **`reviewer-1`, Tier B, outside the unit's diff:** CI never builds the merge-base tree, so no size comment has ever shown a base or a difference. `RD-24` property 5 relies on that difference before release.
- **`reviewer-2`, Tier C:** the size configuration's comment leaves out two clauses of property 6.

## Scope

**Covered.**

- **Property 1, the rows.** `.size-limit.ts` builds ``{ name: entry, path: `${entry}.js` }`` for each entry of `files.json`'s `runtime`, in that order, and one row named `complete`. `complete` measures one generated module, `node_modules/.cache/size-limit/complete.js`, with one side-effect `import` per entry. That directory is ignored by `/packages/*/node_modules`. No row lists several files. `react`, the type-only entry, has no row. The module imports each entry by its absolute path. My worktree's package root is 68 characters longer than slot `d`'s, and `complete` still reads 17,258 B, so the path doesn't reach the measured output.
- **Property 2, one list.** The rows are a function of `files.json`. The build's entries come from the same file (`tsdown.config.ts`, through `packageFilesToTsdownEntries`), so the configuration has no second list. I repeated the implementer's case (b) without the `complete` row, to check that an entry row fails by itself: a row whose built file is missing makes size-limit exit 1. Rolldown's message there is `You must supply options.input`, which doesn't name the row. The property only requires the failure. I didn't repeat case (a).
- **Property 3, the instrument.**
  - `size-limit` `14.3.0` and `size-limit-preset-rolldown` `0.1.0` are exact devDependencies, as in `core` and `box-quad`. The preset is the workspace package `packages/size-limit-preset-rolldown`. The lockfile links it (`"resolved": "packages/size-limit-preset-rolldown", "link": true`).
  - The preset's version is written by hand. `implementer.md` says to use `aube add` _"so the latest compatible version is resolved"_, but that reason doesn't apply to a workspace package. The hand-written version matches how `core` and `box-quad` declare the preset.
  - `aube install --frozen-lockfile` passes. `--fix-lockfile` leaves `package-lock.json` unchanged.
  - That `--fix-lockfile` dropped `node_modules/@ydinjs`, as `RF-48` records, and my next root `just size` failed in `core:build`. After `--frozen-lockfile --force` the links were back. The failure was in my install, not in the unit.
  - size-limit 14.3.0 finds `.size-limit.ts` (`get-config.js`: `searchPlaces` lists it, with `'.ts': dynamicImport`), and `SizeLimitConfig` is its exported type.
  - The `size` recipe builds material-x first, as `core`'s does, and the `size` script is `just size`.
  - The root `just size` lists material-x, and `.scripts/size-reading.ts` reads it after `core`. In my `size-reading` output, the packages are in the order `box-quad`, `core`, `material-x`, `drag`.
- **Property 4.** The preset reports Brotli only, and the reading parses `size` alone.
- **Properties 5 to 7, the unit's share.** No row has a `limit`, and each row's `limit` is `null` in the reading JSON. material-x's `just size` and the root `just size` exit 0. The comment that property 6 asks for exists and names `repo:RD-24` (`reviewer-2`). `RD-7` property 5's parenthesis doesn't list material-x yet. `RD-24` assigns that note to the main slot's architect when the rows land, so it isn't owed by this unit.
- **Property 8.** No instruction in `.agents/`, `.claude/` or `CONTRIBUTING.md` tells a unit to bundle material-x's entries with another tool. The only `esbuild` mention is `.agents/docs/measure/brief.md`, about size-limit's own plugin.
- **The reading** ([`rd24-reading.txt`](../../mx-size-1/checks/rd24-reading.txt)). My root `just size-reading` gives 19 material-x rows, in `files.json` order then `complete`. Each figure equals the implementer's, and `complete` is 17,258 B. I didn't re-run the probe's own script. So the claim that the probe, re-run at this tree, matches to the byte is the implementer's.
  - The attribution of the moved rows to #61, #37 and #39 agrees with history. Those are the three commits in `377ca72df..b77795e25` that touch `packages/material-x/src` or `packages/core/src`.
  - The reading says outright that it didn't read which change moves which row. It also explains `complete`'s equal figure as two changes that cancel: +16 B from the source changes, −16 B from the effect-import form.
- **Gates.** material-x's `typecheck` and `lint` pass, and `lint` covers `.size-limit.ts`. `fmt-check` passes on the changed TypeScript and JSON files and on `.scripts/size-reading.ts`.
- **CI, step 4.** #68's `measurements` job succeeded at `335a545a1`. Its comment lists material-x's 19 rows with no limit, under "No base reading", so none is marked added (`reviewer-1`).

**Serialization.** The coordinator asked whether `--parallel=1` is the smallest fix.

- **The hazard is real by construction, and I didn't observe it.**
  - material-x's `size` target depends on `^build`. That brings `core:build` into `just size`'s task graph, which had no `build` task before.
  - At nx's default parallelism, nothing orders `core:size` after `core:build`, or `material-x:size` after `core:size`.
  - `core:size` runs core's `just build`, and core's tsdown writes its output in place (`clean: false`). So two tasks can write core's files, or one can write them while material-x's build or bundle reads them.
  - In six static and three streamed runs at default parallelism, nx happened to finish `core:size` before `material-x:size` started. All nine runs succeeded, and the six static runs printed the same material-x readings as the serialized run.
- **The cost is local only.** Over three runs each, `just size` takes 8.5 s at default parallelism and 12.7 s serialized. CI doesn't run `just size`. `.scripts/size-reading.ts` measures the packages one after another anyway.
- **The alternatives are larger.**
  - An ordering edge from `material-x:size` to `core:size` would make `nx run material-x:size` run core's size-limit as well.
  - Dropping `^build` would leave a fresh tree with no built core, plugins or preset when material-x is measured.
  - `--parallel=1` is one flag in one recipe. It also closes the hazard between `core:build` and `core:size`, which only this unit's `^build` creates.

**Not covered.**

- I didn't repeat the implementer's witness case (a), a new `files.json` entry getting a row, or re-run the probe's script.
- I didn't run the tests. The unit changes no runtime source and no test.
- `335a545a1`'s re-read rows, and the polyfill change from #59 that moves them, are outside this proof.

## Findings

### The merge-base tree is never built, so no size comment shows a base or a difference

- **`reviewer-1`, Tier B,** an instrument the repository relies on is unsound. It is outside the unit's diff: the unit changes no workflow, and the defect is older than the unit.
- **Observed.** `verify.yml`'s _Sizes at the merge base_ step runs `aube ci` in the base worktree and then `just size-reading`. Nothing builds the workspace packages between those two commands. `size-reading.ts` runs `just build` in `box-quad` first, which imports `@ydinjs/vite-traits-plugin/index.js`, and in the base worktree that file doesn't exist.
  - On #68 (run 44279774938, job 134717402054) and on #66 (run 44279730764, job 134717314490), the step logs `Cannot find module '…/_temp/base/node_modules/@ydinjs/vite-traits-plugin/index.js'` and the notice _"The merge base gave no machine-readable size reading"_.
  - The size comments of #37, #38, #39, #59, #61, #66 and #68 all open with **"No base reading"**.
  - The head side builds the same packages earlier, in the _Measurement rows_ step: `just test` runs `_package-builds`. The head reading therefore works.
- **Contracts it falls short of.**
  - **`RD-7` property 5:** the comment reports _"the reading at the merge base … the difference"_. Its "no base reading" clause covers _"a base tree whose instruments cannot produce the machine-readable reading"_. The base trees here do have the instruments. The workflow never builds them.
  - **`RD-24` property 5:** _"the `measurements` comment shows each row's head, base and difference"_. Its **Why** says _"The comment's difference carries the same information without the re-base"_, and that the growth before release _"isn't absorbed unread: … the pull requests' comments show it"_.
  - **The plan's step 4:** the comment lists the 19 rows _"as added"_.
  - None of these holds. Before release, the only remaining signal for a material-x row's growth is each unit's own local before-and-after reading under property 5.
- **Required property.** Each pull request's size comment shows each row's reading at the merge base and its difference, whenever the base tree has the instruments. Otherwise the record states that CI shows no difference, and `RD-24` says what stands in for it.
- **Routed** to the architect. It touches `RD-7` property 5's contract and `RD-24`'s reason for having no ceilings. No finding in `00-index.md` carries it.

### The configuration's comment states part of property 6

- **`reviewer-2`, Tier C.** It is internal to the repository and has no consumer-observable effect.
- **Observed.** `.size-limit.ts`'s comment says: _"No row has a limit until the first publication of `@ydinjs/material-x` to a registry, which the owner performs. Before that publication, a unit sets each row's limit to its reading after the release's last change, with no slack, and shows that a row can fail. Publishing without limits, or giving them up, is the owner's act and amends this rule (`repo:RD-24`)."_
- **What property 6 says that the comment doesn't:**
  - _"The owner may order ceilings sooner."_ The comment's first sentence states the opposite as unconditional.
  - _"The architect states the rule that governs the ceilings after the release. From then on, a reading over a ceiling is a decision again."_ The comment names neither obligation.
- **Why it matters.** Property 6 asks the comment to state _"this rule"_ so that _"a unit at a candidate release reads it where the ceilings will be"_. The comment identifies the boundary, and its abandonment is the owner's act, so §18's two tests hold. The comment also names `repo:RD-24`, so a careful reader finds the missing clauses there. But a unit that reads only the comment at the boundary is given no reason to ask the architect for the post-release rule. And a unit the owner sends to set ceilings sooner reads a sentence that forbids it.
- **Required property.** The size configuration's comment states property 6's rule without contradicting it: the boundary, what the unit at the boundary owes, the architect's post-release rule, and the owner's acts.