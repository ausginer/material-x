/**
 * The free-drag behavior action tags.
 *
 * These are not per-operation state: `arm()` validates them through
 * `config.actionTags` and `dispatch` bounds-checks one, so the controller and
 * the spec both need the same two constants. Per-operation state lives in the
 * spec's own closure, where nothing outside it can name it.
 */

/** Behavior-local action tags; the kernel offsets them. */
export const TAG_POLICY = 0;
export const TAG_POSITION = 1;
export const FREE_DRAG_ACTION_TAGS = 2;
