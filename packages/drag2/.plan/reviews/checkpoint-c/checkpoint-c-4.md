# Checkpoint C fourth review — the re-freeze is not ready to close

I reviewed the live Phase 14 contract set (`00–06`), the three Phase 13 write-ups and typed probes, the compiled Phase 14 revision fixture, the earlier Checkpoint C reviews, and the Checkpoint C exit criteria in `plan.md`.

The direction of all four decisions remains defensible. I do not recommend reopening D-33's request-identity choice or replacing D-35 with a behavior seam. However, the current contract is not internally consistent enough to re-freeze. There are two blockers: the D-32 sortable command loses its destination on the normative lifecycle it is supposed to reuse, and D-35's sole-writer property is neither true for the stated interval nor enforced at tier B. The construction surface and compiled fixture also do not yet establish D-34 through the opaque behavior boundary.

## Verdict

| Decision | Verdict |
| --- | --- |
| D-32 — second admission | Direction accepted; the vertical-sortable data path is incomplete |
| D-33 — request-identified acknowledgement | Direction accepted; normative algorithm and claims still need cleanup |
| D-34 — behavior-selected activation payload | Decision accepted; complete construction threading is not yet demonstrated |
| D-35 — lift-owned rendered delta | Ownership direction accepted; sole-writer/tier claim rejected as written |
| Checkpoint C | Keep open |

---

## C4-01 — blocker: the pointerless sortable loses the command destination twice

D-32 says `command.admit` writes the keyboard destination gap into the open draft, after which the ordinary activation and release lifecycle can be reused:

```text
command.admit
  draft.insertion = destination
  commit PENDING
  ACTIVATE
  START_COMMITTED
  RELEASE
```

That carrier is described in `contract/02-kernel-behavior-contract.md:462-470` and `:474-497`, and the trace repeats it at `contract/06-vertical-sortable-trace.md:733-734`.

The same normative sortable seam then overwrites that destination during activation:

```text
activation.prepare
  draft.insertion = home insertion
```

See `contract/02-kernel-behavior-contract.md:407-411` and `contract/06-vertical-sortable-trace.md:129-136`. `begin()` copied the command's destination into this draft, so the unconditional home seed destroys the only state D-32 says carries it.

Even preserving it at activation would not be enough. The normative `release.prepare` invalidates and re-resolves insertion from the committed release point (`02:417`, `:1852-1870`; `06:340-349`). A pointerless operation has no release sample, and its pointer scalars remain zero (`02:499-507`, `:1894-1900`). The vertical resolver therefore cannot reconstruct the keyboard destination and may replace it with a gap selected from `pointerY === 0`.

The compiled fixture hides both conflicts. Its activation does not seed home, and its release builds a request without running the normative spatial re-resolution (`packages/drag2/tests/revision/phase-14.ts:444-490`). Consequently the fixture can compile a command path that is not the path specified for the real sortable.

This directly undermines the Phase 16 requirement that keyboard and pointer reorders to the same destination produce identical proposals (`contract/05-lifecycle-invariants.md:1000-1003`). Please make both branches normative before closing C:

- pointer activation seeds home; pointerless activation preserves the command-authored insertion;
- pointer release resolves from the final pointer sample; pointerless release preserves and validates the command-authored insertion without spatial re-resolution.

Then express those branches in the Phase 14 fixture and retain the direct proposal-equivalence test in Phase 16.

---

## C4-02 — blocker: D-35's sole-writer rule is aspirational, not tier B

Checkpoint C explicitly asks whether this rule is true rather than aspirational (`plan.md:971-973`). I-34 answers yes and rates it tier B:

> The behavior supplies nothing and cannot get it wrong.

That is not what the type surface or the prose establishes.

The behavior receives the real element through `ActivationScope.visual` and again through `VisualLiftSession.visual`. It can write `visual.style.transform` directly. The contract itself acknowledges this:

> A behavior that writes the visual's transform by another route is outside the contract.

See `contract/02-kernel-behavior-contract.md:700-711` and `:1551-1556`, `contract/05-lifecycle-invariants.md:59`, and `packages/drag2/tests/revision/phase-14.ts:67-74,176-182,223-224`. A prohibition that the API permits is tier-C discipline under the contract's own definition, not a kernel-enforced tier-B property.

The interval is also misstated. D-35 says `lift.write` is the sole transform writer "between acquisition and the join", while the landing contract requires the runner to drive the transform before the join (`02:1515-1517,1551-1555`). The value needed for correctness is sampled earlier: `lift.rendered` supplies `LandingContext.from` before control is handed to the runner. The runner is then the intentional later writer.

Please narrow the guarantee to the property actually needed:

```text
From acquisition until LandingContext.from is sampled,
conforming behavior rendering goes through lift.write.
The session records that delta.
After context creation, the landing runner is the explicit writer exception
until destroy() relinquishes control for the join pin.
```

