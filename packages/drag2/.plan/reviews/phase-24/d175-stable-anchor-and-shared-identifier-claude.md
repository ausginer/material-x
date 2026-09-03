# An entry's anchor is its address, and an identifier has no letter budget

**Read at `8b896721`**, branch `drag2/fin-review`, on 2026-09-03. D-174's ownership disposition is not revisited, no content is moved, D-173/D-174 are not implemented, package scopes are unchanged.

Two details of D-174's linking and integrity mechanism, both of which the owner reported and both of which are real.

---

## 1. The link is dangling, and the repository proves the slug rule against itself

D-174 wrote the reciprocal pointer as `[F-2](00-index.md#f-2)` against the heading

```
#### F-2 — Part factories must be deterministic and folded in a fixed order for both frames; TypeScript proves neither
```

**A GFM anchor is derived from the heading's whole rendered text**, and this repository already carries an authored, working instance of that rule. `.plan/reviews/checkpoint-b/drag2-review-B-claude-2.md:14` links `#n-3--the-fix-passes-cost-04-05-kb-brotli`, and its target at line 351 is:

```
### N-3 — The fix passes cost 0.4–0.5 kB brotli
```

Lowercase; drop everything that is not alphanumeric, space or hyphen — so the em dash and the decimal points vanish and leave their surrounding spaces; spaces become hyphens. Applied to F-2 the anchor is `#f-2--part-factories-must-be-deterministic-and-folded-in-a-fixed-order-for-both-frames-typescript-proves-neither`. **`#f-2` addresses nothing.**

The defect is authored in two places today — `00-index.md:1551` inside D-174's own entry, and `d174-satellite-finding-ownership-claude.md:63` — and it was about to be authored forty-eight more times. It is recorded as **F-288**.

**This is the only heading-slug fragment in the current-state tree that points at an entry.** Of 576 fragment links under `.plan/`, all but a handful are `#Lnn` source line targets; the one other cross-document heading fragment is `07-free-drag-contract.md:7 → 00-index.md#normative-precedence-and-freeze`, which targets a **section**, not an entry, and works.

---

## 2. The stable canonical anchor is the qualified address, and a fragment never targets an entry

**Rule, for every canonical entry rather than for the forty-eight.**

> An entry's canonical anchor is its qualified address, `<scope>:<local-id>` — `drag2:F-2` — resolved by `.scripts/entry.sh`. A Markdown link that accompanies a citation names the **document**, and may carry a fragment only when that fragment targets a **section** heading that carries no identifier. **No link may target a canonical entry by heading fragment.**

So the satellite's pointer line and the register's reciprocal line become:

```
**Canonical entry: `F-2` — [`00-index.md`](00-index.md) §Findings.**
```

**Why this is the stable one.** It is stable under retitling because the identifier _is_ the key and the title is not part of it. It survives the formatter because it is plain text with no markup to normalise. It needs no artifact on any of the 505 entries, which is what makes it a rule rather than 505 obligations. And it is the only candidate that arrives **already instrumented**: `references.node.test.ts` scans identifiers in exactly these anchored positions and requires each to resolve to a canonical entry, and it resolves `§Findings` against `00-index.md`'s own headings. A fragment link, by contrast, is validated by nothing in this repository — which is how `#f-2` was authored twice without a complaint.

**It is also the mechanism the package already chose.** `.scripts/entry.ts`'s own docblock argues that the address is qualified from the first release and that a second, unqualified convenience form _is the thing every caller ends up written against, and it cannot answer once two scopes exist_. A heading fragment would be that second form, with a browser as its only resolver.

### The three alternatives, and why each is worse

**Freeze entry titles so the full slug is stable.** Rejected: the record amends entries as a matter of course — `corpus-equivalence.ts`'s `AMENDED` register exists for exactly that — and this would make 505 titles immutable to buy a link. It also makes every link a hundred characters of restated title, which rots invisibly the moment one word changes.

**Drop the title from the heading — `#### F-2`, statement on the next line.** The slug becomes `f-2`, pure Markdown, no HTML. Rejected: D-171's whole gain was that the heading carries the statement, and this trades the index's skimmability and its rendered outline for a link target.

**A per-entry HTML anchor, `<a id="f-2"></a>`.** This one survives the formatter — verified: `npx oxfmt` leaves it untouched both on its own line and inline in a heading. It is rejected on two other grounds. It is a **second addressing mechanism** for a thing that already has one, and its `id` is rewritten by GitHub's sanitiser to `user-content-f-2`, so its validity is a property of the renderer rather than of the record. **It is available on condition**, and the condition is the one F-231 failed: if the owner wants click-through, the anchor lands with an assertion in `tests/ledger.ts` that every canonical entry has exactly one anchor and that its `id` equals the entry's identifier. An uninstrumented anchor is a convention, and a convention that 505 entries must satisfy will not survive the 506th.

---

## 3. One identifier grammar, and the cap already bites

`ENTRY` (`tests/ledger.ts:123`), `OPENS_ENTRY` (`:639`) and D-174's proposed `CLAIM` all spell the identifier `[A-Za-z]{1,3}-\d+`. The reader contract makes the local id an **opaque exact key with no prefix whitelist** — `entry.ts`'s `ADDRESS` already reads it as `(.+)` — so the cap is a restriction those three expressions impose and the contract does not.

