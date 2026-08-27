# Composition cardinality: keyed installers against a discovered contribution

Owner request, 2026-08-27. Evaluates the proposed composition model — a per-instance subconstructor returning named slot installers, with unique/multi cardinality checked statically — against the tree as it stands and against D-12, D-30, D-45, D-57, D-61, D-65, D-77 and D-138.

The direction holds. The diagnosis needs one correction, the proposed enforcement mechanism needs replacing with a cheaper one, and the call-shape sketch has to be refused on grounds this package already litigated.

## 1. The subconstructor is not missing — it is already what an installer is

The request reads `SortableInstaller` as having _absorbed_ the per-instance subconstructor role. It did not absorb it; it **is** it. D-45 and D-61 define an installer as a function that runs once per concrete behavior instance, may create whatever private runtime it likes, captures that runtime in the closures it returns, and is invoked after the merge — and `assemble()` drops the contribution object, so the state is unreachable from the behavior, the kernel or a sibling. `layoutAnimation()` is exactly the owner's sketch with the key names changed:

```ts
const install: SortableInstaller = () => {
  const running = new Map<HTMLElement, Animation>();   // per-instance state
  const members = new Set<HTMLElement>();
  return { beforeInsertionMove(view) { … }, afterInsertionMove(view) { … } };
};
```

So point 1 of the request is satisfied today, and point 2 — the returned named functions are slot installers — is satisfied today. What is not satisfied is point 3.

## 2. What is actually conflated: cardinality is declared on the slot and

enforced at the position, and the two never meet

`SortableContribution` marks `insertion`, `placeholder` and `startLanding` single-writer and `beforeInsertionMove` / `afterInsertionMove` / `retire` multi-writer. That marking is prose in a comment; the type is one flat record of optional keys and says nothing about cardinality.

Enforcement happens at a different place — the **position** an installer sits in:

| Position | Cardinality of the position | Contribution type it accepts |
| --- | --- | --- |
| `axis` | one, by the merge's last-wins | `AxisInstaller` — every slot |
| `landing` | one, by the merge's last-wins | `SortableInstaller` — every slot |
| `bounds` (free drag) | one, by the merge's last-wins | `FreeDragInstaller` — every slot |
| `plugins` | many, appended | same installer type — every slot |

Every position accepts an installer that may fill every slot. A unique slot therefore has as many potential writers as there are positions, and `plugins` makes that number unbounded. `claim()` exists for exactly this gap and for nothing else.

**The defect, stated once: the multi-writer position accepts single-writer contributions.** It is not that the contribution record is a generic bag — the bag does real work (§3) — it is that nothing connects a slot's declared cardinality to the arity of the positions that can reach it.

## 3. What the generic contribution model genuinely buys, measured against the tree

Full census of every producer in `src/`:

| Feature | Position | Unique slots contributed | Multi slots contributed |
| --- | --- | --- | --- |
| `y()`, `xy()` | `axis` | `insertion` | — (`insertion.retire` is lifted) |
| `landing()` (sortable) | `landing` | `startLanding` | — |
| `landing()` (free drag) | `landing` | `startLanding` | — |
| `bounds()` | `bounds` | `constrain` | — (`constrain.retire` is lifted) |
| `layoutAnimation()` | `plugins` | **none** | `beforeInsertionMove`, `afterInsertionMove` |

Three facts follow, and each answers a bullet of the request:

- **No first-party feature contributes a unique slot from `plugins`.** The one capability the discovered-contribution model buys over keyed installers is used by nothing.
- **No feature contributes two unique slots.** The multi-unique grouping the bag makes possible is likewise unexercised.
- **Grouping is exercised, and only for multi-writer slots.** `layoutAnimation()` contributes two hooks and a `retire` over one `Map` and one `Set`. This is the part of the bag that is load-bearing and must survive.

`SortableContribution.placeholder` has **zero producers in the entire tree** — not in `src/`, not in `tests/`. It is a slot nothing fills.

## 4. Two contract statements the tree does not implement

