# Findings unit, first unit — feature proof

**Commit files were read at:** `fc3b89680486aa90f20a08de7ec1a4c6ac7f9029` (`repo/findings-1`, read in a worktree of my own; the tree was clean). **Diff reviewed:** `275ad0f5c` (exclusive) → `fc3b89680` (inclusive), 23 commits, excluding `.plan/`. **Records read at:** `8ca27201a13f9ce2df72ed8d1642e5d2dff51da5`, the architect's disposition.

**Governing records:** [`findings-1-handoff.md`](../../findings-1/findings-1-handoff.md), with its amendments and §Disposition of the report at `fc3b89680`, whose _Feature-proof review before merge_ sets the seven focus items; [`findings-1-report.md`](../../findings-1/findings-1-report.md) and its readings under [`checks/`](../../findings-1/checks/); `repo:RD-12` property 10, `RD-14`, `RF-23`, `RF-30`, `RF-33` to `RF-37`, `RF-39`, `RF-41` and `RF-42` in [`00-index.md`](../../00-index.md); box-quad's [`02-behavior-scenarios.md`](../../../packages/box-quad/.plan/contract/02-behavior-scenarios.md) and [`04-support-matrix.md`](../../../packages/box-quad/.plan/contract/04-support-matrix.md).

**Lens:** feature proof. Each focus item is read against the diff, the tree and the cited readings. Nothing is repaired.

## Scope

**Covered.**

- `.github/workflows/docs.yml`, line by line, against `RD-14` properties 1 to 5, in place of the waived actionlint check. Each pin was resolved through the GitHub API. GitHub's concurrency documentation and changelog were read for `queue: max`.
- The root `Justfile`'s `docs-build`, `_package-builds`, `_test-builds` and `test`; material-x's `docs-build` and `docs-prepare`; `.storybook/main.ts`; `nx.json`'s `targetDefaults`. Every `@ydinjs/*` import in each package's `src/`, in the stories and in the Vite and Storybook configuration.
- `forwardFocus` and its two callers, every material-x template and host `display` rule, every `delegatesFocus` site, and the `RF33F`, `RF33M`, `RF33T` and `RF33A` readings.
- Every changed material-x stylesheet, template and `tokens.ts`. Every token package that a button, an icon button, a checkbox or a radio adopts was rendered at `275ad0f5c` and at `fc3b89680` with a scratch script, and the two outputs were diffed.
- `focus-layer.spec.browser.test.ts`, the bridge it calls (`tests/support/visual-contracts.node.ts`), and the mutation and indicator readings.
- `coordinates.browser.test.ts`'s bound and row, box-quad's recovery (`src/index.ts:355`–`:378`), the contract sentence and the support-matrix row, and both `RF-34` readings.
- The `cacheDir` removal, and every remaining reference to `.vite` or `cacheDir` in the tree, outside `.plan/` and Markdown.
- `verify` run 43895450645 and _Publish Docs_ run 43895450612, both at `fc3b89680`: their job results and Safari's failed rows.

**Not covered: these areas are unread, which isn't the same as clean.**

- No build, lint, typecheck or test was run. The only code I ran was the token-rendering script, which renders the component token packages, as the build does, and writes nothing.
- `deploy` hasn't run. That configure-pages and deploy-pages work with only `pages: write` and `id-token: write` is taken from deploy-pages v5.0.1's README. The coordinator reads `deploy`'s first run after the merge.
- Item 3 (`RF-36`), item 6's readings beyond the source claims, and the CI runs behind `firefox-three-runs.txt` were read only as the report and its checks state them.
- `RF-42`'s Option-Tab change, which the coordinator excluded.

**Focus items that hold, with no finding:**

