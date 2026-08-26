# The consumer fault classification, from first principles (D-132)

**Scope.** What machine-readable classification, if any, `onError` should hand an ordinary consumer. Traced at `9e7cbfc6`, the commit that landed D-130 — so the tree already has one channel, two classes and a kernel-owned constructor, and this question is what the _fatal_ class should carry on it.

**What was traced, not assumed.** Every `new DraggableError` and `toDraggableError` site in `src/`; every `.code` reader in `src/`, `tests/` and `docs/`; the D-64, D-74, D-81 and D-130 rows; `errors.ts`'s E-08 narrowing; `failures.ts`'s wire-value rule; the measured cost record; and the compiled Revision 2 fixture. **No source site in `src/` reads `.code`** — the field is consumer-facing in the strict sense, so nothing internal constrains the answer.

---

## 0. Verdict

**`DraggableErrorCode` is deleted. `DraggableError` carries `readonly stage: FailureStage | null`, and `FailureStage` with the twelve `FAILURE_*` constants is published from `drag.js` as a second publication point of the one declaration in `kernel/failures.ts`.**

The owner's simpler possibility is the right one, and the reason is sharper than _the extra taxonomy is unnecessary_:

1. **The coarse code is a claim its input cannot support.** It answers _whose fault_ from data that answers _where the library was standing_ — and this contract already settled, at D-81, that those are different questions.
2. **D-64's mechanism was retired by D-130 three days ago.** The total mapping existed so `code` could not mean different things in different behaviors; kernel-owned construction now prevents that structurally. What is left of the mapping does one job: discard information.
3. **The package's own suite already votes.** Nineteen assertion sites identify an error by writing `toDraggableError(FAILURE_X, null).code` — naming the stage and translating. When the tests that own the surface route _around_ the published vocabulary to reach the internal one, the internal one is the identity.

---

## 1. The consumer-visible population is three sites

| Site | Built from | Reaches the consumer as |
| --- | --- | --- |
| [`kernel.ts:909`](../../src/kernel/kernel.ts) — `admit` threw | `toDraggableError(FAILURE_ADMISSION, …)` | `consumer` |
| [`kernel.ts:2241`](../../src/kernel/kernel.ts) — the failure checkpoint | `toDraggableError(checkpoint.stage, …)` | any of the twelve |
| [`kernel.ts:694`](../../src/kernel/kernel.ts) — `panic` | `new DraggableError('platform', …)` | `platform`, **and it holds no stage** |

So the entire design space is _what do we say about a stage_ plus _what do we say about panic_. There is no third kind of consequential fault, and no behavior constructs one: `sortable/spec.ts:435` and its free-drag twin **carry** a `DraggableError` the kernel built and never mint one.

---

## 2. Four reasons the coarse axis does not hold

**(a) It is not one axis, and `errors.ts` already says so.** E-08 narrowed the header to _the axis is fault attribution where the stage names a caller, and seam position where it names a seam_ — because _the stronger claim this comment used to make is not what the call sites do_. A discriminator with two axes is not a discriminator; it is two fields sharing a name.

**(b) D-81 settled that the input cannot carry attribution.** _A stage answers where the library was standing, not whose data was bad._ The row accepted that reading and corrected five contract locations to match it. `DraggableErrorCode`'s published axis is _whose data was bad_. The mapping therefore derives a promise from a description, which is precisely what D-81 recorded as **open**: _whether a stage is a promise or a description is Checkpoint E's_. This is that answer, applied past the width of one table cell.

**(c) The one documented consumer decision gives the wrong answer.** [`docs/revision/revision-2.ts:362`](../../docs/revision/revision-2.ts) is the package's compiled demonstration of what the field is for:

```ts
return error.code === 'consumer' ? 'mine' : 'theirs';
```

D-81 enumerates what a consumer's own garbage `bounds` source produces: `FAILURE_ACTIVATION` on first resolve, then `FAILURE_RENDERER_WRITE` or `FAILURE_ACTION_EFFECT`, or `FAILURE_RELEASE` — codes `interaction`, `presentation`, `presentation`, `interaction`. **Never `consumer`.** The fixture answers _theirs_ four different ways for a fault that is entirely the consumer's, on what is likely the most commonly third-party-authored seam the package ships. That is not coarseness; a coarse answer is right and imprecise. This one is precise and false.