**(a) The placeholder collision does not exist.** [03 §The contribution](../../contract/03-feature-composition.md) states that the assembler seeds the single-writer local from `config.placeholder` _before_ installing anything, "so a plugin that contributes one collides with the config key through the same `claim`… one rule, one diagnostic, and no precedence question to answer." `assemble()` does the opposite: `contributedPlaceholder` starts `null`, only contributions claim into it, and the record is built with `config.placeholder ? wrap : contributedPlaceholder`. **The config key wins silently and there is no collision.** A precedence question is answered — the one the passage says does not arise.

Both readings are defensible; what is not defensible is that the normative document states the one the code does not do. Recorded as F-127.

**(b) The `claim` diagnostic for `placeholder` is unreachable.** With no producer anywhere, the `'placeholder'` label is a string constant, a branch and a message for a collision no code path can construct.

## 5. Why the request's enforcement mechanism should not be built

The request asks for cardinality "checked statically by TypeScript from the feature return shapes — e.g. via the relevant `ReturnType<…>` machinery". Taken literally over a variadic feature list, that means folding a tuple of return types and rejecting duplicate unique keys pairwise.

**This package has already answered that question, in the negative, on grounds that transfer exactly.** 03 §First-iteration features examined a variadic tuple-merge type that would compute the merged slot set and reject a call naming no axis. D-77 closed it: a `Partial<SortableConfig>` variable erases the literal's key set, and the fold then reports **success** — "the check would pass in precisely the case it exists to catch." A fold over feature _return_ types has the identical hole: one `SortableInstaller`-typed variable in the array, one spread of a `readonly Installer[]`, and every duplicate becomes invisible. Add the O(n²) pairwise comparison and the error messages a conditional-type rejection produces, and the instrument is expensive, unsound at the boundary, and worse to read than the throw it replaces.

**The cheap form of the same goal is to make duplication unrepresentable rather than detected.** Uniqueness is already free in TypeScript at one place: an object literal cannot name a key twice, and the merge's last-wins settles the cross-fragment case without arbitration. That mechanism costs nothing, has no tuple to erase, and produces the compiler's ordinary diagnostics.

## 6. The model

**One rule: every unique slot is producible from exactly one config key.**

Cardinality then follows from position and needs no computation, no runtime arbitration and no validation — which is what the request asked for, by a different route.

Each key carries its own installer type, and each installer type returns its own contribution group:

```ts
type SortableConfig = Readonly<{
  axis:      AxisInstaller;          // (ctx) => AxisContribution
  landing?:  LandingInstaller;       // (ctx) => LandingContribution
  plugins?:  readonly SortablePlugin[];  // (ctx) => PluginContribution
  …
}>;

type AxisContribution = Readonly<{
  insertion: InsertionGeometry;      // required — the intersection hack goes
  placeholder?: PlaceholderSlot;     // §7
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  retire?: Disposer;
}>;

type LandingContribution = Readonly<{ startLanding: LandingStart; retire?: Disposer }>;

type PluginContribution = Readonly<{   // multi-writer slots only
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  retire?: Disposer;
}>;
```

Free drag takes the same shape over its three slots: `bounds` produces `constrain`, `landing` produces `startLanding`, `plugins` produces `retire` and nothing else.

What this preserves, deliberately:

- **The bag survives, narrowed.** A key's contribution is still a flat record of named closures over one private state, so §3's grouping is intact and the owner's `landing()` sketch — one subconstructor, several named installers, one `commonState` — is exactly what an `AxisInstaller` already writes.
- **Two levels survive.** The consumer writes `landing:`, the middle tier writes `startLanding:`. Collapsing them so that the config key _is_ the slot name (`{ startLanding: … }`) was considered and rejected: it leaks an internal seam name into the ordinary tier and destroys grouping.
- D-57's ordering (named keys in schema order, plugins in array order, retire reversed), D-138's context brand, D-92/D-94's receiver negative, D-80's unwind bracket, D-45's last-wins and the config-key-beats-contribution precedence for `placeholder` are all untouched.

What it deletes:

- `claim()` in both assemblers, its three call sites in `sortable/assemble.ts` and two in `free-drag/assemble.ts`, and both `duplicate-contribution` diagnostic identities.
- The `AxisInstaller` intersection (`SortableContribution & { insertion: … }`) — `insertion` is simply required on `AxisContribution`.
- `SortableContribution` and `FreeDragContribution` as published names.

