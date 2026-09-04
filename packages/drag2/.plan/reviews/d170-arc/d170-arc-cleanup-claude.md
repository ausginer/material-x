# D-170 arc — code-discipline (cleanup) pass

**Range reviewed:** `261a3a16..b73b6779` on `drag2/fin-review`, subject the current tree at `b73b6779`. Canonical authority: the current D-170 entry and its live amendments (`##### D-170 §The ownership boundary`, `§The step-6 boundary · corrected by §The behavior-facing interface`) in [`00-index.md`](../../contract/00-index.md). F-300 is deferred and is not re-raised here.

**Lens.** CONTRIBUTING.md Part I (comments/JSDoc, shape) and Part II (§1–§18, the litmus test and order of attack), and `.agents/docs/documentation.md` §5 (source-comment audience split and the two tests). Question asked of every piece of machinery: does the code's actual current responsibility require it, or is it indirection, duplicated state, a TypeScript-only concern paid at runtime, or a leftover shape from before the migration.

## Scope of the sweep

Every `src/*.ts` file the range actually touches, read in full against the rules above:

- `src/kernel.ts`, `src/kernel/kernel.ts`, `src/kernel/spec.ts`, `src/kernel/realm.ts`, `src/kernel/seams.ts`
- `src/sortable/rect-index.ts`, `src/sortable/linear-shift.ts`, `src/sortable/spec.ts`, `src/sortable/xy.ts`, `src/sortable/y.ts`, `src/sortable/controller.ts`
- `src/free-drag/spec.ts`, `src/free-drag/controller.ts`

`kernel/kernel.ts`, `sortable/spec.ts` and `free-drag/spec.ts` were each read in full twice independently (once directly, once by a dedicated discovery pass); every candidate a discovery pass raised was re-verified against the tree myself — grep for call sites, `git log -S` against the range boundary to confirm a candidate is actually part of this arc and not pre-existing, and direct reading of the surrounding declaration — before being kept or dropped. Files the range's diff stat does not touch (`kernel/frames.ts`, `kernel/lifetimes.ts`, `kernel/presentation.ts`, `kernel/failures.ts`, `kernel/phases.ts`, `sortable/domain.ts`, `sortable/feature.ts`, `sortable/slots.ts`, `sortable/assemble.ts`, `sortable/placement.ts`, `sortable/frames.ts`, `free-drag/*` other than `spec.ts`/`controller.ts`) are out of the sweep because the migration left them untouched — the diff stat is the boundary and I confirmed it with `git diff --stat`.

Not swept: `tests/`, `bench/`, `.scripts/`, `.plan/` prose and `README.md`. The lens is runtime/source discipline; test and doc changes in this range are process artifacts belonging to other lenses (integrity, feature-proof), not this one.

**Discovery method.** Direct reading for the smaller/self-contained files (`rect-index.ts`, `linear-shift.ts`, `kernel.ts`, `kernel/spec.ts`, `kernel/realm.ts`, `xy.ts`, `y.ts`, both controllers) plus a separate mechanical sweep for one specific defect shape across every listed file (see cr-1/cr-2 below). For the three largest files (`kernel/kernel.ts`, `sortable/spec.ts`, `free-drag/spec.ts` + `kernel/seams.ts`) I additionally delegated a first read to a discovery pass per file, then verified every reported candidate myself against the actual source before deciding whether it survives — several did not (see Rejected).

## Findings

### cr-1 — Tier C — leftover doc block orphaned by the class conversion, `kernel/kernel.ts:2006–2019`

**Finding.** Two adjacent JSDoc blocks with no declaration between them, both describing the same field:

```
2006:  /**
2007:   * The active-movement leaf, hoisted to **one** controller-stable closure.
...
2014:   */
2015:  /**
2016:   * The move leaf as a value. **Wrapped, not detached**, and a field rather
...
2019:   */
2020:  readonly #movedLeaf = (): void => {
```

**Current behavior.** The field `#movedLeaf` is documented twice: once for why it is hoisted to a stable closure (performance), once for why it is a wrapped field rather than a bare method reference (the unbound-method gate). Nothing sits between the two blocks; the first is not attached to any declaration.

