# Iteration D — cache ownership, shared-ancestor reuse, and the ancestry boundary

**Question put to the architect:** could box-quad stop owning the cache lifecycle — the caller supplying a `WeakMap` directly, entries retaining the style-derived linear facts each visited element contributed — and could that one change satisfy drag2's D-164 item-boundary requirement, avoid repeated `getComputedStyle`, delete the `BoxCache` machinery, and come out byte-neutral or smaller?

**Answer: the proposal is three independent changes wearing one coat.** One is a contract restoration and is accepted. One is declined on measurement. One cannot be done through the cache at all without destroying the cache's own contract. Every byte figure below was measured, not estimated, and the hoped-for result does not appear.

---

## 1. The framing correction that comes first

`packages/box-quad/.plan/contract/05-cache-semantics.md` §1 **already specifies the proposed design**:

```ts
export type BoxQuadCache = WeakMap<HTMLElement, unknown>;
```

> Consumers create and own cache objects directly... The map's identity and lifetime define one measurement epoch. The package owns the meaning and representation of every entry it writes. Consumers must not inspect, add, replace or delete entries.

And §2: _"There is no in-place reset operation. A consumer starts a fresh epoch by constructing and passing a new `WeakMap`."_

The shipped source instead exports `cache(): BoxCache` — a **callable** that owns an internal `WeakMap` and resets it in place. That is the one thing artifact 5 §2 says the package does not have.

**This divergence has no record anywhere.** `BoxCache` appears in no Markdown file in the repository; `BoxQuadCache` and `readBoxQuad` appear in no source file. The contract's own status line still reads _"Reviewed — revised public storage and cache API accepted"_, and artifact 00 §Binding decisions still binds the package to a `readBoxQuad` entrypoint that does not exist. So the caller-owned-`WeakMap` idea is not a new proposal to be weighed against the current design — **it is the accepted design, and the current source is undocumented drift from it** (F-1).

That reframes benefits 3 and 4 of the proposal: they are not improvements to argue for, they are a conformance debt to pay.

## 2. What was built and measured

Five arms, each a complete working `src/index.ts`, each type-checking clean under `--strict`:

| Arm | Contents |
| --- | --- |
| **A** | baseline, unchanged |
| **B** | A + an explicit ancestry `boundary` argument and four `BOX_OUTER_*` slots (`BOX_LENGTH` 13 → 17) |
| **C** | A with `cache()`/`BoxCache`/`InternalCache` deleted and a caller-owned `WeakMap` taken directly |
| **D** | C + per-element memoization of each visited element's style-derived linear facts |
| **E** | D + B's boundary argument |

Bundled with the repository's own pipeline — Rolldown, `platform: 'neutral'`, `minify: true`, then `node:zlib` brotli — the same one `packages/drag2/bench/size/measure.ts` uses.

**Whole module, and as `@ydinjs/drag2` actually consumes it.** The second column is the one that matters: drag2 imports `box`, `coordinates` and `projection` only, so `cache()` is tree-shaken out of every shipped graph today.

| Arm | brotli (whole) | Δ | brotli (as consumed) | **Δ as consumed** |
| --- | --- | --- | --- | --- |
| A | 1221 | — | 1193 | — |
| B — boundary only | 1271 | +50 | 1233 | **+40** |
| C — caller-owned map only | 1187 | −34 | 1184 | **−9** |
| D — C + ancestor memoization | 1269 | +48 | 1261 | **+68** |
| E — D + boundary | 1330 | +109 | 1323 | **+130** |

### What the numbers say

- **The byte hope is falsified.** The proposal as put — arm D — is **+68** as consumed, not neutral and not smaller. Deleting the cache machinery returns −9; the memoization spends 77 to get there.
- **`cache()` is already free.** Its removal is worth −34 in isolation and **−9** to the only consumer, because nothing imports it. Benefit 3 is real as _ownership_, and almost nothing as _bytes_.
- **The two ideas are worse than additive.** B alone is +40. D alone is +68 and delivers no boundary capability. E — both — is **+130**, against the 108 a clean split would predict. Doing them together does not make the boundary free; it makes it dearer.
- **Arm D does not satisfy D-164 at all.** Memoizing each element's _own_ contribution does not publish _the space above the item_. Arm E is what that costs, and E − D = **+62**, which is _more_ than B's +40 standalone.

## 3. Why the boundary cannot ride the cache — the decisive argument

Even at equal bytes the delivery mechanism would be wrong, for three reasons that compound.

