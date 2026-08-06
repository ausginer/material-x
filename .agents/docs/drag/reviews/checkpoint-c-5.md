# Checkpoint C fifth review — the addressed pass is not ready to close

I re-reviewed the addressed Checkpoint C revision at `9d13ace0` against every finding in [`checkpoint-c-4.md`](checkpoint-c-4.md), the live `00–06` contract, the Phase 14 compiled fixture, the Checkpoint C exit criteria, and the current pre-revision runtime where it constrains the promised capabilities.

The fourth-pass changes close most of C4. In particular, the command destination now survives all three pointerless seams, the opaque behavior construction bridge compiles, the seal-time contradiction is present in the complete algorithm, the top ledger mostly describes D-32…D-35, and the fixture/provenance counts are corrected. The review nevertheless exposes two remaining correctness blockers: the behavior can dispose the lift session that D-35 says the kernel owns, and the early-acknowledgement arm path does not claim the once-only readiness latch before dispatch. The acceptance matrix also contains a false assertion for faithful lift mode.

## Verdict

| Decision | Verdict |
| --- | --- |
| D-32 — second admission | Functional destination path accepted; one matrix assertion and fixture reading still need correction |
| D-33 — request-identified acknowledgement | Direction accepted; the early-to-armed duplicate boundary is still unsafe and the post-release classification is contradictory |
| D-34 — behavior-selected activation payload | Accepted; opaque construction threading is now demonstrated |
| D-35 — lift-owned rendered delta | Sampling interval accepted; kernel ownership is still contradicted by the behavior-visible disposer |
| Checkpoint C | Keep open |

## C4 closure ledger

| C4 finding | Status in the addressed revision |
| --- | --- |
| C4-01 — pointerless destination overwritten | **Functionally closed.** `activation.prepare` preserves the command gap, `release.prepare` skips pointer invalidation/resolution, and `release.effect` moves the placeholder without a lift write. The “two seams” wording and fixture lifecycle still drift; see C5-04/C5-05. |
| C4-02 — D-35 interval/tier/ownership | **Not closed.** The interval and tier are corrected, but behavior still receives `dispose()` on the lift session; see C5-01. |
| C4-03 — opaque construction bypass | **Closed.** Contract 01 and the fixture now compile opaque `Behavior` → unbrand → factory → `arm`. |
| C4-04 — request–seal–arm and duplicate rules | **Not closed.** The contradiction branch is now in the complete seal algorithm, and I-35 is scoped honestly, but the early-latched arm dispatch reopens the duplicate-release race; see C5-02. |
| C4-05 — stale top-precedence decisions | **Substantively closed.** D-8/D-11 and the declaration residue are corrected. D-9 retains one inaccurate “only” statement; see C5-05. |
| C4-06 — fixture narrower than claimed | **Closed for the requested type evidence.** The construction bridge, shared runtime, `from: lift.rendered`, eleven negative directives plus positive `n12`, and pointerless branches compile. The fixture is still not a faithful lifecycle reading; see C5-04. |
| C4-07 — matrix and trace gaps | **Rows added, but not closed.** The pointerless whole-command transform assertion is false in faithful lift mode; see C5-03. |
| C4-08 — provenance/editorial integrity | **Closed relative to `9d13ace0`.** Adding this fifth review necessarily creates a new pass-count/link update; see C5-05. |

---

## C5-01 — blocker: behavior can dispose the kernel-owned lift before D-35 samples it

Contract 01 says the lift session, inline-style snapshot, and recorded delta are kernel-owned, and that the behavior receives the session while the recorded delta remains kernel-read-only (`contract/01-construction-ownership.md:253`). Contract 02 likewise hands the behavior a `VisualLiftSession` both through `BehaviorSpec.moved` and `ActivationScope.lift` (`contract/02-kernel-behavior-contract.md:305,531-542`).

The physical session includes `dispose` (`packages/drag2/src/kernel/presentation.ts:256-284`). Disposing restores the inline-style lease and, in lifted mode, the top-layer lease. Therefore a conforming TypeScript behavior can do this through the first-class SPI it was handed:

```text
activation.effect / moved
  scope.lift.dispose()

later, at settlement arm
  LandingContext.from = kernelLift.rendered
```

The visual has been restored while the recorded delta still describes the session's last `write`. That breaks I-34 through an API-granted method, not through the explicitly tier-C escape hatch of writing `visual.style.transform` directly. It can also disrupt later `write`, landing-runner, and join ownership. This is exactly why `LifetimeScope` projects `dispose` away: the behavior may register cleanup but cannot sequence kernel cleanup itself (`02:528-547`). The lift needs the same treatment.

