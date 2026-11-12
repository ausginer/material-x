# Animation-end layout probe

**Run:** by the architect on 2026-11-12, at `bb8e5ebb8` on `drag/performance`, as [`performance-window-correction-assessment.md`](performance-window-correction-assessment.md) §4.3 proposed and the owner asked. **Governing records:** `DRD-44` property 6 and `DRD-40` property 4, in [`00-index.md`](00-index.md). It changed no production code and no instrument.

**Outcome: the runtime pass is ready to close.**

- **What triggers the layout.** An element that starts or stops being animated, or styled, with `translate`, `transform` or `opacity` has its layout invalidated. The frame's layout then costs in proportion to the list. That covers `layoutAnimation`'s own form, every other keyframe form tried, a plain style write, and an `opacity` animation.
- **What avoids it.** Only a row that is already in that state before the animation starts has no layout at the start or the end. In the probe, the row's own style held `will-change: translate` or `translate: 0 0`. That changes how every row renders, for as long as the style stays.
- **The library's options.** No form that the library controls avoids the layout and keeps both the rendered result and the cleanup. The one library form that would reduce the count holds each row in that state until no row is animating, so that the releases share one layout. That changes what renders between a row's own end and the last end, and it changes what is left behind. It isn't recommended (§3).

The deferred campaigns stay stopped.

## 1. The probe

| Part | Record |
| --- | --- |
| Page, with every variant | [`2026-11-12-animation-end-probe-page.ts.txt`](measurements/2026-11-12-animation-end-probe-page.ts.txt) |
| Runner | [`2026-11-12-animation-end-probe-runner.ts.txt`](measurements/2026-11-12-animation-end-probe-runner.ts.txt) |
| The bundle that ran | [`2026-11-12-animation-end-probe-bundle.js.txt`](measurements/2026-11-12-animation-end-probe-bundle.js.txt) |
| Output, with the machine record at the head and foot | [`2026-11-12-animation-end-probe.txt`](measurements/2026-11-12-animation-end-probe.txt) and [`.json`](measurements/2026-11-12-animation-end-probe.json) |
| The 42 traces | [`traces/2026-11-12-animation-end-probe/`](measurements/traces/2026-11-12-animation-end-probe/) |
| The hold | [`2026-11-12-animation-end-probe-hold.txt`](measurements/2026-11-12-animation-end-probe-hold.txt) |

- **The browser:** Chromium 157.0.8103.38, one process, with `__DEV__` false. The process ran from 08:06:23 to 08:06:42 UTC and exited 0.
- **The wrapper:** the machine record came from the window unit's [`2026-11-12-window-record-wrapper.sh.txt`](measurements/2026-11-12-window-record-wrapper.sh.txt), byte for byte.
- **The load:** the load average was 3.59, 3.03 and 2.88 before, and 3.61, 3.07 and 2.90 after.
- **The hold:** the owner confirmed the hold before the process started, and the architect released it at 08:07:37 UTC. No other check from this session ran in between.
- **The page:** `bench/lab.ts`'s `makeRows` list, copied into the page: 2,000 rows of 40 px, each `position: relative`, in a `position: relative` block 200 px wide. The rows are laid out before any trace.
- **The bundle:** Rolldown bundles the page from `src/sortable/layout-animation.ts` at `bb8e5ebb8` and `@ydinjs/box-quad`'s source, as `compare.ts` does.
- **A variant:** row 10, or rows 10 and 11, displaced up by one row, as `linearShift` reports a displacement. Every variant except the plain style writes uses `layoutAnimation`'s duration and easing, 160 ms `ease-out`.
- **The runs:** each variant runs three times, in a fresh page each time.
- **The trace:** one trace per run, from two frames before the displacement to four frames after the last animation ends. The categories are `devtools.timeline` with its disabled-by-default timeline and stack categories, `blink.animations` and `blink.user_timing`.
- **The reading:** the main thread's `Layout` events from the displacement on, each with its dirty object count, its duration, and the script stack of the `InvalidateLayout` before it. "At the end" means at or after the last `Animation` end event in the trace. A variant with no animation end uses its `probe:remove` mark instead.

**What the probe counts and what it times.** Each layout is counted from trace events, and no layout is paired against another arm. Its duration is a span from a traced run with tracing on, so it gives a size, not a reading for a paired verdict.

## 2. The readings

| Variant | Layouts at the end, per run | Each, µs | Layouts from the start, per run | The row afterwards |
| --- | --- | --- | --- | --- |
| **`layoutAnimation`, the production form** | 1, 1, 1 | 585 to 1,923 | 2, 2, 2 | no animation, `translate: none`, at its flow position, inline style unchanged |
| `layoutAnimation`, 20 rows | 1, 1, 1 | 121 to 216 | 2, 2, 2 | the same |
| `layoutAnimation`, two rows together | 1, 1, 1 | 754 to 1,359 | 3, 3, 3 | the same |
| `layoutAnimation`, two rows 60 ms apart | 1, 1, 1 after the last end, and 1 after the first | 983 to 2,642 | 4, 4, 4 | the same |
| `translate`, replacing instead of adding | 1, 1, 1 | 812 to 1,077 | 2, 2, 2 | the same |
| `translate`, last keyframe `none` | 1, 1, 1 | 968 to 2,407 | 2, 2, 2 | the same |
| `transform` instead of `translate` | 1, 1, 1 | 834 to 2,293 | 2, 2, 2 | the same |
| **`opacity`, the control** | 1, 1, 1 | 639 to 1,414 | 2, 2, 2 | the same |
| `layoutAnimation`, rows not positioned | 1, 1, 1 | 645 to 920 | 2, 2, 2 | the same |
| `translate` written to the style, then removed | 1, 1, 1 | 651 to 1,211 | 2, 2, 2 | the same |
| `transform` written to the style, then removed | 1, 1, 1 | 681 to 2,258 | 2, 2, 2 | the same |
| `translate` held by `fill: forwards`, then cancelled | 1, 1, 1, at the cancel | 953 to 1,482 | 2, 2, 2 | the same |
| **`layoutAnimation`, the row's style holds `translate: 0 0`** | 0, 0, 0 | — | 0, 0, 0 | `translate: 0px`, which the row keeps |
| **`layoutAnimation`, the row's style holds `will-change: translate`** | 0, 0, 0 | — | 0, 0, 0 | `will-change: translate`, which the row keeps |

