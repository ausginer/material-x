# Owner class refactor: assessment

**Read by the architect on 2026-11-14.** The subject is the owner's box-quad and drag refactor on `drag/class-refactor`, which is uncommitted. The inputs are:

- the [verification report](owner-refactor-verification-report.md) at `00fc1aa28`, with its evidence under [`measurements/2026-11-14-owner-refactor/`](measurements/2026-11-14-owner-refactor/);
- the [feature proof](reviews/owner-class-refactor/proof-reviewer.md) at `b4bca69f7`, with its probes under [`proof-reviewer-probes/`](reviews/owner-class-refactor/proof-reviewer-probes/).

**The reviewed source is a working-tree snapshot.** Both reports read the same snapshot. Its tracked diff against `5b581fbdf` has SHA-256 `019cd4569ca6526d443bf354414e56c122a868f6cd242216bdc9f95a4149c508`, and its 16 files match [`input/hashes.txt`](measurements/2026-11-14-owner-refactor/input/hashes.txt). The architect checked both before writing anything, and `git status --porcelain` still equalled [`status-before.txt`](measurements/2026-11-14-owner-refactor/input/status-before.txt). This assessment changes no source. The snapshot stays uncommitted.

**The governing records:**

- [`contract.md`](contract.md) §Public surface, its **Capabilities** paragraph: "A third party may fill a slot whose type is published";
- in [`00-index.md`](00-index.md):
  - `DRD-20`, the built-ins as internal classes;
  - `DRD-33` C1 to C10, choices 4 and 8;
  - `DRD-34` property 8;
  - `DRD-35` property 7;
  - `DRD-37` property 4;
  - `DRD-52`'s development check;
  - `DRD-60` properties 1 and 2;
  - `DRD-61` property 6;
  - `DRO-13`, the owner's list of declarations that stay interfaces;
- the [alias cleanup](alias-cleanup-report.md), and the [feature-composition handoff](feature-composition-handoff.md)'s hoisted reads;
- `CONTRIBUTING.md` Part I §TypeScript and §Class encapsulation, and Part II §1.1, §10, §14 and §15.

## 1. Result

**The refactor isn't accepted yet.** In form, its class conversions are adopted. `DRD-63` records what they must meet. Six findings stand against the snapshot. Each one has a disposition below and goes to one remediation unit, [`owner-class-refactor-handoff.md`](owner-class-refactor-handoff.md). Acceptance needs three things after that unit:

1. an independent recheck that reads the remediation;
2. the architect's reading of the recheck;
3. the owner's reading of the costs at the remediated end (§4, Q4).

**What the two reports establish, and the architect accepts:**

- **Runtime behavior is equal on every supported path tested.** `FrameTask` gives the same trace, and `dropTargets` the same DOM trace. The `browser` project passes 357 of 357, and the drag suite fails only the five known size rows plus the declaration test.
- **Lifetimes are kept.** Each per-operation object is released after its operation, and each per-controller object after destruction. A witness shows that the instrument sees each one while it lives.
- **box-quad is equivalent.** The proof compared 60,002 differential cases with no difference, and each alias has the same function identity as its replacement. The box-quad edit has no finding, and box-quad's register needs no entry.
- **The performance arms are sound.** Each arm bundles its own drag and its own box-quad. Timing reads "no difference shown" on every row, which is inconclusive.
- **The allocation readings,** as reported. Each lifetime allocates −118 to −732 B less, and 728 B less is retained after 200 operations and destruction. `y()`'s cold committed move allocates about +24 B more over its first 200 moves, and that excess falls as the code warms up.

## 2. The findings

| Finding | Tier | Disposition | Decision |
| --- | --- | --- | --- |
| `class-refactor-reviewer-1`: the published `DropTargetTracker` and `MotionConstraint` refuse third-party objects | B | **Confirmed. Restore the interfaces** (handoff item 1) | `DRD-63` property 1, applying `DRO-13` |
| `class-refactor-reviewer-2`: receiver declarations are gone, and the `DRD-35` declaration test fails | B | **Confirmed. Declare `this` at every built-in site that passes a receiver** (item 2) | `DRD-63` property 2, which amends `DRD-35` property 7 and `DRD-37` property 4 |
| `class-refactor-reviewer-3`: the `tsconfig.json` edit fails drag's lint | B | **Confirmed. Restore the line** (item 3) | none. `DRD-60` property 2 already requires it |
| `class-refactor-reviewer-4`: hoisted scan reads are back inside the loops | C | **Confirmed. On the owner's answer to Q2: keep the inline reads and the getters, and remove the false "read once" comments** (item 4) | `DRD-63` property 5, as revised |
| `class-refactor-reviewer-5`: dev-only state is undeclared, or ships | C | **Confirmed. Type the state, and keep it out of the publication** (item 5) | `DRD-63` property 4 |
| `class-refactor-reviewer-6`: a fresh `MotionConstraint` doesn't clamp before `invalidate()` | C | **Confirmed. Restore the initial staleness, and add a witness** (item 6) | `DRD-63` property 3 |

