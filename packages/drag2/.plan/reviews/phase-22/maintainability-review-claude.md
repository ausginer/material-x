# Maintainability — review of D-112 … D-115 and the resulting contract

- **Reviewer:** Claude
- **Date:** 2026-08-22
- **Subject:** the maintainability slice as implemented, against [`maintainability.md`](../../maintainability.md) and the D-112…D-115 ledger rows
- **Trees:** decisions `d83ce349`; implementation `0a09ddb4`, branch `drag2/phase22-maintainability`, working tree clean at read time and at close

**Scope.** The four decisions and the contract they produce, by falsification rather than redesign. Every claim below was checked by mutating the tree, running the gate, and restoring it; `git status --short` is empty at the close. The performance, bundle and API entries were not reopened. F-81's surviving `src/kernel/failures.ts:6` instance is F-80's by its own disposition and is not re-litigated here.

## Baseline

| Gate                           | Result                                 |
| ------------------------------ | -------------------------------------- |
| `npx just typecheck`           | clean                                  |
| `npx just test`                | 59 files, **1136 passed, 116 skipped** |
| `npx just test --project node` | 15 files, **242 passed, 14 skipped**   |
| `npx just size`                | green, all **14** rows within budget   |

Against the API slice's 58 files / 1131 passed, the delta is exactly one new file and five new assertions — three in `references.node.test.ts`, one module-graph-parser premise, one orphan guard. Nothing else moved.

## Verdict

**The slice lands what it says it lands, and nothing blocks merge.** All four decisions are implemented against their stated required properties; the sixty-seven repaired references are repairs and not re-labelings — I re-derived the riskiest ones against the target sections rather than against the resolver; the three negative properties hold under independent checking.

**Eight findings, none a correctness defect and none blocking.** Four concern the instruments the pass built, and three of those are the pass's own rule — D-115 — unapplied to D-113. The most consequential is MNT-01, because it is a gate that reports green while reading nothing.

| # | Finding | Class | Blocks merge |
| --- | --- | --- | --- |
| MNT-01 | D-113's guard passes with the artifact it reads entirely absent — the one new instrument with no non-vacuity floor | fail-open gate (D-115 unapplied to D-113) | no |
| MNT-02 | three reproduced blind spots in the orphan detector: single-line blocks, any `~~` in the block, and the first block of a region | coverage — the detector catches one of four shapes of its own defect | no |
| MNT-03 | D-112's tense rule is specified by register and implemented by row shape, so live clauses inside decision rows are unreachable — and `05 §Measurements owed` survives in D-106's unfired re-base condition | scope — the design's own headline instance is unrepaired and undetectable | no |
| MNT-04 | a document-qualified citation written in backticks is classified `history` and never resolved, though D-112's row names that class as resolving | fail-open in the resolver (latent, not live) | no |
| MNT-05 | Check D-56 is withdrawn in the register and still stated as owed, twice, in `plan.md` | F-81's mechanism on the register's headline disposition | no |
| MNT-06 | `obligations.md` is absent from `.plan/README.md`'s index of the directory | discoverability, against D-114 (c)'s stated purpose | no |
| MNT-07 | the pass's own three instruments are absent from `tests/COVERAGE.md`, whose checker only runs one direction | record gap | no |
| MNT-08 | F-82's ledger row is truncated mid-sentence at the cell boundary | editing defect | no |

## The negative properties, checked independently

**No production behavior change.** The `src/` diff between `d83ce349` and `0a09ddb4` contains **zero non-comment lines**:

```
git diff d83ce349 0a09ddb4 -- src/ | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' \
  | grep -vE '^[+-]\s*(\*|//|/\*\*|\*/)'   →   (empty)
```

The same filter over `tests/free-drag tests/sortable tests/perf tests/kernel` is also empty — every browser-suite edit is a citation repair. The only structural source change is [kernel/spec.ts](../../../src/kernel/spec.ts) demoting a JSDoc block to `//` comments, which changes the emitted declaration and not the emitted JavaScript.

**No bundle-size movement.** I rebuilt `d83ce349` in a fresh worktree and extracted byte-exact figures from both trees (`budget: 1` substitution, reading the overage). **All fourteen rows are byte-identical**, `drag.js` included at 121 B:

| row | bytes, both trees |
| --- | --- |
| minimal · minimal (xy) · + layoutAnimation · + landing · complete | 11 435 · 11 085 · 11 874 · 11 728 · 12 139 |
| free drag minimal · + bounds · + landing · complete | 9 007 · 9 159 · 9 307 · 9 459 |
| both behaviors · vocabulary root · kernel root | 13 699 · **121** · 6 797 |
| baseline A · baseline B | 11 848 · 6 889 |

**O-1 … O-7 are untouched.** No `src/` behavior changed, so none of them can have been resolved by the code; each is stated open in [`obligations.md`](../../obligations.md) with what it waits for; and the two that had an answering event to re-read were handled asymmetrically and correctly — 05's Q-4 is struck and closed against the Phase 19 event with an O-11 link, while 05's Q-6 carries **_Re-read 2026-08-22 and left open deliberately_** with an O-5 link and the explicit sentence that a re-read is not a licence to decide the semantic half. That is the distinction the brief asked to see, and it is drawn where it belongs.

