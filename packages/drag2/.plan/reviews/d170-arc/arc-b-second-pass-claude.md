# Arc B — second architecture pass

**Subject** [D-181](../../contract/00-index.md) and [`arc-b-frame-transaction-claude.md`](arc-b-frame-transaction-claude.md), treated as a candidate architecture rather than settled ground. **Derived at** `8fbe8453` on `drag2/fin-review`. **Amends D-181; mints nothing.** No production source or test is touched by this pass, and Arc B is not implemented.

**The verdict in one line.** D-181's two load-bearing claims — the driver holds the transaction rather than becoming it, and the phase becomes an argument of the call that commits — **hold and are ratified**; but the entity's boundary was drawn one member too wide, `#pinned`'s disposal was decided on an argument the tree contradicts, `arm()`'s install point breaks a partial unwind, and three amendment sites and one instrument were missed.

## 0. Re-verified against this tree, independently

| Fact | D-181 says | This tree at `8fbe8453` |
| --- | --- | --- |
| `this.#current` / `this.#draft` occurrences | 57 + 2 / 22 + 2 | **59 / 24** — confirmed |
| `this.#pinned` occurrences | five lines | **4** (`this.#pinned`) plus the declaration at `:388` — confirmed: one write in `#begin`, one read at `:550`, two clears at `:649` and `:724` |
| `#preparationValid` callers | three | **two call sites** — the context literal at `:884` and `#activationPolicy.committed` at `:1288`; three _readings_, since the context member is called twice inside `runCore` |
| stamped seams | three | **confirmed** — `:1390` `ACTIVATING`, `:1765` `SETTLING`, `:2261` `REPORTING`; the release seam at `:1972` and the action seam at `:2390` are unstamped, and the action site is the one that passes `effectStage` |
| direct `draft.phase` writes | four | **confirmed** — `:1102` `PENDING`, `:1687` `FINALIZING`, `:1958` `RELEASING`, `:2153` `ACTIVE` |
| `#scrub` calls | not counted | **six, in three pairs** — `#retireOperation` `:624-625`, teardown `:715-716`, `arm()`'s unwind `:2573`/`:2577`. **Each writes a committed frame in place.** |
| `arm()` ordering | not stated | `#spec = next` **first**, `#current` at `:2544` (`composed = 1`), `#draft` at `:2546` (`composed = 2`), listeners after |
| `seams.node.test.ts`'s validity | "a hand-written `SeamContext` fake" | `:77` is **`preparationValid: () => valid`, a flag** — so none of the 87 rows exercises any of the kernel's three conjuncts |

## 1. Ratified without change

**The merge is refused.** The one-directional read is real and the answer to one-directional reads in this codebase is a held reference, settled at D-180. The frame pair reads nothing of `#openStage`, `#failureRequested`, `#unclassifiedReason`, `#staged` or `#reentry`; `#begin` is reached from five places, one of them the bracket's `beginPass`, so under a merge the execution bracket's ingress callback would open a seam-driver method. Ratified. (§8 corrects the _third_ reason D-181 gives, not the conclusion.)

**The stamp deletion.** `#runStamped` arms a slot, `#begin` hands it over, `#commit` consumes it, and the whole apparatus exists because the phase must land between `preparationValid()` and the swap where the kernel has no statement. An argument of the call that commits cannot outlive the call, so the prose proving it cannot is unstatable. Ratified — and **strengthened by a fact D-181 did not use**: the stamp is a slot whose safety depends on nothing else beginning a transaction inside a stamped region, which is why [`02`](../../contract/02-kernel-behavior-contract.md) §240 lists it among the state _written against_ the non-reentrancy guarantee. That is not a prose cost; it is a live coupling, and it is what makes the deletion worth its own step. §7 enlarges the deletion's scope.

**The three classifications that stay on the kernel**, and the rule under them. `#reporting`'s only reader is `#failOperation`'s guard at `:847`, beside `#current.phase === REPORTING` and covering a different interval; `settlementInput`'s only reader is `#settlementTransition.prepare` at `:1454`; `#actionTag`/`#actionArgument`'s only readers are `#actionTransition`'s three at `:1425`, `:1428`, `:1435`. None is read from the transaction side. **Coincident lifetime is not ownership** — ratified, and §2 applies it to one field D-181 exempted.

**`SeamContext` dissolves.** Ratified as a conclusion. §2 changes what the driver receives in its place.

**The sequence's shape.** B-1 in place, B-2 relocational, nothing converted twice. Ratified; §5 and §7 change what is inside each step.

