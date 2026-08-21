# Checkpoint D fifth review — architect resolution of C5-03

Scope: **C5-03** only — the internal inconsistency the fifth review found between I-36's provisioning obligation, I-6 clause 3's headline, the `landing()` residue and the public conformance test. C5-01, C5-02 and C5-04 belong to whoever takes them; they are named here only where this decision constrains one, and every editing collision is listed in §10.

**The review file was `checkpoint-d-5.md` misspelled as `checkpoitn-d-5.md`.** This resolution uses the correct prefix. The typo was recorded rather than fixed at the time, to avoid breaking the links C5-01/C5-02/C5-04's resolutions would make to it; the file was later corrected on disk without those references following, which C6-08 recorded and this pass closes. It is [`checkpoint-d-5.md`](checkpoint-d-5.md).

Not reopened: C2-01's mechanism (behavior-owned latch on `SortableRuntime.closed`, `live` on the per-operation view), C3-01's boolean return channel, **C3-03's tier split** (I-6's Tier cell is not touched), D2, D5, **L-11**. §10 says where each is touched and where it is not. One thing C3-03 decided _is_ superseded — its retention of clause 3's headline verbatim — and §1.2 argues that C3-03's own §4 audit is what licenses the supersession.

**No production source or test change is decided here.** Two obligations are created — a documentary correction and one test — and both are named. The `FeatureContext.live()` remedy that review 4 decided and deferred is **withdrawn as a queued obligation** and re-classified; §2.3 says why, and it is the one place this decision reverses its predecessor rather than completing it.

---

## Decision

**The reviewer is right twice, and both halves are wording defects over a sound design — but the repair is neither of the two remedies the review names.** I-36 (1) was written with one discharge form when the artifact and F-47's own table have always had two. I-6 clause 3's headline is falsified after `destroy()` returns not only by `landing()` but **by the kernel itself, deliberately, at `kernel.ts:1349`** — so qualifying it is mandatory under _either_ named remedy, and the review's either/or is a false dichotomy on that half.

1. **Provisioning becomes bimodal, which completes it rather than narrowing it.** A module that reaches consumer code discharges I-36 by **holding a liveness reading** _or_ by **naming the kernel bracket that revalidates after its consumer-reaching stretch and undoes what the stretch did**. `landing()` discharges by bracket — F-30 for an unpublished handle, `retireSettlement`'s own `handle.destroy()` for a published one — and the bracket is the _stronger_ reading, because it also sees a `panic()` destroy that `rt.closed` never does. `landing.ts` stops being a counterexample without an exemption being written for it. §2.1.
2. **Provisioning is restated as necessary and not sufficient.** Review 4 called (1) "closed, checkable, **complete**". That word is the error, and it is the root of the meta-question: C5-01 and C5-02 are both at modules that _do_ hold a reading. §7.
3. **The floor's antecedent is fixed by one clause.** "After a closed reading" reads as "after the participant observed closure" and is therefore vacuous where no reading exists — the reviewer is right. The decision it appears in evaluates the residue under the other reading ("after the controller closed"). The intended reading is written in. §2.2.
4. **I-6 clause 3's headline is qualified in the invariant cell**, not only in the mechanism cell: _no callback fires afterwards **that leaves anything behind**_, with the kernel's relinquishing calls named as the admitted form. This supersedes C3-03's verbatim retention and review 4 §4.3's claim that the headline "is retained verbatim". The **Tier cell is untouched**. §1.2, §3.4.
5. **A drafting rule is promoted from the reviewer's own sentence.** _"Mechanism prose that reinterprets an invariant does not change the invariant's operative sentence."_ That is correct and it is the generalisable lesson of this pass; it becomes a sentence in the tier legend. §3.6.
6. **`FeatureContext.live()` is withdrawn as the decided-and-deferred remedy** and re-recorded as optional defence in depth with an unchanged trigger. It installs a _weaker_, panic-blind reading at a site already covered by a stronger tier-B kernel bracket, costs **+53 B** on the tightest composition, and does not close the class. Withdrawing it returns **53 B** of forecast pressure to C5-01 and C5-02, which are real defects. §2.3, §6.
7. **The public conformance test does not change.** Not one assertion moves; it gains a second citation (I-6) and a companion case. Under the review's _first_ named remedy it would have had to be rewritten to `expect(calls).toEqual([])` — the test review 4 landed is correct as written only under this decision. §4.
8. **This decision costs 0 B, 0 per-frame work and 0 heap.** Six markdown files and one added test case. §6.

**Checkpoint D can close on C5-03, and cannot close on the strength of this document alone.** The concrete, checkable discharge condition for I-36 is in §8, and it is the first one in five passes that a sixth reviewer can verify rather than re-litigate.

---

## 1 — Is the reviewer right?

### 1.1 · Provisioning — yes, and there is no reading of the register that saves it

**The claim under test.** `contract/05`, I-36 cell 2:

> **(1) Provisioning — universal and closed.** Every module that reaches consumer code, directly through a declared slot or indirectly through a consumer-owned node, **holds a liveness reading**

Checked against the artifact: `src/sortable/landing.ts` reaches consumer code three times inside `LandingStart` — `timing()` (a **declared slot**, `landing({ duration })`), `realm.window.matchMedia?.(…)` on the consumer's window, and `visual.animate(…)` on the consumer's element. `FeatureContext` is `{ realm, root, report }` (`src/sortable/feature.ts:29-41`) and `landing()`'s factory is `brandFeature(() => ({ startLanding: start }))`, which ignores the context it is handed. **The module holds no liveness reading.** (1) is present-tense, universal, and false of a first-party module the same document names two sections later.

**Does the register accommodate it?** No, and the structure is worth stating precisely because it is what makes the finding correct rather than pedantic.

- **(3) governs ceilings only.** Its closing clause — _"A site absent from the register gets the floor and nothing more; that it carries no ceiling is not a finding"_ — excuses a **missing stronger promise**. It says nothing about a missing reading. Provisioning is a separate, independently quantified obligation in the same cell, and no sentence in (3) reaches it.
- **(2) is vacuous at an unprovisioned module, on the letter.** Its antecedent is _"After a closed reading the participant performs none of five acts"_. In this document's own vocabulary a _reading_ is an act the participant performs — "holds a liveness reading", "reads the latch between invocations". Where the participant takes none, there is no "after a closed reading", and the reviewer's word for that — vacuous — is the right one.
- **So the conforming-residue verdict rested on the one part of I-36 that does not apply at the site, while the part that does apply is falsified.** That is the contradiction, and it is exactly as the review states it.

**One thing the review understates, and it decides §2.2.** Review 4's own §3 evaluates the residue against all five acts and concludes "breaches none" — which is only possible under a _different_ antecedent: "after the controller is closed", a fact about the world, not an act of the participant. The conformance test is written against that reading too. So (2) is not merely vacuous; **the decision that wrote it was already using a second, unwritten reading of it.** That is a one-clause wording defect and it should be repaired regardless of everything else here.

**A second falsification the review did not name, and it matters more than the first.** `src/sortable/layout-animation.ts` and `src/sortable/placement.ts` both **do** hold liveness readings — `view.live()` and the `live: () => boolean` parameter of `createPlaceholder` — and C5-01 and C5-02 are real floor breaches at both. So (1) can be satisfied at a module whose floor is breached at several sites inside it. **Provisioning is necessary and nowhere near sufficient**, and review 4 called it "closed, checkable, **complete**". That word is the load-bearing error of the previous pass and §7 is about it.

**Verdict on (a): the reviewer is right, the defect is in the statement of (1), and no reading of (3) repairs it.**

### 1.2 · I-6 clause 3 — yes, and the sharper form is not the one the review found

**The claim under test.** `contract/05`, I-6 cell 2: **"no callback fires afterwards"**. The conformance test at `tests/sortable/features.browser.test.ts` asserts `expect(calls).toEqual(['animate'])` where `item.animate` is an override the test installed — i.e. it **requires** one consumer-authored function to run after `controller.destroy()` returned. It would fail if the count were zero. So the invariant's operative sentence and the public conformance test disagree, in the direction the review states.