**(d) `platform` is an _other_ bucket, and the library uses it as one.** `panic` picks it directly, with no stage to map from. But a throw escaping a handler is an invariant violation — the contract says so in the same comment — and the published gloss for `platform` is _the platform refused something_. Today a panicked controller and a failed `requestAnimationFrame` are indistinguishable to a consumer. **F-104.**

**And the loss is one-way.** Twelve stages fold to four codes; four codes recover nothing. A consumer who wants the coarse grouping can compute it; a consumer who wants the stage cannot.

---

## 3. What D-130 already took out of D-64

D-64's central mechanism is stated in [`kernel.ts:169-180`](../../src/kernel.ts): publishing stages and codes _without the mapping between them_ would let `code` mean something different depending on which behavior raised the error, so the mapping is a library obligation and must be total in the type.

That obligation was discharged differently on 2026-08-26. [`spec.ts:522-545`](../../src/kernel/spec.ts):

> Kernel-owned construction removes that risk **structurally** rather than by publishing the mapping — which is why `toDraggableError` left the kernel entry with this member's stage argument.

**The mapping's anti-divergence job is done, by construction ownership rather than by publication.** What remains of `STAGE_TO_CODE` is only the lossy step — and a total mapping whose sole surviving function is to discard information is not an obligation, it is overhead with a compile-time guard on it.

---

## 4. The candidates

### 4.1 Keep the coarse code — refused

Refuted by §2 (b) and (c) together: the axis is not derivable from the input, and the package's own worked example of the decision it enables is wrong. Coarseness was never the objection.

### 4.2 The stage as the classification — **taken**

A stage is an honest statement. A garbage `bounds` source still surfaces at four different stages depending on which seam renders first — but each of those four is **true**, and the consumer can see that the four are one fault surfacing late rather than four different kinds of fault. The dishonesty was in the derivation, not in the data.

It also restores a parity the ledger recorded as deliberately lost: [`ledger.md:62`](../ledger.md) books D-64's narrowing as _a deliberate parity loss on the telemetry axis_. Bucketing by twelve stable numbers is exactly that axis.

### 4.3 No classification at all — refused

Symmetry with `DraggableWarning` is tempting and is the wrong reading of why the warning carries nothing. **A warning needs no discriminator because nothing follows from it** — by construction the outcome did not change, so there is no decision to take. An error is the opposite case.

And one honest, actionable subset survives every objection in §2: `FAILURE_ADMISSION`, `FAILURE_RESOLUTION` and `FAILURE_TERMINAL_CALLBACK` **name a caller** rather than a seam position, and the caller is the consumer. A consumer whose `onReorder` round-trip threw has application state that may be half-applied and resynchronisation work that no other failure implies. Deleting the discriminator would remove the one decision the surface genuinely supports in order to be rid of the three it does not.

### 4.4 A twelve-member string union at the ordinary tier — refused

`code: 'admission' | 'activation' | …` keeps the granularity, reads well in a logged payload, and needs no runtime constants. It is refused because it **creates a permanent synonym for every stage** — `FAILURE_ACTION_PREPARE` and `'action-prepare'`, which must never diverge — and it keeps the very mapping table this decision deletes, with twelve distinct outputs instead of four repeated ones. D-74 is this package's worked example of a name and a value drifting apart; adding twelve more pairs to guard is the wrong direction. The readability it buys is real and is paid for in §5.3 instead.

---

## 5. The shape

### 5.1 The field is renamed, because its meaning changed

`readonly stage: FailureStage | null`, not `code`. This applies the package's own discipline: `failures.ts` forbids _a rename that repoints a value_ precisely because a name that survives a meaning change makes the break silent. Keeping `code` while changing both its type and its axis would leave `err.code === 'consumer'` compiling to a comparison that is now always false. Under the rename it is a missing property.

**This is available now and never again.** The package is `private: true` at `0.1.0`; nothing has shipped. If it publishes before this lands, `code` is frozen and only §4.4 or the status quo remain.

### 5.2 `null` is panic, and it is an improvement rather than a concession

D-130's own rule — _if it has no meaningful stage, the type should say so honestly_ — was written for the non-fatal class and applies verbatim here. `FailureStage` classifies faults **within** an operation; panic destroys the controller, so there is nothing to classify. Manufacturing a thirteenth stage for it would reproduce exactly the defect D-130 forbade, on the other class.

