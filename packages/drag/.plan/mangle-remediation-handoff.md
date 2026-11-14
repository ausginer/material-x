# Mangle remediation handoff

> **Withdrawn on 2026-11-13 before implementation, by `DRD-59`.** The owner's requirements for the publication withdrew the requirement to keep the JavaScript text and the source map segments, which this handoff's custom pipeline exists to meet. Don't run it. [`publication-build-proposal.md`](publication-build-proposal.md) §4.2 says what replaces each item, and [`publication-build-handoff.md`](publication-build-handoff.md) is the unit.

**For:** one `implementer` unit on `drag/size`. **Base:** the commit on `drag/size` that integrates [`mangle-remediation-assessment.md`](mangle-remediation-assessment.md) §6. That commit follows the accepted report of [`mangle-selection-handoff.md`](mangle-selection-handoff.md) (`DRD-57`). **Don't start from an earlier commit.** In this handoff, `DRD-<V>` is the number that integration gave the validation decision, and the base commit's register carries it.

**Governing records:**

- `DRD-<V>` in [`00-index.md`](00-index.md), properties 1 to 9, with the reasoning in [the assessment](mangle-remediation-assessment.md) §3;
- `DRD-56` properties 1, 5, 6 and 8, as corrected in place at integration, and its property 7's V1 and V5;
- `DRD-55` property 1, as clarified at integration;
- `DRD-57`, whose map this unit works with;
- the review round's [summary](reviews/publish-mangle/publish-mangle-summary.md), the [proof reviewer's report](reviews/publish-mangle/proof-reviewer.md) and its [probes](reviews/publish-mangle/proof-reviewer-probes/), and the [integrity report](reviews/publish-mangle/integration-integrity.md), for the witnesses;
- [`publish-mangle-report.md`](publish-mangle-report.md) §7 for M1 to M7, and [`2026-11-13-mangle-step-check.ts.txt`](measurements/2026-11-13-mangle-step-check.ts.txt), the check that V4 makes standing.

**Goal:** after this unit, the publication test compares every published module and map with a build without the step, V2 and V3 see names written as strings, the step's map and the test count lines as Rolldown's maps do, and the generator and the test share one definition of each rule. **The published files are byte-identical to the base,** and so is `build/property-names.json`.

## Boundaries

**Change only:**

- `packages/drag/build/rename-properties.ts`, `build/property-names.ts` and `build/generate-property-names.ts`;
- **at most one new module in `build/`,** if the reference build and the rules that the generator and the test share don't fit in `property-names.ts`;
- `packages/drag/tests/publication.node.test.ts`;
- **records:** the report, and `measurements/` files with the prefix `2026-11-13-remediation-` or the date of the run.

**Do not change:**

- `src/`, `tsdown.config.ts`, `tsconfig.json`, `package.json`, `files.json`, `.scripts/`, the Vitest configurations, `tests/support/` and every other test;
- `build/property-names.json`. The unit regenerates it, and it must come out unchanged (item 3);
- `bench/`, including `bench/size/measure.ts`: every row, ceiling and control;
- `.plan/00-index.md`, `.plan/reviews/`, `CONTRIBUTING.md` and the assessment. The architect integrates records;
- accepted measurement files. A rerun is a new file.

**Do not run:**

- `compare.ts` in any form, the page check, B3' or the in-page floors. The deferred campaigns stay stopped;
- `npx just test-engines`. The publication doesn't change;
- `npx just size`. Item 6's byte identity substitutes for a reading.

**Sequencing.** Run any sequence of long processes through `node bench/campaign.ts run`. Wait for it through the runner, a foreground command, or the harness's notice that a background command exited. **Don't wait by searching the process table.**

**Witnesses and probes run on copies outside the checkout,** as the review's probes did. Nothing in the package root is mutated, and no build writes there except `just build` and the suite's global setup.

## Item 1. The base

Before any change:

1. **Record that the base carries both prerequisites:** `00-index.md` has a `#### DRD-<V>` heading and a disposition of `DRD-57`'s report, and `build/property-names.json` has 53 keys.
2. **Run the Chromium suite through the runner.** Record every project's totals and verdicts as they are. The publication test must pass. If it doesn't, return.
3. **Record the node project's wall time** and the publication test file's own duration, as Vitest reports them.
4. **Keep the base tree.** Copy the files that `package.json`'s `files` selects to a scratch directory outside the checkout, and save each file's SHA-256 under `measurements/`.

## Item 2. The step

**Required properties** (`DRD-<V>` properties 3 and 6):

