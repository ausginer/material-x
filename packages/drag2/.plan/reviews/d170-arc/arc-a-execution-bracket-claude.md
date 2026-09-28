# Arc A — the execution bracket, re-derived and made implementation-ready

**Subject** the C1 direction accepted in [`entity-model-adjudication-claude.md`](../architecture/entity-model-adjudication-claude.md) §1, §2 and §9. **Derived at** `72375fe4` on `drag2/fin-review`, with Stage 0 and Stage 1 closed. **Mints** D-180. **Amends** D-170's step grading with a dated note, and contract [`01`](../../contract/01-construction-ownership.md) §Teardown's step ownership. **Nothing is implemented**, and no production source or test is touched by this pass.

**The verdict in one line.** The boundary holds and is stronger than it was at `b73b6779`, but the sketch's ledger is wrong in three places and its ingress recomposition would have introduced a corruption the tree currently refuses by statement order — so what follows is the boundary re-drawn, not the sketch elaborated.

## 0. What I re-derived, against this tree

Every count below is mine, taken at `72375fe4`. The adjudication's were taken at `b73b6779`, and two have moved.

| Claim | At `b73b6779` | At `72375fe4` |
| --- | --- | --- |
| `#queue.closed` readers | 15 reads, 13 members | **15 reads, 14 members, and exactly one write** — `destroy` at `:781`. F-328's repair added `#handleErrorReported:2492`; `#openIngress` reads twice |
| What the readers are _about_ | "13 of 15 are not about draining" | **10 liveness · 4 admission-or-drain gate · 1 idempotence.** The four gates are `#dispatchKernel:860`, `#openIngress:1275`, `#openIngress:1300`, `dispatch:2589` |
| `#transactionDepth` | — | 6 lines: declared once, incremented at **exactly two** sites (`#dispatchKernel:870`, `#openIngress:1283`), decremented once in `#leaveTransaction:801`, read at `destroy:783` and `:803` |
| `queue.ts`'s importers | — | **One.** `kernel.ts:77`. Nothing else in `src/` names the module |
| `#dispatchKernel` call sites | — | **11**, of which `#onPointer:1034` is the per-sample path — one dispatch per `pointermove` |
| `#runPhysicalTeardown` callers | — | **2** — `destroy:784` and `#leaveTransaction:805` |
| Fields declared on `Kernel` | — | **39**. Arc A moves 8 out and adds 1 |
| The cluster is already named in prose | — | **Twice, and by no entity.** `kernel.ts:434` carries `/* ---- the transaction bracket ---- */`; `kernel.browser.test.ts:4062` carries `describe('the transaction bracket')` |

**The strongest single fact is the last one.** The tree names this entity in a section comment and in a test suite title, and the thing it names is spread across eight fields, four members and five comment blocks.

## 1. What the record made after the snapshot does to the boundary

**D-176, D-178 and D-179 all strengthen C1's central claim, and none of them reopens it.**

D-176 made the latch's readership a contract-level census over a static candidate set. D-178 turned the exception into a four-clause predicate over call sites. D-179 made the obligation's unit the **route**. Together they say: the latch is not an implementation detail of a queue, it is the datum three decisions index their rules on — and its declaration currently sits in a module whose own docblock opens _the queue owns no semantics_.

**D-179 also supplies a property the adjudication could not state, and it is a result rather than a constraint.** `#runPhysicalTeardown` reaches two declared consumer slots — `spec.retire` at `:729` and `operation.lifetimes.dispose` at `:732` — and it has two callers, so under D-179's unit those are **four routes** into two slots. After Arc A the deferral fork is internal to one entity and the teardown callback has **one** caller, so the same two slots are reached by **two** routes. An arc that reduces the census D-176 obliges the record to maintain is doing the census's work, not adding to it.

**And the negative invariant that makes the arc safe is checkable by reading the file:** the bracket invokes no declared consumer slot. Every act-(a) call stays behind one of the four callbacks, so no new route is created into anything.

