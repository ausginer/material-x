/**
 * What the event landed on (D-46).
 *
 * The governing rule is one sentence — **ingress must not consume interaction
 * it does not use** — and this module answers the half of it that admission
 * owns: *may a member return non-null at all*. The other half, *when* the
 * pointer path prevents, is D-54 and lives in the kernel's threshold crossing.
 * Reading either as the whole policy leaves half of probe E unfixed
 * (contract 02 §Input policy).
 *
 * It is a **list, not a heuristic**, and deliberately so: a consumer has to be
 * able to document which presses drag and which do not, and probe E's R-5 table
 * is what an unstateable rule looks like from the outside.
 *
 * It lives in the kernel tier rather than in the sortable's spec because the
 * policy is the *default admission* policy for every behavior — free drag
 * implements `admit` too — and because contract 02 states it as the reason the
 * question cannot be left to each behavior: the consequence of returning
 * non-null is a browser effect the behavior does not perform and cannot see.
 */

/**
 * The pointer table, verbatim from contract 02 §Pointer admission declines on
 * interactive and editable descendants, minus the editing row — inherited
 * editability is not expressible as a selector, so `isContentEditable` is read
 * separately below.
 *
 * `disabled` members are **not** excluded. A disabled control still owns its
 * press for focus and selection purposes, and treating "disabled" as
 * "draggable" would put the most surprising case on the least examined path.
 */
export const POINTER_OWNERS =
  'input,textarea,select,option,button,label,output,progress,meter,a[href],area[href],summary,audio[controls],video[controls],[data-drag-ignore]';

/**
 * The keyboard table, which is **narrower than the pointer one and not a
 * simplification of it**. The question a command asks is whether the target
 * owns *this key*, and the arrow keys are owned by a caret, a listbox, a radio
 * group, a range thumb and a media scrubber — not by a `<button>`, an
 * `<a href>` or a `<summary>`, none of which navigate by arrow. Sharing the
 * pointer list would decline them too, silently removing keyboard reordering
 * from a focused control inside a row: a false decline, on exactly the
 * accessibility path D-46 exists to protect.
 *
 * `input` covers radio and range without naming them; the opt-out attribute is
 * in both lists because it is a consumer statement about the region, not about
 * a key.
 */
export const COMMAND_OWNERS =
  'input,textarea,select,audio[controls],video[controls],[data-drag-ignore]';

/**
 * One hop of the walk. `composedPath()` yields documents, shadow roots and the
 * window as well as elements, so the capability is tested rather than the type:
 * `realm.isElement` would be the heavier answer to a question `matches` already
 * answers by existing.
 */
const owns = (node: EventTarget, selector: string): boolean => {
  const element = node as Element & { isContentEditable?: boolean };

  return (
    typeof element.matches === 'function' &&
    (element.isContentEditable === true || element.matches(selector))
  );
};

/**
 * Whether any hop **strictly before** `subject` owns the interaction.
 *
 * The subject itself is exempt, which is D-50: where a `handle` slot resolves
 * the pressed element to a handle that *is* one of the listed members, the
 * press admits — the consumer scoped dragging to that interaction on purpose.
 * The list is a default, not a prohibition, and passing the **resolved
 * subject's** index rather than the item's is what makes a handle narrow the
 * path the test walks. `handle()` therefore stops being the only
 * descendant-scoping mechanism and becomes the override for a policy that now
 * exists by default.
 *
 * **This costs nothing on the admitted path.** The walk is the `composedPath()`
 * traversal the behavior already performs to find its item; the test is one
 * `matches()` per hop on a path that terminates at the subject.
 */
export function pathOwnsInteraction(
  path: readonly EventTarget[],
  subject: number,
  owners: string,
): boolean {
  for (let i = 0; i < subject; i += 1) {
    if (owns(path[i]!, owners)) {
      return true;
    }
  }

  return false;
}
