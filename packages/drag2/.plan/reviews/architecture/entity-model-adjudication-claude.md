# Adjudicating the independent entity model — what survives the record it could not see

**Subject** [`entity-model-b73b6779-claude.md`](entity-model-b73b6779-claude.md), an independent architect's reading of `packages/drag2` at the frozen snapshot `b73b6779`, commissioned to derive the next decomposition from ownership and lifetime. **Adjudicated at** `5d01b93a` on `drag2/fin-review`. **Mints** D-177, F-325, F-326; amends F-316, F-317 and F-318 with a blocking relation. Nothing is implemented.

**The asymmetry is the point of this pass, and it is small in one direction and large in the other.** `git diff b73b6779 HEAD -- src tests` is **empty**: every mechanical claim in the subject is a claim about the tree that stands today, and I re-derived the load-bearing ones rather than accepting them. What I hold and the subject did not is the record made after the snapshot — the D-170 arc's twelve findings, D-176's declared-slot taxonomy, F-312/F-324's placement rule, and Q-21's retirement-ownership rule. Four of those change an answer. One of them reorders the whole plan.

**Verdict in one line.** The model is good and its two strongest candidates survive with corrected boundaries; its ledger of what disappears is optimistic in three specific places; its strongest form of C5 is falsified by a field it lists as a member; and its proposed ordering is wrong, because three of the arcs it proposes are each guarded by an instrument the D-170 arc found unsound.

## 0. Verification of the subject's mechanical claims

Re-derived here rather than accepted, because everything downstream rests on them.

| Claim | Reading |
| --- | --- |
| "fourteen reads of `#queue.closed` across a dozen members" | **15 reads across 13 members** — `#notify`, `#preparationValid`, `destroy`, `#dispatchKernel`, `#cancelWith`, `#failOperation`, `#runAdmission`, `#openIngress`, `#settlementLive`, `#joinLive`, `#settleResolution`, `closed`, `dispatch`. Shape confirmed, count one low |
| "30 members that read `#current`" | **29 members, 57 reads.** `#handleMove` reads it **6 times**, exactly as stated |
| Six transaction-scoped fields on a controller-lifetime object | Confirmed: `#pinned`, `#armedStamp`, `#stamp`, `#reporting`, `#actionTag`, `#actionArgument` |
| `SeamContext` is seven members, five reaching the transaction | Confirmed: `begin`, `commit`, `preparationValid`, `readCurrent`, `readDraft`, `fail`, `notify` |
| `#handleFailed` builds a `SettlementAttempt` it never measures | Confirmed at `kernel.ts:2372` — `{ targetX: null, targetY: 0 }`, with the comment _nothing measures and nothing joins_ |
| `activePlaceholder === view.placeholder` always | Confirmed: both written from one local at `sortable/spec.ts:937-940` |
| The axis can read `insertion` off the frame | **Confirmed and stronger** — see §5 |

Two claims did not survive, and both are load-bearing for C2's ledger. They are in §3.

## 1. C1 — the execution bracket · **accept, with the channel left outside**

**The boundary is real and the subject's diagnosis of `queue.ts` is right.** `ActionQueue` declares `closed` as _terminal latch: once set, nothing is admitted and nothing is drained_ — which states the queue's **consequence** of the bit rather than the bit's meaning, and 13 of its 15 kernel readers are not about draining at all. The cluster `{queue arrays, running, closed, depth, teardownPending, admitting, destroyed, settleDestroyed, drainStep, drainPanic}` is one state machine with one reason to change (D-36's policy), no reader outside the kernel, and a correctness argument currently spread across five comment blocks. `#leaveTransaction` — the method that carries the whole deferral invariant — is four lines and touches no frame. Accept.

**D-176 strengthens this candidate, and it is worth saying why.** After D-176 the latch's readership is a **contract-level census with a static, checkable domain**, not an implementation detail: a bit whose readers the record must be able to enumerate should be owned by an entity that can state its own invariant. That was not available at the snapshot.

### Changed boundary: the channel collaborates, it does not join

