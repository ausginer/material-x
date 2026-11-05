// The reusable coordinate buffer, declared where declaration emit cannot
// publish it. `type-fest` is a `devDependency`, and emit covers a whole module:
// an `export type` naming `Writable` in `kernel/types.ts` would put a
// `type-fest` import into the published types of a package that does not depend
// on it. This module is type-only and no public declaration reaches it, so the
// declaration prune removes it. That makes the name safe, and the safety does
// not depend on the two existing uses happening to sit on local `const`s.
//
// A module header and not a doc block, for the reason `kernel/types.ts` states.

import type { Writable } from 'type-fest';
import type { Point } from './types.ts';

/**
 * A {@link Point} that a single owner writes in place and lends to its reader.
 *
 * It is the return type of an `anchorTarget` implementation. The kernel reads
 * both fields immediately and retains nothing, so one buffer per controller
 * serves every settlement arm. Nothing may depend on what the buffer holds
 * between calls: it is a return buffer, not state.
 */
export type PointCache = Writable<Point>;
