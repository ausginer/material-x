/**
 * The flattener's diagnostic codes. Every code but `trait-member-conflict` is
 * an error that fails the build, because a composition has no runtime form to
 * fall back on. Codes are stable strings, so fixtures and tools can assert on
 * them.
 */
export const CODE = {
  /**
   * A composition isn't a module-scope
   * `const X: Composed<B, [...]> = compose(B)` extended by exactly one class.
   */
  COMPOSITION_SHAPE: 'composition-shape',
  /**
   * A list element isn't `typeof T`, a tuple alias of those or a spread of
   * one, or the expansion has a cycle; or the base's chain already composes a
   * trait with a constructor or copied private members, or can't be read
   * when the list has such a trait.
   */
  TRAIT_LIST: 'trait-list',
  /**
   * A trait isn't a class decorated `@trait`, or, in built JavaScript, with
   * the generated method.
   */
  TRAIT_UNRESOLVED: 'trait-unresolved',
  /** A trait's member is outside the subset that can be copied. */
  TRAIT_MEMBER: 'trait-member',
  /** A trait declares a public instance field. */
  TRAIT_FIELD: 'trait-field',
  /** The component's module or class binds a name a copied member reads. */
  TRAIT_BINDING_SHADOWED: 'trait-binding-shadowed',
  /** A member's text means something else in the consumer's language. */
  TRAIT_SOURCE_LANGUAGE: 'trait-source-language',
  /** A later trait's lone getter or setter over an earlier trait's pair. */
  TRAIT_ACCESSOR_HALF: 'trait-accessor-half',
  /** A static's declared kind can't be merged. */
  STATIC_KIND: 'static-kind',
  /** Two contributors give one static key different kinds. */
  STATIC_KIND_MISMATCH: 'static-kind-mismatch',
  /** The component declares one half of a trait's accessor pair. */
  CLASS_ACCESSOR_HALF: 'class-accessor-half',
  /** `super.k` in the component, for a key that a trait supplies. */
  CLASS_SUPER_TRAIT_MEMBER: 'class-super-trait-member',
  /** `super[k]` in the component. */
  CLASS_COMPUTED_SUPER: 'class-computed-super',
  /**
   * The list has a trait with a constructor, and the component's constructor
   * doesn't have exactly one `super(…)` call, as the whole expression of a
   * statement at its top level.
   */
  COMPONENT_CONSTRUCTOR: 'component-constructor',
  /**
   * The list has a trait with a constructor, and an instance field
   * initializer of the component references `this` or `super`.
   */
  COMPONENT_FIELD: 'component-field',
  /**
   * `trait` is used other than as the first decorator of a module-scope class
   * declaration whose only other is `@attributes(TABLE)`: called, on another
   * node, beside another decorator, or as a value.
   */
  TRAIT_DECORATOR: 'trait-decorator',
  /** Layer (b): the attribute table can't be read or doesn't match. */
  ATTRIBUTE_TABLE: 'attribute-table',
  /** Layer (b): an `accessor` line isn't `accessor name!: T`. */
  ATTRIBUTE_ACCESSOR: 'attribute-accessor',
  /**
   * Layer (b): `attributes` is used other than as `@attributes(TABLE)`, the
   * second decorator of a module-scope class declaration whose first is
   * `@trait`.
   */
  ATTRIBUTES_DECORATOR: 'attributes-decorator',
  /** Two traits supply one key that doesn't merge; the last trait wins. */
  TRAIT_MEMBER_CONFLICT: 'trait-member-conflict',
} as const;

export type Code = (typeof CODE)[keyof typeof CODE];

/** A build error, with the offset in the module it reports. */
export class FlattenerError extends Error {
  readonly code: Code;
  /** Offset in the module's source, when known. */
  readonly pos: number | undefined;

  constructor(code: Code, message: string, pos?: number) {
    super(message);
    this.name = 'FlattenerError';
    this.code = code;
    this.pos = pos;
  }
}

/** Throws a {@link FlattenerError}. */
export function fail(code: Code, message: string, pos?: number): never {
  throw new FlattenerError(code, message, pos);
}

/** A build warning, with the offset in the module it reports. */
export type FlattenerWarning = Readonly<{
  code: typeof CODE.TRAIT_MEMBER_CONFLICT;
  message: string;
  pos: number;
}>;

/** The text a diagnostic prints. */
export function diagnosticText(code: Code, message: string): string {
  return `trait-flattener (${code}): ${message}`;
}
