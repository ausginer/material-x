# drag2 Checkpoint A — second fix-set verification

Date: 2026-08-01

Scope: verification of A-09 through A-15, B-01, P-01, P-02, the behavior-local invalidation action tag, and the test-only `STAGED` export. This pass introduces no source changes, new findings, refactors, or observations outside those items. A-02 through A-08 remain closed and were not re-reviewed.

## Validation run

- `npx just test` from `packages/drag2`: **13 test files, 398 tests passed; no type errors**.
- `npx just build` from `packages/drag2`: **passed; 40 files emitted**.
- `npm pack --dry-run --json --cache /tmp/drag2-review-a2-npm-cache`: **passed; 41 packed entries**, including the emitted `kernel/` runtime and declarations.

## Verdict summary

| Item                                           | Verdict        |
| ---------------------------------------------- | -------------- |
| A-09                                           | **STILL OPEN** |
| A-10                                           | **VERIFIED**   |
| A-11                                           | **VERIFIED**   |
| A-12                                           | **VERIFIED**   |
| A-13                                           | **VERIFIED**   |
| A-14                                           | **VERIFIED**   |
| A-15                                           | **VERIFIED**   |
| B-01                                           | **VERIFIED**   |
| P-01                                           | **VERIFIED**   |
| P-02                                           | **VERIFIED**   |
| Behavior-local invalidation tag / `actionTags` | **VERIFIED**   |
| Test-only `STAGED` public-surface containment  | **VERIFIED**   |

## Item verification

### A-09 — **STILL OPEN**

The controller-local counter fixes the original same-version reproduction for accepted updates. `packages/drag2/src/sortable/controller.ts:32-44` no longer derives a new version from the currently published snapshot, and `packages/drag2/tests/sortable/sortable.browser.test.ts:1468-1501` covers two calls queued from one `onStart` drain as well as calls made across separate drains. Those regressions pass and finish at version 2.

The complete requested condition is not satisfied, however. `version += 1` occurs at `controller.ts:39` **before** `copyUniqueItems(items)` validates at `controller.ts:42`. A refused duplicate update therefore advances the private counter even though it dispatches no collection action. The current refusal regression at `sortable.browser.test.ts:1525-1543` proves only that the refused snapshot was not published and did not cancel the operation; it does not follow the refusal with a valid update and therefore cannot detect that the next accepted snapshot is stamped 2 rather than 1.

Result: accepted queued calls mint strictly increasing versions, including multiple calls during one drain, but refused updates still consume a version. A-09 remains open.

### A-10 — **VERIFIED**

`FAILURE_SCHEDULED_FRAME` is now narrowed at the actual scheduling boundary. `packages/drag2/src/sortable/spec.ts:311-328` wraps only `rt.frame.schedule(...)` and reports a scheduling throw through `host.fail(FAILURE_SCHEDULED_FRAME, error)`. The regression at `sortable.browser.test.ts:1596-1617` forces `requestAnimationFrame` to throw and observes `FAILURE_SCHEDULED_FRAME`, not `FAILURE_RENDERER_WRITE`.

Invalidation failures are likewise classified at the invalidation boundary:

- `spec.ts:149-157` wraps seam-local `slots.invalidateInsertion()` calls and narrows them to `FAILURE_INVALIDATION`.
- `spec.ts:278-290` catches failures raised by the shared scroll/resize invalidator and dispatches behavior-local `TAG_INVALIDATION`.
- `spec.ts:337-343` re-enters through the behavior action seam and classifies the original error as `FAILURE_INVALIDATION`.
- `spec.ts:298-303` stops activation after failed invalidation, before `slots.onStart(...)`.

The regressions at `sortable.browser.test.ts:1547-1594` cover native scroll invalidation, activation-time classification, and suppression of `onStart`. Scroll and resize are installed against the same callback by `packages/drag2/src/kernel/invalidation.ts:23-35`, so the behavior is shared by both event sources.

No frozen kernel SPI was changed: `packages/drag2/src/kernel/spec.ts` is unchanged in this fix set, and the implementation uses the existing behavior action and `host.fail` mechanisms.

### A-11 — **VERIFIED**

`packages/drag2/src/sortable/spec.ts:345-377` checks `draft.phase !== ACTIVE` before resolving an insertion or writing the draft. Every non-`ACTIVE` phase therefore returns `null`, so the action effect—and consequently hooks, invalidation, and DOM writing—does not run.

The direct legality regressions at `packages/drag2/tests/sortable/sortable.browser.test.ts:1793-1868` prove that `ACTIVE` stages and resolves the action, while `ACTIVATING`, `RELEASING`, `SETTLING`, and `FINALIZING` discard it without calling the resolver. This satisfies the original phase-guard reproduction and contract legality row.

### A-12 — **VERIFIED**

`packages/drag2/src/sortable/placement.ts:75-96` obtains the custom result and validates it before `applyMechanics` or any DOM insertion. It rejects:

- values that `DOMRealm.isElement` does not recognize as an `HTMLElement`;
- the dragged item itself;
- the lifted visual itself;
- an element already connected to a document.

The identity and type cases are covered both through activation at `packages/drag2/tests/sortable/sortable.browser.test.ts:1620-1681` and directly with detached identities at `packages/drag2/tests/sortable/placement.browser.test.ts:43-79`. The connected-node regression verifies that the refused node remains in its original document location.

Slot state is mirrored exactly at `placement.ts:40-50`: an unslotted item removes a stale placeholder slot, while a slotted item overwrites it with the item's value. Both directions are covered at `sortable.browser.test.ts:1683-1714`.

### A-13 — **VERIFIED**

