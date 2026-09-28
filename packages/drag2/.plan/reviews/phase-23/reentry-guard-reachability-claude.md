# The seam re-entry guard, reassessed under the reachability gate

Architecture, 2026-08-28, at `fac8276e`. The ask: `CODE_OF_SIZE.md` §1.1 now makes reachability a **decisive gate** for production defensive machinery, and F-85 settled seam re-entry as unreachable through the supported behavior contract. Should the guard exist at all?

**Verdict: the guard stays, on a ground §1.1 does not supply — and the owner is right that the question was open.** The reachability claim holds and is re-derived here at the current tree. What does not follow is the deletion, because the guard is not machinery predicated on the state being reachable; it is the only instrument that keeps the claim true across edits. The sentinel changes: `throw null` rather than a symbol, which dissolves F-164 and F-166 together and is smaller.

**No production code changed.** Every edit here was made in a scratch copy under `/tmp/d153` or in a detached worktree, and both are outside the repository.

---

## 1. The concession: the record answers a neighbouring question

F-85 is cited as settling this, and D-117 (b) as settling what the site ships. Neither asks whether the check exists.

- **F-85's subject is a P-class**, not a check. Its row resolves _which of two incompatible reachability claims is true_ and concludes **P2**. Its next sentence is the tell: _"**P2 here gates nothing**: … so the check is load-bearing and ships in every build; only its 103-character sentence becomes an identity."_ The check's existence is the **premise** of that sentence, never its conclusion.
- **D-117 (b) governs the payload.** §1.1 says so in its own words: _"This section decides whether a check exists; §1.3 decides whether its message ships. They are different questions with different answers and they are routinely conflated."_

So the answer on the record is: _given the check, the message is withdrawn._ The owner asked the prior question and it has never been asked. **This is F-155's shape exactly** — citing a decision that answers the downstream question as though it had settled the upstream one — and it is the second time in a week, which is why it is filed rather than fixed quietly (F-168).

## 2. The reachability claim, re-derived at `fac8276e`

F-85's proof was taken on 2026-08-23 and the tree has moved four times since (`cdc83990`, `25084a9c`, `dc2a1d4c`, `1697d31a`). Re-derived from scratch, not carried forward.

**Eleven phase-opening call sites**, all in `kernel.ts` — F-85 counted nine, so the count itself has drifted and the proof would have been stale had it not been retaken:

