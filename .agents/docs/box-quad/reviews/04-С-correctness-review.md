## Summary

Implementation review of `@ydinjs/box-quad` against contract artifacts 1–5, with the test suite as a second validation point. The suite passes (104/104, chromium). Bundle is 7.27 kB raw / 1.3 kB brotli.

The central design decision is sound and carries most of the correctness. packages/box-quad/src/index.ts:248 composes only the linear part (a, b, c, d) up the flat tree and recovers translation from `getClientRects()[0]` via `min(0, a·W) + min(0, c·H)`. That identity holds (`min(0, aW, cH, aW+cH) ≡ min(0, aW) + min(0, cH)`), and it means `transform-origin`, percentage translations, `transform-box: content-box`, containing blocks, scroll offsets, sticky/fixed resolution and zoom positioning all fall out of browser layout with no dedicated code. Artifact 1 §4.4 is satisfied without a single branch for it. Matrix composition order (`R·S·transform`, then parent∘child) was verified term by term and is correct. Atomicity, the no-blanket-catch rule, realm ownership and cache/adoption semantics are implemented faithfully.

Every finding below is in the one quantity that is _not_ derived from the client rect: border-box width and height.

## Findings

1. **High — `box-sizing` handling encodes a Blink/WebKit-only quirk.** packages/box-quad/src/index.ts:43 returns `parseFloat(style.width)` directly when `box-sizing: border-box`. This works only because Blink/WebKit resolve `width` to the border-box value in that case. Per CSS the resolved value is the used value — the content box — which is what Gecko returns. In Firefox every `border-box` element would be short by padding plus borders. That is every fixture in the suite and most real-world elements. Tests run chromium-only, so this is currently invisible; the contract never states a browser scope, which is how it passed review.

2. **High — The `offsetWidth` fallback is a specialized branch for an unguaranteed case, and it is wrong.** packages/box-quad/src/index.ts:39 catches `width: auto` (single-line inline) and falls back to `offsetWidth`, which is integer-rounded. Measured in the configured chromium: a single-line `<span>` returns quad width 39 against a true border box of 38.765625 — a silent 0.23 px error. Artifact 4 §5 lists single-fragment inline layout as _unguaranteed_, and its rules 1 and 4 forbid both adding specialized branches without approval and silently blessing knowingly wrong geometry. This branch does both. Either make it exact or delete it and let inline sources fail.

3. **Medium — Sizing through computed-style strings is lossy under scale.** Measured: a `33.333px`-wide child inside `scale(2)` yields p3.x = 69.6562 where the true rect edge is 69.65625. Chromium snaps used values to 1/64 px but serializes the computed string with limited precision, and the error is multiplied by accumulated scale. Well inside the suite's tolerance for round fixtures, but it is an error class the rect-derived translation does not have.

4. **Medium — `API-10` pins a deferred implementation detail.** packages/box-quad/tests/api.browser.test.ts:126 asserts `constructed > 0`, requiring a realm `DOMMatrix` to be constructed even for an untransformed element. packages/box-quad/src/index.ts:110 allocates one eagerly, before any early `return null`, to satisfy it. Artifact 1 §6 is written as though matrix construction were observable, while artifact 5 §10 explicitly defers "exact matrix construction count". Recommend rewording §6 to "_if_ geometry primitives are constructed, they come from the owner realm" so the DOMMatrix-free path stays open, then relaxing the test.

5. **Low — `.size-limit.json` declares no budget.** packages/box-quad/.size-limit.json has no `limit` field, so `just size` reports but never fails, unlike packages/core/.size-limit.json which enforces per-entry budgets. Suggest `"limit": "1.35 kB"`. [USER_MADE]

6. **Low — `get2DRotation` likely carries dead branches.** packages/box-quad/src/index.ts:72 handles `grad`, `turn` and bare radians, and packages/box-quad/src/index.ts:82 handles an explicit `z` axis token. The computed value of `rotate` serializes its angle canonically in `deg` and omits the `z` axis, so these should be unreachable. Verify against the target browsers, then drop them.

