# Making the plugin position refuse a unique writer

Owner escalation of 2026-08-28: two independent reviews of `4568e563` converged on F-131 — the position-specific contribution groups do not make the unbounded position reject a same-behavior unique installer. Evaluated against the tree at `e019deba`. Decision/contract only.

**The report is correct, the mechanism is understood, and the fix is one clause per multi-writer group.** No runtime arbitration returns.

## 0. Verified rather than reasoned

A type probe was compiled against `src/` and deleted. Every prediction below is a compiler result, not an argument.

| Probe | Result |
| --- | --- |
| `const p: FreeDragPlugin = constraint` (hoisted `ConstraintInstaller`) | **compiles** — the hole, at the published aliases |
| `SortablePlugin = axis`, `SortablePlugin = sortableLanding`, `FreeDragPlugin = freeDragLanding` | **all compile** |
| The same four against a group carrying `constrain?: never` / `startLanding?: never` | **all refused** |
| An ordinary plugin — `() => ({ retire })` and `(context) => ({})` — against the fixed group | **compiles**, unaffected |
| A **zero-parameter** installer returning `ConstraintContribution`, against the fixed group | **refused** |
| The same zero-parameter installer against a **nominal-seat** model | **compiles** — the seat does not catch it |

---

## 1. Why the groups do not refuse

D-146 put cardinality on the contribution group, and that is right. What it did not notice is that **the group's membership was stated positively only**, and a group whose members are all optional requires nothing — so it refuses nothing:

```ts
type ConstraintContribution = {
  constrain: MotionConstraint;
  retire?: Disposer;
};
type FreeDragPluginContribution = { retire?: Disposer };
```

A type with more properties is assignable to one with fewer. Function return types are covariant, and both aliases take the identically-branded context, so contravariance never engages — D-138's brand separates the two _behaviors_ and was never asked to separate positions within one.

**The only thing standing was weak-type detection**, and it is off here: a target whose members are all optional is refused only when the source shares _no_ member with it, and `retire` is on every group. So the barrier the model appeared to have was an accident of one shared optional member, and it disappears exactly where the groups overlap most. The reviews are right to call this tier A: `plugins: [xy()]` beside `axis: y()` is ordinary use of two published factories in a published slot, it compiles, the plugin loop reads only `retire` and the two hooks, and for an axis nothing at all is registered — `y()` and `xy()` carry their cleanup as `insertion.retire`, which only the `axis` position knows to read. A silent leak for the controller's whole life, where before D-146 the same code threw with both features retired.

**The general form, and it is the part worth keeping (F-141):** _cardinality declared on a group is enforced by what the group **requires**. The unique groups are closed already — `AxisContribution` requires `insertion`, `ConstraintContribution` requires `constrain`, `LandingContribution` requires `startLanding`, so no unique position accepts another position's installer and none ever could. The multi-writer group requires nothing **by definition**, so it is the one group in the model that must state its refusals explicitly._ D-146 was not wrong about where cardinality lives; it was incomplete in the one place its own rule could not reach.

---

## 2. The decision: the multi-writer group names what it refuses

```ts
type SortablePluginContribution = Readonly<{
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  retire?: Disposer;
  /* refused: the unique slots, each owned by its own config key */
  insertion?: never;
  startLanding?: never;
}>;

type FreeDragPluginContribution = Readonly<{
  retire?: Disposer;
  constrain?: never;
  startLanding?: never;
}>;
```

Four clauses across two behaviors. Zero runtime: `never` members are types, and no value carries one.

**What it closes.** All four hoisted-alias assignments the reviews report; the plugin literal carrying a unique slot, which now fails on the property itself rather than on excess-property checking, so it does not depend on the literal being fresh (F-117); and the zero-parameter installer, because the refusal is on the **return type**, which is the thing that actually differs between a unique writer and a plugin.

**What it does not change.** D-146's model, the per-key installer aliases, the assembler's written-out key order, the absence of `claim`, or any unique group. The `axis` group keeps the two displacement hooks — an axis may legitimately bracket a committed move; that is a multi-writer member on a unique group, which was always allowed and is not what F-131 is about.

### The alternative, priced and declined

The obvious other answer is **nominal seats**: give each unique position its own context brand, extending D-138 one axis down from _behavior_ to _position_, and let parameter contravariance refuse the crossing. It is attractive — no enumeration to maintain, and a new unique slot would need no edit to any plugin group.

**It is declined because it is a proxy for the property, and the probe shows where the proxy leaks.** A seat refuses a function _that names its parameter_. `src/sortable/landing.ts` and `src/free-drag/landing.ts` both return `() => ({ startLanding })` — installers with **no parameter at all** — and a zero-argument function is assignable to any parameter list. The seat model admits them into `plugins`; the exclusion model refuses them. The invariant the owner states is about **what a position may represent**, which is a return-type property, so it belongs on the return type.

Two mechanisms for one invariant is also the defect D-92 and D-93 name, one rung down — one statement plus a second, differently-shaped one is worse than either alone, because a reader concludes the model distinguishes cases it does not.

### The mapped-type form, also declined

`SortablePluginContribution` could derive its refusals — `MultiWriterSlots & { [K in UniqueSlotKey]?: never }` — so a new unique slot updates one union. Declined for D-77's reason: the published `.d.ts` is read by third-party authors, a spelled-out member says _this position does not take insertion geometry_ and a mapped type says _consult two other declarations_, and the enumeration being refused is two entries long per behavior. Machinery is not owed to a list of two.

### The maintenance obligation, and its instrument

The exclusion is a list, so it can fall behind: a **new** unique slot must be added to each multi-writer group's refusals. That obligation gets a discriminating witness rather than a comment — a declaration test asserting, with `@ts-expect-error` on each pair, that every unique installer alias is **not** assignable to its behavior's plugin alias. It fails the day a unique slot is added without its clause, and it fails for the right reason: an `@ts-expect-error` that stops erroring is itself an error.

That instrument is what F-129 asked for and D-146 landed without. The reviews' own §1.3 note that weak-type detection was carrying the barrier is the evidence that an unwitnessed type invariant in this package does not survive its next edit.

---

## 3. Findings

- **F-131** — ledgered from [`d146-landing-review-claude.md`](d146-landing-review-claude.md) §1.2 and addressed by D-150.
- **F-141** — _A group stated its membership positively and was read as though it stated a refusal._ The unique groups are closed by their required members; the multi-writer group requires nothing, so the identical style of declaration means the opposite thing there. The general form: **a constraint expressed as a required member is invisible in the one group that has no required member**, and that group is exactly the one whose arity makes the constraint matter.

## 4. What the reviews found besides this

F-132 (declaration-suite witnesses), F-133, F-134 (required members' JS behaviour), F-135 (stale docs, exports) and F-136 (size claims) stay open in the landing review and are remediation once D-150 lands. They are not ledgered here, so the review remains their record until the remediation pass takes them.