# material-x size rows — plan

**Status: decided by the owner on 2026-11-18, as relayed by the coordinator, and registered as `repo:RD-24`** by the main slot's architect, on this branch. The owner answered question 1 first, and then questions 2 and 3: [Owner's answers](#owners-answers). Written by the architect on 2026-11-18 at `377ca72df` (`origin/main`), on `repo/mx-size-1`, on the coordinator's task. Revised the same day for the first answer, at `c76f03c8b`, and for the release answer at registration. It plans the repair of `repo:RF-45`, which stays open until the ceilings exist ([How this meets `RF-45`](#how-this-meets-rf-45)). Until it was registered, this line said that questions 2 and 3 were open, that no identifier was minted, and that the decision was proposed as `repo:RD-23`. That number went to `RF-41`'s decision on `repo/state-layer-visual-1`.

Canonical entry: `RF-45` — material-x has no size measurement, so no budget covers its entries ([`00-index.md`](../00-index.md)). Its required property: material-x's public entries have rows in the `measurements` job, each with a budget, or the record states that material-x is measured by hand for each change, and how.

## Readings

Read by the architect at `377ca72df`, in slot `c`:

- **The instruments.** The root `just size` runs `size` in `box-quad`, `core` and `drag` (`Justfile:110`–`:111`). `box-quad` and `core` use size-limit 14.3.0 with `size-limit-preset-rolldown` 0.1.0 and a `.size-limit.json`. The preset bundles each row's built files with Rolldown (neutral platform, ESM, minified), and `@size-limit/file` sums each output file's Brotli size at quality 11. `drag` uses its own `bench/size/measure.ts`, which also asserts module graphs.
- **The job.** `measurements` (`.github/workflows/verify.yml`) runs `just size-reading` at the head and at the merge base, and `just size-report` posts the difference (`RD-7` property 5). `.scripts/size-reading.ts` reads each package by its instrument: `readSizeLimit(name)` builds the package and parses `size-limit --json`. `.scripts/size-report.ts` has no package-specific code. A row at one side only is reported as added or removed.
- **material-x** has 18 runtime entries (`files.json`'s `runtime`) and one type-only entry, `react`. Its manifest has no `size` script, and size-limit and the preset aren't in its devDependencies. size-limit loads plugins from the package's own manifest: a probe run in `packages/material-x` stopped at _"Install Size Limit preset depends on type of the project"_. Each entry's graph includes the parts of `@ydinjs/core` that it imports, and its CSS and templates, which the build emits as JavaScript modules.
- **The probe** ([reading](checks/rf45-entry-sizes.txt)) repeats the preset's steps on each entry. Brotli, in bytes:

  | Entry | Brotli | Entry | Brotli |
  | --- | --: | --- | --: |
  | `icon/icon` | 661 | `list/list-button-item` | 4637 |
  | `list/list-item` | 2690 | `button/link-button` | 4797 |
  | `button-group/button-group` | 3296 | `button/button` | 4816 |
  | `radio/radio` | 3581 | `list/list-link-item` | 4854 |
  | `list/list` | 3664 | `button/icon-button` | 5355 |
  | `button-group/connected-button-group` | 4008 | `button/switch-button` | 5404 |
  | `checkbox/checkbox` | 4144 | `button/switch-icon-button` | 5831 |
  | `fab/fab` | 4371 | `button/split-button` | 7466 |
  | `text-field/multiline-text-field` | 4533 | `text-field/text-field` | 8409 |
  - **A complete composition**, one module that re-exports every entry, is **17,258 B**: 119 modules in one chunk.
  - **The same 18 entries as 18 inputs**, which is what a size-limit row with 18 paths bundles, give 51 chunks that sum to **33,867 B**. Each chunk is compressed alone, so shared code is counted in many chunks and compresses worse. That figure is about twice what a consumer ships, and it isn't a composition anyone builds.

- **Cost.** In slot `c`, `just build` in material-x takes about 7 s, and the probe's 20 bundles about 1 s. On `main`'s last `verify` push run, `measurements` took 6 min 52 s of its 10 min limit. 5 min 45 s of that was Playwright's install, which #38 changes.
- **The hand readings** ([findings-1](../findings-1/checks/item8-step1-size.txt), [host-invariant-1](../host-invariant-1/checks/item6-size.txt)) bundled each entry with esbuild. Their figures differ from Rolldown's for the same source, for example `button/button` at 4,964 B with esbuild. Readings from the two bundlers aren't compared.

## Decision, registered as `repo:RD-24`

**material-x is measured as `box-quad` and `core` are: by size-limit with the Rolldown preset, one row per runtime entry plus one complete row. The rows have no ceiling until material-x's first release, and before that release each row gets one.** The `measurements` job reports its rows beside the other packages' rows. These properties hold:

1. **The rows.** One row for each entry in `files.json`'s `runtime` list, named by the entry's path without the extension (`button/button`), measuring that entry's built file. One row named `complete`, measuring a single module that imports every runtime entry, so that it is the one graph a consumer's bundler builds. A row that lists several files is never used for a composition, because it measures chunks that no consumer ships (Readings).
2. **One list of entries.** The rows come from `files.json`'s `runtime` list, or the size configuration fails when the two disagree. Adding an entry without a row isn't possible without an error. The implementer chooses how: for example, a JavaScript configuration that builds the rows from `files.json`.
3. **The instrument.** size-limit 14.3.0 and `size-limit-preset-rolldown` are material-x devDependencies, added with `aube add -D` and the reinstall that `implementer.md` requires (`RF-48`). material-x gets a `size` recipe that builds first, as `core`'s does, and a `size` script. The root `just size` and `.scripts/size-reading.ts` include material-x after `core`, because material-x's graph reads `core`'s built output.
4. **Brotli governs.** It is the only figure size-limit reports, and it is what the other size-limit rows report. Minified and gzip figures stay a unit's own choice, for a case where they disagree with Brotli (CONTRIBUTING §15).
5. **No ceiling until release,** on the owner's answer. No material-x row has a limit. The rows report and never signal: material-x's `just size` exits zero whatever it reads, and the `measurements` comment shows each row's head, base and difference with no limit, so it has no warning to give. **What this withdraws:** no instrument stops a unit for a material-x row's growth, locally or in CI. A growth is seen only when someone reads the difference. So a unit that changes material-x's runtime output runs material-x's `just size` after its last change and reports each row's reading against its base. The report names the rows that moved and the change each comes from, and the unit's control row: the row it said beforehand wouldn't move, and whether it did (CONTRIBUTING §18).
6. **Ceilings come before release.** The boundary is the first publication of `@ydinjs/material-x` to a registry, which the owner performs. No queue item stands for it: the owner removed material-x's release item for now (#58, closed as not planned), and he orders the release when he performs it. Before that publication, a unit sets each row's ceiling to its reading after the release's last change, with no slack. The same unit runs the witness that a row can fail, and the architect states the rule that governs the ceilings after the release. From then on, a reading over a ceiling is a decision again (CONTRIBUTING §18). The owner may order ceilings sooner. Releasing without them, or giving them up, is also his act, and either one amends this decision. **The size configuration's comment states this rule and names this decision,** so that a unit at a candidate release reads it where the ceilings will be.
7. **CI notifies, as `RD-7` decides.** Until release no material-x row has a ceiling, so none is ever over one. From the release on, an over-ceiling row is a warning and a line in the comment, never a failed step, and locally material-x's `just size` exits non-zero. `RD-7` property 5's parenthesis, which lists the packages that `just size` measures, gains material-x. That is a dated, non-substantive note on `RD-7` by the main slot's architect: the rule, _"every row that the root `just size` measures"_, doesn't change.
8. **Hand readings end.** A unit's size reading for material-x is `just size` in material-x, before and after, and the pull request's size comment. A unit doesn't bundle entries with another tool and doesn't book such a reading as the measurement.

**Why.**

- **The repository's instrument, not a new one.** size-limit with the preset already measures two packages, and the job, the reading script and the report already read it. A material-x entry is imported whole, for the element it defines, so a row needs a file path and not named imports. The preset's `import` option is unreachable anyway (`size-limit-preset-rolldown/src/index.ts`). drag's `measure.ts` exists for its graph assertions, which material-x doesn't need: no record states a tree-shaking claim about material-x's entries.
- **Every entry, because a row costs about a tenth of a second,** and an entry without a row is the gap that `RF-45` registers. The complete row shows what a consumer of the whole library pays, and the size of the code the entries share: 17,258 B against a sum of 82,517 B over the 18 entries' separate rows.
- **No ceiling while the package is under heavy development,** which is the owner's reason. Until release, almost every change moves rows on purpose. A ceiling would then be re-based at every change, which is what this plan's first version did by rule, and a ceiling re-based at every change stops nothing. The comment's difference carries the same information without the re-base.
- **Release is a boundary that someone performs** (CONTRIBUTING §18). The owner performs the publication, and giving up the ceilings is his act too, so the boundary can't arrive or lapse with nobody deciding. It is identified in one place where the obligation is administered: the size configuration's comment, which names this decision and the first publication. _"When the package settles"_ would be a schedule, and §18 rejects that.
- **The ceilings set at release are first ceilings, not a re-base.** No earlier ceiling exists for the boundary to spend. The growth before it isn't absorbed unread: each unit reports it against its base (property 5), and the pull requests' comments show it.
- **No custom check of the rows against `files.json` in the gate.** The configuration itself refuses a mismatch, so no second list exists to drift.

### How this meets `RF-45`

**`RF-45` stays open, and its required property isn't re-read.** The rows meet the first half of its first alternative: material-x's public entries have rows in the `measurements` job. The budget that alternative also asks for doesn't exist until release. A row without a ceiling isn't a budget. Reading it as one would close `RF-45` with the gap it registers: §18 makes a budget the instrument that makes a change visible, and a difference in a comment shows only what a reader reads. The second alternative, hand measurement, is what property 8 ends.

So the record states the partial repair. When the main slot's architect registers `RD-24`, `RF-45` gets a dated line: `RD-24` is its repair, the rows land in this unit, and the ceilings are owed before material-x's first publication. `RF-45` closes with the pull request that sets the ceilings (property 6). Keeping the finding open is what keeps the release obligation in the record as an open item with a stated boundary, not as a sentence inside a closed one. In the queue, the rows' pull request names `RF-45`'s issue with `Refs #N`, and the issue stays open.

**Not adopted.**

- **Ceilings now, moved to each reading the owner approves until release.** This plan's first version proposed it (property 5, question 1). The owner declined, as relayed: _"The package is under heavy development, so there's no point in setting limits yet."_
- **Amending `RF-45`'s required property** so that rows without ceilings meet it. See [How this meets `RF-45`](#how-this-meets-rf-45).
- **A ceiling with slack,** such as the reading plus 5 %, now or at release. It would absorb exactly the small growth that `RF-45` says nobody sees (CONTRIBUTING §18).
- **Only some entries**, such as one per component family. `button/split-button` and `button/button` share a family and differ by 2,650 B. A family row wouldn't see a change to the other entry.
- **The hand-measurement alternative** in `RF-45`'s required property. It is what units did, and its readings couldn't be compared from one unit to the next.

## Owner's answers

Given on 2026-11-18 and relayed by the coordinator the same day, to the three questions of this plan's first version at `c76f03c8b`:

1. **Ceilings:** none for now. As relayed: _"Let's leave it without limits for now. The package is under heavy development, so there's no point in setting limits yet."_ The plan adopts rows without ceilings until release (properties 5 and 6).
2. **Entries:** not answered separately. **The architect's recommendation stands:** all 18 runtime entries plus `complete` (property 1). The answer on ceilings doesn't change it. A row still costs about a tenth of a second, an entry without a row is still the gap that `RF-45` registers, and before release the rows' differences are the only signal there is.
3. **Strictness:** not answered separately. **The architect's recommendation stands:** CI notifies and never fails (`RD-7`), unchanged. The answer on ceilings makes the question moot until release, because a row with no ceiling has no warning to give. The recommendation governs from the ceilings on.

Questions 2 and 3 went back to the owner with this version.

**Then, on 2026-11-18,** relayed by the coordinator:

2. **Entries:** yes. All 18 runtime entries plus `complete` (property 1).
3. **Strictness:** yes. CI notifies as `RD-7` decides (property 7).

**The release answer,** on the work-queue plan's release scope, the same day: _"Let's remove the material-x release card for now. It'll be built up from the spec, and that's quite big."_ The coordinator closed #58, _Release `@ydinjs/material-x`_, as not planned. Property 6 named that issue as the queue's item for the boundary. It now names the first publication alone, and the size configuration's comment names this decision and that publication. _How this meets `RF-45`_ proposed that `RF-45`'s issue block the release issue. That sentence is withdrawn, because no release issue exists.

**What this version changed,** so that the first version stays readable:

- **The decision's summary** said _"each with a Brotli ceiling"_.
- **Property 5** set each ceiling at its reading with no slack, and moved every ceiling to its reading after each change the owner approved, until release. A unit stopped for growth from an unapproved change, and for a control row that moved.
- **Property 6** named the boundary as _"the release item in the `material-x first release` milestone"_. The work queue has no milestones now (`repo:RD-22`, amended on `repo/work-queue-1`), so it names the issue _Release `@ydinjs/material-x`_.
- **Property 7** said that locally, material-x's `just size` exits non-zero over a ceiling, as the signal to re-base under property 5.
- **_Why_** said that ceilings that follow the code until release are the owner's policy for drag (`drag:DRD-68`, `drag:DRO-20`). _How this meets `RF-45`_ is new.
- **_Not adopted_** listed _"Rows without ceilings"_, because `RF-45` asks for a budget and a local `just size` would never signal. That objection is why `RF-45` stays open.
- **Implementation** set the ceilings in step 2, ran the one-byte ceiling witness in step 3, and closed `RF-45` in step 4. Step 6 is new.

## Implementation

After the owner's answers, and with `RD-24` registered:

1. **One implementer unit on `repo/mx-size-1`**, under properties 1–8: the devDependencies and reinstall, the configuration with no limits, the recipe and script, the root `just size`, `.scripts/size-reading.ts`, and the comment that property 6 names.
2. **Its reading:** `just size` in material-x after the last change, saved in `.plan/mx-size-1/checks/`, and the root `just size-reading` with material-x's rows. The implementer compares it with the [probe](checks/rf45-entry-sizes.txt) and reports any row that differs by more than a few bytes, with a cause if one is read. A difference is expected only from how size-limit streams the file to the compressor.
3. **Its witness for property 2,** fitting the mechanism chosen: a runtime entry that the configuration doesn't measure makes material-x's `just size` fail. The witness runs in the working tree and is reverted, and its output is saved.
4. **CI:** the pull request's `measurements` comment lists material-x's 19 rows as added, with no limit. The pull request leaves `RF-45` open, and names its issue with `Refs #N` once the queue exists.
5. **Review:** a feature proof against properties 1–8.
6. **Before material-x's first publication,** a separate unit under property 6 sets each row's ceiling to its reading after the release's last change. It runs the witness that a row can fail: one entry's ceiling set one byte below its reading makes material-x's `just size` exit non-zero and name that row. The witness runs in the working tree, is reverted, and its output is saved. The unit records the rule that the architect states for the ceilings after release. Its pull request closes `RF-45` and its issue.

**Steps 1 to 3, done on 2026-11-18** by the implementer on `repo/mx-size-1`, after merging `origin/main` at `7a4f82eb4`:

- **The configuration** is `packages/material-x/.size-limit.ts`. It builds one row from each entry in `files.json`'s `runtime` list, and the `complete` row from a module it writes to `node_modules/.cache/size-limit/complete.js`. That module imports each entry for its effects, as a consumer does, where the probe re-exported each entry. Its comment states property 6 and names `repo:RD-24`.
- **Ordering.** material-x's `size` target depends on its dependencies' `build` in `project.json`, and the root `just size` runs its four packages one at a time (`--parallel=1`), so that no other package's `size` rebuilds `core` while material-x is bundled. `.scripts/size-reading.ts` reads material-x after `core`.
- **The reading** ([rd24-reading.txt](checks/rd24-reading.txt)): 19 rows, no limits; `complete` is 17,258 B. Thirteen entry rows differ from the probe, by −41 to +83 B. The probe's own script, run again at the same tree, gives every entry row to the byte, so the differences come from the runtime changes that the merge brought (#61, #37, #39), not from the instrument. After `origin/main` was merged again at `a133bebee` (#59), six rows got smaller: the three list items, both text fields and `complete`, which is 17,137 B. They are the entries that import `polyfills.ts`, which no longer probes `:host:has()` at import. The file records both readings.
- **The witness for property 2** ([rd24-p2-witness.txt](checks/rd24-p2-witness.txt)): an entry added to `files.json` gets a row with no change to the configuration, and an entry that `files.json` lists with no built file makes size-limit exit 1.

**Merge order.** #38 changes `verify.yml`'s jobs. This unit changes no workflow, so it doesn't depend on #38. The job's time limit holds with material-x added: about 10 s more on each side.

## Proposed identifiers

- `repo:RD-24`, registered for this decision. Until it was registered, this item proposed `repo:RD-23` if `RD-22` was registered first.
- `RF-45` stays open after the rows land, and the pull request that sets the ceilings closes it (implementation step 6). No new finding.

**Seen, not registered:** `box-quad`'s only row, `index`, has no limit (`packages/box-quad/.size-limit.json`), so it reports and never signals. That is the same gap as `RF-45` for `box-quad`, before its first release. It is for the owner to order, and it isn't in this unit.