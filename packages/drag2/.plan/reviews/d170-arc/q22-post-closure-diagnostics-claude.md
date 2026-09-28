# Q-22 — what `onError` is after logical closure

**Architect, 2026-09-04, on `drag2/fin-review` at `d9db62ac`.** Settles Q-22, mints D-178 and F-327, amends D-176 and I-36. Nothing implemented; the one production defect this found is prose and is routed as a finding.

## 0. What the census actually established, and what it got wrong

The F-324 re-census reported that `Kernel.#panic`'s post-closure `onError` delivery fails **two** clauses of D-176's relinquishment predicate: the purpose clause, and the publishes-nothing clause.

**One of those two is a real gap and the other is a misreading of an abbreviation.**

| clause | census verdict | verified verdict |
| --- | --- | --- |
| reached only from teardown or unwind, never operation work | passes | **passes** — `#drainPanic` is `drain`'s `catch` arm |
| purpose is to release a resource the library holds | **fails** | **fails, and the clause is what is wrong** |
| no operation work, publishes nothing, return ignored | **fails** | **passes** — see §3 |
| wrapped | passes | **passes** — `#notify`'s `try`/`catch` terminus |

So the predicate is under-specified in exactly one clause, and the answer is a repair to that clause rather than an exception to the predicate.

## 1. Verified facts

Read at `d9db62ac`, in the citing agent.

- **`onError` is a declared consumer slot under D-176.** Both behaviors deliver it as `this.#slots.onError?.(error)` — [`sortable/spec.ts:313`](../../../src/sortable/spec.ts), [`free-drag/spec.ts:206`](../../../src/free-drag/spec.ts) — from `SortableSlots` and `FreeDragSlots`. Invocable, obtained from a published config key. Membership is not in doubt.
- **Exactly one post-closure invocation exists.** `#notify` refuses when `#queue.closed` unless `afterClose`, and `afterClose` has one caller: `#panic`, which is `void this.destroy(); this.#notify(new DraggableError(null, error), true)` at [`kernel.ts:851`](../../../src/kernel/kernel.ts). Each behavior's own `#notify` refuses on `kernel.closed` with no exception parameter.
- **The delivery is pinned by a browser instrument.** [`tests/kernel/kernel.browser.test.ts:4013`](../../../tests/kernel/kernel.browser.test.ts) asserts `['report:null', 'closed:true', 'retire']`, reading `kernel.closed` from inside the handler. Its own comment records that this is _the named exception to D-37 (a), and it is the whole reason the amendment needed the owner's assent rather than being absorbed_.
- **`onError` has two routes with opposite characters.** On the classified-failure route the delivery runs **inside a seam, inside its own phase**: `#handleFailed` sets `#reporting`, calls `#runStamped(REPORTING, …)` around `#driver.runCore(#settlementTransition, …)`, and then dispatches `ERROR_REPORTED` — whose own docblock reads _`onError` is done. **The operation still owes a terminal**, and this is where the failure path pays it._ On the panic route nothing follows the call at all.
- **The `#panic` docblock already argues the exception correctly**, in D-51's vocabulary and without citing D-51's list: _a terminal diagnostic **tells** the consumer something and asks nothing of them — it publishes no lifecycle or domain event, ignores its return value, performs no operation work, and is guarded._
- **The package separates the fault channel from the event channel in three independently authored places.** [`errors.ts:4`](../../../src/kernel/errors.ts) — _which class arrives says whether the operation was affected_; [`kernel/spec.ts:472`](../../../src/kernel/spec.ts) — _a warning is therefore **not** proof that the operation is over, and the terminal for that operation still publishes afterwards_; [`failures.ts:77`](../../../src/kernel/failures.ts) — _`onError` is the channel that answers **did anything go wrong**; this field answers **what ended it**_.

## 2. The three shapes, adjudicated

### Shape 2 — hold the predicate, a panicked controller reports nothing — rejected first, because it is the cheapest to dispose of

It retracts a decision the owner assented to at D-131, deletes a pinned browser assertion, and makes a kernel-level invariant violation **silent**: a throw escaping `handle` is by `queue.ts`'s own words _an invariant violation_, and the consumer's controller would die with no account of why. The reason offered for the retraction would be that a predicate minted eight days ago omitted a clause — a drafting artifact, not evidence. `CONTRIBUTING.md`'s _truthful fellow developer_ is the standard the package writes to, and swallowing the one report it owes is the opposite of it.

### Shape 3 — diagnostics are outside act (a) altogether — rejected, and the refutation is mechanical

The proposal is to exempt the **slot**. `onError`'s two routes forbid it: on the classified-failure route the delivery is sequenced by the phase machine, runs through `runCore` in the `REPORTING` phase, and the operation _still owes a terminal_ that `ERROR_REPORTED` pays. That is operation work by any reading — the library's next step is conditioned on the call having happened. Exempting the slot would put that site permanently outside (a), which is precisely the _smuggle operation work past a close_ hazard D-51 named the exception to prevent.

It is unreachable after closure today, so the exemption would cost nothing **now**. That is not a reason to state a rule that is false about a site the package already has. And D-176 already settled the shape of this: the exception is **a predicate over call sites**, not a property of a slot. Shape 3 is a category error against a decision eight days old.