**The `FrameTransaction` name.** `Transition` is a **published** type name — [`vocabulary.node.test.ts:90`](../../../tests/kernel/vocabulary.node.test.ts) lists it in the published set — so declining the bare `Transaction` is right for a stronger reason than proximity.

## 2. Amendment — `preparationValid` does not move, and the entity owns only its own conjunct

D-181 puts `preparationValid` on `FrameTransaction` and gives the entity two foreign edges to feed it: the execution bracket, and a closure over the operation's cancel latch. **That is the rule D-181 itself uses three paragraphs earlier, applied everywhere except here.**

Read the predicate's three conjuncts by owner:

| Conjunct | Owner |
| --- | --- |
| `!this.#bracket.closed` | the **execution bracket** — D-180's entity, whose whole point is that it owns the latch |
| `!this.#operation?.cancelRequest` | the **operation record** |
| `this.#current.operation === this.#pinned` | the **frame pair** |

Two of three are foreign readings. An entity that reaches out for two-thirds of a predicate does not own it; it _composes_ it, and composition across three owners belongs to whoever holds all three — the kernel. **Coincident use is not ownership either.** D-181 keeps `settlementInput` off the entity because its only reader is a kernel adapter; by the same test, closure and cancellation are read here and owned elsewhere.

**So the entity exposes its own conjunct and nothing more.** `FrameTransaction` answers `operationUnchanged(): boolean` — _is the committed frame's operation still the one the last `begin()` pinned_ — an invariant spanning exactly `#pinned` and `#current`, both its own. `Kernel` keeps `#preparationValid()` as the three-way conjunction, unchanged in name, callers and reading.

**The driver then takes four arguments: `new SeamDriver(frames, preparationValid, fail, notify)`.** `SeamContext` is still deleted — D-181's own reasoning ("callbacks with no relationship to each other are a parameter list, not a type") does not stop being true at three — and `notify` is still the closure `#report` already is.

**Four things this buys, each of them a cost D-181 was carrying without pricing it.**

1. **The entity holds no reference to anything.** No bracket, no operation closure, no lifecycle edge. It is the pair, the swap and the pin, and it changes when the frame model or the commit protocol changes. That is the reason-to-change story D-181 tells about it and, under D-181's own shape, would not have been true.
2. **It is stable under §3's gate.** If the identity conjunct turns out to be unreachable, `operationUnchanged()` and `#pinned` are removed together and _nothing else about the entity changes_. Under D-181's shape the entity would be left holding a three-way predicate with none of its own conjuncts in it.
3. **The 87 rows of [`seams.node.test.ts`](../../../tests/kernel/seams.node.test.ts) keep their mechanism.** `:77` is a flag, not a fake frame pair; under this amendment the harness gains a real `FrameTransaction` for `begin`/`commit`/readers and keeps the flag for validity. Under D-181's shape the flag has to be replaced by a real closed `ExecutionBracket` or a real cancel closure at five rows (`:304`, `:381`, `:652`, `:822`, `:1537`), **and the identity conjunct becomes unreachable from the node harness altogether** — because invalidating it means writing `current.operation`, which D-181's own instrument row exists to make impossible.
4. **The contract traces do not move.** [`06`](../../contract/06-vertical-sortable-trace.md) `:285`, `:321`, `:401`, `:462` and [`02`](../../contract/02-kernel-behavior-contract.md) `:1809` write bare `preparationValid()`. It stays the kernel's, spelled the same.

**The cost, stated.** `runCore`'s protocol — `begin → prepare → preparationValid → commit → effect` — is served by two sources rather than one, and the reader must know the predicate closure and the entity are coordinated. That coupling is real, it is what `#pinned` _is_, and it is the same coupling the tree carries today through `SeamContext` without trouble. It is the smaller price.

## 3. Amendment — the identity conjunct's coverage is a fork in B-2, not a prerequisite for it

D-181 requires, before B-1, that each of `preparationValid`'s three conjuncts be dropped in turn and each redden a distinct row. **That instrument is right and it is under-used**: its result decides whether `#pinned` may be moved at all.

