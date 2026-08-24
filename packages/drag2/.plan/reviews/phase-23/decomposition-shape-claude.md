# Function boundaries in drag2 — the decomposition-shape review, 2026-08-24

**Subject.** Whether drag2's algorithms have drifted toward too many semantic seams — "do one tiny step, trap on `null`, continue" — at the expense of compositional simplicity. The two named sites are the keyboard `command.admit` flow ([`src/sortable/spec.ts:552`](../../src/sortable/spec.ts)) and `buildReorderProposal` ([`src/sortable/collection.ts:164`](../../src/sortable/collection.ts)); the contrast is `packages/tproc`.

**Scope.** Investigative. **No production change is proposed here and nothing below is a decision.** Section 7 states a candidate direction and section 8 states what would falsify it.

---

## 0. Verdict

The hypothesis is half right, and the right half is not the one the two examples show.

drag2 has not over-decomposed its **steps**. It has under-owned a **value**. `Insertion` — the object the whole sortable behavior exists to produce — is constructed by object literal in **seven places across four modules**, and the one expression that derives its neighbours is written **four times over three differently-produced arrays**, the fourth of them inside `buildReorderProposal` _for the purpose of checking the other three_.

The guard ladders are the visible symptom of that ownership gap. They are not themselves the defect, and two of the three populations of guard in this package should not be touched at all.

---

## 1. The two named sites, judged separately

### 1.1 `command.admit` is not the defect

The ladder is five steps, each returning `null`:

| Step | `null` means |
| --- | --- |
| `keys.isComposing` | not our event at all (D-46) |
| `directionOf(keys.key)` | not an arrow key |
| `resolveItem(...)` | not in the collection, or the handle declined, or an interactive owner claimed the key |
| `keyboardInsertion(...)` | at the edge — infeasible, so the arrow key keeps its native meaning (I-32) |
| `seedDraft(...)` | a consumer resolver destroyed the controller |

Five distinct causes, one channel — and **that is correct here**, because the recipient is the kernel and the kernel has exactly one thing to do with a decline: nothing. The order is normative rather than incidental (D-46 fixes _what did the event land on_ before _is the move feasible_, and the row above it records the probe-E table that the other order produced). Collapsing this into one predicate would erase an ordering the contract owns, merge five unrelated questions into one unreadable expression, and buy nothing downstream.

**The discriminator worth extracting from this site**: a collapsed outcome is sound when the recipient is a machine with one branch, and a defect when the recipient is a person holding a question. Section 1.2 is the same shape with the other recipient.

### 1.2 `buildReorderProposal` is a symptom, not a cause

Four guards, all returning `null`, one call site ([`spec.ts:1307`](../../src/sortable/spec.ts)), one message — `drag: sortable/release-no-proposal`. The four are: version mismatch, item not in the snapshot, index out of range, neighbours disagree.

Every one of them checks that **a value this package built is well-formed against a snapshot this package built**. None validates consumer input. That is precisely why its own doc block says _`null` is a broken invariant, not a no-op_. ~~That is precisely why D-117 classified the site P2~~ — **corrected 2026-08-24, F-94**: D-117 (1) settles all four sortable release faults as **P1**, by rule (b)'s default for an unproved site. This sentence read the measurement record's provisional _eight P2 sites_ list as a landed classification; the same record says seven of the eight remain unproved and that an unsettled site is P1. D-119 proved the site's third-party reachability and it is P1 on the call graph.

So the shape is not "one tiny step, trap, continue." It is a **re-validation pass**, and it exists because nothing upstream is trusted to have produced a well-formed `Insertion`. Section 3 is why nothing upstream can be.

---

## 2. The measurement

Counted over `packages/drag2/src` at `e9088d99` — 57 modules, 14,528 lines.

| Quantity | Count | Concentration |
| --- | --- | --- |
| Exported lower-case functions | 82 | — |
| …reached from ≤ 1 call site | 49 | includes every tier factory |
| `return null` statements | 49 | `sortable/spec.ts` 16, `free-drag/spec.ts` 11, `collection.ts` 5, `kernel/kernel.ts` 5 |
| `=== null` / `!== null` comparisons | 68 | `kernel/kernel.ts` 34, `sortable/spec.ts` 32 |
| Non-null assertions (`x!`) | 48 | `kernel/kernel.ts` 31, `sortable/spec.ts` 17 |
| Terminal-barrier sites (`host.closed`, `!live()`) | 48 | `sortable/spec.ts` 22, `free-drag/spec.ts` 11 |
| `Insertion` object literals | 7 | 4 modules |
| Destination-view derivations | 3 | 3 modules |

