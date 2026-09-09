# D-187 challenged after its only exercise

**Subject** D-187 — _a boundary may restore an instrument and may never spend one, and a suspension states what it withdraws_ — landed 2026-09-08 at `6def139f0`, read as a candidate rather than as settled architecture. **Tree** `46fc543e0`, the post-swarm state of `drag2/fin-review`. **Scope** D-187 only: Arc D's sortable design and its membership decisions are not re-reviewed.

**Why now.** D-187 amended a repository-wide document ([`CONTRIBUTING.md`](../../../../../CONTRIBUTING.md) §18) and the register's rule (b) without an independent architecture pass. It has since been exercised exactly once — O-13's discharge at Arc D's close — so for the first time the claims can be tested against a completed act rather than against an intention.

**Method.** The suspension interval was reconciled by hand across four measurement records, figure by figure, rather than read out of any of them. The size harness was executed at this tree. Every citation below was confirmed in the file it names; one discovery agent was dispatched and nothing here rests on it.

**Result in one line.** **All five claims survive, and the landed O-13 behaviour needs no special pleading — but two of the rules are underspecified in the same way, and the third has a counterexample inside the series it was written to govern.**

---

## 1. The five claims, and what happened to each

| # | Claim | Verdict |
| --- | --- | --- |
| 1 | An attended boundary may restore a suspended instrument even where it spends nothing | **Stands.** The ground is structural, not rhetorical — §2 |
| 2 | The boundary is not evidence for a budget change | **Stands**, and survives its own steelman — §3 |
| 3 | An unattended schedule is not equivalent to such a boundary | **Necessary, not sufficient.** Counterexample inside the governed series — §5 |
| 4 | A suspension states exactly what it withdraws, implying no residual coverage | **Stands as a direction; the rule guards one direction only** — §6 |
| 5 | O-13's close is a legitimate restoration boundary; §18 decides independently what follows | **Stands, and is executed** — §4 |

---

## 2. Restore versus spend is a real asymmetry, and the reason is stronger than "no evidential content"

D-187 argues the distinction from evidence: _restoring a suspended control has no evidential content: the figure is whatever the tree is on the day, so the only question a boundary has to answer is **when**_ ([`00-index.md`](../../contract/00-index.md) D-187). The obvious attack is that this proves too much — a re-based `budget:` is also "whatever the tree is on the day", so if reading a number off the result is admissible for one field it should be admissible for the other.

**The attack fails, and on a ground the decision states without naming.** A `control:` is an equality and a `budget:` is a bound, and that makes their admissible-value sets different sizes:

- A restored `control:` has **exactly one** admissible value. The old figure is not an option — the row moved legitimately, so re-declaring it would make the instrument permanently and uninformatively red. The boundary therefore chooses nothing except the moment.
- A re-based `budget:` has **two** admissible values, and keeping the old one is the default. A ceiling that is looser than it needs to be still functions as a ceiling. Choosing the new one is a choice, and a choice requires evidence.

So the asymmetry is structural rather than a matter of degree, and "the only question a boundary has to answer is _when_" is exact. **Claim 1 stands.** What the argument needs and does not have is the consequence in §7: if a boundary chooses only the moment, then the moment determines which interval of drift the new figure absorbs, and something has to account for that interval.

---

## 3. The boundary is not evidence, and it is not counter-evidence either — but the rule only says one of those

**Steelmanning the opposite of claim 2.** The close of a four-arc series is the first moment at which the series' net effect on a row is known, and a ceiling arguably ought to be sized against a settled tree rather than one mid-refactor. That is a real argument, and D-187 already answers it: the close is _the next occasion on which those five ceilings are read_, which concedes the occasion and denies the evidence. The concession is then made harmless from the other side — [`budget-rebases.md`](../../measurements/budget-rebases.md) records that Arc C _reads their ceilings during the suspension_, so the close has no monopoly on the occasion either. **Claim 2 stands.**

**One asymmetry tested and found correct.** D-187's clause bans a boundary from _spending_ an instrument and says nothing about a boundary being an argument for _not_ spending one — and [`arc-d.md`](../../measurements/arc-d.md) §No budget re-base uses exactly that: _this is the fourth consecutive arc to move the same rows in the same direction_ is a series fact, offered on the declining side, one day after D-187 said §18 decides from the reading. This is not a defect. Leaving a ceiling where it is is the default and a default needs no trigger; §18's whole concern is that _an absorbed number is a number nobody reads again_, which is a risk of re-basing too readily and not of re-basing too reluctantly. A one-directional ban is the right shape. **Recorded because it was tested, not because it failed.**