The existing out-of-band `pendingFailure` slot is now explicitly accepted and documented at `packages/drag2/src/sortable/spec.ts:105-132`; no SPI redesign was made.

The transaction invariant is present in executable ordering:

1. `settlement.prepare` clears `pendingFailure` on entry at `spec.ts:570-571`.
2. Its only write occurs later in the `SETTLED_FAILED` branch at `spec.ts:638-639`.
3. `settlement.effect` captures and clears the value before any consumer callback at `spec.ts:656-659`.
4. The seam driver still refuses nested seam execution, so no transaction can interleave a second write between one prepare/effect pair.

This is the documented clear-before-write invariant requested by the checkpoint, while `PreparedSettlement` and the frozen kernel SPI remain unchanged.

### A-14 — **VERIFIED**

`packages/drag2/src/sortable/collection.ts:41-52` copies the collection and rejects repeated element identities with a `Set` size check. Construction uses this boundary at `packages/drag2/src/sortable/runtime.ts:96-105`; `updateItems()` uses it before dispatch at `packages/drag2/src/sortable/controller.ts:35-46`.

The regressions at `packages/drag2/tests/sortable/sortable.browser.test.ts:1504-1543` reject duplicates both during construction and from `updateItems()`. The active-operation case proves a refused update publishes no replacement, leaves the committed snapshot at version 0, and does not cancel the operation. The private counter gap described under A-09 does not alter that existing operation, so it does not reopen A-14.

### A-15 — **VERIFIED**

`packages/drag2/src/kernel/realm.ts:32-47` first checks the controller realm's exact `HTMLElement` constructor, then checks the candidate's own `ownerDocument.defaultView.HTMLElement` constructor. This accepts same-realm and cross-realm HTML elements without falling back to the unsound `nodeType === 1` guard.

SVG and MathML elements are not instances of `HTMLElement`; text nodes and plain objects also fail both checks. `packages/drag2/tests/kernel/realm.browser.test.ts:4-47` directly covers same-realm HTML, iframe HTML, SVG, text, and a spoofing plain object. MathML is not named in a separate regression, but it is rejected by the same exact-constructor condition as SVG rather than by namespace-specific logic.

### B-01 — **VERIFIED**

`packages/drag2/package.json:6-13` now includes `kernel` in the packed `files` allowlist. The regression at `packages/drag2/tests/packaging.node.test.ts:60-105` walks the runtime entrypoints' transitive relative imports and verifies that every emitted top-level directory is shipped.

A fresh build and `npm pack --dry-run` reproduce the actual package contents: the tarball includes `kernel/kernel.js`, `kernel/spec.d.ts`, and the transitive kernel files required by `drag.js` and `drag.d.ts`. This closes the original broken-kernel tarball reproduction.

As requested, the currently missing `sortable.js` artifact and a real pack/extract/import consumer fixture remain deferred until Phase 7. The current packaging regression checks source-graph/allowlist consistency; it is not that deferred packed-consumer fixture.

### P-01 — **VERIFIED**

`packages/drag2/src/kernel/kernel.ts:1430-1441` creates one `runMoved` callback in the controller closure. Every active MOVE passes that stable callback to `driver.runLeaf` at `kernel.ts:1457-1461`; no per-sample arrow is created.

The callback reads the swappable `current` and `lift` slots when invoked. The two-operation regression at `packages/drag2/tests/sortable/sortable.browser.test.ts:1870-1891` first exercises the callback with one operation, then starts a second operation and proves that movement targets the second item's lift while the first item's presentation stays restored.

### P-02 — **VERIFIED**

`packages/drag2/src/sortable/spec.ts:430-459` checks `placeholderAt(...)` before the spatial move pipeline. An already-correct destination returns before `beforeMove`, the DOM writer, invalidation, or `afterMove`. The regressions at `packages/drag2/tests/sortable/sortable.browser.test.ts:1717-1791` prove both hook and invalidation suppression for an inert destination and prove that a real move still executes the hook pipeline and changes the DOM position.

The canonical writer at `packages/drag2/src/sortable/placement.ts:140-156` independently returns `false` without a DOM write for an inert destination and `true` after a real move. Direct regressions at `packages/drag2/tests/sortable/placement.browser.test.ts:109-159` verify both boolean results, absence of mutation records on the inert path, end-gap writing, and the empty-destination result. Unconditional home/release recovery callers remain routed through this writer at `spec.ts:160-165` and `spec.ts:551`.

## Requested surface checks

### Behavior-local invalidation tag through `actionTags` — **VERIFIED**

`packages/drag2/src/sortable/runtime.ts:22-31` declares the contiguous behavior-local tags `TAG_SPATIAL = 0`, `TAG_COLLECTION = 1`, and `TAG_INVALIDATION = 2`, with `SORTABLE_ACTION_TAGS = 3`. `packages/drag2/src/sortable/spec.ts:172-177` supplies that count through `config.actionTags`. The kernel's existing bounds check at `packages/drag2/src/kernel/kernel.ts:1793-1807` therefore admits the new tag through the frozen behavior-action protocol rather than through an SPI addition.

### Test-only `STAGED` export — **VERIFIED**

`STAGED` is exported only from the internal source module at `packages/drag2/src/sortable/spec.ts:84-90` so the direct legality test can compare its staged value. It is not re-exported by `packages/drag2/src/sortable.ts` or `packages/drag2/src/drag.ts`, and `package.json` exposes no `./sortable/spec.js` subpath.

The fresh build contains no `STAGED` symbol in any emitted public JavaScript or declaration, and the dry-run tarball does not contain `sortable/spec.js`. The test-only export therefore does not become part of the final package surface.