The subject recommends folding `notify`/`report`/`unwind` into the bracket, so that _what may still reach the consumer after close_ becomes one entity's rule, while noting the cost of a nullable `spec.reportError` that exists only after `arm()`. **Reject the fold, and D-176 is what changes the answer.**

At the snapshot, the post-closure exception was D-51's **closed named list**, and a closed list is the kind of thing an entity can own. D-176 replaced it with a **predicate over call sites** — reached only from teardown or unwind, purpose is release, no operation work, nothing published, return ignored, wrapped. Under a predicate, every reader of the latch is in the same relationship to it, and folding one reader into the owner privileges that reader without making any other site more checkable.

The kernel proves the point against itself. `#panic`'s docblock argues its own exception in D-51's vocabulary, independently authored: _it publishes no lifecycle or domain event, ignores its return value, performs no operation work, and is guarded_. That is the predicate, satisfied and stated at the site. Co-location adds nothing to it.

**So: the bracket owns the latch; the channel reads it, like everything else.** `#notify`, `#report` and `#unwind` stay with the kernel, and the bracket needs no delivery target and no nullable reference to `spec`.

### What C1 owns, and what it is owed

- **Entity** — controller lifetime, constructed with the kernel, three callbacks: drain step, physical teardown, panic report.
- **Owns** — the two parallel arrays and `running`; `closed`; `depth`; `teardownPending`; `admitting`; the destroy promise and its resolver.
- **Operations** — `dispatch`, `runIngress(admit)`, `close()`, `panic(error)`, and the `closed` reading.
- **Outside** — frames, operation, spec, DOM, and the channel. `#openIngress`'s guard on `current.operation` and its `begin()` stay on the kernel side of the call, as the subject says.
- **Dependency direction** — nothing points back at the kernel except the three callbacks.
- **Becomes unnecessary** — `queue.ts`'s `closed` field and its per-iteration comment; `drain`'s two callback parameters; five comment blocks arguing one invariant; and the reason `tests/kernel/queue.node.test.ts` cannot cover deferral, which becomes coverable with a fake teardown callback. That last item is the strongest argument in the candidate and the subject underweights it: **the deferral invariant is currently untestable except through a real controller in a browser, and it touches no DOM.**
- **Must be falsified first** — **F-318**. C1 relocates the memoized destroy promise and its resolver, and F-318 establishes that nothing pins that promise's identity through the shipped controller wrappers. Moving unpinned machinery is how a second unfalsified migration lands on a first.
- **Must be measured** — `#dispatchKernel` is on the sample path; one property load per dispatch, stated as a per-sample count before the m1 run, plus Brotli per composition under §15 and SC-1.

## 2. C1 versus C2 — **two entities, and the transaction depends on the bracket directly**

The subject recommends two and leaves the merge open. Two is right, but not for the reason given, and the recommendation needs one correction to be implementable.

**The subject's reason — different reasons to change — is true and is not sufficient**, because the three sites where the two meet are exactly the sites a merge would localize: `#openIngress` (depth, `begin`, `admitting`, drain, `leaveTransaction`, guarded on `current.operation`), `#preparationValid` (`closed` + `cancelRequest` + `pinned === current.operation`), and `#cancelWith` (`closed` + `current.operation` + `cancelRequest`). All three are **three-way**, not two-way: every one of them also reads the operation. A merge of the bracket and the transaction localizes two thirds of three predicates and leaves the third foreign, so it buys less than it looks like it buys — and it buys it with an entity holding ~18 fields whose two halves share no field at all. **Nothing in the bracket half reads a frame; nothing in the transaction half reads depth.** That disjointness is the argument, and it is stronger than "different reasons to change".

**The correction the recommendation needs.** The subject has `preparationValid` become "a composition the kernel supplies", which leaves the driver calling **up** into the kernel for a predicate two thirds of which is the driver's own state after C2 — the shape `SeamContext` already is, reintroduced. Instead: **the transaction holds a reference to the bracket.** Both are controller-lifetime, the bracket is constructed first, and the direction is strictly downward with no cycle. Then `preparationValid` is `!this.#bracket.closed && !cancelRequest && this.#pinned === this.#current.operation`, with the operation's cancel latch the single foreign read.

