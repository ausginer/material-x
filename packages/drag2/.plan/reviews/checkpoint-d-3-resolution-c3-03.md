# Checkpoint D third review — architect resolution of C3-03

Scope: **C3-03** only, the tiering of the terminal guarantee in [`checkpoint-d-3.md`](checkpoint-d-3.md) §C3-03. C3-01, C3-02 and C3-04 belong to whoever takes them; they are named here only where this decision constrains one, and every editing collision is listed in §What this does not close. **C2-01's substantive decision is not reopened** — the latch stays behavior-owned on `SortableRuntime.closed`, the frozen SPI stays shut, `live` stays on the per-operation view. This is about how the guarantee is _stated_. D2, D5 and L-11 are untouched.

**No production source or test changes.** This is a normative-document decision; the two source obligations it creates are already owed by C3-01.

## Decision

**I-6 keeps the global statement and gains the split in its own row; I-36 stays tier C and stops being the only place the split is written.**

1. **I-6's tier becomes `B for every call the kernel sequences, over a tier-C participant obligation (I-36)`.** Its invariant text keeps all three clauses — including the headline "no callback fires afterwards", which twenty-odd citations depend on — and clause 3 gains an explicit statement of who owns which half, with the I-36 cross-reference _in the cell a reader of I-6 is already looking at_.
2. **I-36 stays tier C** and is unchanged in substance. Two edits: its invariant text gains the **indirect-invocation clause** already normative in three other places, and the sentence "I-6 itself is unchanged and stays tier B for everything the kernel sequences" is replaced, because after (1) it is false.
3. **The tier legend gains a fourth paragraph** naming the combined-rating idiom and its three distinct shapes, so the next partitioned invariant is a routine act rather than a re-finding.
4. **No other invariant carries the same split.** I-13 already carries it and resolved it by the same method one pass earlier; I-24 and I-31 use conditionalization and a stated exception instead; I-7 has a weaker precondition dependency on I-30, named in §5 as a watch item and deliberately not changed.

Both options the review offers are taken, because taken separately each loses something: the combined rating alone leaves the misleading global wording, and the narrowing alone deletes the only global statement of the property the library actually promises a consumer.

**This must land before Checkpoint D closes, and it is not on the critical path.** §6.

---

## 1 — Is the review's diagnosis correct?

**The conclusion is right and the diagnosis is overstated.** The review says the two entries "cannot both describe the whole guarantee at once" and calls the tiers "incompatible". Tested against the normative text, they are not incompatible — one is scoped by the other, explicitly, in words:

> …Placed beside **I-6, which it discharges for the behavior's interior; I-6 itself is unchanged and stays tier B** for everything the kernel sequences. (`05:52`)

and again, at more length, in contract 01:

> **The converse obligation is the participant's, and it is not covered by any of the above** (I-36, added by C2-01). Totality says the sequence above finishes; it says nothing about code that is _already running_ when `destroy()` is entered reentrantly. (`01:349`)

So the umbrella-plus-complement structure exists, is deliberate, and is stated twice. There is no contradiction to resolve, and an implementer told to "fix a contradiction" would be looking for something that is not there. **What is real is three narrower defects**, and they decide a different fix from the one a contradiction would.

**(a) The scope is written in the discharging row, not the row it narrows.** I-36 narrows I-6; the narrowing lives in I-36's cell. A reader of row 22 has no pointer to row 52 — not the ID, not the word "partial", nothing. The direction is backwards: a qualification belongs on the claim it qualifies. This is a discoverability defect that reads as a soundness defect, which is why the review found it.

**(b) The Tier column is unqualified over a compound statement.** I-6 states three properties in one cell. Clauses 1 and 2 — synchronous, terminal, physical release complete before return — are uncontested tier B and always were. Only clause 3 is partitioned. One letter over three properties overstates one of them.

**(c) It breaks the document's own idiom, and that is the strongest form of the finding.** Every _other_ partitioned invariant in this table marks the partition in the Tier column: I-5 `**A** + B`, I-12 `B + C`, I-32 `B, with a stated tier-C residue`, I-34 `B, over a tier-C rendering rule`, I-35 `B for the public sortable composition, over a stated tier-C behavior rule, over a tier-C declaration`. I-6 is the only partitioned entry that does not — in a table whose own preamble says **"the column that matters is the tier"**. Consistency with a stated convention is not cosmetics when the convention is the document's index into its own claims.

