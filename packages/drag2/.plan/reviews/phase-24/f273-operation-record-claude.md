# F-273 settled: the operation record, its membership and its two lifetimes

**Run 2026-09-02** on `74754d26`, branch `drag2/fin-review`, working tree carrying only the pre-existing `src/free-drag/spec.ts` modification, which this pass did not touch. **No production source was written.** One decision lands (D-168, `Unimplemented (Remediation)`); the fixtures below were generated outside the repository and are not checked in.

**The membership was challenged rather than inherited, and a third of it did not survive.** F-273 named twelve fields on the strength of the two functions that clear them. Four of the twelve belong to shorter lifetimes, and one of those lifetimes has a **caller inside the operation**. F-273's own summary — _"replace nine assignments and a second clear function with `operation = null`"_ — is wrong about the second clear function, and D-168 corrects it rather than inheriting it.

---

## 1. The twelve, challenged

| field | written at | scope | verdict |
| --- | --- | --- | --- |
| `visual`, `box`, `item` | `mintOperation` 964–966 | admission → retirement | **operation** |
| `lifetimes` | `mintOperation` 968 | admission → retirement | **operation** |
| `originRect`, `lift`, `visualSpace` | `acquireActivation` 1241–1243 | activation → retirement | **activation** |
| `cancelRequest` | `cancelWith` 729, cleared `handleCancel` 1966 | within one operation | **operation**, and it is the field that most needs the record |
| `pinned` | `begin` 394 | **one transaction** | **excluded** |
| `resolution` | 1663, 1723 | **one attempt** | **excluded** |
| `settlement` | 1669, **2119** | **one attempt** | **excluded** |
| `settlementInput` | 1664/1680, 2094/2142 | **one seam run** | **excluded** |

### The four exclusions, and why each is not bookkeeping

**`pinned` is transaction-scoped and its job is to be compared against the operation.** `begin()` writes it on **every** transaction — _"Reset before every transaction, armed or not"_ — and nothing clears it at `commit`; the next `begin` overwrites it. `preparationValid()` is `current.operation === pinned`, and its docblock says why it is a separate field: _"so a reentrant retirement between `begin` and `commit` is visible as an identity change."_ Storing the operation's own identity inside the operation record would make that comparison compare a value with itself. Its appearance in `clearOperationState` is reference hygiene at a convenient moment, not a lifecycle boundary.

**`resolution` and `settlement` are attempt-scoped, and `retireAttempts` has a mid-operation caller.** `handleFailed` calls it at line 2092 with the operation fully alive, and the comment states the semantics: _"The settlement is **replaced**: whatever the previous attempt measured is over, and nothing of it may reach the join."_ Two lines later it installs a fresh `settlement = { targetX: null, targetY: 0 }`. An operation may therefore hold two settlements in sequence, and the second is not the operation's terminal event — the failure is. **`retireAttempts` is a real boundary with its own name, and folding it into the operation transition would erase a distinction the failure path depends on.**

The attempts also carry their **own** validation channel, finer than the operation's: `settlementLive(attempt)` opens with `settlement === attempt`, and `settleResolution` with `resolution !== attempt`. Both compare attempt identity, not operation identity, precisely because the slot turns over inside one operation.

**`settlementInput` is seam-scoped.** Four write sites, paired set/clear around a single seam run, documented as _"The input the open settlement seam is driving. Seams are non-reentrant."_ It is shorter-lived than the attempt it belongs to.

**So the answer to _which fields belong to a shorter-lived phase_ is four of twelve**, and the correct shape is not one clear replacing two. It is one clear replacing one, with `retireAttempts` untouched.

---

## 2. Eight fields, two lifetimes — not one

The surviving eight are written at **two** points that cannot be merged, because activation happens in a later transaction than admission and may fail with the operation still alive (`failOperation(FAILURE_ACTIVATION, error)` at the tail of `acquireActivation`).

That leaves a choice, and it is the decision's substance:

| shape | reads | assertions at a use site | records mutated after construction |
| --- | --- | --- | --- |
| one flat record, three fields nullable until activation | `operation!.lift!` | **2** | **yes** — three fields written in a second function 250 lines away |
| **one record per lifetime** | `activation!.lift` | **1** | **no** |
| nested `operation.activation` | `operation!.activation!.lift` | 2 | no |

**The pair wins on the property that was asked for.** _"Initialization and retirement should become easier to audit, not merely move twelve assignments into another helper"_ — under the pair, **every field of every record is assigned in its constructor literal and never again**, with one documented exception (`cancelRequest`, which is a latch and is exactly the field that must not survive an operation). The flat record fails this: it is constructed partial at admission and completed at activation, which is the same split-write the finding objects to, relocated.

The pair also **names a state the flat set cannot**: an operation that exists and has not activated. Today that state is spelled _`visual` is set and `lift` is not_, and it is only knowable by reading both.

