# 3. Feature composition and private feature state

## What this is, precisely

**Construction-time composition of a known, closed set of sortable seams.** It is not an open plugin architecture, and describing it as one would be a straightforward overclaim: every new semantic seam requires coordinated edits to the public config schema, `SortableContribution`, `SortableSlots`, `assemble`, validation, the behavior's call sites, the exports and the tests. Features cannot contribute controller methods, and cannot contribute transactional frame state.

That closed world is the _point_ — it is what buys direct slot calls, prebuilt pipelines, no runtime descriptor interpretation, and honest tree-shaking.

**The sentence that used to close this section is half retracted by D-45 (Revision 2).** It read: ~~"It is not a supported third-party authoring or versioning contract, and nothing here should be read as promising one."~~ The **config schema is** exactly that — public, stable, and versioned like any other public type. A consumer may author the config literal, spread a preset over it, override one slot, or filter the plugin array. ~~What stays closed is the set of **installer values** the capability slots carry: authoring a new one still means dropping to `@ydinjs/drag/kernel` and writing a behavior (D-47). The closed world is the set of installers, not the set of objects that may name one~~ — **and that is retracted in turn by D-61 (Revision 2.1).** Authoring an installer is a **supported act at the middle tier**, `sortable/feature.js`; it does not mean writing a behavior, and sending someone there was the drift the owner caught. What stays closed is the set of **semantic seams** — the first paragraph's list — because adding one still requires coordinated edits to the schema, `SortableContribution`, `SortableSlots`, `assemble`, validation and the behavior's call sites. **A third party may fill an existing seam; only the package may add one.** That is the boundary, and it is narrower and more honest than either sentence it replaces — see §Fragments are public, installers are opaque.

## A fragment is a plain declarative partial config (D-45)

**Superseding D-12.** `sortable()` is variadic and **the library merges**:

```ts
sortable(root, { items, onReorder, axis: y() }, landing());
```

Every argument after the **required** `SortableConfig` is a **fragment**: a partial `SortableConfig`, authored as an ordinary object literal, carrying no brand, no `kind` tag and no provenance. ~~`sortable(root, config, y(), landing())`~~ — **amended by D-77**: `y()` is no longer a fragment at all, so it can only be written into the `axis` slot.

```ts
// **D-77**: the installer itself, not a one-key fragment. `axis` is a required
// slot of the required first argument, so a fragment position cannot fill it.
function y(): AxisInstaller {
  return installYAxis;
}

function landing(options?: LandingOptions): Pick<SortableConfig, 'landing'> {
  return { landing: installLanding(options) };
}

function layoutAnimation(
  options?: LayoutAnimationOptions,
): Pick<SortableConfig, 'plugins'> {
  return { plugins: [installLayoutAnimation(options)] };
}
```

The value a capability slot carries is an **installer** — the type this document used to export as `SortableFeature`, and which is **published at the middle tier** (D-61; it read _"now internal and unnameable"_ until Revision 2.1, which is the same drift one section up). An ordinary consumer importing only `sortable.js` still cannot name it; that is now a property of which entry they imported, not of the declaration:

```ts
type SortableInstaller = (context: FeatureContext) => SortableContribution;

type FeatureContext = Readonly<{
  realm: DOMRealm;
  /**
   * **The element the behavior is composed on, and it denotes a different
   * element per tier** (CE1-10): for the sortable it is the **collection
   * root**, the container whose children are the sortable items; for free drag
   * it is the **dragged item itself**, because a free drag composes on one
   * element and has no collection. The name is shared because the *role* is —
   * the composition's own element — not because the referent is.
   */
  root: HTMLElement;
  /**
   * Best-effort platform report. Deliberately **not** `fail(stage, error)`: a
   * feature closure created at construction cannot know which operation is
   * live, so letting it classify a failure would let a late continuation from
   * one operation settle another (§[02](02-kernel-behavior-contract.md)
   * §Failure classification). A synchronous throw inside a seam is caught and
   * classified by the kernel's driver at that seam's stage; a landing runner
   * that must fail an operation gets an attempt-scoped `fail` argument.
   */
  report(error: unknown): void;
}>;
```

**`root`'s per-tier meaning is stated rather than inferred** (CE1-10). Checkpoint E measured this vocabulary and found it thin: `realm` has one installer reader, `report` has none — it is read by the two **assemblers** — and `root` has **no reader anywhere** while denoting a different element in each tier. An unread member whose meaning silently changes across the two publications is the cheapest possible drift: nothing fails when a reader eventually assumes the wrong one. Stating it costs a sentence and is the one deliverable that disposition owed. It is **evidence against widening F-64**, not for it: two tiers agreeing on a member's _name_ and disagreeing on its _referent_ is exactly what a shared declaration must not be read as promising.

An installer runs **once**, while a concrete behavior instance is being constructed. It may create whatever private runtime it likes, capture that runtime in the callbacks it returns, and hand back a plain object of named contributions.

```ts
function installLayoutAnimation(
  options?: LayoutAnimationOptions,
): SortableInstaller {
  return (ctx) => {
    // private runtime — nobody else can name it, reach it, or type it
    const records = new Map<HTMLElement, DisplacementRecord>();
    const duration = options?.duration ?? 0;

    return {
      beforeInsertionMove: (view) => measure(records, view),
      afterInsertionMove: (view) => invertAndPlay(records, view, duration, ctx),
      retire: () => restoreAll(records),
    };
  };
}
```

**Nothing is installed while a fragment is constructed.** `installLayoutAnimation(options)` runs at the fragment's call site and returns a closure; `installYAxis` is a module-level function that has not run at all. Both levels are bound by the rule D-12 already stated, unchanged: **an installer is externally inert** — it may allocate, but it may not attach a listener, write the DOM, or acquire anything needing release. Every acquisition happens inside a kernel-owned operation lifetime (§[01](01-construction-ownership.md) §When construction itself fails).

### The schema

Public and stable (§Fragments are public, installers are opaque). Every slot is optional in a _fragment_; ~~the required ones are required of the **merged** result~~ — **the required ones are required of the first argument** (D-77), which is the merge's first fragment and the only one whose type is `SortableConfig` rather than `Partial<SortableConfig>`. The schema below is unchanged; what changed is that its required properties are now enforced by the signature instead of by three throws in `assemble()`:

```ts
type SortableConfig = Readonly<{
  /* required after the merge */
  items: () => readonly HTMLElement[]; // D-44
  onReorder: OnReorder;
  axis: AxisInstaller; // y() or xy()

  /* optional consumer functions */
  onStart?: OnStart;
  onEnd?: OnEnd; // D-62, one terminal, four arms
  onError?: OnDragError; // D-64
  handle?: ResolveHandle;
  visual?: ResolveElement;
  box?: ResolveElement; // D-43; defaults to visual
  placeholder?: PlaceholderFactory; // D-65, the callback itself

  /* optional capabilities */
  landing?: LandingInstaller;

  /* appended, never replaced */
  plugins?: readonly PluginInstaller[];

  threshold?: number;
}>;
```

**A public type's closure resolves within its own tier plus the tiers below it** (D-78). The ordinary tier closes over `sortable.js ∪ drag.js ∪ sortable/feature.js`; the kernel tier over `kernel.js ∪ drag.js` (D-68). `AxisInstaller` is re-exported from `sortable.js`, because `SortableConfig` names it and a consumer must be able to hoist an installer into a typed `const`; its own closure — `FeatureContext`, `SortableContribution`, `InsertionGeometry` and what those name — stays declared here at the middle tier. **What a tier decides is where a name is _declared_ — never what the compiler will let a consumer write, and never, on its own, what they can hoist.** An ordinary-tier consumer may author an axis installer **inline** _and_ hoist it into a `const hoistedAxis: AxisInstaller`, because the slot's own alias is published at their tier. What importing `sortable/feature.js` buys is the **lower-level named authoring vocabulary** — `FeatureContext`, `SortableContribution`, `InsertionGeometry` — for writing an installer's parts down and reusing them across a library, not the ability to construct the shape.

~~The installer aliases are **names without structure** at the _ordinary_ tier: a consumer writing only `sortable.js` can write `axis: y().axis`, cannot write `axis: (ctx) => ({ … })`, and never sees what one is.~~ **Retracted by D-78, and it was false when written.** TypeScript resolves a parameter's type structurally whether or not its alias is re-exported, so contextual typing hands a `sortable.js`-only consumer the full shape of `AxisInstaller`, `SortableContribution` and `InsertionGeometry`; the D-77 landing review reproduced it by compiling a file that imports nothing else. **The claim was a property of neither the type system nor the entry map**, and §The export topology already conceded the general form two thousand lines later — _a consumer who wants past it types one more import rather than defeating anything_ — while this section still asserted the strong one.

**The repair is not to publish the closure.** `AxisInstaller`'s transitive closure is substantially the whole of this tier, so applying _every alias it names_ transitively would publish the middle tier at the ordinary one and dissolve D-61's rung altogether. Progressive disclosure governs **discoverability and reusable authoring vocabulary**, not prohibition: the ordinary tier names what an ordinary consumer fills, the middle tier names the parts an extension author reuses, and nothing anywhere forbids a consumer from writing a structural literal the compiler already accepts.

**Every callback slot is a named type alias, and that is normative rather than stylistic (F-51).** `onEnd?: OnEnd`, never `onEnd?(result): void` and never an inline `onEnd?: (result) => void`. Two facts force it, and the compiled fixture found both:

- **method shorthand is checked bivariantly**, even under `strict`, so `onEnd?(result: ReorderTransactionResult): void` silently accepts a handler narrowed to two of the four arms. D-62's whole claim is that the **compiler** checks the consumer's exhaustiveness; under shorthand it does not check it at all;
- **the inline property form does not survive this repo.** `@typescript-eslint/method-signature-style` is configured to `method`, so `npx just lint-fix` rewrites `onEnd?: (result) => void` back into the shorthand — silently undoing the variance the contract depends on. A named alias is immune, because the rule normalises inline function-type literals and leaves type references alone.

A rule that the next `lint-fix` reverses is not a rule. The aliases are the only form that holds without a per-slot lint suppression.

**Four slots changed at Revision 2.1** and each restores an owner decision Revision 2 dropped: `onFinish`/`onCancel` collapse into one `onEnd` (D-62), `onError` receives a coarse-coded `DraggableError` instead of a `FailureStage`-bearing context (D-64), `createPlaceholder` and `placeholderClassName` collapse into `placeholder` (D-65), and `landing`'s installer no longer accepts a consumer runner (D-63). `ReorderTransactionResult` is not a new type: it is the four-arm union these documents already carry, and `SortableFinishResult`/`SortableCancelResult` were partitions of it that existed only to type two callbacks.

### The two stages, and why installers run second

```text
collect fragments        left to right, the config literal first
→ schema-aware merge     per-slot rules, below
→ derive defaults        threshold, durations, box = visual
→ invoke installers      only the ones the merged config still names
→ flatten contributions  into the direct SortableSlots record
```

**Merge semantics belong to the config slot, not to fragment provenance** (owner, §9). The slot's kind decides, and a fragment gets no say:

| Slot kind | Members | Merge |
| --- | --- | --- |
| scalar | `threshold` | last wins |
| plain consumer function | `items`, `onReorder`, `onStart`, `onEnd`, `onError`, `handle`, `visual`, `box`, `placeholder` | last wins |
| atomic capability installer | `axis`, `landing` | last wins, **as one whole slot** |
| plugin array | `plugins` | **appends**, in fragment order |

**Last-wins is safe precisely because installers are invoked after the merge completes.** A capability that loses its slot is **never constructed** — no rect index is allocated, no map exists, no entry appears in `retireHooks`, and there is nothing to retire. Ordering the two stages this way is what makes last-wins a merge rule rather than a lifecycle problem: under D-12, where the factory ran during the fold, a later feature overwriting an earlier one would have meant retiring a live contribution mid-assembly, which is exactly the state the single-writer `claim` existed to make unreachable.

**Atomicity is a schema obligation.** Runtime parts that must be acquired and retired together are **one** slot carrying **one** installer — `{ axis: installAxisCapability }` — never several independently mergeable lifecycle fields a merge could tear in half. There is deliberately no dependency resolver reassembling fields that happened to arrive from the same helper.

### Why the library merges and the consumer does not

The obvious simplification — drop the variadic form and let the consumer spread — is **rejected, and the reason is the one slot that must not last-win**:

```ts
// silently wrong
sortable(root, { ...config, ...layoutAnimation(), ...landing(), ...y() });
```

Object spread is last-wins for **every** key. `plugins` from `layoutAnimation()` is discarded by any later fragment that also carries plugins — no error, no warning, and a composition that quietly does less than it reads as doing. `plugins` must **concatenate**, and a consumer writing a spread has no way to express that. Keeping the merge inside the library is the whole of what the variadic form buys, which is also why nothing else about a fragment is special: it is an object, and it is merged by rules the schema owns.

### Provenance is not tracked, deliberately

Once the objects exist the library knows nothing about where their fields came from. A helper may return several slots and a consumer may take exactly one:

```ts
function weirdThing() {
  return { axis: installMyAxis, landing: installMyLanding };
}

sortable(root, { items, onReorder, axis: weirdThing().axis });
```

That is a supported act rather than a loophole. Lifting `.axis` out of a helper **constructs no installer** — `weirdThing()` already did, and dropping the other slot merely means one of them is never invoked — and the consumer is doing ordinary object work on an ordinary object. Presets may be spread, slots overridden and plugin arrays filtered exactly as in any Vite-style configuration. No fragment-level tag exists to remember the coupling, because remembering it would only enable the dependency resolver the owner declined to build.

### What survives from D-12

The contribution object survives as the **installer's** return value, and the three reasons it beat probe 1's `(install: SortableInstall) => void` installer object are untouched by the merge:

1. **The assembler can validate by key** — narrowed, not gone. Named capability slots can no longer collide, because the merge resolved them before anything ran. What can still collide is the **plugin array**: two plugins may each contribute the same single-writer contribution member, and `claim` survives over exactly that array, still with both offenders in hand.
2. **Metadata is a field, not a method.** It is now a field of the _config_ rather than of the contribution, which is strictly better: `threshold` is a public slot the consumer writes directly, and its default is derived after the merge.
3. **No installer object is built.** One less construction-time surface, and one less method set to keep in sync with the slot record it writes into.

**F-10.** Fragments are differently-shaped literals, so the merge's property reads are structurally polymorphic. Construction time, once per fragment, recorded only so it is not mistaken for a hot-path concern later.

### Installation order is schema order (D-57)

D-12 could say "features install in declaration order" because the feature array _was_ the composition. After a merge, fragment order survives only inside `plugins`; every named slot has lost the position it arrived in. An order is still required, because retirement runs in reverse of it (§Assembly).

**D-57 fixes it: named capability slots install in schema order, `plugins` install in array order, and `retireHooks` reverses the whole sequence.** It is deterministic, independent of how the consumer arranged its arguments, stable across a refactor that reorders them, and it reproduces the documented `[y(), layoutAnimation()]` retirement order by construction — the axis installs first and retires last.

The alternative was **first-appearance order across the merged fragments**, and it is rejected for the reason the merge exists: recovering it means recording which fragment each slot arrived from, which is exactly the provenance D-45 deleted (§Provenance is not tracked, deliberately). An ordering rule that resurrects the tracking is not a smaller change than the one that avoids it.

## The contribution

**This is what an installer returns, and it is published at the middle tier** (D-61 — it read "and it is internal" until Revision 2.1). One flat type, fixed key names, **no discriminator**. There is deliberately no `type`, `kind` or `phase` field: a discriminator invites a runtime `switch`, and the brief forbids exactly that.

```ts
type SortableContribution = Readonly<{
  /* single-writer slots */
  insertion?: InsertionGeometry;
  placeholder?: PlaceholderFactory; // D-65 — named as the config slot is
  startLanding?: LandingStart; // middle-tier public (D-61, D-63)

  /* multi-writer pipelines */
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  /** Run in **reverse** installation order — see §Assembly. */
  retire?: () => void;
}>;
```

**Three members left this type at D-45, and the rule that removed them is worth stating**: `getHandle`, `getVisual` and `callbacks` were slots whose value was already the consumer's own function, wrapped in a factory that did nothing but hand it back. A slot with nothing to install is a **config slot**, read straight off the merged record into `SortableSlots`; only a slot that must _construct_ private runtime carries an installer and therefore a contribution. `box` (D-43) joins the first group by the same rule, and is why it needs no factory of its own; the placeholder factory joins it at D-56, as `placeholder` since D-65.

**`placeholder` is the one member on both sides**, because a plugin may legitimately supply a placeholder factory. **It is spelled the same on both sides deliberately** (D-65): the config slot and the contribution slot are now read by the same audience — a middle-tier author writes the second and reads the first — and two names for one factory would be a puzzle rather than a distinction. The assembler seeds the single-writer local from `config.placeholder` **before** installing anything, so a plugin that contributes one collides with the config key through the same `claim` that catches plugin-versus-plugin — one rule, one diagnostic, and no precedence question to answer.

There is no `threshold` metadata field, for the same reason there is now no `callbacks` contribution: it is a public config slot the consumer writes directly, and its default is derived after the merge (review 4, §30; D-45). Carrying it in two places invited the question of which one wins.

### Geometry is a paired capability, not a lone read

```ts
type InsertionGeometry = Readonly<{
  resolve(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
  ): Insertion | null;
  /** "Stale." **Lazy by contract** — scroll and resize raise it constantly. */
  invalidate(): void;
  /** Optional. "Re-read **now**", in the one window that is safe to read in. */
  measure?(frame: InsertionFrameView, runtime: InsertionRuntimeView): void;
  retire(): void;
}>;
```

An earlier draft contributed only `resolveInsertion`, while the lifecycle called `rects.markDirty()` directly from behavior code at activation, at every placeholder move, on scroll/resize and at release (review 4, §1). `rects` is private to `vertical()` and reachable by nobody, so that could not compile — and omitting the calls instead would let scroll, resize, collection replacement, placeholder movement and release all search stale geometry.

Pairing the operations in one contribution means a single claim, a single diagnostic naming both offending features, and no way to install a resolver without its invalidator. The assembler **flattens the members** into direct slot fields, so the call sites stay one property read and one call: `slots.resolveInsertion(...)`, `slots.invalidateInsertion()`, `slots.measureInsertion` (nullable), and `retire` pushed into the unwind list.

> ~~The assembler **flattens** the pair into two direct slot fields~~ named a **two**-member flattening, then listed three slots, in a sentence the D-92 paragraph directly below reasons from — so a reader taking _that flattening_ to mean this sentence concluded the obligation bound `resolve` and `invalidate` and not `measure` or `retire`, which is the exact scope question D-92 exists to settle (CE4-02). The identical sentence in `sortable/feature.ts` was corrected when D-92 landed and this copy was missed; the count was independently wrong before D-92, and _pairing_ survives because it names the **claim** rule — a resolver cannot be installed without its invalidator — not the number of members lifted.

