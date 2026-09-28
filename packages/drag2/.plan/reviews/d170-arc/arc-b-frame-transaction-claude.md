# Arc B — the frame transaction, re-derived after Arc A

**Subject** the C2 direction accepted in [`entity-model-adjudication-claude.md`](../architecture/entity-model-adjudication-claude.md) §2, §3 and §9, read with [D-177](../../contract/00-index.md) and with Arc A landed. **Derived at** `46b85d92` on `drag2/fin-review`. **Mints** D-181. **Nothing is implemented**, and no production source or test is touched by this pass.

**The verdict in one line.** The frame pair and the stamp deletion both survive, but the entity C2 proposed — a merge of the seam driver with the frame pair — is refused by the same disjointness test my own adjudication used to keep the bracket separate, so Arc B is an extraction plus a held reference rather than a merge; three field classifications do not survive the current tree; and one of the adjudication's disagreements with the original subject was wrong.

## 0. Verified against this tree

| Quantity | At `b73b6779` | At `46b85d92` |
| --- | --- | --- |
| `this.#current` | 57 reads, 29 members | **57 reads, 2 writes, 30 members** — unchanged in count, and both writes are in `#commit` |
| `#handleMove`'s reads of it | 6 | **6**, unchanged |
| `this.#draft` | — | **22 reads, 2 writes, 12 members** |
| `#pinned` | — | **five lines: one declaration, one write in `#begin`, one read in `#preparationValid`, two clears** |
| The stamp | `#armedStamp`, `#stamp`, `#runStamped` | unchanged: 5 + 5 lines, `#runStamped` with **three** call sites |
| `runCore` call sites | — | **five** — three in `kernel.ts`, two inside `seams.ts`'s own helpers. **Three are stamped**: `#activate` through `runActivationSeam`, `#openSettlement`, `#handleFailed` |
| Direct `draft.phase` writes outside `#commit` | — | **four** — `PENDING`, `ACTIVE`, `RELEASING`, `FINALIZING` |
| `SeamContext` | 7 members, 5 reaching the frames | **7 members; the driver reads `begin`, `readDraft`, `preparationValid`, `commit`, `readCurrent`, `notify` and `fail`** — five of the seven are the frame pair |
| `seams.node.test.ts` | — | **87 rows**, built on a hand-written `SeamContext` fake |
| `#preparationValid`'s conjuncts | — | `!#bracket.closed && !#operation?.cancelRequest && #current.operation === #pinned` — **Arc A already re-pointed the first** |

**Two facts decide most of what follows.** The phase is written **two ways** — four direct `draft.phase = …` statements the kernel makes itself, and three seams whose phase must land between `preparationValid()` and the swap, where the kernel cannot reach. And `#settlementTransition` is **one object run at two phases**, `SETTLING` from `#openSettlement` and `REPORTING` from `#handleFailed`, which is why the phase cannot ride on the transition and must be an argument of the call.

## 1. What Arc A settled that Arc B inherits

**`beginPass` is already wired to `#begin`.** [`kernel.ts:342-355`](../../src/kernel/kernel.ts) constructs the bracket with four closures, the fourth being `() => { this.#begin(); }`. D-180 required that shape so Arc B could satisfy it without re-plumbing, and it does: **Arc B changes one line inside an existing closure.**

**`#preparationValid` already reads `this.#bracket.closed`.** The adjudication's §2 correction — the transaction holds the bracket rather than calling up through the kernel — is half landed already; Arc B moves the predicate to the entity and the reference with it.

**F-346 set the instrument standard**, and Arc B is held to it: _every row has a mutation that reddens it and no other row_, tabulated in `COVERAGE.md`. **F-345 set the prose standard**: the required property is re-run over the whole contract tree, not over the finding's own list of sites.

## 2. The entity is not the merge, and the reason is my own test

The adjudication's §3 argues the stamp deletion from a merge: _once the driver **is** the transaction, the phase is not a foreign concern_. Applying §2's own disjointness test to that merge refuses it.

**Does the driver read the frame pair?** Heavily — **five of `SeamContext`'s seven members are the pair**, and `runCore`'s whole body is `begin → prepare → preparationValid → commit → effect` over it.

**Does the frame pair read the driver?** **No.** `#begin`, `#commit` and `#pinned` never touch `#openStage`, `#failureRequested`, `#unclassifiedReason`, `#staged` or `#reentry`.