**Is "no callback with a consequence the operation outlives" a legitimate scoping, or a face-saving reinterpretation?** The scoping is legitimate — it is I-13's device (`No **kernel-ordered** irreversible action`) and I-32's (`forbids rather than prevents`), both already in this table. What is _not_ legitimate is where it was written. Review 4 put it in I-6's **mechanism** cell while its own §8 recorded clause 3's headline as _"Retained verbatim"_ and _"Checked, no change needed"_. **The reviewer's sentence is correct and should become a rule**: mechanism prose that reinterprets an invariant does not change the invariant's operative sentence. Both cells are normative; when they disagree, the invariant cell is what a reader following this document's own instruction ("the column that matters is the tier", then the claim beside it) will act on.

**So on (b) the answer is: a wording defect, and the wording must actually be changed rather than annotated.** That is the difference between C5-03 and a documentation nit, and it is why the review is right to block on it.

**And here is the fact that decides the remedy, which the review did not find.** The headline is falsified after `destroy()` returns **by the kernel**, not only by a participant:

```ts
// src/kernel/kernel.ts, armSettlement — the F-30 revalidation
if (!settlementLive(attempt)) {
  const runner = handle!;

  guarded(() => {
    runner.destroy();
  });
  rollbackLandingHold(attempt);
  return ARM_STALE;
}
```

With `landing({ run })` composed, `start` **is** the consumer's runner and `handle` **is** the consumer's `LandingHandle`. A runner that calls `controller.destroy()` synchronously and then returns a handle causes the kernel to invoke `runner.destroy()` — a member of a consumer-authored object, filling a **declared** slot — _after_ `controller.destroy()` has returned. Under I-36's own indirect-invocation reading ("an overridden `getBoundingClientRect()` on a consumer-authored placeholder is a consumer call") this is a fortiori a consumer call, and under the five-act floor it is **act 4**, _invoking a declared consumer callback_. At a site rated tier **B**.

Three consequences follow, and together they decide §2.

1. **The kernel does this deliberately and must.** Not calling it leaks a runner nothing owns — the comment above the branch says so, and I-20 requires it. So this is not an unenforced promise; it is a promise the contract **relies on breaking**.
2. **Therefore the qualification is required under either remedy the review names.** Landing `FeatureContext.live()` and guarding `landing()`'s default runner does nothing about `landing({ run })`, and nothing about this branch. The review's either/or is a false dichotomy on the I-6 half: **the I-6 edit is not optional, it is common to every branch.**
3. **C3-03's audit is what licenses the edit.** C3-03 §4 verified that all six other citations of the phrase are kernel-sequenced and survive a narrowing, and then declined to narrow because "deleting it buys nothing". That established the narrowing is _safe_; review 4 took its benefit without paying its one-clause cost. The remaining question — does the qualified form still carry `05:285`'s _"Destroying the returned handle later does not un-call it"_? — is answered in §2.4, and the answer is yes, verbatim.

**Verdict on (b): the reviewer is right; it is a wording defect over a sound and in fact mandatory scoping; and the scoping is broader than either the review or review 4 realised, because it binds the kernel too.**

## 2 — The remedy

### 2.1 · Provisioning is bimodal, and always was

F-47's own enumeration table has carried two kinds of barrier from the day C2-01 wrote it. Its **Barrier** column reads, across the rows: `post-callback revalidation`, `preparationValid()` between prepare and commit, `revalidated on both sides (F-38)`, `kernel revalidates after start (F-30)` — and, separately, `added by I-36`, `added by C4-01`, `refresh`'s boolean abort channel. **Kernel bracket, or participant reading.** Review 4 read the participant column and wrote (1) over it; the kernel column was already there and was left out of the quantifier. That is the whole of the defect, and it is a completion rather than a narrowing.

**What bracket discharge is, stated so it cannot swallow everything.** A module discharges by bracket only when its _entire_ consumer-reaching stretch sits inside a kernel bracket that (i) revalidates after the stretch and (ii) **undoes what the stretch did**. Undo is the load-bearing half; without it the bracket stops the _next_ call and leaves the previous one's residue standing.

Checked against the artifact for `landing()`:

| Stretch | Bracket | Undo |
| --- | --- | --- |
| `timing()` → `matchMedia` → `visual.animate()` → `finished.then(…)` inside `start` | `armSettlement`'s `!settlementLive(attempt)` at the F-30 revalidation | `runner.destroy()` → `generation += 1; animation.cancel()`. `cancel()` removes the effect including the forwards fill; the subscription's `done`/`fail` are made inert by the generation bump and are independently inert on a retired attempt (D-28). One synchronous stretch, no style flush, no rAF, **no paint** |
| a throw from the `finished` accessor or from `then` | `play`'s own `catch` | `generation += 1; started.cancel()` before rethrow; `runLeaf` classifies, `handle === undefined`, nothing to leak |
| `retarget`'s `getComputedStyle` → `cancel()` → `animate()` | published handle; teardown's own `retireSettlement` | `handle.destroy()` at `kernel.ts:412` — teardown disposes the published handle, which cancels |

**Before publication F-30 disposes the unpublished handle; after publication teardown disposes the published one.** Either way the residue is cancelled inside the same synchronous stretch. That symmetry is why `landing()` is bracket-discharged for its whole consumer surface, including `retarget` — which review 4 could only record as "deliberately left alone… so the fifth reviewer finds it examined rather than missed". Under the bimodal rule it is not a hand-wave; it is a row.

**Bracket discharge is the stronger form where it applies.** `settlementLive(attempt)` reads state that teardown retires _by whatever route_, including a kernel-internal `panic()`. `rt.closed` is set only by `controller.destroy()` and is blind to a panic — review 4's own §5 recorded exactly this when it noted `presentation.signal` is "strictly stronger… if a route ever exists, prefer it over the latch". The bracket is that route, and it already exists here.

**Calibration — the check that the rule is neither too weak nor too strong.** Five landed findings, and the rule must reproduce all five verdicts without being told them:

| Finding | Discharge form | Bracket undoes? | Verdict under the rule | Landed verdict |
| --- | --- | --- | --- | --- |
| C4-01 candidate geometry (`rect-index.ts`) | reading (`live()` on the view) | n/a | reading present but placed after the surviving cache write → **defect** | defect |
| C4-01 `release.effect` (`spec.ts`) | reading (`rt.closed`) | n/a | reading absent at a stretch that dereferences nulled `rt.lift` and publishes `rt.pendingRequest` → **defect** | defect |
| the `landing()` residue | **bracket** (F-30 / `retireSettlement`) | **yes** — `cancel()` | **conforming, discharged** | conforming, _undischarged_ |
| **C5-01** `layoutAnimation()` subscription | reading (`view.live()`) | no bracket: `afterMove` runs post-commit inside `action.effect(TAG_SPATIAL)`; nothing revalidates after the hook pipeline, and `running.set()` survives | reading present but the stretch from `finished` to `running.set()` publishes → **defect** | defect |
| **C5-02** `applyMechanics` | reading (`live` parameter) | `preparationValid()` discards the _preparation_; it does **not** reverse `setAttribute` on a consumer-owned element the library never adopted | not bracket-discharged; reading present but the stretch mutates → **defect** | defect |

The rule reproduces all five, including the two the fifth review found _after_ review 4's formulation landed, and it reproduces them **mechanically** — the distinguishing question at C5-01 and C5-02 is "does the bracket reverse this?", which has a source-level answer, where review 4's five-act audit needed a per-site judgement.

### 2.2 · The floor's antecedent

One clause, and it removes the vacuity objection without changing a single verdict. `After a closed reading` becomes `Once the controller is closed — whether or not the participant has taken a reading`. This is the reading review 4 already used when it evaluated the residue against all five acts, and the one the conformance test is written against. It is a repair to text, not a change of meaning, and it is stated as such so a sixth reviewer does not read it as a relaxation.

### 2.3 · `FeatureContext.live()` is withdrawn as a queued obligation

This is the one place this decision **reverses** review 4 rather than completing it, so the argument is given in full.