**Why it happened, which is the useful part.** I-6 is inherited from the shipped package and probe 1. Its wording predates behaviors driving sequences of consumer calls — before D-13's per-operation views and D-19's feature-private caches there was no such interior. C2-01 was right that I-6's _substance_ was unchanged, and its §9.1 line "I-6 itself is unchanged" is true of the substance. It was wrong to conclude from that that the _row_ needed no edit: the substance did not change, but the set of things the row now has to distinguish did. That is a normal consequence of adding a complement to an umbrella, and it is a one-pass-late correction, not a design error.

**Was C2-01's own artifact claim right?** The review's line _"until then I-6 and I-36 are observably false"_ — asserted about C3-01, the post-abort geometry read — is correct, and correct for a reason C3-03 sharpens. Three documents already state the strong form of the stop:

- C2-01 §4A: "call no further resolver **and read no further geometry**";
- **contract 03 §410** — normative, ranked — "calls nothing further, **reads no further geometry**, and leaves the cache in the **retired** state";
- README §57: "no later candidate is resolved, **no geometry is read**".

**I-36's own row states neither.** It says "calling nothing further, publishing nothing". So on the letter of the invariant table, C3-01 is arguably not an I-36 violation at all — which is a second latent gap in the same row, and the one that would have let C3-01 be argued away. It is falsified against contract 03 today. §3.2 closes the table's half of it.

## 2 — Is the I-34 / I-35 precedent the same shape?

**Verified, and it is not — I-34 is a different relation, I-35 is close, and the exact precedent is I-13, which the review did not name.** The table uses one label family for three logically distinct relations, and picking the wrong one imports the wrong reading.

| Relation | What the C half is | Entries | Fits I-6? |
| --- | --- | --- | --- |
| **Precondition** — the B guarantee holds mechanically, and its _meaning_ depends on a rule the participant obeys | an assumption | I-34 | **No** |
| **Sub-property** — a compound claim whose named parts have different owners | a different part of the sentence | I-35, I-12, I-5 | Partly |
| **Quantifier partition** — one property, universally quantified, enforced by different parties over different call sites | the same property, elsewhere | I-32, **I-13**, I-6 | **Yes** |

**I-34 is a precondition, not a partition.** Its B half — `LandingContext.from` is read from the kernel's own session, which records exactly what `write(x, y)` composed — is _unconditionally_ true. The C residue ("a behavior renders only through `lift.write`, and only before `from` is sampled") does not carve out a region where the B guarantee fails; it is the assumption under which the guarantee _means_ what the reader wants it to mean. Violate it and I-34 still holds literally — the recorded delta is still the last thing the session composed — while becoming useless. That is why I-34's own row calls the violation "unsupported discipline, not a prevented act" and why the D-35 test matrix documents it as "discipline rather than a guarantee". Reusing its wording for I-6 would tell the Phase 18 author that a behavior violating I-36 leaves I-6 _technically true_. It does not: a `visual()` resolver called after `destroy()` returned falsifies "no callback fires afterwards" outright. **Rejected on that ground.**

**I-35 is closer but still not it.** Its B and C halves are different _parts of a compound sentence_ — the hold, the deadline and the once-only latch (kernel) versus cross-operation identity (behavior) versus declaring at all (consumer). Three named sub-properties, three owners. I-6 clause 3 is one property quantified over every foreign call in the system; it is partitioned by _where the call sits_, not by which sub-clause it belongs to. I-35's label form is nonetheless the right _syntax_ — "B for X, over a tier-C Y" — and §3.1 adopts it, because the syntax is the document's and the relation is carried by the words inside it.

**I-32 is the true idiom peer.** "A declined admission leaves everything untouched… no `preventDefault()`" is one property quantified over actors: the kernel guarantees it for the call it owns (B), and the contract _forbids rather than prevents_ an admission member holding the real `Event` from doing it itself (C). Same shape, same reason, same non-promotability. Its label is `B, with a stated tier-C residue`.

**I-13 is the precedent that decides the fix, and the review missed it.** It is the only entry in the table that already had exactly I-6's problem and already solved it:

> | I-13 | No **kernel-ordered** irreversible action occurs while the committed frame describes a state that action has invalidated | B | Generalised from D-6. Scoped to actions the kernel sequences — motion closure, capture release, presentation disposal. Arbitrary irreversible work inside a behavior `prepare`/`effect` is outside the capability model and stays tier C. |