**Nullable at the kernel, not discriminated.** A discriminated `operation` state would carry the lifecycle position a second time. `phase` on the frame is already that discriminant, it is published to behaviors, and the kernel's invariants are stated on it. **Two authorities for one lifecycle position is a worse defect than the one being fixed**, so the records carry data and the frame keeps the phase.

**`lifetimes` is non-nullable inside `Operation`**, which requires constructing the lifetimes before the record rather than after. That is what lets `if (operation)` replace today's `if (lifetimes)` at lines 519 and 592 soundly rather than approximately.

---

## 3. Creation, retirement, and the ordering constraint that is load-bearing

**Creation.** `Operation` in `mintOperation`, before `commit()` — so the record exists before the identity reaches the frames, exactly as the fields do today. `Activation` in `acquireActivation`, replacing the three consecutive assignments at 1241–1243.

**Retirement.** Exactly where `clearOperationState()` is called: `retireOperation` line 527 and `runPhysicalTeardown` line 600. **Both must stay after `scrub(current)`**, and this is not stylistic. `scrub` runs `frame(target)`, which resets `operation: null` on the frame. The order today gives the invariant

> `current.operation !== null` ⟹ the operation's state is still readable

and every guard in the kernel is written against the frame's identity rather than against the state. Moving the transition earlier would create the one window in which a guard passes and the state it authorises is gone. **The transition is the last statement of retirement, as the clear is now.**

**The clear is already atomic**, and the record does not make it more so: `clearOperationState` is nine assignments with no call between them and cannot be interrupted. What the record buys is **completeness rather than atomicity** — a per-operation field added later is cleared by construction instead of by remembering to extend a helper 250 lines from the declarations. That is a claim about future passes, and it should be stated as one.

**One genuine atomicity gain, on the other side of the ledger.** Today `clearOperationState()` nulls the fields, so a snapshot local taken before reentrant code and the field it came from _diverge_ after a reentrant retirement — which is why `joinSettlement` opens `const owned = lifetimes!; const session = lift!;` before `begin()`, and why `runMoved` is documented as reading the _"swappable"_ slots at call time. Under the records, retirement drops the whole record and leaves the object it dropped internally coherent, so a held reference sees a complete retired operation rather than a half-nulled live one.

---

## 4. How reentrancy, queued work and classified failures observe the operation — unchanged

**Nothing queued ever holds the record, and nothing needs to.** Identity is already a separate object: `OperationIdentity = Readonly<{ id: number }>` lives on the kernel's seven-field frame slice, and it is what travels.

- A queued cancel carries it: `dispatchKernel(CANCEL, current.operation)`, and `handleCancel(operation)` opens `if (current.operation !== operation) return`.
- A queued classified failure carries it: `FailureCheckpoint` is `Readonly<{ stage, error, operation }>`.
- A narrowed retirement carries it: `retireOperation(operation)` compares `current.operation !== operation`.
- An attempt carries **its own** identity: `settlementLive`, `settleResolution`.
- An open transaction carries `pinned`.

**So stale queued work rejects an earlier operation by comparing a one-field frozen object it already carries.** The record is never a parameter, never a queue argument, never captured by a deferred callback. This is the whole answer to the tier question and it requires no new mechanism: the separation already exists, and D-168's contribution is to keep it.

---

## 5. Tier ownership

Both records are `createKernel`-local and appear in no signature. The behavior-facing view of the same values is `ActivationScope`, which is built **field by field, by value**, at 1259–1274 — and continues to be. Two of its fields are annotated _"Read back from the field the join reads it from, so the scope and the landing measurement can never disagree"_; under the record those become `activation.originRect` and `activation.visualSpace`, which states the intent more directly than the read-back convention did.

**The kernel must not invert this and read its geometry out of `ActivationScope`.** It is the object the behavior holds; the read-back is the kernel refusing to depend on it. Making the scope the kernel's own storage would save an allocation and hand a behavior the join's basis.

---

## 6. Allocation, measured at gesture scale

Fixtures in Node 26, `--expose-gc`, minimum of seven runs at 200 000 gestures, against a stand-in that allocates what one gesture really allocates — the identity, three lifetimes with their arrays and `AbortController`s, the lifetimes wrapper, the capture `Map` and its closure, the lift session and its `rendered` point, `boxPre`, the rect, `ActivationScope`, both attempts and the settlement input.

**Retained size.** `Operation` (5 fields) **64 B**; `Activation` (3 fields) **48 B**; a single flat 8-field record 88 B. **At most one pair is live at a time** — a drag is exclusive per controller — so this is a constant per dragging controller, not a per-gesture accumulation.

**Construction cost, in context:**

| arm                        | ns per gesture | Δ                |
| -------------------------- | -------------- | ---------------- |
| A — today                  | 179–199        | —                |
| B — one flat record        | 193–203        | **+2 to +22 ns** |
| D — operation + activation | 201–210        | **+7 to +27 ns** |
| C — reuse and reset        | 229–232        | +32 to +50 ns    |

**Isolated, the reuse alternative loses on its own claim:**

