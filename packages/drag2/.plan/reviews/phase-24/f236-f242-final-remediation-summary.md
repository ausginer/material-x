# F-236 – F-242 final remediation — review consolidation

**Round:** final remediation review over `3d968dfa..f3adb3fc` (one commit, `f3adb3fc`, `drag2: assert where box-quad may enter, and bring the kernel contract to the three-role subject`) on `drag2/fin-review`. Subject: closure of **F-236, F-237, F-238, F-239, F-241, F-242** — the six of the seven remediation-round findings not already closed by the architect's own disposition pass (`3d968dfa`, which closed F-240 and minted+closed F-243). Records read: `bq6-bq9-d165-remediation-summary.md` (the findings and their required properties) and `f239-f240-disposition-claude.md` (the architect's disposition for F-239, and the record correction for F-240/F-243).

**All four passes read files at `f3adb3fc`**, diffed against `3d968dfa`; each confirmed independently to be exactly one commit. Each pass committed its own artifact (`f236-f242-final-remediation-{feature-proof,integrity,cleanup,der}-claude.md`); none pushed by its pass. No pass modified a tracked file: `feature-proof`'s four mutation probes (hiding the expected import specifier, planting a new import in three different untested locations) were applied, run, and reverted, with `git status --short` and a full green re-run of the suite confirmed afterward.

**Passes run:** `reviewer` (feature proof), `integrity` (package coherence), `cleanup` (code discipline), `der` (decision elimination) — in parallel, in one message, none holding another's prompt, findings or artifact path.

**F-236, F-237, F-238, F-239, F-241 and F-242 are closed, each verified against the specific discrimination criterion given for it, not by inspection.** `feature-proof` demonstrated F-239 by mutation four separate ways, including catching a planted import in a directory (`src/newdir/`) the deleted two-directory loop could never have reached — direct evidence the new guard is exhaustive over `src/` rather than a wider blacklist. `der` independently checked all seven of the disposition's F-239 required properties item by item against the landed test and found each satisfied exactly as decided, with no property done differently or silently narrowed. `integrity` confirmed the reproduced types in the contract page match `src/kernel/spec.ts` member-for-member, and that D-59's reasoning is left standing beside D-165's addition. `cleanup` found the guard's rewrite a net simplification with no dead code and the strike-through usage proportionate to a document this repository's own model classifies as a Record, where amending in place with the supersession named is the sanctioned mechanism. **The production-behavior claim holds without qualification**: `src/kernel/spec.ts` is the only `src/` file in the delta, and a comment-stripped diff of it (both `feature-proof` and `der`, independently) produces no output. No measurement or `bench/` file appears in the delta, so nothing gives cause to reopen composition measurements. **The pre-existing lint-failure claim is confirmed**: both flagged files are byte-identical blobs across the diff range and outside the delta's file list; `feature-proof` reproduced the same three `oxlint` errors at `f3adb3fc` that the baseline carries.

**Five new findings survive independent verification**, all on the one surface this round's own required properties named as needing a full sweep rather than a citation-scoped fix (`.plan/contract/02-kernel-behavior-contract.md`) — two of them the same underlying defect found independently by two passes with directly corroborating evidence, the other three each found by one pass. None reopens F-236 through F-242; none is tier A. `cleanup` and `der` both returned clean null results on every question they were asked; nothing from either needed adjudication.

---

## 1. Findings