Generalised from D-6, scoped by putting **"kernel-ordered" into the invariant's own text**, with the behavior-interior residue named in its own mechanism cell. That is the review's second option, executed one invariant earlier, on the same partition, by the same reasoning. **C3-03 is the I-13 correction applied to I-6 one pass late** — which is worth saying in the row, because it converts a finding into a pattern the next reviewer can check for.

**Where I-6 differs from I-13, and why the fix is not a pure narrowing.** I-13's residue is _disclaimed_: arbitrary irreversible work inside a behavior seam is "outside the capability model" — the contract promises nothing about it, so narrowing and stopping is honest and complete. I-6's residue is **promised**: I-36 promises it, at tier C, with a mechanism, four barrier sites and nine test cases. A narrowing that stopped where I-13 stops would leave a reader of I-6 concluding the interior is unpromised, which is worse than today's error, not better. So the residue must be _named and pointed at_, not merely excluded. That is the whole of why the recommended fix is narrow-**and**-complement rather than either alone.

## 3 — Exact replacement text

Format matches the document's own: single-line table rows, `**bold**` for the load-bearing clause, section links as `§[NN](NN-file.md)`.

### 3.1 · `05-lifecycle-invariants.md:22` — I-6, replace the whole row

```
| I-6 | `destroy()` is synchronous and terminal; physical release completes before it returns; **no callback fires afterwards** — a global property with two owners: the **kernel** enforces it for every call it sequences, and the **participant** owes it for the interior of any callback that itself drives a sequence of consumer calls (I-36) | B for every call the kernel sequences, over a tier-C participant obligation (I-36) | Seven-step teardown, §[01](01-construction-ownership.md). **Clauses 1 and 2 are unqualified B** — the teardown runs to completion before `destroy()` returns and nothing a participant can do prevents a later step. **Clause 3 is the partitioned one, and it is partitioned by call site rather than by sub-property**: the kernel's barriers are complete *at the kernel's granularity of one callback* — `runAdmission` revalidates after an admission member returns, `preparationValid()` runs between prepare and commit, `runReleaseSeam` executes only a non-null staged command, the landing and join paths revalidate on both sides of every foreign call (F-30, F-38) — and a participant has no opportunity to get any of those wrong. What they cannot reach is the **interior** of a callback that calls consumer code more than once, because a reentrant `destroy()` runs all seven steps and then returns into the middle of that sequence. That residue is **I-36**, is tier C, and is **not promotable**: wrapping those calls would require the kernel to know a behavior's consumer surface (H-1, H-2, D-4). Rated an unqualified **B** until Checkpoint D review 3 (C3-03). The scope was correct from C2-01 onward but was written only in I-36's cell and in §[01](01-construction-ownership.md) §Teardown, never here and never in the column this document calls the one that matters — the same defect I-13 had already corrected for irreversible actions by scoping its own wording |
```

### 3.2 · `05-lifecycle-invariants.md:52` — I-36, two surgical edits, tier unchanged at **C**

**Edit 1 — the invariant text.** Replace:

> …stops on the first closed reading — calling nothing further, publishing nothing, and leaving any cache it was rebuilding in its retired state

with:

> …stops on the first closed reading — **invoking no further consumer code, including indirectly through a consumer-owned object** (an overridden `getBoundingClientRect()` on a consumer-authored placeholder is a consumer call, not a layout read), publishing nothing, and leaving any cache it was rebuilding in its retired state

**Edit 2 — the mechanism cell.** Replace the sentence:

> Placed beside **I-6, which it discharges for the behavior's interior; I-6 itself is unchanged and stays tier B** for everything the kernel sequences.

with:

> **This row is I-6's third clause at the one granularity the kernel cannot reach**, and since C3-03 I-6's own row carries the split rather than leaving it stated only here: I-6 is tier B for every call the kernel sequences, this is the tier-C complement, and the two together are the whole of the terminal guarantee — neither is the whole on its own. **The indirect-invocation clause is not new scope.** C2-01 §4A accepted "call no further resolver _and read no further geometry_", §[03](03-feature-composition.md) §`y()` and §`xy()` states it normatively, and the README publishes it; this row was the only one of the four that omitted it, which is exactly the omission that would let a post-terminal geometry read be argued as conforming.

