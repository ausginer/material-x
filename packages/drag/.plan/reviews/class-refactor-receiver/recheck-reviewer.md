# Class refactor receiver follow-up: independent recheck

**By:** a `reviewer`, on 2026-11-15, on `drag/class-refactor`.

## What was read

- **Pinned to the report commit `f6b4bdf4c`.** It adds only the report and files under its `measurements/` directory, so its code equals the unit's commit `c9e728bad` ([`input-and-scope.txt`](recheck-reviewer-probes/input-and-scope.txt)). The main checkout was clean at `f6b4bdf4c` when this review started, and `origin/drag/class-refactor` was at the same commit.
- **The reviewed range is `c157dffb5..c9e728bad`.** Its code base `c157dffb5` equals `42f42a164`'s. The unit changes three files: `retirable.ts`, `invalidatable.ts` and `tests/callbacks.declaration.test.ts`.
- **Governing records:**
  - `DRD-63` property 2, as revised on 2026-11-14, in [`00-index.md`](../../decisions/DRD-63.md);
  - the [handoff](../../class-refactor-receiver-handoff.md);
  - the [recheck assessment](../../class-refactor-recheck-assessment.md) §2;
  - `class-refactor-recheck-1` in the [previous recheck](../owner-class-refactor-remediation/recheck-reviewer.md), with its [probe](../owner-class-refactor-remediation/recheck-reviewer-probes/wrong-receiver.ts.txt);
  - the [report](../../class-refactor-receiver-report.md), with its evidence under [`measurements/2026-11-15-class-refactor-receiver/`](../../measurements/2026-11-15-class-refactor-receiver/).
- **Scope, as the request limits it:**
  - a swapped receiver and an omitted receiver are refused at sites 1 to 3;
  - the `drag:DRD-63` cases discriminate;
  - the existing receiver checks are unchanged;
  - the emitted JavaScript, the source maps and the declarations, against `42f42a164`.
- **Not covered:**
  - the full suite, Firefox and WebKit;
  - size, allocation and timing;
  - `DRD-63` properties 1 and 3 to 7, which the previous recheck covered and this unit doesn't touch.

## Result

**`class-refactor-recheck-1`'s required property is met at `c9e728bad`.** At sites 1 to 3, the member's declared receiver is the type through which the site reads it. A receiver of another built-in type is refused, and so is a missing receiver. Each `drag:DRD-63` case fails on its receiver argument, and each one passes again under M7. Every existing case fails as before.

**The emitted JavaScript and source maps are byte-identical to `42f42a164`'s.** The declarations differ only in `retirable.d.ts` and `invalidatable.d.ts`, as the report lists.

**No findings.** One disclosed deviation from the handoff's boundaries is noted for the architect (§Observation). It isn't a defect.

## Method

- **Two scratch trees:** `git archive` of `42f42a164` and of `f6b4bdf4c`. In both, `node_modules` and `packages/drag2` are linked to the main checkout. So `@ydinjs/box-quad` resolves to the main checkout's build in both trees, and the comparison has one box-quad input. I didn't rebuild box-quad, so I didn't reproduce the report's box-quad hash `51dc4e4f…`.
- **Builds:** `npx tsdown --config tsdown.config.ts` in each tree. `just build` first runs `clean-build`, which calls `git`, and the archives aren't repositories. A fresh extraction has nothing to clean.
- **Mutations** were applied by content in the head tree, and each file was restored from its own copy. `cmp` confirmed each restore ([`recheck.sh`](recheck-reviewer-probes/recheck.sh.txt), [`inline-commands.sh`](recheck-reviewer-probes/inline-commands.sh.txt)).
- **Probes** typecheck through a `tsconfig.json` that extends drag's and lists the probe files ([`probes.sh`](recheck-reviewer-probes/probes.sh.txt)). `npx` runs from the package root, so the script passes that config by its absolute path. Each run lists the probe files that it compiled.
- **In the main checkout I only read files, typechecked, linted and ran the `declaration` project.**

## Receivers at sites 1 to 3

### Swapped receivers

**The `drag:DRD-63` cases fail on the receiver argument, for the receiver's type** ([`recheck.txt`](recheck-reviewer-probes/recheck.txt) §D1). With the directives after `passAlone` removed, each case gives one `TS2739` at its receiver's column:

