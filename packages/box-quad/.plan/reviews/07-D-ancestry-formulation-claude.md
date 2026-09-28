# Iteration D, reopened — the `Ancestry` formulation, and the ground BQ-1 stood on

Two owner corrections reopened [`06-D-cache-ownership-and-ancestry-claude.md`](06-D-cache-ownership-and-ancestry-claude.md). This record settles both. It supersedes that record's **BQ-1** and adds **BQ-5**; **BQ-2** is re-tested against a stronger alternative and upheld.

## 1. The first correction is confirmed by the commit order, and BQ-1's ground is void

BQ-1 held that `cache(): BoxCache` was **undocumented drift** — source that had left an accepted contract. The owner remembers approving the current design after that contract was written. The repository agrees:

| Commit | Date | What |
| --- | --- | --- |
| `21c001f1c` | 2026-07-27 | `box-quad: new package` — creates `contract/05-cache-semantics.md`, specifying `BoxQuadCache = WeakMap<…>` |
| `162f300fa` | 2026-07-31 | `box-quad: separate coordinate space and projection` — introduces `export function cache()` |

`cache()` is **four days younger than the artifact it contradicts**, and arrives in a commit whose subject describes a deliberate reshaping of the public surface. That is the signature of a later decision, not of drift. **The stale document is artifact 5, not the source**, and BQ-1 inverted which one had moved.

This is worth stating plainly because BQ-1's whole argument was conformance — it was explicitly _"accepted on conformance, not on bytes"_, the byte figure being −9 B as consumed. With the conformance ground void, −9 B is all that is left, and that is not a reason to change a design the owner approved. **BQ-4 supersedes BQ-1**: the callable stays, and artifact 5 is corrected to describe it.

The correction is not free, and the amendment has to be honest about what it changes rather than only renaming a type. Artifact 5 §2 states _"There is no in-place reset operation. A consumer starts a fresh epoch by constructing and passing a new `WeakMap`."_ A resettable callable is the opposite arrangement: **identity survives the epoch**, so a long-lived consumer holds one reference in a `const` and re-calls it, where the map form obliges it to hold a reassignable field. §1, §2, §6, §7, §8 and §9 all narrate the map. The reset semantics are a genuine improvement for a long-lived holder — which is what a drag controller is — and that is the substance the amendment should record as the reason, rather than presenting the callable as a notational variant.

**What this does not change**: entry opacity, adoption invalidation, within-epoch staleness, weak keying and the absence of any global cache are all still true of the callable, and all still binding.

## 2. The second correction, and what was actually asked

BQ-3 declined per-element memoization on four grounds. Two of them do not reach the new proposal, and one is now differently weighted:

- **Bytes.** +68 B was treated as disqualifying. The owner has priced that as acceptable for the right abstraction, so bytes stop being a verdict and become one column.
- **Non-observability.** BQ-3's decisive objection was that artifact 5 §3 makes ancestor reuse _not observable behavior_ and §10 reserves the strategy as changeable without an API revision, so a value a consumer must **read** cannot come from there. The `Ancestry` formulation answers this directly: **retention is the contract**, not an optional reuse strategy. The objection is spent against it.
- **No hit rate**, and **the silent-corruption trap** of a shared per-element map, are both about a cache keyed by element across targets. `Ancestry` is a per-target ordered chain. Neither applies.

So the new proposal must be judged on its own, and BQ-3's record must not be read as having disposed of it. BQ-3's requirement of the code is unchanged; its scope is narrowed in place.

**The formulation under test.** A caller-owned object retaining the flat-tree computation performed from a target toward its document; entries opaque; retention an observable promise; the space above any visited boundary obtained by **lazy composition from retained facts**, not by having been accumulated eagerly during the walk.

## 3. It works — this is not a defect argument

