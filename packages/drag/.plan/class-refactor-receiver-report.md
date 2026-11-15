# Class refactor: receiver types follow-up report

**Unit:** [`class-refactor-receiver-handoff.md`](class-refactor-receiver-handoff.md) on `drag/class-refactor`, by an `implementer`. **Base:** `c157dffb5`, whose code equals `42f42a164`'s. **The unit's commit:** `c9e728bad`. This report is committed after it.

**Governing records:** `DRD-63` property 2, as revised on 2026-11-14, in [`00-index.md`](00-index.md); `DRD-35` properties 1 and 7, and `DRD-37` property 4, as `DRD-63` amends them; the [recheck assessment](class-refactor-recheck-assessment.md) §2 and §3; `class-refactor-recheck-1`. The owner's answer to Q2 is untouched: no read and no getter changed. Evidence is under [`measurements/2026-11-15-class-refactor-receiver/`](measurements/2026-11-15-class-refactor-receiver/).

## The form

**The polymorphic `this` type is the receiver** of `Retirable.retire` and `Invalidatable.invalidate`:

```ts
export interface Retirable {
  retire(this: this): void;
}
export interface Invalidatable {
  /** Staleness only, because scroll calls it many times a second. */
  invalidate(this: this): void;
}
```

This is the form of the assessment's probe.

- **How each site reads it:** read through `InsertionGeometry`, the member's receiver is `InsertionGeometry` (sites 1 and 2). Read through `DisplacementSink`, it is `DisplacementSink` (site 3). The compiler's own messages confirm both: the removal errors below name `(this: InsertionGeometry) => void` and `(this: DisplacementSink) => void`.
- **What stays:**
  - `Retirable` and `Invalidatable`, which carry the `this` declaration;
  - `InsertionGeometry` and `DisplacementSink`, which still extend them;
  - the JSDoc on the declaration that `InsertionGeometry` inherits.
- **What isn't changed:**
  - `axis.ts`;
  - sites 4 to 6;
  - any other `src` file.

drag's typecheck and lint accept the form.

## The witness

**A `drag:DRD-63` block is appended** to `tests/callbacks.declaration.test.ts`. Its `passSwapped` function takes a `Drag`, a `DraggableController<BehaviorOperation>`, an `InsertionGeometry`, a `DisplacementSink` and a `RectIndex`, each imported from `src`, as `passAlone` does. Each case carries `@ts-expect-error` with what it refuses:

| Case | Line | Call | What it refuses |
| --- | --: | --- | --- |
| W1 | 194 | `drag.use(geometry.retire, sink)` | the axis's `retire` on the sink |
| W2 | 196 | `controller.use(sink.retire, geometry)` | the sink's `retire` on the axis |
| W3 | 198 | `drag.requestStep(geometry.invalidate, index)` | the axis's `invalidate` on a `RectIndex` |

The line numbers are those of the cases' calls in the file at `c9e728bad`. Each case's directive is on the line above its call, so the directives are at lines 193, 195 and 197.

**Every existing line is kept:** `diff` against the file at `c157dffb5` shows only added lines.

**One added line is outside the appended block:** `import type { RectIndex } from '../src/sortable/rect-index.ts';`, after the existing `axis.ts` import. The handoff asks for an appended block only, with `RectIndex` imported from `src`. Inside the block, lint refuses both forms:

- an `import()` type fails `typescript(consistent-type-imports)`;
- an `import` statement fails `import(first)`.

So the import goes with the file's other imports.

## Checks

### 1. Formatting, lint and typecheck

- **Every edited file** went through `fmt`, `lint-fix`, `fmt` and `lint`, as [`handoff.md`](../../../.agents/docs/handoff.md) orders. The edited files are `retirable.ts`, `invalidatable.ts` and `callbacks.declaration.test.ts`. `lint-fix` changed nothing, and each file lints clean.
- **drag's `npx just lint`** exits 0 ([log](measurements/2026-11-15-class-refactor-receiver/checks/drag-lint.log)).
- **drag's `npx just typecheck`** reports only drag2's two `TS2724`, at `presentation.ts` lines 13 and 15 ([log](measurements/2026-11-15-class-refactor-receiver/checks/drag-typecheck.log)).

### 2. The `declaration` project

It passes 4 of 4 files and 27 of 27 tests, the appended block and every existing case included ([control](measurements/2026-11-15-class-refactor-receiver/mutations/control.txt)).

### 3. The emitted JavaScript is unchanged

drag was built at `42f42a164`, in a scratch worktree with its own box-quad build (`51dc4e4f…`), and at the end, `c9e728bad`.