That is not disjoint; it is **one-directional** — which is exactly the bracket-and-transaction relationship, and §2's answer there was _two entities and a held reference_. The same answer is owed here. Two further facts settle it:

- **Two reasons to change, in two contract documents.** The frame pair changes when the frame model changes ([`04`](../../contract/04-frame-slicing.md)); the driver changes when the failure and phase discipline changes ([`02`](../../contract/02-kernel-behavior-contract.md)). Under a merge they share one `this`.
- **The frame pair has non-driver users**, and one of them is Arc A's. `#begin` is called from `#handleMove`, `#closeOperation`, `#handleStartCommitted`, `#joinSettlement` and **the bracket's `beginPass`**. Under a merge, the execution bracket's ingress callback would reach into the seam driver to open a frame transaction — which reads as the bracket starting a seam, and is not what happens.

**And the stamp deletion does not depend on the merge.** What deletes it is the phase becoming an argument of the call that commits; a driver holding a frame pair whose `commit` takes a phase can pass it exactly as a merged entity could. The adjudication's premise — that the phase is foreign to a separate driver — was true of the **factory** era, where the driver received an opaque `SeamContext` it could not extend. A held entity is not that.

**So: `FrameTransaction`, `src/kernel/transaction.ts`, controller lifetime; `SeamDriver` stays in `seams.ts` and holds one.**

**On the name.** D-180 reserved _transaction_ for this arc. The bare `Transaction` is declined anyway: `Transition` is two letters away and is named in `runCore`'s own signature, in the same subsystem, at every seam. `FrameTransaction` is what it is — the pair, the swap, and the validity of a preparation taken over it.

## 3. The classification, field by field

### Moves to `FrameTransaction`

**`#current` and `#draft`.** The swap is the entity's central act; 57 + 22 reads re-point. `#begin`'s and `#commit`'s own accesses become private-field reads **inside** the entity, so the per-sample cost is only what the kernel still reads from outside — §10.

**`#pinned`.** It answers _did the operation identity change between the moment this preparation opened and now_ — a before-and-after over the entity's own `current`, with no meaning outside a transaction. Written by `begin`, read by `preparationValid`, and by nothing else. §7 disposes of its two clears.

**`#preparationValid`, `#begin`, `#commit`** as members. The kernel's `#preparationValid` disappears; its two callers become `this.#frames.preparationValid()`.

**The bracket reference and the cancel reading**, as constructor arguments. The first is the adjudication's §2 correction; the second is §4.

### Deleted

**`#armedStamp`, `#stamp`, `#runStamped`, `NO_STAMP`, `ArmedStamp`, the two-half handover and its `finally`** — §6.

**`SeamContext`** — §4.

### Stays on the kernel — and two of these are corrections

**`#reporting` stays, and does not move to the transaction as the adjudication allowed.** Its span is deliberately wider than any transaction's: set at `:2258` before the seam opens, cleared in a `finally` at `:2270` that also covers `#dropStaged()`. It names _which seam is running_, which is the kernel's phase-table concern, and **nothing on the transaction side reads it**. `#failOperation`'s guard reads it beside `#current.phase === REPORTING` precisely because the two cover different intervals.

**`#actionTag` and `#actionArgument` stay, and the question is closed rather than measured.** The adjudication left it as _measure or keep_. They are read by exactly one thing — `#actionTransition`, the kernel's adapter — and by nothing on the transaction side. Their lifetime coincides with one transaction's; **coincident lifetime is not ownership**, which is the same unit error D-179 refused for slots. And the alternative the measurement would price is unavailable anyway: bundling them into one capability means changing `ActionTransition`, which is **frozen SPI**, and plan §Ground rules 5 admits an SPI change only on a failing executable case. So they do not move, and Arc B does not touch them.

**`settlementInput` stays on the kernel, against the adjudication's §4.** Same argument: its only reader is `#settlementTransition.prepare`, a kernel adapter, and the transaction never sees it. **The counter-argument is real and loses on typing**: it has exactly the shape of the driver's `#staged` — a value staged before a seam, consumed inside it, that must not outlive it — so a symmetric input slot on the entity is tempting. But `SettlementInput` is a kernel-tier type the driver does not name, so the entity would hold it as `unknown` and every read would be a cast, trading a typed field for an untyped slot to buy one diagnostic the kernel's own `finally` already makes unnecessary. **This changes Arc C**: `AttemptSlots` still dissolves, but into the operation record and a **bare kernel field**, not into the transaction.

