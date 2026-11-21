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
export const TRAIT_IR_VERSION = 4;

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

/**
 * A private name in copied source, as `[start, end)` offsets of `#name`. The
 * component renames it per trait.
 */
export type PrivateNameIR = Readonly<{
  /** The name without `#`. */
  name: string;
  start: number;
  end: number;
}>;

/** Origin source that the component copies, and every name in it it rewrites. */
export type CopiedSourceIR = Readonly<{
  /** The origin source: a member or a field with its modifiers, or a body. */
  source: string;
  /** Origin module bindings the source reads, in first-reference order. */
  links: readonly MemberLinkIR[];
  /** Names the source reads that no origin scope binds: globals. */
  globals: readonly string[];
  /** Each private name in the source, its declaring key included. */
  privateNames: readonly PrivateNameIR[];
}>;

/** A method, getter or setter, copied as its origin source. */
export type MemberIR = CopiedSourceIR &
  Readonly<{
    /** The key; for a private member, its name without `#`. */
    key: string;
    kind: 'method' | 'get' | 'set';
    static: boolean;
    /** The key is a private name, which the layer rules don't see. */
    private: boolean;
  }>;

/**
 * A copied private instance field: one with an initializer, or one that a
 * member or the constructor references.
 */
export type FieldIR = CopiedSourceIR &
  Readonly<{
    /** The name without `#`. */
    name: string;
  }>;

/**
 * A trait's `constructor() { super(); … }`, whose body the component's
 * constructor runs after its `super(…)`. The source is the body, braces
 * included.
 */
export type ConstructorIR = CopiedSourceIR &
  Readonly<{
    /** The `super();` statement, as `[start, end)` in the source, dropped. */
    superCall: readonly [number, number];
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
  /**
   * Methods and accessors, instance and static, private ones included, in
   * declaration order.
   */
  members: readonly MemberIR[];
  /** Static value fields, in declaration order. */
  statics: readonly StaticIR[];
  /** Copied private instance fields, in declaration order. */
  fields: readonly FieldIR[];
  /** The constructor's body, or `null` when the trait has none. */
  constructorBody: ConstructorIR | null;
  /**
   * What each private name the trait declares is renamed with in the
   * component: `#<name><suffix>`. It is derived from the specifier the
   * component reaches the trait's module through and the class name.
   */
  privateSuffix: string;
}>;

/** A resolved composition, ready for lowering. */
export type CompositionIR = Readonly<{
  version: typeof TRAIT_IR_VERSION;
  /** Traits in list order, supertraits expanded, each first occurrence kept. */
  traits: readonly TraitIR[];
}>;