The architect checked each finding against the snapshot's source, not only against the reports.

### `class-refactor-reviewer-1`: slot types

`DRO-13` is the owner's own record. It says that `MotionConstraint` and `DropTargetTracker` "stay interfaces, because a capability slot takes them and other code may implement them". The owner's note of 2026-11-10 adds that `DropTargetTracker` "is a contract for third-party `DropTargets` implementations". CONTRIBUTING's TypeScript section draws the same line: use `interface` for a contract that other code is expected to implement.

The snapshot exports both as type-only classes with `#private`. A declared class with a private member can't be satisfied structurally, so even a wrapper of the built-in tracker is refused. Nothing in the conversion needs that.

**The fix keeps the class:** the exported interface comes back, and a module-private class implements it. That costs no bytes, because types emit nothing. **Closing the slots would be a new decision** that reverses `DRO-13`, `DRD-33` choice 4 and the contract. The refactor gives no reason for one, so it isn't recommended (Q3).

### `class-refactor-reviewer-2`: receivers

The conversions make every built-in method read `#private` state. So a missing receiver used to be harmless, and is now a fault, as the proof's mutations show. At the same time the snapshot drops the three `this` declarations that `DRD-35` property 7 requires, through `Retirable` and `Invalidatable`. It also adds three receiver sites that no type guards:

- `sortable`'s `invalidate` step;
- the tracker's release;
- the tracker's resolve.

`DRD-37` turned `unbound-method` off because typecheck still guards those calls. After the snapshot, no built-in site has that guard.

**The decision keeps the owner's forms and restores the guard.** `Retirable` and `Invalidatable` stay. `sortable`'s step becomes a prototype method passed with `behavior`, which `DRD-34` property 8 allows as `DRD-35` amends it. Every method passed with its receiver declares `this`, and that costs no bytes. `DRD-63` amends `DRD-35` property 7, which listed `sortable`'s step among those that keep their form. It also amends `DRD-37` property 4 to cover all six sites. **Dropping the guard would be a new decision** that withdraws `DRD-35` property 7 and removes `DRD-37`'s stated reason (Q3).

### `class-refactor-reviewer-3`: `tsconfig.json`

`DRD-60` property 2 requires `tsconfig.json` to equal its text at `f7b7b300b`, and that text includes `./.plan/probes/callback-list/allocation.ts`. The edit is unrelated to the conversions. Restoring the line makes drag's lint exit 0 again, as it does at `5b581fbdf`. **Retiring the probe would be a separate decision,** which amends `DRD-60` properties 1 and 2 (Q3).

### `class-refactor-reviewer-4`: hoisted reads

The [alias cleanup](alias-cleanup-report.md), which the owner requested, removed the single-use aliases. It kept exactly the reads hoisted out of per-slot, per-candidate and hit-test loops, with a comment at each site. The snapshot moves these reads back into their loops:

- `y()`'s `first`, `end` and `pointerY`;
- `xy()`'s `count`, `pointerX` and `pointerY`;
- `xy()`'s `moved` and its `displacement`;
- `linearShift`'s `count`.

Two comments still say "Read once". CONTRIBUTING Part II §14 asks for measurement and owner approval before adding hot-path work. The only timing case on this path, case C, is higher in 7 of 7 rounds, but inside the A/A bound. That is inconclusive, and it doesn't show a slowdown.

**The owner answered Q2 on 2026-11-14:**

- the inline reads stay;
- `RectIndex`'s getters stay;
- the "read once" comments that the code no longer bears out are removed.

The owner also withdrew a proposal to replace the getters with methods, which the record never held. This answer is the §14 approval. It rests on case C's inconclusive reading, and on a temporary Godbolt (Compiler Explorer) probe that gave identical optimized loop bodies for six variants. That probe is evidence for its example and its engine. It doesn't show that drag performs the same, and [`performance-plan.md`](performance-plan.md) §1 records such inspection as an optional diagnostic.

