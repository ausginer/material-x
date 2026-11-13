# `coordinates` without its ancestry array: proposal

**For:** the owner's evaluation. **Base:** `27c8f5495` on `box-quad/numeric-storage`. **Governing record:** `BQ-12` in [`plan.md`](plan.md), properties 1 to 9 as carried from `BQ-11`, and `BQ-9`'s requirement on the fallback. **Evidence:** [`probes/coordinates-walk/`](probes/coordinates-walk/README.md). Written by the architect on 2026-11-13.

**Recommendation: don't adopt it.** Production source is unchanged, and no decision is minted. The owner decides.

**Outcome, 2026-11-13:** the owner stopped this proposal, including arm B's caller-owned `DOMMatrix`, and the base stays. §6's gap is tracked as F-7 in [`plan.md`](plan.md). The fallback-storage follow-up is [`fallback-storage-comparison.md`](fallback-storage-comparison.md).

- **The array can go, and the behavior is kept.** Three formulations pass the whole suite and a parity probe against `27c8f5495`. The probe checks slots, untouched output on `false` and platform read order. The finiteness regression still fails when its write is moved.
- **Every formulation costs bytes:** +13 to +43 B Brotli on box-quad's module.
- **The allocation moves the wrong way for drag.** The fallback path, which no shipped drag code calls, allocates 92 to 161 B less per call. The `above` path, which drag's `lift` calls once per lift, allocates 40 to 57 B more per call.
- **Timing was not run.** No owner hold was arranged, because the allocation and byte results already decide against adoption at this point.

## 1. The question

`ancestry()` composes the walk into a `DOMMatrix` and copies `a`, `b`, `c`, `d` and `ancestorZoom` into caller storage. `coordinates()` without `above` passes it a fresh `[]` and reads `a` to `d` back. The question was whether sharing the walk internally lets `coordinates()` read the matrix directly, with no array.

**Held fixed:**

- the public API;
- caller-owned storage;
- `ancestorZoom`;
- the arithmetic order: the ancestor product closes before the element's own node joins it, by the existing scalar products;
- the recognized limits;
- untouched output on `false`;
- the finiteness regression.

**Ruled out by the request:** module-level scratch state, and replacing the array with another temporary result object.

**What removing the array does and doesn't remove.** It removes one array and its growth to five slots. Each walk still allocates one `DOMMatrix` accumulator. Each transformed node still allocates its own `DOMMatrix`, and each ancestor still costs a `getComputedStyle` call with its parsing strings. These remain in every formulation.

## 2. The formulations

| Arm | Shape |
| --- | --- |
| A | `inherit(element, out?)` returns the walk's `DOMMatrix` or `false`, and writes `out` when one is given. `ancestry` is `!!inherit(element, out)`. `coordinates` takes `ia` to `id` from `above` or from the matrix, in two branches. |
| B | `inherit(element, view, matrix)` fills a caller's `DOMMatrix` and returns `ancestorZoom` or `false`. `ancestry` writes its own `out`. |
| C | A's walk, with `coordinates` reading each value after `composeNode`, as `inherited ? inherited.a : above![SPACE_A]!`. |
| E | C with `+inherited.a`, a test of where the `above` cost comes from. |
| D | Control: A's helper, with the array kept. |

Neither A nor B returns a result object. A returns the platform matrix it already built. B returns a number and takes the accumulator as an argument.

## 3. Evidence

All of it is in the [probe README](probes/coordinates-walk/README.md). It ran in Chromium only.

**Behavior.** A, B and C each pass all 240 existing tests and the probe's two. The probe compares 17 scenarios with `27c8f5495`:

- every written slot, by `Object.is`;
- the return values;
- that output is untouched on `false`;
- the sequence of `getComputedStyle` and `getClientRects` calls, by element.

It also covers a `getClientRects` override that calls the fallback again on another element. Moving `out[BOX_A] = a;` above the finiteness check fails the existing finiteness test in each arm. Two mutations show that the probe can fail: a reversed composition order and an extra style read.

**Bytes.** These are the BQ-11 instruments, `npx size-limit` and drag's `bench/size/measure.ts`:

|                                 | Base |          A |         B |         C |
| ------------------------------- | ---: | ---------: | --------: | --------: |
| box-quad module, Brotli         | 1197 |        +28 |       +43 |       +13 |
| drag rows with box-quad, Brotli |    — | +11 to +36 | −4 to +46 | −9 to +24 |
| drag control row                | 2197 |          0 |         0 |         0 |

**Allocation.** This is the CDP sampling heap profiler, three pages per arm, with an A/A arm in every run. The bytes are per call:

