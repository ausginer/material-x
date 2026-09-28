# Arc B's adjudication, challenged before implementation

**Subject** the adjudication at `ea6e400e3` — D-182 and D-183 — read as a candidate rather than as settled architecture. **Tree** `ea6e400e3`, whose `src/` is byte-identical to `25be674c`, the commit the final review round read. **Evidence source** [`arc-b-final-summary.md`](arc-b-final-summary.md).

**Method.** The load-bearing constraints behind both decisions were re-derived from the source rather than from the record, and every claim this artifact makes about behaviour was **executed** — in a worktree detached at `ea6e400e3`, with `node_modules` linked and the main checkout verified clean throughout. Two probe files were written, run and deleted; no source edit outside the worktree, and the one source mutation below was reverted and verified.

**Result in one line.** D-182's central rule survives and its required properties do not cover the whole window they name; **D-183's conclusion survives and its stated ground does not** — the identity conjunct's only falsifier is reachable solely from a `prepare` that performs a DOM write, which the tri-phase contract forbids, so the guard is hardening against documented misuse and the deletion lands on a repaired ground.

**Amended 2026-09-07, second pass.** The first pass of this artifact filed the falsifier as refuting D-183 and routed a question (Q-27) on it. **That was wrong, and the owner's test is what it failed**: mechanical reachability is not the standard — reachability through reasonable, contract-compliant use is. The witness performed `item.focus()` from an `action.prepare`, and `prepare`'s contract says _must not perform DOM writes_ in three places. §1 below is rewritten to the corrected classification; the executed evidence is unchanged and is what settles it, now including the contract-legal positions the first pass did not run.

---

## 1. The conjunct is hardening only, and D-183's ground needs repair rather than reversal

### The classification, stated first

**HARDENING ONLY.** Reaching `preparationValid()`'s identity conjunct requires a behavior to perform a DOM write from inside a `prepare`. That is excluded by the tri-phase contract in three places — the prose rule in [`02`](../../contract/02-kernel-behavior-contract.md) §The tri-phase transition, the compiled type fixture in the same section, and the shipped docblock on `Transition.prepare` in [`seams.ts`](../../../src/kernel/seams.ts):

> **Prepare** — validation, pure calculation, DOM reads, _local_ acquisition; must not mutate `current`.

> Returns the staged value, or `null` to discard. Must not touch `current`, **must not perform DOM writes**, and must keep every acquisition local.

Neither shipped behavior can reach it at all, and no custom behavior can reach it without breaking that rule.

### Where the conjunct is load-bearing, and it is one window

It is consulted at three points, and only one of them can be reached with the pin stale:

- **W1** — `runCore:306`, between `#begin()` and `commit()`. The only foreign code in between is `transition.prepare`. **This is the window the conjunct exists for.**
- **W2** — `runCore:334`, after `effect`, gating `#staged` only.
- **W3** — `#activationPolicy.committed()`, after `runCore` has returned.

The four direct `#begin()` sites — `#handleMove`, `#closeOperation`, `#joinSettlement`, `#handleStartCommitted` — run `#begin()`, write the draft and `commit()` with no foreign code between, so no window opens there.

### Executed: the two trees are indistinguishable from every contract-legal position

The same composition — `command.types: ['focusin']`, an idle behavior action, `item.focus()` as the reentrant DOM write — with the write moved between positions, run against the tree and against the tree with the conjunct deleted:

| Position of the DOM write | Contract status | Control | Conjunct deleted |
| --- | --- | --- | --- |
| `action.effect` | **legal** — post-commit effects are the DOM-write phase | nested pass admitted; nested operation activates and retires normally | **identical** |
| `activation.effect` (inside `onStart`) | **legal**, and an operation is live | nested pass **refused** by `#openIngress`'s `current.operation` guard | **identical** |
| `action.prepare` | **out of contract** — `prepare` must not perform DOM writes | outer seam rolls back; nested operation completes | outer seam commits over the nested operation's frame; that operation is minted, armed, never activated, never retired |

**The conjunct's only observable effect is on the row that violates the contract.** In W2 it gates `#staged`, which `#handleBehaviorAction` drops in its `finally` regardless; the outer transaction has already committed, so the nested pass rebuilds the draft from a published frame, which is what the next transaction would have done anyway. W3 is closed by the operation guard, confirmed by execution rather than by reading.

