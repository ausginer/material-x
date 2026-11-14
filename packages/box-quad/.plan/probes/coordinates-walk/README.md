# `coordinates` ancestry-array probes

Evidence for [`coordinates-walk-proposal.md`](../../coordinates-walk-proposal.md). The base is `27c8f5495`. Every browser reading is Chrome for Testing 157.0.8103.38 at `/usr/local/bin/chrome`, on 2026-11-13. Node is v26.13.0, and the dependencies are the installed tree at `27c8f5495`, unchanged.

| File | What it establishes |
| --- | --- |
| [`arm-a.diff.txt`](arm-a.diff.txt) to [`arm-e.diff.txt`](arm-e.diff.txt) | The five formulations, each a diff of `packages/box-quad/src/index.ts` against `27c8f5495`. Each applies with `git apply` from the repository root. They aren't the implementation. Only A and B carry a JSDoc for the shared walk. |
| [`walk.browser.test.ts.txt`](walk.browser.test.ts.txt) | That a candidate matches `27c8f5495` in return values, written slots, untouched output on `false`, and platform read order. Its header says how to run it. |
| [`compare.ts.txt`](compare.ts.txt) | The Chromium allocation instrument, and an unused timing mode. Its header says how to run it. |
| [`allocation.json`](allocation.json) | Every allocation reading in the proposal, per page. |

## The formulations

| Arm | What changes |
| --- | --- |
| A | An internal `inherit(element, out?)` runs the walk and returns its `DOMMatrix`, or `false`. It writes `out` only when one is given, after the walk succeeds. `ancestry` returns `!!inherit(element, out)`. `coordinates` assigns `ia` to `id` in two branches: from `above` or from the matrix. |
| B | `inherit(element, view, matrix)` composes into a caller's `DOMMatrix` and returns `ancestorZoom`, or `false`. `ancestry` writes `out` itself. `coordinates`' reads are as in A. |
| C | A's walk. `coordinates` holds `above ? undefined : inherit(element)` and reads each of `ia` to `id` after `composeNode`, as `inherited ? inherited.a : above![SPACE_A]!`. |
| D | **Control, not a candidate.** A's walk and `ancestry`, with `coordinates`' `const read: Space = []` fallback kept and calling `inherit`. It separates the helper split from removing the array. |
| E | C with each matrix read written `+inherited.a`. |

## Behavior

The whole suite at `27c8f5495` is 240 tests. With [`walk.browser.test.ts.txt`](walk.browser.test.ts.txt) added, it is 242.

| Arm  | Suite and probe | Finiteness mutation |
| ---- | --------------- | ------------------- |
| A    | 242 passed      | 2 failed            |
| B    | 242 passed      | 2 failed            |
| C    | 242 passed      | 2 failed            |
| D, E | not run         | not run             |

**The finiteness mutation** moves `out[BOX_A] = a;` above `coordinates`' finiteness check. In each arm it fails "should preserve every output value when the result is not finite" in `coordinates.browser.test.ts`, and the probe's parity test. No other test fails. The finiteness test's assertion that `ancestry` returns `true` with a non-finite `space[SPACE_A]` still holds, so the walk still has no finiteness check of its own.

**What the parity probe checks.** It covers 17 scenarios. Eleven succeed:

- plain;
- transformed ancestor and skew;
- ancestor zoom with `rotate` and `scale`;
- two ancestors whose transforms give a different result in the other order;
- own zoom under a transformed ancestor;
- the near-singular size fallback;
- `scale(0)`;
- depth 12 with rotations;
- a `display: contents` parent with zoom;
- a shadow tree;
- a slotted element.

Six return `false`:

- `display: contents` element;
- a fragmented inline;
- 3D ancestor;
- own 3D transform;
- nine nested `scale(1e38)` ancestors;
- disconnected.

The probe asserts each scenario's outcome, so a refusal can't pass by being missed.

For each scenario the probe calls `ancestry`, `coordinates` without `above`, and `coordinates` with `above` when the base's `ancestry` succeeds. It compares the candidate with the base as follows:

- the return value;
- every slot with `Object.is`, and the length;
- that a filled `number[]` is unchanged on `false`;
- the sequence of `getComputedStyle` and `getClientRects` calls, by element.

A second test overrides `getClientRects` on an element so that it calls `coordinates` without `above` on a descendant, and compares both outputs with the base.

**Witnesses, on A.**

- `preMultiplySelf` changed to `multiplySelf` in the walk fails both probe tests. With the two-ancestor scenario removed, it failed only the `getClientRects` test.
- An extra `getComputedStyle(element)` before the fallback walk fails the parity test.

**The existing suite misses the composition order.** The same `multiplySelf` change made to the base itself passes all 240 existing tests and fails only the probe's two. No existing scenario has two ancestors whose transforms give a different result in the other order. The proposal routes this observation.

## Bytes

These are the same instruments as the BQ-11 report. `npx size-limit` measures box-quad's whole module after `tsdown`. `node packages/drag/bench/size/measure.ts` bundles box-quad from source. Brotli, then minified, in bytes:

| Figure | Base | A | B | C |
| --- | --: | --: | --: | --: |
| box-quad, whole module, Brotli | 1197 | 1225 | 1240 | 1210 |
| draggable alone (control) | 2197 / 6733 | 2197 / 6733 | 2197 / 6733 | 2197 / 6733 |
| draggable + lift | 3941 / 11464 | 3971 / 11523 | 3987 / 11572 | 3956 / 11514 |
| example: resize handle | 3290 / 9269 | 3304 / 9297 | 3286 / 9235 | 3290 / 9288 |
| example: drop zone | 4577 / 13060 | 4605 / 13119 | 4621 / 13168 | 4592 / 13110 |
| example: canvas group | 3287 / 9439 | 3308 / 9474 | 3311 / 9501 | 3308 / 9474 |
| freeDrag | 4998 / 15079 | 5034 / 15138 | 5038 / 15187 | 5014 / 15129 |
| freeDrag + bounds + landing | 5465 / 16243 | 5476 / 16302 | 5482 / 16351 | 5456 / 16293 |
| sortable + y | 6698 / 20657 | 6725 / 20718 | 6741 / 20767 | 6716 / 20709 |
| sortable + xy | 6588 / 20215 | 6613 / 20274 | 6623 / 20323 | 6598 / 20265 |
| complete | 7327 / 22290 | 7359 / 22351 | 7370 / 22400 | 7351 / 22342 |

Each figure is one joint reading of that arm. The base's drag figures equal the BQ-12 implementation report's. D and E were not size-measured: D is a control, and E's unary `+` was tried only for allocation.

## Allocation

**Instrument.** [`compare.ts.txt`](compare.ts.txt) with `<rounds>` 0. Each arm is bundled with Rolldown, unminified. Each of three pages builds a fixture per scenario and warms up every arm with 4000 calls. Each arm then gets its own sampling window: a forced GC, then the CDP sampling heap profiler, with a 32-byte interval and objects collected by minor and major GC included, over 20,000 calls. The reading is the sampled bytes in the window divided by 20,000.

**The A/A arm** is the base bundled a second time, as a separate module instance. The fixture is a chain of absolutely positioned `div`s, each `rotate: 3deg; scale: 1.01`, around a measured `div` with `rotate: -7deg`. Depth counts the walk's ancestors, `body` and `html` included.

Bytes per call. The difference is the median of three pages against the base's median, and the A/A column is the same difference for the second base:

| Scenario | Base | A/A | A | B | C | D | E |
| --- | --: | --: | --: | --: | --: | --: | --: |
| fallback, depth 2 | 367 | −0.3 to +0.9 | −92 | −92 | −93 | +0.1 | −92 |
| fallback, depth 14 | 3025 to 3029 | −1.3 to +2.2 | −156 | −157 | −161 | −1.9 | −158 |
| fallback, depth 32 | 6833 to 6838 | −3.2 to +2.1 | −154 | −157 | −156 | +6.3 | −150 |
| `above`, depth 14 | 216 to 218 | −0.8 to +0.7 | **+57** | **+57** | **+57** | −1.6 | **+40** |

The A, B, C and E arms were measured in four separate runs, each with its own base and A/A pair, which is why the base column gives ranges. D at depth 32, +6.3, is about twice the largest A/A difference in that row. Its three pages read 6847, 6843 and 6838, against the base's 6835 to 6837. It is not claimed.

**What the readings establish.**

- **Removing the array takes 92 to 161 B per call off the fallback path.** D keeps the array and moves the walk into a helper, and it reads like the base on every row. So the saving comes from the array and its growth to five slots, not from the split.
- **Every formulation without the array allocates more on the `above` path:** +57 B per call for A, B and C, and +40 B for E. The `above` path doesn't run the walk, and D shows that the helper split alone adds nothing. So the cost comes from `coordinates` taking its four inherited values from either a `DOMMatrix` or caller storage in one function.
- **The mechanism is not identified.** The guess was that merging a `DOMMatrix` getter's result with a double from an array forces V8 to box the doubles. E's unary `+` is consistent with that guess, but it removes only 17 of the 57 B. Neither the guess nor any other mechanism is confirmed.
- **`ancestry` alone was not measured.** In A, C and E it runs the same walk and writes as before, but no window covers it by itself.

**Conditions.** None of the windows ran under an owner hold. The machine was shared, with a load average of about 3.5 on 12 cores. Sampled bytes count allocation, not time, and the A/A differences stay within ±3.2 B per call on every row. That is the evidence that the load didn't move them.

## Timing

**No timing is recorded.** The first run of [`compare.ts.txt`](compare.ts.txt) was a one-round smoke check of the harness. It took timing samples on the shared machine, without an owner hold. Those samples are discarded and aren't in [`allocation.json`](allocation.json). Its allocation windows are kept, as A's and B's readings above. Every later run had `<rounds>` 0 and took no timing samples.