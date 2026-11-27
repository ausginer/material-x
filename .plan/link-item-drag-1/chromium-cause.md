# Why `draggable="false"` doesn't stop a link item's native drag in Chromium

The reading that `repo:RF-76` asks for. Made on `material-x/link-item-drag-1`, at `085be1e2b`, with Playwright's Chromium, Firefox and WebKit, through the probes in [`probes/`](probes/). The readings are [`checks/before.txt`](checks/before.txt) at `085be1e2b` and [`checks/after.txt`](checks/after.txt) with the repair.

## Cause

**The `.host` rule of the interactive list items starts with `all: unset`, and that removes the effect of `draggable="false"` in Chromium.** Chromium and WebKit turn the attribute into a presentational hint, `-webkit-user-drag: none`. A presentational hint is author-level with specificity zero, so any author rule outranks it, and `all` covers `-webkit-user-drag`. With the rule, the anchor computes `-webkit-user-drag: auto`, and Chromium starts its own drag of the link. Firefox doesn't map the attribute to a style, so the attribute alone stops the drag there.

The shadow tree isn't part of the cause. [`draggable-false.browser.test.ts`](probes/draggable-false.browser.test.ts) presses an anchor with `draggable="false"` and moves it 12 px:

| Anchor | Chromium `-webkit-user-drag` | Chromium `dragstart` |
| --- | --- | --- |
| In the light DOM, with text or with a `<div>` | `none` | none |
| In a shadow root, with text, with a slot, or a `<div>` with a slot | `none` | none |
| In a shadow root, under `a { all: unset }` | `auto` | a link drag |
| In the light DOM, under `.u { all: unset }` | `auto` | a link drag |
| In a shadow root, under `all: unset` and `[draggable=false] { -webkit-user-drag: none }` | `none` | none |

WebKit computes the same values. Its driver starts no native drag in any of the cases, which is why WebKit lifted the item at `085be1e2b`. Firefox starts none.

## The item in `mx-sortable-list`

[`link-item-drag.browser.test.ts`](probes/link-item-drag.browser.test.ts) presses an `mx-list-link-item href="#target"` in `mx-sortable-list`, by its label or by a `data-handle` lead, moves 12 px and releases. At `085be1e2b`:

| Case | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| Surface | not lifted: `dragstart` of `a.host` with `text/uri-list`, then `pointercancel` | not lifted | lifted |
| Surface, `draggable="false"` on the anchor | not lifted, as above | lifted | lifted |
| Surface, `draggable="false"` on the host | not lifted | not lifted | lifted |
| Surface, `draggable="false"` on the anchor and the host | not lifted | lifted | lifted |
| Surface, `-webkit-user-drag: none` on the anchor | lifted | not lifted | lifted |
| Surface, `dragstart` cancelled on the host | lifted, with no `pointercancel` | lifted | lifted |
| Handle | lifted | not lifted | lifted |
| Handle, `draggable="false"` on the anchor | lifted | lifted | lifted |
| Handle, `dragstart` cancelled on the host | lifted | lifted | lifted |

In no case does a release change `location`.

## Repair

`drag`'s contract names `draggable="false"` as the means (_"Native drag is the consumer's. A natively draggable item or handle, such as a link or an image, needs `draggable="false"` from the consumer"_), and the reading shows that the attribute fails only because of the item's own stylesheet. So the repair uses the attribute and makes the stylesheet keep it:

- `sortItem` in `packages/material-x/src/list/sortable-item.ts` sets `draggable="false"` on a link item's anchor while the item is in `mx-sortable-list`, and removes it when the item leaves. Outside the list the anchor drags as a native link does.
- `packages/material-x/src/list/styles/item/interactive-box.styles.css` states `-webkit-user-drag: none` for `.host[draggable='false']`, which the `all: unset` would otherwise remove.

Cancelling `dragstart` on the item also lifts it in each engine. It isn't used, because it is a second means beside the one the contract names, and it would leave Chromium's computed style saying that the anchor drags.

With the repair, each of the nine cases lifts in each engine, and no release changes `location` ([`checks/after.txt`](checks/after.txt)).

## Running the probes

The probes import `../../src/list/…` and `../browser.ts`, so they run from `packages/material-x/tests/list/`. Copy one there and run, from the repository root:

```sh
MX_TEST_ENGINES=chromium,firefox,webkit aube exec vitest run --project 'browser/material-x*' --silent=false packages/material-x/tests/list/<probe>
```

Each case prints one JSON line.