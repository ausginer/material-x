# Source-shape audit, exhaustive — every function declaration in `src/`, with a verdict

Review, 2026-08-25. Files read at `077bcbdb`. **No production code changed.**

**This supersedes the inventory claim of [`source-shape-audit-claude.md`](source-shape-audit-claude.md) (077bcbdb) and preserves its findings.** That pass reported a 179-declaration figure and tabled roughly 34 rows, which is a candidate list presented as an audit. Two structurally symmetric pairs prove the gap: `seamFailed` was classified KILL while its two-line twin `seamDiscarded`, four lines below it in the same file, was absent; and `captureFrameKeys` was classified KILL while `beginFrame` — another one-expression wrapper over one language operation, in the same file, also exported, also with one production caller — was absent. Neither omission was a judgement. Both were artefacts of candidate discovery noticing one member of a pair.

**No candidate discovery was delegated here.** Every row below comes from a TypeScript-AST walk of `src/`, and every reference count from an AST identifier census rather than `grep`.

---

## 0. Method, and how to verify the count

**Inventory rule, stated so it is reproducible:** every `FunctionDeclaration` with a name, plus every `VariableDeclaration` bound to an identifier whose initializer is an `ArrowFunction` or `FunctionExpression`, at any nesting depth, in every `.ts` file under `src/` that is not a `.d.ts`. Anonymous callbacks passed inline and object-literal methods (the `BehaviorSpec` protocol members, for instance) are **not** declarations under this rule and are excluded — otherwise the count is unbounded by construction.

That rule yields **182 declarations across 56 files**: 86 function declarations, 96 function-valued bindings; 103 top-level, 79 inner; 81 exported.

**The previous pass's 179 was wrong in both directions** — its regex invented rows (it counted a property named `type` as a function) and missed real ones. 182 is the number to check against.

**Reference counts are AST identifier occurrences in `src/`, excluding the declaration's own name position and excluding `import`/`export` specifier lines.** This matters: a `grep` for `owns` returns 69 hits in this tree, almost all of them the English word in prose. The real figure is 1. Test counts are raw identifier occurrences under `tests/`.

**A zero production count does not by itself mean dead.** Seven declarations have none, and four of them — `sortable`, `freeDrag`, `xy`, `layoutAnimation` — are published entry points called by consumers, not by `src/`. The three that are not entry points are `seamFailed`, `createSortableBehavior` and `setRefreshVerification`.

**Verification:** the tables in §3 contain exactly 182 data rows, one per declaration, each with exactly one verdict. Rows are grouped by file in AST order, so the listing can be diffed against a re-run of the same walk.

### Totals

| Verdict        | Count   |
| -------------- | ------- |
| **KILL**       | 7       |
| **OWNER LOOK** | 15      |
| **KEEP**       | 160     |
| **Total**      | **182** |

---

## 1. The two falsifier pairs

The brief names these as the test of the method. Neither may disappear, and where twins get different verdicts the distinction has to be stated.

### 1.1 `seamFailed` / `seamDiscarded` — [`kernel/seams.ts:111,115`](../../../src/kernel/seams.ts)

```ts
export const seamFailed = (outcome: SeamOutcome): boolean =>
  outcome === SEAM_PREPARE_FAILED || outcome === SEAM_EFFECT_FAILED;

export const seamDiscarded = (outcome: SeamOutcome): boolean =>
  outcome === SEAM_DISCARDED || outcome === SEAM_INVALIDATED;
```

Syntactically identical: two-line exported predicates, each a two-arm disjunction over the same enum, adjacent in the same file. Verdicts differ, and **the whole distinction is the caller census**:

|  | production refs | test refs |
| --- | --- | --- |
| `seamFailed` | **0** | 6 |
| `seamDiscarded` | **1** ([`seams.ts:565`](../../../src/kernel/seams.ts), in `runActivationSeam`) | 5 |

`seamFailed` has **no production reader anywhere in `src/`**. Under the working rule a boundary with no reader owns nothing, so it is KILL regardless of shape. `seamDiscarded` has one reader, which makes it a thin single-use predicate — OWNER LOOK, on the same terms as the other single-caller rows.

**But they are a vocabulary pair over one enum, and that is the part a row-by-row reading loses.** Deleting `seamFailed` alone leaves `SeamOutcome` with one named classification and one open-coded, which is a worse reading of the enum than either keeping both or inlining both. The recommendation is therefore explicitly _paired_: either delete both and let each call site name its outcomes inline, or keep both as the enum's vocabulary and accept that one has no current caller. **What should not happen is the asymmetric outcome the previous pass would have produced.**

