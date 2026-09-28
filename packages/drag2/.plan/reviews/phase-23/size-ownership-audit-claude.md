# Size and ownership audit — `src/` against `CODE_OF_SIZE.md`

**An independent audit for the final human ownership pass, 2026-08-22, against `9f3f0428`** on `drag2/fin-review`. The authority is [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) at the monorepo root; where a decision in this package's own record appears to contradict it, the contradiction is reported rather than resolved. **Nothing in production was changed.** Every ablation below was applied, built, measured and reverted, and the tree at the end of the pass rebuilds to figures **byte-identical** to the baseline table.

**Classification, as requested.** Each finding is **(a)** a clear violation simplifiable with no semantic change, **(b)** a possible optimization needing an owner or architectural decision, or **(c)** expensive-looking but justified by an existing invariant or public contract.

---

## 1. Method

**The instrument is the package's own harness.** `bench/size/measure.ts` exports `measureAll()`, so the figures here are the M-3 pipeline exactly — Rolldown, `platform: 'neutral'`, `minify: true`, Brotli at `node:zlib` default quality — read as raw byte counts rather than through the budget report. Minified bytes are recorded alongside Brotli because, as §15 warns and §2 of this document demonstrates, **the two can disagree in direction**.

Every ablation followed the same loop: edit `src/`, `npx just build`, measure all fourteen compositions, restore `src/` from a pre-pass copy. A build that failed was re-run rather than read — a stale artifact reports the _previous_ ablation's numbers, which happened once and was caught by the exit-code check.

**Baseline, 2026-08-22 (Brotli bytes / modules).** These are `just size`'s figures at byte resolution.

| Composition | Minified | **Brotli** | Modules |
| --- | --- | --- | --- |
| minimal | 34 660 | **11 435** | 32 |
| minimal (xy) | 33 463 | **11 085** | 31 |
| minimal + layoutAnimation | 36 062 | **11 874** | 33 |
| minimal + landing | 35 409 | **11 728** | 34 |
| complete | 36 809 | **12 139** | 35 |
| free drag minimal | 26 378 | **9 007** | 27 |
| free drag + bounds | 26 849 | **9 159** | 28 |
| free drag + landing | 27 127 | **9 307** | 29 |
| free drag complete | 27 598 | **9 459** | 30 |
| both behaviors | 43 734 | **13 699** | 48 |
| vocabulary root — `drag.js` | 184 | **121** | 2 |
| kernel root — `kernel.js` | 19 330 | **6 797** | 13 |
| baseline A — feature-matched, non-composed | 35 895 | **11 848** | 30 |
| baseline B — shipped `@ydinjs/drag` `sortable.js` | 22 573 | **6 889** | 26 |

**Restoration is verified, not asserted.** After the last ablation the tree was replaced from the pre-pass copy, rebuilt, and re-measured: the output diffs empty against the table above. `git diff -- src/` carries only the pre-existing, unrelated `src/stories.module.css` edit, which this pass neither touched nor staged.

**Scope.** All 57 `.ts` files under `src/`, 14 547 lines. Findings were produced by five independent readers over disjoint file sets and then re-verified here against the source before being recorded; a claim I could not reproduce from the code is not in this document.

---

## 2. Seed case one — `validateFramePart()`

[`src/kernel/frames.ts:133-186`](../../../src/kernel/frames.ts). One production call site, [`composeFrame`](../../../src/kernel/frames.ts) at line 201, run twice per `arm()`. `KERNEL_FRAME_KEYS` and the function itself are internal — neither is re-exported from `src/kernel.ts`, which publishes only the frame _types_.

### 2.1 What each check actually does

The function is treated in the record as a single ratified unit — [`.plan/bundle-structure.md`](../../bundle-structure.md) prices it as row **A1**, `~276–300 B`, _"ratified twice — contract 04 by name, and review 4 §28"_, and D-107 declined to gate it. **The ratification argument covers one of its six checks.** Contract 04's discriminator is that _a check is a production check when its failure mode is silent state corruption rather than a stale reference_, and [`src/kernel/frames.ts:244`](../../../src/kernel/frames.ts) names precisely which check that reasoning was about: _"which is why the kernel-key collision check in `validateFramePart` was never gated."_

So each check was re-derived from first principles, and the derivation was **executed** rather than reasoned about — the composed frame is `Object.assign(createKernelFrame(), part)`, and what `Object.assign` does to each malformed shape is observable:

| Check | What the composed frame actually gets | Whose invariant |
| --- | --- | --- |
| kernel frame key | `phase` becomes `"MINE"`, `pointerX` becomes `999` — **the kernel's own slice is overwritten** | **Library.** Silent state corruption, exactly as 04 says |
| `__proto__` own data property | `Object.getPrototypeOf(frame) !== Object.prototype` — **the frame's prototype is mutated** and the payload's keys appear through the chain | **Library.** The fixed-record model is broken |
| symbol key | The symbol survives on the frame and **survives a `Object.keys`-based scrub**: a symbol-held DOM node is retained for the controller's life | **Library**, on the leak argument — the same argument D-108 makes for `assertFrameScrubbed` |
| non-plain prototype | Own data fields are copied; the frame is plain either way. A class instance's prototype accessors and methods are **silently absent**. An array part adds `'0'`, `'1'` … as ordinary keys | **Author.** Their fields are missing; nothing kernel-owned moves |
| accessor | The getter runs **once, at `arm()`**, and the frame receives a plain writable data property holding the snapshot | **Author.** And the message's claim that an accessor _"can observe the transaction"_ is not reachable: compose runs before any transaction exists |
| non-enumerable | `Object.assign` skips it. The key is absent from **both** frames, so `assertFrameShapesMatch` passes | **Author.** The message says it _"would not be copied by `begin()`"_; it is not copied by `composeFrame` either, so the field never exists to be begun |
| non-writable | **The frame's copy is `writable: true`.** `Object.assign` uses `[[Set]]` on a fresh extensible plain object, which creates an ordinary data property | **Nobody.** The message says the key _"would throw on write"_, and it would not — the stated failure mode does not occur |

**Three checks protect a library-owned invariant. Four protect the behavior author from their own contract, and one of those four describes a failure that cannot happen.** That is §1.1's litmus applied literally: _"the consumer would only break their own code"_ answers the prototype, accessor and non-enumerable rows, and _no_ answer supports the non-writable row.

The published-authoring-surface argument (F-78, D-108) does not rescue them either. It says a third-party behavior author must receive validation in the build they ship — which is an argument about **who is protected**, not about **what invariant is at stake**. A non-writable part key breaks nothing, for any author, in any build.

### 2.2 Measured

| Variant | minimal | complete | free drag minimal | both behaviors | kernel root |
| --- | --- | --- | --- | --- | --- |
| baseline | 11 435 | 12 139 | 9 007 | 13 699 | 6 797 |
| **A1** — function and call deleted entirely | 11 158 (**−277**) | 11 876 (**−263**) | 8 746 (**−261**) | 13 422 (**−277**) | 6 534 (**−263**) |
| **A2** — kernel key + `__proto__` only | 11 276 (−159) | 11 973 (−166) | 8 843 (−164) | 13 524 (−175) | 6 623 (−174) |
| **A3** — kernel key + `__proto__` + symbol | 11 282 (**−153**) | 11 987 (**−152**) | 8 858 (**−149**) | 13 543 (**−156**) | 6 643 (**−154**) |

**A1 corroborates the record's own estimate** — `bundle-structure.md`'s `~276–300 B` for row A1 is right, measured today at 261–277 B across every composition. `drag.js` is unmoved at 121 B, and baseline B is external and unmoved, as expected.

**The number that matters is A3: 149–156 B on every composition, for the four author-contract checks.** That is the cost of the part of the function whose ratification argument does not reach it. Keeping the symbol check is nearly free — **6 B** over A2 — so the leak argument costs almost nothing to honour.

**Classification: (b).** The four checks are removable with no change to any library-owned invariant, but D-107 declined the site as a unit four days ago and D-108 restated the un-gating position, so re-opening a subset of it is an owner's call, not a mechanical edit. What this audit adds is that **the unit was never the right granularity**: the decision priced and defended one check's argument across six checks, and the four that argument does not cover are worth 153 B on `minimal` — larger than the `~150 B` slack convention the budgets are sized to.

**The non-writable check is separable and is (a).** Its stated failure mode does not exist, in any build, for any author. Deleting it changes no observable behaviour and leaves the remaining ratification untouched.

---

## 3. Seed case two — `STAGE_TO_CODE`

[`src/kernel/errors.ts:94-108`](../../../src/kernel/errors.ts).

### 3.1 The premise needs correcting before the optimization is considered

The audit request describes the numeric `FailureStage` values as internal. **The record says the opposite, in normative prose and in the emitted surface.** [`src/kernel/failures.ts`](../../../src/kernel/failures.ts) states _"It is **public**: a consumer receiving `onError` has to be able to discriminate it (D-30)"_, and _"A stage constant is inlined into a consumer's compiled code, so a rename that repoints a value is the one change this list must never make."_ The built `kernel.js` exports all thirteen `FAILURE_*` constants, `= 13` is a deliberately preserved hole from D-41, and `tests/kernel/errors.node.test.ts` pins 4, 5 and 8 as literals because D-74 renamed three stages without moving their values.

**A dense, zero-based representation therefore requires renumbering a published wire value.** Under §13 that is not a size optimization at all — it is a public API change — and it is the one change the failure list is written to forbid. Recorded as a **contradiction with the seed premise**, not as a finding against the code.

**What is available without renumbering** is a _positional_ representation that keeps every stage's number: an array indexed by the stage, with the unused slots 0 and 13 filled. That preserves the wire and was measured.

### 3.2 Measured

| Variant | minimal | complete | free drag minimal | both behaviors | `drag.js` | `kernel.js` |
| --- | --- | --- | --- | --- | --- | --- |
| baseline | 11 435 | 12 139 | 9 007 | 13 699 | 121 | 6 797 |
| **B1** — array, unused slots padded with a repeated code | 11 409 (**−26**) | 12 120 (**−19**) | 8 986 (−21) | 13 673 (−26) | 121 (**0**) | 6 797 (**0**) |
| **B2** — array, unused slots `undefined` | 11 416 (−19) | 12 126 (−13) | 8 984 (−23) | 13 676 (−23) | 121 (0) | 6 797 (0) |