### 3.3 · `05-lifecycle-invariants.md:7` — the provenance preamble, replace the trailing clause

Replace:

> …and **I-36 by Checkpoint D review 2** (C2-01). The column that matters is the tier:

with:

> …and **I-36 by Checkpoint D review 2** (C2-01), whose third review re-tiered **I-6** to carry in its own row the split I-36 had stated only in its mechanism cell (C3-03). The column that matters is the tier:

### 3.4 · `05-lifecycle-invariants.md:13` — the tier legend, insert one paragraph after "Probe 1 had every one of these at tier C."

```
**A combined rating is not hedging.** Where a property is partitioned, the Tier column names both halves, because one letter over a compound statement overstates one half and hides the other. Three distinct relations wear the same label family and should not be read as one: a **precondition**, where the B guarantee holds mechanically and its meaning rests on a rule a participant obeys (I-34); a **sub-property** split, where a compound claim's named parts have different owners (I-5, I-12, I-35); and a **quantifier partition**, where one property is enforced by different parties over different call sites (I-6/I-36, I-32, and I-13, which carries its partition in the invariant's wording instead). An unqualified letter over a partitioned property is a defect, not a simplification — C3-03 is the last one found.
```

### 3.5 · `01-construction-ownership.md:349` — one clause, so 01 and 05 agree on the tier

In the converse-obligation paragraph, replace the closing sentence:

> The mechanism is behavior-owned and not promotable; see §[05](05-lifecycle-invariants.md) I-36 and F-47.

with:

> The mechanism is behavior-owned and not promotable, so this half of the terminal guarantee is **tier C** while everything above it is tier B — §[05](05-lifecycle-invariants.md) I-6 carries that split in its own row, and I-36 and F-47 state it.

## 4 — Consistency sweep

Executable as written. Every anchor was checked against the current files; line numbers will drift if C3-01/C3-02/C3-04 land first, so match on the quoted text.

### Required

| # | File · anchor | Change |
| --- | --- | --- |
| 1 | `contract/05-lifecycle-invariants.md:22` | Replace the I-6 row — §3.1 |
| 2 | `contract/05-lifecycle-invariants.md:52` | Two edits to I-36; tier stays **C** — §3.2 |
| 3 | `contract/05-lifecycle-invariants.md:7` | Provenance preamble — §3.3 |
| 4 | `contract/05-lifecycle-invariants.md:13` | Tier-legend paragraph — §3.4 |
| 5 | `contract/01-construction-ownership.md:349` | One closing clause — §3.5 |
| 6 | `contract/05-lifecycle-invariants.md:503` | Test-matrix group _Terminal barrier in a resolver sequence_: append one case — _"and the same abort reads no geometry through a consumer-owned object: a `visual()` resolver that destroys mid-rebuild is followed by **zero** `getBoundingClientRect()` calls on the consumer-supplied placeholder, instrumented on the element rather than inferred from the resolver list (C3-01, the acceptance condition for I-36's indirect clause)."_ **Collision — see §7.** |
| 7 | `contract/05-lifecycle-invariants.md:355` (F-47 ¶1) | "the synchronous terminal barrier I-6 forbids crossing" → "the synchronous terminal barrier I-6 forbids crossing, at the tier-C half of it I-36 now names". F-47 is the finding that produced the complement; leaving it citing the umbrella flatly is the same error one section down |
| 8 | `ledger.md:247` (L-12) | After "Closed as **I-36**, tier C", insert: "— and, at the third review (C3-03), **I-6's row re-tiered** to `B for every call the kernel sequences, over a tier-C participant obligation`, so the umbrella states the split instead of leaving it in the complement's cell" |
| 9 | `plan.md:795` (C2-01 row) | After "Closed as **I-36** (tier C, non-promotable) and **F-47**", insert: "; the third review (C3-03) completed the pairing by re-tiering **I-6** itself, which C2-01 had left at an unqualified B" |
| 10 | `plan.md:809+` §Phase 18 | Add a C3-03 row under Checkpoint D, and see #11 |
| 11 | `plan.md:820` (Phase 18 deliverable) | Add one sentence: **"Read I-6 and I-36 as one pair before starting. I-6's tier states which half the kernel gives you free (`B for every call the kernel sequences`) and which half is yours (`over a tier-C participant obligation`); the enumeration below is the free-drag instance of the second half."** This is the finding's stated motivation and the acceptance test for this decision — §5 |

