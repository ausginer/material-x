# BQ-6 / BQ-9 / D-165 — review round consolidation

**Round:** full review swarm over `55eaaf1b..90d141e2` (one commit, `90d141e2`) on `drag2/fin-review`. Subject: box-quad **BQ-6** (cache removed), box-quad **BQ-9** (`Space` first-class, `Box` a pure 8-slot measurement, the ancestor-boundary capability deleted rather than implemented — amended in place by record 12), and drag2 **D-165** (supersedes D-164 before implementation; `acquireLift` takes two ancestry readings, `ActivationScope` publishes `visualSpace`/`itemSpace`, `AdmissionSubject`'s pair form gains a required `item`).

**All four passes read files at `90d141e2`**, diffed against `55eaaf1b`; the reports merge without a tree reconciliation. Each pass committed its own artifact (`6f4ba11a` integrity, `44128281` cleanup, `d85ea9a1` der, `30c4b1c2` feature-proof); none was pushed by its pass — publishing is this consolidation's job. No production file was modified by any pass; the feature-proof pass's two throwaway probes were built and removed in the working tree, verified clean each time.

**Passes run:** `reviewer` (feature proof), `integrity` (package coherence), `cleanup` (code discipline), `der` (decision elimination) — in parallel, in one message, none holding another's prompt, findings or artifact path.

**The round is clean at tier A.** No pass found a runtime-observable defect. BQ-9's seven required properties, D-165's required properties, and the F-227/F-225 regression fix all hold, independently re-verified — the feature-proof pass ran a real falsification (reverting the routed value reproduces F-227's and F-225's exact recorded failing numbers) rather than trusting the record. Package coherence is clean: `AdmissionSubject.item` is a sound, disclosed encoding of a genuine third admission role, not a widening; D-85 holds; object identity when `visual === item` is real, not merely claimed. Decision elimination is clean: nothing from BQ-1–BQ-8's retired machinery, or from D-164's undelivered boundary encoding, survives in the landed tree.

**Four tier-B/C findings survive independent verification**, all documentation- or instrument-accuracy defects rather than behavioral ones — two published surfaces that stopped describing what they govern, one conformance test whose match target a rename retired, and one claimed property that is asserted nowhere. **None requires a design or contract decision**; none is routed to the architect.

---

## 1. Findings

| Canonical | Tier | Claim | From |
| --- | --- | --- | --- |
| **F-232** | B | `AdmissionSubject`'s doc block, and `BehaviorSpec.admit`'s return description, still describe the bare-element form as asserting only `box === visual` — not that it now also asserts `item === visual` — on a type published from the kernel's public entrypoint | `reviewer` (proof-1) |
| **F-233** | B | `packaging.node.test.ts`'s D-85 conformance guard matches the literal `BOX_ANCESTOR_`, a constant BQ-9 deleted and renamed to `SPACE_*`; a reintroduction of the anti-pattern it exists to catch, under the current box-quad shape, would copy `SPACE_*` and pass silently | `reviewer` (proof-2), `der` (der-1) |
| **F-234** | C | The claimed object-identity property (`visualSpace === itemSpace` by reference when `visual === item`) is stated in two records and one doc comment, but asserted in no test — an implementation that allocated a second, value-equal `Space` would pass the whole suite while falsifying the claim | `reviewer` (proof-3) |
| **F-235** | B | `perf/m5.browser.test.ts`'s doc block and five inline comments still narrate the pre-D-165 single `inheritedSpace` value and one-traversal model, using an identifier (`inheritedSpace`) that no longer exists anywhere in `packages/drag2/src`, on the file whose stated role is to be the ground truth for a future D-85 reopening decision | `cleanup` (cleanup-1) |

Ids continue from the drag2-tree high-water marks `F-231`, `Q-16`, `I-37` (confirmed by `grep -rohE '\b[FQI]-[0-9]+\b' packages/drag2/.plan/ | sort -t- -k2 -n | uniq | tail`). No `Q-` or `I-` was minted — the integrity pass's six checks are null results, not findings, and no finding here turns on a repository-relied-on instrument being unsound in a way that blocks a decision (F-233 is the closest, and it is a documentation/instrument-accuracy defect, not a coherence question). **No `D-*` was minted, amended or superseded by this round.**

---

## 2. F-232 and F-233 — merged and validated directly, not merely relayed

**F-233 is one defect independently found by two passes with matching evidence**, not two findings that happen to agree. `reviewer`'s `proof-2` and `der`'s `der-1` both cite `packages/drag2/tests/packaging.node.test.ts:323` — `/from '@ydinjs\/box-quad'|BOX_ANCESTOR_/u.test(source)` — and both independently confirmed `BOX_ANCESTOR_` occurs nowhere else in the repository outside `.plan/` history, while box-quad's replacement slots are `SPACE_A`…`SPACE_ANCESTOR_ZOOM`. I re-ran both greps myself:

```
$ grep -rln "BOX_ANCESTOR_" packages --include="*.ts" --include="*.md" | grep -v ".plan/"
packages/drag2/tests/packaging.node.test.ts
$ grep -n "SPACE_A\b\|SPACE_ANCESTOR_ZOOM" packages/box-quad/src/index.ts packages/drag2/src/kernel/presentation.ts
[... both files use SPACE_A..SPACE_ANCESTOR_ZOOM ...]
```

Confirmed. The regex's own comment states its purpose: catching a behavior module that privately re-declares box-quad's ancestry-index constants rather than importing the module. That anti-pattern, reproduced today, would use `SPACE_*`; the regex cannot see it. Nothing currently violates D-85 — `der`'s forward pass and `integrity`'s `integrity-3` both confirm box-quad import is confined to `presentation.ts` — so this is tier B (an instrument the repository relies on is unsound with respect to what it was written to detect) rather than A. `der`'s required-property statement is adopted as the canonical wording, since it names the general fix (track the rename, or phrase the guard as the invariant) rather than only the specific constant swap `reviewer`'s wording implies.

**F-232 is `reviewer`-only** (`proof-1`), and I read `kernel/spec.ts:98-123` directly to confirm the doc block's wording is exactly as quoted — the pair-form paragraph above `AdmissionSubject`'s type body is untouched by the diff, while the type itself gained a required `item` member with its own, separate doc comment. This is not the same claim as `integrity-1`: integrity asked whether `item` is a _sound field to have_, and found yes — the one call site constructing the triple only does so when `item` genuinely diverges. `proof-1` asks whether the _surrounding prose_, read on its own by a third-party behavior author, tells them what the bare form now asserts about all three members. It does not — the paragraph still speaks only of `box === visual`, and `BehaviorSpec.admit`'s return description has the same gap. The two findings are compatible: the field is sound, its documentation on a published surface has not caught up.

---

## 3. F-234, F-235 — accepted as reported

Both checked directly against source and found to match the reporting pass exactly:

- **F-234** (tier C): `grep -rn "visualSpace\|itemSpace" packages/drag2/tests/` returns nothing — confirmed. The property is real (`integrity-2` independently traced the same `presentation.ts:504-529` code and confirmed reference identity, not just value equality), so this is a gap in what discriminates the claim in the suite, not a wrong claim. Consequence is confined to the accuracy of two records and one doc comment if the implementation ever silently regressed to two equal-but-distinct buffers — no consumer observes a difference either way, hence C rather than B.
- **F-235** (tier B): `grep -rn "\binheritedSpace\b" packages/drag2/src` returns nothing — confirmed the identifier no longer exists in source. `grep -n "inheritedSpace" packages/drag2/tests/perf/m5.browser.test.ts` confirms all five prose occurrences `cleanup` cited (lines 11, 32, 639, 774, 857) — separate from the still-live `inheritedSpaceOf` function name at line 477, which is unrelated and not part of the finding. `der` deliberately declined to report this same file to avoid overlapping with a parallel pass, which is why it surfaces from exactly one pass rather than two; the deference was correct rather than a miss, since `cleanup`'s report already covers it in full with matching evidence.

---

## 4. Package coherence and decision elimination — no drift, nothing left over

**`integrity`'s six checks are a clean, validated null result**, not a set of findings. I re-verified the two load-bearing claims directly rather than taking the report's word:

- `AdmissionSubject.item` is genuinely exercised as a third role: `sortable/spec.ts:449` constructs the triple only when `box`/`visual` diverge from the collection element, and `free-drag/spec.ts:315` never constructs the pair form at all — it supplies no counter-evidence, it simply doesn't touch the type.
- The object-identity claim (§3, F-234's subject) is real in the implementation, independently confirmed by both `integrity` and `reviewer`.
- D-85 holds: `grep -rn "@ydinjs/box-quad" packages/drag2/src` returns exactly one file, `kernel/presentation.ts`.
- The published-surface break (`AdmissionSubject`/`ActivationScope` gaining a required field on an already-exported kernel type) is disclosed twice, in the ledger and in the plan record, against a `"private": true` package — the same precedent-shape as D-162's accepted `DisplacementReport` break.
- box-quad's `01-public-api.md` staleness (still describing `readBoxQuad`/`Quad`, silent on `Space`/`ancestry`/the narrowed `Box`) is box-quad's own pre-existing, already-tracked **F-1**, unchanged by this commit — not new drift, and correctly not reported as a finding of this round.

**`der`'s forward pass is equally clean.** BQ-6's cache surface and BQ-9's boundary capability are fully absent from `box-quad/src/index.ts` — no dead branches, no stray exports, no leftover comments. D-164's boundary-parameterized encoding was superseded _before_ implementation, so there was nothing built to clean up. The F-225 sentence in `config.ts` is deleted, not reworded, leaving exactly the three scope limits D-165 specifies. Two guards were traced causally rather than dismissed by inspection: the widened `visual-no-box-space` throw in `acquireLift` guards a live, independent failure mode (the item's own chain failing 2D-representability, a configuration D-165 chose to support rather than refuse) and is not a resurrected membership check; the `item === visual` buffer-sharing branch is a still-justified performance short-circuit with nothing downstream branching on the identity it produces. `cleanup`'s independent pass over the same diff corroborates this at the naming/duplication level — `composeNode`/`zoomOf` are shared rather than duplicated between `ancestry`/`coordinates`, and the two-ancestry-reading path in `acquireLift` collapses to one buffer, one helper.

---

## 5. Local → canonical id map

| Local id | Pass | Canonical |
| --- | --- | --- |
| proof-1 | reviewer | F-232 |
| proof-2 | reviewer | F-233 |
| der-1 | der | F-233 (merged with proof-2) |
| proof-3 | reviewer | F-234 |
| cleanup-1 | cleanup | F-235 |
| integrity-1 … integrity-6 | integrity | — (null results, verdicts recorded; no canonical id) |

---

## 6. Routed, not decided here

**Nothing.** Every surviving finding (F-232 through F-235) has a required property stated by its reporting pass that is directly actionable without a design or contract choice: correct two doc blocks to state what the bare form now asserts about all three members; make one conformance regex track the current constant name or the underlying invariant instead of a retired spelling; add one assertion (or a short comment explaining why none is warranted) for the object-identity property; correct five comments and a doc block in one test file to name the mechanism that now exists. None of the four passes disagreed with another on any question both covered, and no finding here turns on unresolved semantics, a contract alternative, or what a prior decision now means.