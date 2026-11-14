# `coordinates` fallback storage probes

Evidence for [`fallback-storage-comparison.md`](../../fallback-storage-comparison.md). The base is `packages/box-quad/src/index.ts` at `1de33ae40`, which `src/index.ts` is unchanged from. The candidate differs from it in one line. Every browser reading is Chrome for Testing 157.0.8103.38 at `/usr/local/bin/chrome`, on 2026-11-13, with Node v26.13.0 and the installed dependency tree.

| File | What it is |
| --- | --- |
| [`candidate.ts`](candidate.ts) | The whole module with `coordinates`' fallback as `const read: Space = new Float64Array(5);` instead of `[]`. Nothing else differs. |
| [`compare.ts`](compare.ts) | The Chromium instrument: `backing`, `allocation` and `timing` modes. Its header says how to run it. |
| [`tsconfig.json`](tsconfig.json) | Typechecks the two files above: `npx tsc -p packages/box-quad/.plan/probes/fallback-storage/tsconfig.json --noEmit`. |
| [`backing.json`](backing.json), [`allocation.json`](allocation.json), [`timing.json`](timing.json) | Every reading below, per page. |

**How to try the candidate.** Benchmarks bundle it from its path, so they need no change to `src`:

```sh
P=packages/box-quad/.plan/probes/fallback-storage
node $P/compare.ts allocation /tmp/out.json base=packages/box-quad/src/index.ts \
  base2=packages/box-quad/src/index.ts F=$P/candidate.ts
```

The suite and the size instruments read `src`, so for them, copy it in, then restore it:

```sh
cd packages/box-quad
cp .plan/probes/fallback-storage/candidate.ts src/index.ts
npx just test && npx just size
git checkout -- src/index.ts && npx just build
```

`just size` builds `index.js` from `src`, so the last line rebuilds it from the restored base.

## Behavior

With the candidate in `src`, the suite passed 242 of 242 tests. That's the 240 existing tests plus the two in [`walk.browser.test.ts.txt`](../coordinates-walk/walk.browser.test.ts.txt), run against `1de33ae40`'s source as the baseline. The probe compares the return value, every written slot by `Object.is`, untouched output on `false`, and the order of style and rect reads, over 17 scenarios. Its `getClientRects` test re-enters the fallback on another element and matches the base. `tsc` passes on the package with the candidate in place, so `Float64Array` is assignable to `Space`.

No mutation was run. The candidate changes no arithmetic and no condition, and the finiteness regression doesn't involve the fallback storage.

## Bytes

These are the BQ-11 instruments: `npx size-limit` after `tsdown` for box-quad's whole module, and `node packages/drag/bench/size/measure.ts` for drag's compositions, which bundle box-quad from source. Each is one joint reading per arm, taken in the same session. The base figures equal the BQ-12 report's and the coordinates-walk probe's.

| Figure, Brotli / minified      |    Base `[]` |    Candidate | Difference |
| ------------------------------ | -----------: | -----------: | ---------: |
| box-quad, whole module, Brotli |         1197 |         1218 |        +21 |
| draggable alone (control)      |  2197 / 6733 |  2197 / 6733 |      0 / 0 |
| draggable + lift               | 3941 / 11464 | 3957 / 11497 |  +16 / +33 |
| example: resize handle         |  3290 / 9269 |  3299 / 9302 |   +9 / +33 |
| example: drop zone             | 4577 / 13060 | 4586 / 13093 |   +9 / +33 |
| example: canvas group          |  3287 / 9439 |  3287 / 9439 |      0 / 0 |
| freeDrag                       | 4998 / 15079 | 5013 / 15112 |  +15 / +33 |
| freeDrag + bounds + landing    | 5465 / 16243 | 5458 / 16276 |   −7 / +33 |
| sortable + y                   | 6698 / 20657 | 6699 / 20690 |   +1 / +33 |
| sortable + xy                  | 6588 / 20215 | 6586 / 20248 |   −2 / +33 |
| complete                       | 7327 / 22290 | 7326 / 22323 |   −1 / +33 |

The measure script also prints six ceiling violations: four rows over their ceiling, the control row over its ceiling, and the control moved against its recorded value. The base prints the same six, on the same rows, and its amounts differ only by each row's difference above. So the candidate causes none of them, and BQ-12 property 10 leaves ceilings alone.

## Typed-array backing storage

`compare.ts backing`, one page. "Sampled" is the sampling heap profiler's bytes per allocation over 20,000 allocations. "Retained" is the change in `Runtime.getHeapUsage` after 10,000 are kept alive and a GC runs: `usedSize` for the V8 heap and `backingStorageSize` for array-buffer backing stores.