### Checked, no change needed — recorded so they are not re-swept

| File · anchor | Why unchanged |
| --- | --- |
| `contract/00-index.md:63-69` tier table | Defines A/B/C generically; carries no per-invariant rating. The §3.4 legend paragraph deliberately lives in 05, where the ratings are |
| `contract/00-index.md:153` (D-29) | "an unwrapped throw made `destroy()` non-terminal against I-6" — a _kernel_ teardown step; squarely the tier-B half |
| `contract/00-index.md` §Preserved from probe 1, "Synchronous and terminal `destroy()`" | A pointer to 01 §Teardown with no tier claim |
| `contract/01-construction-ownership.md:307` | "a discrete listener can never outlive I-6's terminal barrier" — kernel-owned ingress abort; tier-B half |
| `contract/01-construction-ownership.md:330` | Individually wrapped frame resets; kernel; tier-B half |
| `contract/02-kernel-behavior-contract.md:1002` | "Calling the consumer's runner after that violates I-6" — the kernel calling `start` after a behavior's `anchorTarget` destroyed. Kernel-sequenced, barrier present (F-38); tier-B half |
| `contract/02-kernel-behavior-contract.md:1411` | `destroy()` exempt from the queue, "stays the synchronous terminal barrier I-6 requires" — clause 1, unqualified B |
| `contract/03-feature-composition.md:349, 410` | Already state I-36 and already carry the geometry clause. §3.2 brings 05 up to 03, not the reverse |
| `contract/05:271` (F-36), `:283` (F-38) | Both kernel-sequenced. `:283`'s "violating I-6's 'no callback fires afterwards'" stays verbatim — **this is why clause 3's global phrase is retained rather than narrowed away**; narrowing I-6 to kernel-only would still leave this citation valid, but the phrase is load-bearing in ~6 places and deleting it buys nothing |
| `ledger.md:96` (parity, "Silence after `destroy()`") | Describes behavior, cites I-36, asserts no tier |
| `README.md:57` | Already states the strong form including "no geometry is read". Correct as a _contract_ statement; currently ahead of the artifact because of C3-01. **Do not edit** — C3-01's fix makes it true |
| `src/**`, `tests/**` | 24 call sites cite I-6 or I-36; **none asserts a tier**. Every I-6 citation in `src/kernel/` is a kernel-sequenced site (tier-B half) and every one in `src/sortable/` already pairs I-6 with I-36 (`spec.ts:484-486`). No source change follows from this decision |

### Other invariants with the same latent split

**None. The split is unique to I-6 among unqualified-B entries**, and the reason is structural rather than lucky.

Every plain-B entry was checked against the test _"is any part of this guarantee owed by a participant rather than ordered by the kernel?"_: I-1 (kernel-private queue and drain), I-3, I-4 (both checks kernel code), I-8, I-9, I-11 (`dispose()` withheld from the scope), I-16, I-19 (kernel wraps every disposer and hook), I-21, I-22 (kernel-private latches), I-23 (`finalized()` after `presentation.dispose()`, both kernel), I-29, I-33. All clean: in each, the kernel both owns the ordering **and** is the only party with a call site inside it.

**Why I-6 is the exception.** It is the only invariant whose property is quantified over _every foreign call in the system_ rather than over a named step the kernel orders. Every other B entry names its step — "release closes motion after `RELEASING` is committed", "the two settlement gates are independent", "precedence `DESTROY > CANCEL > FAILURE_CHECKPOINT`" — and a named step has exactly one owner by construction. A universally quantified property does not; it acquires a new owner the moment a participant gains a call site the kernel cannot see, which is what D-13's per-operation views and D-19's feature-private caches did. **F-47's table is the enumeration that made this visible**, and it is the reason C2-01 called the class "wider than sortable". No other invariant in the table is quantified that way, so no other can acquire the split by the same route.

Three entries were examined and rejected as instances, each for a different reason worth recording:

