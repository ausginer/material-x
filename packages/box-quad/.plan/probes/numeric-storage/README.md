# Numeric storage probes

Evidence for `BQ-11` in [`plan.md`](../../plan.md). The base is `0a28f909a`. Every browser reading is Chrome for Testing 157.0.8103.38 through the package's own Vitest browser project, at `/usr/local/bin/chrome`, on 2026-11-13. Node is v26.13.0, and the dependencies are `npm ci` from the lockfile at `0a28f909a`, unchanged.

| File | What it establishes |
| --- | --- |
| [`types.ts`](types.ts) with [`tsconfig.json`](tsconfig.json) | Which storage types the proposed contracts accept and refuse. It compiles exactly when every recorded fact holds. |
| [`storage.browser.test.ts.txt`](storage.browser.test.ts.txt) | That the computation is unchanged for each storage kind, slot for slot, and that a `false` leaves each kind as it was. Its header says how to run it. It is stored as `.txt` because its imports resolve only in a scratch copy of the package, as drag's probes are. |
| [`arm.diff.txt`](arm.diff.txt) | The measurement arm: the candidate `src/index.ts`, the migrated consumers and the migrated suite. It has no JSDoc and isn't the implementation. |

## Type compatibility

`npx tsc -p packages/box-quad/.plan/probes/numeric-storage` exits 0 with TypeScript 6.0.2. Changing two facts (`Float32Array` refused, `DOMMatrix` accepted) gives two TS2344 errors, so the probe can fail.

The writable contract is `Record<number, number>`, and the input contract is `Readonly<Record<number, number>>`.

| Storage | Writable output | Read-only input |
| --- | :-: | :-: |
| `number[]`, a tuple of numbers | accepted | accepted |
| `Float64Array`, also over a `SharedArrayBuffer` | accepted | accepted |
| a plain object such as `{ 0: number; 1: number }` | accepted | — |
| a class or interface that declares `[index: number]: number`, with or without `length` | accepted | — |
| `Float32Array`, `Int32Array`, `Uint8ClampedArray` | **accepted** | — |
| `readonly number[]`, `Readonly<Record<number, number>>` | **accepted** | accepted |
| `ArrayLike<number>`, a read-only tuple | — | accepted |
| `string`, `(number \| string)[]`, `(number \| undefined)[]`, `bigint[]`, `BigInt64Array` | refused | `string` refused |
| `DOMMatrix`, `DOMMatrixReadOnly`, `Map<number, number>` | refused | refused |
| a class with numeric fields `0` and `1` but no index signature | refused | — |

Two rows are limits of the type system, not choices:

- **The element type isn't visible.** A narrower typed array matches the index signature, so the type accepts storage that rounds or truncates what box-quad writes. The precision requirement is therefore documented, not typed.
- **TypeScript doesn't check `readonly` in assignability**, so a read-only array is accepted as an output. Writing through the input contract is refused, and box-quad's own body never writes through one.

**The rejected alternative** is to intersect each type with `{ readonly [Symbol.toStringTag]?: 'Float64Array' }`. It refuses `Float32Array` and `Int32Array` and still accepts `number[]`, `Float64Array` and plain objects. It also refuses any storage class that declares its own tag, though that storage holds doubles exactly. And it puts an unrelated symbol into four public types to exclude one family of built-ins. `types.ts` records it as `TaggedFacts`.

## Behavior

The arm's whole suite, migrated to `number[]` storage with the three allocation tests deleted: **207 passed**. The baseline suite at `0a28f909a`: **210 passed**.

`storage.browser.test.ts.txt` against the arm: **12 passed**. Against `0a28f909a`'s own source as the candidate: **11 passed, 3 throughput rows skipped**. So the arithmetic was already storage-agnostic at run time, and the change is to the types, the factories and the internal fallback.

The matrix covers nine scenarios: plain, transformed ancestor with skew, ancestor zoom with `rotate` and `scale`, the near-singular size fallback, a collapsed `scale(0)` box, `display: contents`, a 3D ancestor, a shadow tree, and a disconnected element. For each one it covers `ancestry`, `coordinates` with and without the ancestry argument, `projection` into the viewport and relative to the previous box (a zero box first, so the singular target is covered), and `localDelta` through the box and through the space. It writes into five storage kinds: an empty `number[]`, a presized `number[]`, an exact `Float64Array`, a `Float64Array` four slots too long, and a plain object.

- Every successful slot is `Object.is`-equal to the baseline's `Float64Array`.
- Every `false` leaves the storage's keys, values and `length` as they were. An empty array stays empty.
- A successful write into an empty array leaves exactly the layout's length with no holes. A plain object gets exactly the layout's keys. The four extra slots of the long `Float64Array` stay untouched.

**Mutation.** Moving `localDelta`'s `out[0] = x` above its finiteness check fails 10 cases, the two untouched-on-false cases for each of the five kinds.

