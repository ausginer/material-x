# s0-1 — what protects the terminal on the reporting route

**Architect, 2026-09-04, on `drag2/fin-review` at `c81883d6`.** Settles the contract question the Stage 0 feature proof routed in [`stage0-remediation-proof-claude.md`](stage0-remediation-proof-claude.md) §s0-1. Mints **D-179** and **F-328**, amends I-36's mechanism note and F-324's third group. Nothing implemented. `s0-2`…`s0-7` are out of scope and untouched.

## 0. What I verified, in this agent

`git diff 813ccb7c c81883d6 -- src tests` is empty, so the proof's evidence is live at the tip.

- **Two kernel routes reach `spec.finalized`**, not one: [`kernel.ts:1860`](../../../src/kernel/kernel.ts) in the join, and `:2473` in `#handleErrorReported`. F-324's third group justifies the slot by the first and does not name the second.
- **The join route revalidates; the reporting route does not.** `#joinLive()` at `:1855` sits one statement before `:1860`. At `:2467` the reporting route runs `this.#unwind(this.#operation.lifetimes.presentation.dispose)` and reaches `:2473` with no reading between.
- **The disposer is consumer-reachable, and the kernel says so twice.** `#startTail`'s own comment reads _the presentation disposers ran between the release and here, and they are consumer-reachable, so the controller may already be closed_, and the join's `finally` at `:1841` disposes for the same reason.
- **`finalized`'s whole body is the slot.** Both behaviors: `const { domain } = current; if (domain) { this.#slots.onEnd?.(domain); }` — [`sortable/spec.ts:1836`](../../../src/sortable/spec.ts), [`free-drag/spec.ts:1025`](../../../src/free-drag/spec.ts). Neither reads a latch, correctly.
- **`#joinLive()` cannot be reused here.** Its three conjuncts are `!#queue.closed && #current.operation !== null && #current.phase === FINALIZING`, and this route runs in `REPORTING`.
- **The trap already has a positive control.** [`kernel.browser.test.ts:2747`](../../../tests/kernel/kernel.browser.test.ts) — _should publish the terminal from the error route, after the release_ — asserts `finalized` on this exact route and orders it after `presentation.released`, citing D-66. Any repair that suppresses the terminal on the failure path turns that row red.

## 1. The site breaches two acts, not one, and that decides the exception question

`onEnd` is an invocable member of a published config key, so under D-176 it is a declared consumer slot and the call is **act (a)**. It is also **act (c)**: D-66 defines `onEnd` as _exactly-once **domain disposition**_, and (c) is _publishing another lifecycle or domain event_.

**D-178's exception reaches neither, and it fails on two independent clauses.** Clause 1's first limb — reached from teardown or unwind, or the last statement of the frame that closed — is false: `#handleErrorReported` is a queued action handler doing operation work, and `#retireOperation` follows it. Clause 3 is false outright, and it is false on **the limb D-178 restated**: no lifecycle or domain event published. A terminal disposition is a domain event by D-66's own definition.

That is the useful symmetry. The two post-closure consumer calls on this route sit eleven lines apart and land on opposite sides of the same line: `onError` at `#panic` passes because a fault report tells the consumer the library broke, and `onEnd` here fails because a terminal disposition publishes what happened to the consumer's data. **D-178's restatement of that limb is what makes the second answer mechanical**, and it would have been arguable under D-176's abbreviated _publishes nothing_.

## 2. The required behaviour is already decided; only the mechanism is open

**D-66 states the outcome.** _Every started operation **on a still-live controller** publishes one `onEnd`_, and the row's own `Touches` line reads _makes I-31 unconditional **except for `destroy()`**_. So this is not a new rule and not a new exception: the reporting route does not implement a rule D-66 already carries.

**The reading owed is the latch, and only the latch.** The entry check at `:2459` establishes `#current.phase === REPORTING` and `#current.operation === identity` before the dispose. Neither can change during it: a nested dispatch inside a running drain appends and returns — `drain` refuses re-entry on `queue.running`, and `#dispatchKernel` returns early once closed — and `#retireOperation` is not reachable from a disposer. **The one conjunct a consumer-reachable step can flip is the latch**, which is also the one I-36 names as the reading, and D-38 forbids answering the question from any physical-teardown observation.

