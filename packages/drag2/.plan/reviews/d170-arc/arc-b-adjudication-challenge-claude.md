# Arc B's adjudication, challenged before implementation

**Subject** the adjudication at `ea6e400e3` — D-182 and D-183 — read as a candidate rather than as settled architecture. **Tree** `ea6e400e3`, whose `src/` is byte-identical to `25be674c`, the commit the final review round read. **Evidence source** [`arc-b-final-summary.md`](arc-b-final-summary.md).

**Method.** The load-bearing constraints behind both decisions were re-derived from the source rather than from the record, and every claim this artifact makes about behaviour was **executed** — in a worktree detached at `ea6e400e3`, with `node_modules` linked and the main checkout verified clean throughout. Two probe files were written, run and deleted; no source edit outside the worktree, and the one source mutation below was reverted and verified.

**Result in one line.** D-182's central rule survives and its required properties do not cover the whole window they name; **D-183's load-bearing ground is refuted by execution** — the identity conjunct has a reachable falsifier, and deleting it silently loses an operation's entire lifecycle.

---

## 1. D-183's ground is false, and the conjunct is falsifiable

### The premise

D-183 rests on F-349's unreachability claim, which it calls _the best-established claim of the round, derived four times independently and never falsified_. That claim is one sentence, carried verbatim in three places — F-349, [`COVERAGE.md`](../../../tests/COVERAGE.md) §B-0 and D-183 itself:

> the only other writer of `current.operation` is an admission the execution bracket refuses reentrantly.

`COVERAGE.md`'s B-0 table states the same conclusion as an evidence claim: `current.operation === pinned` dropped reddens **_none, and none could be written_**.

### Why it is false

The bracket refuses a nested ingress pass on two conditions and no others (`src/kernel/execution.ts` `runIngress`): `#closed` and `#admitting`. `#admitting` is set only for the duration of an admission, so it refuses a second ingress raised from inside `admit` — which is exactly what `#openIngress`'s own docblock claims for it — and refuses nothing raised from inside a **seam phase**. There is no `#running` guard.

The kernel's own guard, `#openIngress`, admits whenever `current.operation` is `null`. **One seam runs with no live operation**: `#handleBehaviorAction`, which carries no phase and no operation guard, and which `BehaviorContext.dispatch` will enqueue at any time — it tests `closed`, `#spec` and the tag range and nothing else.

So the reachable shape is: **a behavior action dispatched while idle, whose `prepare` synchronously causes one of the behavior's own declared `command.types` to fire on `root`.** The nested pass runs `beginPass` → `Kernel.#begin()`, which re-pins and **rebuilds the draft the outer `prepare` is still writing into**, then admits, mints an identity and commits `PENDING`. Control returns to the outer `prepare`; `runCore` then revalidates against a pin captured before the nested operation existed.

That is the corruption `#openIngress`'s docblock describes in full — _publishing an operation with one press's coordinates and the other's behavior state_ — arriving through the one window the guard it names does not cover.

### Executed, at `ea6e400e3`, on an idiomatic composition

`command.types: ['focusin']` — a keyboard-accessible discrete ingress, which is what `command` exists for — and an idle behavior action whose `prepare` calls `item.focus()`.

**Control, the tree as it stands:**

```
action.prepare#0 op=null phase=0 → action.effect            (baseline: an ordinary idle action commits)
action.prepare#0 op=null phase=0 → command.admit(op=null) → back-in-outer-prepare
  → action.rollback                                        ← SEAM_INVALIDATED: the conjunct fired
  → activation.prepare → activation.effect → spec.retire    ← the nested operation runs and retires normally
--- second press ---
  → command.admit → activation.prepare → activation.effect → spec.retire
```

**With D-183 applied** — the identity conjunct deleted from `#preparationValid()`, one line, nothing else:

```
action.prepare#0 op=null phase=0 → action.effect            (baseline unchanged)
action.prepare#0 op=null phase=0 → command.admit(op=null) → back-in-outer-prepare
  → action.effect op=null phase=0                          ← SEAM_COMMITTED, over the new operation's frame
  (no activation.prepare, no activation.effect, no spec.retire)
--- second press ---
  → command.admit → activation.prepare → activation.effect → spec.retire
```

`reportError` collected **nothing** on either tree.

### What the deletion costs

The outer transaction publishes a frame whose `operation` is `null` and whose `phase` is `IDLE`, on top of the frame the nested admission had just committed as `PENDING`. The consequences follow from statement order and are all in the trace:

- **The operation is minted, its lifetimes armed, and then lost.** `activation.prepare` never runs, `spec.retire` is never called for it, and `#retireOperation(identity)` would take its staleness return — `current.operation !== identity` — so **teardown steps 3 to 6 never run for that operation at all**. Its `motion`, `presentation` and `cancellation` scopes and the input listeners armed on the realm are orphaned, and the next `#mintOperation` overwrites the `#operation` record that held them.
- **Nothing is reported.** The seam returns `SEAM_COMMITTED`; there is no warning, no error and no phase anomaly a consumer or a test could read.
- **The controller stays usable**, which is what makes it silent rather than fatal: the second press behaves normally.

That is `CONTRIBUTING.md` §Definition of success's second limb met — the library corrupts state it owns — and the first limb met on a composition that uses two documented features correctly and violates no stated rule.

### What this does and does not settle

- **F-349's unreachability claim is refuted**, and with it D-183's first limb, which was the whole of the argument. D-153's exception and `COVERAGE.md`'s register were only ever reached _after_ that limb; they are not independent grounds and do not survive it.
- **F-384's premise fails too.** The identity conjunct is not a confirmed equivalent mutant, so the question of which register should hold it does not arise.
- **`COVERAGE.md`'s _none, and none could be written_ is refuted in its second half.** The first half reproduces — no _existing_ row reddens — and that is consistent: the suite has no row for a nested ingress pass raised from inside a seam.
- **This is not an argument that the conjunct is a good guard.** It fires silently, through a `rollback` under `UNCLASSIFIED` that reports nothing, so the tree's present behaviour on this path is an invariant break discarded without a diagnostic. D-183's reading of D-153 — that a guard whose failure is a silent discard pins nothing — is correct, and it now applies to a guard that is _reachable_. **The subject is the missing ingress refusal, not the conjunct**, and that is routed rather than decided here.

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

**Covered, executed:** the pre-`arm` window for all five `BehaviorContext` members at `ea6e400e3`; the destroy-during-`createFramePart` and destroy-from-factory-body paths; the nested-ingress falsifier on two compositions (a custom command type and `focusin`), against both the tree and the D-183 mutant; `#spec`'s five assignment sites and the publication order behind D-182 (4); the control instrument's iteration and the obligations register's numbering and rule (b); `decisions.node.test.ts`'s witness matcher.

**Covered, read:** every `#begin()`, `#preparationValid()`, `#retireOperation` and `#runPhysicalTeardown` call site; `ExecutionBracket` in full; `FrameTransaction` in full; `arm()` and its unwind.

**Not covered:** the fifteen tabulated instrument mutations, the byte table and the timing medians, all of which the final round executed and none of which this artifact reopens; `retire(reset)`'s ownership half, which is argued and not mutated here either; whether the missing ingress refusal has a cheap shape — routed, not designed.