- **I-13** — the same partition, **already carried** in the invariant's own wording ("No **kernel-ordered** irreversible action…") with the residue named in its mechanism cell. Not a latent split; the precedent (§2).
- **I-24** — B with three stated preconditions, one of which (runner control relinquished) depends on a consumer runner's `destroy()`. Resolved by **conditionalizing the statement** — the conditions are bolded inside the invariant text and the mechanism spells out what happens when each fails. A different, legitimate device; changing it would be churn. Same for **I-31**'s "one admitted two-fault gap, documented at both ends".
- **I-7** — _"During a long landing the lift and placeholder stay owned"_, rated B. The lift is kernel-owned and the style lease is kernel-latched, but the **placeholder's** ownership is a disposer the _behavior_ registers on the presentation lifetime, so I-7's first clause rests on I-30's register-before-visible rule, which is tier C. **A precondition dependency, not a partition** — the kernel's guarantee is "whatever was registered is disposed", which holds unconditionally — and I-30 already exists as its own row. Recorded as a **watch item, not a change**: if a future review finds a site where the window between visibility and registration is observable, I-7 becomes an I-34-shaped combined rating. It is not one today and inventing the qualification now would weaken a true claim.

## 5 — What the Phase 18 author gets

The finding's stated motivation, so this is the acceptance test. The free-drag author opens `05` §Invariants and must be able to read off four things **without leaving row I-6**:

| Must read off | Delivered by |
| --- | --- |
| **The promise to a consumer is global** — after `destroy()` returns, none of your code runs | Clause 3's headline is retained verbatim. This is what pure narrowing would have deleted, and it is the sentence a consumer-facing README paraphrases |
| **The kernel does not enforce all of it** | The Tier column says so at a glance: `B for every call the kernel sequences, over a tier-C participant obligation`. Under the old label the same reader saw `B` and stopped |
| **Which part is mine** | "the participant owes it for the interior of any callback that itself drives a sequence of consumer calls" — a _criterion_, not a list of sortable sites. Free drag's callbacks are different; the criterion is what transfers |
| **Where to go next** | `(I-36)` appears twice in the row, including inside the Tier cell |

Then I-36 supplies the operative detail, and after §3.2 it supplies all three shapes of "stop" rather than two: call nothing further, **observe nothing further through a consumer-owned object**, restore the retired state. The third was already normative in 03 and the README and was the one missing from the table; a Phase 18 author who read only the table would have built a barrier that stops calls and keeps measuring.

