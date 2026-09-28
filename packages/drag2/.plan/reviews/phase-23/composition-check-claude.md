# The composition check: cardinality resolved at the entry, not restated in every group

Owner direction, 2026-08-28: `?: never` solves cardinality at the wrong level. The invariant is _after composition is resolved, each unique contribution slot may occur at most once among the installers that actually survive and run_, and it should be computed from accumulated type information at the composition boundary rather than encoded redundantly into each constituent type. No group should need negative knowledge of its siblings.

The direction holds. It also turns out to need **less** machinery than the sketch: no accumulator, no merge model, no variadic fold. What it does need is `const` type parameters, and that requirement is not optional.

## 0. The prototype

A standalone skeleton was compiled against the repository's own compiler (TypeScript 7.0.2) with `--strict`, reproducing both behaviors' installer aliases, contribution groups, config schemas and entry signatures. Every case below is an assertion in it — the negatives as `@ts-expect-error`, so a case that stopped failing would fail the file.

| Case | Expected | Result |
| --- | --- | --- |
| `plugins: [layoutAnimation()]` | accepted | accepted |
| `plugins: [y()]` | refused | refused |
| `plugins: [landing()]` | refused | refused |
| `plugins: [layoutAnimation(), y(), layoutAnimation()]` | refused, **on the middle element** | refused, column points at `y()` |
| `sortable(root, config, { plugins: [landing()] })` | refused in the fragment | refused |
| `freeDrag(item, { onDrop, plugins: [bounds()] })` | refused | refused |
| `freeDrag(item, { onDrop }, { plugins: [fp()] }, { plugins: [bounds()] })` | refused in the third argument | refused |
| `const hoisted: AxisInstaller = y(); plugins: [hoisted]` | refused | refused |
| `const widened: SortablePlugin = y(); plugins: [widened]` | **accepted** (the owner's boundary) | accepted |
| `sortable(…, { axis: y() }, { axis: y() })` | accepted (last-wins) | accepted |
| free-drag plugin in a sortable's `plugins` | refused (D-138) | refused |
| the implementation body passing `config`/`fragments` to `createComposedSortableBehavior(SortableConfig, ReadonlyArray<Partial<SortableConfig>>)` | compiles with no cast | compiles |

The diagnostic, verbatim:

```
error TS2322: Type 'AxisInstaller' is not assignable to type
  'AxisInstaller & Readonly<{ [MISPLACED]: "installer contributes 'insertion',
   which only its own config key may install"; }>'.
```

The column is the offending array element, not the call and not the `plugins` property. That is strictly better than what `?: never` produces, which is an error at the _contribution_ assignment or, for a hoisted alias, nothing at all.

## 1. What the invariant actually is

Cardinality is not the binding constraint here, and reading the merge and the assembler together shows why.

- **Every unique slot is declared on exactly one non-plugin group, and every non-plugin key is atomic and last-wins.** `mergeFragments` resolves `axis` and `landing` to one installer each; `AxisContribution` requires `insertion` and `LandingContribution` requires `startLanding`. So each unique slot already has exactly one writer, before any check runs. There is nothing for an accumulator to count.
- **`plugins` is the one appending position, and it owns no unique slot.** Its contribution group declares only multi-writer members.
- **The assembler reads each unique slot positionally** — `axis.insertion`, `landing.startLanding` — and the plugin loop reads `retire` and the two displacement hooks and nothing else.

So the failure the reviews found is not two writers. It is **one writer at a position that is never read**: `plugins: [y()]` installs an axis whose geometry nothing dereferences and whose `insertion.retire` nothing registers. Arity is intact; ownership is violated.

The correct statement is therefore stronger than the cardinality one and implies it:

> **An installer may contribute only the slots its position is read for.** Each unique slot is read from one position; the appending position is read for multi-writer slots alone. Cardinality follows, because every unique slot's position is atomic.

Stated that way the check is per-position and O(n) with no state carried between elements. The accumulator becomes necessary only if a future position were both unbounded **and** an owner of a unique slot, or if two non-plugin groups declared the same unique key. Neither is true, and the second is cheap to keep true — see §2.4.

## 2. The decision

### 2.1 The unique-slot union is derived, not listed

```ts
export type UniqueSlot<Groups, PluginGroup> = Exclude<
  Groups extends unknown ? keyof Groups : never,
  keyof PluginGroup
>;

type SortableUnique = UniqueSlot<
  AxisContribution | LandingContribution,
  SortablePluginContribution
>;
type FreeDragUnique = UniqueSlot<
  ConstraintContribution | LandingContribution,
  FreeDragPluginContribution
>;
```

Asserted in the prototype to be exactly `'insertion' | 'startLanding'` and `'constrain' | 'startLanding'`.

**A unique slot is a key a sibling group declares and the plugin group does not.** That is the definition rather than a restatement of it, so there is no list to forget: a new capability group joins the union by being declared. The prototype simulates it — adding a hypothetical `ScrollContribution` with `autoScroll` extends the union to three members with no edit anywhere else.

### 2.2 The check is one mapped type over the `plugins` position

```ts
declare const MISPLACED: unique symbol;

export type Misplaced<K extends string> = Readonly<{
  [MISPLACED]: `installer contributes '${K}', which only its own config key may install`;
}>;

export type UniqueIn<
  Installer,
  Unique extends PropertyKey,
> = Installer extends (context: never) => infer C
  ? C extends unknown
    ? Extract<keyof C, Unique>
    : never
  : never;

export type Composed<Plugins, Unique extends PropertyKey> = {
  readonly [I in keyof Plugins]: [UniqueIn<Plugins[I], Unique>] extends [never]
    ? Plugins[I]
    : Misplaced<Extract<UniqueIn<Plugins[I], Unique>, string>>;
};

export type SortableComposition<T> = T extends { plugins?: infer P }
  ? Readonly<{ plugins?: Composed<P, SortableUnique> }>
  : unknown;
```

`UniqueIn` distributes twice on purpose: over a union of installer types, and over a union of contribution types. **`keyof` of a union is the _intersection_ of its keys**, so a non-distributive extraction over `Plugins[number]` would report only the keys every plugin shares — which is exactly the members the plugin group declares, and therefore never a violation. This is the one place where getting the variance wrong produces a check that silently always passes.

`Misplaced` is never constructed and emits nothing. Its only job is to carry the sentence into the diagnostic, which is why the message is a template literal type rather than a comment.

### 2.3 The entry signatures need `const` type parameters, and this is not negotiable

```ts
export function sortable<
  const C extends SortableConfig,
  const F extends readonly Partial<SortableConfig>[],
>(
  root: HTMLElement,
  config: C & SortableComposition<C>,
  ...fragments: { [I in keyof F]: F[I] & SortableComposition<F[I]> }
): SortableController;
```

Without `const C`, the mixed case `plugins: [layoutAnimation(), y(), layoutAnimation()]` **passes**. The array literal's element type is inferred as the best common supertype; `AxisInstaller` is assignable to `SortablePlugin`, subtype reduction collapses the union, and the offender's identity is gone before the check sees it. This was observed, not predicted: the first prototype failed on precisely that case and on no other.

Variadic tuples are **not** needed. The mapped type over `keyof Plugins` works whether `Plugins` is a tuple or an array, and the fragments rest is a homomorphic mapped type over `F`, which stays inferable. `const F` is wanted for the same element-identity reason as `const C`.

The collateral cost of `const` was checked against the real schema: every `SortableConfig`/`FreeDragConfig` member is a function or a number, both configs are already `Readonly<>`, and `plugins` is already `readonly`. `threshold: 4` narrows to `4` and stays assignable. The implementation body passes `config` and `fragments` straight through to the existing merge signature with no cast.

### 2.4 The precondition is asserted rather than assumed

The positional model rests on two non-plugin groups never declaring the same unique key. That is a one-line type assertion, and it belongs beside the existing declaration instruments:

```ts
type Disjoint<A, B, Plugin> = [
  Exclude<keyof A & keyof B, keyof Plugin>,
] extends [never]
  ? true
  : never;
const _: Disjoint<
  AxisContribution,
  LandingContribution,
  SortablePluginContribution
> = true;
```

Today both behaviors' groups intersect in `retire` alone, which the plugin group also declares, so both hold. If a future edit broke it, this fails and the accumulator model becomes the answer — which is the honest way to defer the fold rather than to reject it.

### 2.5 `?: never` is deleted

D-150's four refusal clauses go, and with them the `@ts-expect-error` instrument that defended them. Every contribution group returns to describing only what it contributes.

## 3. Where the types live

The helper aliases are named by a **public entry signature**, so `tests/docs.node.test.ts` requires them exported. They belong in `src/shared/composition.ts` — both behaviors need identical declarations, which is the same B-7 argument that already homes `FeatureContext` and `LandingContribution` there — and are re-exported from both middle tiers.

**The ordinary entries gain no export.** `SortableComposition` is named by `sortable()`'s signature, so it ships from `sortable.js` under F-51; its own closure — `Composed`, `UniqueIn`, `Misplaced`, `UniqueSlot` — resolves at `sortable/feature.js`, which is inside the tier-scoped closure D-78 defines. Six erased type names at the middle tier, zero runtime bytes, and no new name an ordinary consumer has to read.

The emitted `.d.ts` was inspected. The signature prints as one line plus a two-line mapped rest; the four helpers print as their bodies. `Composed` is the only dense one, and factoring `UniqueIn` out of it — which the prototype does — is what keeps it to a readable conditional.

## 4. What is declined

**The accumulated fold.** Not because it is awkward — a `Seen`-carrying tuple fold was straightforward to write — but because §1 shows it would count to one and stop. Encoding a merge model in types to resolve last-wins for positions whose contribution types already require their unique member is machinery with no case behind it, and it would have to mirror `mergeFragments` exactly or lie. The positional check needs no merge model at all: a misplaced installer is wrong whether or not it survives, because its position is wrong rather than its arity.

**Nominal seats** stay declined for the reason recorded against D-150: a branded seat admits a zero-parameter installer, and both first-party `landing()` installers are exactly `() => ({ startLanding })`.

**Lifting unique slots from any position at runtime**, which would make cardinality the true invariant and position irrelevant. It reintroduces the runtime shape inspection D-146 removed, grows the assembler's plugin loop, and hands back the precedence question that loop exists not to have.

## 5. The accepted boundary, and its one residual

The owner's boundary — explicit widening forgets provenance — is what makes this model small, and it is the model's one regression against D-150. The witness the two reviews reported is exactly a widening:

```ts
declare const constraint: ConstraintInstaller;
const plugin: FreeDragPlugin = constraint; // still compiles
freeDrag(item, { onDrop, plugins: [plugin] }); // now accepted, and still inert
```

`?: never` refuses that first line. The composition check does not see it, because by the call site the type says `FreeDragPlugin` and the compiler was told to forget the rest.

The residual is bounded: a plugin can only be _installed_ through the entry, so what survives is a consumer who deliberately annotated away their own information and then finds their capability silently absent. Ordinary inferred composition — `plugins: [bounds()]`, hoisted-but-correctly-typed installers, fragments, mixed arrays — is refused. Weak-type detection cannot be recruited to close the gap: it fires only when the source shares no member with an all-optional target, and `retire` is on every group.

This is a documentation obligation on the `plugins` slot rather than a type one.

## 6. Findings

**F-143.** _A check was specified over the survivors of a merge when the property it defends is a property of the positions._ The invariant reads as cardinality because the defect looked like two writers. It was one writer at an unread position, and the merge never entered the argument.

**F-144.** _An extraction over a union of contributions passes vacuously, because `keyof` of a union is the intersection of its keys._ The non-distributive spelling of the check reports only the members every plugin shares — precisely the plugin group's own — and so can never fail. A check that cannot fail is worse than no check, and nothing in a passing suite distinguishes them.

**F-145.** _Subtype reduction in array-literal inference erases the provenance a positional check needs._ `[goodPlugin, axisInstaller]` widens to the supertype before the check runs. `const` type parameters are the fix; the general form is that any type-level composition check over an argument position is only as good as the inference that reaches it, and that has to be demonstrated rather than assumed.

## Appendix — the prototype, in full

Compiles clean under `tsc --strict` at TypeScript 7.0.2. The negatives are `@ts-expect-error`, so a case that stopped failing would fail the file. Stand-in declarations replace the real domain types; every installer alias, contribution group, config schema and entry signature is the real shape.

```ts
type Disposer = () => void;
type FeatureContext = Readonly<{ root: HTMLElement; report(e: unknown): void }>;
declare const S: unique symbol;
declare const FD: unique symbol;
type SortableFeatureContext = FeatureContext & Readonly<{ [S]: never }>;
type FreeDragFeatureContext = FeatureContext & Readonly<{ [FD]: never }>;

type InsertionGeometry = Readonly<{
  resolve(): unknown;
  invalidate(): void;
  retire(): void;
}>;
type MotionConstraint = Readonly<{
  apply(): void;
  invalidate(): void;
  retire(): void;
}>;
type LandingStart = () => void;
type DisplacementHook = (v: unknown) => void;

type LandingContribution = Readonly<{
  startLanding: LandingStart;
  retire?: Disposer;
}>;

type AxisContribution = Readonly<{
  insertion: InsertionGeometry;
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  retire?: Disposer;
}>;
type SortablePluginContribution = Readonly<{
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  retire?: Disposer;
}>;
type ConstraintContribution = Readonly<{
  constrain: MotionConstraint;
  retire?: Disposer;
}>;
type FreeDragPluginContribution = Readonly<{ retire?: Disposer }>;

type AxisInstaller = (c: SortableFeatureContext) => AxisContribution;
type SortableLandingInstaller = (
  c: SortableFeatureContext,
) => LandingContribution;
type SortablePlugin = (c: SortableFeatureContext) => SortablePluginContribution;
type ConstraintInstaller = (
  c: FreeDragFeatureContext,
) => ConstraintContribution;
type FreeDragLandingInstaller = (
  c: FreeDragFeatureContext,
) => LandingContribution;
type FreeDragPlugin = (c: FreeDragFeatureContext) => FreeDragPluginContribution;

/* ================= the whole mechanism: three shared aliases ================= */
declare const MISPLACED: unique symbol;

/** The refusal value. Never constructed; its only job is to carry the sentence. */
export type Misplaced<K extends string> = Readonly<{
  [MISPLACED]: `installer contributes '${K}', which only its own config key may install`;
}>;

/**
 * The keys a `plugins` entry may not contribute: every key a sibling group
 * declares and the plugin group does not. Derived, so a new unique slot joins
 * it by being declared, and no group carries negative knowledge.
 */
export type UniqueSlot<Groups, PluginGroup> = Exclude<
  Groups extends unknown ? keyof Groups : never,
  keyof PluginGroup
>;

/** Distributive on purpose: `keyof` of a union is its *intersection*. */
export type UniqueIn<
  Installer,
  Unique extends PropertyKey,
> = Installer extends (context: never) => infer C
  ? C extends unknown
    ? Extract<keyof C, Unique>
    : never
  : never;

/** Each `plugins` entry, replaced by a refusal where it contributes a unique slot. */
export type Composed<Plugins, Unique extends PropertyKey> = {
  readonly [I in keyof Plugins]: [UniqueIn<Plugins[I], Unique>] extends [never]
    ? Plugins[I]
    : Misplaced<Extract<UniqueIn<Plugins[I], Unique>, string>>;
};

/* ================= per-behavior application ================= */
type SortableUnique = UniqueSlot<
  AxisContribution | LandingContribution,
  SortablePluginContribution
>;
type FreeDragUnique = UniqueSlot<
  ConstraintContribution | LandingContribution,
  FreeDragPluginContribution
>;

type CheckSortable<T> = T extends { plugins?: infer P }
  ? Readonly<{ plugins?: Composed<P, SortableUnique> }>
  : unknown;
type CheckFreeDrag<T> = T extends { plugins?: infer P }
  ? Readonly<{ plugins?: Composed<P, FreeDragUnique> }>
  : unknown;

type SortableConfig = Readonly<{
  items: () => readonly HTMLElement[];
  onReorder: () => void;
  axis: AxisInstaller;
  landing?: SortableLandingInstaller;
  plugins?: readonly SortablePlugin[];
  threshold?: number;
}>;
type FreeDragConfig = Readonly<{
  onDrop: () => void;
  bounds?: ConstraintInstaller;
  landing?: FreeDragLandingInstaller;
  plugins?: readonly FreeDragPlugin[];
  threshold?: number;
}>;

declare function createComposedSortableBehavior(
  config: SortableConfig,
  fragments: ReadonlyArray<Partial<SortableConfig>>,
): void;

function sortable<
  const C extends SortableConfig,
  const F extends readonly Partial<SortableConfig>[],
>(
  root: HTMLElement,
  config: C & CheckSortable<C>,
  ...fragments: { [I in keyof F]: F[I] & CheckSortable<F[I]> }
): void {
  void root;
  createComposedSortableBehavior(config, fragments);
}

declare function freeDrag<
  const C extends FreeDragConfig,
  const F extends readonly Partial<FreeDragConfig>[],
>(
  item: HTMLElement,
  config: C & CheckFreeDrag<C>,
  ...fragments: { [I in keyof F]: F[I] & CheckFreeDrag<F[I]> }
): void;

/* ---- assertions ---- */
type Expect<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _u1: Expect<SortableUnique, 'insertion' | 'startLanding'> = true;
const _u2: Expect<FreeDragUnique, 'constrain' | 'startLanding'> = true;

declare function y(): AxisInstaller;
declare function sLanding(): SortableLandingInstaller;
declare function layoutAnimation(): SortablePlugin;
declare function bounds(): ConstraintInstaller;
declare function fLanding(): FreeDragLandingInstaller;
declare function fPlugin(): FreeDragPlugin;

declare const root: HTMLElement;
declare const items: () => readonly HTMLElement[];
declare const onReorder: () => void;
declare const onDrop: () => void;

/* good */
sortable(root, {
  items,
  onReorder,
  axis: y(),
  landing: sLanding(),
  plugins: [layoutAnimation()],
  threshold: 4,
});
sortable(
  root,
  { items, onReorder, axis: y() },
  { plugins: [layoutAnimation()] },
  { landing: sLanding() },
);
sortable(root, { items, onReorder, axis: y() }, { axis: y() });
freeDrag(root, {
  onDrop,
  bounds: bounds(),
  landing: fLanding(),
  plugins: [fPlugin()],
});
freeDrag(root, { onDrop }, { plugins: [fPlugin(), fPlugin()] });

/* bad */
// @ts-expect-error axis installer in plugins
sortable(root, { items, onReorder, axis: y(), plugins: [y()] });
// @ts-expect-error landing installer in plugins
sortable(root, { items, onReorder, axis: y(), plugins: [sLanding()] });
// @ts-expect-error one offender among good ones
sortable(root, {
  items,
  onReorder,
  axis: y(),
  plugins: [layoutAnimation(), y(), layoutAnimation()],
});
// @ts-expect-error offender in a fragment
sortable(root, { items, onReorder, axis: y() }, { plugins: [sLanding()] });
// @ts-expect-error constraint installer in plugins
freeDrag(root, { onDrop, plugins: [bounds()] });
// @ts-expect-error landing installer in plugins
freeDrag(root, { onDrop, plugins: [fLanding()] });
// @ts-expect-error offender in a fragment
freeDrag(root, { onDrop }, { plugins: [fPlugin()] }, { plugins: [bounds()] });

/* the accepted widening boundary */
declare const widened: SortablePlugin;
sortable(root, { items, onReorder, axis: y(), plugins: [widened] });

/* cross-behavior separation (D-138) still holds */
// @ts-expect-error free-drag plugin in a sortable
sortable(root, { items, onReorder, axis: y(), plugins: [fPlugin()] });
// @ts-expect-error sortable installer as free-drag bounds
freeDrag(root, { onDrop, bounds: y() });

/* ---- extension: a new unique slot joins the union by being declared ---- */
type ScrollContribution = Readonly<{
  autoScroll: () => void;
  retire?: Disposer;
}>;
type NextUnique = UniqueSlot<
  AxisContribution | LandingContribution | ScrollContribution,
  SortablePluginContribution
>;
const _u3: Expect<NextUnique, 'insertion' | 'startLanding' | 'autoScroll'> =
  true;

/* ---- a spread array of fragments still compiles (loses the check, as widening does) ---- */
declare const many: ReadonlyArray<Partial<SortableConfig>>;
sortable(root, { items, onReorder, axis: y() }, ...many);

/* ---- the precondition the positional model rests on, asserted ---- */
type Disjoint<A, B, Plugin> = [
  Exclude<keyof A & keyof B, keyof Plugin>,
] extends [never]
  ? true
  : never;
const _d1: Disjoint<
  AxisContribution,
  LandingContribution,
  SortablePluginContribution
> = true;
const _d2: Disjoint<
  ConstraintContribution,
  LandingContribution,
  FreeDragPluginContribution
> = true;
```