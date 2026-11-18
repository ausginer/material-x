# RF-44 items 1 and 2: the trait flattener's repairs and method traits — feature proof

**Files were read at:** `5ecec6af3` (`repo/traits-plugin-1`, slot `d`, clean). The plugin source, `packages/vite-traits-plugin/`, is the same at `b5977ec0f` and at `5ecec6af3`. **Diff reviewed:** item 1, `f1a1077b2..49e26415d`, and item 2 with its follow-ups, `be491e375..b5977ec0f`, in `packages/vite-traits-plugin/`. Item 3 (`17065ddf0`) is out of scope.

**The document moved during the review.** I started from [`trait-flattener-plugin.md`](../../../.agents/docs/trait-flattener-plugin.md) at `17065ddf0`, which still said that the plugin doesn't flatten a class-based trait. The architect's `5ecec6af3` widened it to method traits while I read the code. This report reviews the document at `5ecec6af3`.

**Governing records:** the [plan](../../traits-plugin-1/traits-plugin-handoff.md), items 1 and 2; `repo:RF-44` in [`00-index.md`](../../00-index.md), its entries of 2026-11-18; the document at `5ecec6af3`; the implementer's witnesses [item 1](../../traits-plugin-1/checks/item1-witness.txt) and [item 2](../../traits-plugin-1/checks/item2-witness.txt), and the architect's [probes](../../traits-plugin-1/checks/rf44-probes.txt).

**Lens:** feature proof. Each claim below is my own reading of the tree or a probe, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: items 1 and 2 hold against the plan.** I found no Tier A or Tier B defect. Three Tier C findings remain:

- two places where the document at `5ecec6af3` says more than the code does (`reviewer-1`, `reviewer-3`);
- one hole in the walker's conservative property (`reviewer-2`).

No shipped material-x or core output is affected by any of them. None blocks the owner's decision on item 3. The architect's dated note at `5ecec6af3` says that _"`RF-44`'s required property now holds in the document and the code"_. `reviewer-1` and `reviewer-3` contradict that note in two sentences of §Eligibility. The architect decides whether those sentences are narrowed or the code is widened.

## Scope

**Covered.**

- **Item 1, line by line:** `analyze.ts` (per-site transactions, `bailouts` in place of a throw, the `listPath` cycle guard, `requireClassMeaning`, which became `requireLayerMeaning`), `plugin.ts` (the source-keyed cache), `diagnostics.ts`, `normalize.ts` (the factory pattern), `ir.ts`, and the new tests.
- **Item 2, line by line:** `free-references.ts`, `normalizeMethodTrait` and `collectTopLevelNames` in `normalize.ts`, `requireLayerMeaning`, `requireMemberScope` and the source-language check in `analyze.ts`, `memberSource` and `compositionStatics` in `lower.ts`, the pure marking in `plugin.ts`, the IR, and the two new test files with their fixtures.
- **The document at `5ecec6af3`, section by section,** against that code. The reason-code table matches `REASON`: twelve codes, and every code is in the table.
- **The plugin's suite at the head:** `aube exec just test` in `packages/vite-traits-plugin`, 8 files, 138 tests, all pass.
- **Probes,** analyzed in memory against slot `d`'s source from a scratch directory ([`checks/review-probes.txt`](checks/review-probes.txt)):
  - **item 1:** a two-site module whose second site bails (the first is flattened, and one bailout is returned); a list cycle across two modules (`unsupported-trait-list`, no stack overflow); `impl` imported from the pre-rename `traits.js` (not recognized); one id parsed with two sources (the second parse sees the second source);
  - **item 2:** origin function declarations and namespace imports; a `.ts` origin consumed by a `.tsx` consumer; a parenthesized and a TypeScript-wrapped `eval` callee, and a plain `eval` as a control.
- **My own reading of the walker's scoping:** parameter defaults against body declarations, block, `for`, `catch` and `switch` scopes, shorthand properties and assignment patterns, labels, and type-only children. Apart from `reviewer-2`, I found no case where it binds or frees a name wrongly.
- **My own reading of the layer rules:** method over accessor, accessor over method, a lone half over a method, and a lone half over an accessor, between traits and between a trait and the class. Each case that flattens has the same prototype result as the runtime chain. Each case that would join halves is retained.

