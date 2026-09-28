# F-244–F-248 closure — review consolidation

**Round:** closure review over `55a20d2f..2919b975` (one commit, `2919b975`, `drag2: finish the D-165 migration across the kernel behavior contract`) on `drag2/fin-review`. Subject: whether the load-bearing claim of this unit holds —

> The D-165 migration is now complete across `02-kernel-behavior-contract.md`, and the retired two-role/single-space wording class no longer survives as a live claim on that page or in `src/`.

Per instruction, F-244 through F-248 were treated as **provenance for what to look for, not the boundary of where to look** — the prior three rounds each swept only as far as the previous finding's own citations pointed, and each left instances of the same class on the same page. All four passes were briefed accordingly and confirmed they read the whole 2026-line page and the whole of `src/`, not the diff.

**All four passes read files at `2919b975`**, diffed against `55a20d2f`; each confirmed independently to be exactly one commit. Each pass committed its own artifact (`f244-f248-closure-{feature-proof,integrity,cleanup,der}-claude.md`); none pushed by its pass.

**Passes run:** `reviewer` (feature proof), `integrity` (package coherence), `cleanup` (code discipline), `der` (decision elimination) — in parallel, in one message, none holding another's prompt, findings or artifact path.

---

## Verdict: the load-bearing claim holds. The arc closes here.

**Within its stated scope — `02-kernel-behavior-contract.md` and `src/` — the claim is verified true**, by two passes that each independently read the entire 2026-line page start to finish (not the diff) and swept all 60 files under `src/`, plus two passes that verified the specific reasoning changes and decision fidelity underneath it:

- `feature-proof` read the whole page in seven sequential passes and ran four targeted mechanical sweeps (`{ visual, box }`, `inheritedSpace`, single-read language, `two roles`/`half`) across every line; every hit is either struck, inside an explicit historical retirement note, or an unrelated sense of a shared word. It separately swept all 60 `src/` files by regex and found no surviving instance.
- `integrity` independently read the whole page in three passes and re-verified `AdmissionSubject`/`ActivationScope` shape fidelity against `src/kernel/spec.ts` member-for-member, found the strike/provenance convention uniform across sections no prior round had cited, and confirmed the "pair" blanket-instruction residue is fully covered on the page itself.
- `der` verified F-244's rewritten D-85 placement argument is a _correct_ restatement — not merely a different one — by tracing it against E-01's actual original text and against `acquireLift`'s real three-observation/one-throw structure in `src/kernel/presentation.ts`, and confirmed D-85's citation update is the only change to any `D-*` row in the commit and is purely non-substantive.
- `cleanup` confirmed the volume and placement of new strike-through markup matches exactly what F-244/F-245/F-246/F-248 required — no more, no less — and that the `src/sortable/spec.ts` change is comment-only and proportionate.

**No pass found a surviving live instance of the retired two-role `AdmissionSubject`, a single `ActivationScope.inheritedSpace`, or a single-ancestry-read claim, anywhere on the page or in `src/`.** Three minor tier-C findings survive from this round (§2 below) — none is a surviving instance of the retired wording class, and none blocks closing the arc as scoped.

**One further finding survives, and it is reported precisely because it does not fall inside the claim being verified**: `integrity` found that `06-vertical-sortable-trace.md` — a page `02-kernel-behavior-contract.md` itself names as depending on its settled spelling ("settled here so 06 can follow it") — still shows the fully retired shape, including a form `02`'s own table marks _rejected_. This is real, evidence-backed drift on a surface adjacent to, but outside, the boundary this round's claim was scoped to. **It does not reopen or falsify the claim under review, and it is not "another site-bounded remediation cycle" of the same arc** — it is a distinct page nobody in this four-round sequence was ever asked to check, surfaced now by a pass reading past the letter of its brief. See §3.

**Given the above: the load-bearing claim, as stated, holds. This arc — the four-round chain closing F-232 through F-248 on `02-kernel-behavior-contract.md` and `src/` — is closed.** F-252 (§3) is handed off as a freshly-scoped, separate item, not a continuation.

---

## 1. Findings