| Case | Call | Error at `c9e728bad` |
| --- | --- | --- |
| W1 | `drag.use(geometry.retire, sink)` | `DisplacementSink` lacks `InsertionGeometry`'s `resolve`, `confirm`, `moved` and `invalidate` |
| W2 | `controller.use(sink.retire, geometry)` | `InsertionGeometry` lacks `DisplacementSink`'s `dx`, `dy`, `report` and `displaced` |
| W3 | `drag.requestStep(geometry.invalidate, index)` | `RectIndex` lacks `InsertionGeometry`'s `resolve`, `confirm` and `moved` |

W3's message names no `invalidate`, because `RectIndex` implements `Invalidatable`. So W3 tells the revised receiver from the supertype, as the handoff requires.

**The recheck's probe fails on both lines at `c9e728bad` and passes at `42f42a164`** ([`probes.txt`](recheck-reviewer-probes/probes.txt)). The two errors equal the report's [output](../../measurements/2026-11-15-class-refactor-receiver/wrong-receiver-probe.txt).

**My own probe** ([`reviewer-extra.ts`](recheck-reviewer-probes/reviewer-extra.ts.txt)) checks seven pairs at both commits:

| Pair | `c9e728bad` | `42f42a164` |
| --- | --- | --- |
| E1 to E3: sites 1 to 3's own pairs | accepted | accepted |
| E4: the axis's `retire` on a second `InsertionGeometry` | accepted | accepted |
| E5: the sink's `retire` on a `RectIndex` | refused, `TS2739` | accepted |
| E6: the axis's `retire` on a `RectIndex` | refused, `TS2739` | accepted |
| E7: the axis's `invalidate` on the sink | refused, `TS2739` | refused, `TS2741` |

- E4 is the structural limit that `DRD-63` property 2 and the assessment §2 state.
- E5 and E6 are pairs that the witness doesn't name, and the revision refuses them too.
- E7 doesn't discriminate, because `DisplacementSink` isn't `Invalidatable`. W3 is the case that does.

### Omitted receivers

**Each of the six receiver removals gives exactly one `TS2345` at its own site** ([`recheck.txt`](recheck-reviewer-probes/recheck.txt) §removals). I used the proof's [mutator](../owner-class-refactor/proof-reviewer-probes/receiver-mutate.mjs.txt) unchanged. The positions and the types that the errors name equal the report's table: `behavior.ts` (207,14) and (209,24) name `(this: InsertionGeometry) => void`, and `sortable.ts` (59,16) names `(this: DisplacementSink) => void`. Sites 4 to 6 are as before.

### M7

**M7 makes each of W1 to W3 an unused directive, in both instruments:**

- **`tsc`:** `TS2578` at lines 193, 195 and 197, and no other error ([`recheck.txt`](recheck-reviewer-probes/recheck.txt) §M7);
- **the `declaration` project** fails `callbacks.declaration.test.ts` on the same three lines. The control in the same tree passes 4 of 4 files and 27 of 27 tests ([`m7-declaration.txt`](recheck-reviewer-probes/m7-declaration.txt), [log](recheck-reviewer-probes/m7-declaration.log)).

**M7 with the directives removed** leaves no error on the three calls ([`recheck.txt`](recheck-reviewer-probes/recheck.txt) §M7 + D1). So their errors come from the receiver declaration alone.

### Existing receiver checks

- **No existing line of `tests/callbacks.declaration.test.ts` is removed or changed:** `c157dffb5..c9e728bad` removes 0 lines from it.
- **The `declaration` project passes at `f6b4bdf4c`:** 4 of 4 files and 27 of 27 tests, no type errors ([log](recheck-reviewer-probes/declaration-head.log)).
- **`passAlone`'s two cases still fail on the missing receiver,** with `TS2345` ([`recheck.txt`](recheck-reviewer-probes/recheck.txt) §D1). The types that the errors name are now `(this: InsertionGeometry) => void` and `(this: DisplacementSink) => void`. Under M7 they are `(this: Retirable) => void` for both. So the descriptions "`retire` declares the axis as its receiver" and "declares the sink" are true at `c9e728bad`, as `DRD-63` property 2 requires.
- **Only the four sites pass a member with a receiver.** I searched `src` for `.retire` and `.invalidate`: every other read is a direct call, such as `this.#index.retire()`.

### What stays

- `Retirable` and `Invalidatable` keep the `this` declaration, and `InsertionGeometry` and `DisplacementSink` still extend them.
- The JSDoc "Staleness only, because scroll calls it many times a second." is unchanged on `Invalidatable.invalidate`.
- `axis.ts`, sites 4 to 6 and every other `src` file are unchanged.

