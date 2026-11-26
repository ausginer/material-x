#### DRO-15 — A publish-time mangle of the library's internal property names

**Answered on 2026-11-13. Raised on 2026-11-12 by the architect** from [`property-mangling-exploration.md`](../property-mangling-exploration.md). The owner decides whether the package's build shortens its internal property names, and in what order the work runs.

**Answered in part on 2026-11-12.** The owner started option 1's first two steps, each as its own unit: consumer tests against the real `tsdown` output, then the size gate on that output. Source tests stay for internal behavior and development instruments. **Whether the build mangles names, and with which tier, waits for the published build's results.** `DRD-54` decides step 1, and [`consumer-tests-handoff.md`](../consumer-tests-handoff.md) implements it. Budgets are unchanged.

**2026-11-13:**

- **Step 1 landed** at `5ea7bb7e6` and was accepted, with the guard gap `DRF-23` ([assessment](../consumer-tests-assessment.md)).
- **Step 2 is decided as `DRD-55`:** the gate reads the published build, with every ceiling unchanged.
- [`published-gate-handoff.md`](../published-gate-handoff.md) repairs `DRF-23`, then implements `DRD-55`. Its per-row figures, from `src` and from the build, are the results that step 3 waits for.
- The mangle stays pending.

**Answered on 2026-11-13.**

- **Step 2 landed** at `69c260685`, and `DRF-23` closed at `79b4c3132`. The figures from `src` and from the build differ by −7 to +16 B Brotli, and no verdict changed (§Disposition of the published gate report).
- **Step 3: the owner chose explicit `_` prefixes** in source for strictly internal properties, followed by publish-time mangling. Public and platform names stay unchanged, and the mangled set isn't inferred from types.
- **The type-directed transform**, which would prefix chosen types' properties in the build, is deferred ([`performance-plan.md`](../performance-plan.md) §6).
- **Budgets are unchanged.**
- **Recorded and handed off:** `DRD-56` decides step 3, and [`publish-mangle-handoff.md`](../publish-mangle-handoff.md) implements it. Option 2, the installer types' names, isn't taken.

**Step 3 landed on 2026-11-13** at `f7b7b300b` and `31f92f5a9`, and was accepted ([assessment](../publish-mangle-assessment.md)). **The measured gain,** read by the gate on the published build against `c42c5b084`, Brotli-11: −31 to −66 B on the seven rows without `sortable`, and −102 to −110 B on "sortable + y", "sortable + xy" and "complete". That is −221 to −599 B minified. "example: resize handle" and "freeDrag" turn green, as the exploration estimated, and both go to `DRO-4`. Budgets are unchanged. The type-directed transform stays deferred.

**The selection was extended on 2026-11-13** by `DRD-57`, on the owner's request: 30 internal declarations whose names a platform member or a published member also uses. The installer members stay out, and budgets are unchanged.

**The mechanism changed on 2026-11-13 by `DRD-59`,** on the owner's requirements for the publication. The JavaScript is fully minified. Oxc's own `mangleProps` renames the same selection through a map that each build computes, and the custom renamer and the committed map go. The owner withdrew the requirement to keep the previous JavaScript text and source map segments. Budgets are unchanged.

**Deferred on 2026-11-13.** The owner deferred property mangling, because its measured savings don't justify its complexity, and asked for a rollback from `drag/size`. Measured on the published build, step 3 with `DRD-57`'s extension took −34 to −90 B Brotli off the rows without `sortable` and −132 to −135 B off the three rows with it. `DRD-60` records the decision, and [`mangle-rollback-handoff.md`](../mangle-rollback-handoff.md) removes the prefixes, the build step and the publication test. Steps 1 and 2 stay as `DRD-54` and `DRD-55`. The type-directed transform stays deferred, and budgets are unchanged.

**What was found.** About 950 B of a 28,664 B minified bundle of every entry are internal property names, which no minifier shortens, because they aren't `#private`: such as `config`, `enter`, `raise`, `first`, `collect` and `measurePlaceholder`. Rolldown can shorten them by name, with names the type checker finds eligible. A consumer's bundler doesn't, so the package's own build would have to.

**Measured** at `b0287f1ae`, Brotli-11, the build emulated with Rolldown and the rows bundled from it as a consumer would:

- −30 to −66 B on the rows without `sortable`, and −103 to −119 B on "sortable + y", "sortable + xy" and "complete";
- "freeDrag" (−66 B, 56 B over now) and "example: resize handle" (−54 B, 8 B over) would fall below their ceilings. No other red row would;
- no runtime work: a shorter name is the same property access.

**Costs and risks:**

- **Nothing checks the published build today.** The tests and the gate read `src`. The bundled rows from the unmangled build already differ from the gate's figures by −7 to +16 B.
- **Type analysis isn't enough.** It found `zIndex` eligible, a key of a keyframe object passed to `animate()`. Mangled, four landing tests failed. The suite against the built tree found it.
- **The published modules get harder to read,** and so do stack traces through internal methods.

**Options:**

1. **Take the internal names, in three units** (the architect's recommendation): the suite against the published build; then the gate on the published build, an instrument change under `DRD-23`; then the publish step, with the eligible names computed by the type checker, pinned by a test, and their cache committed.
2. Also take the names reachable only through `DRD-39`'s unpublished installer types: 34 to 37 B more on the `sortable` rows. **Not recommended:** it makes those types' member names a build detail, and it takes less off six of the seven other rows.
3. Take nothing, and keep the record.

**Recommendation: option 1.** Its first unit is worth having without the mangle, because nothing now runs the suite against what a consumer installs. Budgets don't change in the exploration, and `DRO-4` keeps the re-base, which option 1's second unit would move to the published build's figures.