- **1. `docs.yml` against `RD-14`.**
  - **Tokens.** The workflow's default token is `contents: read` (`:23`–`:24`). `build` restates it (`:31`–`:32`). Only `deploy` holds `pages: write` and `id-token: write` (`:52`–`:54`).
  - **A pull request's run can't publish,** for two reasons:
    - `deploy` runs only when `github.ref == 'refs/heads/main'` on a `push` or a `workflow_dispatch` (`:49`), and a `pull_request` run's ref is `refs/pull/<n>/merge`;
    - the `github-pages` environment allows only `main` ([`pages-environment-policy.txt`](../../findings-1/checks/pages-environment-policy.txt)).
  - **Triggers and draft skip.** `build`'s `if: github.event.pull_request.draft != true` (`:28`) is true on a push or a manual run, where `pull_request` is null. `deploy` needs `build` and has no `always()`, so a skipped `build` skips it.
  - **Pins.** Each hash is the commit of the tag in its comment, and each tag is its action's latest release: `checkout` v7.0.1 `3d3c42e5…`, `setup-node` v7.1.0 `949feb24…`, `upload-pages-artifact` v5.0.0 `fc324d35…`, `configure-pages` v6.0.0 `45bfe019…` and `deploy-pages` v5.0.1 `368f8252…`. `checkout` and `setup-node` match `verify.yml`'s hashes. `upload-pages-artifact` v5.0.0 itself pins `actions/upload-artifact` by hash.
  - **Environment.** The workflow runs on `ubuntu-24.04` with `NODE_VERSION: 26` (`:15`), which `verify.yml:24` also names.
  - **Concurrency.**
    - A pull request's runs share `docs-<number>` and cancel the older run (`:20`–`:21`).
    - Every other run's group is its own run id, so a push to `main` cancels nothing.
    - `deploy`'s job group `pages` has `cancel-in-progress: false` and `queue: max` (`:59`–`:61`). GitHub's documentation says that `queue: max` allows up to 100 pending runs in a group, and is invalid only together with `cancel-in-progress: true`. So deployments run one at a time and a newer one doesn't cancel a pending one.
  - **Expressions.** I read all six: `:20`, `:21`, `:28`, `:49`, the `node-version` input and the environment `url`. Each uses a context that is available where it appears, and none compares mismatched types.
  - **Outside the gate.** `verify.yml` is unchanged in the diff.
- **2. `_package-builds`.**
  - It builds `box-quad`, `core`, `tproc`, `vite-custom-element-assets` and `vite-traits-plugin` (`Justfile:90`).
  - What the docs import by name is exactly that set:
    - the stories import only `@ydinjs/box-quad`;
    - drag's source imports box-quad;
    - material-x's source imports `core` and `tproc`;
    - the Storybook and Vite configuration import `core` and the two Vite plugins.
  - `_test-builds` now depends on it and then runs material-x's `build:prepare`. That is the same commands, in the same order, as `_test-builds` ran at `275ad0f5c`, so `test` and `test-safari` build as before.
  - material-x's own `docs-build` already runs `build:prepare` through `docs-prepare`.
- **3. `forwardFocus`.**
  - **The same target as delegation.** Its target for each caller is the element that delegation focuses: `ButtonCore`'s `.control ?? .host`, and the list item's `.host`. The switch templates put `.control` before the span `.host`, and the other templates have one focusable element. `RF33F` reads the same element in Chromium and Safari for all seven elements.
  - **The scope is complete.** Every material-x host with `display: contents` that delegates focus calls it. FAB, the split button and the plain list item don't delegate focus. Checkbox, radio and text field aren't `display: contents`.
  - **Options and engines.** The options pass through unchanged, and the function detects no engine.
  - **No exported surface changes.** `core/` isn't in material-x's `exports`, and no class declares a member. The instance-level surface is `reviewer-2`.
  - **A control that can't take focus:** see `reviewer-4`.