## D-112 — the reference resolver

**The instrument discriminates in all three kinds it claims.** Each mutation edits, runs, restores:

| mutation | result |
| --- | --- |
| restore `src/sortable/feature.ts:3`'s original `03 §A feature is a function factory` | **fails** — `src/sortable/feature.ts:3 :: 03 §A feature is a function …` |
| restore `src/sortable/landing.ts:4`'s `src/landing-runner.ts` | **fails** — `src/sortable/landing.ts:4 :: \`src/landing-runner.ts\`` |
| remove the strike-through from `vocabulary.node.test.ts:391`'s retired `src/kernel/dev.ts` | **fails** — clause 3's marker is load-bearing, not decorative |

**The repairs are repairs, not re-labelings.** I re-derived the semantically riskiest re-points against the target text rather than against the resolver, and every one carries the cited claim:

| re-point | verified |
| --- | --- |
| `01 §Partial activation` → `02 §Acquisition is all-or-nothing` | 02:1655 states it verbatim, as a bold lead-in |
| `03 §The bracket` → `03 §Insertion geometry` | 03:260ff names the running FLIP offset and the bracket |
| `02 §The join` (Q-14 prose) → `02 §Landing (D-16)` | the quoted sentence is at 02:1494, under that heading — and the tense changed from _states_ to _stated_, because 02 shows it struck and retracted by D-66 |
| `02 §F-40` → `05 §F-40`, `01 §I-6` → `05 §I-6`, `02 §The join` → `06 §The join`, `02 §Queue` → `02 §Queue semantics`, `01 §Teardown…` → `01 §Teardown across two owners`, `03 §Validation` → `03 §Assembly`, `03 §public boundary` → `03 §The public/internal boundary` | all eight targets exist and carry the claim |