**This is the load-bearing observation of the whole question.** The same declared slot is soliciting at one site and non-soliciting at another. Whatever the rule is, it cannot be indexed by the slot.

### Shape 1 — widen the predicate — accepted, but not in the form offered

The offered form is _add a diagnostic clause_. That would put a second named species inside the predicate, which is the defect D-176 cured one level up: D-176's whole argument is that **a list is not an invariant and a property is**, and a purpose clause naming one purpose is a list of length one. Adding a second entry keeps the shape and doubles it.

So: **replace the clause with the general property it was an instance of.**

## 3. The decision

**The axis is solicitation.** D-51 stated it exactly — _relinquishment **returns** something to the consumer, it does not **ask** anything of them_ — and then narrowed it twice: first to a purpose (releasing a resource), then to a list of members. D-176 removed the list and left the purpose. This removes the purpose and keeps the axis.

Clause 2 becomes: **the call discharges an obligation the library already holds to the consumer, cannot discharge by any other route, and that the closure did not create.** Relinquishment and terminal diagnosis are its two current species; naming a third is a contract change that must name the pre-existing obligation.

Three tests of the new clause, all of which the old one either failed or answered by accident:

- **It admits `#panic`.** The fault the panic reports is the fault that _caused_ the closure — it escaped `handle`, which is operation work. The library holds one account of it, the channel is the only route, and the channel is terminal. Obligation, unroutable elsewhere, not closure-created.
- **It keeps out purposeless calls.** The old clauses 1, 3 and 4 alone would admit a wrapped, return-ignored `visual()` invoked from teardown for no reason. _An obligation the library already holds_ is what forbids it, and no enumeration of purposes was needed to get there.
- **It grounds a silence the package already keeps.** A teardown step that throws reports through `#notify` and is refused; [`01`](../../contract/01-construction-ownership.md) states the policy as _what the sequence guarantees is that the next step runs, never that the consumer hears about the one that did not_. Under the new clause that stops being a bare policy: the obligation was **created by the closure the consumer asked for**, so it is not owed. The rule and the shipped behavior were already agreeing, for a reason nobody had written down.

**And clause 3's publish limb is sharpened rather than widened.** D-176 abbreviates it to _publishes nothing_; act (c) — the clause it exists to keep the exception from smuggling — reads _publishing another **lifecycle or domain event**_. Read as written, the abbreviation makes the exception stricter than the act it mirrors, which is how the census reached a contradiction with (c)'s own wording: the same delivery is outside (c) by (c)'s text and inside (a) by (a)'s exception. **A fault report is neither a lifecycle event nor a domain event**, and the package says so in three independently authored places (§1). The limb is restated to (c)'s words.

**Clause 1 is restated to what it was measuring.** _Never from operation work_ was reaching for _nothing the library does next depends on this call_, and the restatement is what makes shape 3's refutation mechanical rather than a judgement: the `REPORTING`-seam delivery fails it because `ERROR_REPORTED` pays a terminal behind it, while `#panic`'s delivery is the last statement of the frame that closed.

## 4. What changes, and what does not

**No production change.** `#panic` satisfies all four clauses as written, in both of its sub-cases — the fault arose in `handle` whether or not a consumer callback had already closed the controller, so the _closure did not create it_ limb holds without the site reading anything. The predicate is satisfied at the site by a static property of where the fault came from, which is the outcome that costs nothing to implement.

**One production defect, and it is prose.** [`kernel.ts:813`](../../../src/kernel/kernel.ts) — _Delivering that report after logical closure is a named exception, and **the only one there is**._ False since D-176: the two `retireHooks` walks are also post-closure declared-slot invocations outside (a). Routed as **F-327**, tier B on the second limb — `src/kernel.ts` publishes this tier to behavior authors, and the sentence teaches them a false rule. The rest of that docblock's argument is correct and now has a named rule to cite.

**Two contract sites carry stale claims and are amended in place.** [`01`](../../contract/01-construction-ownership.md) calls the delivery _the second member of D-51's closed list_ — a list that did not have it, in a decision that no longer has a list; and the same document's _refused rather than delivered_ clause for teardown-step faults is now grounded rather than merely asserted.

**The falsifiable edge, stated so a later round can find it.** The clause that keeps teardown-step faults silent is _the closure did not create it_. If the package ever decides a disposer that throws during teardown is something the consumer must hear about, **that limb is what must be amended** — not the predicate's shape, and not act (a). D-29's totality is unaffected either way, and already forbids the state in which the rule would bite hardest: a throw from `#runPhysicalTeardown` itself reaching `#panic` would be a totality violation before it were an act-(a) question.

## 5. Disagreement with the routing

Q-22 offered three shapes and framed the choice as between them. **Two of the three were disposed of by evidence the census already held**, and the third was offered in a form that reproduces the defect its own parent decision cured. The useful question was not _which of these three_ but _why does the predicate have a purpose clause at all_ — and the answer is that D-176 inherited it from D-51 without re-deriving it, having spent its argument on the membership test and the list. That is worth recording: an amendment that supersedes one half of a rule is where the other half is least likely to be re-examined.