## 7. `placeholder` is residue and is deleted

**Amended 2026-08-27 by owner clarification. The recommendation below reverses; the paragraph it replaces is struck and kept, because the reasoning that failed is the finding.**

> ~~**Recommended: `AxisContribution`.** The placeholder's footprint is an axis concern — 03 §The footprint is two windows reasons about it in exactly those terms, and the motivating third-party case (a grid rule that wants a grid-shaped placeholder sharing the axis's rect index) is precisely a feature that wants `insertion` and `placeholder` over one private state.~~ **This conflates two responsibilities, and the tree already separates them.** The argument needed the axis to supply the placeholder's _appearance_; what a grid rule actually wants is its _footprint_, which comes from `box` — a config key since D-43 — and reaches the factory as `PlaceholderContext.rect`. Having reasoned that a slot's home should follow the grouping it makes possible, I chose a home for a grouping no producer wants.

**The responsibility split, as the code already implements it:**

| Question | Owner | Mechanism |
| --- | --- | --- |
| _What element is the placeholder?_ | the consumer | `config.placeholder`, a `PlaceholderFactory` over `{ item, visual, box, rect }` |
| _What footprint does it hold?_ | the consumer, via `box` | `footprint: OffsetBox`, computed across the lift in `activation.prepare` |
| _Where does it belong?_ | the axis capability | `Insertion`, resolved by `InsertionGeometry` |
| _Joining the two_ | the behavior | `createPlaceholder` once, then `movePlaceholder(placeholder, insertion)` per committed move — the single canonical writer of its position (D-27) |

The axis ↔ placeholder relationship is real and it is **placement**. Nothing in it is ownership of the factory, and no line of `placement.ts` reads the axis.

**D-45's own rule condemns the contribution slot.** _A slot with nothing to install is a config slot; only a slot that must construct private runtime carries an installer and therefore a contribution._ Making a detached element requires nothing an installer can construct that a plain function cannot close over — a consumer pooling placeholders closes over their own pool — which is exactly why `getHandle`, `getVisual` and `callbacks` were deleted at D-45 and `placeholder` became a config key at D-56/D-65. The contribution half was kept beside the config key rather than derived, and it has never had a producer.

**Deleted, therefore.** `config.placeholder` remains the customization point, the axis remains responsible for insertion geometry, and the behavior keeps joining them.

### What the deletion collapses, which is more than the slot

`PlaceholderSlot` is `PlaceholderFactory` plus a `live` second parameter, widened at I-36/D-65 for "a middle-tier author filling `SortableContribution.placeholder`". That author never arrived, and the consequences are measurable rather than notional (F-130):

- **No value reads the parameter.** `createPlaceholder(…, factory, live, …)` calls `factory(context, live)`, and `factory` is always either `null` — the library's own `<div>` path — or the assembler's wrapper around a `PlaceholderFactory`, which drops it.
- **The wrapper is an allocation per controller.** `assemble()` builds `(placeholderContext) => config.placeholder!(placeholderContext)` for the sole purpose of adapting a narrower consumer function to a wider slot type that nothing wider ever fills.
- So deleting the contribution slot lets `SortableSlots.placeholder` become `PlaceholderFactory | null`, deletes the wrapper, deletes the argument at the one call site, and unpublishes `PlaceholderSlot` from the middle tier.

**What survives, and must**: the library's own liveness barrier. `createPlaceholder` calls `live()` itself after the factory returns and passes it into `applyMechanics`; only the handing of `live` _to consumer code_ goes. D-39's undo ledger is likewise untouched — it is gated on `slots.placeholder` being non-null, which after the deletion means exactly what it already means in practice: the consumer supplied a factory.

### The residual question, answered rather than deferred

Is there any middle-tier author who needs `live` around element construction? Only one shape qualifies: a factory that mutates something outside its own return value between two of its statements. A consumer factory that does so has the same need and no route to `live` — so the widening never served _authors_, it served _one audience of one that did not exist_. If that need is ever real it is a change to `PlaceholderFactory`, felt by consumers, and not a second slot beside it.

