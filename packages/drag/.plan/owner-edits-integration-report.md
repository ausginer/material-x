# Owner edits integration report

**Input:** `drag/size` at `afc9e1504`, with the owner's uncommitted edits in the main checkout. **Scope:** the owner's edits as they were, the references they require, and the source-only comment from the [RectIndex access handoff](rect-index-access-handoff.md) §Follow-up after the independent review. The owner's request moved that comment from `drag/rect-index-ownership` into this unit.

## What changed

**The owner's edits are kept as they were found.** The tools changed none of their lines (§Lint).

- `src/sortable/axis.ts`: `DisplacementSink`'s `dx` and `dy` move above `report`, with no change to their types. `AxisContext`'s `box` and `displacement` become optional, and each still accepts `null`.
- `src/sortable/rect-index.ts`: in `measure`, `travel`, `holds` and `#read`, `getBox` and `displacement` become optional parameters. `measurePlaceholder` calls `#read(PLACEHOLDER, placeholder)` with no `null` arguments. `#read` takes the box with `(getBox?.(element) ?? element)`. `verifyEquivalence` accepts `undefined` for both parameters.
- `src/sortable/linear-shift.ts` (`LinearShift.refresh`) and `src/sortable/xy.ts` (`refresh`): both parameters accept `undefined`.
- `tests/callback-list.browser.test.ts` and `tests/callback-list.declaration.test.ts` are renamed to `tests/callbacks.*`, and their content is byte-identical to the base.

**Added by this unit,** in `.scripts/vitest-config.ts`, `DRAG_SOURCE_ONLY_BROWSER_TESTS`:

- The entry `tests/callback-list.browser.test.ts` becomes `tests/callbacks.browser.test.ts`. The declaration file isn't on the list, and the `declaration` project still selects it.
- The comment above `tests/displacement-sink.browser.test.ts` was "The displacement sink's `report` and `settle`, which only the unpublished installer types declare, and `STRIDE` and `TOP` from `src/sortable/rect-index.ts`, which no entry publishes." It now reads "The displacement sink's `report` and `displaced`, which only the unpublished installer types declare." The file imports `src` modules and only the type `DisplacementSink` from `axis.ts`. It spies on `report` (line 102) and replaces `displaced` (line 70). It doesn't reference `settle`, `STRIDE` or `TOP`. The file still needs to be on the list.

**Not changed:** `src/sortable/behavior.ts` still passes `box: this.#measuredBox` (from `config.box ?? config.visual ?? null`) and `displacement: this.displacement ?? null`. Now that both properties are optional, the `?? null` steps aren't needed. This unit doesn't remove them, because the owner's edits don't touch them and nothing else requires the change. History records that name `callback-list` and the probe `.plan/probes/callback-list/allocation.ts` are left unchanged.

## Verification

All checks ran in Chromium on this machine. The base figures come from a detached worktree at `afc9e1504`, which used the main checkout's `node_modules` through symlinks, so both sides used the same dependencies.

| Check | Integrated tree | Base |
| --- | --- | --- |
| `npx just typecheck` (`packages/drag`) | 1 error, `.scripts/tsdown-library.ts(53,11)` TS2322, the vite/rolldown `Plugin` type | The same error. It already existed |
| `npx just test` | 740 passed, 6 failed, all in `tests/size.node.test.ts` (rows over their ceilings) | The same 6 failures and 740 passes |
| Routing (`vitest list --filesOnly`) | 55 file–project pairs | Identical after the rename ([listing](measurements/2026-11-13-owner-edits-routing.txt)) |

**Routing witness.** With the entry set back to `callback-list` and the file renamed, `callbacks.browser.test.ts` ran in both `browser (chromium)` and `consumer (chromium)`. With the corrected entry, it ran only in `browser (chromium)`. The declaration file ran only in `declaration`.

**The type changes** pass typecheck in every caller and test, including `#read(PLACEHOLDER, placeholder)` with its arguments omitted. `#read`'s `getBox?.(element) ?? element` checks for a nullish result as well as a nullish function. For a function that returns an `HTMLElement`, it gives the same element. No timing run covered this hot-path read, so its runtime cost is unmeasured.

### Lint

These are the checks from [`handoff.md`](../../../.agents/docs/handoff.md). They ran on the six drag files from the package directory, and on `.scripts/vitest-config.ts` with the repository-level tools.

- **`.scripts/vitest-config.ts`:** clean.
- **The five other drag files:** clean.
- **`tests/callbacks.declaration.test.ts`:** 6 ESLint errors that already existed. They are `@typescript-eslint/no-meaningless-void-operator` at 72, 75, 131, 135 and 177, and `prefer-arrow-callback` at 74. The base file `callback-list.declaration.test.ts` has the same 6 errors at the same lines.
- **A defect in the gate:** `oxlint --fix` removes the five `void` operators. That makes `chai-friendly/no-unused-expressions` report the same five lines, so the two linters contradict each other. This unit restored the file to the owner's byte-identical content, and fixed no lint error by hand.

## Size

[Base](measurements/2026-11-13-owner-edits-sizes-base.txt) and [integrated](measurements/2026-11-13-owner-edits-sizes-head.txt) tables, from `npx just size` in each tree. Brotli is the governing figure.

| Row             | min | gz  | br     |
| --------------- | --- | --- | ------ |
| sortable + y    | −9  | −5  | −11    |
| sortable + xy   | −9  | −5  | −3     |
| complete        | −9  | −6  | **+9** |
| every other row | 0   | 0   | 0      |

`complete` was already 101 B over its 7065 B ceiling, and is now 110 B over. The rows that don't bundle `rect-index.ts` read 0, and so do the control rows. The violations in the other rows read the same at both ends. No budget or control figure changed.

## What didn't run

Firefox and WebKit, the timing comparison, allocation probes, `compare.ts` and the deferred campaigns. This unit doesn't move `xy`'s `before` buffer, and it doesn't include box-quad's separate PR.

## Scratch work

The base worktree is removed after this report.

## Next

The commit that adds this report is the source baseline for the next architect session. The architect decides on the `?? null` steps in `behavior.ts` and on the lint-gate contradiction.