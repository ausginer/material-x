// The reusable coordinate buffer, declared **where declaration emit cannot
// publish it**. `type-fest` is a `devDependency`, and emit is total per module:
// an `export type` naming `Writable` in `kernel/types.ts` would put a
// `type-fest` import into the tarball's type surface of a package that does not
// depend on it. This module is type-only and reachable from no public
// declaration, so the declaration prune removes it — which is what makes the
// name safe rather than the two existing uses' accident of sitting on local
// `const`s.
//
// A module header rather than a doc block, for the reason `kernel/types.ts`
// states.

import type { Writable } from 'type-fest';
import type { Point } from './types.ts';

/**
 * A {@link Point} a single owner writes in place and hands out **borrowed**.
 *
 * It is the return type of an `anchorTarget` implementation: the kernel reads
 * both fields immediately and retains nothing, so one buffer per controller
 * serves every settlement arm. Nothing may depend on what it holds between
 * calls — it is a return buffer, not state.
 */
export type PointCache = Writable<Point>;
