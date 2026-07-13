/**
 * Stable diagnostic reason codes for the trait flattener.
 *
 * Unsupported sites warn and retain the runtime composition; malformed plugin
 * configuration and internal invariant failures are build errors. Codes are
 * stable strings so tooling and fixtures can assert on them.
 */
export const REASON = {
  /** The `impl` intermediary is exported, instantiated, or otherwise escapes. */
  IMPL_ESCAPES: 'impl-escapes',
  /** The `impl` intermediary is consumed by more than one class. */
  IMPL_MULTIPLE_CONSUMERS: 'impl-multiple-consumers',
  /** Trait list is not a statically resolvable readonly array/tuple. */
  UNSUPPORTED_TRAIT_LIST: 'unsupported-trait-list',
  /** A trait in the list could not be resolved to a supported definition. */
  UNSUPPORTED_TRAIT: 'unsupported-trait',
  /** A trait definition is not module-scoped or not a direct `trait(...)` call. */
  UNSUPPORTED_TRAIT_DEFINITION: 'unsupported-trait-definition',
} as const;

export type Reason = (typeof REASON)[keyof typeof REASON];

/**
 * A bailout raised during analysis. Carries the location and a stable reason so
 * the adapter can emit a single warning per composition and make no edits.
 */
export class BailoutError extends Error {
  readonly reason: Reason;
  /** Composition name for the message, when known. */
  readonly composition: string | undefined;

  constructor(reason: Reason, composition: string | undefined, detail: string) {
    super(detail);
    this.name = 'BailoutError';
    this.reason = reason;
    this.composition = composition;
  }
}

/**
 * Raises a {@link BailoutError}. Thin helper so call sites read as guard
 * clauses.
 */
export function bail(
  reason: Reason,
  composition: string | undefined,
  detail: string,
): never {
  throw new BailoutError(reason, composition, detail);
}
