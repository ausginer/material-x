#### DRD-66 — `__DEV__` stays as drag's own test instrument, and the development equivalence check stops changing the cache it checks

**Status:** superseded on 2026-11-15 by `DRD-67`, before implementation. Was: active, decided on 2026-11-15 by the architect on the owner's hypothesis that drag drop `__DEV__`: declined, with the development equivalence check made to leave the cache unchanged. Amended `DRD-52` property 7

**Superseded on 2026-11-15 by `DRD-67`, before implementation.** Its table of what each site gives, and its account of the S2 difference, stand. Its claim that moving the check into tests needs an internal export or hook in `src` was wrong: both classes are exported between modules in `src` and in the emitted build, and `DRD-67` puts the check on their prototypes. The text below is unchanged.

**The owner's hypothesis, relayed by the coordinator on 2026-11-15, is declined: drag keeps `__DEV__` and both of its sites. A narrower change is adopted: the development equivalence check measures the tree into storage of its own and leaves the operation's cache as it found it, so a source-project run carries the same predicted geometry as the published build.** The hypothesis was to remove `__DEV__` and rely only on black-box behavior, because S2's rotate case passes in the development build and fails in the published one.

Decided on 2026-11-15 by the architect, on that hypothesis and the probe of `DRD-65`. **Amends `DRD-52` property 7:** the check also leaves the cache unchanged. [`y-geometry-terms-handoff.md`](../y-geometry-terms-handoff.md) item 3 implements it. The owner may still choose removal, and its costs are below.

**What each site gives, and to whom.** No consumer runs either site. `tsdown.config.ts` defines `__DEV__` `false`, and `package.json` has no `development` condition, so the published package has one build without them. `__DEV__` is `true` only where drag's own `src` runs: the source test projects and Storybook (`.scripts/vite-config.ts`, `.scripts/vitest-config.ts`). Both sites are test oracles that sit in `src`, not consumer diagnostics. CONTRIBUTING §1.3's provenance rule is about a diagnostic that a gate strips from someone who needs it, and no consumer build ever had these.

| Site | What it does | Who reads it |
| --- | --- | --- |
| `src/kernel/gesture.ts:201`, `countRefused` | Counts each event that a running pass refused, trusted and untrusted, on `globalThis.__dragRefused` | The harness, after every source-project browser test: no trusted event was refused (`DRI-6`). `tests/refusals.browser.test.ts` |
| `src/sortable/linear-shift.ts` (the `developmentChecks` map, the held x in `refresh`, `advanceUnchecked` in `moved`) and `verifyEquivalence` in `src/sortable/rect-index.ts` | One frame after each committed move through `y()`, measures the window and the placeholder again, and throws a fault when any field differs by more than 1/16 px | Every source-project test that commits a move through `y()`, and `DRD-52`'s test in `tests/equivalence-check.browser.test.ts`. Drag's stories in Storybook |

**Whether it explains the S2 difference: yes, but no defect was hidden.** The check rebuilt the window from the tree after every committed move, so it replaced the predicted cache with a fresh one. A source-project run therefore tested one move's prediction at a time, and the published build tested the chain. What that hid was a 1.4 × 10⁻⁶ px error at a tie (`DRF-46`). An error above 1/16 px makes the check throw, so the source project is louder than the build there, not quieter: the collapsing-margin list of `DRF-47` faults in the source project and is silently wrong in the build. So the hypothesis is right that the development run checks a different cache. That is the narrow fault this decision repairs, and it doesn't need `__DEV__` removed.

**What removal would save.** No shipped byte and no runtime, because the build already folds both sites. In `src`: `verifyEquivalence`, its state in `LinearShift` and `countRefused`. In the tooling: the define in two configurations. The `shipped` project exists to run the hot-path census without the check's reads, and it could merge into the source project.

**What removal would cost.**

- **`DRI-6`'s "no event with `isTrusted` true is refused" loses its only witness.** A refusal is silent by design. A black-box test sees a refused trusted event only when the loss changes an outcome, and an oracle in the harness would have to reproduce the gesture's definition of a running pass: input, frames, settled verdicts and idle requests.
- **The cache stops being checked field by field in every `y()` drag.** The gap instrument is the black-box oracle, and it already runs in both projects. It sees a cache error only when the error changes a gap at a sampled pointer. `DRD-52`'s held-x check has no black-box equivalent, because nothing reads the placeholder's x (`DRD-52` property 8).
- **Drag's stories lose the fault** that says a story's layout is outside `y()`'s rule.

**Moving the check into tests doesn't help.** The gap-level oracle is in tests already (`tests/support/gap-conformance.ts`). The field-level one needs the operation's cache, which is private to `y()`'s geometry object. A test could reach it only through an internal export or hook in `src`. That is test surface in `src` again, with the same build split, in place of a branch that the build already removes.

**Black-box coverage of the published build already exists.** The consumer project runs every public browser test against the build (`DRD-54`), and that is how the rotate case was found. `__DEV__` adds a white-box layer to the source runs and takes nothing away from it.

**Required properties:**

1. **Both sites stay.** `tsdown.config.ts` keeps `__DEV__` `false`, and the source projects keep it `true`.
2. **The check leaves the cache as it found it:** every slot's six fields, the window's first and end slots, the element array, the count, the staleness flag and the measured version. It measures the window and the placeholder into storage of its own. An allocation there is development-only and accepted. On a mismatch it throws the same message as now.
3. **Its reads stay where they are,** one frame after the committed move, and it writes nothing to the DOM.
4. **The shipped build is unchanged:** the emitted `.js` files are byte-identical to the input's, and so are the size rows.
5. **Witnesses, in the report.** At the integer pointer path of S2's rotate fixture, the source project's proposals equal the consumer project's at every sample, including `proposed 1` at 95. At the input they differ there. `DRD-52`'s test passes, and fails with the held x removed. The collapsing-margin self-check of `DRD-65` property 4 still ends the drag in the source project.
6. **A source-project test that newly fails is reported and not adjusted.** It relied on the re-measure, and that's the architect's.
7. **`verifyEquivalence`'s JSDoc** says that it doesn't change the cache, and drops "so a mismatch leaves the cache correct".

**Why this and not removal.** The fault was that the oracle changed what it observed, and the repair is to make it observe only. Removing it would trade `DRI-6`'s only witness and every field-level check for one fewer configuration flag. No consumer would gain anything, because none of them runs either site.