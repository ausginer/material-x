# Checkpoint E — targeted closure review 2

**Reviewer:** Codex  
**Date:** 2026-08-17  
**Scope:** E-01…E-08 only, against the current tree and D-85/D-86/D-87

## Verdict

Checkpoint E is **not yet closed**. E-01, E-02, E-05, and E-06 are closed with implementation and permanent evidence that discriminate the reported defects. E-03 and E-04 have correct implementations but incomplete permanent discrimination. E-07 and E-08 retain direct prose/evidence contradictions.

| Finding | Closure result |
| --- | --- |
| E-01 | **Closed.** One pre-lift measurement supplies the behavior projection; mutation-sensitive tests distinguish it from the deleted second traversal. |
| E-02 | **Closed.** Both final activation barriers are at the contributed-call boundaries the finding named, with negative and positive controls. |
| E-03 | **Materially open on permanent evidence.** Both kernel guards exist and behave correctly, but only the admission route has a permanent destroy-then-throw regression; the quality route does not. |
| E-04 | **Materially open on permanent evidence.** Phase legality and most regressions are sound, but the landing-runner row can pass against the pre-D-86 write because it observes only after the join erases that write. |
| E-05 | **Closed.** `home` fields are read, checked, and copied inside `anchorTarget`; invalid-shape tests prove quality-seam attribution. |
| E-06 | **Closed.** Alias-level declaration tests reject every relevant cross-behavior direction while preserving the intended common subset. |
| E-07 | **Open prose contradiction.** The executable row and B-4(d) are corrected, but two normative lifecycle passages still claim accepted-drop landing failure behavior that free drag cannot execute. |
| E-08 | **Open.** The isolated free-drag TypeDoc test exists but is red/flaky in isolation, and normative failure-attribution prose still contradicts the corrected source description. |

F-65 remains Phase 21 measurement work and was not reopened.

## Closed findings

### E-01 — closed

`acquireLift()` now calls box-quad once and derives `inheritedSpace` before any lift mutation (`src/kernel/presentation.ts:511-530`). The acquisition returns the lift session and that pre-lift projection separately (`:549-615`); the kernel places it on `ActivationScope` (`src/kernel/kernel.ts:1140-1177`), and free drag consumes `scope.inheritedSpace` without measuring (`src/free-drag/spec.ts:268-278`). No behavior module imports box-quad or carries private box indices, asserted by `tests/packaging.node.test.ts:210-235`.

The permanent browser fixture is discriminating. It changes the ancestor transform from `scale(2)` to `scale(4)` through `setPointerCapture`, after the kernel measurement and before the deleted behavior traversal would have run, then requires the delta from the original `scale(2)` snapshot (`tests/free-drag/activation-snapshot.browser.test.ts:50-79`). The pre-D-85 implementation produces the post-mutation value. Separate rows cover zoom, in-place and lifted modes, the release request, and unreadable-space failure (`:81-174`), including the lifted-mode case that rejects reusing the session's different projection.

No D-85 contradiction was introduced. The broad statement that “every permanent regression” was falsified pre-fix (`.plan/contract/05-lifecycle-invariants.md:616`; `tests/COVERAGE.md:707`) is imprecise because positive controls and the unreadable-space preservation row are not expected to fail pre-fix. The mutation-sensitive and source-boundary rows do discriminate, so this wording does not reopen E-01.

### E-02 — closed

Free drag rechecks `host.closed` after `deriveMotion()` has invoked `constrain.apply` and before the lift write, progress change, or `onStart` (`src/free-drag/spec.ts:318-348`). Its permanent regression destroys from the bounds source and asserts no start, terminal, or error, paired with a live positive control (`tests/free-drag/lifecycle.browser.test.ts:417-453`).

Sortable rechecks after `invalidateInsertion()` and before its progress change and `onStart` (`src/sortable/spec.ts:859-880`). Its permanent installer regression destroys from the insertion invalidator and asserts no start/error, again paired with a live positive control (`tests/sortable/activation-barrier.browser.test.ts:163-192`). These are the final contributed-call boundaries E-02 named; neither fix was incorrectly generalized into kernel machinery.

