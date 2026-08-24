# D-119 closure review — the `Insertion` construction owner, 2026-08-24

**Subject.** The slice landed in `fa735776`, reviewed against the architecture finding in `691f1a7d` ([`decomposition-shape-claude.md`](decomposition-shape-claude.md) §7 and its §8 falsifiers), D-117's provenance rule ([05](../../contract/05-lifecycle-invariants.md) §Diagnostics, by provenance and audience), and the budget doctrine in [`bench/size/measure.ts`](../../bench/size/measure.ts).

**Scope.** Independent review. **No production source is changed and none needed to be.** Four record corrections are made, under the brief's instruction to make the classification records consistent where the new evidence refines them; they are marked as corrections rather than rewritten silently.

---

## 0. Verdict

| Question asked | Answer |
| --- | --- |
| Does the equivalence proof support **one** construction rule? | **Yes**, and for the four spellings that matter it is now structural rather than tested — they _call_ the owner. |
| Does `insertionAt` own the rule without absorbing the destination-view or reconciliation decisions? | **Yes.** Both were checked against the falsifier that named them; neither moved. |
| Is `homeInsertion` still a justified allocation-free specialization? | **Yes**, and the justification is stronger than the one the record gives for it. |
| Does the surviving `buildReorderProposal` check sit on the published `InsertionGeometry` boundary? | **Yes**, and the code comment states it more precisely than the ledger does (§6.2). |
| Is `sortable/release-no-proposal` now **P2 confirmed**? | **No — and it never was P2.** The new evidence is real and refines the classification in the opposite direction: **P1 by proof**, where D-117 settled P1 by default. **F-94.** |
| Is the added release-time allocation proportionate? | **Yes.** |
| Is declining the budget re-base sound? | **The decision is; its stated rationale is contradicted by the paragraph 20 lines above it** (§9). |
| Is F-93 correctly separated? | **Yes**, and it is pre-existing rather than introduced. |

**One tier-B record defect (F-94), corrected here. Three tier-C observations. Nothing shipped is wrong.**

---

## 1. The slice is behaviour-identical, arm by arm

Verified by hand rather than inferred from a green suite, because `reconcileCollection` changed from **carrying** neighbours to **deriving** them, and that is the one edit in the slice that could have moved behaviour.

| Site | Old value | New value | Equal because |
| --- | --- | --- | --- |
| start-gap arm | `{0, null, after}` | `insertionAt(destination, 0, v)` | `destination[-1] ?? null` is `null`; `destination[0] === after` is the arm's own guard |
| end-gap arm | `{len, before, null}` | `insertionAt(destination, len, v)` | `destination[len] ?? null` is `null`; `destination[len-1] === before` is the arm's own guard |
| internal arm | `{i+1, before, after}` | `insertionAt(destination, i+1, v)` | `i = destination.indexOf(before)` so `destination[i] === before`; `destination[i+1] === after` is the guard |
| `keyboardInsertion` | literal over `destination` | same array, same index expression | textual |
| `y()` / `xy()` | literal over `index.items` | same array, same `gap` | textual |
| `buildReorderProposal` | two index reads | `insertionAt` over the same array and index | textual, plus one allocation (§8) |

**Every guard is unchanged**, so no arm's _decision_ moved; only what it hands back once it has decided. The equality is exact in all three arms — the derived neighbours are the very elements the guard has just matched — which is what the doc block claims and what makes the claim checkable rather than rhetorical.

`version` is package-assigned and monotonic (`runtime.ts:188` seeds `0`, `spec.ts:1001` is the only increment), so a version match genuinely implies the same snapshot. Every vacuity argument in the slice rests on that, and it holds.

---

## 2. Does the equivalence support one rule?

**For four of the five spellings the question is now moot, and that is the right outcome.** `keyboardInsertion`, `y()`, `xy()`, `reconcileCollection`'s three arms and `buildReorderProposal`'s verification all **call** the owner. Equivalence is not something a test has to defend; it is a property of there being one expression. A test asserting it would assert that a function call returns what the function returns.