**The whole idea is worth 19–26 B**, about one tenth of the `validateFramePart` finding, and **zero on both published roots** — `drag.js` shakes the map away from `DraggableError`, and `kernel.js` does not pull `kernel/errors.js` at all, which is the disjointness F-77 recorded.

**B1 against B2 is the interesting result and it is a methodological one.** B2 is **8 bytes smaller minified** and **7 bytes larger after Brotli**. Padding the holes with a duplicate of an existing code gives the compressor a repeat where `undefined` gives it a novel token. Any pass that reads minified bytes as a proxy for shipped bytes will pick the worse of these two.

### 3.3 What it costs

`Readonly<Record<FailureStage, DraggableErrorCode>>` is the mechanism D-64 exists for: _"Adding a stage without naming a code does not compile."_ An array cannot state that — a `readonly DraggableErrorCode[]` accepts any length, and the lookup needs a non-null assertion. So the trade is **a compile-time totality guarantee, whose runtime cost is zero, for 19–26 B**. §3 says type-level structure should disappear from the bundle, and here it already has: the `Record` is erased, and what is being weighed is not type architecture leaking into runtime but the object literal's own syntax.

**Classification: (c) as proposed, (b) if the owner disagrees.** The record's argument for the total map holds, the win is a fifth of one module's worth of slack, and §17's test — _"a very small gain relative to readability cost"_ — is met. The same argument covers `LIFT_MODES` in [`src/free-drag/assemble.ts:44`](../../../src/free-drag/assemble.ts), the only other total-`Record` runtime map in `src/`, which cites this one as precedent.

**No other runtime mapping table of this shape exists in `src/`.** The census: two `Readonly<Record<>>` maps (this and `LIFT_MODES`), one `Set` (`KERNEL_FRAME_KEY_SET`, seven strings, §2.2-shaped but load-bearing for the kernel-key check), one `Set` allocated per call (`copyUniqueItems`, §5.2 below), and one four-string array walked once per activation (`SESSION_POINTER_EVENTS`, [`src/kernel/pointer.ts:22`](../../../src/kernel/pointer.ts)) where four direct `addEventListener` calls would be smaller — **(a)**, tens of bytes.

---

## 4. The largest finding is neither seed case

**Diagnostic message text is 851–949 B, 6.9 %–7.4 % of every composition.** Forty-five string and template literals in `src/` open with `drag: ` or `free drag: `. Blanking all of them, keeping every interpolation so the runtime shape is unchanged:

| Composition               | baseline | messages blanked | delta             |
| ------------------------- | -------- | ---------------- | ----------------- |
| minimal                   | 11 435   | 10 584           | **−851 (−7.4 %)** |
| minimal (xy)              | 11 085   | 10 234           | −851              |
| minimal + layoutAnimation | 11 874   | 11 030           | −844              |
| minimal + landing         | 11 728   | 10 862           | −866              |
| complete                  | 12 139   | 11 281           | **−858 (−7.1 %)** |
| free drag minimal         | 9 007    | 8 298            | −709              |
| free drag complete        | 9 459    | 8 732            | −727              |
| both behaviors            | 13 699   | 12 750           | **−949**          |
| `drag.js`                 | 121      | 117              | −4                |
| `kernel.js`               | 6 797    | 6 211            | −586              |
| baseline A                | 11 848   | 10 972           | −876              |

**This is already owned and is not a new finding.** D-107 measured it, split it three ways, declined all three, and it is carried live as **SC-2** in [`.plan/obligations.md`](../../obligations.md) with **O-1** as the obligation that discharges it. Three things about it are worth an owner's attention:

**(i) Essentially none of it is gated.** `__DEV__` folds to `false` in `tsdown.config.ts` and the guarded blocks are dead code, but after D-108 exactly **one** `DEV` site survives in `src/` — the `verified-refresh.ts` verification scan. Everything else ships. §1.3's preference for development-only diagnostics is not being exercised anywhere it could be.

**(ii) The recorded total and its recorded halves do not reconcile, and the reason is methodological.** [`.plan/plan.md`](../../plan.md) records _"741 B on `complete`, 6.3 %"_ and then splits it into an author-facing half of `~446–471 B` and a runtime half of `424 B` — which sum to `870–895`. **Brotli deltas are not additive**, so an ablation measured alone always reads larger than its share of a joint ablation; two ablations priced separately cannot be summed, and a total measured jointly cannot be decomposed. Today's joint figure is 858 B on `complete`. Neither number is wrong; they answer different questions, and the record does not say which is which.

**(iii) Three message sites fall outside all three of D-107's classes.** `host.dispatch`'s out-of-range report ([`src/kernel/kernel.ts:2345`](../../../src/kernel/kernel.ts)), `holdForLanding`'s duplicate-call report, and `acquireActivation`'s `isConnected` message are in none of A1, A2 or B — roughly 240 raw characters of kernel text outside the accounting a live standing condition rests on. **(b)**, and it is a gap in the _record_, not necessarily in the code.

