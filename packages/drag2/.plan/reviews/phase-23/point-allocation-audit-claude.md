# The `Point` population, audited for ownership and allocation

**Decided 2026-08-27 against `3fb1887c`** on `drag2/fin-review`, on the owner's question about `Point`'s several roles. **Nothing in production was changed.**

The population is small enough to enumerate exhaustively: one declaration, twelve roles, and thirteen point-shaped object literals in `src/`.

## 0. Verdict

**There is no per-sample `Point` allocation left in the library, and there has not been one for some time.** The two hot paths already hold reusable mutable caches, and the pointer sample is not an allocation at all. What remains is per-operation, and the entire audit is worth **at most one object per drop**.

One change is worth making, and it is worth making for its shape rather than for its cost.

| Site | Role | Verdict |
| --- | --- | --- |
| `kernel/types.ts:11` `Point` | The shared immutable coordinate pair | **Stays.** Public, re-exported from `drag.js` |
| `kernel.ts:126` `PointerCoordinates` | Per-sample pointer view | **Stays, and is not a `Point`.** No allocation exists to remove |
| `presentation.ts:369` `rendered` | Per-operation recorded delta | **Already a cache.** Type it `PointCache` |
| `free-drag/spec.ts:150` `motion` | Per-controller motion draft | **Already a cache**, and keeps the name `MotionDraft` |
| `free-drag/controller.ts:48` `moveTo(point)` | Consumer input | **Stays.** Scalarizing adds an allocation |
| `free-drag/domain.ts:99` `ResolveHome` | Consumer-owned result | **Stays** |
| `kernel/spec.ts:299,306` `LandingContext.from`/`.target` | Published to a consumer runner, held for the landing | **Stays.** Escapes and outlives the tick |
| `kernel.ts:1562` `target` | Retained on the settlement attempt | **Stays fresh.** Same escape |
| `kernel.ts:1594` `from` | Copy of `rendered` | **Stays.** The copy is the point |
| `kernel/spec.ts:428` `anchorTarget(): Point` | Behavior → kernel, read once | **Per-controller `PointCache`** |
| `free-drag/spec.ts:875,895,902,935` | Four `anchorTarget` arms | Write the cache |
| `sortable/spec.ts:1653,1686` | Two `anchorTarget` arms | Write the cache, with one caveat in §7 |

## 1. Why the ceiling is one object per drop

**The pointer sample is a structural view, not an object.** `PointerCoordinates` is `Readonly<{ pointerId, clientX, clientY, preventDefault() }>`, and `armPointerInput` hands the native `PointerEvent` straight to `onPointer`, which enqueues it as the action's `argument`. The native event satisfies the shape, so the hot path allocates nothing to describe a sample. It is retained in the queue only until the drain, which is synchronous inside the listener.

**Both per-frame deltas are already reusable caches**, and both say so in the source. `rendered` is _"one object per operation, written in place: D-35's cost is these two field writes per sample, and re-publishing a fresh `{ x, y }` would put an allocation on the one path F-24 spent a whole measurement keeping allocation-free."_ `motion` is written by `constrain.apply` as an out-parameter for the same reason, recorded on the SPI itself.

So the honest scale: a drag operation allocates a handful of objects at lift and a handful at drop, and **no `Point` per sample**. Under `CODE_OF_SIZE.md` §0 and §15 that means **no performance claim may be attached to anything below**. The case for the one change is that it costs nothing, not that it is measurable — and the record should not pretend otherwise, because the next reader will quote it.

## 2. `moveTo(Point)` is already allocation-optimal, and the mechanism is the queue

The action queue is two parallel arrays — `queue.actions: number[]` and `queue.args: unknown[]` — and `enqueue` pushes one entry into each. `moveTo` calls `host.dispatch(TAG_POSITION, point)`, so **the consumer's own object travels through unboxed**; the library allocates nothing. A consumer animating a controlled position can hold one point and mutate it between calls, and the library never copies it: `prepare` reads `const { x, y } = point` and immediately converts to two frame scalars.