**Required property:** the null arm must be documented as _the controller is destroyed_, not as _unknown_. It is the only value that means it, and it replaces a `platform` that meant nothing there (§2 (d)).

### 5.3 The human channel stays in the message

`err.stage === 4` in a logged payload is worse than `'presentation'`, and that cost is real. It is paid where the package already pays it: `DraggableError`'s constructed message. Today the fallback is `drag: ${code} failure`.

**Required property:** the fallback message names the stage in words. The split is then explicit — `message` is the human channel, `stage` the machine channel — instead of one string union trying to be both, which is what §4.4 would have kept.

**One thing this does not do:** it does not reopen [`plan.md:1223`](../plan.md)'s declined message-text saving. That decline covered author-facing validators and the consumer-callback text together, and its consumer half was argued from the coarse code being _too thin to log alone_. A twelve-way stage weakens that argument in one direction and §5.3's new obligation strengthens it in the other. A later size pass may reopen it; it must do so explicitly and must not read this decision as licence.

### 5.4 What does not move

`DraggableWarning` is untouched — no code, message plus `cause`, not a `DraggableError`. The one channel, `notify`, and `reportError(error)` are untouched. **Nothing in the library branches on the class or on the stage**, which is the constraint D-130 fixed and this decision must not spend: the failure site still knows what it is reporting.

---

## 6. Tier and export consequences

- `DraggableError`'s structural closure now names `FailureStage`, so **`drag.js` publishes the type** — D-68's rule, unchanged.
- _A numeric union whose members are unnameable is not a public type_ (03 §The public/internal boundary), so **the twelve `FAILURE_*` constants are runtime exports of `drag.js`** as well.
- **One declaration, two publication points.** `kernel/failures.ts` stays the single declaration and `kernel.js` keeps its export; `drag.js` re-exports the same one. This is the `AT_PROPOSAL`/`AT_CONSUMER`/`CancelStage` pattern the package already runs between `kernel.js` and `sortable.js`, and `kernel.ts:206-220` states why it is one declaration and not two.
- **Not on the behavior entries.** Publishing the values from `sortable.js` and `free-drag.js` would split a vocabulary so the consumer names the type at one entry and the values at another. The type has to be at `drag.js`; the values follow it.
- **D-64's tier half survives and its vocabulary half reverses.** The inversion D-64 exists to prevent — an ordinary consumer importing `kernel.js` — still cannot occur, because the stages reach that consumer from the shared root.
- `toDraggableError` deletes (D-130 already unpublished it); `DraggableErrorCode` deletes from `drag.js` and from `tests/kernel/vocabulary.node.test.ts:91`.

---

## 7. Size is a wash, and this is recorded so it is not re-litigated

- Publishing the stage constants at an ordinary entry costs a bundling consumer **0 B**, measured three ways in [`failure-vocabulary-cost-claude.md`](failure-vocabulary-cost-claude.md).
- `STAGE_TO_CODE` and `toDraggableError` are part of the only non-zero figure in the area — `kernel/errors.js` at 67 B Brotli — whose class half stays. The deletion is small and positive.
- The mapping's own counterfactual measured **30 B minified / 3 B Brotli**. That record's conclusion applies unchanged: the number neither supports nor undermines the decision.
- **`CODE_OF_SIZE` §4 is satisfied, not violated.** The clause is _avoid exported numeric failure constants **unless they are part of the supported consumer contract**_. This decision makes them so, explicitly and in writing. A later size pass must not read the twelve constants at `drag.js` as an unowned publication.

---

## 8. Consequences for existing decisions and findings