**One thing the tree already handles that should not be read as a defect.** `#openSettlement` clears `settlementInput` with a plain statement rather than in a `finally`, and `runCore` **can** throw — `#refuseReentry` throws `null` past every classification. The clear is skipped on that path, and correctly: a re-entry refusal is the panic route, so the controller is terminal before any stale input could be read.

### Unchanged, and named because the question was asked

**The committed frame** keeps its shape exactly: `KernelFrame`'s seven fields plus the behavior part, `Frame`/`Draft`/`FramePartOf` unchanged, `frames.declaration.test.ts` untouched. Arc B moves _which object holds the pair_, not what a frame is.

**The operation record** keeps `visual`, `box`, `item`, `lifetimes`, `cancelRequest`. Arc B reads `cancelRequest` through one closure and touches nothing else; Arc C is where it grows.

## 4. `SeamContext` shrinks to two members, and then to none — and my adjudication was wrong about this

The adjudication rejected the subject's _shrinks to the two channel members_ and insisted on three, because _the cancel-latch reading remains_. **Both halves of that are right and the conclusion does not follow.** Where the cancel closure lives is a free choice, and it belongs on the frame transaction beside the bracket reference — the two are the same kind of thing, a fixed controller-lifetime edge the entity needs to answer its own predicate. With it there, `preparationValid()` needs nothing from the kernel and the context is **exactly the channel**: `fail` and `notify`.

**And two channel callbacks with no relationship to each other are a parameter list, not a type.** `SeamContext` is deleted; `SeamDriver` takes `(frames, fail, notify)`. That also removes a duplicate the tree carries today: `#context.notify` is `(error) => { this.#notify(error); }`, which is the closure `#report` already is — so the driver receives `this.#report` and one arrow disappears.

**The cost is real and is `seams.node.test.ts`.** Eighty-seven rows are built on a hand-written `SeamContext` fake, and after this they need a `FrameTransaction`. **The arc constructs a real one rather than a second fake** — which is the F-316 lesson, since a fake that satisfies an interface proves nothing about the entity that ships. **If any row cannot be expressed against the real entity, that is a finding about the row and the arc records it**; reintroducing a frame fake to keep a row is not admissible.

**Two contract lists name `SeamContext` and must lose it**: [`02`](../../contract/02-kernel-behavior-contract.md) §792's internal-vocabulary row and [`03`](../../contract/03-feature-composition.md) §1347's _internal and unstable at every tier_.

## 5. `beginPass`, construction order, and `arm()`

**`beginPass` becomes `() => { this.#frames.begin(); }`** — one line inside the closure Arc A already wrote. The construction order is bracket → transaction, and the closure resolves the transaction lazily; that is sound for the same reason it is sound today, since `#begin` already reads two fields `arm()` assigns.

**The pair is composed in `arm()` and installed, not composed by the entity.** `arm()` builds both frames from `next.createFramePart()` at `:2544` and `:2546` and tracks `composed` for an unwind that also runs `spec.retire()` and aborts ingress. **Required properties**: both frames are composed by the same code path so they share one hidden class; the unwind scrubs exactly the frames that physically exist; and **the entity names no behavior-supplied type**. Having `arm()` hand the entity a composed pair satisfies all three and leaves `arm()`'s unwind where the rest of it is. Having the entity compose from a `() => Part` factory is the better long-term shape and moves `composed` inside — recorded, and **not taken here**, because it reshapes an unwind Arc B has no other reason to touch.

The pair is therefore definitely-assigned on the entity, exactly as `#current!`/`#draft!` are on the kernel today: no member is reachable before `arm()` that is not already unreachable before `arm()`.

## 6. The stamp, and the list of four that becomes three

`#runStamped` arms a slot around a call, `#begin` moves it to `#stamp`, `#commit` consumes it. **The whole apparatus exists because the phase must land after `preparationValid()` and before the swap**, where the kernel has no statement — and it needs the two-half handover because _a discarded or failed seam never reaches `commit()`, so its stamp is still set when it returns_.

**Make the phase an argument of the call that commits and every one of those goes.** `commit(phase)` writes it inside the swap; a seam that never commits carries nothing to leak; `#activate`, `#openSettlement` and `#handleFailed` lose their wrappers; `runActivationSeam` threads one more argument. **The ~60 lines of prose proving a stamp cannot outlive its transaction become unstatable**, because an argument of the call that commits cannot.

