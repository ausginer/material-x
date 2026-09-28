# The factories re-audited: which of them carry an entity they fail to name

**Read at `942ed0b6`**, branch `drag2/fin-review`, after D-168 closed. No production code or test was changed. The `scope.motion` collision that prompted the audit is real and is at [`src/free-drag/spec.ts`](../../src/free-drag/spec.ts) lines 157 and 374 — but it is neither the sharpest instance of the problem nor the one a class would fix.

---

## 1. The census: twenty-one factories, and the split is not close

Every `create*`/`acquire*` factory in `src/**`, by body length and by the number of mutable bindings it owns:

| factory | lines | `let` | `const` | verdict |
| --- | --: | --: | --: | --- |
| `createKernel` | 2 229 | 23 | 63 | entity, **named in part** by D-168 |
| `createSortableSpec` | 1 662 | 11 | 13 | **entity, unnamed** |
| `createFreeDragSpec` | 918 | 6 | 14 | **entity, unnamed** |
| `createSeamDriver` | 308 | 5 | 2 | honest — one lifetime, one reset |
| `createLinearShift` | 275 | 6 | 3 | honest lifetime, **partial resets** |
| `createRectIndex` | 210 | 4 | 1 | **the one class candidate** |
| the other fifteen | ≤ 71 | 0–1 | 0–4 | small construction helpers, uncontested |

**Nine of the twenty-one hold no mutable state at all** and are ≤ 30 lines — `createSortableController`, `createFreeDragController`, `createUnwind`, `createActionQueue`, `draggable`, `createRealm`, `createInvalidator`, `createSortableBehavior`, `createOperationLifetimes`. Nothing in this audit reaches them, and a package-wide verdict in either direction would have to.

---

## 2. The motivating problem, measured rather than illustrated

**Two different defects are being conflated under "the ambient namespace", and they have different remedies.**

### 2.1 Collision — a bare name and a property name that mean different things

`free-drag/spec.ts` declares `const motion: MotionDraft` at 157, a per-sample scratch buffer, and reads `scope.motion.signal` at 374, the operation's motion **lifetime**. Both appear inside `activation.effect`: `scope.motion` at 374, bare `motion` at 414, 429 and 430. Line 414 — `scope.lift.write(motion.x, motion.y)` — carries both in one statement.

Across `src/**` there are **19 such colliding names** in 7 files. This is a _naming_ defect: nothing shadows anything, and no edit is wrong today.

### 2.2 Shadowing — an inner binding hiding factory-owned state

Measured with a scope-walking probe over the oxc AST of all 39 files (method bodies included), discarding sibling-scope artefacts:

| file | inner | shadows | what is hidden |
| --- | --- | --- | --- |
| `sortable/spec.ts` | `snapshot` :315 | :230 | the published collection |
| `sortable/spec.ts` | `snapshot` :393 | :230 | the published collection |
| `sortable/spec.ts` | `snapshot` :1262 | :230 | the published collection |
| `sortable/spec.ts` | `lift` :932 | :253 | the behavior's lift session |
| `sortable/spec.ts` | `items` :1044 | :120 | the factory's `items` parameter |
| `free-drag/spec.ts` | `lift` :449 | :78 | the behavior's lift session |

**Six, in the whole package, and every one is in the two behavior specs.** That is the honest size of the problem, and it is small.

**The two `lift` cases are the ones worth reading.** Both are `moved(current, lift) {`, and in both the parameter is the kernel-supplied session while the shadowed `let` is the behavior's own reference to _the same object_. So the shadow is invisible: it changes nothing today and is caught by nothing. What it leaves behind is a reader's question — `free-drag/spec.ts:458` writes `lift.write(…)` unqualified while 579 and 662 write `lift?.write(…)`, and deciding whether that inconsistency is a bug requires knowing which `lift` each line is in. It is not a bug. Establishing that took reading three scopes.

---

## 3. The comment banner is the only lifetime marker, and it is wrong in both specs

This is the finding that decides the audit.

**`sortable/spec.ts` 225-226**, over the whole per-operation block:

> Everything per-operation below is cleared in `retire()`, and that is the only place it is cleared.

`retire()` (1762-1776) clears **five** of the eleven bindings under it — `progress`, `pendingSpatial`, `activePlaceholder`, `lift`, `presentation`. Of the six it does not clear, `snapshot` (230) and `sourceIdentity` (242) are controller-scoped by design and _must_ survive; `placeholderUndo` (218) and `pendingFailure` (509) are seam-scoped and are cleared at their own two sites each; and **`spatialSeq` (255) is never reset anywhere** — its entire use set is the declaration, `spatialSeq += 1` at 943, and one read at 946.

