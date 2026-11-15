# Probe: a field read in place of a local, in two loops

**By:** the architect, on 2026-11-15, at `988643dc9` on `drag/size-acceptance`. **For:** `drag:DRD-69` §The loop change's cost, in [`00-index.md`](../../00-index.md).

**Question:** `988643dc9` replaced locals that cached a private field with direct reads of the field inside loops. Does that cost time per iteration, at a resolution that `compare.ts` can't reach?

**Method:** [`bench.ts.txt`](bench.ts.txt), run as `node bench.ts` from a scratch directory, twice. It models two of the changed loops, each in two classes that differ only in the local:

- `RectIndex.shift`: 2,000 slots of a `number[]` with the six fields per slot, 2,000 calls per round;
- the drop-target hit test: 20 targets that the point misses, 200,000 calls per round.

Five warm-up rounds, then 15 rounds that alternate which form runs first. Each round gives the time per slot or per target of each form, and the difference: field read minus local.

**Result,** Node 26.13.0:

```text
node v26.13.0
shift, ns per slot: locals 1.525, field minus locals median -0.000, positive in 6/15, range -0.125..0.416
hit test, ns per target: locals 1.446, field minus locals median 0.007, positive in 9/15, range -0.113..0.066
node v26.13.0
shift, ns per slot: locals 1.523, field minus locals median -0.013, positive in 5/15, range -0.643..1.273
hit test, ns per target: locals 1.494, field minus locals median 0.001, positive in 8/15, range -1.002..0.857
```

**Reading:** both forms cost about 1.5 ns per iteration. The median difference is within ±0.013 ns, and its sign splits between rounds. So no cost shows at this resolution.

**Limits:**

- It models the loops. It doesn't run the library's classes.
- It ran in Node's V8, not in Chromium.
- It covers two of the changed loops. The others read layout in each iteration, or run once per rebuild beside a rebuild that reads layout.