`seamFailed`'s four-line comment states a real rule — a classified failure must also stop incompatible continuation, because the checkpoint is queued (D-23). That rule is enforced elsewhere. The comment is worth relocating to whatever enforces it; the function is not what is holding it up.

### 1.2 `captureFrameKeys` / `beginFrame` — [`kernel/frames.ts:216,168`](../../../src/kernel/frames.ts)

```ts
export function captureFrameKeys(frame: object): readonly string[] {
  return Object.keys(frame);
}

export function beginFrame<Part extends object>(
  draft: Frame<Part>,
  current: Frame<Part>,
): void {
  Object.assign(draft, current);
}
```

Both exported, both one expression over one language operation, both **1 production caller**, both ~9 test references. The previous pass killed the first and never saw the second.

**The distinction I will defend, and its limit.** `beginFrame` carries two things `captureFrameKeys` does not:

- **a typed pair.** `Frame<Part>` on both parameters says draft and current are the same shape — the signature is a constraint, not decoration, and it is what stops `Object.assign(draft, anythingElse)`;
- **the shallow-copy contract.** Its doc states that both frames reference the same nested objects afterwards, which is why every frame field must be scalar, immutable, or replace-on-write (contract 04). That is a load-bearing invariant about the _whole frame model_, and this is where the kernel states it.

`captureFrameKeys` is `Object.keys` with a `readonly` return and a one-line comment. It is also not a step in the frame lifecycle: `composeFrame` → `beginFrame` → `commit` → `scrubFrame` are transitions the kernel drives at defined moments; `captureFrameKeys` is a helper for the assertion instrument.

**The limit, stated plainly:** that is a _family and contract_ argument, not a claim that `beginFrame` hides work. It is one `Object.assign`. **If the owner does not accept the typed-pair/contract argument, `beginFrame` belongs in KILL beside `captureFrameKeys`, and they should be decided together.** That is why it is OWNER LOOK rather than KEEP — I am not confident enough in the distinction to settle it alone, and an audit that quietly kept it while killing its twin would be repeating the failure this document corrects.

---

## 2. The dispositions that are not KEEP

### 2.1 KILL (7)

| Name | Location | src | Why |
| --- | --- | --- | --- |
| `seamFailed` | `kernel/seams.ts:111` | **0** | No production reader. See §1.1 — decide with `seamDiscarded`. |
| `setRefreshVerification` | `sortable/verified-refresh.ts:102` | **0** | No production reader; a `__DEV__` measurement hook for `tests/perf`. Its own doc says so. Dies in the shipped build. |
| `captureFrameKeys` | `kernel/frames.ts:216` | 1 | `Object.keys(frame)` renamed. See §1.2. |
| `dropStaged` | `kernel/kernel.ts:760` | 3 | Forwards one call to `driver.consumeStaged()`. The 8-line comment is the content; three call sites make it a rename used thrice. |
| `centreOf` | `sortable/y.ts:93` | 1 | `getBoundingClientRect()` then a midpoint, one caller. |
| `NOOP_START` | `sortable/slots.ts:271` | 1 | A named `() => {}`, one caller: `config.onStart ?? NOOP_START`. |
| `isPrimaryPress` | `kernel/pointer.ts:77` | 1 | `event.button === 0 && event.isPrimary`, one caller, behind a cross-module import. |

### 2.2 OWNER LOOK (15)