**The row that decides the review is not in the table.** Of the five pure helpers the decomposition produced — `directionOf`, `keyboardInsertion`, `buildReorderProposal`, `reconcileCollection`, `homeInsertion` — **none is imported by any test in the package**. Every one is exercised only through the composed behavior in a browser suite. `copyUniqueItems` is the single exception, and it is imported by `composition.browser.test.ts` because it is a _construction-time_ precondition rather than a step of the algorithm.

That matters because testability is the usual defence for a single-call-site extraction, and here it is not merely unclaimed — it is measurably unused. These seams are not reached from two sites, not recursive, not large enough to need a name to be readable, and not tested at the boundary they create. Three of the four things a seam is normally bought with are absent, and the fourth is unspent.

**Non-null assertions are the same design seen from the other side.** Both frame parts are flat bags of independently-nullable slots reset in place ([`sortable/frames.ts:26`](../../src/sortable/frames.ts), [`free-drag/frames.ts:24`](../../src/free-drag/frames.ts)), and the kernel's own runtime state has the same shape (`spec!`, `lifetimes!`, `lift!`, `visual!`, `box!`, `handle!`, `originRect!`). So a phase guarantee that the type cannot carry is discharged two ways in the same file: `release.prepare` **guards** `view`, `item` and `snapshot` and rejects ([`spec.ts:1222`](../../src/sortable/spec.ts)); `release.effect` twelve lines later **asserts** `rt.placeholder!` and `current.insertion!` ([`spec.ts:1343`](../../src/sortable/spec.ts)). Both mean _the phase guarantees this_. **This is noted and not pursued** — the flat mutable part is required by the frame contract (D-10, D-15: two physical frames, composed kernel-first, reset in place, nothing allocated per seam), so the nullability is bought deliberately and the receipt is the assertion count.

---

## 3. The finding — `Insertion` has no owner

### 3.1 Seven constructions, three shapes

| Site | Shape |
| --- | --- |
| [`keyboard.ts:83`](../../src/sortable/keyboard.ts) | derive from `(array, gap)` |
| [`y.ts:179`](../../src/sortable/y.ts) | derive from `(array, gap)` |
| [`xy.ts:154`](../../src/sortable/xy.ts) | derive from `(array, gap)` |
| [`collection.ts:186`](../../src/sortable/collection.ts) | derive from `(array, gap)` — **to verify the other three** |
| [`collection.ts:141`](../../src/sortable/collection.ts) | derive from `(full list, home index)`, asymmetric `±1` |
| [`collection.ts:81`, `:93`, `:111`](../../src/sortable/collection.ts) | verify a neighbour relation, then **carry** the incumbent's neighbours |

Four of those are the _same expression_:

```ts
before: destination[index - 1] ?? null,
after:  destination[index]     ?? null,
```

written once over a locally-filtered array (`keyboard.ts:80`), twice over the rect cache's maintained list (`y.ts`, `xy.ts` read `index.items`), and once over `destinationOf(...)` — that fourth time not to build a value but to check the first three. **`buildReorderProposal`'s neighbour guard is the construction expression, run a second time, against itself.** That single line is the whole finding in miniature: when construction has no owner, verification is the only place the rule can be stated twice and noticed.

`homeInsertion` is a fifth spelling of the same concept — the neighbours of the gap in the destination view — computed as `±1` around the item in the **undeleted** list, because at that instant the item has not been removed. Its doc block (`collection.ts:127`) argues the equivalence in prose. It is very likely correct. It is nowhere proved, and nothing in the package would notice if it stopped being.

### 3.2 The destination view is derived three times, and that part is defensible

`snapshot minus dragged` exists at [`collection.ts:57`](../../src/sortable/collection.ts) (`destinationOf`, allocating), [`keyboard.ts:80`](../../src/sortable/keyboard.ts) (inline, allocating) and [`rect-index.ts:237`](../../src/sortable/rect-index.ts) (maintained incrementally, version-keyed, already inside a cache the axis feature owns).

**I am not recommending this away.** The three exist at three different instants with three different amounts of live state — pre-activation, when no index exists; geometry-scan time, when the index is being built; invalidation, when the index is deliberately dirty — and the axis feature that owns the maintained copy sits behind a required slot (`slots.resolveInsertion`) the behavior treats as opaque. The triplication is paid for by a real constraint.

**The construction expression is not.** It takes an array and an index. There is no instant at which it is unavailable, and no state it needs.

### 3.3 What this says about the decomposition

