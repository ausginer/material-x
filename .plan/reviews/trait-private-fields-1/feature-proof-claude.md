# RD-33: private instance members and constructors in traits — feature proof

**Files were read at:** `630b86ee2` (`repo/trait-private-fields-1`, PR #102), in a private worktree. **Diff reviewed:** `origin/main...630b86ee2`: `packages/vite-traits-plugin/src` and `tests`, and `.agents/docs/trait-flattener-plugin.md`. **Build identity was compared against** `bd1dee7df`, the `main` last merged into the branch (`dbf0ab8ae`).

**Governing records:** the [plan](../../trait-private-fields-1/trait-private-fields-plan.md) at `23b9c71cf`; `RD-33` in [`00-index.md`](../../00-index.md); the [plugin document](../../../.agents/docs/trait-flattener-plugin.md); and the implementer's [report](../../trait-private-fields-1/trait-private-fields-report.md) with its [build-identity reading](../../trait-private-fields-1/checks/build-identity.txt).

**Lens:** feature proof. Each claim below is from my own reading of the tree or from my own probe, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: the unit holds against the plan, with one design finding for the architect.**

- There is no Tier A finding.
- **Open choice 1** is accepted: a renamed-name collision reports `trait-binding-shadowed`.
- **Open choice 2** isn't accepted as the document states it. An uncopied private field isn't validated, and its initializer's effect is lost, although the document says that the field can't be observed (`reviewer-1`, Tier B, architect).
- **The `.mjs` aside** is acceptable for this unit. The gate behind it is recorded separately (`reviewer-2`, Tier B, outside the unit).

## Scope

**Covered.**

- **Source, read line by line:**
  - `free-references.ts`: the private-name rule, `arguments`, `return`, `super` and `new.target`;
  - `trait-class.ts`: fields, the constructor's form, the unreferenced-field filter and the suffix;
  - `trait-module.ts`: the private reads;
  - `annotation.ts`: first-occurrence deduplication and `chainTraits`;
  - `rules.ts`: `checkPrivateNames`, `checkComponentFields`, `constructorSite` and `constructorBindings`;
  - `lower.ts`: the field order, the blocks and the generated constructor;
  - `plugin.ts`, `ir.ts` and `diagnostics.ts`.
- **The plugin's suite at the head:** 11 files, 251 of 251 tests pass. **Plugin gates:** `typecheck` exits 0, and `lint` and `fmt-check` report nothing.
- **Independent probes,** run in the private worktree from [`probes/`](probes/), copied into `packages/vite-traits-plugin/tests/` and its `fixtures/`. Each writes its output to the path in `RV_OUT`. Each probe's output is saved under [`checks/`](checks/). The probes and their fixtures were moved out of the tree before the gates ran.

**Not covered.** These areas weren't read, which isn't the same as clean.

- I didn't rerun the root `aube exec just test`. Its 2,417 of 2,417 is the implementer's reading.
- I didn't repeat the implementer's mutations.
- **Not probed:**
  - the order of a TypeScript parameter property's assignment relative to the inserted blocks;
  - a built base whose `impl` brands are imported through a module other than the trait's own;
  - an attribute trait, layer (b), that also declares private members.
- I read the application build's output as text, and didn't run it. Its `instanceof` at runtime is the implementer's test.
- `origin/main` has moved since `bd1dee7df` by #101, which changes only `CONTRIBUTING.md`. So it doesn't affect the compared output.

## What was verified

**1. Evaluation order** ([`checks/runtime.json`](checks/runtime.json), from [`probes/rv-runtime.node.test.ts`](probes/rv-runtime.node.test.ts)). The fixture has a base with a field and a constructor, and the list `[A, B, C]`. `A` and `C` each extend a composition of the supertrait `S`. The component has a statement before `super(…)`, an argument that records, its own `#x` and a statement after `super(…)`. The observed order is the plan's:

- `before super`, `super arg`;
- `base field`, `base body`;
- `S field`, `A field`, `B field`, `C field`, `K field`;
- `S body`, `A body sReady=true`, `B body …`, `C body sReady=true`;
- `after super`.

`S` runs once, and `A`'s and `C`'s bodies see `S`'s body's effect. More shapes:

- **A flattened base,** `compose(K)` with `[D]`: `K`'s whole order runs, then `D field`, `K3 field`, `D body` and `K3 after super`.
- **A hand-written subclass:** `K`'s whole order, then `Sub field` and `Sub body`.
- **A generated constructor** passes `[1, 2]` to the base.
- **A component's `super()` with no semicolon,** whose statement ends at a `;` on the next line, keeps the order and parses.

**2. Renamed-name collisions.**

- **At runtime:** `S`, `A`, `B` and `C` each declare `#x`, and the component declares `#x` too. All five values stay apart, through reads and writes. So do the private methods `#m` of `S`, `A` and `B`.
- **Own and prototype keys:** the own keys are only the base's `baseField` and `args`. The prototype keys are the public accessors, `who` and the brands.
- **A component that declares the exact renamed name** `#s_bb23c946`, as a field or as a private method, is `trait-binding-shadowed`. I computed the suffix independently, as SHA-1 of `''`, `\0` and `T` ([`checks/diagnostics.jsonl`](checks/diagnostics.jsonl), rows `collide:`).

**3. A shared supertrait copied once.**

- `[A, B, C]` holds `S` once, ahead of `A`. Its field and its body each run once per instance.
- In `[A, S]`, the later `S` is dropped, and `who()` is `A`'s. `[S, A]` emits the same output.

**4. Diagnostics** ([`checks/diagnostics.jsonl`](checks/diagnostics.jsonl)). The row `at` shows the source at the reported offset.

- **At the token:**
  - in an initializer: `this` directly, in an arrow function, in a nested function and in an object method, `super`, `new.target`, `import.meta`, and `class {}`;
  - private names: `other.#x`, `#x in o`, `#x in this`, `(this).#x`, and `this.#x` in a nested function, in an object method and in a static method;
  - a static private field and a static private method, `accessor #x`, and a public field, which is `trait-field`;
  - in a trait's constructor: a parameter and a parameter property, `super(x)`, a statement before `super()`, a second `super()`, `super.method()`, `arguments` directly and in an arrow function, `new.target`, `return` bare, in an `if` and with a value, `var`, a function declaration, `eval`, an overload, `public`, and a read of the trait class;
  - `component-constructor`: no call, an `if`/`else`, two calls in a row, a conditional expression, a call in an arrow function, a block or a `try`, a sequence, a declaration, a parenthesized `(super())`, and a labeled `super()`;
  - `component-field`: `this` directly, in an arrow function, in `[1].map(() => …)`, in a nested function and in an object method, `super`, an `accessor` field and a private field.
- **At the composition's declaration:** `trait-binding-shadowed` for a name the component's constructor binds, and for a renamed-name collision. This is where the existing `trait-binding-shadowed` rows already report. The names the constructor binds that I tried: a parameter, a parameter property, `const` before and after `super()`, a `var` in a nested block, a function declaration, a global name used as a parameter, and the generated `args`. The plan's "each at its position" doesn't name a position for this code, so I accept it.
- **Accepted:**
  - `this?.#x`, and `this.#x` in an arrow function;
  - `this.#x` as a compound, update and destructuring target;
  - a private method beside a public one of the same name;
  - `arguments` and `return` in a nested function;
  - `let` in a nested block, and a `catch` parameter, of the component's constructor;
  - `static x = this`, and `new Map()`;
  - a `this` initializer, and an `if`/`else` `super()`, when the list has no trait constructor.
- **`trait-list`** ([`checks/trait-list-chain.jsonl`](checks/trait-list-chain.jsonl)): it fires for a source base in another module that composes the trait, and through a hand-written subclass of that base. It doesn't fire when the base composes a different trait. The implementer's tests cover a built base and a chain that can't be read.

**5. Declarations** ([`checks/declarations.txt`](checks/declarations.txt)).

- tsdown, with the plugin, emits `#private;` and `constructor();` for a trait that extends a composition of a supertrait with a constructor. It emits `#private;` and no `constructor` for a trait with only a private method.
- A component of `[Sub, Other]` that declares its own `#x` and is constructed with `new Item()` typechecks with 0 diagnostics.
- **Mutations,** each with exactly one diagnostic: a read of a trait's `#ready` (`TS2551`), and of a missing member (`TS2339`).

**6. The application build** ([`checks/trait-module-builds.txt`](checks/trait-module-builds.txt)). `transformTrait(…, true)` leaves no private field, private method, private accessor or `constructor` in any trait class, and keeps `Symbol.hasInstance` and the brands. The private binding `tag`, which a constructor body reads, stays exported under its build-only name.

**7. Build identity** ([`checks/build-identity.txt`](checks/build-identity.txt)). Each side was built in its own worktree, with its own install and `_package-builds`:

- core: 81 files on each side, and material-x: 213. The lists are equal, and every file's SHA-256 is equal.
- No build log has a `trait-member-conflict`.
- All 22 size rows are equal.
- **Discriminator:** the branch's built plugin contains `component-constructor` twice and main's not at all. The libraries' tsdown configuration imports that built plugin (`.scripts/tsdown-library.ts`). So the comparison sees the change.

## Findings

### reviewer-1 — an uncopied private field's initializer runs in the hand-written class and not in the component (Tier B, architect)

- **Current behavior and contract.**
  - The plan's decision 3, property 10, `RD-33` property 8 and the document's §Its members all say that a private field which no member or constructor of its trait references isn't copied. The plan's and the document's reason is that the field _"can't be observed, so leaving it out keeps the runtime the same"_.
  - The implementer's second open choice adds that such a field isn't validated: its initializer may read `this` with no diagnostic.
- **Why it is a problem.**
  - An initializer can be observed through its effects, which the document does not account for. So the reason the document gives is false, and property 2 doesn't hold for such a trait: _"the flattened component behaves as the hand-written class"_.
  - With the second open choice, a trait author who writes `#registered = registry.add(…)`, or `#x = this.listen()`, gets a component from which the effect is silently missing. The second form is exactly the one that the rule for copied fields refuses.
- **Evidence.** Trait `E` declares `#unused = rec('E unused field')`, which nothing references, and `#used = rec('E used field', 'e')`, which a getter reads ([`probes/fixtures/rv-traits.ts`](probes/fixtures/rv-traits.ts)).
  - The hand-written class that declares both, `KEHand`, records `base field`, `base body`, `E unused field` and `E used field`.
  - The flattened `KE` records `base field`, `base body` and `E used field`. Its emitted class has no `#unused`.
  - Both are in [`checks/runtime.json`](checks/runtime.json), keys `KE …` and `KEHand …`.
- **Scope today:** none. The only private fields in trait sources are two `#brand!: true`, in `FocusForwarding` and `ButtonGroupCore`, and neither has an initializer.
- **Required property.** What the plugin does with a private field that nothing references agrees with the hand-written class. Otherwise, what the document and `RD-33` property 8 say about that field is true, and names the effect that is lost. The rule decides whether such an initializer is validated.

### reviewer-2 — `lint-fix` writes TypeScript into a `.mjs` file (Tier B, outside the unit)

- **Current behavior.** oxlint reports `typescript/prefer-readonly` on a `.mjs` file, and `--fix` writes `readonly #hits` into it. That is TypeScript, and `fmt` then fails to parse the file.
- **Why it is a problem.** An instrument that `handoff.md` requires on every edited file corrupts a JavaScript file. The defect is the same kind as handoff's _"a lint rule may not re-decide"_ formatting, and it is caught only because `fmt` runs after `lint-fix`.
- **Evidence.** I copied `stateful.mjs` to a scratch file without that rule in its disable line. oxlint reported three `prefer-readonly` errors, at lines 19 to 21. `--fix` wrote `readonly` at all three. Then I deleted the scratch file.
- **Required property.** A typed TypeScript rule's autofix doesn't run on a JavaScript file.
- **For this unit:** naming the rule in `stateful.mjs`'s existing `oxlint-disable` line is acceptable. `stateful.mjs` is a new fixture, and it follows the disable convention of the existing `forwarding.mjs`, which turns off two TypeScript rules for its JavaScript. The lint gate is clean with it.
- **Routing.** I don't propose an id: the coordinator routes the gate as a separate finding, and the register that owns it assigns one.

## Open, not findings

- **`RD-33` still says "Unimplemented."** The implementer's report leaves its dating to the architect.
- **Open choice 1, judged:** `trait-binding-shadowed` fits a renamed-name collision. The code already means _"the component's class binds a name that copied source reads"_, the diagnostics row says so, and the check fails closed.

## Re-check of reviewer-1, at `3f038c402`

**Read at** `3f038c402`, the implementer's remediation, against the architect's ruling in `02fa8d70c`: `RD-33` property 8, and the plan's decision 3 and property 10. **The ruling:** a private field with an initializer is copied and checked whether or not anything references it. Only a field with no initializer that nothing names, such as `#brand!: true`, is skipped. No new diagnostic. **Scope:** reviewer-1 only, not a fresh full proof.

**Verdict: reviewer-1 is closed, and the remediation matches the ruling.** No new finding.

- **The code.** `normalizeTraitClass` keeps a private field when `element.value !== null` or a member or the constructor references it. That is the ruling's rule, and nothing else in the plugin changed. Kept fields stay in declaration order, and an initializer is checked by `normalizeField`, the same path as a referenced field's. `FieldIR`'s doc says the same.
- **My original probe, rerun unchanged** from [`probes/`](probes/):
  - `KE` now records `base field`, `base body`, `E unused field`, `E used field`, the same as the hand-written `KEHand`.
  - The emitted class holds `#unused_7b9fa45c = …` before `#used_7b9fa45c`.
  - The probe row `init this but field unreferenced` is now `trait-member`, at `this`. Before, it was accepted.
  - Every other row of the diagnostics probe is unchanged, and so is `K`'s whole order.
- **The mutation witness holds.** With the old filter, `.filter((element) => referenced.has(element.key.name))`, restored in a scratch edit, the suite fails exactly 3 tests and passes 251:
  - `state.node.test.ts`: _should run its initializer as the hand-written class does, in the same order_;
  - `state.node.test.ts`: _should be copied, renamed_;
  - `diagnostics.node.test.ts`: the `trait-member` row _this in the initializer of a field that nothing references_.

  With the filter at `3f038c402`, 254 of 254 pass. I restored the file afterwards, and the tree was clean.

- **Build identity:** I accepted the implementer's reread against `dbf0ab8ae` without rebuilding. `3fdd3a829..3f038c402` changes no file under `packages/core` or `packages/material-x`. No trait source in `packages/*/src` declares a private field with an initializer, so the new filter keeps no field that the old one dropped.
- **The document and the records.** `trait-flattener-plugin.md` §Its members, its `RD-33` change-record row, the plan's decision 3, properties 10 and proof 8, and `RD-33` property 8 now say the same thing. None of them says that an unreferenced field can't be observed. Each states the fields with no initializer that nothing names as the only skipped case.

**Not re-run:** the root `aube exec just test`. Its 2,420 of 2,420 is the implementer's reading.