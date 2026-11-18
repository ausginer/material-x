# Report: `RF-59`'s repair (handoff item 3)

**Input:** `repo/host-has-fallback-1` at `d23abc117`, the [handoff](host-has-fallback-handoff.md)'s item 3. **Governing record:** `repo:RF-59`, in [`../00-index.md`](../00-index.md). Items 1 and 2 wait for the owner's answer to the handoff's question 1, so this report carries item 3 alone. `RF-59`'s status is unchanged.

## Item 3. The polyfill sets its states in every engine, and detects nothing

**Changed:** `packages/material-x/src/core/utils/polyfills.ts`. `HOST_HAS_SUPPORTED` is gone. On every `slotchange`, `useHasSlottedPolyfill` sets the slot's `has-slotted` class and the host's `has-<slot name, or default>` state in every engine. Its JSDoc names the coupling with `hasSlottedFallbackVisitor`, and states the three points the handoff requires. The module evaluates declarations only. Nothing else changed: not the visitor, the stylesheets, the templates or `TextFieldCore.ts`.

**Added:** `packages/material-x/tests/core/utils/polyfills.browser.test.ts`, two rows in the `browser` project.

- _should neither append to the document nor compute a style when imported_ loads a fresh instance of the module through a query string, while it spies on `document.body.append` and `getComputedStyle`.
- _should set the host's has-<slot> state in every engine_ slots content into a text field's `lead` slot and waits until the host matches `:state(has-lead)`.

## Witnesses

1. **The rows fail before the repair and pass after it** ([before](checks/rf59-import-row-before.txt), [after](checks/rf59-import-row-after.txt)). Before, the import row fails in Chromium, Firefox and WebKit: one `append` and one `getComputedStyle`. The state row fails in Chromium and WebKit, where the detection read true, and passes in Firefox. After, all six runs pass.
2. **The import before `<body>` no longer fails** ([reading](checks/rf59-head-import-after.txt)). The head-import probe, re-run against slot `e`'s build of this branch, defines the element in every scenario, in all three engines and at both holds, with no error. That includes `classic-bundle`, `module-src-async` and both dynamic imports, which threw before.
3. **The rendering.**
   - The `browser` project passes in Chromium, Firefox and WebKit, run locally with `MX_TEST_ENGINES=chromium,firefox,webkit`: 11 files, each once per engine, 603 tests, none failed.
   - **The `visual` project isn't read yet.** It runs only in the gate's `chromium` job, and the gate runs on pull requests. There is no pull request yet, because `RF-40` is undecided. The first run of a pull request from this branch reads it. A changed baseline there is the handoff's stop.
4. `aube exec just typecheck` in `packages/material-x` exits 0. The handoff loop on both changed files ends with `just lint` at 0 errors.

**Outstanding:** the `visual` reading, at the pull request's first run.