# Handoff: `RF-40`'s fallback is complete; a test in every engine witnesses it

**Recipient:** the implementer, in a slot the coordinator assigns.

**Branch:** `repo/host-has-fallback-1`, from `origin/main` at `83a985b99`. **Input:** the architect's commit that adds this file.

**Begins after** the main slot's architect records proposal 1 (`RD-17` properties 4 and 7), and after the owner answers question 1. The owner is away, so the recommendation is stated with the question.

**Governing record:** `repo:RF-40`, in [`../00-index.md`](../00-index.md). It came from `RF-39`, which is closed.

**Evidence:** [the reading](checks/rf40-reading.txt) and [its probe](checks/rf40-engine-probe.mjs), at `83a985b99`.

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
2. **Firefox's rows test the fallback.** Temporarily make the polyfill skip the states, for example by forcing the detection to `true`. Every new row fails in Firefox and passes in Chromium and WebKit. Save the output, and revert.
3. **Chromium's rows test the rules.** Temporarily rename `class="lead"` on text-field's lead slot. The `lead` row fails in Chromium and in Firefox: the class path loses the rule, and the fallback's derived name no longer matches. Save the output, and revert.
4. `aube exec just typecheck` and `aube exec just lint` exit 0. Follow `.agents/docs/handoff.md` for the changed files.

**Stop and return to the architect** if a row fails in one engine without either mutation. That would be the rendering difference `RF-40` asked about, and it is a finding of its own.

## Item 2. The report

`.plan/host-has-fallback-1/host-has-fallback-report.md`: the rows, each engine's result with the pull request's run identifiers, and both mutations' outputs under `checks/`. Don't change `RF-40`'s status. The main slot's architect closes it from the report and the review.

## What the implementation waits for

- **Proposal 1's record,** and the owner's answer to question 1.
- **Not `RF-43`** (#35, `repo/host-invariant-1` at `b7e1386e3`). It doesn't touch `polyfills.ts`, the visitor, or text-field and list sources, sheets or tests (reading C, and `git diff --name-only` at that commit). It changes three shared files under `tests/support`:
  - `browser-commands.ts`;
  - `commands.node.ts`;
  - `input-commands.node.ts`.

  **If item 1 needs a change to one of them, it waits for #35 to merge,** then branches from or merges `main` (`RD-17` property 5). Adding a new helper file needs no wait.

- **Not `repo/declarations-check-1`** (`RF-54`). It removes the `@ts-expect-error` in `TextFieldCore.ts`, and this unit doesn't edit that file.