**Outside the contract, observed and not tested.** `coordinates` into a `Float64Array(4)` returns `true` with `[1, 0, 0, 1]`: a typed array drops writes past its length. A fixed-size store must have the layout's capacity, and nothing checks it.

**Throughput, informative.** `projection` relative to a box plus one `localDelta`, 200,000 pairs, seven runs, one storage kind per Vitest invocation, three rounds. Medians in ns per pair:

| Storage              | Round 1 | Round 2 | Round 3 |
| -------------------- | ------: | ------: | ------: |
| empty `number[]`     |    19.5 |    28.0 |    56.5 |
| presized `number[]`  |    23.5 |    23.5 |    25.5 |
| exact `Float64Array` |    27.5 |    54.5 |    25.0 |

The ranges overlap in every round, and the order changes between rounds. No storage kind is measurably slower at this resolution, and nothing is claimed for speed.

## Bytes

Drag's own instrument, `node packages/drag/bench/size/measure.ts`, bundles box-quad from source with Rolldown 1.2.15. Brotli, then minified, in bytes:

| Composition | `0a28f909a` | Arm | Δ | A: consumers only | B: arm, `Float64Array` consumers |
| --- | --: | --: | --: | --: | --: |
| draggable alone (control, no box-quad) | 2197 / 6733 | 2197 / 6733 | 0 / 0 | 2197 | 2197 |
| draggable + lift | 3974 / 11544 | 3941 / 11464 | −33 / −80 | 3966 | 3954 |
| example: resize handle | 3310 / 9390 | 3290 / 9269 | −20 / −121 | 3313 | 3299 |
| example: drop zone | 4610 / 13183 | 4577 / 13060 | −33 / −123 | 4602 | 4594 |
| example: canvas group | 3306 / 9526 | 3287 / 9439 | −19 / −87 | 3287 | 3302 |
| freeDrag | 5036 / 15201 | 4998 / 15079 | −38 / −122 | 5023 | 5020 |
| freeDrag + bounds + landing | 5476 / 16366 | 5465 / 16243 | −11 / −123 | 5457 | 5463 |
| sortable + y | 6721 / 20741 | 6698 / 20657 | −23 / −84 | 6711 | 6705 |
| sortable + xy | 6602 / 20297 | 6588 / 20215 | −14 / −82 | 6594 | 6588 |
| complete | 7356 / 22420 | 7327 / 22290 | −29 / −130 | 7345 | 7342 |

- **Arm** is the joint change: box-quad without the factories, its internal fallback allocating `[]`, and every consumer allocating `[]`. It is the figure to book.
- **A** keeps `0a28f909a`'s box-quad and migrates only the consumers to `[]`. The factories are tree-shaken from every row already, but `coordinates` keeps its internal `space()`, so each row that reaches `coordinates` keeps `new Float64Array(5)`. The canvas group reaches only `ancestry` and `localDelta`, and its saving is all on the consumer side.
- **B** keeps the arm's box-quad and has the consumers allocate `new Float64Array(n)` literals. It is still at or below the base in Brotli, but `[]` is smaller in every row, and B is larger than the base in minified bytes on seven rows, by 9 to 42 B: draggable + lift, drop zone, freeDrag, freeDrag + bounds + landing, both sortables, and complete.
- A and B are ablations for attribution, and they don't add up to the arm.

The base already exceeds five ceilings: draggable alone (and its control), drop zone, freeDrag, freeDrag + bounds + landing, and complete. The arm moves no row upward and changes no ceiling.

**drag2's controls.** drag2's `tests/bench/size.node.test.ts` holds exact Brotli figures for its control rows, and resolves box-quad through its built `index.js`. With the arm built, five controls move and fail, and nothing else in drag2's node and shipped projects does (449 passed, 5 failed, against 454 passed at the base):

| Control                   | Declared |   Arm | Move |
| ------------------------- | -------: | ----: | ---: |
| `free drag minimal`       |    8,369 | 8,327 |  −42 |
| `free drag + bounds`      |    8,582 | 8,542 |  −40 |
| `free drag + landing`     |    8,521 | 8,486 |  −35 |
| `free drag complete`      |    8,735 | 8,695 |  −40 |
| `kernel root - kernel.js` |    6,422 | 6,391 |  −31 |

`vocabulary root - drag.js` doesn't contain box-quad and stays at 142. drag's own node and shipped projects give the base's result in the arm: 41 passed and the same 5 size rows failed.

**Whole module.** `npx size-limit` in `packages/box-quad` weighs the built `index.js` with every export: **1262 B → 1197 B** Brotli. The published files, with this arm's unchanged JSDoc: `index.js` 11936 → 11269 B and `index.d.ts` 6334 → 6077 B. The layout JSDoc that `BQ-11` requires adds to `index.d.ts`, and the implementation reports that figure.