- **All 33 emitted `.js` files are byte-identical.** The two hash lists are equal, and each list is saved: [`42f42a164`](measurements/2026-11-15-class-refactor-receiver/checks/js-hashes-42f42a164.txt), [end](measurements/2026-11-15-class-refactor-receiver/checks/js-hashes-end.txt).
- **All 30 `.js.map` files are byte-identical** as well.

So no size, allocation or timing figure can move.

### 4. Declarations against `42f42a164`'s build

Both builds emit the same 29 `.d.ts` files ([diff](measurements/2026-11-15-class-refactor-receiver/checks/declarations-vs-42f42a164.diff.txt)).

- **`free-drag/bounds.d.ts` and `free-drag/drop-targets.d.ts`** are identical, so they are still equal to `5b581fbdf`'s.
- **`sortable/retirable.d.ts`:** `retire(this: Retirable): void` becomes `retire(this: this): void`.
- **`sortable/invalidatable.d.ts`:** `invalidate(this: Invalidatable): void` becomes `invalidate(this: this): void`.

There are no other differences.

### 5. The mutations

Each mutation was applied by content and restored from its own scratch copy, never with `git checkout`. Its diff and its error output are saved under [`mutations/`](measurements/2026-11-15-class-refactor-receiver/mutations/). After the runs, the working tree's diff equalled its value before them.

- **M7** declares the receivers as at `42f42a164`, `this: Retirable` and `this: Invalidatable` ([diff](measurements/2026-11-15-class-refactor-receiver/mutations/M7.diff.txt)). The `declaration` project fails `callbacks.declaration.test.ts` with three `Unused '@ts-expect-error' directive` errors ([result](measurements/2026-11-15-class-refactor-receiver/mutations/M7.txt), [errors](measurements/2026-11-15-class-refactor-receiver/mutations/M7-typecheck.txt)):

  | Case | M7's error         |
  | ---- | ------------------ |
  | W1   | TS2578 at line 193 |
  | W2   | TS2578 at line 195 |
  | W3   | TS2578 at line 197 |

- **The six receiver removals** used the proof's [mutator](reviews/owner-class-refactor/proof-reviewer-probes/receiver-mutate.mjs.txt) unchanged, from a scratch copy. Each one gives exactly one `TS2345` at its own site ([results](measurements/2026-11-15-class-refactor-receiver/mutations/receivers.txt), one diff per site):

  | Site | Error | The type the error names |
  | --- | --- | --- |
  | 1. `drag.use(this.axis.retire, this.axis)` | `behavior.ts(207,14)` | `(this: InsertionGeometry) => void` |
  | 2. `drag.requestStep(this.axis.invalidate, this.axis)` | `behavior.ts(209,24)` | `(this: InsertionGeometry) => void` |
  | 3. `kernel.use(displacement.retire, displacement)` | `sortable.ts(59,16)` | `(this: DisplacementSink) => void` |
  | 4. `kernel.requestStep(behavior.invalidate, behavior)` | `sortable.ts(67,26)` | `(this: SortableBehavior, …) => void` |
  | 5. the tracker's `drag.use(this.#release, this)` | `drop-targets.ts(73,14)` | `(this: ElementTargetTracker) => void` |
  | 6. the tracker's `drag.requestStep(this.#resolve, this)` | `drop-targets.ts(68,24)` | `(this: ElementTargetTracker) => void` |

- **The recheck's [probe](reviews/owner-class-refactor-remediation/recheck-reviewer-probes/wrong-receiver.ts.txt)** was copied into a temporary directory under `packages/drag`, typechecked with a `tsconfig.json` that extends drag's, and removed. Both of its lines fail, as at `5b581fbdf` ([output](measurements/2026-11-15-class-refactor-receiver/wrong-receiver-probe.txt)):

  | Probe line | Error |
  | --- | --- |
  | `drag.use(geometry.retire, sink)` | TS2739: `DisplacementSink` lacks `InsertionGeometry`'s `resolve`, `confirm`, `moved` and `invalidate` |
  | `controller.use(sink.retire, geometry)` | TS2739: `InsertionGeometry` lacks `DisplacementSink`'s `dx`, `dy`, `report` and `displaced` |

## What wasn't run

- **Not owed, as the handoff says:** the full suite, size, allocation, timing, Firefox and WebKit. Check 3 shows that no emitted byte changed.
- **No `npm install` or `npm ci`,** and no change to `node_modules`, a lockfile or a browser. The scratch worktree linked to the main checkout's installed packages, and it has been removed.

## Next

The architect reads this report and repeats its mechanical checks ([recheck assessment](class-refactor-recheck-assessment.md) §5). The owner answers Q4, which doesn't wait for this unit. No finding is closed here.