**The flattening creates an author obligation, and the obligation rather than the flattening is what binds** (D-92, as corrected by D-94). **An `InsertionGeometry`'s members are never invoked with that `InsertionGeometry` as their receiver** — the capability record the member is declared on, the object an `AxisInstaller` nests under `insertion`, not the contribution object carrying it. So an `InsertionGeometry` written as a class instance, or with any method that reads `this`, is **outside contract**; it must close over its state, exactly as `MotionConstraint` requires and as the first-party `y()`/`xy()` already do.

> ~~The flattening is not only a technique — it is a calling convention, and it binds the author~~ made the **mechanism** the promise, and ~~lifting a member off the record and calling it bare~~ contradicted the measured paragraph directly below, which records `resolve` and `invalidate` receiving the flat slot record — a member that receives the slot record is not called _bare_ (CE6-02, D-94). Both are struck for one reason: a promise about where a member is called from has to be re-derived at every refactor, and it makes Phase 21 unable to tell which transformations are permitted. **The flattening is the current mechanism and is recorded below as measured code**; the receiver negative is the guarantee. **This document said the technique and stopped one step short of the obligation the technique creates**, which is the same shape as the free-drag defect CE1-03 found: a convention the code enforces and no published declaration states. **The sortable's exposure is the larger of the two** — the assembler lifts **four** members (`resolve`, `invalidate`, the optional `measure`, and `retire`, pushed into `retireHooks` as a bare reference) against free drag's three, and `AxisInstaller` is re-exported from `sortable.js`, so the author who meets it can be an ordinary-tier consumer rather than only a middle-tier one.

**Stated and pinned, 2026-08-18.** `InsertionGeometry` carries the obligation, and `tests/sortable/calling-convention.browser.test.ts` drives each lifted member alone with a geometry that records the receiver it is handed. **The rows assert the receiver is never the nested `InsertionGeometry` the installer contributed, not that it is `undefined`** — measured rather than assumed, the sites disagree on what `this` _is_: `resolve` and `invalidate` are called off the flat slot record and receive it, `measure` and the normal `retire` receive `undefined`, and the **construction-unwind** `retire` receives the assembler's internal hook array. The obligation is what `this` is **not**, and pinning `undefined` uniformly would fail the conforming tree at three sites while pinning the flattening's current shape instead of the contract.

**Four members, five sites** (D-93, 2026-08-19). `retire` is reached from the normal retirement **and** from the unwind that runs when a later installer throws, so the enumeration counts call sites rather than members — the same correction free drag took, and for the same reason: a site the member is reached through is a site the convention has to hold at, whether or not it is the one retirement is normally driven from.

### Insertion geometry is _settled presentation geometry_

The insertion rule resolves against where items **settle**, and settled presentation geometry is defined by what it includes and what it excludes:

- it **includes** authored element and ancestor transforms, and any visual offset the consumer's own code applies — those are real, and an item the page has moved really is somewhere else;
- it **excludes** every displacement offset the library itself owns.

The distinction is not academic. The axis rule reads with `getBoundingClientRect()`, which includes a running FLIP offset, and it refreshes lazily — so with `layoutAnimation()` installed it measured items where they no longer were while measuring the placeholder where it now is. That mixed field proposes moving back: the crossed row's animating centre is nearer the pointer than the placeholder's settled one, which re-commits, which re-animates. **A feature that only animates was changing what the drag decided**, and the hysteresis this document credits with having "nothing to mistune into oscillation" was defeated by composition rather than by tuning.

The rule is enforced by _when_ the read happens, not by asking the axis to compensate for something it must not know about:

```text
beforeMove   capture each owned element where it currently looks,
             then RELEASE every offset this feature applied
placeholder  the sole writer of placeholder position
invalidate   the axis cache is marked stale
measure      ← the axis rebuilds HERE: no library offset is applied anywhere
afterMove    re-measure, invert, play
```

Three consequences worth stating, because each was a candidate design that does not work:

- **The release must cover every element the feature is offsetting, not just this move's span.** During a fast drag an element from the previous move is still mid-flight, and one element still carrying an offset is enough to corrupt the rebuild. It is released and replayed from the position captured a moment earlier, so nothing snaps — no frame is painted inside an effect.
- **`invalidate()` cannot simply become eager.** Its other callers are the scroll and resize listeners, which must not read geometry. The two wants are opposite, which is why `measure()` is a second method rather than a stronger first one.
- **This is a re-timing, not a shared read phase.** A committed move always dirties the axis and the axis always rebuilds on the next spatial frame — by which time it is mid-animation. Moving that rebuild into the bracket adds no reads at all; it only makes them land in the window where they are correct.

**Release resolves against settled geometry too**, and it is the case that matters most: release re-resolves after motion closes, typically while the last committed move's displacement is still in flight, and what it produces is not an intermediate placeholder position but the `ReorderRequest` the consumer is asked to apply. A mid-flight reading there is a wrong reorder — or, when the wrong gap happens to equal the item's own index, no `onReorder` call at all.

`release.prepare` therefore runs the `beforeMove` pipeline before it measures. That pipeline already means _the placeholder is about to move, hand back what you are holding_, and `release.effect` does move it; the gap passed is the incumbent one, which is the honest best estimate before resolution supersedes it. `afterMove` is deliberately not run — release does not animate, and the drop lands on a list at rest.

This is a **deliberate, bounded exception to "prepare performs no DOM writes"**. What it writes is the release of temporary offsets the library itself applied: it publishes nothing, changes no tree, and leaves every row at the position it was already animating towards. Release cannot discard, and a failed release retires the operation — where the feature's own `retire` would cancel those animations anyway. The side effect is exactly what teardown would have done, one moment earlier.

## Assembly (D-45, H-5)

The compiled version of the pre-Revision-2 shape is in [`packages/drag/docs/contract-probe-2/contract.ts`](../../../../packages/drag/docs/contract-probe-2/contract.ts). It predates the merge and still compiles the branded feature array; §[00](00-index.md) already governs the disagreement — **where the fixture disagrees, the fixture is the bug**.

Assembly is now two functions, and the split is the decision:

```ts
// **The first source is not a `Partial`** (D-77): required configuration is a
// required first argument, and only the later fragments are partial.
const mergeFragments = (
  config: SortableConfig,
  fragments: readonly Partial<SortableConfig>[],
): SortableConfig => {
  const merged: MutableSortableConfig = {};
  const plugins: SortableInstaller[] = [];

  for (const fragment of [config, ...fragments]) {
    if (fragment.plugins !== undefined) {
      plugins.push(...fragment.plugins); // the one appending slot
    }
    assignDefinedSchemaKeys(merged, fragment); // every other slot: last wins
  }

  merged.plugins = plugins;
  return merged as SortableConfig; // **no defaults here** — see below
};
```

**The merge applies no defaults, and the sketch used to say it did** (P18A-02). `threshold`'s default is applied in the flat slot record — `config.threshold ?? DEFAULT_THRESHOLD` in `assemble()` — which is the only place that can apply it, since the merge's own output is still the schema type rather than the record. What the merge owns is **last-wins and `plugins` concatenation**; what the assembler owns is normalization, defaults included.

**The merge iterates the schema, not the fragment's own keys.** Copying whatever a fragment happens to carry would put an unknown key into the config, where nothing reads it and nothing complains; walking a fixed key list makes a misspelled slot a diagnosable no-op rather than a silent one. The cost is a fixed-length loop, once per fragment, at construction.

```ts
const claim = <T>(
  current: T | null,
  next: T | undefined,
  label: string,
): T | null => {
  if (next === undefined) {
    return current;
  }
  if (current !== null) {
    throw new TypeError(`sortable: ${label} contributed by two plugins`);
  }
  return next;
};

function assemble(config: SortableConfig, ctx: FeatureContext): SortableSlots {
  let insertion: InsertionGeometry | null = null;
  /* … the remaining single-writer locals … */
  const beforeMove: DisplacementHook[] = [];
  const afterMove: DisplacementHook[] = [];
  const retireHooks: Disposer[] = [];

  // Config errors are diagnosed BEFORE anything is constructed, which is only
  // possible because the merge already ran (D-45).
  if (config.axis === undefined) {
    throw new TypeError('sortable: an axis — y() or xy() — is required');
  }
  if (typeof config.items !== 'function') {
    throw new TypeError('sortable: items must be a function');
  }
  if (typeof config.onReorder !== 'function') {
    throw new TypeError('sortable: onReorder must be a function');
  }

  // Named capability slots in schema order, then plugins in array order.
  const installers = [config.axis, config.landing, ...config.plugins];

  try {
    for (const install of installers) {
      if (install === undefined) {
        continue;
      }
      const c = install(ctx);

      // Cleanup is recorded FIRST, before any claim can throw.
      if (c.insertion) {
        retireHooks.push(c.insertion.retire);
      }
      if (c.retire) {
        retireHooks.push(c.retire);
      }

      insertion = claim(insertion, c.insertion, 'insertion geometry');
      /* … the remaining single-writer claims … */
      if (c.beforeInsertionMove) {
        beforeMove.push(c.beforeInsertionMove);
      }
      if (c.afterInsertionMove) {
        afterMove.push(c.afterInsertionMove);
      }
    }

    if (insertion === null) {
      throw new TypeError('sortable: the axis installed no insertion geometry');
    }
  } catch (error) {
    // §13 unwind: a later factory or validation failing must not leak an
    // earlier feature's state.
    for (let i = retireHooks.length - 1; i >= 0; i -= 1) {
      try {
        retireHooks[i]!();
      } catch (nested) {
        ctx.report(nested);
      }
    }
    throw error;
  }

  retireHooks.reverse(); // release in reverse acquisition order

  return {
    resolveInsertion: insertion.resolve, // ← lifted off the record (D-92)
    invalidateInsertion: insertion.invalidate,
    items: config.items, // the pull source (D-44)
    onReorder: config.onReorder,
    onStart: config.onStart ?? NOOP_START, // ← normalized; see below
    onEnd: config.onEnd ?? null, // D-62
    onError: config.onError ?? null,
    getVisual: config.visual ?? null,
    getBox: config.box ?? config.visual ?? null, // default: box = visual (D-43)
    threshold: config.threshold, // defaulted by the merge
    /* … the remaining optional slots, `null` when unfilled … */
    beforeMove,
    afterMove,
    retireHooks,
  };
}
```

**The contribution objects are dropped, and so is the merged config.** The assembler must not retain the fragment array, the config record, the installer array or the contribution objects. After `assemble()` returns, the only things that exist are the slot fields and the closures they hold — everything upstream of them is garbage. The config record is a construction-time value, not a live policy object: §Policy updates is unchanged by D-45, and a consumer mutating the literal it passed changes nothing.

**Two normalization rules, because "optional callback" is not one thing:**

- `onStart` is normalized to a **shared module-level no-op**, so the call site is `slots.onStart(item)` with no null check. It takes an argument the behavior already has.
- `onEnd` and `onError` stay **nullable and null-checked**, because their arguments are result objects that would otherwise be constructed only to be discarded.

**Retire hooks run in reverse installation order**, and each is wrapped individually so one throwing hook cannot stop later hooks from restoring their DOM (review 4, §12). Reverse is the natural ownership order when hooks release resources acquired in installation order — schema order, then `plugins` in array order (D-57). The kernel's outer try/catch around `spec.retire()` is a backstop, not a substitute.

**Cleanup is recorded before any claim runs, in installation order, and the list is reversed exactly once.** Two separate bugs made this ordering subtle:

- Appending the axis's `insertion.retire` _after_ the loop put it last in installation order and therefore **first** after the reverse — the opposite of the documented order for the common `[vertical(), layoutAnimation()]` composition (review 5, §10).
- Recording it _after_ the claim leaked the private state of the very contribution whose claim collided: a second axis feature had already allocated its rect index when `claim` threw, and the unwind only saw earlier contributions (review 6, §16).

Recording both hooks immediately after the installer returns fixes both. Installers are externally inert, so this is a retention and diagnostics concern rather than a DOM leak — but the stated unwind should be total, not nearly total.

**Total across construction, not merely within `assemble` (D-80 (b), F-68).** The sentence above was true of the assembler and false of the call that drives it: `copyUniqueItems` threw from inside `createSortableRuntime`, **after `assemble` had returned**, so a consumer collection containing the same element twice left every recorded hook unrun and a kernel and realm already built by `draggable()` with nothing to destroy them, `arm()` never having been reached. **Normative:** the collection is pulled, validated and copied **before the first installer runs**, and the validated copy is passed onward — so no consumer-triggerable throw remains between the first `retire` hook being recorded and the bracket that unwinds them. **The ordering is deliberate and must stay stated**, because it was previously supplied by argument-evaluation order alone (F-69): `items()` and `assemble(…)` sat as sibling arguments in one call, and only left-to-right evaluation kept a throwing `items()` from stranding every hook.

**D-45 narrows the second bullet's example without weakening the rule.** Two axis _fragments_ no longer collide — the merge picks the later one and the earlier installer is never invoked, so its rect index is never allocated. The collision that remains is inside `plugins`, where two appended installers each contribute the same single-writer member; the second has already built its private runtime when `claim` throws, and the unwind still has to reach it. A narrower trigger, the same obligation.

```ts
type SortableSlots = Readonly<{
  /* required, filled by the axis installer */
  resolveInsertion: InsertionGeometry['resolve'];
  invalidateInsertion: InsertionGeometry['invalidate'];

  /* required config slots */
  items: () => readonly HTMLElement[]; // the pull source (D-44)
  onReorder: OnReorder;
  onStart: (item: HTMLElement) => void; // normalized, never null

  /* optional; `null` when nothing filled them */
  createPlaceholder: PlaceholderFactory | null; // from `config.placeholder` (D-65)
  getHandle: ((item: HTMLElement) => HTMLElement | null) | null;
  getVisual: ((item: HTMLElement) => HTMLElement) | null;
  getBox: ((item: HTMLElement) => HTMLElement) | null; // D-43
  startLanding: LandingStart | null;
  onEnd: ((result: ReorderTransactionResult) => void) | null; // D-62
  onError: ((error: DraggableError, context: DragErrorContext) => void) | null; // D-64

  /* prebuilt pipelines, empty arrays when nothing installed */
  beforeMove: readonly DisplacementHook[];
  afterMove: readonly DisplacementHook[];
  retireHooks: readonly Disposer[];

  threshold: number;
}>;
```

~~Validation runs once and throws `TypeError`:~~ **One check runs, and it is not a config check** (D-77). The table is kept with its verdicts, because what each row is replaced by is the substance of the decision:

| Rule | Verdict under D-77 | What answers instead |
| --- | --- | --- |
| A required config slot is unfilled | **Deleted** | The first argument is `SortableConfig`, so `axis`, `items` and `onReorder` are compile errors when absent. **What happens to a JS consumer who bypasses the type differs per slot, and this row does not promise classification for any of them.** `onReorder` is the only one reached inside a seam, so it is the only one classified — see the row below. `axis` fails at construction, where the flat slot record dereferences a resolver that is not there; `items` fails at construction too, at the pull `sortable()` performs before returning. Neither is a library classification, and neither reaches `onError`: they break the consumer's own `sortable()` call with a native `TypeError`, which is what a required-config type violation is |
| `items` / `onReorder` is not a function | **Deleted** | The type says `ItemSource`/`OnReorder`, and the two slots are answered at **different** places, which the first draft of this row got wrong by naming one stage for both. `onReorder` is called inside the resolution seam, so a non-function throws there and classifies — `FAILURE_RESOLUTION` → `consumer`. **`items` is not classified at all**, and the corrected reading is deliberate rather than a concession: the _first_ pull is the construction-time one in `behavior.ts` (D-44, unchanged), it is called **unguarded**, and a non-callable source therefore breaks the consumer's own `sortable()` call with its own `TypeError` — a required-config type violation, not a library invariant. ~~`FAILURE_ADMISSION` → `consumer`~~ named a stage nothing reaches: admission reads the prebuilt `rt.snapshot` and pulls nothing, and the only in-seam pull is `action.prepare(COLLECTION)`, dispatched solely by `controller.invalidate()`. **Only a later throw from a _valid_ source** — one that is a function and raises during an `invalidate()` — is a library classification, and it lands at `FAILURE_ACTION_PREPARE` → `presentation` |
| `threshold` is out of domain | **Deleted** | Nothing. A `NaN` threshold makes the travel test permanently false, so the drag never activates and **no operation starts** — consumer-owned, and no library invariant moves |
| The axis installer contributed no insertion geometry | **Deleted, with one ordering requirement** | The `axis` slot's installer type declares a contribution whose `insertion` is **required**, so a plugin-shaped installer is not assignable. **The type is total for a TypeScript consumer; the runtime dereference exists for a JavaScript one, and it checks that the object exists rather than that it is well formed** (D-80 (a)) — an installer contributing `{ insertion: {} }` passes assembly, because `insertion` is truthy, and surfaces later at the seam that calls the resolver. That is acceptable under D-77's own rule, which is that a seam classifying a JS-authored violation is not a defect; what is not acceptable is describing the pairing as though the backstop matched the type's promise, which the deleted check never did either. The explicit check supplied only a better message (`CODE_OF_SIZE.md` §1.3). **Normative:** the flat slot record must be built **inside** the unwind bracket, so that throw still retires every installer that already ran. Moving the deref outside it would trade a diagnostic string for a leak |
| A single-writer contribution member is written twice | **Kept — the package's one construction-time throw** | Nothing else can. Two installers claiming one slot is not expressible in a signature, and the silent alternative is a writer whose geometry is discarded while its private state stays live. This is an invariant over what installers _contribute_, which is the only category D-77 leaves at runtime |

**Sortable construction-time _diagnostics_: six to one — and the count is of explicit checks, not of failures.** Five explicit checks are removed and the remaining behavior differs per slot, which is why "five throws removed" would be the wrong summary:

| Slot | After the deletion |
| --- | --- |
| `axis` | **Still fails at construction.** Deleting the check deleted its message, not the dereference underneath it: the flat slot record reads the resolver off a null geometry |
| `items` | **Still fails at construction**, but nowhere near the assembler — at the pull `sortable()` performs before returning (D-44). The assembler carries the value through untouched |
| `onReorder` | **No construction failure at all.** Carried through, reached at the resolution seam, classified there |
| `threshold` | **No failure ever.** Defaulted by the **assembler** — `config.threshold ?? DEFAULT_THRESHOLD` in the flat slot record, not by the merge (P18A-02) — and never judged |

~~Two of the three checks moved earlier, which is the merge paying for itself.~~ The merge no longer pays for validation at all — it pays for `plugins` concatenation, which is the one thing consumer spread syntax cannot express. **Four runtime throws remain outside construction, and the enumeration was partial** (P18A-11). Two are consumer **scalar or collection** domains: `copyUniqueItems` — a collection containing one element twice breaks index arithmetic and identity reconciliation, library-owned and not type-expressible — and the landing duration, narrowed to `=== Infinity` ([07](07-free-drag-contract.md) §Validation, measured). Two are **placement preconditions** in `src/sortable/placement.ts`: a placeholder factory returning an element that is attached, or is the item or its visual, thrown inside `activation.prepare` and classified `FAILURE_ACTIVATION`; and an insertion anchor that is not in the placeholder's container, thrown inside the committed-move bracket. All four are classified rather than thrown at the consumer's call — **except `copyUniqueItems`'s construction-time position** (D-80 (b)): the initial pull is validated at the construction boundary, so _that_ call does throw at the consumer's `sortable()`, while its in-seam call during `invalidate()` classifies as before.

