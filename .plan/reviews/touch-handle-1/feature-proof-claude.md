# A touch on a sortable item's handle isn't canceled by a pan (RF-145, RF-146 (a)): feature proof

**Lens:** `reviewer`, feature proof of [`RF-145`](../../00-index.md) and of `RF-146`'s answer (a), with their notes, for #282 and #283 and pull request #296. Requested by the coordinator.

**Commit read:** `df577d7df` on `material-x/touch-handle-1`, from `main` at `d20c47bda`. "`main`" below is the two style files of `d20c47bda`, put in place of the head's. The unit's other changes are text and rows.

**Outcome: accepted. No finding.** `RF-145`'s two properties hold: in Chromium each handle of property 1 takes a touch drag in `lead` and in `trail`, at six points of its box and of what it paints, where `main`'s styles let every one pan and cancel. A mouse, a disabled item, a page's `touch-action` and a page's `display` read as on `main`. `RF-146`'s three properties hold in the texts. The box changes that the implementer lists are for the owner, as `RF-145`'s witness says, and their acceptance is pending. Three observations are at the end.

## Scope and method

- **A probe of my own,** [`proof-touch`](probes/proof-touch.browser.test.ts.txt), with the helpers of `sortable-list.browser.test.ts`, in material-x's `browser` project, one engine at a time, run on the head and on `main`'s two style files ([readings](checks/touch.txt)). It reads each handle's `display`, box and painted part. It reads a mouse drag by each handle. In Chromium it reads a CDP touch on each handle, at the box's center and two inset corners and at the painted part's center and two inset corners, with a swipe up over the item above. It records whether a move is proposed, how far the page scrolled, and whether a `pointercancel` came. The handles are a `span` with text, an `mx-icon`, a `span` with an `mx-icon`, an `mx-icon-button`, a native button with an `mx-icon`, and a native button with text, which worked before. It also reads a disabled item, a page's inline `touch-action`, a page's `display: inline` and `display: block`, a `hidden="until-found"` handle, a `[data-handle]` in a plain `mx-list`, and the three items without a handle.
- **The affected files,** in the `browser` and `spec` projects of Chromium, Firefox and WebKit, one at a time: `tests/list`, `tests/button`, `tests/fab`, `tests/top-app-bar`, and the four other files that use `mx-icon` ([files](checks/files.txt), [script](probes/chain.sh.txt)).
- **The visual project** in Chromium, with the head's styles and with `main`'s ([readings](checks/visual.txt)).
- **Mutations,** [`mutations.mjs`](probes/mutations.mjs.txt), against `sortable-list.browser.test.ts`: the implementer's four and four of mine, in Chromium, and the engine-neutral ones in Firefox and WebKit ([readings](checks/mutations.txt)).
- **The sizes:** `just size-reading` at the head and with `main`'s two style files ([readings](checks/sizes.txt)).
- **Not read:** a real device, Safari, a pen, touch in Firefox and WebKit (CDP's touch is Chromium's, as the entry says), assistive technology, the docs build, and material-x's full suite. `RF-137`'s branch and the merge of the two `slot` rules, as the coordinator asks.

## Properties

| Property | Reading |
| --- | --- |
| `RF-145` 1 | **Holds,** Chromium. Each of the six handles in `lead` and in `trail` proposes the move at each of the six points, with no scroll and no `pointercancel`. With `main`'s styles, each of the five handles of property 1 pans 39 to 78 px and is canceled at each point. A native button with an `mx-icon` takes the touch on `main` only at its box's corners, not on its icon. The native button with text works on both. |
| `RF-145` 2 | **Holds.** A mouse drag by each handle proposes the move in the three engines. A disabled item's handle has no `touch-action`, and a touch on it scrolls the page and is canceled, as on `main`. A page's inline `touch-action: pan-y` stands and scrolls, as on `main`. A page's `display` wins: `block` takes the touch, and `inline` pans, as the texts say. |
| `RF-146` 1 | **Holds.** `sortable-list.ts`'s JSDoc under _Handles_ and `list.mdx`'s second bullet have the candidate's text. The three items without a handle scroll the page under a swipe and propose nothing, in Chromium, on the head and on `main`. |
| `RF-146` 2 | **Holds.** No text promises a touch reorder of an item without a handle. The `@summary` and the opening of `list.mdx` are left as the entry's table says. |
| `RF-146` 3 | **Holds.** No code is for (a). `touch-action` and `user-select` are written on no item. |