**Requirement.** One definition, exported from `tests/ledger.ts`, from which `ENTRY`, `CLAIM` and `OPENS_ENTRY` are built:

```
LOCAL_ID  =  [A-Za-z][A-Za-z0-9]*-\d+
```

A letter, then letters or digits, then a hyphen and digits. `BQ-9`, `SPACE-01`, `SC-7`, `C1-05` and `CE2-10` are all one shape; nothing is a family name to this grammar, which is the point.

**Widening costs nothing today, and that is measured, not assumed.** Across every current-state document, the count of claim-shaped headings is **544 under the capped grammar and 544 under the widened one** — zero new matches, zero false positives. The cap is buying no present safety.

**And it is already losing real citations.** Widening the same grammar in `references.node.test.ts`'s citation scanner surfaces six identifiers it cannot currently see, and three of them are genuine: **`P18A-04`, `P18A-08` and `P18A-12` are cited inside canonical entries**, at `00-index.md:861`, `:869` and `:877`, each naming the review finding a decision answers — and all three are invisible because `P18A` is four characters. The owner's `BQ-9` is not hypothetical; the record already contains identifiers its own instruments cannot read.

**The citation scanner is not widened in this pass, and the reason is measured too.** The same six include `ORDINAL-0`, a literal inside a table string in `tests/perf/p01-write-cost.browser.test.ts:823`, and `api-1`, a review's name in test prose. Making them visible turns them into citations that must resolve to canonical entries, and whether a review-scope identifier such as `P18A-04` is citable is its own adjudication. It is recorded as **F-290** and left open.

`corpus-equivalence.ts`'s `ID` is deliberately **not** unified. It reads a `git show` of a ref from before the migration, and the corpus it describes is frozen; a historical reader that grows with the grammar would be describing a document that cannot change.

---

## 4. The invariant has a second clause, and four headings depend on it

D-174 stated the integrity check as one rule: an identifier opens a heading only at `####`, once. Applied literally it fails four legitimate headings that exist today:

```
##### D-62 §The unresolved arm — **resolved by D-66**
##### D-66 §The progress marker
##### D-68 §Published is not must-name
##### D-68 §What self-contained means, and what it does not settle
```

Each opens with an identifier at depth five. **Each is a named sub-clause of an entry, not a claim on one** — `references.node.test.ts:348` already documents the form: _a heading may itself carry a `§`, and the part after it is the name a citation uses_. And each is verified to nest inside the entry of its own identifier: line 668 under `#### D-62` at 660, 720 under `#### D-66` at 712, 758 and 769 under `#### D-68` at 750.

**So the delimiter after the identifier is what separates a claim from a sub-clause, and it is load-bearing.** The full invariant:

> **A claim** is a heading whose identifier is followed by `—` or by end of line. Every claim sits at `####`, in the document that owns its family, and no identifier is claimed more than once across the current-state tree.
>
> **A sub-clause** is a heading whose identifier is followed by ` §`. It is legal at any depth **deeper than** `####`, and it must be nested inside the entry claiming that same identifier.
>
> Any other identifier-opening heading is neither, and is a defect.

Without the second clause the `§` form is an unguarded way to reintroduce precisely the hiding F-287 records: `### F-2 §analysis` would claim an identifier at the wrong depth and pass a check that only looked for `—`. D-174's structural argument — _a heading whose first token is an identifier is an ownership claim at any depth_ — is preserved and made complete, not weakened: the sub-clause form is still an ownership claim, and the check now asserts where it must live.

The extractor is still unchanged. `ENTRY` answers _what can I address_; `CLAIM` answers _what claims to be addressable_; they now share one spelling of an identifier and keep their two different questions.

---

## 5. The three failures stay distinguishable

`entry.ts` needs no change for the grammar — its local part is already opaque — and its three refusals stand as written: **unknown scope** (an address for a package this build cannot resolve), **unknown local id** (a citation of something the record never states), **duplicated local id** (a defect in the record that a first match would hide).

The `CLAIM` check adds a second producer of a duplicate report, and the two must not be merged. `entry.ts` reports a duplicate among the entries it can **extract**; the integrity check reports a duplicate among everything that **claims** an identifier at any depth. The second is what finds F-287's forty-seven; the first is what an address resolution owes its caller at the moment it fails. Collapsing them would put the record's integrity assertion behind a lookup that has to be attempted first.

---

## 6. What this changes for the pending migration

The boundary D-174 set is unchanged: D-173's three satellite tables, the forty-eight claim rewrites, and the `CLAIM` check landing last as the gate on both. What this decision changes inside it:

1. Each of the forty-eight pointer lines and each reciprocal line uses the address form, not `#f-2`.
2. `00-index.md:1551` and `d174-satellite-finding-ownership-claude.md:63` are corrected in this pass, so the broken form is not copied from the record that specifies it.
3. `ENTRY`, `OPENS_ENTRY` and the new `CLAIM` are built from one exported `LOCAL_ID`.
4. The `CLAIM` check asserts both clauses of §4, and its expected failure count on today's tree is unchanged — 47 duplicate claims and 48 off-depth claims — because the four `§` sub-clauses were never in either count.

No production code, no tests and no records are migrated here.