**The fifth is the one the file exists for, and the test is the right shape.** [`insertion.browser.test.ts`](../../tests/sortable/insertion.browser.test.ts) enumerates every collection of 1–6 items × every dragged position — 21 pairs, asserted to have run, which is D-115's fail-open shape guarded — and compares `homeInsertion` against `insertionAt(destinationOf(items, dragged), from, version)` with `toEqual` on the whole object. That last detail matters: it is a **drift alarm**, not a snapshot. If either spelling gained, lost or re-typed a field, the comparison fails.

The four `insertionAt` unit cases pin the two ends and the degenerate both-`null` gap directly, which is what makes the `homeInsertion` comparison meaningful rather than a tautology between two unpinned functions.

**Where the ledger over-reads its own proof** — tier C, §11.

---

## 3. `insertionAt` owns the rule and absorbs nothing

**The destination view is untouched, and the argument shape is what guarantees it.** All three derivations survive unchanged: `destinationOf` ([collection.ts:56](../../src/sortable/collection.ts)), the inline filter in `keyboardInsertion`, and `rect-index`'s maintained list. The owner takes `(array, index, version)` and holds no state, so it cannot prefer one instant over another — which is exactly the property §3.2 of the finding asked for, and it is structural rather than promised.

**The reconciliation decision is untouched.** The three survival guards are byte-identical to the pre-slice tree; `insertionAt` is reached only _after_ an arm has decided. The finding's second falsifier — _`reconcileCollection` must not be absorbed_ — is satisfied in the shape of the code, not by assertion.

**The owner does not leak into the public surface.** `insertionAt` is exported from `domain.ts` but is not re-exported from [`sortable.ts`](../../src/sortable.ts), so it costs no public runtime vocabulary under CODE_OF_SIZE §4.

**The new feature→vocabulary import edge is real and correctly reasoned.** `y.ts` and `xy.ts` previously imported only _types_ from `domain.ts` (erased); they now import a value. The [03](../../contract/03-feature-composition.md) amendment draws the line where D-13 actually drew it — at the behavior's aggregate _runtime type_, not at the shared noun — and the module graphs confirm it costs nothing: **module counts are identical on all fourteen rows** before and after, because `domain.js` is already in every composition that reaches an axis feature (`ReorderResolution` is a runtime export). No `absent`, `absentPrefixes`, `present` or `only` assertion is touched.

---

## 4. `homeInsertion` — a specialization, not a competing owner

Four tests, all passing:

- **It is a leaf.** Nothing calls it but [`spec.ts:504`](../../src/sortable/spec.ts) (`homeGap`, from `anchorTarget`) and [`spec.ts:676`](../../src/sortable/spec.ts) (the press seed). It owns nothing downstream.
- **It cannot drift silently.** That was precisely the finding's complaint — _nothing in the package would notice if it stopped being_ correct — and it is now false. §2's `toEqual` comparison over 21 pairs is the notice.
- **It claims no ownership.** Its doc block describes itself as the rule _evaluated without materializing the view_, and names the owner.
- **Its cost argument is sound, and is stronger than the one the record makes.** Calling the owner would require materializing `destinationOf(snapshot, item)` — an **O(n) filter and array** — on the press-seed path, which today allocates exactly one object. That is a different order of cost from §8's added object, and it lands on first-input latency. The record justifies both decisions with the same _once per operation_ framing, which reads as an inconsistency; the array-versus-object distinction is what actually separates them, and it is the better argument.

**One precondition, correctly located.** The equivalence needs element identity, because `indexOf` finds one occurrence where a filtered view drops all of them. `copyUniqueItems` refuses duplicates at every mint, so the divergent input is unconstructible — and it is refused at the boundary rather than handled in the helper, which is the right place.

---

## 5. The surviving check, against the published boundary

