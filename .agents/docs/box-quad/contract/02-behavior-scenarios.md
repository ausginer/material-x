# Artifact 2 — Behavioral scenarios

## 1. Scenario rules

These scenarios are the behavioral source for iteration B. Each row has one
primary observable expectation. Iteration B may parameterize rows, but it must
retain the scenario IDs in test names or adjacent comments so failures remain
traceable.

Unless a row says otherwise:

- source and target are connected `HTMLElement`s in one document;
- each element generates one unfragmented principal border box;
- `transform-origin` is `0 0` with an effective border-box reference where that
  makes arithmetic easier to review;
- viewport and local origins are chosen to make the stated values independent
  of user-agent default margins;
- assertions compare all eight values in p1, p2, p3, p4 order;
- tests use real browser layout, not a DOM-only emulation.

## 2. Expected-value policy

Simple fixtures use hand-derived values. For example, a `20 × 10` source at
viewport `(100, 50)` has:

```text
100, 50,
120, 50,
120, 60,
100, 60
```

With `transform-origin: 0 0` and an effective border-box reference:

| Operation | Expected quad for a `20 × 10` source at local origin |
| --- | --- |
| `translate(5px, 7px)` | `(5,7) (25,7) (25,17) (5,17)` |
| `scale(2)` | `(0,0) (40,0) (40,20) (0,20)` |
| `rotate(90deg)` | `(0,0) (0,20) (-10,20) (-10,0)` |
| `rotate(180deg)` | `(0,0) (-20,0) (-20,-10) (0,-10)` |
| `scale(-1, 1)` | `(0,0) (-20,0) (-20,10) (0,10)` |
| `skewX(45deg)` | `(0,0) (20,0) (30,10) (10,10)` |

Iteration B must derive complex nested expectations independently of production
code and document the derivation next to the fixture. Browser assertions may
use one explicit absolute tolerance selected in iteration B for floating-point
rounding; tolerance must not excuse layout-pixel or composition-order errors.

## 3. API and output

| ID | Given / when | Then |
| --- | --- | --- |
| `API-01` | `readBoxQuad(source, out)` succeeds | It returns `true` and writes all eight values into the supplied object. |
| `API-02` | The same `out` is used for repeated successful reads | Each call reuses the object identity and replaces all eight values. |
| `API-03` | A recognized failure occurs and `out` contains eight distinct sentinels | It returns `false` and every sentinel remains unchanged. |
| `API-07` | A platform operation unexpectedly throws | The error escapes; it is not converted to `false`. |
| `API-08` | Native `getBoxQuads` is present and instrumented to throw if invoked | A supported read succeeds without invoking it. |
| `API-09` | Source and target are both in the same iframe document | The read uses that document's constructors and viewport and succeeds without crossing into the parent document. |
| `API-10` | A caller-supplied output comes from a different realm than a supported source's owner document | DOM geometry uses the owner-document realm while the supplied output retains its original identity and realm. |

## 4. Coordinate spaces and point identity

| ID | Given / when | Then |
| --- | --- | --- |
| `SPACE-01` | An untransformed `20 × 10` source begins at viewport `(100, 50)` | Default output is `(100,50) (120,50) (120,60) (100,60)`. |
| `SPACE-02` | The source is rotated 180° | Point identities follow the rotated local corners; they are not sorted into viewport top-left order. |
| `SPACE-03` | The source uses negative x scale | p1–p4 retain their local identities even though viewport x order reverses. |
| `SPACE-04` | Source and target are untransformed and their viewport origins differ by `(30, 40)` | Target-relative output is the source quad translated by `(-30, -40)`. |
| `SPACE-05` | `relativeTo === source` and the source space is invertible | Output is `(0,0) (width,0) (width,height) (0,height)`. |
| `SPACE-06` | The source has zero width or height but still has a principal box | The read succeeds with the corresponding coincident corners. |
| `SPACE-07` | The source projection is collapsed by `scale(0)` and output is viewport-relative | The read succeeds with a degenerate viewport quad. |

## 5. Layout

