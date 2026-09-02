# The three satellite tables: an address, a subject with two facets, and a missed sibling

**Read at `a070425b`**, branch `drag2/fin-review`. No migration was implemented, no reader was changed, and no value-keyed table was reopened. F-286 named three tables and said each is blocked by a different thing. That is right, and the three answers are not variants of one answer.

---

## 1. `I-*` — the identifier is an address, and the corpus has already decided this

**The question F-286 poses is real but it is not open**, because D-171's own migration answered it sixteen times.

`05-lifecycle-invariants.md` §Invariants keys thirty-seven rows on `I-1`…`I-37`, and the thirty-fifth is written `~~I-35~~`. Its row also carries a struck **Tier** value — `~~B for the public sortable composition…~~ — retracted` — and a Mechanism cell that opens _Retracted with D-33 (D-41)_. So the row marks up two different things, and they are not the same kind of thing.

**Look at what the landed migration produced.** Sixteen headings in the current-state documents carry strikethrough, and every one of them puts it in the **title**, never in the identifier:

```
#### F-62 — ~~The kernel classifies two behavior-generic seams…~~ · resolved
#### F-63 — ~~D-34 and D-35 are contract-normative and unimplemented…~~ · resolved
#### F-78 — ~~`kernel/dev.ts`~~ strips author-facing assertions on a premise Revision 2.1 voided
```

And every superseded decision — D-88, D-150, D-162, D-164, D-167, D-169 — has a **clean** heading with the supersession stated as the body's first sentence and the retired text struck inside it. **No entry in the migrated corpus marks up its own identifier**, and nothing was lost in producing that.

**So the rule is already in force and only needs stating**: a canonical identifier is an **address**, and an address is literal. Strikethrough on a title, a value or a clause is **content** and is preserved exactly — `tests/ledger.ts` is right that a struck span is content, and that is why the Tier cell's tildes stay. Strikethrough on the identifier is **presentation of a fact stated in prose beside it**, and I-35 is the clearest possible case: its very next words are _Deleted by D-41 (Revision 2), together with the protocol it described._

**I-35 becomes:**

```
#### I-35 — ~~A consumer cannot create or supersede the kernel-owned readiness hold~~ · deleted by D-41 (Revision 2)
```

with the deletion notice as the body's opening sentence, the retracted Tier preserved struck, and the _Original text follows_ passage intact. **Nothing is discarded and nothing is invented**: the retirement fact appears three times after the change and appeared three times before it — in the title, in the opening sentence and in the Tier — and the only thing removed is a pair of tildes that no longer had to carry it.

**The rule is already compiled in, which is why this is a statement rather than a choice.** `tests/ledger.ts` recognises an entry by

```
/^#### ([A-Za-z]{1,3}-\d+)(?: — (.+))?$/u
```

The identifier position admits letters and digits and nothing else; the title after the em dash admits anything, which is why sixteen struck titles pass through it. **`.scripts/entry.sh drag2:I-35` answers `unknown local id` today**, and weakening the pattern to strip markup would make the address a pattern rather than a name — which is how `D-16` starts answering for `D-163`.

---

## 2. `M-*` — one subject with two authored facets, which is neither of the first two options

F-286 asks whether the second table is a projection of the first. **It is not, and the third option is the right one.**

| | `| # | Answer | Write-up |` | `| # | Measure | Replaced |` | | --- | --- | --- | | M-1 | the generic copy is 0.098 µs of a 2.64 µs sample | the end-to-end trace it had to be | `"Removing the copy would be performance theatre" (F-24)` | | M-4 | the span between the two gaps, 2.3 ms vs 0.156 ms | minimal element set, and whether reads can share a pass | `Q-7` |

**A projection is one fact _derived_ from an entry.** The register's `active`/`inactive` is derived; a discharge table's _asserted by_ is derived. **Neither of these is derived from the other**: a specification is not computable from a result, and a result is not computable from a specification. The document says so itself — _kept because they are the specification the harnesses are checked against_ — which is a statement that this text does independent work.

**But they are not two families either.** M-1's specification and M-1's answer are about **one measurement**. Minting a second identifier space would give one subject two addresses, which is a worse failure of the reader's uniqueness property than the duplicate it was meant to cure: a reader asking _what is M-1_ would have to know which of two registers to ask.

**The relationship is that the two tables are four columns of one entry set, split for presentation.** A measurement has four authored fields — what it had to cover, what claim it replaced, what it answered, and where it is written up — and the document put two in each table because a row carrying all four was unreadable. **The migration is the thing that makes the split unnecessary**, because an entry is not a row and has no width.

**So `M-1`…`M-4` are four entries, each carrying all four fields**, with the specification preserved verbatim as a `##### M-1 §Specification` clause beneath the answer — the same `§` clause form the migration already used for `##### D-66 §The progress marker`. Order follows the document's own: the answer opens the entry, because that is the current state, and the specification sits beneath it, because that is what the answer is checked against.