---

## 5. Findings

### 5.1 (a) — clear violations, simplifiable with no semantic change

**A-1 · `destroyRequested` is a second name for `queue.closed`.** [`src/kernel/kernel.ts:275`](../../../src/kernel/kernel.ts) declares it, line 583 sets it, line 400 reads it — and line 582, the statement immediately before the only write, sets `queue.closed = true` inside `if (!queue.closed)`. Neither is ever cleared, so the two are identical for the controller's whole life and `!destroyRequested` in `preparationValid()` is an unconditionally true conjunct sitting beside `!queue.closed`. This is §5's own example — _"`closed`, `alive`, and `signal.aborted` when one authoritative source is enough"_ — verbatim.

**A-2 · `READINESS_SETTLED` is dead vocabulary.** [`src/kernel/actions.ts:28`](../../../src/kernel/actions.ts) declares action tag 6. Zero references in `src/`, `tests/` or `bench/`. Contract 02 lists it among what D-41 **deleted in full**; the constant survived the deletion. §8, §4.

**A-3 · `SortableFramePart.outcome` is write-only.** Declared at [`src/sortable/frames.ts:26`](../../../src/sortable/frames.ts), initialized at 38, reset at 56, assigned at [`src/sortable/spec.ts`](../../../src/sortable/spec.ts) lines 1422, 1460, 1480 and 1500. **No reader anywhere in `src/`** — kernel or behavior. `recovery`, the field beside it, has three. The five `OUTCOME_*` constants exist only to name these writes. Contract 04 justifies the field as _"Only read to choose a landing target and a terminal callback"_, and that reader was deleted by D-62/D-66 when `finalized()` collapsed to publishing `current.domain` and nothing else. **The contract row's stated rationale no longer describes the code**, which makes this residue rather than retention. Measured at **−16 to −31 B** on the sortable rows, 0 on free drag.

**A-4 · Three `host.closed` guards duplicate the latch their callee opens with.** [`src/free-drag/controller.ts:77,86`](../../../src/free-drag/controller.ts) and [`src/sortable/controller.ts:76`](../../../src/sortable/controller.ts) each read `if (host.closed) { return; }` before `host.dispatch(...)`, and `dispatch`'s **first statement** is `if (queue.closed) { return; }` ([`src/kernel/kernel.ts:2330`](../../../src/kernel/kernel.ts)), where `host.closed` is a live getter returning that same `queue.closed`. Nothing observable happens in between. The sortable's own comment concedes it: _"belt-and-braces rather than load-bearing (D-44) … the kernel's latch would answer this on its own."_ Contract 07's defence of the free-drag pair addresses the action-phase-legality check, not `dispatch`'s latch.

**A-5 · Dead members that cannot be shaken because they sit on live objects.** `Lifetime.finalized` ([`src/kernel/lifetimes.ts:50,62`](../../../src/kernel/lifetimes.ts)) — a getter on an object created three times per operation, with no reader in `src/`; the internal code reads the closure variable, not the accessor. `FrameTask.flush()` ([`src/kernel/invalidation.ts:43,80`](../../../src/kernel/invalidation.ts)) — no production caller; retained whole because a bundler cannot shake a live object's property. Both were raised at Checkpoint B and deferred to a phase that has passed.

**A-6 · Exports whose only consumers are tests.** `seamFailed` ([`src/kernel/seams.ts:111`](../../../src/kernel/seams.ts)) and `createFreeDragBehavior` ([`src/free-drag/behavior.ts:47`](../../../src/free-drag/behavior.ts)). §4's last bullet names this pattern exactly. **Both cost zero shipped bytes** — they are tree-shaken — so this is hygiene, with one exception worth recording: `createFreeDragBehavior`'s doc block calls it _"the seam the tests drive directly"_ and **no test drives it**; grep finds one hit in the whole repository, its own declaration. A false statement in the file the contract points readers at.

**A-7 · Two of `arm()`'s `command.types` checks are inert and one re-checks a type.** [`src/kernel/kernel.ts:2392-2418`](../../../src/kernel/kernel.ts). `typeof type !== 'string'` re-checks what `types: readonly string[]` guarantees — §1.2's second bullet, verbatim. `types.indexOf(type) !== index` refuses a duplicate the DOM would ignore: `addEventListener` keys its dedup on (type, callback, capture), all three identical here, so a duplicate entry is already a no-op — and the check is `indexOf` inside a loop, so it is O(n²) as well as inert. `types.length === 0` refuses a `command` member that would simply bind nothing. **The `POINTER_DOWN` collision check is the one that protects a library invariant** and is correctly kept. Measured, the three inert checks together: **−62 to −73 B** on every composition.

