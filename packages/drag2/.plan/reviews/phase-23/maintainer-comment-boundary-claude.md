# What D-135 means at closure, and where the maintainer half stops

**Decided 2026-08-26 against `993e1598`** on `drag2/fin-review`, on the owner's question after the published half landed. **Nothing in production was changed.** The remaining source work is one narrow pass, specified in §6.

## 0. Verdict

Three parts, and the middle one is the answer to the question as put.

1. **D-135 keeps one narrow piece of the source half**: the history residue that a pattern can see — strikethrough, dates, phase numbers, explicit supersession narration. Sixty-six sites, guarded by extending the assertion that already exists for emitted declarations to `src/`.
2. **Argument eviction is not commissioned — not now, and not as a separate record migration.** The rule that would have required it, [`documentation.md`](../../../../../.agents/docs/documentation.md) §5.2's length-and-argument bullet, is **withdrawn**. It was wrong when written, and the same document's §5.3 says so.
3. **Design rationale stays in `src/`, under a narrower rule**: a maintainer comment may argue **for what is** and may not narrate **what was**.

## 1. What is actually left

| Class | Size | Mechanizable |
| --- | --- | --- |
| Published declaration comments | 58,143 B, **0** internal identifiers | Yes — landed, `packaging.node.test.ts` |
| Internal comment residue | ~341,700 B | — |
| — of which strikethrough | 50 markers in 12 files | Yes |
| — of which dates | 11 in 8 files | Yes |
| — of which phase numbers | 5 in 4 files | Yes |
| — of which supersession narration | ~60 in 19 files | Partly; the verbs are ambiguous |
| — of which bare decision pointers | 651 in 54 files | **Permitted, and not work** |
| — of which design rationale | the balance | **No** |

The published half went from 128,566 B to 88,985 B and from 268 internal references to none. **The remaining form-detectable history is about sixty-six sites.** Everything else the owner is asking about is the last row, and it has no instrument, no measured cost — comments do not survive minification and these reach no tarball — and, as §2 shows, mostly no claim on the record either.

## 2. The rule that demanded the eviction is wrong, and the model refutes it

§5.2 ended with: _If the comment is longer than the code and is arguing a choice, it is a record entry with a pointer left behind._ It tests **length** and **the presence of an argument**. §5.3 tests something else:

> If this became false tomorrow, is deleting it enough — or would someone have to be **told** it used to be true?

Take [`y.ts`](../../../src/sortable/y.ts)'s longest paragraph, _why this is not `xy()` with one axis switched off_. If `y()` were merged into `xy()` tomorrow, **deleting that paragraph is enough.** Nobody is owed the news, no compiled artefact depends on it, no citation resolves to it. It is a comment.

Now take `failures.ts`'s _three names changed and no value did_. That cannot be deleted when it stops being current, because the numbers are already in consumers' compiled output. Someone must be told. It is a record entry.

**The two tests disagree, and §5.3 is the one that tracks what the record is for.** The bullet would have evicted the most load-bearing comments in the tree while leaving short ones that are pure history — `assemble.ts`'s _it used to live in…_ is four words and belongs to the record; `y.ts`'s paragraph is thirty lines and belongs where it is. Length was never the variable (F-111).

## 3. The narrower rule: argue for what is, never about what was

The boundary is **tense**, and stating it that way makes it decidable without judgment about importance:

- A comment may say why the present shape is right and **what the obvious alternative gets wrong**. That is a constraint on the next edit, stated where the edit will be made.
- It may not narrate that the alternative **was considered**, by whom, in which round, or on what date. State the alternative's property, not the deliberation.
- `y.ts` already writes it correctly: _ignoring X is not an optimisation of the 2-D rule; it is a different and better answer for a list._ Present tense, no history, and it stops the merge.
- `xy.ts` is the same shape with one thing to fix: _this is the shipped package's rule, restored_ narrates a round trip. The property — a squared-Euclidean search over both centres, with DOM order deciding the gap side — is what a maintainer needs, and the round trip is the record's.

