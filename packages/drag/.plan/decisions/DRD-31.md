#### DRD-31 — `sortable` borrows the `items()` array, and saves the home gap at each pull it keeps

**Status:** active, decided on 2026-11-08 on the owner's direction, from [`items-copy-assessment.md`](../items-copy-assessment.md). Supersedes `DRD-25`'s `items()` copy bullet and amends the contract's DRI-14. Implemented at `4ef33b96e`, after `a390dfa29` and `0e7e1c7ef`, from [`items-borrowing-handoff.md`](../items-borrowing-handoff.md), and reported at `72f669ce1` ([report](../items-borrowing-report.md)). When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10)

**`sortable` doesn't copy the array that `items()` returns. The operation keeps the array from activation, or from its last rebase, until the drop: this is the retained array. The consumer keeps it consistent under the rule in the contract's `DRI-14`. The operation saves the item's home gap at activation and at every rebase, from the same pull, and the landing reads only that saved gap. `DRD-25`'s `items()` copy bullet is superseded.**

Decided on 2026-11-08 on the owner's direction, from [`items-copy-assessment.md`](../items-copy-assessment.md). **The owner's terms:** an option may carry an explicit expectation that the integrator leaves it unchanged, and aliasing alone does not justify a defensive copy (CONTRIBUTING §1.1 and §9). The API is unpublished, so the current tests and promises describe the design, and they don't forbid changing it.

**Why the copy is no longer needed.**

- **The admission pull is read only within its call.** No consumer code that can change the collection correctly runs between the pull and its reads.
- **After the drop, the landing's home was the only read.** It runs after `onReorder` may have changed the consumer's model. The witness "should land a canceled drag at home when the consumer reordered its own array" failed in three engines without the copy ([composition report](../composition-report.md) line 59).
- **A cancel before the drop read the same home from the array.** That includes a synchronous `requestCancel()`, which applies before it returns (`DRI-1`).

A saved gap answers both of these reads with two element references and the index, from the pull that decided them. Every other read of the retained array happens in a step the library runs for the drag before the drop, and the consistency rule covers those steps.

**The home gap:**

- **At activation,** the gap the item occupies in the activation pull. A pointer operation's first insertion is that gap, and may be the same object. A command computes it beside its keyboard target.
- **At each rebase,** the gap in the new pull. It is assigned where the new pull becomes the operation's snapshot, before the item test, so a removed item's rebase saves what today's read at `settle` computes.
- **At `settle`,** a cancel or a reject that lands goes to the saved gap. No decision, verdict, release or destruction reads the retained array.

**The consistency rule.** The contract's `DRI-14` states it, and this is its reason. Whether the consumer changes the collection in place or by replacement depends on one condition: **can the library read the retained array before consistency is restored?** Here consistency means the array changed, the DOM showing the change, and `invalidate()` called.

- **Code the library runs inside one of its steps continues that step when it returns.** Examples are `onStart`, the placeholder factory, and listeners that the library's own DOM writes trigger synchronously. A command runs `start` and its drop in one synchronous pass, and the drop reads the retained array. So code in that position completes an in-place change before it returns, or replaces the array. A microtask is too late. An `invalidate()` called there is a deferred step, which runs before the library's next step (`DRI-2`).
- **Code outside the library's steps can complete in its microtasks.** Examples are an event handler, a timer, and an `await` continuation. The library reads a retained array only in steps that a frame, a pointer event, a request of the consumer's, or the drag's own sequence starts. Before the drop, no microtask of the library's reads it. So an `await` is not the criterion: what matters is whether a frame or pointer event can reach the library between the change and `invalidate()`.
- **`handle`, `visual`, `box` and the placeholder element's own callbacks run in the middle of a read.** No in-place change is made there.
- **Deferred rendering requires replacement.** The retained array is left unchanged, so it keeps matching the DOM until `invalidate()`.

**Outside the contract,** and not detected: an in-place change that the library can read before `invalidate()`, and a change during a drag without `invalidate()`. By reading, the operation may then resolve a wrong gap, propose a request whose `from` comes from the changed array (a command can become a no-op that way), or fault on an anchor outside the container.

**Preserved:**

- the cancel and reject landing before and after the drop;
- rebase, with a surviving gap rebased and a lost adjacency or a removed item cancelling;
- `DRI-14`'s activation decline, and a command's target from the activation pull;
- `DRD-30`'s `activate` order and every kernel order;
- the axis caches' rule that a version names a fixed list, which now holds under the consumer's rule rather than by the copy.

**Rejected:**

- **Keeping the copies.** Normal use doesn't need them once the home gap is saved, and the one integration style they protect has a findable alternative.
- **Capturing the home only at the drop.** A cancel before the drop would still read the array.
- **"One task, microtasks included" as the rule.** A command's drop follows `onStart` synchronously.
- **"Never change the retained array in place" as the rule.** It forbids synchronous in-place updates, which are correct and common, and buys nothing over the stated condition.

**Costs, by reading, not accepted here:**

- **Saved:** one array of `n` references per pull.
- **Added:** one `Insertion` per command activation and per rebase.
- **Unchanged:** nothing changes per sample or per frame.

The unit reports its size and allocation under CONTRIBUTING §15. No ceiling is re-based, and no timing is run. [`items-borrowing-handoff.md`](../items-borrowing-handoff.md) implements it.