**A-8 · Single-use renames and derivable flags.** `settleCancellation` ([`src/kernel/kernel.ts:1985`](../../../src/kernel/kernel.ts)) has one call site and renames one call. `admit(event, draft) { return admitFrom(event, draft); }` ([`src/sortable/spec.ts:539`](../../../src/sortable/spec.ts)) is assignable as `admit: admitFrom`. `ProposalBuild.noop` ([`src/sortable/collection.ts:154`](../../../src/sortable/collection.ts)) is exactly `request.from === request.to` on the object it ships beside. `keyboardInsertion` ([`src/sortable/keyboard.ts:80`](../../../src/sortable/keyboard.ts)) allocates a filtered copy of the whole collection to read two neighbours that index arithmetic gives directly — a §9 copy that takes no ownership, and removing it is a runtime win as well. `createInvalidator` ([`src/kernel/invalidation.ts:18`](../../../src/kernel/invalidation.ts)) and `Lifetime.useWhile` ([`src/kernel/lifetimes.ts:90`](../../../src/kernel/lifetimes.ts)) are factories/wrappers whose closures save one argument each. Dead nullish fallbacks: `...(config.plugins ?? [])` in both `assemble.ts` files, where the merge unconditionally assigns `plugins`.

**A-9 · `CollectionChange` is a tagged union over `Insertion | null`.** [`src/sortable/collection.ts:17-23`](../../../src/sortable/collection.ts): two exported numeric constants, a two-arm union, six object literals constructed across `reconcileCollection`'s returns, and one consumer ([`src/sortable/spec.ts:1061`](../../../src/sortable/spec.ts)) that immediately unpacks it. `null` is already this same function's spelling for "no incumbent" on its own `incumbent` **parameter**, so it is unambiguous as an output. §3, §9, §4 and §2.2 all bite. No `.plan/` row defends the shape.

**A-10 · `runPhysicalTeardown` repeats `retireOperation(null)`.** [`src/kernel/kernel.ts:527-560`](../../../src/kernel/kernel.ts) against [`:489-521`](../../../src/kernel/kernel.ts) — the same five steps in the same order behind the same `spec !== null` guard. §6. Recorded as (a) subject to the owner confirming that `clearOperationState()` is a no-op when `spec === null`, which the field inventory supports but which is an invariant claim rather than a syntactic one.

**Measured, A-1 through A-6 together** (the subset applied mechanically): **−32 B** on `minimal`, −37 on `complete`, −8 on `free drag minimal`, −27 on `both behaviors`. **The whole clean-deletion set is worth about one fifth of one module's slack.** That is the honest headline of this section: the hygiene findings are real and they are individually correct, and they are not where the bytes are.

### 5.2 (b) — needs an owner or architectural decision

**B-1 · The kernel's landing gate is unconditional machinery for an optional feature.** `SettlementAttempt.holds/start/landing/landingHeld` ([`src/kernel/kernel.ts:165-190`](../../../src/kernel/kernel.ts)), `createSettlementScope`/`holdForLanding`, `rollbackLandingHold`, `completeLanding`, the `start !== null` arm of `armSettlement` including the `LandingContext` construction, the `handle !== null` arm of `joinSettlement`, `handleLandingSettled` and the `LANDING_SETTLED` action — roughly 120 lines. The only producer of a hold is `scope.holdForLanding(slots.startLanding)`, and `startLanding` is non-null **only when the consumer composed `landing()`**, which `bench/size/measure.ts` asserts absent from `minimal`. So `minimal`, `minimal (xy)` and `free drag minimal` ship the whole gate, the completion latch, the queue action and the runner-destroy branch for a feature they provably cannot execute. §7's first bullet — _"landing code should not leak into a composition that does not use landing"_ — plus §5, since four of `SettlementAttempt`'s nine fields exist only for it.

**This is the single largest §7 candidate in the package and it is deliberately left unmeasured.** It cannot be ablated without changing the behavior SPI, and an ablation that changes the SPI measures a different library. For scale only: `landing()`'s **own module** is the 293 B marginal between `minimal` and `minimal + landing`; the kernel-side gate that serves it is comparable in line count and is paid by everyone.

**B-2 · Two unreachable lift modes, and a fact only free drag reads.** [`src/kernel/presentation.ts:511-619`](../../../src/kernel/presentation.ts). `src/sortable/spec.ts` imports **only** `LIFT_FAITHFUL`, but `acquireLift` branches on the runtime value, so the in-place branch, the flat branch and `makeSession`'s projection-composing arm are unreachable and unshakeable in all five sortable rows. Separately, `inheritedSpaceOf` is computed unconditionally for every mode and its **only** reader is `src/free-drag/spec.ts:295` — the sortable computes it, carries it, and never reads it. D-85 ratifies "computed for every lift mode" as a _correctness_ property, so this is a topology decision, not a deletion. Estimated 100–200 B on the sortable rows.

**B-3 · Displacement and landing call-site machinery in `minimal`.** [`src/sortable/spec.ts:488-505`](../../../src/sortable/spec.ts) (`settleDisplacement`), the `view.insertion` / `finally` bracket at `:1092-1169`, and both `for (const hook of slots.beforeMove/afterMove)` loops. `beforeMove`/`afterMove` are populated **only** by `layoutAnimation()` and `startLanding` **only** by `landing()`, so in `minimal` and `minimal (xy)` the arrays are provably empty and the gate provably null — but they are built at runtime, so no bundler can prove it. The module boundary holds, which the harness asserts; the call-site machinery is what leaks. Note fairly that `retireHooks` is genuinely non-empty in `minimal` (the axis pushes `insertion.retire`), so that loop is **not** leakage.