|  | ns per gesture |
| --- | --- |
| fresh pair | **0.3** |
| reuse, hand-written reset | 4.3–5.1 |
| reuse via `Object.assign` over frozen defaults — the `frame()` idiom | 61–63 |

**Allocating is cheaper than resetting, by 14× against a hand-written reset and 200× against the idiom this package already uses for frames.** The 0.3 ns is V8 eliminating an allocation that does not escape; in the kernel the records escape into the closure, which is what the in-context arms measure.

**So reuse is rejected twice over.** It is slower, and it is unsafe for the reason the user's own criterion names: `joinSettlement`'s `const owned = lifetimes!` and `const session = lift!` are value snapshots taken before reentrant code runs, and `runMoved` is a **hoisted controller-stable closure** — _"Inlining it as an arrow at the call site allocates a fresh closure on every active pointer sample — the one path whose allocations count"_. Against a reused record, a reference held across a retirement would silently address the **next** operation's fields. A fresh pair makes that unrepresentable.

**The one hot path.** `runMoved` reads `lift` per committed pointer sample and becomes one property load. Measured at ≤2.5 ns per sample, and that is an upper bound — the closure arm is constant-folded in isolation. At M-6's ~129 samples/s primary pace this is **under half a microsecond per second of dragging**, on a path whose stated invariant is that it allocates nothing. It still allocates nothing.

---

## 7. Bundle size — not established, and it is the gate

Two sketches with the real occurrence census — 64 identifier occurrences across the eight fields, comments stripped — put the qualified form at **+212 B and +516 B Brotli** depending on how much surrounding structure the minifier can still collapse. **Neither is a usable estimate**: the sketches differ from each other by more than the quantity they measure, because a bare identifier mangles to one character and a property key does not mangle at all, and how much Brotli recovers depends entirely on the code around it.

**`kernel.js` carries 246 B of slack** (SC-1, as re-measured 2026-08-29). That is the same order as both sketches. **So this figure can only be produced by the implementation**, and D-168 makes it a gate rather than a note: if the twelve rows breach, what gives is the decision's shape — shorter keys, or fewer qualified sites — and not the budget, which is D-106's standing rule.

---

## 8. Maintainability — the properties, checked

- **Visibly qualified at use sites.** 64 occurrences become `operation.x` or `activation.x`. The 16-site alias problem D-167 attributed to the factory is 8 sites in `kernel.ts`, and five of those are these fields.
- **No silent shadowing — and the code already pays to avoid it.** `acquireActivation` renames four times _because the flat namespace has the names taken_: `const target = visual!` (1196), `const owned = lifetimes!` (1197), `const source = box!` (1211), and it destructures `acquireLift`'s result as `visualSpace: above` (1230) and `session` (1229) for the same reason. **Every one of those renames is a place where a reader must prove the local and the field agree.** Under the records those names are free, and the assignment reads `activation = { originRect: rect, lift: session, visualSpace }`.
- **A smaller ambient namespace.** 29 `let` bindings become 23 — eight removed, two added — and the six most distant reads in the kernel (`lifetimes`, span 2 001; `lift`, 1 774; `visual`, 1 415; `visualSpace`, 1 307; `originRect`, 1 249; `box`, 1 047) stop being bare identifiers.
- **Auditable initialization and retirement.** Two literals, two nulls, nothing assigned between. The nine-assignment helper goes; the three-assignment one stays and keeps its own name.

---

## 9. What is decided

**D-168**, `Unimplemented (Remediation)`. Two kernel-local records — `Operation` (`visual`, `box`, `item`, `lifetimes` readonly, `cancelRequest` mutable) and `Activation` (`originRect`, `lift`, `visualSpace`, all readonly) — replacing eight of the twelve bindings and `clearOperationState`. `pinned`, `resolution`, `settlement`, `settlementInput` and `retireAttempts` are untouched.

**Required properties**, none satisfiable by moving assignments:

1. The transition is the **last** statement of retirement, after `scrub(current)`, so `current.operation !== null` continues to imply the state is readable.
2. `lifetimes` is non-nullable in `Operation`, which fixes the construction order and lets `if (operation)` replace `if (lifetimes)`.
3. No record field is assigned after its constructor literal except `cancelRequest`.
4. Neither record appears in any signature, queue argument or captured callback; `ActivationScope` continues to be built field by field, and the kernel does not read its geometry back out of it.
5. `retireAttempts` is not folded in, and the attempts keep their own identity checks.
6. The twelve size rows are run. A breach changes the decision's shape, not the budget.

**F-273 is closed by D-168, with its membership corrected from twelve to eight and its "two clears become one" claim withdrawn.**

## 10. Method

Every field's write and read sites were enumerated mechanically over `src/kernel/kernel.ts` at `74754d26` and each surviving site read. The occurrence census strips comments. The allocation, reuse and hot-path figures are Node fixtures generated outside the repository, reported as ranges over four to seven runs; the size sketches are bundled with this repository's own `rolldown` and are reported as **not** establishing the figure they attempted. `documentSymbol` was not needed for this pass: the question was lifecycle, and the write-site census answers it where an outline cannot.