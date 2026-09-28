# Arc B remediation — cleanup pass

**Files read at `8c1b20042ecf74ddeef7c9bc65ceb6ff46e2fa3e`**, the head of `drag2/fin-review`. **Range** `5f7a901a4..8c1b20042`, two commits. Nothing in the tree was modified by this pass.

**The lens.** Is the machinery this range leaves behind justified by the code's current responsibility and the rules in [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) and [`documentation.md`](../../../../.agents/docs/documentation.md) §5? The governing architecture is the **current** [D-184](../../contract/00-index.md) and [D-186](../../contract/00-index.md), read through `.scripts/entry.sh`.

**The verdict in one line.** The range is disciplined: the `#pinned` apparatus is gone with no residue, the two `#spec` guards cost no field and no nullable read exactly as D-184 required, and `#unwindArm` is a real boundary with two call sites. **Four findings, all tier C**, and the sharpest of them is that `arm()`'s third latch test re-admits as a runtime question the very fact D-184 refused to re-admit for `#driver`.

## 0. Scope

**Covered.**

- The whole code diff of `src/kernel/kernel.ts`, `src/kernel/seams.ts` and `src/kernel/spec.ts` over the range, statement by statement, and the resulting `arm()` / `#unwindArm` / `fail()` / `#cancelWith` bodies read whole at head.
- `bench/size/measure.ts`'s `control?:` doc block and the five removed declarations.
- `tests/kernel/construction.node.test.ts` in full; the changed rows of `tests/kernel/kernel.browser.test.ts`, `tests/kernel/seams.node.test.ts` and `tests/kernel/vocabulary.node.test.ts`.
- `tests/COVERAGE.md`'s new construction table and its corrected B-0 paragraph, read for duplication rather than for mutation arithmetic.
- Comment and JSDoc discipline across every touched block, against Part I §Comments and `documentation.md` §5.

**Verified mechanically, in this agent.**

- `#pinned` has no residue anywhere in `src/`, `tests/` or `bench/`; `OperationIdentity` survives at thirteen further sites in `kernel.ts`, as D-186 predicted.
- `ExecutionBracket.#closed` is written in exactly one place, `execution.ts:194`, under `if (!this.#closed)` — the latch is monotonic. This is what cleanup-1 rests on.
- `kernel.ts` carries **32** `this.#x!` non-null reads, so definite-assignment assertion is the file's established answer to a fact the compiler cannot see.
- `npx tsc --noEmit -p packages/drag2` is clean; `tests/kernel/construction.node.test.ts` and `tests/kernel/seams.node.test.ts` are green, 92 rows.
- `ArmOutcome` exists nowhere in `src/` and is now absent from `vocabulary.node.test.ts`'s allow-list — F-382 is discharged, not a finding.

**Not reached, and why this lens stops there.**

- **The mutation arithmetic of `COVERAGE.md`'s new six-row table was not executed.** Each row's claimed witness count is an instrument-soundness question, and establishing it needs pinned worktrees and per-mutation full-suite runs — the feature-proof lens's method, not this one's. cleanup-3 is therefore stated as what I observed at the source and explicitly names the register's counterclaim.
- **The joint D-184/D-186 measurement in [`arc-b-remediation.md`](../../measurements/arc-b-remediation.md) was not re-run.** §15 conformance is a measurement question.
- **The record documents (`00-index.md`, `01`, `02`, `03`, `06`, `plan.md`, `obligations.md`) were read for the governing architecture only**, not audited. Whether a `D-*` is contradicted or unimplemented is reportable from here and I found nothing to report; amending one is not this lens's to do.
- The behaviour tiers (`src/free-drag/`, `src/sortable/`) are untouched by the range and were not read.

## 1. What holds — stated because a clean boundary is a result

- **`#unwindArm` is not a single-use wrapper.** It has two call sites — the `catch` and the fall-through after the `try` — so §2.1 does not reach it, and it owns a real thing: the four-step obligation (retire, reset whichever frames exist, abort ingress, null the spec) that every unarmed exit owes. Its totality claim is sound without a `finally`, because `#unwind` is `createUnwind(this.#report)` and `#resetFrame` runs its body inside it, so neither reset nor the retire can throw past it.
- **The two `#spec` guards add no state.** `fail()`'s `if (this.#spec)` and `#cancelWith`'s `!this.#spec ||` both ride the publication order D-181 already established, and both are truthiness reads over a reference-or-null field, which is Part I §Nullish checks' common case. No field, no nullable read, no optional chain — D-184's condition, met.
- **The `#pinned` deletion is complete and its collaborator went with it.** `SeamDriver` is back to four parameters, `seams.ts`'s constructor docblock lost the paragraph whose subject was deleted rather than keeping a corrected version of it, and the harness counter was re-sourced onto `FrameTransaction.begin` — which is a stronger observation point, not a weaker one.
- **`arm()`'s validation-before-latch ordering earns its comment.** The block states a constraint on the next edit and its consequence, which is what §5.2 asks of an internal comment.