**B-4 · Two fixed key-list merge walkers.** [`src/sortable/config.ts:135-188`](../../../src/sortable/config.ts) (12 keys) and [`src/free-drag/config.ts:104-151`](../../../src/free-drag/config.ts) (13 keys). §2.2 names schema walkers directly. **The recorded rationale does not describe observable behaviour**: contract 03 says walking a fixed list _"makes a misspelled slot a diagnosable no-op rather than a silent one"_, and nothing diagnoses anything — a misspelled key is silently dropped by the walk, and under an own-key walk it would land in the merged record where no reader exists. Both outcomes are silent. Excess-property checking already rejects the misspelling for the inline literal the public API is written for, and the one shape that escapes it is a spread of a wider record, which §1.1 assigns to the consumer. **Flagged as an apparent contradiction with §1.1/§2.2 rather than resolved**, because it is a written decision (D-45).

**B-5 · The `assertFrameScrubbed` cost that was never priced is its execution, not its text.** [`src/kernel/frames.ts:308-328`](../../../src/kernel/frames.ts), reached twice per retirement from `scrub()`. Each run allocates `Object.keys(frame)`, runs `sameKeys` with an `.every` closure, allocates **one descriptor object per frame key** in `validateFrameDescriptors`, then walks every key again — plus two `guarded` closures per frame. D-107 priced the assertion's strings; nothing priced its per-operation allocation profile, and §0 makes runtime the senior axis. The invariant is real (a reset retaining a DOM node leaks it across every later operation), so the question is **frequency**, not existence: every retirement, or the first.

**B-6 · The seam re-entry latch runs on the per-sample path.** [`src/kernel/seams.ts:316-345`](../../../src/kernel/seams.ts). `refuseReentry()` runs inside every `runPhase`, which includes `runLeaf(runMoved, …)` — the per-pointer-sample path. `SeamDriver` is internal; every behavior-facing entry is queued, so the only caller that can re-enter is the kernel itself, and the module's own doc concedes _"the queue is run-to-completion."_ A branch, two latch writes and a 103-byte message defending against a kernel-authoring bug. Raised as B-11 at Checkpoint B and deferred.

**B-7 · Diagnostics whose decline reasoning does not reach them.** D-107 declined Class B on the ground that those messages _"**can** fire in a correct deployment, because the condition is the page's state or the consumer's own returned value."_ Two free-drag sites do not meet that description by their own comments: `'drag: released a free drag with no lifted visual'` and `'drag: a free drag settled as skipped, which it never declines'` ([`src/free-drag/spec.ts:584,679`](../../../src/free-drag/spec.ts)) assert **broken library invariants** — `SETTLED_SKIPPED` has no producer in the behavior. Also in this class: the two seam reports at [`src/kernel/seams.ts:421,515`](../../../src/kernel/seams.ts), which D-108 un-gated together with the two frame asserts. The asserts change what an author is told; the reports have **no behavioural consequence at all** — `staged = null` runs regardless, and `report(error)` already surfaced the fault. Whether the reports can be re-gated independently of the asserts is an owner ruling, and it is worth taking: D-108's own landing cost is recorded in the harness as **+282–305 B on every row**.

**B-8 · Duplicate representations in the sortable's per-operation state.** `rt.snapshot` beside `rt.view.snapshot`, `rt.placeholder` beside `rt.view.placeholder` (dual-written, then read through four `!` assertions), and `PresentationView.item` beside the frame's own `item` — where [`src/sortable/slots.ts`](../../../src/sortable/slots.ts) states the rule this breaks: _"Duplicating it onto the per-operation view would create a second copy that a future seam could let drift."_ §5. The `!` assertions are the tell: the compiler cannot see what the code knows, which is that the view is the authority.

**B-9 · Self-certified-unreachable guards retained for future-proofing.** `rt.pendingSpatial` ([`src/sortable/runtime.ts:148`](../../../src/sortable/runtime.ts)) exists for a conjunct the code documents as _"unreachable as things stand"_; the `current.phase === REPORTING` conjunct at [`src/kernel/kernel.ts:700`](../../../src/kernel/kernel.ts) is documented as _"unreachable today … kept only so that making `ERROR_REPORTED` asynchronous later cannot silently reopen the swallow."_ Both are deliberate, documented forward-guards. §5's litmus asks what invariant requires them at runtime and the honest answer is "a change nobody has made". Tens of bytes each; recorded because a final ownership pass is the moment to decide whether the package carries them.

**B-10 · Carriers and wrappers with a stated but weak boundary.** `FreeDragRuntime` ([`src/free-drag/runtime.ts:71`](../../../src/free-drag/runtime.ts)) — one construction site, and its only consumer destructures two of six fields away on its first line; its documented job is to be the inventory of per-operation state, and the inventory is incomplete (`progress`, `view`, `pendingFailure` live in the spec closure). `runActivationSeam`/`runReleaseSeam` plus `activationPolicy` — one call site each, an object literal built for the callee to unpack immediately, and the **settlement seam does not use a wrapper at all**, which weakens the "these are the seam policies" framing. `createSettlementScope` allocates a per-settlement capability object where the file threads the other two seam inputs through controller-lifetime slots. `armedStamp`/`stamp` plus `runStamped` — two slots, two consume-and-clear sites and a `try/finally` to carry one `Phase` across a seam boundary the file declined to widen. Each is §2.1/§9-shaped; each has a written boundary argument; §2.1's last line asks that they be recorded rather than inlined automatically, which is what this row does.

