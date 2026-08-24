# Closure review — D-118, `b5ac8cfa`

**Narrow closure review against the evaluation at `098002db`.** No production change is made here.

**Clean.** Both checks are gone without changing the semantics the evaluation established, the `pointerdown` collision is the sole survivor in the loop and now has a test proving it stands alone, the loop simplification changes nothing beyond itself, the re-base moved twelve budgets and no graph assertion, and F-90's three contract corrections are accurate.

Four tier-C observations follow, **one of which is against my own earlier review** rather than against this commit.

---

## 1. The two checks are gone, and nothing else went with them

The structural diff — comments stripped, whitespace collapsed, token by token — is **exactly four things**: the `const { types } = next.command` destructure, the `types.length === 0` block, the `type === ''` block, and the loop header changing from `types` to `next.command.types`. Nothing else in [`kernel.ts`](../../src/kernel/kernel.ts) moved, and [`spec.ts`](../../src/kernel/spec.ts) is **comment-only**. No other source file is touched.

**The loop simplification is a narrowing, not a change.** The validation loop and the binding loop twenty-seven lines below are now written identically — `if (next.command !== undefined) { for (const type of next.command.types) … }`. Before, the validation loop destructured while the binding loop already read `next.command.types` directly, so a spec whose `command` was a getter could already have handed the two loops different arrays. That asymmetry is now gone; the change removes a divergence rather than introducing one.

**And the destructure had exactly one reason to exist.** `types` was read twice — by `types.length` and by the loop — and with the length check deleted there is one reader. Collapsing it is the same edit as deleting the check, not an extra liberty taken alongside it.

---

## 2. The established semantics are preserved

Both claims the evaluation proved by construction are now asserted by the suite, in their strong form.

**`types: []` is indistinguishable from omitting `command`.** The new test does not assert _it does not throw_; it drives two harnesses — one declaring `types: []`, one declaring no member — and asserts **call-for-call equality**, plus that `admit` is never reached and that the pointer ingress still activates. That is the assertion the evaluation's E2 turned on, and it is the right one: the finding was never that the shape is tolerated, it was that the library already supports it under another spelling.

Verified independently: `spec!.command!.admit` is the **only** other read of `command` anywhere in the kernel, and it is reachable only from a listener the binding loop installs. With an empty array no listener exists, so there is no path by which the two spellings could differ.

**`types: ['']` binds an ordinary, distinct listener.** The new test fires `Event('')` and asserts `admit` receives it, then dispatches a `CustomEvent('command')` and a `click` at the same node and asserts nothing more arrives — the empty type is not a wildcard — then activates the pointer ingress beside it. That reproduces E1 and E3 together.

---

## 3. The `pointerdown` collision is the sole survivor, and it is tested as one

The collision check is unchanged, and the re-pointed test now carries **two** cases: `['pointerdown']` and `['', 'pointerdown']`. The second is the load-bearing one — it asserts the surviving check does not depend on either deleted check, so accepting an empty entry cannot swallow a collision sharing its array. That was the one assertion in the evaluation's E3 that guarded against a deletion breaking the check it left behind, and it is now standing.

**One scoping note, so the closure is not over-read.** "One check, and it is the only one here the library owns" is scoped to the `command.types` loop, correctly. `spec/action-tags-invalid` survives immediately above it, outside the loop and outside D-118's question; it was not evaluated at `098002db` and is not closed by this.

---

## 4. The re-base — figures reproduce, and no graph assertion moved

**The decisive check.** The `COMPOSITIONS` array was extracted from `098002db` and from `b5ac8cfa`, stripped of comments and whitespace, and compared with budgets masked: **the non-budget content is identical**. Twenty-four changed tokens, all of them one of twelve `budget:` values. Every `absent`, `absentPrefixes`, `present` and `only` is byte-identical, and every module count is unchanged on all fourteen rows.

**Every figure reproduces exactly**, rebuilt from both trees:

|  | claimed | measured |
| --- | --- | --- |
| landed Brotli, all 14 rows | see the table in `measure.ts` | **exact on all 14** |
| per-row Δ Brotli | −23 … −39 | **−23 … −39, row for row** |
| Δ minified | −137, flat | **−137, flat** on every row carrying `kernel/kernel.js` |
| `drag.js`, baseline B | unmoved | **121 / 6,889, byte-identical** |
| new budgets | landed + 150 | **exactly 150 on all twelve measured rows** |
| slack before the re-base | 162–179 B | **162–179 B** |

**The −128 / −9 split cross-checks.** The evaluation measured **−128 B** for the two checks with the destructure kept; the landed figure is **−137**; the difference is the destructure collapse, which is what the note claims and attributes to this pass rather than to the review. That the two measurements compose is the useful part: the projection was made on a different tree by a different ablation and lands within nine bytes of the whole.

**The re-base is justified without the sentence that carries the risk** — see §8.

---

## 5. F-90 and the contract corrections are accurate

Three present-tense sentences described a loop that had held two checks for two days, and all three are corrected **to the landed behaviour** rather than to the 2026-08-22 state, which is right when the same pass deletes two more:

| document | now says |
| --- | --- |
| [01 §When construction itself fails](../../contract/01-construction-ownership.md) | validates one thing — no type the kernel binds for its own ingress; an empty array is a supported spelling; _the other four shapes this sentence once listed are accepted_ |
| [02 §Discrete admission](../../contract/02-kernel-behavior-contract.md) | rejects exactly one shape, and names what the four deleted shapes do instead |
| [05](../../contract/05-lifecycle-invariants.md) D-32 row | rejects a `pointerdown` collision **and nothing else**, with both accepted shapes described |

**The count is right** — non-string and duplicate (2026-08-22) plus empty array and empty string (2026-08-24) is four — and `CommandAdmission`'s own doc comment now carries the same statement at the type. [COVERAGE.md](../../tests/COVERAGE.md) gains two rows naming the two new tests and re-points the third.

**No present-tense contract sentence describing the deleted checks survives.** Swept for every phrasing of the validation across `.plan` and `src`; what remains is dated records and this closure's own subject matter.

**F-90's own framing is the part worth keeping**: _a deletion pass reads the source it edits and the test it breaks, and a contract sentence is neither_. That is exactly right, and §7 below is a fifth instance of it found while checking the fourth.

---

## 6. Suite, format

**59 files, 1,154 passed, 116 skipped, no type errors** — two more than before, which are the two new tests. Format clean on all ten changed files.

---

## 7. Observation — my own D-117 stale-quote sweep was vacuous · **tier C, against `97c8ed3e`**

The D-117 implementation review reported **"zero stale quotes of the old messages anywhere in the package"**. That result was produced by an instrument that read nothing.

The sweep gathered the pre-slice literals with `git ls-tree -r --name-only 76176da8 packages/drag2/src`, run with the working directory already inside `packages/drag2`. Git resolves a pathspec relative to the working directory, so the path did not exist, the command returned **zero files**, the fragment set was **empty**, and the search reported a clean sweep having compared nothing. Re-run from the repository root it yields **39 literals and 33 fragments**.

**This is worth recording rather than quietly fixing**, for two reasons. It is the failure shape this package's own measurement doctrine names — _a small delta that reads like success_ — appearing in an instrument built to check a documentation claim. And F-90's disposition rests on the observation that _no instrument in this package reads a claim_; a review that reported one had run, and had not, is the weaker half of that argument rather than a counterexample to it.

**Run correctly, it changes one conclusion and confirms the rest.** Everything it surfaces is either a **dated record** — the checkpoint-B, phase-18, phase-22 and phase-23 reviews, `bundle-structure.md`, and the D-117 ledger row, all of which quote the old strings as their subject — or the **live** gated sentence in `verified-refresh.ts`, which still exists. One genuine live staleness remains:

> [`tests/sortable/features.browser.test.ts`](../../tests/sortable/features.browser.test.ts) — a present-tense comment reading _it throws "the insertion anchor is not in the placeholder's container"_, quoting a string D-117 replaced with `drag: sortable/anchor-outside-container`.

Tier C: the sentence still describes the fault correctly and only the quotation marks make it a quotation of something gone. It touches no assertion and no shipped byte.