| Consideration | Weight |
| --- | --- |
| It installs a **weaker** reading than the one the site already has. `rt.closed` is blind to a `panic()` destroy; `settlementLive(attempt)` is not. Spending 53 B to add a strictly worse guard beside a tier-B one is the wrong trade in either direction of the repository's priority order | decisive |
| It does not repair I-6 (§1.2). `landing({ run })` and the kernel's own `runner.destroy()` are untouched by it | decisive |
| It does not close the class. Review 4 said so itself: _"a consumer-supplied `run` stays unguarded by construction"_ | strong |
| **+53 B** on `complete` and **+11 B** on `minimal`, a composition that installs no `landing()` at all — every consumer pays for a guard three-quarters of them cannot reach | strong |
| C5-01 and C5-02 are open floor breaches competing for the same 106 B. A correctness fix must not queue behind defence in depth | strong |
| It prevents the _act_, not only the consequence — genuine defence in depth, and C2-01 §7's noise-band argument would license keeping it if it were already landed | real, and outweighed |

**It is not deleted from the record.** It is re-recorded in F-47 as an available, measured, zero-frozen-surface remedy whose **trigger is unchanged and is now stated as the bracket-discharge falsifier**: a consumer-reaching stretch inside `start` whose effect the bracket does not undo — a publication, a retained reference, a surviving mutation, or a stretch that outlives `start`'s return. Any of those falsifies (ii) of bracket discharge, at which point `landing.ts` must hold a reading and `FeatureContext.live()` is the shape. That is a _better_ trigger than review 4's, because it is derived from the rule rather than listed beside it.

**F-47's factual correction stands and is not reversed.** Review 4 was right that C4-01's _"closing it needs the frozen SPI"_ was false on the facts — `FeatureContext` is behavior-owned, unexported, and already carries `report`. That correction is orthogonal to whether the remedy is queued, and it stays.

### 2.4 · What I reject

| Alternative | Rejected because |
| --- | --- |
| **The review's remedy 1 — land `FeatureContext.live()` and guard the landing sequence** | Does not repair I-6 (§1.2), so it leaves half of C5-03 open while spending half the tightest headroom. Installs a panic-blind reading beside a panic-aware kernel bracket. Does not close the class. **And it breaks the public conformance test**: with a guard, `start` returns an inert handle before `animate()`, so `calls` becomes `[]` and `expect(calls).toEqual(['animate'])` fails — the test review 4 landed and this review cites would have to be rewritten, which is the one outcome the review's own constraint forbids |
| **The review's remedy 2 — narrow (1) so `landing()` is a registered exception** | An exemption register for a _floor-level_ provisioning obligation is not the same device as a ceiling register and does not inherit its safety. A ceiling register lists **extra** promises, so a short list is honest; an exemption register lists **absent** guards, and a Phase 18 author reading "enumerate per module" beside a first-party module that opted out will reasonably conclude the enumeration is advisory. That is the exact failure mode C3-03 §6 named. The bimodal form gets the same result with no exemption: `landing()` is _discharged_, not excused |
| **Delete (1) and keep only the floor and the register** | Rejected. C5-01 and C5-02 are floor breaches at provisioned modules, so provisioning is not the thing that failed. Deleting it would remove the one obligation that is checkable by inspection and leave only one checkable by test, which reverses C4-01's correct structural argument |
| **Weaken F-38's `05:285`, _"Destroying the returned handle later does not un-call it"_, to fit the consequence reading** | Rejected, and it is left **verbatim**. The sentence is right, and the distinction it turns on is the one the bimodal rule already draws: F-38's case is the kernel calling `start`, whose _body is consumer code_ — an entire landing initiated on a torn-down controller, a gate held, an animation built, a subscription made. That leaves a great deal behind and no later disposal reverses having run it. `visual.animate()` is the opposite case: the body is platform code and the only artifact is an `Animation` the library itself owns and cancels. **The question is whose code ran and what remains, not whether an "un-call" is possible** |
| **Promote the participant half to tier B by having the kernel bracket everything** | Rejected, unchanged from C2-01 §3 and I-36's own mechanism cell: it requires the kernel to know a behavior's consumer surface (H-1, H-2, D-4). The bimodal rule uses brackets **where they already exist**; it does not propose adding any |
| **Leave C5-03 as a documentation item and close D** | Rejected. This is the fifth pass; the text currently asserts a universal that a named first-party module falsifies, and a headline a public conformance test contradicts. Closing D on that ships both to the Phase 18 author whose acceptance criterion is to read I-6 and I-36 as one pair |

## 3 — The exact wording to implement

Format matches the document's own: single-line table rows, `**bold**` on the load-bearing clause, sections as `§[NN](NN-file.md)`.

### 3.1 · `05-lifecycle-invariants.md` — I-36, invariant cell, part (1)

Replace:

> **(1) Provisioning — universal and closed.** Every module that reaches consumer code, directly through a declared slot or indirectly through a consumer-owned node, **holds a liveness reading**; the obligation quantifies over _modules_, which are enumerable, not over call sites, which are not.

with:

> **(1) Provisioning — universal and closed, in two discharge forms.** Every module that reaches consumer code, directly through a declared slot or indirectly through a consumer-owned node, discharges the barrier one of exactly two ways and **names which**: it **holds a liveness reading**, or its whole consumer-reaching stretch sits inside a **named kernel bracket that revalidates after the stretch and undoes what the stretch did** (F-30, F-38, `preparationValid()`). The obligation quantifies over _modules_, which are enumerable, not over call sites, which are not. **Bracket discharge is not an exemption and is the stronger form where it applies** — the kernel's revalidation reads state teardown retires by _any_ route, including a `panic()` destroy that a behavior latch never sees — but it holds only while the undo is complete: a stretch that publishes, retains a reference, or leaves a mutation the bracket does not reverse is **not** bracket-discharged and must hold a reading. `landing()` is bracket-discharged for its whole consumer surface; every other first-party module that reaches consumer code holds a reading. **Provisioning is necessary and not sufficient**, and reading it as a completeness argument is the error of Checkpoint D review 4: that a module holds a reading says nothing about _where_ the reading is placed, which is what (2) governs and what C5-01 and C5-02 breached at two provisioned modules.

### 3.2 · `05-lifecycle-invariants.md` — I-36, invariant cell, part (2) antecedent

Replace:

> **(2) The floor — universal and closed.** After a closed reading the participant performs none of five acts:

with:

> **(2) The floor — universal and closed.** Once the controller is closed — **whether or not the participant has taken a reading**, so that the floor binds an unprovisioned stretch exactly as it binds a provisioned one — the participant performs none of five acts:

### 3.3 · `05-lifecycle-invariants.md` — I-36, invariant cell, part (3)

Replace:

> **(3) Ceilings — a register, not a quantifier.** Where the library promises more than the floor at a named site the promise is written _at that site_ — §[03](03-feature-composition.md) §`y()`/`xy()`'s "reads no further geometry" for the candidate loop, and the README's publication of it — and is enforceable there. **A site absent from the register gets the floor and nothing more; that it carries no ceiling is not a finding**

with:

> **(3) The register — a written set rather than a quantifier, in two sections.** **Ceilings**: where the library promises more than the floor at a named site the promise is written _at that site_ — §[03](03-feature-composition.md) §`y()`/`xy()`'s "reads no further geometry" for the candidate loop, and the README's publication of it — and is enforceable there. **Brackets**: where a module discharges (1) by the kernel's revalidation rather than by its own reading, the bracket and its undo are named — `landing()`'s `start`, bracketed by F-30, whose `runner.destroy()` cancels an unpublished handle, and `landing()`'s `retarget`, bracketed by teardown's own `retireSettlement` disposal of a published one. **A site absent from the ceiling section gets the floor and nothing more; that it carries no ceiling is not a finding. A module absent from the bracket section must hold a reading; that it holds none _is_ a finding.** The register is closed by construction because it is a set of written statements rather than a set of call sites

### 3.4 · `05-lifecycle-invariants.md` — I-6, invariant cell (cell 2)

Replace:

> `destroy()` is synchronous and terminal; physical release completes before it returns; **no callback fires afterwards** — a global property with two owners: the **kernel** enforces it for every call it sequences, and the **participant** owes it for the interior of any callback that itself drives a sequence of consumer calls (I-36)

