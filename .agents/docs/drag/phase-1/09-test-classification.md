# Artifact 9 — Test classification

Baseline: **20 files, 276 tests, 0 type errors**, 6.02 s (commit `1ce3003d`, `npx just test`).

Each existing file is classified as:

- **P — public/observable contract.** Must pass unchanged through cutover, except where artifact 8 records an intentional target change.
- **K — keep semantic module coverage.** The semantics remain required, but the test file may be replaced if the helper or representation is replaced.
- **S — semantic, needs replacement.** Real guarantees tested through internal APIs the rewrite deletes; reproduce them at the new action/operation boundary.
- **R — representation-only.** Tests only the machinery being removed; delete without replacement.

## 1. Classification

| File | Tests | Class | Disposition |
| --- | --: | :-: | --- |
| `tests/draggable.browser.test.ts` | 51 | **P** | Keep verbatim. Primary draggable acceptance gate. |
| `tests/sortable.browser.test.ts` | 37 | **P** | Keep verbatim. Primary sortable acceptance gate. |
| `tests/kernel/coordinate.browser.test.ts` | 24 | **P** | Keep. `CoordinateMapper` is public. |
| `tests/kernel/presentation.browser.test.ts` | 19 | **P** | Keep. Lift/style-restore behaviour is observable. |
| `tests/kernel/realm.browser.test.ts` | 10 | **P** | Keep. Realm resolution is cross-document behaviour. |
| `tests/draggable/bounds.node.test.ts` | 18 | **P** | Keep. `DragBounds` is public; the module is pure. |
| `tests/sortable/collection-policy.node.test.ts` | 12 | **K** | Keep. `reconcileCollection` is pure and survives the rewrite. |
| `tests/sortable/rect-index.node.test.ts` | 11 | **K** | Keep if the rect index survives; else **S**. |
| `tests/sortable/request.node.test.ts` | 10 | **K** | Keep. `buildReorderProposal` is pure. |
| `tests/sortable/keyboard.node.test.ts` | 8 | **K** | Keep. `keyboardInsertion` is pure. |
| `tests/kernel/resource-scope.node.test.ts` | 12 | **K** | Keep. LIFO / idempotent / best-effort disposal survives. |
| `tests/kernel/presentation-ready.node.test.ts` | 6 | **K** | Keep. The 500 ms barrier survives unchanged. |
| `tests/kernel/invalidation.node.test.ts` | 6 | **K** | Keep. `FrameTask` + `InvalidationSource` survive. |
| `tests/kernel/operation-resources.node.test.ts` | 5 | **K** | Keep. Two-scope ordering survives. |
| `tests/draggable/machine.node.test.ts` | 23 | **S** | Reducer-level. Replace at the new action boundary. |
| `tests/sortable/machine.node.test.ts` | 7 | **S** | Same. |
| `tests/kernel/session.node.test.ts` | 9 | **S** | FIFO/run-to-completion/panic semantics — reproduce against the new runner. |
| `tests/draggable/effects.node.test.ts` | 3 | **S** | Effect-router level. Reproduce as direct-operation tests. |
| `tests/sortable/resolution.node.test.ts` | 2 | **S** | Attempt identity + invalid-value rejection. Reproduce. |
| `tests/kernel/runtime.node.test.ts` | 3 | **R** | Tests the `decide`/`execute`/`dispatch` wiring that the rewrite deletes. |

### 1.1 Totals

| Class     |  Files |   Tests |
| --------- | -----: | ------: |
| P         |      6 |     159 |
| K         |      8 |      70 |
| S         |      5 |      44 |
| R         |      1 |       3 |
| **Total** | **20** | **276** |

P = 51 + 37 + 24 + 19 + 10 + 18 = 159. K = 12 + 11 + 10 + 8 + 12 + 6 + 6 + 5 = 70. S = 23 + 7 + 9 + 3 + 2 = 44. R = 3. 159 + 70 + 44 + 3 = 276. ✓

## 2. Semantic coverage that must be reproduced