---

## 8. Observation — the re-base rationale re-uses a figure the paragraph above it retired · **tier C**

The new paragraph supports the re-base with: _the slack reached 162–179 B, which is past the +157 B this file measures for the smallest module entering a graph. A headroom wide enough to swallow that module has stopped doing the one thing the byte half can still do._

Two problems, both small.

**The figure is one tree stale.** `+157 B` is recorded in the paragraph above, whose stated basis is _"on the tree these budgets are set from"_. The budgets have since been re-set from a tree where the same module costs **155 B**, measured here. The figure has now moved on three consecutive passes — 154, 149, 157, 155 — which is the point the file already makes.

**And it is the figure that paragraph says not to reason from.** The doctrine two paragraphs up concludes that _a figure that swings across the headroom on two message-text passes is not a figure a headroom can be sized against, and the module claim was never the byte half's to make._ Using it as the threshold for _too wide_ is reasoning from it.

**The re-base needs none of this and is correct without it.** The same paragraph already gives the sufficient reason — _the budgets move because the rule above says they follow the landed figure in both directions_ — and the standing convention fixes the target at landed + 150 independently of any module figure. Nothing about the twelve numbers changes; only the supporting sentence overreaches.

---

## 9. Observation — `bundle-structure.md` §A2 records a decline D-118 partly reverses, with no forward pointer · **tier C**

`bundle-structure.md` §A2 prices _`arm()` static spec validation — `config.actionTags`, `command.types`_ at ~152–161 B, records its rationale as **"None on record"**, and concludes **"A2 has no such cover, and it is declined."** D-118 gives that site cover and deletes two of the three `command.types` checks; the record's one statement about this exact validation now describes a position that has been superseded.

**Not a tense defect.** The document is stamped _"Run 2026-08-22 against `e9590c3c`"_ and the section carries its own date and decision id, so it does not claim to describe the current tree — the same standing that lets D-107's ledger row keep the wording it was decided in.

**But nothing links the two.** Neither D-118's ledger row nor `plan.md`'s D-118 section cites `bundle-structure.md` or A2, so a reader arriving at _"None on record"_ has no signal that a decision now exists. That is the mirror of the problem D-116 was created for — a live-reading clause inside a dated artifact, unreachable by every instrument here — and the register's own **Retired conditions** table exists because _a ledger row that cites it must keep resolving_. A one-clause pointer would close it; **it changes nothing that landed.**

---

## 10. Closure

**D-118 is closed.** Against the evaluation at `098002db`:

- both checks are deleted and the deletion is **only** that, verified structurally;
- the two accepted shapes behave as the evaluation established, and the suite now asserts the stronger of the two claims — indistinguishability, not tolerance;
- the `pointerdown` collision survives, unchanged, with a case proving it does not depend on either deleted check;
- twelve budgets follow the landed figure and **no graph assertion, module count or non-budget declaration moved**;
- the vocabulary root is byte-identical at 121 B for the fourth consecutive slice;
- F-90's three contract sentences are corrected to the landed behaviour and no present-tense claim about the deleted checks survives.

The four observations are record-precision items — one against this pass's supporting prose, one against a dated record's linkage, one against a live test comment, and one against my own earlier review. **None touches a shipped byte, a check, a budget or a graph assertion**, and none is a reason to hold the closure.

---

## 11. What was not checked

- **`spec/action-tags-invalid` was not evaluated.** It sits outside the loop and outside D-118's question; nothing here closes it.
- **The non-empty tuple type was not re-tested.** D-118 declines it as a §12 API question and the evaluation's typecheck stands unrepeated.
- **The stale-quote sweep covers `.ts`, `.md`, `.js` and `.json`** under the package, matching five-word fragments of pre-D-117 literals. It would miss a paraphrase, and it says nothing about documents outside the package.
- One bundler, one browser, as throughout this phase.

---

LSP plugin - available; not used: this closure is a text-and-measurement audit — a token-level structural diff of two source files, a masked comparison of the `COMPOSITIONS` array, two builds of the size harness, a corrected documentation sweep and a full suite run, none of which is a code-symbol query.