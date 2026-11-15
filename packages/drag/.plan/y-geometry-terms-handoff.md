# Handoff: `y()`'s stated terms in the gap instrument, and drag's development checks as test-side oracles

**Revised on 2026-11-15, before the unit:** `DRD-67` superseded `DRD-66`, so item 3 now moves both development instruments into test support and removes `__DEV__`. The title, the governing records, the scope and item 3 changed. Items 1 and 2 are unchanged.

**Recipient:** the implementer. **Branch:** `drag2/removal`, or one the owner names. **Input:** the architect's record commit on `drag2/removal` that adds this handoff.

**Governing records:** `drag:DRD-65` and `drag:DRD-67` in [`00-index.md`](00-index.md), on `DRF-46` and `DRF-47`. The evidence is the architect's probes: [the S2 ruling](probes/drag2-guarantees/ruling/README.md) and [the test-side oracles](probes/test-side-oracles/README.md). The contract's `DRI-14` Geometry paragraph already states the terms. This unit makes the tests and the comments agree with it, and replaces `__DEV__` with oracles that run against the source and the published build.

**Scope:** `tests/support/gap-conformance.ts`, `tests/y-geometry.browser.test.ts`, the comments named in item 2. For item 3: the `__DEV__` sites in `src`, the defines in `tsdown.config.ts`, `.scripts/vite-config.ts` and `.scripts/vitest-config.ts`, test support and setup, the tests that read the development instruments, and the contract's `DRI-6` as `DRD-67` property 8 words it. The shipped build's code doesn't change.

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

## 3. drag drops `__DEV__`, and its instruments become test-side oracles (`DRD-67`)

`DRD-67`'s required properties are the specification, and its [probe](probes/test-side-oracles/README.md) shows one working form of both oracles. In outline:

- **Remove** every `__DEV__` site in `src`, with `verifyEquivalence`, `LinearShift`'s development state and `countRefused`, and the `__DEV__` declaration. Keep `EQUIVALENCE_SLACK`. Remove the define from every configuration. The `shipped` project stays, without the define, to run the hot-path census against `src` without the oracles, and its comment says so (properties 1 and 2).
- **Install the oracles** from test support in every browser project except the census: on `src` in the source projects, and on the emitted `sortable/rect-index.js` and `kernel/gesture.js` in the consumer project. The project configuration chooses, and no test reads which build it runs against (property 3).
- **Their semantics and reporting** are property 4's. A mismatch or a refusal is recorded, and the harness fails a test that ends with an unconsumed mismatch or a trusted refusal. The instrument's self-checks, item 1's collapsing-margin case and `DRD-52`'s test consume the mismatches they expect. A title that says the development check ends the drag is rewritten.
- **The liveness tests** of property 5 run in the source and consumer projects. `tests/equivalence-check.browser.test.ts` and `tests/refusals.browser.test.ts` leave the source-only list.
- **The witnesses** of property 6 go in the report. The rotate fixture's proposals, source against consumer, are recorded at every sample of the integer path, with the input's source sequence beside them.
- **The contract's `DRI-6`** changes in the commit that removes `countRefused`, word for word as property 8 gives it.
- **The emitted `.js` differs from the input's only in comments,** and `npx just size` shows the same rows as the input.
- **A test that newly fails is a stop** (property 7). Report it with its assertion and don't adjust it, apart from the consumption above.

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
- the comparison of the emitted `.js`, for item 2 and for item 3;
- the oracles' liveness results in each project;
- any stop, with its assertion;
- the commits.

The unit stops at the pushed report.