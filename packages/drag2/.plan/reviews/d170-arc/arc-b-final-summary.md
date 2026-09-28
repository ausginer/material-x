# Arc B — final review round, consolidated

**Range** `185fb371..25be674c`, six commits, on `drag2/fin-review`. **All passes read files at `25be674c`.** Contract: [D-181](../../contract/00-index.md) as amended by [`arc-b-frame-transaction-claude.md`](arc-b-frame-transaction-claude.md) and [`arc-b-second-pass-claude.md`](arc-b-second-pass-claude.md).

**Passes, run in parallel and independently.** No pass received another's report, findings or artifact path.

| Pass | Artifact | Result |
| --- | --- | --- |
| `reviewer` | [`arc-b-final-feature-proof-claude.md`](arc-b-final-feature-proof-claude.md) | 8 findings — 1 A, 2 B, 5 C |
| `integrity` | [`arc-b-final-integrity-claude.md`](arc-b-final-integrity-claude.md) | explicit null result |
| `cleanup` | [`arc-b-final-cleanup-claude.md`](arc-b-final-cleanup-claude.md) | 2 findings — both C |
| `der` | [`arc-b-final-der-claude.md`](arc-b-final-der-claude.md) | 4 findings — 2 B, 2 C |

High-water marks were read **independently per prefix**: `F-372`, `Q-24`, `I-37`. This round mints `F-373`..`F-386` and `Q-25`..`Q-26`. **No `I-` is minted** — the round established no new invariant, and `I-37` stands.

## The round in one line

The architecture landed as amended and its instruments are strong — every one of the fifteen tabulated mutations, all fifteen byte rows on both figures, and B-0's conjunct matrix each reproduce independently — but the extraction changed behaviour in the construction window in two ways nothing in the record names and no row observes, and the record of the arc's own evidence carries five defects, one of which asserts machinery the tree does not have and one of which is refuted by thirty-four rows.

## Local → canonical

| Local                          | Canonical                   | Tier  |
| ------------------------------ | --------------------------- | ----- |
| `reviewer-1`                   | **F-373**                   | **A** |
| `reviewer-2`                   | **F-374**                   | **B** |
| `reviewer-5` (restated)        | **F-375**                   | **B** |
| `der-1`                        | **F-376**                   | **B** |
| `der-3`                        | **F-377**                   | **B** |
| `reviewer-3`                   | F-378                       | C     |
| `reviewer-4`                   | F-379                       | C     |
| `reviewer-6`                   | F-380                       | C     |
| `reviewer-7`                   | F-381                       | C     |
| `reviewer-8`                   | F-382                       | C     |
| `cleanup-2`                    | F-383                       | C     |
| `der-2`                        | F-384                       | C     |
| `der-4`                        | F-385                       | C     |
| (consolidator-derived)         | F-386                       | C     |
| `cleanup-1`                    | — confirms open F-349/F-350 | —     |
| `der-1` / `reviewer-5` residue | **Q-25**, **Q-26**          | —     |

