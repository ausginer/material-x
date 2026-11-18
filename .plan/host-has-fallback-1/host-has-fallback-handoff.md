# Handoff: `RF-40`'s fallback is complete; a test in every engine witnesses it

**Recipient:** the implementer, in a slot the coordinator assigns.

**Branch:** `repo/host-has-fallback-1`, from `origin/main` at `83a985b99`. **Input:** the architect's commit that adds this file.

**Items 1 and 2 begin after** the main slot's architect records proposal 1 (`RD-17` properties 4 and 7), and after the owner answers question 1. The owner is away, so the recommendation is stated with the question. Proposal 1 was recorded at `836d4d003`. **Item 3 begins now.**

**Governing records:** `repo:RF-40` and `repo:RF-59`, in [`../00-index.md`](../00-index.md). `RF-40` came from `RF-39`, which is closed.

**Evidence:**

- `RF-40`: [the reading](checks/rf40-reading.txt) and [its probe](checks/rf40-engine-probe.mjs), at `83a985b99`.
- `RF-59`: [the import before `<body>`](checks/rf59-head-import.txt) ([probe](checks/rf59-head-import-probe.mjs)) at `836d4d003`, and [the light-DOM selector](checks/rf59-light-dom.txt) ([probe](checks/rf59-light-dom-probe.mjs)) at `b44c655d7`.

