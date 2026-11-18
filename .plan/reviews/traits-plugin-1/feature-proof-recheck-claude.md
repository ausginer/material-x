# The trait flattener's item 2b — feature-proof recheck, `reviewer-2` and `reviewer-3`

**Files were read at:** `a93110bf3` (`repo/traits-plugin-1`, slot `d`, clean, equal to `origin`). **Diff reviewed:** `3eb1912f4` to `a93110bf3`, outside `.plan/`. **Records read at the same commit.**

**Governing records:**

- `repo:RF-44`'s note dated 2026-11-18, in [`00-index.md`](../../00-index.md);
- the [handoff](../../traits-plugin-1/traits-plugin-handoff.md)'s item 2b, ruled at `3eb1912f4`;
- [`trait-flattener-plugin.md`](../../../.agents/docs/trait-flattener-plugin.md) §Eligibility, its reason-code table and its change record of 2026-11-18;
- my [feature proof](feature-proof-claude.md) at `8a5365adc`;
- the implementer's witnesses [`item-2b-rows-before.txt`](../../traits-plugin-1/checks/item-2b-rows-before.txt), [`item-2b-rows-after.txt`](../../traits-plugin-1/checks/item-2b-rows-after.txt) and [`item-2b-build.txt`](../../traits-plugin-1/checks/item-2b-build.txt).

**Lens:** a targeted feature proof. Each claim below is my own reading of the tree or a probe, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: item 2b holds. `reviewer-2` and `reviewer-3` are resolved as the handoff requires.** The recheck has two new Tier C findings, `recheck-1` and `recheck-2`. Both are against the language rule that the ruling at `3eb1912f4` states in the document. The code implements that rule exactly, so both go to the architect. Neither affects any shipped output.

## Scope

**Covered.**

- **The whole non-record diff:**
  - `free-references.ts`: the check on `eval` moved into `#reference`, and `CallExpression` is now in `CHILDREN`;
  - `analyze.ts`: `SOURCE_LANGUAGE`, `sourceLanguage` and `canCopySource`;
  - `diagnostics.ts`: the reason's JSDoc;
  - the new rows in `analyze-method.node.test.ts`.
- **Every path by which an identifier reaches `#reference`:** a plain `Identifier`, an assignment target, and a shorthand property, whether read or written. `Fail` returns `never`, so the walk stops at the first `eval`. No member can bind `eval` in a class body.
- **How module ids reach `canCopySource`:** `plugin.ts:55` and `:70` strip the query before analysis, so `?…` suffixes don't fall through to _undefined_.
- **The rows before and after, repeated** from a scratch directory against `src/` at `3eb1912f4` and at the head ([`checks/recheck-probes.txt`](checks/recheck-probes.txt), `rows.ts`):
  - the handoff's rows;
  - `new eval`, `{ eval }` and `eval?.()`, and `globalThis.eval()` as a control;
  - eight language pairs.

  Before, every wrapped form of `eval` flattens, and the `.ts`-into-`.tsx` pair flattens. After, every reference to `eval` is retained with `unsupported-trait-member`. `globalThis.eval` reads a property, not the binding, so it still flattens. Of the language pairs, `.ts→.tsx`, `.js→.tsx` and `.jsx→.tsx` are retained with `trait-source-language`. `.ts→.ts`, `.mjs→.ts`, `.tsx→.tsx` and `.js→.js` still flatten, and `.ts→.js` is retained, as before.

- **The plugin's gates at the head:**
  - `aube exec just test`: 8 files, 142 tests, all pass;
  - `typecheck` exits 0;
  - `lint` on the four changed files exits 0;
  - `fmt-check` is clean.
- **The document against the code:**
  - §Eligibility's _"any reference to `eval`, whatever wraps it"_ and its language pairs;
  - the reason table's `unsupported-trait-member` (_"`eval` in any form"_) and `trait-source-language`.

  Both read as the code does.

**Not covered.**

- **The build's byte identity.** I didn't rebuild `@ydinjs/core` or `@ydinjs/material-x`, so the identity of 295 files with `17065ddf0` is the implementer's reading. It agrees with what I read. material-x's one method trait is `src/core/traits/focus-forwarding.ts`, a `.ts` origin with `.ts` consumers, and no `.tsx`, `.mts` or `.cts` file exists under `packages/*/src`. So item 2b can't retain it.
- **Item 3.** The owner decides it.
- **CI.**

## Findings

### recheck-1 — Tier C: a `.ts` method trait copied into an `.mts` or `.cts` consumer can emit a member that doesn't parse