The one repair I would not have made the same way is [`bench/size/measure.ts:347`](../../../bench/size/measure.ts#L347) and [`:773`](../../../bench/size/measure.ts#L773). The old target, `05 §What would reopen this`, never existed; the new one, `05 §Measurements — landed 2026-08-02`, exists but contains **no reopening-trigger statement** — it states the six reproducibility preconditions, of which the frozen export map is one. The doctrine is carried by inference, exactly as `bundle-structure.md` §Corrections item 3 predicted when it wrote _the doctrine is real and 05 … carries it — but the heading was never written_ and offered two remedies, _write the section_ or _re-point both_. Re-pointing was taken. That is a legitimate reading of the record's own instruction; it is recorded here only because the resolver will now hold those two citations green forever, which is the limit of a string-to-existence check and is a limit §1 already acknowledges. **Not a finding.**

### MNT-03 — the tense rule is specified by register and implemented by row shape

`LEDGER_ROW = /^\| D-\d+ \|/u` skips a decision row **whole**. But the tense-rule table in [`maintainability.md`](../../maintainability.md) does not classify by row; it classifies by register, and it puts a decision's **_Overturned by_ clause** in the _future / live condition_ register with _Is stale prose a defect?_ answered **Yes** — which is the entire premise of D-114 (a).

The consequence is the design's own headline instance:

> **`05 §Measurements owed` is the largest instance and nobody has recorded it** … One of those citations is inside **D-106's live re-base condition** … **The authority for a condition that has not yet fired points at a heading that does not exist.**

05's headings are still exactly six and `Measurements owed` is not among them. The citation is still at [`00-index.md:441`](../../contract/00-index.md#L441) — _when **L-11 lands** … 05 §Measurements owed makes the frozen export map part of M-3, so L-11 re-measures whether or not it moves a byte_ — and again in D-95 at `:430`. L-11 has not landed. The clause is live, it is the reason the instance was called the largest, and after the slice it is neither repaired nor reachable by the instrument.

Removing the ledger skip surfaces **26** unresolved citations inside D-rows. Most are legitimately past tense — D-45's own row naming the heading it renamed is precisely what the rule protects — and several are resolver limitations rather than danglers (a possessive, `07 §Validation's …`, defeats the two-word rule). The two `05 §Measurements owed` occurrences are neither.

Worth noting alongside: **the record does edit decision rows when a clause goes live.** This slice rewrote D-108's _Overturned by_ clause and struck its original wording; D-106's own row carries a struck F-77 sentence and a dated replacement. So _a ledger row is a dated act_ is a rule the record already applies with an exception, and the exception is exactly the class the skip makes invisible.

### MNT-04 — a document-qualified citation in backticks is never resolved

Instrumenting the shipped classifier over the real tree gives:

| verdict    | count | share of 646 |
| ---------- | ----- | ------------ |
| `resolved` | 413   | 63.9%        |
| `history`  | 192   | 29.7%        |
| `specimen` | 41    | 6.3%         |

D-112 clause 4 reads _every `§` occurrence in scope is classified **resolved** or **failed**; none may be silently ignored_. The implementation adds two further verdicts. `specimen` is well-founded and self-evidently necessary — I checked every backticked contract citation in scope and all nine are deliberate quotations of the defects, inside `references.node.test.ts`'s own doc block and D-112's row. `history` is not: it is decided by a **syntactic regex on the text before the `§`**, and one of its alternatives is any backticked token at all.

The effect is that a citation which names its target document **in backticks** is swallowed, while the same citation as a **markdown link** is followed (75 sites take that branch). D-112's row claims the opposite for this class:

> a citation that names its target document by markdown link — so `bundle-structure.md` §Headroom and `q7.md` §Answer 1 resolve rather than being demoted for living outside `contract/`

Both of those examples do exist as markdown links. But the backticked form is in live use at **ten in-scope sites outside skipped ledger rows** — `plan.md` §Phase 18 (×2), §Phase 21 (×2), §Phase 14, §Phase 22, `bundle-structure.md` §Corrections item 3, `q7.md` §Answer 1, and `tests/COVERAGE.md` §Landing completion and §Checkpoint E remediation — and none is classified.

**This is latent, not live.** I resolved all ten by hand against their targets and every one holds today, including `plan.md`'s `### Phase 18 — Free drag: public contract and decomposition` and `tests/COVERAGE.md`'s two headings. The exception is `bundle-structure.md` §Corrections item 3, whose nearest heading is `Corrections to the record`: it would **fail** the resolver's own two-word rule if the resolver reached it. The finding is that the resolver built to close a fail-open class has one, in the register-neutral form the record uses most often after the markdown link.

Two smaller observations, neither a finding. The bare-number branch (`§04`, `§10`) accounts for 153 of the 192 and is benign — where a real contract section follows, as in `see §04 §Write protection`, the _second_ `§` is qualified and is checked. And clause 4's convergence pressure produced a handful of sentence rewrites whose only purpose is delimiting — F-71's row now reads _as the table in (07 §Validation) says_ — which is a real cost of the clause, paid knowingly and cheaply.

## D-113 — no shipped doc block with no subject

The false block is gone from `src/sortable/feature.ts`; `sortable/feature.d.ts` now carries one block on `SortableInstaller` and it is the one that publishes the type. `kernel/spec.ts`'s section header is `//` comments and no longer reaches `kernel/spec.d.ts`. The remaining orphans in the emitted tree are exactly the four the decision predicted: two module headers, two struck deletion notes.

### MNT-01 — the guard passes with the artifact absent

`declarations(ROOT)` walks the package root for emitted `.d.ts`, and **nothing asserts that it found any**. Every other assertion this slice added carries a floor — `resolved > 300`, `cited.length > 100`, `retired > 0`, `statements > 100`, and a scope-root existence test written for exactly this reason (_a scope root that is renamed away would otherwise contribute zero citations and zero failures, which is the fail-open shape D-115 forbids_). D-113's guard has none.

I moved all 32 emitted declarations aside — the state of a fresh clone before `just build`, and the emitted tree is untracked, so it is the ordinary state — and re-ran:

| run | result |
| --- | --- |
| the orphan guard alone, 0 emitted declarations present | **1 passed** — it read one file, `bench/size/noncomposed.d.ts` |
| the whole node project, 0 emitted declarations present | **242 passed, 14 skipped** — byte-identical to the built-tree run |

The suite output cannot distinguish "the published surface carries no orphaned doc block" from "no published surface was read". That is the shape D-115 exists to forbid, in the instrument the same commit created, and the pass applied the rule to the three instruments it had already named rather than to the one it was writing. (For context, the pre-existing _should publish no declaration the entries cannot reach_ fails open the same way; that one is D-111-era and outside this slice.)

### MNT-02 — three reproduced blind spots in the detector

The detector recognises `/**` and `*/` on their own lines, exempts the first block of a `//#region`, and exempts any block containing `~~`. Each of those is a shape the real defect could have taken. I injected the **exact sentence D-113 was created to delete** into the emitted tree four ways:

| injected form | detector |
| --- | --- |
| multi-line, unstruck, mid-file — the shape the defect actually had | **fails** ✓ |
| the same sentence as a **single-line** `/** … */` block | **passes** ✗ |
| multi-line, containing any `~~struck~~` word | **passes** ✗ |
| multi-line, unstruck, as the **first block of a `//#region`** | **passes** ✗ |

Each has a live population in the shipped artifact:

- **Single-line blocks are 71 of the 200 emitted doc blocks — 35.5%.** A single-line `/** … */` sets the block start and is then overwritten by the next `/**`, so it is never classified at all; the detector reaches 129 of 200 blocks.
- **The `marked` exemption is textual, not subject-scoped.** It fires on `line.includes('~~')` anywhere in the block, where the decision's reasoning is that _the block's subject is deleted_. Eleven emitted blocks contain `~~`, of which two are deletion notes — the other nine are live blocks attached to live declarations, **including `SortableInstaller`'s own surviving JSDoc**, which quotes `~~SortableFeature~~` and `~~Opacity is a property of which entry you imported~~`. The block at the centre of D-113 would exempt itself if it were orphaned again.
- **The `header` exemption fires on position, and the emitted layout puts a declaration's block in that position.** A region opens `//#region src/kernel/spec.d.ts`, and in the emitted output the module's imports sit _before_ the marker while the first thing after it is the first **type's** doc block. The flag is cleared at the first `*/` regardless of what intervenes, so the leading documented declaration of every module is unguarded.

None of this weakens the claim that the specific defect is fixed — it is, and it stays fixed. The finding is about what the guard will catch **next** time, which is the whole reason a decision preferred a detector over an allowlist.

## D-114 — obligations name destinations that can receive them

**The register is correct as a census.** I re-derived it against `maintainability.md` §3 and F-82: the five orphaned obligations, the three re-read open questions and M-02's surviving half are all present, as O-1…O-8 plus the three discharged rows, with no eleventh item invented and none dropped. F-81's surviving `failures.ts:6` instance is not a missing row — its own disposition re-books it to F-80, which is O-7.

**Check D-56 is recorded as withdrawn unsatisfied, and the wording is exactly right.** O-8 says what was withdrawn (the lost historical falsifier), what was not (D-56 itself, which stands on its argument), why no later measurement substitutes, and that four measurement records had each handed it on rather than take it. It does not describe the check as satisfied anywhere.

**Q-6 is recorded and not closed** — verified in the register (O-5) and at its source in [05](../../contract/05-lifecycle-invariants.md), which now reads _Re-read 2026-08-22 and left open deliberately_ and separates the bookkeeping half (the missing matrix row) from the semantic half (which recovery a reorder rejected against a moved home should take). No matrix row was quietly added.

**D-108's clause is now a standing condition**, with the original wording struck rather than deleted and the discharging argument stated inline — `arm()` once per controller, all three `scrub()` sites terminal. API-03 closes on the route D-114 (a) specifies rather than on a measurement.

### MNT-05 — Check D-56 is withdrawn in the register and still owed in the plan

[`plan.md:941`](../../plan.md#L941), in Phase R's deliverable list, still reads in the imperative:

> **Check D-56 (see Phase 21 §Check D-56).** Run `bench/size` immediately before and after the three subpath deletions land. The prediction is **zero byte movement** … **Record both numbers.**

and [`plan.md:1117`](../../plan.md#L1117) still introduces it as _a falsifiable prediction attached to a decision, and it is **owed** at Phase R_. Neither carries the withdrawal, a strike-through, or a link to O-8. Under D-114 (c) the register is the live set, but neither site says so, and `plan.md` is where a reader arrives from the phase list. This is F-81's mechanism — a landed disposition leaving its predecessor's prose standing — applied to the register's own headline decision, on the day the register was created to stop it. The register's `Withdrawn` row is not wrong; the record is inconsistent about it in the document a human owner reads first.

### MNT-06 — the register is not in the index of the directory it lives in

`.plan/README.md`'s **Current** table lists `plan.md`, `ledger.md`, `brief.md`, `contract/`, `probes/`, `measurements/`, `reviews/api-reviews/` and `reviews/`. It does not list [`obligations.md`](../../obligations.md). D-114 (c)'s stated purpose is that _a human owner inheriting this library needs one list of what is still owed_, and README opens with _Start there_ — so the artifact built for the handoff is reachable only from D-114's ledger row, F-82's row and `plan.md`'s Phase 22 section. `maintainability.md`, `api-surface.md` and `bundle-structure.md` are missing from the same table, which makes this pre-existing drift rather than a regression; it is called out because this one item was created for exactly the reader the table serves. The same table is stale in two other ways worth one line: it says the contract is _documents 00–06_ (there are eight) and carries _the decision ledger (D-1…D-65) and findings (F-1…F-50)_ against a ledger that now ends at D-115 and F-82.

### MNT-07 — the pass's own instruments are absent from the coverage index

`tests/COVERAGE.md` gained no row for `tests/references.node.test.ts`, for _should understand every import form the source actually uses_, or for _should publish no doc block that documents nothing_. Its own edits in this slice are citation repairs only. The index is where an assertion is paired with the clause it discharges, and `tests/coverage.node.test.ts` checks it in **one direction only** — it fails on a row naming a test that does not exist, and by its own words the check is _on the cheap half (the test exists) precisely because that is the half that rots unattended_. There is no assertion that a test file has a row, so three new instruments are invisible to the index that exists to enumerate them.

## D-115 — a gate asserts its own premise

**(a) the packaging parser.** The premise assertion is real and fails closed. All three forms M-05 named were injected into `src/kernel/errors.ts` and each turned the gate red:

| injected | result |
| --- | --- |
| `import './realm.ts';` (side-effect) | **fails** — `src/kernel/errors.ts :: ./realm.ts` |
| `import { x } from "./realm.ts";` (double-quoted) | **fails** — same site |
| `const m = await import('./realm.ts');` (dynamic) | **fails** — two entries, the specifier and `dynamic import()` |

LSP `findReferences` on `relativeSpecifiers` returns exactly three sites — the definition, `reachableFrom`, and the new premise assertion — confirming that the ship-list, optional-isolation and clean-build-pathspec assertions all flow through the single parse the premise now guards. The general parse itself is stricter than the narrow one in every direction I could construct, and its failure modes (a specifier-shaped string in a comment) are fail-closed. `statements > 100` keeps it from reading an empty tree.

**(b) the four docs runs.** All four now pass `--treatWarningsAsErrors`, assert `code === 0` structurally, and read the emitted JSON back against an exact module list; `converted()` throws if the artifact is missing, so a run that wrote nothing cannot pass. Falsified: attaching `{@link ThisSymbolDoesNotExist}` to `DraggableError`'s doc block turns _should close the kernel tier over the kernel tier_ red with `expected { code: 4 } to match object { code: 0 }`. The stream is now reported and not asserted on, which is what E-08 asked for.

**(c)** clause 4 is D-112's, and MNT-04 is where it is incomplete.

**The plan's summary claim holds.** _Every new instrument was falsified before landing — a dangling citation, a dangling path, a side-effect import, a broken `{@link}` and a reintroduced orphan each turned its gate red_ — I reproduced all five independently. The qualification is MNT-02: the reintroduced orphan turns the gate red in one of its four expressible forms.

### MNT-08 — F-82's row is truncated

[`00-index.md:568`](../../contract/00-index.md#L568) ends:

> **The finding stays open** until the live rows are |

The sentence stops at the table-cell boundary. Cosmetic, and in the row that anchors the register.

## What was checked and found clean

- The deferred-decision table is now empty and that is a legitimate state, not a new vacuity: `tests/decisions.node.test.ts` deliberately dropped its `rows.length > 0` floor when Phase 19 emptied the table, reasons about it in place, and keeps a `section(lines).length > 0` anchor — so a **renamed** section still fails through _should list every decision its own row marks as unimplemented_. All four D-112…D-115 markers went from `Unimplemented (Remediation)` to `Implemented 2026-08-22` with their witness rows deleted in the same commit, which is what the instrument requires.
- The F-2 and F-11 mitigation corrections are present in both `00-index.md` and 05, struck and dated, and they state the mitigation as _stronger_ than before rather than weaker.
- 05's Q-4 closure is bookkeeping against an event that occurred and cites O-11; the second engine (O-4) and the touch measurement (O-3) were not quietly folded into anything.
- `.scripts/vite-config.ts`'s stale `src/kernel/dev.ts` reference — a monorepo-level instance nobody had found — is repaired to `src/globals.d.ts`, which is where D-101's vocabulary now lives.
- `bench/size/noncomposed.js`'s only non-comment edit is a prettier line split; the baseline A row is byte-identical.

## Reproducibility

Every probe edits, runs and restores; `git status --short` is empty after each. Byte extraction is `perl -pi -e 's/budget: [0-9_]+,/budget: 1,/g'` on `bench/size/measure.ts` followed by `node bench/size/measure.ts`, reading `over budget by X B` (actual = X + 1), with the file restored from a copy. The pre-slice figures come from a `git worktree` at `d83ce349` with the monorepo `node_modules` symlinked, built with `npx just build`; the worktree is removed and pruned. The classification census was taken by copying `tests/references.node.test.ts` to an untracked probe file, replacing the terminal assertion with a reveal, and deleting the probe afterwards.

**LSP plugin - available; used: `findReferences` on `relativeSpecifiers` in `tests/packaging.node.test.ts`, to establish that the three assertions D-115 (a) names all flow through one parse site and that the new premise assertion is the only other caller.**
---

## Closure — the D-116 remediation

- **Date:** 2026-08-22
- **Subject:** the eight findings above, and D-116 as decided at `8f1cb594`, against the remediation landed at `1de45fac`
- **Scope, as set:** MNT-01…MNT-08 and F-83 only. The rest of the maintainability slice was not reopened; nothing below is a regression in it.

### Baseline

| Gate | Result |
| --- | --- |
| `npx just typecheck` | clean |
| `npx just test` | 59 files, **1144 passed, 116 skipped** |
| `npx just test --project node` | 15 files, **250 passed, 14 skipped** |
| `npx just size` | green, all 14 rows, **byte-identical** to the tree measured at `42d156d6` |

+8 tests against the reviewed tree: five condition-vocabulary unit cases and three standing-condition assertions. The `src/` diff `42d156d6..1de45fac` contains **zero non-comment lines** — only `kernel/phases.ts` and `kernel/types.ts` demoting a module header from JSDoc to `//`, which is a declaration-surface change and not a runtime one, and the fourteen size rows confirm it moved no byte.

### Verdict

**Six of eight findings are closed outright, two are closed in substance with a residual, and nothing blocks merge.** Every strengthened gate discriminates under mutation, in both directions where both exist. D-116 is the right shape for MNT-03 and it is implemented as decided.

**Three residuals, all record-level, none blocking.** One is the closure's own subject repaired for its instances and not for its class (C-03); two are the new machinery's stated open premise turning out to have a concrete instance already in the tree (C-01, C-02).

| # | Finding | Disposition |
| --- | --- | --- |
| MNT-01 | the orphan guard passes with no artifact | **closed** — three floors added; the guard and the node project now both go red with the build absent |
| MNT-02 | three escape shapes in the orphan detector | **closed** — all four shapes fail; the legitimate exemption still passes |
| MNT-03 | live clauses unreachable inside skipped rows | **closed in substance by D-116** — the live authority is SC-1…SC-3 in a scope root; residuals C-01 and C-02 |
| MNT-04 | backticked document targets swallowed as history | **closed for `.md`** — resolved, and an unlocatable document fails rather than demotes; residual below |
| MNT-05 | Check D-56 withdrawn in the register, owed in the plan | **closed** — both `plan.md` sites struck with an O-8 pointer |
| MNT-06 | the register absent from `.plan/README.md` | **closed** — row added, and it says what each of the two tables is for |
| MNT-07 | the pass's instruments absent from `tests/COVERAGE.md` | **closed** — a new section with nine rows, which also names the one-direction limit of `coverage.node.test.ts` |
| MNT-08 | F-82's row truncated | **closed** — the sentence completes |
| F-83 | dropped fourth cells in the slice's decision rows | **closed for those rows; C-03** — 18 rows in the same tables still drop theirs |

### MNT-01 and MNT-02 — verified by mutation

**Non-vacuity.** I moved all 32 emitted declarations aside — the state of a fresh clone before `just build`, and the emitted tree is untracked, so it is the ordinary state:

| run | before (`42d156d6`) | after (`1de45fac`) |
| --- | --- | --- |
| the orphan guard alone | 1 passed | **1 failed** — `expected 1 to be greater than 25` |
| the whole node project | 242 passed, green | **1 failed, 249 passed** |

The three floors are `emitted.length > 25`, `blocks > 150` and `marked > 0`, against 33, 198 and 2 in the built tree. The third is the one worth having: it asserts the single exemption is **exercised**, so an exemption that stops matching anything cannot quietly widen.

**All four shapes.** I injected the exact sentence D-113 was created to delete into `sortable/feature.d.ts` and `kernel/spec.d.ts` four ways, restoring between each:

| injected form | before | after |
| --- | --- | --- |
| multi-line, unstruck, mid-file | fails ✓ | **fails** ✓ |
| the same sentence as a single-line `/** … */` | passes ✗ | **fails** ✓ |
| multi-line containing any `~~struck~~` word | passes ✗ | **fails** ✓ |
| multi-line at the head of a `//#region` | passes ✗ | **fails** ✓ |
| a block whose **first line** opens `~~SortableProbe~~ was deleted` | — | **passes** ✓ (the legitimate deletion note, still exempt) |

The two repairs are of different kinds and both are the right kind. The marked exemption was **tightened to the subject** — the block's first line, not any line — which is what the decision always meant and which now excludes the nine live blocks that merely quote a struck name, `SortableInstaller`'s own JSDoc among them. The header exemption was **deleted rather than tightened**, on the correct ground that a block at the head of a region is textually indistinguishable from an orphan injected there; the two module headers became `//` comments in source instead, which is D-113's own repair to `kernel/spec.ts` applied to the same shape. My census confirms the emitted tree now exercises no header exemption at all: 127 multi-line and 71 single-line blocks classified, two marked, zero flagged.

### MNT-03 and D-116 — the substance is closed, and the two residuals are in the new machinery

**The register is genuinely a scope root.** Breaking `05 §Test matrix` in O-4's row fails the resolver at `.plan/obligations.md:30`. **The backstop discriminates in all three directions**, each mutation restored:

| mutation | result |
| --- | --- |
| drop `SC-3` from D-108's `**Overturned by**` clause | **fails** — `D-108: **Overturned by**` |
| cite an `SC-9` the register does not declare | **fails** — `SC-9` |
| delete `SC-3`'s row from the register | **fails** — `SC-3` |

And the discrimination is honest at the edges: D-114 and D-116 both write `_Overturned by_` **about** the rule, in italics, and neither is read as a condition — the specimen rule applied to a lead-in, verified against the real ledger rather than only against the fixture. The unit cases cover the second condition in a row separately, which is the failure a whole-row search would hide.

**The premise is stated, not implied**, which is what the brief asked to see: `decisions.node.test.ts`'s doc block says in as many words that a _new_ decision embedding a clause cannot be observed, that this is a backstop over three known forms, and that `declared.length > 0` is the whole floor it can carry. That is D-115 applied to D-116's own instrument, and it is the difference between a backstop and a claimed proof.

**The lift is coherent and the citations were re-derived rather than moved.** SC-1 states the three re-base triggers in the present tense and cites `05 §Measurements — landed 2026-08-02` where D-106's row cited a heading that never existed; SC-2 records that its second half is not free-standing but is owed as O-1; SC-3 carries D-108's overturn. Each deciding site keeps its wording and gains a dated pointer, and `bundle-structure.md` §Headroom — the second witness D-116 (c) names — got the same treatment, including the sentence saying explicitly that `05 §Measurements owed` was never a heading.

#### C-01 — SC-1's re-derived citation is a specimen, and is the one citation the new scope root cannot see

D-116 (b)'s argument for adding the register to `ROOTS` is that _everything the tense rule calls live is inside the resolver_, and the register's own §Standing conditions preamble asserts that **each row's citations resolve today (D-116 (c))**. Eight `§` occurrences live in `obligations.md`. Six are classified and checked. **Two are code-spanned and therefore specimens**, and one of them is SC-1's:

> the frozen export map is one of the six reproducibility preconditions stated at [`05 §Measurements — landed 2026-08-02`](contract/05-lifecycle-invariants.md)

The `§` sits inside a code span, so D-112's specimen rule — quoting a citation is not making one — exempts it. Falsified: repointing it to `[`05 §This Heading Does Not Exist`]` leaves `references.node.test.ts` at **3 passed**.

The specimen rule is right, and this is not an argument against it. The point is narrower and it is MNT-03's own shape one turn later: the citation that D-116 (c) exists to repair, at the site D-116 (b) added to scope precisely so it would be checked, is written in the one form that scope does not reach. It is correct today — I resolved it by hand against 05's `## Measurements — landed 2026-08-02` — so this is a fail-open surface rather than a live defect. The second specimen, in O-9, quotes the repair rather than making a claim and matters less.

#### C-02 — a fourth condition lead-in is already in the ledger, live and unregistered

D-116 (d) states its gap as prospective: _a fourth lead-in nobody has spelled yet escapes this_. One is already spelled, in the row immediately above D-106. **D-105** carries:

> **The reopening conditions that remain are both measured quantities**: a behavior writing more than once per sample, and a device materially above M-6's ~129 /s primary pace.

That is a standing condition by D-114 (a)'s own definition — present tense, forward-looking, recognised by an observer rather than owed by anyone, naming what reopens the P-01 decline. It is bold, it is in a decision row, it names no `SC-n`, and `LEAD_IN`'s three-form vocabulary does not match it, so the backstop passes over it and the resolver skips the row it lives in. The result is that the standing set is **three of four**, and the census's completeness rests on the hand audit rather than on the instrument — which is what D-116 (d) says, but with a concrete instance rather than a hypothetical one.

#### An internal inconsistency in D-116 (a), worth one line

D-116's headline reads **a ledger row states a condition as it was decided; the register carries it live**, and (c) says each site _gains a pointer_ — which is what all three landed sites do. But (a) says the row _cites the id **instead of stating the condition twice**_. Those are different instructions, and a later pass reading (a) would delete the historical wording the headline preserves. The landed artifact follows the headline; only (a) reads against it.

### MNT-04 — closed for `.md`, with a narrower residue

`NAMED` is consulted after the markdown link and **before** `HISTORY`, so a backticked document name no longer falls through, and an unlocatable name returns `failed` rather than a demotion. Falsified in both directions on `bench/size/measure.ts:87`:

| mutation                                                  | result    |
| --------------------------------------------------------- | --------- |
| `` `plan.md` §Phase 21 promised `` → `§Phase 99 promised` | **fails** |
| `` `plan.md` `` → `` `nonexistent-doc.md` ``              | **fails** |

The census moves as expected: `resolved` 413 → **433**, the regex-history branch 39 → **25**, and 16 citations now take the new branch. The three-base resolution (beside the citing file, package root, `.plan/`) is a lookup rather than a search, which is the right call.

**The residue is the sibling form.** `NAMED` requires the backticked target to end in `.md`, while the doc block above it describes the rule as _a citation that names its target document in backticks_. Nine citations in scope name a `.ts` target that way — `` `tests/free-drag/lifecycle.browser.test.ts` §the TAG_POLICY barrier ``, `` `free-drag/spec.ts` §Behavior actions ``, `` `tests/kernel/kernel.browser.test.ts` §the landing origin `` among them — and each is still swallowed by `HISTORY`'s any-backticked-token alternative, even though the resolver already indexes every `describe` title and comment heading of those files. I resolved all nine by hand and every one holds today, so this is latent. It is recorded because the gap is now between the rule as written in the file and the rule as implemented, which is narrower and easier to close than MNT-04 was.

### The record-consistency findings

- **MNT-05 — closed.** Both `plan.md` sites are struck and re-pointed: the Phase R deliverable now reads ~~_Run `bench/size` … Record both numbers._~~ followed by **Withdrawn unsatisfied 2026-08-22 by the owner, and recorded as O-8**, and the Phase 21 paragraph now says _it **was** owed at Phase R_ with ~~_It is owed._~~ struck. The prediction itself is kept as the statement of what can no longer be run, which is the right half to keep.
- **MNT-06 — closed.** `.plan/README.md`'s **Current** table gains an `obligations.md` row that says what each of the two tables carries and who each is for. The three stale asides I noted in the same table are unrepaired — it still says the contract is _documents 00–06_ against eight, and _the decision ledger (D-1…D-65) and findings (F-1…F-50)_ against D-116 and F-83. They were an aside then and they are an aside now; noted only so the next reader of that table knows.
- **MNT-07 — closed, and closed well.** A new section, _The record's own instruments_, indexes all nine assertions across the three instruments with their decision ids, and its preamble states the reason the omission was possible: `tests/coverage.node.test.ts` checks one direction only, so an instrument with no row is invisible to the index that exists to enumerate instruments. Naming the asymmetry is worth more than the rows.
- **MNT-08 — closed.** F-82's cell now completes: _the finding stays open until the register's Live table is empty … not when the register exists_, which also sharpens the closing condition.

#### C-03 — F-83 is closed for the rows the slice authored, and 18 rows in the same tables still drop a cell

F-83's diagnosis is exact and general: the Phase 21/22 decision tables declare three columns — _Decision · What and why · Supersedes_ — and GFM discards a row's excess cells, so a fourth cell exists where it is authored and vanishes where it is read. The remediation folded the fourth cell of D-112, D-114 and D-115, and D-106/D-107 were folded by D-116's own edit.

The same tables still carry **18 rows with a dropped fourth cell**, counted with escaped pipes honoured:

| rows | what is lost |
| --- | --- |
| D-92 … D-105 (14 rows) | the whole _Supersedes_ cell of every Phase 21 and Phase 22 measurement decision — D-95's supersedes clause, D-99's, D-103's, D-104's, D-105's |
| **D-108 … D-111** (4 rows) | all four API-slice decisions — _closes F-78; the other half of D-107's A1/A2 decline_, _applies D-75 to the cases it did not reach_, _applies D-78 to the case it did not reach_, _closes F-79_ |

And because the third cell in these rows carries the evidence half, the rendered _Supersedes_ column shows evidence text while the actual supersedes clause is the one discarded — so the defect is a wrong column rather than only a missing one.

This is not a new class and it is not a regression: it is F-83, repaired at the three instances the finding enumerated and left at the fourteen it did not look at, in the same four tables, found by the same reading. F-83's own text says _D-113 and D-116 are three-cell rows and are unaffected_, which shows the survey was of the slice's own rows. It is a record-rendering defect with no runtime consequence and nothing depends on it, so it does not block merge — but it is the F-81 pattern the whole entry exists to name, and the entry's last finding is an instance of it.

**Adjacent, older, and a different sub-form.** `D-59` and `D-66` carry **unescaped `|` inside code spans** — `` `… | Readonly<{ visual, box }> | null` `` — which GFM reads as cell delimiters in a four-column table, so those two rows render mangled mid-sentence and lose two and one trailing cells respectively, including _repairs D-52; preserves H-2 and D-15_. Pre-existing, outside F-83's description, and mentioned so a sweep of the class does not stop at the trailing-cell form.

### The negative properties

- **No production behavior change.** Zero non-comment lines in `src/` across `42d156d6..1de45fac`.
- **No bundle-size movement.** All fourteen byte-exact figures are identical to the tree measured at `42d156d6`, which was itself identical to `d83ce349` — so no row has moved a byte across the whole slice and its remediation.
- **Nothing broadened.** `.plan/contract/05-lifecycle-invariants.md` is **untouched** by the remediation, so **Q-6** stands exactly as it was left — re-read, deliberately open, O-5. The register's _Live_ table diff is empty apart from O-9's citation being delimited for the resolver: **O-1 … O-7 are unchanged**, **F-80** (O-7) is unchanged, and the **`kernel/kernel.ts` split** (O-6) is unchanged. The standing-conditions table is additive and its own preamble states that a condition is recognised rather than owed, so it does not merge with the obligations it sits beside — which is the distinction D-114 built the register on.

### Reproducibility

Every probe edits, runs and restores; `git status --short` is empty after each and at the close. The declaration stash is a `mv` of the 32 untracked emitted `.d.ts` to `/tmp` and back, verified restored. Byte figures use the `budget: 1` substitution on a copy of `bench/size/measure.ts`, restored from that copy. The classification census was taken by copying `tests/references.node.test.ts` to an untracked probe, replacing the terminal assertion with a reveal, and deleting the probe before any falsification ran. Table cell counts were taken with `\|` treated as an escape, and each outlier was re-read cell by cell rather than trusted from the count.

**LSP plugin - available; not used: this closure turned on injecting text into emitted declarations, mutating markdown tables and re-running node instruments — document-and-artifact questions, with no code symbol whose definition, references or types were in doubt.**