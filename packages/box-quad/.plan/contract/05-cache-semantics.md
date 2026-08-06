# Artifact 5 — Cache semantics

## 1. Public model

```ts
export type BoxQuadCache = WeakMap<HTMLElement, unknown>;
```

Consumers create and own cache objects directly:

```ts
const cache: BoxQuadCache = new WeakMap();
```

The map's identity and lifetime define one measurement epoch. The package owns the meaning and representation of every entry it writes. Consumers must not inspect, add, replace or delete entries. The public `unknown` value type prevents typed reliance on the representation but cannot remove the `WeakMap` methods; entry opacity is therefore a contractual requirement.

The package never creates an immortal or global geometry cache. Omitting `cache` performs a fresh read and retains no reusable observations for later public calls.

## 2. Measurement epochs

One caller-owned map is exactly one epoch:

```text
new WeakMap() ── epoch 1
new WeakMap() ── epoch 2
new WeakMap() ── epoch 3
```

Within an epoch, observations used to answer either successful or failed calls may be reused. The consumer accepts that DOM, style, layout, transform, zoom, scroll or support-state changes may not be observed while it keeps passing the same map and the cached element retains the same `ownerDocument`.

Owner-document adoption is the mandatory exception to within-epoch staleness. When an element's current `ownerDocument` differs from the document recorded with its cached entry, the entry must not be reused. The element is remeasured using its new owner document and realm even when the caller passes the same map.

Two separately constructed maps have independent epochs and observations. There is no in-place reset operation. A consumer starts a fresh epoch by constructing and passing a new `WeakMap`.

## 3. Cached values

The reusable unit is a completed element-local-to-viewport coordinate space, not merely `DOMRect`.

A completed space contains enough private information to reproduce the element's supported local physical border-box coordinates in viewport space. Its exact representation is private and may change without an API revision.

The cache permits successfully completed coordinate spaces and inverses to be retained and reused within an epoch. Whether reuse occurs for a source, target, common ancestor or inverse is not observable behavior. Shared-ancestor reuse and the exact reuse strategy belong to Iteration D.

## 4. Inverses

When an element is used as `relativeTo`, its local-to-viewport space must be invertible to finite 2D values. A successful inverse may be retained and reused within the epoch.

The contract does not require eager or lazy inverse construction. A failed/non-invertible inverse is a recognized call failure. The contract does not constrain whether failure state or the observations leading to it are memoized. Repairing geometry is guaranteed observable only through an uncached read or a newly constructed cache.

## 5. Success, failure and partial work

| Event | Cache contract |
| --- | --- |
| Successful completed space | May be retained and reused for the epoch |
| Successful target inverse | May be retained and reused for the epoch |
| Recognized source/target-space failure | Its observations or outcome may remain stale for the epoch |
| Recognized failure after other spaces completed | Those successfully completed spaces may remain reusable |
| Unexpected escaping exception | No state guarantee beyond ownership invariants and no global cache |

Caching successful partial work must never weaken the atomic output guarantee: a `false` result leaves `out` unchanged.

## 6. Fresh and stale reads

The following sequence may return the old quad on the second call:

```ts
const cache: BoxQuadCache = new WeakMap();

readBoxQuad(element, first, undefined, cache);
// Consumer mutates layout, style, transform, zoom or scroll.
readBoxQuad(element, stale, undefined, cache);
```

The consumer requests freshness with a new cache:

```ts
const freshCache: BoxQuadCache = new WeakMap();
readBoxQuad(element, fresh, undefined, freshCache);
```

Or performs uncached reads, which share no retained observations:

```ts
readBoxQuad(element, first);
// Consumer mutates layout, style, transform, zoom or scroll.
readBoxQuad(element, fresh);
```

Staleness is permission, not a requirement. An implementation may happen to recompute a value, but consumers must use a new map or omit the cache whenever freshness is required. Adoption does not require a new map because the library must reject the old-document entry automatically.

## 7. Shared reads

The intended batch pattern is:

```ts
const cache: BoxQuadCache = new WeakMap();

readBoxQuad(first, firstOut, canvas, cache);
readBoxQuad(second, secondOut, canvas, cache);
readBoxQuad(third, thirdOut, canvas, cache);
```

Observable requirements:

- the map identity defines the epoch before the first read;
- later calls may reuse completed spaces and inverses;
- every successful result remains equivalent to calculating from observations available within that epoch;
- a failed observation may remain stale for that map's lifetime while its element retains the same `ownerDocument`;
- an entry measured under a different owner document is never reused.

## 8. Lifetime and weak ownership

- The cache weakly keys element-owned data.
- Library-owned values must not keep an element alive through a strong reference cycle rooted by the cache.
- Discarding the map releases the epoch for garbage collection.
- The package attaches no observer, timer or global registry to a cache.
- Consumer inspection or mutation of entries violates the contract and voids cache correctness guarantees for that map.

Weak-retention GC checks are optional, non-blocking canaries because collection timing is not deterministic. The binding requirement is code review of ownership and reference paths.

## 9. Cross-document use

A cache may be passed to calls for different top-level documents over its lifetime because its public type is not document-bound. Each element's space remains realm-owned.

This does not permit cross-document conversion:

- a viewport-relative call is evaluated against the source's current document and realm;
- a source and target from different documents fail;
- reads wholly inside one iframe document use that document's own realm and viewport;
- cached data from one document is never composed into another;
- adoption invalidates reuse of an entry measured under the prior owner document, even when the same map remains in use.

## 10. Deferred performance details

The contract does not fix:

- internal space or matrix property names;
- ancestor traversal representation;
- exact matrix construction count;
- exact cache hit rate;
- allocation strategy inside uncached calculation;
- shared-ancestor reuse;
- eager versus lazy inverse construction.

Iteration D may measure and change these without changing map identity, staleness, failure, realm or ownership semantics.