The pairing is then made unmissable at the deliverable itself (sweep #11), because a table is read by whoever opens it and a deliverable is read by whoever is assigned it. **Confirmed against the deliverable's own wording** (`plan.md:820`): it asks for a table of "who invokes it, whether the kernel already revalidates around it, and — where the behavior drives the sequence — which liveness reading the site has". Those three columns are exactly the B half, the boundary and the C half. After this change the invariant table and the deliverable describe the same partition in the same terms; before it, the deliverable was more honest than the invariant it implements.

**The C3-01 dependency, stated because the task asks.** This decision is **independent of C3-01 landing**. The tiering is a statement about ownership, and ownership does not change with conformance. Two directional notes:

- C3-01 does **not** gate this. A contract may state a requirement its artifact does not yet meet — it already does, in contract 03 §410, which is normatively ranked and is the citation C3-01 currently lacks.
- This **helps** C3-01, in two ways. It gives the fix a row in the invariant table to cite instead of a review decision (§3.2's indirect clause), and it locates the fix: under the new tiering, a post-terminal geometry read falsifies the **tier-C half**, which says the barrier belongs in the behavior — `y.ts`/`xy.ts` or `RectIndex`'s return channel — and not in the kernel. That agrees with the review's own suggested remedy and rules out the wrong reading of "I-6 is observably false", which would send someone into `kernel.ts`.

## 6 — Does this block Checkpoint D?

**Yes for closure, no for sequencing.** It must land before D closes; nothing else waits on it.

**Why it must land.** The argument is C2-01 §10's, and it applies with more force here than there. Checkpoint D is _"the last cheap moment to change anything sortable-shaped that leaked into the kernel"_, and D is the last checkpoint before a second behavior. C2-01 decided **how** a behavior discharges a kernel invariant; C3-03 decides **what the second behavior's author is told that invariant is**. Closing D with I-6 at an unqualified B ships a table stating that the kernel guarantees a property the same table, thirty rows down, says it cannot — and it ships it to precisely the reader who has an explicit deliverable predicated on the opposite. The concrete failure mode is not abstract: a Phase 18 author who reads `B` against I-6 has a defensible reason to treat the enumeration deliverable as belt-and-braces, skip it, and rediscover F-47 at Checkpoint E against a behavior whose consumer surface is larger than the sortable's. That is the scenario C2-01 §8 named and the review is right to name again.

The secondary argument is cost asymmetry. This is **five markdown files, no code, no measurement, no rebuild, no test run** — three table rows and eight one-line citations, several in documents C3-02 and C3-04 are already opening in the same pass. Nothing about it becomes cheaper by waiting, and after Phase 18 starts it becomes strictly more expensive, because a second behavior will have been written against whichever reading its author took.

**Why it is not on the critical path.** It creates no source obligation of its own — the two things §3.2's indirect clause makes checkable are already owed by C3-01, which is independently a blocker at **major**. It can be applied before, after or between C3-01, C3-02 and C3-04, in any order, with one collision to sequence (§7). If the closure pass is time-boxed, this is the item to do **last** and the one that cannot be dropped.

**One thing it does not do:** it does not close C3-01, and D stays open on C3-01 and C3-02 regardless. C3-03 is rated moderate and is a documentation defect; nothing here converts it into a runtime one.

## 7 — What this decision does not close

- **C3-01 stays open and is unaffected in substance.** §5. **Editing collision:** sweep #6 appends one case to the _Terminal barrier in a resolver sequence_ group in `05:503`, and C3-01's remedy requires mirrored `y()`/`xy()` geometry regressions that will want a row in the same group. **Whoever goes second should rebase, not re-resolve** — the normative clause is §3.2's and is not renegotiable by the test-writing pass; the test rows are C3-01's and are not prescribed here beyond the one-sentence obligation. If C3-01 lands first, #6 may already be satisfied in substance; check the group for a geometry-instrumented case before adding one.
- **C3-02 stays open.** No collision: it edits `00:158`, `02:59-61/229/237-240/335-345/590/1181/1311-1317/1431-1435` and `03:825-832`; this decision edits `01:349`, `05:7/13/22/52/355/503`, `ledger:247`, `plan:795/809+/820`. Disjoint. The `02` citations this decision _checked_ (`:1002`, `:1411`) are terminology-neutral and are not in C3-02's list.
- **C3-04 stays open.** No collision. One adjacency: C3-04 corrects the `+30–70 B` figure in `checkpoint-d-2-resolution-c2-01.md`; this decision does not edit that file, and §9.1 of it remains the record of what C2-01 decided — **its "I-6 itself is unchanged" line is superseded by this document and should be left as written**, since resolution records are historical.
- **A naming hazard for whoever applies this.** Checkpoint **C** review 3 also used IDs C3-01…C3-04, and they appear in `plan.md:579/627/633` and in `05`'s test matrix (`:457`, "the same contradiction reached early … (C3-01)"). Those are the _readiness-acknowledgement_ items and are unrelated. Every C3-0x written in this document means **Checkpoint D review 3**; when adding rows to `plan.md`, disambiguate as "Checkpoint D review 3 (C3-03)" at first use, as `plan.md` already does for the C2-0x series.
- **C2-01's mechanism is not undermined.** Nothing found here argues against the behavior-owned latch, the shut SPI or `live` on the per-operation view. The opposite: the partition is only statable _because_ the mechanism has a clean owner boundary. Had the fix been kernel-supplied liveness, I-6 would have stayed an unqualified B and this finding would not exist — which is a cost of the chosen design, correctly paid, and now correctly written down.
- **I-36 is still not promotable, and the falsifier is unchanged.** A third behavior needing its own copy of the latch (C2-01 §8) remains the stated condition under which a kernel-supplied controller-lifetime liveness earns its SPI cost. If that ever lands, I-6's tier goes back to an unqualified B and I-36 is retired — this decision makes that a one-row edit rather than an argument.
- **The `panic()` blind spot is untouched.** A `panic()`-initiated `destroy()` still does not set the behavior's latch; the reachability argument stays C2-01 §3's and F-47's. Note the interaction: it sits in the **tier-C** half, which after §3.1 is where a reader now expects to find a residue with a stated limit rather than a hole in a tier-B claim.
- **I-7's dependency on I-30 is recorded, not changed.** §4.
- **No production source or test file is touched.** Verified: `git status` in `packages/drag2` shows `src/` and `tests/` clean.