| Canonical | Tier | Claim | From |
| --- | --- | --- | --- |
| **F-244** | B | `.plan/contract/02-kernel-behavior-contract.md`'s D-85 placement-reasoning subsection (`#### Why inheritedSpace is on the scope...`), untouched by this commit, is entirely unstruck and states three things the corrected `ActivationScope` block twelve lines above it, this same commit's own new prose, and the shipped source all contradict: it names `inheritedSpace` in its own heading after that field was struck as retired three lines above; it says "the new member joins them" where two joined; and its load-bearing claim — "one failure policy, because there is now one read... has no second read left to disagree with" — is false of the tree, contradicted by `presentation.ts`'s own doc ("the item's ancestry is a second walk, and it is spent deliberately") and by this same contract page's own corrected `visualSpace` paragraph twelve lines above. D-85's own (already-corrected) ledger row actively cites this stale subsection by its literal heading as "the reasons" for the placement | `reviewer` (proof-1), `integrity` (integrity-1) — same defect, independently found and corroborating |
| **F-245** | B | Two more places on the same swept page state the retired two-role admission subject, unstruck: D-59's "settled spelling" verdict table (the page's own words: "settled here so 06 can follow it") still marks `HTMLElement \| { visual, box } \| null` as **"this"**, ten lines above the paragraph this commit added recording that D-165 widened it again; and D-52's window-ownership diagram, inside a fenced code block, still reads `admit  behavior RETURNS { visual, box }` | `reviewer` (proof-2) |
| **F-246** | C | Two statements on the swept page were corrected in place with no strike, unlike four other sites the same commit did strike — the seam table's `admit` cell and `ActivationScope.box`'s doc comment. Both are now factually correct; what is lost is the provenance the directory's own strike convention exists to keep, and the file already has six precedent instances of striking a table cell (line 642) | `reviewer` (proof-3) |
| **F-247** | C | `src/sortable/spec.ts:424`, "So it travels as the **second half of the admission subject**" — F-236's wording class, surviving the one directory outside `src/kernel/` the sweep that closed F-236 didn't reach | `reviewer` (proof-4) |
| **F-248** | C | Two of this commit's strike-throughs (lines 272, 1000) retire an actual type/field declaration line, wrapped in a bare `//` comment — a style with no precedent anywhere in `.plan/contract/*.md`, where every existing instance strikes retired _prose_, never a restated-as-commented-out declaration | `integrity` (integrity-2) |

Ids continue from the drag2-tree high-water mark `F-243` (confirmed by `grep -rohE '\b[FQI]-[0-9]+\b' packages/drag2/.plan/ | sort -t- -k2 -n | uniq | tail`, re-run at consolidation). No `Q-` or `I-` was minted, matching this tree's established use of `F-` for documentation/instrument-accuracy defects. **No `D-*` was minted, amended or superseded** — all five findings are directly actionable corrections to an unstruck normative surface, none turns on a design or contract choice.

---

## 2. F-236 through F-242 — closed, each against its own discrimination criterion

- **F-239.** All seven of the disposition's §2.5 required properties verified two ways — `feature-proof` by four mutation probes (hiding the expected specifier fails the guard rather than passing vacuously; planting an import in `sortable/rect-index.ts`, in `src/shared/`, and in a freshly-created `src/newdir/` are all caught in one run, proving the assertion covers the whole tree rather than the two directories the deleted loop walked) and `der` by item-by-item textual comparison against the disposition's own table. `integrity` independently confirmed the "As landed" ledger paragraph names the test's actual assertion exactly. The old cross-package read (`slotConstants()`, `declaresSlot`, the `readFile` of `box-quad/src/index.ts`) is confirmed fully gone by three passes independently (`grep` finds no trace; `cleanup` confirmed no import or local variable was orphaned by its removal).
- **F-237.** The three sites the finding named are struck under the directory's own convention (confirmed by all three of `feature-proof`, `integrity` and `cleanup`, each reading the strike-through directly rather than trusting the commit's own account): the reproduced `AdmissionSubject`, `admit`'s return doc, and `ActivationScope.inheritedSpace`'s field and derivation paragraph. The reproduced shapes match `src/kernel/spec.ts` member-for-member (`integrity`, confirmed independently). D-59's "Three reasons, in order of weight" section is untouched at the diff level — no `+`/`-` on any of its three bullets — with D-165's widening recorded in an added paragraph immediately after it, not in place of it. **The sweep itself did not reach the whole page** — see F-244/F-245/F-246 below, which is why F-237 is recorded closed on the three sites its own evidence named, not on the page as a whole.
- **F-236.** `feature-proof` swept the whole of `src/` (not only `src/kernel/`) for "pair form", "half", "box half", "visual half" and read all resulting hits; none describes `AdmissionSubject`/`ActivationScope` outside one leftover instance one directory over (F-247). `ActivationScope.visual`'s doc now carries the same shape `box`'s doc already had, closing the specific site F-236 named.
- **F-238 / F-241.** `feature-proof` counted the five sites against the pre-remediation baseline itself (`git show 5adc3ab3:...`) rather than trusting either the old or new ledger prose: two occurrences inside the doc block, two inline comments, one `console.info` label — exactly the distribution the corrected row now states, and exactly what F-238's fix and F-241's disclosure both needed to be accurate. The row implies no measurement, threshold or fixture change, and none exists in the diff of that file across the whole round.
- **F-242.** `feature-proof` diffed the whole of `COVERAGE.md` with the one expected row removed and found no output — the file was not reformatted — and confirmed `prettier --check` warns identically at both `3d968dfa` and `f3adb3fc`, the same pre-existing state F-231 already established as deliberate.

