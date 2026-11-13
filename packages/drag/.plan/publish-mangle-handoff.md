# Publish mangle handoff

**For:** one `implementer` unit on `drag/size`. **Base:** the commit that carries this handoff. These are `2d9a2f482`'s at that commit:

- in `packages/drag`: `src`, `tests`, `bench`, `tsconfig.json`, `tsdown.config.ts`, `package.json` and `files.json`;
- `.scripts/vitest-config.ts`.

**Governing records:**

- `DRD-56` in [`00-index.md`](00-index.md), properties 1 to 9. This is `DRO-15` step 3, on the owner's answer of 2026-11-13;
- `DRD-54` and `DRD-55`: the consumer project and the gate, which read the build that this unit changes;
- `DRD-51` properties 1, 3 and 4, as amended: readings, the stopped campaigns, and runtime checks;
- [`property-mangling-exploration.md`](property-mangling-exploration.md) §1 and §5: the tool, and what delivery needs;
- [`performance-plan.md`](performance-plan.md) §2 P4, the owner's direction, §3 on sequencing runs, and §6, where the type-directed transform is deferred;
- CONTRIBUTING Part I §Class encapsulation and Part II §11.

**Goal:** after this unit:

- the internal properties that `DRD-56` selects carry a `_` prefix in `src`;
- `just build` publishes them under the short names that one committed map gives;
- a node test validates the publication that the build actually produces;
- the consumer project and the size gate read the renamed build.

Public names, platform names and `#private` members don't change. Budgets don't change.

## Boundaries

**Change only:**

- **`packages/drag/src/`:** only renames of the selected property declarations and their uses, made with the type checker. A comment that names a renamed member in code font follows the rename. Nothing else changes.
- **`packages/drag/tests/` and `packages/drag/bench/`:**
  - code that names a renamed member follows the rename, and nothing else changes. That includes `@ts-expect-error` lines and `compare.ts`'s injection texts;
  - `tests/publication.node.test.ts` is new (item 6).
- **`packages/drag/tsdown.config.ts`:** add the step.
- **One new directory in `packages/drag`,** outside `src`, `tests` and the publication, for the step, the map and the script that generates it. It needs a name that `files.json`'s clean doesn't select. `build/` is suitable.
- **`packages/drag/tsconfig.json` and the package's lint configuration,** only so that the new directory is typechecked and linted.
- **Records:** the report, and `measurements/` files.

**Do not change:**

- `package.json` or `files.json`. The map isn't published;
- `.scripts/` (`tsdown-library.ts` and `vitest-config.ts` among them), `tests/support/published-entries.ts` and `tests/support/build-package.node.ts`. The build stays `just build`'s two commands, and the step runs inside the second;
- `bench/size/measure.ts` and `tests/size.node.test.ts`: every row, ceiling, control, fragment and bundling setting;
- the source-only list, the `shipped` list, `vitest.engines.config.ts`, drag2 and `packages/box-quad`;
- any test's title or assertion, apart from renames. A moved test stays where it is.

**Do not run:**

- `compare.ts` scenarios, `--prove` or `--floors` without `--dry`;
- the page check, B3' or the in-page floors.

The rename changes no operation, so no timing reading is owed (`DRD-51` property 4). `--prove --dry` and `--floors --dry` start no browser, and they are required (item 3).

**Sequencing.** Run any sequence of long processes through `node bench/campaign.ts run`. Wait for it through the runner, a foreground command, or the harness's notice that a background command exited. **Don't wait by searching the process table.**

**Scratch edits.** Make each one in a copy you can restore, and confirm each restore with `cmp`. A build that must fail uses a configuration or source that throws or is refused while it builds. A missing `--config` path doesn't fail ([assessment](consumer-tests-assessment.md) §4).

## Item 1. The base

Before any change:

1. **Record that this command prints nothing:**

   ```sh
   git diff --stat 2d9a2f482 HEAD -- packages/drag/src packages/drag/tests packages/drag/bench packages/drag/tsconfig.json packages/drag/tsdown.config.ts packages/drag/package.json packages/drag/files.json .scripts/vitest-config.ts
   ```

2. **Run the Chromium suite through the runner.** Expected as at `2d9a2f482`:
   - 746 tests, of which 740 pass;
   - the six known size rows fail;
   - `consumer` passes 326 of 326.