`InsertionGeometry` is published: [`feature.ts:104`](../../src/sortable/feature.ts), reached by third-party authors through the exported `AxisInstaller`, and `resolve` returns an `Insertion` the author constructs. [`spec.ts:1302`](../../src/sortable/spec.ts) assigns that value straight to `draft.insertion` and hands it to `buildReorderProposal`. So the fault is genuinely third-party reachable, and **three of the four checks are** — `version`, `index` range and the neighbour pair are all fields the author writes. Only the membership check (`snapshot.items.indexOf(item)`) reads a value the package controls.

**The check is library-owned under §1.1's test.** The invariant it protects is not the axis author's feature — a malformed gap does not cost that author anything — it is the `{ from, to, before, after }` request handed to the **consumer** to apply to their own array. _Whose invariant, not whose mistake_: the answer is the library's contract with the consumer, so the check stays. That reasoning is correct and well made.

### 5.1 The code comment is more accurate than the ledger

[collection.ts:188](../../src/sortable/collection.ts) scopes vacuity to _every gap `keyboard.ts` and this module produce_. The D-119 ledger row and plan note widen that to _every gap this package builds_, which would include `y()`'s and `xy()`'s — and those are built over the rect cache's **maintained** array, not over a freshly derived view of the named snapshot. If the cache were stale, the neighbour check would catch it.

The narrow statement is both true and better for the guard: it makes the check load-bearing against a stale package-owned cache **as well as** against a non-conforming third-party axis, rather than resting on the third party alone. Tier C, and it points the same way the correction in §7 does.

---

## 6. F-94 — the provenance claim is wrong, and the evidence points the other way · **tier B**

**This is the one substantive finding, and it originates in my own earlier review.**

### 6.1 What the records said

| Record | Claim |
| --- | --- |
| D-117 row, 00-index (2026-08-23) | _(1) The four sortable release faults are **P1**, and so is everything the measurement left provisional._ … _Rule (b)'s default … is the answer until a proof exists_ |
| [`d117-measurement-claude.md`](d117-measurement-claude.md) §3 | lists the four among _the eight P2 sites_ — explicitly **flagged, not decided**, and §8 records that seven of eight are unproved and that _under D-117 (b) an unsettled site is P1_ |
| [`d117-implementation-review-claude.md`](d117-implementation-review-claude.md) §2 | _the four sortable release faults settled as **P1 by default rather than by proof**_ |
| [`decomposition-shape-claude.md`](decomposition-shape-claude.md) §1.2 | _That is precisely why D-117 classified the site **P2**_ |
| D-119 row and plan landing note | _D-117's **P2** classification … is **confirmed**, not revisited_ |

**Three answers for one site**, where [05](../../contract/05-lifecycle-invariants.md) says in as many words: _the record may not hold two answers for one site_.

### 6.2 The chain

The measurement record's _eight P2 sites_ list is a census of what D-117's rule would produce **if reachability were proved**, and it says so twice. My decomposition-shape review read it as a landed classification. §7's fourth expected consequence inherited that premise; the plan's candidate-slice paragraph restated it; the implementer's landing note reported the result as _P2 confirmed_. Four hops, and the premise was never read back against D-117's own row — which is one screen away in the same file and says the opposite.

### 6.3 The evidence genuinely refines the classification — toward P1

D-117's rule is that provenance is _a reachability claim proved from the call graph_, and 05 adds: _by construction an author cannot trigger a P2 site at all_.

D-119 proves the exact opposite here. A third-party `InsertionGeometry.resolve` — a **published** middle-tier surface — can return a version-matching gap with neighbours the snapshot does not support, and that fires the site. An author _can_ trigger it, so it cannot be P2 under 05's own definition. The slice therefore does something better than confirm a default: it **retires** the default. `sortable/release-no-proposal` is **P1 on the call graph**, where it was P1 because nobody had looked.

### 6.4 Consequence, and what was corrected

**No shipped byte moves.** The site is un-gated under either reading, its four checks and its identity are unchanged, and no production source states a P-class — checked across all five files the slice touched. The defect is entirely in the record, which is why it is corrected rather than escalated.

