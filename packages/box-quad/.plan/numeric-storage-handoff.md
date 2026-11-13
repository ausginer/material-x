# Numeric storage handoff

**For:** one `implementer` unit on `box-quad/numeric-storage`. **Base:** the commit that carries this handoff. Its code is `0a28f909a`'s, and only `packages/box-quad/.plan/` differs.

**Governing records:** `BQ-11` in [`plan.md`](plan.md), with its record entry of 2026-11-13, and the evidence in [`probes/numeric-storage/`](probes/numeric-storage/README.md). `BQ-9`'s fallback property still applies. CONTRIBUTING §1.1, §4, §8 and §15, and §Comments and JSDoc, govern the code and its documentation.

**Goal:** after this unit, box-quad exports four functions and four structural storage types. Its JSDoc documents each layout, `drag` and `drag2` allocate their own storage, and every behavior and reading is unchanged or smaller. It is one pull request's worth of change. Don't open the pull request.

## Environment

- Work in this worktree on `box-quad/numeric-storage`. Install with `npm ci` from the base lockfile, and don't change `package.json` or `package-lock.json`.
- **Don't install browsers.** The browser projects use `/usr/local/bin/chrome`, and every browser run is Chromium only.
- Fresh installs need these before box-quad's tests, typecheck and size readings, in this order: `npx tsdown --config tsdown.config.ts` in `packages/vite-traits-plugin`, `packages/vite-custom-element-assets`, `packages/tproc`, `packages/size-limit-preset-rolldown` and `packages/box-quad`, then `node .scripts/css/collect-props.ts` at the repository root. Rebuild box-quad after each change to its source, because drag and drag2 typecheck against its built `index.d.ts`.

## Boundaries

**In scope:**

- `packages/box-quad/src/index.ts` and `packages/box-quad/tests/`;
- the storage statements in `packages/box-quad/.plan/contract/01-public-api.md` §2 and §6, and `04-support-matrix.md` §2.4;
- the consumer sites in item 4, and nothing else in `packages/drag` or `packages/drag2`;
- drag2's five control figures in `packages/drag2/bench/size/measure.ts` and one entry in `packages/drag2/.plan/measurements/budget-rebases.md`, item 5;
- the report, `packages/box-quad/.plan/numeric-storage-report.md`.

**Out of scope.** Don't change anything else, even where a file is already open:

- anything from `drag/size`: its dependency updates, its `number[]` rect storage, its records and its budgets;
- the `RectIndex` redesign, in either package;
- any function's name, parameter order, return value or geometry, and any failure case;
- any size ceiling or budget, in any package, and any control figure apart from item 5's five. Drag's `DRD-40` property 3 says a reading doesn't move one;
- `packages/drag/.plan/`, and `packages/drag2/.plan/` apart from item 5's entry;
- the rest of `F-1`: the contract's `readBoxQuad` naming stays as it is;
- `brief.md`, the reviews and the record's history;
- drag2's baseline lint errors in `bench/size/noncomposed.js`;
- drag's deferred campaigns, timing runs and other engines.

## Items

### 1. The source

**Site:** `packages/box-quad/src/index.ts`.

**Required properties:** `BQ-11` properties 1 to 9. In particular:

1. **Removed:** `box`, `space`, `quad`, `delta`, and `BOX_LENGTH`, `SPACE_LENGTH`, `QUAD_LENGTH` and `DELTA_LENGTH`. No new export replaces them. The slot-index constants stay where the code reads by name.
2. **Types:** `export type Box = Record<number, number>`, and the same for `Space`, `Quad` and `Delta`. The signatures are the arm's, in [`arm.patch`](probes/numeric-storage/arm.patch): writable `out`, and `Readonly<…>` for `above`, `source`, `relativeTo` and `basis`. `basis` stays `Readonly<Space> | Readonly<Box>`, because the union names the two meanings.
3. **The fallback:** when `above` is omitted, `coordinates` reads the ancestry into a fresh `[]` on each call. The arm does this, and `BQ-9` forbids module state.
4. **Writes:** keep each function's existing order. Every check comes before the first write, and the writes go from index 0 upward.
5. **No storage policy:** no `Array.isArray`, `instanceof`, `length` read, `Float64Array.from`, copy or wrapper.