7. **Low — `getFlatParent` does an avoidable realm round-trip.** packages/box-quad/src/index.ts:26 performs a `defaultView` lookup plus `instanceof ShadowRoot`. `return (root as ShadowRoot).host ?? null` is equivalent — neither `Document` nor a detached `DocumentFragment` exposes `host` — and is smaller and cheaper.

8. **Medium (tests) — The content-box arm of `getBorderSize` is never exercised.** Every fixture in packages/box-quad/tests/support/fixtures.ts sets `boxSizing: 'border-box'`, and the `width: auto` fallback is reached only incidentally through the multiline-fragmentation case. Findings 1 and 2 both live precisely in that untested region.

## Recommended fix

Findings 1, 2 and 3 collapse into one change. Every reject path already guarantees no perspective and no `preserve-3d`, so the client rect satisfies exactly:

```text
rectW = |a|·W + |c|·H
rectH = |b|·W + |d|·H
```

Solve that 2×2 system (`det = |a||d| − |c||b|`) and fall back to computed style only when `det ≈ 0` — exact ~45° rotations. `scale(0)` needs no fallback: the quad collapses regardless of W and H, so artifact 3 §3's degenerate-success row still holds. For the common axis-aligned case this degenerates to `W = rectW/|a|`, `H = rectH/|d|`.

The change fixes three findings at once, removes most of `getBorderSize` (six `parseFloat` calls and up to eight computed-style property reads per call, each a real serialization cost in Blink), and makes sizing browser-agnostic rather than Blink-shaped. It is simultaneously more correct, faster and smaller.

## Performance

Not contract violations — artifact 5 §10 defers these to Iteration D — but recorded here as the measured opportunity set, in descending value:

1. **No shared-ancestor reuse.** Every call walks to the document root calling `getComputedStyle` per ancestor and reading roughly eight properties from each. For N elements against a common target this is O(N·depth) _even with a cache_, because the cache stores only final per-element spaces. Caching the cumulative linear matrix per ancestor and stopping the walk on the first hit is the largest single win; the linear part is what is shareable, while `e`/`f` stay per-element from the rect.
2. **`new DOMMatrix(style.transform)` per transformed ancestor** parses a serialized string. Since non-2D is rejected anyway, the string is always `matrix(a, b, c, d, e, f)`; four `parseFloat` reads off a known prefix are strictly cheaper than constructing a matrix and reading four native accessors.
3. **`getInverse` (packages/box-quad/src/index.ts:288) is heavy for a 2×2 affine inverse**: it allocates a matrix, copies six fields, calls `invertSelf()`, then runs six `Number.isFinite` checks. `det = a·d − b·c` plus six multiplies is equivalent, and `det === 0` _is_ `FAIL-TARGET-NONINVERTIBLE`, expressed more directly.
4. **Storing `a`…`f` as plain numbers on `Space`** instead of a `DOMMatrix` removes six native accessor reads per relative call (packages/box-quad/src/index.ts:336).
5. **Move the `new Matrix()` at packages/box-quad/src/index.ts:110 past the loop** so it is not allocated and discarded on every early `return null`.

Items 2–4 are gated on finding 4.

## Checks

- Full suite run with the repository-configured chromium: 104/104 pass.
- Contract artifacts 1–5 read in full and checked against the implementation.
- Behavioral claims above were confirmed with throwaway browser probes, since removed: content-box sizing, single-line inline precision, `display: none`, disconnected source, table-cell layout, fractional child under `scale(2)`, `zoom` through a `display: contents` ancestor, and percentage serialization of `scale`/`zoom`/`rotate`.
- Cleared as non-issues: percentage `scale`/`zoom` values are normalized by the UA before `parseFloat` sees them; `zoom` does apply through a `display: contents` ancestor and the implementation matches; `translate3d(0,0,0)` and `translateZ(0)` compute to `matrix()` with `is2D === true` and succeed, so the common GPU-promotion hack is not broken; genuinely 3D transforms fail as artifact 3 requires.
- Matrix composition order and the translation-recovery identity were verified algebraically, not only by test outcome.
- No files were changed.