**The cache's contents are contractually non-observable.** Artifact 5 §3: _"Whether reuse occurs for a source, target, **common ancestor** or inverse is not observable behavior. Shared-ancestor reuse and the exact reuse strategy belong to Iteration D."_ §10 reserves _"ancestor traversal representation"_ and _"shared-ancestor reuse"_ as things later work _"may measure and change without changing map identity, staleness, failure, realm or ownership semantics."_ D-164 needs a **guaranteed, readable** value. Obtaining it from the cache promotes an explicitly unobservable optimization into permanent public behavior, and permanently forfeits the freedom §10 was written to preserve. That is a far larger and less reversible widening than four numeric slots on a `Float64Array`.

**The cache is optional; correctness is not.** `coordinates(element, out)` is a valid call that retains nothing. If the boundary value arrives through the cache, a geometry _correctness_ guarantee becomes conditional on a _performance_ opt-in — and drag2 passes no cache at all today, at either of its two call sites.

**The epoch semantics are wrong for this use.** An epoch is a promise that layout has not changed. `acquireLift` measures the visual and then immediately mutates it — position, dimensions, top-layer state, transforms. Any map drag2 held would have to be constructed for one call and discarded immediately after reading one value out of it. That is not a cache; it is a covert output parameter wearing one's clothes, and it would couple drag2 to box-quad's internal traversal _order_ to know what it may find there.

## 4. One map, two entry shapes — it works, and the naive version corrupts silently

The specific question was whether one caller-owned map can hold both partial linear facts and complete measurements without a bigger discriminator than it removes. It can, but the constraint is sharp and the failure mode is the dangerous kind.

An element measured by `coordinates` is written as a completed space. The _same_ element visited later as an ancestor is read expecting its own-node facts. If a completed space is not a **superset** of those facts, the walk reads `own` as absent and treats the element as the identity.

**Demonstrated in a real browser, not argued.** A parent carrying `transform: scale(2)`, a child measured through it; the parent measured first into the same map to warm it:

```
naive   cold a= 2   warm a= 1     ← the parent's scale(2) silently vanishes
safe    cold a= 2   warm a= 2
```

No exception, no `false` return, no type error — a wrong number. The fix is to make the completed space carry the element's own facts too, plus a discriminator read in `coordinates` (the presence of `matrix`) to tell a partial entry from a complete one. So the answer to the question as put is: the discriminator is **one property read plus a widened entry shape**, which is modest — but it is a new invariant spanning two writers and one reader, replacing a callable whose whole body is four lines, and it is a silent-wrong-answer trap for whoever next touches the walk.

## 5. Reuse correctness across the cases asked about

- **Flat tree, shadow, slots** — sound. Each element's contribution is genuinely element-local, and the parent step (`assignedSlot ?? parentElement ?? host`) is unchanged.
- **`display: contents`** — sound, and worth stating: `zoom` applies to such an element while its transforms do not, because the zoom block sits _above_ the `display !== 'contents'` guard. That split is per-element and memoizes correctly.
- **Adoption** — the current single `ownerDocument` comparison per call becomes one **per visited ancestor**, because a partial entry can go stale by adoption exactly as a complete one can. Artifact 5 §2 makes this mandatory rather than optional.
- **Unsupported 3D** — today a whole-walk `return undefined`. Under memoization the walk has already written entries below the offending node; those stay valid _only_ because they are element-local. Memoizing the failure is permitted (§5) but adds a third entry state and a third discriminator branch.
- **Invalidation** — unchanged, and improved in honesty: a new map is a new epoch, with no in-place reset to misuse.

## 6. What is decided

- **BQ-1 — cache ownership returns to the contract.** Accepted, on conformance grounds rather than byte grounds (−9 as consumed). Cost: 42 `cache(` call sites across three test files.
- **BQ-2 — the ancestry boundary is an explicit measurement input.** Arm B. Validated against box-quad's existing browser suite at **196 of 197**, the single failure being `should allocate storage of the required length` — the _declared_ `BOX_LENGTH` change from 13 to 17, not a behavioral regression.
- **BQ-3 — shared-ancestor memoization stays deferred**, where artifact 5 §10 already put it. Declined on this evidence: +68 as consumed, no capability delivered, a silent-corruption trap in the encoding, and **no hit rate to improve** — drag2 passes no cache at either call site, so the repeated-`getComputedStyle` cost the proposal targets is not currently being paid by anything. It reopens on a _measured_ traversal cost with a consumer that actually holds an epoch, not on a byte argument.

## 7. Findings

| ID | Finding |
| --- | --- |
| **F-1** | The package's accepted contract is stale against its source, with no recorded supersession: artifact 00 §Binding decisions binds it to a `readBoxQuad` entrypoint that does not exist, artifact 5 specifies a caller-owned `WeakMap` against a shipped `cache()` callable, and `Box` — the package's central output type — is not described by any artifact. The cache half closes with BQ-1; the naming and `Box` halves are the package owner's. In a package that is not `private` and carries a version, a contract that describes a different API is worse than no contract |