| Canonical | Tier | Claim | From |
| --- | --- | --- | --- |
| **F-249** | C | The commit's own clarifying sentence — "Read _the pair_ above as _the object form_ from here on" — is itself a live inconsistency: three uses of "the pair" stand unstruck immediately around it (two above, one after), handled by a forward-looking soft instruction instead of the strike-and-replace convention this same commit applies everywhere else, and the sentence's two scope markers ("above" vs. "from here on") point in opposite directions, leaving the one use _after_ the sentence in a genuine reading ambiguity | `reviewer` (proof-1), `cleanup` (cleanup-1) — same site, complementary evidence |
| **F-250** | C | `plan.md`'s new closing paragraph ("The recurrence is the finding worth keeping...") restates a generalization already stated, in substance, in the immediately preceding plan entry and again in this same commit's own `00-index.md` F-247 row — only the specific three-round site enumeration is new and load-bearing | `cleanup` (cleanup-2) |
| **F-251** | C | The new `plan.md` section is preceded by two blank lines before its `---` separator, the only such occurrence in the file; every other section boundary uses one | `cleanup` (cleanup-3) |
| **F-252** | B | `06-vertical-sortable-trace.md`, which `02-kernel-behavior-contract.md` itself names as the document meant to follow its settled `AdmissionSubject` spelling, still reproduces the two-role admission shape twice — including one form `02`'s own D-59 verdict table marks _rejected_ — and an `ActivationScope` with no `visualSpace`/`itemSpace` fields at all (predating D-85, not only D-165). Outside this round's literal scope (page 02 and `src/`); reported because `02`'s own text creates the dependency | `integrity` (integrity-2) |

Ids continue from the drag2-tree high-water mark `F-248` (confirmed by `grep -rohE '\b[FQI]-[0-9]+\b' packages/drag2/.plan/ | sort -t- -k2 -n | uniq | tail`, re-run at consolidation). No `Q-` or `I-` was minted. **No `D-*` was minted, amended or superseded** — confirmed independently by `der`: D-85's row is the only decision row touched in this commit, and its only edit is a citation retarget to the renamed heading, non-substantive. All four findings here are directly actionable corrections; none turns on a design or contract choice.