A `moveTo(x, y)` signature has three implementations and all three are worse:

- box `{ x, y }` to fit the single `argument` slot — **one library allocation per call**, where there is currently none;
- push two entries with a synthetic companion tag — two queue slots per move, and a drain that must not be interrupted between them;
- add a third parallel array of numbers — every non-positional action then pushes a hole into it, on the hot path.

**Confirmed as the owner suspected, with the reason being the transport rather than taste.** `moveTo` stays.

## 3. What escapes, and therefore stays fresh

Three sites are excluded by lifetime rather than by preference.

- **`LandingContext.target` and `.from`** are handed to a consumer's landing runner and read on every frame of the animation, which outlives the tick that built them. `from` is _already_ a deliberate copy of `rendered` — aliasing the kernel's mutable object into consumer code is exactly what that comment refuses.
- **`kernel.ts:1562`'s `target`** is stored on `attempt.target`, survives the whole landing, and is read again by the join pin after the runner relinquishes control. A shared cache here would be a mutable object published into consumer code _and_ retained across foreign code — both halves of what `from`'s copy exists to prevent.
- **`ResolveHome`** returns a consumer-owned point once per drop. There is no out-parameter form that does not hand a library-mutable object to consumer code, and its result is already copied on arrival because it may be getter-backed.

## 4. The one candidate: `anchorTarget` on a per-controller `PointCache`

**Frequency.** One production call site, `kernel.ts:1526`, once per settlement arm. The kernel states it: _"No second measurement. `anchorTarget` runs once, at arm."_

**Escape analysis, and it is clean.** Between the seam returning and the kernel reading the fields at 1562 there is **no foreign code**:

1. `runUnclassifiedValue` returns the value or `undefined`;
2. `settlementLive(attempt)` — five pure field comparisons, no call;
3. the `undefined` branch;
4. `const origin = originRect!`;
5. `anchor.x` and `anchor.y`, read once each into a fresh `target`.

The kernel never retains `anchor`. Nothing between the call and the reads can re-enter the controller, so a borrowed object cannot be overwritten before it is consumed.

**What it actually saves.** One object per drop, in whichever arm is taken. The kernel's own `target` allocation is unaffected and must be — see §3.

**Why it is still worth doing.** The owner has settled `PointCache` as the shape for reusable point caches. `anchorTarget` is the only site in the package where a reusable cache is _safe and not already used_, so it is either this or the type has exactly one production use. Landing it makes the pattern uniform across the three places a point is recorded rather than published.

## 5. The chain, and what must move together

`anchorTarget()` → kernel reads `.x`/`.y` → **fresh** `target` → `attempt.target` → `LandingContext.target` → the runner, and the join pin.

**The chain splits at the kernel's read, and that split is load-bearing.** Everything upstream of it is borrowed and may be cached; everything downstream escapes and must not be. So the seven behavior arms move together, and **nothing downstream moves at all**. A change that pushed the cache past the read — for example by making `attempt.target` the same object — would be the whole defect this audit exists to avoid.

The three required properties, if it lands:

1. **The cache is per controller**, held beside the behavior's existing per-controller state (`rt`, alongside `motion`). Never module-level: two controllers on one page must not share one.
2. **The cache write is the last statement of the arm.** Every arm that calls foreign code — free-drag's `slots.getHome`, the sortable's `item.before()`, `homeGap` and `getBoundingClientRect` — must write after the last such call. **All seven arms already have that shape**, so this preserves a property rather than introducing one, and that is why the change is low-complexity.
3. **`BehaviorSpec.anchorTarget`'s contract states the borrow**: the result is read immediately by the kernel, never retained, and never handed to consumer code. This is true today and unstated, which is the gap in §9.

## 6. Where `PointCache` may be declared, and where it may not

`type PointCache = Writable<Point>` with `Writable` from `type-fest`, as settled. Two facts constrain its home.