**And the decline does not rest on it.** Two of `arc-d.md`'s four grounds are reading-grounded and jointly sufficient: reclaimable slack of 23–66 B on rows of 10.2–12.3 kB, and SC-1 unmet on all three limbs. The two series-grounded ones are decoration.

---

## 4. The close is executed, not asserted

Run at this tree, `tests/bench/size.node.test.ts` passes 43 of 43, and all seven `control:` rows are live:

```
✓ the declared controls > should not move free drag minimal at all
✓ … free drag + bounds … free drag + landing … free drag complete
✓ … vocabulary root - drag.js … kernel root - kernel.js … baseline B
```

`controlViolations()` compares `brotli !== composition.control` and reports in both directions ([`measure.ts:749`](../../../bench/size/measure.ts)), so the five restored equalities are assertions. `measure.ts` carries `control: 8116 / 8274 / 8276 / 8426 / 6185` at `:353`, `:365`, `:377`, `:390` and `:524`, and the suspension paragraph is gone from the `control?` docblock. **The close performed the one act it authorises, and it performed it in source.** Claim 5's first half stands on execution.

---

## 5. The boundary test screens a boundary that dissolves, not one that blurs — F-410

D-187 states a test and calls it the discriminator: _the boundary's abandonment is an act too … a boundary that can fail to arrive with nobody deciding it … is a schedule however it is worded._ It is a good test. It is not sufficient, and the counterexample is inside the series D-187 was written to govern, eight days into its life.

**The window.** `e600d3561` (2026-09-08) landed D-188 saying _the series is three arcs rather than four; Arc D is still its last member_. `2cc773bd3` (2026-09-08) landed Arc C. `e60e0c7d9` (2026-09-09) raised F-405 and corrected the count to four. Throughout that window [`obligations.md`](../../obligations.md) O-13 read _the close of the D-170 arc series — **Arc D, the last of the four**_ — verified at `32b34ae9e`.

**So at the moment Arc C landed, the live record held two answers to the only question O-13 has to ask.** Under the three-arc clause Arc C was the third and last arc and the close had arrived; under O-13 it had not; `arc-c.md` supplied a third position. **Under one of the two live readings the boundary arrived with nobody deciding anything** — precisely §18's stated failure condition, realised, on a boundary that had passed §18's stated test at minting time.

**Nothing in D-187 screens for this, and the abandonment clause could not have.** That clause fires when a destination is _given up_; nobody was giving Arc D up. What broke was not the boundary's attendance but its **identity**: a decision that never mentioned O-13 made the boundary ambiguous as a side effect. The test D-187 states is a one-time predicate on the boundary's _wording_; the property it wants is a **standing property of the record**, which a later entry can break without touching the row.

**F-405's own second-limb paragraph over-attributes**, and it is worth naming because it is the failure mode D-187 exists to forbid: it says a boundary nobody can tell has been reached _is the failure D-187 minted the abandonment clause to prevent_. The abandonment clause prevents no such thing. A record attributing to an instrument a detection that instrument cannot perform is exactly what D-187's own §The suspension's supporting claim is false twice over adjudicates — here applied to D-187's own clause.

**What claim 3 needs.** A second limb: a boundary is a legitimate trigger only where **one identification of it is stated where the obligation is administered**, so that an observer standing at any candidate close can decide whether this is it. F-405 wrote that repair for the instance — _One count, stated where the boundary is administered_ — and nobody generalised it. Two things were needed and D-187 states one.

---

## 6. The withdrawal rule guards one direction, and its exemplar names one of the instrument's two self-descriptions — F-411

Clause (ii) forbids a suspension from asserting **residual coverage**, and requires the withdrawal be named _in the instrument's own vocabulary_. Both halves are right. Two gaps:

**(a) The instrument has two self-descriptions, in one file.** The `control?` field docblock says _A ceiling cannot see a transfer, and that is what this is for_ ([`measure.ts:125`](../../../bench/size/measure.ts)). `controlViolations()`'s docblock says _A control getting **cheaper** is as much a finding as one getting dearer — it means a change reached a graph it was declared unable to reach_ (`:744`). The second is broader and sits on the function that does the detecting; what the code actually compares is any Brotli inequality. D-187's statement of the withdrawal — carried into O-13 — takes the first and adds _nothing else is withdrawn_. "The instrument's own vocabulary" presumes the instrument has one, and at its only application it had two.

**(b) The rule guards overstated residue and not understated withdrawal.** These have the same effect: a later reader consults the sentence instead of the instrument and believes less was lost than was. The rule closes one and leaves the other open, and its own exemplar takes the open one.