### E-05 — closed

Free drag calls `getHome`, reads both consumer-owned fields, checks both for finiteness, and returns a copied plain point before `anchorTarget` returns (`src/free-drag/spec.ts:794-825`). The kernel's `runQualityValue(..., FAILURE_LANDING_TARGET)` wraps that complete call before it later reads the returned plain point (`src/kernel/kernel.ts:1457-1495`).

Permanent rows independently exercise `null`, non-finite values, and a throwing accessor and require `FAILURE_LANDING_TARGET` rather than a panic or later-stage attribution (`tests/free-drag/validation.browser.test.ts:497-552`). The terminal-preservation and finite positive controls follow (`:554-571`). The final positive test proves acceptance, not the claimed travel coordinates; that narrow `tests/COVERAGE.md:727` wording overstates the assertion but does not weaken the invalid-result discrimination that closes E-05.

### E-06 — closed

D-87's exclusions are present on the public contribution records: `FreeDragContribution.insertion?: never` and `SortableContribution.constrain?: never` (`src/free-drag/feature.ts:104-111`; `src/sortable/feature.ts:124-140`).

The permanent declaration suite uses the declared aliases, not fresh object-literal excess-property checks. It rejects `AxisInstaller -> FreeDragInstaller`, `SortableInstaller -> FreeDragInstaller`, `FreeDragInstaller -> SortableInstaller`, and `FreeDragInstaller -> AxisInstaller` (`tests/composition.declaration.test.ts:38-83`). Positive rows preserve an empty installer for both behaviors and the shared `FeatureContext` identity (`:85-122`). Removing either exclusion makes the corresponding `@ts-expect-error` directive unused, so the original silent-discard defect is pinned without turning the two middle tiers into nominally unrelated APIs.

## Findings still open

### E-03 — implementation closed; permanent quality-route evidence missing

Both required lifetime guards are implemented at the kernel-owned call sites:

- `reportQuality` returns when the queue is closed before calling `spec.reportFailure` (`src/kernel/kernel.ts:734-748`);
- the admission catch reports only while the queue remains open (`:831-850`).

The admission route is permanently discriminated by a handle resolver that destroys and then throws, plus a throw-only positive control (`tests/free-drag/lifecycle.browser.test.ts:456-495`). There is no permanent equivalent for the other call site: a `home`/`anchorTarget` producer that destroys and then throws must reach no `onError`. The original E-03 disposition explicitly required admission **and landing-target** destroy-then-throw regressions; `tests/COVERAGE.md:718` records only admission.

A temporary closure probe for the missing quality case passes on the current implementation—zero errors and zero terminals after `home` destroys and throws—then was removed. That confirms no implementation contradiction, but it does not provide the permanent discriminator required for closure.

**Remaining disposition:** add the quality-route destroy-then-throw regression. Until then, `.plan/plan.md:1040-1044` overstates E-03 as closed and `tests/COVERAGE.md:707` overstates the permanent evidence as complete.

### E-04 — implementation closed; landing-runner regression is non-discriminating

The behavior-local phase guard is correct: before either tag-specific branch, `action.prepare` returns `null` unless the frame is `ACTIVATING` or `ACTIVE` (`src/free-drag/spec.ts:415-446`). A late `TAG_POSITION` therefore cannot stage state or reach its effect/write, and a late `TAG_POLICY` cannot re-enter the axis or constraint slots. Kernel tag routing remains behavior-neutral.

The permanent onEnd test directly pins the original leak by requiring an empty final inline transform (`tests/free-drag/actions.browser.test.ts:82-102`). The pending-onDrop observation, live onStart positive control, no-failure semantics, late/active invalidation controls, installed-landing terminal, and sortable late-invalidation control are also discriminating (`actions.browser.test.ts:104-133,167-316`; `tests/sortable/activation-barrier.browser.test.ts:194-265`).

