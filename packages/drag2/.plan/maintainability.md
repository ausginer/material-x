# Maintainability — Phase 22's fourth and last entry

**Run 2026-08-22** on `bb07b781`, branch `drag2/phase22-maintainability`, working tree clean apart from this record. The three earlier entries closed: performance at `e086d058`, bundle structure and optimization at `d949cfeb`, the public API at `bb07b781`. This is the last agent-owned pass before human ownership, and it asks the question the other three could not: **not whether the artifact is right, but whether the record of why it is right can still be read.**

**Scope, as set.** F-81's class — fully-landed decisions leaving stale premises behind, invisible to the deferred-decision instrument because nothing is deferred. API-03 as a second witness — a landed decision carrying an overturn condition framed around a measurement nobody took. Plus the plan's own standing maintainability items (M-02, the duplicated SPI types, Checkpoint E's residue). **Settled performance, bundle and API decisions are not reopened**, and one candidate that touches the API is flagged as such where it arises rather than absorbed.

**No production change is proposed by this document and none was made.** Four decisions land as `Unimplemented (Remediation)` with live witnesses.

## Reproducibility

Every count below is read off the tree, not off the record.

| Input | Value |
| --- | --- |
| Tree | `bb07b781`, working tree clean at read time |
| Suite | `npx just test --project node` — 14 files, **237 passed, 14 skipped** (the 14 are `bench/size`'s budget rows, skipped without a build) |
| Source scanned | 57 `.ts` files, 14 549 lines, 598 doc blocks under `src/` |
| Artifacts scanned | 32 emitted `.d.ts` at the package root, from the checked-in build |
| Contract scanned | all eight `.plan/contract/*.md`, heading index extracted mechanically |

Two censuses were run by subagents and every item they returned was re-verified here before being carried; items they marked _plausible_ were dropped rather than promoted. Where a census produced a number that a hand audit could not reproduce exactly, the number is reported as indicative and the confirmed instances are listed individually. **That gap is itself part of the finding** — see D-112.

---

## The diagnosis, stated once

The package has **exactly one instrument for record continuity**: `tests/decisions.node.test.ts`. It is a good instrument and it works. It can also see exactly one shape:

> a **decision**, in **one file** (`.plan/contract/00-index.md`), deferred to a **numbered phase or a remediation**, witnessed by a **source-level fact** — a path that must be absent, or a substring that must be present.

Every maintainability defect this pass found lies outside that shape, and each lies outside it in a different direction:

| Defect class | Which of the instrument's four bounds it escapes |
| --- | --- |
| A reference that no longer resolves | not a decision; lives in `src/`, `tests/`, `bench/` |
| An obligation dropped when its destination closed | the vocabulary cannot express _a measurement_, _Phase R_, _Checkpoint E_ or _the owner_; and no witness can observe a phase closing |
| A gate that passes when its own premise breaks | not a decision at all |
| Prose that outlives the declaration it documented | not a decision; and in the published `.d.ts`, not even in a file the instrument may open |

**So F-81 is not one problem.** It is the visible part of a record whose continuity machinery covers commitments and covers nothing else. That framing is what makes the rest of this document short: three of the four classes need a rule, and exactly one needs an instrument.

### The tense rule, which retires most of the apparent problem for free

Before anything is repaired, the scope has to be settled, because a naive reading of F-81 obliges a sweep over every document in `.plan/` and that sweep is neither affordable nor correct.

| Register | Tense | Is stale prose a defect? |
| --- | --- | --- |
| Decision ledger rows (`D-nn`) | **past** — a dated act, with its reasoning as it stood | **No.** D-101 still says `kernel/dev.ts` holds the kernel's binding; that was true when D-101 was decided and D-108 supersedes it. Nothing to fix. |
| A decision's _Overturned by_ clause | **future** — a live condition | **Yes**, and API-03 is the case. See D-114 — and **D-116**, which takes the clause out of the ledger row altogether, so this line now describes [`obligations.md`](obligations.md) §Standing conditions and not `00-index.md`. **Corrected 2026-08-22**: as first written, this row placed a live register inside a container the resolver skips whole. That is MNT-03, and §6 is its disposition. |
| Findings register (`F-nn`) | **present** — what is open _now_, and what mitigates it | **Yes.** Two instances found here and corrected below. |
| Contract documents 01–07 | **present** — normative | **Yes.** Partly instrumented already (vocabulary, composition, docs). |
| Source and test doc comments | **present** — describes _this_ code | **Yes**, and uninstrumented. |
| Published `.d.ts` doc blocks | **present** — and a consumer reads them | **Yes**, and worse than uninstrumented: see D-113. |
| `.plan/reviews/**`, `.plan/measurements/**` | **past** — dated artifacts | **No.** Their citations were correct when written. |

This is not a convenience. It is the difference between a rule a later pass can apply and a rule that expands until it is abandoned — and the record already applies it informally, with strike-through for a retired name and a dated correction note for a superseded figure. **D-112 through D-115 all take their scope from this table.**

---

## 1. References that no longer resolve — the tractable mass of F-81, and **D-112**

The census over `src/**/*.ts` returned a result worth stating in full, because the **negative** half is what makes the positive half actionable:

**Checked and correct.** Every mechanically-checkable count — 13 `FAILURE_*` stages against 13 `STAGE_TO_CODE` rows, the four-member `DraggableErrorCode`, eight `Phase` constants, the seven-field kernel slice, `SortableFramePart`'s eight and `FreeDragFramePart`'s five, `SortableContribution`'s seven keys, D-108's "four author-facing checks". Every deleted symbol correctly struck with its decision id — `SortableCallbacks`, `brandBehavior`, `SortableFinishResult`, `updateItems`, `onFinish`/`onCancel`, `callbacks()`, `landing({ run })` and ten more. Every export claim verified against the emitted declarations. Every D-109 rename clean, with zero unqualified `OnStart`/`OnEnd`/`OnDragError` anywhere in `src/`. All post-D-108 dev-gating prose correct, including the two files the implementer updated in the same commit.

**The prose hygiene in this package is high, and the defects are not distributed.** They concentrate in one form, and it is the one form nothing in the repository can check: **a reference to something that lives somewhere else.**

### Confirmed dangling cross-document citations, in shipped source

| Site | Citation | What is actually true |
| --- | --- | --- |
| `src/sortable/feature.ts:3` | `contract 03 §A feature is a function factory` | No such heading. **D-45 renamed it** to `A fragment is a plain declarative partial config` — the decision that replaced _feature_ with _fragment_ left the citation naming the old section, at the top of the file that defines the middle tier |
| `src/sortable/assemble.ts:140`, `src/free-drag/assemble.ts:120`, `src/sortable/feature.ts:240` | `03 §Validation` | 03 has no `Validation` heading; the rule cited lives under `Assembly`. The only `Validation` heading in the contract is **07**'s |
| `src/sortable/spec.ts:1509` | `02 §The join` | 02 has no `The join` heading — it is in **06** |
| `src/sortable/spec.ts:899` | `contract 02 §F-40` | `F-40` appears zero times in 02; it is **05** §F-40 |
| `src/sortable/placement.ts:281` | `contract 06 §the writer reports whether a move occurred` | The phrase exists only in a Checkpoint A review artifact |
| `src/kernel/presentation.ts:540` | `contract 01 §Partial activation` | Zero occurrences anywhere in `.plan/` |
| `src/kernel/kernel.ts:613` | `contract 01 §Teardown reverses Part I's teardown-before-report ordering` | Zero occurrences of `teardown-before-report` in `.plan/` |
| `src/sortable/verified-refresh.ts:319` | `contract 03 §The bracket` | No `bracket` heading in any contract document |
| `bench/size/measure.ts:347`, `:773` | `05 §What would reopen this` | **Already recorded twice** and declined twice — see F-82 |

### And two dangling file paths, one in each mirror module

`src/sortable/landing.ts:4` says the runner _lives in `src/landing-runner.ts`_; the file is `src/shared/landing-runner.ts`, and the same file's own `import` on line 17 uses the correct path. `src/sortable/feature.ts:57` says `FeatureContext` is _declared in `src/composition.ts`_; it is `src/shared/composition.ts`. **The free-drag mirror states both correctly** — so the two sibling modules disagree about where their shared dependencies live, and nothing notices.

Of 23 distinct backticked repository paths appearing in comments, **two are wrong, one resolves only against the monorepo root** (`src/globals.d.ts:4`'s `.scripts/vite-config.ts`), and **one is a deliberate reference to a deleted file** (`tests/kernel/vocabulary.node.test.ts:391`, recording that `src/kernel/dev.ts` _is retired_ — correct prose, and a false positive for any naive checker). That last one is the design constraint, not an obstacle: **a resolver needs a marker for a deliberately retired reference, and the repository already has one it applies to symbols and not to paths — strike-through.**

### `05 §Measurements owed` is the largest instance and nobody has recorded it

05's headings are exactly six: _Invariants, by enforcement tier · Findings · Resolved and retired questions · Open before implementation · Measurements — landed 2026-08-02 · Test matrix_. There is no `Measurements owed`. It is cited as a section by **contract 00 twice, contract 07's K-6, `plan.md`, `bundle-structure.md` twice, `measurements/phase-21.md`, three measurement records, `bench/size/measure.ts:5` and `tests/perf/m1.browser.test.ts:12`.**

One of those citations is inside **D-106's live re-base condition** — _`05 §Measurements owed` makes the frozen export map part of M-3, so L-11 re-measures whether or not it moves a byte_. L-11 is the next scheduled budget event in this package. **The authority for a condition that has not yet fired points at a heading that does not exist.**

### D-112 — the reference resolver

**Decision: every cross-reference in the normative tree resolves, and the check is executable.**

Required properties, not a design:

1. **Scope is the normative tree**: `src/`, `tests/`, `bench/`, `.scripts/` and `.plan/contract/`. Dated history — `.plan/reviews/**`, `.plan/measurements/**`, and decision-ledger rows — is out, by the tense rule.
2. **Three reference kinds resolve**: a contract citation `NN §…` resolves to a heading _or a declared row id_ in `contract/NN-*.md`; a backticked repository path resolves on disk; a cited test or source file exists.
3. **A deliberately retired reference is marked**, and strike-through is the marker — the convention the repository already uses for retired symbols, extended to paths and sections. An unmarked reference to something absent is a failure.
4. **Unparseable is a failure, not a skip.** Every `§` occurrence in scope is classified _resolved_ or _failed_; none may be silently ignored. This is the property that forces the citation form to converge without anyone legislating a syntax, and it is D-115's rule applied to D-112's own instrument.

**Why this one gets an instrument when the rest get rules.** It is the only class that is a pure string-to-existence check with no semantic model — and it is the class that has demonstrably rotted. Twelve confirmed instances survived twenty-two phases, six checkpoint reviews, a Revision 2.1 reconciliation and three Phase 22 entries. Two of them were **found and written down** — `05 §What would reopen this`, recorded in `bundle-structure.md` and again in `plan.md` — and declined both times on the ground that _re-pointing a citation is not this document's to land_. That is not a judgment failing; it is a defect with no owner, which is exactly what an instrument is for.

**What it costs.** One node test, and a repair pass over roughly a dozen confirmed sites plus whatever the exact resolver adds. **What it buys** is not tidiness: a citation is how this package carries an argument between the code and the contract, and a citation that resolves to nothing is a premise a later reader cannot check — which is the mechanism of every instance of F-81.

---

## 2. Prose that outlives its declaration, and ships — **D-113**

`src/sortable/feature.ts:185` carries **two consecutive doc blocks** on `SortableInstaller`. Only the second is the effective JSDoc. The first reads:

> The authoring shape — internal and unstable, and unexported from the package for that reason.

The block immediately below it reads:

> **D-45 withdraws the brand and D-61 publishes the type.**

**Both ship.** `sortable/feature.d.ts` carries the pair verbatim at lines 119–125 and 126–150. A third-party installer author — the audience D-61 created and D-78 published for — opens the declaration of the type they are told to implement and reads that it is _internal and unstable, and unexported from the package_, directly above the sentence saying it is published.

This is the same premise `kernel/dev.ts` was still asserting when F-78 was found, in the same tier, surviving the same three decisions. It is also the mechanism in its purest form: **an orphaned doc block is prose with no subject, so no compiler, no TypeDoc run and no reviewer diffing declarations can ever tell it that it is wrong.** It is invisible by construction and it is copied into the artifact.

**Six orphaned blocks ship**, across 32 emitted declarations. They have two causes and only one is a defect:

| Site | Cause | Verdict |
| --- | --- | --- |
| `sortable/feature.d.ts:126` | a doc block that outlived the declaration it described | **False, present tense, on the public surface** |
| `sortable/feature.d.ts:82`, `sortable/domain.d.ts:104` | deletion notes (`~~SortableCallbacks~~`, `~~SortableFinishResult~~`) | correctly struck; historically accurate; orphaned |
| `kernel/phases.d.ts:13`, `kernel/types.d.ts:7`, `kernel/spec.d.ts:83` | a module header that lost its anchor when the bundle was flattened | not false |

**Decision D-113: a published declaration carries no doc block that documents nothing.** The detector is five lines against the emitted tree — a `*/` followed by a `/**` with no declaration between — and it belongs beside the existing packaging assertions, which already read the built artifact and the packed tarball.

**This brushes the API boundary and the brush is deliberate.** The API entry read the export lists; it did not read the doc blocks attached to them, and one of them contradicts a decision that entry made. **It reopens nothing**: D-61, D-78 and D-110 all stand, and this says only that the artifact must not carry a sentence denying them.

---

## 3. Obligations dropped when their destination closed — **D-114**, and **F-82**

API-03 observed that D-108's _Overturned by_ clause names a runtime measurement nobody took, while the structural argument over the call graph had already settled the question by a better route. The finding is right, and it is one instance of something larger.

**Five obligations are live, unwithdrawn, and tracked by nothing.** Each was checked for a discharge elsewhere in the record before being listed:

| Owner | The obligation | Why it is orphaned |
| --- | --- | --- |
| **Check D-56** | _Run `bench/size` immediately before and after the three subpath deletions land. The prediction is zero byte movement… A later phase may not record it as satisfied without the two numbers_ | **The window is permanently gone.** Phase R landed the deletion; nobody took the numbers; and the check's own wording forbids any later phase from recording it satisfied. Four records — `phase-21.md`, `m3-prime.md`, `m2-prime.md`, `m5.md` — each hand it back rather than take it |
| **D-107, Class B** | _Overturned by … a machine-readable reason replacing the prose — which is an API change and **belongs to the API deliverable**_ | The API deliverable ran and closed the door: _Anything in the bundle entry. It stays closed at `d949cfeb`._ Both passes were correct; the obligation fell between them |
| **D-81** | _whether a stage is a promise or a description **is Checkpoint E's**_ | Checkpoint E ran eight passes and closed on a different seam. The phrase occurs once in the whole record — in D-81's own row |
| **D-46 / D-54** | _Touch adds long-press context menus and tap highlighting… That is an **owed measurement**, recorded here rather than assumed away_ | It is a measurement, and the deferred table's vocabulary has no form for one. It was not in D-95's Phase 21 obligation sweep, which scoped itself to 05's M-1…M-4 |
| **`bundle-structure.md` §Corrections item 3** | _Recorded so **the next pass over 05** either writes the section or re-points both_ | "The next pass over 05" is not a scheduled thing. Closed here by D-112 |

Three further normative open questions in 05 have had their **answering event occur** and were never re-read: **Q-4**'s narrow half (_a question a second implemented behavior answers_ — free drag landed at Phase 19 with two action tags against the sortable's three), **Q-6** (_the test matrix should include a rejection after a collection change_ — no such row exists), and 05's _a second engine is owed_ clause.

### The shape they share, which is not "somebody forgot"

**Every one was booked to a named destination, and the destination then closed without taking it.** Phase R closed over Check D-56. The API deliverable closed over D-107's Class B. Checkpoint E closed over D-81's question. _The next pass over 05_ was never a destination at all.

`tests/decisions.node.test.ts` is the only instrument built for this class and it cannot reach any of them: its destination vocabulary is `Phase <n>`, `Before Phase <n>` and `Remediation`, so `Phase R`, `Checkpoint E`, _a measurement_ and _the owner_ are all unspellable — `Phase R` would in fact fail the vocabulary check outright — and its witnesses are source-level facts, which cannot observe a phase closing.

### D-114 — obligations name destinations that can receive them

**Three parts, and no new machinery.**

**(a) An _Overturned by_ clause states a standing condition, never owed work.** A standing condition is one an observer recognises without anyone doing anything — _evidence of a bundle-constrained supported deployment appears_. Owed work is an obligation and goes where obligations go. The two read identically today and API-03 is the proof a careful reader cannot tell them apart. **Applied to D-108**: its clause is standing, and its structural argument — `arm()` runs once per controller, all three `scrub()` sites are terminal — already discharges what the clause appears to owe. It should say so.

**(b) A destination must be a thing that can close, and closing it discharges or re-books every obligation booked to it.** This is why the remedy is a rule and not a test: **no instrument can observe a destination closing.** What can is the pass that closes it. Phase R, Checkpoint E and the API entry each closed correctly on their own terms and each left something behind, because nothing asked them at the moment of closing.

**(c) The live set is carried in one register, not distributed across nine documents.** The five rows above and the three open questions are today spread over `plan.md`, contracts 00/02/05/07, `bundle-structure.md` and four measurement records, and assembling them took a full census. **A human owner inheriting this library needs one list of what is still owed and what each item is waiting for** — which is the artifact this handoff is missing, and the cheapest thing in this document to produce.

**F-82** records the eight live items so they exist somewhere addressable before the register does. **Check D-56 needs an owner's decision rather than a repair**: the measurement it specifies can no longer be taken, so D-56 is either accepted on its argument with the check formally withdrawn, or the check is restated as something a current tree can answer. **That is the owner's call and this pass does not make it.**

---

## 4. Gates that pass when their own premise breaks — **D-115**, and this pass's own near-miss

Three instruments in this package can fail **open** — pass while the property they assert is false. That is strictly worse than stale prose, because it converts to a green suite.

**(a) `tests/packaging.node.test.ts`'s module-graph parser.** `relativeSpecifiers` is a single regex, `/from\s*'(\.[^']*)'/gu`. It cannot see a side-effect import, a double-quoted specifier or a dynamic `import()`. **It is correct today** — verified: zero side-effect imports, zero double-quoted specifiers, zero dynamic imports across 210 import statements in `src/` — and it is correct only because the source happens to use exactly one form, which nothing asserts. A contributor adding `import './register.ts';` silently drops a whole subtree from `reachableFrom()`, and **three assertions depend on it**: ship-list coverage, optional-module isolation, and — since D-111 — clean-build pathspec coverage. All three would go green. This was recorded as **M-05 at Checkpoint B**, owned by "Phase 11 M-3", and has been live ever since.

**(b) Three of the four runs in `tests/docs.node.test.ts`.** Each asserts `output.split('\n').filter((line) => line.includes('warning')).toEqual([])` against a captured stream. A reworded summary, a changed log format or a stream TypeDoc declines to write makes the assertion **weaker without failing**. The file says so itself, in as many words — _the worst way for a gate to break_ — invents the fix for the fourth run (`--treatWarningsAsErrors`, plus reading back the emitted JSON so the run cannot pass vacuously), and then declines to apply it to the other three because _rewriting them is a change to instruments that are currently green and were not what Checkpoint E asked about_. Correct scoping at the time; nothing scheduled it since.

**(c) The citation convention itself**, which is why the census in §1 is indicative rather than exact. Citations are free prose, so any resolver written against them under-matches, and a resolver that under-matches silently is the same failure one level up. D-112 clause 4 is the answer.

### D-115 — an instrument asserts its own premise, or states why the premise cannot break

The rule is one sentence and the applications are already invented in this repository: `--treatWarningsAsErrors` and an artifact read-back for (b); one assertion for (a) — every `import`/`export` statement in `src/` matches the form the parser understands, so the parser fails loudly the first time one does not; and D-112 clause 4 for (c).

**A gate that cannot be trusted is worse than an absent one**, because an absent gate is visible in a coverage reading and a fail-open gate reports success. This is the last pass before human ownership, and a human owner reading a green suite is entitled to know what green means.

### The same error, made once by this pass, caught before it was written

An early grep of the built tree found every DEV assertion message string, apparently contradicting D-107's _`__DEV__` folds completely_. The hits were in `.js.map` `sourcesContent` and in preserved JSDoc; the emitted functions really are empty. **This is the phase's fifth instance of one class — a proxy read where the quantity was meant** — after P-02's superseded curve, P-01's unreachable regime, the free-drag division and D-106's `renderedLength` ranking. The first four reached the record and were corrected on challenge. This one did not, and neither did a second attempt here: two automated citation censuses produced different totals, both wrong in both directions, and only a hand audit settled which instances are real. **The numbers in §1 are the hand-audited ones.** That the machine reading was untrustworthy twice in one pass is not an aside — it is the argument for D-112 clause 4.

---

## 5. The plan's standing maintainability items, discharged

- **M-02, the duplicated SPI types — closed.** `ActionTransition`, `SeamRejection` and `Transition` are each declared exactly once, in `kernel/seams.ts`, and imported by `kernel/kernel.ts`, `sortable/spec.ts` and `free-drag/spec.ts`. The literal drift M-02 predicted cannot occur.
- **M-02, the global control-flow shape — not closed, and not reopened here.** `kernel/kernel.ts` is 2 468 lines, up from the 1 971 that prompted the finding. M-02's own disposition was that _mechanical splitting before those decisions is not warranted_, and the decisions it named have since been taken: the tri-phase driver, the seam vocabulary, the two-phase handshake and the lifetime scopes are all now normative and instrumented. **Splitting a file whose shape is fixed by a contract buys navigation and risks nothing else** — a real judgment, with a real cost, and one this pass declines to make on the last day of agent ownership. It is F-82's ninth row and it belongs to the human owner.
- **M-06, `PresentationView.insertion` cleanup — closed.** `src/sortable/spec.ts` clears the field on both the success and the early-return paths.
- **M-04's stale q7 record — closed in place** by a dated correction note, which is the convention this document ratifies.
- **M-05 — live**, and it is D-115 (a).
- **Checkpoint E's residue** — E-08's three un-hardened docs assertions are D-115 (b). Nothing else from E survived the API entry.

---

## What this pass does not decide

- **Any repair.** All four decisions state required properties. Which sites are re-pointed, how the resolver parses, and where the new assertions live are the implementer's.
- **F-80's four divergences.** Unchanged since the API entry; each needs an owner's call.
- **Check D-56's disposition** — withdraw the check on D-56's argument, or restate it against a tree that can answer. The window closed; the choice is the owner's.
- **Whether `kernel/kernel.ts` should be split.** Named, priced as a judgment, and left.
- **The three normative open questions in 05** whose answering events have occurred (Q-4 narrow, Q-6, the second engine). Each is a re-read, not a repair.
- **Anything in the performance, bundle or API entries.** D-113 touches an artifact the API entry published and denies none of its decisions; nothing else comes near them.

## Corrections to the record made here

- **F-2 and F-11**, in both `00-index.md` and `05 §Findings`: their mitigation read _`__DEV__` shape assertion_ and _`__DEV__` heuristic_. **D-108 made both unconditional four days ago.** The mitigation is now stronger than the record claimed, and a reader weighing whether either finding is still tier C would have reasoned from a false premise — F-81's mechanism, inside the findings register, created by the decision that closed F-81's first instance.
- **F-81's row** gains the disposition of its four original instances — two closed by D-108, one closed by the API entry, one still live at `src/kernel/failures.ts:6` — and the evidence found here.
- ~~**No decision-ledger row is edited.**~~ **Corrected 2026-08-22 by D-116.** The claim was true of this pass and false as a rule: the record does edit a row when a clause inside it goes live, and this branch did so twice — D-108's overturn clause was rewritten and its original wording struck, and D-106 carries a struck F-77 sentence beside a dated replacement. What survives is the narrower and correct half: a row's **reasoning** is a dated act and stands as it stood — D-101's reference to `kernel/dev.ts` needs no repair, because D-108 supersedes it rather than falsifying it. What does not survive is the implication that a row may therefore hold anything at all; under D-116 it may not hold a live clause. See §6.

---

## 6. A live clause inside a dated row — MNT-03, and **D-116**

Everything above is dated 2026-08-22 and is unchanged by this section except where it says so. This is the one place the maintainability review reached the design rather than its implementation, and it is worth stating why the design was wrong and what is narrow about the fix.

### The mismatch, stated once

**The tense rule classifies by register; the resolver skips by container.** Those coincide for every row of the table above except one. A source file is a container that holds only present-tense prose, so scoping it in is exactly right. A review record is a container that holds only dated prose, so scoping it out is exactly right. **A decision-ledger row is neither**: it holds dated reasoning, which the rule protects, _and_ — in three rows out of one hundred and sixteen — a condition a later pass must act on, which the rule calls live and answers **Yes** for.

`LEDGER_ROW` skips the row whole. So the clause the rule marks live is the one thing in the tree no instrument can see, and the design's own headline instance sits in it: **`05 §Measurements owed`, cited inside D-106's unfired re-base condition, is a reference the authority for a live condition points at and it has never existed.** §1 called that the largest instance and then scoped it out in the same document.

### The fix is to the specification, not to the resolver

Removing the skip is the obvious move and it is wrong. MNT-03 measured the consequence: **26 unresolved citations surface inside D-rows, and most are correct**. D-45's row names the heading D-45 itself renamed — that is not a defect, it is the record doing its job, and a rule that flags it will be switched off within a phase. Un-skipping converts the ledger into present-tense documentation and buys two repairs for a hundred-odd false ones.

**So the row shape stays, and what changes is what a row is allowed to contain.** A standing condition is lifted into the register, which already exists, is already the single live set, and is already the artifact a human owner reads to find out what is outstanding. The ledger row keeps its reasoning as it stood and cites the id. The skip is then sound rather than merely convenient: **nothing live is inside a row.**

That costs **one scope root** — `obligations.md` joins `src/`, `tests/`, `bench/`, `.scripts/` and `.plan/contract/`, as the one `.plan/` file outside `contract/` that is present-tense by construction — and no new mechanism. After it, everything the tense rule calls live is inside the resolver, and everything outside it is dated. That equivalence is the property this document should have had in the first place.

### History and error are not the same thing

D-101 still names ~~`src/kernel/dev.ts`~~ and needs no repair: it was true when written, and D-108 supersedes it. `05 §Measurements owed` was **never** a heading in 05. **The tense rule protects a reference that was true, not one that was never true** — the second is not history, it is a defect that happens to be old.

That distinction is what keeps this decision from becoming a sweep. It cannot be checked mechanically without archaeology, and it does not need to be: a clause is re-derived against today's tree at the moment it is lifted, which is when someone is looking at it anyway, and the row it came from gets a dated note. Two sites carry the witness clause — D-106's row and [`bundle-structure.md`](bundle-structure.md) §Headroom — and both get the pointer.

### What is not instrumented, and why the backstop is honest about it

Whether a **new** decision embeds a condition rather than registering it cannot be observed by an instrument. That is D-114 (b)'s argument, and it is not re-derived here.

What is checkable is the vocabulary the record actually uses. **A bold condition lead-in in a ledger row must name an `SC-n`; every `SC-n` must exist in the register and be cited from the ledger.** Bold is the discriminator because it is already this record's typography for a live clause, while an italic or backticked mention is how it quotes the term — D-114's own row says _Overturned by_ about the rule and must not be flagged, which is §1's **specimen** applied to a lead-in.

**Its premise is open, and D-115 requires that be said rather than hidden**: a fourth lead-in nobody has used yet escapes it. So the register entry is the load-bearing artifact and the check is a backstop over three known forms — the same relationship §3 has between rule (b) and no test at all, one notch stronger.

### Why three is the right size to build for

The census is three: **D-106's re-base conditions, D-107's Class B overturn, D-108's overturn.** A live population of three does not justify machinery, and D-116 builds none — it reuses the register D-114 opened, one scope root on the resolver D-112 built, and one string-to-existence assertion in the instrument that already owns this file.

**The class is not hypothetical, and the proof is one tier down.** F-78 reads _`kernel/dev.ts` … its own stated revisit condition has fired unnoticed_. A live condition was embedded in prose; its triggering event — Revision 2.1 publishing three authoring entrypoints — passed unobserved across three revisions until a bundle sweep tripped over it; D-108 exists to clean up after it. MNT-03 is that same shape one tier up, in the file where this record keeps its conditions, and it was found by a reviewer rather than by anything the package runs.

### What §6 does not decide

- **D-106, D-107 and D-108 themselves.** Only the location and the citations of their live clauses move. No budget re-bases, no byte changes, nothing about `__DEV__`.
- **Whether `05` should grow a `Measurements owed` heading.** §1's re-point stands; MNT-04's observation that the target carries the doctrine by inference is answered in **SC-1**, which states the doctrine outright instead of leaning on a section title.
- **MNT-01, MNT-02 and MNT-04 through MNT-08.** They are findings against the implementation and belong to the implementer, except MNT-08's neighbour recorded here as **F-83**.