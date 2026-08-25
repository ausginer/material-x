# Source-shape audit: micro-abstractions that may not earn their existence

Review, 2026-08-25. Files read at `6f6ba459`. **No production code changed.**

An aggressive-deletion-bias pass over the whole runtime (`src/`, 14,606 lines, 179 function declarations) hunting boundaries that own nothing: tiny helpers, wrappers, adapters, one-line factories, aliases around syntax, single-use functions, and named seams whose only remaining purpose is to house a comment.

**The working rule, applied as stated:**

> A boundary owns a value, a rule, a protocol transition, or a meaningful algorithm — or it owns nothing.

`destinationOf` and the `copyItems(items) => [...items]` shape — both already deleted — are the reference species.

---

## 0. Method, and a warning about the numbers

**Every call count below was verified mechanically and personally.** Candidate discovery was partly delegated; verification was not, and that turned out to matter. One delegated pass reported `seamFailed` as having _three production callers_ and recommended KEEP on that basis. It has **zero**. Another recommended KILL for `neutralizeUA`, which owns a documented style-recalc batching choice. **Treat any call count in a delegated source-shape report as a hypothesis, not a finding** — including, for what it is worth, this warning's own source.

Counts here come from `grep` over `src/` with the declaration line excluded, and every KILL/OWNER LOOK row's call sites were opened and read. Where a name is also an English word (`owns`, `assert`, `type`), raw grep totals are meaningless and the real call sites were counted by hand.

**Bytes were deliberately not measured.** Per the brief this is a readability/ownership audit, and no row's disposition below turns on bundle size. Three rows _are_ affected by shipping: `seamFailed`, `setRefreshVerification` and `createSortableBehavior` have no production caller and are absent from the built `sortable.js` and `kernel.js`, so **their cost is source-shape only** — they are dead weight in the reader's path, not in the consumer's bundle.

### Verdict summary

|                    | Count |
| ------------------ | ----- |
| **KILL**           | 7     |
| **OWNER LOOK**     | 11    |
| **KEEP (notable)** | 16    |

---

## 1. KILL

| Name + location | Prod calls | Tests / surface | What it actually does | Owns | Inlining changes | Note |
| --- | --- | --- | --- | --- | --- | --- |
| `seamFailed` [`kernel/seams.ts:111`](../../../src/kernel/seams.ts) | **0** | 6 refs in `seams.node.test.ts`; not in any `.d.ts` | Returns `outcome === SEAM_PREPARE_FAILED \|\| outcome === SEAM_EFFECT_FAILED` | **Nothing — it has no production reader at all.** Its four-line comment describes a real rule (a classified failure must also stop continuation) that is enforced _elsewhere_ | Nothing; it is already shaken out of every bundle | **The clearest row in the audit.** An exported predicate whose only callers are its own tests. The comment is worth keeping — move it to whatever code actually enforces the rule |
| `setRefreshVerification` [`sortable/verified-refresh.ts:102`](../../../src/sortable/verified-refresh.ts) | **0** | 13 refs, `tests/perf` and `incremental-refresh` | Sets a `__DEV__`-gated module flag | Nothing. Its own doc says it: _"used by `tests/perf`, and by nothing in `src`"_ | Nothing; `DEV` folds false and it dies in the shipped build | Honestly labelled already. It is a measurement hook living in production source; the seam belongs in the perf fixture |
| `captureFrameKeys` [`kernel/frames.ts:216`](../../../src/kernel/frames.ts) | 2 | 9 test refs | `return Object.keys(frame)` | Nothing. A rename of one language operation, plus a one-line comment | Nothing | **Reference species.** The reader jumps to discover `Object.keys` |
| `dropStaged` [`kernel/kernel.ts:760`](../../../src/kernel/kernel.ts) | 3 | none | `driver.consumeStaged()` | Nothing beyond the name. The eight-line comment above it is the real content | Nothing | A wrapper that immediately forwards one call. Three call sites make it a rename used thrice, not an abstraction |
| `centreOf` [`sortable/y.ts:93`](../../../src/sortable/y.ts) | **1** | none | `getBoundingClientRect()`, then `(top + bottom) * 0.5` | Arguably the y-axis's "centre" vocabulary — but with one caller there is no second site to keep consistent | Nothing; the layout read happens either way | Single-use arithmetic |
| `NOOP_START` [`sortable/slots.ts:271`](../../../src/sortable/slots.ts) | **1** | 2 | `() => {}` bound to a name | Nothing. One call site: `config.onStart ?? NOOP_START` | Nothing observable | A named empty function used once |
| `isPrimaryPress` [`kernel/pointer.ts:77`](../../../src/kernel/pointer.ts) | **1** | none | `event.button === 0 && event.isPrimary` | The _phrase_ "primary press" — but the expression is already self-describing at its one call site | Nothing | Two property reads behind a cross-module import |

