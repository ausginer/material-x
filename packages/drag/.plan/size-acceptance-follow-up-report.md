# Report: the last built-in receiver declaration, and the lab comment on the arms

**Handoff:** [`size-acceptance-follow-up-handoff.md`](size-acceptance-follow-up-handoff.md), items 1 and 2. **Input:** `9c248f11f` on `drag/size-acceptance`. **Governing records:** `drag:DRD-69` property 4 as amended, `drag:DRO-5`, `drag:DRD-68` property 3, and §Disposition of the size acceptance cleanup report, open items 1 and 2, in [`00-index.md`](00-index.md).

**Outcome:** both items are implemented, and every check passes. **No stop was hit:** typecheck exits 0, and no size row moves.

## Commits

| Commit               | Content                                    |
| -------------------- | ------------------------------------------ |
| `7763a67a1`          | Items 1 and 2. The checks ran at this tree |
| this report's commit | This report                                |

## Edits

Line numbers are at `7763a67a1`, under `packages/drag/`.

| Item | Edit |
| --- | --- |
| 1 | `src/sortable/behavior.ts:121`: `invalidate(operation: SortableOperation \| null): void`. The `this: SortableBehavior` parameter is removed. The body, the comment at `:120` and the method's place in the class are unchanged. `src/sortable.ts:67` still passes the receiver, as `kernel.requestStep(behavior.invalidate, behavior)` |
| 2 | `bench/lab.ts:2-4`: "Production's `src` and the before arm's `src`, at `--before <revision>`, bundle this file, each with its own `src`." The rest of the comment and of the file is unchanged |

## Checks

| Check | Result |
| --- | --- |
| `npx just typecheck` | exit 0. Removing the `this` parameter made no line fail |
| `npx just fmt`, `lint-fix`, `fmt`, `lint` on both files | `fmt` rewrote nothing, and both lint passes reported nothing |
| `npx just size` | exit 0. Every row reads as at `7f963e54a`, and "draggable alone" reads exactly 2189. Brotli: 2189, 3932, 3265, 4570, 3261, 4984, 5465, 6533, 6484 and 7143 B, in the gate's row order. The module counts are unchanged too. **No row moved, so nothing is re-based** (`DRD-68` property 3) |
| `git grep -nE '\(this: ' -- packages/drag/src` | only `kernel/callbacks.ts:61`, `kernel/drag.ts:35, 41, 60, 68, 83`, `kernel/gesture.ts:31, 38, 49, 55, 163, 168, 231, 234, 239, 243, 285, 287, 290` and `kernel/session.ts:196, 209`. These are the kernel's public overloads and their implementations |
| `git grep -n prototype -- packages/drag/bench` | nothing |

As the handoff states, no full test run was owed, and none was run. This report is formatted with `oxfmt`, and its relative links were checked with a script that resolves each link from this file.

## Next

The architect reads this report.