1. **Establish Rolldown's line rule first.** Build small synthetic modules with drag's options (`platform: 'neutral'`, `esnext`, unbundled, source maps) and without the step. Put a raw LF, CR, CRLF, U+2028 and U+2029 in a template literal, each in its own module, with a property access after it. Read where Rolldown's map places that access. The reviewer's [`synthetic-sources.txt`](reviews/publish-mangle/proof-reviewer-probes/synthetic-sources.txt) and [`build-synth.ts.txt`](reviews/publish-mangle/proof-reviewer-probes/build-synth.ts.txt) are a starting point. Record the rule for each character.
2. **The step's map starts a generated line wherever Rolldown's does,** by that rule. One definition of the rule is exported for the test.
3. **The unmapped-name error** names the property and the module as now, and says that a `_` property is renamed in the publication and that the map is regenerated with `node build/generate-property-names.ts` in the same commit as the name. The shorthand-key error doesn't change.
4. **Nothing else in the step changes.** It renames the same names in the same way.

## Item 3. The shared rules and the reference build

**Required properties** (`DRD-<V>` properties 1, 2 and 5):

1. **One definition** each of:
   - the reserved words and the output-name rule: an identifier name whose first character isn't `_`, and that isn't reserved. The generator draws names that pass it, and V3 checks the committed values with it;
   - the prefixed property names in `src`. The generator and the name-set test both call it;
   - **the reference build:** `tsdown.config.ts` with every plugin but the step, into a temporary directory, with `dts: false` and `exports: false`. Source maps are a parameter: the generator builds without them, and the test with them. The caller removes the directory;
   - **the names that stay:** every property name and every string text (string literal or template text) in the reference build's modules, without the prefixed ones.
2. **The generator** uses all four. Its header describes the excluded names as property names and string texts.
3. **Regenerate the map twice** with `node build/generate-property-names.ts --out <scratch file>`. Both outputs must be equal and equal the committed file. If they differ, return with the diff: a string in the build equals a published output name.

## Item 4. The publication test

**Required properties** (`DRD-<V>` properties 1 to 5):

1. **The reference build** runs once in the file's `beforeAll`, with source maps, through item 3's code, and is removed after the file. It starts after the global setup's build has finished, which `beforeAll` already guarantees. Raise the hook's timeout if the build needs it. The test's header pointer becomes `drag:DRD-<V>`.
2. **The name set** calls item 3's function for `src`, and its comment says that it checks the committed map's keys against the tree, which fails on a stale or hand-edited map.
3. **V1** doesn't change.
4. **V2** fails on any identifier, string literal or template text in an emitted `.d.ts` that matches the marker. Template literal types and string-literal types are included.
5. **V3** fails when two values are equal, when a value fails the output-name rule, or when a value equals a name that stays in the reference build. The source-map inference and the `writes` check in V3 go.
6. **V4,** for every emitted `.js` in the publication:
   - **(a)** the module equals the reference module with each prefixed property name replaced by its map value;
   - **(b)** the map decodes, and has the reference map's mappings in the same order, each with the same source, original line, original column and generated line. Its generated column moves only by the sum of the length changes of the names renamed before it on its line. **Compare sources after resolving each against its own map's location,** because the reference build's maps sit in another directory;
   - **(c)** each renamed name's mapping leads to `src` text that is the prefixed name. When the renamed name is the key of a class member declaration (a field, method, accessor or auto-accessor) in the emitted module, it may instead lead to the start of that member, with only class member modifiers and whitespace before the prefixed name. When (c) fails and (b) holds for the module, the failure says that the reference build maps the token there.
7. **Positions.** Generated positions use item 2's rule. `src` lines use the rule of Rolldown's original positions, which counts LF, CR, CRLF, U+2028 and U+2029 unless item 2.1 shows otherwise.
8. **A failure names** the module, the position, the prefixed name and what was found, as the current tests do.

Where a renamed name's length change is computed, use the map's value. Under `DRD-57`, two values have two characters and one is `$`, so a regular expression built from a value escapes it.

## Item 5. Witnesses

Each witness runs on a copy outside the checkout, with the new test pointed at the copy, as the reviewer's [`shim.ts.txt`](reviews/publish-mangle/proof-reviewer-probes/shim.ts.txt) and [`install-test.sh.txt`](reviews/publish-mangle/proof-reviewer-probes/install-test.sh.txt) did. Record for each one the result under the base test and under the new test. **Every row must show the required result under the new test.**