**Two constraints on the signature.** No optional parameter may precede a required one — `runCore` already has `effectStage` defaulting to `stage`. And `#settlementTransition` must remain reachable at both `SETTLING` and `REPORTING` through **one** object, which is what forbids putting the phase on the transition.

**[`02`](../../contract/02-kernel-behavior-contract.md) §240 must be amended, and it is the reason to look there.** It names _four pieces of kernel state written against_ the non-reentrancy guarantee: the `actionTag`/`actionArgument` slots, `failureRequested`, `unclassifiedReason`, `runStamped`'s stamp-clearing `finally`, and `consumeStaged`'s clear-on-open. Arc B deletes one of them, and the list becomes three — **not because the guarantee weakened, but because one of its dependants stopped being a slot.** That is the sentence the amendment has to say, or the next reader will read a shrinking list as a weakening invariant.

**Two live traces write the old shape**: [`06`](../../contract/06-vertical-sortable-trace.md) `:546` and `challenge-response.md` `:326` both read `preparationValid(); draft.phase = SETTLING; commit()`. Both become `preparationValid(); commit(SETTLING)`.

## 7. `#pinned`'s two clears are deleted, and the enumeration is why

`#retireOperation` and `#runPhysicalTeardown` each end with `this.#operation = null; this.#activation = null; this.#pinned = null;` under a comment about the per-operation records. **After the move those two statements are a collaborator retiring another entity's state**, which Q-21 settled at F-322 is wrong. Two repairs are available and one of them is not worth its instrument.

**A `release()` on the entity** preserves the behaviour exactly and satisfies Q-21 structurally — but the behaviour it preserves is _the identity object is not retained past retirement_, which **no contract states**, and under F-343's precedent an arc that moves a property the record relies on owes a row that reddens for it. That row is a `WeakRef` retention row for one `Readonly<{ id: number }>`.

**So the clears are deleted, and the reading is enumerable rather than argued.** `#pinned` is read at exactly one site. `preparationValid()` is called from three places — twice inside `runCore`, after `begin()` wrote `#pinned` in the same call, and once from `#activationPolicy.committed()`, which `runActivationSeam` reaches only after `runCore` returned, so its `begin()` also ran. **No read can observe a value an earlier transaction wrote.** What the deletion retains is one two-word object that dies with the controller, and `CONTRIBUTING.md` §Definition of success refuses machinery on the first of its two limbs — the state is not reachable through correct use.

**The falsifiable edge, stated so a later round can find it.** If P-02's retention work ever measures per-controller residue at object granularity, this is one object it will see, and the answer is that the controller is the unit. If that answer stops holding, `release()` is the repair and it brings its own row.

## 8. Instruments

**Must not change.** `frames.declaration.test.ts` — the frame types are untouched. `context.declaration.test.ts` — `keyof BehaviorContext` at seven and the class difference at `'arm'`; **the transaction is a `#private` field and Arc B adds no public member**. Every browser row, including the six of `describe('the transaction bracket')`, which Arc A owns and Arc B must leave alone.

**Owed before the change, not after it.** The stamp deletion rests on three seams landing three different phases through two adapter objects. **Confirm by mutation that swapping `#activate`'s `ACTIVATING` with `#openSettlement`'s `SETTLING`, and `#openSettlement`'s `SETTLING` with `#handleFailed`'s `REPORTING`, each reddens a row.** Any that reddens nothing is a row Arc B writes **first**, against the current tree — because a deletion that relies on an unpinned property is the F-316 shape, and doing it in the arc's own commit makes the evidence unreviewable.

**Same treatment for `preparationValid`'s three conjuncts.** Drop each in turn; each must redden a distinct row — a resolver that destroys, one that cancels, and one that retires the operation between `prepare` and `commit`. Supply what is missing before the move.

**New, to F-346's standard.**

| Row | Mutation |
| --- | --- |
| `current` is not writable through the reader | declaration row; widen the accessor's return type |
| the member set of `FrameTransaction` is pinned in both directions | add a member |
| `begin` yields the draft the caller may write, and `commit` yields the frame it published | swap the two returns |
| the phase a commit carries is written by that commit and no other | make `commit` retain its phase argument across calls |
| a preparation invalidated by a close, a cancel or a retirement rolls back | the three conjunct mutations above |

