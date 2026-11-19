/**
 * Trait intermediate representation: what composition lowering reads, so it
 * never reads a trait's authoring form again. It is versioned and
 * JSON-serializable. Members, statics, brands and linked bindings are separate
 * nodes; a member's body is opaque text, and every name in it that crosses a
 * module boundary is a node of its own.
 */

/**
 * Bumped whenever the serialized shape changes. Persisted caches and snapshots
 * compare against this before trusting a stored IR.
 */
export const TRAIT_IR_VERSION = 3;

/**
 * A value that lives in some module and that the flattened component imports
 * rather than copies.
 *
 * Imported or exported values link directly through `exportName`. A private
 * module-scoped binding is linked through a build-only export that the
 * trait module's own transform adds, and `synthetic` holds its local name.
 */
export type BindingRef = Readonly<{
  /** Import specifier the consumer uses; empty when `local`. */
  specifier: string;
  /** The name to import, or the local name when `local`. */
  exportName: string;
  /** The binding's local name in its origin, for a build-only export. */
  synthetic?: string;
  /** The binding is in the consumer module's own scope, with no import. */
  local?: boolean;
}>;

/** A name that a member reads from its origin module, linked into the consumer. */
export type MemberLinkIR = Readonly<{
  /** The name the member's source uses. */
  name: string;
  ref: BindingRef;
  /**
   * Each reference, as `[start, end)` offsets in the member's source. A
   * shorthand property, `{ name }`, is rewritten as `name: <link>`.
   */
  occurrences: ReadonlyArray<
    Readonly<{ start: number; end: number; shorthand: boolean }>
  >;
}>;

/** A method, getter or setter, copied as its origin source. */
export type MemberIR = Readonly<{
  key: string;
  kind: 'method' | 'get' | 'set';
  static: boolean;
  /** The member's origin source, modifiers included. */
  source: string;
  /** Origin module bindings the member reads, in first-reference order. */
  links: readonly MemberLinkIR[];
  /** Names the member reads that no origin scope binds: globals. */
  globals: readonly string[];
}>;

/** How a static's values combine across the base, the traits and the component. */
export type StaticKind = 'array' | 'object' | 'simple';

/** A static value field of a trait, linked rather than copied. */
export type StaticIR = Readonly<{
  key: string;
  kind: StaticKind;
  /** The trait module's binding that holds the value. */
  value: BindingRef;
}>;

/** A normalized trait class. */
export type TraitIR = Readonly<{
  /** The trait class's name, for diagnostics. */
  name: string;
  /** The brand symbol installed on the component's prototype. */
  brand: BindingRef;
  /** Methods and accessors, instance and static, in declaration order. */
  members: readonly MemberIR[];
  /** Static value fields, in declaration order. */
  statics: readonly StaticIR[];
}>;

/** A resolved composition, ready for lowering. */
export type CompositionIR = Readonly<{
  version: typeof TRAIT_IR_VERSION;
  /** Traits in list order, supertraits expanded. */
  traits: readonly TraitIR[];
}>;
