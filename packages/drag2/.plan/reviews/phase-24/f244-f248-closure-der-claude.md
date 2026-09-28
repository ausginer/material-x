# F-244–F-248 closure — decision-elimination review

**Commit read at:** `2919b975` (`drag2: finish the D-165 migration across the kernel behavior contract`), confirmed by `git log --oneline 55a20d2f..2919b975` to be exactly one commit.

**Diff range:** `55a20d2f..2919b975`, four files: `.plan/contract/00-index.md`, `.plan/contract/02-kernel-behavior-contract.md`, `.plan/plan.md`, `src/sortable/spec.ts` — matches the file list given in the task.

**Scope.** Scoped to the task's four questions: (1) whether F-244's rewritten D-85 placement argument is a correct restatement of E-01/D-85 or a quiet relitigation; (2) whether D-85's citation retarget in `00-index.md` is non-substantive; (3) a resurrection/scope check on this commit specifically; (4) whether `plan.md`'s new "three rounds, three sweeps" self-narration holds up against the actual prior-round records. Not covered: a fresh full-tree forward pass over `npx just decisions --retired` unrelated to D-85/D-165/E-01 — the task named this thread as the live one, and I did not go looking for unrelated retired machinery outside it. F-245 through F-248's own content (the two-role table cell, the diagram, the strike-convention departures) was read as part of the diff but not independently re-litigated beyond what bears on the four questions; that ground was already covered by the prior round's `feature-proof`/`integrity` passes recorded in `f236-f242-final-remediation-summary.md`.

**Result: no findings. All four questions resolve clean.** Per `.agents/docs/review-findings.md`, a null result is a result and is stated explicitly — this is a clean forward _and_ backward pass over the four questions asked.

---

## 1. F-244's rewritten D-85 placement argument — correct restatement, not relitigation

**E-01's actual original text**, read at `.plan/reviews/checkpoint-e/review-checkpoint-e-1-codex.md:24-32` ("E-01 — major: F-72 is a split activation snapshot, not only duplicate work"):

> "The dependency's own contract makes the falsifier explicit: the inherited coefficients are returned by the same walk because a second traversal can observe a different layout and disagree... **The two reads also disagree on failure**: `acquireLift()` rejects an unreadable space as `FAILURE_ACTIVATION`, while `captureLocalSpace()` silently substitutes identity for unreadable, singular, or non-finite geometry."

E-01's finding is explicitly about two _call sites_ with two different failure policies — the kernel's `acquireLift()` throwing versus the behavior's own `captureLocalSpace()` silently substituting — not a raw count of traversals. This is exactly what the new prose in `02-kernel-behavior-contract.md` says: "what E-01 found was two **policies**, not two reads... the kernel refusing what the behavior silently substituted." The retired sentence it replaces — "one failure policy, because there is now one read... no second read left to disagree with" — was false precisely because it conflated "one policy" with "one traversal," which D-165 then falsified by adding a second traversal _inside_ `acquireLift` itself. The new text resolves this correctly by relocating the claim from traversal-count to call-site-count: the split E-01 found was between `acquireLift` and `captureLocalSpace`, and deleting `captureLocalSpace` (recorded in D-85's own row: "`captureLocalSpace` and its four private index constants are deleted with the second traversal") is what actually closed it. D-165 adding a second walk _inside_ `acquireLift` does not reopen that split because both walks live under one throw.

**`src/kernel/presentation.ts`'s `acquireLift` (lines 496–521), read directly, confirms the "three observations, one policy" claim:**

```ts
export function acquireLift(
  visual: HTMLElement, item: HTMLElement, mode: LiftMode,
  originRect: DOMRectReadOnly, realm: DOMRealm, unwind: Unwind,
): LiftAcquisition {
  const above = space();
  const itemAbove = item === visual ? above : space();
  const measured = box();

  if (
    !ancestry(visual, above) ||
    (itemAbove !== above && !ancestry(item, itemAbove)) ||
    !coordinates(visual, measured, above)
  ) {
    throw new Error('drag: presentation/visual-no-box-space');
  }
  ...
```