## 2. Findings

### cleanup-1 — `arm()`'s pair test re-admits as a runtime question a fact statement order already decides · tier C

**Finding.** The third guard in `arm()` reads `if (current && draft && !this.#bracket.closed)`. The `!this.#bracket.closed` conjunct is load-bearing; `current && draft` cannot be false when it is reached with the latch open, and exists only so TypeScript narrows two `Frame<Part> | null` locals for `new FrameTransaction(current, draft)`.

**Current behaviour.** `packages/drag2/src/kernel/kernel.ts`, in `arm()`:

```ts
if (!this.#bracket.closed) {
  current = Object.assign(frame(), next.createFramePart());
}

if (!this.#bracket.closed) {
  draft = Object.assign(frame(), next.createFramePart());
}

// **Both frames exist and the latch is open**, which the tests above
// already decide; naming the pair is what lets the compiler see it too.
if (current && draft && !this.#bracket.closed) {
```

The comment states the redundancy in its own words.

**Why it is a problem.** Part II §3 — type-level structure should disappear from the bundle; a public or internal type graph must not force an equivalent runtime graph — and §1.2, which puts a compile-time-decidable fact at compile time. The stronger objection is that **D-184 refused this exact move one field over**: _"A `#driver?.` optional chain is refused: it re-admits as a runtime question a fact the publication order already decides, and it would be the only nullable read of a definite-assignment field in the file."_ `current && draft` re-admits as a runtime question a fact the two latch tests above it already decide, in the same method, for the same reason. `kernel.ts` answers this class of question 32 times with `!`; this is the outlier.

The secondary cost is on the reader: a conjunct written as a runtime test says the state it excludes is reachable. It is not, and only tracing the latch's monotonicity establishes that.

**Evidence.** `ExecutionBracket.#closed` (`packages/drag2/src/kernel/execution.ts:33`) is initialised `false` and assigned at exactly one site, line 194, inside `if (!this.#closed)` — it is monotonic and never reopens. So at the third test: if the latch is open, it was open at both earlier tests, so both compositions ran and neither threw (a throw leaves the `try` for the `catch`), and `Object.assign` returns its truthy target — `current` and `draft` are both non-null. If the latch is closed, `!this.#bracket.closed` short-circuits the branch regardless of the locals. There is no state in which `current && draft` decides the branch.

**Required property.** A fact fixed by statement order inside one method is not paid for at runtime a second time, and the file states such facts one way rather than two.

### cleanup-2 — `BehaviorContext`'s published JSDoc states the construction-window property universally and then again on three of six members · tier C

**Finding.** `spec.ts`'s interface block states D-184's property (7) as a general rule — _"a supported position for every member below, and each behaves there as its own entry states"_ — and `fail`, `cancel` and `destroy` each then carry a clause deriving that same rule for themselves.

**Current behaviour.** `packages/drag2/src/kernel/spec.ts`, `BehaviorContext`. The interface-level paragraph is followed by, on `fail`, _"**Outside one includes the whole of construction.** The factory body and the frame-part factories are outside every seam, so a call from either takes the same demotion"_; on `cancel`, _"…and there is no operation anywhere in construction, so a call from there is that no-op"_; on `destroy`, _"**A call during construction closes on the statement like any other**"_.

**Why it is a problem.** Two things, both small.

Part II §4 (c) measured published doc prose as the dominant install-weight class in this package, and `documentation.md` §5.1 sets published JSDoc length _proportional to what the caller must do_. The derivation clauses tell the caller nothing the interface block has not already told them.

The second is the more interesting one: **(7)'s stated purpose is that it is general so that _"the next member added to the interface inherits it"_.** Annotating three of the six members undercuts exactly that — a reader who sees the construction case spelled out on `fail`, `cancel` and `destroy` has a reason to wonder whether `realm`, `root` and `closed` were considered.