One item explicitly **not** raised as a finding: `integrity`'s `integrity-6` noted that F-244's own closure prose (and the prior round's summary) describes the D-85 citation as matching "by its literal heading," when `integrity-1` established it is a truncated paraphrase consistent with `00-index.md`'s norm throughout. `integrity` itself judged this non-substantive and declined to mint it; I concur — the citation resolves correctly either way, and "literal heading" is loose wording about a citation, not a claim about the admission shape.

---

## 2. F-249, F-250, F-251 — minor, none blocking closure

**F-249 is one site independently found by two passes from complementary angles**, not two findings that happen to overlap. `reviewer`'s `proof-1` found the sentence's own internal ambiguity (does "from here on" reach backward past "above," or only forward?) and traced it to one specific consequence: line 447's "the pair is an object" sits in the ambiguous zone. `cleanup`'s `cleanup-1` found the same site from the convention-discipline angle: three live, unstruck uses of "the pair" stand around a forward instruction instead of being struck-and-replaced the way this same commit handled every other terminology drift on the page — explicitly the same defect class F-246 closed last round (a convention applied unevenly), recurring at one-sentence scale inside the very commit meant to finish eliminating it. Both passes independently rated it tier C: the argument the sentence carries is substantively correct regardless of which reading a reader takes (the object form's truthiness does not depend on its cardinality), so no reader is misled about the current shape — only the page's own retirement bookkeeping is momentarily inconsistent with itself. I concur with both passes' tier and merge them as one finding at one site.

**F-250 and F-251** are `cleanup`-only, both confirmed by direct evidence — a near-verbatim restatement traced across three locations in the same commit and its immediate predecessor, and a mechanical blank-line count across the whole file. Both tier C: no consumer-observable effect, no risk of misleading a reader about the admission shape, and `cleanup` itself flagged F-251 as "not a discipline violation of any numbered rule, noted for completeness."

---

## 3. F-252 — real, and deliberately outside the claim this round verified

`integrity` read `06-vertical-sortable-trace.md`'s admission- and activation-relevant sections in full after a targeted grep surfaced two reproductions of the shapes this round's claim is about. I read the cited evidence directly rather than taking the pass's word:

- `06-vertical-sortable-trace.md:115`: `[B] spec.admit(event, draft) → { visual, box? }  [D-5, D-59]` — two roles, with `box` optional. `02-kernel-behavior-contract.md`'s own D-59 verdict table (line 433–435) explicitly marks `{ visual, box? } | null` and `HTMLElement | { visual, box? } | null` **rejected** — so `06` currently documents a shape `02` never sanctioned, even before D-165 widened it further.
- `06-vertical-sortable-trace.md:210`: `scope = { visual, box, originRect, boxPre, lift, motion, presentation }` — no `visualSpace`, no `itemSpace`, and never had `inheritedSpace` either. This reproduction predates D-85, not only D-165.
- `06-vertical-sortable-trace.md:122–124, 136` narrate admission with the same two-role "paired" framing `02` retired site-by-site in this very commit.

`02-kernel-behavior-contract.md:429` states, of the settled `AdmissionSubject` union: "**The spelling, settled here so 06 can follow it.**" That is not incidental cross-reference — it is `02` declaring `06`'s agreement load-bearing. `06` does carry its own escape clause ("Document 02 is the normative lifecycle protocol; if a trace sentence drifts from it, document 02 wins and this trace must be fixed," `06:3`), which is an acknowledgment that drift is possible, not evidence that this instance was caught.

**Why this does not reopen the arc being closed here.** The load-bearing claim under review was explicitly scoped by the task to "`02-kernel-behavior-contract.md`... or in `src/`." No round in this four-part sequence — this one included — was ever asked to check `06`, and nothing about `06`'s drift changes whether the claim as stated is true. Folding it into "the arc" would repeat exactly the failure mode this arc's own records diagnose: treating a citation (here, `02`'s pointer to `06`) as defining the boundary of a sweep, rather than the wording class itself. `06` is a new, distinct surface, not a missed corner of the surface just verified.

**Required property:** `06-vertical-sortable-trace.md` states the current `AdmissionSubject`/`ActivationScope` shapes, or is itself corrected — the same property this round's commit enforced on `02`.

**Not routed, not decided here.** This is a direct documentation correction with no design or contract question attached, the same shape as every other finding in this sequence. It is handed off as its own item rather than absorbed into this closure, precisely because absorbing it would be the boundary-by-citation mistake this whole arc exists to name.

---

## 4. Package coherence, decision fidelity and code discipline — clean beyond F-249–F-252

**`der` returned a clean null result on all four of its questions**, independently re-derivable: F-244's rewritten D-85 placement argument is a correct restatement of E-01's actual text (quoted and matched) and of `acquireLift`'s real structure, not a relitigation; D-85's citation edit is the only `D-*` row touched anywhere in the commit and is purely non-substantive; nothing resurrects a retired concept as a live claim; and `plan.md`'s own "three rounds, three sweeps" self-narration was checked against the actual prior-round records fact by fact and holds up without overstatement.

**`integrity`'s remaining clean results, independently re-verified:** F-244's citation is consistent with `00-index.md`'s own established informal-citation convention (sampled against nine other citations in the same file); `AdmissionSubject`/`ActivationScope` as reproduced anywhere on the whole page match `src/kernel/spec.ts` member-for-member; the "pair" residue is fully covered on `02` itself by the blanket instruction (modulo F-249's own consistency nit); the strike/provenance convention is uniform across sections no prior round inspected.

**`cleanup`'s two substantive findings (F-249, F-250) are, in its own words, "both instances of the same underlying pattern this closure round exists to eliminate... recurring in miniature inside the commit meant to finish that elimination."** Otherwise clean: the `src/sortable/spec.ts` comment, the bulk of `02`'s rewrite, and `00-index.md`'s five new rows are all proportionate to what F-244–F-248 required.

---

## 5. Local → canonical id map

| Local id | Pass | Canonical |
| --- | --- | --- |
| proof-1 | reviewer | F-249 (merged) |
| cleanup-1 | cleanup | F-249 (merged) |
| cleanup-2 | cleanup | F-250 |
| cleanup-3 | cleanup | F-251 |
| integrity-2 | integrity | F-252 |
| integrity-1, integrity-3, integrity-4, integrity-5, integrity-6 | integrity | — (clean results / one non-substantive note, no canonical id) |
| der: no local findings | der | — (clean null result on all four questions, verdicts recorded, no canonical id) |