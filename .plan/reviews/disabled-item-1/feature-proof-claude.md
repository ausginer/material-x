# `repo:RF-142` (#271) — feature proof

**Files were read at:** `9173a25a1`, the head of #278 (`material-x/disabled-item-1`), in slot `d`. The source is `754e2089f`, and `514c05f11` merges `main` at `8bed561de`. Core and drag are as built in the slot after the merge. Browsers: Playwright's Chromium, Firefox and WebKit, headless, on Linux, one at a time.

**Subject:** `RF-142` in [`00-index.md`](../../00-index.md) with its notes, `RD-61`'s properties 1 to 8, which replace its required property, the implementer's note, the diff `8bed561de...9173a25a1`, and #278's description.

**Verdict: `RD-61`'s eight properties hold in the three engines, with one exception at an edge (`reviewer-2`).** The implementer's evidence is sound, and the three departures are right. Two findings: `reviewer-1` is tier B (rows), and `reviewer-2` is tier A with a small reach.

## Scope

**Covered, on the elements from source, with real input** ([probe](probes/behaviour.browser.test.ts.txt), [runner](probes/run.mjs); [Chromium](checks/behaviour-chromium.txt), [Firefox](checks/behaviour-firefox.txt), [WebKit](checks/behaviour-webkit.txt)). 335 readings are as expected in each engine, for a button and a link item, with no handle, a `span`, a native button and an `mx-icon-button`, except where a property has one kind:

- **Property 1:** the four arrow keys, from a focused handle and from a link item's `focus()`-ed link, and ArrowDown from the page's button in the item, propose nothing, and the event isn't default-prevented. ArrowDown scrolls the page. A pointer drag by a handle in `lead`, in `trail`, by the surface and from the page's button proposes nothing and lifts nothing. An enabled item passes a disabled one by both keys. By pointer it passes two, and they are displaced. The page's own move of a disabled item works, and the handle stays disabled.
- **Property 2:** the handle's values from the start, from HTML, after it is disabled and after it is enabled, twice. The `mx-icon-button`'s inner button has `aria-disabled` and no description, and loses the first and regains the second. Each of the six values that a page writes stands, for a `span` and a button, written before the claim, while enabled, while disabled, and in the task of the change on either side, also after the handle leaves. The handle replaced while disabled, the item moved to `mx-list` and back, changed there, changed while disconnected, removed in the task of the change, and toggled in one task: right in each case, and nothing is left on a handle outside the list.
- **Property 3:** Tab and Shift+Tab skip the handle. Focus stays on each kind of handle when its item is disabled, the key does nothing, and after enabling the same focus moves the item. A press and `focus()` focus a disabled handle, as the cost says.
- **Property 4:** also after the item is enabled while disconnected. A description that the page gives the host stays.
- **Property 5:** disabled between the press and the lift, and during the drag: the drop proposes its move. Escape still cancels. Disabled in the handler of a key move and of a drop, committed 100 ms later: accepted and announced, no drag state, `popover` or placeholder is left. The next key is refused, and works again after enabling. The focus is kept, except on a button item without a handle, whose native button can't keep it.
- **Property 6:** the click of each kind of handle fires, and none matches `:disabled`.
- **Property 7:** the page's button in a disabled item takes focus, is clicked and isn't disabled. The dimming wasn't read again.
- **Property 8:** attributes, Tab, key and pointer are the same, with a handle and without, except in `reviewer-2`.

**Covered in Chromium alone:** the accessibility tree: a disabled handle is a disabled button with its name and no description. Touch by CDP, with a native button as the handle: disabled, the finger pans, which cancels the pointer, and nothing is lifted. Disabled after the touch and during the drag, the move is proposed.

**The rows and the witnesses:** the counts of the saved witnesses are in the note as read. 14 mutations of mine in Chromium ([reading](checks/mutations.txt), [runner](probes/mutations.mjs)): 10 fail rows for the right reason and 4 fail none (`reviewer-1`). The unmutated count, 193, is the implementer's. His own mutations weren't run again. CI on `9173a25a1` passes in each job.

**The texts:** the JSDoc of the list and of both items, and `list.mdx`, are the contract's words and agree with the behavior.

**Source bounds:** drag, `mx-list`, the items' code and `styles/sortable/tokens.ts` don't change. `isDisabled` is the only rule, for both users.

## The departures