The custom landing-runner row is not. It calls `moveTo(FAR)` and immediately calls `done()`, then observes only after settlement and teardown (`tests/free-drag/actions.browser.test.ts:135-165`). On the pre-D-86 path, the queued position action runs before `LANDING_SETTLED`, but the subsequent join pins and disposes presentation before the sole assertion. That can erase the forbidden write and leave the test green.

**Remaining disposition:** keep `done` pending, let the queue drain while still `SETTLING`, assert that the rendered transform remains at the release position rather than `FAR`, then complete the runner and assert final cleanup. Until that permanent row distinguishes the contended-writer defect, E-04's promised evidence is incomplete even though its implementation and other phase rows are correct.

### E-07 — stale normative prose contradicts the corrected executable path

The executable evidence is corrected and passes: the Infinity fixture commits a rejected result and asserts that rejected result survives (`tests/free-drag/validation.browser.test.ts:401-430`). B-4(d) now says the same and explicitly states that accepted free drag never enters landing (`.plan/contract/07-free-drag-contract.md:512`). The implementation agrees, arming landing only for non-accepted results (`src/free-drag/spec.ts:726-741`).

Two normative passages remain stale:

- `.plan/contract/07-free-drag-contract.md:220` still reasons about “a drop the consumer already accepted” surviving a landing that could not be built;
- `.plan/contract/05-lifecycle-invariants.md:610` still says the accepted drop survives Infinity and that `undefined` lands normally, despite the later D-79 correction.

The remediation record also says the Infinity wording was corrected “in the ledger” (`.plan/plan.md:1048`), but `.plan/ledger.md` contains no such row. The test, B-4(d), and `tests/COVERAGE.md:666` are correct; the remaining normative claims make E-07's prose cleanup incomplete.

**Remaining disposition:** replace the two stale accepted-drop statements with the committed rejected verdict and the rule that accepted free drag never enters landing; remove the stale `undefined` claim. No implementation change is indicated.

### E-08 — isolated documentation gate and attribution prose remain open

The intended isolated TypeDoc instrument exists with the correct entry union—`free-drag.ts`, `drag.ts`, and `free-drag/feature.ts` (`tests/docs.node.test.ts:186-215`). A direct TypeDoc invocation exits 0 and generates the JSON artifact, so no current declaration leak was found.

The permanent Vitest gate is not reliably green. A focused run of the free-drag case exits with code 0 from TypeDoc but captures an empty output string and fails its required `json generated at` assertion (`tests/docs.node.test.ts:208-213`). Running the file alone currently fails all four documentation tests for the same reason. A larger eight-file run passed earlier in the same review, making the gate order/environment-sensitive rather than trustworthy as the per-entry discriminator B-3 requires.

The source mapping comment was substantively narrowed to call-site-derived semantics (`src/kernel/errors.ts:75-87`), but it still names the retired `REORDER_RESOLUTION`, and normative contract prose remains contradictory:

- `.plan/contract/02-kernel-behavior-contract.md:182` still uses the retired `INSERTION`/`PLACEHOLDER_MOVE` names;
- `:1860` retains those names and `REORDER_RESOLUTION` in the stage list;
- `:1874` still states categorically that the axis is fault attribution, not pipeline position;
- `tests/kernel/errors.node.test.ts:116-119` repeats that categorical prose even though its value assertion remains valid.

**Remaining disposition:** make the isolated TypeDoc test reliably assert conversion from the generated artifact or stable TypeDoc output, then correct the stale stage names and the categorical attribution prose. No stage remapping or new failure vocabulary is indicated.

## Focused verification

```text
npx just typecheck
  PASS

focused E-01…E-08 run
  8 files, 86 tests passed, no type errors

standalone tests/docs.node.test.ts
  4 tests failed: TypeDoc code 0, captured output empty

filtered free-drag TypeDoc row
  1 test failed for the same empty-output assertion

temporary E-03 quality-route probe
  1 test passed; probe removed
```

No implementation, contract, or permanent test file was modified. Checkpoint E can close after the E-03 quality-route test, the E-04 settling-time runner assertion, and the E-07/E-08 prose and documentation-gate corrections land. F-65 remains explicitly outside this closure.