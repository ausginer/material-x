/**
 * The data that a mutation file and a repository's config hold. A mutation file
 * is a TypeScript module whose default export is a {@link MutationFile}, with
 * no function in it:
 *
 * ```ts
 * import type { MutationFile } from '@ydinjs/mutator';
 *
 * export default {
 *   runs: [{ dir: 'packages/app', tests: ['tests/list'] }],
 *   engines: ['chromium'],
 *   mutations: [...],
 * } satisfies MutationFile;
 * ```
 *
 * Every path is relative to the repository's root.
 */

/**
 * Why a review runs the mutation in each engine: it removes the mechanism of a
 * required property, it touches a mechanism that engines implement differently,
 * it is doubted (it survived, was called equivalent, or the reviewer doubts
 * it), or none of these.
 */
export type Group = 'mechanism' | 'engine' | 'doubted' | 'other';

/** Replaces `text`, which occurs exactly once in `file`, with `replacement`. */
export type Edit = Readonly<{
  file: string;
  text: string;
  replacement: string;
}>;

/** The rows of the test file `file` whose full name contains `row`. */
export type Selector = Readonly<{
  file: string;
  row: string;
}>;

/**
 * A prediction written before the run: every row that a selector covers fails,
 * or no row fails, for the reason given.
 */
export type Expectation =
  | Readonly<{ fails: readonly Selector[] }>
  | Readonly<{ survives: string }>;

/** An engine's own expectation, and why it differs from the mutation's. */
export type EngineExpectation = Readonly<{
  expect: Expectation;
  reason: string;
}>;

export type Mutation = Readonly<{
  /** Unique in the file. */
  name: string;
  group: Group;
  edits: readonly Edit[];
  expect: Expectation;
  /** The engines it runs in, when they aren't the file's. */
  engines?: readonly string[];
  byEngine?: Readonly<Record<string, EngineExpectation>>;
}>;

/** Vitest run in `dir` on `tests`, with `config` when it isn't Vitest's default. */
export type Run = Readonly<{
  dir: string;
  tests: readonly string[];
  config?: string;
}>;

export type MutationFile = Readonly<{
  runs: readonly Run[];
  engines: readonly string[];
  mutations: readonly Mutation[];
}>;

/** A program and its arguments, run in the copy's root. */
export type Command = readonly string[];

/**
 * How a repository's tests run. Its default place is `mutator.config.ts` at the
 * root of the checkout that runs the tool.
 */
export type Config = Readonly<{
  /** Makes a fresh copy at a commit ready to test, in order. */
  setup: readonly Command[];
  /** The environment that selects each engine for a Vitest run. */
  engines: Readonly<
    Record<string, Readonly<{ env: Readonly<Record<string, string>> }>>
  >;
  /**
   * For files that a test reads only after a build: a glob of the files, and
   * the command that rebuilds them. It runs after a matching edit is applied
   * and again after it is restored.
   */
  rebuilds?: ReadonlyArray<Readonly<{ files: string; command: Command }>>;
}>;
