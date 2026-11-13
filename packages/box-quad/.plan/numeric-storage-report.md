# Numeric storage implementation report

**For:** the architect, reading against `BQ-11` in [`plan.md`](plan.md). **Handoff:** [`numeric-storage-handoff.md`](numeric-storage-handoff.md) at `3300e8f8e`. **Branch:** `box-quad/numeric-storage`. **Implementation commit:** `057c39b94`. This report is the commit after it.

**Status: implemented for box-quad and drag. drag2 is not migrated, at the owner's direction.** box-quad's four storage factories and their length constants are gone, `Box`, `Space`, `Quad` and `Delta` are `Record<number, number>` with layout JSDoc, and drag allocates its own storage. drag2 still imports `box` and `space`, so drag2 doesn't compile against this box-quad.

## Owner scope update

The owner changed this unit's scope after the handoff was written. The architect must add this to the record during acceptance:

> Owner scope update: ignore drag2 for this unit; it is nearing removal.
>
> Do not migrate its consumers, run its checks, or update its size controls or records. This overrides the corresponding BQ-11 and handoff requirements.
>
> Keep box-quad and the listed drag consumer migrations in scope. If shared checks expose drag2 failures caused by the removed factories, report them as expected consequences outside scope, not as baseline failures. Do not suppress them.

This overrides these requirements:

- `BQ-11` property 10, for drag2: drag2 doesn't allocate its own storage, and its five control figures aren't re-declared.
- Handoff item 4's two drag2 rows: `src/kernel/presentation.ts` and `tests/perf/m5.browser.test.ts` are unchanged.
- Handoff item 5: `packages/drag2/bench/size/measure.ts` and `packages/drag2/.plan/measurements/budget-rebases.md` are unchanged.
- The verification rows for drag2: its typecheck, its lint, its browser, declaration, node and shipped projects, and its controls weren't run, either at the base or after the change.

Nothing in `packages/drag2/` changed.

## What changed

- **`src/index.ts`.** `box`, `space`, `quad`, `delta` and the four `*_LENGTH` constants are removed. The slot-index constants stay. Each type is `Record<number, number>`. `out` parameters take the writable type, and `coordinates`'s `above`, `projection`'s `source` and `relativeTo`, and `localDelta`'s `basis` take `Readonly<…>`. `coordinates` without `above` reads the ancestry into a fresh `[]` on each call. The write order and the checks are the arm's, unchanged from the base.
- **Type JSDoc.** Each type lists every index with its meaning and gives its capacity in slots (8, 5, 8 and 2). It also says once that growable storage may start empty, that a fixed-size store needs at least that capacity, and that the storage must hold each written number exactly. `Box` and `Space` keep their matrix, size and ancestor-zoom explanations. `Quad` keeps the p1 to p4 order. Two function sentences change from "numeric array(s)" to "numeric storage". Every precondition and every "leaves `out` untouched" sentence is unchanged.
- **Tests.** The suite uses caller storage, and the three allocation tests are deleted. The `ancestry` refusal test asserts that an empty array stays `[]`. [`tests/storage.browser.test.ts`](../tests/storage.browser.test.ts) is new (32 tests), and [`tests/api.declaration.test.ts`](../tests/api.declaration.test.ts) is extended.
- **Contract.** [`01-public-api.md`](contract/01-public-api.md) §2 shows `Quad = Record<number, number>`, and the sentence after the diagram describes caller-owned numeric storage of eight slots with no hot-path validation. §6 says "caller-owned numeric storage, never `DOMPoint` or `DOMQuad`". [`04-support-matrix.md`](contract/04-support-matrix.md) §2.4's row is "Caller-owned reusable numeric storage output", still "No hot-path validation". Nothing else changed. `F-1` stays open.
- **drag consumers.** All nine drag rows of item 4 allocate `[]` and use the box-quad type that names the layout. These are the arm's edits after formatting. No behavior, name or comment changed.

## Verification

Chromium only, through `/usr/local/bin/chrome`. Node v26.13.0. The dependencies are the installed `npm ci` tree from the base lockfile, unchanged. The base readings are from this worktree at `3300e8f8e`, whose code is the same as `0a28f909a`'s.