I-34 should become a conditional/tier-C guarantee unless the behavior-facing capability is redesigned so direct transform writes are genuinely unavailable. At minimum, use a behavior-facing projection that omits `rendered`; the current fixture exposes it read-only to the behavior while calling it "kernel-read only". `readonly` prevents assignment, not access.

The cost claim needs the same honesty. Recording x/y adds two writes to every `lift.write`; it adds no seam, call or allocation, but it is not literally "nothing added to the hot path" (`02:1561-1563`, `plan.md:778-784`). State the narrower unmeasured claim unless Phase 21 measures the writes.

---

## C4-03 — major: the normative construction surface still bypasses opaque `Behavior`

Contract 01's primary handshake accepts a `BehaviorFactory` directly:

```ts
function draggable<Controller, Part extends object, Activation extends {}>(
  root: HTMLElement,
  behavior: BehaviorFactory<Controller, Part, Activation>,
): Controller;
```

It also declares `sortable()` as returning that internal factory. See `contract/01-construction-ownership.md:43-74` and `:206-221`.

The same document says the public `Behavior<Controller>` erases `Part` and `Activation` at an opaque brand (`01:103-106`), and contract 03 makes that opacity a public-boundary decision (`contract/03-feature-composition.md:1178-1209`). The Phase 14 fixture follows the latter model: it brands an internal factory and declares public `draggable()` against `RevisedBehavior<Controller>` (`phase-14.ts:248-274`).

These are different construction contracts. Because 01 is normative, this is not only a stale explanatory example. It exposes the factory and private generic parameters at the exact boundary D-30 says is closed.

The fixture also skips the bridge where D-34 most needs proof. It does not compile:

```text
opaque Behavior
  → unbrand to the matching factory
  → invoke factory
  → kernel.arm(spec) with Activation threaded
  → erase Activation only inside the driver
```

Instead, `draggable()` is merely declared after the brand, and both factories spell their full `RevisedBehaviorInstall<..., HTMLElement | true>` return types. That proves the isolated aliases are compatible; it does not prove the complete inference/erasure handshake claimed at `phase-14.ts:230-274`.

Please make 01 use the opaque public value, show the private unbrand/invocation inside `draggable`, and make the fixture compile that bridge through `arm`. This is required by Checkpoint C exit criterion 2: a complete revised type surface, not only two assignable specs.

---

## C4-04 — major: the main request–seal–arm algorithm still omits C3's rule

The dedicated D-33 discussion correctly specifies the early contradictory case:

```text
seal
  authoredReady = !readinessHeld
  if presentationLatched && !readinessHeld
    report contradiction
    presentationLatched = false
```

See `contract/02-kernel-behavior-contract.md:1083-1101`; trace 06 includes the same rule at `:454-479`.

But the document's main normative request–seal–arm algorithm at `02:1213-1287` still performs:

```text
sealed = true
authoredReady = !readinessHeld
if readinessHeld
  if presentationLatched ...
advanceSettlement()
```

It never reports or clears a latch when `readinessHeld` is false. Implemented literally, an early `ready(request)` followed by `presentation: false` is silently dropped as the attempt advances or finalizes — exactly the reading C3-01 was supposed to remove.

Please put the contradiction branch into the complete algorithm, before arm, rather than relying on a separate corrective snippet. The fixture's host comment is not executable evidence of this kernel-private branch (`phase-14.ts:136-171`), so Phase 15 also needs the matrix assertion for both the report and the absence of a hold release.

Duplicate acknowledgement ownership should be clarified in the same pass. Contract 02 says stale, forged and duplicated requests are rejected and reported by the behavior (`02:1054,1452-1458`), but a duplicate made while `rt.pendingRequest` is still live passes the behavior's identity check. Only the kernel's resolution/readiness latch can make that duplicate inert. The matrix currently asserts no double release but not the promised report (`contract/05-lifecycle-invariants.md:858-859`). Specify and test duplicate handling in both the early-latch and armed-hold windows.

I-35's tier should also state its scope. Cross-operation safety is enforced against the consumer by the first-party controller's behavior-owned identity check; the kernel deliberately does not know what a request is and `KernelHost.presentationCommitted()` itself carries no identity. Calling the whole invariant kernel-enforced obscures that load-bearing behavior obligation. Use the I-32 pattern: tier B for the public sortable composition, over a stated tier-C behavior rule that `presentationCommitted()` is called only after the exact published-identity check.

---

## C4-05 — major: top-precedence decisions still describe the pre-revision model

The decision ledger in contract 00 is normative, but several rows were not amended when D-32…D-35 landed:

- D-8 says transform writing occurs inside `moved` (`00-index.md:204`), while D-35 relies on writes from `release.effect` and controlled actions.
- D-9 declares `Behavior<Controller, Part>` (`00:205`), while the live boundary is opaque `Behavior<Controller>` with both `Part` and `Activation` erased.
- D-11 says resolution/readiness/settlement identity is kernel-private (`00:207`), while D-33 deliberately makes the request a public identity owned and checked by the behavior.

Mark these rows extended or superseded and state the current rule in the ledger. Leaving contradictions in the highest-precedence document makes the lower sections incapable of producing one unambiguous contract.