3. **Take the base size reading** with `npx just size`, which builds and then measures: every row's minified, gzip-9 and Brotli-11 bytes. It must equal the [published gate report](published-gate-report.md) §5's build column.
4. **Keep the base tree.** Copy the emitted tree (every file that `package.json`'s `files` selects) to a scratch directory outside the checkout, and save each file's SHA-256 under `measurements/`. Items 3 to 5 compare against it.
5. **Record which injections apply at the base,** with `node bench/compare.ts --prove --dry` and `node bench/compare.ts --floors --dry`. Entries that `DRD-45` property 9 lists as stale are expected to fail. Record each entry's result, applying or not, from both outputs.

## Item 2. The selection

The starting set is `DRD-56` property 2's 29 names:

> `advance`, `animation`, `collect`, `config`, `count`, `decide`, `detach`, `direction`, `dx`, `dy`, `empty`, `enter`, `first`, `holds`, `lend`, `measure`, `measurePlaceholder`, `placeholderRect`, `raise`, `raiseInPass`, `rebase`, `refresh`, `root`, `run`, `schedule`, `stepTarget`, `terminate`, `updateInsertion`, `window`.

**For every declaration in `src` of a property with one of these names,** give a row in the report's table:

- the file and line, and the type or object that declares it;
- its use sites;
- **prefix or keep,** with the reason against `DRD-56` property 1.

**What is not a property declaration.** A parameter or local binding with the same name, such as `root: HTMLElement` or `window: Window`, isn't one and stays. Only the property's own declaration, accesses, keys and destructuring change.

**A declaration stays unprefixed** when any of these holds:

- an emitted `.d.ts` declares it;
- the platform reads, writes or calls it;
- it is stored on a platform object;
- it belongs to an object that a consumer creates, or receives under a published type;
- it is read through a string, a computed key, or an enumeration that depends on names;
- it is a module export;
- tests read it through a global, as with the refusal count.

You decide by reading the code. **No tool selects names**, and the exploration's lists are only where you start. `trusted` and `untrusted` are already out of the set: they are the refusal count's members, which tests read through a global.

## Item 3. The source rename

**Required properties** (`DRD-56` properties 1 to 3):

1. **The rename.** Each declaration that item 2 prefixes, `name` → `_name`, is renamed with the type checker's rename, and every use follows. If `tsc` then reports a use that the rename missed, such as an object literal that is structurally the same type, rename it too and list it in the report.
2. **Nothing else changes in `src`.** No statement, type, member order or `#private` field changes. If prefixing a member would require any other change, stop and return.
3. **Tests and instruments follow the rename.**
   - Code that names a renamed member changes that name and nothing else.
   - A `@ts-expect-error` line that asserts a published type lacks the member names the new name, so it keeps checking the member. Examples are `authoring.declaration.test.ts`'s `panel.enter`, `panel.raise`, `panel.raiseInPass` and `panel.detach`.
   - A line about a removed public name, such as `panel.run` under "should refuse the removed names", stays as it is.
   - List every changed test and bench line in the report.
4. **No injection goes stale.** After the rename, `--prove --dry` and `--floors --dry` must report the same entries applying as at the base.
5. **The `.d.ts` output is unchanged.** Build the tree after the rename, without the step. Every emitted `.d.ts` file must equal the base tree's byte for byte, except in comment text that names a renamed member. List each such comment. No `.d.ts` file may contain an identifier that matches `^_[A-Za-z]`.
   - **If a `.d.ts` changes,** a prefixed declaration is published. Undo that declaration, keep it unprefixed, and record it in item 2's table.
   - **`.d.ts.map` files may differ** only where `src` positions moved. List each one that differs.

**Commit A** is the rename alone, with its followers, before any build change.

**Checks at commit A:**

- `npx just typecheck`;
- format and lint;
- the Chromium suite, where the consumer project reads the prefixed build, which isn't renamed yet;
- the three-engine suite;
- the size reading. Each row grows by a few bytes, because the names are one character longer. Record the figures.

## Item 4. The map

**Required properties** (`DRD-56` property 4):

1. **One committed file,** in the new directory, maps each prefixed name to an output name.
2. **Its keys are exactly the prefixed property names in `src`,** found by reading the syntax: class members, object keys, member accesses and destructuring keys that match `^_[A-Za-z]`.
3. **Its output names are distinct, valid identifier names, and unprefixed.** None equals a JavaScript reserved word or any property name that stays in the publication, read from the prefixed build's emitted `.js` files.
4. **A committed script generates the map,** deterministically, from the prefixed build that commit A produces. Giving shorter output names to the names that occur more often is suitable, but not required. Run the script twice, and record that both outputs are equal.

## Item 5. The step

**Required properties** (`DRD-56` properties 5 and 6):

1. **It runs inside `tsdown`'s build,** configured in `tsdown.config.ts`. `just build`'s two commands then produce the renamed publication. So do the build setup of the consumer and node projects, and `npx just size`.
2. **It changes only property names.** In each emitted `.js` module, it renames every property name that matches `^_[A-Za-z]` to its output name in the map, and changes nothing else. The statements, the comments that bundlers read (`@__PURE__`, `#__PURE__`, `@__NO_SIDE_EFFECTS__`) and the `sourceMappingURL` comment stay.
3. **An unknown name fails the build.** A prefixed name that the map lacks fails the build, with an error that names it. The step assigns no name of its own.
4. **The declarations are untouched.** The `.d.ts` and `.d.ts.map` output is byte-identical to the build without the step.
5. **Source maps.**
   - Every emitted module's map is valid.
   - Each renamed property's position maps to the position in `src` where the prefixed name is written.
   - Every other token maps to the same `src` position as the corresponding token in the build without the step.
6. **No runtime code is added.**

**What is known, and you must check it.** These are facts about the tools, not a required method:

- **The exploration used Rolldown 1.2.15's `minifySync` from `rolldown/utils`.** It ran on each module with only `mangleProps` and a shared `cache` ([`publish.ts.txt`](probes/property-mangling/publish.ts.txt)).
  - Its options include `include`, `exclude`, `reserved`, `quoted` (default `false`), `debug` and `cache`. `false` in the cache reserves a name.
  - It can return a source map.
  - **It reprints the module**, so whether it keeps the bundler annotations and the `sourceMappingURL` comment must be checked. If it doesn't keep them, use another way that meets property 2, such as renaming at the parsed positions.
- **A map that a plugin returns from `renderChunk` is composed with the chunk's own map** by Rolldown. A chunk whose file name ends in `.d.ts` is a declaration and isn't changed.

## Item 6. The publication test

`tests/publication.node.test.ts` runs in the node project and reads the run's one build (`DRD-55` property 1). **The publication** is every file that `package.json`'s `files` selects. Once, in the report, confirm that this set equals the file list of `npm pack --dry-run --json` from `packages/drag`.

**Required checks** (`DRD-56` property 7):

| Check | What fails it |
| --- | --- |
| **The name set** | The map's keys differ from the prefixed property names in `src`. The failure names each name that is missing or extra |
| **V1** | A property name or string literal in an emitted `.js` file matches `^_[A-Za-z]`. The failure names the file and the name |
| **V2** | An identifier in an emitted `.d.ts` file matches `^_[A-Za-z]` |
| **V3** | The map's output names are not distinct, are not valid identifier names, start with `_`, or equal a property name that stays in the emitted `.js` files |
| **V4** | A renamed position in an emitted module maps to a `src` position where the text isn't the prefixed name. The failure names the file, the position and the name |

V5, reproducibility, is checked once in item 8, not in the test.

## Item 7. The witnesses

Each witness fails under its scratch edit and passes once the edit is restored. Save each output under `measurements/`.

| Witness | Scratch edit | Required result |
| --- | --- | --- |
| **M1, an unknown name** | Add a property `_probe` to an internal object in `src`, without a map entry | The build fails with an error that names `_probe`. Every consumer and node file fails with `tsdown`'s output, and the source projects' verdicts stand |
| **M2, a module left out** | Make the step skip one emitted module that holds renamed names, such as `kernel/gesture.js` | V1 fails and names the module. At least one consumer test fails, and its source run passes |
| **M3, a collision** | Give one map entry an output name that stays as a property elsewhere in the publication | V3 fails and names both |
| **M4, a string key** | In `src`, replace one `object._name` access with `object['_name']` | V1 fails and names the string. Record whether any consumer test fails |
| **M5, an unchained map** | Make the step return no source map | V4 fails |
| **M6, a published prefix** | Add a `_probe` member, with a map entry, to an interface that an entry publishes | V2 fails |
| **M7, a stale key** | Add a map key that `src` doesn't use | The name-set test fails and names it |

## Item 8. Readings and validation

1. **Size.** Report every row with `npx just size` at three points: the base (item 1), commit A, and the last commit. Give minified, gzip-9 and Brotli-11, the differences base → A, A → end and base → end, and each row's verdict at each point.
   - The booked figure is base → end (`DRD-51` property 1).
   - Every row's module list must be unchanged.
   - **A verdict that changes isn't a return condition.** List it, and keep the ceiling. The architect routes it to `DRO-4`.
2. **Reproducibility (V5).** Build twice from one tree. Every published file must be byte-identical between the two builds.
3. **Three engines for the consumer files, once.** Write a scratch configuration that runs the consumer project's files against the renamed build in Firefox and WebKit, with the same resolution and build setup. Run it once, save the output, and delete the configuration. Every test must pass.
   - In this container the engine run needs `~/.cache/ms-playwright/webkit-env.sh` sourced first ([published gate report](published-gate-report.md) §6).
4. **A look at the published code.** Save one emitted module, before and after the step, such as `kernel/gesture.js`, and its source map, under `measurements/`.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Empty, and the base suite, size, tree and dry checks are recorded |
| `git diff --stat <base>..HEAD -- packages/drag .scripts` | Only the files that §Boundaries allows, the report and `measurements/` |
| Item 2's table | Every declaration of the 29 names, with a decision and its reason |
| `src`'s diff | Only renames: the report's check shows that the diff with each `_name` read as `name` is empty, comments included |
| The source projects | `browser`, `shipped` and `declaration` run the same titles with the same verdicts as at the base |
| The node project | The same titles as at the base, plus the new publication test's, which all pass. Only size rows fail, and each verdict that changes is listed |
| The consumer project | 22 files and 326 tests against the renamed build. All pass |
| The publication test | Passes. M1 to M7 as item 7 states |
| `.d.ts` | Byte-identical to the base tree's |
| `--prove --dry`, `--floors --dry` | The same entries apply as at the base |
| Size | Item 8.1 |
| V5 | Item 8.2 |
| Three engines (`npx just test-engines`) | No failure: 1,071 passed and 18 skipped |
| Consumer files in Firefox and WebKit, once | Item 8.3: all pass |
| `tests/hot-path.browser.test.ts`, `shipped` project | Every test passes |
| The suite's wall time | Recorded at the base and at the last commit. Not gated |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck, with `npx just` from `packages/drag` |
| Markdown | `handoff.md`'s Markdown checks |

## Commits

- **Commit A:** the rename and the lines that follow it (item 3).
- **Commit B:** the map, its script, the step, the publication test, and the configuration that the new directory needs (items 4 to 6). It may be split into more commits, if each one passes typecheck and lint.
- **The report** goes in its own commit.

## Report

Write `publish-mangle-report.md` beside this file. Save under `measurements/`, unedited:

- the runner's status and logs for the base suite, the suites at commit A and at the end, and the three-engine runs;
- the dry checks at the base and after the rename;
- the base tree's hashes;
- M1 to M7;
- the readings of item 8;
- `npm pack --dry-run --json`'s file list.

The report gives:

- each commit and what it carries;
- item 2's table;
- every changed test and bench line;
- the map's size and how its names were assigned;
- every check above;
- the wall time before and after.

## Return to the architect

Stop and return if:

- item 1 isn't empty, or the base size reading differs from the published gate report's build column;
- prefixing a declaration needs any change besides the rename;
- **a consumer test fails on the renamed build and passes on the prefixed build of commit A.** That is a break that the renaming introduced, which is what the validation exists to find, and the architect decides it;
- a source project's titles or verdicts change, apart from size rows;
- the step can't keep the bundler annotations, the identical `.d.ts` output or the chained source maps inside `tsdown`'s build;
- the map can't avoid every property name that stays in the publication;
- an injection that applied at the base can't apply after the rename by following it;
- a row's module list changes;
- two builds of one tree differ;
- the change needs `package.json`, `files.json`, `.scripts/` or another file outside §Boundaries.

## After this unit

The architect reads the report.

- **The size table's base → end column is `DRO-15`'s measured gain.** Each verdict that changed goes to `DRO-4`, which keeps the re-base.
- The type-directed transform stays deferred ([`performance-plan.md`](performance-plan.md) §6).
- Whether the `shipped` census moves to the build is still open.