| ID | Given / when | Then |
| --- | --- | --- |
| `LAYOUT-01` | A plain block has known viewport position, border-box width and height | Output matches its four border corners. |
| `LAYOUT-02` | A source uses `box-sizing:content-box` with padding and borders | Output corners use the resulting border-box width and height. |
| `LAYOUT-03` | An inline-block has known dimensions | It succeeds without display-specific handling. |
| `LAYOUT-04` | A flex item has known dimensions and placement | It succeeds with its rendered border-box quad. |
| `LAYOUT-05` | A grid item has known dimensions and placement | It succeeds with its rendered border-box quad. |
| `LAYOUT-06` | A replaced `img` element has explicit dimensions | It succeeds with the image element's border box. |
| `LAYOUT-07` | A source has asymmetric borders | Width, height and corners include all border widths. |
| `LAYOUT-08` | Relative and absolute positioned ancestors offset the source | Their rendered offsets are reflected exactly once. |
| `LAYOUT-09` | The source is disconnected | The request fails atomically. |
| `LAYOUT-10` | The source has `display:none` | The request fails atomically. |
| `LAYOUT-11` | The source has `display:contents` | The request fails atomically because it has no principal border box. |
| `LAYOUT-12` | A target is disconnected or has no principal box | Target-relative conversion fails atomically. |

No scenario authorizes a runtime `display` whitelist. The failure cases are
about the absence of a usable principal box.

## 6. Positioning

| ID | Given / when | Then |
| --- | --- | --- |
| `POSITION-01` | A fixed source uses the viewport as its containing block | Page scrolling does not add a document-scroll translation to its viewport quad. |
| `POSITION-02` | A fixed source is inside a transformed containing block | Its quad follows that containing block and its 2D transform. |
| `POSITION-03` | A sticky source has not reached its inset threshold | Output matches its current pre-stuck rendered position. |
| `POSITION-04` | Scrolling moves the sticky source into its stuck position | A fresh uncached read reports the current stuck viewport quad. |
| `POSITION-05` | A fixed or sticky source is read relative to an unrelated target | Both current rendered spaces are composed into the target's local space. |

Fixed and sticky support is limited to geometry already inside the 2D,
single-box contract. These rows do not promise general layout-engine
compatibility.

## 7. Classic and individual transforms

| ID | Given / when | Then |
| --- | --- | --- |
| `TRANSFORM-01` | The source has integer `translate()` | Every corner receives the translation exactly once. |
| `TRANSFORM-02` | The source has `scale(2)` | The quad matches the scale-2 values in §2. |
| `TRANSFORM-03` | The source has non-uniform scale | x and y coordinates use their respective factors. |
| `TRANSFORM-04` | The source has `rotate(90deg)` | The quad matches the 90° values in §2 without point reordering. |
| `TRANSFORM-05` | The source has `rotate(180deg)` | The quad matches the 180° values in §2 without point reordering. |
| `TRANSFORM-06` | The source has negative scale | The quad matches the negative-scale values in §2. |
| `TRANSFORM-07` | The source has 2D skew | The quad matches the hand-derived skew values in §2. |
| `TRANSFORM-08` | The source has an equivalent CSS `matrix()` | Output matches direct scalar application of that matrix. |
| `TRANSFORM-09` | The transform origin is a non-default pixel point in a stated effective reference box | Composition includes the reference box's border-local offset, translates to the origin, applies the transform, then translates back. |
| `TRANSFORM-10` | The effective transform reference space is the border box and `transform-origin` uses percentages | Origin percentages resolve against border-box dimensions. |
| `TRANSFORM-11` | Multiple ancestors have 2D transforms | Output reflects CSS composition order from source local space to viewport. |
| `TRANSFORM-12` | The source uses individual `translate` | Output includes the individual translation. |
| `TRANSFORM-13` | The source uses individual `rotate` | Output includes the individual rotation. |
| `TRANSFORM-14` | The source uses individual `scale` | Output includes the individual scale. |
| `TRANSFORM-15` | Individual translate/rotate/scale are combined with classic `transform` | Output follows the browser-defined property composition order, independently derived in the fixture. |
| `TRANSFORM-16` | A 2D-equivalent computed matrix is representable as 2D | It succeeds regardless of authored transform syntax. |
| `TRANSFORM-17` | An asymmetrically bordered/padded HTML source uses an effective content-box reference and percentage `transform-origin` | The origin resolves against content-box dimensions and includes the content box's offset from the local border-box origin. |
| `TRANSFORM-18` | Classic `transform: translate(<percentage>)` uses an effective border-box or content-box reference | Each percentage resolves against the corresponding effective reference-box dimension. |
| `TRANSFORM-19` | Individual `translate` uses percentages with an effective content-box reference | Percentages resolve against content-box dimensions while the output corners remain source border-box corners. |
| `TRANSFORM-20` | A source with a fractional rendered border-box extent is scaled | Output preserves the browser-observable fractional border edge without CSS serialization loss. |
| `TRANSFORM-21` | Fractional local dimensions are rotated near an AABB dimension-recovery singular band | Output preserves the local border-box dimensions without a near-singular discontinuity. |