- **4. The focus layer and the indicator.**
  - **The values come from material-x's own token selection.** Every focus-layer variable is a `specialTokens` or `.append` entry in a material-x `tokens.ts`, and tproc's processing doesn't change: `packages/tproc` isn't in the diff.
  - **The existing variables are unchanged.** I rendered every token package that the button, icon button, checkbox and radio adopt, at `275ad0f5c` and at `fc3b89680`. The only differences are 14 added declarations of `--_focus-layer-color` or `--_focus-layer-opacity`, two of them in a new `:host` block in checkbox's package. No other variable changes value or selector.
  - **Each variant's focus colour equals its own focused state-layer colour,** as tproc renders it under `:focus-within`: elevated and text `primary`, tonal `on-secondary-container`, outlined `on-surface-variant`, filled `on-primary`.
  - **The icon button's mapping is right.** Tonal and standard icon buttons declare their own focus colour. For the small and filled icon buttons the colour equals the default button's `on-primary`, so tproc's deduplication drops it.
  - **The checkbox's selected colour covers indeterminate:** it is rendered on `:host(:state(checked)), :host(:state(indeterminate))`.
  - **Focus wins over hover.** The focus rules have specificity (0,4,1) (`button/…/main.styles.css:111`, `radio/…:61`, `checkbox/…:70`), and the ripple's hover rule `:host(:hover) .ripple::before` has (0,3,1).
  - **A disabled host draws nothing.** A disabled native control can't match `:focus-visible`, and `:host([disabled]) .ripple` is `display: none`.
  - **No `:host:has()` remains** in radio's or checkbox's focus rules.
  - **The checkbox's `.indicator`** has `aria-hidden="true"` and no `part`, and is `pointer-events: none`. It stretches over the host's single grid cell. No checkbox rule uses `+` or a structural pseudo-class that the new sibling could shift. [`rf39-indicator-before-after.txt`](../../findings-1/checks/rf39-indicator-before-after.txt) reads the same box, outline, offset and radius before and after, but locally.
- **5. The spec rows.**
  - **The expectations come from the components' states,** not from the focus-layer mapping. `expected()` asks the bridge for `state-layer.color` and `state-layer.opacity` at the `focused`, `unselected.focus` or `hovered` state of the component's own token package (`visual-contracts.node.ts:83`–`:104`). So a focus-layer mapping that named the wrong token would fail the rows.
  - **The reach assertion** `tabTo` checks both `document.activeElement` and the shadow root's `activeElement` before any layer or indicator is read.
  - **The mutation reading** ([`rf35-focus-layer-mutation.txt`](../../findings-1/checks/rf35-focus-layer-mutation.txt)) fails exactly the 8 rows that depend on the renamed selectors, in Firefox, and the hover and click rows pass. Coverage beyond those three states: `reviewer-3`.
  - **At `fc3b89680`,** `verify` 43895450645 fails only in `safari`, on the 9 rows that `RF-42` names. `static`, `chromium`, `firefox` and `measurements` pass.
- **6. `RF-34`.**
  - **The derivation matches the recovery.** It derives from the formula the code uses, w = (W|d| − H|c|)/det (`src/index.ts:373`–`:374`), where W and H are the rect's own width and height, each off by at most e = q + r.
  - **The arithmetic checks.** det = 1.6875 − 0.5625 = 1.125, and (0.75 + 1.299)/1.125 × (1/60 + 2^-14) = 0.03047 px, above the observed 0.0076 and 0.0098.
  - **The row** adds the bound only in Firefox, and its marking is removed.
  - **The support-matrix row** names each engine's q and r and cites the reading.
  - **One limit, with no finding:** the reading tested only q = 1/60 and 1/64 for _"no q"_. That is narrower than the amendment's _"no q coarser than 1e-4"_. The row's 1e-4 holds in Chromium and Safari regardless: their residuals are 3.1e-5 and 2.0e-6.