`cleanup-1` mints no id **by its own construction**: it reports itself as confirmation of F-349 and F-350, which the ledger already carries open. It is recorded as an independent re-derivation of those two, not absorbed — see [Convergence](#convergence-on-pinned).

## Findings

### F-373 — `kernel.fail()` throws a `TypeError` when a behavior calls it before `arm()` returns · tier A

`SeamDriver` moved from an eager `readonly #driver = new SeamDriver<Part>(this.#context)` (`185fb371`, `kernel.ts:907`) to a definite-assignment field `#driver!: SeamDriver<Part>` (`:359`) assigned only at `:2477`. `fail()` at `:2408` dereferences it unguarded. Every `context.fail()` before `arm()` completes throws `TypeError: Cannot read properties of undefined (reading 'requestFailure')` out of `draggable()`.

Pre-arm is a **documented, supported position**: `src/kernel.ts:227-231` states the factory is called with the kernel narrowed to `BehaviorContext` and that "Ingress is armed exactly once, after the factory has returned". `requestFailure`'s own contract makes a call outside a seam a reported warning, and `#notify`'s `this.#spec?.reportError` makes it a silent no-op while nothing is armed.

**Verified at consolidation, statically and independently:** `#driver` carries no initializer at `25be674c`, and `createFramePart()` runs at `:2473-2474` — two statements _before_ the assignment at `:2477` — so the throw is reachable from inside `createFramePart` as well as from the factory body. From `createFramePart` it is worse than a throw: it escapes the factory, `arm()`'s catch unwinds `spec.retire()`, scrubs the composed frame, aborts ingress and rethrows, destroying the controller by a call the contract says produces a warning. `fail` is the only `BehaviorContext` member the range regressed — `cancel` throws on both trees, `dispatch` and `closed` are unchanged.

**Required property.** A `BehaviorContext` member reached from a documented pre-`arm` position behaves as its own contract states, rather than throwing a platform error out of `draggable()`. The property needs a row: the range changed this silently and 1360 tests did not notice.

### F-374 — `destroy()` from inside `createFramePart` no longer runs teardown step 4 · tier B

`arm()` publishes `#spec` after composing both frames (`#spec = next` at `:2505`, after `#frames` at `:2476` and `#driver` at `:2477`). Teardown steps 3–6 are guarded by `if (this.#spec)` at `:671`, so a `destroy()` raised from inside `createFramePart` falls on the null side and `this.#unwind(this.#spec.retire)` at `:673` never runs — not during teardown, because `#spec` is still null, and not from `arm()`'s catch, because nothing threw.

**Verified at consolidation, statically**, independently of the pass's probe: the ordering and the guard are as stated. The pass's probe at both trees gives the call order directly — `185fb371`: `createFramePart#1` → **`spec.retire`** → `resetFramePart` → `resetFramePart` → `createFramePart#2`; `25be674c`: `createFramePart#1` → `createFramePart#2`.

The second architecture pass §5, where the reordering was decided, derived it from a reading of the old behaviour that is factually wrong — it describes the path as reaching only a scrub of an unassigned field and a throwaway `frame(undefined)`, "harmless". What it actually reached was `spec.retire()` **and then** two `resetFramePart` calls. The step's loss is a second consequence of the chosen closure, not an effect of the required property (`#spec !== null ⟹ both frames exist`), and it was not priced. The new row asserts `resets === 0` and says nothing about `retire`.

**Required property.** Either teardown step 4 runs on every path a `destroy()` can reach, or the exemption is stated in `01` §Teardown and carried by a row that observes `retire` rather than `resetFramePart`.

### F-375 — F-350's ground is refuted by the suite: the misuse it calls invisible reddens thirty-four rows · tier B

F-350 justifies the driver's fifth collaborator. Its wiring conclusion is correct; its **ground** is not:

> Since the conjunct has no reachable falsifier, that degradation would have been invisible to the suite, which is exactly why it is recorded rather than absorbed.

`seams.ts:292`, `this.#begin()` → `this.#frames.begin()`, with `#pinned` and the conjunct left exactly in place, at `25be674c`: **37 failed against a clean control of 3 → 34**; over `tests/kernel` + `tests/sortable` + `tests/free-drag`, 0 → **27**.

**The inference fails because F-349 and F-350 concern opposite directions of the same conjunct.** F-349 establishes that no reachable state makes `current.operation === #pinned` **false** under correct wiring — the conjunct never fires. F-350's stale pin makes it false **when nothing is wrong** — the conjunct fires constantly. Unreachability of the first says nothing about observability of the second, and the record slides from one to the other.

The distribution confirms the mechanism: with the pin left behind, any operation whose first driver transaction is not preceded by a kernel `#begin()` in the same drain revalidates against a pin an earlier transaction wrote — the whole pointerless/command path (16 keyboard rows, both pointerless kernel rows, the admission-queue-boundary group), while the pointer path is untouched because `#handleMove` re-pins every sample.

**This is a different mutation from der's probe C**, which deleted `#pinned` and the conjunct together and correctly reddened no behavioural row. Conflating the two would settle this wrongly: with the conjunct gone there is no pin left to go stale.

**Tier B by consequence**, not by provenance: no program behaviour changes, but F-350 is filed **open**, so a pass discharging it would file work to build an instrument that already exists thirty-four rows deep, or treat a future edit here as unguarded when it is not. F-350's conclusion — the fifth collaborator is the right wiring, and the four-argument shape returns if the conjunct is deleted — is untouched.

**Required property.** A filed finding's stated ground is true of the tree it names. Where a finding asserts the suite would not observe something, that assertion is executed rather than inherited from a neighbouring finding about a different failure direction.

### F-376 — `#pinned` survives on a sequencing rule that has expired, and the reading owed on it is booked nowhere · tier B

`#pinned` (`:386`), its capture (`:482`), its two clears (`:613`, `:687`) and the identity conjunct (`:499`) survive on the only stated ground for keeping them: _relocating a guard into a new entity in the same commit that would justify deleting it makes the deletion unreviewable afterwards._ That is a rule about **which commit may touch the field**, not a reason for the field to exist, and the commits it constrained have landed.

F-349 states what is owed — "either a reachable path and a row, or a deletion" — and then declines every destination: _Not Arc B's, and not Arc C's by default._ `obligations.md` carries no row. The register exists because D-116 found that a live clause stated inside a decision-ledger row is unreachable by every instrument this package has; O-7 is the standing precedent for exactly this shape.

**Evidence**, all pinned at `25be674c`: dropping the conjunct reddens **0** of 1360 behavioural rows while the two conjuncts beside it redden 1 and 3; deleting the whole apparatus and reducing `SeamDriver` to four collaborators **typechecks clean** and reddens no behavioural row — only 40 `seams.node.test.ts` construction rows, 4 `docs.node.test.ts` rows and the `control:` byte equalities.

**Required property.** Every guard retained in `#preparationValid()` has either a row that falsifies it or a recorded reason that survives the arc which deferred the question; and a reading owed on one names a destination the register can carry.

**Routed — Q-25.**

### F-377 — D-181's live statement asserts a `#pinned` mechanism the landed tree does not have · tier B

`00-index.md:1797`: _~~`#pinned`'s two clears are deleted rather than relocated.~~ **Superseded 2026-09-05: they ride the `retire` the frame scrubs require, at zero new members and zero behaviour change.**_ The struck half is correctly retired; **the unstruck replacement is what B-0's third arm invalidated, and it survived.**

**Verified at consolidation, independently.** At `25be674c` the clears are standalone statements at `kernel.ts:613` and `:687`; `this.#frames.retire(this.#scrub)` is at `:589` and `:679`; and `FrameTransaction.retire(reset)` applies the reset to the two frames and touches nothing else. The paragraph's own line citations no longer resolve either — it cites `:624-625` for the scrub and `:649` for the clear.

`npx just decisions` prints that sentence as **live** D-181 content; `--retired` prints only the struck original. A decision-elimination pass reads the projection in the direction that structurally cannot catch this: the forward half looks at retired content for surviving machinery, and here the false clause is on the live side describing machinery that does not exist. The same paragraph is the sole carrier of the argument that D-181's original deletion was not behaviour-preserving, so it cannot simply be dropped.

**Required property.** D-181's live content describes the tree at `25be674c`. An amendment the implementation then overrode is retired normative content like any other.

### F-378 — the Brotli headline says thirteen of fifteen rows fell; twelve did · tier C

**Verified at consolidation** by counting the arc's own table: −25, +18, −32, −11, −19, −49, −7, −34, −45, −31, −16, 0, −8, −27, 0 — twelve negative, one positive (`minimal (xy)` +18), two zero. 13 + 2 + 1 = 16 > 15, so the sentence is self-refuting against the table beneath it, which `arc-b.md` then contradicts three sentences later. Thirteen is the **module** count and is correct.

In four places, one the decision ledger: `arc-b.md` §The result in one line and §Brotli, `budget-rebases.md`, `plan.md:2311`, `00-index.md:1781`. This is the F-347 shape, recorded one arc later by the pass that recorded F-347.

### F-379 — the instrument is thirteen rows, recorded as eleven · tier C

D-181's entry and `COVERAGE.md`'s header say eleven. The tabulated instrument is thirteen: seven in `transaction.node.test.ts`, four in `transaction.declaration.test.ts`, and the two `kernel.browser.test.ts` rows the same table lists and the same fifteen mutations name as their sole witnesses. Eleven is the count of the two new _files_. F-342 is _"the Stage 1 plan entry counts thirteen instrument rows as eleven"_ — identical numbers, identical shape, in the entry immediately after the one recording F-342.

### F-380 — `#begin`'s doc states a settled ground for the pin's location that the record explicitly declines · tier C

`kernel.ts:473-480` gives a compositional ground for `#pinned` being the kernel's. That is the second pass's §2 argument for keeping `preparationValid` on the kernel, which §2 applies while _simultaneously_ moving `#pinned` onto the entity — the two are separable. The reason the pin actually stayed is F-349, which states the location is still **owed a reading**. A source comment that gives it a settled ground pre-empts that reading. The sentence is also grammatically broken at the colon.

### F-381 — three quantified statements in the measurement and ledger prose are false as written · tier C

1. **"`draft.phase` is assigned at no site in the package"** (D-181 `:1777`, `plan.md:2303`, second pass §6). **Verified at consolidation:** `transaction.ts:71` is the one assignment in `src/`. The true claim is _no site outside the call that commits_, which does hold and is what the arc rests on; as written a one-line grep falsifies it.
2. **"every row is 0.09 to 0.13 kB under its ceiling"** — over all fifteen rows slack runs 0.063 kB (`vocabulary root`) to 0.151 kB (baseline B). The range is correct over the thirteen kernel-carrying rows; the sentence quantifies over "every row".
3. **The accessor-undercount attribution.** `#handleMove`'s phase test is already one of the two reads D-181 counted, and `FrameTransaction.commit` invokes no accessor. `#begin`'s `current.operation` is the single uncounted site: 1 + 2 + 1 + 2 + 1 = 7. **The number is right and the account of it is not.**

### F-382 — `ArmOutcome` is a second dead name in the very list F-351 was raised about · tier C

`ArmOutcome` exists nowhere in `src/` but is carried by `vocabulary.node.test.ts:110`, `02` §792's Not-published row and `03` §1347 — all three edited by this range, in the same lines, to delete `SeamContext` and add `FrameTransaction`. F-351's content is that this list is an allow-list, so a dead entry widens it by one name and asserts nothing. A second dead entry on the adjacent line, visible in the same hunk, went uncorrected.

### F-383 — a rewritten internal comment narrates history with strikethrough · tier C

`tests/kernel/vocabulary.node.test.ts:146-149` strikes through a deleted name and narrates that it _"went with the slot it named a gap in (D-181)"_.

**Verified at consolidation**, with a correction to the citation. `documentation.md` §5.2 contains, verbatim: _"**No strikethrough.** A superseded sentence is deleted here."_ and _"**Argue for what is, never about what was.**"_ Both are violated and the finding stands on them. But the pass also presents as a §5.2 quotation a sentence — _"Do not narrate history: no 'used to', 'was changed', 'replaces', 'previously'… restate the reason, not its provenance"_ — which **appears nowhere in `documentation.md`**. Per the round's rule the finding is _incomplete, not false_: the claim is preserved on the two genuine verbatim rules, and the invented quotation is recorded here rather than propagated. The bare pointer `(D-181)` is permitted on its own; the clause built around the strikethrough is not.

The file has a pre-existing self-aware dialect of `~~name~~` markers that predates this range. What the range added inside it is the new historical narration.

### F-384 — the conjunct is not in the register the package maintains for its class, and the neighbouring rule that keeps one does not transfer · tier C

`COVERAGE.md` maintains **§Equivalent mutants — guards no test can falsify**, _"the register a later reader checks against the source"_. The identity conjunct is a confirmed equivalent mutant and is not in it; it is recorded in the dated Arc B section instead, argued from `CONTRIBUTING.md` §Definition of success rather than the package's own nearer rule.

**D-153's ground does not transfer**, which matters because it is the nearest precedent for keeping unfalsifiable machinery in this module: D-153 keeps the seam re-entry guard because _it is the instrument that keeps its own unreachability true_, and that guard **panics**. The identity conjunct does the opposite — a false reading routes `runCore` to `SEAM_INVALIDATED` through a silent `rollback` with no `notify`, so a broken assumption becomes a discarded transaction that reports nothing. It cannot pin its own unreachability, so D-153's ground (b) is unavailable to it.

### F-385 — five of the seven `control:` rows are, by their own doc's rule, values that should be omitted while the kernel arcs run · tier C

`measure.ts`'s `control` doc: _"**Omitted on a row a pass is expected to move**, which is every row that carries the behavior under change."_ Five of the seven declared controls sit on compositions carrying `kernel/kernel.js`, and the D-170 series is a sequence of kernel-tier passes. For such a pass the outcome is fixed before it runs — the five must be re-declared and the two that carry no kernel cannot move — so the "declared in advance" legitimacy test cannot fail and constrains nothing. `budget-rebases.md` names the failure mode itself: _a control declared on a row a change can reach is a budget wearing an exact number._ Probe A is the illustration: deleting an entire guard conjunct reddened exactly five rows out of 1360, all of them `control:` byte equalities.

Arc A and Arc B each re-declared the same five; Arc C and Arc D are still to come.

### F-386 — the ledger's account of the commits that carry no phase is wrong in count and in call shape · tier C · consolidator-derived

`00-index.md:1805`: _"`commit()` survives for the **two** commits that do not change phase, one of which is the sample path."_

**There are three**, and `reviewer`'s own §1 names all three without noticing the ledger says two: the sample commit at `:1841`, the action seam at `:2318`, and `runReleaseSeam` reaching `runCore`'s default at `:1898`. The contract traces themselves draw the third as `preparationValid(); commit() ← commit 2`.

**And `commit()` did not survive.** The landed signature is `commit(phase: Phase | null)` with **no default** (`transaction.ts:69`), so a bare `commit()` does not typecheck, yet eight live trace lines still spell it that way: `02:156`, `02:1809`; `06:187`, `:195`, `:347`, `:401`, `:462`; `challenge-response.md:276`. (Prose uses such as _"there is no behavior-callable `commit()`"_ are excluded — they are not traces.) This is the present-tense drift F-345's sweep exists to close, one call shape over from the one it swept for.

**Recorded as consolidator-derived** because no pass filed it; it was verified mechanically at consolidation, on the same ledger line that carries F-381's first limb. It converges with F-381 and F-378 on a shared cause — see [Convergence](#convergence-on-the-record-of-evidence).

## Routed to the architect

The consolidator mints no `D-` and settles no design question.

### Q-25 — Is the identity conjunct deleted, or kept under a stated rule?

F-376 establishes that the only stated ground has expired and that no register carries the owed reading; F-384 establishes that the package has a register for this class and a rule for keeping such a guard that nobody has applied. `cleanup-1` independently reaches the same disposition point. The choice between deleting the conjunct — which probe C shows typechecks clean and reddens no behavioural row, reverting `SeamDriver` to four collaborators — and keeping it under `COVERAGE.md`'s _cheap, and a second line of defence_ rule is a design call. **The five-collaborator shape is not an independent design position** and should not be consolidated as one: it is a consequence of the fork's outcome and reverts automatically if this resolves toward deletion.

### Q-26 — Where does enforcement of the transaction ownership boundary live?

The residue of F-375. The driver is handed the entity itself; `transaction.declaration.test.ts` pins `begin` and `retire` into its member set; nothing in the types or at runtime stops `seams.ts` calling either, and one transaction is opened by one collaborator and committed by another with no shared object enforcing the pairing. `begin` turns out to be instrumented thirty-four rows deep, so the coverage argument for a guard is gone. `retire(reset)` is the smaller and **still-unmutated** half. Whether an unenforced-but-instrumented boundary is worth closing is the architect's.

## Convergence

### On `#pinned`

Four findings from three passes reach the same subject by different routes: `cleanup-1` (unfalsifiable conjunct, five-collaborator shape contingent on it), F-376 (justification expired, obligation unbooked), F-384 (wrong register, neighbouring rule does not transfer), F-380 (source comment pre-empts the open reading). They are **not merged**: each names a materially different remediation unit — dispose of the conjunct, book the obligation, enter it in the register, correct the comment — and merging them would hide three of the four.

`cleanup-1` mints no id because it reports itself as confirmation of F-349/F-350. Its evidence was verified verbatim at consolidation (`COVERAGE.md:1129-1137`, including _"none, and none could be written"_), and F-349's unreachability claim survived **three independent derivations** this round — `reviewer`'s by hand, `der`'s probe A, and `cleanup`'s reading of the record — plus a fourth in the invalidated artifact. It is the best-established claim in the round.

### On the record of evidence

F-378, F-381, F-379 and F-386 are one systemic defect, not four coincidences: **quantified claims about the arc's own measurements were written from the surrounding prose rather than counted from the table beneath them**, and three of the four sit in `00-index.md`'s D-181 entry, two of them on the same line. Systematic rather than isolated does not change tier — it changes priority within C. The cheap common repair is that a quantified claim in a decision entry is counted from the table it quantifies over.

F-375 and F-377 are the same failure one severity up: a claim about the tree written from the plan rather than from the tree. Both are B because the record is an instrument later passes act on.

## Why `integrity` was silent, from its own lens

`integrity` returned an explicit null result over code where `reviewer` found a tier A regression and a tier B behavioural change. **That is explained from integrity's own question and boundaries, not from another pass's coverage.**

Its lens is whether the package remains coherent outside the immediate change, and its method was cross-referencing every claim in the contract and the amendments against the source, plus a full pinned suite run and a size-control run. F-373 and F-374 are invisible to both halves of that method by construction: **no contract sentence describes either path** — F-374's own point is that the record contains no sentence saying step 4 stopped running — so claim-cross-checking has nothing to check them against; and **no suite row observes either**, so the green run is consistent with both. Finding them required constructing a behavioural probe over the pre-`arm` and destroy-during-`arm` windows and executing it at both trees, which is the feature-proof method rather than the coherence method.

That is a real limit of the integrity method on an arc whose defects are in a window the contract does not describe, and it is worth recording as such rather than as a lapse. Integrity's positive results are pinned and stand: it verified the five-collaborator wiring, the seven phase-changing commits, the absence of `SeamContext` and stamp residue across `src/` and `tests/`, `tsc --noEmit` clean, 1300 passed / 60 skipped / 0 failed, and zero control violations — all in a clean isolated worktree at `25be674c`.

**One caveat on that pass.** It self-disclosed incidental partial exposure to `arc-b-feature-proof-claude.md`, the invalidated artifact, through a `git diff` run to check for post-range drift. Its null result therefore **cannot serve as independent confirmation** of anything in that artifact. Nothing in this summary relies on it for that purpose.

## Comparison with the invalidated artifact

[`arc-b-feature-proof-claude.md`](arc-b-feature-proof-claude.md), from commit `2b679844`, was produced under an invalid review run and is **not authoritative**. The four passes derived their findings without it — `reviewer`, `cleanup` and `der` were instructed not to read it and did not; `integrity`'s partial exposure is disclosed above. It was consulted only at consolidation, as a source of hypotheses to test mechanically. Every claim adopted below was re-derived at `25be674c`.

| Claim | Tier as filed | Outcome |
| --- | --- | --- |
| `arc-b-1` — `!bracket.closed` reddens **five** rows at `185fb371`, so F-348's basis does not reproduce | B | **Does not reproduce.** `reviewer` re-ran it at `185fb371`: **0** failed / 1047 passed, clean control 0. `COVERAGE.md`'s **none** reproduces exactly and F-348's tier-B basis holds. `reviewer` additionally ran `202581c6` — the range's first commit, which adds the row and touches no source, over bytes identical to `185fb371` — where the same mutation reddens exactly **one** row. The gap F-348 names is real on the tree it names and the repair is real on the tree that carries it. |
| `arc-b-2` — F-350's degradation is loud, not invisible | C | **Reproduces, and is stronger than filed.** Independently re-derived at 34 rows. Landed as **F-375**, at tier **B** — assigned by consequence (an instrument the repository relies on is unsound), not by the artifact's tier and not by vote. |
| `arc-b-3` — Brotli twelve, not thirteen | C | **Reproduces.** Independently found by `reviewer` and verified at consolidation. Landed as **F-378**. A genuine cross-run confirmation rather than a shared error. |
| `arc-b-4` — three of fifteen mutation rows understate their red-set | C | **Does not reproduce as filed.** `reviewer` ran all fifteen individually and each reddened exactly the rows `COVERAGE.md` names. The one substantive case is a **label ambiguity** `reviewer` identified and resolved: _the retired frame not handed back_ reddens one row read as the copy the row's own text names, two read as dropping the reassignment. That is a question of which mutation the label denotes, not an understated count. |
| `arc-b-5` — the no-phase commit count and call shape are wrong | C | **Reproduces, and was missed by all four passes.** Verified at consolidation. Landed as **F-386**, consolidator-derived. |

**Net.** The invalidated artifact's only tier B does not reproduce; two of its four tier C findings do; one does not; one is a finding this round would otherwise have shipped without. Its exclusion cost the round one finding and saved it from one false one — which is the argument for having derived independently first and compared afterwards, rather than reviewing against it.

## How the round was run, and one defect in it

**The `der` pass ran mutation probes against production source in the shared main checkout.** Four probes, each a live one-line edit to `src/kernel/kernel.ts` or `seams.ts`, while three other passes were reading and running tests against that same tree.

The cost was not hypothetical. The `integrity` pass hit reproducible false test failures, lost time tracing them, and had to re-derive its entire result in a separate worktree. It attributed the dirty file to the `cleanup` pass — explicitly as a guess — and that misattribution was relayed by the consolidator and put to `cleanup` directly. `cleanup` had run no mutations and made no source edits; its account was accurate and it is cleared here. The consolidator reverted the mutant at `kernel.ts:2079` mid-probe, killing a `der` run, and in doing so destroyed the file's mtime, which would have dated the edit.

`der` owned it without qualification, moved to an isolated worktree detached at `25be674c`, **discarded all four shared-checkout runs**, re-ran and pinned every one, and recorded a per-probe protocol with the tree verified at zero dirty entries between probes. Its apology to `integrity` and `cleanup` is carried here at its request. Every `der` figure in this summary is from the pinned worktree.

The proposal `der` first made — that other agents ping it before reverting, rather than it isolating — was declined, and the reason is worth recording: an in-flight probe and an abandoned mutant are byte-identical, so no other agent can verify which one it is looking at before deciding whether to restore the tree, and a `git checkout --` after each run protects nobody, because the window between mutation and revert is exactly when other passes read.

**This mints no `F-`.** It is a defect in how this round was run, not in the code under review.

Two smaller process notes. `integrity`'s completion report gives `LSP plugin - unavailable` while stating it never probed via `ToolSearch`; "unavailable" without a probe is not one of the three permitted statements, and the correct one would have been the not-used form with a reason. `cleanup`'s first account of its own innocence argued partly from its toolset excluding `Edit`, which is not dispositive — `Bash` was available and it used it to amend its own report; it accepted the correction and its artifact now leads with the checkable `git status` claim.

## Verification performed at consolidation

Not a fifth review pass — validation of specific claims, and a narrow investigation where the evidence separated two findings.

- **`.phase` assignment sweep.** The only assignment in `src/` is `transaction.ts:71`; every other match is a `===` comparison. Confirms F-381(1) and half of the phase-provenance claim.
- **The seven phase-changing commits, re-derived.** Six _lexical_ `commit(` sites are not the witness — three further phase-changing commits route through the driver's single `this.#frames.commit(phase)` at `seams.ts:312`. Four direct (`PENDING` `:1035`, `FINALIZING` `:1618`, `RELEASING` `:1891`, `ACTIVE` `:2079`) and three through the driver (`ACTIVATING` via `runActivationSeam` `:1316`, `SETTLING` `:1693`, `REPORTING` `:2186`); three paths pass `null` explicitly. The consolidator's initial six-site count was the wrong witness for the claim attached to it, and is recorded here because the correction is the point: **a mechanical witness must prove every claim attached to it.**
- **F-373 and F-374 confirmed statically**, independently of the probes that found them.
- **F-377 confirmed** against `kernel.ts:589`/`:613`/`:679`/`:687` and `transaction.ts`'s `retire`.
- **F-378 confirmed** by counting `arc-b.md`'s own table.
- **F-383's rule confirmed verbatim and its second citation falsified** against `documentation.md`.
- **F-386 derived** from `00-index.md:1805`, `transaction.ts:69` and a `commit()` grep over the three trace documents.
- **F-375 separated from der's probe C** by putting the specific counterfactual to `reviewer` for execution rather than resolving a contradiction by preference.
- **The working tree was restored and verified** byte-identical to `25be674c`, and a watch was armed over `packages/drag2/{src,bench,.scripts,tests}` for the remainder of the round.

## Scope of the round

**Covered**, with evidence executed rather than read: the full code diff statement by statement; phase provenance at every site; the five-collaborator wiring and the `#pinned` fork; `arm()`'s composition, unwind and `#spec` ordering; B-0's evidence gate re-derived at `185fb371`, `202581c6` and `25be674c`; all fifteen tabulated instrument mutations run individually; the fifteen-row byte table re-derived on both trees from `measureAll()` after rebuilding each; `corpus-equivalence.ts` executed; the contract sweep across `00`, `02`, `03`, `06` and `challenge-response.md`; the full decision projection, 181 live rows and 85 retired, read end to end; four independent mutation probes; two behavioural probes at both trees.

**Not covered**, stated so a silent area is distinguishable from a clean one:

- **M-1 and M-1′ timing medians were re-run by nobody.** The record's own reading is a declared null result at a 0.0977 µs quantum. The consolidated position is that the timing table is **taken as recorded, not verified**.
- **The per-sample accessor counts (9.12 / 7) were not reproduced** by any pass in this round. `reviewer` derived the free-drag figure of 7 by hand from the source and it agrees exactly; the sortable's 9.12 was not attempted. The probe that produced them was temporary by the measurement's own statement.
- **F-352's thirteen `queue.*` lines in `00-index.md`** were confirmed to be thirteen and absent from `src/`, but not read individually — that is the finding's own deferral.
- **`retire(reset)`'s ownership half is argued, not mutated** — the residue of Q-26.
- `src/sortable/`, `src/free-drag/` and `src/shared/` internals, which the range does not touch; Arc C's `settlementInput` half, Arc D, C4 and O-3, all outside the range.

**Suite state at `25be674c`, pinned:** 1296 passed, 60 skipped, 4 failed — three `consumer.node.test.ts` packaging rows that reproduce identically at `185fb371` in the same worktree shape, and one load-flaky `m5.browser.test.ts` arm that passes in isolation on both trees. **Nothing in the range reddens a row.**