## 8. CSS zoom

| ID | Given / when | Then |
| --- | --- | --- |
| `ZOOM-01` | A source is inside `zoom: 2` | Its viewport position and border-box extent reflect zoom exactly once. |
| `ZOOM-02` | A source is inside fractional zoom | Output preserves fractional double-precision coordinates. |
| `ZOOM-03` | Two ancestors apply zoom | Their effective zoom factors compose. |
| `ZOOM-04` | The source itself applies zoom | Its border-box space and placement follow the browser's current zoom layout semantics. |
| `ZOOM-05` | The target applies zoom | Target-relative conversion removes the target-space zoom and returns local CSS coordinates. |
| `ZOOM-06` | Source and target have different zoomed ancestors | Each branch contributes only to its own local-to-viewport space before conversion. |
| `ZOOM-07` | Zoom and a 2D transform occur in one ancestry chain | Output follows independently derived CSS composition order. |
| `ZOOM-08` | A zoomed ancestor is scrolled | Zoom and scroll offsets are each reflected exactly once. |

## 9. Scrolling

| ID | Given / when | Then |
| --- | --- | --- |
| `SCROLL-01` | The document scroll position changes | A fresh default read stays aligned with `clientX`/`clientY` viewport coordinates. |
| `SCROLL-02` | One overflow container scrolls | Its scroll offset moves descendant source corners exactly once. |
| `SCROLL-03` | Multiple nested overflow containers scroll | All applicable scroll offsets compose exactly once. |
| `SCROLL-04` | Source and target share a scroller | Their shared scroll contribution cancels in target-relative output. |
| `SCROLL-05` | Source and target are in independently scrolled branches | Each branch's current viewport space contributes before relative conversion. |
| `SCROLL-06` | A transformed and zoomed scroller scrolls | The result matches an independently derived composition of scroll, zoom and transform. |

## 10. Relative targets

| ID | Given / when | Then |
| --- | --- | --- |
| `REL-01` | The target is the source's direct ancestor | Output uses the ancestor's local physical border-box axes. |
| `REL-02` | The target is a distant ancestor | Intermediate layout, transforms, zoom and scroll compose correctly. |
| `REL-03` | The target is not an ancestor | Source-to-viewport and target-to-viewport spaces produce the target-relative quad. |
| `REL-04` | The target is transformed | Its inverse maps source viewport corners into target-local coordinates. |
| `REL-05` | The target is zoomed | Output remains in target-local CSS coordinates. |
| `REL-06` | The target is scrolled | Its border-box coordinate space is used; scroll affects descendant content, not the target border origin twice. |
| `REL-07` | Source and target are the same object and target space is invertible | Output is the untransformed local border-box quad. |
| `REL-08` | Target local-to-viewport space is non-invertible | The request fails atomically. |
| `REL-09` | `relativeTo === source` and that space is non-invertible | The request fails atomically rather than special-casing identity. |
| `REL-10` | Source and target have different `ownerDocument` values | The request fails atomically. |
| `REL-11` | An otherwise supported target has asymmetric border/padding, an effective content-box transform reference and percentage `transform-origin` | Its inverse accounts for the content-box dimensions and border-local content-box offset, producing independently derived target-local border-box coordinates. |

