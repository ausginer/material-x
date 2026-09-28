# Arc B remediation — hygiene recovery round summary

**Range reviewed:** `5f7a901a4..8c1b20042`, the same production range as [`arc-b-remediation-summary.md`](arc-b-remediation-summary.md). **All three recovery passes read files at `8c1b20042`**, each verifying the snapshot itself before reading source: `git diff 8c1b20042 HEAD` empty over `packages/drag2/{src,tests,bench}`, `git status --porcelain` empty, and `packages/drag2/src` resolving to tree object `cc11493373519deb2fa7df6e17da2e8eb7b9265c`. The intervening commits add review `.md` files only.

**This round decides nothing about production and repairs nothing.** It is a hygiene recovery: it re-establishes, from a snapshot known to be clean, the part of the original round that final byte identity cannot vouch for.

## Why this round exists, and what it can and cannot establish

The original consolidated round ran with a transient feature-proof mutation (`m8`, the `actionTags` validation block relocated below the frame-part compositions) present in the shared working tree while the other passes were running. The canonical summary already withdrew the inference that green suites excluded it: `m8` reddens zero rows by construction, so no green run can exclude it.

Byte identity at the end of a round proves what the **final** tree was. It does not prove what each parallel pass read while it ran. Re-checking a known finding recovers that finding, because a finding names its own subject and can be re-derived. **A null result cannot be recovered that way** — it has no subject to return to. What was therefore unestablished was the _negative space_ of the three parallel lenses: the areas each reported clean, and the areas each did not reach.

**This round does not validate the original passes' null results. It replaces them.** The original integrity, cleanup and DER runs remain unverifiable as clean-tree results, and nothing here makes them verifiable. What now stands in their place is a fresh negative space, derived from a snapshot verified clean before reading and verified clean again after every probe.

## Passes

| Lens | `subagent_type` | Artifact | Result |
| --- | --- | --- | --- |
| Integrity | `integrity` | [`arc-b-recovery-integrity-claude.md`](arc-b-recovery-integrity-claude.md) | **No findings**; 10 stated clean results |
| Cleanup | `cleanup` | [`arc-b-recovery-cleanup-claude.md`](arc-b-recovery-cleanup-claude.md) | **Explicit null**; 6 stated clean results |
| Decision elimination | `der` | [`arc-b-recovery-der-claude.md`](arc-b-recovery-der-claude.md) | **1 finding**; 9 stated clean results |

All three were launched in parallel by `subagent_type`, on the ordinary unnamed path with no `model` override, and each received only its own lens prompt. No pass received another's prompt, findings or artifact path, and none was permitted to message another. Each was interdicted from the five prior documents for this range, so that a clean result here is derived rather than inherited.

**The Reviewer input was not relaunched.** The existing High-effort second feature proof, [`arc-b-remediation-feature-proof-2-claude.md`](arc-b-remediation-feature-proof-2-claude.md), is this round's Reviewer input for consolidation. It independently re-ran the feature falsification against the clean tree, so the feature lens already has what this round exists to provide.

### Independence disclosures

- **DER** discloses that a wide `grep -rn "ArmOutcome" src tests .plan` printed three lines of `arc-b-remediation-integrity-claude.md` into its transcript before it narrowed the path. The leak is bounded and checkable: it concerns `ArmOutcome`, a subject on which DER reached a **non-finding** (`der-c9`) by its own reading of `00-index.md` §Normative precedence and freeze, and the one finding DER raised is unrelated to those lines. Recorded, not waved away.
- **Integrity** declined to open the sibling recovery-round report it noticed, beyond the letter of its exclusion list. Recorded as correct.

### Round hygiene of the recovery round itself

DER applied five one-at-a-time source mutations and one transient test file, reverted each, and verified afterwards that `git diff 8c1b20042` over the three paths is 0 bytes and `HEAD:packages/drag2/src` is `cc11493373519deb2fa7df6e17da2e8eb7b9265c`. **The failure mode this round repairs did not recur.**

