# xy() held geometry handoff

**For:** one `implementer` unit on `drag/rect-index-ownership`, then one fresh independent `reviewer` session on its report, before the architect's final acceptance (§Independent review). **Base:** `drag/rect-index-ownership` at the commit that adds this handoff. Its `packages/drag/src`, `tests` and `bench` equal `f79f66fe2`'s. If they don't, return before item 1.

**The source is already applied.** `f79f66fe2` holds the final VX patch, unchanged, in `src/sortable/rect-index.ts` and `src/sortable/xy.ts`. It was provisional, and `DRD-62` adopts it. This unit doesn't apply a patch. It adds the narrowed types, a compile-time test and the behavioral witness, and checks everything against `f79f66fe2`.

**One set of tools.** Read the base and the end with the same installed dependencies. Between item 1 and the end, don't run `npm install` or `npm ci`, and don't change `node_modules`, a lockfile or a browser.

**Chromium only.** Browser checks and mutations run in Chromium, with the container's Chrome as `.scripts/vitest-config.ts` configures it ([`performance-plan.md`](performance-plan.md) §3). Firefox and WebKit are deferred to the CI the owner plans, and this unit claims no cross-engine verification.

**No timing, no allocation campaign, no hold.** The owner accepted `DRD-62` with speed unmeasured. Property 5 makes the change type-only, so the emitted JavaScript is `f79f66fe2`'s, and the proposal's allocation readings stand with the limits that `DRD-62` states.

**Governing records** in [`00-index.md`](00-index.md):

- **`DRD-62`, properties 1 to 7,** with its costs and its limits.
- **What `DRD-62` amends:** `DRD-61` properties 1, 2, 3 and 8, `DRD-58` property 7's table, and `DRD-52` property 1.
- **`DRD-61` properties 3 and 10:** what a read constructs, and how a witness is shown by a mutation.
- **`DRD-51` properties 1 and 2:** the size readings and the control rows.
- **`DRF-38` and `repo:RF-31`,** and the lint gate's contradiction in [`owner-edits-integration-report.md`](owner-edits-integration-report.md) §Lint.
- **CONTRIBUTING:** Part I §TypeScript, §Class encapsulation and §Unit tests, and Part II §1.2 and §3.

**The design input:** [`xy-held-geometry-proposal.md`](xy-held-geometry-proposal.md), with its probe in [`probes/xy-held-geometry/`](probes/xy-held-geometry/README.md). **The architect's type check:** [`2026-11-13-xy-held-geometry-types-check.txt`](measurements/2026-11-13-xy-held-geometry-types-check.txt). It holds a sketch of item 2 and item 3 that compiles, and the widening mutations' typecheck output. You own every property. Where your code differs from the sketch, the report says where.

**Goal:** after this unit, `RectIndex.at`, `RetainingRectIndex.retained`, `RectIndex`'s constructor and its `#axis` accept only their constants, through two module-private literal unions, and the emitted JavaScript and declarations are `f79f66fe2`'s. A declaration test shows that invalid fields are rejected. Three browser tests hold `xy()`'s reported vectors to each cell's flow travel, and each test is shown by the mutations that `DRD-62` names.

## Boundaries

**Change only:**

- **`packages/drag/src/sortable/rect-index.ts`:** the two type aliases with their JSDoc, the four annotations of `DRD-62` property 4, and the type assertions of property 5 in `verifyEquivalence`. No statement, expression or comment in a function body changes, apart from those assertions.
- **`packages/drag/tests/rect-index.declaration.test.ts`,** new: property 6.
- **`packages/drag/tests/displacement-sink.browser.test.ts`:** the three tests of property 7 and their helpers. No existing test's title or assertions change.
- **Records:** the report, and `measurements/` files with the prefix `2026-11-<day>-xy-held-geometry-unit-`.

**Do not change:**

- `xy.ts`, `y.ts`, `linear-shift.ts` or any other file under `src/`. If typecheck needs a change outside `rect-index.ts`, return;
- every other test, `bench/`, every ceiling and the control figure, `tsdown.config.ts`, `tsconfig.json`, `package.json`, `files.json` and every Vitest configuration, including `.scripts/vitest-config.ts`'s source-only list. `displacement-sink.browser.test.ts` is already on it, for the reason that the new tests share: they read the sink's `report`;
- the existing lint and typecheck errors. Don't repair `DRF-38`, the other baseline lint errors or `repo:RF-31`. If `lint-fix` changes a line that this unit doesn't otherwise change, revert that change and record it;
- `.scripts/`, the root `package.json`, any lockfile, `node_modules` and browser installations;
- `.plan/probes/` and `.plan/reviews/`.