| Check | Base | After |
| --- | --- | --- |
| `npx just typecheck`, box-quad | clean | clean |
| `npx just typecheck`, drag | clean | **2 errors, in drag2's `src/kernel/presentation.ts`**. See the expected consequences below. |
| `npx tsc -p packages/box-quad/.plan/probes/numeric-storage` | exit 0 | exit 0 |
| `npx just lint`, box-quad, whole package including the probes | clean | clean |
| `npx just lint`, drag, whole package | clean | clean |
| `fmt` → `lint-fix` → `fmt` → `lint` on each changed file | — | clean in both packages |
| box-quad browser project | 210 passed | 239 passed: 207 existing and 32 new |
| drag, all projects (`npx just test`) | 414 passed, 5 failed | 414 passed, 5 failed: the same 5 tests |
| `git diff --check` | — | clean |

The handoff gives drag's base as 373 browser and declaration tests plus 41 node and shipped tests passed. `npx just test` ran all of drag's projects together, and 373 + 41 = 414 passed. The same five `tests/size.node.test.ts` rows failed at the base and after the change: draggable alone, drop zone, freeDrag, freeDrag + bounds + landing, and complete.

### Existing failures, present at the base

- drag `tests/size.node.test.ts`: the five rows above, with the same failing tests after the change. The four rows that contain box-quad are still over their ceilings, by less after the change. The draggable-alone row fails its ceiling and its control at the base and after the change, with the same figures.
- drag's size instrument: the same five rows are red. Every figure is in the size table below.

### New failures caused by this unit

None in box-quad or drag.

### Expected consequences outside scope: drag2

These are caused by the removed factories, and the owner's update leaves them unfixed. They aren't base failures, and nothing suppresses them.

- **Observed.** `npx just typecheck` in drag reports `TS2724: '"@ydinjs/box-quad"' has no exported member named 'box'` and `… 'space'`, at `../drag2/src/kernel/presentation.ts` lines 13 and 15. drag's typecheck includes `bench/lab-drag2.ts`, which imports drag2's source, so drag2's import of the removed factories enters drag's program. drag's own files have no errors.
- **Not run, so not observed.** drag2's own typecheck, lint and test projects. From the source and the probe's arm, they can be expected to show this: `presentation.ts` and `tests/perf/m5.browser.test.ts` import removed exports, so drag2 doesn't typecheck. Code that reaches those imports doesn't load. In the arm, five drag2 controls moved by −31 to −42 B and failed until they were re-declared. That is the probe's reading, not this unit's.
- The handoff's factory `grep` also finds drag2's three factory calls in `presentation.ts` and `m5.browser.test.ts`. The handoff expected those three to be migrated. It also finds drag2's own `createBox()` helpers and the `box()` comment that the handoff already listed.

## Sizes

### drag, `node bench/size/measure.ts`

Brotli / minified bytes. Base and after are this unit's readings. The arm figures are from the [probe README](probes/numeric-storage/README.md).

| Composition | Base | After | Δ | Arm |
| --- | --: | --: | --: | --: |
| draggable alone (control, no box-quad) | 2197 / 6733 | 2197 / 6733 | 0 / 0 | 2197 / 6733 |
| draggable + lift | 3974 / 11544 | 3941 / 11464 | −33 / −80 | 3941 / 11464 |
| example: resize handle | 3310 / 9390 | 3290 / 9269 | −20 / −121 | 3290 / 9269 |
| example: drop zone | 4610 / 13183 | 4577 / 13060 | −33 / −123 | 4577 / 13060 |
| example: canvas group | 3306 / 9526 | 3287 / 9439 | −19 / −87 | 3287 / 9439 |
| freeDrag | 5036 / 15201 | 4998 / 15079 | −38 / −122 | 4998 / 15079 |
| freeDrag + bounds + landing | 5476 / 16366 | 5465 / 16243 | −11 / −123 | 5465 / 16243 |
| sortable + y | 6721 / 20741 | 6698 / 20657 | −23 / −84 | 6698 / 20657 |
| sortable + xy | 6602 / 20297 | 6588 / 20215 | −14 / −82 | 6588 / 20215 |
| complete | 7356 / 22420 | 7327 / 22290 | −29 / −130 | 7327 / 22290 |

Every row equals the arm's figure. No row is larger than at the base. The control is 2197 B Brotli and 6733 B minified, as required. No ceiling moved, and the base's five red rows are still red.

### box-quad

| Figure                                 |  Base | After |   Arm |
| -------------------------------------- | ----: | ----: | ----: |
| `npx size-limit`, whole module, Brotli |  1262 |  1197 |  1197 |
| `index.js`, published                  | 11936 | 11270 | 11269 |
| `index.d.ts`, published                |  6334 |  7531 |  6077 |