**Concretely, inside the suspension.** At `5a438352c`, one commit after the controls were removed, `free drag + landing` moved **+11 B** and `free drag complete` **+12 B** Brotli on a pass whose production delta was a −6 B minified deletion ([`arc-b-remediation.md`](../../measurements/arc-b-remediation.md), second table). Under a live control those are two findings. The record explains them in prose — _rearranges the window on two free-drag rows_ — which is the honest form of "an instrument used to say this and now a narrative does". They fit the transfer story awkwardly and the reach story exactly.

**What claim 4 needs.** The withdrawal is stated against **what the instrument asserts**, not against a docblock's motivating case, and the statement must be complete in both directions.

---

## 7. The restoration has a write and no read — F-409

This is the finding with the most weight, because it is the one place where the landed behaviour could have been wrong and nobody would have known.

**§18 as D-187 amended it requires the suspension to record _the last figure it produced_. It requires nothing of the restoration.** O-13 preserved those figures for a stated purpose — _so the restoration has a figure to be read against rather than only a fresh one_ — and **that read was never taken.**

What was taken instead, three times over:

- [`arc-d.md`](../../measurements/arc-d.md) §The controls: _The restoration re-declares figures **this arc** did not move, which is the condition a returning equality wants._
- O-13's disposition: _all five read byte-identical **across the arc**._
- The swarm summary: the restored equalities _fire when perturbed by one byte_.

The first two are Arc-D-local and the third tests the instrument rather than the figure. **None of them is the condition a returning equality wants**, and `arc-d.md` says of the weakest that it is. Arc-D-local inertness would hold identically if Arc C had moved the rows 500 B for reasons nobody could name.

**So I took the read.** Last declared figures at Arc B ([`budget-rebases.md`](../../measurements/budget-rebases.md) `:756`–`:760`), then every measured delta on those rows through to the restored literals in [`measure.ts`](../../../bench/size/measure.ts):

| Row | declared 09‑05 | Arc B rem. | F‑390 rem. | Arc C | Arc D | restored 09‑09 |
| --- | --: | --: | --: | --: | --: | --: |
| free drag minimal | 8,159 | −23 | −4 | −16 | 0 | **8,116** |
| free drag + bounds | 8,293 | +5 | −3 | −21 | 0 | **8,274** |
| free drag + landing | 8,293 | +2 | +11 | −30 | 0 | **8,276** |
| free drag complete | 8,448 | −1 | +12 | −33 | 0 | **8,426** |
| kernel root — `kernel.js` | 6,210 | 0 | −2 | −23 | 0 | **6,185** |

**Every row reconciles to the byte**, and the chain is continuous at each seam: `arc-b-remediation.md`'s landed column is `arc-c.md`'s baseline column exactly, and `arc-c.md`'s landed column is `arc-d.md`'s baseline column exactly. Net movement across the suspension is **−43, −19, −17, −22, −25 B**, and every byte of it is attributable to a named landed change.

**So D-187's claim is true, and demonstrably so — but its truth was established here and not by the close.** The close spent nothing; nothing in the rule required checking that, and nothing checked it. §18 already owns the exact predicate this needs — _the drift stops being attributable to a named landed change_ — and does not lend it to the restoration.

**What claim 1 needs.** A restoration reads the new figure against the recorded one and states the interval's drift as attributable or not, in the pass that performs it. Where it is not attributable, the restoration is a finding before it is a declaration.

**A structural reason the gap exists, and it is worth repairing with it.** The whole restoration rule is half a sentence living inside §18's bullet on **re-base triggers** — a bullet which two sentences later forbids a boundary from triggering a re-base at all. Within its own bullet, _a lifecycle boundary somebody performs is not the schedule this rejects_ licenses nothing; its only live application is a subject that bullet does not otherwise discuss. That is why the restoration's own obligations had nowhere to be written.

---

## 7a. The severance had a prior exercise, and D-187 dismissed it in one line

Found by the trigger census taken behind this pass and confirmed in both files. **Both halves of D-187's second clause were already in the record, and one of them had already been exercised.**

- **The distinction, 2026-08-22 — sixteen days early.** [`bundle-structure.md`](../../bundle-structure.md) §Headroom, declining a re-base: re-basing on a timetable _would **invert the instinct D-102 ratified** — an absorbed number is a number nobody reads again — by establishing that headroom is restored **on a schedule rather than on an event**._
- **The severance, 2026-08-29 — ten days early, and executed.** SC-1's third trigger is _L-11 lands_ — a landing, not a reading. It fired. `bundle-structure.md:370`: _**It re-based nothing**: a re-measurement is what the condition asks for, and **a re-base is what the evidence has to earn**._ [`obligations.md`](../../obligations.md) SC-1 §Today says the same from the register: _a re-measurement is what this condition asks for; a re-base is what the evidence has to earn, and it does not._

