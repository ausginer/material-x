/**
 * What the event landed on.
 *
 * The governing rule is that an input path must not consume interaction it does
 * not use. This module answers the part of that rule that admission owns: may a
 * member return non-null at all. The other part, when the pointer path prevents
 * the default, is in the kernel's threshold crossing. Neither part is the
 * complete policy.
 *
 * The answer is one attribute, and the consumer owns it. A descendant is
 * draggable by default. The consumer marks a region that owns its own
 * interaction with `data-drag-ignore`, and nothing else is inferred. The
 * library does not decide which element types own a press or a key. It has no
 * selector table per input path and no `isContentEditable` capability test. A
 * consumer cannot document an inference they cannot see, and the same table
 * that correctly declines a `<button>` on the pointer path wrongly declines it
 * on the keyboard path.
 *
 * This module is in the kernel tier and not in the sortable's spec for two
 * reasons. The policy is the default admission policy for every behavior, and
 * free drag implements `admit` too. The question also cannot be left to each
 * behavior: the consequence of returning non-null is a browser effect that the
 * behavior does not perform and cannot see.
 */

/**
 * Whether any hop strictly before `subject` is marked `data-drag-ignore`.
 *
 * The subject itself is exempt. Where a `handle` slot resolves the pressed
 * element to a handle, the press admits, even for a handle inside a marked
 * region, because the consumer scoped dragging to that interaction. Passing the
 * resolved subject's index and not the item's makes a handle narrow the path
 * the scan walks.
 *
 * `composedPath()` yields documents, shadow roots and the window as well as
 * elements, so `matches` is called optionally and is not asserted. The
 * capability test is also the type test, and `realm.isElement` would be a
 * heavier answer to a question that `?.` already answers.
 *
 * This costs nothing on the admitted path. The walk is the `composedPath()`
 * traversal the behavior already performs to find its item, and the test is one
 * `matches()` per hop on a path that ends at the subject.
 */
export function pathOwnsInteraction(
  path: readonly EventTarget[],
  subject: number,
): boolean {
  for (let i = 0; i < subject; i += 1) {
    if ((path[i] as Element).matches?.('[data-drag-ignore]')) {
      return true;
    }
  }

  return false;
}
