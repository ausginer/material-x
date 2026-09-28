# BQ-6 / BQ-9 / D-165 remediation — review consolidation

**Round:** remediation review over `5adc3ab3..052de91b` (one commit, `052de91b`, `drag2: state all three admission roles, derive the D-85 guard's names, and assert the shared space`) on `drag2/fin-review`. Subject: closure of **F-232 through F-235**, the four tier-B/C findings the prior consolidation (`bq6-bq9-d165-summary.md`) left after the BQ-6/BQ-9/D-165 round. That round's own subject — BQ-6/BQ-9/D-165 themselves — is not reopened here; this round is scoped to whether the four findings' required properties now hold, and to what else the remediation's own delta introduced.

**All four passes read files at `052de91b`**, diffed against `5adc3ab3`; confirmed by each pass independently to be exactly one commit. Each pass committed its own artifact (`bq6-bq9-d165-remediation-{feature-proof,integrity,cleanup,der}-claude.md`); none was pushed by its pass — publishing is this consolidation's job. No pass modified a tracked file: `feature-proof`'s four mutation probes (breaking the extraction regex, planting the anti-pattern, reverting the identity short-circuit, collapsing the two derivations) were each applied, run, and reverted, with `git status --short` verified clean afterward.

**Passes run:** `reviewer` (feature proof), `integrity` (package coherence), `cleanup` (code discipline), `der` (decision elimination) — in parallel, in one message, none holding another's prompt, findings or artifact path.

**F-232 through F-235 are closed, and the closure is demonstrated rather than asserted.** `feature-proof` discriminated all four by mutation: breaking the D-85 guard's extraction fails its own vacuity check; planting the current-spelling anti-pattern is caught by the new guard and passes green under the _old_ one (F-233's claim reproduced and its fix demonstrated in the same run); removing the identity short-circuit fails F-234's identity row on `Object.is` while the divergence control still passes; collapsing the two derivations fails the control instead. `der` independently traced F-235's rewritten premise causally (`sortable/spec.ts:882` hands `itemSpace` down, but it is read only inside `if (report)`) rather than reading it off the record. `integrity` confirmed the fixed doc block is exercised as documented at every construction site in `src/`. No pass disputes closure of any of the four. **The production-change claim also holds**: `src/kernel/spec.ts` is the only `src/` file touched, and every changed line is inside a `/** */` block — confirmed by both `feature-proof` and `integrity` with a comment-stripped diff showing no output.

**Seven new findings survive independent verification** — none reopens F-232 through F-235, none is a runtime-observable (tier A) defect, and none was found by more than one pass except the three that converge on the same residual gap in F-233's own fix. `cleanup` returned a clean null result on all four of its questions; nothing from that pass needed adjudication.

---

## 1. Findings

| Canonical | Tier | Claim | From |
| --- | --- | --- | --- |
| **F-236** | B | `ActivationScope.visual`'s doc block (`kernel/spec.ts:158`) still calls the element "the visual **half** of what `admit` returned" — F-232's own defect class, on the same published type, six lines above the `box` member this commit corrected | `reviewer` (proof-1) |
| **F-237** | B | `.plan/contract/02-kernel-behavior-contract.md` reproduces the pre-D-165, two-role `AdmissionSubject`/`admit` doc _and_ the pre-D-165 single-field `ActivationScope.inheritedSpace`, unstruck, on a page whose own convention makes unstruck text normative; untouched by D-165's landing or by this remediation | `integrity` (integrity-1) |
| **F-238** | C | `00-index.md`'s new F-235 ledger row states "the doc block and four inline comments" where the diff shows three inline comments outside the doc block (which itself spans lines 1–41 and contains two of the five cited occurrences) | `integrity` (integrity-3) |
| **F-239** | B | F-233's fix still depends on an unstated, undecided assumption about box-quad's private constant-declaration shape and location: silently loses a name under a declaration-form change or a file relocation within `box-quad/src`, and no `D-`/`BQ-` record or repository convention commits to that shape being stable | `reviewer` (proof-3), `integrity` (integrity-2), `der` (der-1) |
| **F-240** | B | D-85's own live entry in the decision projection (`npx just decisions`) still states `ActivationScope carries inheritedSpace` — a field name the tree has not carried since D-165 landed, before this remediation. Pre-existing, not introduced by `052de91b`, newly discovered by this round and not previously tracked under any id | `der` (der-2) |
| **F-241** | C | The one non-comment change in `perf/m5.browser.test.ts` is a `console.info` diagnostic label (`inheritedSpace=` → `inheritedSpaceOf=`) inside the opt-in `VITE_DRAG_MEASURE` block — benign and accurate, but makes the "prose-only" description of that file's delta imprecise | `reviewer` (proof-2) |
| **F-242** | C | The new `COVERAGE.md` section heading (line 991) is the only one of 40+ in the file not preceded by a blank line, from appending onto a file with no trailing newline — cosmetic, no instrument parses it, and must not be "fixed" by running the formatter per F-231's precedent | `reviewer` (proof-4) |

