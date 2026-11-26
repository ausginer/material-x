#### DRD-39 — A type that a published signature names is exported from an entry

**Status:** active, decided on 2026-11-10 by the architect on `DRF-10`, from [`combined-review-assessment.md`](../combined-review-assessment.md) §3. Amends the contract's public surface. [`combined-review-remediation-handoff.md`](../combined-review-remediation-handoff.md) item 1 implemented it at `d1a262306`, reported at `f2ac81bc5` ([report](../combined-review-remediation-report.md)). Proven by the [feature proof](../reviews/combined-ownership/remediation-reviewer.md) at `26919a938`, and read by the architect ([assessment](../combined-review-remediation-assessment.md)): conforms. `DRF-10` is closed

**Each type that a published signature names is exported from the entry that publishes the signature. The exception is the installer types of the `axis` and `displacement` slots, which stay unpublished.** In this package that adds `VerdictAwaiter` to `draggable.js`, and `DragAxis`, `FreeDragSubject` and `ResolveHome` to `free-drag.js`.

Decided on 2026-11-10 by the architect, on `DRF-10` from the combined review ([assessment](../combined-review-assessment.md) §3).

**Why:**

- **CONTRIBUTING §4's test is met.** An author who writes a class operation under `DRD-30` writes `drop()`'s return type, as both built-in operations do. A consumer who types a `home` callback or an `axis` value apart from the call writes the other three.
- **Only surface is added.** Types emit nothing. The published signatures already fix these shapes, so the export adds a name and makes no new promise.
- **The alternative costs more.** It would inline the types and record the names as unpublished. Authors would then repeat a function type that the library's own operations name, and DRI-18 would need an exception for the operations that the README offers as the model.
- **The installers keep `DRD-2`'s reason, as `DRD-33` amended it.** No example wants a third-party axis or displacement, and publishing later breaks nothing. A consumer passes what `y()`, `xy()` or `layoutAnimation()` returns, and never writes the installer type.

**Required properties:**

1. **The exports.** `draggable.js` exports the type `VerdictAwaiter`. `free-drag.js` exports the types `DragAxis`, `FreeDragSubject` and `ResolveHome`. No name changes.
2. **DRI-18 holds without an exception.** `sortable` and `freeDrag` import `VerdictAwaiter` from `draggable.ts`. Outside `src/kernel/`, only `src/draggable.ts` imports from `kernel/`.
3. **The instrument.** `typedoc` for this package warns only about `AxisInstaller` and `DisplacementInstaller`.
4. **A witness.** A declaration test imports each new export from its entry. Removing one export fails typecheck.
5. **Published JSDoc.** Each new export has a JSDoc that says what it is.

**What this amends:** the contract's public surface (see its change record). **Cost:** none in bytes. [`combined-review-remediation-handoff.md`](../combined-review-remediation-handoff.md) item 1 implemented it at `d1a262306`.