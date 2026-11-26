#### DRO-20 — Until release, the size ceilings follow the code

**Decided by the owner on 2026-11-15,** relayed by the coordinator to the architect on `drag/size-acceptance` at `988643dc9`. **All ten rows' Brotli ceilings move to their readings now,** including the five rows that pass, taking `988643dc9` into account. **Until release, ceilings follow the code without ceremony:** after a change the owner approves, the rows are re-measured and the ceilings move to the readings, with no further approval. **After release, ceilings matter again.**

**The next such change is a redesign of `Landing`,** which the owner wants to inspect before approving it. The owner finds `Landing`'s shape odd: one object that joins `timing`, a closure over the options, and `start`, a function that doesn't depend on them. The owner tried a class, found it worse, and reverted it. It is a separate question for later.

**Applied by `DRD-68`,** as amended on 2026-11-15, which states the boundary and what the ceilings still stop.