Ids continue from the drag2-tree high-water marks `F-235`, `Q-16`, `I-37` (confirmed by `grep -rohE '\b[FQI]-[0-9]+\b' packages/drag2/.plan/ | sort -t- -k2 -n | uniq | tail`, re-run at consolidation). No `Q-` or `I-` was minted — every finding here is a documentation-, ledger-, or instrument-accuracy defect of the same kind `F-` already covers in this tree, matching the prior round's own use of the prefix. **No `D-*` was minted, amended or superseded by this round** — two findings (F-239, F-240) raise a question a `D-*` may eventually need to answer, but neither is settled here; see §6.

---

## 2. F-232 through F-235 — closed, verified by discrimination not inspection

Each finding's specific discrimination criterion, checked directly:

- **F-232.** Both named sites (`AdmissionSubject`'s doc block, `admit`'s return description) now state three roles and the `item === box === visual` bare form, consistently — `grep -rn "pair form\|box half\|visual half" packages/drag2/src` returns exactly one hit, which is F-236 below, not a contradiction within F-232's own named sites. `admit`'s new sentence states the bare form as a precondition ("when the item, the visual and the box are one element"), not a bare noun list — the thing a reader of `admit` alone previously lacked.
- **F-233.** All three sub-questions verified by execution, not reading: the extraction reads `box-quad/src/index.ts` directly (no forbidden name is a literal in the test); breaking the extraction regex fails `expect(forbidden.length).toBeGreaterThan(0)` (`expected 0 to be greater than 0`); planting `const SPACE_A = 0;` in `free-drag/geometry.ts` is caught by the repaired guard and — decisively — passes green under the **pre-remediation** guard when the same plant is left in place. That is F-233's claim reproduced and its closure demonstrated on the same tree in the same run, the strongest evidence in either report.
- **F-234.** The identity row fails on `Object.is` (not on value) when the shared-buffer short-circuit is removed — `Compared values have no visual difference`, confirming it discriminates reference identity from equal value. The control row fails on arithmetic (`0.3333... vs 0.5`) when the two derivations are collapsed to one, confirming it is a genuine divergence control rather than a second identity check. The expected `0.5`/`1/3` figures were hand-traced against `box-quad`'s `ancestry()` (which excludes the element's own transform) independently of the browser's own observed `0.3333333333333333`.
- **F-235.** Every rewritten factual claim was checked against source, not against the record — including the arm-B premise, traced causally: `sortable/spec.ts:882` hands `itemSpace` down unconditionally, but it is read only inside `if (report)` where `report: DisplacementReport | null`, confirming "derives it and never spends it" with no displacement sink composed. The fixture, thresholds and measured code paths are unchanged — a comment-stripped diff of the whole file shows exactly one non-comment line differs (the `console.info` label, F-241).

**The production-change claim holds without qualification.** A comment-stripped diff of `src/kernel/spec.ts` between `5adc3ab3` and `052de91b` produces no output — the `AdmissionSubject` union, every `ActivationScope` member, and `admit`'s signature are byte-identical. It is the only `src/` file in the seven-file delta.

---

## 3. F-236, F-237 — the same defect class F-232 fixed, surviving on two sites F-232 didn't name

**F-236** (`reviewer`-only, `proof-1`) is on the _same file_ the round already fixed: `kernel/spec.ts:158`, `ActivationScope.visual`'s own doc comment, six lines above the `box` member whose identical "half" wording this commit corrected. I confirmed the wording directly (`sed -n '155,165p' packages/drag2/src/kernel/spec.ts`) — unchanged since `5adc3ab3`. This is not a reopening of F-232: F-232's evidence named exactly two sites, and both are fixed as scoped. It is a new instance of the identical defect, one member away from where the fix stopped.