**Type JSDoc (`BQ-11` property 4).** Each of `Box`, `Space`, `Quad` and `Delta` states:

- its layout as a list of indices, each with its meaning. `Box` and `Space` keep their current explanations of the matrix, the size and the ancestor zoom. `Quad` keeps the p1 to p4 corner order;
- its capacity in slots: 8, 5, 8 and 2;
- that a growable store such as `[]` or a plain object may start empty;
- that a fixed-size store such as a typed array must have at least that capacity;
- that the storage must hold each written number exactly, as `number[]`, `Float64Array` and a plain object do.

Write these as published JSDoc under [`documentation.md`](../../../.agents/docs/documentation.md) §5.1: present tense, what the caller must provide, and no record identifiers or rejected alternatives. Say once per type what the storage must do. Don't add a module-level essay.

**Function JSDoc.** Change only the sentences that name the storage. "A `Space` is a caller-owned numeric array" and "These are caller-owned numeric arrays" become caller-owned numeric storage. Every precondition and every "leaves `out` untouched" sentence stays.

### 2. The tests

**Sites:** `packages/box-quad/tests/`.

**Required properties:**

1. **The existing suite runs on caller storage.** Each factory call becomes caller-owned storage, `[]` by default. Where a test needs `length`, iteration or `Array.from`, declare the storage as `number[]` or keep a `Float64Array`. Every expected value stays as it is.
2. **The three allocation tests go:** "should allocate storage of the required length" for `box`, `space` and `quad`. The tests' own local `BOX_LENGTH` and similar constants may stay.
3. **The `ancestry` refusal test keeps its meaning.** Its expectation that the output stays `[0, 0, 0, 0, 0]` held for a zero-filled factory store. Assert untouched against the store's initial state instead: an empty array stays `[]`, or a sentinel store keeps its sentinels.
4. **A new `tests/storage.browser.test.ts`** asserts:
   - the module's runtime exports are exactly `ancestry`, `coordinates`, `localDelta` and `projection`, through `Object.keys` of the namespace;
   - for representative scenarios, each function writes `Object.is`-equal slots into an empty `number[]`, an exact `Float64Array` and a plain object, inputs in the same kinds included. Include one success through each size path, and one `false` from each function;
   - a `false` leaves each kind's keys, values and `length` as they were, and an empty array stays empty;
   - a successful write into an empty array gives exactly the layout's length with no holes, and a longer `Float64Array` keeps its extra slots.

   The probe's matrix is a model. The test compares storage kinds with each other, so it needs no baseline module. Don't test a store shorter than its capacity: that is outside the contract.

5. **`tests/api.declaration.test.ts`** compiles exactly when:
   - `number[]`, `Float64Array` and a plain object are accepted as every output and input;
   - `readonly number[]` is accepted as every input;
   - with `@ts-expect-error`, a `string`, a `DOMMatrix` and an `Array<number | string>` are refused as output storage, and the namespace has no `box`, `space`, `quad` or `delta`. Read these as properties of the namespace import, so the error is a type error and not an unresolved import;
   - the existing `@ts-expect-error` lines stay.

**Witnesses, run once and reverted, and reported:**

- export `const box = (): Box => []` again: the export test fails, and so does the declaration test;
- move one `out[…] =` assignment above its check in `localDelta`: the untouched-on-false tests fail.

### 3. The contract

**Sites:** [`contract/01-public-api.md`](contract/01-public-api.md) §2 and §6, [`contract/04-support-matrix.md`](contract/04-support-matrix.md) §2.4.

**Required properties:**

