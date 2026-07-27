# `@ydinjs/box-quad` — behavioral contract

## Status

**Reviewed — revised public storage and cache API accepted.**

The contract was accepted on 2026-07-26 after final review of target eligibility,
transform reference spaces, cache obligations, realm ownership and flat-tree
slot geometry. It was revised on 2026-07-26 to expose only `readBoxQuad`, make
output storage explicitly caller-owned and make each caller-owned `WeakMap`
identity one cache epoch.

These documents define observable v1 behavior. They do not prescribe traversal
algorithms, intermediate matrix shapes, module boundaries, or optimization
techniques. Later work may change representation, but it must not change an
accepted expectation without returning to contract review.

## Artifacts

| # | Artifact | File | Purpose |
| --- | --- | --- | --- |
| 1 | Public API | [01-public-api.md](01-public-api.md) | Exports, types, coordinate spaces, output and exception boundaries |
| 2 | Behavioral scenarios | [02-behavior-scenarios.md](02-behavior-scenarios.md) | BDD specification and expected semantics |
| 3 | Failure table | [03-failure-table.md](03-failure-table.md) | Recognized unsupported/unrepresentable geometry |
| 4 | Support matrix | [04-support-matrix.md](04-support-matrix.md) | Supported, unsupported and unguaranteed cases |
| 5 | Cache semantics | [05-cache-semantics.md](05-cache-semantics.md) | Caller-owned weak-map epochs and reuse |

## Contract vocabulary

- **Source** — the `element` whose border-box quad is requested.
- **Target** — the optional `relativeTo` element whose local border-box
  coordinate space receives the result.
- **Local border-box space** — physical coordinates whose origin is the
  element's top-left border corner before its own transform, with positive x
  toward the physical right and positive y toward the physical bottom.
- **Viewport space** — layout viewport coordinates compatible with
  `clientX`/`clientY` and `getBoundingClientRect()`.
- **Representable** — expressible as one unfragmented 2D border-box quad and,
  when a target is supplied, convertible through an invertible target space.
- **Recognized failure** — an explicitly detected unsupported or
  unrepresentable case listed in [03-failure-table.md](03-failure-table.md).
- **Measurement epoch** — all reads made with one caller-owned cache identity.

## Binding decisions

1. The package exposes one entrypoint and one geometry implementation boundary:
   `readBoxQuad`.
2. A successful quad always preserves local physical corner identity:
   `(0, 0)`, `(width, 0)`, `(width, height)`, `(0, height)`.
3. Writing mode and text direction do not relabel those physical corners.
4. A source may produce a valid degenerate quad. Invertibility is required only
   when an element is used as a target.
5. Effective HTML border-box and content-box transform reference spaces are
   supported. Transform origins and percentage translations resolve against
   that reference box while output remains in local border-box coordinates.
6. Same-document shadow-tree ancestry, including slot assignment, follows
   rendered flat-tree geometry.
7. Fixed and sticky positioning are supported within the same 2D,
   single-principal-box model.
8. Boolean failure is reserved for recognized geometry failures. The
   implementation must not blanket-catch platform or implementation errors.
9. Every observation made within a cache epoch may remain stale for the
   lifetime of that cache identity while its element retains the same
   `ownerDocument`, whether a prior call succeeded or failed. Adoption into a
   different document invalidates reuse of that element's prior entry.
10. Caching is explicit, weak and consumer-owned. There is no global cache.
11. Native `getBoxQuads()` is never called.
12. One unfragmented principal box is necessary but not sufficient for support.
    Cases not named by the brief or this contract are unguaranteed and do not
    justify specialized implementation code without approval.

## Traceability

| Brief requirement | Contract home |
| --- | --- |
| Public exports and signatures | API §§1–3 |
| Quad representation and point identity | API §2; scenarios `API-*`, `SPACE-*` |
| Viewport and `relativeTo` semantics | API §4; scenarios `SPACE-*`, `REL-*` |
| Realm ownership of constructed DOM geometry and no native delegation | API §6; support matrix §§2–3 |
| Layout coverage | scenarios `LAYOUT-*`, `POSITION-*`, `SHADOW-*`, `WRITING-*` |
| Transform coverage | scenarios `TRANSFORM-*` |
| Zoom coverage | scenarios `ZOOM-*` |
| Scrolling coverage | scenarios `SCROLL-*` |
| Unsupported geometry | failure table; support matrix §3 |
| Cache/epoch behavior | cache semantics; scenarios `CACHE-*` |
| Atomic caller-owned output | API §3; scenarios `API-01`–`API-03` |
| Stable expected values | scenarios §2 |
| Performance and bundle requirements | Outside this behavioral contract; tracked by package tooling and reports |

## Review checklist

- [x] Every public export and parameter has one unambiguous contract.
- [x] Every scenario has one primary observable expectation.
- [x] Every required behavior category from the brief has scenario coverage.
- [x] Fixed/sticky, shadow/slotted and non-horizontal writing modes have
      explicit v1 coverage.
- [x] Every recognized unsupported case maps to `false`.
- [x] No false result can partially update the caller's output.
- [x] Contract violations and unexpected platform errors are not converted into
      ordinary geometry failures.
- [x] Every cached observation may remain stale within a consumer-defined
      epoch, including an observation associated with a recognized failure,
      except when reuse would cross the element's current `ownerDocument`.
- [x] No document requires a display whitelist, custom matrix library, native
      delegation or global cache, and the contract does not prescribe a
      production implementation or test harness.
- [x] Expected values are independently intelligible and do not rely on the
      production algorithm.

## Original iteration boundary (historical)

The following records the original process boundary; it does not describe the
current project state, which now includes executable tests and production
geometry.

Iteration A delivered only these reviewed documents. Iteration B could turn the
accepted scenarios into initially red real-browser tests and independently
derive any complex numeric fixtures. Package scaffolding, executable
declarations, production geometry, benchmark harnesses and bundle budgets were
outside iteration A.