The package split the **steps** of insertion resolution into named modules — `keyboard.ts`, `collection.ts`, the axis features — and left the **concept** those steps all produce without a name. So a rule small enough to inline is inlined five times, and the one seam that would have paid for itself was never drawn.

The record already holds the instinct. **F-7** — _"Landing-target arithmetic duplicates across behaviors"_ — was dispositioned **"Accepted, minor. Export it as a pure helper, never a seam."** That is exactly the right treatment and exactly what `Insertion` construction did not get.

---

## 4. Three populations of guard, and only one is removable

|  | Population | Sites | Judgment |
| --- | --- | --- | --- |
| **A** | **Decline filters** — admission chains where every `null` means _decline_ and the recipient has one branch | ~10 | **Correct.** Ordering is contract (D-46). Leave alone. |
| **B** | **Terminal barriers** — `host.closed`, `!live()`, the I-36 re-entrancy obligation | **48** | **Correct and load-bearing.** See below. |
| **C** | **Re-verification of unowned construction** — `buildReorderProposal`'s four, `reconcileCollection`'s carried neighbours | ~7 | **The removable one**, and only after §7's owner exists. |

Population B deserves its own sentence because it is almost certainly what the eye reads as a guard ladder. Forty-eight sites, twenty-two of them in one file, each an `if (host.closed) return …` carrying a named justification. They are not style; they are the discharge of I-36 by hand, one call site at a time, across every seam that can reach consumer code.

The architectural question they raise is real and it is **not the one asked here**: _is re-entrancy safety a per-call-site obligation or a property of the seam runner?_ Forty-eight hand-discharged obligations is a number at which that question is worth asking. **Recorded, not opened** — it is a different slice with a different risk profile, and this review would damage it by bundling it.

---

## 5. The tproc contrast, and the limits of it

**What tproc does.** Extraction is bought with reuse (≥ 2 call sites), or an algorithm too large to hold in one reading, or recursion. `processToken` is a 176-line monolithic decision tree with no type-specific handlers extracted. `resolveInheritance` is 149 lines holding four sequential passes — parent initialization, graph build, Kahn's sort, topological walk — with no sub-extraction at all; its queue comparator appears **twice, inline**, duplication deliberately paid to keep the algorithm cohesive. Absence is mostly _absorbed_ locally (`getSet` coalesces a missing set to a default) or _thrown_, and only propagated where the caller genuinely cannot proceed.

**drag2 already contains this style.** `y()`'s and `xy()`'s `resolve` ([`y.ts:120`](../../src/sortable/y.ts), [`xy.ts:110`](../../src/sortable/xy.ts)) are ~55-line cohesive algorithms: barrier, refresh, scan loop, incumbent comparison, side decision, construction — one function, one reading. They are the best-composed code in the sortable behavior. The cohesive shape is not a foreign import; it is present, and the pure layer diverged from it.

**Where the comparison stops, stated so it is not used dishonestly.** tproc is an offline token processor: no lifecycle, no consumer callbacks, no re-entrancy, no teardown, no seam contract, nothing that can destroy the world mid-algorithm. Its cohesion is available to it partly for that reason. drag2's `spec.ts` and `kernel.ts` decompose because the **contract** decomposes them — the prepare/effect split, D-10 and D-15's two-source frame composition, I-36's barriers — and no amount of style discipline may undo that.

**The comparison is therefore valid for the pure layer and invalid for the seam layer**, and every recommendation in §7 is scoped accordingly. tproc also guard-and-propagates in eight or more sites of its own; the contrast is one of _where the seams fall_, never of whether `null` may cross one.

---

## 6. The drift hypothesis, tested

The suspicion was that many architecture and review passes drove the decomposition. Commit counts say otherwise for the layer in question:

| File                     | Commits | First                                  |
| ------------------------ | ------- | -------------------------------------- |
| `sortable/keyboard.ts`   | **1**   | `8c34da77` — the sortable's completion |
| `sortable/collection.ts` | **3**   | `c87ad854` — the package scaffold      |
| `sortable/rect-index.ts` | 4       | `8c34da77`                             |
| `sortable/spec.ts`       | **15**  | `c87ad854`                             |

The pure-layer split is **original**. It was laid down at scaffold and completion and has barely been touched since. The review passes did not decompose it; they went into `spec.ts`, and what they deposited there is population B.

**So drift is falsified for the layer the suspicion pointed at, and confirmed for a different one.** The passes accumulated _barriers_, not _seams_. The two look alike on screen — a short `if`, an early return, one per line — and have nothing else in common. That resemblance is worth recording on its own, because it is what made the wrong layer look guilty.

---