### Why no environmental route exists

A nested ingress pass needs a **synchronous** dispatch on `root` of a declared `command.types` type. A real user gesture cannot interleave with synchronous JavaScript, and every synchronous-dispatch mechanism the platform offers is a DOM write — `focus()`, `blur()`, `click()`, `dispatchEvent()`, removing the focused node, `dialog.showModal()`, `form.requestSubmit()`. What `prepare` _is_ permitted to do dispatches nothing: layout reads and `getBoundingClientRect()` force reflow and fire no events, and `ResizeObserver`, `IntersectionObserver`, `MutationObserver` and `scroll` all deliver asynchronously.

### The shipped behaviors close it twice over

- **Free drag** declares **no `command` member** — _free drag has no discrete ingress_ — so it binds no listener a DOM write could reach, and its `prepareAction` returns `null` for every tag outside `ACTIVATING` and `ACTIVE` **before** touching anything, so its two consumer-facing idle dispatches (`invalidate()`, `moveTo()`) never reach `preparationValid()` at all.
- **The sortable** does run an action at `IDLE` — `controller.invalidate()` → `action.prepare(TAG_COLLECTION)` — and it does call consumer code there, `slots.items()`, deliberately: _`items()` is consumer code, and this is the one place that has a transaction open, a phase to branch on, and a stage to classify a throw against._ **But its only command type is `keydown`**, and no DOM write produces a synchronous `keydown`. The path is open and the event that would travel it does not exist.

So the witness requires a **custom** behavior that declares a focus- or click-family command type, dispatches an action at idle, and writes to the DOM from `prepare`. The third is the disqualifier on its own.

### What is wrong, and it is the sentence rather than the conclusion

**F-349's conclusion stands: the conjunct has no falsifier reachable through correct use of the contract.** Its stated reasoning does not, and the same sentence is carried by [`COVERAGE.md`](../../../tests/COVERAGE.md)'s B-0 table and by D-183:

> the only other writer of `current.operation` is an admission the execution bracket refuses reentrantly.

The bracket refuses on `#closed` and `#admitting`, which spans an **admission** — that is the refusal [`kernel.ts`](../../../src/kernel/kernel.ts) §`#openIngress` claims for it, and the docblock is accurate about its own scope. It is not what excludes a pass raised from inside a **seam phase**. Two other things do, and they should be what the record says: `#openIngress`'s `current.operation` guard closes every seam that runs with a live operation, which is all of them but the idle behavior action; and `prepare`'s no-DOM-writes rule closes that one. **The repaired ground is stronger than the original**, because it names a contract boundary rather than a mechanism that does not cover the case.

### On the guard's quality, which is now moot

D-183's reading of D-153 was right — a guard whose failure is a silent `rollback` under `UNCLASSIFIED` pins nothing — and it applies here to a guard that catches only out-of-contract behavior. **That is exactly the machinery `CONTRIBUTING.md` §Definition of success refuses**: the state is not reachable through correct use, so the first limb fails and the second is never reached. **Q-27 is withdrawn.** The nested ingress it named is benign from every legal position, executed, and out of contract from the only position where it is not.

---

## 2. D-182's rule holds; its required properties do not cover the window they name

Every `BehaviorContext` member was called from the factory body at `ea6e400e3` and the result recorded:

| Called from the factory body | Result |
| --- | --- |
| nothing (baseline) | no throw; `createFramePart` × 2 |
| `fail(stage, error)` | **`TypeError: Cannot read properties of undefined (reading 'requestFailure')`** out of `draggable()`; no frame composed |
| `cancel(reason)` | **`TypeError: Cannot read properties of undefined (reading 'current')`** out of `draggable()`; no frame composed |
| `destroy()` | no throw; `createFramePart` × 2; **`spec.retire` never called** |
| `dispatch(0, null)` | no throw, no report; `createFramePart` × 2 |

**F-373 reproduces exactly**, and D-182's premise for it — demote, do not throw — is confirmed by `requestFailure`'s `NO_STAGE` branch, which reaches `#notify` and therefore `this.#spec?.reportError`, i.e. nothing while no spec is published. D-182's chosen test is sound: `arm()` assigns `#driver` at `:2477` and publishes `#spec` at `:2505`, and the only other write to `#spec` is `null` in the catch, so `#spec !== null ⟹ #driver assigned` holds by statement order and is never re-falsified — teardown does not null the field.