**What is not part of this finding.** Three of the added sentences carry information the general property does not deliver and a caller can act on: `fail`'s _silently, because the report travels through the behavior's own `reportError`_; `destroy`'s _no further frame part is composed_; and `cancel`'s statement that an idle cancel is a no-op that leaves no latch, which after this range exists nowhere else in published surface (`kernel.ts:720` is `#cancelWith`'s internal block). Those earn their bytes. The finding is the derivation clauses attached to them.

**Required property.** A property stated once as universal is not restated per member, and published JSDoc carries only what the general statement does not already deliver.

### cleanup-3 — the same destroy-during-composition behaviour is pinned at two layers, one of which the package's own layer rule excludes · tier C

**Finding.** `tests/kernel/kernel.browser.test.ts` _should reset only the composed frame when a factory destroys_ and `tests/kernel/construction.node.test.ts` _should reset only the frame parts a destroying factory composed_ have the same trigger and the same assertion.

**Current behaviour.** Both arm a controller whose **first** frame-part factory calls `kernel.destroy()`, and both assert that exactly one reset ran. The browser row additionally asserts `not.toThrow()`; the node row additionally asserts `createFramePart` ran once. The browser row was re-pointed by this range — its assertion moved from `resets === 0` to `resets === 1` and its comment was rewritten — at the same time the node row was created.

**Why it is a problem.** Part II §6 — one mechanism, not two — read at the suite. And the package's own layer rule places this subject at `node`: D-184 says the file's layer is `node` _"because every one of the four rows runs on a stub root with no layout, no pointer and no real event"_. The browser row needs a real `document` element, `document.body.append` and a cleanup hook to observe a property that has nothing to do with the DOM, which is layer cost paid for nothing. Two rows for one property also means a future change to the property has two places to be re-argued, and `COVERAGE.md` now carries two table entries describing it.

**The counterclaim, which I did not execute.** `COVERAGE.md` assigns the two rows different witnesses: the browser row's is _`#spec` published before the pair is composed_, the node row's is _the unwind resetting both frames unconditionally_. If both reproduce as stated the rows are not redundant despite the identical trigger and assertion. Running those mutations is the feature-proof lens's work and this pass did not do it; the finding is filed on what the two sources say, and a consolidator holding the mutation figures can close it on them.

**Required property.** One behavioural property has one row, at the layer its own subject requires.

### cleanup-4 — `measure.ts`'s `control?:` block states a census of the data below it, which nothing keeps true · tier C

**Finding.** The paragraph added to `Composition.control`'s doc block opens _"**That is why only two rows declare one at present.**"_ — a count of the literal table 200 lines below, in a comment nothing checks.

**Current behaviour.** `packages/drag2/bench/size/measure.ts`, on `control?: number`. The rest of the paragraph is a working constraint: do not re-declare a control on a kernel-carrying row while the arc series is open, because the figure would be read off the result rather than predicted, and the five return under `obligations.md` O-13.

**Why it is a problem.** `documentation.md` §5.2 asks an internal comment to _"state a constraint that holds and the consequence of breaking it"_. The constraint is there and is good; the count is not a constraint, and it goes stale silently the moment a seventh row declares or a third row re-declares — the same failure `budget-rebases.md` names for a figure nobody reads again. The `obligations.md` O-13 reference is within §5.2's one-bare-pointer allowance and is not part of this finding.

**Required property.** A comment states what must remain true, not how many rows currently satisfy it.

## 3. No finding, recorded so the silence is not mistaken for absence

- **`arm()`'s two-exit shape.** The `return` inside the armed branch, the fall-through past the `try`, and the second `#unwindArm` call outside it are three statements implementing one stated property, and the comment gives the non-obvious reason for the placement — the unwind's own `ingress.abort()` must not be caught by the handler above it and run twice. That is a constraint on the next edit, correctly placed.
- **`arm()`'s `command.types` validation block.** Untouched by this range, and its long comment is a rationale whose length is proportional to how attractive the four refused checks are. §1.1's gate is applied in it correctly.
- **The `describe` names.** `describe('the construction window', …)` names a subject rather than a unit, which reads against Part I §Unit tests — but `kernel.browser.test.ts`'s `describe('arm unwind of a partial frame pair', …)` predates the range and does the same. It is the package's established idiom, not something this range introduced.
- **`vocabulary.node.test.ts`'s corrected comment.** The strikethrough on `NO_STAMP` was replaced with a present-tense statement carrying one bare `(D-181)` pointer. That is §5.2 met, and it is a small improvement this range made rather than a defect it left.