## Hot-path shape

```ts
// permitted — a direct field read and call
const resolved = slots.resolveInsertion(draft, rt.view);

// permitted — a prebuilt, usually empty, fixed array, never on the move path
for (let i = 0; i < slots.beforeMove.length; i += 1) {
  slots.beforeMove[i]!(view);
}

// forbidden
for (const plugin of config.plugins) {
  plugin.onEvent(event);
}
config.plugins.filter((p) => p.type === 'geometry');
```

Nothing survives assembly to iterate: the config, the installers and the contributions are all released (§Assembly). The prohibition is on _reintroducing_ them — a retained plugin array read per event is the runtime descriptor interpretation the brief forbids, and D-45's merge does not make it any more acceptable for happening over a public schema.

The pipelines are arrays because more than one feature may legitimately occupy them. They are fixed-length after assembly, empty in the minimal composition, and are touched only around a committed placeholder move — never per pointer move.

## Consumer-declared views, not producer projections (D-13)

Probe 1 typed feature seams as `Pick<SortableRuntime, 'current' | 'realm' | …>`. That works, but it points the dependency the wrong way: `vertical.ts` has to import the behavior's aggregate runtime type in order to describe what it needs.

Probe 2 inverts it. **A feature declares a minimal structural type in its own module.** The behavior's runtime happens to satisfy it. Same physical object, no allocation, no import edge from feature to behavior runtime, and the feature is independently typeable and independently unit-testable against a literal.

**Frame state and runtime state are separate arguments**, because they have separate owners and separate lifetimes:

```ts
// y.ts — imports no runtime type from the behavior
type InsertionFrameView = Readonly<{
  insertion: Insertion | null;
  pointerY: number;
}>;

type InsertionRuntimeView = Readonly<{
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
}>;

// on InsertionGeometry
resolve(frame: InsertionFrameView, runtime: InsertionRuntimeView): Insertion | null;
```

```ts
// layout-animation.ts
type DisplacementView = Readonly<{
  realm: DOMRealm;
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
}>;
```

An earlier draft declared a single `InsertionView` carrying a `current` frame property, and claimed one stable per-controller object satisfied every view with no materialization. **That was not constructible** (review 4, §2). The kernel owns the swappable `current`/`draft` references exclusively and hands frames out only as arguments, so nothing the behavior holds can expose an up-to-date `current` property — not without stashing a kernel frame reference, mutating an adapter per call, or allocating a view per call, each of which contradicts a stated property. It also duplicated `pointerY` as both a view field and a separate parameter, and `action.prepare` receives `draft`, not `current`, so the sketch's `current.pointerY` read was wrong on its own terms.

Passing the two separately costs nothing and is honest about both:

- **The frame argument is the frame the kernel already handed the seam.** `Draft<Part>` and `Readonly<Frame<Part>>` both satisfy `InsertionFrameView` structurally, with no wrapper. A `prepare` passes its `draft`; nothing has to reach for `current`.
- **The runtime argument is one small `PresentationView` per operation**, created in `activation.effect` and cleared at retire. It exists because both feature views need a **non-null** `placeholder`, which a controller-lifetime runtime cannot promise before activation. Its `snapshot` is rewritten by `action.effect(COLLECTION)`. Two writes per operation, none per call, and no feature has to guard a null it can never see.

**Both views were widened during implementation, for the same reason.** The sketches above are the shapes the design started from; each was one field short of expressing the rule stated for it in this document. Both are behavior-internal and unstable by the boundary this document draws, so neither is a kernel-SPI change:

| View | Added | Why the sketch could not work |
| --- | --- | --- |
| `InsertionFrameView` | `item: HTMLElement \| null` | The destination view is the collection _minus_ the dragged item, and an axis rule that cannot exclude it measures a lifted element whose centre tracks the pointer — so it wins every search and pins the gap to its own slot. Read off the frame, where the item already is committed state, rather than copied onto the runtime view where it could drift. |
| `DisplacementView` | `insertion: Insertion`, `item: HTMLElement` | `insertion` is M-4's answer made expressible: without the destination gap a displacement feature cannot know which elements a move affects until after the write, so it must measure the whole destination view twice. `item` is ownership: membership in `snapshot` cannot exclude the dragged item, because the dragged item _is_ a member, and nothing else identifies it. |
| `InsertionRuntimeView` | ~~`getVisual`~~ → `getBox: ((item: HTMLElement) => HTMLElement) \| null` | Parity D2 added it as `getVisual`; **D-58 re-points it at `box`** and the field is renamed rather than joined — the axis rule measures candidate **boxes**, and never needs the visual. Still nullable rather than normalized to identity, so the minimal composition pays no identity call per candidate per rebuild. |
| `InsertionRuntimeView` | `live: () => boolean` | I-36, **re-grounded on D-37**. The candidate loop invokes `visual()`'s resolver once per candidate; that is a **declared consumer slot**, so it is one of the three acts D-37's finite domain still prohibits after logical closure. The loop is feature-private (D-19, H-4) and cannot reach the behavior's runtime, so the reading has to arrive as data. **Under D-38 the reading is the logical latch and nothing else** — `KernelHost`'s liveness member (D-53), never `presentation.signal.aborted`, which lags logical closure once teardown defers to the transaction boundary (D-36). |

**The per-operation view is the designated channel for per-operation behavior guarantees, and four widenings is enough to say so as a rule.** `InsertionFrameView` and `InsertionRuntimeView` have between them been widened additively four times — Phase 8a `item`, Phase 17 `pointerX`, Checkpoint D `getVisual` (re-pointed at `getBox` by D-58, which is a substitution and not a fifth widening), C2-01 `live` — and in **every** case the behavior's existing per-operation object satisfied the new field structurally, with no wrapper, no per-operation or per-call allocation, and **no import edge appearing from a feature module back to the behavior's runtime**. D-13's mechanism is therefore not merely reusable, it is the default answer: a fifth widening is a routine act rather than a re-litigation of D-13. What the four data points do _not_ license is treating the views as fixed — they are a growing structural contract, and a widening still has to justify its own field.

No view materialization on any path, no `Pick<>` anywhere, and no import edge from a feature to the behavior's runtime type. This is what makes H-6 work at the _runtime_ level, the same way §[04](04-frame-slicing.md) makes it work at the frame level.

## Private feature state, and what it answers

Probe 1's open question **Q-5** asked whether the packed geometry cache belongs on the shared runtime — where retirement can empty it uniformly, at the cost of leaking an axis-specific concept into a shared container — or inside `vertical()`, which would require a feature-owned retirement hook.

Under H-4 the question does not arise. The axis feature owns `rects`; the `retire` contribution is how it gets emptied; and no shared container exists to leak into. The cost is exactly one entry in `slots.retireHooks`.

| Feature | Private runtime | Escapes via |
| --- | --- | --- |
| `y()`, `xy()` | packed `Float64Array` rect index (stride 6) + parallel element array + dirty flag + last-seen collection version. The index _module_ is shared; each axis feature instance holds its own | `invalidate` marks it dirty; `retire` empties the element array and marks dirty |
| `layoutAnimation()` | `Map<HTMLElement, DisplacementRecord>` | `retire` restores every touched element exactly once |
| `landing()` | timing options and the WAAPI animation. ~~or the custom runner's handle~~ — **the consumer runner is removed (D-63)**; at the ordinary tier the handle is always the library's own | the `LandingHandle.destroy()` the kernel already holds |
| ~~`placeholder()`~~ | ~~the factory and the class/attribute policy~~ — **deleted (D-56)**; both are config keys, and the class list is split once at construction by the behavior rather than held by a feature | — |
| `handle`, `visual`, `box`, `placeholder`, the callbacks | **no installer at all** — the consumer's own values, carried as config keys (D-45, D-56, D-65) | — |

Nothing here is reachable from the behavior, the kernel, or another feature.

## Feature-owned frame state — reserved, not implemented (D-10)

Everything above is _non-transactional_ private state. `SortableContribution` has no member for frame fields, and the kernel has no fold for them: it composes each frame from exactly two sources, its own literal and the behavior's part (§[04](04-frame-slicing.md) §Composition). **A feature cannot contribute transactional state in the first iteration.**

That is a narrowing, not a prohibition on principle. D-10 originally forbade feature frame parts on the grounds that they would force an aggregate type and break the hidden-class guarantee; both were wrong. The reason none exists is simpler: a frame field is committed state, so only a `prepare` may write it — and both pipelines here (`beforeInsertionMove`, `afterInsertionMove`) run in `action.effect`, post-commit. Admitting feature frame state would mean designing a prepare-phase pipeline as well. Neither is built, because no feature needs either, and building them anyway is the speculative generality the brief forbids.

## First-iteration features

**Advanced to Phase 17 (D7, Checkpoint D).** This section had been left at the pre-Phase-17 vocabulary while §The export topology this requires was amended, so the document gave two executable readings of the same surface. It now names what ships.

**Begun at Checkpoint D review 2 (C2-04), completed at Checkpoint D review 3 (C3-02).** C2-04's rule is the one below and is unchanged; it was simply not applied to every site, and the third review found the remainder — D-34 in 00, eight sites in 02 (`rollback`, tier-C vacuity, the `Activation` default, the seam table heading, hit testing, the landing origin, the action-tag count, the failure-stage list), the M-3 baseline sentence in this document, and four the review itself missed in 05 (I-17 and its note, the Q-4 tag count, Q-7's duplicate-read problem). D7's close said the remaining Part I `vertical()` prose was provenance, which does not hold for documents 00 ranks **normative in precedence order** (00–04): a current declaration, a consumer-facing example and a feature-state table are not provenance, whatever the resolution document calls them. Every _current_ statement in 00–04 now names `y()`/`xy()`. What remains spelled `vertical()` in this document is exclusively narrative about an **earlier draft or an earlier probe**, and each such use carries its own frame in the sentence containing it — "an earlier draft" (§Geometry is a paired contribution), "review 5, §10" (§Retirement order), "probe 1 typed feature seams" and "probe 1's open question Q-5" (§Consumer-declared views, §Where the cache lives), and the rename record below. Nothing outside those frames uses the old name. The review files and `plan.md` remain provenance and are untouched.

**Retyped by D-45, and halved by D-56.** All eight returned `SortableFeature`. Four of them named no installer — their bodies were `{ handle: resolve }`, `{ visual: resolve }`, `{ createPlaceholder, placeholderClassName }` and `{ ...options }`, identity wrappers over slots a consumer can write more clearly by hand — so **they are deleted, along with their subpaths.** A subpath carrying no runtime machinery measures nothing, which voids the stated reason it exists (§The export topology this requires). The surviving fragment factories are exactly the four that install something:

```ts
type Fragment<K extends keyof SortableConfig> = Pick<SortableConfig, K>;

// D-77: the two required-slot factories return the installer itself.
y(): SortableInstaller; // written `axis: y()` in the first argument
xy(): SortableInstaller; // written `axis: xy()`
landing(options?: LandingOptions): Fragment<'landing'>;
layoutAnimation(options?: LayoutAnimationOptions): Fragment<'plugins'>;
```

**Two of the four stop being fragments, and the split is not arbitrary** (D-77). A fragment's whole purpose is to occupy an argument position and be merged by slot; `axis` is required, so it has no argument position left — it is named in the first argument or the call does not compile. Keeping the `Pick<'axis'>` wrapper would have made the natural spelling `axis: y()` a **type error** whose fix is a spread (`{ items, onReorder, ...y() }`), which is a worse call site defended only by uniformity, and it would keep packing a one-key object for `mergeFragments` to immediately unpack (`CODE_OF_SIZE.md` §9). `landing()` and `layoutAnimation()` fill optional slots, keep their argument position, and are unchanged. **The resulting rule is legible rather than incidental: a required capability is a value, an optional one is a fragment.**

The four that go become plain config keys, written directly in the config object:

| Deleted factory | Written instead |
| --- | --- |
| `callbacks({ onReorder, threshold, … })` | `{ onReorder, threshold, onStart, onEnd, onError }` (D-62) |
| `handle(fn)` | `{ handle: fn }` |
| `visual(fn)` | `{ visual: fn }` (and `{ box: fn }`, which never had a factory) |
| `placeholder({ create, className })` | `{ placeholder: fn }` — **one callback slot** (D-65) |

**Validation is not lost — it moves and widens.** `callbacks()`'s construction-time obligations were the only reason it was more than ceremony: `onReorder` must exist and be a function, `threshold` must be in domain. Both move to the merge, beside D-45's missing-axis check, and they now fire for a config supplied **any way at all** — spread from a preset, assembled by a helper, or written inline — rather than only for one that happened to go through the factory. A check on the merged result is strictly stronger than a check on one argument to it.

~~**`placeholder()` carried two options and both survive, as two flat keys.**~~ **One option survives: the factory, under the name `placeholder` (D-65).** `PlaceholderOptions` was `{ create, className }`; `create` becomes the `placeholder` slot and `className` is deleted.

- ~~**`className` is not dead weight.** It is the only way to keep the default element and still brand it; the source says so where it is implemented — _"a custom element from `create` may arrive with classes of its own, and this feature customises rather than replaces"_. Dropping it would push a consumer who wants one class onto writing a whole factory, which is the ceremony D-56 exists to remove, reintroduced one step down.~~ **Overruled by the owner (D-65), and the objection was correct about the cost.** That consumer does now write a factory. What the argument understated is the alternative it was competing with: the default element carries `data-drag-placeholder`, so a stylesheet can brand it with no config key at all, and `className` served only the consumer who needs a _dynamically chosen_ class on the _default_ element. That is a narrower population than "wants one class".
- **Flat, not nested**, because §The contribution's rule is _one flat type, fixed key names, no discriminator_, and `SortableConfig` inherits it. **D-65 satisfies that rule more directly than the two-key form did**: one slot, one value, merged by the same last-wins rule as `handle`, `visual` and `box`, with no pair that could be torn in half and no nested exception to the schema.

Neither key installs anything, which is why neither is a capability slot: the class list is split once at construction — `classList.add` rejects an empty token and a token containing whitespace — and applied by the behavior to whatever element it ends up with.

**`handle` carries an accessibility obligation it did not carry before** (D-46), and it carries it as a config key now. Scoping the drag to a grip resolves most of probe E's input-policy failures, but it is **not** the accessibility answer: it removes keyboard reordering unless the consumer makes the grip focusable, which is a stated consumer obligation rather than a nicety. The admission policy itself — the interactive/editable decline rule, `isComposing`, the modifier for plain-text selection — is 02's and 05's to state; this section records only that the `handle` slot is where a consumer meets it.

**An axis is required. `y()` and `xy()` are no longer an error together** (D-45). They fill the same slot, the merge is last-wins, and the later one simply wins:

```ts
sortable(root, { items, onReorder, axis: y() }, { axis: xy() }); // xy() wins, installYAxis never runs
```

The earlier installer is **never invoked**, so nothing was constructed and nothing has to be retired; this is the general last-wins property (§The two stages) rather than an axis-specific rule. What is retracted is only the single-writer collision the assembler used to report for this pair. **Last-wins is unchanged by D-77** — a later `Partial` fragment may still carry `axis` and still wins — but the two-factory call now has to say so explicitly, because the first argument names the slot once and an object literal cannot name it twice.

~~**Open: can the missing case also be a compile error?** A variadic tuple-merge type could compute the merged slot set for the common literal call — `sortable(root, {…}, y())` — and reject the call that names no axis. Two things bound it: it degrades to the runtime check under a spread (`sortable(root, ...fragments)` has no tuple to fold), and a `Partial<SortableConfig>` variable erases the literal's key set. So the type-level form is an ergonomic improvement for the common shape, never a replacement: **the runtime check stays regardless**, and any such type must be judged on whether its error message beats the `TypeError`.~~ **Closed by D-77, and the reasoning above is why it took a second look.** Both bounds are correct **for the candidate this paragraph examined** — a type that folds the argument tuple — and the second is worse than stated: a `Partial<SortableConfig>` variable does not merely erase the key set, it makes the fold report _success_, so the check would pass in precisely the case it exists to catch. **A required first parameter has neither failure.** It folds nothing, so a spread of the remaining arguments changes nothing; and a `Partial<SortableConfig>` value is not assignable to it, so the erasure that defeated the fold is a compile error instead. The question was answered _no_ because one candidate failed, and a second candidate was never put beside it.

### `y()` — the one-dimensional axis rule

One of two modules containing axis geometry, the other being `xy()`. A future `x()` is a sibling, never a branch inside either.

```text
candidates := centres of every non-dragged item's box, plus the placeholder's own centre
nearest    := the candidate whose centre is closest to the pointer on the Y axis
if nearest is the placeholder  -> keep the current insertion (no change)
else  gap := follows(placeholder, nearest) ? slot + 1 : slot
```

**Amended at Checkpoint D (parity D2), then re-pointed by D-58.** An earlier reading of this rule said "centres of every non-dragged item", and the implementation measured items. The candidate is a resolved node rather than the item, it reaches the axis rule as a nullable field on the per-operation runtime view — the same consumer-declared-view mechanism (D-13) that carries `placeholder` — and no axis module imports a sibling feature to get it. All of that is unchanged. **Which node it resolves to is what D-58 supersedes: it is `box(item)`, not `visual(item)`.**

**D2's own coherence argument is what selects `box`.** It read: "the incumbent every candidate is compared against is the placeholder, and `placement.ts` sizes the placeholder from the _visual's_ offset box, so measuring items on one side of that comparison and a visual-derived box on the other biases the hysteresis." The argument is right and it was applied to the only node that existed at the time. D-43 then made the placeholder's footprint `boxPre − boxPost` — the flow the **box** gave up — so the same argument, run again, now points at `box`. In api-1's case A the two differ by **30 px** on a 60 px visual: the incumbent placeholder would be measured one way and every challenger another, which is a hysteresis defect rather than a rounding one.

**Which node is which:**

| Measurement | Node | Why |
| --- | --- | --- |
| **candidate centres** — every non-dragged item, per rebuild | `box(item)` (D-58) | insertion is a geometry question, and `box` is the geometry source (D-43) |
| **removed footprint** — the placeholder's size, once per operation | `box(item)`, in two windows | D-43; only the box's own flow contribution can be measured leaving flow |
| **the lifted node** — transform-written every frame | `visual(item)` | `visual` is defined as the node faithfully lifted, and nothing else reads it |

Under the default `box === visual` nothing changes, so this costs the common case nothing and makes the uncommon case coherent. What it does change is the resolver the candidate loop calls per candidate — `box`'s, not `visual`'s — which is the same slot for every composition that configures neither or configures only `visual`.

**A closed controller stops the traversal** (I-36, C2-01 · C4-01). The loop is a behavior-driven sequence over consumer code, and the kernel's own barriers sit outside it. On the first reading of a closed controller the rebuild **calls nothing further** and leaves the cache in the **retired** state teardown already put it in — empty, dirty, unmeasured — rather than marking a half-filled index clean, which would pin every row of a destroyed controller against I-20. The same applies to `handle()` during admission, where the sequence declines instead: see §[05](05-lifecycle-invariants.md) I-36.

