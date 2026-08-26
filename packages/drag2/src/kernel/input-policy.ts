/**
 * What the event landed on (D-46, D-129).
 *
 * The governing rule is one sentence — **ingress must not consume interaction
 * it does not use** — and this module answers the half of it that admission
 * owns: *may a member return non-null at all*. The other half, *when* the
 * pointer path prevents, is D-54 and lives in the kernel's threshold crossing.
 * Reading either as the whole policy leaves half of probe E unfixed
 * (contract 02 §Input policy).
 *
 * **The answer is one attribute, and it is the consumer's** (D-129). A
 * descendant is draggable by default; a region that owns its own interaction is
 * marked `data-drag-ignore` by the consumer, and nothing else is inferred.
 * ~~Two selector tables, one per ingress, plus an `isContentEditable`
 * capability test.~~ The library no longer decides which element types own a
 * press or a key: an inference the consumer cannot see is one they cannot
 * document, and the same table that declines a `<button>` correctly on the
 * pointer path declines it wrongly on the keyboard path.
 *
 * It lives in the kernel tier rather than in the sortable's spec because the
 * policy is the *default admission* policy for every behavior — free drag
 * implements `admit` too — and because contract 02 states it as the reason the
 * question cannot be left to each behavior: the consequence of returning
 * non-null is a browser effect the behavior does not perform and cannot see.
 */

/**
 * Whether any hop **strictly before** `subject` is marked `data-drag-ignore`.
 *
 * The subject itself is exempt, which is D-50: where a `handle` slot resolves
 * the pressed element to a handle, the press admits — even a handle that is
 * itself inside a marked region, because the consumer scoped dragging to that
 * interaction on purpose. Passing the **resolved subject's** index rather than
 * the item's is what makes a handle narrow the path the scan walks.
 *
 * `composedPath()` yields documents, shadow roots and the window as well as
 * elements, so `matches` is reached optionally rather than asserted: the
 * capability test *is* the type test, and `realm.isElement` would be the
 * heavier answer to a question `?.` already answers.
 *
 * **This costs nothing on the admitted path.** The walk is the `composedPath()`
 * traversal the behavior already performs to find its item; the test is one
 * `matches()` per hop on a path that terminates at the subject.
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
