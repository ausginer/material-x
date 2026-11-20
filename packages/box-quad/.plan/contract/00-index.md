# `@ydinjs/box-quad` — behavioral contract

## Status

**Reviewed — revised public storage API accepted. Rewritten on 2026-11-20 to describe the exported API.**

The contract was accepted on 2026-07-26 after final review of target eligibility, transform reference spaces, realm ownership and flat-tree slot geometry. It was revised on 2026-07-26 to make output storage explicitly caller-owned. On 2026-11-20 it was rewritten to describe the API the source exports, before the first publication: measurement and projection are separate calls over caller-owned storage (`F-1`; [change record](#change-record)). Measurement retains nothing between calls: every read is fresh.

These documents define observable v1 behavior. They do not prescribe traversal algorithms, intermediate matrix shapes, module boundaries, or optimization techniques. Later work may change representation, but it must not change an accepted expectation without returning to contract review.

## Artifacts

| # | Artifact | File | Purpose |
| --- | --- | --- | --- |
| 1 | Public API | [01-public-api.md](01-public-api.md) | Exports, types, coordinate spaces, output and exception boundaries |
| 2 | Behavioral scenarios | [02-behavior-scenarios.md](02-behavior-scenarios.md) | BDD specification and expected semantics |
| 3 | Failure table | [03-failure-table.md](03-failure-table.md) | Recognized unsupported/unrepresentable geometry |
| 4 | Support matrix | [04-support-matrix.md](04-support-matrix.md) | Supported, unsupported and unguaranteed cases |

## Contract vocabulary

- **Source** — the element whose border-box quad is requested, measured by `coordinates` into a `Box`.
- **Target** — the optional element whose local border-box coordinate space receives the result. Its `Box` is passed to `projection` as `relativeTo`.
- **The read** — the composition of [artifact 1](01-public-api.md) §2: measure the source, measure the target when there is one, then project.
- **Box, Space, Quad, Delta** — the caller-owned storage types of [artifact 1](01-public-api.md) §3.
- **Local border-box space** — physical coordinates whose origin is the element's top-left border corner before its own transform, with positive x toward the physical right and positive y toward the physical bottom.
- **Viewport space** — layout viewport coordinates compatible with `clientX`/`clientY` and `getBoundingClientRect()`.
- **Representable** — expressible as one unfragmented 2D border-box quad and, when a target is supplied, convertible through an invertible target space.
- **Recognized failure** — an explicitly detected unsupported or unrepresentable case listed in [03-failure-table.md](03-failure-table.md).

## Binding decisions

1. The package exposes one entrypoint. Its geometry boundary is four functions over caller-owned storage: `ancestry` and `coordinates` read the DOM, and `projection` and `localDelta` don't. A `Box` or `Space` carries no element and no document.
2. A successful quad always preserves local physical corner identity: `(0, 0)`, `(width, 0)`, `(width, height)`, `(0, height)`.
3. Writing mode and text direction do not relabel those physical corners.
4. A source may produce a valid degenerate quad. Invertibility is required only when an element is used as a target.
5. Effective HTML border-box and content-box transform reference spaces are supported. Transform origins and percentage translations resolve against that reference box while output remains in local border-box coordinates.
6. Same-document shadow-tree ancestry, including slot assignment, follows rendered flat-tree geometry.
7. Fixed and sticky positioning are supported within the same 2D, single-principal-box model.
8. Boolean failure is reserved for recognized geometry failures. The implementation must not blanket-catch platform or implementation errors.
9. Measurement retains nothing between calls. There is no cache, global or otherwise, and every read observes current layout.
10. Native `getBoxQuads()` is never called.
11. One unfragmented principal box is necessary but not sufficient for support. Cases not named by the brief or this contract are unguaranteed and do not justify specialized implementation code without approval.

## Traceability

| Brief requirement | Contract home |
| --- | --- |
| Public exports and signatures | API §§1–4 |
| Storage representation and point identity | API §3; scenarios `API-*`, `SPACE-*` |
| Viewport and `relativeTo` semantics | API §§4.3, 5; scenarios `SPACE-*`, `REL-*` |
| Realm ownership of constructed DOM geometry and no native delegation | API §7; support matrix §§2–3 |
| Layout coverage | scenarios `LAYOUT-*`, `POSITION-*`, `SHADOW-*`, `WRITING-*` |
| Transform coverage | scenarios `TRANSFORM-*` |
| Zoom coverage | scenarios `ZOOM-*` |
| Scrolling coverage | scenarios `SCROLL-*` |
| Unsupported geometry | failure table; support matrix §3 |
| Atomic caller-owned output | API §4.5; failure table §5; scenarios `API-01`–`API-03` |
| Stable expected values | scenarios §2 |
| Performance and bundle requirements | Outside this behavioral contract; tracked by package tooling and reports |

## Review checklist

- [x] Every public export and parameter has one unambiguous contract.
- [x] Every scenario has one primary observable expectation.
- [x] Every required behavior category from the brief has scenario coverage.
- [x] Fixed/sticky, shadow/slotted and non-horizontal writing modes have explicit v1 coverage.
- [x] Every recognized unsupported case maps to `false`.
- [x] No false result can partially update the caller's output.
- [x] Contract violations and unexpected platform errors are not converted into ordinary geometry failures.
- [x] No document requires a display whitelist, custom matrix library, native delegation or any cache, and the contract does not prescribe a production implementation or test harness.
- [x] Expected values are independently intelligible and do not rely on the production algorithm.

## Original iteration boundary (historical)

The following records the original process boundary; it does not describe the current project state, which now includes executable tests and production geometry.

Iteration A delivered only these reviewed documents. Iteration B could turn the accepted scenarios into initially red real-browser tests and independently derive any complex numeric fixtures. Package scaffolding, executable declarations, production geometry, benchmark harnesses and bundle budgets were outside iteration A.

## Change record

| Date | Section | Change |
| --- | --- | --- |
| 2026-11-20 | Status, vocabulary, binding decision 1, traceability; artifacts 1 to 4 | **Rewritten to describe the exported API before the first publication** (`F-1`). Binding decision 1 made one single-call read function, which measured an element and projected it in one call, the package's only geometry boundary, and the status said the same. Their wording is quoted in box-quad's record, [`plan.md`](../plan.md), under 2026-11-20. The source replaced that function at `162f300fa` with separate measurement and projection calls, and `BQ-6`, `BQ-9` and the decisions of 2026-11-13 shaped the four functions and four storage types it exports. **One behavior changed on paper:** `FAIL-CROSS-DOCUMENT` is withdrawn and becomes a precondition of `projection`, because a `Box` carries no document. The source stopped detecting it at the split, and the `REL-10` test asserts that it isn't detected. Each artifact's own change record says what it said before |