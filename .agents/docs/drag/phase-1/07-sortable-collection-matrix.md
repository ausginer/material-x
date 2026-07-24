# Artifact 7 — Sortable phase × collection-change matrix

## 1. How a change arrives

```
controller.updateItems(items)
  -> collection.replace(items)        // [...items], version += 1
     -> subscriber #handleSnapshot
        -> if ('operation' in state)  dispatch COLLECTION_UPDATED{operationId, snapshot}
```

Two consequences:

1. **Idle states never receive `COLLECTION_UPDATED`.** `IdleSortableState` has no `operation` key, so the subscriber drops the notification. The collection is still replaced; the next admission reads the new snapshot.
2. The event carries the _current state's_ `operationId`, so a replacement that arrives while the FSM has already retired the operation cannot match.

`collection.replace` shallow-copies the caller's array, so a queued snapshot can never be mutated by the caller afterwards. This already satisfies the proposal's requirement 23.

## 2. The reconciliation policy

`reconcileCollection(next, dragged, incumbent)` (`collection-policy.ts`), pure:

- destination view = `next.items` minus `dragged`;
- `incumbent === null` → `CHANGE_CANCEL`;
- **start gap** (`before === null`): survives only if `after` is still `destination[0]`;
- **end gap** (`after === null`): survives only if `before` is still the last destination item;
- **internal gap**: survives only if `before` and `after` are still adjacent;
- otherwise `CHANGE_CANCEL`.

A surviving gap is rebased onto the new version and index. **Intent is never recomputed from the latest pointer** — the exact identity gap either survives or the operation ends.

## 3. The matrix

| Phase | Item removed from snapshot | Item still present |
| --- | --- | --- |
| `SORTABLE_IDLE` | not delivered (no `operation`) | not delivered |
| `SORTABLE_PENDING` | `DISARM_OPERATION` → idle. No callbacks. | **ignored** — snapshot not refreshed |
| `SORTABLE_ACTIVATING` (both stages) | `activationFailure` → `onError` with `FAILURE_ACTIVATION` and `Error('drag: sortable item was removed during activation')` → idle | **ignored** |
| `SORTABLE_ACTIVE` | settlement `OUTCOME_CANCELED` (reason `CANCEL_POINTER`, at `REORDER_CANCELED_AT_PROPOSAL`, proposal `null`), `RECOVERY_IMMEDIATE` → `onCancel` | `reconcileCollection`: `REBASE` → adopt snapshot + insertion, emit `PLACE_COMMITTED_INSERTION`; `CANCEL` → settlement `OUTCOME_CANCELED`, `RECOVERY_IMMEDIATE` → `onCancel` |
| `SORTABLE_SPATIAL` | **ignored** | **ignored** |
| `SORTABLE_RESOLVING` | **ignored** | **ignored** |
| `SORTABLE_SETTLING` | **ignored** | **ignored** |
| `SORTABLE_REPORTING` | **ignored** | **ignored** |
| `SORTABLE_FINALIZING` | **ignored** | **ignored** |

### 3.1 Notes on the "ignored" cells

They are not all equally benign.

- **`PENDING`, item present.** The operation keeps the admission-time snapshot. If activation then happens, it activates against a stale collection. In practice the activation coordinator re-reads geometry, and a removed item is caught by the removal branch, so the window is narrow — but the snapshot version the operation carries can be behind the collection's.
- **`SPATIAL` / `RESOLVING`.** Deliberate and load-bearing: the proposal is built from `operation.snapshot`, and `SpatialCurrency` includes `collectionVersion`. Because `COLLECTION_UPDATED` is ignored here, the currency cannot drift, so a resolved insertion always matches. **A stale frame cannot commit an insertion after settlement**, which is the proposal's sortable invariant.
- **`SETTLING` onward.** The transaction is decided; the collection is the consumer's problem.

### 3.2 Source removal cannot commit a stale reorder

Three independent guards:

1. `ACTIVE` cancels outright when the dragged item leaves the snapshot;
2. `buildReorderProposal` returns nothing when the item is not in the snapshot, routing to `FAILURE_REORDER_RESOLUTION`;
3. `ReorderRequest.version` pins the proposal to the snapshot version the consumer is being asked about.

## 4. Required test cases

The proposal names nine; all nine map onto the matrix.

| # | Case | Expected |
| --- | --- | --- |
| 1 | source removal before activation (`PENDING`) | disarm to idle, no callbacks |
| 2 | source removal while active | `onCancel`, `RECOVERY_IMMEDIATE` |
| 3 | neighbour insertion while active, gap survives | rebase, placeholder re-placed, no cancel |
| 4 | neighbour removal while active, gap breaks | `onCancel` |
| 5 | complete replacement while active | gap almost never survives → `onCancel`; assert the exact rule, not "usually" |
| 6 | repeated reentrant replacements | each is a separate FIFO action; the first that breaks the gap wins |
| 7 | replacement after proposal creation (`SPATIAL`) | ignored; proposal unchanged |
| 8 | replacement during consumer resolution (`RESOLVING`) | ignored; `onReorder` sees the pre-replacement proposal |
| 9 | stale frame from operation A after operation B is active | rejected by `operationId` at both owner and FSM |

Case 3 in detail — the surviving-gap arithmetic is the part most likely to regress, so pin all three gap kinds (start, internal, end) separately, in both the survive and break directions. `tests/sortable/collection-policy.node.test.ts` already has 12 tests here; they are **semantic** coverage and must be carried forward (see [artifact 9](09-test-classification.md)).

## 5. Geometry invalidation sources

Complete list of things that invalidate sortable spatial state:

| Source | Mechanism | Effect |
| --- | --- | --- |
| pointer move | `nextSpatialId += 1` | supersedes any in-flight frame |
| collection rebase | `collectionVersion` in `SpatialCurrency` | supersedes by version |
| placeholder placement | `placeholder.place` → `spatial.invalidate()` | rect index marked dirty |
| scroll (capture phase) | `InvalidationSource` | rect index dirty |
| window resize | `InvalidationSource` | rect index dirty |
| release / keyboard command | `RESOLVE_PROPOSAL_INSERTION` | forces a synchronous fresh read |

Note the placeholder→spatial cycle is wired with a deliberate late binding in `sortable/effects.ts:84-96` (`let spatial!` then assignment), because the placeholder owner needs `spatial.invalidate` and the spatial owner needs the placeholder. The new runtime should express this as two top-level functions over one runtime container rather than reproducing the mutual-reference dance.

## 6. Rules for the new runtime

1. Preserve the matrix cell-for-cell. Every "ignored" cell is a decision, not an omission — but §3.1's `PENDING` note should be re-examined in Phase 4.
2. Keep the pure reconciliation function; it is the single clearest piece of the current design.
3. Keep `collectionVersion` inside the spatial currency.
4. Keep the shallow snapshot on replace.
5. Resolve release-time geometry synchronously from the actual release point. Per resolved D-1, commit an input-closed state and stop pointer/spatial interaction before that work, but retain a dedicated Escape/controller-cancel path until `onReorder` settles.
6. The matrix is a semantic baseline, not a requirement to preserve `COLLECTION_UPDATED`, `SpatialCurrency`, owner objects or the existing phase count.