| Allocation | Sampled, B each | Retained on V8 heap, B each | Retained in backing stores, B each |
| --- | --: | --: | --: |
| `[]` written to five slots | 161.5 | 164.0 | 0.0 |
| `new Float64Array(5)` | 167.3 | 164.0 | 0.0 |
| `new Float64Array(16)` (contrast) | 112.7 | 116.0 | 128.0 |

**Measured.** A five-slot `Float64Array` keeps its 40 bytes of elements on the V8 heap, with no backing store, so the profiler's readings below include them. A 16-slot one puts its 128 bytes in a backing store, which the profiler doesn't count. That contrast is what shows the instrument would miss off-heap storage, and that it isn't missing any here.

## Allocation

`compare.ts allocation`. Each scenario gets its own pages, three of them, so its feedback is its own. Every arm is warmed with 4000 calls. Then each arm gets one sampling window: a forced GC, then the sampling heap profiler at a 32 B interval, with objects collected by minor and major GC included, over 20,000 calls. The A/A arm is the base bundled a second time.

The fixture is a chain of `rotate: 3deg; scale: 1.01` ancestors around a measured `rotate: -7deg` element. Depth counts the walk's ancestors, `body` and `html` included.

- **"`above`"** passes a `Space` from `ancestry` in a `[]`, as drag's `lift` does.
- **"`above` after fallback"** first runs each arm 4000 times without `above` on the same element. Its inherited reads have then seen both the fallback's storage and the caller's.

Bytes per call. The difference is the median of three pages against the base's median, with each page's own difference in brackets:

| Scenario | Base | A/A | Candidate |
| --- | --: | --: | --: |
| fallback, depth 2 | 355.3 | −0.6 [−0.2, −0.6, −2.0] | **+72.4** [72.4, 73.4, 72.3] |
| fallback, depth 14 | 3026.4 | +0.5 [1.0, −1.6, 0.5] | **+7.7** [6.4, 8.8, 7.7] |
| fallback, depth 32 | 6839.5 | +4.4 [4.4, 3.4, 5.4] | +13.6 [13.6, 14.4, 7.3] |
| `above`, depth 14 | 224.8 | +0.4 [0.7, 0.4, 0.4] | −0.4 [0.0, −1.1, −0.4] |
| `above` after fallback, depth 14 | 222.5 | +0.3 [0.0, 0.9, 0.3] | +2.7 [2.5, 2.7, 2.7] |

Bytes per call attributed to the two functions, as the median page:

| Scenario | `coordinates`, base → candidate | `ancestry`, base → candidate |
| --- | --: | --: |
| fallback, depth 2 | 190 → 340 | 125 → 49 |
| fallback, depth 14 | 202 → 352 | 1811 → 1668 |
| fallback, depth 32 | 202 → 352 | 4164 → 4021 |

**An earlier run** used the harness before its lint-only edits: types, `Math.floor` for `>> 1`, and its in-page helpers moved into its setup script. Its candidate differences were +73.7, +5.6, +1.8, −0.4 and +1.7 B per call, in the table's order. Only depth 32 disagrees beyond its A/A spread, which reached 4.4 B in both runs. That row is therefore treated as unresolved.

## Timing

**Under an owner hold**, granted by the owner on 2026-11-13 and run from 17:23:39 to 17:27:37 UTC. The load average read 1.67 at the start and 2.60 at the end, so the machine wasn't idle, and the pages vary widely from one to the next.

`compare.ts timing`: seven pages per scenario, each with a fresh feedback state and 4000 warm-up calls per arm. In each page, every arm takes nine samples, rotating the arm order. A sample is one `performance.now()` span over 4000 calls, and a page keeps each arm's median. The timer's quantum is 25 ns per call at this call count. The verdict needs the same sign on at least six of seven pages and a median difference beyond the largest A/A difference on any page.

This run used the harness before its lint-only edits. Its scenarios, warm-up, sampling and verdict are the committed harness's.

ns per call. The difference is the median of the seven page-paired differences from the base, and "lower/higher" counts the pages:

| Scenario | Base | A/A: median, largest | Candidate | Lower/higher | Verdict |
| --- | --: | --: | --: | :-: | --- |
| fallback, depth 2 | 7675 | −50, 475 | −375 | 7/0 | no difference shown |
| fallback, depth 14 | 72525 | −525, 9300 | −25 | 4/3 | no difference shown |
| fallback, depth 32 | 171325 | +1350, 12775 | +1850 | 3/4 | no difference shown |
| `above`, depth 14 | 4625 | −50, 150 | −50 | 6/0 | no difference shown |
| `above` after fallback, depth 14 | 4700 | −50, 300 | −175 | 6/0 | no difference shown |

**Measured:** no scenario shows a difference.

**Not established:** the candidate was lower on all seven pages at fallback depth 2, by a median 375 ns, against a largest A/A difference of 475 ns. It was also lower on six of seven pages with `above`, by 50 and 175 ns, against bounds of 150 and 300 ns. These are directions under the bound, not results.