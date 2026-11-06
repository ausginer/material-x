# Clean slate for the drag rebuild

**Status: complete, with two drag2 instruments red and pending the architect's disposition.** The owner authorized this removal and chose to proceed with baseline B unresolved.

- **Input:** `drag2/terminology-ste` at `7723f3e8a`. That commit is where the legacy package can be read: `git show 7723f3e8a:packages/drag/<path>`.
- **Branch:** `drag/rebuild`.
- **Stopping boundary:** this unit adds no implementation. The next step is the architect's disposition of the items under [Pending](#pending).

## Removed

The 118 tracked files of the legacy package, with nothing archived or copied:

| What | Paths |
| --- | --- |
| Implementation and stories | `src/` (40 files) |
| Tests | `tests/` (19 files) |
| Documentation | `README.md`, `DESIGN.md`, `docs/contract-probe-2/contract.ts` |
| Old records | `.plan/` (46 files) |
| Package configuration | `.oxlintrc.json`, `.size-limit.json`, `eslint.config.ts`, `files.json`, `project.json`, `tsconfig.json`, `tsdown.config.ts`, `typedoc.json`, `vite.config.ts`, `vitest.config.ts` |

The ignored output went with them: `draggable*`, `sortable*`, `kernel/`, `.vite/` and the package's `node_modules/`.

## The remaining shell

`packages/drag` holds `package.json`, `Justfile`, the `LICENSE` link and this record.

- **`package.json`** has a name, version, license, module type and two format scripts. It has no `exports`, no `files` and no dependencies, and it is `private`, so an empty package cannot be published.
- **`Justfile`** has only `fmt` and `fmt-check`. Root recipes format `packages/**` only through the package projects, so the shell's own files need these recipes to keep one formatter.

## Workspace wiring

- **Root `Justfile`:** `drag` is gone from `clean-build`, `size`, `typecheck`, `lint` and `lint-fix`, because the shell has no such targets. It stays in `fmt` and `fmt-check`. The test comment now counts 13 projects and six per-package configurations.
- **`vitest.config.ts`, `.scripts/vitest-config.ts`:** the `dragRoot` option and the three `drag` projects are gone. `createDragTestConfig` stays because drag2 uses it.
- **`package-lock.json`:** the package's `size-limit` entries are gone, with no other change.
- **Storybook:** no change. `.storybook/main.ts` only collects packages that have a `src` directory.

## Pending

Nothing here was changed. drag2's implementation, benchmark, budgets, controls, tests and records are as they were at the input commit.

### Baseline B is unavailable

`packages/drag2/bench/size/shipped.js` imports `@ydinjs/drag/sortable.js`, the only code import of the old package in the repository. With the target gone, rolldown reports `UNRESOLVED_IMPORT`, treats the import as external and carries on.

| Reading | Brotli | Minified | Modules |
| --- | --- | --- | --- |
| Before removal, at the input commit | **6,916 B** | 22,618 B | 26 |
| After removal | 51 B | 47 B | 1 (`bench/size/shipped.js`) |

**The 51 B is not a measurement of the old implementation.** It is the cost of a re-export of an external import, so baseline B has no current figure. The `baseline B` row still prints it, 6.99 kB under its budget, and that ceiling would never catch it. Only the control does.

**Two figures are in circulation.** 6,916 B is the declared `control` and the last real reading. 6,889 B comes from older readings, in `budget-rebases.md` and `packages/drag2/README.md`. Neither is current now.

The "before" reading used the built output already in the checkout, whose files date from 2026-09-10. The legacy source was not rebuilt first. The figure matches the declared control exactly.

Effect on drag2:

- `npx just size` exits 1, reporting `baseline B … control moved by -6865 B (51, declared 6916)`. It exited 0 before removal.
- `tests/bench/size.node.test.ts` fails one test, `should not move baseline B …`. All 43 passed before removal.

The other rows still measure. Baseline A, which prices composition, doesn't depend on the old package.

### drag2's normative tree cites removed paths

`tests/references.node.test.ts`, `should carry repository paths that all resolve on disk`, now fails on eight citations:

| Citing site | Removed path |
| --- | --- |
| `tests/probes/13a-discrete-input.ts:45` | `packages/drag/src/sortable/keyboard.ts` |
| `.plan/contract/00-index.md:7` | `packages/drag/docs/contract-probe-2/contract.ts` |
| `.plan/contract/00-index.md:5590` | `packages/drag/.plan/contract-attempt-1/08-public-surface.md` |
| `.plan/contract/02-kernel-behavior-contract.md:11` | `packages/drag/docs/contract-probe-2/contract.ts` |
| `.plan/contract/03-feature-composition.md:330` | `packages/drag/docs/contract-probe-2/contract.ts` |
| `.plan/contract/03-feature-composition.md:1208` | `packages/drag/files.json` |
| `.plan/contract/07-free-drag-contract.md:435` | `packages/drag/src/kernel/coordinate.ts` |
| `.plan/obligations.md:151` | `packages/drag/.plan/experiments/02-classes.md` |

This test was not run before removal. All eight paths are ones this unit removed.

**One citation is more than a dead link.** `02-kernel-behavior-contract.md` says every signature in it is compiled, and `contract.ts` was that fixture. It was typechecked through the old package's `tsconfig.json`, so nothing compiles it now.

### Other statements that are now stale

The test does not flag these:

- **drag2:** other current-state and review records also name the old package, including `.plan/README.md`, which sends readers to `packages/drag/DESIGN.md`. By `git grep`, 16 current-state and 23 review documents under `.plan/` match. `packages/drag2/README.md` also says the shipped `@ydinjs/drag` is untouched while drag2 is built.
- **Conventions:** `.agents/docs/architecture.md` §Drag describes the old package's authored-presentation barrier, and `.agents/docs/accessibility.md` uses its keyboard behavior as the parity baseline.

## Verification

- **Incoming dependencies:** `git grep` across the repository for specifiers and paths into the old package, excluding its own files. The code import is the one above; the rest are the citations above and the wiring that this unit removed.
- **Project set:** the root Vitest configuration resolves to 13 projects, none of them old `drag`.
- **Typecheck:** root `just typecheck` exits 0. drag2 typechecks with `shipped.js` unresolved.
- **drag2 node project:** 439 of 441 tests pass, and the two failures are the ones under [Pending](#pending).
- **Nx:** the shell still resolves as `@ydinjs/drag`, and `fmt:check` runs on it.

**Not run:** browser test projects and a Storybook build. The dependency search found no browser test or story that imports the old package.

## Unrelated observation

`packages/box-quad/typedoc.json` names itself `@ydinjs/drag`. It predates this unit and was left alone.