- **7. The `cacheDir` removal.** Nothing in the tree reads `.vite` as a cache location. The remaining references are the ignore and clean patterns that the report lists under _Left in place_, plus `.oxlintrc.json:16`, `eslint.config.ts:25` and `codecov.yml:19`, which are ignore patterns too.
  - **A side effect the report doesn't name:** `vite-traits-plugin`'s transform skips any id containing `/node_modules/.vite/` (`src/plugin.ts:58`). Since `cacheDir: '.vite'`, that exclusion hadn't matched the pre-bundle, and it matches again now. That is the plugin's stated intent, the pre-bundle's 19 entries are unchanged, and the gate's engines pass, so I record it without a finding.

## Findings

### reviewer-1 — Tier C — The switch buttons adopt the focus-layer rule, but it can't match them, so keyboard focus draws no focus layer on them

**Proposed: doesn't block merge.** `RF-35`'s required property names only `mx-radio`, `mx-checkbox` and `mx-button`. This is for the architect to scope.

**Current behavior.**

- `mx-switch-button` and `mx-switch-icon-button` build through `useButtonCore`, so they adopt `button/styles/default/main.styles.css` and its new rule `:host .host:focus-visible > .ripple::before` (`:111`).
- In their templates, `.host` is a `<span>` and the focusable element is the `<input class="control">` before it (`switch-button.tpl.html`, `switch-icon-button.tpl.html`). So `.host` never matches `:focus-visible`.
- Their keyboard focus indicator uses a different trigger, `.control:focus-visible + .host` (`switch-control.styles.css:19`).
- None of the switch token packages (`defaultSwitchTokens`, `elevatedSwitchTokens`, `tonalSwitchTokens`, `outlinedSwitchTokens`, `variantSwitchTokens`) declares a focus-layer variable for the checked or unchecked state.

**Why it is a problem.** It is the gap that `RF-35` registered for radio and checkbox: the tokens define a focus state layer, and a keyboard-focused switch button draws only the outline. The report's §7 says that _"the button's focus rule is in the default sheet that every button adopts"_. That is true of the stylesheet but not of what is drawn, so a reader of `RF-35`'s closure would take the button family as covered.

**Evidence.** The templates and selectors above. The rendering of each switch token package at `fc3b89680` has no `--_focus-layer-*` declaration. No row reads a switch button's focus layer.

**Required property.** Either the switch buttons draw the focus state layer that their tokens define, for checked and unchecked, on their focus indicator's trigger, or the record states that `RF-35` excludes them and why.

### reviewer-2 — Tier C — `forwardFocus` makes `focus` an own, writable property of each instance, which shadows a subclass's `focus()`

**Proposed: doesn't block merge.** It is a public-surface question for the architect. If subclassing a component class is a supported integration, the consequence is Tier A.

**Current contract.**

- The handoff's item 4, as amended, says: _"Signature: `focus(options?: FocusOptions): void` … No other member or type changes."_
- `RF-33`'s ruling says that _"the declared member restates an inherited one."_
- [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) §Class encapsulation says: _"Public instance and static fields must be `readonly`."_

**Current behavior.** `forwardFocus` runs `host.focus = (options) => { control.focus(options); }` (`useCore.ts:24`–`:28`), from the constructors of `ButtonCore` and `ListInteractiveItemCore`. Each of the seven elements then has an own, enumerable, writable `focus`. The classes are public: `Button`, `ListButtonItem` and the others are each entry's default export.

- A consumer subclass that declares `focus()` never has it called. The base constructor's own property shadows the subclass's prototype method.
- Inside such a subclass, `super.focus()` resolves to `HTMLElement.prototype.focus`, which bypasses the forward and doesn't delegate in Firefox.
- `Object.hasOwn(element, 'focus')` is true, `Object.keys(element)` includes `'focus'`, and assigning `element.focus` replaces the forward.

**Why it is a problem.** Each of these is observable and differs from `275ad0f5c`. The handoff allowed no member change beyond `focus`'s own signature, and the instance property is a public field that isn't read-only. Whether a subclass's `focus()` is part of the supported surface is the architect's call.

**Evidence.** The assignment in `useCore.ts:25`, and the default exports in `button/button.ts:72` and `list/list-button-item.ts:49`. JavaScript resolves an own property before the prototype chain. No row subclasses a component.

