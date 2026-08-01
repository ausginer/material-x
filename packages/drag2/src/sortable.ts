/**
 * Public entrypoint for the sortable behavior.
 *
 * `sortable(items, ...features)` itself is phase 8a, and the rest of the public
 * type surface is phase 9. What exists here now is the one type every feature
 * subpath needs: `SortableFeature` is declared **here and re-exported nowhere
 * else**, so the shared type has one resolvable identity across the separate
 * declaration files rather than a structurally-equal duplicate per subpath.
 */
export type { SortableFeature } from './sortable/feature.ts';

/**
 * A **runtime** export as well as a type (contract 03 §The export topology this
 * requires). The documented consumer calls `ReorderResolution.accept(…)` and
 * `.reject(…)`, so listing it under types only would make every example in the
 * contract fail to run — and would leave this entry with no runtime code at
 * all, which the `exports` map's `default` condition promises a consumer it has.
 */
export { ReorderResolution } from './sortable/domain.ts';
