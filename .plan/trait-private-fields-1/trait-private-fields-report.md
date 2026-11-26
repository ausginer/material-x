# Report: private instance members and constructors in traits (`RD-33`)

**Input:** `repo/trait-private-fields-1` at `23b9c71cf`, which carries the [plan](trait-private-fields-plan.md), merged with `origin/main` at `bd1dee7df` in `dbf0ab8ae`. **Governing records:** `RD-33` in [`../00-index.md`](../decisions/), `RD-26` property 2, and [`trait-flattener-plugin.md`](../../.agents/docs/trait-flattener-plugin.md).

**Outcome: the plan is implemented, and no stop condition was met.** Proofs 1 to 13 hold. No change reaches `Composed`'s types, a published package's public surface or another trait's source. core's and material-x's built output is byte-identical to `bd1dee7df`'s (proof 12). Neither `RD-31` (#90) nor `RF-69` (#100) had merged when it was read, so that is the `main` it compares against.

| Commit | Content |
| --- | --- |
| the commit carrying this report | The plugin, its tests and fixtures, the plugin document, the build-identity reading and this report |

## What changed

All of it is in `packages/vite-traits-plugin`, and the plugin document.

- **`free-references.ts`:** one walker entry, `collectReferences`, for a member's function, a field's initializer and a constructor's statements after `super();`. It records every private name with its offsets.
  - It accepts a private name only as `this.#name` on the member's own `this`, directly or inside an arrow function. Each other form is refused with a message that suggests `instanceof`.
  - In a constructor's body it refuses `arguments` and a `return` outside a nested function, and in an initializer it refuses `arguments`. It refuses `super` and `new.target` with a message of their own.
  - Each refusal carries the node's position. `collectFreeReferences` is gone, because nothing else called it.
- **`ir.ts`:** `TRAIT_IR_VERSION` 4.
  - `CopiedSourceIR` is a piece of source with its links, its globals and its private names.
  - `MemberIR` gains `private`. `TraitIR` gains `fields`, `constructorBody` and `privateSuffix`. `ConstructorIR` holds the body, braces included, and the span of the `super();` it drops.
- **`trait-class.ts`:** normalizes private methods and accessors.
  - It copies a private field only when a member or the constructor references it, and refuses `this` or `super` in its initializer, in a nested function too.
  - It checks the constructor's form, as decision 7 states.
  - A static private member, and a private name in a static member, are `trait-member`.
  - The suffix is `_` and 8 hex digits of a SHA-1 of the specifier and the class name.
- **`trait-module.ts`:** exports the private bindings that an initializer and the constructor's body read, as it does for a member's. The application build's deletion already covered private members and the constructor.
- **`annotation.ts`:** the expanded list keeps each trait's first occurrence. `chainTraits` reads the base's chain for `trait-list`: a source composition's list, and a built class's `impl(this, …)` brands, by module and export.
- **`rules.ts`:**
  - The layer rules and the conflict warning skip private members.
  - The member-scope and copy rules cover fields and the constructor's body.
  - New: `checkPrivateNames`, `checkComponentFields` (`component-field`) and `constructorSite`. `constructorSite` checks the component's `super(…)` (`component-constructor`) and what its constructor binds (`trait-binding-shadowed`).
- **`lower.ts`:**
  - Each trait's fields come before its members, with private names renamed.
  - One block per body goes right after the component's `super(…)` statement, or into a generated `constructor(...args) { super(...args); … }`.
- **`plugin.ts`:** runs the chain check only when the list has a trait with a constructor or copied private members, then the new rules.
- **`diagnostics.ts`:** `component-constructor` and `component-field`, and the `trait-list` and `trait-field` descriptions.

**Two choices the plan left open, made here:**

- **The code of a renamed name's collision** is `trait-binding-shadowed`. Decision 3 calls it an error without naming a code, and that code already means _"the component's class binds a name that copied source reads"_.
- **An unreferenced private field isn't checked,** because it isn't copied. Its initializer may read `this` without an error. **Reversed by the architect's ruling** in `02fa8d70c`, on the feature proof's `reviewer-1` ([review](../reviews/trait-private-fields-1/feature-proof-claude.md)): a private field with an initializer is copied and checked whether or not anything references it, and only an initializer-less private field that nothing names is skipped (§Remediation of `reviewer-1`).

## Proofs

Each is a node test of the plugin unless it says otherwise. The plugin's suite has 251 tests in 11 files, and all of them pass.

| Proof | Result |
| --- | --- |
| **1. Runtime equivalence** | `tests/state.node.test.ts` › _against the hand-written class_ compares `Counted` with [`state-consumer.expected.ts`](../../packages/vite-traits-plugin/tests/fixtures/state-consumer.expected.ts). Prototype keys, own keys, `observedAttributes` and `instanceof` are equal, and so are the private accessor pair, the private method, the initializer and the body. From another package's built JavaScript, `stateful.mjs`'s copied initializers and body run: `hits` 3, `kind` `'record'`, `target` `{ calls: 1, options: 3 }` |
| **2. Collision** | `First`, `Second` and `Ordered` each declare `#x`. Writing `first` and `own` leaves `second` as it was: `['a', 'Second field', 'c']` |
| **3. Initializer** | Two `Counted` instances have two maps. `#count = START`, an exported binding, and `#label`, which reads `prefix`, a private binding, and `record`, an imported one, give `'counter:Counter field'`. The built trait's initializers read `STATEFUL_START`, `step` and `RECORD_KIND` |
| **4. Order of fields** | Run: `First field`, `Second field`, `component field`. In the emitted text, the shared supertrait's field comes before its subtrait's |
| **5. Duplicates** | `Sided` of `[Left, Right]`, which share `Shared`, holds `Shared` once, ahead of both. `Shared field` and `Shared body` each run once per instance, `visits` is 1, and `greet()` is `Left`'s `'left'` |
| **6. Diagnostics** | `tests/diagnostics.node.test.ts` › _a trait's private members_, each case at its token: a public instance field (`trait-field`); a static private field and method; `other.#x`, `#x in o`, `this.#x` in a nested function and in a static member; `super`, `arguments` and `this` in an initializer, directly, in an arrow and in a nested function; `class {}` as an initializer; and a renamed name that the component declares (`trait-binding-shadowed`) |
| **7. Declarations** | `tests/declarations.node.test.ts` › _the declarations of a trait with private members_. tsdown emits one `#private;` per class, no private member and `constructor();`. A TypeScript program that composes both traits and declares its own `#x` has no diagnostic. With `this.missing` in it, the row fails |
| **8. The unreferenced field** | `#brand!: true` isn't copied, against the exact text of the component. Since the remediation, an unreferenced initialized field is copied and checked (§Remediation of `reviewer-1`) |
| **9. The application build** | `tests/trait-module.node.test.ts`: the transform exports the bindings that an initializer and the constructor read. The application build leaves no `#` and no `constructor`, and `instanceof` stays correct |
| **10. Constructors** | The order is `before super`, `super argument`, `base field`, `base body`, `First field`, `Second field`, `component field`, `First body`, `Second body` and `after super`.<br>A subclass then runs `subclass field` and `subclass body`. Over a flattened base, `Third field`, `Outer field`, `Third body` and `Outer body` follow the base's whole order.<br>`Left`'s body reads `Shared`'s state, `Left body sees 1`. `Counter`'s body reads `baseField`, its private field and method, `START`, `prefix` and `record`, and the built trait's body reads `record`, `step` and `STATEFUL_START`.<br>The generated constructor passes `[1, 2]`. The component's `value` parameter and the body's `const value` stay apart: 7 and 20.<br>The emitted text drops `super();`, has one block per body and no generated field. A list with no trait constructor leaves the constructor's text as it was.<br>Every listed diagnostic is at its position. `return` in a nested arrow and in a nested function, and a base that composes only `#brand!: true`, are accepted |
| **11. The component's field initializers** | `component-field` at the token for each listed form. Accepted: `new Map()`; `static self = this`; a `this` arrow initializer with no trait constructor, emitted as written; `countAtStart = this.count` in the constructor, which reads 11 at runtime; and `CountedSub`'s `cached = this.cache.get('counter')`, which reads 20 |
| **12. Build identity** | [`checks/build-identity.txt`](checks/build-identity.txt): 81 core and 213 material-x files, the same lists, and `diff -r` is empty. Neither build prints `trait-member-conflict`. The 22 size rows are equal. The builds import the plugin's built `index.js`, which `_package-builds` rebuilt with this unit's code, so the comparison sees the change |
| **13. Gates** | In the plugin, `fmt`, `lint-fix`, `fmt` and `lint` give no error, and `typecheck` passes. `boundary.node.test.ts` passes in the plugin's suite. Root `aube exec just test`: §Root test |

### Root test

Root `aube exec just test` at the branch's final source: 148 of 148 files and 2,417 of 2,417 tests passed. No test failed, so the run has no failure to report.

### What lint found, and how it was resolved

- **Errors in this unit's source:** an unnecessary optional chain, a missing destructuring, a `forEach` callback that returned a value, and `return this.#fail(…)` in two `case`s, which `consistent-return` refused. The code was rewritten. The typecheck found an `it.each` callback whose rows had an optional element, and the helper now computes the offset first.
- **A gate defect, the autofix in a JavaScript file.** `lint-fix` applied oxlint's `typescript/prefer-readonly` to `stateful.mjs` and wrote `readonly #hits`, which is TypeScript, into a `.mjs` file. `fmt` then failed to parse it. The fixture's existing `oxlint-disable` line, which already turns off two TypeScript rules for that file's JavaScript, now names `typescript/prefer-readonly` too, and the autofix leaves the file as written. `forwarding.mjs` has no private field, so the rule never fired there. Running typed lint rules on `.mjs` fixtures may deserve its own finding.
- **Fixture shape.** `state.ts` holds seven trait classes and `state-consumer.ts` six components, which `max-classes-per-file` refuses. Two getters of `state.ts` return literals, which `class-methods-use-this` and `class-literal-property-style` refuse. Each file has a file-level `oxlint-disable` with its reason, as `consumer.expected.ts` and the package fixtures do. In `state.node.test.ts`, the four constructions that `no-new` refused go through a `construct` helper.

## Remediation of `reviewer-1`

**Input:** `02fa8d70c`, which carries the architect's ruling in the plan's decision 3, property 10 and proof 8, and in `RD-33` property 8. **The change:** `normalizeTraitClass` skips a private field only when it has no initializer and no member or constructor of its trait references it. Every initialized private field goes through `normalizeField`. So it is renamed, linked, emitted in decision 1's order and checked, and `this` in its initializer is `trait-member`.

**Proof 8's new rows:**

- **The reviewer's fixture.** Trait `E`, its component `KE` and the hand-written `KEHand` are in `state.ts`, `state-consumer.ts` and `state-consumer.expected.ts`. They are as the review's [probe](../reviews/trait-private-fields-1/probes/fixtures/rv-traits.ts) wrote them, with `record` in place of `rec`.
  - `tests/state.node.test.ts` › _should run its initializer as the hand-written class does, in the same order_: constructing `KE` and `KEHand` records the same steps, `base field`, `base body`, `E unused field` and `E used field`.
  - › _should be copied, renamed_: the emitted `KE` holds `#unused_<hash> = <link>('E unused field');`.
- **`this` in an unreferenced initializer.** `tests/diagnostics.node.test.ts` › _this in the initializer of a field that nothing references_ fails with `trait-member` at the `this`.
- **They discriminate.** With the old filter put back, these three rows fail and the other 147 rows of the two files pass. The filter was then restored.

**Gates, rerun at the remediation:**

- The plugin's suite: 254 of 254 tests in 11 files.
- In the plugin, on the changed files: `fmt`, `lint-fix`, `fmt` and `lint` give no error, and `typecheck` passes.
- The root `aube exec just test`: 148 of 148 files and 2,420 of 2,420 tests, the three new rows included.
- The build identity against `main` at `bd1dee7df` (proof 12) is unchanged. It was reread against a worktree at `dbf0ab8ae`, `main`'s tree with the plugin before this unit. core's 81 and material-x's 213 files are byte-identical, with the sha256 that [`checks/build-identity.txt`](checks/build-identity.txt) records, the size rows are equal, and neither build prints `trait-member-conflict`. No trait in either package has a private field with an initializer, so the rule changes no current output.

**The plugin document** states the rule in §Its members, and the `RD-33` row of its change record says what it said before.

## Stopping point

The unit stops at the pull request. Nothing adopts the feature, and the plan plans no adopter. Open: the architect's dating of `RD-33` from this report.

**Scratch work:** the worktree, the build snapshots and the logs are in this session's scratchpad. They are removed when the unit is handed off.