## Build comparison against `42f42a164`

| Output | Files | Result |
| --- | --: | --- |
| `.js` | 33 and 33 | **all byte-identical** |
| `.js.map` | 30 and 30 | **all byte-identical** |
| `.d.ts` | 29 and 29 | 27 identical; `sortable/retirable.d.ts` and `sortable/invalidatable.d.ts` differ |

- **Hash lists:** [`42f42a164`](recheck-reviewer-probes/hashes-42f42a164.js.txt), [`f6b4bdf4c`](recheck-reviewer-probes/hashes-f6b4bdf4c.js.txt), and the same pair for the [maps](recheck-reviewer-probes/hashes-f6b4bdf4c.js.map.txt) and the [declarations](recheck-reviewer-probes/hashes-f6b4bdf4c.d.ts.txt).
- **My two `.js` lists equal the report's** [`42f42a164`](../../measurements/2026-11-15-class-refactor-receiver/checks/js-hashes-42f42a164.txt) and [end](../../measurements/2026-11-15-class-refactor-receiver/checks/js-hashes-end.txt) lists, hash for hash.
- **A recursive diff of the two output trees** shows only the two declaration changes ([`dts-diff.txt`](recheck-reviewer-probes/dts-diff.txt)):
  - `retire(this: Retirable): void` becomes `retire(this: this): void`;
  - `invalidate(this: Invalidatable): void` becomes `invalidate(this: this): void`.

  This equals the report's [declaration diff](../../measurements/2026-11-15-class-refactor-receiver/checks/declarations-vs-42f42a164.diff.txt).

- **`free-drag/bounds.d.ts` and `free-drag/drop-targets.d.ts`** have equal hashes in the two builds. I didn't build `5b581fbdf`. Their equality to its build rests on the previous recheck.
- No build emits a `.d.ts.map`.

## Lint, format and typecheck

- **drag's `npx just lint` exits 0** at `f6b4bdf4c` ([`lint-fmt.txt`](recheck-reviewer-probes/lint-fmt.txt)).
- **The three edited files pass `fmt-check`.**
- **drag's `npx just typecheck`** reports only drag2's two `TS2724`, at `presentation.ts` lines 13 and 15 ([log](recheck-reviewer-probes/typecheck-head.log)).

## Observation: one added line is outside the appended block

- **Not a finding.** It has no consumer-observable or instrument effect. It is noted because it departs from the handoff's text, which only the architect can accept.
- **What the handoff says.** Change `tests/callbacks.declaration.test.ts` by "the appended block only", and type the cases through a `RectIndex` "imported from `src`".
- **What the unit did.** It added `import type { RectIndex } from '../src/sortable/rect-index.ts';` with the file's other imports, at line 17. The report discloses this and gives lint as the reason.
- **Checked** ([`import-lint.txt`](recheck-reviewer-probes/import-lint.txt)). Inside the appended block:
  - an `import` statement fails `import(first)` in oxlint and `import-x/first` in ESLint;
  - an `import()` type fails `typescript(consistent-type-imports)`.

  So, under the repository's lint, the two requirements can't both hold. The committed form lints clean, and it removes or changes no existing line.

## Evidence limits

- **Typecheck, lint and the `declaration` project only.** No browser test ran.
- **One box-quad build served both trees.** `packages/box-quad` is unchanged between the two commits, so both builds read the same input. This review doesn't reproduce the report's own box-quad build.
- **The logs** replace the scratch directory's path with `<scratch>/`, and their trailing whitespace and trailing blank lines are removed.

## Scratch work

- The two scratch trees, their builds and the probe copies are under this session's scratch directory, and are removed after this review is committed.
- No `npm install` or `npm ci` ran, and nothing under `node_modules`, a lockfile or a browser changed.
- No background process remains.
- **This review adds files only under `packages/drag/.plan/reviews/class-refactor-receiver/`.**

## Next

The architect reads this recheck and the report, and repeats the mechanical checks that the [recheck assessment](../../class-refactor-recheck-assessment.md) §5 names. The architect also decides whether to accept the out-of-block import line. The owner answers Q4. This review closes no finding, changes no source and opens no PR.

_Corrected on 2026-11-15 by the architect:_ Q4 isn't outstanding. The owner accepted the costs at the remediated end, with budgets unchanged and no speed claim. The acceptance is recorded in `DRD-63` §Costs and in the [acceptance assessment](../../class-refactor-acceptance-assessment.md) §4. This review's other text is unchanged.