**Recommended mechanism: a bare latch reading between the dispose and the call, not a second route predicate.** Three reasons, in order of weight.

1. **A named `#reportLive()` would look transferable, which is the defect.** `#joinLive()` looking like slot-wide coverage is precisely how F-324's third group came to be wrong. A second predicate of the same shape invites the same citation one round later.
2. **It would re-assert what the same handler just read.** The phase and identity conjuncts are established fourteen lines above and cannot have changed; a predicate re-reading them states an invariant the route does not have to restate.
3. **`CONTRIBUTING.md` §2.1.** A single-call private method is an inline candidate absent a meaningful semantic or invariant boundary. `#joinLive()` has one — three call sites across the join's foreign calls. A one-call reporting counterpart has none.

**Two properties the repair must hold, and the first is the trap.**

- **It must not require `FINALIZING`.** Reusing `#joinLive()` is the obvious repair and is silently wrong in the worse direction: the conjunct is false on this route by construction, so every classified failure would skip its terminal, retracting D-66 and reinstating the _"terminal callback is skipped after a consequential failure"_ rule D-66 explicitly retracted. `kernel.browser.test.ts:2747` catches it, which is the reason to name it here rather than trust it.
- **Skipping the terminal must not skip the retirement.** `#retireOperation(identity)` is the route's last statement and is unconditional today; a closed controller still owes the kernel's own cleanup, which defers with the transaction rather than being cancelled by it.

**Instrument obligation: one negative row, and the positive control already exists.** A presentation disposer that destroys on the `ERROR_REPORTED` route must produce no `onEnd`, with `:2747` surviving unchanged beside it. That is the same paired shape Stage 0's three repaired barriers already use, and the proof's own composed witness — a custom-element placeholder whose `disconnectedCallback` destroys, against an axis whose `resolve` throws at release — is the fixture.

## 3. What needs amending, and what does not

**Not I-36's obligation.** _At every site invoking a soliciting declared slot, and after any preceding consumer-reachable step in the same statement sequence, the invoking party reads the logical latch and stops_ is satisfied by this site's repair as written. The rule was right and the census misapplied it.

**I-36's mechanism note, yes.** It grounds (b) and (c) in an enumeration — _the closed latch is read by `dispatch`, `cancel`, `openIngress` and every boundary revalidation (`preparationValid`, `runAdmission`'s post-callback recheck, `settlementLive`, `joinLive`)_ — and the reporting route's terminal is a (c) publication with **no** entry in that list. The sentence's claim about participants stands; its enumeration does not.

**F-324's third group, yes.** _`onEnd` … reached through `finalized`, guarded by `#joinLive()` on the statement before_ is true of one of two routes and stated as though it were the slot's coverage.

**And the general rule the census was missing is minted as D-179**, because the mistake is reproducible and has a second instance already: the census counted **the behavior's delivery statement** — one per behavior — and justified it by **one of the kernel's routes**. Where the library reaches a slot through internal indirection, the unit of the obligation is the **route**, and a route predicate that happens to contain the latch discharges act (a) for its own route only.

## 4. Disagreement, and one thing the finding understates

**With the finding's reason, not its verdict.** s0-1 argues the D-178 exception does not reach the site because _the library's own next step is conditioned on the call having happened — `ERROR_REPORTED` pays a terminal behind it_. That is the argument for the **other** route: at `:2473` nothing is conditioned on `finalized` having happened, since `#retireOperation` is unconditional. The site is outside the exception for the two reasons in §1, both of which are stronger and neither of which depends on what follows the call.

**Understated: this is a breach of (c), and (c) is where the kernel had claimed structural safety.** The finding rates the site Tier A on (a), which is right and dominant. But I-36's argument for why (b) and (c) need no participant discipline is that the kernel revalidates at every boundary that publishes — and this is a published domain disposition on a boundary that does not. The (a) breach is a missing statement-level reading; the (c) breach is a gap in an enumeration the invariant leans on. They are repaired by the same line and they are not the same defect.

**Out of scope and still open**: `s0-2`…`s0-7` carry review-scope identifiers with no canonical entries, which is F-296's class for the third consecutive round. Only `s0-1` is minted here, as F-328, because only `s0-1` was routed.