# Step (c) — what goes in `@ydinjs/core`, `AttributeClaimer`, and two moves from material-x — plan

**Status: proposed, waiting for the owner's checkpoint and his answers to [Q1](#q1--the-workarounds-that-expire) and [Q2](#q2--useformactivation).** Written by the architect on 2026-11-27, on the coordinator's task, on `repo/core-placement-1` from `origin/main` at `2ed4b96ab`. The owner approved the three items on 2026-11-26 (_"Ага, подтверждаю"_, "Yes, I confirm"), after a conversation with Mx Architect Explainer. They were due after `RF-118`, which merged with `RF-117` as #321 (`fe101808b`), and after `RF-152`'s `parseMs`, which merged as #315 (`085be1e2b`).

**The decisions are proposed here as `CP-D1` to `CP-D3`, and minted at the checkpoint,** at the next free `RD-` numbers then. On 2026-11-27 `RD-71` (#337) is the highest on any branch, and `material-x/select-1` will take one when its questions are answered. `CP-D2` and `CP-D3` depend on Q1 and Q2. `CP-D1` depends on neither, and is minted with them so that the step's decisions are consecutive.

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

## The proposed decisions

### `CP-D1` — `AttributeClaimer` in `@ydinjs/core`

1. **A class, `AttributeClaimer`,** in a module of its own, `@ydinjs/core/utils/AttributeClaimer.js`. It isn't in `DOM.js`, so that a user of `toggleState` doesn't pay for it (§7). Its state is `#private` (_Class encapsulation_). It is a class because each instance has a lifetime of its own, with an observer and a release, which §10 calls _"meaningful lifecycle identity"_. The owner asked for a class.
2. **One instance per element:** `new AttributeClaimer(element)`.
3. **`set(values: Readonly<Record<string, string | null>>): void`** claims each named attribute:
   - **A string** is written when the element doesn't have the attribute, or has this instance's own value. The value is then the instance's own.
   - **`null`** removes the instance's own value, and leaves another writer's.
   - **A name that `values` doesn't list** is left as it is.
4. **The claim ends when anyone else writes or removes the attribute.** After another writer's value, `set()` leaves it, and `release()` doesn't remove it. After another writer's removal, the element doesn't have the attribute, so a later `set()` with a string claims it again, as `sortable-item.ts` does today. The instance's own writes and removals don't end its claim. Another writer's change made earlier in the same task as a `set()` or `release()` is seen before the instance writes.
5. **`release(): void`** removes every value that is still the instance's own, and stops observing. It is called once, and nothing is called after it.
6. **Its terms are `useARIA`'s:** _own value_ is the value this instance wrote and still holds. The JSDoc says that it is the reverse direction: `setOwnARIA` keeps the component's value under the host's, and the claimer writes on a consumer's element only while the consumer hasn't.
7. **It is public core API:** an entry in `files.json`, `docs/api.ts`, a row in the README's _Utils_, JSDoc, and core rows in `packages/core/tests/utils/AttributeClaimer.browser.test.ts`.
8. **`sortable-item.ts` uses it,** one instance for the control for the item's lifetime, and one for each handle. A new handle releases the old handle's instance and creates one for the new handle, which replaces today's re-observation.
9. **`touch-action` stays in `sortable-item.ts`,** as an inline style. It is drag's, and no observer sees it. It keeps today's rule: written while the handle has no inline `touch-action`, and removed while it is still `none`.
10. **One change of behavior: `aria-label`.** The item passes `'aria-label': handle.hasAttribute('aria-labelledby') ? null : 'Reorder'`. So at an update after the handle gains `aria-labelledby`, the item removes its own `Reorder`. Today it stays. `aria-labelledby` wins over `aria-label` in the accessible name, so the name doesn't change. A consumer's own `aria-label` stays, as today.

**Why.** The claim rule doesn't depend on material-x: any component that adds semantics to an element a consumer gives it needs it, so it passes the owner's test of what core is for. An instance per element replaces the two `owned` sets and the shared observer, so the item's code is the calls.

### `CP-D2` — What goes in `@ydinjs/core`, and what in material-x's `src/core`

1. **`@ydinjs/core` holds universal utilities, which anyone building a design system can use,** whatever the number of their users in this repository.
2. **material-x's `src/core` holds code that material-x's components share and that means nothing without material-x,** such as its styles, its ripple and its token-bound helpers.
3. **_"No second user"_ is a reason only against `src/core`,** as `RF-118` property 5 uses it for `useSortable`. That property's reason against `@ydinjs/core`, a dependency on drag (`RD-31`), stands.
4. **A workaround with a deletion condition:** by Q1's answer.
5. **Where it is written:** [`architecture.md`](../../.agents/docs/architecture.md), in _Core runtime_ and in _Extension points_' _Core capability_, which today says only _"add an `@ydinjs/core` controller or trait"_. It is project documentation, so it has [its own unit](#unit-2--the-rule-in-architecturemd) and pull request, as `RD-71` had #337.

**Why there.** `architecture.md` already says what each package is for, and its _Extension points_ is where an author decides where new code goes. `CONTRIBUTING.md` is about how source is written, not where.

### `CP-D3` — `useClickActivation` and `parseMs` move to `@ydinjs/core`

1. **`useClickActivation`** moves to `@ydinjs/core/controllers/useClickActivation.js`, as a controller of its own, as each core controller is. Under Q2 (a), **`useFormActivation`** moves to `@ydinjs/core/controllers/useFormActivation.js`, and its JSDoc names the click that `useClickActivation` cancels. material-x's `src/core/utils/events.ts` is then deleted.
2. **`parseMs`** moves to `@ydinjs/core/controllers/useCSSProps.js`, beside `CSSPropParser` and `CSSVariableError`. It is the parser for that controller, so a consumer imports it from where it uses it. `identity` stays in `fns.ts`, which is a one-line function.
3. **Each moved function keeps its behavior and signature,** and material-x's call sites change only their import.
4. **The `useContext` wrapper stays** in material-x's `src/core/utils/useContext.ts`, so that core's `useContext` stays neutral about how a value is carried.
5. **§8: no re-export is left** at the old paths.

## Questions for the owner

### Q1 — the workarounds that expire

**Do `FocusForwarding`, `useHasSlottedPolyfill` and `useAriaNotifyPolyfill` move to `@ydinjs/core`, or stay in material-x until they are deleted?**

- **(a) All three stay in material-x until their condition holds,** and the rule says so: _a workaround with a deletion condition stays where its users are, until the condition holds._ **Recommended.**
  - In material-x they are internal, because `src/core` isn't a public entry. Each is deleted with its condition, in one unit, and no consumer sees it.
  - In core each would be a public export. Once core is published, deleting it at its expiry breaks a consumer who imported it, and §4(b)'s _permanence_ applies: _"an exported value is a promise you cannot withdraw"_. So a public core would carry each until a major release, past its condition.
  - Two of them aren't universal today in any case. `useHasSlottedPolyfill` works only with a private build package's rewrite. `useAriaNotifyPolyfill` imports CSS and HTML, which core's build doesn't transform.
- **(b) All three move.** That meets _"by rights they should go too"_. It needs a transform for CSS and HTML in core's build, `hasSlottedFallbackVisitor` published, or core documenting that it needs that private package, and a breaking release at each expiry.
- **(c) `FocusForwarding` moves, and the two polyfills stay.** It has no asset and no build dependency, so it is the only one that is universal today. It still expires with Firefox, and its deletion is still a breaking change of a published core.

**Recommended: (a).** It is what the owner said he wants, and the expiry is the reason: core is the package whose exports are a promise, and these are the code that is meant to go.

### Q2 — `useFormActivation`

**Explainer's list doesn't name `useFormActivation`, which is in `events.ts` beside `useClickActivation`. Does it move too?**

- **(a) It moves with `useClickActivation`.** **Recommended.**
  - It is universal by the owner's test: any form-associated button in any design system needs to submit or reset its form through `ElementInternals`.
  - It depends on `useClickActivation`'s cancellation: it skips a click whose default was prevented, which is the host click that `useClickActivation` replaces. If only one moved, the two halves of one sequence would be in two packages.
  - It uses `Typeable` and `internals`, which are core's.
- **(b) It stays in material-x,** as the owner's _"yes"_ named only `useClickActivation`. Then material-x's `events.ts` keeps it, and its JSDoc names core's `useClickActivation`.

**Recommended: (a).** The owner named the function he saw, and the second is the other half of it.

## The units, in order

### Unit 1 — `AttributeClaimer`, and the moves

On this branch, by an implementer, after the checkpoint and Q2. **Size: medium.**

- **Core:**
  - `src/utils/AttributeClaimer.ts` (`CP-D1`), and `src/controllers/useClickActivation.ts`. Under Q2 (a), `src/controllers/useFormActivation.ts`. `parseMs` goes into `src/controllers/useCSSProps.ts`.
  - The entries in `files.json` and `docs/api.ts`, and rows in the README's tables. The README's `useAnchor.js` row is removed, because the module doesn't exist.
- **material-x:**
  - `sortable-item.ts` uses `AttributeClaimer` (`CP-D1` 8 to 10);
  - the imports of `SwitchCore.ts`, `CheckableCore.ts`, `ripple.ts` and `useSortable.ts`, and under Q2 (a) `button.ts` and `icon-button.ts`;
  - `events.ts` deleted under Q2 (a), and `fns.ts` keeps `identity`;
  - `parseMs`'s rows move to core.
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
  - **`useFormActivation`** under Q2 (a): the rows that `button.ts`'s form behavior has in material-x stay there, and core gets one row on a plain form-associated host for `submit`, `reset` and `button`.
  - **`parseMs`:** `fns.browser.test.ts`'s rows, moved to core's `useCSSProps` rows unchanged.
- **Rows, in material-x:**
  - **`sortable-list.browser.test.ts`'s rows pass unedited,** among them _"should keep the values the consumer set on the handle"_, the tab-stop rows, the description rows, _"should keep the aria-disabled that the page writes on a disabled handle"_ and _"should keep the touch-action that the page writes on a handle after the claim"_.
  - **One new row for `CP-D1` 10:** the item claims `Reorder`, the page sets `aria-labelledby` on the handle, the item is then disabled, and the handle has no `aria-label`. **Witness:** it fails on today's code.
  - **A handle that already has `aria-labelledby` and a consumer's `aria-label`** keeps both.
  - The switch, checkbox, radio, button and icon-button rows pass unedited.
- **Size:** `complete`, every row that imports a moved function and `list/sortable-list` are read before and after. Every other material-x row is the control and stays byte for byte. Core's `.size-limit.json` rows stay within their limits. No new limit is added.
- **Stopping boundary:** the implementer stops and returns if a row of material-x other than the import paths and the new row needs an edit, if `AttributeClaimer`'s rows can't hold in an engine at the floor, or if the move changes the built `custom-elements.json` or `react.d.ts` of material-x beyond module paths.

### Unit 2 — the rule in `architecture.md`

On its own branch from `origin/main`, by the architect, after Q1's answer, with its own pull request. **Size: small,** Markdown only. It writes `CP-D2` and mints it. It may merge before or after unit 1.

### Unit 3 — the workarounds, only under Q1 (b) or (c)

Not planned until the answer. Under (b) it needs a build decision for core, and so it is a plan of its own.

## Not adopted

- **`AttributeClaimer` as `useAttributeClaims(host, element)`.** A hook registers on a host's lifecycle. The claims' lifetime is the handle's, which changes while the host lives, and the owner asked for a class.
- **One instance for several elements,** as today's shared observer. Then `release()` takes an element, and the item's two `owned` sets come back as a map inside the class.
- **`touch-action` in the claimer,** as a style claim. No observer sees it, so its rule is a different one, and it is drag's.
- **`parseMs` in a new `@ydinjs/core/utils/` module.** It would be a module for one function that only `useCSSProps` calls.