## 7. Candidate direction

The principle, stated so it can be applied without further architectural input:

> **A boundary owns a value, or it owns nothing.**
>
> A function earns a seam when it (a) is reached from two or more call sites, (b) names an algorithm too large to hold in one reading, (c) recurses, or (d) crosses a tier the contract makes normative. A function that takes the inputs its caller already holds, performs one step, and returns a value the caller immediately unwraps has earned none of the four. It is a **step**, and a step belongs inside the algorithm that owns it.
>
> The corollary is the one that applies here. **When a domain value is constructed in more than one place, the construction rule is the thing that wants a name — not the steps around it.** A validator that re-checks a value the package itself built is the receipt for a missing constructor.

**The slice this suggests** is a construction owner for `Insertion`: one pure helper — never a seam, per F-7 — that answers _the insertion at gap `i` of this destination view_, consumed by `keyboardInsertion`, `y()`, `xy()`, `homeInsertion` and `reconcileCollection`. Its expected consequences, in order of value:

1. One expression instead of four, over whichever array the caller holds — which preserves §3.2's three-instants constraint untouched.
2. `homeInsertion`'s prose equivalence argument becomes a derivation or is discovered not to be one.
3. `buildReorderProposal`'s neighbour guard becomes either **provably redundant**, or the one check in it that is genuinely about a _snapshot replacement_ rather than about its own arithmetic. Its other three — version, membership, range — are about the pair `(snapshot, insertion)` and survive on their own terms.
4. ~~D-117's P2 classification~~ of `sortable/release-no-proposal` is revisited **on evidence rather than on policy**, since the fault it names would then have fewer ways to occur. **The premise is corrected 2026-08-24, F-94**: the site is **P1**, and what the slice can supply is the proof that D-117's default was already right.

**Explicitly not recommended.** No `Option`/`Result` type and no generic — the problem is an unowned noun, and a wrapper type would leave it unowned while adding surface. No flattening of `command.admit`. No unification of the three destination-view derivations, whose timing argument is real. No work in population B, which must stay a separate slice.

**And a proportionality note.** The step-seams this review examined are individually cheap: `directionOf` is eleven lines and one call site, and inlining it would save almost nothing. The cost of over-decomposition here is not the seams that exist — it is that drawing them felt like having drawn the boundaries, so the one boundary that would have paid was never looked for. **Under-ownership, not over-splitting, is what this package has.**

---

## 8. What would falsify this

- **The five spellings may be five concepts.** I proved they are _written_ as five; I did not prove they are _one_. If `homeInsertion`'s full-list `±1` cannot be expressed as the destination-view rule — or if `reconcileCollection`'s verify-and-carry arms are load-bearing in a way derivation is not — then the duplication is honest and the slice collapses to a smaller one over `keyboard`/`y`/`xy` alone. **Proving the equivalence is the first step of the slice, not its conclusion.**
- **`reconcileCollection` must not be absorbed.** Its three arms encode four survival rules (I-14, contract 02) and those are a _decision_, not a construction. An owner that swallowed the survival test would have recreated this finding one level up.
- **Size is unmeasured and must not be asserted.** Consolidation is expected to shrink the sortable compositions and is not evidence until `bench/size` says so (CODE_OF_SIZE §15: do not price a change by reading a file).
- **Runtime is unchanged by design.** The slice moves no allocation: `destinationOf` and `keyboard.ts:80` allocate exactly as before, and the axis path keeps reading its maintained cache. If a candidate implementation changes the allocation profile, it has exceeded the slice.

## 9. On instrumenting this

There is one mechanically checkable fact in this review — that no test imports the pure helpers — and an instrument asserting _every exported pure helper has a direct test import_ is **declined** rather than deferred. It encodes a judgment about what a seam is for, which is a semantic model, and D-112's admission criterion refuses those. The finding is recorded instead, which is the same treatment F-84 received for the same reason.

---

## Provenance

Read at `e9088d99` on branch `drag2/fin-review`: `sortable/spec.ts`, `sortable/collection.ts`, `sortable/keyboard.ts`, `sortable/rect-index.ts`, `sortable/domain.ts`, `sortable/frames.ts`, `sortable/y.ts`, `sortable/xy.ts`, `sortable/slots.ts`, `kernel/frames.ts`, `kernel/types.ts`, `free-drag/frames.ts`, `tests/references.node.test.ts`, and the full `tests/` listing. Counts produced by script over `src`; call-site counts by whole-word match excluding each function's own declaration. The tproc characterization is a separate read of `packages/tproc/src` and is reported in §5 with its limits stated.