**Two comments are false in the snapshot:**

- `linear-shift.ts`'s "Read once, outside the loops.", which stands above no read;
- `RectIndex`'s class comment, which says that each axis rule reads its slot range once per resolution.

The other "read once" comments are still true: `y.ts`'s comment above the anchor, `rect-index.ts`'s "Read once: each is used twice below." and `drop-targets.ts`'s comment above `x` and `y`.

_Revised on 2026-11-14:_ this section used to recommend restoring the hoists by default.

### `class-refactor-reviewer-5`: dev-only state

The snapshot has five `@ts-expect-error` directives on an undeclared public `advanceUnchecked`, where `5b581fbdf` has none in `src`. It also ships two class fields, `#heldLeft` and `#heldRight`, which only development code uses.

The baseline kept this state in closure variables that folded away with `__DEV__`. A class field ships whatever its initializer, so that state can't stay a field. Where it goes is the implementer's choice, within `DRD-63` property 4.

### `class-refactor-reviewer-6`: a fresh constraint

`5b581fbdf` starts the box stale, and the snapshot doesn't. No host observes the difference, because `freeDrag` invalidates at each activation. But `bounds()` is a published installer, and the conversion's intent is behavior preservation. The initial value goes back, and a test witnesses it.

## 3. The reports' other claims

- **The verification report's findings 1 to 5** are the proof's `-2`, `-3`, `-1`, the cold-move reading and the size table. They are disposed of above, or carried into §4 as costs.
- **The other declaration changes,** which neither report counts as defects, are adopted:
  - `layoutAnimation` as a function declaration;
  - `DropTargetTracker.current` as a read-only member. The restored interface keeps it as `readonly current`, as at `5b581fbdf`;
  - the two new `.d.ts` files under `sortable/`.
- **`DRD-61` property 6's wording** says "closure variables". `DRD-63` amends it to "private fields".
- **The lifetime allocation probe has no mutation witness.** Its figures stay reported and unwitnessed. The proof's heap probe witnesses release, not bytes.

## 4. What the owner decides

Q2 is answered. Q1 and Q3 have defaults that the handoff builds, and the unit can start on those defaults. If an answer that differs is recorded before it starts, the unit follows that answer, and the architect amends the handoff. Q4 comes after the recheck.

- **Q1. Who commits the snapshot.**
  - **Default:** the implementer commits it verbatim as the unit's first commit, after checking the diff hash and the 16 file hashes. So the reviewed input gets a commit id, and the recheck reads the remediation as a diff from it.
  - **Alternative:** the owner commits it, and the unit starts from that commit.
- **Q2. The hoisted reads (`-4`).** **Answered by the owner on 2026-11-14:** keep the inline reads and the getters, and remove the false "read once" comments. The proposal to replace the getters with methods is withdrawn. The default was to restore the hoists.
- **Q3. Confirm the intent behind `-1`, `-2` and `-3`.**
  - **Default:** `DRO-13` stands, receivers stay guarded by types, and the probe stays in the project.
  - **If the owner meant** to close the slots, to drop the receiver guard or to retire the probe, each is a new decision, and it comes before the unit.
- **Q4. The costs, at the remediated end.** These are reported and not accepted, as `DRD-20` left the built-ins' class form for the owner to read. At the snapshot they are:
  - **size:** −32 to +40 B Brotli per row. Two red rows grow: "freeDrag + bounds + landing" by 40 B and "complete" by 18 B. Minified, every row grows by +53 to +895 B;
  - **allocation:** less per lifetime, and about +24 B per move on `y()`'s cold committed moves;
  - **timing:** no difference shown.

  The unit measures size and allocation again at its end. The owner reads them before acceptance, and no budget moves.

## 5. Next

1. **An `implementer`** runs [`owner-class-refactor-handoff.md`](owner-class-refactor-handoff.md) on `drag/class-refactor`, which the owner starts.
2. **A fresh `reviewer`** rechecks the remediation, which the owner starts. **Its scope:**
   - `DRD-63` properties 1 to 6 on the diff from the snapshot commit to the end;
   - each witness and mutation that the handoff names;
   - the declaration diff against `5b581fbdf`;
   - the publication's `sortable/linear-shift.js`;
   - the end's size and allocation readings.

   It needs no timing.

3. **The architect** reads the recheck, and the owner answers Q4.

**No new timing campaign is owed.**