**§1's other holding stands unchanged.** The channel — `#notify`, `#report`, `#unwind` — does not join. D-178 is a second, independent reason: the exception is now a **predicate over call sites with two species**, and `#panic`'s docblock already argues its own membership in that predicate's own vocabulary at `kernel.ts:809-819`. Co-location adds nothing a predicate does not already give every site.

## 2. The mismatch that matters — D-170 already graded this module, and the grading survives

**The sketch would have overturned a live decision without noticing it.** D-170 grades twenty-one factories and names this one explicitly:

> `createActionQueue` is the deliberate outlier and stays: it is a plain mutable record operated on by free module functions, a considered split of state from behavior, and it travels as a field of the kernel.

C1 as sketched absorbs `{queue arrays, running, closed, …}` into a class, which is exactly the conversion D-170 refused, for a module D-170 examined and passed.

**The resolution is not to overturn it. It is that D-170 graded the wrong four fields as one thing, and the arc separates them.** D-170's test is _an invariant spanning two fields_, and it is satisfied — by the **latch**, not by the storage. Split the record and both halves come out clean:

- **`ActionQueue` keeps `actions` and `args`**, with `enqueue` and `clearQueue`. Two parallel arrays whose only invariant is that they stay positionally paired; the representation is a stated allocation choice with its own argument. A plain mutable record operated on by free module functions, travelling as a field — **of the bracket instead of the kernel, which is not a fact D-170's grading depends on.**
- **`closed`, `running` and the drain loop leave**, because they are policy: the terminal latch three decisions index on, the run-to-completion latch, and the loop that re-reads the first every iteration.

**D-170 is confirmed rather than superseded, and the confirmation is the sharper reading**: what was misfiled was never the queue's representation, it was the two semantic fields sitting on a record that says it has none. Its docblock's first claim becomes true.

**One consequence, priced.** `queue.ts` drops from 91 lines to roughly 35, and its best paragraphs — run-to-completion, the panic contract, "the queue owns no semantics" — move to the bracket, where their subject now lives.

## 3. The entity

**`ExecutionBracket`, `src/kernel/execution.ts`, controller lifetime, constructed with the kernel and before `arm()`.**

**Name.** Not `TransactionBracket`, which is what `kernel.ts:434` and `kernel.browser.test.ts:4062` call the cluster today: the depth counter is one of eight fields, and naming the entity after its smallest part is how `ActionQueue` came to hold a liveness latch. Both existing names change to _the execution bracket_ with it. The word **transaction** is then unclaimed by any entity name and stays available to Arc B, while _library transaction_ keeps D-36's normative sense at the depth counter.

### State it owns

| Field | Today |
| --- | --- |
| the `ActionQueue` record | `Kernel.#queue` — unchanged in kind, reduced in width |
| `#closed` | `ActionQueue.closed` |
| `#running` | `ActionQueue.running` |
| `#depth` | `Kernel.#transactionDepth` |
| `#teardownPending` | `Kernel.#teardownPending` |
| `#admitting` | `Kernel.#admitting` |
| `#destroyed` | `Kernel.#destroyed` |
| `#settle` | `Kernel.#settleDestroyed` |

Plus the two hoisted drain closures, which become constructor parameters rather than disappearing — §7.

**Cohesion, measured rather than asserted.** Every field is reached from at least two of the four operations, and `#closed` and `#depth` from three each. That is the test the adjudication applies to the C1/C2 merge and finds failing there — _nothing in the bracket half reads a frame; nothing in the transaction half reads depth_ — applied to this entity alone, where it passes.

### Operations

- **`get closed(): boolean`** — the reading. Public on the entity, not merely forwarded, because Arc B's transaction reads it directly (§5).
- **`dispatch(action, argument): void`** — `#dispatchKernel`'s body.
- **`runIngress(admit: () => void): void`** — `#openIngress`'s bracket half.
- **`close(): Promise<void>`** — `destroy()`'s body.