**`type-fest` is a `devDependency`**, not a dependency. **Declaration emit is total per module**: `kernel/types.d.ts` carries every export of `kernel/types.ts`, and it ships. So `export type PointCache` in `kernel/types.ts` would publish a `type-fest` import into the tarball's type surface of a package that does not depend on `type-fest`.

**The existing precedent is the safe pattern, and it is safe by accident.** `sortable/config.ts` and `free-drag/config.ts` already import `Writable`, and neither `config.d.ts` mentions it — because both use it only on a **local `const`**, which declaration emit never sees.

So the rule is: **`PointCache` may be named only on declarations that reach no shipped `.d.ts`**, and its declaring module must itself be one the prune removes.

- `presentation.ts`'s `rendered` is a local `const` — safe, and its published member stays `rendered: Point`.
- `free-drag/spec.d.ts` and `sortable/spec.d.ts` are **pruned**, so the two `anchorTarget` caches are safe.
- The declaring module must be new and type-only — `src/kernel/point-cache.ts` — reachable from no public declaration, therefore pruned. It is erased entirely, so `CODE_OF_SIZE.md` §2.1 does not bite: there is no runtime module to justify.

**No new instrument is owed.** `tests/packaging.node.test.ts` already asserts that no declaration the entries cannot reach survives, so a leak of the new module fails an existing row.

## 7. Called out rather than bucketed

**The sortable's `{ x: 0, y: 0 }` closed-controller arm is a sentinel, not a measurement.** Writing it into the shared cache is harmless — the kernel discards the value when `settlementLive` fails — but it means _the cache holds the last landing target_ is false in that one arm. Nothing may come to depend on the cache's contents between calls; it is a return buffer, not state.

**The free-drag home copy is the cache write, and must not be optimized away.** `const { x } = home; const { y } = home; return { x, y }` reads the consumer's possibly-getter-backed point exactly once per axis. A later reader who sees a cache and asks why the library still copies is asking about a documented `CODE_OF_SIZE.md` §1.1 carve-out. Writing the two reads into the cache is the same operation with the allocation removed; **reading `home` twice, or aliasing it, is not.**

**`MotionDraft` is not `PointCache` and must not be replaced by it.** It is structurally `Writable<Point>`, but it is a **published SPI type** — `apply(motion: MotionDraft, view: ConstraintView): void` is exported from `free-drag/feature.d.ts` and third-party constraint authors annotate against it. Replacing a semantic name with an allocation-flavoured alias is a downgrade under `CODE_OF_SIZE.md` §12, and it would leak `Writable` into a shipped declaration under §6 above. Two independent reasons; the name stays.

**Not recommended, and not because of allocation:** flattening `LandingContext` to four scalars, or `Point` to scalars anywhere in the public surface. `Point` is re-exported from `drag.js` and is a promise under `CODE_OF_SIZE.md` §4's permanence clause.

## 8. Findings

**F-122.** An internal type alias backed by a `devDependency` is publishable by accident. Declaration emit is total per module and `kernel/types.d.ts` ships, so an `export type` there carries its imports into the tarball's type surface — for a dependency consumers do not have. The two existing `Writable` uses avoid it only because both happen to sit on local `const` declarations; **nothing states the rule and nothing checks it.** The narrow consequence is `PointCache`'s home and D-144 takes it. The general one is that _a module's `.d.ts` publishes what the module exports, not what the package intends to publish_, which is the same class as the pruning pass that removed 6.5 kB of unreachable declarations — found again one level down, at the type rather than the file.

**F-123.** `BehaviorSpec.anchorTarget`'s contract does not say what the kernel does with the returned point. The kernel reads it immediately and never retains it, which is what makes a reusable cache safe — but that is a fact about the current implementation with no sentence and no test behind it. A future edit that stored `anchor` on the attempt, or passed it into `LandingContext` unconverted, would break every cached implementation silently and pass the suite. It is the precondition for D-144 rather than a consequence of it.