**Four entries, not eight, and no duplicate address.** The `Replaced` citations — F-24, F-4, Q-7 and §03's tree-shaking reasoning — travel with the specification, where they are the reason it exists.

---

## 3. `L-*` — an enumeration slip, and the evidence is in the table it shares

**The omission was not intentional.** D-171's landing note enumerates the satellites as _`SC-*` and `O-*` in `obligations.md`, `Q-*` in 05, `P-*` in 02, `B-*` and `K-*` in 07_. `07-free-drag-contract.md` §Acceptance criteria has **three** sibling `###` groups, not two:

```
### Kernel preconditions — the discrete step before Phase 19 (D-76)   → #### K-1 … #### K-6   (migrated)
### The behavior                                                       → #### B-1 … #### B-9   (migrated)
### The lifecycle                                                      → | # | Criterion |     (not migrated)
```

Same document, same parent section, same two-part shape: a criterion table, then a `| # | Discharged by |` table that stays a table because it is a projection — one derived fact per identifier — exactly as K's and B's did.

**And the decisive evidence is that B and L share one discharge table.** The table at §The lifecycle is headed _What discharged the behavior and lifecycle criteria_ and its rows run `**B-1**, **B-2**` … `**B-7**` … `**L-1**, **L-2**` … `**L-5**`. So the current state has **one projection table whose subjects are half headings and half rows**. That is not a defensible boundary; it is where an enumeration stopped.

**`L-1`…`L-5` migrate in the same unit, and the shared discharge table stays a table**, unchanged, now projecting fourteen entries instead of nine and five rows.

D-171's amended rule already decides this on its own terms — _every canonical identifier-keyed entry becomes a `####` heading, without exception_ — and `L-*` is identifier-keyed, prose-bearing and canonical. The scope sentence is what was wrong, not the rule.

---

## 4. What is amended

**D-173 settles the three.** D-171's scope sentence gains `L-*` and the two `M-*` families collapse into one; D-171 gains the identifier rule, which was already its practice.

**The new entries are 46**: thirty-seven `I-*`, four `M-*` and five `L-*`. The `| # | Discharged by |` tables in 07, the `Write-up` links and every value-keyed table are untouched.

**F-286 is closed by D-173**, and its three paragraphs stand as the statement of what was blocked. The migration of the three tables is unimplemented and carries D-173's witness.

---

## 5. What this pass found and is not settling

**Forty-seven finding identifiers have an entry in two documents, and the duplication is masked.** `05-lifecycle-invariants.md` carries 43 `F-*` headings and `07-free-drag-contract.md` carries 4, and every one of those 47 identifiers also has an entry in `00-index.md`. `F-2` is `### F-2 — part factory determinism · open, tier C` in 05 and `#### F-2 — Part factories must be deterministic…` in the index, and they are the same finding stated twice, at two depths.

**This is the inter-document form of §2's question and §2 does not answer it.** There the two texts were complementary facets of one subject in one document; here they are two statements of one subject in two documents, one canonical and one local, and which is which is not something this pass can read off the files. It is **F-287**, and it is recorded rather than settled because settling it means deciding whether a satellite may restate a canonical entry at all — a question about document ownership, not about table shape, and outside the three this pass was given.

**What makes it urgent rather than tidy**: `.scripts/entry.sh drag2:F-2` answers cleanly today only because the reader recognises an entry at `####` and 05's findings sit at `###`. The reader already refuses a duplicated local identifier — it simply cannot see 43 of these. **Correcting 05 to the uniform depth D-171 requires would, by itself, make the reader refuse 47 identifiers at once.** The two changes look independent and are not, which is the fact worth having recorded before anyone touches 05.

It is also why §1's rule matters more than it looks: **as soon as entries are addressable, every identifier that names two things is a defect a reader can trip over**, and the migration converted a latent ambiguity into a live one.

---

## 6. Method

The `I-*` census is `grep -oE '^\| ~?~?I-[0-9]+~?~?'` over 05, giving 37 keys with exactly one struck. The strikethrough-heading precedent is `grep -rn '^#\{2,5\} .*~~'` over `.plan/contract/`, giving sixteen headings, each read to confirm the identifier is outside the struck span. The two `M-*` tables and their four columns are read in full, including the `Write-up` and `Replaced` cells, which are what establish that neither table derives from the other. The `L-*` claim is read from 07's heading structure and from the shared discharge table's own rows, which name both families. The cross-document duplication in §5 is `comm -12` over the `F-*` heading sets of the satellites and the index.

**LSP plugin — available; not used**: no claim here turns on a code symbol. The subjects are markdown heading structure and table columns.