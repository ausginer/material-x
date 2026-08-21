# Checkpoint D review 1 — architect resolution of D2 and D5

Scope: the two findings in [`checkpoint-d-1.md`](checkpoint-d-1.md) that ask for a decision rather than a fix — **D2** (retained `visual()` geometry) and **D5** (retained sortable type exports). D1, D3, D4, D6, D7 and D8 are untouched here and remain open.

Both are resolved. D2 closes as **restore**, with the code shipped and pinned. D5 closes as **reclassify, with no change to the frozen public surface** — the frozen contract table was right and the ledger was stale. One genuinely open item surfaced while resolving D5 and is recorded as a new finding, **L-11**, rather than folded into a close it does not belong to.

## D2 — restore candidate measurement through the installed visual resolver

**Decision: restore.** The parity row stays _retain_ and the implementation now matches it. Not a reclassification.

The review presents this as parity-versus-implementation-choice. It is stronger than that, and the stronger argument is what decided it: **measuring items is incoherent within drag2's own rule**, independent of anything the shipped package does.

The axis rule compares each candidate's centre against one incumbent — the placeholder's own centre (`y.ts`, `xy.ts`; the hysteresis _is_ the placeholder being a candidate). The placeholder is sized from the **visual's** offset box (`placement.ts:53-54`). So the previous code compared a visual-derived box on one side of the comparison against item boxes on the other. For any visual that is an inset or offset descendant — the only case where `visual()` changes anything — that asymmetry biases which side of a boundary wins. The behavior was defective on its own terms, not merely different from the shipped index.

That also disposes of the "document the loss" option. A drop row has to state what a consumer loses, and the loss here is not an ergonomic gap a consumer can read and plan around: it silently moves _where every gap is crossed_, which is the whole feel of the sortable.

### Why the Phase 8a objection does not hold

Phase 8a recorded the choice deliberately (`plan.md:252`): "`getVisual` is a behavior slot, and reaching it from the axis feature would be a sibling-feature dependency in all but name". Both halves are answerable.

- **The precedent already exists.** The axis rule reads `placeholder` off the per-operation runtime view — and the placeholder is itself a product of the optional `placeholder()` slot. A second nullable field on that same view is the established consumer-declared-view mechanism (D-13), which had already been widened additively twice (8a added `item`, 17 added `pointerX`). This is the third.
- **No import edge appears.** `y.ts` and `xy.ts` declare `getVisual` in their own local view types and satisfy them structurally. Neither imports `handle.ts`; neither can tell whether a `visual()` was composed. The axis feature depends on the _behavior's guarantee to supply a resolver_, exactly as it already depends on it supplying `snapshot`.
- **The contract's wording, not its intent, was the other half.** Contract 03 §391 said "centres of every non-dragged item". That line is amended, because the rule it states is the one that is wrong.

### Shape

`getVisual` is copied onto `PresentationView` once per operation from `slots.getVisual`, and `RectIndex.refresh` takes it as a third argument. It stays **nullable rather than normalized to identity**: the minimal composition installs no `visual()` and would otherwise pay an identity call per candidate per rebuild. One ternary per candidate, next to a `getBoundingClientRect` that dominates it.

Two consequences, both recorded:

- **`visual()` is now on the geometry path** — once per candidate per rebuild, not at all on a warm cache. Its doc comment says so, and adds the corollary a consumer needs: a `() => oneFixedElement` resolver is wrong, because the resolver must map each item to _its own_ visual. This was equally true of the shipped `getVisual` and is not a new obligation, but drag2 had never stated it.
- **A throwing resolver can now escape during a spatial frame**, not only at admission. The shipped `rebuildRectIndex` had the same exposure, so this is parity-consistent; the kernel classifies it through the frame path it already owns.

### Evidence