One `if`, one throw, combining all three reads (visual's ancestry, item's ancestry when different, the visual's box measured through the first) with `||`. This is a single failure policy over three observations, exactly as the new prose states. The function's own doc comment (lines 463–494) independently corroborates the framing the new prose uses: "**That the reads are all taken here is load-bearing rather than merely efficient**... a traversal taken afterwards reads a different ancestry" and "**The item's ancestry is a second walk, and it is spent deliberately**" — this is the same source `f236-f242-final-remediation-summary.md` (§3) already cited to establish the old sentence was false; the new sentence is consistent with it rather than merely not-contradicting it.

**D-85's own ledger row** (`npx just decisions`, `00-index.md:371`) requires: "`ActivationScope` carries the inverse inherited linear part, or `null`, derived from what `acquireLift` already read before it mutated anything... The behavior multiplies; it never measures." The new placement prose does not touch this requirement — it only re-derives _why_ one failure policy still holds after D-165's split, and its closing sentence ("The reads are all taken before anything is mutated, which is D-85's actual acceptance ground") explicitly ties back to D-85's requirement rather than reinterpreting it. Nothing in the new text asserts a different acceptance ground, a different field shape, or a different failure behavior than D-85's row already states.

**Conclusion:** the new claim is a correct restatement of settled reasoning. It does not relitigate E-01 or D-85 — it corrects a specific, narrow error (conflating "one policy" with "one traversal") using the same E-01 text and the same `acquireLift` code the prior (false) claim was already checked against.

---

## 2. D-85's citation update — non-substantive, confirmed by isolated row diff

Direct line-level diff of the D-85 row, both revisions:

```
$ diff <(git show 55a20d2f:.../00-index.md | sed -n '371p') <(git show 2919b975:.../00-index.md | sed -n '371p')
```

The only difference between the two lines is the citation phrase: `§Why \`inheritedSpace\` is on the scope`→`§Why the inherited space is on the scope`. Every other clause of the row — the decision statement, the four "verbatim" clauses already confirmed unchanged in the prior round's `der` report (`f236-f242-final-remediation-der-claude.md` §2), the E-01 "why," the F-65 tension paragraph, and the supersession column — is byte-identical.

The new citation text matches this commit's renamed section heading exactly (`02-kernel-behavior-contract.md`'s heading changes from `#### Why \`inheritedSpace\` is on the scope and not on the session (D-85, E-01)`to`#### Why the inherited space is on the scope and not on the session (D-85, D-165, E-01)`), following the same abbreviation convention the old citation already used (dropping "and not on the session" from the citation text, as the pre-existing citation did). This is the same non-substantive citation-repointing pattern `.agents/docs/documentation.md`§2 sanctions ("Citations bind section numbers, not sentences... a section whose rule is withdrawn keeps its number and says what replaced it in one line") and the same mechanism the prior round already used once for this identical row (F-240's "renamed in name and cardinality rather than in kind" disposition,`00-index.md:1071`).

A full sweep of the diff (`git diff 55a20d2f 2919b975 -- .plan/contract/00-index.md | grep -E '^[+-]\|\s*D-[0-9]'`) confirms D-85 is the _only_ `D-*` row touched anywhere in this commit's `00-index.md` delta — no other decision row is edited, and this row's only edit is the citation phrase. What D-85 _requires_ of the code is unchanged.

---

## 3. Resurrection/scope check on `2919b975`

**No retired concept reappears as a live claim.** `git diff 55a20d2f 2919b975 | grep -inE "BQ-6|BQ-9|D-164|two-role"` returns no hits at all. Every instance of the retired `{ visual, box }` (two-role) spelling in the diff is either (a) explicitly struck (`~~\`HTMLElement | { visual, box } | null\`~~`, the D-59 table cell) with the live three-role form stated beside it, (b) narrated as history in the new F-245 closure-row prose ("D-59's settled-spelling table... still marked... as this"), or (c) the deleted `-` side of the D-52 diagram line, replaced by the three-role form with the retired form recorded in prose beneath the fence per F-245's own closure method. Nothing states the two-role model, the single-read model, or a BQ-6/BQ-9/D-164 concept as a current, in-force claim.

**`src/sortable/spec.ts`'s change touches only the comment.** Full diff of the file (reproduced above) shows exactly one hunk, one changed line, inside a `//` comment — "the second half of the admission subject" → "a named member of the admission subject." No code line, type, or executable statement changes.

**No `D-*` row's requirement changes.** Confirmed in §2: D-85 is the only decision row touched, and its only edit is the citation phrase. No decision is minted, amended or superseded by this commit (the new `F-244`–`F-248` rows added to `00-index.md`'s findings table are findings, not decisions, consistent with the prior round's own convention of using `F-` for documentation/instrument-accuracy defects).

---

## 4. `plan.md`'s "three rounds, three sweeps" self-narration — checked against the actual records, holds up

`plan.md`'s new entry claims: "Three rounds, three sweeps, each scoped to where the previous finding's evidence happened to point: F-232 named two sites and left F-236 one member away; F-237 named three and left F-244, F-245 and F-246 on the same page; F-236 swept `src/kernel/` and left F-247 in `src/sortable/`."

Checked against the actual round records rather than accepted as accurate self-narration:

- **"F-232 named two sites and left F-236 one member away."** `bq6-bq9-d165-remediation-summary.md:46` states this almost verbatim, independently of this commit: "F-232's evidence named exactly two sites, and both are fixed as scoped. It is a new instance of the identical defect, one member away from where the fix stopped." `00-index.md`'s F-232 row confirms two named sites (`AdmissionSubject`'s doc block, `admit`'s return description); F-236's row confirms the third site (`ActivationScope.visual`'s doc, "six lines above the `box` member" F-232 fixed). Matches.
- **"F-237 named three and left F-244, F-245 and F-246 on the same page."** F-237's row (`00-index.md:1068`) names exactly three: the reproduced `AdmissionSubject`, `admit`'s "optionally paired" return, and `ActivationScope.inheritedSpace`. F-244/F-245/F-246 are all on the same page, `02-kernel-behavior-contract.md`, per `f236-f242-final-remediation-summary.md` §3–4. F-248 (also on the same page) is legitimately omitted from this list: it is not a leftover pre-D-165 instance the F-237 sweep missed, but a new defect introduced _by_ the F-237 remediation itself (an unprecedented `// ~~declaration~~` strike syntax) — categorically different from "stale wording surviving a sweep," so its absence from this sentence is accurate rather than a gap.
- **"F-236 swept `src/kernel/` and left F-247 in `src/sortable/`."** This phrasing carries forward an established characterization, not new spin: `f236-f242-final-remediation-feature-proof-claude.md:147` already framed it this way — "the sweep that closed F-236 by surface rather than by citation stopped at `src/kernel/`." F-236's own fix (`00-index.md:1067`) is scoped to `src/kernel/spec.ts`'s `ActivationScope.visual` doc; F-247 (`src/sortable/spec.ts:424`, "second half of the admission subject") is the identical wording class one directory over, confirmed by `feature-proof`'s prior sweep of the whole of `src/` to be the sole remaining instance. Matches.
- **"Three rounds."** Confirmed as (1) the D-165 implementation round that closed F-232–F-235 and raised F-236–F-242 (`bq6-bq9-d165-remediation-summary.md`), (2) the round that closed F-236–F-242 and raised F-244–F-248 (`f236-f242-final-remediation-summary.md`), (3) this commit, closing F-244–F-248. Three distinct rounds, matching.

No overstatement or understatement found — the characterization is a fair, independently-checkable description of what actually happened across the three rounds' own records, not merely accurate-sounding narration.

---

## Conclusion

No findings, on all four questions. `2919b975` correctly finishes the D-165 migration as one unit: F-244's rewritten placement argument is a sharper, correct restatement of E-01's actual finding (verified against `review-checkpoint-e-1-codex.md`'s original text and `acquireLift`'s actual three-observation/one-throw structure in `presentation.ts`), not a relitigation of E-01 or D-85; D-85's citation edit is the only change to any `D-*` row in this commit, and it is a pure citation retarget matching the section's renamed heading, with every substantive clause of the row byte-identical; nothing in the commit's prose or code reintroduces the retired single-read model, the two-role admission shape, or any BQ-6/BQ-9/D-164 concept as a live claim, and `src/sortable/spec.ts`'s sole change is comment-only; and `plan.md`'s "three rounds, three sweeps" self-narration is a fair, independently-verifiable description of the actual pattern across all three rounds' records, not overstated self-congratulation. This is the forward pass's own result to state explicitly: no surviving machinery was found resting on an expired justification.