| Name | Location | src | The tension |
| --- | --- | --- | --- |
| `createSortableBehavior` | `sortable/behavior.ts:74` | **0** | A deliberate test seam with a recorded decision (D-126) one day old. Real argument; still a zero-production-caller export. |
| `seamDiscarded` | `kernel/seams.ts:115` | 1 | §1.1 — pair with `seamFailed`. |
| `beginFrame` | `kernel/frames.ts:168` | 1 | §1.2 — pair with `captureFrameKeys`. |
| `sameKeys` | `kernel/frames.ts:212` | 2 | Ordered key equality; tiny, but ordered-vs-unordered is a genuine drift risk across two sites. |
| `assertFrameShapesMatch` | `kernel/frames.ts:228` | 1 | One expression; owns F-2's name and message only. |
| `validateFrameDescriptors` | `kernel/frames.ts:235` | 1 | A real loop, extracted from the single function that uses it. |
| `thenOf` | `kernel/kernel.ts:1334` | 1 | Owns read-`.then`-once (A-08). Its own doc records the decay: _"One caller since Phase 15."_ |
| `onEscape` | `kernel/kernel.ts:793` | 1 | Used as a callback argument; the alternative is an arrow at the call. |
| `settleCancellation` | `kernel/kernel.ts:1977` | 1 | Forwards to `openSettlement` with an object literal. |
| `onCommand` | `kernel/kernel.ts:1083` | 1 | Wraps `openIngress` around a one-line closure. |
| `owns` | `kernel/input-policy.ts:58` | 1 | One caller, inside a loop in the same file. Owns the "test the capability, not the type" choice. |
| `enqueue` | `kernel/queue.ts:42` | 1 | The parallel-array lockstep is real, but one writer means no second site to drift from. Contrast `clearQueue` (2 callers), which keeps its case. |
| `capacityFor` | `sortable/rect-index.ts:79` | 1 | Names the doubling growth policy; a nearby comment reasons about it. Single-use loop. |
| `homeGap` | `sortable/spec.ts:502` | 1 | A named two-step with a real conditional, used once. |
| `subjectOf` | `free-drag/spec.ts:158` | 2 | An object-literal shape; worth it only if `FreeDragSubject` is expected to grow. |

### 2.3 What the first pass got right, re-confirmed

The findings in 077bcbdb are preserved, not re-litigated. Its seven KILL rows all survive re-derivation with AST-accurate counts. Its "small but earned" KEEPs also survive, and three are worth restating because they are the strongest counterexamples to a mechanical size rule:

- **`willWrite`** [`sortable/placement.ts:88`](../../../src/sortable/placement.ts) — inlining it **reinstates a fixed bug**. D-127 moved the `restoreAttribute(...)` snapshot inside the guard because in argument position it was evaluated for the default path too: four `getAttribute` reads and four closures allocated and discarded per activation.
- **`runMoved`** [`kernel/kernel.ts:1847`](../../../src/kernel/kernel.ts) — three lines, one caller, and still earned: it is hoisted to one arrow per controller instead of one per pointer move, and it reads the swappable `current`/`lift` slots at call time, which is what makes the hoist sound. **The first pass never examined it**; a size-and-caller heuristic would have killed it.
- **`neutralizeUA`** [`kernel/presentation.ts:232`](../../../src/kernel/presentation.ts) — one caller, and the whole function is the read/write ordering that collapses a per-property style recalc.

---

## 3. The full inventory — 182 rows

Every declaration, in AST order, grouped by file. `src` and `test` are AST reference counts as defined in §0. Rows with a category-level basis are the ones whose disposition is not in question — they are listed so the count is complete and checkable, not because each was individually argued.

### `src/free-drag.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 107 | 7L | 0 | 27 | exported | `freeDrag` | **KEEP** | Published entry point — consumer surface, not an internal boundary. |

### `src/free-drag/assemble.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 58 | 15L | 5 | 0 | private | `claim` | **KEEP** | Single-writer enforcement across independently-authored plugins. |
| 74 | 105L | 2 | 34 | exported | `assemble` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |

### `src/free-drag/behavior.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 38 | 11L | 8 | 3 | private | `install` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 68 | 15L | 1 | 0 | exported | `createComposedFreeDragBehavior` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/free-drag/bounds.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 32 | 106L | 3 | 24 | exported | `bounds` | **KEEP** | Published entry point — consumer surface, not an internal boundary. |
| 65 | 25L | 7 | 251 | private, inner | `resolve` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/free-drag/config.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 130 | 36L | 1 | 0 | exported | `mergeFreeFragments` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/free-drag/controller.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 71 | 24L | 1 | 0 | exported | `createFreeDragController` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/free-drag/domain.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 157 | 7L | 1 | 0 | exported | `isFreeDragResolution` | **KEEP** | Protocol gate: what counts as an explicit resolution vs FAILURE_RESOLUTION. |

### `src/free-drag/frames.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 46 | 9L | 1 | 0 | exported | `createFreeDragFramePart` | **KEEP** | Kernel SPI member; mirror invariant with its reset. |
| 62 | 7L | 1 | 0 | exported | `resetFreeDragFramePart` | **KEEP** | Kernel SPI member; mirror invariant with its factory. |

### `src/free-drag/geometry.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 28 | 9L | 2 | 0 | exported | `localDeltaOf` | **KEEP** | Matrix projection with a null fast path. |
| 43 | 7L | 1 | 0 | exported | `applyAxis` | **KEEP** | The axis-projection domain rule, deliberately not a capability (D-70). |
| 57 | 13L | 4 | 7 | exported | `currentRect` | **KEEP** | Realm-correct DOMRectReadOnly construction — a cross-realm contract. |
| 76 | 20L | 2 | 0 | exported | `buildGeometry` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 98 | 22L | 1 | 0 | exported | `buildRequest` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/free-drag/landing.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 29 | 7L | 13 | 56 | exported | `landing` | **KEEP** | Published entry point — consumer surface, not an internal boundary. |