**Consequently `SeamContext` shrinks to three members, not two.** `begin`, `commit`, `readCurrent` and `readDraft` become the entity's own; `fail` and `notify` remain; and the cancel-latch reading remains, as a closure or as a reference to the operation slot. Four of seven, which is a real result — but the subject's "shrinks to the two channel members" is not what the composition permits.

## 3. C2 — the transaction · **accept the frame pair and the stamp; correct three items in the ledger**

**The strongest single item in the whole document is the stamp, and it survives intact.** `#armedStamp`/`#stamp` exist because — in the kernel's own words — a private slot _keeps that ordering without widening the seam driver's signature with a kernel concern_. That sentence is the factory era's boundary speaking: the driver was a separate factory, so the phase was foreign to it. Once the driver **is** the transaction, the phase is not a foreign concern, and `runCore` taking the phase as an argument that `commit` writes before the swap deletes `#armedStamp`, `#stamp`, `#runStamped`, `NO_STAMP`, the `ArmedStamp` type, the two-half handover and its `finally` — and, more to the point, deletes the ~60 lines of prose proving a stamp cannot outlive its transaction, because an argument of the call that commits cannot. **An invariant proved in prose becomes unstatable.** Accept.

Three ledger items do not survive.

**(a) `#reporting` is not redundant with the stamp.** The subject reads it as _a fact the open transaction's stamp already carries_. It does not: `#reporting` is set at `kernel.ts:2386`, **before** `#runStamped`, and cleared in a `finally` at `:2398` that also covers `#dropStaged()` and the `settlementInput` clear. Its span is strictly wider than the transaction's, and it covers the one case a stamp cannot — a seam that throws before opening a transaction, which is the driver's re-entry refusal. The guard at `:941-944` reads `#reporting` **and** `#current.phase === REPORTING` because they cover different intervals: in-flight and post-commit. Replacing the flag with a transaction reading narrows the guard, and the guard is I-22's precedence. **`#reporting` stays**, and if it moves anywhere it moves to the transaction as a bracket flag rather than as a derived reading.

**(b) `#actionTag`/`#actionArgument` are not there because the adapters were written as closures.** They are there because `runCore` threads **one opaque `Capability`** and a behavior action needs **two** values, and `ActionTransition` is a different type from `Transition` that the adapter exists to bridge. Bundling them into one capability allocates a pair per behavior action, or reuses a mutable carrier — which is the slot again, relocated. `#handleBehaviorAction` is the drain step for every behavior action, so the allocation question is a hot-path question. **Not free; measure or keep the slots.**

**(c) `settlementInput` as a capability widens what `effect` sees.** `Transition`'s `Capability` is passed to **both** `prepare` and `effect`, and the settlement seam's docblock gives that as the reason for the slot: _only `prepare` takes it and the seam's envelope hands the same capability to both phases_. Threading it makes the input visible to a phase the design deliberately kept it from. Admissible, but it is a change with a stated reason against it, not an oversight being cleaned up.

**What survives of (b) and (c) is the dummy attempt**, and it survives on its own evidence: `kernel.ts:2372` builds a `SettlementAttempt` that _never lands_ so one adapter can serve both paths, and that is a real artefact of the adapter shape.

### The measurement obligation, stated

29 members read `#current`, 57 times, `#handleMove` 6 times per sample. D-170 §The ownership boundary forbids a mutable public field, so `current`/`draft` become accessors — the trade `RectIndex` took, on a path M-1 measures at 2.64 µs per sample. **The obligation is a per-sample read count stated before the run**, then an m1 run, and the choice between accessors and a kernel-held reference the transaction reassigns turns on that number. This is the one candidate where I decline to predict the answer.

**Must land first: F-313.** Seven live internal docblocks in `seams.ts` still say `host`, and that file is what C2 rewrites. Repairing a rename inside a rewrite is how the arc's own diff stops being reviewable.

**Must be falsified first: F-317.** Three of the four narrowing assertions that prove `Kernel`'s surface do not discriminate — only `arm` does. C2 reshapes that class. An arc that changes a class's surface must not run behind an instrument that tests one member of it.

## 4. C3 — attempts · **accept, but `AttemptSlots` dissolves by lifetime rather than moving as a unit**