**`RF-59` joined this unit on 2026-11-18** as [item 3](#item-3-rf-59-the-polyfill-sets-its-states-in-every-engine-and-detects-nothing), on the owner's agreement, relayed by the coordinator. Item 3 doesn't wait for the owner's answer to question 1. It holds whether items 1 and 2 land or `RF-40` closes on the reading, and it leaves nothing behind when the polyfill is later removed. The branch merged `origin/main` at `377ca72df` in `b44c655d7`.

## What was read

**`RF-40`'s premise doesn't hold.** It says that no stylesheet reads the `has-<slot>` states that `useHasSlottedPolyfill` sets. The reading at `5a0bba69b` searched `src/`, where no rule names them. The build adds them.

- **The build adds the selectors.** `@ydinjs/vite-custom-element-assets` passes every material-x stylesheet through `hasSlottedFallbackVisitor` (`src/css/utils.ts`). That visitor:
  - rewrites `:has-slotted` to the class `.has-slotted`, which the polyfill toggles in every engine;
  - beside each `:host:has(.<class>:has-slotted)`, adds `:host(:state(has-<class>))`.

  The shipped `text-field` and list item sheets carry `:state(has-lead)`, `has-trail`, `has-prefix`, `has-suffix`, `has-support`, `has-counter` and `has-overline` (reading A).

- **The names agree.** The runtime names each state after the slot's `name`. Each class that the visitor reads is its slot's name, or that of an element whose one slot has that name (reading B).
- **Every `:host:has()` rule in material-x tests `:has-slotted`,** so the fallback covers each one (reading C). The list is the same on `RF-43`'s branch.
- **The engines** (reading D):
  - Chromium 158 and WebKit 27.2 match `:host:has()`. The detection reads true, no state is set, and the class path applies.
  - Firefox 159 doesn't match `:host:has()`. The detection reads false, the polyfill sets the states, and the `:state()` selectors apply.
- **No specificity loss in Firefox.** Firefox's fallback selector is less specific than Chromium's: (0,2,0) against (0,3,0). No other rule sets the properties these rules set, so nothing wins in Firefox that loses in Chromium (reading E).
- **Nothing in the gate observes any of this** (reading F). The mechanism spans three places:
  - the class beside `:has-slotted` in a stylesheet;
  - the slot's `name` in a template;
  - the state the runtime derives.

  A mismatch between them breaks Firefox alone, and silently. `RF-39`'s defect was a Firefox-only `:host:has()` failure that no test had seen.

**What `RF-40`'s _Not established_ asked:**

| Question | Answer |
| --- | --- |
| Does Firefox render the two components differently? | Not at the CSS level (D, E). No component-level reading exists, and this unit adds one. |
| What does `HOST_HAS_SUPPORTED` read in Firefox? | `false`. |
| Does Firefox support `:has-slotted`? | Yes (`CSS.supports`), but it doesn't matter: the build rewrites the pseudo-class in every engine. |

## Question for the owner

**1. Close `RF-40` on the reading, or on tests in the gate?**

- **On the reading:** no code changes. `RF-40` closes as _not a defect_, with the correction below. The coupling stays unwitnessed.
- **On tests:** this handoff's two items. They are test-only, plus one comment, and change no product behavior.

**Recommendation: tests.** The required property is about every engine the gate runs, and only Firefox reaches the fallback. `RF-39` shows that this class of failure is invisible until someone reads Firefox by hand. The tests are small: two files, about ten rows each, in the existing `browser` project, which runs in all three engines.

## Proposals for the main slot's architect

### 1. Amend `RF-40`

Proposed text:

> **Corrected 2026-11-18** by the architect, from slot `c`'s [handoff](host-has-fallback-1/host-has-fallback-handoff.md) and [reading](host-has-fallback-1/checks/rf40-reading.txt) at `83a985b99`. The reading at `5a0bba69b` searched `src/` only. The build's `hasSlottedFallbackVisitor` (`@ydinjs/vite-custom-element-assets`, `src/css/utils.ts`) adds `:host(:state(has-<class>))` beside each `:host:has(.<class>:has-slotted)`, so the shipped sheets read every state the polyfill sets, and the names agree. **The fallback is complete.** In Firefox 159, `:host:has()` doesn't match, the polyfill sets the states, and the fallback rules apply. In Chromium 158 and WebKit 27.2, `:host:has()` matches. The _Not established_ items are answered in the handoff. **The required property holds at the CSS level.** It is witnessed in the gate when [item 1](host-has-fallback-1/host-has-fallback-handoff.md#item-1-the-tests) lands, and `RF-40` closes then.

If the owner chooses closing on the reading, the last sentence becomes: _"`RF-40` closes as not a defect."_

### 2. Proposed `RF-59`: `HOST_HAS_SUPPORTED` runs at import, and appends to `document.body`

Tier C. Proposed for registration and routed to the owner to order. **Not part of this unit.**

- **What:** `polyfills.ts:10`–`:20` evaluates its detection when the module loads. It appends an element to `document.body`, forces a style computation with `getComputedStyle`, and removes the element.
- **Why it matters:** both effects happen in every consumer that imports `mx-text-field` or a list item, before any of them is used. An import that runs before `<body>` exists throws, because `document.body` is `null`. That is the case for an `async` module script in `<head>`. The throw is inferred from the code; it wasn't read.
- **Required property:** importing a material-x module neither touches the document nor forces style.
- **Recommendation:** detect once, on the first `useHasSlottedPolyfill` call.

`RF-58` is proposed in slot `c`'s CI-deps handoff, so this is the next free number. The main slot's architect may renumber either.

**Registered** as `RF-59` at `836d4d003`, Tier A, and observed at `abfc843a8`. **Its repair is item 3,** which replaces the recommendation above: see [The light-DOM selector, read](#rf-59-the-light-dom-selector-read).

## Item 1. The tests

**Required:**

- **`tests/text-field/text-field.browser.test.ts`** gains a `describe` for slotted content. For each of `lead`, `trail`, `prefix`, `suffix`, `support` and `counter`, one row: slotting deterministic content into that slot applies the rule that the slot's presence selects, and removing the content withdraws it.
- **`tests/list/list-item.browser.test.ts`** gains the same for `support` and `overline` alone, and for both together. Both together select the three-line height and the doubled support row.
- **Observe the outcome, not the mechanism.**
  - Assert the computed style or the geometry of the shadow element that the rule's properties lay out. For example, the size of the text field's lead column; the inline start of its input; its row count and row gap; or the list item's `.host` block size.
  - Don't assert a state, a class or a private custom property. Then the same row holds whichever path an engine takes, and a broken fallback fails the row in Firefox.
- **Exact values.** Where a value is a token's, compare it with what the shadow element computes when the slot is empty, or derive it as the [`test-visual-contract`](../../.claude/skills/test-visual-contract/SKILL.md) skill says. Copy no literal. Follow the [`test-component`](../../.claude/skills/test-component/SKILL.md) skill: render the real element; wait for slot settlement and a frame through `tests/support` helpers, not by sleeping; one `it` per slot.
- **No product change,** with one exception. `useHasSlottedPolyfill` gains a JSDoc that names the coupling: the state is `has-<slot name>`, and the build derives the same name from the class beside `:has-slotted`, so a slot's `name` and that class must agree. The JSDoc points to `hasSlottedFallbackVisitor`.

**Witnesses:**

1. **The rows pass** in Chromium, Firefox and WebKit: `aube exec -- just test --project browser` locally for Chromium, and the pull request's `firefox` and `webkit` jobs. Locally, `MX_TEST_ENGINES=firefox,webkit` runs the other two in the devcontainer, where WebKit launched for this reading.
2. **Firefox's rows test the fallback.** Temporarily make the polyfill skip the states, for example by removing its `toggleState` call. Before item 3 lands, forcing the detection to `true` does the same. Every new row fails in Firefox and passes in Chromium and WebKit. Save the output, and revert.
3. **The rows test the rules.** Temporarily rename `class="lead"` on text-field's lead slot. The `lead` row fails in every engine, because the slot loses its own rule, `.lead { grid-area: L; … }`. Save the output, and revert. (**Corrected 2026-11-18** on the feature proof's `reviewer-1`. This witness said that the row fails in Chromium and Firefox because _"the class path loses the rule, and the fallback's derived name no longer matches"_. Since item 3, every engine sets `has-lead` from the slot's `name`, and the host rule still applies in all three. The coupling that `RF-40` names is witnessed by the review's mutation _3c_ (see the disposition below).)
4. `aube exec just typecheck` and `aube exec just lint` exit 0. Follow `.agents/docs/handoff.md` for the changed files.

**Stop and return to the architect** if a row fails in one engine without either mutation. That would be the rendering difference `RF-40` asked about, and it is a finding of its own.

## Item 2. The report

`.plan/host-has-fallback-1/host-has-fallback-report.md`: the rows, each engine's result with the pull request's run identifiers, and both mutations' outputs under `checks/`. Don't change `RF-40`'s status. The main slot's architect closes it from the report and the review.

**Item 3's witnesses go in the same report,** in a section of their own. If item 1 isn't authorized, the report carries item 3 alone. Don't change `RF-59`'s status either.

## `RF-59`: the light-DOM selector, read

The owner asked whether `:host(:has(> [slot=lead]))` could replace the polyfill. That selector reads the host's light-DOM children by their `slot` attribute. He recalled that it works in Firefox and Safari, and that `:has-slotted` works in Chrome, so the two rules side by side might cover every engine with no runtime. [The reading](checks/rf59-light-dom.txt) tested it with raw rules, as an author would write them:

|  | Chromium 158 | Firefox 159 | WebKit 27.2 |
| --- | --- | --- | --- |
| `:host(:has(> [slot=lead]))` | not parsed | parsed, but goes stale | matches, and follows every change |
| `:has-slotted` | no | yes | no |
| `:host:has()` on the shadow tree | yes | no, although `CSS.supports()` says yes | yes |

- **Chromium matches neither selector,** so no CSS selector tells Chromium 158 that a slot has content. Only the runtime's class does.
- **Firefox matches `:host(:has())` only when the host's own style is computed.** After a child is added or removed, the rule keeps its old answer until the host is re-inserted. A stale match is worse than none.
- **The owner's recollection holds for WebKit's `:host(:has())` only.** The table above is what was read, and it agrees with `RF-40`'s reading D.
- **Where it works, it still misses:**
  - the default slot, because `:not([slot])` sees element children and never text. The list item's label is usually text, and its `slot:has-slotted` rule has to see it;
  - the slot-level rules (`slot:has-slotted`, `.label :has-slotted`, `.counter :has-slotted`, `.prefix:has-slotted`), which style the slot and not the host. Each would need rewriting.

  A re-slotted, empty `<slot slot="lead">` counts as content. The polyfill's `assignedNodes()` agrees, and Firefox's native `:has-slotted` doesn't, so this isn't a regression against today.

- **The specification rules it out today.** [csswg-drafts#11859](https://github.com/w3c/csswg-drafts/issues/11859), _"Should :host(:has()) match?"_, is open; its last comment is from 2026-03-28. Selectors 4 makes `:has()` invalid inside `:host()`, which takes a compound selector. The working group discussed it on 2025-04-03 without a resolution. Gecko's maintainer named invalidation as the obstacle, and Firefox's stale match is that obstacle.

**So the polyfill can't go now,** and `RF-59`'s repair isn't its removal. It can go when every engine that material-x supports (`RD-20`, on `repo/traits-plugin-1`) matches `:has-slotted` and `:host:has()`. Then the build's rewrite and the runtime are removed together. `:host(:has())` isn't a route while Chromium doesn't parse it and #11859 stays open.

**Why item 3 doesn't detect at all.** The earlier recommendation was to detect on the first `useHasSlottedPolyfill` call. That still forces a style computation, now in an element's constructor. It also still needs a document to append to. `CSS.supports()` can't replace it, because Firefox reports `:host:has()` as supported and doesn't match it. The detection isn't needed:

- the build writes each `:host(:state(has-<class>))` into the same rule as the `:host:has(.<class>.has-slotted)` it stands for (`RF-40` reading A). Where both match, they set the same declarations;
- Chromium 158 and WebKit 27.2 match `:host(:state())` (reading D, _afterState_);
- the `has-*` states are private, derived states ([`attribute-vs-state-styling.md`](../../.agents/docs/attribute-vs-state-styling.md)), so setting them in every engine changes no public surface.

Setting the state in every engine therefore renders the same in each engine as today, and costs one `toggleState` per `slotchange`.

## Item 3. `RF-59`: the polyfill sets its states in every engine, and detects nothing

One commit. It can land before item 1, or without it.

**Required:**

- **`polyfills.ts` has no detection.** `HOST_HAS_SUPPORTED` goes. On every `slotchange`, `useHasSlottedPolyfill` sets the slot's `has-slotted` class and the host's `has-<slot name, or default>` state, in every engine.
- **Importing the module evaluates declarations only.** Nothing in the module touches `document` or reads a computed style when it loads. The function touches only its host's shadow root and internals.
- **The JSDoc** that item 1 requires, if item 3 lands first. It also says three things:
  - the state is set in every engine, because no selector tells reliably whether `:host:has()` matches;
  - where both selectors match, they set the same declarations;
  - the function and the build's rewrite go together, when every supported engine matches `:has-slotted` and `:host:has()`.
- **Nothing else changes:** not the visitor, the stylesheets, the templates, nor `TextFieldCore.ts` and its TODO (`RF-54`'s branch edits that file).

**Witnesses:**

1. **A gate row fails before the change and passes after it,** in all three engines. Importing the module calls neither `document.body.append` nor `getComputedStyle`. For example, the row can evaluate a fresh instance of the module while it observes both. The [`test-component`](../../.claude/skills/test-component/SKILL.md) skill's routing decides the file. Save the failure from before the change.
2. **The import before `<body>` no longer fails.** Re-run [the head-import probe](checks/rf59-head-import-probe.mjs) against a build of this branch. Every scenario defines the element and upgrades it in all three engines, `classic-bundle` included. Save the output as `checks/rf59-head-import-after.txt`.
3. **The rendering doesn't change.** The `visual` project passes with no baseline changed, and the `browser` project passes in all three engines. If item 1 has landed, its rows pass in all three engines.
4. `aube exec just typecheck` and `aube exec just lint` exit 0. Follow `.agents/docs/handoff.md` for the changed files.

**Stop and return to the architect** if a visual baseline changes. That would mean that a state rule and the `:host:has()` rule it stands for differ somewhere, against reading A.

## What the implementation waits for

- **Proposal 1's record,** and the owner's answer to question 1.
- **Not `RF-43`** (#35, `repo/host-invariant-1` at `b7e1386e3`). It doesn't touch `polyfills.ts`, the visitor, or text-field and list sources, sheets or tests (reading C, and `git diff --name-only` at that commit). It changes three shared files under `tests/support`:
  - `browser-commands.ts`;
  - `commands.node.ts`;
  - `input-commands.node.ts`.

  **If item 1 needs a change to one of them, it waits for #35 to merge,** then branches from or merges `main` (`RD-17` property 5). Adding a new helper file needs no wait. **#35 merged** at `377ca72df`, and this branch merged it in `b44c655d7`, so nothing waits for it now.

- **Not `repo/declarations-check-1`** (`RF-54`). It removes the `@ts-expect-error` in `TextFieldCore.ts`, and this unit doesn't edit that file.

## Disposition of the feature proof of items 1 and 2 at `3361b6b76`

**Decided 2026-11-18 by the architect,** on the [feature proof](../reviews/host-has-fallback-1/feature-proof-rf40-claude.md), which read the code at `90789d260`, relayed by the coordinator. Items 1 and 2 hold, except for the pull request's `firefox` and `webkit` run identifiers, which are open.

| Finding | Disposition |
| --- | --- |
| `reviewer-1`: the handoff and the report explain witness 3 by a mechanism that the rows don't observe | **Accepted, Tier C.** The architect corrected witness 3 above. The implementer corrects the report's sentence (item 4) |
| `reviewer-2`: `getShadowElement`'s JSDoc and the report say that the rows find their elements by `part`, but `.notched-outline` and `.input` are found by class | **Accepted, Tier C. Remediated in this pull request** (item 4) |
| `reviewer-3`: `RF-40` lists `list/styles/item/main.styles.css:184`, and no row observes it | **Accepted, Tier C. Remediated in this pull request** with a row (item 4). `RF-40` closes on tests, so every rule it lists gets one |
| `implementer-1`: nothing reads `--_support-row-size` since `ede90d958`, and `.support` is clamped to two lines whatever the line count | **Accepted. Registered as `repo:RF-64`,** outside this unit. It is product CSS, and this unit changes no stylesheet. Item 1's _"doubled support row"_ has no rendered outcome, so the row for both slots is right to assert the three-line height alone |

**The review's mutation _3c_ is the coupling's witness.** The review renamed the class to `leading` in the sheet and the template and kept the slot's `name`, `lead`. The lead rows then failed in Firefox alone. That is the mismatch `RF-40` names, between the class from which the build derives `has-leading` and the name from which the runtime sets `has-lead`. The review's [runs](../reviews/host-has-fallback-1/checks/feature-proof-rf40-runs.txt) §3c hold it, and the report cites them. The implementer doesn't repeat it.

## Item 4. The feature proof's findings (one commit, then the record)

**Required:**

- **`reviewer-2`:** the JSDoc above `getShadowElement` in `tests/text-field/text-field.browser.test.ts` describes the lookups as they are written. The slots and the supporting rows are found by `part`. `.notched-outline` and `.input` are found by class, and no selector beside `:has-slotted` names either one.
- **`reviewer-3`:** one row in `tests/list/list-item.browser.test.ts` for the rule at `:184`. A slotted leading video takes the large leading video's width and height when both `support` and `overline` have content, and the small size when only one of them does, or neither. The size returns once the content is removed. The values come from `list-item.default`'s tokens (`large.leading-video.*`, `small.leading-video.height`, `leading-video.width`), with item 1's rules: the outcome only, the real element, and no literal.
- **Nothing else changes** under `src/` or in the stylesheets.

**Witnesses:**

1. The new row passes in Chromium, Firefox and WebKit locally.
2. **It tests the fallback:** with the polyfill setting no state, as in witness 2, the new row fails in Firefox and passes in Chromium and WebKit. Save the output under `checks/`, and revert.
3. The handoff loop on the two changed test files, and `aube exec just typecheck` in material-x.

**Stop and return to the architect** if the new row fails in one engine without the mutation. That would be the rendering difference `RF-40` asked about.

**The record,** in the report, in a commit after the pull request's run on item 4's commit:

- witness 3 states the mechanism as observed, and cites the review's _3c_ as the coupling's witness;
- the report's sentence on the lookups agrees with `reviewer-2`'s correction;
- the new row and its witness;
- the `firefox` and `webkit` run identifiers, and item 3's `visual` reading, all from the pull request's run on item 4's commit. That run reads the tree that merges. Run 44270214696, on `3361b6b76`, doesn't.

**No new review.** The architect reads item 4's diff and the report.

## Closing `RF-40` and `RF-59`

The architect closes both on this branch, where `RF-59`'s entry is and where `RF-40`'s notes are, so the closures reach `main` with #59. Each closes when:

- **`RF-59`:** item 3's last witness holds. In the pull request's run on item 4's commit, `visual` passes with no baseline changed, and `browser` passes in the `chromium`, `firefox` and `webkit` jobs. A changed baseline is item 3's stop.
- **`RF-40`:** item 4 is in, its row and its Firefox witness hold, and the same run passes item 1's rows in all three jobs. The report records the run's identifiers. Every rule that `RF-40` lists is then witnessed in the gate.