1. §2's `export type Quad = Float64Array;` and the sentence after the diagram describe `Quad` as `Record<number, number>`, caller-owned numeric storage of eight slots. The hot path still validates nothing about the storage.
2. §6's "The public output is always a `Float64Array`, not `DOMPoint` or `DOMQuad`" says that the output is caller-owned numeric storage, never `DOMPoint` or `DOMQuad`.
3. §2.4's row "Caller-owned reusable `Float64Array` output" names caller-owned numeric storage, with "No hot-path validation" unchanged.
4. The rest of both artifacts doesn't change. `F-1` stays open.

### 4. The consumers

Allocate `[]` at each site where a factory was called. The bytes in [`probes/numeric-storage/`](probes/numeric-storage/README.md) were measured with `[]`, and `Float64Array` literals are larger. Annotate the storage with the box-quad type that names its layout. A field or return type spelled `Float64Array` that holds box-quad storage becomes that type. Don't change any behavior, name or comment beyond that.

| Package | File | Sites |
| --- | --- | --- |
| drag | `src/lift.ts` | `box as createBox` and `space` imports; `visualSpace`, `itemSpace`, `measured` |
| drag | `src/shared/landing.ts` | `delta` import; `local` |
| drag | `src/sortable/layout-animation.ts` | `delta` import; `local` |
| drag | `src/free-drag/geometry.ts` | `delta` import; `local`, and `toLocal`'s return type |
| drag | `src/draggable.stories.tsx` | `box as createBox` and `delta` imports; `local`, `basis`, and `State`'s `basis` type |
| drag | `tests/fixtures/resize-handle.ts` | imports; `local`, `basis`, and `State`'s `basis` type |
| drag | `tests/fixtures/canvas-group.ts` | imports; `local`, `basis`, and `State`'s `basis` type |
| drag | `tests/coordinates.browser.test.ts` | imports; `basis`, `local`, `measured`, and the inline `space()` |
| drag | `bench/lab-no-lift.ts` | imports; `basis`, `local` |
| drag2 | `src/kernel/presentation.ts` | `box` and `space` imports; `above`, `itemAbove`, `measured` |
| drag2 | `tests/perf/m5.browser.test.ts` | `space` import; `above` |

`grep -rnE "\b(box|space|quad|delta)\(\)|createBox\(\)" packages/drag packages/drag2 --include='*.ts' --include='*.tsx' --exclude-dir=.plan --exclude-dir=node_modules` then finds only drag2's `createBox()` test helpers in `tests/kernel/presentation.browser.test.ts` and one `box()` in a comment in `tests/sortable/commit-window.browser.test.ts`, which are drag2's own. Drag's README sentence "`localDelta(basis, dx, dy, out)` converts a viewport delta, with no allocation" is still true, and it stays.

### 5. drag2's controls

drag2's size gate, `tests/bench/size.node.test.ts`, holds exact Brotli figures for its control rows. Five of them contain box-quad, so this change moves them, and they fail until they are re-declared. In the arm:

| Control                   | Declared at the base |   Arm | Move |
| ------------------------- | -------------------: | ----: | ---: |
| `free drag minimal`       |                8,369 | 8,327 |  −42 |
| `free drag + bounds`      |                8,582 | 8,542 |  −40 |
| `free drag + landing`     |                8,521 | 8,486 |  −35 |
| `free drag complete`      |                8,735 | 8,695 |  −40 |
| `kernel root - kernel.js` |                6,422 | 6,391 |  −31 |

**Required properties:**

