# Retire order, axis policy and the runtime layer

Owner direction of 2026-08-28, three items in the behavior assembly/runtime layer, evaluated against the tree at `1556e5c2` and against the decisions each item touches. Decision/contract work only; nothing here is implemented.

| Item | Direction | Answer |
| --- | --- | --- |
| 1 | Store retire hooks in installation order; walk them backwards at retirement | **Accepted.** No semantic constraint. The package already stores its other ledger this way — §1 |
| 2 | `axis` becomes fixed configuration; `AxisSource` deleted | **Accepted, and D-71's own rule is what condemns the source** — §2 |
| 3 | Do the `*Runtime` objects still earn their existence? | **Neither does.** ~~Split; the sortable's does~~ — amended on owner correction 2026-08-28, and the withdrawn half is F-142 — §3 |

---

## 1. Retire hooks — the normalization is the residue, not the loop

### What the tree does

Both assemblers record hooks in installation order inside the unwind bracket, and reverse the array after the slot record is built:

```ts
retireHooks.reverse(); // src/sortable/assemble.ts, src/free-drag/assemble.ts
```

There are exactly **two** readers of the array, one per behavior, and both are the operation-retirement loop:

```ts
for (const hook of slots.retireHooks) {
  unwind(hook);
}
```

### The constraint that is not there

The one that had to be checked is the **receiver negative** (D-92, D-93, D-94). D-93 records that `retireHooks[i]!()` in the construction unwind is an indexed call and hands the hook the internal array, which is why the published guarantee is `receiver !== own()` rather than `=== undefined`, and why COVERAGE counts five sites per tier.

**Iterating the retirement site backwards does not touch it.** Both retirement loops pass the hook _as an argument_ to `unwind`, which calls it bare; `unwind(retireHooks[i]!)` is the same call shape as `unwind(hook)`. The receiver at the retirement site stays `undefined` under either loop, no enumeration moves, and no row changes.

### The constraint that is there, and it is a test pinning a representation

`tests/sortable/assemble.browser.test.ts` asserts the **storage** order by reproducing the consumer's loop:

```ts
for (const hook of slots.retireHooks) {
  hook();
}
expect(seen).toEqual(['third', 'second', 'geometry']);
```

That instrument asserts the guarantee only while the assembler pre-normalizes. Move the reversal to the site and the same test must reverse too — that is, apply the rule it is checking. This is not a reason to keep the `reverse()`; it is the cost the change has to pay, and the cheaper form is already available: the spec-level row _should run the retire hooks, each wrapped_ drives the actual retirement, which is where the guarantee lives.

### The package's own precedent decides it

The sortable holds a second ledger with identical semantics — D-39's placeholder undo — and stores it the other way:

```ts
for (let i = ledger.length - 1; i >= 0; i -= 1) {
  unwind(ledger[i]!);
} // spec.ts, rollback()
```

Recorded in acquisition order, walked backwards, never normalized. Two ledgers, one meaning, two representations, and no rule produced the difference — **F-137**.

### Priced

- The `reverse()` runs **once per controller**; the retirement loop runs **once per operation**. So the reversal is not being moved onto a hotter path in the sense the direction implies — but the replacement loop is not more expensive than what it replaces either: an indexed backwards walk allocates no iterator where `for…of` does.
- Bytes are a wash: two `.reverse()` calls and their comments go, two loops grow.
- What actually changes is that the codebase stops holding **two** representations of _reverse installation order_ with a mutation between them. One order in the array, one direction at every site.

**D-147.** The array is stored in installation order. Every reader walks it backwards. The published guarantee — hooks run in reverse installation order, each wrapped individually — is unchanged; only the representation is.

---

## 2. Free-drag `axis` — the criterion is _present state versus accumulated state_

### What is being removed

`axis?: DragAxis | AxisSource`, read at activation and re-read in `action.prepare(TAG_POLICY)` on `invalidate()`, cached in `rt.axis`, applied per sample by `applyAxis`.