The call it must not make is the configured `box` resolver — a **declared consumer slot**, and therefore one of the three acts D-37's finite liveness domain still prohibits. The reading is the **logical latch itself** — `KernelHost`'s liveness member (D-53), which the behavior holds and forwards as `InsertionRuntimeView.live` (D-13's fourth widening). It is **not** `presentation.signal.aborted`: under D-36's deferred teardown that signal lags the logical close it would be standing in for, and D-38 forbids any physical-teardown observation from answering a liveness question (I-37). D-53 exists so the sanctioned reading is a member rather than a convention, and it is the only one.

**The ceiling is withdrawn (D-37).** This paragraph used to read: ~~"the rebuild calls nothing further, **reads no further geometry**, … **This paragraph is a ceiling in I-36 (3)'s register**: the candidate loop promises more than I-36's floor — no geometry read at all, not merely no consequence — and that promise is enforceable here and is pinned by the per-axis geometry rows in `tests/COVERAGE.md`."~~ It was one of the two named sites the register's **ceiling** section held, and D-37 retires the register along with the whole-program reach/stretch proof domain: the quantifier it discharged ranged over every overridable member of every consumer-owned node, which 05 itself admits cannot be enumerated. **The floor survives verbatim and is what this loop now promises** — on the first closed reading the rebuild stops and invokes no declared consumer slot. D-51's relinquishing exception does not reach here: its closed list has one member, `LandingHandle.destroy()`, and a candidate resolver releases nothing the library is holding. A `getBoundingClientRect()` on a consumer-owned node that the kernel is about to stop rendering is a conforming residue, not a defect.

**Two things retracted with it**, both of which existed only to make the stronger promise true. The reasoning is kept, because it is the best record of how far the old quantifier reached:

1. ~~**The complete set of calls that can cause the abort**: (1) **entry**, before the first candidate — a `beforeMove` hook runs immediately before `release.prepare` resolves, so a rebuild can be entered on a controller a hook already destroyed; (2) the **`visual()` resolver**, once per candidate; (3) the candidate's own **`getBoundingClientRect()`**, once per candidate — the candidate is the consumer's element, and with no `visual()` composed it is also its own visual, so this reaches a composition that installs no resolver at all.~~ Item 3 is a geometry read on a consumer node, not a declared-slot invocation, and it is outside D-37's domain. Items 1 and 2 are the same act — the resolver — reached at two moments, and one reading covers both, which is the entry reading the loop already takes.
2. ~~**The C3-01 return channel**: both axes measure the **placeholder** — the incumbent candidate — _before_ the scan, and the placeholder is consumer-owned, so an overridden `getBoundingClientRect()` on it is a consumer call the abort must also prevent. `RectIndex.refresh` therefore returns `boolean` rather than `void`, and each axis has a `false` branch that returns `null` **before** the placeholder read. `xy()` carries a second reading of its own, after that read and before `compareDocumentPosition` on the same element.~~ Both are overridable platform members on a consumer-owned node, and neither is a declared slot, an admission or a publication. Under D-37 they are conforming residue and the channel that exists to prevent them is unnecessary — **which is a licence to remove it, not an obligation**: I-36's narrowing "licenses removing no landed reading", so whether `refresh` keeps its `boolean` is an implementation call weighed on cost, and the ±20 B it was measured at is inside brotli's noise band either way.

**What this does not touch.** The kernel's own `queue.closed` boundary guards are a different category and are unaffected (owner, §2). Nor does anything here relax the retired-cache rule in the first paragraph: leaving a half-filled index marked clean would publish state that outlives the operation, which is act 1 of the floor.

The placeholder being a candidate _is_ the hysteresis: a new gap is proposed only once another item's centre is genuinely closer than the placeholder's own slot. No dead band, no direction latch, no tunable — which is why the rule cannot be mistuned into oscillation. The current insertion stays authoritative until a genuinely better one is selected; a frame resolving to `null` commits nothing.

The rect index is marked dirty through `invalidate()` — called by the behavior at activation, on scroll and resize, after a committed placeholder move, on collection publication, and at release — and independently when the snapshot's version moves. A refresh rebuilds only when one of those holds, so a frame's search is one scalar scan.

**`invalidate()` is the whole reason geometry is a paired capability.** The behavior owns the events that make geometry stale; the feature owns the cache. Neither can do the other's half.

### `xy()` — the two-dimensional axis rule

Added at Phase 17, on its own subpath, as a **sibling** of `y()` rather than as a parameter of it. Same shape, same paired-capability contract, same `visual()`-measured candidate set, same placeholder-as-incumbent hysteresis; the metric is the difference:

```text
candidates := centres of every non-dragged item's box, plus the placeholder's own centre
nearest    := the candidate whose centre is closest to the pointer by squared Euclidean distance
if nearest is the placeholder  -> keep the current insertion (no change)
else  gap := follows(placeholder, nearest) ? slot + 1 : slot
```

`xy()` consumes `pointerX` as well as `pointerY` — the **second** additive widening of the consumer-declared frame view (D-13/D-20), after Phase 8a added `item`. Two data points, so the honest reading is that the view is a growing structural contract rather than a fixed one.

**`y()` is not `xy()` with an axis switched off**, which is why the sibling shape is the one that ships. In a single-column list, carrying the pointer horizontally outside the column grows every candidate's X term by the same amount, and the squared sum lets that shared term swamp the Y ordering near a boundary. The two rules disagree on real input, so the split is a capability difference. Packaging follows: an unrestricted 2-D default would live in the behavior core and could not be tree-shaken, so every list consumer would carry the 2-D metric plus a narrowing feature on top of it; a single parameterized axis feature fails the same rule ~120 B more cheaply and in the same direction. Two subpaths keep each composition paying for its own rule, and the packaging test asserts the absence in both directions.

The rect index is shared (`rect-index.ts`, dimension-neutral — it already packed both centres) and each rule holds one privately. That costs the list composition 60 B and is recorded rather than absorbed: two copies of a cache that must stay in step is a class of divergence that is a silent correctness bug rather than a style one.

### The consumer callbacks — config keys, not a fragment

**`callbacks()` is deleted (D-56).** These five slots are written in the config object:

```ts
sortable(
  root,
  {
    items,
    onReorder, // required
    onStart, // (item: HTMLElement) => void
    onEnd, // (result: ReorderTransactionResult) => void   — D-62
    onError, // (error: DraggableError, context: DragErrorContext) => void — D-64
    threshold, // number
  },
  y(),
);
```

**One terminal callback, not two (D-62).** `onFinish` and `onCancel` are deleted and `onEnd` takes the whole `ReorderTransactionResult` union — the same four arms `accepted`, `noop`, `rejected`, `canceled` that D-24 made exhaustive and discriminated. `SortableFinishResult` and `SortableCancelResult` go with the callbacks: they are `Accepted | Noop` and `Rejected | Canceled`, partitions that existed for no reason except that there were two signatures to type.

**That deletes F-37 rather than renaming it.** F-37 is _"`finalized` used a binary accepted-vs-everything predicate, sending the no-op result to `onCancel`"_ — and a predicate is only needed because a four-arm result has to be routed to two callbacks. With one callback there is no predicate, no routing, and nothing for a future refactor to get wrong in the same way; the exhaustive switch D-24 built moves from the library to the consumer, where it is `switch (result.type)` and the compiler checks it.

**The terminal is one channel; `onError` is the other, and they are orthogonal** (D-60). One operation may publish both. **The case where it publishes `onError` and _no_ terminal is unresolved** — 00 §The unresolved arm, Q-14.

**`SortableCallbacks` goes with the factory.** It existed to type one function's argument; there is no such function, and the slots are declared once in `SortableConfig`. Re-exporting a `Pick<>` alias beside it would put a second name for the same slots under the versioning promise — the same reason §The export topology declines to name the fragment return types. `OnReorder` survives, because `SortableConfig.onReorder` is a function of it.

**The error the consumer receives is coarse (D-64).**

```ts
class DraggableError extends Error {
  readonly code: DraggableErrorCode;
  // `cause` is the native ES2022 property; no re-declaration.
}

type DraggableErrorCode =
  | 'consumer' // the consumer's own code threw or misbehaved
  | 'interaction' // the interaction could not proceed
  | 'presentation' // a library presentation act failed
  | 'platform'; // the platform refused something

type DragErrorContext = Readonly<{
  domain: ReorderTransactionResult | null;
}>;
```

The names are **not frozen** — review 3 §12 says so — but the axis is: a code names an **actionable fault class**, never an internal pipeline seam. The 13 `FAILURE_*` constants and `FailureStage` are not deleted; they leave the ordinary tier (§The public/internal boundary) and a **total** stage → code mapping becomes a library obligation. It must be total in the type, not by convention: a stage with no mapping is a stage whose consumer-visible code is decided by whichever `default:` arm the implementation happens to have.

`DragErrorContext` keeps `domain` and loses `stage`. **The two-argument shape survives on the reasoning that first placed it** (§The export topology, `DragErrorContext` ships from `sortable.js`): `domain` is a _sortable_ result, and `DraggableError` is behavior-agnostic vocabulary on `drag.js`. Putting `domain` on the error class would make the shared entry declare a behavior's result union — the exact inversion that entry exists to prevent. The owner's sketch shows `onError(error)` with one argument; that form is available and costs the consumer the domain result, which is why it is not taken.

**`readinessTimeout` is deleted (D-41).** It bounded the acknowledgement window of a readiness gate that no longer exists; with the commit serial there is nothing to time out, because `onReorder` does not return until the consumer's own commit has. A consumer that needs its own bound writes it around its own await, where it can also say what to do when it expires. Its entry in §Public option domains goes with it.

These are one coherent consumer surface and they are ordinary config slots: grouping them bought no tree-shaking — a `null` check on an unfilled callback costs nothing — and no protection, since last-wins applies per callback exactly as it does per scalar.

Acceptance is never inferred: not from callback silence, not from DOM mutation, not from collection order, not from elapsed time, not from React eventually rendering something.

```ts
type OnReorder = (
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => MaybePromise<ReorderResolution>;

declare const ReorderResolution: Readonly<{
  accept(): AcceptedReorderResolution;
  reject(reason?: unknown): RejectedReorderResolution;
}>;
```

**`ResolutionOptions` is deleted, not amended** (D-41). Both factories lose their options argument, because the only option was `{ presentation: true }` and there is nothing left to declare: the commit is serial, so `onReorder` has already returned by the time the library measures.

```ts
type SortableController = Readonly<{
  /**
   * The committed external presentation or data may have changed. Payload-free
   * (D-44): the current collection is pulled from the config's `items()`, and
   * **array identity decides** whether this is a structural change or only a
   * geometry one — see §The collection model.
   */
  invalidate(): void;
  cancel(reason?: unknown): void;
  /** Logically closes immediately; the promise settles after physical teardown (D-36). */
  destroy(): Promise<void>;
}>;
```

Three members changed at once, and only one of them is this section's own decision: `updateItems` is replaced by `items()` + `invalidate()` (D-44, §The collection model), `ready` is deleted with the readiness protocol (D-41), and `destroy` returns a promise (D-36, §[01](01-construction-ownership.md) §Teardown).

#### The readiness protocol is deleted, and the obligation moved rather than vanished

The reasoning is kept because it is the best record of why per-operation identity on a controller method is hard, and D-47's kernel surface will meet the problem again.

~~**The resolution declares; the controller acknowledges** (D-33). `ReorderResolution.accept({ presentation: true })`, then `controller.ready(request)`, compared by object identity against the request the behavior published. The previous shape took a `presentationReady` promise, which meant the consumer had to construct a promise before knowing a render would happen, supersede a previous one without dropping it, resolve it from a layout effect and never lose one — four obligations whose only failure signals were a 500 ms silence and, for a gate never held, nothing at all (probe [13b](../probes/13b-settlement.md); 02 §The authored-presentation protocol). Obligations 1 and 2 are gone, and 3 is irreducible. **No settlement machinery crosses this boundary**: the request is per-operation, public, and — decisively — in the consumer's hand **before** the render it acknowledges, because it is the argument to the callback that asked for that render. An acknowledgement capability minted later than the mutation it acknowledges cannot survive a synchronous commit. **Nothing is awaited**: `settlement.effect` returns `void` and the two gates hold independently, so the consumer's render overlaps the landing animation instead of serializing ahead of it.~~

~~**`{ presentation: true }` is a consumer obligation, and it is opt-in.** Absent or `false` asserts the authored DOM is already final. The library cannot detect a consumer that renders anyway; what it can detect is the adjacent mistake — `controller.ready(request)` for an operation that declared nothing is reported as contradictory and dropped. The rule of thumb: **if `onReorder` calls `setState`, declare a presentation.**~~

**What deletes it is the serial order** (D-41): _release → freeze proposal → `onReorder` → authored commit → consumer resolution → restore library presentation invariants → authoritative landing measurement → landing → terminal_. D-33 existed to let the resolution return **before** the render and be acknowledged after. The serial order removes that window by not returning until the render is done, so the hold has no producer, the identity comparison has nothing to compare, and the four-row invalid-acknowledgement matrix has no invalid rows.

**Two honest costs, neither of which the deletion hides.**

- **The consumer's obligation moved; it did not disappear.** A framework-controlled consumer still has to know when its commit landed, and now awaits it inside `onReorder`. The `createCommitTracker` shape — create, supersede, never drop — therefore comes _back_, as integration code owned by the consumer rather than as a drag protocol. That is the trade D-41 states in its own words: a framework commit barrier is integration code. What the library stops doing is inventing a second, drag-specific way to express the same wait.
- **The overlap is gone.** Two independent gates let the authored render and the landing animation run at the same time; a serial order does not. D-41 accepts that, and probe C1 is why it is not a regression worth defending — the provisional landing target the overlap required was stale in **all five** commit strategies, so what the overlap actually bought was a measurement taken against DOM that was about to change.

The React reference integration is an `async` callback and no library-specific state:

```tsx
const onReorder = async (request) => {
  const committed = commitBarrier(); // consumer's own, framework-specific
  setOrder(reorder(request));
  await committed;
  return ReorderResolution.accept();
};
```

Acceptance is still never inferred from the render: it is the returned resolution, and only that. Phase 15 implements this and moves `sortable.stories.tsx` and `tests/sortable/react.browser.test.ts` with it.

### `placeholder()`

**The feature is gone; the customisation is not** (D-56). The behavior always creates a placeholder, and what `placeholder()` did was customise it — a fact its name always under-communicated, an inherited wart from probe 1 that used to be defended on the grounds that `placeholderStyle()` read worse at the call site. ~~Two flat config keys settle the naming problem by dissolving it: `createPlaceholder` replaces the element, `placeholderClassName` brands whichever element is used.~~ **One config key does (D-65):**

```ts
placeholder(context): HTMLElement;
```

> The callback returns a **fresh detached element**. Once adopted, the library owns it for the operation.

`createPlaceholder` and `placeholderClassName` are both deleted. The slot is the callback, not a record with a `create` member and not a pair of keys — which is the shape `handle`, `visual` and `box` already have, and the shape review 3 §4 spells out negatively as well as positively.

**The cost is a real one and it lands on the case that was expected to be common.** `placeholderClassName` was the only way to keep the library's default element and still brand it; without it, a consumer who wants the default plus one class of their own supplies a whole factory. Three lines instead of one. D-56 argued for keeping the key on exactly that ground, the owner overruled it, and the trade is two slots for one concern against one extra call site for the branding case. The default element is unchanged and still carries `data-drag-placeholder`, which is a stable hook a stylesheet can already target without any config at all — that, not the factory, is the answer for most branding.

**A concrete instance of D-37's narrowing sits on the `placeholder` slot.** `placeholder.ts` guards its `classList.add` after the consumer's factory returns with a `live()` reading, and that reading is **one of the 27 statement-level liveness checks D-37 retires**: the write is inside the transaction bracket, the presentation lifetime undoes it, and a class on an element the library is about to remove has no consequence left to stop. Worth naming here rather than leaving abstract — and worth distinguishing from its neighbour, because the two look alike and are not:

|  | Covers | Survives D-37? |
| --- | --- | --- |
| the `classList.add` liveness reading | a library write on an element the library **adopted**, inside a bracket that undoes it | **no** — retired |
| D-39's `activation.rollback` | library writes on a **consumer-owned** element that was prepared and **never adopted**, so no disposer ever became responsible | **yes** — required |

A class added through this slot lands in exactly the second case when the preparation is discarded, which is why the rollback ledger has to include it even though the guard around the write does not survive.

Default mechanics, always present and not configurable away: the element occupies exactly one insertion position, carries `data-drag-placeholder` and `aria-hidden="true"`, inherits the **item's** `slot`, and is sized from the **removed footprint** — see below. Beyond that the library writes no visual styling.

#### The footprint is two windows, not one (D-43)

**This paragraph used to read "sized from the visual's _offset_ box (unaffected by the item's transform or ancestor zoom)", and that is defect F-50.** It is right about the offset box and wrong about the node. api-1 measured the fixture the rule cannot survive — `item` = `<x-row>` with `display: contents`, `box` = the row's flex container, `visual` = a nested card with a sibling that stays in flow:

|  | `box` pre-lift | `box` post-lift | `visual` | list collapsed by |
| --- | --- | --- | --- | --- |
| A — a sibling remains in the box | 62 | 32 | 60 | **30** |
| B — the visual is the box's only child | 62 | 2 | 60 | **60** |

`box` over-sizes both cases; `visual` is right in B and **30 px too tall in A**. Probe C1 reproduced it live against the shipped `visual.offsetHeight` sizing: a list that should have stood at 180 ran at **210 for the entire drag**. No single-window read of any node reproduces both numbers, because what is removed from the layout is not any element's size — it is the flow contribution the box gave up.

**The rule.** Two measurements of the same node:

```text
before the lift       boxPre       = box(item).offsetWidth / offsetHeight
acquire the faithful lift          (the visual leaves flow)
after the lift        boxPost      = box(item).offsetHeight        ← one extent

footprint.width      = boxPre.width                                — always
footprint.height     = box === visual ? boxPre.height : boxPre.height − boxPost
```

**The subtraction is one-dimensional, and it was written as a box subtraction until F-58.** `boxPre − boxPost` measures a **collapse** — how much extent the box surrendered when its descendant left flow — which is a scalar on the list's flow axis. The footprint it feeds is a **box**, two extents. The two coincided in every fixture that ever measured them (api-1's cases A and B, probe C1's `180 → 210`, F-55's identity correction), all of which are height-only, so `OffsetBox` was carried through symmetrically without the substitution being checked.

Four constraints on it, each measured rather than assumed:

- **Both windows must be _offset_-box reads.** A running translate corrupts a `getBoundingClientRect()` top by the full 60 px of the lift delta while leaving the height unchanged — so the rule would look right in a static fixture and be wrong the moment `layoutAnimation()` or a landing is in flight.
- **Both windows read `box`, and the second must be after the lift.** Any `box` measurement taken after `acquireLift` is a different number, and wrong by a _different amount in each case_ — 30 in A, 60 in B — which is exactly why it is the second window rather than a correction applied to the first.
- **The pre-lift capture is still required for everything else.** It is the landing offset and the candidate rect; the second window adds to it and replaces nothing. The timing is free: `acquireLift` and the activation seam are already about forty lines apart, and the cost is one additional forced layout per activation.
- **The cross extent never subtracts, because nothing collapsed there** (F-58). A block-level box in a vertical list takes its width from its containing block on both sides of the lift, so `boxPre.width − boxPost.width` is `0` — arithmetically correct and the wrong quantity. Nothing was lost on that axis, so there is nothing to restore; what the placeholder still owes is to stand where the row stood, which is `boxPre.width`. Subtracting there shipped `width: 0px` on **every** `box !== visual` composition, and the fixture written to prove this rule had `footprint.width === 0` inside it while asserting only the height. The axis is spelled `height` rather than "the block axis" deliberately: `y()` is written on `pointerY`, `CENTRE_Y` and `rect.top/bottom`, so a logical-axis footprint would give this rule a writing-mode dependency the axis module it serves does not have.

**The identity branch is the degenerate case, not a second rule** (F-58). `box === visual` means there is no nested pair, `LIFT_FAITHFUL` promotes the one element with an explicit width and height, the collapse is zero, and `footprint = boxPre` falls out. F-55's correction is preserved intact and is now a consequence of the rule rather than an exception to it.

**The two windows have different owners** (D-52). The behavior stashes the `box` element in the admission draft; the **kernel** reads `boxPre` beside its existing `originRect` capture, before `acquireLift`; the **behavior** reads `box.offsetHeight` — one extent since F-58 — at the top of `activation.prepare`, where the placeholder-sizing writes already live and D-39's rollback ledger already covers them. **`originRect` is not derived from either window** — it is the visual's own pre-lift rect and stays exactly what it was, which is what keeps this change confined to the placeholder's size.

#### `box()` beside `visual()`

```ts
visual(item): HTMLElement; // the node faithfully lifted
box(item): HTMLElement; // the geometry source
box(item) = visual(item); // default, derived after the merge
```

`item` is the logical sortable identity; `visual` is the exact node the library lifts; `box` is the node whose flow the placeholder replaces. They coincide in every flat list, which is why the default is an equality rather than a required slot, and they separate exactly when the lifted node is a descendant of the element that holds the row's layout.

**The `slot` copy stays, and it is copied from `item`** (api-1 R-6). An unassigned placeholder is not rendered at all — `0×0` at the origin, `assignedSlot: null` — and that zero rect would then be measured as the landing target, which is the same `{0,0}` teleport probe C1 found by a different route. It follows `item` rather than `box` because the placeholder stands in for the item's position in the light tree. A `box` assigned to a different slot from its `item` is an untested edge; the contract says the placeholder follows `item`.

**The anchor stays `item`-relative, and that survived on evidence rather than on inertia.** api-1 R-3 measured `item.after(placeholder)` against `box.after(placeholder)` under `display: contents` in a flex list and got byte-identical geometry — `{x: 0, y: 140, w: 400, h: 30}` from both, because `display: contents` hoists the placeholder into the list's formatting context whichever side it is inserted on. The open question "is `box.after()` universally correct" therefore resolves to "for flow and flex it does not matter", and `item` is the better default anyway: it is the anchor that survives a consumer detaching or re-rendering `box`. D-27's `movePlaceholder()` and its cross-container refusal are unaffected — `box` never becomes an anchor, only a measurement source.

#### Scope limits, stated positively (D-43)

- **The sortable container's visual order must follow DOM order.** This is a requirement on the layout, not a claim about it.
- **Rule-placed layouts are unsupported.** With `grid-column` assigned by `:nth-child`, inserting a placeholder re-parities the selector and relocates items that have nothing to do with the drag — api-1 R-5 moved E3 and E4 across columns. A DOM-insertion reorder model has no meaning where DOM order does not determine position.
- **A composed `box !== visual` is supported with `y()` only, and in CSS grid `box === visual` is required.** Lifting a nested visual leaves the box still occupying its cell (api-1 R-4), so the placeholder adds a second cell where the layout has one item and everything after it shifts by a full cell. Footprint arithmetic cannot repair that: cell occupancy is not a size. **The `y()` limit is wider than grid and is stated rather than left silent** (F-58 §5(a)): the footprint's flow axis is fixed to `height`, so `xy()` over a **wrapping flex row** with a composed `box` — not grid, and therefore not covered by the grid clause — gets the full pre-lift width where the flow axis is horizontal, plus a spurious height delta. That failure is bounded and in the same direction as the pre-D-43 behavior (a placeholder too large), not the unbounded `width: 0` collapse the two-axis subtraction produced; the rule stays **total** and is correct only for the compositions these limits admit, which is the treatment rule-placed layouts already get. Declaring it is the point: leaving it silent would repeat the failure F-58 corrects — a rule stated over a domain it was never measured on.

**No detection machinery.** The owner declined it explicitly, and api-1 agrees on cost: `getComputedStyle().gridColumn` per item is an O(n) style read that is still only a heuristic. These are documented preconditions, checked by the consumer's own layout, not by the library.

#### Lifetime

The placeholder is the dragged item's authoritative layout footprint for the whole operation: created detached during `activation.prepare`, inserted as a post-commit effect, never duplicated or lost, valid while the lifted visual is landing, released when the landing gate completes.

**A prepared-but-unadopted placeholder is rolled back, and `activation.rollback` is required for it** (D-39). `prepare` writes library-authored attributes, styles and state onto an element the **consumer** created; if the preparation is then invalidated — `preparationValid()` returns false and the seam reports `SEAM_INVALIDATED` — `effect` never runs, so the disposer registered there never becomes responsible. Nothing else picks it up: this document must not be read as saying a discarded prepare leaves only a detached element for the collector, because the element is the consumer's and the mutations are on it. **Deferred teardown does not help** (D-36) — it changes _when_ teardown runs, not _whether_ adoption occurred. It is a local acquisition property with an existing mechanism, and it is not an argument for reinstating statement-level liveness.

**It is a physical footprint, not a semantic one.** The React probe established that React neither detaches nor repositions the injected placeholder, but that an authored commit inserting a _new keyed item_ into the destination gap can leave it on the wrong side of the dragged item. The semantic anchor after the authored commit is therefore the **item**, and the behavior repairs the placeholder against it (D-16, §[05](05-lifecycle-invariants.md) F-15):

```ts
if (
  item.isConnected &&
  item.parentElement === placeholder.parentElement &&
  placeholder.nextElementSibling !== item
) {
  item.before(placeholder);
}
```

Each conjunct is load-bearing:

- **`nextElementSibling !== item`** — `Node.before()` on an already-correct position is a remove-and-reinsert, which resets CSS transitions on the placeholder and forces a reflow on every settlement.
- **`isConnected` and matching parents** — a consumer that unmounts or re-keys the dragged item as part of applying the reorder can leave `item` detached, or attached inside a different tree. Calling `before()` on it would then move the **placeholder** into that tree, destroying the very element the fallback measures (review 4, §16). The guard turns an anchor loss into a degraded but safe measurement instead of a detached placeholder.

When the guard fails, the behavior measures the still-connected placeholder where it stands. **This is the normative fallback, and Q-12 is answered** — in Phase 10, with the degraded re-anchor accepted, and the fixture the earlier wording was waiting on is checked in: `tests/sortable/react.browser.test.ts` › _that unmounts the dragged item (Q-12)_. This sentence said "remains open" until Checkpoint D review 4 (C4-03), where it contradicted §[05](05-lifecycle-invariants.md)'s own resolved-table entry.

### `landing()`

```ts
type LandingOptions = Readonly<{
  /**
   * A number fixes the timing at construction. The **contextual form** is
   * invoked once per landing, at settlement — the moment the shipped
   * `landingTiming()` was read — and receives the landing it is timing, so a
   * distance-scaled duration is expressible without replacing the runner.
   */
  duration?: number | ((context: LandingTimingContext) => number);
  easing?: string;
}>;

type LandingTimingContext = Readonly<{
  /** Origin-relative deltas, the same space `LandingContext` uses. */
  from: Point;
  to: Point;
  /** `Math.hypot(to.x - from.x, to.y - from.y)`. */
  distance: number;
}>;
```

**The zero-argument thunk is deleted (D-67).** `duration: () => number` was rejected by review 3 §10 on its own terms — _"it cannot even observe the distance that motivated dynamic timing"_ — and the contextual form was deferred to a proven need. **D-63 supplied the need by removing the alternative**: with `landing({ run })` gone, the thunk became the sole surviving carrier of parity **L-6** (settle-time `landingTiming()`), so deleting it outright would have dropped a shipped capability with nothing in its place. Three options, one of which discharges both obligations, and this is it.

**The deletion is not enforceable, and the contract claimed it was (F-52).** `duration: () => 200` **still compiles** against `(context: LandingTimingContext) => number`, because TypeScript assigns a zero-parameter function to any signature. The compiled fixture's `n6` was written to assert the deletion and had to be withdrawn.

Two consequences, both of which improve on what was claimed:

- **the migration is source-compatible.** A consumer's shipped `() => 200` keeps working and keeps returning the right number; it simply ignores an argument it does not read. Nobody had claimed that benefit, because nobody had checked;
- **requiring the context would need a runtime arity check**, and that is not worth its cost for an option whose zero-argument form still behaves correctly. There is no defect to catch — only an expressiveness a consumer has not taken up.

So `duration: () => number` is **removed from the documented surface** and remains accidentally accepted by the type. That is a weaker statement than "deleted", and it is the true one.

**It costs nothing the thunk did not already cost.** The invocation site, the once-per-landing rule, the validation domain and the ordering against the reduced-motion collapse are all unchanged; **only the argument list grows**, from zero to one object. `from` and `to` are already computed for `LandingContext` at that moment, and `distance` is one `Math.hypot` — so the contextual form is strictly more expressive than the thunk at a cost that does not appear in any measurement.

**`run` is removed (D-63).** The slot read `/** Full replacement for the default WAAPI runner — a spring, for example. */ run?: LandingStart` and it is deleted, together with the public `LandingStart`, `LandingHandle` and `LandingContext` exports from `sortable/landing.js`. The library owns the landing animation.

**This is a tier move, not a lost capability.** Everything that made a custom runner _work_ is untouched: the kernel still never names a runner type, the reserve-seal-arm protocol is unchanged, completion is still latched once, and a **kernel-tier** behavior author still supplies a runner — review 3 §10 says so in as many words. What leaves the ordinary tier is the **public lifecycle protocol** a consumer-supplied runner requires: four exported types, a handle contract, a completion latch the consumer can call into, and a relinquishment obligation on `destroy()` that the consumer must honour or the join's pin is overridden. The owner's judgement is that a spring is not worth that surface at the rung where the audience is _"I have a list and I want it sortable"_, and the removed protocol is a fair statement of the price.

**What the consumer keeps** is `duration` and `easing`, including the settle-time thunk — see §Public option domains, and the note there about what review 3 §10 additionally proposed and this contract does not do.

Without this feature the behavior holds no landing gate and no landing module is imported, and the visual is pinned at the placeholder **in the same drain** — settlement holds one gate now (D-41), so nothing else can be holding it open. With `duration: 0` the gate is held and released through the runner — also immediate, but not the same code path, and the default path does not import the runner.

`landing({ duration, easing })` installs a Web Animations runner honouring `prefers-reduced-motion` by collapsing duration to zero. ~~`landing({ run })` replaces it entirely; a spring driving `requestAnimationFrame` and calling `done()` when it settles is a first-class citizen, because nothing in the contract assumes a CSS timing function or a finite known duration.~~ **Removed at the ordinary tier (D-63).** The clause that follows it is still true and still load-bearing: **nothing in the contract assumes a CSS timing function or a finite known duration**, which is what keeps a kernel-tier spring authorable and what makes `duration: 0` safe.

**Synchronous completion is explicitly supported.** A `duration: 0` runner, or a runner that decides it has nothing to do, may call `done()` or `fail()` from inside `start` before returning a handle. The kernel makes that safe by reserving the hold _before_ calling `start` and publishing the returned handle before any queued completion can be applied (§[02](02-kernel-behavior-contract.md) §Request, seal, then arm). A completion is latched once: a second `done()`, or a `done()` after a `fail()`, is inert.

**A runner is never responsible for correctness.** The `target` in its context is the authoritative measurement — taken once, after the authored commit, against DOM that is already final (D-41 narrowing D-16) — and the kernel still performs the final pin through the lift session at the join. A runner's only obligations are to call `done()`/`fail()`, and to relinquish the visual's transform on `destroy()` so the pin is not overridden — for a WAAPI runner, `animation.cancel()`.

~~`retarget?(target)` is optional and improves trajectory quality only. A runner that omits it is fully correct; one that implements it turns a late readiness correction from a step into a smooth adjustment (§[05](05-lifecycle-invariants.md) F-16).~~ **`retarget` is removed** (02, following D-41). Its stated purpose was smoothing a late readiness correction, and with one authoritative measurement taken after the authored commit there is no correction to smooth — a seam whose only justification was deleted is not kept on the chance a use appears. A runner's obligations are therefore exactly two: call `done()`/`fail()`, and relinquish the transform on `destroy()`.

### `layoutAnimation()`

Two seams bracket the single placeholder-move writer:

```text
slots.beforeMove[…]      measure current rects, then release owned offsets
placeholder DOM move     the sole writer of placeholder position
slots.measureInsertion   the axis rebuilds on settled presentation geometry
slots.afterMove[…]       re-measure, write inverted offsets, play
```

The library performs only the measurements and temporary offsets that make CSS animation possible; duration and easing are the consumer's. FLIP is the expected implementation, not a requirement.

**What it may write: `translate`, additively. Never `transform`.** Three properties of the write, in the order they were ruled out:

- Assigning `transform` _replaces_ an authored `rotate(4deg)` for the duration and overrides a consumer's own running transform animation.
- Additive `transform` is wrong too. Additive transform lists **concatenate**, so the offset lands inside the element's own `scale()` and moves it by a multiple of the delta — while the delta was measured in viewport space.
- The individual `translate` property applies _before_ `transform` in the used-value chain (`translate → rotate → scale → transform`), so the offset sits outside the element's own transform and needs no correction; and `composite: 'add'` composes it with an authored `translate`, or with a consumer animation on the same property, instead of clobbering either.

**What it may touch: snapshot members in the crossed span, and nothing else.** Not the placeholder, whose position the behavior owns; not unrelated siblings, which a sibling walk otherwise picks up; and **not the dragged item**, whose presentation the kernel's lift owns. The dragged item is not a hypothetical: the placeholder is inserted immediately after it, so it is the first sibling every backward span walks over. Under any top-layer lift its rect does not change across the bracket, so animating it produces a zero delta and _looks_ correct — the ownership violation is visible only in the reads, which is how it has to be pinned.

**It is not a lifecycle gate, and under D-7 it structurally cannot become one:** it has no access to `SettlementScope`, which is passed only to `settlement.effect`. An in-flight displacement never delays release, settlement or presentation teardown. This is a case where probe 2 turns a probe-1 _rule_ into an absence of capability.

**Retargeting** is the same mechanism as the release above, not a special case. Every owned element — this move's span **union** whatever is still in flight — is measured where it currently looks, released, and replayed from that position after the write. So an interrupted displacement continues from where it visually is rather than restarting from a full delta, and exactly one animation exists per owned element at any time. A displacement completion carries no operation identity because it can affect nothing outside the feature's own element map; retirement empties that map, so a late completion finds nothing to write.

**Acquisition is all-or-nothing**, the same obligation `landing()` has: `finished` is an accessor and `then` is a call, and an animation that is started but never entered into the map would survive `retire()` and keep offsetting an element nothing owns.

**Q-7 is answered** (`packages/drag2/.plan/measurements/q7.md`, M-4), and §[05](05-lifecycle-invariants.md) records it as answered in both its tables. The displacement set is the crossed span, 0.16ms against 2.3ms per committed move at 800 rows. The two features never contend for a shared read: the axis rebuild is _re-timed_ into the bracket rather than duplicated, so a committed move performs one full pass — the one it was always going to perform on the next frame — plus `2 × |span ∪ in-flight|` element reads. **No shared read phase and no shared geometry capability are introduced**, which is the half of Q-7 that resolved the other way from the one the question expected: what the bracket provides is an _ordering_ the behavior already owned, not a phase the two features read from. The two of them still read different things — every candidate's visual on one side, the span's rows on the other — so there was never a common result to share.

## The collection model

```ts
type CollectionSnapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;
```

### Delivery: one source, one signal (D-44)

```ts
sortable(root, {
  items: () => itemsRef.current, // the current committed collection
  onReorder,
});

controller.invalidate(); // the committed presentation or data may have changed
```

**`updateItems(payload)` is removed**, and nothing scanning — no `itemCount()`/`itemAt()` protocol — replaces it. The package carried two collection channels: a thunk called exactly once at construction and a push method for every later change, with neither re-reading the other. One pull source plus one payload-free signal collapses them, and ledger L-1's "the thunk is called exactly once, at construction" is retracted with the push channel it was paired with.

**Array identity is the structural-change signal.** `items()` returns a readonly array whose identity is stable while membership and order are unchanged; a structural change produces a new array. That is not an obligation invented for this API — React, Vue and Svelte all return a new array when order changes, so it is a test the consumer already produces for free.

| `items()` returns | The library does |
| --- | --- |
| **the same array identity** | geometry/presentation invalidation only — `slots.invalidateInsertion()`, no copy, no reconcile, no snapshot |
| **a new array identity** | snapshot (shallow copy) → `reconcileCollection` → geometry invalidation |

**The shallow copy happens only on the structural branch, and that is the point of the split.** The published snapshot lives on the behavior's private runtime, not in a frame: it is replaced wholesale, never mutated, and the copy is what keeps a queued snapshot safe from a later caller mutation. What changed is that it is no longer paid on every invalidation — a resize, a zoom or a scroll invalidates geometry, not membership, and those are warm interaction frames. O(n) work now follows a structural change, which is the only thing that needs it. The frame holds the snapshot the _current operation_ is reasoning about, which may lag the published one by at most one queued action.

**In-place mutation of the same array is outside the contract.** A consumer that pushes into the array it already returned gets the geometry branch, because identity did not move; the library does not deep-compare to catch it, and no diagnostic can distinguish it from an ordinary geometry invalidation. This is stated as a precondition rather than defended.

**After release the proposal is frozen**, and a structural invalidation does not reinterpret it. Reconciliation still runs — the gap either survives or the operation ends — but nothing re-derives intent from a newer collection.

#### The name collision is deliberate

`controller.invalidate()` and `InsertionGeometry.invalidate()` are different members with the same name, and D-44 chose that rather than avoided it:

|  | Owner | Meaning |
| --- | --- | --- |
| `controller.invalidate()` | **public**, on the controller | the **cause** — "what you can see may no longer match what you gave me" |
| `slots.invalidateInsertion()` / `InsertionGeometry.invalidate()` | **feature-private**, contributed by the axis | the **effect** — "the rect index is stale, rebuild lazily" |