| Row | Effect |
| --- | --- |
| **D-64** | Its **vocabulary half is reversed** — coarse codes, stages withheld from the ordinary consumer, the total mapping as a library obligation. Its **tier half stands**: `DraggableError` on the shared root, no ordinary consumer reaching `kernel.js`, one declaration per name |
| **D-130** | **Extended, not amended.** The same rule — do not manufacture a stage for a fault that has none — applied to the fatal class, where it produces `null` rather than an absent field |
| **D-81 / E-08** | This is the general answer D-81 deferred and E-08 half-took. A stage is a **description**; the library stops selling it as a promise. 07 §Validation's standing note that `FAILURE_INSERTION`/`FAILURE_PLACEHOLDER_MOVE` map to `presentation` _for library arithmetic_ deletes with the mapping — it was an apology for the axis |
| **D-74** | **Strengthened.** The three renamed stages' numbers become consumer wire values in fact rather than in intent, so `errors.node.test.ts`'s literal `[4, 5, 8]` row is promoted from belt to load-bearing |
| **D-60** | Unaffected. Orthogonality of `onError` and the terminal is about channels; this is about vocabulary |
| **F-80 (d) / F-81** | **Closes (d), by the premise returning.** `failures.ts:6` says a consumer receiving `onError` has to be able to discriminate a `FailureStage`. That became false at D-64 and is true again here. F-81's third class — _load-bearing arguments whose premise expired_, which it records as admitting no mechanical check — gets its first disposition that is neither a repair nor a deletion, and that is worth recording as much as the closure |
| **F-104** (new) | `panic` reports `platform`, which the taxonomy's own gloss defines as _the platform refused something_, for an invariant violation that destroys the controller. Pre-existing, mooted by this decision — recorded so the fix is not read as incidental |

Documents to correct: 03 §The error the consumer receives (the declared class and union), 03 §The export topology's `drag.js` row, 03 §The public/internal boundary's D-64 paragraphs, 07's `onError` row and its D-74 note, [`ledger.md:62`](../ledger.md)'s parity row, [`api-surface.md:146`](../api-surface.md) and F-80's row.

---

## 9. Tests

**Rewritten.** The ~19 sites writing `toDraggableError(FAILURE_X, null).code` collapse to comparing against `FAILURE_X` — `features.browser.test.ts:52`, `composition.browser.test.ts:420`, `sortable.browser.test.ts:817/970`, `activation-snapshot.browser.test.ts:171`, `validation.browser.test.ts:58`, `anchor.browser.test.ts:482`, `kernel.browser.test.ts:743/1152/3834`, `consumer.node.test.ts:241/626/869`. **That collapse is evidence, not just cleanup:** the indirection existed only to survive a remap of a mapping that will no longer exist.

**Survives, rehomed.** Four rows of `tests/kernel/errors.node.test.ts` outlive the file's subject and must land in a stage-vocabulary suite: the reflection over the module's `FAILURE_*` exports, `toHaveLength(12)`, the 12/13 holes, and the `[4, 5, 8]` literals. **Their witness changes** — the holes were witnessed by `STAGE_TO_CODE`'s padding, which is gone, so the witness becomes the published union plus the reflection. The `DraggableWarning` block and the `cause`-identity row survive as they are, the latter retargeted at the constructor.

**Deleted.** The stage → code enumeration, the four-class closure row, and the `Record<FailureStage, DraggableErrorCode>` exhaustiveness fixture at `docs/revision/revision-2.ts:203`.

**Added.**

- `panic` surfaces a `DraggableError` with `stage === null` — the one assertion that distinguishes it from a classified failure, and the one nothing can make today.
- `drag.js` publishes `FailureStage` and the twelve constants: the frozen equality in `tests/exports.node.test.ts` and the list in `vocabulary.node.test.ts`.
- `revision-2.ts`'s `n8` inverts from `@ts-expect-error a FailureStage is not a DraggableErrorCode` into a positive assertion, and its `report()` fixture is rewritten. **The rewrite is the demonstration**: the honest version is a switch over the three caller-naming stages, not one equality against `'consumer'`.

`tests/COVERAGE.md:520` and `:657` rewrite with them.

---

## 10. What disappears

`DraggableErrorCode`; `STAGE_TO_CODE`; `toDraggableError`; one export from `drag.js` and one entry in the published-vocabulary list; one total-mapping obligation and the compile-time guard that enforced it; one exhaustiveness fixture; one `@ts-expect-error`; three test rows; nineteen indirections; one standing apology in contract 07.

**Net: one published fault vocabulary instead of two, with no derivation between them.**

---

## 11. What would reverse this

- **A reachable consumer decision the four classes serve and twelve stages do not.** None was found; §2 (c) shows the documented one running the other way.
- **A second stage-less consequential fault beside panic.** `null` then stops meaning _the controller is destroyed_ and becomes a bucket, which is the point at which a discriminated shape earns its cost.
- **A behavior that must construct a `DraggableError` itself.** D-64's divergence risk returns the moment construction leaves the kernel, and the mapping's deletion would need re-arguing.
- **Publication before the rename lands.** `code` freezes and §5.1 becomes unavailable.