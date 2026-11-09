# Callback list completion handoff

**One bounded unit for one implementer.** It implements `DRD-36`, `DRD-37` and `DRD-38` in [`00-index.md`](00-index.md), closes what the [callback list report](callback-list-report.md) left open, and reports the figures that `DRO-12` asks for.

**Read before starting:**

- **In the index:** `DRD-36`, `DRD-37`, `DRD-38`, `DRO-12` and §Disposition of the callback list report. Then `DRD-35`, as those three amend it.
- **In [`contract.md`](contract.md):** the `draggable` paragraph and its types. The contract already states the result of this unit.
- **CONTRIBUTING:** the TypeScript section.

## Base

**`drag/feature-composition` at the commit that carries this file, with the owner's edit uncommitted in the working tree.** From the repository root, before anything else:

1. `git status --short` shows only ` M packages/drag/src/kernel/callback-list.ts`.
2. `git diff | sha256sum` gives `8b3b9b97b7c136e31665a2f61a1b4a21e6cc7d6bda08161e0d50e460f785ff58`.

If the tree is clean instead, apply [`insertion-edit.diff.txt`](probes/callback-list/insertion-edit.diff.txt) with `git apply` and check step 2. **If either step fails, stop and return.**

The edit is the owner's. Don't stash, reset or rewrite it. The implementation commit carries it together with your completion.

## Work

**Two commits:** the implementation, and then the report.

1. **`CallbackList` (`DRD-36`).** Keep the owner's representation and form as they are. Change only the comments, so that they meet property 6: the class comment's sentences about a direction function, and `add`'s "Adds an entry at the end".
2. **Lint (`DRD-37`).**
   - Add the block to `packages/drag/eslint.config.ts` after the shared configuration, with its comment. Change no other lint configuration.
   - Remove every directive that names `@typescript-eslint/unbound-method` in `src/` and `tests/`, including the block `eslint-disable` comments in `callback-list.browser.test.ts` and their matching `eslint-enable` comments. Afterwards, `grep -rn 'unbound-method' packages/drag --include='*.ts' --include='*.tsx'` finds only the configuration's block.
3. **`Drag` and `Lift` (`DRD-38`).** Change only their declarations, as property 1 states. If a user of either type fails typecheck, stop and return. Property 3 says that none should.
4. **The allocation probe.** Revise [`allocation.ts`](probes/callback-list/allocation.ts) for `DRD-36`. It measures each list as made, with no direction function, against a bare array, and keeps the rows after one add and one run as an observation. It must pass the package's lint: `oxlint .` in `packages/drag` exits with status 1 at this commit, on that file alone.
5. **Tests.** Change nothing except the directives removed in item 2. If a test other than a size row fails, stop and return. Don't adjust it.
6. **Documentation.** JSDoc only where item 1 or item 3 makes it false. The README needs no change by the architect's reading. If you find a sentence that the change makes false, correct it and list it in the report.

## Do not change

- **`CallbackList`'s representation** beyond the comments, the reader, the session and every call site.
- **`contract.md` and `00-index.md`.**
- **The root `eslint.config.ts`, `.oxlintrc.json`, and every other package.**
- **Size ceilings, controls, `bench/` and `compare.ts`.** No re-base, no timing, and no other representation or comparative probe.

## Checks

**WebKit is required.** Run every engine suite after `source ~/.cache/ms-playwright/webkit-env.sh`. If WebKit doesn't launch with the script, stop and return.

- **`npx just typecheck`,** and the [handoff](../../../.agents/docs/handoff.md) loop on each changed file.
- **`npx just lint` in `packages/drag`,** with no file arguments, exits with status 0. Its output names no unused directive.
- **`DRD-37` property 2:** run `eslint --print-config` with the package's configuration on one file in `src/`, one in `tests/` and `allocation.ts`, and with `packages/core`'s configuration on one of its files. Record each rule setting.
- **The suite in Chromium, Firefox and WebKit** (`npx just test-engines`), and **the per-sample tests** in `tests/hot-path.browser.test.ts`. Every test passes, except size rows that already failed at `53c87f988`.
- **Size:** `node bench/size/measure.ts` at `25a67d4a9`, in a scratch worktree that you remove afterwards, and twice at the implementation commit. If the base figures differ from the [raw output](measurements/2026-11-09-callback-list.txt) at `f06a99c4f`, report the difference. Give each row's minified and Brotli bytes, its difference from the base, and its difference from the figures reported for `53c87f988`. Name every row over its ceiling.
- **Allocation, measured:** run the probe three times with `node --expose-gc`. Record each run and the Node version.
- **Allocation, counted by reading,** against `25a67d4a9`, as `DRO-12` lists them.

**Mutations.** Apply each one to the implementation commit, run the named check, confirm that it fails, and revert. Commit none of them.

| Mutation | Check that must fail |
| --- | --- |
| M1. `queue()` passes `'push'` | `requests` › "should keep the order of moveTo closures in one pass" |
| M2. `stack()` passes `'unshift'` | `release` › "should run disposers last in first out, past a throw" |
| M3. `run` calls the callback with no receiver | `callback-list` › "should call the axis and the sink on themselves" |
| M4. `has` ignores the receiver | `callback-list` › "should run one method once per receiver, in request order" |
| M5. `drag.use(this.axis.retire)`, with the receiver removed | Typecheck |
| M6. `kernel.use(displacement.retire)`, with the receiver removed | Typecheck |
| M7. The block of item 2 moved before the shared configuration | `npx just lint` reports `unbound-method` at the sites that pass a receiver |
| M8. A `// eslint-disable-next-line @typescript-eslint/unbound-method` added in `src/` | Lint names it as an unused directive. Report whether lint exits with a non-zero status |

## Report

Write `callback-list-completion-report.md` in this directory, and save the raw output as `measurements/<date>-callback-list-completion.txt`, with the date the figures were taken. The report includes:

- the base check's result, and the implementation commit;
- each item's change, and each directive removed, by file and count;
- each mutation's failing assertion, or M8's result;
- the lint, typecheck and `--print-config` results, and the suite's results in the three engines;
- the size table, the probe's runs and the counts by reading, as `DRO-12` lists them;
- any deviation, with its reason, and any finding. Mint no `DRF`: the architect records findings.

**Commit the report, push `drag/feature-composition`, and stop.** The owner reads the figures under `DRO-12` and answers `DRO-13`, and the architect reads the report. No combined review starts before both.