**B-11 · `root.isConnected` before pointer capture.** [`src/kernel/kernel.ts:1159`](../../../src/kernel/kernel.ts). `acquirePointerCapture` deliberately lets `setPointerCapture` throw and the caller classifies it (D-17); Pointer Events specifies `InvalidStateError` for a disconnected element, and both throws land in the same `catch` and produce the same `FAILURE_ACTIVATION`. Only the `cause` differs. §1.1's last bullet. Contract 02 states the pre-check as normative, which is why this is (b) — the contract text states more than D-17's invariant requires.

**B-12 · `ConstraintView` allocated for compositions with no constraint.** [`src/free-drag/spec.ts:296`](../../../src/free-drag/spec.ts) builds `view` on every activation; it is read at exactly one site behind `applyConstraint?.(...)`, and `constrain === null` in `free drag minimal` and `free drag + landing` — the default compositions. Moving the assignment inside the `if` on the next statement is zero-semantic-change; recorded as (b) only because it sits inside the activation path.

**B-13 · The `QUALITY` failure tier has one caller.** [`src/kernel/seams.ts:264`](../../../src/kernel/seams.ts) and its five supporting sites, serving `kernel.ts:1457`'s arm-time `anchorTarget` measurement. D-49's argument — channel and tier chosen independently — is sound and this is close to (c); recorded so an owner can decide whether one caller earns a third generic tier or whether that one site can call `spec.reportFailure` directly.

**B-14 · `free-drag.ts` imports `draggable` from the kernel-tier root.** [`src/free-drag.ts:28`](../../../src/free-drag.ts) reaches `./kernel.ts`, the root that also re-exports 33 runtime values. It costs nothing today and the budgets would catch a regression — but it is the same fragility F-77 recorded for `drag.js`: one runtime reference from `draggable` into any re-exported constant and the ordinary tier starts paying for the kernel tier's export surface. §7.

### 5.3 (c) — expensive-looking, justified

- **`copyUniqueItems`'s `Set`** ([`src/sortable/collection.ts:41`](../../../src/sortable/collection.ts)) — D-77 kept this as the sortable's one surviving construction throw after deleting five others _under this same doctrine_, and the invariant is library-owned and type-inexpressible: `destinationOf` filters every occurrence while `from` comes from `indexOf`, so a duplicate puts `from` and `to` in index spaces of different size. It routes through the seam rather than throwing at the consumer, which is what §1.1 asks for. One observation: at the **seam** call site it allocates a `Set` of every item on every _structural_ invalidation, not only at construction — bounded correctly by D-44's array-identity test, and recorded so a later pass does not mistake the two call sites for one.
- **`verified-refresh.ts`'s mirror state and the whole wrapper** — read literally this is §5 plus §2.1. It is §7 working as intended: folding the fast path into the shared cache cost an `xy()` composition **+135 B** of machinery it can never execute, and the harness asserts the module absent from `minimal (xy)`. The mirror cannot drift — all three mutators pass through the wrapper. Its `DEV` instrument is verified absent from the emitted output.
- **`rect-index.ts`** — the packed `Float64Array`, the `capacity > 4n` shrink hysteresis (D-104) and the `live()` barriers are hot-path or I-36 obligations, and the module records that the accessor form cost 90 B _and_ two calls per resolution.
- **`kernel.js`'s 33 exported runtime values** — §4 exempts them itself: _"If an exported value is required for public authoring, that is an API decision, not a size trick."_ D-68 published the kernel tier and F-59 records that it was unauthorable without them.
- **The `= 13` hole and the D-74 renames** in `failures.ts` — §13. The numbers are wire values in consumers' compiled code.
- **Cross-behavior duplication** of `claim`, `rejection`, the progress markers and `finalized` between the two behaviors — measured at ~187 B on `both behaviors` and **exactly 0 B** for any single-behavior consumer. §7's "small duplication preferable to a shared abstraction" working as designed.
- **The finiteness checks on `moveTo` and `home`, and the `landing({ duration }) === Infinity` refusal** — all three are in contract 07's **classified** table, and the `Infinity` case is measured: `animate()` accepts it and never settles, so the settlement gate is never released. I verified positively that **no** check exists for any row that table marks **silent** — `threshold` takes its default with no domain test, `axis` is carried unresolved, `lift` goes through the total `Record`. The table is being honoured.
- **`isReorderResolution`, `thenOf`, `measureInSeam`, `LiftAcquisition`, the by-reference pointer queueing, and `runMoved`'s hoisted closure** — each is either an invariant boundary or a §0 allocation choice, and inlining or folding them costs runtime.

---

## 6. Contradictions between the record and `CODE_OF_SIZE.md`

Reported as contradictions, not resolved:

