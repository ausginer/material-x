#### DRD-57 — The prefix selection is made per declaration across `src`, and adds 30 declarations

**Status:** superseded on 2026-11-13 by `DRD-60`. Was: active, decided on 2026-11-13 by the architect on the owner's request to audit `DRD-56`'s selection, from [`mangle-selection-audit.md`](../mangle-selection-audit.md) at `436b105c6`. Amends `DRD-56` property 2's starting set and adds the one-character rule to its property 1. [`mangle-selection-handoff.md`](../mangle-selection-handoff.md) implements it. Budgets are unchanged. **Implemented** at `b50204f66`, and reported at `1719df16c`. The architect hasn't read the report. Property 4 is superseded by `DRD-59`. **Superseded on 2026-11-13 by `DRD-60`:** its 30 declarations take back their names, and its audit stays as the record

**Every property declaration in `src` that `DRD-56` property 1 admits carries the `_` prefix, also when a platform member or a published member has the same name. The audit at `436b105c6` adds 30 declarations under 24 new names to `DRD-56`'s 37 declarations. The installer types' members, names of one character, and everything that property 1 keeps stay unprefixed. The step, the publication test and the map's generator don't change, and the map is generated again. Budgets are unchanged.** [`mangle-selection-audit.md`](../mangle-selection-audit.md) is the audit, and [`mangle-selection-handoff.md`](../mangle-selection-handoff.md) implements it.

Decided on 2026-11-13 by the architect, on the owner's request to audit the selection after `RectIndex.values` was found unprefixed.

**Why:**

- **The starting set came from a rule about names.** The exploration counted a name as eligible only when every use of it resolved to this package, because Rolldown's `mangleProps` renames every occurrence of a name. `DRD-56` renames one declaration and its uses, and its property 2 already says the prefix applies to a declaration. The starting set therefore left out every internal declaration whose name the platform or a published type also uses: `RectIndex.values` beside `Map.values()`, `FrameTask.cancel` beside `Animation.cancel()`, and 28 more ([audit](../mangle-selection-audit.md) §1).
- **The extension applies `DRD-56`'s own rule.** Each added declaration passes property 1 for the same reasons as a declaration that is already prefixed on the same class or type, such as `_config` beside `axis`, `_empty` beside `has`, and `_direction` beside `visual`. No step property changes.
- **A name of one character gains nothing.** The map's output names are at least one character, so a prefix on `x` or `y` adds a map entry and the rename's risk, and no bytes.
- **The installer members stay out,** as the owner chose under `DRO-15`. The exclusion is stated by declaration: members of internal types that only share a name with an installer member are selected ([audit](../mangle-selection-audit.md) §5).
- **The pipeline doesn't change,** so the independent review pinned to `436b105c6`, which reads `build/` and the publication test, still reads the code that this unit runs.

**Required properties:**

1. **The selection.** The 30 declarations in [audit](../mangle-selection-audit.md) §3 are prefixed, each together with its uses, by the type checker's rename at that declaration. A declaration with the same name that isn't in that table keeps its name. With `DRD-56`'s 37 declarations, 67 declarations under 53 names are prefixed.
2. **What stays** is [audit](../mangle-selection-audit.md) §4 and §5. This includes every member that an emitted `.d.ts` declares, every class member that implements a member of a published interface, and every member of an installer type or of an object that implements one.
3. **A property whose name is one character isn't prefixed.** This adds to `DRD-56` property 1's list of names that keep their names.
4. **The map.** The committed script generates `build/property-names.json` again. Its keys are exactly the 53 prefixed names in `src`, and a person reviews its diff. **The rename and the map change in one commit,** because the step fails a build on a prefixed name that the map lacks.
5. **Nothing else in the pipeline changes:** `build/*.ts`, `tsdown.config.ts`, `tests/publication.node.test.ts`, `package.json`, `files.json` and `.scripts/`. The `.d.ts` output is byte-identical. `DRD-56` properties 3 and 5 to 9 apply as written.
6. **Budgets.** Every ceiling and the control figure stay. The gate's reading on the published build is the booked figure (`DRD-51` property 1), and a verdict that changes goes to `DRO-4`.

**Estimated:** about 128 occurrences in the emitted modules and about 600 characters before compression, across the whole publication ([audit](../mangle-selection-audit.md) §6). Not measured.

**What this amends:** `DRD-56` property 2's starting set. The selection is `DRD-56`'s 37 declarations and these 30. Property 3 adds a rule to `DRD-56` property 1.

**What this doesn't decide:**

- the type-directed transform ([`performance-plan.md`](../performance-plan.md) §6, deferred);
- the installer types' names, or any name that a `.d.ts` declares;
- the independent review of `DRD-56`'s pipeline. Its pin, its scope and its passes stay as they are;
- whether the `shipped` census moves to the build, and `DRO-4`'s re-base.

**Implemented on 2026-11-13** at `b50204f66`, and reported at `1719df16c` ([report](../mangle-selection-report.md)). The architect hasn't read the report. **Property 4 is superseded by `DRD-59`:** the map is computed in each build, and no file holds it. Properties 1 to 3 and 6 stay.

**Superseded on 2026-11-13 by `DRD-60`.** Its 30 declarations take back their names without the `_`. The [audit](../mangle-selection-audit.md) stays as the record of the selection.