Consolidation ran its own executions in **detached `git worktree` checkouts at `8c1b20042`**, never in the shared tree, and removed them afterwards. The shared tree carried no source mutation at any point during this round; its only modification throughout was the three untracked report artifacts.

## Reconciliation with the canonical record

**No recovery null retracts any canonical finding.** Three of the recovery passes' clean results land on text that a canonical finding also names, and in each case the recovery pass was answering a _different question_ about that text. Silence is explained below from each pass's own lens, never from another's coverage.

| Canonical | Status after this round | Established by |
| --- | --- | --- |
| F-387 | **Re-established**, independently, at the clean tree | `der-1`, plus feature-proof-2 |
| F-388 | **Re-established** by execution | consolidator-derived (below) |
| F-389 | Unchanged; not reached by this round | original round only |
| F-390 | **Re-established** at the mechanism | consolidator-derived |
| F-391 | **Re-established** at the mechanism | consolidator-derived |
| F-392 | **Re-established** at the mechanism | consolidator-derived |
| F-393 | **Re-established**, and it falsifies part of a recovery null | consolidator-derived |
| F-394 | Mechanism re-verified | consolidator-derived |
| F-395 | Unchanged; not reached by this round | original round only |
| F-396 | **Completed** by execution | feature-proof-2, verified by consolidation |
| F-397 | **New** | `reviewer2-1` |
| F-398 | **New** | `reviewer2-3` |
| Q-28 | Untouched by instruction | — |

### F-387 — re-established independently, and `der-1` merges into it

`der-1` reaches F-387's subject — `arm()`'s third latch test, the `!this.#bracket.closed` conjunct at `kernel.ts:2493` — from a different lens and without having read the canonical record, and reaches the same required property. **Same underlying defect, so no new id is minted.**

DER adds evidence the original finding did not have: deleting the conjunct leaves the entire `node` project green (24 files, 355 tests), and a transient probe on `construction.node.test.ts`'s own harness destroying on call 2 returns `[createFramePart, resetFramePart, retire] = [2, 2, 1]` clean and `[2, 0, 0]` mutated. DER also establishes the **contrast** that makes the gap specific rather than systematic: the other three guards this range added are each reddened by a row (`fail()`'s `#spec` guard 1, `#cancelWith`'s conjunct 1, `arm()`'s first latch test 1, its second 2), and only the third is reddened by none.

With feature-proof-2's independent reproduction, **F-387 now rests on three mutually independent confirmations**, one of them from a lens that did not know the finding existed. Tier stays **B** by consequence; `der-1` assigned B on its own, so there is no tier disagreement to preserve.

### F-388 — no recovery pass reached it, so consolidation established it

F-388 is the one tier-B canonical finding resting solely on a mutation count taken during the compromised round, and no recovery lens re-derived it. Executed here in a detached worktree at `8c1b20042`, one guard at a time:

| Mutation of `#unwindArm` | Rows red |
| --- | --- |
| `if (current)` dropped (`this.#resetFrame(next, current!)`) | **0** |
| `if (draft)` dropped (`this.#resetFrame(next, draft!)`) | **3** — node _reset only the frame parts a destroying factory composed_; browser _scrub the first frame when the second factory throws_; browser _reset only the composed frame when a factory destroys_ |

**Scope of this witness, stated because it does not prove everything F-388 claims.** The `if (current)` run covers the whole `node` project and the whole of `tests/kernel/kernel.browser.test.ts` (174 rows, all green under the mutation); it is not literally suite-wide. The node project reports three failures under both the mutation and a **same-worktree unmutated baseline** — `consumer.node.test.ts`'s three packed-package rows, an artifact of an unpacked detached checkout — so the mutated and baseline failure sets are identical and the mutation's own contribution is zero. The asymmetry F-388 asserts is confirmed; "0 rows across the entire suite" remains the original round's claim rather than this round's.