1. **The seed premise against D-30 and D-74.** `FailureStage`'s numeric values are described in the audit request as internal; the record makes them public wire values that must never move. A dense zero-based representation is an API change under §13, not a size optimization. (§3.1)
2. **D-107's A1 ratification against §1.1's litmus.** Contract 04's production-check discriminator was written about `validateFramePart`'s kernel-key check, and the decision applies it to the whole function. Four of its checks defend the behavior author's own contract, one of them against a failure that cannot occur, and they cost **153 B** on every composition. (§2)
3. **D-45's fixed key-list merge against §1.1/§2.2.** The recorded benefit — a misspelling becomes _"a diagnosable no-op rather than a silent one"_ — is not delivered by the mechanism; both branches are silent. (§5.2 B-4)
4. **D-108's un-gating against §1.3, for the two _reports_ specifically.** F-78's published-authoring-surface argument is strong for the two frame asserts and weak for the two seam reports, which have no behavioural consequence. The package still owns and uses the `__DEV__` mechanism §1.3 asks for. (§5.2 B-7)
5. **D-107's Class B rationale against two free-drag sites.** The decline rests on _"they can fire in a correct deployment"_; two of the sites assert broken library invariants by their own comments, and by D-107's own taxonomy are Class A shaped. (§5.2 B-7)
6. **Contract 04's `outcome` row against the code.** The row justifies the field by a reader D-62/D-66 deleted. Whichever way the field is decided, the row needs correcting. (§5.1 A-3)
7. **`bundle-structure.md` row A1 against §7's own instruction to measure compositions.** Not an error — a scope limit. D-107 swept **error-message text and module topology**; §16 and the Order of attack put **machinery** first, and machinery was not swept. B-1, B-2 and B-3 are all outside what that sweep could have found, because its unit was "module present or absent in the graph", not "code inside an always-present module that only an optional feature can reach".

---

## 7. What the whole clean programme is worth

Combining the mechanically safe subset — the three library-owned checks kept in `validateFramePart` (A3), the three inert `command.types` checks removed, the write-only `outcome` field removed, and the A-1…A-6 dead-machinery set — measured jointly:

| Composition               | baseline | combined | delta    | %      |
| ------------------------- | -------- | -------- | -------- | ------ |
| minimal                   | 11 435   | 11 150   | **−285** | −2.5 % |
| minimal (xy)              | 11 085   | 10 802   | −283     | −2.6 % |
| minimal + layoutAnimation | 11 874   | 11 582   | −292     | −2.5 % |
| minimal + landing         | 11 728   | 11 439   | −289     | −2.5 % |
| complete                  | 12 139   | 11 863   | **−276** | −2.3 % |
| free drag minimal         | 9 007    | 8 772    | −235     | −2.6 % |
| free drag complete        | 9 459    | 9 212    | −247     | −2.6 % |
| both behaviors            | 13 699   | 13 419   | −280     | −2.0 % |
| `kernel.js`               | 6 797    | 6 558    | −239     | −3.5 % |
| baseline A                | 11 848   | 11 579   | −269     | −2.3 % |
| `drag.js`                 | 121      | 121      | 0        | —      |

Two notes for whoever acts on this. **The deltas here happen to be near-additive** — the four ablations measured alone sum to −284 against a joint −285 on `minimal` — which is a property of these particular changes and not a general one; §4 (ii) above is the counter-example. And **every row would land roughly 280 B under budget**, about twice the ~150 B slack convention, so a pass of this size ends in a budget re-base rather than in headroom. That is a re-base by the Phase 22 rule (the fix lands, the budget follows), and it does **not** meet **SC-1**, whose trigger is a row going _negative_.

**Where the bytes actually are, ranked:** diagnostic text at 851–949 B (owned, SC-2/O-1) · the kernel landing gate, unmeasured (B-1) · `validateFramePart`'s four author-contract checks at 153 B · the lift-mode and displacement leakage at an estimated 250–450 B combined (B-2, B-3) · `arm()`'s inert `command.types` checks at 68 B · everything else in this document, together, at about 60 B.

---

## 8. Limits of this audit

- **No production code was changed.** The tree rebuilds byte-identical to §1's table; the only working-tree diff is a pre-existing, unrelated `src/stories.module.css` edit belonging to the user.
- **B-1 is unmeasured, deliberately.** Ablating the landing gate changes the behavior SPI, and a measurement of a different SPI is a measurement of a different library. It is nonetheless the largest §7 candidate found.
- **Byte figures are Brotli of the minified composition**, the package's own reported figure. Minified bytes are shown where they disagree, which they do (§3.2).
- **Runtime-performance claims are structural, not benchmarked.** B-5 and B-6 name allocation and per-sample work read off the code; §0 makes them the senior axis, so they deserve a measurement this pass did not take.
- **`.plan/reviews/` is outside the D-112 reference resolver's six scope roots**, so nothing here is machine-checked. Citations were resolved by hand.

LSP plugin - available; used: documentSymbol on the errors module to enumerate STAGE_TO_CODE's computed-key members, and findReferences on validateFramePart and KERNEL_FRAME_KEYS to establish that each has exactly one production call site and that neither is reachable from a published root.