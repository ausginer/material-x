# One classified fault, three transports — and the identity that is not a taxonomy

Owner review, 2026-08-28. Two questions, and they separate cleanly: `SeamRejection` is residue and goes; the `drag: <area>/<condition>` token is not residue and stays, because D-117 already decided it and D-132 did not disturb that decision.

## 1. What the error path is today

```
release.prepare  ─┬─ return rejection(stage, msg) ─→ isRejection ─→ driver.requestFailure(stage, error) ─┐
                  ├─ throw ────────────────────────→ runPhase catch ─→ context.fail(seamStage, raised) ──┤
                  └─ host.fail(stage, error) ──────→ driver.requestFailure ────────────────────────────  ┤
                                                                                                        ↓
                                                                              failOperation → queued FailureCheckpoint
                                                                                                        ↓
                                                                 handleFailed → new DraggableError(stage, error) → onError
```

Three transports, one destination. `requestFailure` and the `runPhase` catch converge on the **same** `context.fail`, and the package already says so in its own words at [seams.ts:502](../../src/kernel/seams.ts#L502): _a latched failure and a throw are the same event on this path too_ (D-49).

## 2. `SeamRejection` has no independent reason to exist

**It has never carried a classification the kernel lacked.** A seam is run with its stage as an argument, and every one of the six sites passes exactly that stage back:

| Site | Returns | Seam runs at |
| --- | --- | --- |
| [free-drag/spec.ts:624](../../src/free-drag/spec.ts#L624) | `FAILURE_RELEASE` | `runReleaseSeam(…, FAILURE_RELEASE, …)` — [kernel.ts:2018](../../src/kernel/kernel.ts#L2018) |
| [free-drag/spec.ts:718](../../src/free-drag/spec.ts#L718) | `FAILURE_RESOLUTION` | `runCore(…, FAILURE_RESOLUTION)` — [kernel.ts:1811](../../src/kernel/kernel.ts#L1811) |
| [sortable/spec.ts:1355](../../src/sortable/spec.ts#L1355) | `FAILURE_RELEASE` | as above |
| [sortable/spec.ts:1384](../../src/sortable/spec.ts#L1384) | `FAILURE_RELEASE` | as above |
| [sortable/spec.ts:1429](../../src/sortable/spec.ts#L1429) | `FAILURE_RELEASE` | as above |
| [sortable/spec.ts:1445](../../src/sortable/spec.ts#L1445) | `FAILURE_RELEASE` | as above |

Six for six. The value the type exists to carry is the value the kernel already holds.

**A throw at the same site produces an identical outcome, and one thing more.** The catch in `runPhase` reaches `context.fail(stage, raised)`; the rejection path reaches `context.fail(stage, result.error)` through `requestFailure`. Same `failOperation`, same checkpoint, same `DraggableError`, same `SEAM_PREPARE_FAILED`. The difference is that a `throw` captures a **stack at the failing branch**, which the returned form only gets because it synthesises an `Error` in order to have one.

**Nothing is lost, because the general mechanism already exists.** `host.fail` _is_ `driver.requestFailure` ([kernel.ts:2471](../../src/kernel/kernel.ts#L2471)), it is on `KernelHost`, and it latches — so a behavior needing a stage other than its seam's writes `host.fail(stage, cause)` and returns whatever it likes; `runPhase` returns `FAILED` regardless. That capability is not `SeamRejection`'s and is not going anywhere.

**What it costs.** A published type at `kernel.js`; a union arm on two published `BehaviorSpec` members; and `isRejection` — `result !== true && 'stage' in result` — a structural probe run on the release and settlement `prepare` of every operation.

**The strongest form of the argument.** Admission, activation, action and the frame seams all fail by throwing, and none of them has a rejection arm. So the union never expressed _a seam may fail_; it expressed _these two seams may fail **in a second way**_. A type that states the exception rather than the rule is the residue, not the rule.

### The one honest cost

Deleting the arm makes _this seam may fail_ prose rather than type. That is a real loss of static visibility, and it is worth exactly as much as the same prose is worth at the four seams that already rely on it — which is to say the deletion makes the surface consistent rather than weaker.

## 3. The token is not a second taxonomy, and D-117 is why

The owner's reading — that `release-no-visual` is a finer taxonomy surviving inside `Error.message` after the detailed error codes were removed — is the reading D-117 arrived at first and then reversed on the evidence.

D-117's rule (a) names this exact concern in this exact family: _for a library-raised cause the sentence is the only thing separating five sortable release faults that all classify as `interaction`. **The prose was doing classification work the coarse vocabulary declines to do.**_ Its answer was not to delete the strings but to **strip them to identities** — one prefix, `drag: <area>/<condition>`, a condition and never a verdict, explanation moved to the source comment that ships in every `.js.map`'s `sourcesContent`. `sortable/release-no-proposal` is [contract 05's own worked example](../contract/05-lifecycle-invariants.md) of the rule.

**D-132 did not weaken that, and the check is direct.** D-117's premise was that the classification could not separate the release family. `FAILURE_RELEASE` separates it exactly as badly: four sortable release faults and one free-drag release fault all carry stage 9. The payload got smaller and no more discriminating, so the floor D-117 set — _a `DraggableError` whose `message` is empty and whose classification is one of a dozen is unusable in the field_ — holds unchanged.

**And the token is what survives the build.** Function names are mangled or dropped in a minified production bundle; a string literal is not. In a bug report from a consumer's production build, the slug is the only thing that says which of the four release invariants broke. Deleting it would leave `stage: 9` and a stack pointing at the queue drain, because the checkpoint is queued (D-23) rather than raised inline.

So the answer to _should a library-authored invariant failure with no underlying exception carry a synthetic `Error` at all_ is **yes, and not for classification**: it is carried for the stack and the identity, both of which the stage cannot supply.

### What is genuinely missing

The record says _nothing observable depends on the content of a message_ — a statement about what the library does. It never says it to the **consumer**. A stable, namespaced, undocumented string is a de-facto API by default (F-154), and the negative is one sentence:

> `DraggableError.stage` is the classification and the whole of it. `message` and `cause` are diagnostics; nothing may branch on either, and both may change in a patch.

This is also where `DraggableWarning` differs and should be seen to differ: a warning has no stage, so its message _is_ the payload — which errors.ts already states. **The message is the payload exactly where there is no stage.**

## 4. Where a `DraggableError` is minted

**One site, `handleFailed` at [kernel.ts:2261](../../src/kernel/kernel.ts#L2261), and it stays there.** Behaviors raise causes; the kernel mints the error. That is true today and is nowhere stated as a rule, which is why the question is worth answering:

- **The stage is not final at the raise site.** A stale checkpoint is demoted to a `DraggableWarning` ([kernel.ts:2240](../../src/kernel/kernel.ts#L2240)) and a held cancel latch outranks the checkpoint outright ([kernel.ts:2212](../../src/kernel/kernel.ts#L2212)). An error minted at the branch would already be the wrong object in both, and would have to be unwrapped and rebuilt.
- **One mint site is what makes _the stage on the error is the stage the kernel decided_ true by construction** rather than by every behavior agreeing — which is D-130's kernel-owned-construction argument, the one D-132 leans on when it says the total mapping was retired structurally.
- A behavior cannot know its operation is still current; the checkpoint's own guard does.

## 5. Caught causes

Unchanged and already correct. `DraggableError`'s constructor passes `{ cause }` through unconditionally and adopts `cause.message` when the cause is an `Error` ([errors.ts:26](../../src/kernel/errors.ts#L26)). A synthetic library `Error` is the same mechanism with a library-authored cause, which is exactly why the two must not be given different transports: the moment an invariant break travels differently from a caught consumer fault, the constructor's single derivation stops being single.

## 6. Findings

**F-152.** _Two decisions govern one field and neither cites the other, so the later one reads as having superseded the earlier one's premise._ D-117 decided what a message is; D-132 decided what the classification is; D-117's whole case for keeping identities is that the classification cannot separate a family — which is a claim **about** the classification D-132 replaced. Nothing in either row points at the other, and the reading that the token is now residue follows naturally from reading either one alone.

**F-153.** _One classified fault has three transports, and the typed one is the only one that is not load-bearing._ `throw`, `host.fail` and `SeamRejection` converge on the same `failOperation`. The type is on two seams out of six, states the exception rather than the rule, and buys a per-operation structural probe.

**F-154.** _A diagnostic identity is stable, namespaced and undocumented, and the record never denies that it is an API._ D-117 states the property internally — nothing observable depends on a message — and publishes no corresponding negative, so a consumer branching on `drag: sortable/release-no-proposal` is not doing anything the contract has told them not to.
---

# Amendment, 2026-08-28 — the three-way ownership model, and what D-152 got wrong

Owner challenge: a library invariant breach is represented by its `FAILURE_*` and owes no synthetic descriptive cause; a real cause is what an **environment** failure carries; an internal assertion vocabulary does not belong on the public error channel.

**The principle is right and §3 above leaned on the wrong authority.** Two things follow from checking it against the record, and the first one moves the conclusion further than the challenge does.

## 7. The premise is a P-class claim, and the record has already ruled against it — for

four of the six sites

D-117 makes provenance **a reachability claim proved from the call graph**, and 05 adds that _by construction an author cannot trigger a P2 site at all_. Under that definition, `sortable/release-no-proposal` is **not** a library invariant breach, and this was settled by proof eight days ago:

> A third-party `InsertionGeometry.resolve` — a **published** middle-tier surface — can return a version-matching gap with neighbours the snapshot does not support, and that fires the site. An author _can_ trigger it, so it cannot be P2 under 05's own definition. — [`d119-closure-review-claude.md`](d119-closure-review-claude.md) §6.3

The same review filed **F-94** as a tier-B record defect, because the P2 reading had travelled four hops — measurement census → review → plan → ledger — without anyone reading it back against D-117's own row. The class it named is _a citation is not a reading_, and the family it happened in is this one.

So `release-no-presentation`, `release-no-destination`, `release-no-insertion` and `release-no-proposal` are **P1** — the first three by default, the fourth by proof — and the owner's rule does not reach them. They describe a fault the library does not own, to the party who can act on it.

`free-drag/release-no-visual` is the site that plausibly **is** P2: `draft.visual` and the spec-local `originRect` are written together in `activation.effect` ([spec.ts:355](../../src/free-drag/spec.ts#L355)) and cleared together at retire ([spec.ts:990](../../src/free-drag/spec.ts#L990)), and free drag publishes no third-party surface between them. But that is an argument, not the call-graph proof D-117 requires, and F-94 exists because this family accepted an argument once already.

## 8. The three-way model has a missing cell, and most of the identities are in it

The model routes a fault by whether the library **caught** something. There is a fourth shape and it is the common one:

> **A P1 fault the library detects itself, with nothing caught.**

`presentation/visual-no-box-space` (a consumer's visual with no readable box space), `activation/root-disconnected` (a consumer's root), `realm/no-owning-window` (a detached document), `sortable/anchor-outside-container` (a third-party geometry's anchor), and the four release faults above. Nothing threw, so there is no cause to preserve; the fault is not the library's, so `FAILURE_*` is not the whole of what should be said. Under the rule as written these fall through both cells and lose the only description they have — of a fault the consumer owns and can fix.

**So the discriminator is not synthetic-versus-caught. It is whether anything else says what happened.**

|  | payload |
| --- | --- |
| Something was caught — a consumer callback, a third-party seam, the platform | the actual cause, verbatim. The constructor already adopts its message |
| Nothing was caught; the library detected a condition | the identity, because it is the only description that exists |

That rule is provenance-independent, matches what the code does today, and leaves the owner's principle intact wherever it bites.

## 9. Where the challenge lands, and §3's error

For a site that genuinely **is** P2, the question _should the public error channel carry an internal assertion vocabulary_ is narrower than the one D-117 asked. D-117's P2 row — _a consumer can do nothing with a library bug except report it, and a token is a better bug report than a sentence_ — answers **how much text**, having already assumed the message exists; its own framing is _which of forty messages does the contract require_. **§3 cited it as though it had settled the prior question. It had not, and that was the error.**

On the merits, the recommendation is unchanged but the ground is narrower — not "field usability", which is the argument the owner correctly rejects as maintainer-facing:

- **The Hyrum's-law exposure is near zero _because_ P2 means unreachable.** A consumer cannot come to depend on a string that never appears unless the library is broken. That is the whole difference from `DraggableErrorCode`, which was typed, documented, reachable in ordinary operation, and existed to be branched on. Removing that and keeping this are not the same act.
- **The separate-channel alternative is already priced and blocked.** `__DEV__` is the only one this package has, D-101 puts its binding in one tier and forbids arguing it on bytes, and `kernel/` and `free-drag/` bind nothing — which is where both P2 candidates live.
- **Mechanically, you cannot throw nothing.** With D-152's transport, a blank sentinel `Error` gives `cause.message === ''`, which `DraggableError` adopts, producing the empty message [05](../contract/05-lifecycle-invariants.md) names as unusable in the field. Suppressing that needs a constructor fallthrough — a new rule written to undo a rule.

**The live choice, stated so it is the owner's.** If a site is _proved_ P2, blanking its identity costs the four-way discrimination at one stage and the constructor fallthrough above, and buys a channel that provably carries no internal vocabulary. That is a coherent position; it is not the one recommended here, and D-152 records it as declined rather than unconsidered.

## 10. The obligation this adds

**No site's P-class may be asserted without a call-graph proof**, and an unsettled site is P1 (D-117; F-94's precedent). The six sites are P1 by default today. If `free-drag/release-no-visual` is proved P2, that proof is what makes the owner's question live for it — and it is one site, not a family.