---

## 2. OWNER LOOK

Rows where the boundary is thin but something non-obvious is attached, or where the call count alone does not settle it.

| Name + location | Prod calls | What it does | The tension |
| --- | --- | --- | --- |
| `createSortableBehavior` [`sortable/behavior.ts:74`](../../../src/sortable/behavior.ts) | **0** (18 test refs) | Returns a behavior factory over the module-private `install()` | **A deliberate test seam with a recorded decision (D-126)**, arguing it keeps the browser suite composing runtime/spec/controller exactly as production does. That is a real argument and it is not the "tests happen to import it" species. But it is still a zero-production-caller export, and D-126 is one day old — worth confirming the seam is still the cheapest way to get that reach |
| `thenOf` [`kernel/kernel.ts:1334`](../../../src/kernel/kernel.ts) | **1** | Reads `.then` once and type-checks it | Owns a genuine hazard — reading a consumer accessor **exactly once** (A-08). But its own doc records the decay: _"One caller since Phase 15."_ The rule is real; the boundary may now belong inline with its comment |
| `homeGap` [`sortable/spec.ts:502`](../../../src/sortable/spec.ts) | **1** | `homeInsertion(...)`, then `movePlaceholder` if non-null | A named two-step with a real conditional, used once. Cited by a nearby comment, which is a weak reason to keep a function |
| `owns` [`kernel/input-policy.ts:58`](../../../src/kernel/input-policy.ts) | **1** | One hop: `typeof matches === 'function' && (isContentEditable \|\| matches(selector))` | Owns the documented "test the capability, not the type" choice. One call site, inside a loop in the same file |
| `enqueue` [`kernel/queue.ts:42`](../../../src/kernel/queue.ts) | **1** | `queue.actions.push(action); queue.args.push(argument)` | The parallel-array lockstep **is** a real invariant — but with one writer there is no second site to drift from. Contrast `clearQueue` (3 callers), which keeps its case |
| `capacityFor` [`sortable/rect-index.ts:79`](../../../src/sortable/rect-index.ts) | **1** | Next power of two ≥ `needed` | A genuine (small) algorithm naming the doubling growth policy, and a nearby comment reasons about it (`n ≤ capacity < 2n`). Single-use loop |
| `onEscape` [`kernel/kernel.ts:793`](../../../src/kernel/kernel.ts) | **1** | `cancel(CANCEL_ESCAPE)` | Used as a **callback argument**, not called inline — so the alternative is an arrow at the `armCancelInput` call. Cheap either way |
| `sameKeys` [`kernel/frames.ts:212`](../../../src/kernel/frames.ts) | 2 | Ordered array key equality | Two callers and a real (if tiny) comparison rule; ordered-vs-unordered is exactly the kind of thing that drifts if duplicated. Weakest of the frames cluster to remove, strongest to keep |
| `assertFrameShapesMatch` [`kernel/frames.ts:228`](../../../src/kernel/frames.ts) | **1** | One `assert(sameKeys(...))` call | Owns F-2's name and its error message. One expression, one caller |
| `subjectOf` [`free-drag/spec.ts:158`](../../../src/free-drag/spec.ts) | 3 | `({ item: root, visual })` | An object-literal shape used three times. If `FreeDragSubject` gains a member, one site is better than three — that is the honest case for it |
| **The `frames.ts` assertion cluster** — `assert`, `sameKeys`, `captureFrameKeys`, `assertFrameShapesMatch`, `validateFrameDescriptors` | — | Five helpers supporting one dev-invariant routine | **Worth looking at as a group rather than row by row.** Two are listed individually above and one is a KILL; the question the rows cannot ask separately is whether `assertFrameScrubbed` and its four satellites read better as one function with its checks in sequence |

---

## 3. KEEP — including several that look like the target species and are not

The brief warned against confusing small with useless. These are the ones where the reason is real and mostly non-obvious.

