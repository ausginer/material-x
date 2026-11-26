#### DRO-9 — The costs of the execution boundary

**Approved by the owner on 2026-11-08: `DRD-32` at the cost the [assessment](../execution-boundary-assessment.md) §5 reports, and counting each refused event once.** The figures were measured on the v3 prototype at `ef8c6cd96`.

- **Size, Brotli:** `draggable alone` +13 B. The other compositions +16 to +23 B. `example: drop zone` goes over its 4431 B ceiling by 11 B. `freeDrag`, `freeDrag + bounds + landing` and the control row were over at the base.
- **Allocation, by reading:** 5 fewer functions per controller, 3 fewer per operation, pointer or command, and the two module-level `NOOP`s removed. Nothing per sample, which the per-sample test showed. A sample makes one more string comparison. No timing was taken.
- **The instrument:** `DRI-6`'s development count counts each refused event once. The set it uses exists only in development builds, and the production bundle doesn't contain it.

**What the approval covers:** those figures. **It re-bases nothing.** The drop-zone row lands red, as the `freeDrag` rows do, until a re-base under `DRO-4`. The implementation's report measures at `8943f14e5` and after its commit. A figure beyond those above isn't covered and goes back to the owner: more than +23 B Brotli on a row, or any allocation per sample.