**Why the third conjunct is in doubt.** `#retireOperation` scrubs both frames at `:624-625` — and `frame(target)` resets `operation` to `null` — **and then** clears `#pinned` at `:649`. So after a retirement both sides are `null` and the conjunct reads `null === null`, **true**. The conjunct can only be false in a window where `current.operation` changed while `#pinned` did not, and the reachable reentrant acts inside a seam are `cancel()` — which sets `cancelRequest` and queues, caught by conjunct two — and `destroy()` — which closes the bracket and, at depth > 0, **defers** physical teardown, caught by conjunct one. The only writers of `current.operation` are admission, which `runIngress` refuses reentrantly, and the scrub. **I could not construct a reachable path that conjunct three catches and the other two do not**, and no instrument in the tree asserts one: `seams.node.test.ts` fakes the predicate wholesale, and `kernel.browser.test.ts` names it only in a comment at `:1342`.

**So the pre-check becomes a fork, and the arc must not resolve it by moving the field.**

- **A row reddens for conjunct three alone** → `#pinned` and `operationUnchanged()` move to the entity as §2 describes.
- **No row does, but a reachable path exists** → the row is written first, against the current tree, and then the move proceeds.
- **No reachable path exists** → **`#pinned` and the conjunct do not move.** They stay exactly where they are, and Arc B records a finding: machinery for a state not reachable through correct use, which `CONTRIBUTING.md` §Definition of success refuses on its first limb. The entity ships with `begin`, `commit`, the two readers and `retire`, and is no worse for it.

**The third arm is a refusal to launder.** Moving a guard into a new entity in the same commit that would justify deleting it makes the deletion unreviewable afterwards, and D-170's _nothing is converted twice_ argues the same way: a field that may be deleted is not first relocated. Deleting it is also not Arc B's to do inside an extraction — it is a separate reading with its own evidence.

## 4. Amendment — the committed frame is written at retirement, so the entity needs one more operation than D-181 gives it

**`#scrub(target)` mutates a frame in place**, and it is called on the _committed_ frame at three sites. D-181's instrument row — _`current` is not writable through the reader; mutation: widen the accessor's return type_ — is correct and is in direct tension with it: a `Readonly<Frame<Part>>` reader cannot serve `#scrub`. D-181 does not say how teardown reaches the pair, and every improvisation available to an implementer at that point damages something: a writable reader makes the instrument row vacuous, and a second untyped accessor is the same thing spelled longer.

**The entity gets one operation for it: `retire(reset: (frame: Frame<Part>) => void): void`** — apply the caller's reset to both frames. The two unconditional call pairs (`#retireOperation`, teardown) become one call each; `arm()`'s conditional pair is handled by §5. The kernel keeps `#scrub`, which is where the `#spec` guard and the `#unwind` wrapper belong.

**And that supersedes D-181's §7 entirely.** D-181 weighs _delete the two `#pinned = null` clears_ against _add a `release()` for them_, and rejects the second because it would exist only for those clears and would owe a `WeakRef` retention row for one `Readonly<{ id: number }>`. **The member exists anyway**, for the frame scrubs, and both `#pinned` clears sit at sites that already scrub both frames. So the clear rides along as one statement inside `retire`, at zero new members, zero new rows and zero behaviour change — and Q-21/F-322 is satisfied structurally rather than argued.

**D-181's deletion was not behaviour-preserving, which is the reason to be glad of the alternative.** Its §7 claims _no read can observe a value an earlier transaction wrote_. That is true of the reads, and it is not the whole claim: deleting the clears leaves `#pinned` holding a retired identity while the scrub nulls `current.operation`, so the conjunct flips from **true** to **false** across a retirement. Nothing reads it there today — which is exactly §3's doubt — but D-181 asserts preservation where it should have asserted unreachability, and the two are not the same warrant. The falsifiable-edge paragraph and the P-02 retention note go with it.

## 5. Amendment — `arm()` composes into locals and constructs the entity; the unwind never reads a field

D-181: _`arm()` composes the pair and installs it … handing it a composed pair satisfies all three and leaves `arm()`'s unwind whole._ **It does not leave the unwind whole.** The unwind scrubs `this.#current` when `composed > 0` and `this.#draft` when `composed > 1`, and the second frame's composition runs behavior code (`next.createFramePart()`) that may throw. So there is a real state — one frame composed, one not — in which an install-the-pair-once design has installed nothing, and the field the unwind reads is unassigned. The comment at `:2568` says what is at stake: _a part that already holds a DOM reference would otherwise be retained by the controller for good._

**Required property.** `arm()`'s unwind resets exactly the frames that physically exist, without reading any field the successful path has not yet written. **Compose into locals, reset the locals on the unwind, and construct the entity once from both.** `composed` becomes two nullable locals and disappears with the counter — which is a simplification the extraction forces rather than an optional extra, and it removes the one place in `arm()` where a count stands in for a fact.