**Not covered.** These areas are unread, which isn't the same as clean.

- I didn't rebuild `@ydinjs/core` or `@ydinjs/material-x`, so item 1's byte identity and item 2's W1 (one changed line in `list/list-item.js`) are the implementer's readings. I read the W1 cause against `compositionStatics` and `impl`'s empty-list return, and they agree.
- I didn't repeat any of the implementer's mutations (item 1's reverts, item 2's M1 to M12). Repeating them would mean editing slot `d`'s source.
- No CI run exists for `repo/traits-plugin-1` (`gh run list --branch repo/traits-plugin-1` is empty). I didn't run `typecheck`, `lint` or `fmt-check`.
- `RF-60`, the flattener row that failed once in CI, is out of scope.

## Findings

### reviewer-1 — Tier C: a member that reads an origin function, class, enum or namespace import is retained, and the document says it is linked

- **Observed:**
  - `normalizeMethodTrait` treats every name in `collectTopLevelNames` as a module binding and calls `linkBinding` on it. That set includes function, class, enum and namespace declarations, destructured variables, and namespace imports.
  - `linkBinding` reaches only names in `collectImports`, which holds named and default imports, and `collectTopBindings`, which holds `VariableDeclaration`s with an identifier id. Any other name bails with `unsupported-trait-definition`, _"`<name>` is not a module-scoped binding"_. That holds in the consumer-module branch too.
- **Evidence:** probe cases A (a private `function helper`), B (`export function helper`) and G (`import * as ns`) each return that bailout. The implementer's own row _"should retain a site whose trait member reads a module function"_ asserts the retention, so the behavior is intended.
- **The requirement:** the document at `5ecec6af3`, §Eligibility, says: _"Every other name it reads is either a module binding of the origin or a global. A module binding is linked the way a descriptor converter is"_. §Lowering's linking list says that _"existing exports are reused"_ and that _"private module-scoped bindings receive … synthetic exports"_. A function declaration is a module-scoped binding, exported or not. The plan's item 2 says the same: _"An identifier that names an origin module binding or import is linked"_. `RF-44`'s amended required property is that _"the document states only what the plugin implements, in every section"_.
- **Consequence:** the site is retained with a warning. The output isn't wrong. A later method trait that calls a module function, which is the usual shape of a helper, is retained, and the document says it flattens. The table row for `unsupported-trait-definition` (_"a binding it needs can't be reached from the consumer"_) doesn't describe an exported function, which can be reached.
- **Required property:** the document names the binding forms that are linked, and states that a member reading any other form is retained; or the code links what the document names.
- **Routed** to the architect. Choosing between narrowing the document and widening the code is a contract decision.

### reviewer-2 — Tier C: a parenthesized or TypeScript-wrapped direct `eval` passes the walker, and the copied member then reads the consumer's scope

