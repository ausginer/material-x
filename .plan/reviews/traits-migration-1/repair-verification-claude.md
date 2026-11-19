# PR #76's feature-proof repairs: verification

**Files were read at:** `abc945b47`, the head of `repo/traits-migration-1`, in a detached scratch worktree outside the slots.

**Diff reviewed:** `0ee9a222a..abc945b47` outside `.plan/`. It holds the repair `973caed7b`, the cross-engine baseline commit `fb8d5d767`, the rulings `9bb2832df` and the proofs record `abc945b47`. I read the baseline commit only far enough to see that it touches no plugin source.

**Governing records:**

- The plan's [Rulings on PR #76's feature proof](../../trait-decorators-1/trait-migration-plan.md#rulings-on-pr-76s-feature-proof).
- `RD-26` properties 3 and 8.
- My [feature proof](feature-proof-claude.md) at `0c5705d87`.

**Lens:** feature proof. The claims below come from my own reading and runs, saved in [`checks/repair-verification-witnesses.txt`](checks/repair-verification-witnesses.txt). After `aube install` and `aube exec just build`, the plugin suite passes: 8 files, 87 tests. Nothing is repaired, and nothing was written to GitHub.

**Verdict:** reviewer-1 to reviewer-5 are closed. There are three new findings:

- **verifier-1, Tier A, latent:** `composition-shape` now flattens over a live value reference inside a TypeScript-only runtime construct.
- **verifier-2, Tier C:** the brand's "never assigned again" check misses two forms of assignment.
- **verifier-3, Tier B:** a base imported through a re-export is now refused.

**What blocks:** in my reading, none blocks the merge. verifier-1 breaks the ruling's _"must never be flattened over a live reference"_. The repository's own `erasableSyntaxOnly` makes all three constructs compile errors here, so no module this repository builds can reach it. It does reach users of the published plugin. Whether it is repaired before the merge or before publication is the architect's call.

**Proof 4 never measured property 8:** size-limit's preset bundles without the plugin. That is a gap in the proofs, and it goes to the architect. The property itself is proved by `vite.node.test.ts` (a) and by V-W1 on real entries.

## The five findings

| Id | Status | Evidence |
| --- | --- | --- |
| reviewer-1 | closed | V-W1: an application build of connected-button-group now leaves core's `Valuable`, `Checkable` and `Disableable` with only `observedAttributes` and the `[Symbol.hasInstance]` method. My review's W1 showed both accessors on each. A library build of the same entry keeps both accessors. `vite.node.test.ts` (a) to (e) drive Vite's `build()` and `createServer()`. Mutations: the proofs' M1 and M2, and my MV3. |
| reviewer-2 | closed | V-W5: a base with a `CSSStyleSheet` static gives `static-kind` (K1). A string base gives `static-kind-mismatch` naming the base (K2). A parent in another module gives the same, through the chain walk (K3). Every emitted form is unchanged. Mutations: the proofs' M5, and my MV4. The new rows cover each property of the ruling. |
| reviewer-3 | closed as ruled | V-W4: a property key (V1) and a `typeof` type (V2) flatten. `console.log(FooBase)` (V3) and `export { FooBase }` (V4) give `composition-shape`. Mutation: my MV1. See verifier-1 for what the counter misses. |
| reviewer-4 | closed | `vite.node.test.ts` reads the adapter's build kind through Vite itself. The proofs' M3, my review's M5, fails (b) and (c). Their M4 fails (c). |
| reviewer-5 | closed | The header of `trait-module.ts` now describes the static method, and says that `trait` is never called with a brand. |

**The wording repairs hold:**

- The plugin document's `static-kind`, `static-kind-mismatch` and `composition-shape` text, and its transform section, match the code.
- The PR description now says that `viteTraitsPlugin()` returns an array of two plugins.

## The implementer's `var`/`let` reading doesn't reopen reviewer-1's hazard

The hazard was the deletion of another library's class's members once the pre-filter opens. Recognition, not the declaration keyword, is what guards against it.

**What recognition requires** (`trait-module.ts`, `hasInstanceBrand` and `brandConstants`):

- a static method `[Symbol.hasInstance]` with one identifier parameter;
- a body of exactly `return p != null && p[B] === true`;
- `B` a module-scope variable, exported, initialized with `Symbol(<string literal>)` and given no other argument.

V-W4's R rows show the boundaries. A brand that isn't exported (R6), a `Symbol.for` brand (R7) and a `var` assigned again with `=` (R3) each leave the members alone.

**Why the widening is needed.** A `const`-only rule fails row (a): Vite's library build emits the brand as `var` (MV3). A third-party bundler is as likely as Vite to turn `const` into `var`. So a `const`-only rule wouldn't exclude other libraries; it would only exclude Vite-built traits.

**What still matches.** A class this rule deletes from carries the plugin's generated method token for token, with an exported `Symbol("…")`. I see no realistic class outside the plugin's own output that meets that. verifier-2 is a gap in the "never assigned again" check. It doesn't change this answer.

## Proof 4 and property 8

**size-limit doesn't run the plugin.** `size-limit-preset-rolldown` calls `rolldown({ input, platform: "neutral" })` with no plugins (V-W3).

**So proof 4's rows never measured property 8.**

- Each row bundles the built `.js` of an entry, and only this plugin deletes members.
- The proofs record says so: _"no row is an application build through it"_. Its claim that _"no row could grow"_ is true for the same reason: a deletion can't reach any row.

**This is a gap in the proofs, for the architect.**

- The behavior is proved by `vite.node.test.ts` (a) on a fixture that the plugin built, and by V-W1 on real entries.
- Its size was measured nowhere in the proofs. V-W2 measures it on one real entry, connected-button-group, minified: 13,252 B, 3,866 B brotli, without the plugin; 12,936 B, 3,819 B brotli, with it. The deletion saves 316 B, 47 B brotli.
- Whether the proofs owe such a row, and whether the size table should gain an application-build row, is the architect's call. I don't count it as a defect in the code.

## New findings

### verifier-1 — `composition-shape` flattens over a live reference in a TypeScript-only runtime construct

- **Current behavior.** `countValueReferences` (`annotation.ts`) returns at any node whose type starts with `TS`, unless the node wraps an expression. Some `TS` nodes contain runtime code: a namespace body (`TSModuleDeclaration`), an enum member's initializer (`TSEnumDeclaration`), and a parameter property's default (`TSParameterProperty`). A reference to the composition constant inside one of them isn't counted.
- **Requirement.** The ruling for reviewer-3: _"A shadowed name may be refused, but must never be flattened over a live reference."_
- **Evidence (V-W4).** Each of these modules flattens, and the `const FooBase` statement is removed, while `FooBase` is still named once in the emitted module:
  - V5: `export namespace N { export const b = FooBase; }`;
  - V6: `export enum E { A = FooBase.length }`;
  - V7: `export class P { constructor(public b = FooBase) {} }`.

  The name is then bound nowhere in the module. So evaluating the namespace body or the enum, or calling `new P()` with no argument, throws a `ReferenceError`. That consequence is inferred from the emitted text; I didn't run it.

- **This is a regression.** At `0c5705d87`, the counter counted every identifier and refused these modules.
- **Scope.** `tsconfig.base.json` sets `erasableSyntaxOnly` (V-W6), so this repository can't compile any of the three. A user of the published plugin without that option can.
- **Tier A, latent:** a correctly integrated plugin user gets a module that throws on evaluation, where the ruling promises a refusal.

### verifier-2 — the brand's "never assigned again" check misses destructuring and `for…in`/`for…of`

- **Current behavior.** `assignedNames` (`trait-module.ts`) counts an `AssignmentExpression` or `UpdateExpression` whose target is an identifier. A brand assigned by `[$b] = …` or `for ($b of …)` still counts as never assigned again, so the class is recognized and its members are deleted (V-W4, R4 and R5).
- **Requirement.** The proofs record's own reading: _"a `var` or `let` that nothing in the module assigns again"_.
- **Tier C:** see the section above. Recognition still demands the generated method exactly, so no realistic class is affected. The check's claim is broader than what it checks.

### verifier-3 — a base imported through a re-export is now refused

- **Current behavior.** `heritageClass` follows one `import` to a module, and finds the class only among that module's own classes. A base imported from a module that does `export { SBase } from './sbase.ts'` gives `static-kind`, with _"the base's class chain can't be read to find its kind"_ (V-W5, K4).
- **The same limit already applied to traits.** A trait reached through a re-export is `trait-unresolved` (K5), and was before the repair. So the walk resolves a base _"as a trait reference is resolved"_, as the ruling says, and the ruling allows a refusal.
- **What the repair adds.** The refusal now reaches compositions that built at `0c5705d87`. Every attribute trait contributes `observedAttributes`, so the walk runs for nearly every composition. Any such component whose base comes through a barrel module now fails to build.
- **Nothing in the tree hits it.** material-x imports `ControlledElement` from `@ydinjs/core/element.js` directly.
- **Tier B:** a valid composition is refused, with a message that says the chain can't be read.
- **Routing.** Following `export … from` for both traits and bases is a design question for the architect, not a defect against the ruling.

## Scope

**Covered:**

- The diffs of `plugin.ts`, `composition/{trait-module,trait-class,annotation,rules}.ts`, the plugin document and the proofs record's repair section.
- The test names of `vite.node.test.ts` and of the new `diagnostics.node.test.ts` rows.
- A rebuild of every package at `abc945b47`, and the plugin suite.
- The witnesses V-W1 to V-W7.

**Not covered:**

- The bodies of `vite.node.test.ts`, beyond its row names and the mutations.
- `fb8d5d767`'s cross-engine baseline.
- The root `just test`, core's and material-x's suites, `typecheck`, `lint` and `fmt-check` at this head. The proofs record reports them at `973caed7b`.
- CI run 44564387984, which was in progress.

## Next

- **The architect:** verifier-1, decided before the merge or before publication; verifier-3; and whether proof 4 owes an application-build size reading.
- **The implementer:** verifier-2, whenever convenient.