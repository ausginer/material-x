/**
 * The free-drag behavior action tags.
 *
 * **There is no runtime object here any more** (D-149). What the module used to
 * declare was `host`, `slots` and three per-operation references, and the spec
 * destructured the first two on its own first line while three siblings of the
 * remaining three were already spec locals. Closure-local state satisfies H-2
 * and D-4 more literally than a named container does — nothing outside the spec
 * can name it, because there is nothing to name — so the fields moved to the
 * closure that already held their siblings and the container went.
 *
 * The tags stay because they are not per-operation state: `arm()` validates
 * them through `config.actionTags` and `dispatch` bounds-checks one, so the
 * controller and the spec both need the same two constants.
 */

/** Behavior-local action tags; the kernel offsets them. */
export const TAG_POLICY = 0;
export const TAG_POSITION = 1;
export const FREE_DRAG_ACTION_TAGS = 2;