**Production-behavior and scope claim: verified without qualification.** `src/kernel/spec.ts` is the only `src/` file in the six-file delta (`integrity`, `der` and `feature-proof` all confirm independently), and a comment-stripped diff of it produces no output on two independent runs (`feature-proof`'s and `der`'s, using different stripping methods). No `perf`/`bench`/measurement file appears anywhere in the diff.

**Baseline lint-failure claim: confirmed.** `feature-proof` confirmed `tests/sortable/g3-conformance.browser.test.ts` and `bench/size/noncomposed.js` are byte-identical blobs at `3d968dfa` and `f3adb3fc`, outside the delta's file list, and reproduced the same three `oxlint` errors reported at baseline. Not fixed, per instruction.

---

## 3. F-244, F-245 — the sweep that closed F-237 did not reach the whole normative page

**F-244 is one defect independently found by two passes with directly corroborating, not merely overlapping, evidence** — not two findings that happen to agree. `reviewer`'s `proof-1` and `integrity`'s `integrity-1` both cite the same three sentences at the same lines (the heading naming the retired field, "the new member" singular, and "one failure policy, because there is now one read... has no second read left to disagree with"), and both independently traced the same contradiction to `src/kernel/presentation.ts`'s own doc comment. I re-read the subsection and the presentation.ts comment directly:

```
$ sed -n '1028,1044p' .plan/contract/02-kernel-behavior-contract.md
#### Why `inheritedSpace` is on the scope and not on the session (D-85, E-01)
...
**One failure policy, because there is now one read.** ...
The split policy E-01 found — one read refusing what the other silently
substituted — has no second read left to disagree with.

$ sed -n '480,482p' src/kernel/presentation.ts
 * **The item's ancestry is a second walk, and it is spent deliberately.** No
 * layout is read for it and no rect is measured; it is computed style up the
 * flat tree, once per activation, and only when the item is not the visual.
```

Confirmed. Both passes are right, and the defect is sharper than an ordinary staleness: it is a false claim about the current tree, standing unstruck twelve lines below the exact paragraph in the same document — corrected by this same commit — that says the opposite ("the walk itself is no longer shared with the measurement — D-165 spends that property deliberately"). I independently confirmed the escalating detail `integrity` raised: D-85's own ledger row, itself already corrected by F-240 and in force, actively cites this stale subsection by its literal heading as "the reasons" for the placement (`00-index.md:371`, `"the reasons are in [02](02-kernel-behavior-contract.md) §Why \`inheritedSpace\` is on the scope"`). This is not an inert, unreached corner — it is a live citation target. Tier B, on the same basis F-237 and F-244's own two contributing findings agree it is: no runtime effect, but a correctly-integrated reader following an in-force citation is actively misled about how many ancestry reads `acquireLift` performs.

**F-245 is `reviewer`-only** (`proof-2`), and I confirmed both sites directly. D-59's own "settled spelling" table — introduced by the page's own words as "settled here so 06 can follow it" — still marks the two-role union `HTMLElement | { visual, box } | null` as **"this"**, immediately above the paragraph this very commit added acknowledging D-165 widened it again. D-52's window-ownership diagram, inside a ` ```text ` fence (which cannot carry a markdown strike, unlike the two sites F-237 covered), still reads `admit  behavior RETURNS { visual, box }`. Tier B for the same reason as F-244: the table is the page's own designated authority for "the spelling," explicitly pointed downstream at document 06, and it currently states a union the type has not carried since D-165.

Both are the same general shape F-236 and F-237 already named this round — a remediation scoped to the sites a finding's own evidence happened to cite passes over identical instances elsewhere on the same surface — recurring at the level of an entire normative page rather than a single doc comment.

---

## 4. F-246, F-247, F-248 — smaller, independently verified