- **`claim` takes `null`, and the owned names are a set: right.** It does what the candidate's release by name does. A disabled control releases only its description, and that is all that an interactive control ever owns, so this is the candidate's release of the whole control. It writes a tab index only when the value differs, where the candidate wrote it at each update. Deleting from the set during its iteration in `release` is defined. The life-cycle readings above found nothing left over.
- **The two rows beyond the list: right.** The pointer drag's row is the only one for property 5 during a drag, and fails with the operation ended. The semantics' row of `mx-list-item` is property 8's other half, and the mutation of the attribute fails it.
- **The link item's pointer rows in Firefox: not blind, and the cause is read.** A disabled link item's anchor has no `href` (`useDisableableLinkable`), so it isn't a link and has no native drag. In the same probe, in Firefox and Chromium: an enabled item with `href` gets `dragstart` and `pointercancel` and isn't lifted; an enabled one **without** `href` gets neither and is lifted; a disabled one gets neither and isn't lifted, which is the admission's rule. `RF-76` is of an anchor with an `href`, and stays true. An enabled item in those rows wouldn't discriminate in Firefox, nor in Chromium without a handle.

**Not covered:** Safari; real touch and pen; a screen reader; the accessibility tree of Firefox and WebKit; forced colors; `selected` with `disabled`; the sizes, beyond CI's `measurements` job; the dimming; the visual project; the older notes of `RF-128`, `RF-129` and `RF-135`, except where `RD-61` cites them. `.agents/docs/accessibility.md` isn't owed here.

## Findings

### reviewer-1

**Tier B.** Four parts of the contract's behavior have no row that fails without them.

- **Observed:** with each of these mutations, all 193 rows pass in Chromium ([reading](checks/mutations.txt)). My probe fails with each of them, so the mutations change behavior ([reading](checks/survivors.txt), [runner](probes/survivors.sh)):

  | Mutation | What a consumer gets | Property |
  | --- | --- | --- |
  | A lift whose item was disabled after the press is canceled | The drag that was admitted ends | 5, _"before the lift"_ |
  | `aria-disabled` isn't watched | A page's `aria-disabled` written on a disabled handle is removed on enabling | 2 |
  | The state's observer isn't disconnected on release | An item in `mx-list` writes `role`, `tabindex`, name and `touch-action` on its handle when `disabled` changes there | 2, and the item's release |
  | `unclaim` removes any `touch-action` | A page's `touch-action`, written after the claim, is removed on disabling | 2 |

- **The requirement:** `RD-61`'s properties 2 and 5. `RF-142`'s list of rows asks for the page's values to stand _"through both"_, without saying when they are written. The row writes them before the claim only. The list doesn't ask for the others.
- **The last mutation** is of a condition that `main` has too. Disabling is a new path to it.
- **The element:** correct in each case, in the three engines.
- **Required property:** a row fails when an admitted press isn't lifted because its item was disabled, when a value that the page writes after the claim doesn't stand through disabling and enabling, and when an item that left the list still writes on its handle.
- **Route:** the implementer for the rows. The architect, if the list of rows was meant to be complete.

### reviewer-2

**Tier A, small reach.** A value of the item's that the page _removed_ comes back when `disabled` changes, also on an `mx-list-item`.

- **Observed,** in the three engines: `removeAttribute('tabindex')` on an `mx-list-item` without a handle, and then `disabled` set on it, gives it `tabindex="0"` again, so it is a tab stop again. On a button item's handle, `tabindex`, `role`, `aria-label` and `aria-description`, each removed by the page while the item is enabled, are all there again after it is disabled and enabled.
- **The requirement:** `RD-61` property 8: _"the attribute on it changes nothing"_. Property 2: _"Enabled, it has again what it had."_
- **What limits it:** the same removal comes back after a slot change, in the same probe, and by reading of `claim` on `main` too. So the list never promised that a removal holds. The JSDoc promises the values that the consumer _set_, and those all stand. The row _"should not write again an attribute the consumer removed, before or at the release"_ reads neither a slot change nor `disabled`. What this unit adds is one more event that writes them again.
- **Required property:** either the two sentences hold for an attribute that the page removed, or the record says that they don't cover it.
- **Route:** the architect. It is a question of what the contract covers. A page that wants no tab stop has `tabindex="-1"`, which stands.

## Observations, no finding

- **A sortable list in an item, without a handle, of another sortable list:** an arrow key on the focused handle of a disabled _inner_ item moves the _outer_ item, and a press on it drags the outer item. An enabled inner item moves itself. It is drag's rule (`packages/drag/.plan/contract.md`, _Nested roots_: _"an outer root still admits what its inner roots declined"_), and an inner edge item's outward key does the same today. Property 1's _"An arrow key then keeps its native meaning"_ doesn't hold in that one arrangement. Nothing in the record asks for nested sortable lists. The architect's, if they are supported.
- **Touch with an inline handle, pre-existing:** in Chromium, an enabled item isn't lifted by touch from a `span` handle. `touch-action` doesn't apply to an inline box, so the finger pans. A native button, and by reading `mx-icon`, which is `inline-block`, are right. The JSDoc promises `touch-action: none` for any `[data-handle]` child. This diff doesn't change it. It has no number that I found; the coordinator's to register.
- **The row _"should write the semantics of a handle again after it is enabled"_** can't fail when disabling writes nothing: with no observer it passes. It needs the row before it, which fails there. Together they discriminate.