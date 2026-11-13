# Publish-mangle review: code discipline (cleanup)

**Commit read:** `436b105c6b855b8702a677ba42db850676e911a0` on `drag/size`, clean tree. Rules applied: `CONTRIBUTING.md` in full, `.agents/docs/documentation.md` §5.

## Scope

**Covered:** `packages/drag/build/` (`rename-properties.ts`, `property-names.ts`, `generate-property-names.ts`, `property-names.json`) and `packages/drag/tests/publication.node.test.ts`, measured against `DRD-56` and `publish-mangle-assessment.md` §9. I also read `tsdown.config.ts` and `publish-mangle-report.md` §4 and §5, only to place the files' callers.

**Not covered:** everything §9 excludes, the selection of the 37 declarations in `src`, and the type-directed transform. I reran nothing and challenge no accepted evidence.

## Result

Three findings, all tier C and all internal. None touches lifecycle, failure semantics, public API or ownership, so none goes to the architect under §13.

### cleanup-1 (C): the reserved-word list is copied into the generator and the test

- **Finding:** the same 8-line `RESERVED` array is written in `build/generate-property-names.ts` and in `tests/publication.node.test.ts`. The identifier rule is also written twice: as `FIRST`/`REST` in the generator and as `IDENTIFIER_NAME` in the test.
- **Current behavior / contract:** the generator skips reserved words, and V3 re-checks every output name against its own copy.
- **Why it is a problem:** this is one concept with two definitions and no stated reason for the second. An independent oracle is a legitimate reason, but nothing in the test says that is the intent. If the lists drift, the generator and V3 disagree about what a legal name is, and the disagreement shows up as a failure with no cause attached.
- **Evidence:** `generate-property-names.ts` lines 29-39 and the `FIRST`/`REST` constants; `publication.node.test.ts` lines 17-29.
- **Required property:** each concept has one definition, or the second copy states that it is deliberately independent.

### cleanup-2 (C): "the prefixed names in `src`" is computed twice, and the test's copy is not independent

- **Finding:** `generate-property-names.ts`'s `textsIn` + `sourceNames` and the first test ("should map exactly the prefixed property names in src") both do the same work: walk `src` for `.ts`/`.tsx`, parse each file with `readNames`, and keep the `isPrefixed` names. The test also repeats the recursive-`readdir` and read helpers (`filesUnder`, `readAll`) beside `textsIn`.
- **Current behavior / contract:** the generator derives the keys, and the test checks that the committed map holds exactly those keys.
- **Why it is a problem:** the test uses the same `readNames` and `isPrefixed`, so it repeats the generator's computation and cannot catch a reader defect, only a stale map. That check is valuable, but the duplicated walk is machinery with a second home and no added independence.
- **Evidence:** `generate-property-names.ts` lines 63-95; `publication.node.test.ts` lines 189-215 and 35-63.
- **Required property:** one owner of "the prefixed property names `src` holds". Alternatively the test says what it checks that the generator cannot.

### cleanup-3 (C): the generator's name sequence is wider than its use

- **Finding:** `candidates()` is an odometer over names of any length (about 30 lines). The map has 29 names and all of them are one character. The 53-character first-position alphabet leaves room for them even after `kept` removes some names. The multi-character branch is not reached by the committed tree.
- **Current behavior / contract:** the first available legal name goes to the next key by frequency.
- **Why it is a problem:** this is an abstraction wider than its current use, unexercised and untested, and its first run would be in a future diff. Capacity for growth is a defensible reason, but the file doesn't claim it. Confidence is low: it only matters if the rule is "no code for cases the tree doesn't reach".
- **Evidence:** `property-names.json` (outputs `a` to `E`, none longer); `generate-property-names.ts` lines 41-76.
- **Required property:** the sequence's extent is justified by the names it must serve, or by a stated bound.

## Checked and found justified (no defect)

- **`rename-properties.ts`:**
  - The per-column segment emission is what lets rolldown compose the chunk's own map through the step, as the file's header says. It owns a real algorithm.
  - The unknown-name error is a build contract, and M1 exercises it.
  - The shorthand-key error guards a rename that would silently change a binding. V1 would not catch it.
  - `RENAME_PROPERTIES` is a named value that the generator uses to remove the step from its build.
- **`property-names.ts`:**
  - `readNames` is the one reader that the step, generator and test share.
  - `strings` serves only V1, `shorthand` serves only the step, and both live in the one parse.
  - The offset self-check is a cheap guard on a unit assumption.
- **`generate-property-names.ts`:**
  - The `--out` option serves the generator-runs determinism check (report §4). It is small and has a caller.
- **The test:**
  - `writes`/`MODIFIERS` match a mapping that may start at a class modifier, which is a real property of the maps.
  - V1 to V4 each own a distinct property of `DRD-56`.
- **Comments:** headers and inline comments state constraints that hold. None narrates history or carries dates, phase numbers or review narration (`documentation.md` §5.2). The bare `drag:DRD-56` pointer and the `V1` to `V4` labels are the allowed index pointers.