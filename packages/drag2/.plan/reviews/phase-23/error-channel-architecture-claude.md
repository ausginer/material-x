# One error channel, two error classes

Architecture decision, 2026-08-25. Sites traced at `3944c5d3`; **re-verified at `87604f76`** after the source-shape pass landed three commits mid-review — the `report()` and `guarded()` populations are still 17 and 17, `reporter.ts` is unchanged, and every line number cited below still resolves. **No production code changed.** Every `report()`, `guarded()`, `host.fail`, `reportFailure` and `onError` site was traced mechanically before the model below was fixed; the per-site answers are §3 and §4.

The target rule, as commissioned: **reporting destination must stop encoding failure severity.** One explicit channel to the consumer; whether a fault changes the operation is a property of the failure path, not of the channel.

---

## 0. Verdict

**The two-class hypothesis survives every reachable path, with two riders.** It is not a new idea in this package — it is the generalization of a decision already taken and already argued. D-49 wrote, of the quality track:

> the channel and the tier are chosen independently here: `onError`, no `REPORTING` phase, no `OUTCOME_FAILED`, terminal callback intact.

and contract 02 states the corollary outright: _"I-29 constrains what a quality failure may **do**, never which channel tells the consumer about it."_ This decision applies that sentence to the whole population instead of to one site.

```text
one explicit onError channel
         │
         ├── DraggableError      — the operation's outcome is affected
         │
         └── DraggableWarning    — the operation's outcome is not
```

**Rider 1 — the discriminator is _outcome_, not _effect_.** One reachable site (`settlement/hold-unavailable`) changes what the user _sees_ — an animated landing becomes a jump cut — while the terminal result, the phase sequence and the settlement are identical. The line has to be drawn precisely or that site has no home:

> **A fault is consequential when it changes the operation's terminal result, its phase sequence, or its settlement.** Trajectory, timing and presentation quality are not outcome.

**Rider 2 — `panic()` needs a contract amendment, and it is the only one.** It destroys the controller _before_ it reports, so at report time D-37 forbids invoking a declared consumer slot. §8.

---

## 1. The one channel — exact semantics

One internal function, reached from every reporting site. It does exactly three things and nothing else:

1. **Refuses to run after logical closure**, except for the named `panic` exception (§8). This absorbs three ad-hoc pre-guards that already exist at [`kernel.ts:727`](../../../src/kernel/kernel.ts), [`kernel.ts:830`](../../../src/kernel/kernel.ts) and [`kernel.ts:1547`](../../../src/kernel/kernel.ts), each citing E-03 / I-31 / D-53 — _"a resolver that calls `destroy()` and then throws would otherwise have its own destruction reported back to it through a declared `onError`."_
2. **Invokes the consumer's `onError`** with one argument.
3. **Catches and discards anything that call throws.** This is the terminus. A throw from the channel is **never** re-notified — that is the only rule that makes the channel non-recursive, and it is why the discard is here and nowhere else.

**It is delivered at most once per fault** and it never replaces an initiating error — the existing `onError runs in REPORTING, exactly once per failure` guarantee is unchanged.

**Four sites have no route to it today, and that is the main implementation cost of this change.** [`lifetimes.ts`](../../../src/kernel/lifetimes.ts) holds no controller reference (`createLifetime` closes over `disposers`, `controller`, `finalized` and nothing else); [`presentation.ts`](../../../src/kernel/presentation.ts)'s `acquireTopLayer` is a free function taking only `visual`; and both `assemble.ts` unwinds run at **composition time**, before `arm()`, when no `spec` exists at all. Each needs a notifier threaded at construction. The two `assemble.ts` sites are the easy half — `merged.onError` is already in hand in [`behavior.ts`](../../../src/sortable/behavior.ts) before `assemble` is called, so the existing `FeatureContext.report` member keeps its signature and only changes destination.

---

## 2. The two classes

