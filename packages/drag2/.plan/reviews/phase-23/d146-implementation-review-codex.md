# D-146 implementation review

Independent implementation and public/middle-tier contract review, 2026-08-28. Reviewed `4568e56336ffe4e3e68d55cddac175782ac8e61e` against D-146 as settled: unique capability cardinality is represented by config position and position-specific contribution types; `plugins` is multi-writer only; runtime `claim()` arbitration and the producer-less contributed-placeholder path are gone. No production or contract fix is part of this review.

## Finding 1 — P1: same-behavior unique installers remain assignable to `plugins`

The position-specific declarations do not enforce the intended boundary at the published installer aliases.

`SortablePluginContribution` and `FreeDragPluginContribution` are all-optional weak types. Each same-behavior unique contribution type declares at least one property in common with its plugin target:

- `AxisContribution` shares `beforeInsertionMove`, `afterInsertionMove` and `retire` with `SortablePluginContribution`;
- `LandingContribution` shares `retire` with both plugin contribution types;
- `ConstraintContribution` shares `retire` with `FreeDragPluginContribution`.

Function return covariance therefore makes all four assignments compile under the repository's `strict` TypeScript configuration:

```ts
const axisAsPlugin: SortablePlugin = axisInstaller;
const sortableLandingAsPlugin: SortablePlugin = sortableLandingInstaller;
const constraintAsPlugin: FreeDragPlugin = constraintInstaller;
const freeDragLandingAsPlugin: FreeDragPlugin = freeDragLandingInstaller;
```

This route needs no `any`, cast, `@ts-expect-error`, plain JavaScript or contextually typed fresh return literal. It uses the published aliases directly, so `CODE_OF_SIZE.md` §1.1's reachability gate does not down-rank it.

The assemblers invoke these values as plugins and read only the plugin group's declared members. `insertion`, `startLanding` or `constrain` is silently ignored. The defect therefore does not create a second runtime writer or corrupt the selected unique slot; it makes a supported typed composition execute an installer in the wrong position and discard the capability it exists to provide. That contradicts the D-146 claim that the composition cannot be written and recreates the silent no-op shape the positional boundary was meant to remove.

### Why the declaration tests pass

The two tests named _should refuse a unique slot from the unbounded position_ use these shapes:

```ts
const sortable: SortablePlugin = () => ({ insertion });
const freeDrag: FreeDragPlugin = () => ({ startLanding });
```

They are refused because the returned object has no property in common with the all-optional target. This is weak-type detection, not a proof that the plugin position refuses a unique contribution. Adding `retire`, adding a declared sortable hook, returning a hoisted unique contribution, or assigning the unique installer alias directly makes the same unique member compile through the plugin position.

The positive controls do not discriminate this failure: they prove separately that a declared hook or lifetime is accepted, but never combine that common member with the forbidden unique member. The `keyof` assertions prove only that the plugin group does not declare the unique key; TypeScript's structural width subtyping still accepts a value whose type declares more keys.

This is distinct from F-117's accepted contextual-return caveat. F-117 says a correctly typed installer may return a fresh literal with ignored extra properties. This finding starts from an already typed, published unique-installer value and shows that the published plugin slot accepts that value as a plugin.

## Finding 2 — P2: the record and public documentation still describe the deleted `claim()` model

Several present-tense, unstruck statements contradict D-146 and the implementation:

- `contract/03-feature-composition.md` §Assembly says cleanup is recorded before a claim, explains the collision that claim unwinds, and says a collision remains inside `plugins`.
- Its validation table says a duplicated single-writer contribution is **kept** as the package's one construction-time throw, followed by the summary _sortable construction-time diagnostics: six to one_.
- `README.md` repeats that `claim` is the surviving sortable construction diagnostic.
- The `free-drag.ts` public module documentation still says `FreeDragInstaller` ships from the ordinary entry.
- Test commentary and `tests/COVERAGE.md` still name removed `FreeDragInstaller`, `FreeDragContribution`, `SortableInstaller` and `SortableContribution` declarations.

The stale normative and consumer-facing statements are materially misleading: the runtime now has no contribution arbitration or duplicate-contribution diagnostic, and the public surface publishes three installer aliases and three contribution groups per behavior. The existing documentation, reference and export tests pass because they validate links, closure and runtime export equality rather than the semantic truth of these statements.

## Verification

- A temporary declaration probe containing the four alias assignments above passed `npx just typecheck`; it was removed after the result was recorded.
- The targeted declaration, assembler, required-slot, placeholder, landing and free-drag suites passed: 8 files, 189 tests, no type errors.
- The packed-consumer, export-topology, packaging, TypeDoc-closure and reference suites passed: 5 files, 36 tests, no type errors.
- The F-128/F-130 placeholder simplification did not produce a finding. `createPlaceholder` retains the post-factory liveness reading and the per-write barriers in `applyMechanics`; `activation.rollback` retains the consumer-owned undo ledger and clears it only at adoption. The existing destroying-factory and cancel-during-factory fixtures exercise both guarantees.
- Required `insertion`, `constrain` and `startLanding` members are enforced for conforming TypeScript authors. Missing or malformed members require bypassing the published contract; their natural throw, silent absence or later seam failure is therefore outside the library's runtime obligation under `CODE_OF_SIZE.md` §1.1 and is not raised as a finding.
- D-138's cross-behavior boundary remains carried by the branded context. Sharing `LandingContribution` structurally does not make a typed sortable landing installer assignable to the typed free-drag landing alias or vice versa; the finding above is same-behavior, cross-position assignability where the context type is intentionally identical.