## 11. Shadow trees and slots

| ID | Given / when | Then |
| --- | --- | --- |
| `SHADOW-01` | A source is inside an open shadow root whose host/ancestors transform it | Host and ancestor geometry is included. |
| `SHADOW-02` | A source is inside a closed shadow root and passed directly to the API | Its rendered same-document ancestry is included; root openness does not change geometry. |
| `SHADOW-03` | A light-DOM source is assigned to a box-generating transformed slot, such as `slot { display: block; transform: ... }` | Geometry follows the rendered slot/host chain rather than only `parentNode`. |
| `SHADOW-04` | Source and target lie on opposite sides of a same-document shadow boundary | Relative conversion succeeds when both spaces are representable. |
| `SHADOW-05` | Nested shadow hosts and slots contribute 2D transforms/zoom | Each rendered ancestry contribution is applied exactly once. |

These scenarios require rendered flat-tree correctness; they do not expose or
standardize a traversal API.

## 12. Writing modes

| ID | Given / when | Then |
| --- | --- | --- |
| `WRITING-01` | The source uses `vertical-rl` | p1–p4 remain physical top-left, top-right, bottom-right, bottom-left. |
| `WRITING-02` | The source uses `vertical-lr` | p1–p4 retain the same physical definition. |
| `WRITING-03` | Source direction is RTL | Text direction does not relabel the border corners. |
| `WRITING-04` | Source and target use different writing modes | Target-relative x/y still use target physical right/down axes. |
| `WRITING-05` | A vertical-writing source is transformed and zoomed | The ordinary physical border-box composition rules apply. |

## 13. Unsupported geometry

| ID | Given / when | Then |
| --- | --- | --- |
| `UNSUPPORTED-01` | The source is a multiline/multi-fragment inline | The request fails atomically. |
| `UNSUPPORTED-02` | The source or relevant ancestry has a genuinely 3D computed transform | The request fails atomically. |
| `UNSUPPORTED-03` | Relevant ancestry applies non-`none` perspective | The request fails atomically. |
| `UNSUPPORTED-04` | Relevant ancestry uses `transform-style: preserve-3d` | The request fails atomically. |
| `UNSUPPORTED-05` | Fragmented layout produces more than one source box | The request fails atomically. |
| `UNSUPPORTED-06` | The requested node is not an `HTMLElement`, despite bypassing TypeScript | Behavior is outside the boolean contract; no runtime validation is required. |

SVG, MathML, text nodes and pseudo-elements cannot be validly supplied by the
typed API and receive no runtime compatibility layer.

## 14. Cache behavior

| ID | Given / when | Then |
| --- | --- | --- |
| `CACHE-01` | Two unchanged reads share a cache within one epoch | Both calls return the same correct geometry; no particular reuse strategy is observable. |
| `CACHE-04` | Layout changes after a successful read using the same cache | A later result may remain stale by contract. |
| `CACHE-05` | Layout changes and the next call uses a new cache | The current call observes the new geometry. |
| `CACHE-06` | Layout changes between two calls that both omit the cache | The second uncached call observes the changed geometry. |
| `CACHE-10` | Two caller-created caches are used | Their epochs and stale observations are independent. |
| `CACHE-11` | An element is measured with a cache, adopted into another document, then measured again with the same cache | The prior entry is not reused; the second read uses the new owner document's realm and geometry. |

Every observation in an epoch may remain stale for the lifetime of that cache
identity while the observed element retains the same `ownerDocument`, including
one made by a call that returned `false`. Owner-document adoption is the
mandatory invalidation exception. Calls that omit the cache are always fresh.
The cache permits completed-space and inverse reuse, but shared-ancestor reuse,
eager versus lazy inverse construction, internal hit counts, failure
memoization strategy and allocation counts belong to iteration D. Iteration B
must test only observable epoch behavior.