Built as **arm F** and validated in Chromium against arm B (BQ-2's explicit boundary) on the same DOM, both reading the same computed styles:

```
✓ F inheritedSpace matches B outerMatrix and the required product
✓ display:contents boundary is locatable and contributes nothing
✓ a boundary off the chain is a recognized failure
✓ a reused ancestry does not leak the previous chain
```

The shape was `matrix(2,0,0,3,0,0)` → `rotate(30deg)` → `display:contents` → `scale(1.5) translate(…)` → skewed visual, with the boundary at the `scale(1.5)` node — deliberately non-commuting, so an order error could not pass. F and B agree to **1e-10**; both agree with the analytically required `G·P` to the precision computed style preserves. A `display: contents` node is locatable as a boundary and contributes nothing, which is the correct behavior and not obvious. An off-chain boundary returns `false`. A reused ancestry does not answer from a previous target's chain.

**And it is not slower — it is slightly faster.** Depth-30 chain, boundary two levels above the target, 3000 measurements, three runs:

|       | B (boundary) | F (ancestry) | ratio |
| ----- | ------------ | ------------ | ----- |
| run 1 | 890.5 ms     | 800.2 ms     | 0.90  |
| run 2 | 909.7 ms     | 879.9 ms     | 0.97  |
| run 3 | 901.6 ms     | 840.3 ms     | 0.93  |

The mechanism is real rather than noise: B pays a second `DOMMatrix.preMultiplySelf` — a native binding call — per node above the boundary, while F's query is a scalar 2×2 multiply in JavaScript. **This contradicts the intuition that a deferred composition must cost more at runtime, and it is recorded so BQ-2 is not defended on a speed claim it does not have.** Both figures are dominated by `getComputedStyle`; at drag2's actual rate — once per lift — the difference is unmeasurable.

## 4. Bytes, measured across five encodings

Rolldown (`platform: 'neutral'`, `format: 'es'`, `minify: true`) plus `node:zlib` brotli — the pipeline `packages/drag2/bench/size/measure.ts` specifies. The column that decides is **as consumed**, the entry importing only what drag2 imports, because `cache()` is tree-shaken from every shipped graph.

| Arm | What | brotli, whole | brotli, **as consumed** | **Δ** |
| --- | --- | --- | --- | --- |
| **A** | baseline | 1221 | 1193 | — |
| **B** | explicit boundary (BQ-2) | 1271 | 1233 | **+40** |
| **H** | boundary, cache removed | 1223 | 1212 | +19 |
| **F** | `Ancestry`, cache kept | 1364 | 1330 | **+137** |
| **G** | `Ancestry` replacing the cache | 1315 | 1305 | +112 |
| **I** | `Ancestry`, `Box` shrunk to 9 slots | 1342 | 1294 | **+101** |

A/B/C/D/E reproduce record 06 exactly, so the pipeline is unchanged. The **boundary-versus-ancestry delta is stable at +93 to +97 B** whatever is done to the cache around it. Arm I — the most principled version, described in §5 — recovers 36 B of F's cost and is still **2.5× arm B**. The owner's +68 B tolerance is exceeded by every ancestry arm.

## 5. The strongest argument for it, stated at full strength

`Box` is 13 slots, of which **five are metadata `projection` never reads**, admitted as such in its own doc block: _"The last five values are metadata for consumers that author transforms on the measured element."_ BQ-2 adds four more of the same kind (13 → 17). That is a wart growing.

`Ancestry` can reverse it. **Arm I** removes `ancestorMatrix` from the walk entirely and drops `BOX_ANCESTOR_A..D`, taking `Box` from 13 slots to **9** — a pure measurement, with every question about the chain answered by the primitive that owns the chain. Two clean concepts (_measure an element_, _ask the retained chain about a boundary_) replace one concept carrying a rider. That is genuine architectural value and it is the reason this deserved a prototype rather than an opinion.

It is also the version that costs +101 B and, per §6, retains the most.

## 6. Why it still loses

**6.1 Deferred boundary choice forces strong retention of the whole chain, and this is intrinsic.** A boundary can only be located in a retained chain **by element identity**, so the chain's elements must be stored — in arm F, `history.push(current, node)`, 66 slots for a depth-30 walk, pinning 33 elements including every shadow host. Artifact 5 §8 makes weak ownership a binding property: _"The cache weakly keys element-owned data"_, and library-owned values _"must not keep an element alive through a strong reference cycle"_. An `Ancestry` is not the cache, so this is not literally a violation — it is worse, because it introduces the **first caller-held object in this package that strongly pins DOM**, and it cannot be fixed. Storing indices instead of identities would oblige the caller to count its own depth through the flat tree, which is the duplicated traversal the package exists to prevent; `WeakRef` costs more than the whole capability. The retention is the price of the deferral, exactly.

**6.2 It manufactures a staleness window where BQ-2 has none.** BQ-2 resolves the boundary **inside the walk**: the answer is a fact of the same observation as the matrix beside it, and there is no interval in which it can rot. An `Ancestry` publishes observations at T and is queried at T+k with no invalidation signal and — retention now being a _promise_ — no way for the caller to ask for freshness short of a full re-measure, which is the entire walk. For this consumer that is not hypothetical: `acquireLift` mutates the visual immediately after measuring, and `presentation.ts` already documents why, _"a second traversal taken afterwards reads a different ancestry"_. The formulation's central feature is the ability to ask later; the one consumer's central constraint is that later is exactly when the answer stops being true.

**6.3 It does not compose with the cache — the two published mechanisms become mutually exclusive.** Retention requires the walk; a cache hit skips the walk. Arm F resolves this the only correct way, by suppressing reuse whenever an ancestry is supplied. So a consumer wanting both epoch reuse and a boundary gets **neither**, and the package ships two retention mechanisms that cancel. BQ-2 composes with the cache without qualification, because the boundary is an input to the walk rather than an output retained from it.

**6.4 The generality has no consumer.** `@ydinjs/drag2` has exactly one `coordinates` call site — `presentation.ts:487` — and needs **two** spaces from it, which `inheritedSpaceOf`'s doc block calls _"two callers, one read"_: the space above the **visual**, for the in-place `translate` `compose` writes on the visual, and the space above the **item**, for the `translate` the displacement sink writes on the item. Two, and **both known before the call** — `acquireLift` is handed the visual and, under D-164, the item. BQ-2 serves exactly two: the element's own, in the existing slots, and one designated boundary. `Ancestry` serves _n_, chosen afterwards, and pays §6.1 and §6.2 for a deferral no caller can use.

This also settles a cheaper encoding worth naming so it is not re-proposed: **parameterizing the existing `BOX_ANCESTOR_A..D` instead of adding `BOX_OUTER_A..D`** would keep `Box` at 13 and cost less than +40. It fails on the same fact — the two spaces are needed _simultaneously from one measurement_, so the designated boundary cannot overwrite the element's own.

## 7. What is decided

- **BQ-4 supersedes BQ-1.** `cache()` is the design in force. Artifact 5 is amended to describe it, recording reset-in-place as the substance rather than the type name.
- **BQ-5.** The `Ancestry` formulation is evaluated on abstraction, bytes, runtime and allocation, and **declined**; BQ-2 stands unchanged.
- **BQ-3** is amended in place, non-substantively, to scope it to per-element memoization and record that its byte ground was over-weighted.
- **F-1 grows rather than shrinks.** BQ-1 was to have closed its cache half by making the source conform. That half now closes the other way, by amending the contract, and the amendment is larger than a rename.

**What would reopen BQ-5**: a second consumer needing a boundary it cannot know before measuring, or an appetite to spend ~100 B returning `Box` to a pure measurement for its own sake. Not the runtime — that column is F's, and it is small.

## 8. Method

Seven arms built and typechecked `--strict`; F and B cross-validated in Chromium on the same DOM; all six measured through the repository's own pipeline; benchmark repeated three times. Arms were built and measured outside the repository, probes removed. No production file was modified.

## 9. Findings

| ID | Finding |
| --- | --- |
| **F-2** | Record 06 asserted contract-versus-source precedence without checking commit order, and inverted it. `git log --follow` on the artifact and `git log -S` on the symbol answer this in one command each; a conformance argument that decides which document is authoritative must run it before, not after, a decision is minted |