Three defects in the decision as written:

- **(a) `cancel()` throws from the same position, and D-182 writes a property into [`01`](../../contract/01-construction-ownership.md) §`BehaviorContext` that the post-D-182 tree still violates**: _No member of this interface throws a platform error from a position this document says is supported._ `#cancelWith`'s first test is `this.#bracket.closed`, which is `false`, and its second dereferences `#frames`. The finding that named the window scoped itself to what the range _regressed_; the decision generalised to the interface and then required the property of one member. The cost of extending it is the same invariant D-182 already establishes for `fail`, so the guard is equally free.

- **(b) Property (1) is scoped to _after the behavior factory has returned_, and the trace shows the identical F-374 defect on the other side of that boundary.** A `destroy()` from the factory body leaves `arm()` composing both frame parts, constructing the entity and publishing `#spec` on a closed controller, with the behavior never retired — the exact outcome D-182's own refused-exemption paragraph names as unacceptable. Property (3) stops the composition once the latch is closed but mandates no `spec.retire()`, and property (1) does not reach a `destroy()` raised before the factory returned. `draggable()` calls `kernel.arm(spec)` unconditionally: by the time `arm()` is entered the spec exists, and `arm()` is the only holder of it.

- **(c) D-182's witness is not falsified by D-182's implementation.** `tests/decisions.node.test.ts` matches a `present:` witness with a plain `source.includes(...)` over the whole file, so indentation is irrelevant. The declared witness is `this.#driver.requestFailure(stage, error);` — and property (5) _preserves_ that call for every position after publication, so no guard shape removes the substring. The row would stay true after the decision landed, which is the one failure the deferred table exists to prevent. The sequence's stated reason for choosing that witness — that it is the last of the two to land — is sound in form and rests on a text that cannot serve.

Two claims in D-182 were checked and hold. The ordering deviation is unobservable for the reason given: no ingress listener is bound until after both frames exist. And _no library transaction is open, since `arm()` runs outside the drain_ is true even when `draggable()` is called from inside another controller's drain, because `ExecutionBracket` is per-kernel and the new one is at depth 0.

---

## 3. F-385 and O-13, checked and unaffected

Independent of the pin, and no defect found. `bench/size/measure.ts` declares seven controls; five carry `kernel/kernel.js` — the four free-drag rows and `kernel root` — and `vocabulary root` and `baseline B` do not. `tests/bench/size.node.test.ts` iterates `COMPOSITIONS.filter(({ control }) => control !== undefined)` and asserts no count, so **O-13's _this row is the whole of the protection_ verifies exactly**: removing five declarations removes five rows silently. `O-13` is the correct next id, and its _Waiting for_ names a destination that can close, which is register rule (b). The one thing it needs is a deciding row that survives.

---

## Scope

**Covered, executed:** the pre-`arm` window for all five `BehaviorContext` members at `ea6e400e3`; the destroy-during-`createFramePart` and destroy-from-factory-body paths; the nested-ingress path from all three candidate positions — `action.prepare`, `action.effect` and `activation.effect` — on two compositions, against both the tree and the conjunct-deleted mutant; `#spec`'s five assignment sites and the publication order behind D-182 (4); the control instrument's iteration and the obligations register's numbering and rule (b); `decisions.node.test.ts`'s witness matcher.

**Covered, read:** every `#begin()`, `#preparationValid()`, `#retireOperation` and `#runPhysicalTeardown` call site; `ExecutionBracket` in full; `FrameTransaction` in full; `arm()` and its unwind.

**Covered, read:** the tri-phase contract in `02` and in `seams.ts`; both shipped behaviors' `prepareAction` phase legality, their consumer-reachable idle dispatch sites and their declared `command.types`; `ItemSource`'s contract.

**Not covered:** the fifteen tabulated instrument mutations, the byte table and the timing medians, all of which the final round executed and none of which this artifact reopens; `retire(reset)`'s ownership half, which is argued and not mutated here either; whether a third-party `constrain.invalidate()` or a consumer `items()` carries an explicit no-DOM-writes obligation of its own — neither can reach an ingress event in the shipped compositions, so it did not need answering here.