The subject's stronger claim is right and its own evidence goes further than its proposal. `AttemptSlots` is a controller-lifetime record whose three fields do not share **even the attempt lifetime**, which the subject says and then partly un-says by moving the record.

**The split is by lifetime, and it is two destinations, not one:**

- `resolution` and `settlement` → the **operation record**. An attempt cannot outlive its operation, and I-4's double validation gets **stronger** rather than merely deeper: today a late resolution validates against a controller-lifetime slot; afterwards it validates against the operation record itself, so operation identity is checked structurally rather than by the slot happening to have been cleared. The subject calls this "moves one property deeper" and undersells it.
- `settlementInput` → the **transaction**. It lives for one seam transaction and is cleared at the seam's end. It goes with C2 as a **field of the transaction entity**, and — per §3(c) — not necessarily as a capability argument.

**This makes C3's operation half independent of C2**, which the subject's ordering does not allow ("naturally part of C2's landing"). It is independent, it is small, and it is safe.

**Q-21 strengthens it, and constrains it.** The rule settled at F-322 — _each entity retires its own state and no collaborator's_ — is exactly what makes `operation.release()` correct: the operation owns the attempts and the lifetimes, so it stops them, and the three synchronized clearing sites collapse because there is one owner rather than three callers. The same rule forbids the shortcut: `#runPhysicalTeardown` must call `operation.release()`, not reach into the attempts itself.

`ActivationRecord` stays a separate complete-or-absent sub-record. Agreed, and §5 shows the sortable needs the same shape for the same reason.

## 5. C5 — the sortable's per-operation state · **accept in three parts; the strongest form is falsified**

This is where the subject's evidence is best and its proposal overshoots.

**Falsified: one consolidated object carrying `pendingSpatial` and `progress`.** `progress` is read at `sortable/spec.ts:1650` and `:1664` on the failure path — `this.#operation.progress === MINTED` decides whether a terminal is published at all, and `MINTED` is precisely the state of an operation that **never activated**. So `progress` must exist before `presentation` does, and a single wholly-present-or-wholly-absent record cannot hold both. Under the merge, that read reconstructs the distinction as `presentation?.progress ?? MINTED`, which is the mirror the candidate exists to remove, wearing a different shape.

**The correct boundary is the one the kernel already uses, and the subject endorses it one section earlier for `ActivationRecord`.** The behavior's per-operation state has **two** sub-lifetimes: mint→retire and activation→retire. So:

- **`PresentationView` is the behavior's activation record.** It absorbs `activePlaceholder` — written from the same local in the same statement group at `:937-940`, identical reference, five read sites — and `lift`, written at `:938` and read at `:1484`, same lifetime. It becomes wholly present or wholly absent.
- **`#operation` keeps `progress` and `pendingSpatial`**, which are mint-lifetime, plus the one nullable `presentation` slot.

**Q-18's rule adjudicates this, and it is my own so I will state the test it has to pass.** _A materialized narrowing is a control panel when a receiver already exists at the same lifetime and with the same nullability, and a context when none does._ `#operation` has the right lifetime for the activation members and the **wrong nullability** — nullable field-by-field. The repair is not to merge into it but to make the activation half a slot that is _wholly present or wholly absent_, which is verbatim the shape Q-18 preferred: **one assertion where the record would need three**. Five `activePlaceholder!` assertions become the `presentation!` assertion those methods already take.

### The three parts, classified as the owner asked

1. **Internal ownership cleanup** — `activePlaceholder` and `lift` absorbed into the activation record. No type moves, no published surface, no measurement. Land it with the rest of C5 or on its own.
2. **A type-level narrowing with no reader** — `insertion` leaves `InsertionRuntimeView`. **F-325**, and it is stronger than the subject claims: neither shipped axis reads `runtime.insertion`. `y.ts:298` and `xy.ts:215,310` all read `frame.insertion`, and `LinearRuntime` — the axis's own declared view — does not name the field. `spec.ts:1201` reads `current.insertion!` and `:1221` copies it into the view twenty lines later, then passes **both objects to the same call**. The write, the `finally` clear and the published declaration serve nobody.
3. **A real middle-tier contract change** — `snapshot` moves from `InsertionRuntimeView` to `InsertionFrameView`. **F-326.** This one does cost a published move, because `linear-shift.ts` reads `runtime.snapshot.version` and `snapshot` is not on the frame view.

