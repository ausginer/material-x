#### DRO-16 — The publication's layout: three single-chunk units, or `DRD-59`'s per-module build

**Raised on 2026-11-13 by the architect** from [`unit-layout-exploration.md`](../unit-layout-exploration.md), at the owner's request to explore the owner's intended layout. **Withdrawn on 2026-11-13:** the owner stopped the exploration and deferred property mangling (`DRD-60`). No option is taken, and the exploration and its probes stay as evidence.

**The layout:** a kernel chunk with `draggable`, `fault`, `lift`, the kernel and `shared/*`, a sortable chunk, and a freeDrag chunk. Each is one Rolldown input with native `minify.mangleProps`, the kernel's chunk is external to the feature builds, and each public entry is a re-export facade at its current path. The candidate is in [`probes/unit-layout/`](../probes/unit-layout/README.md).

**What was found,** observed in Chromium at `cc9818a96`:

- **One family of accesses crosses a unit:** `FrameTask._schedule` and `_cancel`, declared in `shared/invalidation.ts`, called 3 times from `sortable` and 3 times from `freeDrag`. Each unit renames them differently, and 114 of 326 consumer tests fail. No other marker name crosses, and every unprefixed member that crosses is declared in a published `.d.ts` (exploration §2).
- **Either repair passes 324 of 326,** and the two failures are `DRF-39`: `shared/invalidation.ts` bundled into each feature unit, or `FrameTask`'s two members unprefixed (§2.2).
- **The rows:** −25 to +32 B Brotli against `DRD-59`'s build, with the same four rows over their ceilings. Each row keeps the same `src` modules as the current build, apart from `box-quad`'s index in "draggable alone", which costs 57 B minified. `"sideEffects": false` in `box-quad` removes it, and the row reads 2,148 B (§3).
- **Maps and annotations:** every renamed property maps to its source name, and annotations that `src` writes survive. `DRD-59`'s kept-name check and annotation guard aren't needed (§4, §5).
- **Costs that no row measures:** a consumer without a bundler loads a whole unit, for example 10,496 B for `fault.js` against 229 B; a chunk's legal comments reach every bundle that uses it; the gate's graph checks need the maps; the boundary needs a check of its own; the build has four configurations (§2.3, §3, §8).

**Options:**

1. **The layout, with `shared/invalidation.ts` in each feature unit.** No source change. The kernel chunk exports only public names, and an app with both features holds two copies, 178 B Brotli.
2. **The layout, with `FrameTask`'s members unprefixed.** One copy, +29 B minified on the `sortable` rows, two declarations fewer in `DRD-56`'s selection, and two internal exports from the kernel chunk.
3. **`DRD-59` as amended:** one module per source module, and Oxc's rename pass through a computed map.

**Separately:** `box-quad`'s `sideEffects`, which is that package's decision, and `DRF-39`, which applies to every option.

**Recommendation: option 1,** if the owner accepts per-unit loading for consumers without a bundler. The mangling itself is then native, as the owner's requirements for the publication ask, where `DRD-59` needs a custom pass and two guards for it. The boundary check and the gate change are bounded and testable. Option 1 or 2 becomes a new decision that supersedes `DRD-59` properties 1 and 3 and changes `DRD-55`'s graph checks. Budgets stay unchanged in every option.