Corrected in four places, each marked with a struck-through original and a dated `F-94` citation rather than rewritten: the **D-119 row** and the **F-91 row** in [00-index](../../contract/00-index.md), the **landing note** and the **candidate-slice paragraph** in [plan.md](../../plan.md), and §1.2 and §7.4 of the originating review. F-94 is filed as **tier B, closed by correction**.

**Why tier B rather than C.** F-84 and F-90 were stale sentences a deletion pass did not revisit — true when written. This one was never true, and it was asserted in a ledger row on the strength of a review that cited a record it contradicted. The class is _a citation is not a reading_, and it is worth a row because the chain that carried it is the package's normal one: measurement → review → plan → ledger.

---

## 7. The added allocation

`buildReorderProposal` now builds one `Insertion` it immediately destructures. Sanity-checked against the finding's fourth falsifier — _if a candidate implementation changes the allocation profile, it has exceeded the slice_:

- The site runs **once per operation**, at release, and already allocates the `destinationOf` array (O(n)), the `request`, the `proposal` and the `ProposalBuild` wrapper. One four-field object beside an n-element array is not a profile change in any sense the falsifier was defending against.
- **No per-frame or per-candidate path allocates anything new.** `y()` and `xy()` return the object `insertionAt` built, which is the object they built before. The candidate scan loop is untouched.

The falsifier is therefore **waived with a stated reason** rather than met, and the record states it, in both the ledger and the plan. That is the correct handling. Note that the waiver's reasoning (_once per operation_) would, taken alone, also license giving `homeInsertion` to the owner — the argument that actually separates them is §4's array-versus-object one.

---

## 8. The budgets — right decision, contradicted rationale · **tier C**

**Every figure in the table reproduces exactly.** Rebuilt both trees and re-measured all fourteen rows:

| Row               | before |  landed | Δ brotli | Δ minified | slack now |
| ----------------- | -----: | ------: | -------: | ---------: | --------: |
| minimal           | 10,684 |  10,667 |      −17 |       −115 |       167 |
| minimal (xy)      | 10,344 |  10,329 |      −15 |       −119 |       165 |
| + layoutAnimation | 11,126 |  11,102 |      −24 |       −117 |       174 |
| + landing         | 10,954 |  10,960 |   **+6** |       −115 |       144 |
| complete          | 11,383 |  11,384 |   **+1** |       −115 |       149 |
| free drag ×4      |      — | unmoved |        0 |          0 |       150 |
| both behaviors    | 12,906 |  12,885 |      −21 |       −116 |       171 |
| vocabulary root   |    121 |     121 |        0 |          0 |        29 |
| kernel root       |  6,303 |   6,303 |        0 |          0 |       150 |
| baseline A        | 11,118 |  11,096 |      −22 |       −114 |       172 |
| baseline B        |  6,889 |   6,889 |        0 |          0 |       151 |

Every `budget:` value is byte-identical to `8d4c79d7`, and module counts are unchanged on all fourteen rows. The direction-disagreement observation is real and well made: one edit, a flat −114…−119 B minified, and −24…+6 B compressed.

**The decision not to re-base is sound.** Re-basing would raise two budgets on +6 B and +1 B of compression noise, and a budget that absorbs noise upward stops being an instrument. Nothing here is a regression to chase.

**The stated rationale is not.** It reads: _they already sit at their measurement plus 144–174 B — the ~150 B target, in both directions_. Twenty lines above, in the same doc block, D-118's entry says of a slack range that overlaps it:

> Left alone the slack would have stood at **162–179 B**, which is not the margin this file keeps.

Five of the fourteen rows now sit inside that rejected band — 165, 167, 171, 172 and 174 B — and the same doc block calls the band both _the ~150 B target, in both directions_ and _not the margin this file keeps_, one slice apart. The rule D-118 stated is also unconditional (_budgets follow the landed figure in both directions_ … _whatever the size of the slice_), and applied literally it would re-base the seven rows that **fell** and leave the two that rose, which is not the same decision as declining wholesale.