### The direction's objection is correct, and it generalizes

`applyAxis` projects `pointer − origin + offset`. An axis is therefore a policy over an **accumulated** quantity: switching `x` → `both` mid-operation does not change what happens next, it changes the meaning of every pixel of Y travel since the grab, and the visual jumps by all of it at once.

Compare the other live source in the same seam. `constrain.invalidate()` re-resolves a bounds rect; the clamp is then applied to the **current** proposed position. It can move the visual, but it cannot reinterpret history — the drag's origin is not one of its inputs.

That is the criterion, and it is worth stating as contract rather than as a judgement about this one slot:

> **A policy slot may be live only if its value is applied to present state. A slot whose value reinterprets state the operation has already accumulated is not policy; it is a command.**

D-71 already decided the second half of that sentence in the other direction of travel: _a controlled position is not policy_, which is why `moveTo(point)` is a command that **re-bases** rather than an `update({ position })`. Live axis is the same shape at a different slot, and it was accepted as a _generalization_ of D-71's rule — _every mutable policy slot is a source_ — rather than from a requirement. The generalization was uniform by symmetry; the slot it reached does not satisfy the rule's motive. **F-138.**

### The safe version of the feature is a different feature

The obvious mitigation — re-base the offsets when the axis changes, so the visual does not jump — is available and is exactly what makes the case decisive. `TAG_POLICY`'s phase legality rests on it _writing no geometry_ (07 §Action phase legality); a re-basing axis change writes geometry, so it becomes `TAG_POSITION`-shaped. A live axis done correctly **is** `moveTo`: a command, dispatched by the consumer, that re-bases. D-71's own rule condemns folding it into a policy source.

### Use cases, checked rather than assumed

| Case | Served how, without a live source |
| --- | --- |
| Modifier-key constrain (hold shift → lock to one axis) | By a `constrain` installer. It runs **per sample**, needs no `invalidate()` and no frame, and composes with the same clamp arithmetic. Strictly better than the source for this case |
| Breakpoint / layout change swaps the sensible axis | Between drags, by recreating the controller. During a drag, this is precisely the case where reinterpreting accumulated travel is worst |
| Axis chosen per operation from consumer state | Not available after this change — see the reopening below |

**One cost is real and is stated rather than absorbed.** `constrain` is a single-writer slot, so a consumer who wants _both_ `bounds()` and a modifier lock must write one installer that does both. That is a pre-existing property of the unique constraint slot (D-146), not something this decision creates, but it is the sentence a consumer will meet.

### The middle position, priced and declined

`axis` could be re-read **at activation only** — the criterion permits it, since no travel has accumulated yet, and the activation read already exists in `spec.ts`. It would preserve the per-operation case at the cost of keeping `AxisSource` published, one `typeof` branch and one consumer call inside `FAILURE_ACTIVATION`.

Declined, because the case it serves is served by recreating the controller and the direction asks for the smaller model. **Recorded as the priced reopening**: if a per-operation axis is ever wanted, this is the shape it takes, it is one branch, and it does not violate the criterion. What may not come back is the `invalidate()` re-read.

### What collapses with it

- `AxisSource` unpublished and deleted; `slots.axis` narrows to `DragAxis`; `rt.axis` and its seeding branch go with §3.
- `action.prepare(TAG_POLICY)` loses the source read and its staged `{ axis }` return; `action.effect`'s `TAG_POLICY` branch goes entirely, and with it one per-`invalidate()` allocation.
- **The I-36 barrier inside `TAG_POLICY` goes, and this is the part to do deliberately.** It exists because the seam made _two_ consumer-reachable calls and the second had to be gated on the first's outcome — 07 §The one new barrier, COVERAGE row **L-3**. With one consumer call left, the barrier has no subject. The row is deleted with the site it defends, not ported to a site that cannot fail.
- `TAG_POLICY`'s phase-legality reason narrows from two re-entered consumer surfaces to one. It survives.
- `invalidate()` on a composition with no `bounds()` becomes a queued no-op. Acceptable and already nearly true; the controller surface is D-71's four members and does not change.
- `axis` becomes the only thing it should have been: the one free-drag config key that is _core, not a capability_ (D-70), and the only scalar slot that was also a source stops being an exception.