- **Observed:** `SOURCE_LANGUAGE` groups `.ts`, `.mts` and `.cts` as one language, so `canCopySource` copies between them. oxc-parser and oxc-transform 0.158.0 accept `<number>x` and `<T>(x: T) => x` in `.ts`. In `.mts` and `.cts` they reject both: _"This syntax is reserved in files with the .mts or .cts extension"_. The walker models both forms, as my proof's `reviewer-3` read.
- **Evidence:** `probe2b.ts` in [`checks/recheck-probes.txt`](checks/recheck-probes.txt). A `.ts` trait whose member returns `<number>x`, or `<T>(x: T) => x`, flattens into `c.mts` and into `c.cts` with no bailout. Each lowered consumer then fails to parse with that error. The `.tsx` consumer of the same trait is retained, which is item 2b's fix. `strip.mjs` shows the transform reporting the same error in `.mts`.
- **The requirement:** the document's §Eligibility headline says _"The consumer's parser must read the member as the origin's does"_. It then names the TypeScript language as _"(`.ts`, `.mts`, `.cts`)"_. §Plugin architecture says that _"unsupported sites warn and retain runtime composition"_. The handoff's item 2b lists the same grouping. So the code meets the ruling, and the ruling's grouping breaks its own headline.
- **Consequence:** the build reports an error in the downstream TypeScript transform, where the contract promises a warning. That is `reviewer-3`'s consequence, for a different pair. No `.mts` or `.cts` file in `packages/*/src` consumes a trait.
- **Required property:** a site whose copied member wouldn't parse in the consumer's language is retained, and the document's language groups agree with what the consumer's parser accepts.
- **Routed** to the architect. The language groups are the ruling's, and the code follows them.

### recheck-2 — Tier C: a JavaScript member copied into TypeScript can parse with another meaning, with no error

- **Observed:** `canCopySource` copies from JavaScript without JSX into TypeScript without JSX. In JavaScript, `a < b > (c)` is two comparisons, `(a < b) > c`. In TypeScript it is a call with a type argument, `a<b>(c)`. The walker models `BinaryExpression` and `CallExpression`, so a member containing it flattens.
- **Evidence:** in `probe2b.ts`, oxc-parser reads `a < b > (c)` as a `BinaryExpression` in `.js` and as a `CallExpression` with `typeArguments` in `.ts`. A `.js` trait whose member returns it flattens into `c.ts` with no bailout, and the member's line is copied unchanged. Then `strip.mjs` shows oxc-transform's output for the same text: `a < b > c` from `.js`, and `a(c)` from `.ts`, both with no error.
- **The requirement:** the same headline, _"The consumer's parser must read the member as the origin's does"_, and §Eligibility's lead: _"a construct it doesn't account for retains the trait instead of being copied with a guessed meaning"_. The document allows the JavaScript-into-TypeScript pair as a stated exception. The change record says that this limit is stated. The pair holds only for JavaScript whose parse doesn't change under TypeScript, and `a < b > (c)` is a counterexample.
- **Consequence:** the flattened element calls `a` where the runtime composition compares, with no warning and no build error. The case needs a `<`, a `>` and a parenthesized or template operand in sequence, in a JavaScript trait. The pair exists for another package's built JavaScript, which the fixture `method-package-consumer.ts` exercises. material-x's method trait is `.ts` into `.ts`, so no shipped output is affected.
- **Required property:** a member is copied only when the consumer's parser reads it with the meaning that the origin's parser gives it, or the document states which JavaScript the pair doesn't preserve.
- **Routed** to the architect. Whether the pair stays, narrows or is retained is a contract decision, and the code implements the ruling as written.

## What holds

- **`reviewer-2` is resolved.**
  - Every reference to `eval` retains the trait with `unsupported-trait-member`, whatever wraps it: plain, parenthesized, behind `as`, through a comma operator, in `new`, as a shorthand, and through an optional call.
  - The handoff's three new rows fail before and pass after, and the plain `eval(src)` row stays. That is the implementer's witness, and my repeat agrees.
  - The walker's header comment and the document state the wider rule.
- **`reviewer-3`, as the handoff rules it, is resolved.**
  - A `.ts` trait in a `.tsx` consumer is retained with `trait-source-language`. Its row fails before and passes after.
  - `.ts→.ts` and the built `.mjs` package into `.ts` still flatten. The second is the package row in `flatten-method.node.test.ts`, which passes.
  - `.js` and `.jsx` into `.tsx` are retained, as the handoff's _"Every other pair"_ requires.
  - A module id outside the four groups is retained, because its language is _undefined_.
- **No material-x or core trait is retained.** The handoff's stop doesn't apply. My evidence is the reading under _Not covered_ above; the implementer's evidence is the build log and the byte identity.

## Proposed canonical ids

None. Both findings are Tier C and concern `RF-44`'s own subject, so the architect can date them under `RF-44`. That is a proposal, not an allocation.