**The owner's call the subject deferred, answered.** Take the `snapshot` move. Three reasons, in order of weight: the package **already states the rule and already applied it to `item`**, in the same file, with the reason written down — so this is enforcing an authored rule, not inventing one; `InsertionFrameView` is documented as _the widest view, not the required one_, the ceiling from which each feature declares its own narrower view in its own module, so a field moving between the two arguments moves between two declarations `linear-shift.ts` already owns; and `CONTRIBUTING.md` §8 governs an unreleased API at `0.1.0`, so no alias is owed. That rule is now **D-177**, because a rule authored twice in two modules and violated twice in a third is a rule the record should hold.

**Must land first: F-312.** Its two reinstated readings are on the `live` path this candidate reshapes — one in `RectIndex.refresh`, one in `LinearShift.moved`, both reached through the closure `PresentationView.live` carries. Landing C5 first means re-deriving the placement inside a moved object.

## 6. C4 — ingress · **defer, and the argument as given is insufficient**

The boundary is real: root listeners, the ingress abort, the click suppressor composed onto it with `AbortSignal.any`, and the stable listener identities that `addEventListener`'s `(type, callback, capture)` dedup depends on. All one cluster, one lifetime.

**But the case made for it is the case the subject's own brief rejects.** By its own account the extraction "removes no cross-module coupling — it relocates ~120 lines and one composed signal", and its value "is mainly that a touch-policy change would not touch the phase machine". That is an extraction that only moves code, justified by work that has not happened. The owner's instruction is the same: future work alone is not sufficient reason to create an entity. **Defer**, and record that what is deferred is the argument, not the observation — when O-3's touch measurement lands and supplies a second reason to change that has actually materialized, the boundary is already identified and the case will make itself.

One ordering note regardless: C1 takes `#openIngress`'s bracket half, so C4 after C1 makes C4 smaller. Never before.

## 7. Non-extractions — where I agree, and the one I would sharpen

The refusal to extract the ~1 200-line operation lifecycle is right and is the best judgement in the document. Every step of an operation is a transaction over the published frame, so an `Operation` executor takes all four collaborators into every method; the reasons to change there are **one** reason, the phase table in contract 02. What C1–C3 remove is the other five reasons sharing that `this`, which is the correct target.

I would sharpen one: **the `progress` marker's duplication across both behaviors is now better argued than the document allows.** Its open question 2 asks whether `PreparedSettlement` may be widened so a settlement `prepare` can stage the failure report instead of parking it in an out-of-band slot. The sortable's slot carries its own defence — _an accepted out-of-band channel, not an oversight_, with an enforced transaction-safety property spelled out in four numbered steps. That is a stronger position than the question implies, and the widening should be judged against it rather than against the duplication count. Not settled here; it is a frozen-SPI question and belongs to whoever takes the SPI up.

## 8. What later work does to the model