**D-148.**

---

## 3. The runtime objects — the answer is not the same for both, and not for the reason the inventory gives

### The contract's stated justification has already lapsed

[01 §The privacy boundary](../../contract/01-construction-ownership.md) says:

> **One `rt`, created inside the factory, shared by both halves.** That coupling is the whole of H-2 and it is why the factory exists at all: the spec closes over the same runtime object the controller was handed…

**That is false of both behaviors today.** `createSortableController(host)` and `createFreeDragController(host)` take the host and nothing else; the coupling that survives is on `host`, which both halves would take regardless. The object outlived its written rationale, and the rationale was never re-examined because its removal was reviewed as a _controller_ change. **F-139.**

So the owner's reading of D-4 and H-2 is right on the merits: both say the runtime is **captured by closures** and unreachable from the kernel, and closure-local state satisfies that more literally than an object does. Neither decision requires a named container, and no privacy argument distinguishes the two.

### Free drag: it does not earn its existence

`FreeDragRuntime` is `host`, `slots`, `axis`, and three per-operation fields (`lift`, `originRect`, `space`). Against it:

- `host` and `slots` are destructured on the spec's first line, so they are already locals.
- `axis` leaves with **D-148**.
- The remaining three are per-operation and cleared in `retire()` — beside `view`, `progress` and `pendingFailure`, which are **already spec locals doing the same job**. The split records where each field was born, not what it is. **F-140.**
- **No test drives `createFreeDragRuntime`.** Nothing in the repository imports `src/free-drag/runtime.ts` except the spec, the controller (for the action tags) and the behavior.

That last point is D-126's rule applied one layer down, and it is the same rule that deleted `createFreeDragBehavior` while keeping the sortable's: _a test seam exists where a test drives it._

**Dissolve.** `createFreeDragSpec(host, slots)`; the three fields become spec locals cleared in `retire()`. The action tags are not runtime state and keep a declaration home — the constraint is only that the module carrying them must not keep a doc claiming to enumerate per-operation state.

### Sortable: ~~it does earn its existence~~ — amended on owner correction, 2026-08-28

**The section below is struck and kept.** The owner's rule is stronger than the one I applied, and it is the right one: _a behavior-level invariant is driven from the behavior's real boundary — ultimately from `sortable(root, config)` and the events and controller actions it exposes. A state reachable only by mutating a production-private container is a test-harness problem, not an architecture to preserve._ Both runtimes dissolve.

**Where the argument went wrong (F-142).** I read D-126 as licensing any seam a test drives, and D-126's own subject is a different kind of seam. `createSortableBehavior` takes an exotic **input** — a slot record the public config cannot express — and then runs the production wiring; that widens the domain the state machine runs over. `createSortableRuntime` hands back a mutable **interior**, and the five sites reach their state by writing `view`, `placeholder` and `pendingSpatial` _after_ construction; that bypasses the state machine. _A test seam exists where a test drives it_ presumes a seam. **A capability that exists only to write private fields is evidence about the harness, and reading it as evidence about the architecture is what preserves the container that made the shortcut available.**

**The fidelity runs the other way too, which is what I should have noticed.** The bench at `tests/sortable/sortable.browser.test.ts` builds a **stub host with a writable `closed`** — standing in for the latch that D-53 made readonly precisely so a behavior only reads it. So the instrument for the terminal barrier drives a latch no production path sets that way, over a kernel that does not exist. The reentrancy those rows are about is produced by a consumer callback destroying its own controller mid-seam, which is how the rest of the suite already reaches it.