**`free-drag/spec.ts` 73-77** makes the same claim for six bindings:

> These three, plus `view`, `progress` and `pendingFailure` beside them, are all cleared in `retire()`.

`retire()` (969-982) clears **five**. `pendingFailure` is not among them; it is transaction-scoped and cleared at 673 and 795.

**So in both specs the sentence that assigns lifetimes is false**, and it is false in the direction that matters: it claims a uniformity the code does not have, which is precisely the reading a maintainer would rely on when adding a twelfth binding. This is the pre-D-168 kernel exactly — _"distinguished from stable dependencies by a comment banner"_, D-167's own words — surviving unchanged in the two files D-167 extended its rule to.

---

## 4. Would a class represent these entities more honestly?

**For the two specs: no, and the reason is structural rather than a matter of taste.**

The defect established in §3 is **lifetime opacity** — state whose lifetime is invisible at the use site. A class has exactly one namespace for instance state, and putting all twenty of `createFreeDragSpec`'s bindings behind `this.` qualifies the _owner_ while erasing the _lifetime_: `this.motion` (per-sample scratch, never reset) and `this.lift` (per-operation, nulled at retire) read identically, which is the defect verbatim. The banner comment would still be the only thing distinguishing them, and it would still be wrong.

**D-168 already ran this experiment on the harder case.** The kernel's twelve correlated nullables did not become `this.visual`; they became `operation.visual` and `activation.lift`, and the gain was that _the type says which lifetime a value belongs to_. A class was available and would not have produced that.

**A class does fix §2.2's shadowing** — `this.lift` cannot be hidden by a parameter named `lift`. But a record fixes it too, at the same six sites, and fixes §3 as well. The record dominates; there is no residue the class alone reaches.

**And the cost D-167 priced is unchanged and was re-verified here.** The package's disposal and reporting protocols pass members detached: `unwind(spec.retire)` at `kernel.ts` 555, 652 and 2480; `fail: driver.requestFailure` at 2396; `invalidate: shift.invalidate` and `retire: shift.retire` at `sortable/y.ts` 264 and 288, detached a _second_ hop into `retireHooks.push(axis.insertion.retire)` and `invalidateInsertion: axis.insertion.invalidate` at `sortable/assemble.ts` 78 and 122; and `reportError: deliver` in both specs. Classing any of those requires an arrow field per detached member, which is the per-instance-closure form the predecessor package measured as the _worse_ one ([`packages/drag/.plan/experiments/02-classes.md`](../../../drag/.plan/experiments/02-classes.md), arm 2a).

---

## 5. The one place a class would remove machinery instead of adding it

**`createRectIndex`.** D-167 called it _"the one honest class in the package"_ and declined it as _"not worth converting alone"_. One thing has changed: the objection D-167 raised against every other candidate does not apply here, and that is now established rather than assumed.

- **It owns a resource with a real invariant** — two `Float64Array` buffers, with `dirty`/`measured`/`count`/`items.length` required to stay coherent, and a documented growth policy that deliberately keeps no predictive state.
- **It has a lifecycle**: `refresh` → `invalidate` → `retire`, with `retire()` emptying the element array and keeping the numeric buffer.
- **It already simulates a receiver.** Line 350 declares `let index: RectIndex;` _before_ the object literal, with the comment _"Declared before the record so the shared terminal exit below can name it"_, purely so `abort()` can call `index.retire()`. Seven sites inside the literal then read or write through `index`. That is `this`, hand-rolled.
- **None of its members is ever passed detached.** All fourteen call sites in `linear-shift.ts`, `y.ts` and `xy.ts` invoke through the receiver — `index.invalidate()`, `index.retire()`, `index.refresh(…)`. Its _data_ members are destructured, which a class supports unchanged. Two call sites in `src/`, one per axis feature, one instance per controller.

**But it is not what the audit was called to fix.** `RectIndex` has no lifetime confusion: its four bindings all live exactly as long as the object, and no comment has to say so. The one factory that would be more honest as a class is the one factory with no ambient-namespace problem, and the two factories with the problem are the two a class would serve worst. That inversion is the audit's result, and it is why neither a package-wide conversion nor a blanket retention is the answer.

---

## 6. `createSeamDriver` and `createLinearShift`

**`createSeamDriver` is honest and needs nothing.** Its five `let`s share one lifetime — the open phase — and `runPhase` resets them on every open (381, 382, 394, 401), with `staged` additionally cleared as every seam opens (455) and by `consumeStaged` (520-525). One lifetime, systematically reset by one function, no banner required. One instance per controller (`kernel.ts:891`).