**Where the pattern comes from.** F-316 repaired `RectIndexView` so the reader-view pattern could be applied again; this is the second application, and the mechanism is the same — a widened accessor makes a `@ts-expect-error` unused, which is a compile error at the row rather than a silently vacuous assertion.

## 9. Measurement

**The per-sample accessor count, stated before the run.** After the move, `#begin` and `#commit` read the pair as private fields inside the entity, so the only added cost is what `Kernel` still reads from outside. On the `ACTIVE` sample path that is **six**: `#onPointer`'s `pointerId` check, `#handleMove`'s two reads at `:1901` and `:1907`, the two draft writes at `:1912-1913`, and `#runMoved`'s frame argument — four `current` and two `draft`.

**And the arc deletes three private-field accesses per sample**: `#begin`'s `#stamp`/`#armedStamp` pair and `#commit`'s `#stamp !== NO_STAMP` test run on every sample today and are unconditional.

**So the direction is genuinely unknown and is exactly what the run is for**: six accessor invocations arrive, three field accesses leave, and `begin()` returning the draft removes two of the six if the implementer takes it. M-1 and M-1′ at 50 and 200 rows with the retained-heap arm, under the existing opt-in harness, against the commit that decides this arc and changes no source — the baseline discipline `arc-a.md` established.

**Brotli on all ten compositions.** `kernel.js` carries the transaction, so the rows Arc A moved will move again; the two compositions that carry no kernel are the controls and must be **0**. No budget re-base without the record's usual justification. **The byte direction is not predicted** — a class arrives, and five fields, four methods, a type and ~60 lines of prose leave.

## 10. The sequence

**B-1 — delete the stamp, in place.** `commit` takes a phase; `runCore` and `runActivationSeam` thread it; `#armedStamp`, `#stamp`, `#runStamped`, `NO_STAMP` and `ArmedStamp` go. **No entity is created and nothing moves**, so the diff is exactly the deletion and its argument. Preceded by the phase-mutation check above. Amends `02` §240 and the two traces.

**B-2 — extract the frame transaction.** `transaction.ts`; `#current`, `#draft`, `#pinned`, `#begin`, `#commit`, `#preparationValid` move; the bracket reference and the cancel closure become constructor arguments; `SeamContext` is deleted and `SeamDriver` takes `(frames, fail, notify)`; `beginPass` re-points; `arm()` installs; the two `#pinned` clears go. `seams.node.test.ts`'s harness constructs a real entity.

**Splitting them this way converts nothing twice**, which is D-170's rule: the stamp is deleted rather than moved onto an entity and then deleted. It also makes B-2 purely relocational, so _green on the existing suite_ is a meaningful acceptance criterion for it and a weak one for B-1 — which is why B-1 carries the mutation checks.

**B-3 — the instrument.** The five new rows and whatever the pre-checks found missing, tabulated in `COVERAGE.md`.

**B-4 — the measurement.** Counts first, then M-1/M-1′ and the Brotli table, as `arc-b.md`.

**B-5 — the record.** `02` §792 and `03` §1347 lose `SeamContext`; the F-345 sweep is run over the whole contract tree rather than over this document's list.

**Ordering against the rest.** F-313 is finished and F-317 is repaired, so Arc B's two stated blockers are discharged. Arc C follows and its `settlementInput` half is corrected by §3. Arc D is independent. C4 stays deferred on O-3.

## 11. Where I disagree with my own adjudication

1. **The entity is not the merge.** Applying §2's own disjointness test to §3's proposal refuses it, and the stamp deletion — the strongest item in the document — does not depend on the merge at all.
2. **`SeamContext` shrinks to two and then to none.** §2 insisted on three against the subject's two; the cancel closure's home is a free choice, and on the transaction it makes the context exactly the channel. The subject was right and the reason neither of us gave is that the closure is the same kind of edge as the bracket reference.
3. **`settlementInput` does not go to the transaction**, which changes Arc C.
4. **`#actionTag`/`#actionArgument` are not a measurement question.** The alternative is a frozen-SPI change, so there is nothing to price.
5. **`#reporting` does not move at all**, not even as a bracket flag.
6. **`#pinned`'s clears are deleted rather than relocated**, and the enumeration of one read's three callers is what makes that a reading rather than a preference.

What survives untouched is the pair of claims the direction rests on: the frame pair and the driver were split by a boundary that no longer separates two owners, and the stamp is an invariant proved in prose that a signature can make unstatable.