**Practical exposure is small, and the reason is the correction this file already carries.** D-118's own narrowing established that the marginal cost of a module swings across the headroom on message-text passes alone (154 → 149 → 157 → 155 B), and that _the module claim was never the byte half's to make_ — the graph assertions carry it, and they are untouched. So what the loose rows cost is ~24 B of extra tolerance on three compositions, not a detection capability. **Tier C, and it is the rationale that wants repair rather than the budgets.**

---

## 9. F-93 is correctly separated, and is pre-existing

Verified end to end:

- `insertionAt([], 0, v)` yields `{before: null, after: null}` — pinned by the test.
- [`placeholderAt`](../../src/sortable/placement.ts) returns `true` for that gap: _there is no gap to express_.
- `reconcileCollection`'s start-gap arm refuses it — `before === null` enters the branch, `after !== null` fails, `CHANGE_CANCEL` — and [`spec.ts:1054`](../../src/sortable/spec.ts) maps that to `CANCEL_COLLECTION_INVALIDATED`. The row's cited cancel reason is correct.
- **The producer claim holds.** `homeInsertion` on a one-item snapshot is the only in-package producer: `keyboardInsertion` returns `null` at both edges of a one-item list (`from === 0` and `from === items.length - 1` are the same index), and an axis resolve has no candidate.

**It is not introduced by this slice.** On the pre-slice tree the same one-item incumbent hit the same guard and cancelled identically; the arms' guards did not change. The slice _surfaced_ it, which is what an equivalence proof is for.

**And it is correctly declined.** Whether a `{null, null}` gap survives a replacement is I-14's decision. A constructor that answered it would be F-91 one level up — the construction rule absorbing a survival decision — which is the exact failure the finding's second falsifier named. Tier C is right: the harm is a cancelled drag on a one-item list, and no incorrect reorder can result.

---

## 10. The half of the proof that did not land · **tier C**

The ledger and plan describe the pre-slice proof as covering _every incumbent neighbour pair for `reconcileCollection`, every gap index in and out of range for `buildReorderProposal`_, and — separately — that the rect cache _was included rather than assumed_: `createRectIndex().refresh(...)` driven directly, its `items` compared element-for-element against `destinationOf`.

None of that harness is in the tree. For `reconcileCollection` and `buildReorderProposal` that is correct and requires no defence — they call the owner, so the equivalence is structural (§2). **The rect-index comparison is different.** It is not an arithmetic identity; it is a claim about an incrementally maintained, version-keyed cache under invalidation, scroll, resize and the drag's own mutations — the one of the five spellings that can actually drift — and no landed test asserts it. `incremental-refresh.browser.test.ts` exercises the cache extensively but never compares `index.items` against a destination view; its only assertion on that array is `items.length === 0` after retirement.

So the slice landed an exhaustive guard on the identity that cannot move (pure arithmetic over a filtered array) and left the one that can guarded by a harness that no longer exists. That is an inversion of risk rather than a defect: nothing depends on the cache identity for **construction** — `y()` and `xy()` return the rule applied to whatever array they hold — and the vacuity claim that _does_ depend on it is scoped away in the code comment (§5.1) even though the ledger widens it. **Recorded, not opened as a finding**, because the survivability question belongs to the rect-index cache's own contract rather than to D-119.

---

## 11. Suite, format, provenance

- **60 test files, 1,160 passed, 116 skipped, no type errors** — up from 59 / 1,154 at `8d4c79d7`, which is exactly the six cases the new file adds.
- `npx just fmt` on all seven changed source and bench files leaves the tree clean.
- Size figures produced by `measureAll()` against `npx just build` output on both trees, in sequence, same process shape.

**Limits.** The behavioural equivalence in §1 is an argument from the guards, corroborated by the suite; it is not an exhaustive enumeration, and it did not need to be, because each arm's derived pair is the pair its own guard just matched. The rect-index identity in §10 was not re-proved here — it was checked for _coverage_, and found to have none. One bundler, one browser.

---

LSP plugin - available; used: `findReferences` on `buildReorderProposal` and `homeInsertion` to bound their call sites before judging the allocation argument — the cross-file index returned only the declarations, so the call-site enumeration in §4 and §7 was completed with `grep` and read at each site.