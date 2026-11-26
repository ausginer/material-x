#### DRD-60 — Property mangling is deferred: `src` drops the `_` prefixes, the build renames nothing, and the checks that served the rename go

**Status:** active, decided on 2026-11-13 by the architect on the owner's decision to defer property mangling, because its measured savings don't justify its complexity. Supersedes `DRD-56` (apart from property 8's first sentence and the clarification of `DRD-51` property 3) and `DRD-57`, withdraws `DRD-59` (apart from property 8), amends `DRD-58`'s member names, and withdraws `DRO-16`. [`mangle-rollback-handoff.md`](../mangle-rollback-handoff.md) implements it from `drag/size` at `f552e0ec9`, as merged into `drag/mangle-remediation`. Budgets are unchanged. **Implemented at `cc752cc1b` and `b8e37b37c`, reported at `8904947f6` and accepted on 2026-11-14** (§Disposition of the mangling rollback report). `DRF-24` to `DRF-37` and `DRF-39` are closed, and `DRF-38` is widened and stays open with `repo:RF-31`. The result is historical: later units changed `src`. **Independently proved at `b8e37b37c` on 2026-11-14** (§Disposition of the rollback and integration reviews)

**The package doesn't shorten its internal property names. Every declaration that `DRD-56` and `DRD-57` prefixed takes back its name without the `_`, together with its uses in `src`, the tests, the bench and the one typechecked probe. `build/` and `tests/publication.node.test.ts` go, and `tsdown.config.ts` and `tsconfig.json` read as they did before `DRD-56`. The publication stays `tsdown`'s unbundled, unminified ESM: one readable `.js` per module with its `.js.map`, and the documented `.d.ts` files without maps. No plugin, minification or chunk layout is added. `DRD-58`'s slot array, the dependency update, the consumer project and the size gate stay. Budgets are unchanged.** [`mangle-rollback-handoff.md`](../mangle-rollback-handoff.md) implements it.

Decided on 2026-11-13 by the architect, on the owner's decision: **defer property mangling, because its measured savings don't justify its complexity.** The owner also stopped the layout exploration (`DRO-16`), asked for one bounded rollback from `drag/size` in new commits, and asked that the experiments stay as historical evidence.

**The measured savings.** Read by the gate on the published build at `DRD-57`'s end, `b50204f66`, against `c42c5b084`, before any prefix: −34 to −90 B Brotli on the seven rows without `sortable`, and −132 to −135 B on the three rows with it. Minified, −241 to −928 B. Two verdicts changed: "example: resize handle" and "freeDrag" went under their ceilings. These figures are the two readings of [`publish-mangle-report.md`](../publish-mangle-report.md) §8 and [`mangle-selection-report.md`](../mangle-selection-report.md) §5, end against base, read with `rolldown` 1.2.15. `DRD-57`'s base equals `DRD-56`'s end, so the difference is between two measured trees, not a sum of ablations.

**The complexity they bought, or would have:**

- **In `src`:** 318 occurrences of 53 prefixed names in 19 modules, and a marker rule whose list of names that stay has seven entries (`DRD-56` property 1, `DRD-57` property 3), which a contributor applies by reading use sites.
- **In the build:** 386 lines of build code and a 55-line committed map, and a 307-line publication test.
- **In review:** 14 findings against that pipeline (`DRF-24` to `DRF-37`), and a replacement (`DRD-59`) that needs a custom pass, a computed map and two guards, because Rolldown refuses native property mangling in a build of several chunks.
- **The alternative layout** that makes the mangling native needs four configurations, a boundary check of its own and the gate's graph checks read through the maps, and changes what a consumer without a bundler loads ([exploration](../unit-layout-exploration.md) §8).
- **Minification** renames classes that two consumer tests count by name (`DRF-39`).

**Why the rollback has this shape:**

- **The prefixes exist only for the rename.** `DRD-56` chose them as a marker for the tool. Without the tool, a `_` name is the shortened-looking source that CONTRIBUTING Part II §11 warns against, and the marker's rules have nothing to protect.
- **The names go back to what they were.** At `drag/size`'s `690769539`, reading each marker `_name` as `name` gives `f7b7b300b^`'s `src`, plus `DRD-58`'s change, except for keys that the type checker's rename wrote as `key: binding`, where `src` had a shorthand key. The rollback writes those as shorthand again. So the result is a tree that the record has already tested, plus the slot array.
- **The checks that go test only the rename.** Every case in `tests/publication.node.test.ts` is `DRD-56` property 7: the map's name set, V1, V2, V3 and V4. Nothing else imports `build/`. The consumer project (`DRD-54`) and the gate on the published build (`DRD-55`) exist because the build differs from `src`, and they stay.
- **The publication is the one that `DRD-55` measured before the rename.** Its `tsdown.config.ts` was unchanged from `a9c323f6a` to `31f92f5a9`, which added only the plugin, and `tsconfig.json` gained only `./build/**/*`.

**Required properties:**

1. **Source names.**
   - Each of the 67 declarations under 53 names that `DRD-56` and `DRD-57` prefixed takes back its name without the `_`, renamed at its declaration by the type checker's rename, with its uses.
   - A key that the prefixing expanded to `key: binding` is written as a shorthand key again.
   - **Followers:** a test, bench or probe that names a renamed member follows it and changes nothing else. These are `tests/authoring.declaration.test.ts`'s `@ts-expect-error` lines, `tests/callback-list.browser.test.ts`, `bench/compare.ts`'s injection texts, and `.plan/probes/callback-list/allocation.ts`, which `tsconfig.json` typechecks.
   - **No `_` name is left in property position** in `src`, `tests` or `bench`. A parameter that was named `_name` before `DRD-56`, such as the unused test-case names in `tests/coordinates.browser.test.ts`, keeps its name, because it was never a marker.
   - **The check:** against `f7b7b300b^`, the package's code tree outside `.plan/` differs only in `package.json`, by the dependency update, and in the five files of `5ec3b4b2d`, by `DRD-58`'s lines. `.plan/probes/callback-list/allocation.ts` equals its text at `f7b7b300b^`.
2. **The build.**
   - `build/` goes, with its four files.
   - `tsdown.config.ts` is byte-identical to its text at `f7b7b300b`, and `tsconfig.json` to its text at `f7b7b300b`.
   - The publication's files are the same paths as at `690769539`: each runtime module's `.js` and `.js.map`, and each `.d.ts`. No `.d.ts.map` and no `sourceMappingURL` in a `.d.ts`, as now.
   - Each published `.d.ts` equals the one at `690769539`, once a marker name in the latter is read without its `_`.
   - `.scripts/`, `package.json`, `files.json`, the `Justfile` and the Vitest configurations don't change. No plugin, minification option or chunk layout is added.
3. **The checks.** `tests/publication.node.test.ts` goes. Every other test file stays, apart from property 1's followers. The consumer project, `DRAG_SOURCE_ONLY_BROWSER_TESTS`, the node project's size test and `bench/size/measure.ts` don't change.
4. **`compare.ts` stays current.** `--prove --dry` and `--floors --dry` apply the same entries at the base and at the end, as `DRD-56` property 3 required of the prefixing. The dry checks start no browser and aren't campaigns (`DRD-51` property 3, as clarified by `DRD-56`).
5. **Budgets.** Every ceiling and the control figure stay. The unit reports every row at its base and its end. Each verdict, changed or not, goes to `DRO-4` as a reading.

**Expected, not measured:** each row grows by about what the mangling took off. At `rolldown` 1.3.2 that is a rough figure, because the savings were read at 1.2.15. "example: resize handle" and "freeDrag" are expected to go back over their ceilings. "example: canvas group" had 12 B left before the mangling and may follow them. The consumer project passes 326 of 326, which includes `DRF-39`'s two tests.

**What this supersedes:**

- **`DRD-56`,** apart from two statements that don't depend on the rename. **`DRD-56` property 8's first sentence stays:** the consumer project is Chromium only, which settles `DRD-54`'s open question. **The clarification of `DRD-51` property 3 stays:** `--prove --dry` and `--floors --dry` aren't campaigns.
- **`DRD-57`,** whole. Its audit stays as the record of the selection.
- **`DRD-59`,** withdrawn before implementation, apart from property 8. **`DRD-59` property 8 stays:** a tree is publishable only when a Vitest run's node and consumer projects read it and passed, and the change that makes the package publishable carries that obligation. Its reason is that the build differs from `src`, which stays true without the rename.
- **`DRO-15`'s step 3 and `DRO-16`.** `DRO-15`'s steps 1 and 2 stand as `DRD-54` and `DRD-55`.

**What this amends:** `DRD-58`. Its member names are written with the prefix, such as `_collect`, `_lend` and `_measure`. After this unit they are `collect`, `lend` and `measure`. `DRD-59`'s amendment to `DRD-58` property 8 is withdrawn with `DRD-59`. Once this unit lands, property 8's first bullet no longer applies, because neither the map nor the publication test exists. `DRD-58`'s other properties stay.

**What this doesn't decide:**

- **Whether property mangling returns.** That would be a new decision, with its own measurement. The type-directed transform ([`performance-plan.md`](../performance-plan.md) §6) stays deferred with it. [`property-mangling-exploration.md`](../property-mangling-exploration.md), [`publication-build-proposal.md`](../publication-build-proposal.md), [`unit-layout-exploration.md`](../unit-layout-exploration.md) and their probes are kept as evidence, each with only a status line added.
- `DRO-4`'s re-base and the red rows.
- The owner's shared-tooling proposals S1 to S4 ([proposal](../publication-build-proposal.md) §7). S3, a CONTRIBUTING statement of the marker, has no marker left to state.
- `box-quad`'s `sideEffects`.
- `DRD-58`'s result, accepted on 2026-11-13 (§Disposition of the slot array report). The rollback keeps the types its §Result lists.
- `DRF-38` and `repo:RF-31`, the baseline lint and typecheck errors. The rollback reports them apart from any new error, and doesn't repair them.

**Result, 2026-11-14:** implemented at `cc752cc1b` and `b8e37b37c` from `7420cbb9a`, reported at `8904947f6` and accepted (§Disposition of the mangling rollback report). Properties 1 to 5 hold at `b8e37b37c` on the saved evidence. The consumer project passes 326 of 326, every row grows by 35 to 144 B Brotli, and "example: resize handle" and "freeDrag" went over their ceilings, as expected. `DRF-24` to `DRF-37` and `DRF-39` are closed. `DRF-38` is widened to the base's 49 ESLint errors and stays open with `repo:RF-31`. **The result is historical:** `DRD-61`, `DRD-62` and the box-quad integration changed `src` since, and at `6296b741a` only the removals, the two configuration files and the absence of markers are checked again. **Independently proved on 2026-11-14:** a `reviewer` feature proof at `fdaab3781` established properties 1, 2 and 4, and property 3 as [handoff](../mangle-rollback-handoff.md) §Independent review lists it, at `b8e37b37c` against `7420cbb9a`, with its own builds and no browser. Its one finding, tier C, corrected a count in the report (§Disposition of the rollback and integration reviews). The proof is of `b8e37b37c`, and doesn't make the result current.