They are one call apart on the common path: `controller.invalidate()` with an unchanged array identity does nothing _but_ call the geometry one. They are not the same member and must not be merged — the geometry slot is called from five behavior-owned events that the consumer never sees (activation, scroll, resize, committed placeholder move, release), and the controller member is called from consumer code that knows nothing about a rect index. §Geometry is a paired capability is unchanged: **`invalidate()` is the whole reason geometry is a paired capability**, and the controller member is now the outermost of its callers.

`reconcileCollection` is pure and identity-based, ported unchanged — **only its delivery changed**:

- an **internal** gap survives only when `before` and `after` remain present and adjacent in the destination view;
- a **start** gap survives only when `after` remains the first destination item;
- an **end** gap survives only when `before` remains the last destination item;
- otherwise the operation cancels with `CANCEL_COLLECTION_INVALIDATED`, or with `CANCEL_ITEM_REMOVED` if the dragged item itself vanished.

Intent is **never** recomputed from the latest pointer position. The exact identity gap survives or the operation ends.

**Publication is an effect, not a preparation.** `prepare` stages a `PreparedCollection` and writes only the draft; `effect` publishes `rt.snapshot` and `rt.view.snapshot` and calls `slots.invalidateInsertion()`. An earlier draft published from `prepare` and returned `false` — which does not typecheck against `{} | null`, and, more seriously, meant a reentrant cancel or destroy could invalidate the preparation after the private runtime had already been replaced (review 4, §4).

**The action never discards, and it branches by phase.** Both matter: discarding loses the consumer's update (§[02](02-kernel-behavior-contract.md) §An invalidating collection replacement must not be lost), and _not_ branching means `draft.snapshot` gets rewritten in every phase — which retains item elements in an idle frame against I-20, and rewrites the very transaction snapshot the release path froze.

**The table is unchanged in behavior and rekeyed on `invalidate()`** (D-44). What used to arrive as an `updateItems(payload)` action now arrives as a payload-free `invalidate()` whose `prepare` **calls `items()` itself** and takes the structural branch only when the identity moved; the phase behavior below is the same in every row, because the action was never reading the payload for anything but the array.

| Phase | `prepare` stages | Binds `draft.snapshot`? | `effect` |
| --- | --- | --- | --- |
| `IDLE` | The snapshot. | **No** — an idle frame must retain no DOM (I-20). | Publish. |
| `PENDING` | The snapshot. `cancelReason` if the pressed item vanished. | Yes | Publish. |
| `ACTIVATING` | Same as `ACTIVE`. | Yes | Publish; invalidate geometry; cancel last if staged. |
| `ACTIVE` | The snapshot plus the rebased insertion, written into the draft. `cancelReason` when the gap cannot survive. | Yes | Publish; invalidate geometry; cancel last if staged. |
| `RELEASING`, `SETTLING`, `REPORTING`, `FINALIZING` | The snapshot only. | **No** — the operation's semantic snapshot is frozen and the transaction is decided. | Publish. |

**The geometry-only branch does not reach this table at all.** An `invalidate()` whose `items()` returns the same identity stages no snapshot and publishes nothing; it invalidates geometry and ends. That is the branch a scroll, a resize or a zoom produces, and keeping it out of the transactional path is what makes the pull source cheaper than the push method it replaces rather than merely tidier.

A commit for a phase whose frame fields did not change is a no-op swap of two identical frames — one `Object.assign` on a path that already replaces a collection. Paying it uniformly is what keeps "a discarded action touched nothing" true without a per-phase exception.

### `ACTIVATING` is handled, not deferred

An earlier draft said an update arriving during `ACTIVATING` was "queued behind the activation checkpoint and applied as `ACTIVE`". **That cannot be obtained from FIFO** (review 5, §5): `activation.effect` calls `onStart` _before_ the kernel dispatches `START_COMMITTED`, so a `controller.invalidate()` from inside `onStart` is appended **first** and FIFO requires it to run first — while the phase is still `ACTIVATING`. Getting the documented behavior would have needed a pending slot, an explicit requeue with an anti-spin bound, or a reordering of the activation checkpoint.

None of those is needed, because **the deferral itself is unnecessary now**. I-30's post-commit ordering already guarantees that `rt.placeholder`, `rt.lift` and `rt.view` are published _before_ `onStart` runs, and the home insertion is committed. An `ACTIVATING` frame is therefore as reconcilable as an `ACTIVE` one, so the collection action treats the two identically and the deferral, the pending slot and the requeue rule all disappear.

**D-44 changes the trigger and not one word of the above.** The reentrant call from `onStart` is now `controller.invalidate()`, and if the consumer's `items()` returns a new array from inside `onStart` it takes the structural branch in `ACTIVATING` exactly as `updateItems()` did. `onStart` calling `controller.invalidate()` remains an executable case in the test matrix, not a derivation — and it now has a second case beside it, the same call with an unchanged array identity, which must reach the geometry branch and never the queue.

**And the invalidating case needs one explicit rule**, because "the cancel transition runs next" is _not_ true in this reentrant ordering (review 6, §14). The FIFO sequence is: `onStart` queues the collection action → activation returns and queues `START_COMMITTED` → the collection effect publishes and queues `CANCEL`. `START_COMMITTED` is already ahead of `CANCEL`.

**The rule: `host.cancel` latches synchronously.** The kernel's cancel latch is set the moment `host.cancel` is called, not when the `CANCEL` action is applied, and `START_COMMITTED` checks it — so an operation cancelled during `ACTIVATING` never reaches `ACTIVE`. This is the existing I-21 latch ("first valid cancel per operation wins", kernel-private) doing exactly what it was built for; what was missing was saying that `START_COMMITTED` consults it.

The alternative — activate, then cancel immediately afterwards — would be defensible only if nothing observable happened in between, and `START_COMMITTED` is a phase commit that later actions branch on.

**The checkpoint defers; it does not retire.** Refusing to advance leaves the phase at `ACTIVATING`, and the `CANCEL` queued behind it settles there — which is what delivers the single terminal callback §[02](02-kernel-behavior-contract.md) §I-31 requires. Retiring from the checkpoint instead would race the cancellation to the same operation and swallow it.

## Tree-shaking

Judged through consumer fixtures, not source intuition — and **measured** (M-3, baselined 2026-08-02 — [measurements/m3.md](../measurements/m3.md); re-measured **2026-08-08** at Checkpoint D, re-declared at two behaviors by **M-3′** on 2026-08-19 — [measurements/m3-prime.md](../measurements/m3-prime.md) — and re-measured here **2026-08-22** by the Phase 22 bundle-structure pass, [bundle-structure.md](../bundle-structure.md)). **The table below is the full topology rather than the sortable half of it**, which is what changed at M-3′ and what this section published five rows of until now:

| composition | brotli | modules | vs its behavior's minimal |
| --- | --- | --- | --- |
| minimal (`y()`) | **11.14 kB** | 31 | — |
| minimal (`xy()`) | 10.80 kB | 30 | −0.34 kB |
| + `layoutAnimation()` | 11.57 kB | 32 | +0.43 kB |
| + `landing()` | 11.42 kB | 33 | +0.28 kB |
| complete | **11.85 kB** | 34 | +0.71 kB |
| free drag minimal | **8.72 kB** | 26 | — |
| + `bounds()` | 8.86 kB | 27 | +0.15 kB |
| + `landing()` | 9.02 kB | 28 | +0.30 kB |
| free drag complete | **9.16 kB** | 29 | +0.45 kB |
| both behaviors | 13.40 kB | 47 | — |
| `kernel.js` alone (`draggable`) | 6.51 kB | 12 | — |
| `drag.js` alone (`DraggableError`) | **0.12 kB** | **1** | — |

The last two rows **are** declared compositions in `bench/size` as of 2026-08-22 — they were measured once by the pass above, and F-77 is the finding that said a published runtime entry with an isolation claim ought to carry a standing assertion rather than a one-time reading. It is closed: `drag.js` carries `only: ['kernel/errors.js']` and a deliberately tight 150 B budget, because the packed `errors.js` inlines the `FAILURE_*` constants and so a graph assertion alone cannot see machinery arriving from `failures.ts`. `drag.js` at one module is the measured form of the three-root argument: shared vocabulary costs a consumer 121 B, not the kernel.

The **property** this section asserts is that each optional feature adds only itself, and it holds: the module graph shows no optional module in a composition that did not ask for it, in either direction.

**The numbers are not "unchanged since M-3", and saying so was wrong** (C2-05, Checkpoint D review 2). M-3 recorded `landing()` at +0.27 kB and `complete` at **+0.76 kB** against a **9.33 kB** minimal — `+0.77` against `9.34` after that document's own re-measure note, and never `+0.81`, which this sentence carried until Checkpoint D review 3 (C3-04) checked it against [`../measurements/m3.md`](../measurements/m3.md); the deltas have moved with every absolute figure since, and the table above is re-measured after C2-01 rather than carried forward. Read the deltas as measurements with a date, not as invariants.