| Witness | Input | Required result |
| --- | --- | --- |
| W1 `DRF-24` | The reviewer's `t2a`, `t2b` and `t2c`: one mapping moved in a published `.js.map` ([`mutsrcmap.sh.txt`](reviews/publish-mangle/proof-reviewer-probes/mutsrcmap.sh.txt)), adapted to `DRD-57`'s map | V4 fails on each. `t2d` still fails |
| W2 `DRF-25` | A rebuild with [`step-bug-sparse`](reviews/publish-mangle/proof-reviewer-probes/step-bug-sparse.diff.txt) and with [`step-bug-kept-off1`](reviews/publish-mangle/proof-reviewer-probes/step-bug-kept-off1.diff.txt) applied to a copy of the step | V4 (b) fails on each |
| W3 `DRF-26` | The reviewer's `synth6` and `synth5-ls-template`, built with the base step and with the new step | The base step moves 7 and 18 mappings against the build without the step. The new step moves 0. Use the test's comparison code |
| W4 `DRF-27` | `synth5-ls-string`, `synth5-ls-comment` and `synth5-cr-comment` | The base V4 fails, and the new V4 passes |
| W5 `DRF-28` | `synth3` with the map `{ "_size": "k" }` | The new V3 fails and names `k`. Item 3's names that stay, computed for `synth3`, contain `k` |
| W6 `DRF-29` | The reviewer's `v2-quoted` and `v2-literal-type` `.d.ts` additions | V2 fails on each |
| W7 `DRF-33` | A copy with `inputOptions: { experimental: { nativeMagicString: true } }` in `tsdown.config.ts`, as the integrity pass ran it | V4 (a) and (b) pass, and (c) fails, saying that the reference build maps each token there |
| W8 | M1, M3, M5, M6 and M7 from [`publish-mangle-report.md`](publish-mangle-report.md) §7, adapted to `DRD-57`'s map | M1 fails the build with the new message. M3 fails V3, M5 fails V4, M6 fails V2, and M7 fails the name set |

M2 and M4 test V1 and the consumer project, which don't change, and aren't rerun.

## Item 6. Validation

1. **The publication is byte-identical to the base.** After `just build`, every file that `package.json`'s `files` selects has the SHA-256 that item 1.4 recorded. If one differs, return.
2. **The publication test passes** on that build, with every check of item 4.
3. **The Chromium suite** runs through the runner, with the same titles and verdicts as at the base, apart from the publication test's own titles if they change. The consumer project passes as at the base.
4. **Wall time.** The node project's wall time and the publication test's duration at the end, against item 1.3. Not gated.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Both prerequisites, the base suite, the wall times and the base tree recorded |
| `git diff --stat <base>..HEAD -- packages/drag .scripts` | Only the files that §Boundaries allows, the report and `measurements/` |
| Item 2.1 | Rolldown's line rule recorded for each of the five characters |
| Item 3.3 | Two equal generator runs, equal to the committed map |
| Witnesses | Every row of item 5 |
| Item 6 | Byte identity, the passing test, the suite and the wall times |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck, with `npx just` from `packages/drag` |
| Markdown | `handoff.md`'s Markdown checks |

## Commits

- **One commit:** `build/` and the publication test.
- **The report** goes in its own commit.

## Report

Write `mangle-remediation-report.md` beside this file. Save under `measurements/`, unedited:

- the runner's status and logs for the base suite and the end suite;
- the base tree's hashes and the end comparison;
- item 2.1's synthetic sources, script and results;
- both generator runs;
- each witness's script, input and output under both tests.

The report gives:

- each commit and what it carries;
- Rolldown's line rule, and the step's;
- where each shared definition lives, and its callers;
- V2, V3 and V4 as written, each against its `DRD-<V>` property;
- every check above;
- the wall times before and after.

## Return to the architect

Stop and return if:

- the base lacks `DRD-<V>` or `DRD-57`'s accepted unit, or the publication test fails at the base;
- Rolldown's line rule for a character depends on more than the character itself, for example on whether it is inside a template literal, so that the step can't follow it without parsing;
- the regenerated map differs from the committed one;
- **the new V4 fails on the base publication.** That is a live defect in the published maps, and the architect decides it;
- the reference build can't run in the node project, or writes outside its temporary directory;
- a witness doesn't give its required result;
- the publication differs from the base;
- the change needs a file outside §Boundaries.

## After this unit

The architect reads the report and closes the findings that the assessment's §6.5 marks `<U>`. No review round is recommended after it (assessment §5).