**This is not a weaker rule than the published half; it is a different one, because the reader is different.** A consumer cannot act on why a module is not another module. A maintainer about to delete that module can act on nothing else.

## 4. The `domain.ts` gap points the other way

The uncovered constraint is real and I found it: **_the version comes from the snapshot the gap is a gap of_ appears in no record file.** Two facts change what it means.

**It is published.** `insertionAt` is exported and its comment is emitted to `sortable/domain.d.ts:29`, so this is §5.1 consumer documentation that has already passed the guard — not maintainer commentary at all. §5.1 protects exactly this class: a precondition a caller must meet, stated where the caller meets it.

**A record gap is a reason to keep a comment, not an instruction to write a record entry.** D-135's safety property says _nothing is deleted from a comment unless the record already carries it_. Read as a work item — _find the gaps and fill them_ — it turns 341,700 B of prose into a migration backlog. Read as a gate, which is how it was written, it simply blocks a deletion. **Closure states the gate direction explicitly**, because the misreading is the expensive one.

The record is **not required to be a superset of the source**. Requiring it would be the mirror of the defect D-135 removed: instead of the source restating the record, the record restating the source. Each register carries what its own reader needs, and neither is a copy.

## 5. Why not a separately commissioned migration

- **No instrument, and none available.** The published half was decidable because the boundary was mechanical — a declaration either survives the prune or does not. _Is this sentence an argument about the past_ has no such test, and a sweep without one is a sequence of judgment calls at a scale that guarantees inconsistency.
- **No measured cost.** These bytes reach no consumer, no tarball, and no bundle. The published half had 97,718 B against 13,474 B of runtime to justify it. This has nothing on the other side of the scale.
- **Real risk in one direction only.** Moving a rationale out of `src/` removes it from the place where the mistake it prevents gets made, and puts it in a file whose reader has already decided to look something up. The `y.ts` paragraph exists because merging the two modules is an attractive and wrong idea; a pointer to a review document does not stop it.
- **It would reopen decisions the comments currently hold up.** Five runtime guards are deleted on the strength of written preconditions. Their statements are the only thing standing between a documented boundary and an undocumented one.

## 6. What closure requires

- **Extend the pattern assertion from emitted declarations to `src/`**, with a narrower list: strikethrough, dates, phase numbers. Not decision identifiers — those are permitted in `src/` and 651 of them are load-bearing index entries.
- **Clear the sixty-six sites** the assertion then fails on, under D-135's safety property unchanged: a sentence is deleted only if the record carries it, and otherwise the record is written first, in the same change.
- **Supersession narration is cleared by reading, not by pattern.** The verbs are ambiguous — _restored_, _deleted_, _no longer_ appear in ordinary present-tense prose — so the nineteen files are a reviewed list, and the assertion does not grow to cover them.
- **Two published sentences are worth a second look and neither reopens anything**: `feature.d.ts`'s _as far outside contract as depending on the record_ names a notion a consumer has no access to, and it predates the sweep; `xy.ts`'s _restored_ is §3's example.
- **`tests/` stays out of scope.** It does not ship, and its headers are the record's own voice at the point of use.

## 7. Findings

**F-111.** A normative rule was published with a test it did not need — length and the presence of an argument — where the same document already carried the test that decides the class correctly. It survived one landing because nothing in the published half was long enough to trip it: the boundary that made the published half mechanical also hid the defect in the half that had no boundary. **Rules that never fire are not confirmed by the passes that do not fire them.** Closed by this record and by the withdrawal in `documentation.md` §9.

**F-112.** A comment reaching a published declaration can name a repository-internal notion without using any of the eight forbidden forms. `feature.d.ts` compares a contract violation to _depending on the record_, which no consumer can evaluate, and the guard cannot see it. **Open, tier C.** The general shape is that a lexical guard bounds vocabulary and not audience; the residue it leaves is small — four candidate sites across 33 files — and the honest disposition is that the last increment of §5.1 is read, not asserted.