### `src/free-drag/runtime.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 71 | 16L | 1 | 0 | exported | `createFreeDragRuntime` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/free-drag/spec.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 69 | 4L | 8 | 1 | private | `rejection` | **KEEP** | Eight call sites; owns the SeamRejection shape. |
| 74 | 841L | 1 | 0 | exported | `createFreeDragSpec` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 139 | 17L | 4 | 0 | private, inner | `deriveMotion` | **KEEP** | Writes into `motion` rather than returning a Point — an explicit hot-path allocation choice. |
| 158 | 4L | 2 | 0 | private, inner | `subjectOf` | **OWNER LOOK** | Two callers; an object-literal shape. Worth it only if `FreeDragSubject` is expected to grow. |

### `src/kernel.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 244 | 14L | 2 | 11 | exported | `draggable` | **KEEP** | Published entry point — consumer surface, not an internal boundary. |

### `src/kernel/errors.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 128 | 6L | 4 | 13 | exported | `toDraggableError` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/kernel/frames.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 54 | 11L | 1 | 4 | exported | `createKernelFrame` | **KEEP** | Mirror invariant with `resetKernelFields`; allocates the kernel slice of both frames. |
| 66 | 9L | 1 | 2 | exported | `resetKernelFields` | **KEEP** | Mirror invariant with `createKernelFrame`: a field added to one and not the other is a retained reference. |
| 152 | 7L | 2 | 30 | exported | `composeFrame` | **KEEP** | Two sources in one expression; the Object.assign typing yields Frame<Part> with no cast. |
| 168 | 6L | 1 | 9 | exported | `beginFrame` | **OWNER LOOK** | One caller, one language operation — `Object.assign`. Survives only on the typed frame-pair + shallow-copy contract; see sibling note. |
| 181 | 7L | 1 | 8 | exported | `scrubFrame` | **KEEP** | Two sources, and the caller must wrap each individually because resetFramePart may throw (D-29, F-36). |
| 206 | 5L | 4 | 0 | private | `assert` | **KEEP** | Multi-statement helper with a distinct responsibility. |
| 212 | 2L | 2 | 0 | private | `sameKeys` | **OWNER LOOK** | Two callers; ordered key equality. Real but tiny; ordered-vs-unordered is a genuine drift risk. |
| 216 | 3L | 1 | 9 | exported | `captureFrameKeys` | **KILL** | `Object.keys(frame)` renamed. Not a frame-lifecycle step — see the sibling note on `beginFrame`. |
| 228 | 6L | 1 | 3 | exported | `assertFrameShapesMatch` | **OWNER LOOK** | One caller, one expression. Owns F-2's name and message only. |
| 235 | 15L | 1 | 0 | private | `validateFrameDescriptors` | **OWNER LOOK** | One caller; a real loop, but extracted from the single function that uses it. |
| 272 | 19L | 1 | 7 | exported | `assertFrameScrubbed` | **KEEP** | Multi-statement helper with a distinct responsibility. |