## 8. The call shape is not at issue, and the fold still is

**Clarified 2026-08-27: `sortable(y(), placeholder(), landing())` was demonstrational — a sketch of the sequential subconstructor model, not a request to revisit D-77.** D-146 therefore leaves the arity untouched: `sortable(root, config, ...fragments)` and `freeDrag(item, config, ...fragments)` stand, required configuration stays a required first argument, and a missing `items`, `onReorder`, `axis` or `onDrop` stays an ordinary missing-property error. **Nothing in the new composition model gives a reason to revisit them** — per-key installers change what a _slot's value_ is, not which slots are required or where they are supplied.

**The fold is refused on its own account and that half stands** (§5). It is not the call shape that raises it: enforcing unique/multi cardinality by folding a tuple of feature return types is the mechanism the request named, and it fails for the reason D-77 recorded — a `Partial`-typed variable erases the key set and the fold reports success in precisely the case it exists to catch. §6's rule is the replacement, and it needs no tuple at either level.

## 9. What narrows, priced rather than absorbed

**A third party can no longer add a unique-slot feature _beside_ a first-party one; it must take the key.** For `bounds` this is already the documented intent — "fills this slot _instead of_ `bounds()`". For `axis`, D-45 already made `y()` and `xy()` together legal and silently last-wins, so two axis claimants were never a supported composition either. The residue is the author who wants to _wrap_ a first-party capability, and their route is composition at the call site — `axis: withSnapping(y())` — which is better than two claimants racing to a construction-time throw.

**Two features can never both drive one unique seam.** Today that is a runtime throw; afterwards a compile error. Neither is support, so nothing is lost — but if a landing plus a snap-on-drop rule is ever wanted, it is a new key or an explicitly composed one, decided when a producer exists.

**Adding a unique slot now requires choosing its producing key.** An obligation rather than a cost: it forces the cardinality question at slot-introduction time, which is the question the current model defers to a runtime throw.

## 10. Lifecycle, size and tree-shaking

- **Lifecycle.** Unchanged. Installers stay externally inert, run after the merge, and their contributions are dropped. The unwind bracket survives with fewer triggers — `claim` was never its only thrower, an installer body still is, and D-80's totality claim is untouched.
- **The `insertion!` dereference stays.** Making `insertion` required on `AxisContribution` restates in a narrower type what the intersection stated; it does not constrain a JavaScript author, so the dereference that makes a violator throw inside the bracket must remain.
- **Size.** Strictly a reduction: `claim`, five call sites, two diagnostic identities, five nullable accumulator locals. Everything added is type-only. 03 §What isolation cannot shake priced composition at 283 B against a hand-written baseline and named "every assembler property read and `claim` branch" as one of its four items, so that figure must be re-taken.
- **Tree-shaking.** Unaffected. No new module, no new runtime export, and the per-key installer types are erased.
- **Middle-tier surface.** Three names replace two per behavior. Wider by count, narrower by each. The structural closure does not grow: every type the new contributions name — `InsertionGeometry`, `PlaceholderSlot`, `LandingStart`, `DisplacementHook`, `MotionConstraint`, `Disposer` — is published already, and `SortableContribution` / `FreeDragContribution` leave it. D-110's rule requires the three installer aliases to publish from `sortable.js` / `free-drag.js`, as `AxisInstaller` and `SortableInstaller` do now.

## 11. Findings

- **F-127** — 03 §The contribution states a placeholder collision the assembler does not implement, and answers a precedence question it claims does not arise. Present-tense claim, wrong since D-65's implementation. Same class as F-84 and F-90: a deletion or reshaping pass read the source and the test, and a contract sentence is neither.
- **F-128** — `SortableContribution.placeholder` has no producer in `src/` or `tests/`, so one `claim` branch, one label and one diagnostic identity are unreachable code. Surfaced only by a census; no instrument in this package asks whether a declared slot is ever filled.
- **F-129** — cardinality has been prose on one declaration and enforcement on another since D-45 introduced positions. The general form: **a property asserted in a comment on the type that declares it, and enforced at a site that does not name it, has no instrument that can notice them diverging.** `claim` is the enforcement and it names a label string, not a slot.