The 44 **S** tests encode real guarantees. Mapping to the new boundaries:

| Current coverage | New home |
| --- | --- |
| session FIFO ordering, nested dispatch | runner tests over `dispatch`/`drain` |
| session run-to-completion (effects do not interrupt) | ditto |
| `close()` makes later dispatch inert | ditto |
| panic closes + tears down + reports once | panic tests |
| stale-operation checks halt remaining post-commit work | direct-operation tests |
| draggable phase transitions (23) | per-action tests against the two-frame runtime |
| sortable phase transitions (7) | ditto |
| resolution attempt identity, invalid-value rejection | attempt tests |
| stale async completion is rejected before dispatch and again before commit | producer/action currency tests |

**Do not preserve reducer/effect tests to keep the count constant.** Replace the guarantee, delete the file.

## 3. New coverage required

The identifiers below name **coverage obligations**, not physical test counts. A single parameterized test may cover several variants, and one obligation may require several tests. Acceptance is based on named semantic coverage, not a sacred total such as “65 new tests”.

### 3.1 Public compatibility

| ID | Coverage |
| --- | --- |
| `COMPAT-POLICY-POSITION` | `update({position})` applies after policy update and copies `x`/`y` at dispatch. |
| `COMPAT-BOUNDS-CLEAR` | `update({bounds: undefined})` clears bounds and bumps `boundsVersion`. |
| `COMPAT-ADMISSION-THROW` | throwing admission factories escape while the controller stays idle and usable. |
| `COMPAT-ACTIVATION-CANCEL` | sortable acquisition-stage cancel abandons silently; starting-stage cancel settles through `onCancel`. |
| `COMPAT-DECLARATIONS` | declaration/export snapshot for both entry points. |
| `COMPAT-READINESS-FAILURE` | readiness failure reports only `onError`; recovery remains feature-specific. |
| `COMPAT-RESOLUTION-CANCEL` | after release, pointer/spatial input is closed but Escape/controller cancel still aborts async resolution. |

### 3.2 Reentrancy and callback ordering

| ID | Coverage |
| --- | --- |
| `REENTRANT-DESTROY-*` | `destroy()` from every callback/factory boundary tears down synchronously and permits no later callback. |
| `REENTRANT-CANCEL-THROW` | callback cancel precedes that callback's own failure checkpoint. |
| `REENTRANT-DESTROY-THROW` | callback destroy makes its later throw inert and silent. |
| `CANCEL-IDLE` | idle cancel cannot poison the next operation. |
| `CANCEL-FIRST-WINS` | only the first valid cancel request per operation is consumed. |

### 3.3 Presentation barrier

Every named scenario in artifact 6 §6 is required, including both completion orders, absent gates, timeout, late settlement, recovery replacement, reduced motion and no terminal callback after readiness failure. Grouping and parameterization are implementation details.

### 3.4 Sortable collection

Every matrix case in artifact 7 §4 is required. Start, internal and end gaps must each cover both surviving and broken adjacency; therefore the nine logical cases do not imply exactly nine physical tests.

### 3.5 Retention and teardown

Every `RETENTION-*` obligation in artifact 11 is required. Deterministic private runtime inspection is gated; WeakRef/GC coverage may remain a non-blocking canary.

### 3.6 Queue and currency

Every trace in artifact 2 §3 is required, plus producer-level and action-level identity rejection for each async attempt type. No owner object is required to exercise the producer-level check.

## 4. Acceptance gate for a public cutover

A feature may cut over only when:

1. every **P** test passes unchanged except explicitly approved ledger changes;
2. every **K** semantic guarantee still has passing coverage, whether in the old file or a replacement;
3. every **S** guarantee has a named passing replacement at the new boundary;
4. every **R** test is deleted with its old machinery;
5. all named coverage obligations in §3 pass;
6. `npx just typecheck` is clean;
7. the measurements in artifact 10 are recorded;
8. no test-count target is used as a proxy for behavioural coverage.