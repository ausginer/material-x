# `@ydinjs/drag` redesign — Phase 1 artifacts

## Status

**Reviewed — accepted as Phase 2 input.** The behavioural baseline was captured at commit `1ce3003d`, the redesign decisions below were resolved on 2026-07-24, and implementation may proceed against this artifact set.

These documents describe **the behaviour that ships today** and the explicit target deviations approved for the new runtime. They are behavioural and acceptance contracts, not a requirement to preserve the current reducer, event, effect, owner, phase, or module shapes. One baseline row does not imply one target action, checkpoint, function, or phase; the new imperative runtime is expected to collapse protocol structure wherever the recorded semantics remain intact.

## Artifacts

| # | Artifact | File | Proposal requirement |
| --- | --- | --- | --- |
| 1 | Per-feature phase/action tables | [01-phase-action-tables.md](01-phase-action-tables.md) | 1 |
| 2 | Action classification and queue traces | [02-action-classification.md](02-action-classification.md) | 2 |
| 3 | Callback/factory matrix | [03-callback-matrix.md](03-callback-matrix.md) | 3 |
| 4 | Known-failure table | [04-failure-table.md](04-failure-table.md) | 4 |
| 5 | Resource exit-path matrix | [05-resource-exit-paths.md](05-resource-exit-paths.md) | 5 |
| 6 | Presentation-readiness replacement algorithm | [06-presentation-readiness.md](06-presentation-readiness.md) | 6 |
| 7 | Sortable phase × collection-change matrix | [07-sortable-collection-matrix.md](07-sortable-collection-matrix.md) | 7 |
| 8 | Public compatibility ledger | [08-compatibility-ledger.md](08-compatibility-ledger.md) | 8 |
| 9 | Test classification | [09-test-classification.md](09-test-classification.md) | 9 |
| 10 | Reproducible baselines | [10-baselines.md](10-baselines.md) | 10 |
| 11 | Retention and teardown tests | [11-retention-teardown.md](11-retention-teardown.md) | 11 |

## How to use the artifacts

- **Behavioural baseline:** artifacts 1, 3, 4, 6, 7 and 8.
- **Implementation constraints:** artifacts 2, 5 and 11.
- **Acceptance and measurement:** artifacts 9 and 10.

After cutover, stable guarantees move into the rewritten `DESIGN.md`; old-machine phase tables may be archived, test lists become executable coverage, and the compatibility ledger remains as the change record.

## Resolved decisions for Phase 2

| ID | Resolution | Impact |
| --- | --- | --- |
| D-1 | On release, close pointer movement, pointer release, capture, spatial and invalidation ingress before final geometry. Keep a separate cancellation path (`controller.cancel()` and Escape) alive until consumer resolution settles; cancellation aborts the resolver signal. | Intentional behavioural refinement |
| D-2 | Adopt a per-operation, first-valid-cancel-wins latch. Idle/closed cancellation is a no-op. Clear the latch on consume, stale ignore, retirement, destroy and panic. | Internal, observably equivalent |
| D-3 | A readiness rejection or timeout reports `onError` only; no later `onFinish` or `onCancel` for either feature. Recovery remains feature-specific: draggable uses home/immediate, sortable remains immediate. | Fixes sortable double terminal reporting |
| D-4 | Preserve live `POLICY_UPDATED` semantics in every draggable phase, including settlement and finalization. | Preserved behaviour |
| D-5 | Validate async identity both at the producer/completion boundary and again when applying the queued action. This does not require an owner object. | Internal tightening |
| D-6 | Runtime speed remains author-owned and hand-measured. The observed 7–12 ms sortable activation spread is accepted as a sanity range, not a formal gate. Bundle size, tests and typecheck remain gated. | Resolved |
| L-7 | Preserve admission-factory throw behaviour: the exception escapes the native listener, no operation is created, and the controller remains idle and usable. | Preserved behaviour |
| L-8 | Remove the two unused failure stages from the target public union; the package is pre-release and the values have never been raised. | Intentional public-type cleanup |
| L-9 | Fix sortable cancellation during activation. During acquisition it cleanly abandons without callbacks; after activation resources commit, cancellation follows normal settlement and `onCancel`, never `onError`. | Bug fix |
| L-10 | Copy controlled-position scalars at dispatch. | Bug hardening |
| L-11 | Panic aborts controller ingress and clears all operation-owned references. | Retention fix |