Four callbacks, all controller-invariant, all supplied once at construction: **`handle`**, **`panic`**, **`teardown`** (the kernel's steps 3–7), and **`beginPass`** (§6).

### Invariants it owns, stated as its own

1. **The terminal latch.** Set exactly once, on the statement that requests closure. From that statement every guard fails. The live reading is the only admissible answer to a liveness question (D-38); no copy, no cache, no derived predicate.
2. **Run to completion.** A nested dispatch appends and returns; the outermost frame reaches the appended work in the same pass; the loop re-reads the latch every iteration.
3. **Deferral.** Physical teardown runs when the outermost library transaction closes, exactly once, read at the boundary rather than latched at entry.
4. **The admission boundary.** While a pass is running, dispatch enqueues and does not drain; the boundary drains once, after admission has committed or abandoned; a nested pass is refused **before anything opens**.
5. **Closure is idempotent and settles once.** One promise by identity from every call, settling after teardown.
6. **Argument release.** No queued argument outlives the drain that abandoned it — which makes teardown's step 2 the bracket's (§4).
7. **Panic terminalizes.** A throw escaping `handle` closes the controller and reaches the panic callback.
8. **Negative, and load-bearing.** The bracket invokes no declared consumer slot, publishes no event, and names no frame, operation, spec or DOM node.

## 4. What stays outside, and one step that moves

**Outside**: frames and the frame pair; the operation and activation records; `#spec`; the seam driver; the `AbortController` and every listener; `#tail`; and — for the reasons in §1 — the whole channel, `#notify`, `#report` and `#unwind`.

**Teardown's seven steps keep their numbers and their order, and step 2 changes owner.** `clearQueue` at `:724` is invariant 6, and Q-21's rule — _each entity retires its own state and no collaborator's_ — puts it with the queue. So the bracket clears its own storage immediately before invoking the `teardown` callback, and the callback carries steps 3–7 unchanged. **The observable sequence is identical**; contract [`01`](../../contract/01-construction-ownership.md) §Teardown gains one sentence saying steps 1 and 2 are the bracket's.

## 5. The three interaction surfaces

**Kernel → bracket.** One private field. The kernel reads `closed` at fifteen sites, calls `dispatch` at eleven, `runIngress` through `#openIngress` at two, and `close` at one — plus `#panic:855`, which reaches it through the published `destroy()`. The only edges back are the four construction callbacks. No cycle, and nothing on the bracket's side names anything the kernel owns.

**`#dispatchKernel` is deleted rather than forwarded.** Eleven call sites become `this.#bracket.dispatch(…)`. This matters for one reason and it is a measurement reason: a forwarder would add a frame to the per-sample path, and deleting it means the arc adds **one property load and zero call frames** per sample. §9.

**Transaction (Arc B) → bracket.** Per the adjudication's §2 correction, the transaction holds a reference to the bracket rather than calling up through the kernel for `preparationValid`. Two constraints on Arc A follow, and they are the reason to state this now: **`closed` must be a public member of the bracket**, not a kernel-private forward; and the bracket must be **constructible before any other entity**, since both the kernel and the transaction hold it.

**Native ingress → bracket.** `#openIngress` is the one three-way site — bracket (`closed`, `admitting`, `depth`, drain), transaction (`begin`), operation (`current.operation`) — and §6 is entirely about it. C4 stays deferred; it takes the listeners and the abort, touches none of this, and is smaller after Arc A.

## 6. The ordering the sketch would have broken

**The adjudication says `#openIngress`'s guard on `current.operation` and its `begin()` stay on the kernel side of the call. Taken literally that is a corruption**, and the tree already documents which one.

Today the order is: refuse on `closed || admitting || current.operation` → `#depth += 1` → `#begin()` → `#admitting = true` → `admit()`. If the kernel runs its guard and `#begin()` and _then_ calls into the bracket, a nested press reaches `begin()` before the bracket refuses it — and `#openIngress`'s own docblock names the result: the nested pass _rebuilds the draft from the committed frame, discarding whatever the outer `admit` had already staged in it_, then commits its own pointer origin. That is the defect the whole re-entry latch exists to prevent, reintroduced by the extraction that was supposed to localize it.

**Required property.** No preparation of any kind may run on a pass the bracket refuses. Only one composition satisfies it without splitting a check-then-act across the boundary:

```
#openIngress(admit: () => void): void {
  if (this.#current.operation) { return; }
  this.#bracket.runIngress(admit);
}
```

with `beginPass` supplied at construction and invoked by `runIngress` **after** its own two guards pass. The kernel's operation guard is a precondition of the call, and it is sound because nothing consumer-reachable runs between it and the bracket's guards.

`beginPass` is typed `() => void` and its contract is _the caller's own preparation for a pass, run only on a pass that was not refused_ — which names no frame, so Arc B satisfies it by passing the transaction's `begin` with no re-plumbing.

**Two orderings inside `runIngress` differ from today and both are equivalent, which is worth writing down so the implementer does not preserve the wrong one.** `#admitting = true` may precede `beginPass()`: nothing between them can dispatch. And `beginPass()` may sit inside the `finally` that clears `#admitting`: today it cannot throw with the latch set, and if it did, the latch would be cleared either way.

**This is instrumented, and the instrument discriminates.** [`kernel.browser.test.ts:1058`](../../tests/kernel/kernel.browser.test.ts) — _should refuse a nested press before it can touch either frame_ — presses from inside `admit` and asserts `note === 'outer'` and `originY === 10`, both of which a nested `begin()` destroys. It may not move, and the node instrument owes it a counterpart (§8).

## 7. Three ledger items that do not survive, and where the destroy promise settles

**(a) `drain`'s two callback parameters do not become unnecessary.** They become two constructor parameters. `#drainStep` exists because `drain` calls with no receiver; as the bracket's own fields the wrapping rationale changes owner and the closures remain, one per controller. What is actually saved is two three-argument call sites becoming two no-argument ones, and that is all.

**(b) The deferral does become node-testable, and the coverage gap is larger than the adjudication says.** The deferral is covered today — six rows in `kernel.browser.test.ts`'s bracket block — but every one drives through `onStart`, which is a **drain**. `#openIngress:1283` is the other increment, and enumerating that block against the one row that destroys from inside `admit` (`:1144`, which asserts only that no operation is published) leaves **no row asserting that a close raised inside an ingress pass defers its teardown to the boundary**. Deleting that increment is a silent change today. That is the single most valuable row the node instrument adds.

**(c) The destroy promise settles in a `finally`, and that is preservation rather than preference.** Today `#settleDestroyed` is resolved inside `#runPhysicalTeardown`'s `finally` at `:753-757`, **after** `#cancelTail()` and `#ingress.abort()` — so a throw from steps 2 to 6 settles the promise and a throw from step 7 does not. Moving the settle to a `finally` around the `teardown` callback preserves the first and strictly improves the second, and makes invariant 5 independent of D-29's totality rather than derived from it. **The required property**: the promise settles once per controller, ordered after the teardown callback returns or throws.

## 8. Invariants and instruments that must survive

**Must not change, and each has a live row.**

| Property | Instrument |
| --- | --- |
| `Kernel` gains no public member | `context.declaration.test.ts` — `keyof BehaviorContext` at seven, `Exclude<keyof Kernel, keyof BehaviorContext>` at `'arm'` (F-317). **The bracket is a `#private` field** |
| `destroy()` returns one promise by identity through both shipped wrappers | `sortable.browser.test.ts`, `free-drag/lifecycle.browser.test.ts` (F-318) |
| Close, report, then tear down | `kernel.browser.test.ts` — `['report:null', 'closed:true', 'retire']` |
| A nested press touches neither frame | `kernel.browser.test.ts:1058` |
| The six deferral and idempotence rows | `describe('the transaction bracket')` |
| The reporting route's terminal reads for itself | `kernel.browser.test.ts:2775` (F-328) |
| Fifteen latch readings stay fifteen | reading; **no reading may be deleted, hoisted, cached or replaced by a bracket-derived predicate** (D-38, D-179) |

**Migrated.** Eight of `queue.node.test.ts`'s nine rows are bracket rows — FIFO, pairing, the appended entry, the nested dispatch, the mid-drain latch, the panic route, the argument drop, the running flag — and move to `tests/kernel/execution.node.test.ts`. `clearQueue`'s row stays with the storage.

**The arc's own falsifiers.** Seven rows, each with its recorded mutation, to the Stage 1 standard — _each mutation reddens the row written for it and no other_:

| Row | Mutation |
| --- | --- |
| teardown defers to the outermost boundary | `close()` runs teardown unconditionally |
| **a close inside an ingress pass defers** | `runIngress` does not increment the depth |
| two closes in one pass tear down once | drop `close()`'s already-closed guard |
| the drain re-reads the latch per iteration | hoist the read out of the loop |
| dispatch during a pass enqueues and does not drain | drop the `admitting` early return |
| **a nested pass is refused before `beginPass`** | move `beginPass()` above the guards |
| the promise settles after teardown, once | settle before invoking the callback |

The two bold rows are the ones no existing row reaches.

## 9. The measurement obligation, stated before the run

**Per sample, the arc adds one property load and zero call frames** — the `this.#bracket` load at the `MOVE` dispatch — because `#dispatchKernel` is deleted rather than wrapped. Every `kernel.closed` read pays the same one load, and the behaviours read it on the per-candidate scan path, so **the per-sample count of `kernel.closed` reads for `complete` and for `free drag complete` is stated before the m1 run, not after it.**

- **M-1 and M-1′** at 50 and 200 rows, with the retained-heap arm over 20 000 consecutive samples, under the existing opt-in harness.
- **Brotli per composition**, all ten rows. **The control set is not expected to be zero**, and saying so in advance is the point: `kernel.js` carries the bracket, so the rows that have been exactly zero in every recent pass will move here, and a zero would be the surprising result.
- **No budget re-base without the record's usual justification.**

**I decline to predict the byte direction.** Five comment blocks and two three-argument call sites go; a class, four callback fields and a second module's boundary arrive.

## 10. The sequence

**A-1 — the move.** `execution.ts` created; `queue.ts` reduced to storage; the eight fields, the drain loop, `#dispatchKernel`, `#leaveTransaction`, `destroy()`'s body, `#openIngress`'s bracket half and teardown step 2 relocate; the fifteen readings and eleven dispatch sites re-point. **One commit, because the field cannot be split across two.** No behaviour change, no test change: **green on the existing 1280 rows is the acceptance criterion**, and §8's table is what makes that a strong one rather than a weak one.

**A-2 — the instrument.** `execution.node.test.ts` with the eight migrated rows and the seven new ones, each mutation recorded. `COVERAGE.md` updated.

**A-3 — the measurement.** The per-sample counts from §9 stated first, then M-1/M-1′ and the Brotli table.

**A-4 — the record.** Contract 01 §Teardown's one sentence; the `plan.md` entry; D-180's row leaves §Decisions not yet implemented when A-1 lands, which is why the witness names the endpoint of the **source** change and the note beside it says so.

**Ordering against the rest.** Arc A's blockers are discharged: F-318 repaired 2026-09-04, F-324 closed, Stage 0 and Stage 1 shut. Arc B follows and depends on it. Arc C is independent of Arc B but comes after Arc A, which touches teardown. Arc D is independent of all three. C4 stays deferred on O-3. **F-323 is untouched and is not a blocker for this arc** — it is out of range, its enumeration never reproduced, and nothing it names is in `src/`.

## 11. Where I disagree with the adjudication, which is my own

1. **`createActionQueue` was already decided and the sketch would have reversed it silently.** The split in §2 is the resolution, and it confirms D-170 rather than superseding it.
2. **`#openIngress` cannot be recomposed as described.** The `begin()` before the refusal is the exact corruption the latch exists to prevent, and it has a live instrument.
3. **`drain`'s callback parameters do not become unnecessary.** They become constructor parameters.
4. **The deferral coverage gap is specific, not general.** It is covered through a drain and not through an ingress pass, and naming which arm is missing is what turns "more testable" into a row someone can write.
5. **The entity is not called the transaction bracket**, though the tree calls it that in two places, and Arc B needs the word more than this arc does.

Against all of that, the two claims the direction rests on are re-derived and stand: the missing entity is the execution bracket and not the queue, and the latch's meaning is a contract-level datum that a record with no semantics should not have been declaring.