**This is a better corroboration than D-187 gives itself.** Its only cited support is a contradiction it found in `arc-b-remediation.md`; the actual support is a precedent that ran correctly, unprompted, before the rule existed. A codification with a prior successful exercise is a much stronger thing than a rule invented at the site of a defect.

**And it falsifies one line of D-187's own Touches**: _requires no change to D-106 or SC-1, **whose re-base trigger is already a reading**_. SC-1 has three triggers and the third is a landing. SC-1 is not a counterexample — its own text routes that event to a re-measurement and its 2026-08-29 disposition left the re-base to the evidence — but the sentence describes the package's clearest precedent for the rule as a row that needed no attention. Corrected in D-192; D-187 keeps its wording as provenance.

**One item checked and cleared.** `bundle-structure.md:370` calls L-11 _the next **scheduled** re-base event_ — the one place in the live record spelling a re-base trigger with the word §18 now rejects. Not a defect: D-116 (d) keeps that list as the wording as decided, the same bullet defuses it with _it re-based nothing_, and SC-1 carries the live form. **Nor is SC-1's own headline**, which lists a landing among three re-base triggers under _Reopens: D-106 — the twelve declared rows re-base_: a reader stopping at the headline gets what §18 forbids, but the row disambiguates itself two clauses later and again in §Today, so it carries its own correction rather than substituting for the instrument.

---

## 8. What I tried to break and could not

- **Restore is a re-base under another name.** Refuted structurally in §2: one admissible value against two.
- **The boundary is really evidence, because it fixes which reading counts.** Refuted in §3 — D-187 concedes the occasion and the record then denies it a monopoly on the occasion.
- **The one-directional ban is incoherent.** Refuted in §3: the default needs no trigger.
- **§18's third bullet is dead letter, declined four times running.** It is not. It was followed at D-155, D-158 and D-166 and declined at Arcs B, C and D, and the declines are reading-grounded. On the two occasions the reclaimable slack was tested it was 23–66 B against 150 B of design headroom, which is a §18 judgment and not a §18 violation.
- **The close failed rule (b)'s _asking_.** It did not. O-13 is the only row booked to that destination in the whole register.
- **D-187 invented the boundary/schedule distinction.** It did not — §7a. That strengthens it.
- **The suspension's rules apply beyond this package.** They are stated repo-wide and exercised in one package; `drag2` is the only package carrying `bench/`. Prospective reach without a second application is worth knowing and is not a defect.

---

## 9. Verdict

**AMEND**, narrow and evidence-forced. D-187 deserved to govern the close, and it did govern it correctly: the boundary was attended, the restoration was performed in source and is live, the ceilings were untouched, and the interval it closed reconciles to the byte. Nothing here reverses a claim.

Three rules are underspecified, two of them in the same way — each requires an act to be _recorded_ and does not require anyone to _use_ the record:

1. **F-409** — the restoration has a write and no read. §18 gains: a restoration is read against the recorded figure and states the interval's attribution. Structural half: the restoration rule leaves the re-base bullet.
2. **F-410** — the boundary test screens dissolution, not blur. §18 gains a second limb: one identification, stated where the obligation is administered. F-405's attribution of its own shape to the abandonment clause is corrected.
3. **F-411** — the withdrawal statement rule guards one direction, and names _the instrument's own vocabulary_ where the instrument has two. It is stated against what the instrument asserts, and completely.

All three change what §18 requires, so under **D-160** this is substantive and **D-192 supersedes D-187**, carrying all five claims forward. Nothing is implemented here: the three findings are filed for the post-Arc-D remediation round, which is where D-187 itself put F-390.

---

## Process

No source, test or record under challenge was modified. One execution: `npx vitest run --project node tests/bench/size.node.test.ts` at `46fc543e0`, 43/43, verbose run confirming all seven control rows ran. No worktree and no destructive probe was needed — the reconciliation is arithmetic over four committed measurement records, performed by hand and re-checked at every seam. One discovery agent was dispatched over the live record's re-base triggers, suspensions and register triggers and **returned no report inside this pass**; nothing here depends on it. Those three censuses were taken directly instead: the re-base history in [`budget-rebases.md`](../../measurements/budget-rebases.md), a sweep for every suspension statement in the live record — O-13 is the only one — and the register's own trigger column.

**LSP plugin - available; not used**: this pass reads Markdown records, two docblocks and one comparison expression, with no code-symbol question in it.