- `tests/sortable/y.browser.test.ts` — the two measurements pinned against known geometry: at pointer 42, item-measured resolves gap 1 and visual-measured holds the incumbent. Plus resolver call-exactness: once per candidate per rebuild, silent on a warm cache.
- `tests/sortable/xy.browser.test.ts` — the two-dimensional mirror, at (105, 20).
- `tests/sortable/features.browser.test.ts` §`visual` — through real pointer input, that a composed drag routes the installed resolver into the candidate search at all. That is the whole of the defect and is invisible from any assertion about the dragged item.

### Cost

`npx just size`, against the review's recorded figures:

| Composition  | Before   | After        |
| ------------ | -------- | ------------ |
| minimal      | 9.96 kB  | **9.97 kB**  |
| minimal (xy) | 10.01 kB | **10.04 kB** |
| complete     | 10.74 kB | **10.78 kB** |

+10 B to +40 B. Every composition still inside its M-3 budget; module counts unchanged.

Recorded as ledger **L-10**, with rows added to §2 and §3.

## D5 — the retained type exports are reclassified; the frozen surface does not change

**Decision: the frozen contract table (03 §The export topology this requires) is authoritative and correct as implemented. Every omitted name the review names is reclassified in the ledger.** `src/sortable.ts` exports exactly the 18 type names and 4 runtime names that table specifies — verified name by name. The disagreement the review found is real, and it is entirely the ledger being stale.

The governing rule is the frozen contract's own, sharpened in **L-2**: export what a public type structurally depends on **and a consumer cannot otherwise write**. Both halves were already exercised — unnameable-and-unwritable gets exported (`FailureStage`, `DOMRealm`, `Point`, `CollectionSnapshot`, `PlaceholderFactory`, `ResolutionOptions`); writable from platform or already-public names gets inlined (`MaybePromise`). The ledger had been applying "structurally reachable" alone, which is too strong, and that is what made it over-promise three names.

| Name | Was | Now | Consumer loses |
| --- | --- | --- | --- |
| `ReorderRequest` | retain | **retain**, no action | nothing — exported, and field-for-field identical to `packages/drag/src/kernel/types.ts:73-80` |
| `AnimationTiming` | retain (§2.1) / redesign (§7) | **redesign — dissolved, not public** | nothing nameable. Phase 15's `duration?: number \| (() => number)` is strictly wider than `Pick<EffectTiming, …>`, so the type can no longer describe its own option; `LandingOptions`/`LayoutAnimationOptions` are exported and are what a consumer annotates |
| `DragSubject` | retain (§2.1 and §7) | **drop** | a name for the `{ item, visual }` pair. It survives publicly inside `PlaceholderContext`. Precedent: this ledger's own `FreeHomeRequest` drop |
| `ResolutionContext` | redesign — exported | **drop — structurally inlined** | `OnReorder`'s second parameter is `Readonly<{ signal: AbortSignal }>` — one field of a platform type. Contextual typing covers the normal form; a standalone handler retypes one literal. Precedent: the `MaybePromise` decision |
| `CancellationReason` | redesign — exported | **redesign — dissolved into `CanceledReorderResult`** | nothing against shipped. `reason: unknown` carries the detail, `stage: CancelStage` is discriminable with exported values — and L-2 records that shipped exported the type but none of its `CANCEL_*` members, so a shipped consumer could not discriminate either |
| `OUTCOME_*` / `REORDER_*` | redesign — exported | **not public** | nothing. See below |

**The `OUTCOME_*` claim was factually wrong and is the review's sharpest catch.** §2.1 justified dropping the four `is*` predicates on the grounds that "the `type` discriminant is a _public_ exported constant, so `result.type === OUTCOME_*` narrows directly". That was never the implementation. The public results discriminate on **string literals** (`type: 'accepted' | 'noop' | 'rejected' | 'canceled'`, `domain.ts:164-186`), so `result.type === 'accepted'` narrows with no import and no constant at all. `OUTCOME_ACCEPTED = 80` and its siblings live under `domain.ts` §Behavior-private frame state — internal numeric frame codes, not the public discriminant. `REORDER_*` does not exist in drag2 under any spelling. The `is*` drop is safe and stands; only its stated reason was wrong, and `plan.md:472` had it right all along ("already deliberately dropped for string discriminants under F-41"). L-3 inherited the same wrong premise and is corrected with it.