The supporting mechanism is re-verified directly: `frame(existing?)` is `Object.assign(existing ?? {}, DEFAULT_FRAME)` (`frames.ts:70-72`), so a null target yields `{}` rather than throwing, and `#unwindArm` carries `if (current)` and `if (draft)` as two independently deletable guards that `COVERAGE.md` books as one mutation.

### F-390 — re-established, and both recovery passes touched the text without testing the claim

Re-verified at the mechanism: `bench/size/shipped.js` is `import { sortable } from '@ydinjs/drag/sortable.js'` — the separate shipped package this tree does not build — and `measure.ts`'s own **budget** docblock (lines 115-116) already says baseline B is _an external control this package does not build_. Five lines later the **control** docblock says of the two surviving rows: _they are what still detects a kernel symbol reaching a composition that should not have one_. One of the two structurally cannot.

**Two recovery passes reached this text and neither falsified the claim, each for a reason internal to its own lens:**

- **Integrity** (clean result 6) checked that `measure.ts`, `obligations.md` O-13 and `arc-b-remediation.md` **agree with one another** on which two rows keep a control. They do agree; F-390 does not dispute it. Mutual consistency of three records is a different property from whether the thing they agree on is true.
- **Cleanup** (clean result 5) judged the docblock under `documentation.md` §5.2 — present tense, history-free, one pointer within budget — and restated its closing sentence approvingly in the course of clearing it. Documentation discipline is cleanup's question; the truth of a capability claim is not.

This is convergent silence on one subject from two lenses, and it is explained from each lens's own boundary. Neither is evidence for or against F-390, which stands on the re-verified mechanism above.

Integrity's own noted-but-not-raised observation — that `.agents/docs/architecture.md` describes symbols living in `packages/drag`, not `drag2` — is an independent sighting of the same underlying fact that makes baseline B inert here: the two packages are distinct and this tree builds only one of them. Recorded as convergence, not merged: the architecture-doc question predates the range, is not attributable to it, and is left where integrity left it.

### F-391 and F-392 — re-established at the mechanism

**F-391.** The transcribed `BehaviorContext` block in `01-construction-ownership.md:139-208` declares exactly six members — `realm`, `root`, `dispatch`, `fail`, `cancel`, `destroy`. `src/kernel/spec.ts:82-93` declares a seventh, `readonly closed: boolean`, documented there as _the latch itself, not a proxy for it… the only sanctioned liveness reading_. The consolidation's original **direction correction** — the prose count of seven is right and the transcribed block is the stale artefact — is confirmed. The unestablished supporting claim recorded last round (a `git log -S` reading) stays unestablished; nothing here rests on it.

**F-392.** `01-construction-ownership.md:394` still lists _the frame-part validation, the shape assertion_ among `arm()`'s unwind triggers. Reading `arm()`'s full body at `8c1b20042` (`kernel.ts:2423-2551`), the only static validation is the `actionTags`/`command.types` pair; no frame-part validation and no shape assertion survives. The listed triggers are gone and the sentence still names them.

### F-393 — re-established, and it falsifies part of the integrity null

`00-index.md:1499` carries, in the present tense, both halves F-393 names:

> `pinned` is written by **every** `begin()`, armed or not, and exists to be compared against the operation identity — storing it inside the operation would compare a value with itself

and, in the same entry, `clearOperationState` deleted _with its `pinned` line kept as the one non-record assignment at both retirement points_. The field is gone; the rationale is still in force tense. **F-393 stands, unrepaired.**

**This falsifies a claim in the integrity recovery pass's clean result 2**, which states that a grep across `src/`, `tests/` **and `.plan/`** turns up "only … prose uses of the English word 'pinned' — no stray reference to the deleted field or method survives." The `.plan/` half is false: line 1499's occurrences are claims about the field, not English prose. The failure is mechanical and visible — the search was run on the hashed form `#pinned`, which the record's prose does not use.