**The migration target, so the rewrite is not open-ended.** Anything the public surface expresses goes through `sortable(root, config)`. The exotic slot records — a stub `resolveInsertion`, no placeholder factory, hook overrides no `SortableConfig` names — keep their seam: `createSortableBehavior(items, slots)` through `draggable()`, which is a **real kernel and the production wiring** with a widened input. That seam is D-126's and is untouched here.

**The obligation the rewrite carries.** A state that genuinely cannot be reached or observed through the behavior's real contract is reported as a **design/testability finding** — it names something the contract cannot exercise, which is worth knowing — and not as a reason to restore the container. Two are worth watching: the frame task's stale-attempt path, which needs a scheduled spatial frame to fire after the operation lost its presentation, and `PresentationView.insertion` outside its bracket, whose contracted observer is a displacement hook rather than a field read.

~~**It does not, because the object is also a construction seam that five tests drive.**~~ The struck argument follows.

> `tests/sortable/sortable.browser.test.ts` builds a runtime over a stub host and then _writes its fields_ to place the spec into mid-operation states — states the seams would otherwise have to be driven into through hand-built drafts and scopes. D-126 already recorded this layer as _emitted, driven by five test sites_. Closure-local state is unreachable **by construction**, which is the property that makes it attractive for privacy and the same property that removes this reach. Trading five state-injection instruments for a handful of property reads fails §0 and fails D-126's own rule.

**What survives unchanged from that section:**

- **The frame task moves into the spec.** `frame` is read nowhere else; creating it inside `createSortableSpec` is what removes the self-referential `let runtime!: SortableRuntime`. M-2 is untouched — the spec is created once per controller, in `install`, so the task stays eager-per-controller and the 148 B measurement stands.
- **`PresentationView` stays and is unaffected.** It is not aggregate runtime state; it is the per-operation object the feature views bind to, and the one thing here whose cross-closure sharing genuinely needs an object.

**D-149**, as amended.

---

## 4. Findings

- **F-137** — Two ledgers with identical semantics are stored in two representations. Retire hooks are normalized eagerly by a `reverse()` so one consumer can read them forwards; D-39's placeholder undo is recorded in acquisition order and walked backwards. No rule produced the difference, and the general form is worth carrying: _a normalization that exists to make one reader simpler is a second representation of the same fact, and the second representation is what a later reader has to be told about._
- **F-138** — A decision generalized a rule past its motive. D-71's _every mutable policy slot is a source_ was applied to `axis` by symmetry with `items` and `bounds`, and `axis` is the one slot whose value reinterprets accumulated rather than present state. The record shows the generalization; it does not show the slot being tested against the rule's reason. General form: _a rule stated over a category is applied to members by category membership, and the member that does not satisfy the reason is admitted by the wording._
- **F-139** — A structure's written justification lapsed and the structure did not. 01 §The privacy boundary still says the runtime object exists because the spec and the controller share it; the controller stopped receiving it, and the sentence was not revisited because the change was reviewed as a controller change. General form: _when a coupling is removed, the things justified by that coupling are not on the reviewer's diff._
- **F-142** — _A seam that exists to write private state was read as a seam a test legitimately drives, and it decided a production shape._ Opened by the owner's correction; the general form and the D-126 distinction are in §3.
- **F-140** — Per-operation state lives in two homes in both behaviors — runtime fields and spec locals — with no criterion separating them. The split records the order in which the state was added, and each home has its own clearing site in `retire()`.

---

## 5. What none of this changes

- The unwind bracket, its totality (D-80), or the placement of the slot-record build inside it.
- The receiver negative (D-92/D-93/D-94), the five-site enumerations, or either COVERAGE column — §1.
- The published retirement guarantee: hooks run in reverse installation order, each wrapped individually (F-22, 05, 06).
- D-77's required first argument, the call arity of either entry, or D-146's per-key installer model.
- H-2 and D-4, which are satisfied at least as strongly after §3 as before.
- M-2's frame-task allocation policy.