The Phase 14 fixture does introduce a behavior-facing projection, but it is non-normative and insufficient:

```ts
type BehaviorLiftSession = Omit<KernelVisualLiftSession, 'rendered'>;
```

`KernelVisualLiftSession.dispose()` remains visible through that `Omit` (`packages/drag2/docs/revision/phase-14.ts:81-107`). Contract 02 does not use the projection at all.

Define the behavior-facing capability normatively and project both kernel-only members away, preferably by positively selecting the allowed surface:

```ts
type BehaviorLiftSession = Readonly<
  Pick<VisualLiftSession, 'visual' | 'baseTransform' | 'compose' | 'write'>
>;
```

Use it in `ActivationScope.lift`, `BehaviorSpec.moved`, and the behavior runtime. Keep the full session only in kernel-owned state, where `rendered` is sampled and `dispose` is sequenced. The direct DOM write remains the honest tier-C residue; the disposer must not.

---

## C5-02 — blocker: the early-latched arm path dispatches without claiming the once-only latch

The addressed text correctly says `readinessSettled` is claimed at the dispatch site so two acknowledgements cannot enqueue two releases (`contract/02-kernel-behavior-contract.md:665-670,779-790`). The live armed path follows that rule:

```text
if readinessSettled: report duplicate; return
readinessSettled = true
dispatch(READINESS_SETTLED)
```

The complete arm algorithm does not. It creates the settlement attempt with `readinessSettled = false` and copies the early acknowledgement into `presentationLatched` (`02:895-900`), then does only this (`02:932-946`):

```text
if readinessHeld
  if presentationLatched
    dispatch(READINESS_SETTLED, attempt)
```

Trace 06 repeats the same unclaimed dispatch (`contract/06-vertical-sortable-trace.md:404-412`). A concrete failure sequence is:

1. The consumer calls `ready(request)` synchronously while the resolution attempt is open. `presentationLatched` becomes true.
2. Settlement is created with a readiness hold and `readinessSettled === false`.
3. Arm sees the copied latch and queues `READINESS_SETTLED`, but leaves `readinessSettled` false.
4. Before the queued action drains, reentrant behavior/runner code during the remainder of arm calls `ready(request)` again.
5. The live armed path sees an unclaimed latch, sets it true, and queues a second `READINESS_SETTLED`.

The handler deliberately checks only attempt currency and phase, not the once-only latch (`02:790`; `06:466-472`). With a landing hold still outstanding, the first action releases readiness but leaves the same attempt in `SETTLING`; the second action can then release/decrement it again. The stated one-dispatch/one-release rule does not hold across the early-to-armed boundary.

Arm must claim `attempt.readinessSettled = true` before dispatching the copied early latch, exactly as `presentationCommitted()` does in the live armed path. Add a discriminating matrix case in which the first acknowledgement is early and the second is reentrant during arm, before the first queued release drains. The existing same-window case of two calls after the hold is already armed does not cover this boundary.

There is a second normative inconsistency in the same state machine. The duplicate table says an acknowledgement after the hold has settled is inert and reported as a duplicate (`02:767-771`). The arrival table says any `SETTLING` state with no readiness hold means no presentation was declared and is contradictory (`02:802-808`). That equivalence is false while landing remains outstanding: after a valid `READINESS_SETTLED`, the phase can still be `SETTLING`, `readinessHeld` is false, `readinessSettled` is true, and presentation was declared. The decision order should check `readinessSettled` first and report a duplicate; only an unclaimed acknowledgement with no declared/held readiness gate is contradictory.

---

## C5-03 — major: the pointerless matrix asserts a transform property faithful lift cannot satisfy

The D-32 matrix now says that a pointerless release performs no lift write, so “the visual's inline transform is unchanged across the whole command” and the recorded delta remains `(0, 0)` (`contract/05-lifecycle-invariants.md:456`). The second half is the intended D-35 property. The first half is false for a supported lift mode.

Faithful acquisition writes its base matrix immediately (`packages/drag2/src/kernel/presentation.ts:432-454`). It must: the visual is promoted and positioned at the viewport origin, and the base matrix preserves its pre-lift appearance before any movement sample. A test comparing the pre-command inline transform with the landing-time inline transform will therefore fail even when the pointerless behavior is completely correct.

Assert one of the actual properties instead:

- no behavior `lift.write` occurs after acquisition;
- the transform is unchanged from immediately after acquisition until `LandingContext.from` is sampled; or
- `lift.rendered` remains `(0, 0)` and `compose(0, 0)` reproduces the acquired visual position.

