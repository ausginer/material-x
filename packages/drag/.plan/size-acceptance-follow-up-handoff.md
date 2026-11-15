# Handoff: the last built-in receiver declaration, and the lab comment on the arms

**Recipient:** the implementer. **Branch:** `drag/size-acceptance`. **Input:** the architect's record commit that adds this handoff, from `7f963e54a`.

**Governing records,** in [`00-index.md`](00-index.md):

- `drag:DRD-69` property 4, as amended on 2026-11-15 at `7f963e54a`;
- `drag:DRO-5`, and item 6 of [`size-acceptance-cleanup-handoff.md`](size-acceptance-cleanup-handoff.md): the prototype arm is retired;
- `drag:DRD-68` property 3: the re-measure after the unit's last change;
- §Disposition of the size acceptance cleanup report, open items 1 and 2.

**Scope:** `src/sortable/behavior.ts` and `bench/lab.ts`, under `packages/drag/`. No other file changes apart from the report.

## 1. `SortableBehavior.invalidate` declares no `this` (`DRD-69` property 4)

At `7f963e54a`, `src/sortable/behavior.ts:121-124` declares `invalidate(this: SortableBehavior, operation: SortableOperation | null): void`. The `this` parameter goes. The method's body, its comment and its place in the class don't change.

**`sortable.ts`'s site still passes `behavior` as the receiver** (`kernel.requestStep(behavior.invalidate, behavior)`), so the step coalesces by the same pair.

**If removing the `this` makes any line fail typecheck, stop** and report it.

## 2. `bench/lab.ts`'s file comment names the arms there are

At `7f963e54a`, `bench/lab.ts:2-4` says "The production and prototype arms bundle this file, each with its own `src`." The comment says which arms bundle the file as `compare.ts` builds them now: production's `src`, and the before arm's `src` at `--before <revision>`, each with its own `src`. It doesn't name the prototype arm. The rest of the comment, and the file, don't change.

## Checks

- `npx just typecheck` in `packages/drag` exits 0.
- The Verify steps of [`handoff.md`](../../../.agents/docs/handoff.md) for both files: `fmt`, `lint-fix`, `fmt`, `lint`.
- **`npx just size` exits 0, and no row moves** against `7f963e54a`'s readings, with "draggable alone" at exactly 2189. A `this` parameter is erased from the emitted code, so a moved row is a stop. Under `DRD-68` property 3 this is the unit's re-measure, and nothing is re-based.
- `git grep -nE '\(this: ' -- packages/drag/src` finds only the kernel's public overloads in `kernel/callbacks.ts`, `kernel/drag.ts`, `kernel/gesture.ts` and `kernel/session.ts`.
- `git grep -n prototype -- packages/drag/bench` finds no mention of a prototype arm.

**No full test run is owed.** Item 1 changes a type that the emitted code doesn't hold, and item 2 changes a comment in a file that only `compare.ts` bundles. The size run builds and reads the published code.

**Stops.** A typecheck failure from item 1, or a row that moves. Report each with its output. Don't adjust a figure or another line to pass.

## Report

`packages/drag/.plan/size-acceptance-follow-up-report.md`: each edit as `file:line`, each check and its result, any stop, and the commits.

The unit stops at the pushed report. Next, the architect reads it.