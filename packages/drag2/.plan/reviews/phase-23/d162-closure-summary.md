# D-162 closure — review round consolidation

**Round:** narrow closure review of the D-162 remediation, `c168126d..e4e835ba` (one commit) on `drag2/fin-review`. Subject: the amended D-162 row, F-213, F-225, and [`displacement-coordinate-space-claude.md`](displacement-coordinate-space-claude.md).

**Both passes read files at `e4e835ba`**, verified per report against `c168126d`; the reports merge without a tree reconciliation. `git status` at consolidation shows only the two pass artifacts as tracked additions (one, the feature-proof report, was committed by that pass at `d6cf8125` and pushed; the integrity report was left untracked and is committed with this summary). No production file was modified by either pass — the feature-proof pass ran its falsification probes in a detached, since-removed worktree.

**Passes run:** `reviewer` (feature proof) and `integrity` (package coherence) — in parallel, in one message, neither holding the other's prompt, findings or artifact path. `cleanup` and `der` were not run; this round was scoped narrow, on demand, to the two questions in the brief.

**The round is not clean.** One tier-A finding survives independent verification: the published F-225 boundary does not name the configuration that actually produces the divergence, and one instance of that configuration is a regression the change itself introduces. The package-coherence question the brief flagged — `sortable/feature` now publishing `InheritedSpace` — is a correct, forced consequence of rules already in force; no coherence drift found.

---

## 1. Findings

| Canonical | Tier | Claim | From |
| --- | --- | --- | --- |
| **F-227** | **A** | A transform authored **on the item itself**, with a descendant `visual`, is not named by F-225's published boundary and is projected wrongly; the same shape with no ancestor transform is a regression `e4e835ba` introduces | `reviewer` (proof-1) |
| **F-228** | B | The F-225 boundary sentence is documented on `box`'s doc block, not `visual`'s — the slot that actually creates the condition | `reviewer` (proof-2) |
| **F-229** | C | The new coverage exercises only `y()`; `xy()` has no non-null-projection test, and `COVERAGE.md` does not record the restriction | `reviewer` (proof-3) |
| **F-230** | C | The artifact's null-path control evidence item does not discriminate `space === null` from a non-null identity projection, though nothing published mischaracterizes it as more than a control | `reviewer` (proof-4) |

Ids continue from the high-water marks `F-226`, `Q-16`, `I-37` (confirmed by `grep -rohE '\b[FQI]-[0-9]+\b' packages/drag2/.plan/`). No `Q-` or `I-` was minted. **No `D-*` was minted, amended or superseded by this round or by consolidation** — F-227 is routed to the architect rather than resolved here.

The integrity pass's package-coherence check is a **null result, stated explicitly**: no finding, verdict recorded (`integrity-1`). It is not a candidate for a canonical id — it establishes that a specific consequence is correct, not that anything is wrong.

---

## 2. F-227 — the published boundary excludes the wrong transform, and one instance regresses

**Verified independently, not merely relayed.** I read the traversal `inheritedSpaceOf` is fed (`packages/drag2/src/kernel/presentation.ts:410-419`, doc block above it) and box-quad's own accumulation (`packages/box-quad/src/index.ts:237-243`):

```ts
if (node) {
  result.preMultiplySelf(node);
  if (current !== element) {
    ancestorMatrix.preMultiplySelf(node);
  }
}
```

