# Free drag — public contract and decomposition (Phase 18)

## What this is

The normative contract for the package's **second behavior**: its public surface, its decomposition into config slots and capabilities, its mapping onto the kernel SPI, and the acceptance criteria Phase 19 is built against. It carries decisions **D-69…D-76** and findings **F-62…F-66**; the rows themselves live in [00](00-index.md), which stays the decision ledger.

It sits below 00 and above 06 in the precedence order of [00 §Normative precedence](00-index.md#normative-precedence-and-freeze): where this document and 02 disagree about a **seam**, 02 wins; where it and 03 disagree about **composition**, 03 wins; what is free-drag-specific is decided here and nowhere else.

**Design phase, no runtime.** Nothing below is implemented. Two of its preconditions are not implemented either, and that is the first section rather than a footnote.

## Three fixed constraints, and what each one settled

| Constraint | What it fixed |
| --- | --- |
| **The kernel as it exists in `src/`**, not as 13c described it | Every seam signature below is the shipped one. 13c's typed probe predates two SPI crossings and is stale in both directions (revision handoff §134) — it was re-read, not trusted, and F-63 is what re-reading produced |
| **The Revision 2 surface** (D-36…D-68) | `freeDrag(item, …fragments)` returning a controller (D-48), fragments as plain partial configs (D-45), one `onEnd` (D-62), coarse `onError` (D-64), exactly-once terminal (D-66), `destroy(): Promise<void>` (D-36), the kernel vocabulary (D-68). None of it was reopened |
| **The parity ledger** ([`ledger.md`](../ledger.md) §6) | Every row is discharged in §Parity discharge below — retained, redesigned with its migration stated, or dropped with the loss named |

---

## Conflicts with the existing kernel, raised rather than worked around

### Two Phase 14 decisions were normative and unimplemented · **resolved 2026-08-15** (F-63)

**Canonical entry: `F-63` — [`00-index.md`](00-index.md) §Findings**

`plan.md` §Phase 14 booked both for "Phases 19–20", so this was a scheduling fact rather than a drift. What made it a **finding** is that free drag is not merely their first consumer — it is incorrect without them, and nothing in the toolchain said so.

**Both landed as D-76's discrete kernel step, against the sortable alone and with no free-drag module in the tree.** The table records what was found; the third column is what the step changed.

| Decision | What the contract says | What `src/` did, and does now |
| --- | --- | --- |
| **D-34** | `BehaviorSpec<Part, Activation extends {} = true>` — the activation seam's staged type is the behavior's choice | Was `activation: Transition<Part, HTMLElement, ActivationScope>`, pinned. **Now the parameter, threaded through `BehaviorInstall`, `BehaviorFactory`, `Kernel` and `draggable()`**; the sortable, the kernel harness and both compiled fixtures declare `HTMLElement` explicitly |
| **D-35** | The landing's origin is the delta the lift session last rendered | Was `from: { x: current.pointerX - current.originX, … }`, with the session recording nothing. **Now `VisualLiftSession.rendered`, written by `write` and sampled once at arm**; the behavior holds a `BehaviorLiftSession` carrying neither `rendered` nor `dispose` |

Free drag stages **nothing** at activation — no placeholder, no detached node, no acquired resource — so under the pinned signature its `prepare` would have had to return `scope.visual`, an element the kernel already holds, with its `effect` ignoring what it was handed. That is the staged-resource contract inverted, which is F-44 exactly. Under D-34 it returns `true`, and `tests/probes/13c-free-drag.ts` — the probe that found this — now compiles that answer as a **positive** rather than as a `@ts-expect-error`.

Free drag **constrains** its visual — an axis lock, a bounds clamp and a re-based position each mean the rendered delta is not the pointer delta — so under the pointer computation every constrained drop would open its landing from a position the visual is not at, and end correctly because the target is behavior-supplied. A wrong start and a right end is F-45's signature, and Phase 11 already found one of that shape the hard way. Under D-35 the origin is the delta the session last wrote, and the sortable's own axis-locked fixture is what pins it (K-3).

**The instrument gap is the reusable part, and it is the half that outlives the fix.** `tests/docs.node.test.ts` closes the documented surface over types, `tests/packaging.node.test.ts` asserts the entry table, the compiled fixtures assert the shapes that exist — and **nothing checked a decision booked to a later phase against the code that did not yet implement it**. Two contract-normative decisions sat unimplemented across a checkpoint and a whole revision with every suite green, because a green suite is evidence about the implemented contract only. See §Acceptance criteria, row K-5. **Closed by [00](00-index.md) §Decisions not yet implemented and `tests/decisions.node.test.ts`**: the ledger now marks a deferred decision in its own row, the table accounts for every marked row in both directions, and each entry carries a witness that stops holding when the decision lands — so a listed decision cannot be forgotten either.

### The kernel classified two behavior-generic seams with sortable vocabulary · **resolved 2026-08-15 (D-74)** (F-62)

**Canonical entry: `F-62` — [`00-index.md`](00-index.md) §Findings**

Three of the thirteen published failure stages named sortable concepts, and two of them were not behavior-chosen at all. As found:

- **the settlement seam** ran under `FAILURE_REORDER_RESOLUTION` for every behavior (`src/kernel/kernel.ts:1676`);
- **the action seam** ran under `FAILURE_INSERTION` (prepare) and `FAILURE_PLACEHOLDER_MOVE` (effect) for every behavior (`src/kernel/kernel.ts:2209`);
- ~~`FAILURE_INSERTION` and `FAILURE_PLACEHOLDER_MOVE` additionally map to `'presentation'` in D-64's total mapping, so a free-drag `moveTo()` whose prepare threw would report a **presentation** fault for library arithmetic.~~ **Deleted with the mapping (D-132).** This clause was an _apology for the axis_ rather than a third symptom: the discomfort it records — that `presentation` is a poor attribution for library arithmetic — is what D-132 concluded about the whole derivation, not about these two rows. There is no code to be wrong now; a `moveTo()` whose prepare throws reports `FAILURE_ACTION_PREPARE`, which is where the library was standing and is simply true.

Checkpoint E asks whether anything in `kernel/` knows a collection, a placeholder or an insertion. It did: three published constants, two of them as the kernel's own defaults. D-68 published all thirteen one revision ago, so the window in which a rename was free was the window before the kernel tier has a consumer — and the rename was taken inside it. **The three are now `FAILURE_ACTION_PREPARE` (4), `FAILURE_ACTION_EFFECT` (5) and `FAILURE_RESOLUTION` (8)**; the old names survive in this section because it is the record of what was found, and in `src/kernel/failures.ts`, which says what each constant used to be called. No numeric value moved, and `tests/kernel/errors.node.test.ts` asserts 4, 5 and 8 as literals.

### The kernel performs a sortable-shaped measurement for every behavior (F-65)

**Canonical entry: `F-65` — [`00-index.md`](00-index.md) §Findings**

D-52's **window 1** — the box's offset box, read by the kernel immediately before `acquireLift` and handed down as `ActivationScope.boxPre` — exists so a behavior can compute a placeholder footprint from the difference between two reads straddling acquisition. Free drag has no footprint, takes no second read, and never names `boxPre`; the read happens anyway, once per activation, because it is unconditional kernel work.

**Not a defect and not free.** It is one `getBoundingClientRect`-class read on a path that is already doing layout work, at a moment that is not the hot path. It is recorded because Checkpoint E's question is whether the kernel does work only one behavior needs, and this is the clearest instance — sharper than the failure-stage names, because renaming cannot fix it: removing it means making window 1 conditional on something the behavior declares, which is an SPI change with no evidence behind it yet. **Phase 21 measures it; Checkpoint E decides.** Free drag pays it and says so.

### Three composition types are structurally identical across two middle tiers (F-64)

**Canonical entry: `F-64` — [`00-index.md`](00-index.md) §Findings**

`FeatureContext` (`{ realm, root, report }`), the installer shape (`(context) => contribution`) and two contribution slots (`landingTiming`, `retire`) are behavior-neutral, and both middle tiers need all of them.

**Phase 18 declines to unify them, deliberately.** Inventing a cross-behavior composition vocabulary — a generic `Installer<C>`, a shared contribution base — before two behaviors exist is exactly the generalization Checkpoint E is convened to evidence, and building it here would consume the evidence it is supposed to produce. What Phase 18 does instead is the narrower thing that costs nothing: **one declaration, two publications**, the D-68 re-home pattern. `FeatureContext` and `LandingOptions` are declared once in internal modules and re-exported from both middle-tier entries under the same name, so the two tiers share a **type identity** rather than a structural coincidence. The installer and contribution aliases stay per-behavior, because their bodies genuinely differ.

**The falsifier, stated:** a third behavior, or a first-party capability that must be installable into both compositions without a per-behavior wrapper. Either one is the evidence that the shared vocabulary should be declared rather than duplicated, and Checkpoint E is where it is read.

---

## The public form (D-69)

```ts
const drag = freeDrag(
  item,
  { onDrop },
  bounds(stage),
  landing({ duration: 200 }),
);
```

**`freeDrag(item, config, ...fragments): FreeDragController`** — signature amended by **D-77**, which closed F-67 at this phase's end and applies to both behaviors:

```ts
declare function freeDrag(
  item: HTMLElement,
  config: FreeDragConfig,
  ...fragments: ReadonlyArray<Partial<FreeDragConfig>>
): FreeDragController;
```

From `@ydinjs/drag/free-drag`. Member for member the shape `sortable()` has — including its second parameter, which `sortable()` gains in the same step: the first argument is the ingress root — which for a free drag **is** the item — the second is a **complete** config, every later argument is a plain partial config merged by slot, and the return is the controller itself. The example above compiles under both signatures and is unchanged; what changes is that dropping `{ onDrop }` from it no longer compiles. The consumer never names `draggable`, never holds a behavior value, and never learns that a kernel tier exists.

**One vocabulary — `drag`, not `drop`.** The shipped package mixes `FreeDrop*` types with `FreeDrag*` export-site renames and the ledger left the successor to pick one. The drop is an event inside the drag; the drag is the thing being configured, controlled and named, so it names the entry, the function, the controller and the type family. `onDrop` keeps its name because it is the one slot that really is about the drop.

### The config schema

Required in the **first argument**: **`onDrop`** — a **type** requirement, and under D-77 one the compiler actually enforces. ~~The variadic merge is what hides it from the compiler, and (§Validation) says what happens instead of a throw.~~ The merge hid it only while every argument was `Partial`; the required first parameter is not, so a missing `onDrop` is a compile error and never reaches a seam. A later fragment may still **replace** `onDrop` and cannot **clear** it: the merge skips `undefined`, which was a nicety and is now load-bearing (B-9). Everything else is optional, and every slot below is a named type alias for F-51's reason — method shorthand is bivariant and this repo's `method-signature-style` rewrites the property form back into shorthand on every `lint-fix`.

| Slot | Type | Kind | Note |
| --- | --- | --- | --- |
| `onDrop` | `OnDrop` | consumer function, **required** | `(request, context) => FreeDragResolution \| PromiseLike<FreeDragResolution>`. The round-trip. `context` carries the `AbortSignal` the kernel owns |
| `handle` | `ResolveHandle` | consumer function | `(item) => HTMLElement \| null`. **Resolver only** — the shipped element form is withdrawn, see §Parity discharge |
| `visual` | `ResolveElement` | consumer function | The node lifted. Defaults to the item |
| ~~`axis`~~ | ~~`DragAxis \| AxisSource`~~ | ~~scalar **or source**~~ | ~~A function is re-read on `invalidate()` and at activation, never per sample — D-71.~~ **Superseded by the row below** (D-148) |
| `axis` (D-148) | `DragAxis` | scalar | `'both' \| 'x' \| 'y'`, default `'both'`. The source form is deleted; the slot is fixed for the controller's lifetime. A consumer wanting another axis destroys the controller and composes again, and a per-sample lock is a `bounds` installer |
| `lift` | `LiftMode` | scalar | `LIFT_FAITHFUL \| LIFT_FLAT \| LIFT_IN_PLACE`, default `LIFT_FAITHFUL` — D-141. The three constants publish from this entry beside the type (~~`FreeDragLift`, a domain of three strings mapped by the behavior — D-73~~) |
| `threshold` | `number` | scalar | Activation travel in viewport pixels, default 8. Same default and same domain as the sortable's |
| `home` | `ResolveHome` | consumer function | `(subject) => Point`, viewport space. Where a rejected or canceled drag returns to. Absent means the grab position |
| `onStart` | `FreeDragOnStart` | consumer function | `(geometry) => void`, once, after the lift is acquired |
| `onMove` | `OnMove` | consumer function | `(geometry) => void`, once per committed sample, **after** the visual is written |
| `onEnd` | `FreeDragOnEnd` | consumer function | `(result) => void`, exactly once per started operation (D-62, D-66) |
| `onError` | `FreeDragOnDragError` | consumer function | `(error) => void`, where `error` is `DraggableError \| DraggableWarning` (D-64, D-130; ~~`(error, context) => void`~~) |
| `bounds` | `ConstraintInstaller` | **atomic capability** | From `free-drag/bounds.js`. Absent means unconstrained and **no bounds code in the graph** |
| `landing` | `FreeDragLandingInstaller` | **atomic capability** | From `free-drag/landing.js`. Absent means the visual is released without animating |
| `plugins` | `readonly FreeDragPlugin[]` | **appending** | The one slot that concatenates rather than last-wins, and therefore the one whose group declares no unique slot (D-146) |

Merge semantics are D-45's unchanged: the merge iterates the schema rather than the fragment's keys, scalars and consumer functions last-win, an atomic capability last-wins as one whole slot, `plugins` appends in fragment order, and installers run **after** the merge completes so a capability that loses its slot is never constructed. Installation order is schema order (D-57): `bounds`, `landing`, then plugins; `retire` hooks run in reverse.

### The controller

**Four members** — the kernel's two, plus one signal and one command.

```ts
type FreeDragController = Readonly<{
  invalidate(): void;
  moveTo(point: Point): void;
  cancel(reason?: unknown): void;
  destroy(): Promise<void>;
}>;
```

`cancel` and `destroy` are `KernelHost`'s own members spread through unchanged, exactly as the sortable's are. `destroy()` closes the controller logically on the statement and returns a promise that settles after physical teardown (D-36). The other two are D-71.

### The results

Three arms, and **the arm set was re-derived rather than inherited** — the ledger says so explicitly, and the sortable's fourth arm is the reason. `noop` exists there because a reorder can be structurally identity-preserving: a proposal whose `from` equals its `to` is a real, resolved, successful transaction that changed nothing. A free drag has no such state — the consumer's `accept()` means _keep it where it landed_ whether or not it travelled, and a zero-distance drop is an ordinary acceptance. Inventing a `noop` arm for it would put an arm in the union that nothing can produce.

| Arm | Produced by | Carries |
| --- | --- | --- |
| `accepted` | `onDrop` resolving `FreeDragResolution.accept()` — one shared value, allocated once (D-140) | `request` |
| `rejected` | `onDrop` resolving `FreeDragResolution.reject(reason?)` | `request`, `reason` |
| `canceled` | `cancel()`, `Escape`, `pointercancel`, `lostpointercapture`, or **any classified failure of a started operation** (D-66) | `request \| null`, `reason`, `origin: CancelOrigin`, `stage: CancelStage` |

**The resolution the consumer returns is not one of these shapes, and since D-140 it is not a shape at all** — as the sortable's is not, since D-143 extended this to it. `FreeDragResolution` is opaque — a `unique symbol` brand behind two factories — because the consumer's job with it is to build one and hand it back. It is the _result_ that carries fields, and it always was: `AcceptedFreeDragResolution` and `RejectedFreeDragResolution` published a `type` discriminant nothing on the consumer's side ever branched on, and a shape a consumer can read is a shape a consumer can also manufacture, which made a runtime duck-type gate and a second `FAILURE_RESOLUTION` diagnostic look owed. Both are deleted. **Acceptance is one shared value**, so an accepted drop allocates nothing; rejection is a one-slot carrier for the reason; and `settlement.prepare` tells them apart by identity, with no string shipped and none compared.

**~~a destroyed controller~~ is not a producer of this arm, and never was** (F-172, corrected 2026-08-28). `destroy()` closes the queue on the statement and every guard then fails, so **no terminal is published at all** — asserted at [`tests/free-drag/free-drag.browser.test.ts:412`](../../tests/free-drag/free-drag.browser.test.ts) and, for the sortable's mirror, [`tests/sortable/composition.browser.test.ts:642`](../../tests/sortable/composition.browser.test.ts). The row also omitted `lostpointercapture`, which is a fourth kernel-originated path to the same arm.

**`origin` is what the producer list is readable as** (D-154). Four values, exhaustive over the row above: `CANCEL_SUPPLIED` — `cancel(reason?)`, from the consumer or from the behavior, and the two are one function so the kernel cannot tell them apart; `CANCEL_ABORTED` — Escape; `CANCEL_INTERRUPTED` — `pointercancel` or `lostpointercapture`, two DOM spellings of one fact; `CANCEL_FAILED` — a classified failure, with the caught value on `reason` and `onError` already fired. The kernel writes all four and a consumer can write none, which is exactly what `reason` cannot promise.

**`origin` names what decided the terminal, and only that** (F-178). A classified failure raised while a cancellation is already latched is refused its classification under the standing precedence — `DESTROY > CANCEL > FAILURE_CHECKPOINT` — and travels as a `DraggableWarning` while the cancel owns the terminal, so the result reads `CANCEL_SUPPLIED` on an operation that also broke. That is the intended reading rather than a gap: `onError` answers _did anything go wrong_ and fires on both channels, and a fifth origin for _cancelled, and something also failed_ would make provenance a summary of the operation instead of an answer about its terminal. **A free drag mints no reason of its own**, so for this behavior `origin` is the whole of the provenance and `reason` is empty unless the consumer filled it.

`FreeDragTransactionResult` is the union; `onEnd` receives it and switches with no `default`, which is what makes exhaustiveness checkable (D-62). `request` is `null` on the canceled arm exactly when the operation was abandoned before release built one — the same shape the sortable's `proposal: null` has, and the reason `AT_PROPOSAL`/`AT_CONSUMER` is carried.

### The published names

`free-drag.js` publishes the closure of `FreeDragConfig`, by F-51's rule: a slot a consumer can fill but cannot hoist out of the object literal is not a writable surface.

| Kind | Names |
| --- | --- |
| Runtime | `freeDrag`, `FreeDragResolution`, `LIFT_FAITHFUL`, `LIFT_FLAT`, `LIFT_IN_PLACE` (D-141) |
| Config and its aliases | `FreeDragConfig`, `OnDrop`, `FreeDragOnStart`, `OnMove`, `FreeDragOnEnd`, `FreeDragOnDragError`, `ResolveHandle`, `ResolveElement`, `ResolveHome`, ~~`AxisSource`~~ (D-148), `DragAxis`, `LiftMode` (~~`FreeDragLift`~~ — D-141) |
| Controller | `FreeDragController` |
| Domain | `FreeDragSubject`, `FreeDragRequest`, `DragGeometry`, `FreeDragResolution`, `FreeDragTransactionResult`, `AcceptedFreeDragResult`, `RejectedFreeDragResult`, `CanceledFreeDragResult` (~~`FreeDragErrorContext`~~, deleted by D-130; ~~`AcceptedFreeDragResolution`, `RejectedFreeDragResolution`~~, unpublished by D-140 — the resolution is opaque and has no arms to name) |
| Re-exported from the kernel tier | `CancelStage`, `AT_PROPOSAL`, `AT_CONSUMER` — a `CanceledFreeDragResult` carries one and an ordinary consumer must discriminate it, which is the same rule and the same re-export `sortable.js` already runs on (D-68) — and, on the same route since D-154, `CancelOrigin` with `CANCEL_SUPPLIED`, `CANCEL_ABORTED`, `CANCEL_INTERRUPTED`, `CANCEL_FAILED` |

~~**Two names are qualified because their unqualified form is already claimed by a different structure** (D-75): `FreeDragLift`, because `kernel.js` publishes a numeric `LiftMode` and this is a string union; and `FreeDragErrorContext`, because `onError`'s context carries a behavior's own result~~ — the second **deleted by D-130** and the first by **D-141**, which leaves the clause with **no name it applies to**. That is the rule working rather than lapsing: both collisions were resolved by there being one structure again, not by qualifying a second. `DragAxis` and `DragGeometry` stay unqualified — one structure, one claimant, no collision — and the rule is exactly that narrow: qualify a name when two entries need **different structures under one word**, not because a word could conceivably be reused.

### Validation, under `CODE_OF_SIZE.md`

> **Is this state reachable through correct use of the public contract?**

and, only where that has not already answered:

> **What library-owned invariant requires this code to exist at runtime?**

That litmus, not the D4 rule, decides this section — **both questions of it, in that order.** ~~Every option is validated **at construction**, once, before any drag, and throws a `TypeError` naming the slot.~~ Applied honestly it deletes almost all of it: an option domain the compiler already states is not a library invariant, and a value that breaks only the consumer's own drag is not the library's to police.

**The ordering was made explicit in `CODE_OF_SIZE.md` on 2026-08-25, and made decisive there the same day; this section was decided under the second question alone.** **Every deletion below survives, and most are now settled one question earlier** — a non-function `handle`, an out-of-domain `axis`, a `NaN` threshold are states an integrator reaches only by leaving the published contract, so the gate closes and _whose invariant_ is never reached.

**The two survivors are gone, and the question this paragraph deferred is discharged** (D-124, on [`reviews/phase-23/reachability-gate-audit-claude.md`](../reviews/phase-23/reachability-gate-audit-claude.md) §1.2, §1.3). Both were kept on the second question — `moveTo`'s coordinates are folded into committed frame state and poison every later geometry the library hands out; the landing's `Infinity` hangs a gate the library holds, which is the one failure this architecture cannot classify because classification needs something to happen. **Under the decisive form the first question answers before either argument is reached.** `controller.d.ts` publishes _its coordinates must both be **finite**_ on `moveTo`'s own doc comment, so that precondition is findable and trivially meetable; and _a duration is finite_ is `CODE_OF_SIZE.md` §1.1's own named paradigm of an obvious semantic precondition. Both states are outside the published contract, the gate closes on both, and both checks are deleted. **What each one buys is now a documented boundary** — stated on the shipped TSDoc rather than enforced — and the two were deleted as **one decision** because they are coupled: see §The `moveTo` → `distance` coupling below.

**Free drag ships zero construction-time throws and, since D-124, zero runtime domain predicates.** The `moveTo` finiteness discard and the `home` finiteness throw are both deleted; the `home` seam still reads its point inside the quality wrapper, so a `null`, a missing field or a throwing accessor still classifies there.

#### What each deleted check is replaced by

Deletion is only safe if something else answers, and there are **two** answers, not one. Most deleted checks surface inside a kernel-driven seam, which means they are already classified, already carry a `DraggableError` **naming that stage** (D-132; a coarse `code` until then), and already terminate the operation exactly once (D-66). Three surface **nowhere at all**, deliberately — and those three are the ones an acceptance criterion must not promise to classify.

**Deleted, and classified when the value is used.** ~~Codes are read from `STAGE_TO_CODE` in `src/kernel/errors.ts`, not inferred.~~ **D-132 deleted the mapping**, so the table's last column is the stage itself and there is nothing left to read a code from; kernel line numbers are the site that names the stage.

**The `→ code` half of every row below is struck rather than rewritten**, because it was never a second fact — it was the same fact passed through a derivation D-81 established to be invalid, and the standing note that `FAILURE_ACTION_PREPARE`/`FAILURE_ACTION_EFFECT` map to `presentation` _for library arithmetic_ was an apology for that axis. The stage is the classification.

| Former check | Why it goes | Where a bad value surfaces | Stage |
| --- | --- | --- | --- |
| `onDrop` present | **Moved to the compiler (D-77).** ~~The type declares it required; only the variadic merge hides it from the compiler~~ — the required first argument does not hide it, so this is a **compile error**, which is where §1.2 says a required slot belongs. A JS consumer who bypasses the type still reaches a designed path: a release with nothing to ask **throws** in the settlement seam, the same path this contract uses for a missing visual (D-152) | **compile time**; for a JS consumer, first release | none; for a JS consumer, `FAILURE_RESOLUTION` (8) |
| `handle` is a function | Seven checks and seven strings to restate what the type says. Calling a non-function throws where it is called, which is inside a seam | `admit` (`kernel.ts:825`) | `FAILURE_ADMISSION` (1) |
| `visual` is a function | ″ | **admission**, in both behaviors (D-84): free drag calls the resolver inside `admit`, the sortable inside `seedDraft`, which is admission's second half | `FAILURE_ADMISSION` (1) |
| `onStart` is a function | ″ | activation (`:1166`) | `FAILURE_ACTIVATION` (2) |
| `onMove` is a function | ″ | the move leaf (`:1827`) | `FAILURE_RENDERER_WRITE` (3) |
| `home` is a function | ″ | `anchorTarget` (`:1423`) | ~~`FAILURE_LANDING_TARGET` (12)~~ — **a `DraggableWarning` since D-130**, the stage having been deleted with the tier that produced it; the landing is skipped, the drop stands (D-49) |
| `onEnd` is a function | ″ | the terminal (`:1637`, `:2192`) | `FAILURE_TERMINAL_CALLBACK` (14) |
| `onError` is a function | ″ | the report path | **none, by design** — a throw there goes to the un-classified channel (`src/kernel/seams.ts`), because a failure report may not itself fail |
| `bounds(source)` shape | The feature resolves **lazily, on the first `apply` after a staleness mark** (D-81); `invalidate()` is a staleness flag and calls nothing. Garbage therefore surfaces at **the seam that next renders**, and the first of those is activation, because the rect starts stale | `activation.effect` first; thereafter `moved`, a `TAG_POSITION` effect, or `release.prepare` | `FAILURE_ACTIVATION` (2) first; thereafter `FAILURE_RENDERER_WRITE` (3) or `FAILURE_ACTION_EFFECT` (5), or `FAILURE_RELEASE` (9). **Never `FAILURE_ACTION_PREPARE`** |
| `moveTo(point)`'s coordinates — ~~**a check, not a former one** (D-91)~~ **deleted 2026-08-25 (D-124)** | ~~Added rather than deleted, and it is the only row here that is.~~ The keep-argument was that the value is folded into `offsetX`/`offsetY` — committed frame state — so one non-finite coordinate poisons every later `deriveMotion`, every geometry object handed to the consumer, the pinned `anchorTarget`, and through `LandingContext.from` the library-minted `distance`. **All of that still happens; none of it is a justification.** `controller.d.ts` publishes _its coordinates must both be **finite**_ on the member's own doc comment, so the state is outside the contract and the gate closes before ownership is asked. The TSDoc now states the boundary instead of the discard | **nowhere** — the value is accepted and written | **none.** No report, no classification, no terminal; the drag continues on a poisoned offset |
| `landing({ duration })` is a function / `>= 0` / is a number | **Measured redundant** — see below | ~~inside `LandingStart`~~ inside the kernel's own `animate()` call | ~~`FAILURE_LANDING_CREATE` (10)~~ **a `DraggableWarning` since D-155**, the stage having been deleted with the runner that produced it; nothing is interpolated and the drop stands |

**D-74 is a rename, not a remapping.** `FAILURE_ACTION_PREPARE` carries `FAILURE_INSERTION`'s number (4) ~~**and** its code, `presentation`~~ — which is F-62's complaint restated, not repaired: the finding is that the kernel names a generic seam with the sortable's word, and D-74 answers exactly that and nothing else. ~~Whether `presentation` is the right attribution for library arithmetic is a separate question, unopened here.~~ **D-132 opened and closed it by deleting the question**: there is no attribution to be right or wrong, because the stage is not passed through one. **D-74 is strengthened rather than affected** — its three numbers are consumer wire values in fact now, not only in intent. Reading a renamed stage as a re-attributed one was this section's own first error, and the correction is why the codes above are quoted from the mapping rather than reasoned about.

~~`visual`, `onStart` are functions ″ activation (`:1149`, `:1166`) `FAILURE_ACTIVATION` (2)~~ **superseded by D-84, and the two slots were never one row.** They were paired because both are read "around the start", and the stage was taken from the kernel lines that _name_ it rather than from the site that _calls the resolver_ — the same derivation error D-81 corrected for `bounds`, which is why the pair is recorded rather than quietly split. **Nothing else in this document may pair `visual` with `onStart`**: they now differ in seam, in stage, in coarse code, and — under D-83 — in whether a terminal follows at all, which is as far apart as two rows of this table can be.

**A row's stage decides whether a terminal follows, so the two columns are not independent** (D-83). Rows that surface **before** `onStart` — `handle`, `visual`, and a garbage `bounds` source on its first resolve — publish `onError` and **no terminal**, because I-31 and D-66 refuse an end for a beginning the consumer has no record of. Every other classified row publishes exactly one. The split is not a free-drag rule: it is [05](05-lifecycle-invariants.md) I-31 read as written, and this document restated it as a table-wide guarantee it never had.

**The `bounds` row is a set of four stages, not one, and that is a property of the source rather than a defect** (D-81, F-71, F-73). This column's header asks **where a bad value surfaces**, and for every other row the answer is a single seam because the value is read at one. A bounds source is not: the feature holds a rect and a staleness flag, and the read happens at whichever seam next calls `apply`. **The row was written as though `presentation` were a promise about whose data was bad**; it is a description of where the library was standing, which is the same reading D-74's note above declines to reopen. Correcting the description is therefore the whole repair — the two alternatives that would restore a single stage are both worse: resolving eagerly inside `invalidate()` puts a layout read or a consumer call on every scroll and resize event, and re-raising through a third behavior action contradicts this document's own `actionTags: 2`.

**Deleted, and deliberately silent.** No throw, no classified failure, no `onError`, no terminal — because there is no library invariant to protect and, for two of the three, nothing ever fails.

| Former check | Why it goes | What happens instead |
| --- | --- | --- |
| `threshold` finite | A `NaN` threshold makes `dx*dx + dy*dy >= t*t` permanently false. Visible immediately, consumer-owned, and it breaks no library guarantee | The press arms and never activates. **No operation starts, so none terminates** — Q-15, and the reason B-4 must not ask for a terminal here |
| `axis` in domain | An unknown value falls through to unconstrained motion. The compiler states the union; a JS consumer who ignores it gets their own drag | The drag runs normally, unconstrained, and reports success |
| `lift` in domain | **Replaced by the type, and since D-141 there is no mapping either.** ~~The map to `LIFT_*` is a total `Record<FreeDragLift, LiftMode>`, so adding a mode without a mapping does not compile.~~ The slot takes `LiftMode` itself, so a mode added to the kernel is in the domain the day it is declared and there is no second list to keep total | A TS consumer cannot express it. ~~A JS consumer reaches `undefined` in the map and gets whichever branch `presentation.ts` falls through to.~~ A JS consumer reaches `presentation.ts` with whatever they passed, which is the same silence one indirection shorter |

#### ~~The one check that survives~~ — deleted 2026-08-25 (D-124), and the measurement that narrowed it stands

`landing({ duration })`'s resolved value is checked **once per landing**, on the classified path — it already was, since `requireFinite` throws from inside `start` and the kernel classifies it. What changes is that the check narrows from a domain test to a single value comparison, because the platform performs the rest and performs it better.

Probed directly against `Element.animate()`, **Chrome 150** (`HeadlessChrome/150.0.0.0`), one element, reading `getComputedTiming()` on every accepted value. **The artifact is [`../measurements/animate-duration-domain.md`](../measurements/animate-duration-domain.md)** (D-79) — this table was carried in five places and recorded in none, which is the evidence gap P18A-08 found:

| `duration` | `animate()` | Consequence |
| --- | --- | --- |
| `NaN`, `-1`, `-Infinity`, `'fast'`, `{}` | **throws** `TypeError: Failed to execute 'animate' on 'Element': duration must be non-negative or auto` | Already classified `FAILURE_LANDING_CREATE`. The library's own `typeof`, `< 0` and `NaN` tests are **redundant** |
| `Infinity` | **accepted** — `activeDuration: Infinity`, `playState: 'running'`, `finished` never settles | ~~**The landing gate is never released.** No terminal, no `onEnd`, visual pinned, controller stuck~~ — **dissolved by D-155**: the terminal has already published, and what an unbounded duration buys is a contribution that never decays, on an element the consumer owns, until the next drag cancels it |
| `'auto'` | **accepted** — computed duration `0`, `playState: 'finished'` | **Valid**, and the platform's own error text names it — but reachable **only from JavaScript**, since `LandingDuration` returns `number` |
| ~~`undefined`~~ | accepted by the platform | **Struck from the argument** (D-79). The option is coalesced to its default before `animate()` can see it, so this is a fact about WAAPI and not about this call path |
| `0`, `200` | accepted, completes | Correct |

~~**The predicate is `duration === Infinity`, not `Number.isFinite(duration)`, and the reason narrows to two legs** (D-79).~~ **There is no predicate: the check is deleted (D-124).** The table above is unchanged and remains the measured behaviour of the platform — it is now a description of what the library passes through rather than of what it screens. The paragraphs below are retained as the reasoning that kept the check, and are superseded as a **justification** only. ~~A finiteness test is wrong on two accepted values, `'auto'` and `undefined`.~~ That was the third leg and it does not hold as stated: `undefined` never reaches the platform, and `'auto'` is a JavaScript-only value. What holds is that a finiteness test is **redundant** on every throwing value — the platform refuses them at the same call, at the same stage, with a better message — and that it is **insufficient** on the one value that matters, since `Number.isFinite(Infinity)` and the `=== Infinity` guard disagree about nothing while the rest of the domain test buys nothing. A guard written as a domain check re-derives the platform's domain; a guard written against the **one** pathological value does not.

That value earned its bytes by the litmus **while a gate depended on completion**. `+Infinity` is the single duration the platform accepts and never completes, and completion was what the settlement gate's release was built on — a hang being the one failure mode this architecture cannot classify, because classification needs something to happen. **D-155 removes the dependency rather than the value's oddity**: nothing waits for the animation, so an unbounded one is a cosmetic misuse with a live terminal beside it. Everything else stays platform-owned, and so does this now.

**Where the refusal landed, while it existed: `FAILURE_LANDING_CREATE` (10).** The check ran inside the library's `LandingStart`, which the kernel wrapped at exactly that stage — the same slot `animate()`'s own throw for `NaN` already produced. One predicate, no second path. **The stage itself is retired by D-155** and its number is never reused.

#### The `moveTo` → `distance` coupling, and why the two deletions are one decision

**Traced by the audit, executed by the slice.** `moveTo`'s coordinates become `offsetX`/`offsetY`; the kernel builds `LandingContext.from` from the rendered offsets; the runner mints `distance: Math.hypot(target − from)` and hands it to the `duration` **function** D-67 added the context for. So a value the library stopped guarding at one end arrives, **library-minted**, in a conforming author's arithmetic at the other.

**Deleting either check alone is safe; deleting both composed into the worst available failure.** With only `moveTo`'s check gone, the landing's guard still caught the resulting `Infinity` and the failure classified. With both gone, the same input yielded a **held settlement gate with no terminal at all** — by this document's own account the one failure this architecture cannot classify. ~~That compounding is what made the two one decision~~ — **and D-155 removes the compounding itself**: with no gate, the same input yields a terminal, a committed drop and an element carrying an offset that never decays. **That is not a reason to keep either**: an integrator who passes `Infinity` to `moveTo` has left the contract, and §1.1 is explicit that what the library then computes is part of the undefined behaviour rather than a separate harm. It is the reason the two are **one decision with one rationale**, and the reason the compounding path is pinned by test rather than left to be rediscovered — `tests/free-drag/validation.browser.test.ts` §_a non-finite moveTo() reaching the landing distance_.

**`NaN` does not compound**, and the distinction is worth keeping: the deleted predicate was `=== Infinity` and never fired for it, and `animate()` refuses `NaN` itself at the same stage. Only `+Infinity` produces the hang.

**The quality track is a separate axis, and D-49 decides it per site rather than per stage.** The kernel runs `anchorTarget` unclassified (`runUnclassifiedValue`; ~~`runQualityValue`, `:1423`~~ — D-130 collapsed the `QUALITY` and `BEST_EFFORT` sentinels into one and dropped the stage argument): an unusable target returns `undefined`, the fault reaches `onError` as a `DraggableWarning`, the landing is **skipped rather than faked**, `ARM_ARMED` is returned and the domain result stands. It runs `start` on the classified track (`runLeaf`, `:1487`): a throw yields `ARM_FAILED` and the settlement fails. So refusing `Infinity` fails the settlement — exactly as `NaN` already does today through the platform, inherited rather than chosen.

**What that costs the drop is free drag's own mapping to make, and no kernel change is needed to make it right.** A behavior maps a `SETTLED_FAILED` input to its own recovery (D-24, F-33), so free drag's frame part decides whether a **committed verdict** survives a landing that could not be built. It must: a presentational fault after a committed drop may not un-drop it — D-49's principle, applied at the layer that owns the verdict, rather than a request to move `start` onto the quality track.

~~whether a drop the consumer already **accepted** survives~~ **named an arm this behavior never reaches, and is corrected at Checkpoint E (E-07).** Free drag arms a landing only when the visual has to travel, and an accepted drop is already at its destination — so an accepted result never reaches landing creation and cannot be the case this rule is tested on. The executable case is the **rejected** verdict, which does travel; the rule itself is unchanged and is stated over verdicts rather than over one arm of them.

> An earlier draft of this section reported the refusal as `FAILURE_LANDING_TARGET` and carried the skip-not-fake wording along with the wrong stage. That stage belongs to `anchorTarget`, and the two sites differ in track as well as in name — which is precisely why the stage constant cannot be used to infer the track.

#### What this costs, and what it does not

**It does not cost a lifecycle guarantee.** Each check in the first table is replaced by a classified failure that reaches `onError` with a coarse code and terminates the operation once. The three in the second table are replaced by **nothing**, on purpose: two of them never fail, and the third never starts an operation, so there is no terminal to owe (Q-15). Silence is the correct outcome there, not a gap — but it is a claim an acceptance criterion has to state in that form, which is why B-4 asserts the two tables separately and asserts the silent rows as _silence_.

~~**It costs one shipped diagnostic.**~~ **It costs none: the trade-off was removed rather than accepted (D-77).** `draggable: onDrop is required.` was a parity **retain** row, was briefly a **drop**, and is now **retained in a stronger form** —

```ts
freeDrag(item, config: FreeDragConfig, ...fragments: ReadonlyArray<Partial<FreeDragConfig>>);
```

— so a missing `onDrop` stops compiling, which beats a throw on every axis available: it is found without running the code, it costs **zero runtime bytes**, and it cannot be missed by a code path that happens not to execute. It was deferred at Phase 18 only because it changes D-69's **public signature**; the owner reopened that signature to take it, which is the one thing this document could not do for itself.

~~**It does not settle the package.**~~ **It settles the package, and that is what made it a decision rather than an edit.** 03 §Public option domains froze the throw-at-construction rule package-wide and `src/sortable/` implemented it, so free drag's reconciliation left the rule **true of one behavior and false of the other** — F-67, which then held Phase 19 alone after D-76 landed without it. **D-77 re-derives it across both:** required configuration is a type obligation discharged by the required first argument, and a construction-time throw survives only for an invariant over what installers _contribute_. The sortable goes from six construction throws to one; the survivor is `claim`'s single-writer collision, the only one no signature can state. The package-wide statement is [03](03-feature-composition.md) §Public option domains and §Assembly; this section is free drag's half of it and claims nothing wider.

---

## The decomposition (D-70)

The plan states the test this section has to pass: _a consumer wanting an unconstrained drag should carry no bounds code._ The rule that decides each slot is D-56's — **a capability that installs nothing is a config key, not a factory** — applied to the question _does this slot own state or code that a composition without it should not carry?_

| Slot | Verdict | Why |
| --- | --- | --- |
| `axis` | **core, plain config key** | Two comparisons and no state. A factory for it would ship a module, a closure and an entry to save two branches, which is what D-56 deleted four factories for |
| `lift` | **core, plain config key** | `BehaviorConfig.liftMode` is static spec data. All three modes are implemented in `kernel/presentation.ts` whatever the behavior chooses, so there is nothing to isolate |
| `threshold` | **core, plain config key** | A number the kernel owns the test for |
| `home`, and every callback | **core, plain config keys** | Consumer functions install nothing. This is D-56's rule and the reason `callbacks()` was deleted |
| `bounds` | **capability installer**, `free-drag/bounds.js` | Owns a resolved rect, a staleness rule and a source it re-reads. A composition without it must not carry the resolver or the clamp |
| `landing` | **capability installer**, `free-drag/landing.js` | Owns a timing domain and a reduced-motion collapse. ~~and a runner~~ — the interpolation is the kernel's (D-155) |
| `plugins` | **appending installers** | The extension point |

### The contribution

```ts
declare const FREE_DRAG_FEATURE: unique symbol;

type FreeDragFeatureContext = FeatureContext &
  Readonly<{ [FREE_DRAG_FEATURE]: never }>;

// One group per config key that takes an installer (D-146). Which group a slot
// is declared on IS its cardinality: two writers on `constrain` cannot be
// written down, so there is nothing to arbitrate at construction time.
type ConstraintContribution = Readonly<{
  constrain: MotionConstraint;
  retire?: Disposer;
}>;

// Declared in `shared/composition.ts` — both behaviors' `landing` key produces
// exactly this, so it is one declaration rather than two structurally equal
// ones (B-7, F-64).
type LandingContribution = Readonly<{
  landingTiming: LandingTiming;
  retire?: Disposer;
}>;

// Free drag has no multi-writer slot, so the one position with unbounded arity
// contributes a lifetime and nothing else.
type FreeDragPluginContribution = Readonly<{ retire?: Disposer }>;

type ConstraintInstaller = (
  context: FreeDragFeatureContext,
) => ConstraintContribution;
type FreeDragLandingInstaller = (
  context: FreeDragFeatureContext,
) => LandingContribution;
type FreeDragPlugin = (
  context: FreeDragFeatureContext,
) => FreeDragPluginContribution;
```

**D-146 split the record by config key, 2026-08-27.** `bounds` produces a group carrying `constrain` and `retire?`, `landing` one carrying `landingTiming` and `retire?`, and a `plugins` entry one carrying `retire?` alone — so **each unique slot has exactly one producing position**, and `claim` with its `free-drag/duplicate-contribution` identity is deleted. That was this behavior's only construction-time throw: assembly now throws only what an installer's own body throws, and the unwind bracket is what covers it. Both unique slots became **required** on their groups, by D-45's rule — a key whose installer constructs nothing is a config key.

**The boundary is nominal and it sits on the context** (D-138, superseding D-88's mechanism). Each middle tier declares a `unique symbol` and hands its installers the shared `FeatureContext` intersected with a brand. An installer's parameter is checked **contravariantly**, so a function written against one behavior's context is refused where the other's is expected — **both directions from one property**, with no twin to keep in step and nothing to add when a slot is added.

**The contribution groups are independent, and that is the point rather than a side effect.** ~~Both records declare the same key set; a key a behavior does not implement it declares `?: never`, so free drag excludes `insertion`, `placeholder`, `beforeInsertionMove` and `afterInsertionMove` and the sortable excludes `constrain`.~~ That rule required this type to enumerate the **other behavior's capability vocabulary** and to keep the enumeration current, which is a coupling in the direction the decomposition exists to prevent: free drag knew what a placeholder was in order to refuse one. These types are now exactly free drag's own slots, one group per key.

**Nothing is authored and nothing is validated.** The brand is erased — `declare const` emits no JavaScript and no value carries the property — so this costs no byte on the construction path, and a `unique symbol` cannot be forged by an author who wants to try. There is **no runtime discriminator, no registration and no defensive check**: the assembler stamps the brand with an `as` at its one call site, and a caller who escapes the type system is outside the supported surface, which the record states rather than machinery enforcing.

**What the boundary states is the identity of an installer, and that is narrower than CE1-01's subject** (D-138, F-117). A value typed for one behavior is refused where the other's is expected, in both directions, from one contravariant parameter — that is the whole guarantee and it is total over typed values. **It does not extend to what a correctly-typed function happens to return.** A literal returned from an arrow already contextually typed as an installer is not excess-property-checked against its contextual return type, so `(context) => ({ insertion, retire })` compiles and the assembler reads the slots its group declares and ignores the rest.

**That is a deliberate boundary rather than a hole left open.** ~~Two holes are accepted and stated.~~ ~~An **unannotated hoisted literal** is decided by structural assignability on its return type alone, so one carrying `{ placeholder, retire }` reaches free drag's `plugins` again and is discarded by an assembler reading three slots. That is CE1-01's residue returning, deliberately: it is the price of record independence.~~ **The owner has narrowed the requirement rather than the record having lost one** (F-117): contributing a slot this behavior does not implement is unsupported integrator usage, and refusing it would cost exactly what D-138 deleted — each record enumerating the other behavior's vocabulary, or an exact-object mechanism over both. Neither is worth buying back to refuse a property nothing reads.

**One accepted hole remains and it is about whose function it is**: a brand on a parameter cannot bind a function that **declares no parameter**, so `() => ({})` stays assignable to both — correctly, since an empty contribution is valid for either behavior.

**Implemented (D-151). The return direction is no longer wholly out of scope — within one behavior.** F-117's judgement stands for the _cross-behavior_ case above: refusing a slot free drag does not implement would cost the vocabulary enumeration D-138 deleted. What D-151 adds is narrower and free of that cost, because it names only free drag's own keys: `constrain` and `landingTiming` are read from `bounds` and `landing` and nowhere else, so an installer in `plugins` that contributes either is installed and never dereferenced (F-131, F-143). `freeDrag()` therefore intersects a computed check into its config and fragment positions, derived from the groups above — _a key a sibling group declares and the plugin group does not_ — and a violating entry is replaced by a refusal type naming the key. **The groups themselves are untouched**: none declares `constrain?: never` or `landingTiming?: never`, and none knows what its siblings declare beyond the derivation reading their `keyof`. **Explicit widening still escapes** — `const plugin: FreeDragPlugin = boundsInstaller` forgets provenance, and by the call site there is nothing to recover — which is the accepted boundary rather than an unnoticed one. Record [`composition-check-claude.md`](../reviews/phase-23/composition-check-claude.md).

~~**The `never` slot is the whole of E-06's fix**~~ — **it was not** (CE1-01). Two exclusions closed the two _defining_ capabilities and left `placeholder`, `beforeInsertionMove` and `afterInsertionMove` open. What appeared to close them was TypeScript's **weak-type detection** — an all-optional target refuses an object with no property in common — and that is not a boundary: adding the one member the two records genuinely share, `retire`, satisfies it, and a hoisted **unannotated** installer carrying `{ placeholder, retire }` then compiles into free drag's public `plugins` and is silently discarded by an assembler that reads three slots. **D-87's declaration suite could not see it**, because every row starts from a `declare const` of an installer _alias_, and the annotated form is precisely the form the two exclusions already caught.

**The lesson is the reusable half, and it is F-74's, arriving from the reviewer's side**: the first probe of the open case was _refused_, and refused for the wrong reason. A negative control that passes by a mechanism other than the one under test is indistinguishable from a working boundary — which is the property that outlived the mechanism, and is why the surviving rows assert the typed direction from the alias rather than from a literal that might be refused by weak-type detection.

~~Any fix here must be pinned by an **unannotated** counter-example per open slot, driven through `freeDrag(item, config, { plugins: [...] })`, or the regression is unpinned exactly where it already escaped once.~~ **Withdrawn with the requirement it served** (F-117): the slot-contribution direction is no longer a stated property, so there is nothing for a per-slot counter-example to pin. What is pinned is the typed direction, and it is pinned from the alias because that is where the guarantee is.

Every real slot on both contributions is optional, so the two records were mutually assignable and an `AxisInstaller` could be dropped into free drag's `plugins`, whose assembler reads `constrain`, `landingTiming` and `retire` and **silently discards `insertion`** — a supported middle-tier API accepting a value and doing nothing with it. ~~One optional `never` in each direction breaks it: `SortableContribution` declares `constrain?: never`, this one declares `insertion?: never`, and each names the **defining capability of the other behavior** rather than an arbitrary marker.~~ **Neither declaration exists** (D-138): the brand refuses the `AxisInstaller` this sentence is about, because that value is typed, and the literal direction is out of scope per the paragraph above.

~~**Two lines, and they are the minimum that works.** No runtime brand, no phantom discriminant, no unified contribution type: a brand costs a field on the hot construction path and states nothing about _why_ the two are incompatible, while `insertion?: never` says exactly the true thing.~~ **Both halves are answered rather than overruled** (D-138). The cost objection assumed a **runtime** brand; a `unique symbol` on a type intersection costs nothing at all, which is a different proposal from the one refused. The expressiveness objection was right about what the exclusion says and wrong about who needs to read it: _a free-drag contribution has no insertion_ is a fact about free drag that only becomes a **boundary** by naming the sortable's vocabulary, and the tier separation is worth more than the sentence. Assignability is still decided on the declared alias rather than on what a particular body returns, which is why the `AxisInstaller → FreeDragPlugin` case — where `insertion` is required — is refused by the brand alone.

**What stays assignable is correct.** An installer returning a bare `{}` still satisfies both, because an empty contribution genuinely is valid for either behavior; refusing it would be a boundary drawn for its own sake. **`FeatureContext` identity is untouched, and D-138 is what tests it** (F-64, B-7): the shared context is still one declaration re-exported by both middle tiers, and each branded context is that declaration plus one property — a fix that forked `realm`, `root` and `report` per tier would fail `tests/composition.declaration.test.ts`. ~~The incompatibility is in what an installer **produces**, never in what it is handed.~~ It is now in what an installer is **handed**, which is the sentence D-138 reverses: the shared type is the same and the branded wrapper is not.

~~**The maintenance obligation is stated rather than discovered**: a new single-writer slot on either contribution needs its `never` twin on the other, or the boundary silently reopens for that slot. That is a real cost, and it is also the useful question — adding a slot now forces _is this cross-behavior?_ to be answered once, in the type, instead of being assumed. A third behavior turns this from two lines into a growing matrix, and **that** is the point at which an explicit common contribution contract earns its keep; it does not earn it at two.~~ **There is no such obligation** (D-138): a slot added to either record needs no twin on the other, and neither record knows the other exists. That is what the branded context bought, and the third-behavior argument above is the case it was bought for — arriving one behavior earlier than this paragraph expected.

Three slots against the sortable's six, no discriminator, and the same closed-world rule: a new semantic seam is a coordinated edit to this type, the slot record, the assembler and the behavior's call sites, and that closed world is what buys direct slot calls with no runtime descriptor interpretation.

**`constrain` is a paired capability, for 03's reason and not by analogy.** The behavior owns the events that make a bounds rect stale — activation, scroll, resize, `invalidate()`, release — and the feature owns the rect. Neither can do the other's half, so installing a resolver without its invalidator has to be impossible rather than discouraged:

```ts
type MotionConstraint = Readonly<{
  apply(motion: MotionDraft, view: ConstraintView): void;
  invalidate(): void;
  retire(): void;
}>;
```

`apply` is **one indirect call per committed sample and allocates nothing**: it writes the clamped scalars back into a mutable `MotionDraft` the behavior owns and passes by reference, rather than returning a point. That is 13c P-1 as corrected at C-07 — the first version of the probe wrote `constrain()` as one function returning `{ x, y }` while claiming the path allocated nothing, and a `Point` per pointer sample is what it actually cost.

**The hot-path cost is stated rather than absorbed.** 02's accounting is three post-`MOVE` indirect calls — `spec.moved`, `lift.write`, `frame.schedule`. A composition with `bounds()` makes it **four**; a composition without it pays one property read and one predictable branch. That is the shape of every optional slot in this package and it is Phase 21's number, not this document's claim.

**`constrain` is single-writer, and that is the extensibility story.** A consumer wanting grid snapping, magnetic guides or a custom containment rule writes a middle-tier installer that fills the same slot instead of `bounds()`, and the library ships none of it. That is the first capability in this package that a third party can supply _instead of_ a first-party one rather than beside it.

### The middle tier

`free-drag/feature.js`, mirroring `sortable/feature.js` (D-61): the three installer aliases and the three contribution groups, `MotionConstraint`, `ConstraintView`, `MotionDraft`, plus `FeatureContext`, `LandingContribution` and the three landing seam types and `Disposer` as re-exports. No runtime exports — every name on it is erased, which is the honest measurement statement for the entry, as it is for the sortable's.

An installer is **externally inert**: it may allocate and capture, but it may not attach a listener, write the DOM, or acquire anything needing release. Every acquisition happens inside a kernel-owned operation lifetime.

### The export topology extension

Four entries, taking the package from eight to twelve. Decided in full before modules exist — the same precondition Phase 0 observed, for the same reason.

| Subpath | Runtime | Types |
| --- | --- | --- |
| `free-drag.js` — the ordinary tier | `freeDrag`, `FreeDragResolution` | the closure of `FreeDragConfig` — §The published names |
| `free-drag/feature.js` — the middle tier | — | `ConstraintInstaller`, `FreeDragLandingInstaller`, `FreeDragPlugin`, `ConstraintContribution`, `LandingContribution`, `FreeDragPluginContribution`, `MotionConstraint`, `ConstraintView`, `MotionDraft`, `FeatureContext`, ~~`LandingStart`, `LandingContext`, `LandingHandle`~~ `LandingTail`, `LandingTiming` (D-155), `Disposer` |
| `free-drag/bounds.js` | `bounds` | `BoundsSource` |
| `free-drag/landing.js` | `landing` | `LandingOptions` |

**`free-drag/landing.js` duplicates an entry, not an implementation.** The landing policy is behavior-neutral — ~~`LandingStart`, `LandingContext` and `LandingHandle` are kernel SPI~~, and since D-155 there is no runner at all — so the timing domain and its reduced-motion collapse are one internal module that both entries wrap. What the two entries do not share is the _installer type_, because the contribution types differ, and unifying those is F-64's deferred question. The cost is a thin factory per entry; the precedent is `rect-index.ts` shared between `y()` and `xy()` at a measured 60 B, recorded rather than absorbed. **Phase 21 measures this one the same way.**

Neither `drag.js` nor `kernel.js` changes. A free-drag consumer imports `free-drag.js` and — for `instanceof DraggableError` — `drag.js`, and reaches no other tier. `tests/packaging.node.test.ts` asserts the absence in both directions: a free-drag composition's import graph must not reach `sortable/`, and the sortable's must not reach `free-drag/`.

---

## Live policy is a pull, and there is no `update()` (D-71)

D-44 replaced `updateItems(payload)` with `items()` + `invalidate()` on the finding that the package carried **two channels for one thing and re-read neither**. Free drag's `update(DragUpdate)` is the same shape at a different slot, and it gets the same answer generalized into a rule:

> **Every mutable policy slot is a source the library re-reads, and `invalidate()` is the only signal. No slot has a setter.**

| Policy | Source | Read at |
| --- | --- | --- |
| ~~`axis`~~ | ~~the value, or `AxisSource`~~ | ~~activation, and on `invalidate()`~~ — **not a policy source at all** (D-148): its value is applied to travel the operation has already accumulated, so re-reading it reinterprets history rather than changing what happens next. Fixed for the controller's life, like the callbacks below |
| bounds | `bounds(source)`'s element or thunk, held by the feature | the feature's own rule: on `invalidate()`, and lazily after a scroll or resize |
| landing timing | `landing({ duration })`, contextual since D-67 | once per landing, at settlement |
| `onMove` and the other callbacks | the config slot | fixed for the controller's life |

`invalidate()` carries no payload for D-44's reason — the library asks rather than being told — and it is **applied as a queued action**, so it lands in FIFO order with everything else the drag is doing and reads consumer sources inside `action.prepare`, where the kernel has a transaction open, a phase to branch on and a stage to classify a throw against. Calling a source on the `invalidate()` statement itself would run consumer code at an arbitrary reentrant point; that is the same defect D-44's own note records.

**`moveTo(point)` is a command, not policy, and that is why it is a separate member.** A controlled position is not a rule the library re-reads; it is an instruction to move the visual now. Folding it into a policy setter is what made the shipped `update({ position })` carry a motion command inside an options bag.

**Its semantics are a re-base, and the parity delta is stated.** `moveTo(p)` writes an offset into the frame such that the visual is at `p` on the next committed frame, and subsequent pointer motion continues **relative to that**. The shipped `update({ position })` set an absolute controlled position that later pointer samples did not disturb. The observable the shipped test pins — _retargets a controlled drag mid-flight_ — holds under both; the two differ only when the pointer keeps moving afterwards, and the re-base is the one that composes with a live pointer rather than fighting it.

`moveTo` writes through `lift.write` from an `action.effect`, which is 13c N-4's route, and it is **the sharpest reason D-35 is a precondition rather than a nicety**: a re-based visual that lands from the pointer delta lands from somewhere it has never been.

### What the controller lost, and what it costs

`update()` could replace `onMove` and `landingTiming` live. Neither survives as a live slot: a consumer that wants a swappable movement callback closes over a mutable reference of its own, which is the two lines it already has open. Recorded as a real, small loss rather than an equivalent spelling.

---

## Coordinate space narrows to deltas (D-72)

`coordinateSpace: CoordinateMapper` **is not carried forward**, and `localDelta` is.

The shipped default mapper is built by walking `offsetParent`, accumulating `clientLeft`/`scrollLeft`/`zoom`/`offsetLeft` and each ancestor's own transform (`packages/drag/src/kernel/coordinate.ts`). That walk **is** a coordinate module, drag2 has none, and Phase 19 forbids adding one. So the question was never _is a mapper useful_ — it was _what can this package derive without re-adding the module it deleted_.

**box-quad already answers most of it.** The lift traversal reads the visual's inherited ancestor space and hands back its linear part — `a`, `b`, `c`, `d`, plus `ancestorZoom` — which `kernel/presentation.ts` already consumes for the in-place projection. A **delta** maps through the linear part alone; a **point** additionally needs the translation, and box-quad exposes none. That is the exact seam, and the decision follows it:

- **The local delta stays and is correct by default.** Derived from the ancestor linear part at activation, no consumer option, no module, no per-sample matrix work — the coefficients are captured once and the warm calls are four multiplies. **It is carried as `localDeltaX`/`localDeltaY` since D-139**, with every other coordinate on both consumer shapes: `onMove` runs once per committed sample, and the pairs were four objects a frame holding two numbers each.
- **Points are viewport, everywhere.** `FreeDragRequest` loses `localPosition`; `home` returns a viewport `Point`; `moveTo` takes a viewport `Point`.
- **There is no `coordinateSpace` option**, so no consumer-supplied mapper and no `CoordinateMapper` type on the surface.

**What a consumer loses**, stated plainly: an arbitrary consumer-defined space. A consumer whose model is not an ancestor-transform space — a canvas with its own projection, say — receives viewport numbers and maps them itself, which it can, because the mapping is theirs and they hold both ends of it. **What no consumer loses** is the two shipped stories the option existed for: Zoomed Context and Transformed Stage are ancestor-transform cases, they are what box-quad's traversal already handles, and drag2's Zoomed Context port works today with no mapper at all.

The `space: 'viewport'` discriminant on the home target goes with it. A one-member discriminant that never varies is a field that can only ever be one value, and this contract deletes those elsewhere — `FreeDragHome` collapses into `Point`, which is already public on `drag.js`.

---

## ~~Lift modes are a consumer domain, mapped (D-73)~~ — superseded 2026-08-26 by D-141

**The slot takes `LiftMode`, and `free-drag.js` publishes the three constants beside it.** What follows is the reasoning that decided otherwise, kept because its premise is what dates it.

~~The ledger's open question 2 asked whether a behavior may expose a kernel-internal enum. **It may not, and it does not have to.**~~ The enum was never internal: `kernel.js` had published it since D-68, so what the string domain bought was a **second name for each of three modes** and a total `Record` to hold the two in step — an indirection the reader traverses in both directions, not an encapsulation. The table below reads as the migration.

`kernel.js` publishes `LIFT_FAITHFUL`/`LIFT_FLAT`/`LIFT_IN_PLACE` and `LiftMode` for a kernel-tier author who must fill `BehaviorConfig.liftMode` (D-68). The ordinary tier publishes a **string union of its own**, and the behavior maps one to the other in the one place that knows both. An ordinary consumer never sees a numeric constant, and the kernel enum stays a kernel enum — which is D-47's progressive disclosure working, rather than the tier inversion it exists to prevent.

| Config value | Kernel mode | What it does |
| --- | --- | --- |
| `'faithful'` (default) | `LIFT_FAITHFUL` | Top layer, ancestor transform preserved through the base matrix — the visual keeps its authored appearance |
| `'flat'` | `LIFT_FLAT` | Top layer, ancestor transform dropped |
| `'in-place'` | `LIFT_IN_PLACE` | Stays in the container, rides the authored transform, translate projected through the inherited space |

**The strings were renamed from the shipped ones, and D-141 then deleted them.** `'top-layer'` → `'faithful'` → `LIFT_FAITHFUL`, `'flatten'` → `'flat'` → `LIFT_FLAT`, `'none'` → `'in-place'` → `LIFT_IN_PLACE`. The middle step's reasoning still holds and is why the constants read the way they do: The reason is not tidiness: **both** promoted modes use the top layer in this package, so `'top-layer'` names one of them after a mechanism it shares with its sibling, and `'none'` says _no lift_ for a mode that lifts, suppresses transitions and projects coordinates. The precedent is `vertical()` → `y()` — _a layout word for a rule that is about a coordinate_ — and the migration is a three-row table.

---

## The seam mapping

Every signature below is the shipped `BehaviorSpec`. D-34's parameter was its one precondition, and **it is in the tree since 2026-08-15**, so the table below now describes types that exist rather than types Phase 19 has to wait for.

| Member | Free drag |
| --- | --- |
| `createFramePart` / `resetFramePart` | §The frame part |
| `config` | `{ threshold, liftMode: map(config.lift), actionTags: 2 }` |
| `admit(event, draft)` | Applies D-46's input policy and D-50's handle scoping, resolves `visual`, and returns **a bare element** — D-59's common form, because free drag has no separate geometry source. `null` declines |
| `command` | **Absent.** No discrete ingress; `arm()` binds `pointerdown` and nothing else. Keyboard free drag has no shipped counterpart and no parity row, so it is not invented here |
| `activation.prepare` | Stages **nothing**: returns `true` — expressible since D-34 landed |
| `activation.effect` | Reads `scope.visual` into the part, primes the constraint, invokes `onStart(geometry)` behind the barrier |
| `moved(current, lift)` | Raw delta from the committed sample, plus the frame's offset; axis (core); `constrain.apply` when installed; `lift.write(dx, dy)`; then `onMove(geometry)` — **after** the write, which is the shipped observable and is retained |
| `action` | Two tags. `TAG_POLICY` re-reads the `axis` source and calls `constrain.invalidate()`; `TAG_POSITION` writes the re-base offset in `prepare` and renders it through `lift.write` in `effect` |
| `action` phase legality | **Defined per tag, not per behavior** (D-86). `TAG_POSITION` is legal in `ACTIVATING` and `ACTIVE` and is a **deterministic no-op** in every later phase — `prepare` returns `null`, so nothing is staged and `effect` never runs. `TAG_POLICY` has the same legal set for a different reason, stated separately below. The test is on the frame's own `phase`, read in `prepare`; **no kernel change, no new SPI, and the sortable's action legality is untouched** |
| `release.prepare` | Builds `FreeDragRequest` into the draft, returns `{ invoke: (signal) => onDrop(request, { signal }) }`. **Never `null`** — free drag has no proven semantic no-op, so `SETTLED_SKIPPED` has no producer in this behavior, and a release that finds no visual or no request **throws** rather than reporting a successful drop (D-152) |
| `release.effect` | ~~Nothing. There is no placeholder to move.~~ **There is no placeholder and there is still one write** (D-81, F-39 applied to this behavior): `lift.write` of the release delta `prepare` derived. `pointerup` need not carry the last processed `pointermove`'s coordinates, so without it the visual — and therefore the whole landing trajectory — opens from a stale position while `anchorTarget` reports the fresh one, which is D-35's wrong-start signature arriving from the other end. **Unbranched, unlike the sortable's**: F-39's write is conditioned on `pointerId` because a command mints a pointerless operation, and this behavior has no `command` |
| `settlement.prepare(draft, input)` | Maps all five inputs to the domain result, including D-66's fallback: `draft.domain ??= { type: 'canceled', … }` with the stage derived from a behavior-private progress marker, never from `request !== null` |
| `settlement.effect(current, _)` | ~~`scope.holdForLanding(startLanding)`~~ **nothing** (D-155). The policy question moved to `landingTail`, asked at the join, and its answer is unchanged: a tail when the visual has to travel — the rejected and canceled arms with a home target — and never for an accepted drop, which is already where it landed |
| `anchorTarget(current)` | **Accepted → `originRect` plus the delta `release.prepare` committed, read rather than re-derived** (D-89): no `deriveMotion`, no `constrain.apply`, no consumer call and no DOM read — which is what the seam's own comment already claimed. ~~Accepted → the visual's current viewport position~~ described the **value** correctly and the **method** wrongly, and the strike retires the method alone — the point it names is the same point D-89 now reads off the committed delta. **The verbatim restatement that stood here unstruck two clauses later is deleted** (C-2): a sentence cannot be simultaneously retracted and asserted, and a reader had no way to tell which reading was current. P18A-17's class, arriving inside the correction that answered P18A-17. Rejected or canceled → `home(subject)`, or the grab position when no `home` is configured. A throwing, malformed or non-finite result is an **error, not a cancel** — the shipped semantics, classified `FAILURE_LANDING_TARGET` through `reportFailure` (D-49; ~~both the stage and that member are deleted — D-130 makes it a `DraggableWarning`~~) so a drop that already committed is not re-settled. **The point is read, checked and copied here** (E-05), because the kernel's quality wrapper covers only the call |
| `finalized(current)` | `onEnd(current.domain)` behind the barrier, once |
| `reportError(error)` | `onError(error)` — forward and nothing else (D-130). ~~`reportFailure(stage, error)` → `onError(toDraggableError(stage, error), { domain: null })`.~~ The kernel builds the error and picks its class; the context is deleted, since its `domain` was strictly redundant with the `onEnd` D-66 makes unconditional and went **stale** whenever a second failure arrived between `REPORTING` and `FINALIZING`. **`toDraggableError` is deleted outright at D-132**, which is what makes the struck form unwriteable rather than merely superseded |
| `retire` | Drops the per-operation references. Idempotent, best-effort |

### The motion constraint's calling convention (D-90)

**A `MotionConstraint`'s members are never invoked with that `MotionConstraint` as their receiver, and an author may not depend on `this`.** The forbidden receiver is the **capability record the member is declared on** — the object the installer nests under `constrain` — and not the contribution object carrying it (D-94). A constraint written as a class instance or with `this`-reading methods is **outside contract** — it must close over its state, as the first-party `bounds()` already does. **What the receiver _is_ at any site is unspecified** (D-93).

> ~~the contributed record~~ named the wrong object, and the error is the opposite of a typo: the sentence was **true of a fully bound tree**. An installer returns `{ constrain }`, so `contribution.constrain.apply(…)` — the most obvious bound implementation, and the one this convention exists to forbid — hands `apply` the **nested** record and never the contribution object. A guarantee the forbidden implementation already satisfies forbids nothing (CE6-01, D-94). The fixture was never confused: `own()` returns the nested `MotionConstraint` and every row compares against that, so the prose was the only half that drifted.

> ~~calls them from its own state~~ is a **mechanism** clause of the same species as the one directly below, and it is corrected on sight rather than carried: the construction unwind is the assembler's, not the behavior's, and it calls the hook off its internal array. The obligation is the whole of the published guarantee; **no sentence here may say where a member is called from**, because the moment one does it has to be re-derived at every site and re-checked at every refactor. The lift attribution — the spec lifts `apply` and `invalidate`, the assembler lifts `retire` — is recorded in §How closure was measured, which is about the code rather than about the guarantee.

> ~~call them as bare functions~~ was a **mechanism** claim and it is withdrawn (CE4-01, D-93). It was true of four sites and false of the fifth: the construction-unwind loop calls `retireHooks[i]!()`, and an indexed call hands the hook **the internal array**. The obligation held everywhere; only the sentence describing how it is achieved did not.

Stated because the tree **was** split three ways when the decision was taken — `apply` and one `invalidate` site bound, a second `invalidate` site and `retire` detached — so a `this`-reading constraint worked from `controller.invalidate()` and threw on the first scroll and at every retirement. Nothing failed then only because the one shipped constraint closes over its state, which is exactly the non-discriminating control F-74 names. The split is gone; the sentence is kept because it is why the convention had to be written down rather than assumed.

**Detached is chosen rather than bound**, for the reason [03](03-feature-composition.md) §Assembly (D-45, H-5) already gives for the sortable's identical flattening: a lifted member is one property read and one call at the seam instead of a record read plus a member read plus a bound call, and the sortable flattens all four of its contributed functions this way. Making free drag bound would leave a middle-tier author facing **two conventions in one package** — the worse outcome, since the same author writes against both tiers. The obligation this creates is one sentence on the type, not machinery.

**Current state, in one paragraph.** The convention is stated on `MotionConstraint`'s own declaration, where the third-party installer author meets it; `apply`, `invalidate` and `retire` are lifted off the record and reached at **five** sites; and `tests/free-drag/anchor.browser.test.ts` drives each site **alone** with a constraint whose members record the receiver they are handed. Re-attaching any one **lift** fails every row whose sites that lift feeds — measured, not counted from the site total: **one** for `apply`, **two** for `invalidate` (the scroll/resize listener and `TAG_POLICY` share one lift), and **two** for `retire` (the normal retirement and the unwind share the assembler's). ~~four rows for three members~~ — **five sites for three members** (D-93): `invalidate` is reached from both the scroll/resize listener and `TAG_POLICY`, and `retire` from both the normal retirement and the **construction unwind**, which the four-row enumeration missed because the sites were counted from where retirement is normally driven rather than from where the member is called — the enumeration error D-81 and D-89 each made once. ~~`InsertionGeometry` states nothing, and the sortable is under the same convention~~ — **D-92 landed that half on 2026-08-18**: `InsertionGeometry` now states the obligation on its own declaration, and `tests/sortable/calling-convention.browser.test.ts` pins all four lifted members across **its own five sites**, the fifth being the same construction unwind (D-93).

**How closure was measured** (kept, because it is the standard the next such decision is held to). The falsifier was recorded before the fix and run after it, rather than the fix being judged by inspection: reverting the three `spec.ts` sites to `constrain?.apply(…)`, `guarded(() => constrain!.invalidate())` and `constrain?.invalidate()` fails three rows, and binding the assembler's `retireHooks.push(contribution.constrain.retire)` fails the remaining two — the normal retirement and the unwind, which share that one lift. The production tree was restored and re-verified before the marker moved.

**Where each member is lifted** — code, not guarantee (D-93, CE4-02). `spec.ts` lifts `apply` and `invalidate` into two locals; the **assembler** lifts `retire` into `retireHooks`, and therefore owns both of its call sites. The earlier _the behavior lifts `apply`, `invalidate` and `retire`_ attributed all three to one place and read as though one file could be checked to confirm the convention.

**Why this decision was re-opened after being recorded as implemented** — historical, and the reason the record keeps it. Between 2026-08-16 and 2026-08-18 the ledger said _implemented_ while **neither** stated deliverable was in the tree. The sentence was not on the type — the only source-side statement lived in the implementation file that already obeyed the convention, in a comment asserting the sentence existed (C-1). And the row mapped to D-90 built a constraint whose members **ignored `this`**, so a bound call handed them a receiver they never read: reverting all three sites left the suite green at 1004 passed. **The lesson is not that the fix was wrong but that the record was ahead of it** — CE1-03 was _a convention nothing states_, and its first remediation was _a convention stated in the wrong place and a fix nothing pins_. Recording a decision as implemented on the strength of a contract section is how F-63 happened, which is why the deferred-decision table now accepts a decision the ledger had already marked done.

### Action phase legality (D-86)

**Free drag owns writable geometry in exactly two phases.** `ACTIVATING` — so an intentional reentry from `onStart` retargets rather than being dropped — and `ACTIVE`. `RELEASING` is where the kernel's own vocabulary says _input closed, geometry final_: the request is built, the landing origin is about to be sampled, and `BehaviorLiftSession` already declares a write after that point out of contract. Everything from `RELEASING` on is therefore late.

| Tag | Legal | Why the rest is refused |
| --- | --- | --- |
| `TAG_POSITION` | `ACTIVATING`, `ACTIVE` | **Correctness.** It writes through `rt.lift`, so a late one moves a visual the settlement has already read, alters geometry after `release.prepare` fixed the request, or — from `onEnd`, which is FIFO-ahead of `RETIRE` — writes through an **already-disposed** lift and leaves a stray inline transform on a released element |
| `TAG_POLICY` | `ACTIVATING`, `ACTIVE` | **Hygiene, and it is a different argument.** It writes no geometry; it re-enters the consumer's `axis` source and a third-party `constrain.invalidate()`. After `RELEASING` there is no later sample for a refreshed policy to affect, so the call is pure re-entry into declared slots for no observable effect |

**The two are defined separately even though the sets coincide**, and that is the point of writing it as a table: they coincide _today_ because free drag takes no sample after release. A tag whose legality rests on _it would corrupt the landing_ and a tag whose legality rests on _it would achieve nothing_ do not move together, and collapsing them into one phase test would hide which reason a future change had broken.

**A no-op, not a rejection**, and not a throw: `prepare` returning `null` is the seam's existing _discard_ value, so a late `moveTo()` costs one phase comparison and produces no failure, no report and no terminal. A consumer calling `moveTo()` from `onEnd` has not made an error the library should classify — the operation is simply over.

**`invalidate()` and `moveTo()` keep their `host.closed` guard**, which is a different question: that one asks whether the controller is alive, this one asks whether the operation still owns its geometry. A controller can be perfectly live in `SETTLING`.

**Deliberately not solved in the kernel.** The alternatives are re-ordering `RETIRE` against the success join, or filtering behavior tags by phase in `handleBehaviorAction`. Both are behavior-neutral machinery bought to fix one behavior's rule, and the second is actively wrong: the sortable **intentionally** accepts a collection `invalidate()` in phases where free drag's geometry must be frozen, because a collection change during settlement is real information and a position write is not. Phase legality for behavior actions is behavior knowledge, which is why the kernel routes tags without interpreting them.

### The frame part

Five fields against the sortable's **seven**, and a different shape — which is the point M-1 makes about the 12-to-16-field copy cliff, and the reason Phase 21 must measure this part rather than inherit the sortable's number.

| Field | Why it is committed state |
| --- | --- |
| `visual: HTMLElement \| null` | Needed after activation, in seams that receive no scope |
| `offsetX: number`, `offsetY: number` | `moveTo`'s re-base. An **input**, not a derivation, so only a `prepare` may write it |
| `request: FreeDragRequest \| null` | Written by `release.prepare` before the command is returned, so `release.effect` and the `invoke` closure reach the same object — the sortable's `proposal` discipline exactly |
| `domain: FreeDragTransactionResult \| null` | The result, and D-66's fallback carrier. One field for both, because the fallback rule is _existing result wins_ |

**Both frame-part operations are one function since D-142.** `freeDragFramePart(existing?)` allocates when called with nothing and returns a part to its defaults when called with one, over a single `DEFAULT_PART` literal — the shape `kernel/frames.ts` runs over the kernel's own slice, applied here and to the sortable's seven fields. The create/reset pair it replaces had two field lists whose agreement was the invariant, which is precisely what two functions cannot hold.

**The rendered delta is deliberately not a field.** It is a pure function of the committed sample, the offset and the policy, so `moved`, the request builder and the geometry builder each derive it; `moved` receives a `Readonly` frame and could not write it anyway. That also keeps this behavior clear of the mirror-every-write duplication that D-35 was chosen over a `renderedDelta` seam to avoid — the behavior derives, the kernel records its own writes, and neither reads the other's copy.

---

## The terminal-barrier enumeration (I-36, in D-37's finite form)

The deliverable, discharged. **Not** the stretch decomposition, the provisioning/floor/register apparatus or the survive-the-stretch sweep — D-37 withdrew the quantifier those existed to discharge, and copying them forward would import an undischargeable obligation into the second behavior.

**Category 1 — every declared consumer slot the behavior invokes.**

| Slot | Invoked from | Barrier |
| --- | --- | --- |
| `handle`, `visual` | `admit`, inside the native listener | Kernel-bracketed: admission is one seam and a throw is `FAILURE_ADMISSION`. Single call, no sequence |
| `onStart` | `activation.effect` | Latch read immediately before. Single call. **This row was true of the contract and false of the code until Checkpoint E** (E-02): the implementation read the latch after the optional `axis` source and then ran the constraint, the lift write and the progress advance with no further reading, so a `bounds` source that destroyed its own controller still got a start published. The reading is now where this cell always said it was, and there are two of them — one after the `axis` source, one after `constrain.apply` — because they guard different calls |
| `onMove` | `moved` | Latch read before. One consumer call per sample, after the write |
| `axis` source | `action.prepare(TAG_POLICY)` | **The one site with two consumer calls in one seam** — see below |
| `bounds` source | inside the constraint feature, on its own re-resolve | **The caller's reading, and the feature has none of its own** (CE1-05). ~~the feature holds a liveness reading, not a mirror of one~~ was false: `bounds()` names no `host`, no `closed` and no liveness value, and `FeatureContext` — `realm`, `root`, `report` — offers no way to obtain one. Every protection comes from the seam that calls `apply`, which is the honest statement and the reason D-89 mattered: one of those callers had no reading at all |
| `constrain.apply` / `.invalidate` / `.retire` | `deriveMotion` (four seams), `action.prepare(TAG_POLICY)`, the scroll/resize invalidator, `retire` | **Added at Checkpoint E** (CE1-02). These are declared middle-tier slots the behavior invokes and they belonged in this table from the start; listing only the `bounds` _source_ named a first-party feature's private input while omitting the slot that admits arbitrary third-party code. `apply` is reached from `activation.effect`, `moved`, a `TAG_POSITION` effect and `release.prepare` — D-81's four. ~~each behind that seam's own barrier~~ **overclaimed, and the overclaim is prose rather than contract** (C-3): I-36's statement-level obligation is a latch reading **between successive declared-slot invocations in one seam**, not a reading after every slot invocation. Measured per seam: `activation.effect` invokes three slots (`axis` source, `apply`, `onStart`) and carries two readings; `moved` invokes two (`apply`, then `onMove`) and reads the latch between them, after the write; `release.prepare` invokes two (`apply`, then `onDrop`) and reads it between them; the `TAG_POSITION` effect invokes **one** and therefore owes none. **All four conform.** The `lift.write` that follows `apply` unread in two of them is internal work D-36's transaction bracket undoes — the frame the boundary is about to scrub — which I-36 names explicitly as structurally discharged, so requiring a reading there would reinstate the ceiling D-37 withdrew. **What was wrong was a cell stating uniformly a property the invariant does not ask for uniformly**, which reads as a stronger promise than the tree holds and would send a later reader hunting a barrier at the one site that correctly has none. **There is no fifth site**: `anchorTarget`'s accepted arm had one and D-89 deleted it rather than granting it an attribution, a barrier and a row |
| `onDrop` | the `invoke` closure, kernel-driven | Kernel-owned: the kernel opens it, holds the signal, and revalidates after |
| `home` | `anchorTarget` | Latch read before. Single call. **Its result is read and copied inside the seam** (E-05; the finiteness check went with D-124, the copy did not): the kernel's unclassified wrapper covers the call and read the point's fields outside it, so a `null`, a missing field or a throwing accessor escaped the seam its own attribution names. Throwing from inside `anchorTarget` is what puts the fault back on the `FAILURE_LANDING_TARGET` quality track (§Validation) already publishes for it |
| `onEnd` | `finalized` | **Kernel-bracketed, and this row said otherwise** (CE1-09). ~~Latch read before~~ — neither behavior reads one in `finalized`; both publish `current.domain` unconditionally. The guarantee holds and is carried kernel-side, by `joinLive()` before `spec.finalized` in the join and by the phase/operation test in `handleErrorReported`, both probed. It is corrected rather than left because E-03 set the precedent: when a barrier is kernel-side the table has to say so, or an author deleting the kernel check finds nothing on the behavior side to warn them |
| `onError` | `reportError` | Latch read before. **The kernel-owned routes into it are guarded as well** (E-03), and since D-130 there is **one** of them: `notify` refuses after logical closure and discards a throwing handler, where `runAdmission`'s catch and `reportQuality` each open-coded half of that. `panic` is the single named exception (D-131). The guard is kernel-side because the rule is controller lifetime rather than domain settlement, and both behaviors reach the same two call sites |
| `landing({ duration })` | inside the timing policy, at the join | **The inherited conforming residue** (F-47): the thunk is followed by `matchMedia` with no reading between them. Free drag inherits the site with the shared policy. ~~and it stays classified rather than closed~~ — **it is unclassified since D-155**: the drop is decided, committed and released before the policy is asked, so the blast radius is a transit and nothing else |
| plugin installers | construction, once | Not per-operation. Externally inert by contract |

**Category 2 — where it admits.** One site: `admit` on `pointerdown`. No `command` member, so no discrete listener is bound at all.

**Category 3 — where it publishes a lifecycle or domain event.** Nowhere. The package dispatches no DOM events and exposes no event target; every publication is a declared slot, which is why category 1 is the whole of the surface.

**Implemented (D-148).** This barrier is **deleted with the site it defends**, not ported. With the `axis` source gone, `action.prepare(TAG_POLICY)` makes one consumer-reachable call — `constrain.invalidate()` — and a gate whose whole subject is _the previous consumer call may have destroyed the controller_ has no previous call to gate on. COVERAGE row **L-3** goes with it. What survives is the reason the barrier taught rather than the barrier: where a seam makes two consumer calls, the latch is read between them and not only before the first.

~~**The one new barrier, and what it tells us.**~~ **Deleted with its site** (D-148); kept because the lesson outlived it. `invalidate()` re-read the `axis` source and then re-resolved bounds — two consumer-reachable calls inside one `action.prepare`, with the behavior driving the sequence. That is precisely the shape D-26 never covered and F-47 found: the latch is read **between** them, not only before the first. Every other site in the table is a single call inside a kernel-driven seam.

**The falsifier did not fire.** The stated condition for making liveness kernel-supplied rather than behavior-owned was a **third** copy of the latch. Free drag needs one field and one line in `destroy()` — the second copy — and since D-53 the latch itself is `host.closed`, read rather than mirrored. The rule stays behavior-owned and Checkpoint E inherits the count, not the question.

---

## What free drag does not have

Recorded because an absence a reader has to infer is an absence a later phase will re-add by accident.

- **No placeholder, no collection, no insertion.** Nothing in `free-drag/` measures a sibling or names an index.
- **No discrete ingress.** No `command` member, no keyboard drag. Parity has none and Phase 16's machinery is the sortable's.
- **No `SETTLED_SKIPPED` producer.** `release.prepare` never returns `invoke: null`.
- **No readiness gate**, and since D-155 no gate at all. A consumer that must render before the landing measurement `await`s its own commit inside `onDrop` (D-41).
- **No `noop` terminal arm**, and §The results says why the sortable has one.
- **No feature-owned frame state.** D-10 stays reserved and unimplemented; the constraint's rect lives in the feature's own closure.

---

## Acceptance criteria

Implementation-ready in the sense the handoff uses: each row is a check that fails against today's tree and passes only when the thing it names exists.

### Kernel preconditions — the discrete step before Phase 19 (D-76)

Landed against the **sortable alone**, with zero free-drag code in the tree, so that any regression is attributable to the kernel change rather than to the second behavior.

**Done, 2026-08-15**, on those terms. The criteria below are unchanged; what discharged each one is the table after them.

#### K-1

`BehaviorSpec<Part, Activation extends {} = true>`, threaded through `BehaviorInstall` and `BehaviorFactory` (D-34, and C-04's correction that the generics must reach the construction types). The sortable declares `HTMLElement` explicitly. `kernel.js`'s published surface gains a **defaulted** parameter, so D-68's list is unchanged in count and source-compatible

#### K-2

`VisualLiftSession` records what `write(x, y)` composed; the settlement reads it once, before the pin (D-35). The behavior is handed a projection carrying `visual`, `baseTransform`, `compose`, `write` and **not** `rendered` or `dispose` — I-34's structural half, typed and asserted with `@ts-expect-error`

#### K-3

05's **Landing origin — new (D-35)** matrix group executes: a non-zero pin on both axes, an axis-locked fixture reporting its own delta rather than the pointer's, a write from an `action.effect` tracked, `(0, 0)` for an operation that never rendered, and `(0, 0)` — never `-originX` — for a pointerless one

#### K-4

The three renamed stages (D-74), values unchanged: `stageToCode`'s keys, the kernel's two hard-coded defaults, `sortable/spec.ts`'s uses, and the fixture. A test asserts the **numeric values** are 4, 5 and 8, because a rename that moves a wire value is the one change this list must never make

#### K-5

The instrument F-63 exposes: a check that every decision row in 00 marked as landing in a later phase is either implemented or **listed**, so a normative-and-unimplemented decision is a visible state rather than a discovery. The list is the artifact; the check is that it is complete

#### K-6

M-1 and M-3 re-measured for K-2's two scalar writes per sample, under the reproducibility standard 05 §Measurements (landed 2026-08-02) sets. The sortable suite green throughout

**What discharged them.**

| # | Discharged by |
| --- | --- |
| **K-1** | `src/kernel/spec.ts` (`BehaviorSpec`, `BehaviorInstall`, `BehaviorFactory`), `src/kernel/kernel.ts` (`Kernel`, `createKernel`), `src/kernel.ts` (`draggable`), `src/kernel/seams.ts` (`runActivationSeam`, now generic in `Prepared`); the sortable writes `HTMLElement` at all three of its own annotations. Assertions: `tests/kernel/spec.declaration.test.ts` §the activation staged type — five rows, both `@ts-expect-error` directions — and the out-of-line fixture in `tests/consumer.node.test.ts`. **`kernel.js`'s value surface is unchanged in count**; the type surface gains exactly `BehaviorLiftSession`, which K-2 requires and 02 §What stays internal's own test demands be published |
| **K-2** | `VisualLiftSession.rendered`, written by `write` _after_ the assignment so a `FAILURE_RENDERER_WRITE` cannot leave the record claiming a delta the element never took; `BehaviorLiftSession` as a positive `Pick`; `ActivationScope.lift` and `moved`'s second argument both projected. Assertions: `tests/kernel/spec.declaration.test.ts` §the lift capability, including the converse row that both members survive on the kernel's own session — a `Pick` that picked nothing would satisfy every `@ts-expect-error` and prove nothing |
| **K-3** | `tests/kernel/kernel.browser.test.ts` §the landing origin — seven rows. **Five fail against the pre-D-35 computation** (verified by reverting it); the other two are recorded in the tests as non-discriminating rather than counted, since a pointer-following behavior and a `(0, 0)` pointerless mint agree with the old form by construction |
| **K-4** | `src/kernel/failures.ts`, ~~`src/kernel/errors.ts`'s `STAGE_TO_CODE`~~ (deleted at D-132; `STAGE_NAMES` inherited its positional discipline for a day and D-133 deleted that too, so **no positional table indexed by a stage number survives** and the witness is `tests/kernel/stages.node.test.ts` alone), the kernel's two hard-coded action-seam defaults, `src/sortable/spec.ts`'s three uses, both compiled fixtures, and the four contract documents that named the old stages in normative prose. `tests/kernel/stages.node.test.ts` — _should keep the three renamed stages on their original numbers_ — asserts **4, 5 and 8 as literals**, because comparing a constant to itself is exactly what would let a wire value move. **D-132 promotes that row from belt to load-bearing**: until then a stage number reached only a kernel-tier author, and it now reaches an ordinary consumer on `DraggableError.stage` |
| **K-5** | [00](00-index.md) §Decisions not yet implemented and `tests/decisions.node.test.ts`. Falsified three ways: a marked decision with no row, a listed decision with no marker, and a listed decision whose witness stopped holding |
| **K-6** | [`measurements/m1.md`](../measurements/m1.md) and [`measurements/m3.md`](../measurements/m3.md), each with a re-measurement section. **M-1: a null result** — no resolvable regression at ~0.1 µs per sample, which is this harness's one-tick floor, recorded as _unresolvable_ rather than as an upper bound the three runs cannot support. Allocation stays at 0 B per sample, which is the half that could have gone wrong and did not. **M-3: ~30 B brotli on every composition and no module-graph movement.** Budgets are **not** re-based: they stay muted telemetry (B-1's overrun is unchanged in kind and still owed a deliberate re-base with an attribution) while the graph rows stay enforced and hold |

### The behavior

#### B-1

A free-drag composition's import graph reaches **no** `src/sortable/` module, and the sortable's reaches no `src/free-drag/` module. Asserted over the graph, not over bundle bytes

#### B-2

A composition with no `bounds()` contains **no** clamp arithmetic and no rect resolver — `tests/packaging.node.test.ts`, the same instrument and the same both-directions form the two axis features already use

#### B-3

`tests/exports.node.test.ts` asserts the four new entries' exports **by value** for the runtime names and by presence for the types, and `tests/docs.node.test.ts` runs **per entry** so a type reaching an unexported one fails at the tier it escapes from

#### B-4

**Both directions, and the negative one is load-bearing. Each clause asserts only what the tables in (§Validation) promise — the two tables are asserted differently and the split is the criterion.** (a) `freeDrag()` throws **nothing** for any config the compiler accepts: a fixture passes garbage into every slot and asserts construction returns a controller. ~~Via a `Partial` fragment, since D-77 makes the first argument's shape a compile error.~~ **Corrected (P18A-20): a fragment does not admit garbage** — `Partial<T>` makes a property optional, it does not widen its type, so `{ onDrop: 42 }` is exactly as much a compile error in a fragment as in the first argument, and the rationale was misattributed too: D-77 made the required members impossible to **omit**, not the shape suddenly checked. The technique that works is the sortable's, which landed with D-77 and is exercised by `tests/sortable/options.node.test.ts` — spread a `Record<string, unknown>` **into the first argument** — `freeDrag(item, { ...required(), ...garbage })`. A **missing** `onDrop` is B-9's, not this row's: it no longer reaches runtime. (b) For each row of the **classified** table only: the bad value surfaces at the named seam and reaches `onError` with **that row's stage** (D-132) — ~~with that row's code: `consumer` for `onDrop`, `handle`, `onEnd` **and `visual`** (D-84 — admission, not activation); `interaction` for `onStart`; `presentation` for `onMove` and `home`~~, a projection that made four of those rows say the same word and is deleted with the mapping. **The terminal is asserted per row against the start boundary, not once for the table** (D-83): a row that surfaces **before** `onStart` — `handle`, `visual`, and `bounds` on its first resolve — asserts `onError` and the **absence** of a terminal; every row that surfaces after it asserts **exactly one** on a still-live controller. ~~and the operation publishes **exactly one** terminal~~ was written over the whole table and is false for three of its rows, which the executable matrix showed by driving them. **`bounds` is asserted per path, not as one value** (D-81): a garbage source reaches `FAILURE_ACTIVATION` when it first surfaces at activation, `FAILURE_RENDERER_WRITE` or `FAILURE_ACTION_EFFECT` from `moved` or a `TAG_POSITION` effect, and `FAILURE_RELEASE` from `release.prepare` — four fixtures, each driving the operation to the seam it names, because a single fixture passes while the other three paths are unattributed. ~~`presentation` for `bounds`~~ was the whole-row form and it is wrong on the path a bad source actually takes first. **D-132 is what makes this row legible**: under the coarse code the four paths collapsed to `interaction`, `presentation`, `presentation`, `interaction` — two indistinguishable pairs, and never `consumer` for a fault entirely the consumer's — so four stages now say _one bad source surfacing wherever a rect is first wanted_, which is what D-81 established actually happens. ~~Codes are asserted against `STAGE_TO_CODE`, not retyped, so a remap cannot pass.~~ **The indirection existed only to survive a remap of a mapping that no longer exists**; each row names its `FAILURE_*` constant directly. (c) For each row of the **silent** table: **nothing is reported at all**. A `NaN` threshold produces no `onError`, no terminal and **no started operation** (Q-15) — asserting a terminal here would be asserting a defect. An unknown `axis` string completes a **normal, successful, unconstrained** drag. An unknown `lift` string is a type error for a TS consumer and fails nothing for a JS one. (d) A `landing({ duration })` resolving to `Infinity` is refused at `FAILURE_LANDING_CREATE`, and the **committed rejected verdict survives** it through free drag's `SETTLED_FAILED` recovery mapping (D-24) — the assertion is on the verdict's survival, not on which track the kernel used. ~~and the accepted drop **survives** it~~ **was impossible for this behavior and is corrected at Checkpoint E (E-07)**: free drag deliberately does not arm a landing for an accepted result, because an accepted drop is already at its destination — so an accepted drop never evaluates a duration and cannot reach landing creation at all. The row's fixture always drove the rejected path; what was wrong was the sentence describing it, and the semantic asymmetry it names is **retained**. If accepted post-commit preservation ever needs its own executable proof it belongs on a failure that arm can actually reach, such as the authoritative pin write — not on a zero-distance landing forced through for the symmetry of the table. (e) `NaN`, `-1`, `-Infinity` and `'fast'` are **not** checked by the library and reach the same stage through `animate()`'s own throw — measured, [`../measurements/animate-duration-domain.md`](../measurements/animate-duration-domain.md) (D-79); `'auto'` **lands normally** from a JavaScript consumer. ~~and so does `undefined`~~ — deleted rather than merely struck (E-07): the option is coalesced to its default before the platform sees it, so `undefined` is not a value the duration domain has rows about, and leaving it in the sentence invited the same re-reading twice. What pins the guard to `=== Infinity` is that `Infinity` is the one value the platform accepts and never completes, not that a finiteness test would refuse an accepted one. Without (a), (c) and (e) a later pass re-adds the checks and nothing notices

#### B-5

The compiled fixture: a free-drag consumer written against `free-drag.js` and `drag.js` only, with the terminal switch exhaustive over three arms and `never` on the fall-through, plus negative assertions for each retired shipped name — `coordinateSpace`, `update`, `lift: 'top-layer'`, `FreeDropResolution.accept({ … })`

#### B-6

A middle-tier fixture: a `constrain` installer authored **out of line** against `free-drag/feature.js`, proving the slot is fillable by a third party without the first-party `bounds()`

#### B-7

Type identity, not structural coincidence: `FeatureContext` imported from `sortable/feature.js` and from `free-drag/feature.js` is the **same declaration**, and so is `LandingOptions` from the two landing entries

#### B-8

The frame part is five fields and `FramePartOf` rejects a kernel key in it. ~~`validateFramePart` rejects one at `arm()`.~~ **There is no runtime check** (D-124, D-122): the type is the whole of the contract

#### B-9

**The required first argument (D-77), asserted in three places because it has three failure modes.** (a) **Compile:** the type fixture carries `@ts-expect-error` on `freeDrag(item)` and on `freeDrag(item, {})`, and the same pair for `sortable(root, {})` and a config missing `axis` — the negative half, without which the parameter could quietly become optional again. (b) **Positive:** `sortable(root, { items, onReorder, axis: y() }, landing({ duration: 200 }))` and the `freeDrag` example in §The public form compile as written, and **both** `y()` and `xy()` are asserted to return the **installer**, not a one-key fragment — by name, in the type fixture, hoisted into a typed `AxisInstaller` const (P18A-14: the clause named `xy()` while the fixture exercised only `y()`, and named the fixed landing form while the fixture carried only the contextual one). (c) **Runtime, and this is the clause the type cannot cover:** a later `Partial` fragment carrying `onDrop: undefined` — or `items`/`axis: undefined` — **does not clear the merged slot**, because the merge skips `undefined`. **Asserted through the public entry as well as against the merge** (P18A-15): the clause is a statement about `sortable()`/`freeDrag()`, so a change that stopped routing fragments through the merge, or reordered the required argument against them, must fail it — which merge-level assertions alone cannot see. That was a nicety when three throws stood behind it and is load-bearing now: it is the only thing between a legal `Partial` value and a required slot that is `undefined` at the seam

### The lifecycle

#### L-1

Every shipped observable in ledger §6.2 has a row: threshold disarm, lift on activation, no jump on the first move, the accumulated grab delta in `onStart`, the visual released **before** the terminal, async acceptance awaited, ~~an invalid resolution as an error~~ (withdrawn by D-140 — the resolution is opaque, so the state has no producer through the types and `COVERAGE.md` struck the row), animate home on rejection, `pointercancel`/`Escape` disarming a pending press with no terminal, ingress closed after `destroy()`, no retained document listeners, a late acceptance after cancel or destroy ignored, and `moveTo()` retargeting mid-flight

#### L-2

**Exactly one terminal per started operation** on a live controller, on the failure path as well (D-66) — and **none** for an operation that never started (Q-15)

#### L-3

The barrier inside `TAG_POLICY`: an `axis` source that calls `destroy()` from inside itself does not reach `constrain.invalidate()`, and no declared slot fires afterwards. ~~The two-consumer-call barrier … does not reach the bounds re-resolve~~ — **corrected (D-81, F-74), and the correction is what makes the row testable**: under lazy resolution `invalidate()` marks staleness and calls nothing, so with the first-party `bounds()` the second call reaches no consumer code and a `bounds()`-based fixture is a **non-discriminating control** that passes against a missing barrier. The discriminating fixture needs a **middle-tier `constrain` installer whose `invalidate()` records that it ran** — which is also the honest statement of the contract, since that slot admits arbitrary third-party code and is why the barrier is owed at all

#### L-4

The landing opens from the **constrained** delta under an axis lock, under a bounds clamp, and after a `moveTo()` — the free-drag half of K-3, and the case the shipped kernel gets wrong. **Plus the release write it depends on** (D-81, F-39): a `pointerup` at coordinates newer than the last processed `pointermove` renders the final sample, and the landing opens from **that** position rather than from the stale one — the negative control is a fixture whose release point differs from the last move, since one where they agree passes with `release.effect` doing nothing

#### L-5

A geometry fixture per lift mode under an ancestor transform and under zoom, comparing the lifted visual's on-screen box to its expected box. Phase 11's lesson: 644 tests passed through a lift-mode regression because none compared the boxes

**What discharged the behavior and lifecycle criteria** (Phase 19 for the behavior, Phase 20 for the matrix). The table records where each row is asserted; it does not restate the rows, and it does not amend them.

| # | Discharged by |
| --- | --- |
| **B-1**, **B-2** | `tests/packaging.node.test.ts` — _should keep the two behaviors out of each other_ (both directions, non-vacuously), _should keep an unconstrained free drag out of the clamp_ |
| **B-3** | `tests/exports.node.test.ts` by value, `tests/docs.node.test.ts` per entry, `tests/consumer.node.test.ts` against the packed surface |
| **B-4** | `tests/free-drag/validation.browser.test.ts`, and the two tables are asserted separately as the row requires. **Two corrections came out of writing it, both claim-side and neither implemented here**: (b)'s _exactly one terminal_ does not hold for the rows that surface before `onStart`, because D-66 refuses an end for a beginning the consumer never heard (**F-75**); and the `visual` row's stage is admission rather than activation, in **both** behaviors, so its code is `consumer` (**F-76**). The suite asserts what the code does and names the finding at the row |
| **B-5** | `tests/consumer.node.test.ts` §`FREE_DRAG` — an ordinary-tier consumer compiled against the **packed** declarations, with the three-arm switch and `never` on the fall-through, and one `@ts-expect-error` per retired shipped name |
| **B-6** | Three ways, because the claim has three halves: `tests/consumer.node.test.ts` §`CONSTRAINT`, which compiles an out-of-line installer against the packed middle tier; `tests/free-drag/feature.declaration.test.ts` states what the type refuses; and `tests/free-drag/lifecycle.browser.test.ts` **runs** one, which is what makes L-3 discriminating |
| **B-7** | `tests/packaging.node.test.ts` — _should publish the two shared declarations from one module each_. Asserted as **identity**, not shape: `expectTypeOf` compares structures, and two independently declared types with the same members would satisfy it — which is precisely the coincidence F-64 says must not be mistaken for a shared vocabulary |
| **B-8**, **B-9** | `tests/kernel/frames.declaration.test.ts`; `tests/free-drag/free-drag.browser.test.ts` and the type fixture |
| **L-1**, **L-2** | `tests/free-drag/free-drag.browser.test.ts` and `tests/free-drag/lifecycle.browser.test.ts` |
| **L-3** | `tests/free-drag/lifecycle.browser.test.ts` §the TAG_POLICY barrier — the discriminating fixture is a middle-tier `constrain` installer whose `invalidate()` records that it ran, with the positive control beside it and the `bounds()`-based **non**-discriminating control recorded as such (D-81, F-74) |
| **L-4** | The same suite §the landing origin, reading the published origin through a third-party `landingTiming`: axis-locked, clamped, after a `moveTo()`, and from a **release point that differs from the last processed move** by (40, 20) — plus the rendered transform at that instant, which is the half a `release.effect` doing nothing would fail |
| **L-5** | `tests/free-drag/geometry.browser.test.ts` (three modes × transform and zoom) and `tests/sortable/lift-geometry.browser.test.ts` (the sortable's open gap: the lifted row against the **placeholder's** box). `src/free-drag.stories.tsx` restores the three demos beside them, which is the other half of Phase 11's lesson |

---

## Parity discharge

Every ledger §6, §6.1 and §7 row that named Phase 18.

| Row | Verdict |
| --- | --- |
| `handle` — element or resolver | **Redesigned to resolver only.** Unified with the sortable's; `handle: el` migrates to `handle: () => el` |
| `getVisual(item)` | **Retained** as `visual`, named as the sortable's |
| `lift` modes | **Retained as a consumer option, renamed** — D-73 |
| `axis` | **Retained**, and now also accepts a source (D-71) |
| `bounds` | **Retained, respelled**: `bounds: 'viewport'` becomes `bounds()` from a subpath. L-2's unexported `BOUNDS_VIEWPORT` sentinel is closed **by deletion** — the no-argument form is the viewport, so there is no sentinel to export |
| `coordinateSpace` | **Dropped** — D-72. L-7 is closed |
| `threshold` | **Retained**, same default |
| `landingTiming()` | **Redesigned** to `landing({ duration })`, contextual (D-67) |
| `onDrop` (required) | **Retained**, and simpler: no presentation declaration to carry |
| `resolveHomeTarget` | **Retained as `home`**, returning a bare `Point`. `FreeHomeTarget` is dropped: `{ position, space: 'viewport' }` had one inhabitant for its discriminant |
| `onStart` / `onMove` | **Retained**, `onMove` still after the write |
| `onFinish` / `onCancel` / `onError` | **Retained as one `onEnd` plus an orthogonal `onError`** (D-62, D-66), with the arm set **re-derived**: three, not four |
| `FreeDropResolution` | **Retained as `FreeDragResolution`**; the factories take no argument (D-41) |
| `FreeDropResult.is*` | **Dropped**, as the sortable's predicates were — the union is discriminated |
| `DraggableOptions`, `DragUpdate` | **Dissolved** into `FreeDragConfig`; `DragUpdate` has no successor — D-71 |
| `DragBounds` | **Retained as `BoundsSource`**, minus the `'viewport'` member |
| `LiftMode` | **Retained as `LiftMode`** — D-141 publishes the kernel's own union and its three constants from `free-drag.js` (~~**Retained as `FreeDragLift`** — D-75~~) |
| `FreeHomeRequest` | **Dropped, and the drop re-derived** — F-66 |
| `FreeDragCancelResult` / `FreeDragFinishResult` | **Dropped with the two-callback surface** (D-62) |
| `FreeDropRequest`, `DragGeometry` | **Retained**, minus `localPosition` on the request — D-72 |
| `FreeDropProposal`, `OnDrop`, `ResolveFreeHomeTarget`, `DragErrorContext`, `CancellationReason` — the shipped names, reachable from the surface and not exported | **Exported now**, per F-51's closure rule, as `OnDrop`, `ResolveHome` and `FreeDragErrorContext` (D-75). **Two have no successor**: `FreeDropProposal` paired the request with the mapper that defined its values, and D-72 removes the mapper; `CancellationReason` typed a union the canceled arm no longer carries, since the arm holds `reason: unknown` beside a `CancelStage` |
| `DragAxis` | **Retained** |
| `DragSubject` | Stays dropped; free drag publishes its own `FreeDragSubject` — F-66 |
| `CoordinateMapper` | **Dropped**, following `coordinateSpace` |
| `draggable` throws `TypeError('draggable: onDrop is required.')` | **Retained, and strengthened** (D-77). This row moved twice: retained by the first draft, **dropped** by the `CODE_OF_SIZE.md` reconciliation with the lost diagnostic named, and now retained again in the form that has no cost — the required first argument makes a missing `onDrop` a **compile error**, so the guarantee is enforced earlier than the shipped throw and ships no bytes. **What a consumer loses: nothing**, unless it authors in JavaScript, where the slot surfaces as a `consumer`-coded `DraggableError` on the first release with the drag canceled and the visual restored. The two intermediate verdicts are kept because the sequence is the argument: the throw was deleted on its merits, and the guarantee was then recovered somewhere cheaper |
| `FreeDragController.update` | **Dropped and replaced** — D-71. L-5 is closed |
| `FreeDragController.cancel` / `.destroy()` | **Retained**, `destroy()` now returning a promise (D-36) |

---

## Carried to Checkpoint E

Not open questions for Phase 19 — evidence items the cross-behavior checkpoint was convened to read, each with its source above.

1. **Does the kernel do work only one behavior needs?** F-65 says yes, once per activation, and Phase 21 has the number.
2. **Do the two behaviors use the same seam set?** Free drag uses every member except `command`, and produces no `SETTLED_SKIPPED`. An unused arm in a shared union is a weaker finding than an unused seam, and both are now checkable.
3. **Should the composition vocabulary be declared rather than duplicated?** F-64, with its falsifier stated.
4. **Does the frame-part model hold at two part shapes?** Five fields against **seven**, both under M-1's cliff — measured in Phase 21, not assumed.
5. **Is the failure vocabulary behavior-agnostic after D-74?** Ten of thirteen stages were already; three are after the rename. Whether _thirteen_ is the right number for two behaviors is Checkpoint E's, not this document's.