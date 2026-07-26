# Artifact 4 — Supported and unsupported matrix

## 1. Classification

| Class | Meaning |
| --- | --- |
| **Supported** | A v1 behavioral obligation. Iteration B requires real-browser coverage. |
| **Unsupported** | Outside v1 and, when valid typed inputs make it observable, must fail as defined in artifact 3. |
| **Unguaranteed** | Not contracted. Do not add specialized implementation code or tests without approval. Incidental success is not an API promise. |
| **Outside typed API** | Cannot be supplied through the declared TypeScript API; no runtime compatibility layer is required. |

Support is based on the one-unfragmented-principal-2D-border-box model. It is
not based on a runtime `display` whitelist. Having one such box is necessary,
but is not by itself sufficient to promote an otherwise unnamed layout mode to
supported v1 behavior.

## 2. Supported v1 matrix

### 2.1 Nodes and layout

| Case | Status | Boundary |
| --- | :-: | --- |
| Plain block | **Supported** | — |
| Inline-block | **Supported** | — |
| Flex/grid container or item | **Supported** | One source box |
| Replaced HTML element, such as `img` | **Supported** | Explicit/rendered dimensions |
| Relative/absolute positioning | **Supported** | Current rendered geometry |
| Fixed positioning | **Supported** | Includes transformed containing blocks |
| Sticky positioning | **Supported** | Current rendered position at read time |
| Zero-width/zero-height principal box | **Supported** | Degenerate quad |
| Borders and positioned ancestors | **Supported** | Border extents included |
| `display:contents` ancestor | **Supported** | Source must still have its own principal box |
| Non-horizontal writing modes and RTL | **Supported** | Physical, not logical, corner coordinates |

### 2.2 Coordinate composition

| Case | Status | Boundary |
| --- | :-: | --- |
| Layout viewport output | **Supported** | Compatible with client coordinates |
| Same-document `HTMLElement` target whose own layout/geometry case is otherwise supported by this matrix | **Supported** | Target must also have an invertible representable space |
| Ancestor/distant-ancestor target | **Supported** | — |
| Non-ancestor target | **Supported** | Independent branches |
| Self-relative output | **Supported** | Fails if self space is non-invertible |
| Page and nested-container scrolling | **Supported** | Current scroll positions |
| Multiple scrolling ancestors | **Supported** | — |
| Same-document shadow-tree ancestry | **Supported** | Open or closed root when element reference is available |
| Slotted elements | **Supported** | Follow rendered flat-tree geometry |
| Source/target across a shadow boundary | **Supported** | Same document only |

### 2.3 2D presentation

| Case | Status | Boundary |
| --- | :-: | --- |
| Classic `translate`, `rotate`, `scale`, skew and `matrix()` | **Supported** | Computed geometry remains 2D |
| Individual `translate`, `rotate`, `scale` | **Supported** | 2D values |
| Individual properties plus classic transform | **Supported** | Browser-defined composition order |
| Pixel `transform-origin` | **Supported** | Applied in the effective reference space |
| Percentage `transform-origin` | **Supported** | Effective HTML border-box/content-box dimensions |
| Percentage translation in classic/individual transforms | **Supported** | Effective HTML border-box/content-box dimensions |
| Effective HTML border-box/content-box `transform-box` reference spaces | **Supported** | Output remains border-box corner geometry |
| Nested 2D transforms | **Supported** | — |
| Negative and singular source transforms | **Supported** | Singular target fails |
| 2D-equivalent computed matrices | **Supported** | Classified by computed geometry, not authored syntax |
| Integer/fractional/nested CSS `zoom` | **Supported** | Includes source, target and ancestor zoom |
| Zoom combined with transforms and scrolling | **Supported** | — |

### 2.4 API and cache

| Case | Status | Boundary |
| --- | :-: | --- |
| Caller-owned reusable `Float64Array` output | **Supported** | No hot-path validation |
| Allocating convenience wrapper | **Supported** | Thin delegation only |
| Consumer-owned cache and explicit reset | **Supported** | Staleness permitted within an epoch |
| Realm-owned DOM geometry | **Supported** | `DOMMatrix`/constructed DOM geometry use the current source owner document |
| Wrapper-owned output allocation | **Supported** | `Float64Array` uses the package execution realm |
| Reads wholly within one iframe document | **Supported** | That document's realm and layout viewport |

The cache permits completed coordinate-space and inverse reuse. Shared-ancestor
reuse, eager versus lazy inverse construction and the exact reuse strategy are
Iteration D concerns, not Iteration B behavioral obligations.

## 3. Explicitly unsupported v1 matrix

| Case | Status | Observable behavior |
| --- | :-: | --- |
| Multi-fragment/multiline inline source | **Unsupported** | `false`/`null` |
| Other fragmented principal layout | **Unsupported** | `false`/`null` where detected |
| Genuinely 3D computed transform | **Unsupported** | `false`/`null` |
| Perspective | **Unsupported** | `false`/`null` |
| Relevant `transform-style: preserve-3d` | **Unsupported** | `false`/`null` |
| Non-invertible `relativeTo` space | **Unsupported** | `false`/`null` |
| Disconnected source or target | **Unsupported** | `false`/`null` |
| Source/target without a principal box | **Unsupported** | `false`/`null` |
| Cross-document conversion | **Unsupported** | `false`/`null` |
| Native `getBoxQuads()` delegation | **Unsupported** | Must never be invoked |
| GeometryUtils polyfill/spec compatibility | **Unsupported** | No compatibility surface |
| Requested output box modes other than border-box | **Unsupported** | No API option; distinct from a transform reference box |
| Fragment-list output | **Unsupported** | No API surface |

## 4. Outside the typed API

| Case | Status | Runtime requirement |
| --- | :-: | --- |
| `SVGElement` / SVG geometry | **Outside typed API** | None |
| `MathMLElement` / MathML geometry | **Outside typed API** | None |
| `Text` nodes | **Outside typed API** | None |
| Pseudo-elements | **Outside typed API** | None; cannot be passed as nodes |
| `DOMQuad`/`DOMPoint` output | **Outside typed API** | None |
| Malformed or undersized output buffer | **Outside typed API** | No validation guarantee |

## 5. Unguaranteed cases

Cases not named by the brief or this accepted matrix are **unguaranteed**. In
particular, iteration A does not infer a promise for every HTML layout mode
merely because a browser happens to expose one rectangle.

Examples include specialized table-internal layout, multicolumn edge cases,
regions/custom fragmentation, printing/paged media, single-fragment inline
layout, effective transform reference spaces other than HTML border-box or
content-box, CSS motion-path/`offset-*` geometry and browser-specific
nonstandard layout. This list is illustrative, not a second unsupported
whitelist.

Rules for unguaranteed cases:

1. Do not add specialized branches, fixtures or public claims without approval.
2. Generic code may incidentally produce correct results.
3. Incidental success does not become a compatibility promise.
4. A case that exposes knowingly wrong geometry during development must be
   brought back to contract review for explicit support or explicit failure; it
   must not be silently blessed by changing an expected value.

## 6. Scope guard

Fixed/sticky positioning, shadow/slotted ancestry and non-horizontal writing
modes are explicit v1 obligations only within the existing model:

```text
HTMLElement
+ one unfragmented principal border box
+ 2D transforms/zoom/scroll
+ same document
```

Their inclusion does not authorize a general layout compatibility framework,
fragment engine, composed-tree public API or custom matrix library.