**Why it is a problem.** `git log -S "The move leaf as a value"` shows the second block was added by `b73b6779` (this arc's final commit, the `createKernel` → `class Kernel` conversion); the first block already existed at `261a3a16`. The conversion added the receiver-boundary rationale in front of the pre-existing performance rationale instead of folding the two into one comment on the one declaration they both describe. Per `.agents/docs/documentation.md` §5.2, an internal comment states a constraint for the reader at the point of the next edit; two comments for one declaration, one of them structurally orphaned, is not that — a maintainer editing `#movedLeaf` has to notice a second, disconnected block says something related. Per §5.3's first test, the content is not wrong, so this is a **B (deleting is enough)** case, but nobody deleted it.

**Evidence.** `git log --oneline -S "The move leaf as a value" -- src/kernel/kernel.ts` → `b73b6779` only. `git show 261a3a16:packages/drag2/src/kernel/kernel.ts | grep -n "active-movement leaf"` → present at old line 1853, confirming the first block predates the arc and the second was placed in front of it by this arc's own step 6 commit.

**Required property.** One declaration carries one JSDoc block stating its current, complete set of constraints; no orphaned block sits disconnected from the declaration it describes.

### cr-2 — Tier C — duplicate doc block left behind by the class conversion, `sortable/spec.ts:421–436`

**Finding.** Two back-to-back, near-identical JSDoc blocks immediately above `#resolveItem`, differing only by a leftover grammatical error in the first:

```
421:  /**
422:   * The admitted item, from the event's **composed path** rather than
423:   * `event.target`: the press may land inside a shadow root, and the item is
424:   * whichever ancestor the this.#snapshot knows.
...
428:   */
429:  /**
430:   * The admitted item, from the event's **composed path** rather than
431:   * `event.target`: the press may land inside a shadow root, and the item is
432:   * whichever ancestor the snapshot knows.
...
436:   */
437:  #resolveItem(event: Event, snapshot: CollectionSnapshot): HTMLElement | null {
```

**Current behavior.** The first block reads "whichever ancestor the this.#snapshot knows" — `this.#snapshot` is not a valid reference in this method (the method reads its `snapshot` parameter, not an instance field of that name) — a stray artifact of the pre-conversion factory closure, where `snapshot` may have been a captured binding rather than a parameter. The second block is the corrected version, with the parameter's actual name.

**Why it is a problem.** `git log -S` shows commit `12311981` (in-range: "give five entities an owned boundary and a class...") introduced the corrected second block; the pre-existing first block, referencing a `this.#snapshot` that does not exist on this class, was left in place rather than replaced. Two JSDoc blocks for one declaration, one of them describing a stale binding shape, is confusing about which is authoritative and is the same defect class as cr-1.

**Evidence.** `git log --oneline -S "the snapshot knows" -- src/sortable/spec.ts` → `12311981`. `git show 261a3a16:packages/drag2/src/sortable/spec.ts | grep -n "the snapshot knows"` → present already at old line 308, confirming the first (stale) block predates this arc and the corrected block was added beside it rather than replacing it.

**Required property.** Same as cr-1: one declaration, one current JSDoc block; a superseded block is deleted, not left beside its replacement.

### cr-3 — Tier C — single-use private method, `sortable/spec.ts:626–633`

**Finding.**

```ts
/** The gap the item came from, recomputed rather than stored. */
#homeGap(frame: Readonly<Frame<SortableFramePart>>): void {
  const home = homeInsertion(frame.snapshot!, frame.item!);

  if (home) {
    movePlaceholder(this.#operation.activePlaceholder!, home);
  }
}
```

**Current behavior.** `#homeGap` has exactly one call site (`spec.ts:1742`). It composes two existing calls (`homeInsertion`, `movePlaceholder`) with one conditional and adds no invariant of its own beyond the one-line comment.

**Why it is a problem.** CONTRIBUTING.md §2.1: "If a function has one call site, seriously consider inlining it… Do not inline automatically when the function is a meaningful semantic or invariant boundary. If keeping a single-use abstraction materially improves the design, record it in the size report for owner review." This is a borderline case — the name and comment do name a real design fact (the gap is recomputed, not cached), which is arguably a small invariant statement rather than pure renaming — but it is exactly the shape §2.1 asks to be surfaced rather than kept by default.

**Evidence.** `grep -n "#homeGap" src/sortable/spec.ts` → declaration at 627, one call at 1742.

**Required property.** A single-use private helper either states an invariant boundary worth keeping separate, or is inlined; §2.1 puts the choice to the owner, not to a default.

## Checked and found clean (no finding)

- **`RectIndex` / `RectIndexView` / `ReadonlyFloat64Array`** (`sortable/rect-index.ts`): the class owns every field it mutates; the declared (never derived) reader interface is the only mechanism this repository's configuration leaves for a read boundary the `unbound-method` gate still sees (mapped types erase method-ness, per the D-170 ownership-boundary amendment); `verifyEquivalence` is a free, `DEV`-only function correctly kept out of the class so it tree-shakes. No accessor exists where a declared type already forbids the mutation; matches the entry's own stated taxonomy exactly.
- **`LinearShift`** (`sortable/linear-shift.ts`): holds no `#live` field and no liveness member, matching the record's claim that it forwards liveness rather than reading it; every field is private; the class stays out of the axis rule (dimension-neutral cache, rule lives in `y.ts`).
- **`SeamDriver`** (`kernel/seams.ts`): the `#reentry` latch is live and load-bearing (checked call sites at `#refuseReentry`/`#runPhase`); `runActivationSeam`/`runReleaseSeam` as free functions over the one `runCore` are the "one mechanism, small point of variation" shape §6 asks for, not a framework.
- **`Kernel`** (`kernel/kernel.ts`): `AttemptSlots` groups three fields of two genuinely different lifetimes (verified: `resolution`/`settlement`/`settlementInput` are cleared together at distinct sites, `#armedStamp` and phase-stamp handling do not duplicate this); `thenOf` is a free module function reading `then` exactly once for a stated correctness reason (re-reading a consumer-supplied thenable's accessor could observe two different values) and is explicitly discussed as staying a free function in the D-170 record; wrapped `cancel`/`destroy`/`fail`/`arm` forwards match the record's account of where the `unbound-method` gate fires (production site, not consumption site).
- **`BehaviorContext`** (`kernel/spec.ts`): positively-selected member list, no member lets a behavior drive a transition; matches the record's stated boundary with no drift.
- **`kernel.ts`, `kernel/realm.ts`**: unchanged in substance; only identifier renames (`KernelHost` → `BehaviorContext`, `host` → `kernel`) tracked through comments and signatures.
- **`sortable/controller.ts`, `free-drag/controller.ts`**: `cancel`/`destroy` wraps are justified detach-by-contract publications (a consumer may pull the member off the controller), matching the record's reasoning; no defensive `kernel.closed` guard duplicated where the kernel's own latch already covers it.
- **`xy.ts`, `y.ts`**: both construct the cache once, bind a `RectIndexView` for every read, and route every external mutation through the declared operations (`advance`, `remeasureHole`) — no direct field write anywhere in either module.
- **`sortable/spec.ts`, `free-drag/spec.ts` — lifetime fidelity**: in both files the three lifetime records (controller-owned fields, `#operation`, and a transaction record where present) were checked field-by-field against their comments; no field's stated lifetime disagrees with where it is declared, and the two `"there is no longer an outer `lift` to hide"`-style sentences (`sortable/spec.ts:210–211`, `free-drag/spec.ts:146–147`) were weighed against the CONTRIBUTING §Comments/§5.2 history-narration rule and kept: each states why the current field grouping is correct and what the discarded alternative (an outer shadowing binding) would still cost, with no reference to who considered it or when — the carve-out §5.2 states explicitly ("It may say why the current shape is the right one and what the obvious alternative gets wrong").
- **`createSortableSpec` / `createFreeDragSpec` thin adapters**: every member is a direct forward to the class or a protocol constant; no adapter has grown independent logic. The forwarding wrappers themselves are required by the same unbound-method/detach-by-contract reasoning as the controllers, not a leftover shape.
- **`resetFramePart: sortableFramePart`** (`sortable/spec.ts:1888,1894`): one function filling two protocol slots, with the reuse and its (deliberate, checked-in) lint suppression explained in a comment stating the current property (`createFramePart`/`resetFramePart` share one signature-compatible implementation) — not a history narration, not excess genericity.

## Rejected candidates (raised by a discovery pass, not confirmed)

Two independent discovery passes over `kernel.ts`/`kernel/spec.ts` and `kernel/kernel.ts` raised `thenOf`, `AttemptSlots`, a `root.isConnected` guard and a single-call `createRealm` factory as candidates; all four were checked and dropped:

- `thenOf` and `AttemptSlots`: the D-170 entry itself argues for exactly this shape (a free function because it reads no kernel state; a grouped record because a class has one flat namespace and the grouping is what keeps two different lifetimes legible) — re-litigating a canonical, already-argued disposition is not a fresh finding.
- `root.isConnected` guard (`kernel/kernel.ts:1475`) and `createRealm` (`kernel/realm.ts:23`): both predate `261a3a16` unchanged (confirmed with `git show 261a3a16:... | grep`), so neither is something this arc added or left behind; out of scope for a review bounded to this range.

A third pass on `sortable/spec.ts` raised a claim that `#admitFrom` is documented as "shared by both ingresses" but only one ingress calls it: checked against the source and rejected — the "shared" comment is attached to `#resolveItem`, not `#admitFrom`, and `#resolveItem` is in fact called from both `#admitFrom` (line 598) and `admitCommand` (line 696); the comment is accurate.

## Summary

Two Tier C findings (cr-1, cr-2) are the same defect shape — a superseded JSDoc block left beside its replacement rather than deleted — each independently introduced by an in-range commit that added a corrected or supplementary comment without removing the one it was replacing. One Tier C candidate (cr-3) is a §2.1 single-use-helper judgment call routed to the owner rather than a defect. Every class conversion, ownership boundary, and receiver-wrap this arc introduced was checked against the current D-170 entry's own stated taxonomy and found to match it exactly; no machinery survives that the entry does not already account for, and no duplicated runtime state, no TypeScript-only concern paid at runtime, and no abstraction wider than its one use site were found beyond what is listed above.

**LSP plugin — unavailable** (probed via `ToolSearch` at the start of the task; no LSP tool surfaced in this session, so all symbol/call-site work in this review was done with `grep`, `git log -S` and direct reads).