with:

> `destroy()` is synchronous and terminal; physical release completes before it returns; **afterwards no callback fires that leaves anything behind** — a global property with two owners and one admitted form each. The **kernel** enforces it for every call it sequences, and invokes consumer code after the terminal barrier in exactly one shape: **to relinquish what it would otherwise leak** — F-30's `runner.destroy()` on a `LandingHandle` that `start` returned after destroying the controller, which I-20 requires it to call. The **participant** owes it for the interior of any callback that itself drives a sequence of consumer calls, to I-36's floor: nothing it invokes after the controller closes may have a consequence the operation outlives (I-36)

**The Tier cell is not touched.** C3-03's split — `B for every call the kernel sequences, over a tier-C participant obligation (I-36)` — stands verbatim and is still correct: the qualification changes _what_ is promised, not _who_ enforces which half.

### 3.5 · `05-lifecycle-invariants.md` — I-6, mechanism cell

Replace:

> **Since Checkpoint D review 4 that residue is bounded rather than open-ended.** I-36 guarantees its five-act floor at every site and the stronger "no further geometry" form only at the sites that state it, so for the **participant** half clause 3 reads _no callback with a consequence the operation outlives_. Clause 3's headline is retained verbatim and is unaffected for the **kernel** half, which is where all six of its other citations sit — a residue whose only effect is one overridable platform member on a node the kernel is about to stop rendering is conforming, is stated, and is not a defect (I-36 (2), F-47).

with:

> **Since Checkpoint D review 4 that residue is bounded rather than open-ended, and since review 5 the bound is in this row's own invariant text rather than only here.** I-36 guarantees its five-act floor at every site and the stronger "no further geometry" form only at the sites that state it, so for the **participant** half clause 3 reads _no callback with a consequence the operation outlives_ — a residue whose only effect is one overridable platform member on a node the kernel is about to stop rendering is conforming, is stated, and is not a defect (I-36 (2), F-47). **Review 4 wrote that bound here and recorded clause 3's headline as retained verbatim; C5-03 found the two cells then contradicted each other, and a mechanism note does not amend the claim beside it.** The headline is therefore qualified in cell 2, which C3-03 §4's own audit licenses: it verified that all six other citations (§[00](00-index.md) D-29, §[01](01-construction-ownership.md) ×2, §[02](02-kernel-behavior-contract.md) ×2, F-38 below) survive a narrowing and then declined to narrow only because deleting the phrase bought nothing — the qualification keeps the phrase and costs those citations nothing, because every one of them concerns a call that _does_ leave something behind. **The kernel half needed the qualification too, which neither earlier pass found.** F-30's disposal branch invokes `runner.destroy()` on a consumer-authored `LandingHandle` after `controller.destroy()` returned whenever `landing({ run })` is composed — a **declared** consumer slot member, act 4 of I-36's floor, at a tier-B site — and the kernel must call it, because not calling it leaks a runner nothing owns (I-20). So the unqualified headline was not an unenforced promise but one the contract **relies on breaking**, and qualifying it is mandatory rather than discretionary.

### 3.6 · `05-lifecycle-invariants.md` — the tier legend, one appended sentence

After _"…so that a missing barrier can be classified instead of only counted — I-36 (2) and (3)."_, append:

> **And the limit belongs in the invariant cell, not only in the mechanism cell.** Review 4 stated I-6's participant bound in the mechanism column while recording the headline beside it as retained verbatim, and one pass later a public conformance test required exactly what the headline forbade (C5-03). Both columns are normative; when they disagree a reader acts on the claim, not on the note about the claim. **Mechanism prose that reinterprets an invariant does not change the invariant's operative sentence** — if a decision bounds a guarantee, the bounded form is what the Invariant column must say.

### 3.7 · `05-lifecycle-invariants.md` — F-47, the enumeration row

Replace:

> | `landing({ duration })` thunk → `visual.animate()` | **feature**, inside `start` | kernel revalidates after `start` (F-30). **Conforming residue under I-36 (2)** — the gap is real, the floor is not breached, and the site carries no ceiling; see the residue note below |

with:

> | `landing({ duration })` thunk → `matchMedia` → `visual.animate()` → `finished.then` | **feature**, inside `start` | **Bracket-discharged under I-36 (1)** — the whole stretch sits inside the F-30 revalidation, whose `runner.destroy()` cancels the unpublished handle in the same synchronous stretch with no intervening paint. The module holds no reading and needs none while the undo is complete; see the residue note below |

### 3.8 · `05-lifecycle-invariants.md` — F-47, the `LandingStart` row

Replace:

> | `LandingStart`, `anchorTarget`, `LandingHandle.destroy`/`retarget` | kernel | revalidated on both sides (F-38), `joinValid` — **plus, from C4-01, a reading inside `anchorTarget`** between the recovery's DOM mutation and the placeholder measurement that follows it |

with:

> | `LandingStart`, `anchorTarget`, `LandingHandle.destroy`/`retarget` | kernel | revalidated on both sides (F-38), `joinValid` — **plus, from C4-01, a reading inside `anchorTarget`** between the recovery's DOM mutation and the placeholder measurement that follows it. **One kernel-invoked consumer call is admitted after the terminal barrier** (C5-03): with `landing({ run })` composed, a runner that destroys the controller and still returns a handle is followed by F-30's `runner.destroy()`, which is a declared consumer slot member firing after `destroy()` returned. It is required — not calling it leaks a runner nothing owns (I-20) — and it is the reason I-6 clause 3 reads _leaves anything behind_ rather than _fires_ |

### 3.9 · `05-lifecycle-invariants.md` — F-47, the residue paragraph

Replace the whole paragraph beginning **"One conforming residue, and the reason C4-01 left it open was wrong on the facts."** with:

> **One residue, classified at review 4 and discharged at review 5, and the reason C4-01 left it open was wrong on the facts.** `landing()`'s `duration` thunk is consumer code called inside `LandingStart`, and the next statements reach the consumer's own visual — `realm.window.matchMedia`, then `visual.animate()`, then the `finished` accessor and `then` — with no reading between them. C4-01 recorded this as a `LandingContext` question and therefore a frozen-SPI question. **It is neither**, and review 4's correction of that fact stands: `FeatureContext` (`src/sortable/feature.ts`) is behavior-owned, is constructed by the behavior at `src/sortable/behavior.ts`, is exported from no entrypoint, and already carries a behavior-supplied closure — `report` — for the same reason a liveness reading would be one. What review 4 got wrong was the _classification_: it called provisioning universal, named this module as not provisioned, and then declared the site conforming under the floor, whose antecedent does not engage where no reading exists (C5-03). **The site is discharged, not excused.** The whole stretch is bracketed: before publication F-30's `!settlementLive(attempt)` branch destroys the unpublished handle, and `destroy()` on it is `generation += 1; animation.cancel()`, which removes the effect including the forwards fill inside the same synchronous stretch with no style flush and no rAF; after publication `retireSettlement` disposes the published handle the same way, which is what covers `retarget`'s `getComputedStyle` → `cancel()` → `animate()` sequence too. Nothing is published, nothing is retained, no mutation survives, no declared callback is invoked by the feature, nothing is dereferenced — and the landing never starts. **The bracket-discharge falsifier, which replaces review 4's trigger list**: any consumer-reaching stretch inside `start` or `retarget` whose effect the bracket does not undo — a publication, a retained reference, a mutation on a node the library did not adopt, or a continuation that outlives `start`'s return. On any of those `landing.ts` must hold a reading, and **`FeatureContext.live()` is the available shape**: a sixth additive widening of a behavior-owned internal type, measured at **+6 B to +53 B** brotli, costing no frozen SPI and no public surface. It is **not queued** — it would install a `rt.closed` reading blind to a `panic()` destroy beside a kernel bracket that sees one, and would spend half the tightest composition's headroom on defence in depth while floor breaches are open. Widening `LandingContext` instead would be both an SPI change and an addition to the **frozen public surface**, and is rejected on that ground independently. One ordering constraint for whoever ever takes it: `assemble()` runs before `rt` exists, so the closure is late-bound and a feature factory must not call it at construction, which the "externally inert" factory rule already forbids.

