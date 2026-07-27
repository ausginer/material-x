Let’s steer the implementation back toward the DOMMatrix-centered design from the brief.

The scalar rewrite is coherent, but it went further than the correctness review required: it changed the core representation, reimplemented matrix composition and inversion manually, and did so without a benchmark showing that this architectural change is worthwhile. The claimed allocation benefit is also weaker than it first appears, since the scalar version still allocates a separate inverse object and still constructs realm-owned DOMMatrix instances to parse classic transforms.

Let’s use DOMMatrix as the coordinate-space primitive again, while preserving the correctness improvements that came out of the review.

Suggested direction

- Restore `Space` around a realm-owned `DOMMatrix`, rather than storing `a` through `f` as the primary representation.
- Construct matrices through `element.ownerDocument.defaultView.DOMMatrix`; do not use the ambient constructor.
- Keep the `ownerDocument` cache guard so adopted elements cannot reuse matrices from their previous realm.
- Keep inverse lazy and cached.
- Use the immutable `matrix.inverse()` method for the cached inverse.
- Do not reintroduce an assertion about the exact number of matrix constructions. The realm contract should remain about provenance: any DOM geometry primitive we construct must come from the element’s owner realm.
- Do not retain duplicate scalar and DOMMatrix representations unless there is a concrete need for both.

Where we own a mutable accumulator or temporary matrix, let’s prefer the built-in mutable operations where they naturally express the algorithm:

- `multiplySelf()` / `preMultiplySelf()` for matrix composition;
- `rotateSelf()` for accepted 2D individual rotations;
- `scaleSelf()` for individual scale and zoom where the composition order remains correct;
- direct `e` / `f` assignment after recovering the final translation from the browser rect.

Please verify the composition order carefully rather than translating the current scalar formulas mechanically. The existing behavior corresponds to the individual transform order followed by the classic `transform`, and ancestor matrices compose as parent × child.

The goal is not to force every final scalar calculation through a DOM API. In particular:

- do not mutate cached source or inverse matrices merely to avoid a few scalar expressions;
- do not introduce temporary DOMMatrix or DOMPoint allocations just to perform the final quad write;
- direct component reads and scalar corner calculations are fine where using a matrix method would require an otherwise unnecessary allocation;
- do not temporarily invert and restore a cached matrix.

So the intended balance is:

> DOMMatrix owns matrix representation, composition, and inversion; small terminal calculations may remain scalar when that is the allocation-free and clearer path.

Preserve the useful correctness changes

Please keep the accepted parts of the previous pass:

- no integer-rounded `offsetWidth` / `offsetHeight` fallback;
- generic rect-based recovery of fractional local dimensions when the AABB system is sufficiently well-conditioned;
- computed-style border-box fallback for ambiguous or poorly conditioned systems;
- correct `box-sizing: content-box` handling;
- atomic failure behavior;
- canonical computed-value handling for individual rotation, with the existing authored-unit coverage;
- the added content-box and fractional-transform coverage.

Near-singular recovery

The current relative conditioning threshold of `0.000001` is demonstrably too permissive. It admits the rect solve close enough to the singular band that tiny DOMRect/coefficient errors become visible pixel errors around 45°, while exactly 45° falls back and becomes accurate again.

Let’s tighten that guard based on the measured behavior. A relative threshold around `0.05` is a reasonable starting point:

```ts
Math.abs(determinant) > determinantScale * 0.05;
```

The exact expression may be adjusted if testing supports a better boundary, but it should reject the visibly unstable near-45° band rather than only exact singularity.

Please add or preserve regression coverage around the transition, using fractional dimensions. Include representative values such as:

- 30°
- 44°
- 44.99°
- 44.999° or 44.9999°
- 45°
- 45.01°
- 46°

The test should demonstrate that the near-singular cases use the accurate fallback and do not exhibit the large discontinuity found in the review. Cover equivalent singular bands in another quadrant only if it adds meaningful confidence without duplicating the same behavior.

Scope boundaries

- Keep the public API unchanged.
- Keep the current rect-derived translation strategy. We are not replacing it with a full offsetParent/layout-translation walk.
- Do not import the large architecture of `getBoxQuadsPolyfill`.
- Do not expand the guaranteed layout or transform support matrix.
- Treat this as an architectural correction plus the outstanding conditioning fix, not as a general performance rewrite.
- Do not add hidden-class micro-optimizations such as eagerly declaring `inverse: undefined` without measurements.

Before changing code, inspect the previous DOMMatrix-centered implementation in history and reuse its sound parts rather than recreating the design from memory. Adapt it to the accepted dimension-recovery improvements instead of blindly reverting the entire commit.

Please report:

1. the resulting architecture and why each remaining scalar calculation was not expressed through DOMMatrix;
2. the exact matrix composition order used;
3. which previous correctness changes were preserved;
4. the chosen conditioning threshold and supporting measurements;
5. test, typecheck, lint, formatting, bundle-size, and packaged-artifact results;
6. the bundle-size difference from the current scalar implementation.

If restoring DOMMatrix exposes a concrete correctness or size regression that cannot be resolved cleanly, stop and report it as a decision point rather than silently returning to the scalar architecture.