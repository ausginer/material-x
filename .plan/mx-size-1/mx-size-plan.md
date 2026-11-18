# material-x size rows — plan

**Status: proposed, for the owner.** No identifier is minted. Written by the architect on 2026-11-18 at `377ca72df` (`origin/main`), on `repo/mx-size-1`, on the coordinator's task. It plans the repair of `repo:RF-45`. The decision below is proposed as `repo:RD-23`, the next free number if `RD-22` is registered first (the work-queue plan, `.plan/work-queue-1/work-queue-plan.md` on `repo/work-queue-1`). The main slot's architect registers it.

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

## Decision, proposed as `repo:RD-23`

**material-x is measured as `box-quad` and `core` are: by size-limit with the Rolldown preset, one row per runtime entry plus one complete row, each with a Brotli ceiling.** The `measurements` job reports its rows beside the other packages' rows. These properties hold:

1. **The rows.** One row for each entry in `files.json`'s `runtime` list, named by the entry's path without the extension (`button/button`), measuring that entry's built file. One row named `complete`, measuring a single module that imports every runtime entry, so that it is the one graph a consumer's bundler builds. A row that lists several files is never used for a composition, because it measures chunks that no consumer ships (Readings).
2. **One list of entries.** The rows come from `files.json`'s `runtime` list, or the size configuration fails when the two disagree. Adding an entry without a row isn't possible without an error. The implementer chooses how: for example, a JavaScript configuration that builds the rows from `files.json`.
3. **The instrument.** size-limit 14.3.0 and `size-limit-preset-rolldown` are material-x devDependencies, added with `aube add -D` and the reinstall that `implementer.md` requires (`RF-48`). material-x gets a `size` recipe that builds first, as `core`'s does, and a `size` script. The root `just size` and `.scripts/size-reading.ts` include material-x after `core`, because material-x's graph reads `core`'s built output.
4. **Brotli governs.** It is the only figure size-limit reports, and it is what the other size-limit rows report. Minified and gzip figures stay a unit's own choice, for a case where they disagree with Brotli (CONTRIBUTING §15).
5. **The ceilings.** Each row's ceiling is its reading in the implementing unit, after its last change: no slack. **Until material-x's first release, each change the owner approves moves every material-x ceiling to its reading.** A unit that changes material-x's runtime output re-measures every row after its last change, reports each row's reading against its input, and moves the ceilings. No further approval is asked. What stops a unit until release: a row that grows from a change the owner hasn't approved, and a row that the unit said beforehand wouldn't move (CONTRIBUTING §18's control).
6. **The boundary is release:** the first publication of `@ydinjs/material-x` to a registry, which the owner performs. It is the release item in the `material-x first release` milestone. Before that publication, the architect states the rule that governs the ceilings after it, and a reading over a ceiling becomes a decision again (CONTRIBUTING §18). **The size configuration's comment states the ceiling rule and names this decision,** so that a unit at a candidate release reads it where the ceilings are.
7. **CI notifies, as `RD-7` decides.** An over-ceiling row is a warning and a line in the comment, never a failed step. Locally, material-x's `just size` exits non-zero over a ceiling, which is the signal for a unit to re-base under property 5. `RD-7` property 5's parenthesis, which lists the packages that `just size` measures, gains material-x. That is a dated, non-substantive note on `RD-7` by the main slot's architect: the rule, _"every row that the root `just size` measures"_, doesn't change.
8. **Hand readings end.** A unit's size reading for material-x is `just size` in material-x, before and after, and the pull request's size comment. A unit doesn't bundle entries with another tool and doesn't book such a reading as the measurement.

**Why.**

- **The repository's instrument, not a new one.** size-limit with the preset already measures two packages, and the job, the reading script and the report already read it. A material-x entry is imported whole, for the element it defines, so a row needs a file path and not named imports. The preset's `import` option is unreachable anyway (`size-limit-preset-rolldown/src/index.ts`). drag's `measure.ts` exists for its graph assertions, which material-x doesn't need: no record states a tree-shaking claim about material-x's entries.
- **Every entry, because a row costs about a tenth of a second,** and an entry without a row is the gap that `RF-45` registers. The complete row shows what a consumer of the whole library pays, and the size of the code the entries share: 17,258 B against a sum of 82,517 B over the 18 entries' separate rows.
- **Ceilings that follow the code until release** are the owner's policy for drag (`drag:DRD-68`, `drag:DRO-20`), and the same reasoning holds. Until release the owner approves each change, so a second decision about its bytes repeats the first. Zero slack makes each re-measure show the whole cost on every row. A ceiling with slack would absorb exactly the small growth that `RF-45` says nobody sees (CONTRIBUTING §18).
- **No custom check of the rows against `files.json` in the gate.** The configuration itself refuses a mismatch, so no second list exists to drift.

**Not adopted.**

- **Rows without ceilings,** as `box-quad`'s row has. The comment would show each change's delta, but `RF-45`'s required property asks for a budget, and with no ceiling a local `just size` never signals.
- **A ceiling with slack,** such as the reading plus 5 %. See _Why_.
- **Only some entries**, such as one per component family. `button/split-button` and `button/button` share a family and differ by 2,650 B. A family row wouldn't see a change to the other entry.
- **The hand-measurement alternative** in `RF-45`'s required property. It is what units did, and its readings couldn't be compared from one unit to the next.

## Owner questions

1. **Ceilings:** zero slack, moving to the reading after each change you approve, until material-x's first release (property 5)? **The architect recommends this,** as for drag. The alternatives are a fixed slack, or rows with no ceiling.
2. **Entries:** all 18 runtime entries plus `complete` (property 1)? **The architect recommends all 18.**
3. **Strictness:** CI notifies and never fails (`RD-7`), and an over-ceiling stops a unit only for growth you didn't approve (property 5). **The architect recommends keeping `RD-7` as it is.** Making size gate in CI before material-x's release would block changes that you approved.

## Implementation

After the owner's answers, and after `RD-23` is registered:

1. **One implementer unit on `repo/mx-size-1`**, under properties 1–8: the devDependencies and reinstall, the configuration, the recipe and script, the root `just size`, `.scripts/size-reading.ts`, and the comment that property 6 names.
2. **Its reading:** `just size` in material-x after the last change, saved in `.plan/mx-size-1/checks/`, and the root `just size-reading` with material-x's rows. The ceilings are that reading. The implementer compares it with the [probe](checks/rf45-entry-sizes.txt) and reports any row that differs by more than a few bytes, with a cause if one is read. A difference is expected only from how size-limit streams the file to the compressor.
3. **Its witness that the rows can fail:** one entry's ceiling set one byte below its reading makes material-x's `just size` exit non-zero and name that row. A witness for property 2 that fits the mechanism chosen: a runtime entry that the configuration doesn't measure makes material-x's `just size` fail. Both witnesses run in the working tree and are reverted, and their output is saved.
4. **CI:** the pull request's `measurements` comment lists material-x's 19 rows as added. The pull request closes `RF-45` in the record, and its issue with `Closes #N` once the queue exists.
5. **Review:** a feature proof against properties 1–8.

**Merge order.** #38 changes `verify.yml`'s jobs. This unit changes no workflow, so it doesn't depend on #38. The job's time limit holds with material-x added: about 10 s more on each side.

## Proposed identifiers

- `repo:RD-23` — this decision, if `RD-22` is registered first; otherwise the next free `RD-` number. The main slot's architect confirms it.
- `RF-45` is closed by the implementing pull request. No new finding.

**Seen, not registered:** `box-quad`'s only row, `index`, has no limit (`packages/box-quad/.size-limit.json`), so it reports and never signals. That is the same gap as `RF-45` for `box-quad`, before its first release. It is for the owner to order, and it isn't in this unit.