Every layout dirties 5 objects, or 6 when two rows end together, out of 4,004 at 2,000 rows and 44 at 20.

- **At the start,** the invalidation carries a script stack: it is the `animate` call, or the style write. The frame's layout follows. In a real reorder, that frame lays out after the DOM move anyway.
- **At the end,** the invalidation carries no script stack. The browser makes it when it removes the effect, the same as when a style write is removed.
- **The cost grows with the list.** The layout lasts 121 to 216 µs at 20 rows and 585 to 1,923 µs at 2,000, though it dirties the same 5 objects. **Inferred:** the layout walks the list's children.
- **Ends in the same frame share a layout.** Two rows that end together pay one layout. Two rows that end 60 ms apart pay one each.
- **A probe artifact.** In "two rows together", the second start layout comes from the probe computing each row's space after the first `animate` call (`zoomOf < ancestry`). The real operation computes the space once. The end readings don't depend on it.

**What triggers it.** An element enters or leaves an animated or styled state of `translate`, `transform` or `opacity`. A row that is already in an equivalent state, through its own `will-change: translate` or `translate: 0 0`, doesn't change state, so neither the start nor the end lays out. Each of these properties, and that `will-change`, makes an element a stacking context and a candidate for its own compositing layer. That is the common factor the readings show. **The probe doesn't tell the two apart,** and I didn't read Chromium's source.

**What this corrects.** The assessment's hypothesis (§4.2 there) named the `translate` going back to `none`, and the paint layer and containing block that come with it. The `opacity` control lays out the same way, and `opacity` changes no containing block. So the trigger isn't specific to `translate`.

## 3. The library's options

The requirement is to avoid the layouts and keep both the rendered result and the cleanup, which leaves no animation, no inline style and no lasting state on the row.

| Option | Avoids the layout | Rendered result | Cleanup | Verdict |
| --- | --- | --- | --- | --- |
| Another keyframe form: replace, a last keyframe of `none`, or `transform` | No, measured | Unchanged | Unchanged | Rejected |
| Another property | No. `opacity` lays out too, measured | — | — | Rejected |
| Hold every row's animation, with `fill: forwards`, or its `will-change`, until no row animates in the sink, then release them all at once | Fewer. One layout per quiet period instead of one per end. **Inferred** from "two rows together" and "fill forwards then cancel", and not measured as a batch | **Changed.** Each row stays a stacking context, with a containing block for its positioned descendants and possibly its own layer, until the last end | **Changed.** `getAnimations()` keeps finished animations, or the row carries an inline `will-change`, until the release, and `destroy` must release them | Rejected: it fails the requirement. It would also move the layouts to the end of the motion and not remove them, so it is a contract decision first |
| A lasting `will-change: translate` or `translate: 0 0` on each row | Yes, measured | **Changed for the life of the list:** every row is a stacking context. `will-change` on 2,000 rows may also give each row its own layer, which isn't measured | It is the consumer's own style, and the library can't own it | Not a library option. It is the consumer's trade |
| Make the layout cheaper | Not tested | — | — | Its cost is the consumer's list layout, so it isn't a library option |

**No library-controlled alternative avoids the layouts with the same rendering and cleanup.** Any displacement animation of a row starts and stops this state. Only the timing of the stop is the library's, and moving that timing changes what renders.

## 4. The recommendation

**Close the runtime pass.**

- **The trace candidates are settled.** Candidates 1 and 2 are done (`DRD-49`, `DRD-47`), and 3 was rejected under `DRD-49`. Candidates 4 and 5 are decisions first, and neither is a bounded runtime task (assessment §4.1).
- **The layout after an animation ends** is the browser's cost of any displacement animation, at a size that the consumer's list sets. It goes on the list of the browser's costs.
- **No timing reading is owed** for closing the pass. Nothing changed in production.

**Next:** P4, the size pass ([`performance-plan.md`](performance-plan.md) §2 P4), and `DRO-4`'s size re-base, when the owner chooses.

**Left to the owner, and not runtime tasks:**

- **A README note.** It would tell consumers that, with a long list and `layoutAnimation`, each row animation's end lays out the list, and that a row's own `will-change: translate` avoids that at the cost of a stacking context per row. This is a documentation decision, and it would need its own measurement of the layer cost before the README gives advice.
- **The open records:** `DRO-1`'s pull at a press (candidate 4), the landing's computed position (candidate 5), the retained plateau in `DRO-4`, `DRF-21`, `DRD-45` property 9 before any `--prove` or `--floors`, and the owner's DevTools check of the traces.

## 5. Limits

- **One scenario shape.** A block list of fixed-height rows, as the lab builds it. A flex or grid container, or rows with layout containment, weren't tried, and the layout's cost there may differ.
- **Counts, not paired timings.** The durations come from traced runs, and what tracing adds to a layout wasn't measured.
- **The batch release was inferred, not measured.** It is rejected on the rendering and cleanup requirement, which doesn't depend on its count.
- **Chromium only.** Firefox and WebKit weren't traced.
- **The probe's scratch copy** in the session's scratchpad is removed. Its source and bundle are kept under `measurements/`, as above.