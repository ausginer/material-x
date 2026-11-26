#### DRO-21 — The owner's source edit, and no guarantee about detached calls

**Decided by the owner on 2026-11-15,** relayed by the coordinator to the architect on `drag/size-acceptance`, with the owner's commit `988643dc9`, committed unchanged:

- loop locals replaced by direct field reads, in `RectIndex`, `LinearShift`, `xy()`, `layoutAnimation`'s sink and the drop-target tracker;
- the `sortable` and `freeDrag` controller members declared as methods, rather than read-only arrow properties;
- `this: this` removed from `Invalidatable`.

**The owner drops the remaining receiver and destructuring guarantees altogether:** the project no longer tells users which members may be called detached and which may not. The owner also wants TSDoc on `Invalidatable` and `Retirable`.

**Applied by `DRD-69`.** At `988643dc9`, typecheck reports an unused `@ts-expect-error` at `tests/callbacks.declaration.test.ts:197`, which `DRD-69` property 4 removes with its test.