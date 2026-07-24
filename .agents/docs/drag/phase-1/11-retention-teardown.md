# Artifact 11 — Retention and teardown tests

The two-frame design introduces a retention hazard the current architecture does not have: after a commit, the **inactive frame holds the entire previous committed state**, including DOM elements, collections, proposals, callbacks and rectangles. If nothing scrubs it, a controller that goes idle after one drag retains that drag's whole object graph indefinitely.

This artifact defines what must be cleared, when, and how it is tested.

## 1. What the current implementation retains when idle

Measured against the code, not the new design:

| Holder | On idle after one operation |
| --- | --- |
| `session.state` | `{policy, nextOperationId, phase: DRAG_IDLE}` — no operation graph. Clean. |
| `operation` owner | `operationId = 0`, `pointerId = 0`, `resources = null`. Clean. |
| presentation / placeholder / spatial owners | reset by `resetOwners()` before `retire()`. Clean. |
| `collection` (sortable) | the latest snapshot — **intentionally** retained; it is the live collection. |
| controller | `#item`, `#visual`, `#requestedPolicy`, `deps` closure — **intentionally** retained; controller lifetime. |

So the current baseline is: **going idle retains nothing operation-owned**. The new runtime must match that, which is exactly what frame scrubbing is for.

## 2. Required scrubbing rules

### 2.1 Inactive-frame lifetime during an active operation

Scrubbing the inactive frame after every action is the conservative default, but it is **not** a mandatory hot-path operation. Retaining one previous committed frame while the same operation remains active is acceptable when:

- both frames have one fixed own-key set created by the same factory;
- shared references obey the shallow-copy contract;
- post-commit code does not treat the inactive frame as authoritative;
- retirement, destroy and panic deterministically clear all operation-owned references even if no later action occurs.

An implementation may therefore choose either:

```ts
// Conservative
runPostCommitEffects(runtime);
resetStateFrame(runtime.draft);
```

or defer the reset until a lifecycle boundary. The latter must be covered by retirement tests and may not allow an idle controller to retain the completed operation graph. Any previous values needed after commit should still be held in narrow locals rather than exposing the inactive frame broadly.

### 2.2 On operation retirement while the controller stays alive

Retirement must scrub even though no further transition occurs. This is the case the review flagged as blocker 1: a controller that does one drag and then sits idle must not pin that drag's DOM.

### 2.3 On `destroy()` and panic

Additionally clear:

- both state frames;
- queued action arguments (`queue.length = 0` is not enough if arguments are held in a parallel array — that array must be cleared too);
- the cancel request latch and its reason;
- staged attempt settlements and errors;
- geometry entries and the rect index (they hold DOM elements);
- any other operation-owned retained graph.

And, fixing [L-11](08-compatibility-ledger.md#l-11): **panic must abort controller ingress**, which it does not today — a panicked controller keeps its `pointerdown` (and sortable `keydown`) listener and the whole `deps` closure alive until the consumer separately calls `destroy()`.

## 3. Required tests

| ID | Test | Asserts |
| --- | --- | --- |
| `RETENTION-IDLE` | after one complete drag and retirement, both frames hold no operation-owned references | direct private-runtime inspection |
| `RETENTION-GC-CANARY` | after retirement, the dragged element can be collected | optional `WeakRef`/forced-GC canary |
| `RETENTION-DESTROY-FRAMES` | `destroy()` clears both frames, queue storage and arguments | direct inspection |
| `RETENTION-DESTROY-ATTEMPTS` | `destroy()` clears attempts and staged settlements | late readiness/resolution is inert |
| `RETENTION-DESTROY-GEOMETRY` | `destroy()` clears DOM-bearing geometry caches | direct inspection |
| `RETENTION-PANIC` | panic clears everything destroy clears before reporting | injected unexpected failure |
| `RETENTION-PANIC-INGRESS` | panic aborts controller ingress | later pointer/key admission does nothing and retains no listener |
| `RETENTION-CANCEL-LATCH` | idle, retired and stale cancel paths leave no latch for a later operation | D-2 |

`RETENTION-GC-CANARY` needs a strategy decision: Vitest can run Node with `--expose-gc`, making `FinalizationRegistry`/`WeakRef` assertions viable, but they are flaky under load. Recommendation: assert on frame contents (deterministic) as the gate, and keep a GC-based test as a non-blocking canary.

## 4. Inspection seam

These tests need to see the frames, which are private. Options:

- **(a)** a test-only export (`__internals`) stripped by the build;
- **(b)** run retention tests against the private runtime module directly, since they are `.node.test.ts` files importing from `src/`;
- **(c)** a `WeakRef`-only black-box approach.

Recommendation: **(b)**. It is what the existing `*.node.test.ts` files already do, needs no production surface, and gives deterministic assertions. The proposal's Phase 2 already builds the runtime behind a test-only factory, so the seam exists for free.

## 5. Invariants restated

From the proposal, the ones this artifact gates:

- the inactive frame is a reusable transaction buffer, **not** an indefinite history snapshot;
- the inactive frame is scrubbed no later than operation retirement, and may be scrubbed after each action as a conservative implementation choice;
- idle operation retirement does not retain retired DOM or consumer graphs;
- both frames and queued/staged references are cleared on destroy and panic;
- values shared by both frames are never mutated in place unless independently transactional.

The last one is the shallow-copy contract. Every field in a frame must be a scalar, immutable, replace-on-write, independently double-buffered, or living outside the frame — and the new code must not, for example, `Object.assign` and then `draft.items.push(...)`.