- **F-246** (`reviewer`-only, `proof-3`, tier C). Confirmed: `02-kernel-behavior-contract.md:453` (the seam table's `admit` cell) and `:948` (`ActivationScope.box`'s doc) were both reworded to the correct, current shape with no strike, while four other sites in the same commit were struck. The file already carries six precedent instances of striking a table cell (line 642 confirmed: `~~**D-46**, decline~~ **the consumer, via \`[data-drag-ignore]\`** (D-129)`), so the convention was available and was simply not applied at these two sites. Tier C because both statements are correct as landed — nothing here misleads a reader, only the provenance is lost.
- **F-247** (`reviewer`-only, `proof-4`, tier C). Confirmed `src/sortable/spec.ts:424` — "So it travels as the second half of the admission subject" — is the sole remaining instance of F-236's wording class in all of `src/` (40 total `half` hits swept, all others unrelated to the admission subject's shape). Tier C: the comment sits in a factory closure, reaches no emitted `.d.ts`, and the surrounding doc block already states the corrected three-role shape.
- **F-248** (`integrity`-only, `integrity-2`, tier C). Confirmed both `// ~~...~~` instances (lines 272, 1000) are new in this commit (`git show 3d968dfa:... | grep -c '// ~~'` → 0) and confirmed no other instance of striking a bare code/declaration line exists anywhere in `.plan/contract/*.md` — every other strike retires prose, including the file's own pre-existing precedent at line 60 (a JSDoc sentence, not a declaration). Tier C: the live declaration is still plainly present immediately below each struck comment, so nothing is misread — it is a formatting divergence worth naming, not a soundness defect.

---

## 5. Routed, not decided here

**Nothing.** All five findings are direct corrections to an unstruck or inconsistently-struck normative page, discovered by extending the same sweep F-236 and F-237 already required to the rest of `.plan/contract/02-kernel-behavior-contract.md`: strike the D-85 placement subsection's three false/stale statements and correct them to the two-space, two-read model (F-244); strike or annotate the two remaining two-role spellings on the same page (F-245); strike the two sites reworded without a strike, for provenance (F-246); correct the one remaining "half" comment in `src/sortable/spec.ts` (F-247); restate the two code-declaration strikes in the document's existing prose-strike style, or note the departure (F-248). None turns on unresolved semantics, a contract alternative, or what a decision now means.

---

## 6. Package coherence, decision fidelity and code discipline — clean beyond the five findings

**`cleanup` returned a clean null result on all four of its questions.** The D-85 guard rewrite is a net simplification (−49/+11 lines) with no dead imports or locals; the strike-through additions are proportionate to a document `.agents/docs/documentation.md` §8 classifies as Record, where §6 sanctions amending in place with the supersession named; the ledger/plan additions match the format the prior round's own `cleanup` pass already validated; no other hunk introduces machinery beyond what closing the six findings requires.

**`der` returned a clean null result on all four of its questions**, independently re-derivable: all seven of the disposition's F-239 required properties hold exactly as specified, none reinterpreted; D-85's correction was made entirely in the prior commit `3d968dfa` and every one of its four "verbatim" clauses is byte-identical across this commit (I re-confirmed the ledger row and `npx just decisions`' live output agree, with no second store to reconcile); F-240 and F-243 are neither re-touched nor duplicated by `f3adb3fc`; nothing resurrects a retired mechanism, and the new hardcoded site array is exactly the "positive and exhaustive" property the disposition required, not a fresh undecided commitment — confirmed distinct in kind from the old guard's failure, since a future addition to the set is a visible, deliberate edit rather than a silent extraction gap.

**`integrity`'s remaining clean results, independently re-verified:** the reproduced `AdmissionSubject`/`admit`/`ActivationScope` blocks match `src/kernel/spec.ts` member-for-member; the seam table's `admit` row agrees with the corrected type block in the same file, same round; `00-index.md`, `plan.md` and `COVERAGE.md` agree on the five-site count for F-235/F-238/F-241 and on F-239's "as landed" description; `packaging.node.test.ts`'s rewrite leaves no orphaned imports or stale references; closure-row format matches precedent, including the non-standard-but-precedented "closed as recorded, no fix required" phrasing for F-241/F-242; nothing in `.plan/` still treats F-236 through F-242 as open or routed.

---

## 7. Local → canonical id map

| Local id | Pass | Canonical |
| --- | --- | --- |
| proof-1 | reviewer | F-244 (merged) |
| proof-2 | reviewer | F-245 |
| proof-3 | reviewer | F-246 |
| proof-4 | reviewer | F-247 |
| integrity-1 | integrity | F-244 (merged) |
| integrity-2 | integrity | F-248 |
| cleanup: no local findings | cleanup | — (clean null result on all four questions, verdicts recorded, no canonical id) |
| der: no local findings | der | — (clean null result on all four questions, verdicts recorded, no canonical id) |