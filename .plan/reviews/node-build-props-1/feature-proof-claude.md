# PR #316, `RF-153`'s repair: feature proof

**Files were read at:** `776fad3db`, the head of `material-x/node-build-props-1` and of PR #316, in slot g. **Diff reviewed:** `d6f6cf60b..776fad3db`, all of it.

**Governing record:** `RF-153` in [`00-index.md`](../../00-index.md), with the implementer's note of 2026-11-26.

**Lens:** feature proof. Every claim comes from my own reading or from a run I made. The runs are in [`checks/feature-proof-runs.txt`](checks/feature-proof-runs.txt), and the script that made them is [`checks/feature-proof-probe.sh.txt`](checks/feature-proof-probe.sh.txt). Every file that a step edited was restored from a copy. The list was restored byte for byte, and `git status` was clean after. I changed no file outside this record.

This is a change to a node project's global setup, so `repo:RD-62`'s browser mutations in three engines don't apply.

**Verdict:** the repair meets `RF-153`'s required property, and its witness reproduces. **One finding,** `reviewer-1`, Tier C. It is pre-existing, outside `RF-153`, and doesn't block.

## Scope

- **Read:**
  - `tests/support/build-package.node.ts`, before and after. `require-build.ts`. `.scripts/css/collect-props.ts`, and the `root`, `src` and `cache` it takes from `.scripts/utils.ts`.
  - The two readers of the list in `@ydinjs/vite-custom-element-assets`.
  - The shared test config: `.scripts/vitest-config.ts` and `.scripts/vite-config.ts`.
  - The package and root `Justfile`s, and `verify.yml`'s test steps.
  - Every `globalSetup` in the repository, and every caller of `build-lib`, `build-prepare` and `collect-props.ts`.
- **Ran:** p0 to p8 in the checks file.
- **Not read:**
  - Two runs at once in one tree. The collection now rewrites the shared list on each node run, while another run may be loading it. The rule for local runs is one at a time.
  - Lint and typecheck are CI's (`static`). The run time is the implementer's reading, beside my own runs' wall times in p0 to p7.

## The required property

_The build that the node project reads is made from a property list collected from the tree under test._

- **Holds.** `build()` runs `node ../../.scripts/css/collect-props.ts` with the package as its working directory, which is what `just build-prepare` runs. Only when that exits 0 does it run `tsdown`, so `tsdown` loads the list that was just written.
- **The collection reads the tree under test.** `collect-props.ts` globs `packages/material-x/src` and writes `node_modules/.cache/css/css-private-props.json`, both found from the script's own location, which is in the worktree. Both readers in the plugin take the list from the same place.
- **The witness reproduces** (p1, p2):
  - A list collected by `build-prepare` is made stale by a new `--_rf153-witness` in the sortable sheet.
  - With `d6f6cf60b`'s setup, the project's three files fail with _"Property --_rf153-witness is not collected"_, under _"aube exec -- tsdown … exited with 1"_.
  - With the head's setup, its 38 rows pass, and afterwards the list names the property.
- **A stale mapping is replaced too** (p3). This is `RF-153`'s other case: no name is missing, but the short names differ from a fresh collection.
  - I swapped the first two short names of a fresh list, and the head's run passes.
  - After the run, the list is equal, byte for byte, to a fresh collection. So `tsdown` read the names that `just build`, and CI, would give.

## Failure reporting

A failed collection reports as clearly as a failed `tsdown`. Both go through the same `run(command)`.

| Probe | What fails | What each file raises |
| --- | --- | --- |
| p4 | only the collection: the list is read-only, and `tsdown` only reads it | `node ../../.scripts/css/collect-props.ts exited with 1`, then the script's output, ending in `EACCES: permission denied, open '…/css-private-props.json'` |
| p5 | only `tsdown`: a syntax error in `src/icon/icon.ts`, which the collection doesn't import | `aube exec -- tsdown --config tsdown.config.ts exited with 1`, then `tsdown`'s output |

- In both, the project's three files fail and no row runs.
- Each message names the command and its exit code, and carries the cause.
- A failed collection returns before `tsdown`, so no build is made from a list that the collection didn't write.

## Other node setups

**No other node setup needs the same.**

- The repository has two `globalSetup`s, both named `tests/support/build-package.node.ts`, in material-x and in drag (`.scripts/vitest-config.ts:531` and `:759`).
- drag's build takes `constructLibraryTsdownPlugins()`, which doesn't mangle private properties.
- Only `packages/material-x/tsdown.config.ts` takes the component plugins, from `.scripts/tsdown-component.ts`.
- Apart from this setup, only the package's `just build` and `docs-prepare`, and the root `Justfile`'s `_test-builds`, run the collection.
- The root `just test`, which CI runs, runs `build:prepare` before Vitest. That is why CI was never affected.

What I did find is outside any global setup. It is `reviewer-1`.

## Findings

| Id | Tier | Blocks | Owner | Claim |
| --- | --- | --- | --- | --- |
| reviewer-1 | C | no | architect, to register or decline | In a tree with no list, no package's Vitest starts. The run ends before the repair's collection can write the list. |

### reviewer-1 — with no list, no package's Vitest run starts

- **Current behavior:** both modules of `@ydinjs/vite-custom-element-assets` that read the list import it at module load (`src/index.ts:26`, `src/css/css.ts:10`). `.scripts/vite-config.ts` imports that package, and `.scripts/vitest-config.ts` imports `vite-config.ts`. Every package's `vitest.config.ts` imports `vitest-config.ts`: tproc, vite-traits-plugin, material-x, box-quad, drag and core.
  - So with no list, loading the config fails before any project's global setup runs.
  - The browser projects don't mangle (`isProd` is false outside a build), so they need only the file to exist.
- **Evidence:**
  - **p6:** the list moved away, in material-x. The run ends in 0.9 s with _"Cannot find module '…/node_modules/.cache/css/css-private-props.json' imported from …/vite-custom-element-assets/index.js"_, and the list is still missing afterwards.
  - **p8:** the same in drag, whose build doesn't use the list. A _"Startup Error"_ with the same message.
- **Why it is a problem:** this is `RF-153`'s first half in another form. A local run in a tree where nothing has run `build-prepare` yet fails for a reason that isn't the code, and the error names a cache file, not the step that writes it. The repository's command for running one file in an engine is the package's `just test <file>` (`test-architecture.md`), which doesn't run the collection.
  - It is loud and gives no wrong result. CI is unaffected: the root `just test` runs `build:prepare` first.
  - The repair doesn't cause this and doesn't make it worse.
- **Tier:** C. No consumer observes it, and no instrument gives a wrong result: the run doesn't start.
- **Required property, if registered:** a package's Vitest run, in a tree whose list is absent, either starts, or fails with an error that names the step that writes the list.

## Runs

- **Local,** in slot g, from `packages/material-x`, `aube exec vitest run -c vitest.config.ts --project node`:
  - the head: 38 rows pass, before the probes and after them (p0, p7);
  - the witness: it fails at the base and passes at the head (p1, p2);
  - p3 to p8 as above.
- **CI:** `verify` run [45884043443](https://github.com/ausginer/material-x/actions/runs/45884043443) on `776fad3db00e3be213528e03b8ccf7a8fab018bb`. Its conclusion is `success`, in every job, `static`'s lint and typecheck included. In the `chromium` job (140130477666), the project `node/material-x` passes its three files, 38 rows: `package-entries.node.test.ts` (22), `list/list-item-opacity-tokens.node.test.ts` (11) and `support/visual-contracts.node.test.ts` (5).