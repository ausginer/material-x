/**
 * Trait intermediate representation.
 *
 * The IR is the boundary between the two analysis passes described in
 * `.agents/docs/trait-flattener-plugin.md`:
 *
 * 1. trait normalization resolves descriptor-based (and, later, supported
 *    class-based) traits into this common shape; and
 * 2. composition lowering consumes only the IR and never re-reads the original
 *    trait authoring form.
 *
 * The IR is versioned and JSON-serializable so it can be cached and linked
 * across modules. Semantic structure stays explicit — members, brands and
 * linked bindings are separate nodes rather than opaque source strings.
 */

/**
 * Bumped whenever the serialized shape changes. Persisted caches and snapshots
 * compare against this before trusting a stored IR.
 */
export const TRAIT_IR_VERSION = 1;

/**
 * Reference to a value that lives in some module and must be linked (imported)
 * by a flattened consumer rather than copied.
 *
 * Imported or already-exported values link directly through `exportName`. A
 * private module-scoped binding is linked through a synthetic build-only export
 * added to its origin module; `synthetic` records the local name the origin
 * declares so the origin transform and the consumer transform can agree on the
 * generated export name deterministically.
 */
export type BindingRef = Readonly<{
  /** Absolute id (resolved path) of the module that owns the binding. */
  module: string;
  /** Import specifier the consumer should use to reach `module`. */
  specifier: string;
  /** Export name to import; for synthetic links this is the generated name. */
  exportName: string;
  /**
   * When set, the binding is private in its origin and reached through a
   * build-only synthetic export. Holds the original local name.
   */
  synthetic?: string;
  /**
   * When true, the binding is already in the consumer module's scope (the trait
   * was defined there), so it is referenced by `exportName` directly with no
   * import emitted. `specifier` is empty in this case.
   */
  local?: boolean;
}>;

/**
 * A single converter-backed accessor contributed by a descriptor trait.
 */
export type DescriptorAccessorIR = Readonly<{
  /** Attribute / property key the accessor is installed under. */
  key: string;
  /** Linked converter value (e.g. `CHECKABLE_ATTRS.checked`). */
  converter: BindingRef;
  /** Member path to index on `converter` (e.g. `['checked']`). */
  converterPath: readonly string[];
}>;

/**
 * Normalized descriptor trait: a declarative specialization created by
 * `@ydinjs/core/traits/traits`.
 */
export type DescriptorTraitIR = Readonly<{
  kind: 'descriptor';
  /** Human-readable trait name, for diagnostics only. */
  name: string;
  /** Linked brand symbol installed on the prototype. */
  brand: BindingRef;
  /** Observed attributes contributed, in declaration order. */
  observedAttributes: readonly string[];
  /** Converter-backed accessors, in declaration order. */
  accessors: readonly DescriptorAccessorIR[];
}>;

/**
 * A normalized trait. Only descriptor traits are supported today; the union is
 * kept open so the generic class-transformer subset can be added without
 * changing the lowering contract.
 */
export type TraitIR = DescriptorTraitIR;

/**
 * A fully-resolved composition ready for lowering. Produced by analysis +
 * normalization, consumed by lowering.
 */
export type CompositionIR = Readonly<{
  version: typeof TRAIT_IR_VERSION;
  /** Traits in declaration / prototype-layer order (innermost first). */
  traits: readonly TraitIR[];
}>;
