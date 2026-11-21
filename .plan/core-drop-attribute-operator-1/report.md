# Dropping core's attribute operator, `$`/`$$` and `define()`

2026-11-21. Implementer's report for branch `core/drop-attribute-operator`.

## Input

- The owner's uncommitted edits to `packages/core` in the primary checkout, exported as a patch and committed unchanged as `09bd66d99` on `9377c7e1d`. They replace the attribute operator (`operator`, `AttributeOperator`, `get`/`set`/`getRaw`/`setRaw` and the default export of `attribute.ts`) with `setAttribute(element, qualifiedName, value)`, which removes the attribute on `null`. They also remove `$`/`$$` from `utils/DOM.ts` and `define()` from `element.ts`, and make small edits in `useCSSProps`, `createContext`, `useSlot`, `ControlledElement` and `linkable`.
- The coordinator's task: adapt core's tests, `@ydinjs/vite-traits-plugin`, material-x and the documentation to these edits. Keep the owner's design and add no replacement helper.
- `origin/main` moved to `73f081dc4` (#90, RD-31) during the work. It is merged into the branch, and the sizes below compare against it.

## Outcome

**Why vite-traits-plugin broke.** Layer (b) lowered each `accessor name!: T` line to `__mxflat_attr.get(this, "name", C)` and `__mxflat_attr.set(this, "name", value, C)`. It also prepended `import __mxflat_attr from "…/attribute.js"`, which is the default export that the owner's edit deleted. Every trait module that uses `@attributes` then failed with rolldown's `MISSING_EXPORT` error, core's own build included. Core builds through the plugin, so material-x and every test run failed before any test started.

**The fix** (`src/attributes/lower.ts`). The getter is `C.from(this.getAttribute("name"))`. The setter is `__mxflat_setAttribute(this, "name", C.to(value))`, which imports `{ setAttribute as __mxflat_setAttribute }` from the same specifier as before. `operatorSpecifier` is renamed to `attributeModuleSpecifier`. `C` is the table's converter text, which `readTable` already restricts to an identifier or a member expression, so the appended `.from(…)` and `.to(…)` can't bind differently. The behavior is the old operator's: `get` was `from(getRaw())`, and `set` was `setRaw(to(value))`. The plugin's tests and the hand-written `consumer.expected.ts` follow the new form.

**Core's tests.** `utils/DOM.browser.test.ts` loses its `$`/`$$` cases. The owner had marked the converter cases in `attribute.browser.test.ts` `it.skip`. They still called the deleted `attr`, so the file didn't typecheck. They now read through `C.from(host.getAttribute(…))` and write through `setAttribute(host, …, C.to(…))`, the form that the lowered accessors use, and they run again. This is a separate commit, `0892ff552`, so the owner can drop it if he wanted those cases removed.

**material-x.** `$(host, sel)` becomes `host.shadowRoot!.querySelector(sel)`, the form the owner used in `useSlot`. Every material-x shadow root is open (`useShadowDOM`). `$$` becomes `querySelectorAll`. `define(name, C)` becomes `customElements.define(name, C)`. The two default `attribute` imports, in `core/utils/useContext.ts` and `text-field/TextFieldCore.ts`, become `getAttribute` and `setAttribute`. The split-button test's lookup uses optional chaining, because the swept `a && a.shadowRoot!…` form fails `prefer-optional-chain`. The sites that #90 added, in `mx-sortable-list` and its test, are migrated after the merge.

**Documentation.** `.agents/docs/architecture.md`, `.agents/docs/trait-flattener-plugin.md` and `packages/core/README.md` no longer name the removed API. The README now describes `setAttribute`. architecture.md dropped the line "`define(name, class)` centralizes `customElements.define`", and this record now carries it. Historical records under `.plan/` aren't rewritten.

Core's `reorderable` trait isn't touched. #90 deleted it, and the merge took that deletion with no conflict in the trait.

## Sizes

Brotli bytes, at head `f01131795` against `73f081dc4` (#90's merge, the branch's merge base). The full table is in [`checks/size-report.md`](checks/size-report.md), and the readings are beside it. `just size` passes. The box-quad and drag rows are 0, as expected: the change doesn't reach them, and they serve as the control.

| Row                                |  Head |  Base |    Change |
| ---------------------------------- | ----: | ----: | --------: |
| core `element`                     |   275 |   312 |       −37 |
| core `emitter`                     |   198 |   198 |         0 |
| material-x, 17 of 19 entry rows    |       |       | −3 to −64 |
| material-x `list/list-item`        |  2846 |  2828 |       +18 |
| material-x `text-field/text-field` |  8210 |  8188 |       +22 |
| material-x `complete`              | 22237 | 22092 |  **+145** |

**`complete` grows even though most entry rows shrink.** The ablations below are rough rankings only. Brotli deltas don't add up (`CONTRIBUTING.md` §15), and the joint figure above is the measured result. Transcript: [`checks/complete-ablations.txt`](checks/complete-ablations.txt). Probes: [`probes/`](probes/). `bundle.ts` reproduces size-limit's `complete` figure exactly.

- **`customElements.define` instead of a shared `define()`: about 96 B.** A probe build in which each component called one shared `define` wrapper, reverted afterwards, measured `complete` at 22141. With the local wrapper, the minifier inlined each component's class expression into the call. It doesn't move the class past the global `customElements.define` read, because the class has static side effects. So each of 17 components now keeps a `var X = class …` binding beside the call.
- **The lowered accessor form: about 7 B** (+1014 minified, 78 accessor pairs). A textual rewrite of the head bundle back to the operator's call shape measured 22230.
- **`shadowRoot.querySelector` instead of `$`: about 6 B**, by the same kind of textual rewrite.

The owner asked for `define()` to be removed, and it stays removed. The cost is recorded here for him to weigh. It is paid only where all the components are bundled together, and each single-entry row still shrinks.

## Verification

- Format, lint-fix, format and lint on every changed `.ts` file, by package. The owner's 11 files are clean too. Lint does not apply to Markdown, which `oxfmt` formatted. `git diff --check` is clean. The changed Markdown adds no new links.
- `just typecheck` in core, vite-traits-plugin and material-x after rebuilding core and the plugin: no errors. Root `just typecheck-declarations` passes.
- Tests after the merge: core 261/261 (it was 308 before #90 deleted reorderable's tests), vite-traits-plugin 254/254, material-x 515/515 (Chromium, non-visual). Safari, Firefox and the visual project weren't run.

## Open

- Whether to keep the converter cases rewritten in `0892ff552` or delete them is the owner's call.
- The `complete` cost of removing `define()`, about 96 B Brotli, is recorded for the owner.