**Do not run:** the timing check in `probes/xy-held-geometry/timing/`, `compare.ts` scenarios, `--prove`, `--floors`, the allocation probes, Firefox or WebKit checks, or `npx just test-engines`.

**Sequencing.** Run any sequence of long processes through `node bench/campaign.ts run`. Wait for it through the runner, a foreground command, or the harness's notice that a background command exited. Don't wait by searching the process table.

## Item 1. The base

Before any change, from `packages/drag`:

1. **Record the tools:** the versions of Node, `rolldown`, `tsdown`, `vitest`, `@vitest/browser-playwright`, `playwright` and `typescript` as they resolve from `packages/drag`, and Chrome's `--version`. Record them again at the end, and the two lists must be identical.
2. **Record the base:** `git rev-parse HEAD`. Then run `git diff --stat f79f66fe2 HEAD -- packages/drag/src packages/drag/tests packages/drag/bench`, which must be empty.
3. **Run the Chromium suite** through the runner, and record every title and verdict. Expected: 746 tests, 740 pass, and the 6 failures are size rows in `tests/size.node.test.ts`. That is the proposal's §4.2 reading of the same source.
4. **Take the base size reading** with `npx just size`, and record every row. Expected: "sortable + y" 6,577 B Brotli, "sortable + xy" 6,564 B and "complete" 7,175 B, as [the proposal's readings](measurements/2026-11-13-xy-held-geometry-size.txt) give for the final VX.
5. **Lint and typecheck the whole package** with `npx just lint` and `npx just typecheck`, and save both outputs as this unit's baseline. Expected typecheck: `repo:RF-31` only.
6. **Keep the base build.** The size run builds the publication. Copy every emitted `.js` and `.d.ts` file to a scratch directory outside the checkout, for item 5.

## Item 2. The types

**Required properties:** `DRD-62` properties 4 and 5.

1. **Two aliases in `rect-index.ts`,** after the constants, each a union of `typeof` the constants:
   - `Field`: `LEFT`, `TOP`, `RIGHT`, `BOTTOM`, `CENTER_X` and `CENTER_Y`;
   - `NearEdge`: `LEFT` and `TOP`.

   Neither is exported. Each has one line of JSDoc that says what it is.

2. **The annotations:**
   - `at(slot: number, field: Field)`;
   - `retained(slot: number, field: NearEdge)`;
   - `constructor(axis: NearEdge = LEFT)`;
   - `readonly #axis: NearEdge`.

   Update the JSDoc of `at`, `retained` and `#axis` only where it would otherwise contradict its type. `#axis`'s already says "`LEFT` or `TOP`".

3. **`verifyEquivalence`:** each place where a numeric field counter reaches `at` becomes `field as Field` at that point. That covers the copy loop, and `differs` or its two call sites. The loops, their bounds and their counters are unchanged.
4. **Nothing else.** No runtime check, fallback, lookup table, overload, unrolled loop or second accessor. Every `slot`, `lo`, `hi`, `gap` and `delta` stays `number`.

## Item 3. The compile-time check

**Required property:** `DRD-62` property 6.

1. **`tests/rect-index.declaration.test.ts`,** with a module comment in the form of [`callbacks.declaration.test.ts`](../tests/callbacks.declaration.test.ts)'s: what it checks, and "Checked by `tsc`, with no run".
   - **`describe`:** the unit under test.
   - **One `it` per signature,** each with "should" in its name:
     - `at`'s field;
     - `retained`'s field;
     - the constructor's axis.
   - **Each `it` shows both sides:**
     - the accepted constants without a directive;
     - each rejected argument on its own line, under its own `// @ts-expect-error` with a short reason.
   - **The rejected arguments:**
     - `STRIDE` and a value typed `number` at `at`;
     - `RIGHT` and a value typed `number` at `retained`;
     - `RIGHT` and a value typed `number` at the constructor.
2. **It runs in the `declaration` project only.** Check that `npx vitest run -c vitest.config.ts --project declaration tests/rect-index.declaration.test.ts` selects it and passes. Check also that it doesn't run in `consumer`.
3. **Lint and format it** in [`handoff.md`](../../../.agents/docs/handoff.md)'s order, and it must end with no lint error. A statement that `oxlint --fix` rewrites into one that ESLint then reports is the gate's contradiction from the integration report's §Lint. Write a form that neither linter reports, such as an assignment or a call, and don't hand-edit against the formatter.
4. **The mutations,** each in the working tree and reverted. Save each patch, and both the typecheck output and the `declaration` project's output:

   | Mutation | The change | Must fail |
   | --- | --- | --- |
   | MT1 | `at`'s field back to `number` | `typecheck` and the `declaration` project, on the `at` lines |
   | MT2 | `retained`'s field widened to `Field` | Both, on the `RIGHT` line at `retained` |
   | MT3 | The constructor's `axis` back to `number`, with `#axis` unchanged | Both, on the constructor lines. The assignment to `#axis` also errors |

   **`#axis` is checked by reading.** The report quotes its declaration.

## Item 4. The behavioral witness

**Required property:** `DRD-62` property 7.

1. **Three tests in `tests/displacement-sink.browser.test.ts`,** under their own `describe`, with `DRD-62`'s titles.
   - **The source:** [`xy-held-flows.browser.test.ts.txt`](probes/xy-held-geometry/xy-held-flows.browser.test.ts.txt), the probe's flows. Take its field, its driver and its assertions. Drop its `console.log` lines.
   - **The field:** cells of 100 × 60, three per row, in a 300 px wrapping flex container, with the dragged cell hidden and a placeholder in its place.
   - **The driver:** for each target, one `resolve` at the target cell's center, then the placeholder moves to the insertion's gap and `moved` reports. `xy()`'s installer is called directly, with a recording sink that delegates to an inner sink when there is one.
   - **The assertion,** after each committed move:
     - every reported cell's `dx` and `dy` equal its flow travel, negated, to 0.1 px. Flow position is read through `offsetLeft` and `offsetTop` before and after;
     - every unreported cell's flow position is unchanged.
2. **The three tests:**
   - **Wrapping:** 12 cells, targets `[4, 9, 1, 10, 5]`, no inner sink.
   - **Animating:** the same, with `layoutAnimation({ duration: 60_000, easing: 'linear' })` as the inner sink. It asserts that at least one cell has a running animation at the end, so later moves measured cells in flight.
   - **Larger collection:** after the first operation, `retire`, add 9 cells, then targets `[15, 2, 19, 7]` on the same installer. Both operations are asserted.
   - **Each test cleans up** its DOM and retires its installer and sink, as the file's other tests do.
3. **The mutations,** each in the working tree and reverted, run with `npx vitest run -c vitest.config.ts --project browser tests/displacement-sink.browser.test.ts`. Save each patch and its output.

   | Mutation | The change | Must fail |
   | --- | --- | --- |
   | MX1 | `xy()`'s `moved` calls `retain()` after the rebuild | All three |
   | MX2 | `retained` returns `this.#retained[slot * 2]`, ignoring its field | All three |
   | MX3 | `moved`'s rebuild passes `null` as the sink | The animating test |
   | MX4 | `retain` copies slot 0's left and top into every slot | All three |
   | MX5 | `retain` writes only the slots below `#retained.length / 2` once `#retained` is non-empty | The larger-collection test |

   **Run MX1 to MX5 against the whole Chromium suite once each too,** and record which other tests fail. That is information about the suite's coverage, not a requirement.

## Item 5. The publication and the size

1. **Size:** run `npx just size` at the end, and give every row next to item 1's reading.
   - **Every row reads exactly 0/0/0** in minified, gzip-9 and Brotli-11.
   - **Every row's module list is unchanged.**
2. **The emitted files:** compare every emitted `.js` and `.d.ts` file with item 1 step 6's copy. Every `.d.ts` is byte-identical. Every `.js` file is byte-identical, or differs only in comments. The proposal found that no `rect-index.d.ts` is emitted, and none is added.
3. **Against `61f883d09`,** for the record only: the end's three `sortable` rows equal the proposal's final-VX figures. Those are "sortable + y" 6,577, "sortable + xy" 6,564 and "complete" 7,175 B Brotli, and +60 / +18 / +30 on "sortable + xy". Don't build `61f883d09` again.

## Verification

| Check | Required result |
| --- | --- |
| Item 1 | Tools, base revision, base suite, size, lint, typecheck and the emitted files recorded |
| The tools | Identical at the base and at the end |
| `git diff --stat <base>..HEAD -- packages/drag .scripts` | Only the files that §Boundaries allows, the report and `measurements/` |
| `git diff <base>..HEAD -- packages/drag/src` | Only `rect-index.ts`: the two aliases with their JSDoc, the four annotations, and `as Field` in `verifyEquivalence` |
| The Chromium suite | The base's titles and verdicts, plus the three new tests, which pass, and the declaration file, which passes. The same 6 size rows fail |
| The consumer project | The same files and tests as at the base. The declaration file isn't among them |
| MT1 to MT3 | Each fails what item 3 names |
| MX1 to MX5 | Each fails what item 4 names |
| Item 5 | Every row 0/0/0, `.d.ts` byte-identical, and `.js` identical apart from comments |
| Whole-package lint | The base's errors by file, rule and message, and no other. The new declaration file has none |
| Typecheck | `repo:RF-31` only |
| Changed `.ts` files | [`handoff.md`](../../../.agents/docs/handoff.md)'s format, lint and typecheck, from `packages/drag`, within §Boundaries' rule on autofix |
| Markdown | `handoff.md`'s Markdown checks on the report |
| Firefox and WebKit | Deferred to the owner's planned CI, not run here |

## Commits

- **The source and test change,** in one commit.
- **The report and its measurements,** in their own commit. Then push the branch.

## Report

Write `xy-held-geometry-report.md` beside this file. Save under `measurements/`, unedited:

- the tool lists;
- the base and end suites' runner status and logs;
- both size readings, lint outputs and typecheck outputs;
- the diff of the emitted files;
- each mutation's patch and output.

**The report gives:**

- the base, the commits and the governing records;
- **each property of `DRD-62`, held or not.** For property 5, the `src` diff and the emitted-file comparison. For property 6, `#axis`'s declaration as read;
- where the code differs from the architect's sketch, and why;
- the size table: every row at both points, and the three `sortable` rows against `61f883d09`;
- each mutation and what it failed, with item 4's whole-suite coverage as information;
- the lint and typecheck baselines and end, with no new error and no repair;
- **what wasn't measured,** stated as such: timing, allocation, and Firefox and WebKit. Speed is unmeasured in both directions, including `DRD-62`'s polymorphism risk.

## Return conditions

Stop and return to the architect, with what you have recorded, when:

- the base's `src`, `tests` or `bench` differ from `f79f66fe2`;
- typecheck needs a change outside `rect-index.ts` and the two test files;
- any size row reads other than 0/0/0, a `.d.ts` differs, or a `.js` file differs in more than comments;
- a mutation doesn't fail what item 3 or item 4 names;
- a new test fails at the end, or an existing test changes its verdict;
- a new lint or typecheck error appears that §Boundaries doesn't allow you to resolve.

## After this unit

The owner starts the independent review below on the pushed report. The architect's final acceptance comes after it: the architect reads the report and the review, decides the review's findings, and then decides whether the unit is accepted.

## Independent review

**For:** one fresh `reviewer` session, a feature proof, which the owner starts once the report is pushed, before the architect's final acceptance. **Pinned to** the commit that adds the report. **Chromium only.**

**Read, in this order:**

1. `DRD-62` in [`00-index.md`](00-index.md);
2. the code at the pinned commit: `src/sortable/rect-index.ts`, `src/sortable/xy.ts`, `src/sortable/y.ts`, `tests/rect-index.declaration.test.ts` and the `drag:DRD-62` tests in `tests/displacement-sink.browser.test.ts`;
3. only then, the report and its measurements.

The proposal and this handoff are context, not the specification.

**Establish independently, by reading and by running:**

- **Properties 1 to 3,** by reading:
  - every write to `#retained` is in `retain`;
  - no member returns it;
  - `RetainingRectIndex` reaches no private member of `RectIndex`;
  - `xy.ts` holds no geometry array, closure or per-row object that the base didn't;
  - `moved` makes no DOM measurement after its first report. The rebuild finishes measuring every slot before the loop that reports starts. Inside the loop, `moved` calls only `retained`, `at` and `item`, which read the index's cached values, and the sink's `report`.
- **Property 4,** by reading the four annotations and the aliases' definitions.
- **Property 5:**
  - by reading the `src` diff from `f79f66fe2`;
  - by a size run and a comparison of the emitted files with a build of `f79f66fe2`, in a scratch worktree with the checkout's installed packages.
- **Property 6:** the declaration test passes, and at least one widening mutation of your own choosing fails it.
- **Property 7:**
  - the three tests pass in Chromium;
  - at least two of MX1 to MX5, of your choosing, fail what `DRD-62` names;
  - the assertion compares with flow positions that the test reads independently of `RectIndex`.
- **The record:**
  - `DRD-62`'s amendments of `DRD-61`, `DRD-58` and `DRD-52` state what each property used to say;
  - the cost and limits sections claim nothing the measurements don't show;
  - in particular, speed is not inferred from allocation.

**Out of scope:** timing, allocation campaigns, Firefox and WebKit, the red size rows, the baseline lint errors and `repo:RF-31`.

**Output:** `reviews/xy-held-geometry/proof-reviewer.md`, in the tiers and form of [`reviews/rect-index-access/proof-reviewer.md`](reviews/rect-index-access/proof-reviewer.md). Commit it and push the branch. The review changes no source, test or record outside its file. The architect decides its findings, and then the unit's final acceptance.