**Construct, do not install.** With the pair available at construction, `FrameTransaction` has no half-built state, no definite-assignment inside it, and no `install` member — a name [`01`](../../contract/01-construction-ownership.md) `:5` and `:195` list among probe 1's rejected `Kernel` surface, which is a reason to not reintroduce it even privately.

**And one window must be closed with it.** Teardown's frame scrubs are guarded by `if (this.#spec)`, and `arm()` assigns `#spec = next` **before** composing. Today a `destroy()` raised from inside `createFramePart()` reaches a scrub that reads an unassigned field, and `frame(undefined)` allocates a throwaway — harmless. After the extraction the same read is a method call on `undefined` and throws inside teardown. **Required property: `#spec !== null` implies both frames exist.** The cheapest closure is to let `#spec` name the behavior only once the pair it owns is composed, and to have the unwind reset its locals directly rather than through `#scrub`'s spec guard.

## 6. Amendment — every commit that changes phase takes the phase; `draft.phase` is assigned nowhere

D-181 changes the three _seam_ phases and leaves the four direct `draft.phase = …` statements alone, so the contract traces would carry **two spellings for one act**: `draft.phase = ACTIVE; commit()` at `06:324` beside `commit(SETTLING)` at `06:546`. There is no semantic difference between them — the stamp exists only because the kernel has no statement inside a seam, and once the phase is an argument that reason is gone everywhere.

**All seven phase-changing commits take the phase.** `commit()` with no argument survives for the two that do not change phase: `#handleMove`'s sample commit and the action seam. `draft.phase` is then assigned at no site in the package.

**The reason is D-170's, not tidiness.** `commit`'s signature is changing in B-1. Leaving four call sites to a later arc converts `commit` twice, which is the rule Arc A was decided under and Arc B claims to follow. It also makes D-181's own instrument row — _the phase a commit carries is written by that commit and no other_ — say what it appears to say.

**Signature constraint, since D-181 names one and it is the harder one.** `runCore` already carries `effectStage = stage`, and the one call site that passes it (`#handleBehaviorAction` at `:2390`) is one of the two that pass no phase. A trailing optional phase forces the three stamped sites to restate `stage` to reach past it. Placing the phase **before** `effectStage`, as `Phase | null` defaulting to `null`, costs one explicit `null` at that single site and nothing anywhere else. `NO_STAMP` and `ArmedStamp` still go; what remains is a nullable parameter, not a module constant and a type alias. The choice is the implementer's; the property is that no state carries a phase between statements.

## 7. Amendment — one instrument and three amendment sites D-181 missed

**[`tests/kernel/vocabulary.node.test.ts`](../../../tests/kernel/vocabulary.node.test.ts) `:109` lists `'SeamContext'`** under `INTERNAL['the seam driver']`, cross-checking [`02`](../../contract/02-kernel-behavior-contract.md) §What stays internal. D-181's §8 declares which instruments must not change and does not name it; deleting the type reddens it. It is not a defect — it is the instrument working — but an unlisted red row in B-2 is indistinguishable from a regression at the moment it appears.

**The traces are four, not two.** D-181 names [`06`](../../contract/06-vertical-sortable-trace.md) `:546` and [`challenge-response.md`](../../contract/challenge-response.md) `:326`. Also live: **[`02`](../../contract/02-kernel-behavior-contract.md) `:1339`**, the same `preparationValid(); draft.phase = SETTLING; commit()` inside the contract itself, and **[`06`](../../contract/06-vertical-sortable-trace.md) `:286`**, `draft.phase = ACTIVATING; commit()`. Under §6, the remaining phase-writing traces move with them — `02` `:529-530`, `:1442`, `:1801-1802`; `06` `:168-169`, `:324`, `:431-432`, `:656`; `challenge-response.md` `:272-273`.

**This is F-345's failure mode, committed by the document that invokes F-345.** D-181 requires the sweep to be run over the whole contract tree rather than over its own list of sites, and then supplies a list of sites that is missing half of them. The list above is not the fix either; **running the sweep at B-5 is**, and these are named so that nothing found here is lost if the sweep is run differently.

**And §240's amendment gets a sharper sentence than D-181 gives it.** _The list shrank because a dependant stopped being a slot_ is right and stops one step early. What the entry has to say is that the phase is no longer carried in **state** at all, so non-reentrancy has nothing left to protect there — the guarantee is untouched and has one fewer dependant. The other three entries, `actionTag`/`actionArgument`, `failureRequested`/`unclassifiedReason` and `consumeStaged`'s clear-on-open, are unaffected, which §1's classifications and D-181's own are consistent about.