### `src/kernel/input-policy.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 58 | 8L | 1 | 0 | private | `owns` | **OWNER LOOK** | One caller, inside a loop in the same file. Owns the "test the capability, not the type" choice. |
| 83 | 13L | 2 | 0 | exported | `pathOwnsInteraction` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/kernel/invalidation.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 23 | 14L | 2 | 0 | exported | `createInvalidator` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 49 | 43L | 1 | 6 | exported | `createFrameTask` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 59 | 11L | 1 | 0 | private, inner | `runNow` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/kernel/kernel.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 235 | 2221L | 1 | 0 | exported | `createKernel` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 353 | 7L | 8 | 4 | private, inner | `begin` | **KEEP** | Transaction open: stamp reset, operation pin, frame copy. |
| 361 | 11L | 8 | 53 | private, inner | `commit` | **KEEP** | The frame swap — the central protocol transition. |
| 381 | 9L | 3 | 0 | private, inner | `runStamped` | **KEEP** | Phase-stamp lifecycle with a required finally. |
| 397 | 5L | 5 | 1 | private, inner | `preparationValid` | **KEEP** | The cancel/destroy latch guarding an open preparation. |
| 418 | 24L | 3 | 0 | private, inner | `retireAttempts` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 443 | 9L | 2 | 0 | private, inner | `clearOperationState` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 453 | 26L | 6 | 0 | private, inner | `scrub` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 488 | 27L | 7 | 0 | private, inner | `retireOperation` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 526 | 33L | 2 | 0 | private, inner | `runPhysicalTeardown` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 574 | 18L | 15 | 157 | private, inner | `destroy` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 600 | 8L | 2 | 0 | private, inner | `leaveTransaction` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 620 | 4L | 5 | 3 | private, inner | `panic` | **KEEP** | Controller termination on invariant break; passed as the drain callback. |
| 625 | 21L | 12 | 0 | private, inner | `dispatchKernel` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 653 | 8L | 23 | 56 | private, inner | `cancel` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 667 | 47L | 3 | 0 | private, inner | `failOperation` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 760 | 3L | 3 | 0 | private, inner | `dropStaged` | **KILL** | Forwards one call to `driver.consumeStaged()`. The 8-line comment above it is the content. |
| 768 | 24L | 3 | 0 | private, inner | `onPointer` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 793 | 3L | 3 | 0 | private, inner | `onEscape` | **OWNER LOOK** | One use, as a callback argument — the alternative is an arrow at the `armCancelInput` call. |
| 821 | 50L | 2 | 0 | private, inner | `runAdmission` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 880 | 43L | 2 | 0 | private, inner | `mintOperation` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 924 | 8L | 1 | 0 | private, inner | `admitPress` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 941 | 7L | 1 | 0 | private, inner | `admitCommand` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 977 | 33L | 2 | 0 | private, inner | `openIngress` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 1034 | 31L | 1 | 0 | private, inner | `armClickSuppressor` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 1038 | 7L | 3 | 2 | private, inner | `disarm` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 1066 | 16L | 1 | 0 | private, inner | `onPointerDown` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 1083 | 5L | 1 | 0 | private, inner | `onCommand` | **OWNER LOOK** | One caller; wraps `openIngress` around a one-line closure. |
| 1117 | 66L | 1 | 0 | private, inner | `acquireActivation` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 1184 | 17L | 2 | 468 | private, inner | `activate` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 1208 | 2L | 2 | 0 | private, inner | `isRejection` | **KEEP** | Two callers; the PreparedSettlement/SeamRejection discriminant. |
| 1282 | 11L | 2 | 0 | private, inner | `createSettlementAttempt` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 1304 | 14L | 2 | 0 | private, inner | `createSettlementScope` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 1334 | 5L | 1 | 0 | private, inner | `thenOf` | **OWNER LOOK** | One caller. Owns read-`.then`-once (A-08); its own doc records the decay: "One caller since Phase 15". |
| 1345 | 6L | 2 | 0 | private, inner | `settlementLive` | **KEEP** | SETTLING-phase liveness barrier, checked on both sides of `start`. |
| 1359 | 2L | 2 | 0 | private, inner | `joinLive` | **KEEP** | FINALIZING-phase liveness barrier, re-read after each foreign call (I-6). |
| 1362 | 8L | 5 | 0 | private, inner | `rollbackLandingHold` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 1376 | 40L | 2 | 0 | private, inner | `completeLanding` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 1428 | 146L | 1 | 0 | private, inner | `armSettlement` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 1585 | 99L | 1 | 0 | private, inner | `joinSettlement` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 1685 | 12L | 2 | 0 | private, inner | `advanceSettlement` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 1702 | 38L | 2 | 0 | private, inner | `openSettlement` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 1746 | 12L | 6 | 0 | private, inner | `settleResolution` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 1767 | 64L | 1 | 0 | private, inner | `openResolution` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 1847 | 3L | 1 | 0 | private, inner | `runMoved` | **KEEP** | Single caller and still earned: hoisted to one arrow per controller instead of one per move; reads swappable slots at call time. |
| 1851 | 48L | 1 | 0 | private, inner | `handleMove` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 1905 | 21L | 2 | 0 | private, inner | `closeOperation` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 1927 | 18L | 1 | 0 | private, inner | `handleUp` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 1951 | 7L | 1 | 0 | private, inner | `handleRelease` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 1963 | 7L | 1 | 0 | private, inner | `handleActivate` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 1977 | 3L | 1 | 0 | private, inner | `settleCancellation` | **OWNER LOOK** | One caller; forwards to `openSettlement` with an object literal. |
| 1981 | 19L | 1 | 0 | private, inner | `handleResolutionSettled` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 2001 | 14L | 1 | 0 | private, inner | `handleLandingSettled` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 2016 | 57L | 1 | 0 | private, inner | `handleCancel` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 2074 | 30L | 1 | 0 | private, inner | `handleStartCommitted` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 2105 | 82L | 1 | 0 | private, inner | `handleFailed` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 2217 | 21L | 1 | 0 | private, inner | `handleErrorReported` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 2239 | 21L | 1 | 0 | private, inner | `handleBehaviorAction` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |

### `src/kernel/lifetimes.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 57 | 58L | 3 | 11 | exported | `createLifetime` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 129 | 16L | 1 | 3 | exported | `createOperationLifetimes` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/kernel/pointer.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 38 | 9L | 1 | 0 | exported | `armPointerInput` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 57 | 15L | 1 | 0 | exported | `armCancelInput` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 77 | 3L | 1 | 0 | exported | `isPrimaryPress` | **KILL** | One caller. `event.button === 0 && event.isPrimary`, behind a cross-module import. |
| 92 | 22L | 1 | 4 | exported | `acquirePointerCapture` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/kernel/presentation.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 130 | 31L | 1 | 0 | exported | `captureInlineStyles` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 178 | 49L | 1 | 8 | exported | `acquireTopLayer` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 186 | 21L | 2 | 4 | private, inner | `restore` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 232 | 14L | 1 | 0 | private | `neutralizeUA` | **KEEP** | Single caller and still earned: batches every computed-style read before any write, collapsing a per-property style recalc. |
| 381 | 39L | 2 | 0 | private | `makeSession` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 442 | 25L | 1 | 0 | private | `inheritedSpaceOf` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 511 | 111L | 1 | 7 | exported | `acquireLift` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |

### `src/kernel/queue.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 34 | 3L | 1 | 12 | exported | `createActionQueue` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 42 | 8L | 1 | 19 | exported | `enqueue` | **OWNER LOOK** | One writer. The parallel-array lockstep is a real invariant but has no second site to drift from. |
| 55 | 4L | 2 | 2 | exported | `clearQueue` | **KEEP** | Three callers; owns the lifetime rule that queued arguments must not outlive the drain. |
| 68 | 25L | 2 | 16 | exported | `drain` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/kernel/realm.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 21 | 30L | 1 | 28 | exported | `createRealm` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/kernel/reporter.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 23 | 16L | 20 | 67 | exported | `report` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 45 | 8L | 18 | 0 | exported | `guarded` | **KEEP** | ~18 call sites; the best-effort execution boundary and platform-report channel. |

### `src/kernel/seams.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 111 | 2L | 0 | 6 | exported | `seamFailed` | **KILL** | No production reader anywhere in src/. Exported predicate called only by its own tests. |
| 115 | 2L | 1 | 5 | exported | `seamDiscarded` | **OWNER LOOK** | One caller, 2 lines. Structural twin of `seamFailed` — see the sibling note. |
| 277 | 254L | 1 | 2 | exported | `createSeamDriver` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 338 | 6L | 2 | 0 | private, inner | `refuseReentry` | **KEEP** | A re-entrancy latch — a protocol transition. |
| 358 | 52L | 6 | 0 | private, inner | `runPhase` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 545 | 28L | 1 | 9 | exported | `runActivationSeam` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 584 | 20L | 1 | 7 | exported | `runReleaseSeam` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/shared/landing-runner.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 112 | 152L | 2 | 0 | exported | `createLandingStart` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 211 | 39L | 1 | 1 | private, inner | `play` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/sortable.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 145 | 7L | 0 | 59 | exported | `sortable` | **KEEP** | Published entry point — consumer surface, not an internal boundary. |

### `src/sortable/assemble.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 31 | 22L | 5 | 0 | private | `claim` | **KEEP** | Single-writer enforcement across independently-authored plugins — the one guard the gate audit strengthened. |
| 54 | 185L | 2 | 34 | exported | `assemble` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |

### `src/sortable/behavior.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 13L | 8 | 3 | private | `install` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 74 | 12L | 0 | 5 | exported | `createSortableBehavior` | **OWNER LOOK** | No production reader. A deliberate test seam with a recorded decision (D-126) one day old. |
| 99 | 47L | 1 | 0 | exported | `createComposedSortableBehavior` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |

### `src/sortable/collection.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 47 | 48L | 1 | 0 | exported | `reconcileCollection` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 119 | 17L | 2 | 3 | exported | `homeInsertion` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 173 | 27L | 1 | 0 | exported | `buildReorderProposal` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/sortable/config.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 197 | 41L | 1 | 21 | exported | `mergeFragments` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |

### `src/sortable/controller.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 54 | 45L | 1 | 0 | exported | `createSortableController` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |

### `src/sortable/domain.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 81 | 12L | 6 | 6 | exported | `insertionAt` | **KEEP** | Published at the middle tier (D-123) and the single construction owner (D-119). |
| 170 | 7L | 1 | 0 | exported | `isReorderResolution` | **KEEP** | Protocol gate: what counts as an explicit resolution vs FAILURE_RESOLUTION. |

### `src/sortable/frames.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 36 | 11L | 1 | 11 | exported | `createSortableFramePart` | **KEEP** | Kernel SPI member; mirror invariant with its reset. |
| 54 | 9L | 1 | 0 | exported | `resetSortableFramePart` | **KEEP** | Kernel SPI member; mirror invariant with its factory. |

### `src/sortable/keyboard.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 37 | 11L | 1 | 0 | exported | `directionOf` | **KEEP** | The keyboard command mapping — publishable policy. |
| 64 | 26L | 1 | 0 | exported | `keyboardInsertion` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/sortable/landing.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26 | 7L | 13 | 56 | exported | `landing` | **KEEP** | Published entry point — consumer surface, not an internal boundary. |

### `src/sortable/layout-animation.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 36 | 293L | 0 | 30 | exported | `layoutAnimation` | **KEEP** | Published entry point — consumer surface, not an internal boundary. |
| 48 | 278L | 8 | 3 | private, inner | `install` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 82 | 69L | 1 | 0 | private, inner | `collect` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 159 | 4L | 7 | 4 | private, inner | `discard` | **KEEP** | Seven callers; resets two parallel arrays in lockstep. |

### `src/sortable/placement.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 65 | 13L | 1 | 0 | private | `restoreAttribute` | **KEEP** | Owns a measured Chromium quirk: removeAttribute("style") leaves style="" where removeNamedItem does not (D-39). |
| 88 | 13L | 4 | 0 | private | `willWrite` | **KEEP** | Inlining REINSTATES a fixed bug: D-127 moved the snapshot inside the guard because argument-position evaluation cost 4 getAttribute reads + 4 closures per activation. |
| 120 | 91L | 2 | 0 | private | `applyMechanics` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 223 | 54L | 5 | 26 | exported | `createPlaceholder` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 287 | 18L | 2 | 0 | exported | `placeholderAt` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 329 | 25L | 3 | 18 | exported | `movePlaceholder` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |

### `src/sortable/rect-index.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 79 | 9L | 1 | 14 | private | `capacityFor` | **OWNER LOOK** | One caller. Names the doubling growth policy; a nearby comment reasons about it (n <= capacity < 2n). |
| 89 | 186L | 2 | 7 | exported | `createRectIndex` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 112 | 5L | 12 | 4 | private, inner | `abort` | **KEEP** | Twelve callers; shared exit that retires the cache and reports the abort. |

### `src/sortable/runtime.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 158 | 45L | 1 | 7 | exported | `createSortableRuntime` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |

### `src/sortable/slots.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 271 | 1L | 1 | 2 | exported | `NOOP_START` | **KILL** | One caller. A named `() => {}`. |

### `src/sortable/spec.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 117 | 4L | 8 | 1 | private | `rejection` | **KEEP** | Eight call sites; owns the SeamRejection shape. |
| 122 | 1588L | 1 | 7 | exported | `createSortableSpec` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 142 | 1L | 54 | 77 | private, inner | `live` | **KEEP** | 54 call sites; the liveness barrier the whole spec is written against. |
| 197 | 67L | 2 | 0 | private, inner | `resolveItem` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 276 | 61L | 2 | 0 | private, inner | `seedDraft` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 349 | 21L | 1 | 0 | private, inner | `admitFrom` | **KEEP** | Queued-action handler / protocol transition with its own phase guard. |
| 415 | 9L | 5 | 0 | private, inner | `invalidateInSeam` | **KEEP** | Owns failure-stage narrowing to FAILURE_INVALIDATION, which the outer phase cannot classify correctly. |
| 432 | 25L | 1 | 0 | private, inner | `measureInSeam` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 482 | 18L | 1 | 0 | private, inner | `settleDisplacement` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 502 | 7L | 1 | 0 | private, inner | `homeGap` | **OWNER LOOK** | One caller. A named two-step with a real conditional, used once. |