**The `src`/`tests` half of that clean result stands**, independently confirmed by DER's own grep (`der-c1`) and re-run here. The clean result is therefore **narrowed, not discarded**: coherent for source and tests, falsified for the plan record.

### F-394 — mechanism re-verified; the recovery cleanup cleared a different conjunct

`ExecutionBracket.#closed` is assigned at exactly one site (`execution.ts:194`, inside `if (!this.#closed)` at 192), so the latch is monotonic and the `current && draft` pair cannot decide its branch. The source itself says so at the site: _Both frames exist and the latch is open, **which the tests above already decide**; naming the pair is what lets the compiler see it too._

Cleanup's clean result 1 examined the same expression and found the three latch tests non-redundant. **It argues about `!this.#bracket.closed`, not about `current && draft`** — the conjunct F-387 establishes as load-bearing, which F-394 never disputed. Different conjuncts of one expression; no conflict, and no disagreement to preserve.

### F-395 and F-389 — not reached by this round

**F-395** (property (7) re-derived on three of six members) was not re-derived here. Cleanup's clean result 3 cleared the same JSDoc under `documentation.md` §5.1 — present tense, no rejected-alternative comparison, actionable for a behavior author. That is a question about _what kind_ of prose the JSDoc is; F-395 is about _redundancy_ within it. The clean result is neither corroboration nor retraction, and F-395 stands unchanged on the original round's evidence.

**F-389** (property (3) instrumented for one input only) was reached by no recovery lens. It is an absent-row claim about the `command.types`/`pointerdown` refusal, and it stands unchanged on the original round's evidence. Left visible rather than quietly carried as though this round had confirmed it.

### F-396 — completed, and the counterclaim does not survive

F-396 was recorded **incomplete** because discriminating its two rows required executing two mutations that no pass had run. Feature-proof-2 ran both. **Both were re-executed here**, independently, in a detached worktree at `8c1b20042` (baseline: 6 node rows and the 2 named browser rows all green):

| Witness `COVERAGE.md` assigns | Rows red |
| --- | --- |
| `#spec` published before the pair is composed | **3** — node _retire the behavior when a frame-part factory destroys…_; node _reset only the frame parts a destroying factory composed_; browser _reset only the composed frame when a factory destroys_ |
| the unwind resetting both frames unconditionally | **3** — node _reset only the frame parts a destroying factory composed_; browser _reset only the composed frame when a factory destroys_; browser _scrub the first frame when the second factory throws_ |

Both figures reproduce feature-proof-2 exactly. **Each witness reddens both of F-396's rows, so neither discriminates them.** The live counterclaim the finding was held against — that `COVERAGE.md` assigns the two rows _different_ witnesses, and that this settles it — does not survive execution: the assignment is different, and the discrimination it implies does not exist.

**F-396 is now complete**, and its claim is sharper than the incomplete version. It is no longer _two rows may share a witness_ but: the register assigns distinct witnesses to two rows that **no mutation in it separates**. The browser row's assertion (`resets === 1`) is a strict weakening of the node row's (`[creates, resets] === [1, 1]`) under an identical trigger.

**Required property.** Where two rows in different layers are booked against different witnesses, at least one witness must redden one and not the other; a register may not assign distinct witnesses to rows no mutation in it separates.

Tier stays **C** by consequence: no consumer observes anything different, and the rows do pin real behaviour — what is wrong is the register's account of which row's failure means what.

## New findings, with canonical ids

Both come from the Reviewer input and are genuinely new — neither is a restatement of an existing canonical finding.

### F-397 · tier C · `arc-b.md`'s accessor derivation names a site the same range deletes

**Local id:** `reviewer2-1`.

`measurements/arc-b.md` §The per-sample accessor count was corrected on 2026-09-07 (F-381) to read: _`#begin`'s `current.operation` is the single uncounted site — 1 + 2 + 1 + 2 + 1 = 7_. The same range deletes the site.