### 3.10 · `01-construction-ownership.md` §Teardown, the converse-obligation clause

Replace:

> **The obligation is a floor over consequences plus a register of stronger site-specific promises, not a quantifier over call sites** — §[05](05-lifecycle-invariants.md) I-36 (2) and (3) state why the quantifier form is not dischargeable.

with:

> **The obligation is provisioning in two forms — a participant's own reading, or a named kernel bracket that revalidates and undoes — over a floor of consequences, plus a register of stronger site-specific promises; it is not a quantifier over call sites** — §[05](05-lifecycle-invariants.md) I-36 (1), (2) and (3) state why the quantifier form is not dischargeable and why provisioning alone does not discharge it either.

### 3.11 · `05-lifecycle-invariants.md` — the test matrix, _Terminal barrier in a resolver sequence_

Append one case:

> and the kernel's own admitted post-terminal call is pinned: a `landing({ run })` runner that destroys the controller and still returns a handle is followed by **exactly one** invocation of that handle's `destroy`, instrumented on the consumer-authored object, with no animation, no transform and no hold surviving (I-6 clause 3's admitted kernel form, F-30, C5-03).

## 4 — What happens to the public conformance test

**Nothing. Not one assertion moves.** `tests/sortable/features.browser.test.ts` › `describe('landing')` › _should leave nothing behind when the duration thunk destroys the controller_ keeps `expect(calls).toEqual(['animate'])`, `expect(item.getAnimations()).toEqual([])`, `expect(item.style.transform).toBe('')`, the null placeholder, the empty `errors`/`reported` and the two empty terminal-callback lists.

**What changes is what it is a pin _for_, and it becomes load-bearing for a second row.**

| Assertion | Pins, before | Pins, after |
| --- | --- | --- |
| `calls === ['animate']` | the residue's size under I-36 (2) | the same, **and** I-6 clause 3's qualified headline — the "fires" half of _fires without leaving anything behind_ |
| `getAnimations() === []`, `style.transform === ''` | nothing survives | **the bracket's undo**, which is condition (ii) of bracket discharge under I-36 (1) |
| `errors`/`reported` empty, both callback lists empty | floor acts 1 and 4 | unchanged |

Its `tests/COVERAGE.md` row gains **I-6** and **I-36 (1)** beside its existing `I-36 (2), F-30`, and its label changes from _conformance pin_ to _conformance pin — the bracket-discharge witness_.

**Its comment block needs one correction and one addition.** It currently says _"there is no barrier in `landing.ts` for it to guard"_, which is true, and _"Under I-36 (2) that gap is a **conforming residue**"_, which is the classification this decision replaces. It should read: the barrier is the kernel's, the module is bracket-discharged under I-36 (1), and the test is the witness that the bracket's undo is complete. That is a comment edit inside an existing test, not an assertion change.

**Contrast, stated because the review's constraint demands it.** Under the review's first named remedy — land `FeatureContext.live()` and guard the landing sequence — `start` returns a module-level inert handle before the reduced-motion test, `visual.animate()` is never reached, and `expect(calls).toEqual(['animate'])` **fails**. The test would have to be rewritten to `toEqual([])`, discarding review 4's own executable statement of the residue's size. **The conformance test review 4 landed, and that this review cites as the constraint, is correct as written only under this decision.**

**And review 4's sensitivity check still holds and now witnesses more.** Removing the `runner.destroy()` inside F-30's `!settlementLive(attempt)` branch makes the test fail on `expect(item.getAnimations()).toEqual([])`. Under this decision that mutation is precisely the falsification of bracket-discharge condition (ii), so the existing sensitivity witness is the witness for the new rule.

## 5 — The test this decision owes

**One case, and it is the executable form of §1.2's source finding.** No barrier is added, so no barrier test is added.

**`tests/sortable/features.browser.test.ts`**, `describe('landing')` — _should destroy a consumer runner's handle exactly once when the runner destroyed the controller_:

- compose `landing({ run })` where the runner calls `controller.destroy()` synchronously and **still returns** a handle whose `destroy` and `retarget` are instrumented;
- drive a real drag to release;
- assert the handle's `destroy` was called **exactly once**, and that it was called after `controller.destroy()` returned (a flag set by the runner before returning is sufficient and avoids timer coupling);
- assert nothing survives: no animation on the visual, no inline transform, no placeholder, empty `errors`, empty `reported`, and neither terminal callback — the same closing block as the existing pin;
- assert `retarget` was **never** called.

**It passes against current source. It is a conformance pin, not a regression pin**, and it must be labelled as one in `tests/COVERAGE.md` so a sixth reviewer does not read it as a barrier that exists. What it pins is the _admitted_ form of I-6 clause 3's kernel half: that the kernel's post-terminal consumer call is exactly one, is a relinquishment, and leaves nothing.

**What falsifies it**, each corresponding to the qualified headline acquiring a consequence:

- `destroy` called twice, or not at all (a leaked runner — I-20);
- `retarget` called after the terminal barrier (a call that is not a relinquishment);
- an animation, transform or placeholder surviving.

**Nothing existing is weakened.** All sixteen of C4-01's cases and all nine of C2-01's pin the floor or a register ceiling and are unaffected. The per-axis geometry rows stay ceiling rows.

## 6 — Cost, and the budget interaction

### The decision's own cost

**0 B. 0 per-frame work. 0 heap.** Six markdown files and one added test case. No source change, no rebuild, no `just size` run required to land it.

### Against the 106 B headroom

| Item | Effect on `complete` headroom |
| --- | --- |
| This decision | **0 B** — 106 B stays 106 B |
| `FeatureContext.live()`, **withdrawn** | +53 B of forecast pressure **returned** to C5-01/C5-02 |
| C5-01, C5-02 | out of scope, unmeasured, and they now have the whole 106 B |

**It fits, with room this decision created rather than consumed.** That is the direct answer to the question the review's constraint poses.

### Should Phase 21's re-base be pulled forward?

**Yes — not to raise a budget, but to remove a byte count from the closure pass's reasoning before it constrains a correctness fix.**

Stating it plainly, because the question asks for the honest answer: **the budgets are not yet the binding constraint on correctness work, but they came within one decision of being it, and that decision was review 4's.** Its §7 weighed `FeatureContext.live()`'s 53 B against 106 B of headroom as one of three reasons to defer, and the deferral was then cited by the fifth review as part of what made I-36 undischarged. I am withdrawing that remedy for a better reason — the bracket discharges it — but the fact that a brotli delta appeared inside a terminal-safety argument at all is the smell, and it should be named rather than quietly designed around.

C5-01 and C5-02 are unmeasured floor breaches. By analogy with C4-01's landed per-site readings (+14 B to +87 B across compositions for nine of them), a revalidation-plus-cancel in `layout-animation.ts` and a threaded reading through `applyMechanics` plausibly land somewhere between 40 B and 100 B on `complete` — inside 106 B, but not by a margin anyone should be planning against, and `placement.ts` is in the **minimal** composition, so C5-02 charges every consumer.

The recommendation is therefore two parts:

1. **Move the re-base ahead of the C5 closure pass**, not after Checkpoint D. It is a measurement and a set of numbers, it blocks nothing, and it is cheapest done once against an artifact that is about to absorb two fixes rather than twice around them.
2. **Write the rule into `plan.md` §Phase 21 so it does not have to be re-argued**: _a size budget is never a reason to defer a fix for a floor breach. If a floor breach is found and its fix does not fit, the budget re-bases and the fix lands; what a budget may defer is defence in depth._ That sentence would have made review 4's third deferral reason inadmissible and its first two — bracket coverage and class closure — sufficient on their own, which is where the argument should have rested.

## 7 — The meta-question: formulation or implementation?

**Both, and they failed in different places, so both responses are needed. The classifier succeeded; the completeness argument failed; the artifact was never swept.**

### What succeeded, and the evidence is the review itself

Review 4's floor-plus-register is a **classifier**, and it worked on first contact. The fifth review did not argue about whether `animation.finished`'s accessor is a consumer call, or whether `setAttribute` on a consumer element counts — the questions that made passes 2 through 4 interminable. It wrote _"both violate the Review 4 architect decision's own five-act floor"_ and named the acts. C5-01 is acts 1, 2 and 3; C5-02 is act 3. Under the pre-review-4 quantifier those two findings would have been arguments about set membership with no terminating answer. Under the floor they are verdicts. **That is the rule working exactly as designed**, and it should not be discarded because two defects were found the day after it landed — finding defects is what a classifier is for.

### What failed, and it is one word

Review 4 §3 called provisioning _"a **closed, checkable, complete** obligation, and it is the one an implementer and a reviewer can both discharge"_, and its decision procedure ends _"conforming residue; state it and stop"_. That reads as a termination argument, and it is not one, for a reason §1.1 makes concrete: **C5-01 and C5-02 are both at modules that hold readings.** `layout-animation.ts` has `view.live()`. `placement.ts` has `live`. Provisioning was 100% satisfied at both and both were broken. Provisioning is a **necessary** condition — it establishes that the module _can_ stop — and says nothing about whether the reading is placed before the thing that must not happen. The completeness claim conflated "every module can stop" with "every module stops in time".

So the formulation has one genuine defect of substance (a necessary condition presented as sufficient), one of scope (unimodal where the artifact is bimodal, §2.1), and one of drafting (the bound written in the mechanism cell, §3.6). None of the three is a reason to replace the floor or the register.

### What was never done

Review 4's implementation record applies seventeen documentary sweep items and one test. **It contains no sweep of the artifact against the rule it landed.** Nobody enumerated the modules, walked each one's consumer-reaching calls, and asked the floor question at each. Had anyone done so, C5-01 and C5-02 would have been outputs of that sweep rather than findings of the next review. That is the "unswept implementation" half, and it is the larger half by volume.

### The terminating sweep — what it is, and why it terminates

Not per call site (does not terminate — the consumer chooses the set). Not per module (terminates, but is only necessary). **Per _stretch_.**

> A **consumer-reaching stretch** is a maximal run of a module's own statements beginning at a consumer-reachable call and ending at whichever comes first: the next liveness reading, the return into a kernel bracket that revalidates, or the module's return.
>
> For each stretch, one question: **does anything the stretch does survive the stretch?** — a publication that outlives the operation, a reference retained past `retire()`, a DOM mutation on a node the library did not adopt or will not restore, a declared consumer callback invoked, or a dereference of state `retire()` may have nulled.
>
> **Yes** → the stretch is too long. Put a reading at its head, or shorten it, or name the bracket that undoes it. **No** → the stretch is conforming; record it with its answer and move on.

**Why this terminates where the call-site enumeration did not.** The set being enumerated is **library-authored**, not consumer-chosen. A module has finitely many statements and the stretch decomposition is a _partition_ of them, determined entirely by where the library's own readings and returns sit. The consumer still chooses which members are overridable — but that choice cannot change how many statements sit between two of the library's readings, and the floor question is asked once per interval rather than once per overridable member. **That is the property review 4's (1) was reaching for and missed by quantifying over modules instead of over intervals.**

It is also the form that makes disagreement bounded. A sixth reviewer who disputes the sweep disputes a _row_ — "this stretch publishes and you said it does not" — which is a question about source with an answer, not a search for one more call.

### Who runs it

Two owners, and the split is not negotiable in either direction.

**The sortable sweep is a Checkpoint D closure obligation**, not a Phase 18 one. D is closing over this artifact; two of the sweep's outputs (C5-01, C5-02) are already open findings against it; and a checkpoint cannot honestly close over an artifact nobody has swept. It is bounded work: twenty files in `src/sortable/`, of which the ones that reach consumer code are already enumerated by F-47's table plus the modules named in this decision. The seed rows, verified in source during this pass:

| Module | Discharge | Status |
| --- | --- | --- |
| `spec.ts` | reading — `rt.closed` directly, at seven sites | swept by C4-01; re-check the `release.effect` and spatial-bracket stretches against the stretch question |
| `rect-index.ts` | reading — `live()` off the per-operation view | swept by C4-01 |
| `y.ts`, `xy.ts` | reading — threaded per axis | swept by C3-01 and C4-01; ceiling rows |
| `layout-animation.ts` | reading — `view.live()` | **stretch too long — C5-01** |
| `placement.ts` | reading — `live` parameter | **stretch too long — C5-02** |
| `landing.ts` | **bracket** — F-30, `retireSettlement` | discharged by this decision |
| `handle.ts`, `placeholder.ts`, `callbacks.ts`, `collection.ts`, `keyboard.ts` | pass-through or thin; verified to make no consumer-reaching call of their own | to be confirmed and recorded by the sweep, not assumed from here |
| `assemble.ts`, `behavior.ts`, `runtime.ts`, `controller.ts`, `frames.ts`, `slots.ts`, `domain.ts`, `feature.ts` | plumbing | to be confirmed and recorded |

The output is a table in `contract/05` beside F-47's enumeration — module, discharge form, stretches, and per stretch the survives-the-stretch answer. **That table is the deliverable, and §8 makes it the discharge condition.** It replaces F-47's per-foreign-call table as the normative enumeration; F-47's table stays as the historical record of how the sites were found.

**The free-drag sweep is Phase 18's deliverable**, and `plan.md` §Phase 18 already carries the module form of it. It needs one edit to become stretch-based, in §9 item 13.

## 8 — When is I-36 discharged, and can Checkpoint D close?

### The discharge condition, stated so a sixth reviewer can check it rather than re-litigate it

> **I-36 is discharged when the stretch table exists in `contract/05`, is complete against `ls src/sortable/*.ts`, and every row is one of exactly three verdicts:**
>
> **(a)** the stretch is headed by a liveness reading; or **(b)** the stretch is named as bracket-discharged, with the bracket cited by source location and its undo stated; or **(c)** the stretch is recorded as a conforming residue — its survives-the-stretch answer is "none" — **and it carries an executable pin.**
>
> **And no row is (d): a stretch with a surviving consequence and no reading at its head.**

Four properties, and each is why this is the first checkable version in five passes:

1. **Complete by construction.** Completeness is a directory listing cross-checked against a table, not a judgement.
2. **Every verdict is a question about source**, answerable by reading the module. There is no quantifier over consumer-chosen sets anywhere in it.
3. **A disagreement is bounded.** A sixth reviewer who thinks a (c) row is really a (d) row makes a claim about specific statements; that argument terminates in one exchange. A reviewer who finds a stretch missing from the table adds a row — which is a bug in the table, and a table can be completed. A reviewer under the old quantifier could only find one more call, forever.
4. **It is falsifiable in the negative**, which the previous form was not: "the table is incomplete" and "row N is wrong" are both refutable.

**What it deliberately does not require.** It does not require that no consumer code ever runs after `destroy()` returns — that is unachievable and the kernel itself violates it (§1.2). It does not require `FeatureContext.live()`. It does not require every stretch to be reading-headed.

### Can Checkpoint D close?

**On C5-03: yes.** This decision closes it with markdown plus one test, at 0 B, and the public conformance test survives unchanged. The review's verdict — _"the current text cannot support a claim that I-36 is discharged"_ — is correct about the current text and is repaired by §3.

**On Checkpoint D as a whole: not yet, and the remaining conditions are now finite and nameable.** Three, in order:

1. **§3's wording lands** (this decision — markdown, 0 B, off the critical path).
2. **C5-01 and C5-02 land** — real floor breaches, someone else's, with the whole 106 B available to them.
3. **The sortable stretch table lands** (§7). This is the new condition, and it is the one that matters: it is what converts "no sixth reviewer has found a site yet" into "the artifact has been swept and here is the record". Without it, a sixth review's _"C4-01 is not closed"_ remains as available as it was to the fifth, and D would be closing on the same basis it has failed to close on four times.

**The honest statement of what changed.** Four passes closed sites. Review 4 built a classifier and mistook it for a termination argument. This pass makes the termination argument the _sweep_ rather than the _rule_, and gives the sweep a shape that finishes. If a sixth review finds a C5-05, the right question is no longer "was the rule wrong" — it is "which row of the table is wrong, or which row is missing", and that is a question with a last answer.

## 9 — Consistency sweep

Executable as written. **Match on the quoted text rather than on line numbers** — five passes have moved them.

### Required

| # | File · anchor (quoted) | Change |
| --- | --- | --- |
| 1 | `contract/05` — I-36 cell 2, `**(1) Provisioning — universal and closed.**` | Replace part (1) — §3.1. Tier stays **C** |
| 2 | `contract/05` — I-36 cell 2, `**(2) The floor — universal and closed.** After a closed reading the participant performs none of five acts` | Replace the antecedent — §3.2. **The five acts themselves are not touched** |
| 3 | `contract/05` — I-36 cell 2, `**(3) Ceilings — a register, not a quantifier.**` | Replace part (3) with the two-section register — §3.3 |
| 4 | `contract/05` — I-6 cell 2, `**no callback fires afterwards**` | Replace the invariant text — §3.4. **This is the mandatory half**: the sentence is falsified by the kernel's own F-30 branch and by the public conformance test. **The Tier cell is not touched** |
| 5 | `contract/05` — I-6 cell 4, `**Since Checkpoint D review 4 that residue is bounded rather than open-ended.**` … `Clause 3's headline is retained verbatim` | Replace that sentence block — §3.5. The retention claim is now false and must not survive |
| 6 | `contract/05` — tier legend, `so that a missing barrier can be classified instead of only counted — I-36 (2) and (3).` | Append the drafting rule — §3.6 |
| 7 | `contract/05` — F-47 table, row `` `landing({ duration })` thunk → `visual.animate()` `` | Replace the row — §3.7 |
| 8 | `contract/05` — F-47 table, row `` `LandingStart`, `anchorTarget`, `LandingHandle.destroy`/`retarget` `` | Replace the row — §3.8, recording the kernel's admitted post-terminal call |
| 9 | `contract/05` — F-47, `**One conforming residue, and the reason C4-01 left it open was wrong on the facts.**` | Replace the whole paragraph — §3.9 |
| 10 | `contract/05` — F-47, `and that is why I-36's clause became a floor plus a register at review 4 rather than gaining a fourth site.` | Append: _"At review 5 it gained the second discharge form the table above had carried since C2-01 — a kernel bracket that revalidates and undoes — and lost the word 'complete', because two of the sites the fifth review found were at modules that already held readings (C5-03)."_ |
| 11 | `contract/05` — the test-matrix group _Terminal barrier in a resolver sequence_ | Append the §3.11 case. **Collision with C5-01/C5-02 — see below** |
| 12 | `contract/05` — F-38's `violating I-6's "no callback fires afterwards". Destroying the returned handle later does not un-call it.` | **Do not edit.** Verified compatible with the qualified headline; §2.4 states why, and that argument should be cited in the commit message rather than added to the document |
| 13 | `contract/01` §Teardown — `**The obligation is a floor over consequences plus a register of stronger site-specific promises, not a quantifier over call sites**` | Replace the clause — §3.10 |
| 14 | `contract/03` §`y()`/`xy()` — `**This paragraph is a ceiling in I-36 (3)'s register**` | Append: _"— the register's **ceiling** section since review 5, which added a **bracket** section beside it."_ One clause; the paragraph is otherwise correct |
| 15 | `ledger.md` L-12 — `**One residue is stated and, at review 4, classified.**` … `the correction the three previous narrowings were each a symptom of."` | Replace the trailing half: state that review 5 found the classification incoherent — provisioning was called universal while naming an unprovisioned module, and I-6's headline was retained while a public conformance test required its violation — and that both are repaired by making provisioning **bimodal** (reading **or** named kernel bracket that undoes), fixing the floor's antecedent, and qualifying I-6 clause 3 in its own invariant cell. Record that **`FeatureContext.live()` is withdrawn as a queued remedy** and why (a panic-blind reading beside a panic-aware tier-B bracket, at +53 B), that the correction costs **0 B**, and that provisioning is **necessary and not sufficient** — C5-01 and C5-02 were at provisioned modules |
| 16 | `plan.md` — the Checkpoint D bullet `**One residue is stated and, at review 4, classified as conforming.**` | Replace. **Do not leave the sentence deferring `FeatureContext.live` "to Phase 18/21, behind Phase 21's budget re-base"** — it is the claim this decision withdraws. State: bracket-discharged under I-36 (1), the bracket named (F-30 before publication, `retireSettlement` after), the falsifier, and that the remedy is available and measured but not queued |
| 17 | `plan.md` — the Checkpoint D bullet `**Checkpoint D review 4 (the landing residue) — I-36's indirect-invocation clause was a quantifier over call sites and is now a floor plus a register.**` | Append one sentence: the fifth review found the new formulation internally inconsistent, and review 5 (C5-03) completed it — bimodal provisioning, a fixed floor antecedent, I-6 clause 3 qualified in its own cell, and the word "complete" removed from provisioning, which is necessary and not sufficient |
| 18 | `plan.md` — add a Checkpoint D bullet for this decision | _"Checkpoint D review 5 (C5-03) — provisioning was unimodal where the artifact is bimodal, and a mechanism note cannot amend the invariant beside it."_ Disambiguate as **"Checkpoint D review 5"** at first use; Checkpoint **C** reused these IDs |
| 19 | `plan.md` §Phase 18 — `**The enumeration is per module, not per call site — I-36 (1).**` … `Do not enumerate DOM method names: that set is chosen by the consumer and does not terminate.` | Replace with the **stretch** form — §7. Per module, then per _consumer-reaching stretch_ within it; one question per stretch ("does anything the stretch does survive it?"); three verdicts (reading-headed, bracket-discharged with the bracket named and its undo stated, or conforming residue with an executable pin); and the explicit warning that **holding a reading is not discharging** — C5-01 and C5-02 were at provisioned modules. Keep "do not enumerate DOM method names" verbatim. **This is the acceptance test for the whole decision** |
| 20 | `plan.md` §Phase 21 — `**The first change queued behind the re-base is the deferred `FeatureContext.live`remedy for the`landing()`residue**, measured at **+6 B to +53 B** brotli — landing it before a re-base would take`complete` from 106 B of headroom to **53 B**.` | Replace: the remedy is **withdrawn from the queue** at review 5, returning 53 B of forecast pressure to C5-01/C5-02; the re-base **moves ahead of the C5 closure pass**; and add the rule — _a size budget is never a reason to defer a fix for a floor breach; if the fix does not fit, the budget re-bases and the fix lands. What a budget may defer is defence in depth_ |
| 21 | `plan.md` — add a Checkpoint D closure condition | The **sortable stretch table** (§7, §8) as a named closure obligation, with its three-verdict acceptance form. This is the only new _work_ item this decision creates |
| 22 | `tests/COVERAGE.md` — the _Terminal barrier in a resolver sequence_ blockquote, `The obligation is a five-act floor everywhere plus stronger promises at named sites (I-36 (2), (3)).` | Replace with: _"The obligation is provisioning in two forms — a reading, or a named kernel bracket that revalidates and undoes (I-36 (1)) — over a five-act floor everywhere, plus stronger promises at named sites (I-36 (2), (3)). Holding a reading is not discharging: C5-01 and C5-02 were both at provisioned modules."_ The rows below are unchanged |
| 23 | `tests/COVERAGE.md` — the row `**conformance pin, passes against current source** — the `landing()` residue's blast radius, not a barrier` | Amend the citation column from `I-36 (2), F-30` to `I-36 (1), I-6, F-30`, and relabel as **the bracket-discharge witness**. **No assertion in the test changes** — §4 |
| 24 | `tests/COVERAGE.md` — same group | Add the §5 case, labelled **conformance pin, passes against current source** — the kernel's admitted post-terminal relinquishment |
| 25 | `tests/sortable/features.browser.test.ts` — the comment block beginning `**A conformance pin, not a regression pin** (Checkpoint D review 4, the landing residue).` | Comment edit only: the barrier is the kernel's, the module is **bracket-discharged** under I-36 (1), and the assertions witness the bracket's undo. **Not one assertion changes** |

### Checked, no change needed — recorded so they are not re-swept

| File · anchor | Why unchanged |
| --- | --- |
| `contract/00-index.md` §Normative precedence and freeze | The bar is applied, not amended. This decision adds nothing to the frozen SPI and nothing to any entrypoint; it _withdraws_ a queued internal widening |
| `contract/00-index.md` D-29, tier table, §Preserved from probe 1 | D-29's I-6 citation is an unwrapped throw making teardown non-terminal — clauses 1 and 2, untouched. The tier table is generic |
| `contract/01` — `a discrete listener can never outlive I-6's terminal barrier`, and the frame-reset citation | Both kernel-sequenced and both concern calls that leave something behind. Survive the qualification verbatim |
| `contract/02` — `Calling the consumer's runner after that violates I-6`, and `it stays the synchronous terminal barrier I-6 requires` | The first is the kernel calling `start` after `anchorTarget` destroyed — a call whose body is consumer code and which initiates a whole landing, so it leaves a great deal behind and stays a violation. The second is clause 1 |
| `contract/05` — I-6 **Tier** cell | C3-03's split is correct and stands verbatim. What changed is the content of the promise, not who enforces which half |
| `contract/05` — F-36 | Kernel-sequenced; no participant-half claim |
| `contract/05` — F-47's `**What is not closed.**` paragraph | The `panic()` reachability argument and the third-copy falsifier are untouched. Note one interaction, deliberately not written into the document: bracket discharge is _not_ subject to the `panic()` blind spot, which is a point in its favour and is stated in §3.1 rather than here |
| `contract/06` | Illustrative; C5-04 owns its stale claims and this decision adds none |
| `README.md` — `**A resolver that destroys the controller stops the sequence at that call**` (§57) | **Do not edit.** It is a register ceiling about `handle()` and `visual()`, both reading-provisioned, and it makes no claim about `landing()`. C5-02's fix may want a sentence about the placeholder factory; that is C5-02's call, not this one |
| `.plan/brief.md` — `no callback fires after completed destruction` | Historical requirements document, not in the normative set (contract 00 ranks 00–06). Left as the original requirement; the contract is where the artifact's promise is stated |
| `src/**` | **No source change.** `landing.ts` gains no guard, `feature.ts` gains no member, the kernel is untouched. The 24 sites citing I-6/I-36 assert no tier and no quantifier |
| `tests/**` besides `COVERAGE.md` and the two comment/label edits | No assertion changes. One case is added (§5) |
| `checkpoint-d-3-resolution-c3-03.md`, `checkpoint-d-4-resolution-landing-residue.md` | **Historical. Do not edit.** C3-03 §4's retention of the headline and review 4 §8's "Checked, no change needed" row for it are superseded _here_, and the supersession is stated in §3.5 rather than in those files |
| `L-11`, D2, D5, C3-01's return channel, C2-01's mechanism, I-7's precondition dependency on I-30 | Untouched. Nothing here adds to the frozen public surface |

## 10 — What this decision does not close, and collisions

- **C5-01 and C5-02 are not closed and are not weakened.** §2.1's calibration table reproduces both as defects under the new rule, and §7 explains why the rule that classified them correctly still let them exist. Whoever takes them should read §7's stretch definition first: both are "the stretch is too long", not "the module is unprovisioned", and the fix at each is a reading placed later in the module rather than a new channel into it.
- **Editing collisions, three of them.**
  - **`contract/05`'s test-matrix group** _Terminal barrier in a resolver sequence_: sweep item 11 appends one case, and C5-01 and C5-02 will each want rows in the same group. **Whoever goes second rebases, and does not re-resolve.** The normative wording in §3 is not renegotiable by a test-writing pass.
  - **`tests/COVERAGE.md`**'s two blockquotes and the _indirect half_ group: sweep items 22–24 touch the blockquote and add one row; C5-01 and C5-02 add rows below it. Disjoint at the row level, adjacent at the blockquote.
  - **`contract/05` F-47's enumeration table**: sweep items 7 and 8 replace two rows; C5-01 will want the `beforeMove`/`afterMove` row amended and C5-02 the `createPlaceholder` row. Different rows; no merge.
  - **C5-04 is disjoint.** It edits `contract/06`'s trace, `tests/COVERAGE.md`'s Q-12 section and `ledger.md:276`'s parity explanation. This decision edits `ledger.md` L-12 and a different part of `COVERAGE.md`. No collision, one file in common.
- **The stretch table does not exist yet, and this decision does not write it.** §7 gives its form and seed rows; §8 makes it Checkpoint D's remaining closure obligation. That is deliberately not folded into this document: an architect decision that also performed the sweep would make the sweep unreviewable.
- **`FeatureContext.live()` is withdrawn, not disproved.** It remains correct in shape, measured, and free of frozen surface. If the bracket-discharge falsifier ever fires at `landing()`, it lands, and §3.9 is where its shape is recorded.
- **A consumer-supplied `landing({ run })` runner is unguardable and stays so** — and after §1.2 that is a sharper statement than review 4 could make: not only can I-36 not bind it, but the kernel is _required_ to call back into it after the terminal barrier. Under I-6's qualified clause 3 that is an admitted form rather than a hole.
- **The five-act floor is still a first version.** A sixth act — a consumer-observable side effect that is neither a publication nor a declared callback, a `scrollIntoView` or a `focus` on a node that outlives the operation — remains a one-row edit to a closed list. The stretch sweep is where such a case would surface, which is an improvement on waiting for a reviewer to construct one.
- **The register has three entries and stays inline.** Two ceilings (`contract/03`'s candidate-loop paragraph, `README.md`'s publication of it) and one bracket entry covering `landing()`'s two stretches. Review 4 said it becomes a table at four; that threshold is unchanged, and the stretch table of §7 will likely absorb the bracket section when it lands.
- **C3-03's tier split is not reopened**, and this decision does not touch I-6's Tier cell. What it does touch is text C3-03 chose to retain, which is a second edit to landed text rather than a merge. **Do not re-resolve C3-03.**
- **C2-01's mechanism is not undermined**, and §2.3 strengthens one of its conclusions from the other direction: the argument for keeping the latch behavior-owned is unaffected, and the observation that the kernel's own revalidations are _stronger_ readings than the latch — which C2-01 §3 made about `presentation.signal` and review 4 §5 repeated — is now the basis on which a first-party module discharges without a latch at all.
- **C4-01's landed readings are not undermined and none is removed.** The bimodal rule governs whether a _missing_ reading is a defect; it licenses deleting nothing. In particular it does **not** license removing a reading at a site that also happens to be bracketed: where both exist, both stay, for C2-01 §7's noise-band reason.
- **Nothing is added to the frozen public surface.** Stated as a distinct consequence per the constraint: this decision adds nothing to any entrypoint, adds nothing to `src/kernel/spec.ts`, and withdraws the one internal widening that was queued.

### Verification

`src/` and `tests/` were not touched by this pass. `git status` shows exactly the files C4-01's implementation pass had already modified — `src/sortable/{layout-animation,placement,rect-index,slots,spec,xy}.ts` and six test files including `tests/COVERAGE.md` — and none of `src/sortable/{landing,feature,behavior}.ts` or `src/kernel/kernel.ts`. No prototype was built: this decision requires no measurement, because it costs 0 B and withdraws the only change that had one.

Every source citation in §1 and §2 was read in the artifact rather than taken from a prior document: `landing.ts:82-104`, `:122-135`, `:150-156`, `:166-187`; `feature.ts:29-41`; `kernel.ts:1288`, `:1316-1359`, `:400-417`, `:1813-1834`; `placement.ts:32-55`, `:76-91`; `layout-animation.ts:253-293`; `spec.ts:111`, `:158`, `:287`, `:647`, `:772`, `:792`, `:961`, `:1174`; `controller.ts:132`; `runtime.ts:132`. One factual correction to review 4 worth recording: its §3 says there are "ten modules in `src/sortable/`". There are **twenty**. The argument that modules are enumerable is unaffected — twenty is still a directory listing — but the number should not be repeated.