### 2.1 `DraggableWarning` — the name, and why not the others

Recommended: **`DraggableWarning`**, published from `drag.js` beside `DraggableError`, for the reason D-64 already gives for that placement — a kernel-tier author and an ordinary consumer both need to recognise it, and neither should import the other's entry to do so.

It is the ordinary English word for _something you should see that did not break what you asked for_, and `Warning` as an `Error` subclass is an established idiom. **The objection is that "warning" sounds like a severity rank, and this model is explicitly not ranking severity** — that is answered rather than dodged: the class encodes **consequence**, and a consequence-free notification is exactly what the word denotes. It says _nothing was replaced_, not _this matters less_.

Rejected: `NonFatalDragError` (nothing here is fatal — no operation crashes, so the negation names a state the model does not have), `ReportedError` (vacuous — both classes are reported, which is the whole point of the change). Runner-up: `DraggableNotice`.

### 2.2 It must **not** extend `DraggableError`

The single most important structural constraint, and the easiest to get wrong. `err instanceof DraggableError` is already published and already means _my operation was affected_. If the warning extended it, every existing handler would silently begin treating advisory diagnostics as operation failures — the exact coupling this change exists to remove, reintroduced through the type graph.

**Both extend `Error` directly. No shared base.** A base class would be a third published name earning nothing: the callback's parameter is a two-member union, which needs no supertype to be written down.

### 2.3 The warning carries **no code**

`DraggableError.code` is a coarse _fault attribution_ — `'consumer' | 'interaction' | 'presentation' | 'platform'`. The traced warning population does span all four attributions, so a code would be _meaningful_; the question is whether a consumer would **branch** on it, and nothing in the population suggests they would. Every realistic handler logs it.

So: **message plus `cause`, and nothing else.** Adding a field later is additive; publishing one now freezes it (§4 permanence). Where two current sites report a caught error _and_ a library-authored companion naming why — [`seams.ts:512-513`](../../../src/kernel/seams.ts) — the two collapse into one warning whose message names the reason and whose `cause` carries the caller's error. That is the pattern for the whole population, and it is why `cause` carries the weight a code would otherwise have.

---

## 3. Disposition of every `report()` site

**No current `report()` payload is consequential under §0's definition.** All sixteen become `DraggableWarning`. That is the strongest single result of the audit: the platform channel is not carrying a mixed population that needs splitting — it is carrying exactly one kind of thing, to the wrong audience.

| # | Site | Payload | Outcome affected | Disposition |
| --- | --- | --- | --- | --- |
| 1 | `lifetimes.ts:71` | authored `lifetime/use-after-dispose` | no — resource still released, eagerly | warning; needs a notifier threaded |
| 2 | `lifetimes.ts:76` | caught, late disposer | no | warning; same |
| 3 | `lifetimes.ts:107` | caught, disposer in LIFO loop (I-19) | no — `catch` is inside the loop by design | warning; same |
| 4 | `seams.ts:402` | caught, `rollback` throw or fail-then-throw | no — `FAILED` is set before the branch, returned after | warning |
| 5 | `seams.ts:426` | authored `seam/staged-unconsumed` | no — cleared on the next line | warning, **if it survives** (§3.1) |
| 6 | `seams.ts:512` | caught, `host.fail` outside a classifiable phase | no — the classification is denied, not applied | warning, merged with #7 |
| 7 | `seams.ts:513` | authored `fail-outside-seam` / `fail-during-rollback` | no | merged into #6 as message + `cause` |
| 8 | `kernel.ts:608` | **panic** — caught, often `seam/re-entered` | the _throw_ destroys the controller; the report does not | **`DraggableError`** — see §8 |
| 9 | `kernel.ts:686` | caught — `failOperation`'s five-guard demotion | no — the `return` decides, and the terminal is already owned | warning |
| 10 | `kernel.ts:895` | caught — `mintOperation` arming failure | no — frames never written, `return false` refuses admission | warning (§3.2) |
| 11 | `kernel.ts:1295` | authored `settlement/hold-unavailable` | **trajectory only** — jump cut, same terminal | warning (§0 rider 1) |
| 12 | `kernel.ts:1611` | caught — `LandingHandle.destroy()` at the join | no — `attempt.relinquished` has no reader | warning |
| 13 | `kernel.ts:2103` | `checkpoint.error` — I-22 precedence demotion | no — the `return` decides; cancel owns the terminal | warning |
| 14 | `kernel.ts:2322` | authored `dispatch/tag-out-of-range` | no — reported and dropped | warning, **if it survives** (§3.1) |
| 15 | `sortable/assemble.ts:232` | caught — nested `retire` during construction unwind | no — `throw error` is unconditional | warning via `FeatureContext.report` |
| 16 | `free-drag/assemble.ts:172` | same | no | same |