One D-33 overclaim also survived in contract 03. It says obligation 4, "never lose one", is bounded and named rather than silent (`03:599-606`), then correctly states that omitting both the opt-in declaration and acknowledgement is undetectable (`03:649-669`). Use 02's split wording: after declaration, a lost acknowledgement is bounded; without a declaration, the error remains tier C and silent.

---

## C4-06 — major: the revision fixture is useful but narrower than claimed

`npx just typecheck` passes, the fixture is tracked, and all of its actual negative assertions are live. That is useful evidence. It is not yet the "complete revised type surface" described by the plan and fixture header.

Beyond the missing construction bridge in C4-03:

- D-33 uses one ambient global `rt`; the spec closes over it while the controller is separately passed a runtime. The fixture does not create one runtime inside one install factory, so TypeScript never checks the normative one-runtime-per-controller coupling (`phase-14.ts:331-346,369-605`).
- D-35 declares both `lift.rendered` and `LandingContext.from`, but never builds a context with `from: lift.rendered`. It therefore does not compile the source path on which D-35 depends (`phase-14.ts:57-95`).
- The plan claims twelve `@ts-expect-error` assertions (`plan.md:898-905`). The fixture contains eleven directives; `n12` is a positive seven-field `KernelFrame` assignment.

Please keep the positive `n12` check, but count it honestly as a positive shape assertion. More importantly, make the fixture instantiate the ownership paths it claims to prove instead of describing them around ambient declarations.

---

## C4-07 — test-matrix and trace gaps

The new matrix is broad, but several load-bearing revision rules are absent or misstated:

1. D-32 refuses command admission whenever an operation is already live (`02:474-478`). Add cases at least for `PENDING`, `ACTIVE` and `SETTLING` that assert `command.admit` is not called, the event is not prevented and no second operation is minted.
2. The matrix says "a declared command type with no `command` member installed" (`05:991-992`), which is unconstructible because `types` lives inside `command`. The intended case is: with `command` absent, no discrete listener is bound.
3. D-35's matrix covers only conforming `lift.write` paths (`05:1014-1022`). It cannot support a tier-B sole-writer claim. Either downgrade the invariant or add an explicit adversarial case documenting that a direct DOM write makes `lift.rendered` stale and is unsupported discipline.
4. Trace 06's runtime construction omits `pendingRequest: null`, although later steps publish and clear it (`06:44-48,361-368,672-675`).

The current suite cannot close these rows yet because production `src/` still implements the pre-revision SPI. The plan acknowledges this and carries the re-verification to Phase 15 (`plan.md:947-952,1011-1014`). A green current suite is a baseline, not revised-runtime evidence.

---

## C4-08 — provenance and editorial integrity

The review record currently has broken links after the pass files were renamed:

- `plan.md:727-730,978` links `checkpoint-c-phase-14-review.md` and `checkpoint-c-follow-up-review.md`, neither of which exists. The tracked files are `checkpoint-c-1.md`, `checkpoint-c-2.md` and `checkpoint-c-3.md`.
- `drag/README.md:16,19` says two Checkpoint C passes and links the removed first filename, while contract 00 says three passes (`00-index.md:81-90`).
- `contract/02-kernel-behavior-contract.md:1924-1925` still says the behavior declares tags 0 and 1, despite its corrected three-tag rule at `:1754-1765`.
- `contract/01-construction-ownership.md:267`, `plan.md:891-892` and the fixture call `pendingRequest` the eighth mutable runtime field. The displayed live runtime has seven mutable fields total: `snapshot`, `view`, `placeholder`, `lift`, `pendingRequest`, `spatialSeq`, `pendingSpatial`.

These are not architectural blockers by themselves, but a checkpoint whose job is to re-freeze one source of truth should not close with broken review provenance or contradictory counts.

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

The first sandboxed test attempt could not bind the browser server to `0.0.0.0:9876`; rerunning with the required local-port permission passed. No product failure was involved.

The green suite is the pre-revision baseline. It does not validate D-32…D-35 at runtime, and the plan correctly assigns that implementation verification to Phases 15, 16 and 19–20.

## Requested closure pass

Please keep the accepted direction of D-32…D-35 and make one focused correction pass:

1. Specify and compile the pointerless insertion path through activation and release without overwriting or spatially re-resolving the command gap.
2. Restate D-35 around the actual sampling boundary and downgrade the direct-DOM prohibition to discipline, unless the capability is structurally narrowed.
3. Reconcile contract 01's public handshake with opaque `Behavior`, and compile unbrand → factory → arm in the fixture.
4. Put C3's report-and-discard branch into 02's complete seal algorithm and specify live duplicate acknowledgements.
5. Amend stale D-8/D-9/D-11 ledger rows and the remaining D-33 overclaim.
6. Close the listed matrix, trace, count, and review-link gaps.

After those changes, another architectural redesign should not be necessary. Checkpoint C can close once the contract has one executable reading of each revised path and its invariants are rated at the guarantees the API actually provides.