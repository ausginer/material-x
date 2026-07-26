# Artifact 5 — Cache semantics

## 1. Public model

```ts
export type BoxQuadCache = /* opaque mutable holder */;

export function createBoxQuadCache(): BoxQuadCache;
```

A cache is an opaque, mutable, consumer-owned measurement aid. Conceptually it
owns a replaceable weak map:

```ts
{
  map: WeakMap<Element, InternalSpace>;
}
```

This shape is explanatory, not a public property layout.

The package never creates an immortal/global geometry cache. Omitting `cache`
means the call does not retain reusable coordinate-space data for later public
calls.

## 2. Measurement epochs

One cache defines a sequence of epochs:

```text
create ── epoch 1 ── reset ── epoch 2 ── reset ── epoch 3
```

Within an epoch, observations used to answer either successful or failed calls
may be reused. The consumer owns the invalidation decision and accepts that
DOM, style, layout, transform, zoom, scroll or support-state changes may not be
observed until reset.

Two separately created caches have independent epochs and observations.

## 3. Reset ordering

For a call with a supplied cache:

| `reset` | Required behavior |
| --- | --- |
| omitted or not `true` | Reuse the current epoch. |
| exactly `true` | Replace the cache's internal weak map before calculating the current request. |

Reset is not a post-read cleanup. The current call is the first read in the new
epoch and must observe geometry afresh.

The replacement occurs before calculation even when the current call:

- returns `false`;
- later encounters a recognized unsupported ancestor;
- throws an unexpected platform or implementation error.

When no cache is supplied, `reset` has no separate observable effect.

## 4. Cached values

The reusable unit is a completed element-local-to-viewport coordinate space,
not merely `DOMRect`.

A completed space contains enough private information to reproduce the
element's supported local physical border-box coordinates in viewport space.
Its exact representation is deferred to correctness and performance work.

The cache permits successfully completed coordinate spaces and inverses to be
retained and reused within an epoch.

Whether reuse occurs for a source, target, common ancestor or inverse is not
observable behavior. Shared-ancestor reuse and the exact reuse strategy belong
to Iteration D.

## 5. Inverses

When an element is used as `relativeTo`, its local-to-viewport space must be
invertible to finite 2D values. A successful inverse may be retained and reused
within the epoch.

The contract does not require eager or lazy inverse construction. Construction
timing, inverse counts and reuse policy belong to Iteration D.

A failed/non-invertible inverse is a recognized call failure. The contract does
not constrain whether failure state or the observations leading to it are
memoized. Repairing the geometry is guaranteed observable only after reset.

## 6. Success, failure and partial work

| Event | Cache contract |
| --- | --- |
| Successful completed space | May be retained and reused for the epoch |
| Successful target inverse | May be retained and reused for the epoch |
| Recognized source/target-space failure | Its observations or outcome may remain stale until reset |
| Recognized failure after other spaces completed | Those successfully completed spaces may remain reusable |
| Unexpected escaping exception | No state guarantee beyond reset ordering, ownership invariants and no global cache |

Caching successful partial work must never weaken the atomic output guarantee:
a `false` result leaves `out` unchanged.

## 7. Staleness

The following sequence is permitted to return the old quad on the second call:

```ts
const cache = createBoxQuadCache();

readBoxQuad(element, first, undefined, cache);
// Consumer mutates layout, style, transform, zoom or scroll.
readBoxQuad(element, stale, undefined, cache);
```

The consumer requests a fresh epoch explicitly:

```ts
readBoxQuad(element, fresh, undefined, cache, true);
```

That current call must not reuse any space or inverse from the prior epoch.

Staleness is permission, not a requirement. An implementation may happen to
recompute a value, but consumers must reset whenever freshness matters.

## 8. Shared reads

The intended batch pattern is:

```ts
const cache = createBoxQuadCache();

readBoxQuad(first, firstOut, canvas, cache, true);
readBoxQuad(second, secondOut, canvas, cache);
readBoxQuad(third, thirdOut, canvas, cache);
```

Observable requirements:

- the first call starts the epoch before measuring `first`;
- later calls may reuse completed spaces and inverses;
- every successful result remains equivalent to calculating from that epoch's
  first observations;
- a failed observation may remain stale until the consumer resets.

The wrapper accepts the same cache and reset values and participates in the
same epoch.

## 9. Lifetime and ownership

- The cache weakly keys element-owned data.
- Cache internals must not keep an element alive solely through a strong key or
  an incidental strong reference cycle rooted by the cache. This is a
  code-review invariant.
- Replacing the map on reset releases the prior epoch from the cache owner.
- Discarding the cache releases the entire epoch for garbage collection.
- There is no observer, timer or global registry attached to a cache.

Weak-retention GC checks are optional, non-blocking canaries because collection
timing is not deterministic. They must not gate iteration B or package
acceptance; the binding check is code review of ownership and reference paths.

## 10. Cross-document use

A cache object may be passed to calls for different top-level documents over
its lifetime because its public type is not document-bound. Each element's
space remains realm-owned.

This does not permit cross-document conversion:

- a viewport-relative call is evaluated against the source's supported
  document/realm constraints;
- a source and target from different documents fail;
- reads wholly inside one iframe document use that document's own realm and
  viewport;
- cached data from one document is never composed into another.

## 11. Deferred performance details

Iteration A does not fix:

- internal space/matrix property names;
- ancestor traversal representation;
- exact matrix construction count;
- exact cache hit rate;
- allocation strategy inside uncached calculation;
- shared-ancestor reuse;
- eager versus lazy inverse construction.

Iteration D will measure these without changing the epoch, staleness, reset,
failure or ownership semantics in this artifact.