Two further ledger errors the review flagged in passing are fixed in the same pass: `SortableController` retains **four** members, not three (Phase 15 added `ready()`), and the coverage totals are recounted.

### New finding — L-11, the cancel _reason_ sentinels

Not part of D5's close, and it should not be smuggled into one. Resolving the `CancellationReason` row turned up a live instance of the very defect L-2 exists to name.

`CanceledReorderResult.reason` is typed `unknown`, which is correct — `controller.cancel(reason)` accepts anything, so the union is genuinely open. But every reason **the library itself produces** is a namespaced string constant that is not exported: `'drag:escape'`, `'drag:pointercancel'`, `'drag:lostpointercapture'` (`kernel.ts:116-118`), `'sortable:item-removed'`, `'sortable:collection-invalidated'` (`domain.ts:236-237`). `stage: CancelStage` does not cover this — `AT_PROPOSAL`/`AT_CONSUMER` say _when_ an operation was abandoned, never _why_. A consumer that wants "stay silent when the user pressed Escape, warn when the item vanished" must hard-code an undocumented string that can change without notice.

The argument that made `AT_CONSUMER`/`AT_PROPOSAL` public — a canceled result carries one and a consumer has to be able to discriminate it — applies to `reason` verbatim.

**Recommendation: export all five as public string constants**, the three kernel ones from `drag.js` beside the `FAILURE_*` constants, the two sortable ones from `sortable.js`, leaving `reason` as `unknown`. **Flagged for the owner, not taken**, because it is the only decision in this pass that would _add_ to the frozen public surface — five runtime cells across two frozen entries, plus an M-3 re-measurement. Deferring it is defensible: it is a gap against _nothing shipped_, since the shipped `CANCEL_*` were equally unexported. But it should be deferred deliberately, with a phase attached, rather than left as an omission for the next reviewer to re-find.

## What changed

Source:

- `src/sortable/rect-index.ts` — `refresh` takes the resolver; candidates measured through it
- `src/sortable/y.ts`, `src/sortable/xy.ts` — local view widened, resolver threaded through `resolve` and `measure`
- `src/sortable/slots.ts`, `src/sortable/runtime.ts`, `src/sortable/spec.ts` — the field on the ceiling view and the per-operation object, written once at activation
- `src/sortable/handle.ts` — `visual()`'s widened call contract

Tests: `tests/sortable/{y,xy,features}.browser.test.ts` (+4 tests, and the view fixtures in `sortable.browser.test.ts`).

Documents of record:

- `.plan/contract/03-feature-composition.md` — the candidate-set rule at §`vertical()`, amended with its reason. The stale `vertical()` naming in that section is **D7's**, not touched here.
- `.plan/ledger.md` — §2 and §3 rows for D2; §2.1 split into per-name rows and reclassified; §7 `DragSubject` and `AnimationTiming`; L-2 sharpened, L-3 corrected, L-10 and L-11 added; coverage recounted.

## Verification

From `packages/drag2`:

```text
npx just typecheck   PASS
npx just test        PASS — 33 files, 713 passed, 18 skipped, no type errors
npx just size        PASS — all five compositions under budget (table above)
npx just fmt         clean
npx just lint-fix    clean
```

Test count is 709 → 713: the four new regression tests, no test removed or weakened.

## What this does not close

D2 and D5 only. **Checkpoint D stays open** on D1, D3, D4, D6, D7 and D8. Two notes for whoever takes them:

- **D7 overlaps this pass.** Contract 03 §`vertical()` is amended for the candidate rule but still carries the pre-Phase-17 name, and the ledger's §5 deferred-Phase-17 shape is still open. D7 is where both close.
- **D6 and the `AnimationTiming` decision are independent.** Reclassifying the type as not-public says nothing about whether the default easing should be `'ease'` or `'ease-out'`. D6 still needs its own answer.