- **Observed:** `free-references.ts` rejects direct `eval` only when the callee is a bare `Identifier` named `eval`. `parseModule` keeps parentheses (oxc's default), so `(eval)(src)` has a `ParenthesizedExpression` callee. `(eval as F)(src)` has a `TSAsExpression` callee. The walker visits both as ordinary calls and records `eval` as a global, which no module can bind. So the site flattens.
- **Evidence:** probe cases D and E flatten with no bailout, and the control, case F, bails with `unsupported-trait-member`. `evalsem.mjs` shows that `(eval)('secret')` is a direct eval in Node and reads the module's `secret`, while `(0, eval)` reads the global. Once the `as F` is stripped, `(eval as F)(x)` is `eval(x)` or `(eval)(x)`, and both are direct (inferred from the language, not read from a compiler). In case D, the origin's member reads the origin's private `secret` (`1`), and the flattened copy reads the consumer's `secret` (`2`).
- **The requirement:** the document's §Eligibility says that _"`super`, direct `eval` and `import.meta` are outside"_ the allowlist, _"so a construct it doesn't account for retains the trait instead of being copied with a guessed meaning"_. The plan's item 2 says that a member's body _"contains no … direct `eval`"_ and _"is analyzed conservatively"_. `diagnostics.ts` describes `unsupported-trait-member` the same way.
- **Consequence:** no repository trait uses `eval`, so no output changes today. The defect is in the walker's soundness claim: one form of a construct that the walker says it rejects is accepted, and the copy then means something else.
- **Required property:** every direct `eval` call, including one whose callee is wrapped in parentheses or a TypeScript expression wrapper, retains the trait.
- **Routed** to the implementer. This is a defect against a property that the plan and the document both state.

### reviewer-3 — Tier C: a `.ts` method trait copied into a `.tsx` consumer can emit a member that doesn't parse

- **Observed:** the source-language check in `analyzeSite` retains a site only when the origin is TypeScript and the consumer isn't (`TYPESCRIPT_MODULE` on both ids). A `.ts` origin and a `.tsx` consumer pass the check. The walker models `TSTypeAssertion` (`<T>x`) and `ArrowFunctionExpression` with type parameters (`<T>(x: T) => x`). Both forms are valid TypeScript and invalid TSX.
- **Evidence:** in probe case C, a `.ts` trait whose member returns `<number>(<unknown>1)` flattens into a `.tsx` consumer with no bailout. In `parsecheck.ts`, oxc parses that member with no error as `.ts`, and with _"Unexpected token"_ as `.tsx`. The build then fails in the downstream TypeScript transform, not with the plugin's warning.
- **The requirement:** the document at `5ecec6af3` says: _"**The source language must match.** A member is copied as the origin's source text, so a TypeScript trait … isn't copied into a JavaScript consumer, and the site is retained."_ The headline promises more than the one direction the code checks. §Plugin architecture says that _"unsupported sites warn and retain runtime composition"_. The plan asked only for the TypeScript-into-JavaScript case, so the code meets the plan.
- **Consequence:** a build error in place of a warning, and only for a `.tsx` consumer of a `.ts` trait that uses one of those two forms. No `.tsx` file in `packages/*/src` calls `impl`.
- **Required property:** the document states exactly which origin and consumer languages are retained; and a site whose copied member wouldn't parse in the consumer's language is retained, or is stated as unsupported.
- **Routed** to the architect. Whether the rule is widened or the headline is narrowed is the architect's call.

## What holds

- **Item 1, properties 1 to 6.** The two-site, cycle, cache and pattern probes agree with the code and the tests. The class-meaning rules are now part of `requireLayerMeaning`, and they cover descriptor and method keys. Removing `traits` and `piirre` from the patterns leaves a pre-rename import unrecognized and silent. That is the plan's property 5, under CONTRIBUTING §8.
- **Item 2's eligible-trait rules:** recognition from `primitives`, a named brand, a one-parameter synchronous transformer, a class that extends the parameter, and a class name that the members don't read. Also the member subset: overload and index signatures are skipped, and a constructor, field, static member, private name, decorator, computed key or `accessor` member bails.
- **Linking:** occurrences are rewritten from the end of the member, a shorthand property becomes `name: <link>`, and an assignment to an imported binding bails. The consumer-scope rule bails for a non-module-scoped class, a class named after a name the member reads, and a consumer top-level binding of a global.
- **Lowering:** `observedAttributes` is emitted only with a descriptor trait, members come in trait order before the class's own, one `static {}` block installs every brand, and both factories' top-level calls are marked pure.
- **The handoff's fixture list for item 2** is present in `flatten-method.node.test.ts` and `analyze-method.node.test.ts`: a method alone and overridden, the brand and `instanceof`, a private binding's identity, a subclass `super` call, and a trait in the consumer module, in another module and in another package's built JavaScript. Every retained case has a negative row, except the two that `reviewer-2` and `reviewer-3` describe.
- **No new dependency** was added for scope analysis, so the plan's stop didn't apply.

## Proposed canonical ids

None. All three findings are Tier C, concern `RF-44`'s own subject, and can be dated under `RF-44` by the architect. That is a proposal, not an allocation.