The absolute figures moved with D-33's settlement protocol (+70 B), Phase 16's non-tree-shakeable keyboard ingress (~300 B), Phase 17's shared rect index (+60 B), Checkpoint D's fixes (+40 B), C2-01's terminal barrier (+30 B to +90 B, composition-dependent), C3-01's abort return channel (±20 B, inside brotli's noise band) and C4-01's completion of that barrier (+37 B minimal, +70 B with `layoutAnimation()`, +70 B complete); the budgets were re-based with the earlier ones and **were not re-based for C4-01** — every composition stayed inside the budget it already had. ~~**Headroom is now 0.11–0.16 kB against budgets set at ~0.3 kB**, tightest on `+ layoutAnimation` and `complete` at 0.11 kB, which makes the Phase 21 re-base the next size-affecting change has to go through rather than around~~ — **that re-base happened, twice** (M-3′ 2026-08-19, and P-06/D-102 2026-08-21), and the convention it established is **measurement plus ~150 B**, sized to notice a module appearing in a graph and deliberately too small to absorb a feature. **Headroom is 114–154 B as of 2026-08-22**, tightest on baseline A and `+ landing`; the drift below 150 B is one landed change — P-02's shrink branch, +34 B on the `y()` rows and +14 B on `minimal (xy)`, which added no module and was therefore absorbed rather than re-based. **The budgets do not re-base for that**, and the conditions under which they do are stated in [bundle-structure.md](../bundle-structure.md) §Headroom.

The absences below are **asserted against the bundled module graph**, not inferred from the deltas — a module can be pulled in and mostly shaken, which produces a small delta and reads like success. **Composition itself costs 0.28 kB (2.4%)** against a feature-matched build that fills the slot record by hand — 11,849 B against 11,566 B, so **283 B** at 2026-08-22, against 266 B when this sentence was first written and 289 B at M-3′. **It has not grown as features were added to it**, which is the property worth having rather than the number, and it is what §What isolation cannot shake asked to have weighed. **Migrating from the shipped `sortable.js` costs 4.25 kB** — 11,139 B against 6,889 B, so 4,250 B. The two baselines answer different questions and are never substituted for each other. Both are derived from the same `npx just size` run as the table above; every earlier revision of this paragraph published a figure that was stale on arrival, so the exact byte counts are given alongside the rounded ones.

1. No global registry, no barrel that eagerly references every feature, no default options object naming an optional feature.
2. Each feature is its own module with no import edge to a sibling feature, and no import edge to the behavior's runtime type (D-13 removes the last one).
3. The behavior reaches optional capabilities only through `slots.x` fields that are `null` when unfilled — never through a default implementation imported at the top level.

### The minimal fixture, exactly

```ts
sortable(root, { items, onReorder }, y());
```

**The fixture changed shape at Revision 2** and the measurement it anchors did not: `root` is explicit, the collection is the `items()` pull source (D-44), and `onReorder` is a config key rather than a `callbacks()` fragment (D-45, D-56). It now imports **one** subpath, `sortable/y.js`, and every byte of that import is axis geometry — which is what the fixture was always trying to isolate.

**A minimal one-dimensional sortable necessarily contains one-dimensional axis geometry.** An earlier draft required "axis geometry" to be absent from the minimal build while also making the axis feature required — an impossible target (review 4, §24). What the brief actually requires absent is _unselected_ geometry and unselected optional work (`brief.md:615-637`):

| Must be absent from the minimal build |
| --- |
| the axis rule the fixture did not import (`xy()` from a `y()` build, and `y()` from an `xy()` build), and a future `x()` |
| free drag |
| layout displacement (`layoutAnimation`) |
| landing animation (`landing`, and the WAAPI runner) |

**The "any input mode other than pointer" row is withdrawn (D7, Checkpoint D).** It was written before D-32 and is contradicted by the artifact: keyboard sorting is a `BehaviorSpec` member, not an optional feature, so every composition carries it and no consumer can shake it away. That is a **deliberate accessibility position**, recorded as such in Phase 16 — the alternative, a `keyboard()` feature, would have made an accessibility floor opt-in. Its ~300 B is inside the re-based budgets. Leaving the row standing would have made the minimal build's own packaging test unpassable in principle.

The **five** compositions to measure: minimal (`y()`); minimal (`xy()`), measured as a peer rather than assumed equal to `y()`; minimal + `layoutAnimation()`; minimal + `landing()`; the complete set.

### The export topology this requires

A separate subpath entry per optional **capability** is what makes the measurement honest: the minimal fixture's import graph physically cannot reach geometry it did not import, independent of bundler heuristics. The shipped package exposes only `draggable.js` and `sortable.js` (`packages/drag/files.json`, `packages/drag/package.json:15-24`), so this is a new topology and has to be written down before it is measured, or ergonomics will quietly reintroduce an eager barrel.

**Eight entries** — nine, less the three D-56 deletes, plus the `kernel.js` D-48 adds and the `sortable/feature.js` D-61 adds — across **three tiers and three roots**:

| Subpath | Runtime exports | Type exports |
| --- | --- | --- |
| `drag.js` — **shared vocabulary**, reachable from any tier | **`DraggableError`** (a class — the one runtime value here) | `Point`, `DOMRealm`, **`DraggableErrorCode`** |
| `kernel.js` — `@ydinjs/drag/kernel`, **the kernel tier** (D-48, **rebuilt by D-68**) | **`draggable`**, the 13 **`FAILURE_*` constants** (D-64), the 3 **`LIFT_*`**, the 5 **`SETTLED_*`**, **`AT_PROPOSAL`**/**`AT_CONSUMER`**, the 8 **phase constants**, **`toDraggableError`** — 33 values | **`BehaviorFactory`**, **`KernelHost`**, **`BehaviorSpec`**, **`FailureStage`**, and the rest of `BehaviorFactory`'s structural closure, enumerated in [02](02-kernel-behavior-contract.md) §The kernel tier's public vocabulary — **35 types** (33 until 2026-08-22; `BehaviorLiftSession` and `InheritedSpace` were each ratified separately, by 07 §K-1 and D-85, and neither updated the total) |
| `sortable.js` — returns a `SortableController`, takes `root` (D-48) | `sortable`, **`ReorderResolution`**, **`AT_PROPOSAL`**, **`AT_CONSUMER`** | **`SortableConfig`**, `ReorderRequest`, `ReorderProposal`, `CollectionSnapshot`, `ReorderResolution`, `AcceptedReorderResolution`, `RejectedReorderResolution`, `AcceptedReorderResult`, `NoopReorderResult`, `RejectedReorderResult`, `CanceledReorderResult`, **`ReorderTransactionResult`**, `CancelStage`, **`DragErrorContext`**, `SortableController`, `PlaceholderFactory`, **`PlaceholderContext`**, **`OnReorder`** |
| `sortable/feature.js` — **the middle tier** (D-61) | — | **`SortableInstaller`**, **`FeatureContext`**, **`SortableContribution`**, **`InsertionGeometry`**, **`DisplacementHook`**, the consumer-declared view types an installer reads, and — **as re-exports since D-68, declared at the kernel tier** — `LandingStart`, `LandingContext`, `LandingHandle`, `Disposer` |
| `sortable/y.js` | `y` | — |
| `sortable/xy.js` | `xy` | — |
| `sortable/landing.js` | `landing` | `LandingOptions` |
| `sortable/layout-animation.js` | `layoutAnimation` | `LayoutAnimationOptions` |
| `free-drag.js` — **the second behavior's ordinary tier** (D-69) | `freeDrag`, **`FreeDragResolution`**, `AT_PROPOSAL`, `AT_CONSUMER` | **`FreeDragConfig`** and every alias it names, `FreeDragController`, `FreeDragSubject`, `FreeDragRequest`, `DragGeometry`, `DragAxis`, **`FreeDragLift`**, `FreeDragTransactionResult` and its three arms, the two resolution members, **`FreeDragErrorContext`**, `CancelStage` |
| `free-drag/feature.js` — **its middle tier** (D-70) | — | **`FreeDragInstaller`**, **`FreeDragContribution`**, **`MotionConstraint`**, `ConstraintView`, `MotionDraft`, and — as re-exports — `FeatureContext`, `LandingStart`, `LandingContext`, `LandingHandle`, `Disposer` |
| `free-drag/bounds.js` | `bounds` | `BoundsSource` |
| `free-drag/landing.js` | `landing` | `LandingOptions` — the **same declaration** `sortable/landing.js` publishes |

**A tenth change, at Phase 18, and it is the first that adds a whole behavior.** Four entries, taking the table from eight to twelve, decided in full before the modules exist — the same measurement precondition Phase 0 observed, for the same reason. Normative surface: [07](07-free-drag-contract.md).

- **`free-drag/landing.js` duplicates an entry, not an implementation.** The landing runner is behavior-neutral — `LandingStart`, `LandingContext` and `LandingHandle` are kernel SPI (D-68) — so the runner, its timing domain and its reduced-motion collapse are one internal module both entries wrap. What is not shared is the _installer type_, because the contribution types differ, and unifying those is F-64's deferred question rather than Phase 18's. The precedent is `rect-index.ts` shared between `y()` and `xy()` at a measured **60 B**, recorded rather than absorbed; Phase 21 measures this one the same way.
- **`FeatureContext` and `LandingOptions` are one declaration each, published from two entries.** Two structurally identical types under one name, maintained separately, is F-61 arriving from the outside; the D-68 re-home pattern gives the two tiers a shared type **identity** instead. Pinned by 07's acceptance criterion B-7.
- **Neither `drag.js` nor `kernel.js` changes.** A free-drag consumer imports `free-drag.js` and — for `instanceof DraggableError` — `drag.js`, and reaches no other tier. `tests/packaging.node.test.ts` asserts the absence in **both** directions: a free-drag composition's import graph must not reach `sortable/`, and the sortable's must not reach `free-drag/`.
- **Three cells outside the free-drag rows move with it.** `FAILURE_INSERTION`, `FAILURE_PLACEHOLDER_MOVE` and `FAILURE_REORDER_RESOLUTION` are renamed to `FAILURE_ACTION_PREPARE`, `FAILURE_ACTION_EFFECT` and `FAILURE_RESOLUTION` with their numeric values unchanged (D-74, **landed 2026-08-15**), and `sortable.js`'s `DragErrorContext` becomes `SortableErrorContext` (D-75). Both are identifier renames on entries with no released consumer; the second is the price of not giving the first behavior an unqualified word by arrival order.

**Four cells changed at Revision 2.1**, and three of them are one decision each:

- **`sortable/feature.js` is new** (D-61). It is the ladder's second rung and it has **no runtime exports at all** — every name on it is erased. That is the honest measurement statement for this entry: it cannot demonstrate absence because it contains nothing present, and unlike the three subpaths D-56 deleted for exactly that reason, it is not pretending to. It exists to give the authoring types an address, not to isolate a cost.
- **`FailureStage` and the 13 `FAILURE_*` constants move from `drag.js` to `kernel.js`** (D-64). They are how a **behavior** classifies, which is kernel-tier work; the ordinary consumer now receives a coarse code on a `DraggableError`.
- **`DraggableError` and `DraggableErrorCode` are new on `drag.js`** (D-64), and `DraggableError` is why that entry still exists — see below.
- **`LandingStart`, `LandingContext` and `LandingHandle` leave `sortable/landing.js` for `sortable/feature.js`** (D-63, D-61). They stop being consumer vocabulary and stay authoring vocabulary. `sortable/landing.js` keeps `LandingOptions`, which is now `{ duration?, easing? }`.
- **`SortableFinishResult` and `SortableCancelResult` leave the table** (D-62), and `ReorderTransactionResult` — already listed — becomes the type `onEnd` receives.

**`sortable/callbacks.js`, `sortable/placeholder.js` and `sortable/handle.js` are deleted** with the four factories they carried (D-56). Their surviving types are re-homed on the entry whose public signatures depend on them: `OnReorder` and `PlaceholderContext` join `sortable.js`, because `SortableConfig.onReorder` and `PlaceholderFactory` are functions of them. `SortableCallbacks` and `PlaceholderOptions` are not re-homed — they typed the deleted factories' arguments, and their slots are declared in `SortableConfig` (§The consumer callbacks).

**Shared vocabulary belongs to neither tier, so it gets its own home rather than lodging in whichever tier also happens to need it.** That is why `drag.js` is not the kernel entry. ~~and the correction matters in exactly the direction D-47 exists to guard: `sortable.js`'s `onError` hands the consumer a `FailureStage`, so those names are structurally public **at the ordinary tier**. Putting them behind `@ydinjs/drag/kernel` would have made an ordinary consumer import from the kernel to `switch` on an error its own handler was given — a progressive-disclosure inversion, produced by an entry-file convenience rather than by any decision.~~

**That argument is void and this entry survives on a different one (D-64).** `onError` no longer hands the consumer a `FailureStage`; it hands a `DraggableError` carrying a coarse `code`. The stage names move to `kernel.js` and the inversion the struck text warns about cannot occur, because there is nothing at the ordinary tier that needs them.

What keeps `drag.js` is **`DraggableError` itself**. It is a **class**, so it is a runtime value and not an erased type: a consumer writes `err instanceof DraggableError`, and so does a kernel-tier behavior author. Putting it on `sortable.js` would make a kernel author import the sortable behavior to recognise an error the kernel raised; putting it on `kernel.js` would make an ordinary consumer import the kernel to recognise an error its own handler was given — which is the same inversion, arrived at from the other side. A symbol both tiers must name and neither owns is exactly what a shared root is for.

**Two independent arguments have now produced the same three-root topology, and that deserves suspicion rather than confidence.** The first was structural type dependency and it lasted one revision; the second is runtime-value sharing. Both were derived from the same table, by the same author, in the same week. The topology has never been checked against a consumer who did not already believe it — `tests/packaging.node.test.ts` asserts what the table says, not that the table is right.

The split also makes flag 7 tractable rather than merely visible. With the shared names out of the way, `kernel.js`'s type column **is** the kernel vocabulary, so minimizing it is a question about `BehaviorSpec`'s own declaration and nothing else (§Public and stable).

Three cells changed at the phase 9 freeze, each closing something the original table left contradictory:

- **The stage constants are runtime exports.** §The public/internal boundary already called them public — a consumer receiving `onError` or a canceled result has to discriminate them — but the runtime column listed only `draggable` and `sortable`, so the type shipped and the values did not. A numeric union whose members are unnameable is not a public type. **The rule survives D-64 and its subject changes tier**: the constants are still runtime exports, now from `kernel.js`, and `DraggableErrorCode` needs none because its members are string literals a consumer writes directly.
- **`DragErrorContext` ships from `sortable.js`, not `drag.js`.** It carries `domain: ReorderTransactionResult`, a sortable result. `draggable` was given its own entry precisely so a future free-drag consumer need not reach the sortable behavior, and having that entry declare a behavior's result union would undo it. ~~The kernel half, `FailureStage`, stays on `drag.js`.~~ **D-64 removes the kernel half rather than relocating the type**: `stage` leaves `DragErrorContext` entirely, so the context is now purely the sortable half — one field, `domain` — and this cell's reasoning is what decides that the two-argument `onError` survives instead of collapsing into the owner's one-argument sketch. `FailureStage` moves to `kernel.js`.
- **`PlaceholderContext` is listed.** `PlaceholderOptions.create` was a function of it, so it was already structurally public; naming it is what makes that deliberate rather than incidental. **The dependency survives D-56 and D-65 with a shorter path each time** — `SortableConfig.placeholder` is a `PlaceholderFactory`, which is a function of `PlaceholderContext` — so the alias moves to `sortable.js` and stays public for the same reason it was ever public.

A fourth correction followed from running TypeDoc over the frozen entries: four more aliases were **structurally public but unnameable** — reachable through a public type, resolvable by a consumer's compiler, and absent from the documented surface. `CollectionSnapshot` (via `ReorderProposal.snapshot`), `PlaceholderFactory` (via `PlaceholderOptions.create`, now via `SortableConfig.placeholder`), and `AcceptedReorderResolution`/`RejectedReorderResolution` (the two members of the `ReorderResolution` union) are now exported from `sortable.js`. This is the same rule that made `DOMRealm` and `Point` public — and `FailureStage`, until D-64 moved it to the kernel tier, where the identical rule now makes it public _there_: **export what a public type structurally depends on rather than pretending it is internal.**

~~**A sixth cell changed at the Phase 14 re-freeze, and it is one alias rather than two.** `ResolutionOptions` joins `sortable/callbacks.js` because `ReorderResolution.accept` is a function of it — the same "export what a public type structurally depends on" rule as the four aliases above. It ships from `callbacks.js` rather than `sortable.js` because a composition that installs no `callbacks()` has no `onReorder`, and therefore no presentation to declare.~~

**Retracted by D-41 (Revision 2): `ResolutionOptions` is deleted, not relocated.** The rule that put it here was sound and its subject is gone — `ReorderResolution.accept` takes no argument once there is no presentation to declare. The paragraph above is kept because the rule it applies is still the one this table runs on; only its example expired.

An earlier draft of that revision exported **two** types here, `PresentationToken` and `PresentationDeliverer`, describing a kernel-owned gate object the consumer had to hold. Checkpoint C's criterion — do not expose more settlement machinery than the consumer needs — plus the synchronous-commit defect that design carried, removed both. Revision 2 finishes the sequence by removing the third: **three successive designs for delivering an acknowledgement, and the one that ships delivers none.**

**An eighth change, at Revision 2, and it is the largest this table has taken.**

- **`SortableFeature` leaves the table** (D-45). There is no branded feature value to name, and the config schema that replaces it is not opaque.
- **`SortableConfig` joins `sortable.js`** by the same rule that the four aliases obeyed: `sortable()`'s own parameter is a function of it, so it is structurally public whether or not it is named. It is the first entry on this table that is public **because it is authored by consumers**, rather than because a public signature happens to mention it — which is exactly the state D-30 said did not exist and D-45 found (§Fragments are public, installers are opaque).
- **`ResolutionOptions` leaves `sortable/callbacks.js`**, above — and then `sortable/callbacks.js` leaves too.
- **Three subpaths and four runtime exports are deleted** (D-56): `callbacks`, `handle`, `visual`, `placeholder`. Two type aliases are re-homed and two are dropped.
- **`draggable` moves off `drag.js` to a new `kernel.js`**, and `drag.js` narrows to the shared vocabulary (D-48).
- **`Behavior` leaves entirely** (D-55): with `sortable()` returning a controller and `draggable()` taking a factory, the opaque brand has no producer, and an exported opaque type nothing constructs is a boundary marker with no boundary to mark.

The fragment factories' return types need no entries of their own: `Pick<SortableConfig, …>` is nameable from the one alias, and naming four one-slot aliases beside it would put four more names under the versioning promise for no expressive gain.

**A ninth change, at Revision 2.1, and it is the first that _adds_ a tier.** Enumerated above the table; in decision order: `sortable/feature.js` appears (D-61), the failure stages move to `kernel.js` (D-64), `DraggableError` appears on `drag.js` (D-64), the three landing seam types move from `sortable/landing.js` to `sortable/feature.js` (D-63 + D-61), and the two result partitions leave with their callbacks (D-62). **Net: one entry added, one type added, three moved, two deleted** — against Revision 2's one added, three deleted and two moved. The table has now changed in five of the last six passes over it, which is the strongest available argument for the compiled export fixture the handoff still lists as owed: every one of these changes is mechanically checkable and none of them is mechanically checked.

**A seventh change at Phase 17, and it is two cells rather than one.** The two-dimensional insertion rule ships as a **sibling axis feature** on its own subpath, `sortable/xy.js`, and the axis features are renamed to the axes they measure: `vertical()` → **`y()`** on `sortable/y.js`, with a future horizontal rule reserved as `x()`.

The shape was chosen against the constraint the ledger states (L-8, §5): whichever form 2-D took, it must not make the 1-D case pay for it. That eliminated the option with shipped precedent — an unrestricted 2-D default that an axis feature narrows — because a default lives in the behavior core and cannot be tree-shaken away, so every list consumer would carry both rules. It also eliminated one parameterized axis feature, which puts the 2-D metric and its `compareDocumentPosition` call in the list consumer's graph. Two subpaths keep each composition paying for its own rule, and `tests/packaging.node.test.ts` asserts the absence in **both** directions.

What the two features share is `rect-index.ts`, a dimension-neutral packed geometry cache, held privately per feature instance. That sharing costs the list composition a measured **60 B** — recorded rather than absorbed, because the alternative is two copies of a cache that must stay in step, where a divergence is a silent correctness bug. The 2-D _rule_ itself costs a list consumer nothing.

The rename is a **breaking public change** and the second one this part has made, after D-33's `ResolutionOptions`. It is recorded here rather than treated as cosmetic: `vertical` was a layout word for a rule that is about a coordinate, and the vocabulary only becomes ambiguous once a second axis exists.

`ReorderResolution`'s two member types are unchanged in name and in discrimination. ~~The optional argument changed and `SortableController` gained `ready`, which together are a **breaking public change** — the one this revision makes.~~ **Revision 2 supersedes that count.** The Phase 14 change is not shipped and is not a migration anyone performs; what ships is the Revision 2 surface, where `ReorderResolution`'s factories take no argument at all and `SortableController` has `invalidate`, `cancel` and a promise-returning `destroy` — no `ready`, no `updateItems`. Phase 15 implements it, and the consumer fixture's per-subpath export equality is what will fail if it is implemented halfway.

The fifth dangling reference was resolved the other way. `OnReorder` returned `MaybePromise<ReorderResolution>`, and exporting that alias would put a generic utility with no domain meaning on the frozen surface purely so a documentation tool could resolve a link. Its structure is written out in the signature instead — `ReorderResolution | PromiseLike<ReorderResolution>` — which is also the more honest statement, since the kernel reads `then` once and never assumes a native promise. **TypeDoc over the nine public entries — eight until Phase 17 added `sortable/xy.js` — now emits zero unresolved-reference warnings, and none are suppressed** — **a measurement of the Phase 17 entry set, re-owed twice since** (Revision 2's seven entries, Revision 2.1's eight); the check is the standing rule, the zero is not a current reading: a warning there means a public type depends on something a consumer cannot name, which is a surface defect and not noise.

### Public option domains

Frozen with the surface, because a domain is as much a compatibility promise as a signature. ~~Every one throws a `TypeError` outside its domain — a `NaN` threshold otherwise activates on nothing and a `NaN` duration produces an animation that never finishes, both diagnosed three seams away from the call that caused them.~~

**Re-derived package-wide under `CODE_OF_SIZE.md` (D-77, closing F-67). The domains below stay frozen; what the library _does_ about a value outside one does not.** The rule now reads:

> **A construction-time throw is permitted only for an invariant over what installers _contribute_.** Required configuration is a **type** obligation, discharged by the required first argument. A consumer scalar's domain belongs to the consumer, to the platform, or to the seam that consumes the value — in that order of preference.

Applied to this table: `threshold` is **no longer checked**, because a `NaN` threshold activates on nothing and that breaks the consumer's drag and no library invariant; **`landing({ duration })`** narrows to **one comparison against `Infinity`** and **`layoutAnimation({ duration })` keeps no check at all** — ~~both `duration` domains narrow to one comparison~~ was wrong as written (P18A-07), and the paragraph and the table two lines below always said so. `animate()` rejects every other out-of-domain value itself — measured, and the artifact is [`../measurements/animate-duration-domain.md`](../measurements/animate-duration-domain.md) (D-79) — while `Infinity` is the one value it accepts and never completes. ~~It also accepts `'auto'` and `undefined`, which the old finite-number test would have refused~~ — struck (D-79): `undefined` is coalesced to the default before the platform sees it, and `'auto'` is reachable from JavaScript only.

**One row's reasoning survives intact and is why the rule is not "never throw":** an unbounded **landing** duration is the one value the platform accepts and never completes, and the landing holds the settlement gate — so the operation hangs with no terminal at all. A hang is the single failure this architecture cannot classify, because classification needs something to happen. The test is the **gate**, not the animation: `layoutAnimation` takes the same option, accepts the same bad value, holds nothing, and therefore keeps no check.

**Where the check runs depends on when the value exists, and that is the whole of the distinction** (D4, Checkpoint D). The distinction outlives D-77 even though **no fixed option is checked any more**, because it is what places the one check that remains. ~~A _fixed_ option — every row below except one — is a value the consumer already holds at construction, so it is validated **at construction**, exactly once, before any drag.~~ `landing({ duration })` accepts a **contextual function** (D-67) whose result does not exist until the landing opens, so the value that could hang the gate does not exist at construction and could never have been tested there: it is resolved and tested **once per landing**, at settlement, and a refused or thrown result classifies at that moment. ~~The function itself is validated at construction only for being a function~~ — the type says it is one, and a non-function throws where it is called, which is inside the landing seam.

The reduced-motion collapse does not change this, and the **ordering stays as Checkpoint D repaired it**: resolution and the `Infinity` test both precede the collapse, so a thunk returning `Infinity` is refused under `prefers-reduced-motion: reduce` exactly as it is without. That is deliberate even though the collapse would have made the value harmless — a consumer diagnosing a bug must not get a different answer because of the reader's OS setting. ~~a consumer whose thunk throws or returns `NaN`~~ — a throw still classifies at that moment; a `NaN` result is no longer the library's business and reaches `animate()`'s own throw when the collapse does not preempt it.

| Option | Unit | Domain | Default | Enforced at runtime? (D-77) |
| --- | --- | --- | --- | --- |
| `threshold` (config key) | CSS px, straight-line from the press | finite, `>= 0` | `8` | **No.** Out of domain, the drag never activates and no operation starts |
| ~~`readinessTimeout`~~ | ~~ms~~ | ~~finite, `>= 1`~~ | **deleted (D-41)** | — |
| `landing({ duration })` | ms | finite, `>= 0`; or `({ distance, from, to }) => number` returning one (D-67) | `200` | **`=== Infinity` only**, per landing, classified `FAILURE_LANDING_CREATE` → `presentation`. Every other bad value is `animate()`'s own throw at the same stage |
| `layoutAnimation({ duration })` | ms | finite, `>= 0` | `160` | **No — and the difference from the row above is the rule working rather than an inconsistency.** This animation holds no gate and gates no terminal: it is registered in `running` and cancelled by `retire()`, so an unbounded one leaves displaced rows offset until the controller is destroyed and costs the library nothing. The landing check exists because the landing **holds the settlement gate**; delete the gate and the check goes with it |

- `threshold` at `0` activates on the first move reporting a different point.
- ~~**`readinessTimeout` becomes a public option at this freeze.** It was a behavior-fixed 500 ms, which caps a _consumer-supplied_ promise with no escape: a re-render that legitimately involves a round trip failed with `FAILURE_PRESENTATION_READY` and no way to say otherwise. It is a **failure bound, not a schedule** — the gate releases as soon as the promise settles, and exceeding it replaces the settlement. It is not permitted to be `Infinity`: an unbounded gate holds presentation forever, which is the state the bound exists to prevent.~~ **Deleted with the readiness gate (D-41).** The reasoning was about a bound the _library_ imposed on a wait the _consumer_ owned; under the serial commit the consumer owns the wait outright, so the bound is the consumer's to write and to interpret. Note what does **not** transfer: the library no longer has an opinion about how long `onReorder` may take, and the "unbounded gate holds presentation forever" hazard is now an unresolved consumer promise holding its own drag open — visible in the consumer's own code rather than diagnosed by a `FAILURE_PRESENTATION_READY` the library can no longer raise. That is a real loss of a diagnostic, accepted with the protocol that produced it.
- `easing` is deliberately unvalidated on both features. It is a CSS easing function, the platform is the only correct parser for one, and `animate()` reports a bad value itself. **This bullet is D-77's precedent, and it was already inside the package**: the same three clauses delete most of the `duration` check written three lines away from it, and nobody noticed for a revision because the two options were reasoned about separately.
- ~~`landing({ run })` replaces the default runner entirely, so `duration` and `easing` are not read — and therefore not validated — when it is present.~~ **Deleted with `run` (D-63).** Both options are now always read, which removes a conditional from the rule rather than adding one.
- `landing({ duration })` as a **contextual function** is the one settle-time domain. It is called once per landing, its result is tested for `Infinity` only, and a throw or a refused result is classified as a landing failure at that moment. This is the parity shape for the shipped `landingTiming()` (ledger §2, L-6), and D-67 is what keeps that parity after D-63 removed the runner it used to be reachable through.

**Resolved by D-67 — the thunk and L-6.** Review 3 §10 removed `run` and, in the same breath, judged the zero-argument thunk unjustified: _"it cannot even observe the distance that motivated dynamic timing."_ It deferred a contextual `duration({ distance, from, to })` to a proven need. D-63 took the first half, which made the thunk the **sole** surviving carrier of shipped parity L-6 — ledger L-6 and its §2 row both record it as such, and the §5 row had additionally called the capability _"reachable through a replacement runner"_, which it no longer is. Of the three ways to close that — keep a thunk the owner had already rejected, delete it and lose L-6, or ship the contextual form — **the owner took the third**, which is the only one that discharges §10's second clause and keeps the parity row. The deferral was conditioned on a proven need, and removing the alternative is what proved it.

**`ReorderResolution` is a runtime export as well as a type** (review 6, §10). The documented consumer calls `ReorderResolution.accept(…)` and `ReorderResolution.reject(…)`, the shipped package exports the same factory, and listing it under types only would have made every example in these documents fail to run. The name is deliberately both a value and a type, as it is today.

Three decisions the earlier table left open (review 5, §12):

- **`draggable` moves to its own entry.** It is behavior-agnostic, so putting it under `sortable.js` would make a future free-drag consumer import the sortable behavior to reach it. The shipped `draggable.js` entry is replaced, not kept alongside. **D-48 moves it once more, and to `kernel.js` rather than to `drag.js`**: it is the third rung of §11's disclosure ladder, and an ordinary consumer never imports it — `sortable(root, config, …fragments)` returns a `SortableController` and calls `draggable()` for you. What stays on `drag.js` is the vocabulary **both** tiers read.
- **The config schema has exactly one identity, wherever it is declared.** The rule was written for the branded `SortableFeature` and **survives D-45 verbatim with its subject replaced** — it was always about the emitted declaration graph rather than about the brand:

  1. there is exactly **one** `SortableConfig` declaration in the whole emitted graph, and one declaration per installer slot type — never a structurally-equal duplicate per subpath;
  2. `sortable.js` and every public fragment subpath resolve to **that** declaration, so a fragment built by one subpath is assignable to the parameter another declares, and `AxisInstaller` from `sortable/y.js` means the same type as `SortableConfig['axis']` in `sortable.js` — ~~`Pick<SortableConfig, 'axis'>`~~, which is what `y()` returned before D-77 made it the installer itself (P18A-06);
  3. ~~the module that declares the **installer slot types** is **not** a declared package subpath, so `SortableInstaller`, `FeatureContext` and `SortableContribution` stay unnameable and the slot values stay unconstructible from outside.~~ **Retracted by D-61.** That module **is** a declared subpath — `sortable/feature.js` — and the three types are nameable, because authoring an installer is a supported act at the middle tier. What survives of the clause is clauses 1 and 2's requirement applied to it: there is exactly **one** declaration of each installer slot type in the emitted graph, so an installer written against `sortable/feature.js` is assignable to the slot `sortable.js` declares.

  ~~Clause 3 is where the opacity now lives. Under D-30 the brand sat on the record; under D-45 the record is a plain public interface and the unreachable declaration is the **function type its capability slots are typed with**. The mechanism is unchanged — an internal `sortable/feature` module every subpath imports type-only and no `exports` entry names — and so is the failure it prevents.~~

  **Opacity is now a property of the entry, not of the declaration graph** (D-61). The module is the same module; what changed is that `exports` names it. An ordinary consumer who imports only `sortable.js` can still hold an installer, move it, drop it and not construct one — the opacity D-45 describes is exactly as real for them as it was. A middle-tier author imports one more subpath and can construct one, which is the point. **The mechanism that used to enforce the boundary is gone and nothing replaces it**, because there is nothing left to enforce: the boundary is now a documentation and versioning boundary, and the honest statement is that a consumer who wants past it types one more import rather than defeating anything.

  An earlier draft of this rule named the file instead ("declared in `sortable.js`, re-exported nowhere"), which is the wrong constraint and, taken literally, the worse one: putting the declaration in the entry module makes every subpath's declaration import from `../sortable.js` and drag the whole sortable entry graph into a subpath that otherwise needs one line. What the rule exists to prevent is two identities, and identity is what it should say.

  **`SortableConfig` itself is the exception to clause 3, and that is the whole of D-45**: it _is_ a declared subpath's export, because a consumer has to author it.

- **Every runtime entry above becomes a `files.json` entry.** Shared contract _types_ are imported type-only, so they contribute no runtime edge, but they still need the declaration files to resolve — which is why the identity question above is not cosmetic.

**D-48's three roots make the tree-shaking claim easier to state, not harder** — and Revision 2.1 leaves the claim untouched while changing what two of the roots contain. A consumer importing only `sortable.js` must pull no `draggable()` **entry**, and that is now a file-level fact rather than an argument about what a bundler kept: `draggable` lives in `kernel.js` and nothing on the ordinary path names it. What such a consumer does pull is the kernel's _implementation_, which it always pulled — `sortable()` calls `draggable()` internally instead of being handed to it, so D-48 moves the **call**, not the graph. `drag.js` contributes **one class and two erased types** (D-64 — it contributed the `FAILURE_*` constants until the stages moved to the kernel tier); `kernel.js` now carries those constants beside `draggable`, and its type column is erased entirely. **`sortable/feature.js` contributes nothing at runtime by construction** (D-61), so it cannot move the number in either direction. `tests/packaging.node.test.ts` asserts the entry-level absence the same way it asserts the axis absences, in both directions.

**D-56 strengthens the F-26 argument rather than weakening it.** Deleting three subpaths looks like it should cost the isolation claim something, and it does the opposite: every subpath that remains carries runtime machinery a composition either imports or does not. The three that went carried none — a subpath whose entire content is an object literal cannot demonstrate absence, because there was nothing present to be absent. Seven entries where every one is load-bearing is a better fixture than nine where three measure zero. **D-61 adds an eighth that measures zero, and it is not the same case.** `sortable/feature.js` has no runtime content at all — it is a types-only address for the middle tier, and it makes no isolation claim to be checked. The three D-56 deleted were _runtime_ entries whose runtime content was an object literal; they claimed a measurement and delivered none. An entry that measures nothing and says so costs the fixture nothing.

**What D-48 also changes is the ladder's second rung.** `sortable/y.js` and its siblings are no longer "feature subpaths a `draggable()` composition reaches for"; they are config utilities for a call that already returns a controller. **D-61 then adds the other half of that rung**: the built-in fragments are what a consumer _uses_, `sortable/feature.js` is what an extension author _writes against_, and the rung is both — which is what the owner's ladder says and what Revision 2 read as one thing. Nothing about their contents or their measurement changes — but the sentence at the top of this section, that a separate subpath per optional capability is what makes the measurement honest, is now the _only_ reason they are separate, since ergonomics no longer needs them to be.

The exact import statements for each measurement fixture are part of M-3, not of this table.

### The public/internal boundary

The brief asks for this and the earlier draft did not state it.

**The boundary is now three tiers over three entry roots** (D-48, D-61 — it read "two tiers" until Revision 2.1 restored the middle rung as a published surface). The ladder has three rungs — `sortable()`/`freeDrag()`, the **config and feature utilities**, `@ydinjs/drag/kernel` — so "internal" has to say _to which tier_, or two entries publish types this section calls unexported. The roots do not line up one-per-tier: `kernel.js` is the kernel tier, `sortable.js` and most of `sortable/*` are the ordinary tier, **`sortable/feature.js` is the middle tier**, and **`drag.js` spans all three** — it is the vocabulary every tier hands out and none owns.

**Internal and unstable at every tier** — not exported, and free to change without notice: `SortableSlots`, **`Behavior` and its brander** (D-55), and the outcome/recovery constants. ~~the phase/lift/outcome/recovery constants~~ — **D-68 publishes the phase and lift constants at the kernel tier**; the outcome and recovery constants are the sortable behavior's own and stay here. Also internal, and named because the rule that keeps them here is worth stating once: the seam driver (`SeamOutcome`, `SEAM_*`, `SeamContext`, `SeamDriver`, `ArmOutcome`), the full `Lifetime`, the frame helpers, the lift acquisition, the reporter, the invalidation utilities and the protocol event names — **the kernel never hands one of them to a behavior and never accepts one from it**, which is the discriminating test.

**Published at the middle tier** (D-61): `SortableInstaller`, `FeatureContext`, `SortableContribution`, `InsertionGeometry`, `DisplacementHook`, and the landing seam types D-63 moved here. All five were on the list above until Revision 2.1, and moving them is the whole of D-61's cost: **they acquire a versioning promise.** By this table's closure rule, publishing them publishes what they structurally name, so the minimum middle-tier surface is whatever `SortableContribution` and `FeatureContext` reach — narrowing it means narrowing those declarations, exactly as D-48 records for `BehaviorSpec`. `SortableSlots` stays internal and is the reason the closure stops where it does: an installer _returns_ a contribution and never sees the flattened record the behavior builds from it.

**Internal to the ordinary tier, published at the kernel tier** (D-48, **enumerated by D-68**): `BehaviorSpec`, `KernelHost`, `BehaviorFactory`, `BehaviorInstall`, `Transition`, `ReleaseTransition`, `SettlementTransition`, `ActionTransition`, `CommandAdmission`, `AdmissionSubject`, `SettlementInput`, `SeamRejection`, `ActivationScope`, `SettlementScope`, `LifetimeScope`, `Disposer`, `Draft`, `Frame`, `KernelFrame`, `OperationIdentity`, `FramePartOf`, `VisualLiftSession`, `LiftMode`, `Phase`, `OffsetBox`, `PreparedSettlement`, `ResolutionCommand`, `CancelStage`, `LandingStart`, `LandingContext`, `LandingHandle`, `FailureStage`. A `sortable.js` consumer can name none of them; a `@ydinjs/drag/kernel` consumer must be able to name enough of them to return `{ spec, controller }` from D-47's factory. **Two names were on this list and are struck**: `SeamOutcome` and `ArmOutcome` are driver-internal, in no public closure, and were listed by assumption rather than by derivation — which is exactly the failure mode D-68's rule exists to stop. `CancelStage` and the three landing types **are** on it now and are re-exported at the tiers that also need them.

**That list is a transitive closure, and it is the tension D-48 leaves behind.** §11 asks for the kernel vocabulary to be _minimized_, and the rule this table has run on since phase 9 is _export what a public type structurally depends on_. Publishing `BehaviorSpec` therefore publishes the seam types it names, and those name theirs. The minimum is not a matter of taste — it is whatever `BehaviorSpec`'s declaration reaches — so minimizing the kernel surface means **narrowing `BehaviorSpec` itself**, not choosing fewer names to export. 01 and 02 own that enumeration; this document only records that the two goals meet here and that the closure, not the wish, decides.

**Public and stable at the ordinary tier:** everything in the `sortable.js` and the built-in `sortable/*` rows above — including `SortableConfig`, which Revision 2 adds — plus `drag.js` in full: `DraggableError`, `DraggableErrorCode`, `Point`, `DOMRealm`. `CancelStage` and `AT_PROPOSAL`/`AT_CONSUMER` **remain exported from `sortable.js`, where they always were, and their declaration site moves to the kernel tier** (D-68): the kernel produces the stage on a `canceled` settlement input and a behavior writes one into D-66's fallback, so a kernel-tier author had no route to them except an import from the sortable. Nothing changes for an ordinary consumer — same specifier, same type.

**`FailureStage` and the `FAILURE_*` constants are no longer on that list (D-64).** The struck reasoning was that a consumer receiving `onError` has to discriminate them; it now receives a coarse `code` instead, so it discriminates that. **The rule is unchanged and its input changed**: export what a public type structurally depends on — and the ordinary tier's public types no longer depend on a stage. Note what this costs, since the earlier text argued the other way with the same rule: a consumer loses the ability to distinguish a placeholder-move failure from a renderer-write failure, which was real telemetry. The owner's judgement is that it was granular on the pipeline axis and silent on the fault-attribution axis, and that only the second is actionable. **A consumer who genuinely needs the finer signal has no supported route to it** — that is the cost, stated rather than absorbed, and its falsifier is in 00 §What would falsify this model.

`CommandAdmission` (D-32) is on the internal side deliberately, and it is worth saying why, because it is the one revision member a consumer might expect to see. A behavior declares which event types the kernel binds; a _consumer_ does not. Keyboard reordering reaches the public surface in Phase 16 as behavior capability and, where it needs configuring at all, as an ordinary config key — never as an event-type list a consumer hands the kernel. The same argument keeps the axis features out of the keyboard path (ledger L-4).

~~`ResolutionOptions` (D-33) is on the **public** side and is the only type the revision adds there.~~ **That sentence is about Phase 14's revision, and Revision 2 deletes its subject** (D-41). It is worth keeping the distinction visible, because the two revisions are one row apart in the ledger and the sentence reads as if it were about the current one: Phase 14 added exactly one public type, `ResolutionOptions`; Revision 2 **removes** it, removes `SortableFeature`, and adds `SortableConfig` — a different type, added for a different reason. The rule both invoke is the same and is unchanged: export what a public type structurally depends on, which already made `FailureStage`, `DOMRealm`, `Point`, `PlaceholderFactory` and `CollectionSnapshot` public.

**The settlement primitives stay internal, and they now stay internal for a stronger reason.** `SettlementScope`, `PreparedSettlement` and the settlement attempt were unreachable through D-33's protocol; after D-41 there is no protocol to be unreachable through. The consumer's half of the authored-presentation problem is now the consumer's own `await`.

~~`Behavior` remains public **as an opaque value type**: nameable and passable, not constructible.~~ **`Behavior<Controller>` is retired from the public surface entirely (D-55).** D-45 retracted the brand for the feature value; D-55 retires the other one, and for a different reason — not incoherence but **absence of a producer**. `sortable()` and `freeDrag()` return controllers and `draggable()` takes a factory, so nothing at either tier mints a behavior value a consumer could hold. An exported opaque type nothing constructs is a boundary marker with no boundary to mark, which is the same defect D-45 removed one row up. The construction types survive internally; the kernel tier publishes `BehaviorFactory` and the seam vocabulary, not a packaged behavior. If a later behavior genuinely needs to be _packaged without being installed_, that is a new capability with a new justification rather than a survival of this one.

#### Fragments are public, installers are opaque

Two earlier attempts at this boundary were both incoherent, in opposite directions.

The first said "only built-ins may author" while exporting nothing to enforce it — and TypeScript accepts a structurally matching function literal whether or not a type name is exported (review 5, §12). The second admitted that and exported `SortableFeature` as _public and stable_ while keeping `FeatureContext` and `SortableContribution` _internal and unstable_. That is not a third state, it is a contradiction (review 6, §11): `SortableFeature` was **defined** as a function between the two unstable types, so any change to either changed the public type's assignability and its emitted declaration.

D-30's answer was to close the world with a brand:

```ts
// withdrawn by D-45
declare const FEATURE_BRAND: unique symbol;
type SortableFeature = Readonly<{ [FEATURE_BRAND]: true }>;
```

~~A consumer can hold a feature, name its type, and pass it to `sortable()`. It cannot construct one, because the brand is unexported. The authoring types stay genuinely internal, third-party authoring is _prevented_ rather than discouraged, and the closed world the rest of this document depends on is real.~~

**The brand is withdrawn (D-45), and the argument that withdraws it is D-30's own.** D-30 rejected "a public stable type whose full structure is internal and unstable" as not a coherent third state, and it was right about the type it had — a **function** between two unstable types has no stable part to publish. It was wrong that no third state exists. There is one, and the redesign found it by splitting the value:

|  | Public and stable | Opaque |
| --- | --- | --- |
| **What** | `SortableConfig` — the slot names, their kinds, their merge rules, their defaults | the installer value each capability slot carries |
| **Why it can be** | a record of named slots has a stable part: the names | it is still a function between `FeatureContext` and `SortableContribution`, both internal |
| **What a consumer may do** | author a literal, spread a preset, override a slot, filter `plugins`, lift `weirdThing().axis` out of a helper | hold one, move one, drop one — never construct one |

**Third-party authoring is now _partitioned_ rather than prevented**, and the sentence this document used to carry — "third-party authoring is _prevented_ rather than discouraged" — is retracted with the brand. Authoring a **config** is ordinary object-literal syntax and is supported from `sortable.js`. ~~Authoring an **installer** still requires naming `SortableInstaller`, `FeatureContext` and `SortableContribution`, none of which any subpath exports; a consumer who needs that drops to `@ydinjs/drag/kernel` and writes a behavior (D-47, D-48).~~ **Authoring an **installer** is supported too, from `sortable/feature.js` (D-61)** — the struck sentence is the drift the owner caught, and it is wrong in the direction that matters most: it sends someone who wants a different axis rule to the tier where they must reimplement the collection model, the placeholder, the release proposal and the landing protocol to get one. **The partition is now between _tiers_, not between supported and unsupported acts.** What the brand actually bought, in retrospect, was preventing a consumer from writing `{}` where a feature was expected — a diagnostic, not a boundary.

**The cost is stated rather than absorbed: the config schema is now a semver surface — and D-61 adds the installer types to it.** Adding a required slot, renaming one, or changing a slot's merge kind is a breaking change to a type consumers author by hand; adding a member to `SortableContribution`, or changing what `FeatureContext` offers, is now a breaking change to a type _extension authors_ implement against. The second obligation is the heavier one, because a contribution is implemented rather than merely written, and it is the price of the rung. That is a real obligation D-30 did not have, and it is accepted because the alternative was the incoherent state — and because the slot names were already the vocabulary every example in these documents used.

The same leakage was fixed in three other places by **exporting what the public type structurally depends on** rather than pretending it is internal: `FailureStage` (public — `onError` receives it and a consumer must switch on it), `DOMRealm` (public — `LandingContext` carries it, and a custom runner needs it), and `Point` (already public). ~~All three stay public under Revision 2.~~ **Revision 2.1 moves two of the three without touching the rule.** `FailureStage` is no longer received by `onError`, so its reason to be ordinary-tier public is gone and it is published at the kernel tier instead (D-64). `DOMRealm`'s reason named a _custom runner_, which no longer exists at the ordinary tier (D-63) — it stays public on `drag.js` because `LandingContext` still carries it and `sortable/feature.js` still names it. `Point` is untouched. **The rule survived; two of its three worked examples did not**, which is a fair measure of how much of this surface was justified by a runner nobody had built.

~~If **installer** authoring is ever supported, that is a deliberate decision to export `SortableInstaller`, `FeatureContext` and `SortableContribution` under a versioning promise — not a side effect of a type becoming reachable.~~ **It is supported, and D-61 is that deliberate decision** — taken by the owner in review 3 §1, not newly made here. The conditional's substance holds exactly as written: the three types are exported **under a versioning promise**, from a named subpath, because someone decided to publish them and not because a type became reachable. D-45 moves the line; D-61 moves it again, deliberately, one rung further out.

### What isolation cannot shake

Measure the fixed cost too, and compare it against a hand-written, non-composed sortable — feature-matched against the composed one, whichever axis it composes — so the bundle claim is evidence rather than import-graph intuition:

- every optional key in `SortableContribution`;
- every assembler property read and `claim` branch;
- the nullable slot fields and their null checks;
- the three always-present pipeline arrays.

~~That plumbing may well be entirely acceptable. It has not been weighed.~~ **Weighed 2026-08-22, and it is acceptable** — [bundle-structure.md](../bundle-structure.md) §What composition costs. The four items above cost **283 B, 2.4% of `complete`**, against a hand-written feature-matched baseline, and the figure has been taken three times across two feature additions — 266 B, 289 B, 283 B. **The stability is the answer, not the size**: an overhead that grew with the feature count would be an argument against the composition model, and this one does not. This section closes.

## Policy updates

The set of installed capabilities is immutable after controller creation, and D-45 does not soften that: the config is merged and the installers run once, so mutating the object a consumer passed changes nothing afterwards. A capability may accept live policy updates only if it deliberately exposes them, and the only supported way is for the _behavior_ to add a controller method — an installer does not contribute one.

This is a deliberate narrowing of probe 1, which allowed feature-contributed controller methods. No first-iteration feature needs it, and admitting it would put an unbounded string-keyed record into the contribution type. Recorded as an extension point, not built.