1. Each of the five `control:` values in `packages/drag2/bench/size/measure.ts` becomes the reading after the change, measured with box-quad and drag2 rebuilt. drag2 resolves box-quad through its built `index.js`, so a stale build reports no change.
2. Every one of the five moves downward. `vocabulary root - drag.js` stays at 142, and no ceiling changes.
3. A new dated section at the end of `packages/drag2/.plan/measurements/budget-rebases.md`, in the form of the 2026-11-05 entries: the before and after table, that all controls passed at the base, the one named change (box-quad's `BQ-11` and the consumer migration in this commit), why each graph reaches it, the row that didn't move, and "no ceiling moved, no control became a ceiling, and no interval is unattributed".

## Verification

Run each check at the base first and record the result, then after the change. **The report lists existing failures and new failures separately. Every new failure returns the unit.**

**Existing at the base, measured by the architect at `0a28f909a`:**

| Check | Base result |
| --- | --- |
| `npx just typecheck` in `box-quad`, `drag`, `drag2` | clean |
| `npx just lint` in `box-quad` | clean, with the probes |
| `npx just lint` in `drag` | clean |
| `npx just lint` in `drag2` | oxlint: 12 errors, all in `bench/size/noncomposed.js`; ESLint isn't reached. Lint drag2's changed files by name. |
| box-quad browser | 210 passed |
| drag browser and declaration projects | 373 passed |
| drag2 browser and declaration projects | 1038 passed, 68 skipped |
| drag node and shipped projects | 41 passed, 5 failed: `tests/size.node.test.ts` for draggable alone, drop zone, freeDrag, freeDrag + bounds + landing, and complete |
| drag2 node and shipped projects | 454 passed. In the arm, 5 fail until item 5 re-declares the controls. |
| drag size instrument | five rows over their ceilings, listed in the probe README |

**After the change:**

1. Finalize every edited file as [`handoff.md`](../../../.agents/docs/handoff.md) says: `fmt`, `lint-fix`, `fmt`, `lint`, per package and by file.
2. `npx just typecheck` in box-quad, drag and drag2 is clean. The type probe still compiles: `npx tsc -p packages/box-quad/.plan/probes/numeric-storage`.
3. box-quad's browser project passes: 207 existing tests and the new storage tests.
4. drag's and drag2's browser and declaration projects give the base's counts, and the node and shipped projects give the base's results.
5. `node bench/size/measure.ts` in `packages/drag`: no row is larger than at the base in Brotli or minified bytes, and `draggable alone` is 2197 B Brotli and 6733 B minified. Each row should be within a few bytes of the arm's figures. A row more than 5 B Brotli above the arm returns the unit. The base's five red rows stay red, and no ceiling moves.
6. `npx size-limit` in `packages/box-quad` gives the whole module's Brotli, and `wc -c index.js index.d.ts` gives the published files. Report both with the base's 1262, 11936 and 6334 B. The declaration file grows with the layout JSDoc, and that is expected.
7. Run the two witnesses in item 2.
8. `git diff --check` is clean, and the changed Markdown links resolve.

## Commits, report and push

- One commit for the change: box-quad's source, tests and contract, the consumers, and drag2's re-declared controls with their entry. The consumers don't compile against the old types and box-quad's new types break the old consumers, so no split typechecks. The report is a second commit.
- The report gives: the base and resulting commits, each verification step's result in two lists (existing failures and new failures), the drag size table against the base and the arm, drag2's five controls against the base and the arm, box-quad's whole-module and published figures, the two witnesses, and every choice the handoff left open.
- Push `box-quad/numeric-storage`. Don't open a pull request.

## Return conditions

Stop and report, without working around it, if:

- a property in `BQ-11` can't be met as written;
- any test that passes at the base fails, or any count changes beyond item 2's three deletions and the new tests;
- a typecheck or lint error appears that the base doesn't have;
- a drag size row grows against the base, or lands more than 5 B Brotli above the arm;
- a drag2 control moves upward, `vocabulary root - drag.js` moves, or any other drag2 size test changes its result;
- a consumer outside item 4's table imports a removed factory;
- a change outside the boundaries seems necessary.

## After this unit

The architect reads the report against `BQ-11`. The owner decides when the pull request opens. `F-1` stays open, and `BQ-11` becomes implemented once the report is accepted.