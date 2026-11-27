# Step (c) — what goes in `@ydinjs/core`, `AttributeClaimer`, and two moves from material-x — plan

**Status: accepted by the owner on 2026-11-27, with Q1 (a) and Q2 (a). [Unit 1](#unit-1--attributeclaimer-and-the-moves) is ready for an implementer, on this branch. [Unit 2](#unit-2--the-rule-in-architecturemd) is #342, and unit 3 isn't needed.** Until 2026-11-27 it said: _"proposed, waiting for the owner's checkpoint and his answers to Q1 and Q2"_. Written by the architect on 2026-11-27, on the coordinator's task, on `repo/core-placement-1` from `origin/main` at `2ed4b96ab`. The owner approved the three items on 2026-11-26 (_"Ага, подтверждаю"_, "Yes, I confirm"), after a conversation with Mx Architect Explainer. They were due after `RF-118`, which merged with `RF-117` as #321 (`fe101808b`), and after `RF-152`'s `parseMs`, which merged as #315 (`085be1e2b`).

**The decisions were proposed here as `CP-D1` to `CP-D3`, and are minted:** `CP-D1` is [`RD-73`](../decisions/RD-73.md) and `CP-D3` is [`RD-74`](../decisions/RD-74.md), on this branch, and `CP-D2` is `RD-75`, on `repo/core-placement-rule-1` (#342). `RD-71` (#337) is the highest on any branch, and the coordinator reserves `RD-72` for `material-x/select-1`. The decision files are the statement, and [_The decisions_](#the-decisions) says what each is.

## The owner's words

Translated by the coordinator, from Explainer's notes, read at `d6f6cf60b`:

- **On the claims:** _"There are many calls of the `claim` function in sortable-item. I think it has the potential to move to the `core` package."_ And: _"If it's a class, better make it exactly `class AttributeClaimer` or something like that. We suffered enough with factory functions in drag... Although for controllers factory functions are simpler to use."_
- **On what core is for:** _"I put into core not only what has many users. It is rather the place for universal utilities that anyone who wants to build their own design system can use. That differs from material-x/core, which holds shared utilities that are meaningless without material-x itself."_
- **On the moves:** _"useClickActivation & parseMs — yes."_ The `useContext` wrapper stays, _"on purpose, in case a user wants to use, for example, signals"_.
- **On the workarounds that expire:** _"By rights they should go too, but I don't want to, precisely because they have an expiry date."_

## Readings at `2ed4b96ab`

Each of Explainer's claims was read again at today's `origin/main`. #321 and #325 changed `sortable-item.ts` and `events.ts` since `d6f6cf60b`.

- **`packages/material-x/src/list/sortable-item.ts`:**
  - `claim`, `unclaim` and `release` write a value on a consumer's element only while it doesn't have the attribute, or still has the item's own value. Each element's claims are recorded in an `owned` set, one for the handle and one for the control.
  - One `MutationObserver`, `disown`, watches both elements with one `attributeFilter` (`tabindex`, `role`, `aria-label`, `aria-description`, `aria-disabled`). A record that reaches it is another writer's, and ends the item's claim on that attribute.
  - `write(run)` applies the pending records first and drops the records of the item's own writes. `update` and `release` both run inside it.
  - **`touch-action` is a claim on the inline style,** in the same `owned` set. It is written only while the element has no inline `touch-action`, and removed only while the value is still `none`, because no observer sees a style.
  - **A new handle** releases the old one's claims, disconnects the observer and observes the control and the new handle again.
  - **`aria-label`** is claimed only while the handle has no `aria-labelledby`. Otherwise there is no call, so a label that the item wrote earlier stays. The item's `update` runs on a change of the `lead` or `trail` slot (`ListItemCore.ts`) and of the host's `disabled`. So the handle gaining `aria-labelledby` changes nothing until the next update.
  - #325 added `draggable="false"` on a link item's anchor, which is in the item's shadow tree. It isn't a claim, and stays in the item.
- **No other module writes an attribute on a consumer's element.** The other writes in `src/` are on a shadow tree's elements: split-button's `trailing`, the icon's slot, the text field's input and the slider's input. `useARIA`'s _own value_ is the reverse direction: the component's value under the host's.
- **`packages/material-x/src/core/utils/events.ts`** now holds `useClickActivation` and `useFormActivation`. #321 removed `notify`.
  - `useClickActivation(host, target)` cancels a click whose target is the host, stops it, and clicks `target`. Its users are `SwitchCore.ts` and `CheckableCore.ts`.
  - `useFormActivation(host)` makes a form-associated host a submit or reset button of its form. It skips a click whose default was prevented, which is the host click that `useClickActivation` cancels. Its users are `button.ts` and `icon-button.ts`. Explainer's list doesn't name it ([Q2](#q2--useformactivation)).
- **`packages/material-x/src/core/utils/fns.ts`** holds `identity` and `parseMs`, with #315's change: a value is read in milliseconds when it ends in `ms` in any case, and in seconds otherwise. Its users are `ripple.ts` and `useSortable.ts`. Its rows are `tests/core/utils/fns.browser.test.ts`.
- **`@ydinjs/core`:**
  - It is unpublished. The only release tag is `@ydinjs/box-quad@1.0.0`, so `CONTRIBUTING.md` §8 leaves its shape free.
  - `src/utils/` has `DOM.ts` and `runtime.ts`, and `useCSSProps.ts` exports `CSSPropParser` and `CSSVariableError`, and no parser. The public modules are listed in `files.json`, `docs/api.ts` and the README's tables.
  - Its build is tsdown, unbundled, with no transform for a CSS or HTML import, and no core module imports one.
  - Its README's _Controllers_ table names `@ydinjs/core/controllers/useAnchor.js`, which doesn't exist.
- **The three workarounds,** in material-x's `src/core/`, which isn't a public entry of material-x (`files.json`):
  - **`FocusForwarding` and `useFocusForwarding`** (`traits/focus-forwarding.ts`): Firefox doesn't delegate focus from a host whose box is `display: contents` (`repo:RF-33`), and the trait goes once it does. It is a trait with no asset.
  - **`useHasSlottedPolyfill`** (`polyfills/has-slotted.ts`): it works only with the build's `hasSlottedFallbackVisitor`, in `@ydinjs/vite-custom-element-assets`, which is private. It goes once every supported engine matches `:has-slotted` and `:host:has()`.
  - **`useAriaNotifyPolyfill`** (`polyfills/aria-notify/`): it imports a CSS sheet and an HTML template. Its TODO deletes it once Playwright's WebKit has `Element.ariaNotify` and a VoiceOver check passes.

## The decisions

Proposed here as `CP-D1` to `CP-D3` and minted on 2026-11-27, after the owner's answers. Each decision file is the statement: the plan held the same text until then, and `CP-D2` and `CP-D3` now carry the answers. The proposed text is at `21025aa80`.

- **`CP-D1` is [`RD-73`](../decisions/RD-73.md): `AttributeClaimer` in `@ydinjs/core`,** with `sortable-item.ts` using it, `touch-action` staying in the item, and one change of behavior for `aria-label`.
- **`CP-D2` is `RD-75`: what goes in `@ydinjs/core`, and what in material-x's `src/core`.** Its property 4, under Q1 (a): a workaround with a deletion condition stays where its users are until the condition holds. It is written in `architecture.md` by [unit 2](#unit-2--the-rule-in-architecturemd), and its file is on that unit's branch, `repo/core-placement-rule-1` (#342).
- **`CP-D3` is [`RD-74`](../decisions/RD-74.md): `useClickActivation`, `useFormActivation` and `parseMs` move to `@ydinjs/core`,** with `useFormActivation` under Q2 (a), and material-x's `events.ts` deleted.

## Questions for the owner

**Both are answered.** The owner answered at his checkpoint on 2026-11-27, relayed by the coordinator: Q1 (a) and Q2 (a). The questions stay as he read them.

### Q1 — the workarounds that expire

**Do `FocusForwarding`, `useHasSlottedPolyfill` and `useAriaNotifyPolyfill` move to `@ydinjs/core`, or stay in material-x until they are deleted?**

- **(a) All three stay in material-x until their condition holds,** and the rule says so: _a workaround with a deletion condition stays where its users are, until the condition holds._ **Recommended.**
  - In material-x they are internal, because `src/core` isn't a public entry. Each is deleted with its condition, in one unit, and no consumer sees it.
  - In core each would be a public export. Once core is published, deleting it at its expiry breaks a consumer who imported it, and §4(b)'s _permanence_ applies: _"an exported value is a promise you cannot withdraw"_. So a public core would carry each until a major release, past its condition.
  - Two of them aren't universal today in any case. `useHasSlottedPolyfill` works only with a private build package's rewrite. `useAriaNotifyPolyfill` imports CSS and HTML, which core's build doesn't transform.
- **(b) All three move.** That meets _"by rights they should go too"_. It needs a transform for CSS and HTML in core's build, `hasSlottedFallbackVisitor` published, or core documenting that it needs that private package, and a breaking release at each expiry.
- **(c) `FocusForwarding` moves, and the two polyfills stay.** It has no asset and no build dependency, so it is the only one that is universal today. It still expires with Firefox, and its deletion is still a breaking change of a published core.

**Recommended: (a).** It is what the owner said he wants, and the expiry is the reason: core is the package whose exports are a promise, and these are the code that is meant to go.

**Answered (a), 2026-11-27.** `RD-75` property 4 states it, and unit 3 isn't needed.

### Q2 — `useFormActivation`

**Explainer's list doesn't name `useFormActivation`, which is in `events.ts` beside `useClickActivation`. Does it move too?**

- **(a) It moves with `useClickActivation`.** **Recommended.**
  - It is universal by the owner's test: any form-associated button in any design system needs to submit or reset its form through `ElementInternals`.
  - It depends on `useClickActivation`'s cancellation: it skips a click whose default was prevented, which is the host click that `useClickActivation` replaces. If only one moved, the two halves of one sequence would be in two packages.
  - It uses `Typeable` and `internals`, which are core's.
- **(b) It stays in material-x,** as the owner's _"yes"_ named only `useClickActivation`. Then material-x's `events.ts` keeps it, and its JSDoc names core's `useClickActivation`.

**Recommended: (a).** The owner named the function he saw, and the second is the other half of it.

**Answered (a), 2026-11-27.** [`RD-74`](../decisions/RD-74.md) property 1 states it.

## The units, in order

### Unit 1 — `AttributeClaimer`, and the moves

On this branch, by an implementer. **Ready since 2026-11-27,** when the owner accepted the plan and answered Q2. It implements [`RD-73`](../decisions/RD-73.md) and [`RD-74`](../decisions/RD-74.md). **Size: medium.**

- **Core:**
  - `src/utils/AttributeClaimer.ts` (`RD-73`), `src/controllers/useClickActivation.ts` and `src/controllers/useFormActivation.ts` (`RD-74`). `parseMs` goes into `src/controllers/useCSSProps.ts`.
  - The entries in `files.json` and `docs/api.ts`, and rows in the README's tables. The README's `useAnchor.js` row is removed, because the module doesn't exist.
- **material-x:**
  - `sortable-item.ts` uses `AttributeClaimer` (`RD-73` properties 8 to 10);
  - the imports of `SwitchCore.ts`, `CheckableCore.ts`, `button.ts`, `icon-button.ts`, `ripple.ts` and `useSortable.ts`;
  - `events.ts` deleted, and `fns.ts` keeps `identity`;
  - `parseMs`'s rows move to core, and `tests/core/utils/fns.browser.test.ts`, which holds only them, goes.
- **Rows, in core's browser project:**
  - **`AttributeClaimer`:**
    - a value is written on an element without the attribute, and rewritten while it is still the instance's own;
    - after a consumer removes a claimed attribute, a later `set()` with a string writes it again;
    - a consumer's value present before `set()` isn't written over;
    - `null` removes the own value and leaves a consumer's;
    - a name that `values` doesn't list is left;
    - `release()` removes only the own values;
    - **another writer's change ends the claim:** after a consumer writes the attribute, `set()` with a new value and `release()` both leave the consumer's value. **Witness:** the row fails when the observer is removed;
    - **a change earlier in the same task is seen:** a consumer writes the attribute, then `set()` runs in the same task with another value, and the consumer's value stays. The same with `release()`. **Witness:** the row fails when `set()` doesn't take the pending records first;
    - **the instance's own writes don't end its claim:** after `set({ role: 'button' })` and a microtask, `set({ role: null })` removes it. **Witness:** the row fails when the instance's own records reach the observer.
  - **`useClickActivation`:** a click on the host clicks the target once, its default is prevented, and a listener on the host's parent receives one click, the target's. A click on the target passes unchanged. **Witness:** the first row fails without `stopImmediatePropagation`, because the parent then receives two.
  - **`useFormActivation`:** the rows that `button.ts`'s form behavior has in material-x stay there, and core gets one row on a plain form-associated host for `submit`, `reset` and `button`.
  - **`parseMs`:** `fns.browser.test.ts`'s rows, moved to core's `useCSSProps` rows unchanged.
- **Rows, in material-x:**
  - **`sortable-list.browser.test.ts`'s rows pass unedited,** among them _"should keep the values the consumer set on the handle"_, the tab-stop rows, the description rows, _"should keep the aria-disabled that the page writes on a disabled handle"_ and _"should keep the touch-action that the page writes on a handle after the claim"_.
  - **One new row for `RD-73` property 10:** the item claims `Reorder`, the page sets `aria-labelledby` on the handle, the item is then disabled, and the handle has no `aria-label`. **Witness:** it fails on today's code.
  - **A handle that already has `aria-labelledby` and a consumer's `aria-label`** keeps both.
  - The switch, checkbox, radio, button and icon-button rows pass unedited.
- **Size:** `complete`, every row that imports a moved function and `list/sortable-list` are read before and after. Every other material-x row is the control and stays byte for byte. Core's `.size-limit.json` rows stay within their limits. No new limit is added.
- **Stopping boundary:** the implementer stops and returns if a row of material-x other than the import paths and the new row needs an edit, if `AttributeClaimer`'s rows can't hold in an engine at the floor, or if the move changes the built `custom-elements.json` or `react.d.ts` of material-x beyond module paths.
- **The pull request** is this branch's, so it carries the plan and the two decisions with the implementation. Its description says `Closes #341`. After it opens, the implementer adds _"**Implemented** by #N"_ to `RD-73`'s and `RD-74`'s status sentences ([`documentation.md` §6](../../.agents/docs/documentation.md#a-decisions-status)).

### Unit 2 — the rule in `architecture.md`

On its own branch from `origin/main`, by the architect, after Q1's answer, with its own pull request. **Size: small,** Markdown only. It writes `CP-D2` and mints it. It may merge before or after unit 1. **Done 2026-11-27:** `repo/core-placement-rule-1`, #342, which mints `CP-D2` as `RD-75`.

### Unit 3 — the workarounds, only under Q1 (b) or (c)

Not planned until the answer. Under (b) it needs a build decision for core, and so it is a plan of its own. **Not needed:** the owner answered Q1 with (a).

## Not adopted

The alternatives that lost are under each decision's _Not adopted_: [`RD-73`](../decisions/RD-73.md)'s for `AttributeClaimer`, [`RD-74`](../decisions/RD-74.md)'s for the moves, and `RD-75`'s for the workarounds, with Q1's (b) and (c).