`index.js` is 1 B larger than the arm's because it keeps the function JSDoc, and "numeric storage" is longer than the "numeric array(s)" wording it replaces. The layout JSDoc that `BQ-11` property 4 requires makes `index.d.ts` 1454 B larger than the arm's, as the handoff expected.

### What is measured and what is not

- **Measured:** the byte savings above, in drag's compositions and in box-quad's module, through Rolldown and Brotli. Each figure is one joint reading of what landed. These aren't ablations.
- **Not measured:** runtime speed and allocation. This unit ran no timing. The probe's informative throughput rows found no difference between storage kinds that its resolution could detect, and they claim nothing. The removal of `new Float64Array(5)` from `coordinates`'s fallback, and drag's switch to `[]`, change what is allocated. Whether that makes anything faster or slower isn't proven here.
- **Not measured: drag2's sizes.** The owner's update left them out of scope.

## Witnesses

Each witness was run once and then reverted. `src/index.ts` was compared byte for byte with its saved copy afterwards.

1. **`export const box = (): Box => [];` appended to `src/index.ts`.** The typecheck failed with `tests/api.declaration.test.ts(92,1): error TS2578: Unused '@ts-expect-error' directive`, on the `'box'` line. `tests/storage.browser.test.ts` failed 1 of 32 tests: "should export exactly the four functions at run time".
2. **`localDelta`'s `out[0] = x;` moved above its finiteness check.** 8 of 239 tests failed: the three existing untouched-on-false tests in `local-delta.browser.test.ts`, and "should leave … untouched when it returns false" for each of the five storage kinds in `storage.browser.test.ts`. The first attempt added a second `out[0] = x` instead of moving the line, and gave the same 8 failures. It was discarded and run again as a move.

## Choices the handoff left open

- **Checking absence in the declaration test.** The handoff asks for the absence of `box`, `space`, `quad` and `delta` to be checked through the namespace import, so that the error is a type error and not an unresolved import. Reading `boxQuad.box` gives that type error, but the repository's `import/namespace` lint rule also reports it as an error. The test therefore checks `keyof typeof boxQuad`: each `const noBox: Export = 'box'` fails to typecheck under its `@ts-expect-error`, and witness 1 shows that this fails when the name returns. `lint-fix` then made the import `import type * as boxQuad`.
- **Unused type imports from the arm.** The arm added `type Box`, `type Space`, `type Delta` and `type Quad` imports that four test files and the fixtures don't use. Lint reported them as errors in code this unit introduced, so they are removed. No lint error from the base was changed.
- **The storage test's structure.** It compares a `Float64Array` and a plain object with an empty `number[]` slot for slot, using `Object.is`, across three scenarios. Each scenario takes the inputs from the same storage kind's earlier outputs. One scenario takes the size from the inverted rect, one takes it from the near-singular computed-style fallback, and one has an ancestor zoom. For each function, the test checks that a `false` leaves five stores untouched (an empty array, a filled array, a filled `Float64Array`, an empty plain object and a filled plain object), that a write fills an empty array to exactly the layout's length, and that a longer `Float64Array` keeps its extra slots. The fixtures for each `false` are a 3D ancestor for `ancestry`, a disconnected element for `coordinates`, a singular `relativeTo` for `projection`, and a singular basis for `localDelta`. No test uses a store shorter than its capacity.
- **`Quad`'s index meanings.** Each corner gets a short meaning, such as "p2, `width` along the local x axis". These come from the corner identities in contract §2.
- **The wording in contract §2.** "A `Quad` is caller-owned numeric storage of eight slots, such as `[]`, a `Float64Array` or a plain object. The TypeScript alias cannot express the capacity or the element precision. The hot path does not validate the storage's kind, capacity or writability."
- **Fixture return types.** As in the arm, `measure`, `inherited` and `readSuccessfulQuad` return `number[]`, so the tests can use `length`, iteration and `Array.from`.

## Open for acceptance

- The architect must add the owner's scope update to the record, and decide how `BQ-11` property 10 and the handoff's drag2 items stand. drag2 doesn't compile against this box-quad until it is migrated or removed.
- `BQ-11` becomes implemented when the report is accepted, and `F-1` stays open.
- No scratch work is left in the repository. The base, after and witness logs are in this session's scratchpad, and the figures in this report are copied from them.

**Next:** the architect reads this report against `BQ-11` and the owner's scope update. No pull request is open.