### 3.1 Two sites have a live delete-or-gate question of their own — do not bundle it

`seam/staged-unconsumed` (#5) is reachable **only by a library defect**, and `dispatch/tag-out-of-range` (#14) is one of the two guards D-124 did not reach and is **open under F-97**, whose shipped `.d.ts` publishes the precondition _and_ promises the guard. Whether either check should exist is a §1.1-gate and D-117-provenance question, decided elsewhere. **This decision routes whatever survives** and takes no position on survival. Bundling them would make an error architecture depend on a guard audit and vice versa.

### 3.2 One site stops being forced

`kernel.ts:895` is documented today as the one place the platform report is unavoidable: `operation` is a local never published to the frames, so `failOperation` would degrade anyway. **Under the new model that reason evaporates** — the channel is operation-independent, because a warning needs no operation and no stage. It is worth stating because it is the clearest single demonstration that the old coupling was structural rather than incidental.

### 3.3 One silent drop becomes a report

[`kernel.ts:2110-2116`](../../../src/kernel/kernel.ts) returns on a stale checkpoint or a second checkpoint during a report **with no report on either channel** — the one place an error vanishes entirely. Under a single channel it should emit a warning. Recorded as F-103.

### 3.4 Three sites hold a stage and throw it away

`kernel.ts:2103` (`checkpoint.stage`), `kernel.ts:686` (the `stage` parameter) and `seams.ts:512` (the caller's) each have a real stage in hand and discard it. **They should keep discarding it.** In all three the stage describes a classification the kernel has just decided _not_ to apply; carrying it into the warning would publish a claim about the operation that the code deliberately refused to make. This is the audit's clearest evidence that a stage-less warning is the honest shape rather than a missing feature.

---

## 4. Disposition of every `guarded()` site

`guarded()` does **two** jobs that this change separates:

- **route the error somewhere** — which becomes the one channel, everywhere;
- **let the caller continue** — which is a real, shared lifecycle rule and survives.

Of the seventeen sites, **none alters the operation's outcome**, and fourteen share one rule.

**Category A — unwind totality (14 sites). `guarded` survives, unchanged in shape.** `presentation.ts:221` · `kernel.ts:430, 460, 487, 492, 521, 524, 1535, 1550, 2211, 2413` · `free-drag/spec.ts:909` · `sortable/spec.ts:724, 1704`.

The rule is _the statement after this call is load-bearing_ — another resource to release, another teardown step, or the original error to rethrow. Ten are literal multi-resource releases (three are `for` loops over installer disposers or an undo ledger). This is D-29's totality, I-19's best-effort LIFO and I-6's terminal `destroy()`, and [`kernel.ts:452-458`](../../../src/kernel/kernel.ts) states the counterfactual in so many words: unwrapped, a throw _"would skip the second scrub and the ingress abort, making `destroy()` non-terminal."_

**So `guarded()` genuinely deserves to exist** — but its module does not keep its name. `reporter.ts` is named for a channel it will no longer own; the helper should be named for the rule it expresses (the unwind must be total), not the destination it used to write to. And it can no longer be a free function: its `catch` now needs the controller's channel, so it becomes a closure created per kernel, or takes the notifier.

**Category B — not unwind (3 sites). All three leave.**

- `kernel.ts:729` and `kernel.ts:831` wrap `spec.reportFailure`, i.e. **the consumer's `onError` itself**. These are not a use of `guarded` — they are the channel's own guard, open-coded twice. They collapse into §1's single discard.
- `free-drag/spec.ts:311` wraps `constrain.invalidate` inside a native passive scroll/resize listener. Nothing is pending, the reason for surviving is entirely local (_"a native scroll listener is not a seam"_, and `invalidate()` is a staleness flag), and it is one call. **A local `try`/`catch` calling the channel is clearer here**, which is exactly the shape the commission suggested — and it is the only site where that shape wins.

---

## 5. Consequences for `host.fail` and `BehaviorSpec.reportFailure`

**`host.fail(stage, error)` — unchanged.** It classifies, selects recovery and queues a checkpoint. The stage is doing real work there and it is behavior-owned (D-24, F-33). Nothing in this decision touches it.

**`BehaviorSpec.reportFailure(stage, error)` — replaced.** Its two callers split under the new model: admission is consequential (the consumer's drag will not start, and no `onEnd` will follow), the landing measurement is not. So the member stops carrying a stage and starts carrying the finished error:

```text
reportError(error: DraggableError | DraggableWarning): void
```

The **kernel** constructs the public error; the **behavior** forwards it to `onError` and does nothing else. Two consequences, both good:

- The failure site already knows whether it is consequential, which is the commission's own constraint — nothing downstream decides a transition by `instanceof`.
- Contract 02 worries that publishing stages and codes without the mapping would let _"`code` mean something different depending on which behavior raised it."_ Kernel-owned construction removes that risk **structurally** rather than by publishing the mapping — which means `toDraggableError` can leave the published kernel surface, provided the settlement input carries a built error alongside the stage it already carries for recovery. **Separable**: it is the natural second step, not a precondition.

**Three seam tiers collapse to two.** Today [`seams.ts`](../../../src/kernel/seams.ts) has `FailureStage` (classified), `QUALITY = -2` (onError, no settlement) and `BEST_EFFORT = -1` (platform, no settlement). Once the channel is single, `QUALITY` and `BEST_EFFORT` differ in **nothing** — both report without classifying — so they become one sentinel.

---

## 6. The two `onError` contexts — delete both

`SortableErrorContext` and `FreeDragErrorContext` each carry one member, `domain`, and it is **strictly redundant**. Proved rather than asserted:

- The only non-null producer is the settlement-failure path, which passes `current.domain` ([`sortable/spec.ts:1552`](../../../src/sortable/spec.ts), [`free-drag/spec.ts:777`](../../../src/free-drag/spec.ts)).
- `finalized()` publishes **that same `current.domain`** to `onEnd` ([`sortable/spec.ts:1670`](../../../src/sortable/spec.ts)), and D-66 makes the terminal unconditional — _"no failure of any tier suppresses the terminal."_
- So `domain` non-null ⟹ the operation started ⟹ `onEnd` fires with the same value. Where no operation started, both are `null` and no terminal is owed.

It is also _worse_ than redundant on one path: `onError` runs in `REPORTING` and `onEnd` in `FINALIZING`, so a second failure arriving between them can leave the context's `domain` **stale** relative to the terminal the consumer is about to receive. A stale copy of a value the next callback delivers correctly is not a feature.

**So `onError` becomes one argument, in both behaviors.** Two published types leave the surface. `SortableOnDragError` and `FreeDragOnDragError` become structurally identical, which retires the _necessity_ half of D-109's qualification for that one name — the rule is _qualify when two entries need different structures under one word_, and they no longer do. **Recommendation: keep the qualified names anyway**, for symmetry with `OnStart` and `OnEnd`, whose structures still differ; record that the reason changed from necessity to consistency so a later reader does not mistake it for an oversight.

---

## 7. The teardown rule, at its smallest

The commission asks for the smallest rule making _one failing notification must not prevent the library from releasing other resources it still owns_ true.

> **The channel is the only place in the library that guards a consumer notification, and `guarded` is the only place that guards an unwind step.**

That is the whole rule, and it works because the two obligations are separated:

- `notify` never throws (§1.3), so
- `guarded` stays total without knowing anything about reporting, and
- no site needs both.

**No defensive callback machinery anywhere else.** The library does not protect the developer from a throwing `onError` in general — it protects _its own release sequence_ from one, at exactly one site. And because `notify` never throws, the fourteen Category A guards keep working unchanged when their `catch` starts calling it.

**Reentrancy that genuinely remains.** Two things, and only two:

- **Post-closure suppression** (§1.1). Consumer code inside `onError` may call `destroy()`; every later notification must then be refused. This is E-03 / I-31 / D-53, unchanged in substance and now enforced in one place instead of three.
- **Panic's ordering** (§8), which is the one case the suppression rule cannot simply apply to.

Everything else the old model reasoned about here was a consequence of the platform channel being _unable_ to re-enter the library, and disappears with it.

---

## 8. `panic()` — the one contract amendment, and it needs the owner's assent

```ts
const panic = (error: unknown): void => {
  void destroy();
  report(error);
};
```

**Panic is consequential** — it destroys the whole controller, not one operation — so it is a `DraggableError`, not a warning. It carries **no stage**, and it must not be given one: the commission is explicit, and `FailureStage` classifies faults _within_ an operation. `DraggableError`'s public constructor already takes a **code** directly, so the site picks `'platform'` and no stage is manufactured. That `code` is the primitive and `toDraggableError` is only one way to choose one is a fact the current design already relies on; panic makes it visible.

**The problem is ordering.** `destroy()` runs first, deliberately: D-36 reversed contract 01's Part I ordering, and the justification is specific —

> the deferral window is one stack frame wide and the only statement inside it is `report` — which touches no library state, and meets an already-closed controller if the reporter calls back in.

Replace `report` with `onError` and every clause of that justification fails: consumer code _does_ touch library state and _can_ call back in. Meanwhile D-37 forbids invoking a declared consumer slot after logical closure. So the two rules that currently coexist stop doing so.

**Recommended: notify after closure, and extend D-37 (a)'s named exception list.** D-51 already established both the mechanism and the precedent — a closed, enumerated list, currently one member (`LandingHandle.destroy()`), with a discriminating property. The property extends honestly: a terminal error report _tells_ the consumer something and asks nothing of them, publishes no lifecycle or domain event, ignores its return value, performs no operation work, and is wrapped. D-51's own words are _"relinquishment returns something to the consumer, it does not ask anything of them"_, and a final diagnostic is the same shape.

**The alternative, and why it is worse.** Reversing to report-then-destroy keeps D-37 untouched but runs consumer code on a controller whose invariants are _already known to be broken_ — that is what a panic means — with the added hazard that the consumer may start work the next statement tears down. Notifying after closure runs the same consumer code with the controller definitively shut, which is the more predictable of the two.

**This is a real amendment to D-36/D-37 and I am not treating it as a detail.** It is the one place the one-channel rule cannot be satisfied by routing alone, and it should be assented to explicitly rather than absorbed into the slice.

---

## 9. Public API changes

**Added** — `drag.js`: `DraggableWarning` (class, therefore a runtime export, same placement argument as `DraggableError` under D-64).

**Removed** — `sortable.js`: `SortableErrorContext`. `free-drag.js`: `FreeDragErrorContext`. `kernel.js`: `toDraggableError`, **if** §5's separable second step is taken. `FAILURE_LANDING_TARGET` leaves the `FailureStage` union (§10).

**Changed** — `SortableOnDragError` / `FreeDragOnDragError` take one argument. `BehaviorSpec.reportFailure` becomes `reportError` and stops taking a stage. `SeamContext.reportQuality` and `SeamDriver.runQualityValue` are deleted. `FeatureContext.report` keeps its signature at the middle tier and changes destination — a published member whose meaning improves without its shape moving.

**Unchanged** — `DraggableError`, `DraggableErrorCode`, `host.fail`, `FailureStage` and the remaining twelve stage constants.

---

## 10. What disappears entirely

- **`globalThis.reportError` / `console.error`.** The whole platform destination, and with it `reporter.ts`'s reason for its name.
- **`report()`** as a function: replaced by the channel.
- **The `QUALITY` tier** — the `-2` sentinel, `runQualityValue`, `SeamContext.reportQuality`, and the `guarded` wrapper at `kernel.ts:729`.
- **`FAILURE_LANDING_TARGET` (12)** — its only producer is the `QUALITY` caller, so the stage leaves the union and `12` becomes a second documented hole beside D-41's `13`. **Verify no second producer before deleting**; the number must never be reused (`failures.ts`'s standing rule).
- **Two published context types**, and the `domain: null` literal at both `reportFailure` sites.
- **Three open-coded post-closure pre-guards**, absorbed into §1.1.
- **The stage argument on the reporting SPI** — not the stage _concept_, which `host.fail` keeps.

Net: thirteen stages become twelve, three seam tiers become two, two sentinels become one, one reporting SPI member replaces two mechanisms, and one destination replaces two.

## 11. Tests

**Rewritten** — every assertion that observes the platform channel: **42 references across 14 files** (`tests/kernel/{lifetimes,seams,presentation,kernel}`, `tests/sortable/{sortable,composition,features,displacement,keyboard,landing-space, lift-geometry,activation-barrier}`, `tests/free-drag/validation`, `tests/support/free-drag.ts`). Each becomes an `onError` assertion that additionally pins **which class** arrived — the discrimination is the new contract and an untested one is indistinguishable from an absent one.

**Added** — (a) a throwing `onError` during a multi-disposer teardown, asserting every later disposer still ran: this is the §7 property and today nothing pins it, because the platform channel could not throw into the library; (b) a throwing `onError` **from within** a notification, asserting no recursion and no second delivery; (c) `onError` suppression after `destroy()` from inside `onError`; (d) panic delivery, once §8 is settled; (e) the §3.3 silent drop.

**Deleted** — `runQualityValue` / `reportQuality` tier tests, and any test asserting that a specific fault reaches the _platform_ rather than the consumer, which is the assertion this decision reverses.

**At risk** — `tests/consumer.node.test.ts:1409` reads `seam/staged-unconsumed` and `seam/fail-outside-seam` out of the **packed tarball**. That test pins string presence, not channel, so it survives — but it is the instrument that will notice if §3.1's separate delete-or-gate decision goes the other way.

## 12. What would falsify this

- **§0's two-class model** falls if a reachable fault is consequential _and_ cannot name which of terminal/phase/settlement it changes. None of the seventeen `guarded` or sixteen `report` sites is; `hold-unavailable` is the closest and rider 1 resolves it by naming trajectory as out of scope.
- **§6** falls if `onError` can fire with a non-null `domain` for an operation that never reaches `finalized`. D-66 says otherwise unconditionally; a counterexample would restore the context.
- **§10's stage deletion** falls if `FAILURE_LANDING_TARGET` has a producer outside the `QUALITY` path.
- **§5's `toDraggableError` unpublication** falls if a third-party kernel-tier behavior has a legitimate reason to classify a fault the kernel did not build — which is the same question D-123 asked about `insertionAt` and got the opposite answer to, so it deserves its own look rather than inheriting one.