| Site | Opener | Enclosing | Entered from |
| --- | --- | --- | --- |
| [1273](../../../src/kernel/kernel.ts#L1273) | `runActivationSeam` → `runCore` | `activate` | `handleMove` (threshold), `handleActivate` |
| [1520](../../../src/kernel/kernel.ts#L1520) | `runUnclassifiedValue` | `armSettlement` | `openSettlement` |
| [1608](../../../src/kernel/kernel.ts#L1608) | `runLeaf` | `armSettlement` | `openSettlement` |
| [1727](../../../src/kernel/kernel.ts#L1727) | `runLeaf` | `joinSettlement` | `advanceSettlement` |
| [1759](../../../src/kernel/kernel.ts#L1759) | `runLeaf` | `joinSettlement` | `advanceSettlement` |
| [1797](../../../src/kernel/kernel.ts#L1797) | `runCore` | `openSettlement` | `settleCancellation`, `handleResolutionSettled` |
| [1951](../../../src/kernel/kernel.ts#L1951) | `runLeaf` | `handleMove` | handler |
| [2007](../../../src/kernel/kernel.ts#L2007) | `runReleaseSeam` → `runCore` | `closeOperation` | `handleUp`, `handleRelease` |
| [2284](../../../src/kernel/kernel.ts#L2284) | `runCore` | `handleFailed` | handler |
| [2353](../../../src/kernel/kernel.ts#L2353) | `runLeaf` | `handleErrorReported` | handler |
| [2369](../../../src/kernel/kernel.ts#L2369) | `runCore` | `handleBehaviorAction` | handler |

Every root is an action handler. `handle` is passed to `drain` at exactly two sites — [720](../../../src/kernel/kernel.ts#L720) and [1084](../../../src/kernel/kernel.ts#L1084) — and is invoked nowhere else. [`drain`](../../../src/kernel/queue.ts#L73) returns immediately while `queue.running`. **Admission opens no phase**: `openIngress` runs outside the drain with its own `admitting` latch and makes no `driver.` call, which is F-85's finding unchanged.

**Two nesting vectors, and only one is what the guard names.**

- **A behavior calling the driver** is impossible by scope, not by argument: `SeamDriver` is created inside `createDraggable` and never escapes. Nothing outside `kernel.ts` can name it.
- **The kernel opening a phase from inside foreign code** is the real vector. Every behavior- and consumer-facing entry that could provoke it — `KernelHost.dispatch/fail/cancel/destroy`, the controller's methods, `LandingHandle.done`/`fail`, `ReorderResolution.accept`/`reject`, a thenable settling synchronously — reaches `dispatchKernel` and **enqueues**. `destroy()` is the one that does not queue, and `runPhysicalTeardown` runs `spec.retire` through `unwind`, not through the driver.

The claim holds. **It is also unpinned**: nothing in 1,195 tests fails if a twelfth site appears outside `handle`, and nothing fails if `failOperation` is made synchronous. That is the fact the decision turns on, and §5 returns to it.

## 3. What the guard does _not_ cover, which narrows the claim in the other direction

`runPhase` clears `openStage` **before** its classification arms, so the guard's window closes one statement early:

```
openStage = NO_STAGE;   ← window closes here
if (reentry) { … }
… context.fail(stage, raised)   ← runs unguarded
```

`context.fail` is `failOperation`, which enqueues, so nothing nests today. But a future edit that opened a phase from the classification path — the path **D-152 routed six more sites onto** when the rejection arms became throws — would not be refused. The guard covers foreign-code nesting, which is what its own JSDoc claims (_"the only place this module runs foreign code, and therefore the one boundary the re-entry guard has to cover"_), and no more. Recorded as **F-167**, a coverage boundary rather than a defect.

`requestFailure`'s two `context.notify` arms _are_ inside the window, since `openStage` is still set there.

## 4. The counterfactual, constructed and run

§1.1 requires this: _"construct the shape the check rejects, let the code take it, and look at what the library actually ends up holding."_ A copy of `seams.ts` with the guard neutralised, driven with the real `begin`/`commit` semantics from `kernel.ts` (`Object.assign(draft, current)` then a reference swap), nesting one committed transaction inside another:

```
--- nested from prepare ---
  inner outcome : 3 (SEAM_COMMITTED)
  outer outcome : 3 (SEAM_COMMITTED)
  published frame: {"phase":"ACTIVE","mark":"clean"}
  staged value  : {"who":"outer"}
  diagnostics   : (none)

--- nested from effect ---
  inner outcome : 3 (SEAM_COMMITTED)
  outer outcome : 3 (SEAM_COMMITTED)
  published frame: {"phase":"INNER-PHASE","mark":"inner"}
  staged value  : {"who":"outer"}
  diagnostics   : (none)
```

**The record's own description of this failure is wrong, and the truth is worse.** `seams.ts` and F-85's row both say a nested `begin()` _"publishes a half-built frame"_. It does not, because the frames are swapped an **even** number of times:

- Nested from `prepare`, **neither transaction lands**. `current` is untouched — the release never happened — and both seams report `SEAM_COMMITTED`. In the kernel that is a stamp that never applies and an operation that stalls at its current phase with an accepted resolution behind it.
- Nested from `effect`, the outer's committed frame is **replaced wholesale** by the inner's, and the staged command executed against it belongs to the outer.

Both report success. **Zero diagnostics on either path.** This is §1.1's own worst case verbatim: the code _"succeeds and does the wrong thing."_

With the guard in place, the same two probes escape `runCore` to the drain and panic, with nothing staged and nothing classified — which is the designed behavior.

## 5. Does §1.1's gate reach this check?

**No, and the reason is structural rather than convenient.**

§1.1 opens with what it is for: _"Do not protect consumers from mistakes that are already their responsibility."_ Its gate question is _"is this state reachable through correct use of the public contract"_, and its consequence is _"the library owes no runtime machinery for it"_ — where the party owed is the integrator who left the contract. Every worked example in the section is a value crossing a published boundary: a duration, a resolver's return, an array's element identity, a validator's six checks.

**The re-entry guard has no such party.** No integrator, author, end user or platform can produce or prevent the state; nothing has "left the contract", because nothing outside the library is involved. Read literally, the gate closes on it — but read literally it closes on **every internal assertion in the package**, including the eight P2 sites D-117 shipped four days earlier and `assertFrameScrubbed`, which §14 governs on frequency. A reading that deletes a decision made under the same document, in the same week, is the wrong reading.

**`CODE_OF_SIZE.md` says so about itself, twice, and both are checkable.**

- §1.1 states that it _"is the one rule here that can **reopen** a settled outcome without any new measurement, **so where it does, this document says which outcome**."_ It names exactly one: the three surviving keeps of the six-check validator split, which are _"re-put rather than confirmed"_. The re-entry latch is not named.
- §0 cites **this very site**, by name and by measurement, as the canonical example of a cost that is not a cost: _"a re-entry latch on a per-sample path cost ~1 ns — two predictable branches and an assignment, 0.04 % of a pointer sample, **a cost that does not exist**."_

So the document, read as a whole, does not reopen this. **That is not an argument for keeping it** — it only says the gate is silent, and something else has to speak.

## 6. The decision: the guard is the instrument, not the machinery

**D-153. The seam re-entry guard, its latch and its unwind stay. The ground is that the guard is what keeps F-85 true, not something F-85's truth makes redundant.**

Three things carry it.

**(a) It is the enforcement point of a precondition four other pieces of production state read.** Not a validator standing beside the code — the thing the code is written against:

- `actionTag`/`actionArgument` are single slots: _"Safe as a slot: seams are non-reentrant."_
- `failureRequested` and `unclassifiedReason` are phase-scoped singles: _"the driver runs exactly one phase at a time (`refuseReentry`)"_ — the doc names the guard as the reason.
- `runStamped`'s `finally` exists for _"the one window `begin()` cannot cover: a seam that throws before opening its transaction — **today only the driver's re-entry refusal**"_. Delete the refusal and that `finally` loses its only cited trigger.
- `consumeStaged`'s clear-on-open assumes one transaction at a time; §4 shows what two do to it.

Delete the guard and four stated properties become unstated assumptions held by a call-graph audit in a different module.

**(b) The reachability claim is unpinned, and the guard is the cheapest pin there is.** F-85's proof has now been derived by hand **three** times — by `seams.ts`'s own doc (wrongly), by audit B-6 and F-85 (rightly), and by §2 here, where the site count had already drifted from nine to eleven. Nothing in the suite fails when it stops being true. Under §1.1's own standard — _"make the claim where it can be examined"_ — an unmaintained proof is the weakest form the claim can take, and deleting the guard on its strength takes the package from two enforcement points to **zero**. The guard is not justified _by_ reachability; it is what makes reachability survive the next edit, and it fails **loudly and immediately**, in the first test that touches the path, rather than as §4's silent success.

**(c) The failure it prevents is the one class this package treats as non-negotiable.** Not a worse error message and not a crash: two transactions reporting `SEAM_COMMITTED` over a frame that holds neither, with no diagnostic anywhere. §1.1's instruction is to _"run the counterfactual to the end and ask what the library is left **doing**"_ — and what it is left doing is publishing a lifecycle it did not perform.

**(a) and (b) are a new ground and I want that visible.** §1.1 does not supply it, D-117 does not supply it, and if the owner rejects it the deletion follows immediately. §7 prices it so that decision can be taken without further work.

## 7. What the deletion would cost, if the ground is rejected

Priced rather than asserted. `refuseReentry`, the `reentry` latch, the `REENTERED` sentinel, both call sites and the unwind block, removed from a detached worktree at `fac8276e` and measured with the package's own instrument:

| Composition | `fac8276e` | guard removed | Δ Brotli |
| --- | --- | --- | --- |
| minimal | 9.92 kB | 9.87 kB | **−50 B** |
| minimal (xy) | 9.57 kB | 9.54 kB | −30 B |
| minimal + layoutAnimation | 10.36 kB | 10.31 kB | −50 B |
| minimal + landing | 10.18 kB | 10.13 kB | −50 B |
| complete | 10.60 kB | 10.55 kB | −50 B |
| free drag minimal | 7.75 kB | 7.71 kB | −40 B |
| free drag + bounds | 7.89 kB | 7.87 kB | −20 B |
| free drag + landing | 8.00 kB | 7.97 kB | −30 B |
| free drag complete | 8.15 kB | 8.11 kB | −40 B |
| both behaviors | 11.93 kB | 11.88 kB | −50 B |
| kernel root — `kernel.js` | 6.06 kB | 6.03 kB | −30 B |
| baseline A | 10.38 kB | 10.34 kB | −40 B |
| **vocabulary root — `drag.js`** | 0.14 kB | 0.14 kB | **0** (control) |
| **baseline B — shipped sortable.js** | 6.89 kB | 6.89 kB | **0** (control) |

**The whole guard is worth 20–50 B Brotli**, and both control rows are unmoved, which is what says the ablation touched only what it should. Two builds in detached worktrees at `fac8276e`, measured with the package's own instrument; the instrument reports to 10 B, so these deltas carry one significant figure and no more. Under §0 that figure answers nothing on its own — the same section prices this site's _runtime_ cost at ~1 ns and calls it a cost that does not exist — but it is what the deletion buys, and it is small enough that the contract question is the whole question.

Beyond bytes, in the same pass:

- `runStamped`'s `finally` loses its cited justification and becomes a second deletion candidate — check what else can throw before `begin()` before taking it.
- The thirteen re-entry rows in `tests/kernel/seams.node.test.ts` and `expectReentryPanic` go with it, and **nothing replaces them**: they assert the guard, not the invariant. The invariant would need either a standing promotion of F-85's adversarial probe (13 vectors × 12 seams) or a source-level assertion that the `driver.run*` call sites are exactly the set enclosed by `handle`.
- **F-164 and F-166 dissolve** — there is no second sentinel and nothing on `cause`.
- Contract 02's guarantee table and four source comments lose their mechanism and need rewriting to name `queue.running` instead, which is a weaker claim in a different module.

## 8. F-164 and F-166 reconciled: throw `null`

Both findings are consequences of the sentinel's _value_, and one change answers both at negative cost.

**Replace the `REENTERED` symbol with `null`.** `refuseReentry` and the unwind both `throw null`.

| Property the symbol was chosen for | `null` |
| --- | --- |
| carries no message to leak | yes — and no declaration at all |
| the constructor adopts nothing, mints `drag: controller destroyed` | yes: `null instanceof Error` is `false`, `stage === null` |
| the driver never consults the raised value | unchanged — `reentry` is the whole decision (review §2, falsified) |
| `'cause' in error` still true | yes, the constructor passes `{ cause }` unconditionally |

- **F-164 dissolves.** There is no second module-private sentinel, so `const REENTERED = FAILED` has nothing to be written as. The property `FAILED`'s JSDoc claims — distinguishable from every legal value — is restored to being about one symbol.
- **F-166 dissolves.** `` `${null}` `` is `'null'`; the `TypeError` that made `notify` swallow a consumer's `onError` and lose the report is gone. Verified: `` `${e.cause}` `` throws for a symbol cause and does not for `null`.
- **It is smaller**, by one declaration and its twelve-line comment.

One behavioral difference to state rather than discover: `null` is **falsy**, so a consumer writing `if (e.cause)` sees nothing where a symbol was truthy. That is already out of contract — D-152's published negative says nothing may branch on `cause` — and `null` is the truer reading, because on this path there is no cause.

`throw null` still needs the `only-throw-error` suppression; the count is unchanged at two. The test helper's `NOTHING_THROWN` sentinel already separates _nothing thrown_ from _something falsy thrown_, so `expectReentryPanic` narrows from `typeof === 'symbol'` to `=== null` and keeps its discrimination.

**F-165 is unaffected by any of this** and is a straight correction to two stated ranges in `bundle-structure.md`.

## 9. Findings

- **F-167** (tier C) — _The re-entry guard's window closes one statement before the classification arms._ `runPhase` sets `openStage = NO_STAGE` ahead of `context.fail`, so a phase opened from the classification path would not be refused — and that is the path D-152 routed six further sites onto. Nothing nests today, because `context.fail` is `failOperation` and it enqueues; the finding is that the guard's coverage is _foreign-code nesting_ and the module's doc says so, while the record has been reading it as _nesting_. §3.
- **F-168** (tier B) — _A settled row was read as settling the question one level up, four days after the same mistake was filed as F-155._ F-85 resolves a **P-class** and D-117 (b) governs a **payload**; §1.1 states in its own text that the check's existence and the message's shipping are different questions. Both were being read as having closed this one. **The recurrence is the finding**, not the instance: F-155 was filed against a citation in prose, this one against a citation in a ledger row, and the second was not prevented by the first. The general form is F-94's — _a citation is not a reading_ — at one remove: **a decision's answer is not an answer to its neighbour's question**, and the check is to state which question a cited row asked before relying on what it concluded. §1.

## 10. What would falsify this

- **§2** — find a `driver.run*` call site outside `handle`'s call tree, or a behavior- or consumer-facing entry that reaches one without passing through `enqueue`. `destroy()` is the one unqueued entry; showing that `runPhysicalTeardown` can open a phase would refute the claim directly.
- **§4** — the probe is forty lines against a patched copy of the real `seams.ts` and reruns in seconds. A published frame that held the outer transaction, or any diagnostic at all, would refute it.
- **§6 (b)** — write the pin. If a source-level assertion over the eleven sites turns out to be cheap and total, the guard's second justification weakens to (a) and (c) alone, and the deletion is worth re-taking on that narrower ground.
- **§8** — `node -e "const e = new Error('x', { cause: null }); console.log(\`${e.cause}\`, e.cause instanceof Error)"`.