**`createLinearShift` has a different defect and it is not naming.** Its six bindings all live as long as the object, so there is no lifetime to name — but there are **four reset paths with four different field sets**: `forget()` (5 fields), `drop()` (3), `invalidate()` (3 + delegate), `retire()` (delegates to both). `invalidate()` resets neither `last` nor `seen`, `drop()` resets neither `seen` nor `constant`, and **`claimed` is reset by none of the four** — set at 399 and cleared at 303, both inside `DEV` branches, so it survives every reset. That is a cache-coherence question, not a representation one, and no class or record answers it.

---

## 7. What would have caught all of this, and is switched off

`@typescript-eslint/no-shadow` and `@typescript-eslint/unbound-method` are both set to `'off'` at [`eslint.config.ts`](../../../../eslint.config.ts) lines 32 and 33, in a block of three overrides carrying **no comment and no recorded reason**.

They are the two instruments for the two defect classes this package keeps rediscovering: `no-shadow` is §2.2 exactly — six findings, all real, all in two files — and `unbound-method` is the detached-member hazard that §4 depends on and that F-274 already records as having reached a published SPI surface unnoticed. `oxlint` does not implement either rule, so nothing in the pipeline covers them.

**A rule that is enforced is worth more than a representation that merely makes the defect less likely**, and this one is already written and already paid for. Whether it can be enabled repo-wide is a repository question rather than a drag2 one, which is why it is recorded rather than decided here.

---

## 8. What is decided

**D-167 is amended, not reversed.** Closure factories are retained across `src/**`. The amendment has three parts:

1. **The rule gains a test.** A factory carries an entity it fails to name when it holds **two or more mutable bindings whose lifetime is shorter than the factory's own**. The remedy is a record naming that lifetime, inside the factory, as D-168 built. **A comment banner does not discharge it** — §3 is the evidence, and both banners are wrong.
2. **The test is failed by the two behavior specs**, which is F-278. `createKernel` passes it only in part: D-168 named the operation and the activation, and the destroy group (`transactionDepth`, `teardownPending`, `destroyed`, `settleDestroyed`), the stamp pair and the action pair remain.
3. **D-167's `RectIndex` line is corrected.** Its stated objection — that a class's members here are the detached ones — is false of this one candidate, and §5 establishes it. The conversion becomes available rather than required; it buys the deletion of a hand-rolled receiver and nothing else, and it does not touch the problem this audit was called for.

**SC-7 was checked and is not met.** Its trigger is a per-operation object grown enough state to make the predecessor's per-gesture class finding transfer. All six stateful factories are per-controller; the per-operation objects are `Lifetime` (3 fields, 3 members) and the lift session, which are resource handles rather than the 540-line, 7-field, 14-method gesture class that finding measured. What did move toward the trigger is the closure count: the per-operation path now allocates roughly ten to fourteen closures, which is the same order as the arm that experiment rejected. That is an observation, not the figure SC-7 asks for.

**Findings**: F-278 (the specs' unnamed operation), F-279 (six shadows), F-280 (the two disabled rules), F-281 (`createLinearShift`'s four partial resets).

---

## 9. Method

The factory census, the 19-collision count and the shadow table are produced by scripts over the tree at `942ed0b6`; the shadow probe walks the oxc AST with per-function and per-block scopes and hoisted declarations, and its first version was wrong in two ways — it missed sibling declarations and then double-counted function bodies against themselves — both corrected before the table above was taken. Three sub-agents read `sortable/spec.ts`, `free-drag/spec.ts` and the `seams`/`linear-shift`/`rect-index` trio; **every line cited above was re-read here**, including all six shadow sites, both banner comments, both `retire()` bodies, the `RectIndex` forward declaration and all fourteen of its call sites, and the detached-member sites in `kernel.ts`, `y.ts` and `assemble.ts`. The `eslint`/`oxlint` state was established by reading the config and by running `oxlint --deny no-shadow`, which reports nothing because the rule is not implemented there; ESLint could not be run in this environment (`jiti` absent), which is why §2.2 uses an independent probe rather than the rule's own output.

**LSP plugin — available; used**: `findReferences` on `createRectIndex` (2 production call sites, `sortable/y.ts:183` and `sortable/xy.ts:158` — one per axis feature, one instance per controller) and on the `index` self-reference at `rect-index.ts:350` (10 references: the declaration, the assignment, the return, and **7 reads or writes through the hand-rolled receiver**). Both are §5's load-bearing claims and both need exhaustiveness rather than a grep's best effort. The census and the shadow analysis are AST-level rather than symbol-level, so the oxc parser carried those.