**Verified at the mechanism here.** At `5f7a901a4`, `Kernel.#begin()` was `this.#pinned = this.#frames.current.operation; this.#frames.begin();`. At `8c1b20042` the method is gone (`git grep '#begin' -- src` returns nothing; the base had seven occurrences in `kernel.ts` alone), its callers now call `this.#frames.begin()` directly, and `FrameTransaction.begin()` (`transaction.ts:56-58`) is only `Object.assign(this.#draft, this.#current)` — **it reads no accessor at all**. So the counted read did not move to the new call site; it ceased to exist. `#handleMove` at head reads `current` for `phase`, `pointerId` and the threshold arithmetic, and reads `current.operation` nowhere.

**Why it is a problem.** D-181 asked for the accessor count _before_ the byte figures, because D-170's ownership boundary is what makes accessors the cost this arc pays. The remediation removes one invocation per sample and no record says so: `arc-b-remediation.md` books bytes only, and `budget-rebases.md`'s mentions of an "accessor removal" belong to D-170 step 6 / F-309 and `RectIndex`, a different subject — confirmed by reading both. A reader re-deriving the figure at the tree arrives at six against a record that says seven, with nothing marking the change.

**Required property.** A measurement record may state a per-sample derivation in the present tense only where the site it names still exists; where a later landing removes one, the record carrying the figure must say which landing changed it and by how much.

**Tier C by consequence**: no consumer observes anything, and the affected instrument is a measurement note rather than an instrument the repository relies on to catch a regression.

### F-398 · tier C · the six-row table's counts hold only under a scoping convention it does not restate

**Local id:** `reviewer2-3`.

`COVERAGE.md`'s new six-row construction table states counts that are correct only when read as _rows within this table_. The adjacent D-181 table states that convention explicitly at line 1107 — _the count in the right-hand column is over the rows written for this entity and says so_ — and the six-row table, introduced at 1127 only as _listed apart because the subject is different_, repeats no such rule. Row 1131's entry is an **enumeration**, not merely a count: _**3**, this row and the two below it_.

**What is verified here, and what is not.** The textual premises are confirmed directly: the D-181 convention sentence at 1107, the six-row table's introduction at 1127 with no restatement, and row 1131's enumerating form. **One arithmetic claim is independently corroborated**: the entry at 1132 books _the unwind resetting both frames unconditionally_ at **1**, and that mutation reddens **3** rows across `construction.node.test.ts` and `kernel.browser.test.ts` alone, as executed above for F-396 — so the suite-wide figure is understated exactly as the finding says, and the booked **1** is right only under the table-scoped reading (the two extra rows are browser rows, outside the table). **The remaining arithmetic is pass-supplied**: the claim that row 1131's mutation reddens 4 suite-wide rather than 3 was not re-executed here, and is carried as feature-proof-2's evidence rather than as this consolidation's.

**Required property.** A mutation register's counts must state the population they range over wherever that population is not the whole suite, and an entry that enumerates which rows redden must enumerate all of them.

**Tier C by consequence**, and the reporting pass's own conditional is preserved rather than resolved: it records that under the suite-wide reading its own enumeration invites, the same evidence would make this **B**, because the register would then assert coverage arithmetic the tree falsifies. That conditional turns on which reading the register intends, which is the register owner's to state and not this consolidation's to decide.

## Corrections to this round's own reports

Neither is a production defect; both are defects in a review artifact produced by this round, recorded so the record is not read as sounder than it is.

1. **Integrity clean result 2 overreaches into `.plan/`** — narrowed above under F-393. Coherent for `src`/`tests`, falsified for the plan record.
2. **Integrity clean result 1 misstates the `SeamDriver` arity change** as "drops from four collaborators to three". The four names it then lists — `frames, preparationValid, fail, notify` — are correct, and the base constructor took **five** (`frames, begin, preparationValid, fail, notify`), so the change is five to four. Verified at both trees. The names are right and the counts are wrong; the coherence conclusion the clean result draws is unaffected, and both cleanup and DER state the arity correctly.