| Path | A | B | C | E | D (control) | Largest A/A |
| --- | --: | --: | --: | --: | --: | --: |
| fallback, depth 2 to 32 | −92 to −156 | −92 to −157 | −93 to −161 | −92 to −158 | −1.9 to +6.3 | 3.2 |
| `above`, depth 14 | +57 | +57 | +57 | +40 | −1.6 | 0.8 |

The control shows that the fallback saving comes from the array, and that the `above` cost comes from `coordinates` reading its inherited values from two kinds of source. The helper split doesn't cause either. The mechanism behind the `above` cost isn't identified. A boxing guess fits E's partial reduction and isn't confirmed. None of these windows ran under an owner hold. The A/A spread, at most 3.2 B per call, is the evidence that the shared machine didn't move them.

**Timing: not measured.** The harness's first run was a one-round smoke check. It took timing samples without a hold, and they are discarded. No runtime claim is made in either direction.

## 4. Why the recommendation is to decline

- **No consumer gains.** drag's only shipped call is `coordinates(visual, measured, visualSpace)` in `src/lift.ts`, with `above`. The fallback appears only in `draggable.stories.tsx`. drag2 is outside scope under `BQ-12` property 11.
- **The consumer's path gets worse.** Each lift's `coordinates` call allocates about 57 B more, or 40 B in the E form. That is once per lift, not per pointer move, so it is small. It is still a measured regression with no gain on any shipped path, and CONTRIBUTING §0 and §14 put runtime and allocation ahead of bytes.
- **Bytes go up in every formulation**, by +13 to +43 B on the module and by up to +46 B on drag's rows. So CONTRIBUTING §15 can't book a size win either.
- **E's form is an unexplained trick.** A unary `+` whose effect is only partly understood is the kind of change CONTRIBUTING §17 reports rather than applies. It also leaves +40 B per call on the `above` path.

**Rejected without measurement: duplicating the scalar products per branch.** It would avoid merging the two sources, so it might avoid the `above` cost. But it adds more bytes than any arm above, and it puts in two places the scalar products that the arithmetic order rests on.

**What would reopen the question:**

- a consumer that calls `coordinates` without `above` on a hot path;
- a formulation that measures no worse on the `above` path and no larger on the module.

The probe and the instrument can be run against such a formulation as they stand.

## 5. `BQ-12` property 8

Property 8 says: "`coordinates` without `above` reads the ancestry into fresh storage on each call and never into module state, as BQ-9 requires."

**Under any formulation here, the property's wording stops describing the code, but its requirement still holds.** The fallback would no longer read "the ancestry", a `Space` with `ancestorZoom`, into storage. It would take the inherited linear part from the walk's own per-call `DOMMatrix`. What `BQ-9` requires still holds: nothing is shared module state, and the parity probe's `getClientRects` test passes.

**If the change were adopted, property 8 would need an amendment.** Two forms are possible:

- **Wording only.** "`coordinates` without `above` takes the inherited linear part from the same walk as `ancestry`, held in values local to the call and never in module state, as BQ-9 requires." That states the same requirement without naming the mechanism. Under [`documentation.md`](../../../.agents/docs/documentation.md) §6 it is a wording edit, made in place with the old text kept.
- **Substantive.** The owner may also want to forbid the intermediate `Space`, so the array can't come back. Or the owner may want a bound on the `above` path's allocation, which §4 shows is needed. Either one changes what the decision requires of the code. Under §6 that mints a new decision superseding `BQ-12`, and it carries properties 1 to 7 and 9 to 12.

**With the recommendation, neither applies, and property 8 stays as it is.**

## 6. An observation to route

The existing 240 tests don't detect a reversed ancestor composition order. Changing `preMultiplySelf` to `multiplySelf` in `27c8f5495`'s walk passes all of them. No existing scenario has two ancestors whose transforms give a different result in the other order. The probe's two-ancestor scenario detects the change.

This is a proof gap, older than this proposal, in code the package depends on. It isn't triaged here. **If the owner wants it closed, the next step is a bounded test unit:** one scenario with two ancestors whose transforms give a different result in the other order, asserted against expected values, and shown to fail under that mutation.

## 7. Not done

- Production source and tests are unchanged.
- No owner hold was arranged, and no timing is recorded.
- Engines other than Chromium weren't run.
- `ancestry` alone wasn't measured for allocation.
- D and E weren't run through the suite, and they weren't size-measured.
- drag2, drag/size and tooling are untouched.

## 8. Next

**The owner decides.** The options are:

- decline, which leaves the base as it is;
- ask for timing under a hold;
- adopt a formulation, which takes an amendment under §5.

The §6 test unit is a separate choice.