| Name + location | Why it earns the boundary |
| --- | --- |
| `willWrite` [`sortable/placement.ts:88`](../../../src/sortable/placement.ts) | **The best example in the package, and inlining it changes allocation.** D-127 moved the `restoreAttribute(...)` snapshot _inside_ the guard because in argument position it was evaluated for the default path too — four `getAttribute` reads and four closures allocated and discarded per activation. Inline it naively and that bug returns |
| `restoreAttribute` [`sortable/placement.ts:65`](../../../src/sortable/placement.ts) | Owns a measured Chromium quirk: `removeAttribute('style')` leaves `style=""` behind where `removeNamedItem` does not, and D-39's guarantee is stated as an attribute-map comparison |
| `neutralizeUA` [`kernel/presentation.ts:232`](../../../src/kernel/presentation.ts) | Single-caller, and still a KEEP: it **batches every computed-style read before any write**, collapsing a per-property style recalc into one. A delegated pass called this a KILL; the read/write ordering is the whole function |
| `insertionAt` [`sortable/domain.ts:81`](../../../src/sortable/domain.ts) | **Now published** at the middle tier (D-123). Public surface and the single construction owner (D-119) |
| `createSortableFramePart` / `resetSortableFramePart` [`sortable/frames.ts`](../../../src/sortable/frames.ts) (and the free-drag pair) | Kernel SPI members the kernel calls through a pointer — and a **mirror invariant**: a field added to the factory but not the reset is a retained DOM node across every later operation |
| `clearQueue` [`kernel/queue.ts:55`](../../../src/kernel/queue.ts) | 3 callers, and owns a lifetime rule: dropping retained arguments so a queued element cannot outlive the drain that abandoned it |
| `guarded` [`kernel/reporter.ts:45`](../../../src/kernel/reporter.ts) | ~11 callers; the best-effort execution boundary and the platform-report channel |
| `invalidateInSeam` [`sortable/spec.ts:415`](../../../src/sortable/spec.ts) | Owns failure-stage narrowing to `FAILURE_INVALIDATION` — the classification cannot be made correctly at the outer phase |
| `localDeltaOf`, `currentRect` [`free-drag/geometry.ts`](../../../src/free-drag/geometry.ts) | A real matrix projection with a null fast path; and realm-correct `DOMRectReadOnly` construction, which is a cross-realm contract |
| `applyAxis` [`free-drag/geometry.ts:43`](../../../src/free-drag/geometry.ts) | The axis-projection domain rule, deliberately _not_ a capability (D-70), used at two sites |
| `isFreeDragResolution` / `isReorderResolution` | Protocol gate: what counts as an explicit resolution, versus `FAILURE_RESOLUTION` |
| `directionOf` [`sortable/keyboard.ts:37`](../../../src/sortable/keyboard.ts) | The keyboard command mapping — which arrows bind to which direction is publishable policy |
| `rejection` (both specs) | ~7 call sites each; owns the `SeamRejection` shape |
| `refuseReentry` [`kernel/seams.ts:338`](../../../src/kernel/seams.ts) | 4 callers; a re-entrancy latch, which is a protocol transition |
| `landing()` ×2, `draggable`, `sortable`, `freeDrag` | Published entry points. Not internal boundaries at all |
| `createLandingStart` [`shared/landing-runner.ts`](../../../src/shared/landing-runner.ts) | Owns timing resolution, the reduced-motion collapse and the animation lifecycle for both behaviors |

---

## 4. Two cross-cutting observations

**The dominant species here is decay, not over-design.** Of 18 KILL and OWNER LOOK rows, **eleven have exactly one production caller and two have none.** These were not built as needless wrappers; they lost their other callers to earlier cleanup and kept their names. `thenOf` documents its own decay in its doc comment — _"One caller since Phase 15"_ — and `setRefreshVerification` documents its own zero. This is the same species the brief names as "used to contain more semantics before earlier cleanup removed them," visible at module scale rather than statement scale. **A recurring pass worth having is not "is this function small" but "does this function still have more than one caller."** That query is mechanical and would have surfaced most of this list.

**Zero-caller exports are the one class worth a standing check.** Three exist (`seamFailed`, `setRefreshVerification`, `createSortableBehavior`), and they are invisible to every existing gate: they type-check, they are covered by tests, and they do not ship because tree-shaking removes them. Only a caller census finds them. Two are honest about it in their own comments; one (`seamFailed`) is not, and reads as live policy.

---

## 5. What would falsify this

- **The call counts are `grep`-based**, so a call reached through a re-export alias, a computed member, or a name I did not anticipate would not appear. I read the call sites for every KILL and OWNER LOOK row, so a miscount there would have shown up as a missing site; the KEEP rows were counted less carefully because their disposition does not turn on the number.
- **`createSortableBehavior` (§2) rests on a judgement about D-126**, decided one day before this audit. I am not re-opening it — only flagging that a zero-production-caller export earns a second look, and the owner who made that call is better placed than I am.
- **The `frames.ts` cluster row is a shape claim, not an analysis.** I did not draft the merged version, so "reads better as one function" is a hypothesis for whoever opens it.
- **I did not measure anything**, per the brief. If any row's disposition is later argued on bundle size, it needs its own measurement — and §0's note applies: three of these do not ship at all.