**F-237** (`integrity`-only, `integrity-1`) is a second published surface entirely: `.plan/contract/02-kernel-behavior-contract.md`. I read the cited lines directly and confirmed both claims — the reproduced `AdmissionSubject` type has no `item` member (`Readonly<{ visual: HTMLElement; box: HTMLElement }>`), `admit`'s doc still reads "optionally paired," and `ActivationScope`'s code block still shows a single `inheritedSpace: InheritedSpace` field (plus its own "box half" wording — a second, independent instance of F-236's defect class) rather than the shipped `visualSpace`/`itemSpace` split. `git log --oneline` confirms the file's last touch, `60eb9e50`, is an ancestor of `5adc3ab3` — neither D-165's landing nor this remediation reached it. The directory's own `README.md` states "the term in force is the unstruck text... nothing struck is normative" (confirmed verbatim), so this is not inert history; it is the currently-normative statement of two types, wrong on both the shape D-165 landed and the shape F-232 corrected elsewhere.

Both are tier B on the same basis F-232 itself was: a correctly-integrated reader can be misled by a published surface, independent of how many sites already got fixed.

---

## 4. F-239 — the D-85 guard's remediation has its own residual instrument-soundness gap

**Merged from three independently-arrived-at facets of one underlying defect**, not three findings that happen to overlap: `reviewer`'s `proof-3`, `integrity`'s `integrity-2`, and `der`'s `der-1` each traced a different concrete way the same mechanism — `slotConstants()`'s regex extraction from `box-quad/src/index.ts` — can silently narrow what it catches, without disputing that the mechanism works today (all three confirm the current 16 names extract correctly and the guard fires on the current-spelling anti-pattern).

- `proof-3`: a **declaration-form** change (`export const`, `as const`, indentation, a non-integer initializer) drops exactly the renamed name from `forbidden` while the vacuity check (`forbidden.length > 0`) stays satisfied on the rest.
- `integrity-2`: a **relocation** — box-quad's already-separable `BOX_*`/`SPACE_*`/`QUAD_*` groups moving into their own files, still re-exported from `index.ts` — drops the relocated names the same way, since `slotConstants()` reads exactly one file.
- `der-1`: neither box-quad's own BQ-9 record nor any repository convention commits to box-quad's constant-declaration shape being stable, and this is the only place in the repository where one package's tests read another package's `src/` file directly (`grep -rn "readFile(" packages --include="*.test.ts"`, confirmed). The dependency this guard now has is named nowhere but its own doc comment.

**Tier: B, not the C two of the three reporting passes assigned** — stated here as a reclassification with reasoning, not a vote. The prior round's own consolidation rated F-233 tier B specifically _because_ "an instrument the repository relies on is unsound with respect to what it was written to detect," independent of whether anything currently violates it. `proof-3` and `integrity-2` rated their own findings C on the grounds that "nothing today depends on it" — but that is exactly the condition that was already true of F-233 itself when it was rated B. Applying the tier vocabulary by consequence rather than by current violation, as the vocabulary document requires, this residual gap is the same kind of instrument-unsoundness F-233 was, one layer down, and is tier B on the same basis.

**Required property**, combining the technical and provenance halves: the guard's forbidden-name extraction is insensitive to box-quad's declaration form and to relocation within `box-quad/src` (or its advertised resilience — "a rename... carries the guard with it" — is corrected to state the narrower boundary it actually has); and the dependency this guard now has on box-quad's private source shape is named somewhere a decision record names dependencies, not only in the test file's own doc comment.

**Not settled here.** Whether that naming takes the form of a new decision, a note on D-85, or a documented convention for cross-package test coupling is a design/contract-provenance choice — routed to the architect, §6.

---

## 5. F-240, F-241, F-242 — smaller, independently verified

- **F-240** (`der`-only, `der-2`, tier B). `npx just decisions` for D-85, re-run at consolidation, returns "ActivationScope carries `inheritedSpace`... derived from the measurement `acquireLift` already took before it mutated anything" — confirmed verbatim. `ActivationScope` has carried no such field since D-165 landed; `visualSpace`/`itemSpace` are the only spaces on the type (`kernel/spec.ts:202,216`). This predates `052de91b` and is not this remediation's regression — but it is not tracked under any existing id (`grep -n "^| D-85" 00-index.md` shows the same stale text in the ledger row itself, and no F- id addresses it), so it would be lost if not captured now. It bears directly on this round's own reliance on "D-85 holds," the primary instrument `der` was asked to consult.
- **F-241** (`reviewer`-only, `proof-2`, tier C). Confirmed: the comment-stripped diff of `m5.browser.test.ts` shows exactly one non-comment line changed, a `console.info` label inside the `describe.runIf(VITE_DRAG_MEASURE)` block. The printed quantity is unchanged; only the identifier preceding `=` differs, and the new name (`inheritedSpaceOf`) is the live private function's actual name. No assertion, no measurement path affected — flagged only so "prose-only" is precise about this file's delta.
- **F-242** (`reviewer`-only, `proof-4`, tier C). Confirmed the missing blank line is a byproduct of `COVERAGE.md`'s pre-existing missing trailing newline (the same file-shape hazard F-231 already documents for `00-index.md`), and confirmed via `prettier --check` that the file already warned at `5adc3ab3` — not a new regression, and explicitly must not be "fixed" by reformatting per F-231's own precedent.

---

## 6. Routed, not decided here

**F-239 and F-240**, both because they turn on a decision-provenance question this consolidation is not authorized to settle:

- **F-239.** Whether drag2's tests reading box-quad's private `src/` file is an acceptable, sanctioned pattern that should be named as a decision (a new `D-*`, or a documented convention), or whether the guard should instead be redesigned to avoid the cross-package source read entirely, is a design choice between contract alternatives. `der`'s report states the gap; it does not choose between naming the dependency and removing it, and neither does this consolidation.
- **F-240.** Whether the `inheritedSpace` → `visualSpace`/`itemSpace` split (D-165) was a _substantive_ amendment to D-85 — per `.agents/docs/documentation.md`'s own rule, one that "changes what the decision requires of the code" and should have superseded D-85 with a new id — or a _non-substantive_ one correctable in place, is exactly "what a decision now means." `der` explicitly declined to settle it ("this pass surfaces rather than settles"); this consolidation preserves that deference rather than picking a side.

**F-236, F-237, F-238, F-241, F-242** are directly actionable without a design or contract choice, the same shape as the original four: correct one more doc-block site in `kernel/spec.ts`; bring `.plan/contract/02-kernel-behavior-contract.md`'s two stale type blocks into agreement with the shipped shapes, or strike them per the directory's own revised-in-place convention; correct the F-235 ledger row's inline-comment count; note F-241's label change so the file's delta is described precisely (no action required — it is accurate as landed); no action required for F-242 beyond leaving it as is (reformatting would be the regression, per F-231).

**None of the seven new findings has a ledger row yet.** F-232 through F-235 acquired theirs as part of the remediation commit itself; F-236 through F-242 do not yet appear in `00-index.md`. Adding them is left to whoever picks up this round's output next, consistent with how this tree has been handling ledger entries for open findings.

---

## 7. Package coherence and code discipline — clean, stated explicitly

**`cleanup` returned a clean null result on all four of its questions**, independently re-derivable from its own evidence: `slotConstants()`'s I/O-and-regex approach matches the file's pre-existing idiom rather than introducing a new category of mechanism, and its "over-broad by construction" widening was checked against the current tree and produces no false positive; `presentation.browser.test.ts`'s new `acquire()`/`stage()` helpers are not duplicates of the file's existing `lift()` (which cannot supply diverging item/visual or return the full acquisition object) and clear the file's own two-call-site threshold for a helper; the `kernel/spec.ts` and `m5.browser.test.ts` prose rewrites are sized to the defect they close, with no history narration or new `D-`/`F-`/phase references beyond the pre-existing bare pointers the files already carried; the triple recording of F-232–F-235 across `00-index.md`/`plan.md`/`COVERAGE.md` matches the package's pre-existing ledger/narrative/coverage split, not new duplication.

**`integrity`'s remaining clean results, independently re-verified:** `kernel.ts`'s bare-element normalization sets `visual = box = item = subject` exactly as the new doc states; `sortable/spec.ts:449` constructs the pair form only when the three diverge, and always supplies `item`; `free-drag/spec.ts` never constructs the pair form at all and supplies no counter-evidence; no other doc comment, story file or README restates the two-role model (the one exception is F-237); `COVERAGE.md`'s new section names the same assertions the new test rows carry, with matching ids.

---

## 8. Local → canonical id map

| Local id | Pass | Canonical |
| --- | --- | --- |
| proof-1 | reviewer | F-236 |
| proof-2 | reviewer | F-241 |
| proof-3 | reviewer | F-239 (merged) |
| proof-4 | reviewer | F-242 |
| integrity-1 | integrity | F-237 |
| integrity-2 | integrity | F-239 (merged) |
| integrity-3 | integrity | F-238 |
| der-1 | der | F-239 (merged) |
| der-2 | der | F-240 |
| cleanup: no local findings | cleanup | — (clean null result on all four questions, verdicts recorded, no canonical id) |