**Rows and witnesses,** Chromium, of 176 rows:

| Mutation | Rows that fail |
| --- | --: |
| None | 0 |
| Without the handle rule | 6: a `span` with text or an `mx-icon`, and an `mx-icon-button`, in each slot |
| The `mx-icon` slot `display: contents` | 6: an `mx-icon` alone, in a `span` or in a button, in each slot |
| Without the `hidden` guard | 1: the hidden handle |
| The handle rule `!important` | 1: the page's `display` |
| own: the handle `inline`, not `inline-block` | 10: every touch row |
| own: the handle rule in `lead` only | 3: the `trail` rows of the handle rule |
| own: the `mx-icon` slot rule removed | 6, as `display: contents` |
| own: `hidden="until-found"` hidden too | 0 |

In Firefox and WebKit, 164 rows pass, and the `hidden` guard and `!important` fail their one row each. The last mutation is discussed under observation 3.

**The affected files,** without the probe: Chromium 1064 rows pass, Firefox 1034 and WebKit 1044, with 20 skipped in each of those two, the rows that run in Chromium only. None fails.

**The visual project:** with the head's styles and with `main`'s, each of the 32 rows has the same status and the same count of differing pixels against its stored baseline. 23 rows fail on both against the baselines, also where no `mx-icon` or list item is drawn, such as the checkbox, the radio and the slider. That comes from this machine, not from the unit. Of the 23 actual screenshots, 22 are byte for byte the same on both. The other, the connected button group's sizes, which draws no `mx-icon` and no list item, differs in 9 bytes of its image data. That is render noise. So the unit changes no screenshot of the visual project.

**Boxes:** as the implementer reads them, in Chromium. A `span` with text in `lead` is 9x0 and paints 9x19, which was 9x19. In `trail` it is 7x16, which was 7x13. A `span` with an `mx-icon` in `lead` is 16x16, which was 16x19. The `mx-icon-button` host is `inline-block`, with the same 40x40 button. A touch at the painted glyph of the 9x0 `span` still reaches the handle. Firefox and WebKit have the same `display`s and the same zero height in `lead`, with their own glyph widths.

**Sizes,** Brotli, none over a limit: `icon/icon` +6, `list/list-item` +13, `complete` +46, and also `button/split-button` +11, `checkbox/checkbox` +8, `radio/radio` +11, `list/list-link-item` +18, `text-field/text-field` +17 and `list/list-button-item` −14. These are the implementer's [reading](../../touch-handle-1/checks/sizes.txt), whose note in the entry names three of the nine rows.

**CI** at `df577d7df` passes: Chromium, Firefox, WebKit, measurements, static and docs among its checks, and two are skipped.

## Pending

**The owner's view of the boxes.** `RF-145`'s witness says that the handles' screenshots don't change, or the owner sees them. They change for a `span` handle when focused, most visibly in `lead`, where its focus indicator closes onto the glyph ([before and after](../../touch-handle-1/checks/boxes/lead-span-text-focus.png)), and in `trail` ([before and after](../../touch-handle-1/checks/boxes/trail-span-mx-icon-focus.png)). The record doesn't say that he has seen them. A remedy, such as a `line-height` on the handle, isn't decided. The handle of the list's stories, an `mx-icon`, doesn't change.

## Observations

Not findings: no property of either entry covers them.

1. **The handle rule applies in a plain `mx-list` too.** The item's styles make a slotted `[data-handle]` `inline-block` in any list, as the handle's focus rule already did. A `span` handle in a plain `mx-list`'s `lead` is 9x0 as in the sortable list. `data-handle` has no meaning there. The texts state the box only for the sortable list. Whether the rule belongs to the sortable list alone is the architect's call.
2. **The entry's note on the sizes names three of the nine rows that move.** Its reading names all nine, and none has a limit.
3. **`hidden="until-found"` on a handle now hides its content,** because the handle is `inline-block` and the `content-visibility: hidden` that the attribute gives applies. On `main` a `span` handle with it is inline, where `content-visibility` doesn't apply, so its text was drawn. That is by the property's definition: the probe reads the computed values, not a screenshot. The guard's `until-found` exception is what does it, and no row reads it: excluding `until-found` too fails nothing in the three engines.

## Verification of this report

Markdown and saved text only. `oxfmt` on the report, `git diff --check`, and the root format check. The relative links were checked against the files with a script. Lint doesn't apply to Markdown.