**Required property.** `focus()` on each listed host focuses its control, and a subclass's own `focus()` or a `super.focus()` call behaves as the architect decides. The record states which.

### reviewer-3 — Tier C — No spec row reads the selected-state focus colours, or any button colour other than filled

**Proposed: doesn't block merge.** The values are correct at `fc3b89680`, as read under focus item 4. This is coverage, not behavior.

**Current behavior.** The spec rows read only:

- `mx-button` in its default colour, filled (`button.color.filled`);
- `mx-checkbox` and `mx-radio` unchecked (`unselected.focus`).

These focus-layer mappings are read by no row:

- checkbox's and radio's `selected.default` entries (`checkbox/…/tokens.ts:51`–`:54`, `radio/…/tokens.ts:36`–`:39`), which also cover the indeterminate checkbox;
- the elevated, outlined, text and tonal colours;
- the tonal and standard icon buttons.

**Why it is a problem.** Item 7, as amended, requires the values _"for each selection state the tokens define"_. A change that dropped or misnamed any of these mappings would pass every row. The visual layer wouldn't catch it either, because the comparator doesn't see a layer at 0.1 opacity (`RF-41`).

**Evidence.** `CASES` in `focus-layer.spec.browser.test.ts:28`–`:56`. The bridge already registers `button.color.elevated`, `.tonal`, `.outlined` and `.text` (`visual-contracts.node.ts:63`–`:67`). My rendering at `fc3b89680` shows the selected and per-colour values, which no row asserts.

**Required property.** Each focus-layer mapping that a component declares is read by a row against its own focused state's tokens, or the record states which mappings stand without a row.

### reviewer-4 — Tier C — The report says that focusing a control that can't take focus behaves as delegation does, with no reading or row

**Proposed: doesn't block merge.** By HTML's focusing steps the claim holds. What's missing is the evidence.

**Current contract.** The handoff's item 4, as amended, says: _"A control that can't be focused: for example a disabled one. The forward focuses nothing, and focus stays where it was, as delegation does."_

**Current behavior.** The report's §4 states it: _"A control that can't be focused keeps focus where it was, as delegation does."_ None of the readings `RF33F`, `RF33M`, `RF33T` or `RF33A` covers a disabled host or a link without `href`. No row calls `focus()` on a disabled listed host and checks where focus is afterwards.

**Why it is a problem.** It is one of the handoff's stated properties for the forward, and the report gives it as observed. The spec reasoning supports it: `focus()` on a control that isn't a focusable area returns early, and delegation finds no focus delegate. But nothing would show a regression, for example a forward to an element that is focusable while the control isn't.

**Evidence.** [`rf33-repair-readings-run-1.txt`](../../findings-1/checks/rf33-repair-readings-run-1.txt). The new rows are in `button.browser.test.ts`, `SwitchCore.browser.test.ts` and `list-item.browser.test.ts`.

**Required property.** The record holds an observation, in each engine, that `focus()` on a listed host whose control can't take focus leaves `document.activeElement` unchanged, or it states the claim as derived from the specification, not observed.

## Summary

| Id | Tier | Claim | Blocks merge |
| --- | --- | --- | --- |
| `reviewer-1` | C | Switch buttons adopt the focus-layer rule, which can't match them; no focus layer on keyboard focus | No |
| `reviewer-2` | C (A if subclassing is supported) | `forwardFocus` makes `focus` an own, writable instance property that shadows a subclass's `focus()` | No |
| `reviewer-3` | C | No spec row reads the selected-state or non-filled focus colours | No |
| `reviewer-4` | C | The non-focusable-control claim has no reading or row | No |

Focus items 1, 2, 5, 6 and 7 hold with no finding. Items 3 and 4 hold for what the handoff requires, with the findings above. The unit's `verify` is red only on `RF-42`'s 9 Safari rows, which the coordinator excluded from this review.