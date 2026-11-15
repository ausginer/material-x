# Handoff: `y()`'s stated terms in the gap instrument, and a development check that leaves the cache alone

**Recipient:** the implementer. **Branch:** `drag2/removal`, or one the owner names. **Input:** the architect's record commit on `drag2/removal` that adds this handoff.

**Governing records:** `drag:DRD-65` and `drag:DRD-66` in [`00-index.md`](00-index.md), on `DRF-46` and `DRF-47`. The evidence is the architect's [probe](probes/drag2-guarantees/ruling/README.md). The contract's `DRI-14` Geometry paragraph already states the terms. This unit makes the tests, the comments and the development check agree with it.

**Scope:** `tests/support/gap-conformance.ts`, `tests/y-geometry.browser.test.ts`, the comments named in item 2, and `verifyEquivalence` with its call in `src/sortable/linear-shift.ts`. Nothing else in `src` changes, and nothing changes in the shipped build.

**Order:** items 1 and 2, then item 3. Item 3's witness reads item 1's instrument.

## 1. The instrument admits a tie, and S2 gains its cases (`DRD-65` properties 2 to 5)

- **Ties.** At each sample, the admissible gaps are those given by every candidate (the placeholder's center and each row's) whose distance to the pointer is within 1/8 px of the smallest. A sample disagrees only when the proposal isn't admissible. The tolerance is a constant of the helper, with its reason in a comment: each of the two compared centers may be off by drag's 1/16 px (`DRI-14`). Don't import it from `src`.
- **Tie samples are countable.** The sweep can report how many samples were ties, for the report. No test asserts the count.
- **S2's rotate case returns** to the `drag:DRI-14 y() proposes the gap a full measurement gives` block, from [`S2-rotate-stopped.test.ts.txt`](probes/drag2-guarantees/S2-rotate-stopped.test.ts.txt), with its fixture unchanged and its comment kept.
- **Two cases for the shift term**, in the `drag:DRI-14 the gap instrument` block. A block column whose rows all carry `margin-top: 6px` and `margin-bottom: 10px` is reported (`not.toEqual([])`). The same list with a style rule `[data-drag-placeholder] { margin: 6px 0 10px }` agrees (`toEqual([])`). Titles follow the block's existing ones.
- **Witnesses**, saved like the guarantees unit's under `probes/drag2-guarantees/mutations/`, with the `.diff` and the `.log`:
  - `S2-tie-0`: the tolerance set to 0. The rotate case fails in the consumer project.
  - With the tolerance at 1/8 px, re-run the saved `S2`, `S2-2`, `S2-3` and `S2-instrument`. Each still fails its tests.

## 2. The comments say what the contract says (`DRD-65` property 6)

- `src/sortable/y.ts`'s module comment: replace "a wrapping list does not satisfy it, and varying gaps and margins do" with the term as `DRI-14` now states it. A wrapping list and margins that collapse on both sides of an item don't satisfy it, and a placeholder with the items' margins does. A flex column, a flow gap and margins on one side of each item do.
- The public JSDoc of `y()`: add the shift term, the collapsing-margin exclusion and its remedy, in a sentence or two beside the existing exclusions.
- Comments only. The emitted `.js` files are byte-identical to the input's. Show that with a build of the input and of the unit.

## 3. The development check leaves the cache as it found it (`DRD-66`)

- **`verifyEquivalence` measures into storage of its own.** After the call, the operation's `RectIndex` holds what it held before the call: every slot's six fields, the window's `first` and `end`, the element array, the count, the staleness flag and the measured version. A development-only allocation for that storage is accepted.
- **Unchanged:** when the check runs, which is one frame after the committed move, from `LinearShift.refresh`; what it compares, including `DRD-52`'s held x; its message; and that it writes nothing to the DOM.
- **Its JSDoc** says that it doesn't change the cache, and drops "so a mismatch leaves the cache correct" and "forces the rebuild".
- **The shipped build is byte-identical,** as in item 2, and `npx just size` shows the same rows as the input.
- **Witnesses, in the report:**
  - At the integer pointer path of the rotate fixture, the source project's proposals equal the consumer project's at every sample, including `proposed 1` at 95. Record both sequences, and the input's source-project sequence, which differs there. The probe's file shows one way to print them.
  - `tests/equivalence-check.browser.test.ts` passes, and fails with the held x removed (`DRD-52`'s M1).
  - The collapsing-margin case of item 1 still ends the drag in the source project.
- **A source-project test that newly fails is a stop.** Report it with its assertion and don't adjust it. It relied on the re-measure, and that's the architect's decision.

## Checks

- `npx just test` in `packages/drag`: every new and changed test passes in the source, consumer and node projects. The five `size.node.test.ts` ceiling rows fail at the input (`DRO-4`) and don't count against this unit. Any other failure does.
- `npx just test-engines --project browser --project browser/firefox --project shipped --project shipped/firefox` exits 0. WebKit isn't owed locally (`DRO-18`).
- `npx just typecheck` and `npx just lint` in `packages/drag` exit 0.
- The Verify steps of [`handoff.md`](../../../.agents/docs/handoff.md) for every edited file.

## Report

`packages/drag/.plan/y-geometry-terms-report.md`:

- each item's tests and comment edits, as `file:line`;
- the witnesses and mutations, with their failures;
- the tie counts for the rotate fixture in each project;
- the byte comparison of the emitted `.js`;
- any stop, with its assertion;
- the commits.

The unit stops at the pushed report.