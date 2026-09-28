# F-244–F-248 closure — package coherence

**Commit read at:** `2919b975` (`drag2: finish the D-165 migration across the kernel behavior contract`), confirmed the sole commit in range by `git log --oneline 55a20d2f..2919b975`. Diff range `55a20d2f..2919b975`, four files: `.plan/contract/00-index.md`, `.plan/contract/02-kernel-behavior-contract.md`, `.plan/plan.md`, `src/sortable/spec.ts`.

**Scope.** `packages/drag2/.plan/contract/02-kernel-behavior-contract.md` read in full, all 2026 lines, in three passes (not only the diffed hunks). `src/kernel/spec.ts` read in full (537 lines) as the ground truth for `AdmissionSubject` and `ActivationScope`. `packages/drag2/.plan/contract/00-index.md` read by targeted grep across its full 1101 lines (too large to load whole — 747 KB) for every `[0N](...) §...` citation, cross-checked against the heading lists of `00`, `02`, `03-feature-composition.md`, `05-lifecycle-invariants.md` and `07-free-drag-contract.md` (all headings enumerated). `packages/drag2/.plan/contract/06-vertical-sortable-trace.md` read in full for the sections relevant to admission and activation (lines 1–260) after a targeted grep found it reproduces the subject/scope shapes; the rest of the file was grepped for the same patterns and found unrelated. `packages/drag2/.plan/plan.md` read by targeted grep for the same patterns and for the new 2026-08-31 log entry (diff-visible). `src/sortable/spec.ts` read in full around the touched comment and the surrounding admission functions. `f236-f242-final-remediation-summary.md` read in full for prior-round context. No other contract page was read in full; `03`, `05`, `07` were consulted only for their heading lists.

**The load-bearing claim, evaluated within its literal scope (page `02` and `src/`): holds.** No surviving instance of the retired two-role `AdmissionSubject` / single-field `ActivationScope.inheritedSpace` wording class was found on `02-kernel-behavior-contract.md` or in `src/`, beyond what this commit already retired. One coherence gap was found just outside that scope, in `06-vertical-sortable-trace.md` — reported below because task item 2 asked for it explicitly and because `02` itself asserts a dependency on it.

---

## Findings

### integrity-1 — clean: F-244's citation is consistent with `00-index.md`'s own citation norm

**Claim.** The D-85 row's repointed citation, `[02](02-kernel-behavior-contract.md) §Why the inherited space is on the scope`, resolves correctly and matches the established informal-citation convention used throughout `00-index.md` — it is not a defect that it fails to reproduce the heading verbatim.

**Evidence.** The live heading at `02-kernel-behavior-contract.md:1032` is `#### Why the inherited space is on the scope and not on the session (D-85, D-165, E-01)`. The citation drops the trailing clause ("and not on the session") and the parenthetical decision list — exactly the two things `00-index.md` drops elsewhere, consistently:

| Citation in `00-index.md` | Actual heading in the cited document |
| --- | --- |
| `§Queue` (line 147) | `## Queue semantics` (02:1921) |
| `§Attempts` (line 149) | `## Attempts and stale continuation rejection` (02:1945) |
| `§Release` — tier B, D-6 (line 154) | `## Release ordering (D-6)` (02:1888) |
| `§Landing` (line 160) | `## Landing (D-16)` (02:1460) |
| `§The settlement gate` (line 151) | `## The settlement gate (D-7, narrowed by D-41)` (02:1238) |
| `§The kernel tier's public vocabulary` (line 294) | `## The kernel tier's public vocabulary (D-68)` (02:734) |
| `§Measurements` (00:123) | `## Measurements — landed 2026-08-02` (05:532) |
| `§Validation` (00:835) | `### Validation, under \`CODE_OF_SIZE.md\`` (07:164) |
| `§Where the four changes touch each other` (00:27) | `## Where the four changes touch each other` (02:1996) — exact match |

The pattern is uniform: truncate a longer heading to its distinctive fragment, and drop trailing parenthetical decision refs. `§Why the inherited space is on the scope` follows both rules exactly — it is not an anchor link and was never meant to be a verbatim match. **No `[#anchor]`-style link is used anywhere in the sample**; the whole ledger cites sections by informal prose paraphrase. The citation resolves unambiguously to the one heading on the page beginning "Why the inherited space is on the scope," so a reader following it lands correctly.

**Required property (met):** a repointed citation names a section a reader can find, by the same convention every other citation on the page uses. No further action needed.

---

### integrity-2 — B: `06-vertical-sortable-trace.md` still reproduces the retired two-role admission shape, though `02` names it as the document meant to follow `02`'s spelling

**Current behavior.** `02-kernel-behavior-contract.md:429` states, of the `AdmissionSubject` union: "**The spelling, settled here so 06 can follow it.**" `06-vertical-sortable-trace.md` is the document that phrase points at. It reproduces the admission and scope shapes twice in its walked trace, and both reproductions are pre-D-165 (one is also pre-D-85):