| Later work | Effect |
| --- | --- |
| **D-176** (declared-slot membership is a property of the declaration; the exception is a predicate) | **Changes a boundary.** It strengthens C1's central claim — the latch's readership is now a contract-level census — and it removes the case for folding the channel into the bracket, which was reasonable while the exception was a closed list |
| **F-312 / F-324** (the placement rule, and the census reopened) | **Constrains ordering.** F-312's two readings are on C5's `live` path; F-324 re-censuses the latch's act-(a) readers, and re-running that census against a field C1 has moved is the wrong sequence. **F-324 before C1; F-312 before C5** |
| **Q-21 / F-322** (each entity retires its own state and no collaborator's) | **Strengthens C3** and supplies its correctness argument: `operation.release()` is right because the operation owns what it stops, and teardown must call it rather than reach past it |
| **Q-18** (the control-panel-versus-context test) | **Changes C5's boundary.** It is what says the repair is a wholly-present-or-absent activation record rather than a merge into a field-by-field nullable one |
| **F-316, F-317, F-318** (three unsound instruments) | **Reorders the plan.** See §9 |
| **F-313** (the incomplete rename, seven sites in `seams.ts`) | **Constrains ordering**: before C2, which rewrites that file |
| **F-323** (`just lint` red at the tip) | Orthogonal, and blocks everything trivially |
| **F-314, F-315, F-319, F-320, F-321** | Orthogonal — prose and fixtures, no boundary touched |
| **D-170 §The ownership boundary** (no mutable public field) | Unchanged constraint; it is what makes C2's accessor question a measurement rather than a preference |

## 9. The ordering, and the correction that matters most

**The subject's ordering is C1 → C2 → C3 → C5 → C4, and it is wrong at the front.** Three of the D-170 arc's findings are not incidental defects to be swept up later: each is the falsifier for one of the arcs proposed here.

- **F-318** — nothing pins the memoized `destroy()` identity through the shipped controller wrappers. **C1 relocates that promise.**
- **F-317** — only `arm` discriminates the kernel's narrowing; three of four assertions pass for an unrelated reason. **C2 reshapes that class.**
- **F-316** — `RectIndexView` has no falsifier anywhere under `tests/`. It guards the reader-view pattern that **C5 applies again** to the sortable's activation record, and that C2 applies to the frames.

Migrating on top of an unpinned guarantee is how a second unfalsified migration lands on a first, which is the shape the D-170 arc found in the first place. **The instruments come before the arcs.**

### Proposed sequence

**Stage 0 — repairs that land regardless, in any order.** F-323 (the gate is red); F-313 (finish the rename, including `seams.ts` and shipped `kernel.d.ts`); F-314, F-315, F-319, F-320, F-321 (prose and fixtures); **F-312 and F-322**, the two lifecycle repairs already decided by D-176; **F-324**, the act-(a) census, which must answer before any latch reader moves.

**Stage 1 — the instruments.** F-316, F-317, F-318. Small, and the precondition for everything after.

**Stage 2 — Arc A: the execution bracket** (C1, channel outside). Needs F-318. Measurement: per-sample dispatch cost, Brotli per composition, retained heap.

**Stage 3 — Arc B: the transaction** (C2, plus `settlementInput`). Needs F-313, F-317 and Arc A. Carries the measurement obligation on `#current`; carries the three ledger corrections in §3.

**Stage 4 — Arc C: the operation record** (C3's attempts half). Independent of Arc B, but after Arc A, which touches teardown. Small.

**Stage 5 — Arc D: the sortable activation record** (C5, all three parts). Needs F-312, F-316 and D-177. Independent of Arcs A–C.

**Deferred — C4**, on O-3.

Stages 2–5 are each one arc with its own falsifier, and none of them should start while its instrument is unsound.

## 10. Where I disagree, stated plainly

Consensus between two architects is not the useful output, so the disagreements are collected rather than distributed.

1. **The channel does not join the bracket.** D-176 turned the post-closure exception from a list into a predicate, and a predicate does not want an owner.
2. **`SeamContext` shrinks to three, not two**, and the transaction should hold the bracket directly rather than call up through the kernel for `preparationValid`.
3. **`#reporting` is not derivable from the stamp.** Its span is wider and covers a case the stamp cannot.
4. **`#actionTag`/`#actionArgument` and `settlementInput` are not free to remove.** One is an allocation question on a hot path, the other widens what a phase sees, and both have stated reasons in the tree that the candidate does not engage.
5. **C3 does not depend on C2.** Splitting `AttemptSlots` by lifetime gives two destinations, and the operation half is independent and safe.
6. **C5's consolidated object is falsified by `progress`.** The behavior has two per-operation sub-lifetimes, exactly as the kernel does, and the candidate's own reasoning about `ActivationRecord` is what it should have applied.
7. **C4's argument is insufficient** by the document's own criterion, even though its observation is correct.
8. **The ordering is wrong at the front**, and this is the disagreement that would have cost the most to discover during an arc rather than before one.

Against all of that: the two central claims — that the missing entity is the execution bracket rather than the queue, and that the frame pair and the driver are one entity split by a boundary that no longer separates two owners — are right, well-evidenced, and worth building on. The corrections above make them smaller and more likely to survive contact.