`ancestorMatrix` folds in every node **strictly above `element`** (the visual), excluded only for the visual itself. When `visual` resolves to a **descendant of the item**, the item sits strictly above the visual, so the item's own `transform`/`scale`/`rotate` enters the projection — a shape the projection's own doc block does not mention as excluded (it excludes only "its own transform and zoom", meaning the visual's).

The published limit lives in `box`'s doc block (`packages/drag2/src/sortable/config.ts:112-121`) and reads: _"where `visual` resolves to a descendant of the item, no transform may sit between the item and its visual."_ **"Between the item and its visual" and "on the item itself" are different configurations.** A transform authored directly on the item is not between anything — it is the item's own presentation, which the same file's authored-`transform` tests (`displacement.browser.test.ts` → _should leave an authored transform untouched_) treat as an explicitly supported case elsewhere in the same package.

**The reviewer's falsification, which I did not independently re-run in a browser but whose mechanism I traced to source:**

- With an ancestor `scale(2)` **and** the transform moved from the wrapper onto the item: carried 53.33 — identical to F-225's already-excluded configuration, from a shape F-225's wording does not exclude.
- With **no** ancestor transform at all, transform only on the item: carried 26.67 against a required 40 — and the same probe with the projection expression removed (i.e., at the pre-`e4e835ba` behavior) renders the correct 40 and passes. **That configuration regresses at this commit.**

I accept this without re-running the browser probe myself: the source-level mechanism (`ancestorMatrix`'s `current !== element` exclusion, keyed to the visual, not the item) fully explains both numbers, the doc-block placement is confirmed verbatim, and the regression follows directly from the projection now dividing out a factor (the item's own linear part) that the pre-fix code never touched.

**Why this is not F-225 restated.** F-225 names the item/visual pair diverging when "`visual` resolves to a descendant **and** a transform sits between" — an intermediate wrapper. F-227 is a transform on the item itself, a geometrically distinct configuration that F-225's wording does not reach, and it is the only one of the two that produces a **regression** rather than a pre-existing, now-published gap.

**Why this is routed, not resolved.** The subject artifact's §5 priced obtaining "the space above the item" against D-85's acceptance ground, but — per the reviewer's reading, which I did not find contradicted anywhere in the artifact — only for the ancestor-transform case; the no-ancestor-transform regression was not in front of that pricing, and neither remedy the existing F-225 boundary text offers (put the transform on the visual, or above the collection) is available to a consumer who wants the row itself transformed. Whether the fix is a re-priced "space above the item" derivation, a widened boundary that also excludes this configuration and accepts the regression as a documented pre-existing-style limit, or something else, is a contract call this consolidation is not authorised to make.

**Not accepted as tier B.** Tier is by consequence: a correctly integrated consumer relying on the authored-transform-on-item configuration (already tested and supported elsewhere in the same file) observes wrong rendered output, and in the no-ancestor-transform case observes a regression from previously-correct behavior. That is runtime-observable, which is tier A regardless of how narrow the configuration is.

---

## 3. F-228 through F-230 — accepted as reported

Each was checked directly against source and found to match the reviewer's report exactly, with no adjustment to tier or wording:

- **F-228** (tier B): `config.ts:94-99` (`visual`'s doc block) reads only _"The node faithfully lifted... Defaults to the item"_; the F-225 boundary sentence is appended to `box`'s doc block at `config.ts:112-121` instead, confirmed by direct read.
- **F-229** (tier C): `displacement.browser.test.ts:107` hardwires `axis: y()`; `xy.browser.test.ts:158,180` pass `space: null` at both call sites; `COVERAGE.md`'s new section (`:973-982`) records four rows, none noting the axis restriction — confirmed by direct read.
- **F-230** (tier C): the artifact's evidence-to-add list frames the no-ancestor-transform control as proving the null path is taken; the reviewer's report notes, and I accept without re-running, that the landed case cannot discriminate `space === null` from an identity non-null projection. Both the plan entry and `COVERAGE.md:980` already describe it correctly as a control rather than a proof, so nothing published is wrong — only the artifact's own evidence framing overstates what the case shows.

---

## 4. The package-coherence question — no drift

**`sortable/feature.ts` publishing `InheritedSpace` is a correct, forced consequence of rules already in force**, not an unintended widening or a cross-tier leak. I re-verified the integrity pass's two load-bearing claims directly rather than taking the report's word:

- `DisplacementReport`'s fifth parameter, `space: InheritedSpace` (`sortable/slots.ts:47-52`), makes `InheritedSpace` structurally reachable from `sortable/feature.ts`'s own entry point, which `tests/docs.node.test.ts`'s TypeDoc closure check — pre-existing, untouched by this diff — requires be exported there.
- `InheritedSpace` was already published at the kernel root (`kernel.ts:109-118`, not touched by `e4e835ba`); the re-export follows the identical `export type { X } from '../kernel/Y.ts'` shape `sortable/feature.ts` already used for `Disposer`, `DOMRealm`, and the `Landing*` family before this change — precedent, not novelty.

The `free-drag/feature.ts` asymmetry (it does not re-export `InheritedSpace`) is explained rather than papered over: `free-drag/geometry.ts` projects the type into plain numbers before it reaches any published shape, so free drag's public surface never structurally reaches it — a real design difference in D-162's chosen delivery mechanism, not an inconsistency in how the two middle tiers apply the same publish-what-producers-need rule.

No duplicate declaration, no naming collision, no cross-package consumer affected (`InheritedSpace`/`DisplacementReport` have no hits outside `packages/drag2/`). The one loose thread the integrity pass surfaced — `tests/docs.node.test.ts`'s stale "eight public entries" header against a twelve-entry `typedoc.json` — predates baseline `c168126d` and is correctly excluded from this round's findings as not a consequence of `e4e835ba`.

---

## 5. Local → canonical id map

| Local id    | Pass      | Canonical                                          |
| ----------- | --------- | -------------------------------------------------- |
| proof-1     | reviewer  | F-227                                              |
| proof-2     | reviewer  | F-228                                              |
| proof-3     | reviewer  | F-229                                              |
| proof-4     | reviewer  | F-230                                              |
| integrity-1 | integrity | — (null result, verdict recorded; no canonical id) |

---

## 6. Routed, not decided here

**F-227** is routed to the architect. The consolidator does not choose between widening F-225's published boundary to also name a transform authored on the item, deriving a different projection (space above the item, re-priced for the no-ancestor-transform case this round's evidence adds), or another remedy — that is a contract call, and the existing §5 pricing in the subject artifact does not cover the configuration this round found.

No other disagreement surfaced between the two passes — they covered disjoint questions (feature proof vs. package coherence) and neither pass's findings contradict the other's.