## Local → canonical

| Local | Source pass | Canonical | Disposition |
| --- | --- | --- | --- |
| `der-1` | recovery `der` | F-387 | merged — same defect, independently derived; no new id |
| `reviewer2-1` | feature-proof-2 | **F-397** | new, tier C |
| `reviewer2-2` | feature-proof-2 | F-396 | **completes** the incomplete finding; no new id |
| `reviewer2-3` | feature-proof-2 | **F-398** | new, tier C |
| `integrity` | recovery `integrity` | — | null result (one clean result narrowed) |
| `cleanup` | recovery `cleanup` | — | explicit null result |

**Ids allocated per prefix independently**, against a repo-wide scan of `*.md` and `*.ts`: `F-` high-water **396**, `Q-` **28**, `I-` **37**. Two `F-` minted, F-397 and F-398. **No `Q-` and no `I-` minted** — this round routes nothing new, and no finding here establishes an invariant. Each prefix's mark was taken separately; one prefix's maximum says nothing about another's. The scan establishes the highest id _mentioned_, which guarantees freshness and is not a census.

The canonical F-ledger in `.plan/contract/00-index.md` currently ends at F-386. F-387…F-398 live in these round summaries and are **not** written into the ledger here: entering them is part of remediation, and this consolidation repairs nothing.

## Scope and silence

Each pass's unreached areas are justified from **its own lens**. That a parallel pass covered a subject is never used as a justification here — that coupling is what independence exists to prevent.

- **Integrity** did not reach `packages/drag` (outside the range), runtime behaviour beyond what the suite exercises (its lens is package coherence, not feature correctness), or a hand re-derivation of every budget figure beyond the two `control:` rows and the five-name cross-check (`bench/size.node.test.ts` asserts those against a real build and passed). It reports the public surface, the `#begin` removal's consistency, `arm()`'s documented order, the construction-window contract against both shipped behaviours, and the ledger's `ArmOutcome` carve-out as **checked and coherent**, so each is distinguishable from unexamined.
- **Cleanup** bounded itself to the files the range touched, and says why in its own terms: a cleanup finding requires having read the code, and it has no reading of `sortable/*`, `free-drag/*` or the untouched bulk of `kernel.ts` to report. It reports six constructs — `arm()`'s three latch tests, the `#begin`/`#pinned` deletion's residue, the `BehaviorContext` JSDoc under §5.1, `COVERAGE.md`'s decision references, `measure.ts`'s control docblock under §5.2, and `fail()`'s `#spec` guard — as examined and justified.
- **DER** covered the decision projection in both directions (186 rows; 12 fully inactive decisions and 36 carrying retired fragments), the backward pass over the machinery this range left standing, and the constraint surface the range moved. It did not reach `sortable/**` or `free-drag/**` (no decision retired in or before this range touches either), whether the guards are _correct_ as opposed to still-justified (not its question), the byte arithmetic (a measurement question, while the constraint it owed an answer about is answerable from O-13 and was), or the historical body of the plan record (its causal evidence, not its subject).
- **Feature proof** was not relaunched; feature-proof-2's own scope and silence stand as written there, including its statement that the out-of-contract path D-186 concedes was not executed because an out-of-contract path cannot falsify an in-contract claim.

## What remains unestablished

- **The original round's null results are not recovered**, and cannot be. They are superseded by this round's negative space rather than validated by it.
- **F-389 and F-395** were reached by no recovery lens and stand on the original round's evidence alone.
- **F-388's "0 rows suite-wide"** is confirmed for the `node` project and `kernel.browser.test.ts`; the literal suite-wide figure remains the original round's.
- **F-398's row-1131 arithmetic** is feature-proof-2's evidence, not this consolidation's.
- **F-391's `git log -S` supporting claim** remains unestablished, as last round recorded. Nothing rests on it.
- **Q-28 is untouched by instruction** and remains routed to the architect, undecided here. This consolidation mints no `D-`.