## 8. Correction to a rationale that survives its own repair

D-181's second reason for refusing the merge — _the pair changes when [`04`](../../contract/04-frame-slicing.md)'s frame model changes and the driver when [`02`](../../contract/02-kernel-behavior-contract.md)'s failure discipline does, which is two reasons in two documents_ — **is not sound as written**, and it is what let the entity be drawn one member too wide. The transaction protocol is `02`'s subject too: `02` §240 is where revalidate-then-commit and the phase discipline live. The honest statement is that the transaction changes with the **frame model and the commit protocol**, and the driver with the **failure and phase policy** — still two owners, still separate, and no longer an argument that admits `preparationValid` by accident.

**The refusal stands on its other three grounds**, all verified here: the read is one-directional and this codebase answers that with a held reference; the pair has non-driver users including the bracket's `beginPass`; and the stamp deletion never depended on the merge.

## 9. Measurement — the question is accessor-versus-field, and one answer is closed in advance

D-181 states six accessor invocations per `ACTIVE` sample against three private-field accesses leaving with the stamp, and declines to predict the direction. Ratified, with the estimate re-derived at implementation because it is per-path — the threshold branch of `#handleMove` reads `#current` four more times and does not run on a sample.

**What the measurement is actually testing should be named.** A getter returning `this.#current` is a call where a field read stands today, and the alternative that removes the cost entirely — a public data property reassigned by the swap, which is a plain property read — is **closed by D-170 §The ownership boundary**, which forbids a mutable public field. So the run is not choosing between two designs; it is pricing a constraint the record already accepted, and a regression it finds is an argument about D-170, not about Arc B. Saying so before the numbers arrive is what stops the result from being read as a referendum on the extraction.

Otherwise unchanged: M-1/M-1′ at 50 and 200 rows with the retained-heap arm, baselined against the commit that decides the arc and changes no source; Brotli on all ten compositions with the two kernel-free ones as controls at exactly 0; no budget re-base without the record's usual justification.

## 10. The amended sequence

**B-0 — the pre-checks, and one of them is a fork.** Swap `#activate`'s, `#openSettlement`'s and `#handleFailed`'s phases: each must redden a row, and any that reddens nothing is a row written here, against the current tree. Drop each of `preparationValid`'s three conjuncts: each must redden a distinct row. **The third conjunct's result selects B-2's arm under §3.**

**B-1 — delete the stamp, in place.** `commit` takes a phase; all seven phase-changing commits pass one; `draft.phase` is assigned nowhere; `runCore` and `runActivationSeam` thread it; `#armedStamp`, `#stamp`, `#runStamped`, `NO_STAMP` and `ArmedStamp` go. No entity, nothing moved.

**B-2 — extract the frame transaction.** `transaction.ts`; `#current`, `#draft`, `#begin`, `#commit` move, with `#pinned` and `operationUnchanged()` under §3's fork; `retire(reset)` serves the three scrub pairs and carries the `#pinned` clear if the field moved. `Kernel` keeps `#preparationValid()` and `#scrub`. `SeamContext` is deleted; `SeamDriver` takes `(frames, preparationValid, fail, notify)`. `beginPass` re-points. `arm()` composes into locals, resets locals on the unwind, constructs the entity once, and establishes `#spec !== null ⟹ both frames exist`. `seams.node.test.ts` gains a real entity and keeps its validity flag.

**B-3 — the instrument.** D-181's five rows to F-346's standard, plus whatever B-0 found missing, tabulated in `COVERAGE.md`. The reader-non-writability row is now compatible with teardown because `retire` exists; the phase-provenance row is now non-vacuous because §6 leaves no other writer.

**B-4 — the measurement**, as `arc-b.md`, with §9's framing stated before the numbers.

**B-5 — the record.** `02` §240 with §7's sentence; `02` §792, `03` §1347 and `vocabulary.node.test.ts` losing `SeamContext`; the phase-writing traces; F-345's sweep run over the whole contract tree rather than over any list, including this one.

## 11. What this pass changes about Arc C

Nothing beyond what D-181 already changed. `settlementInput` still leaves the transaction's account, and where it lands — the operation record, `#attempts`, or a bare kernel field — is Arc C's reading and is **not** decided here; D-181's _a bare kernel field_ is an input to that arc, not a constraint on it.