- `06-vertical-sortable-trace.md:115`: `[B] spec.admit(event, draft) → { visual, box? }                 [D-5, D-59]` — the two-role form, with `box` written as optional. This is not merely stale; it is one of the two forms `02`'s own D-59 verdict table (`02:433–435`) explicitly marks **rejected** (`\`{ visual, box? } | null\``and`\`HTMLElement | { visual, box? } | null\``), so the trace currently documents a shape the contract never sanctioned even before D-165.
- `06-vertical-sortable-trace.md:210`: `scope = { visual, box, originRect, boxPre, lift, motion, presentation }` — omits `visualSpace`/`itemSpace` entirely (and never had `inheritedSpace` either), so this reproduction predates D-85 as well as D-165.
- `06-vertical-sortable-trace.md:122–124` and `:136` narrate admission as returning one thing "paired" with a second ("the pair costs nothing measurable"), the same two-role framing `02` retired site-by-site in this commit.

**Why it is a problem.** `02`'s own text makes `06`'s agreement load-bearing — it says the spelling is settled "so 06 can follow it," not merely that 06 happens to. A reader who follows that citation, or who reads `06` on its own terms as "one complete vertical-sortable lifecycle" (06:1), currently gets `AdmissionSubject` with two roles instead of three, an already-rejected optional-`box` spelling, and an `ActivationScope` with no ancestry-space fields at all. `06` does carry its own escape clause — "Document 02 is the normative lifecycle protocol; if a trace sentence drifts from it, document 02 wins and this trace must be fixed" (06:3) — which is an acknowledgment that this can happen, not a fix for it having happened. The prior round's own remediation summary (`f236-f242-final-remediation-summary.md:63`) noticed that D-59's table is "explicitly pointed downstream at document 06" while assessing `02`'s own table cell, but did not open `06` itself to check; this pass did, and the gap is real.

**Evidence / reproduction.** `src/kernel/spec.ts:116–127` (current `AdmissionSubject`, three required members) and `:157–232` (current `ActivationScope`, with `visualSpace`/`itemSpace`) versus `06-vertical-sortable-trace.md:115,122–124,136,210` as quoted above.

**Required property.** A trace document `02` names as the downstream consumer of a settled spelling states that spelling, or is itself corrected — the same property this commit enforced on `02` itself.

**Scope note.** The load-bearing claim under review is explicitly scoped to "that page [`02`] or in `src/`," so this finding does not falsify it; it is reported because task item 2 asked for the cross-page check and because `02`'s own text creates the dependency.

---

### integrity-3 — clean: shape fidelity, independently re-verified over the whole page

**Claim.** Every reproduction of `AdmissionSubject` and `ActivationScope` on `02-kernel-behavior-contract.md` — not only the sites this round's diff touched — matches `src/kernel/spec.ts` member-for-member.

**Evidence.** The one full `AdmissionSubject` type reproduction (`02:274–276`) is:

```ts
type AdmissionSubject =
  | HTMLElement
  | Readonly<{ visual: HTMLElement; box: HTMLElement; item: HTMLElement }>;
```

identical in member set and requiredness to `src/kernel/spec.ts:116–127`. The one full `ActivationScope` type reproduction (`02:940–1029`) lists, in the same order as `src/kernel/spec.ts:157–232`: `visual`, `originRect`, `box`, `boxPre`, `visualSpace`, `itemSpace`, `lift`, `motion`, `presentation` — same nine members, same types (`HTMLElement`, `DOMRectReadOnly`, `OffsetBox`, `InheritedSpace` ×2, `BehaviorLiftSession`, `LifetimeScope` ×2). No other full-type reproduction of either type exists elsewhere on the page (checked by reading the whole file); the seam-by-seam table (`02:455`), the doc-comment prose (`02:253–273`, `02:333`), the window diagram (`02:1075`) and the D-59 verdict table (`02:433`) are partial/prose reproductions and all now state three roles, checked individually and found consistent with the full type.

**Required property (met):** no action needed.

---

### integrity-4 — clean: the "pair" residue is fully covered, on `02` itself

**Claim.** Every remaining occurrence of "pair"/"paired" on `02-kernel-behavior-contract.md` that concerns `AdmissionSubject`'s shape is either already struck, or is covered by the blanket instruction at `02:443` ("Read _the pair_ above as _the object form_ from here on"); no table or diagram cell states the bare two-role struct literal without a strike.

**Evidence.** A full-file grep for `pair`/`paired` (case-insensitive) returns 16 lines. Of these, the ones concerning `AdmissionSubject`:

- `02:258` and `02:314–316` ("the pair form names a separate geometry source"; "optionally paired with the element the kernel should measure") are both already inside `~~...~~` strikes, replaced by the current three-role prose.
- `02:439` ("the pair is the only way to say 'different'") is the paragraph the blanket instruction at `02:443` immediately follows and refers to ("the pair **above**") — self-referentially covered.
- `02:447` ("the pair is an object") follows `02:443` and is covered by "from here on."
- `02:455`'s seam-table row uses the file's own strike convention correctly (`~~... paired with the box ...~~ **return the subject** — the bare item ...`).