### `src/sortable/verified-refresh.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 102 | 5L | 0 | 13 | exported | `setRefreshVerification` | **KILL** | No production reader; a `__DEV__` measurement hook for `tests/perf`, self-labelled as such. |
| 168 | 21L | 3 | 0 | private | `unchanged` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 225 | 63L | 1 | 3 | private | `verify` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 347 | 26L | 2 | 0 | private | `translation` | **KEEP** | Owns a constructor, protocol step, or multi-step algorithm. |
| 374 | 89L | 1 | 0 | private | `shift` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 480 | 158L | 1 | 2 | exported | `createVerifiedRefresh` | **KEEP** | Substantial algorithm; well above the micro-abstraction threshold. |
| 511 | 6L | 2 | 0 | private, inner | `forget` | **KEEP** | Resets four mirror-state variables in lockstep; partial reset would report a stale mirror as warm. |
| 524 | 6L | 12 | 4 | private, inner | `abort` | **KEEP** | Twelve callers; the shared dead-controller exit for every refresh path. |

### `src/sortable/xy.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 79 | 106L | 0 | 18 | exported | `xy` | **KEEP** | Published entry point — consumer surface, not an internal boundary. |

### `src/sortable/y.ts`

| Line | Size | src | test | Scope | Name | Verdict | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 93 | 5L | 1 | 0 | private | `centreOf` | **KILL** | One caller. `getBoundingClientRect()` then a midpoint. |
| 105 | 127L | 62 | 360 | exported | `y` | **KEEP** | Published entry point — consumer surface, not an internal boundary. |

---

## 4. What the first pass missed

Beyond the two falsifier pairs, re-running the enumeration surfaced these as previously unexamined and worth naming, because they are the ones a size-and-caller heuristic would have misjudged in either direction:

- **`runMoved`** (3L, 1 caller) — would have been killed; is an allocation choice. §2.3.
- **`discard`** [`sortable/layout-animation.ts:159`](../../../src/sortable/layout-animation.ts) (4L, 7 callers) and **`forget`** [`verified-refresh.ts:511`](../../../src/sortable/verified-refresh.ts) (6L) — both reset several fields in lockstep; a partial reset reports a stale mirror as warm, or pins rows past teardown. Small, and each owns an invariant.
- **`abort`** in both [`rect-index.ts:112`](../../../src/sortable/rect-index.ts) and [`verified-refresh.ts:524`](../../../src/sortable/verified-refresh.ts) — same name, two files, 12 callers each; the shared dead-controller exit. The duplicate name is the only thing worth a second look, and it is deliberate.
- **`deriveMotion`** [`free-drag/spec.ts:139`](../../../src/free-drag/spec.ts) — writes into `motion` instead of returning a `Point`, explicitly to keep an allocation off the hot path.
- **`settleCancellation`, `onCommand`, `validateFrameDescriptors`, `assertFrameShapesMatch`** — four more single-caller thin helpers now in OWNER LOOK that the first pass did not reach.

**The pattern the first pass identified holds and is now measured rather than asserted.** Of the 22 non-KEEP rows, **17 have exactly one production reference and 3 have none.** The species is decay: helpers that lost their other callers to earlier cleanup and kept their names. `thenOf` and `setRefreshVerification` document their own decay in their doc comments.

**The mechanical query worth institutionalizing is not "is this function small" but "does this declaration still have more than one production reference".** The script behind this audit answers it in about a second, and it is the check that would have prevented this document from being necessary.

---

## 5. What would falsify this

- **The inventory rule excludes object-literal methods**, so the `BehaviorSpec` protocol members (`prepare`, `effect`, `admit`, `moved`, `finalized`, …) are not counted. They are function-valued and a reader might reasonably expect them. Including them would roughly double the count and none is a micro-abstraction candidate, but the exclusion is a choice and is stated here so the 182 can be reproduced or disputed.
- **Reference counts are name-based, not binding-resolved.** Two declarations share a name across files (`abort`, `claim`, `install`, `rejection`, `landing`, `resolve`, `restore`), so their per-row counts are the union across files rather than per-binding. Every such row is KEEP on grounds that do not depend on the exact number, and the two `abort`s and two `claim`s were read individually.
- **The KEEP rows carrying a category-level basis were not individually argued.** They are complete and correctly counted, and none is small enough or thin enough to be a candidate under the working rule — but "not a candidate" is a weaker claim than the row-by-row analysis given to the 22 non-KEEP rows.
- **§1.2's distinction is the contestable one in this document.** If the typed-pair and shallow-copy-contract argument does not persuade, `beginFrame` is a KILL, and §1.1's pairing logic then applies to it too.