Contract 05's D-35 row already uses the correct phrase — “the visual has not moved since acquisition” (`05:458`). The D-32 row should use the same boundary.

---

## C5-04 — moderate: the compiled fixture's pointerless body is not the normative lifecycle it claims to mirror

The fixture now compiles the pointerless prepare/effect branches, which is enough to close C4's missing type-path evidence. Its bodies still do not provide one faithful executable reading of the reference behavior.

Normative activation inserts the detached placeholder at home (`contract/02-kernel-behavior-contract.md:335-353`); release then moves it to the final insertion. The fixture instead moves it directly to `current.insertion` during activation (`packages/drag2/docs/revision/phase-14.ts:555-580`). For a pointerless operation that value is already the command destination, so the placeholder is at the destination before release rather than at home.

The fixture's release body then reads `rt.placeholder` and `rt.lift` (`phase-14.ts:613-642`), but the fixture never assigns either field. The non-null assertion permits the placeholder call to typecheck, and optional chaining makes the pointer lift write disappear. This means the file checks the signatures and branches, but not the runtime coupling its comments and `plan.md` exit criterion 8 describe as being represented “alike.”

Either make activation publish the returned placeholder/lift through the normative ownership path and preserve the home-then-destination sequence, or narrow the fixture/plan claim explicitly to type-surface evidence. A type-only fixture need not be runnable, but its implemented example should not tell a different lifecycle story while being cited as the complete one.

---

## C5-05 — editorial and provenance corrections required by a fifth pass

These do not independently reopen a decision, but a re-freeze document should have one vocabulary and accurate provenance:

1. Contract 02 says the pointerless branch is “two seams” and lists activation/release prepare, then correctly adds `release.effect` as the third (`contract/02-kernel-behavior-contract.md:426-453`). Trace 06 repeats “Two seams branch” while omitting the release-effect branch from that sentence (`contract/06-vertical-sortable-trace.md:622`). The plan correctly says all three (`plan.md:662`). Use “three seams” everywhere.
2. The Checkpoint C review prompt still asks whether `lift.write` is the only writer “between acquisition and the join” (`plan.md:647`), contradicting the corrected D-35 interval that ends when `LandingContext.from` is sampled (`contract/02-kernel-behavior-contract.md:1142-1148`). Update the prompt so a future review does not test the rejected formulation.
3. The top-precedence D-9 row says the three-parameter form survives “only” on `BehaviorFactory` (`contract/00-index.md:125`), but contract 01 also defines `BehaviorInstall<Controller, Part, Activation>` (`contract/01-construction-ownership.md:42-49`). Say the construction generics survive on the internal factory/install types while the public brand erases them. This does not undermine D-34, but exit criterion 11 says no contradiction survives in a top-precedence document.
4. `README.md:14,17`, `contract/00-index.md:30`, and the Checkpoint C plan summary/closure (`plan.md:571-578,639,667`) currently say four passes and closed. Those statements were accurate at `9d13ace0`; creating this file makes them stale. Advance the review links/count to five and change the closure status when this pass is addressed. Do not describe pass 5 as closed until the two blockers above are actually corrected.

---

## Verification performed

From `packages/drag2`:

```text
npx just typecheck
  PASS

npx just test
  PASS outside the sandbox (the browser runner requires a local port)
  30 test files passed
  644 tests passed
  18 skipped
  no type errors
```

The first sandboxed test attempt failed because the browser runner could not bind `0.0.0.0:9876`. The first permitted full run then had one five-second timeout in `tests/bench/size.node.test.ts`; that test passed alone with a longer timeout, and an immediate full rerun passed all 30 files and 644 tests. This is consistent with a timing flake, not a product failure.

As before, the green suite validates the pre-revision implementation baseline. It is not runtime evidence for D-32…D-35; the plan assigns revised-runtime verification to the implementation phases.

## Requested closure pass

Keep D-32…D-35 and make one focused correction pass:

1. Project `rendered` and `dispose` out of the behavior-facing lift capability everywhere in the normative surface and fixture.
2. Claim `readinessSettled` before the early-latched arm dispatch; order post-settlement duplicate/contradiction classification unambiguously; add the cross-window duplicate test.
3. Replace the false whole-command inline-transform assertion with a post-acquisition/no-write assertion.
4. Reconcile the fixture's placeholder/lift ownership and pointerless sequence, or narrow the claim made for the type-only fixture.
5. Correct the three-seam wording, D-35 review interval, D-9 wording, and fifth-pass provenance.

After these changes, the four architectural decisions still do not need redesign. Checkpoint C can close when the kernel-only lift capabilities are actually kernel-only and the readiness once-only latch is claimed on every dispatch path.