A separate grep for the literal two-member struct `{ visual, box }` (without `item`) finds it only inside strikes, at `02:433` and `02:1092` — both already retired under the F-245/F-248 fixes. The other "pair"/"paired"/"pairing" hits on the page (`02:657`, `888`, `974`, `1070`, `1100`, `1304`, `1488`, `1491`, `1933`) are unrelated senses — "pairs with" an attribute, a live subscription's start/end pairing, an `OffsetBox`'s width/height pair, nested-element pairs in a probe, a scalar x/y pair, a frame double-buffer pair — none describes `AdmissionSubject`.

**Required property (met):** no occurrence needs a correction the blanket instruction can't reach. Checked outside `02` too (`00-index.md`, `plan.md`) for a live (non-historical) "pair" claim about `AdmissionSubject`; none found — `plan.md:2308` narrates the D-165 decision itself ("`AdmissionSubject`'s pair becomes a triple") as a dated log entry describing a past change, not a live claim, and `plan.md:2436` is a dated D-85-era entry using `inheritedSpace` contemporaneously, also historical narration rather than a current claim.

---

### integrity-5 — clean: strike/provenance convention is uniform across the whole page

**Claim.** With F-246 and F-248's two corrected sites folded in, the strike-then-restate convention is applied consistently across the entire 2026-line page, not only at previously-cited sites.

**Evidence.** Read the whole file in three passes. Every correction found — including in sections no prior round's report cited, such as `§Every classification entrypoint latches` (02:189), `§The settlement gate`/`§The serial authored commit` (02:1276–1338), `§No start, no terminal` (02:1650–1673), `§Failure classification` (02:1957–1994) and the heading at `02:1969` (`### ~~The stage is internal; the consumer gets a code (D-64)~~ The stage is what the consumer gets (D-132)`) — uses the established `~~old~~ **new**` prose form, including for headings. The two documented exceptions to markdown-strike (a fenced `text` block, which "carries no strike, so the retired form is recorded here" — `02:1092`, and a table cell, struck per the six precedent instances the file already had) are both applied correctly at their sites and match the file's own stated convention. No new inconsistency was found outside the two F-246/F-248 fixed this commit.

**Required property (met):** no action needed.

---

### integrity-6 — clean, with one non-substantive prose imprecision: `00-index.md`/`plan.md` cross-consistency for F-244–F-248

**Claim.** The five new ledger rows (`00-index.md:1075–1079`) and `plan.md`'s new 2026-08-31 entry agree with each other and with the diff on what was struck, what was corrected in place, and what D-85's new placement argument says.

**Evidence.** Cross-checked fact by fact: what F-244 struck (the D-85 subsection's heading and its "one failure policy... no second read" paragraph, restated as "what E-01 found was two policies, not two reads") is stated identically in both files and matches the diff. F-245's two sites (D-59's table cell, D-52's fenced diagram) match in both and match the diff. F-246's "two sites corrected in place... four other sites struck in the same commit" is consistent between the two files (and is corroborated by the diff, which shows more than four distinct `~~...~~` corrections landing in this commit). F-247's `src/sortable/spec.ts` correction and its Tier C are stated identically and match the diff (`"the second half of the admission subject"` → `"a named member of the admission subject"`). F-248's description of the bare-`//`-comment strikes and their restatement matches the diff.

**One imprecision, non-substantive.** F-244's own prose (both the `00-index.md` row and, more explicitly, `f236-f242-final-remediation-summary.md:61`) describes D-85's ledger row as citing the D-85 placement subsection "by its literal heading." As integrity-1 above establishes, the citation is not a literal heading match — it is a truncated paraphrase, consistent with `00-index.md`'s norm throughout. This does not change F-244's substance (the citation still resolves to the right section, before and after the heading rename) and is not itself a new finding, but "literal heading" overstates the match.

**Required property:** substantially met; the one imprecision does not warrant its own tier.

---

## Summary

Within the load-bearing claim's literal scope — `02-kernel-behavior-contract.md` and `src/` — the D-165 migration is complete: no surviving two-role `AdmissionSubject`, optional-`box` form, or single-field `inheritedSpace` was found anywhere on the 2026-line page or in `src/`, beyond what this commit retires. `AdmissionSubject` and `ActivationScope` as reproduced on the page match `src/kernel/spec.ts` member-for-member. F-244's citation repointing follows the page's established informal-citation convention. The "pair" blanket instruction covers every remaining occurrence its wording touches. The strike/provenance convention holds uniformly across sections no prior round inspected. The two ledgers (`00-index.md`, `plan.md`) agree with each other and the diff.

One coherence gap survives just outside the claim's stated boundary: `06-vertical-sortable-trace.md`, which `02` itself names as the document meant to follow its settled spelling, still shows the two-role `AdmissionSubject` (including a form `02`'s own table marks rejected) and an `ActivationScope` with no ancestry-space fields at all (integrity-2, tier B).