#### DRO-10 — The capability model and the `targets` slot's charge

**Approved by the owner on 2026-11-09:**

- closed, named capability slots are v1's extension model, and a whole new behavior remains the fallback when the existing slots are insufficient (`DRD-2`, `DRD-33`);
- the `targets` slot's charge to `freeDrag` without `dropTargets`: **45 B Brotli**, measured on the revised prototype ([assessment](../feature-composition-assessment.md) §7 and §8).

**How the charge is read.** It is the slot's call sites, including the invalidation listener's move to the operation. It is measured over the state with the landing capability and without the slot. On the prototype it was +45 B on `freeDrag`, +44 B on `freeDrag + landing` and +35 B on `freeDrag + bounds + landing`, and +209 B minified on `freeDrag`. The architect reads the approval as covering each `freeDrag` composition that omits `dropTargets`, up to 45 B. The owner corrects that reading if it is wrong.

**Not covered,** reported and not accepted:

- the landing capability: +2 to +27 B on compositions that compose a landing, −172 to −240 B on lifted compositions that don't, and +90 B on the drop-zone fixture;
- the drop-target capability when composed: 261 B Brotli, and its allocation per operation;
- the `bounds` repair (`DRF-5`);
- `RectIndex`'s encapsulation, +13 to +16 B.

**Optimization and timing stay deferred.** The approval re-bases nothing. A port whose slot charge is above 45 B Brotli on a composition that omits `dropTargets` isn't covered, and the report puts that figure to the owner.

**The excess and the costs not covered, accepted by the owner on 2026-11-15, with nothing removed** (`DRD-68`). The architect first read the owner's acceptance of drag's current size this way, and the owner confirmed it. The excess is +78 B on `freeDrag` and +59 B on `freeDrag + landing` against 45 B, as the [report](../feature-composition-report.md) at `0bb03f3ea` gives them. The costs are every item under **Not covered**, including the drop-target capability's allocation per operation. The owner named no part to remove.