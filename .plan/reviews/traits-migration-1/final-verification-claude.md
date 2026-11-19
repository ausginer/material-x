# PR #76: verifier-1 and verifier-2's repairs, verified

**Files were read at:** `cc71507ba`, the head of `repo/traits-migration-1`, in a detached scratch worktree outside the slots.

**Diff reviewed:** `2ad5ce059..cc71507ba` outside `.plan/`. That is the repair `7b04eb862`: `annotation.ts`, `trait-module.ts`, their tests, and the plugin document.

**Governing records:**

- The plan's _Rulings on the repair verification_ (`ea5fefe46`).
- `repo:RF-66` (`eb9bcfb45`).
- My [repair verification](repair-verification-claude.md).

**Lens:** feature proof. The claims below come from my own runs, saved in [`checks/final-verification-witnesses.txt`](checks/final-verification-witnesses.txt). After `aube exec just build`, the plugin suite passes: 8 files, 95 tests. Nothing is repaired, and nothing was written to GitHub. CI run 44566829848 was in progress when I pushed this record.

**Verdict:**

- **verifier-1 is closed for every shape the ruling names.** The count now fails closed over every TypeScript node. One new finding is in the same class: **final-1**, a reference in JSX.
  - The architect ruled that verifier-1's class is repaired before the merge. So **final-1 blocks the merge under that ruling**, though nothing in the tree reaches it.
- **verifier-2 is closed for the forms its tests name.** It misses a `var` redeclaration nested in a block or a loop head: **final-2**, Tier C. Under the ruling, that doesn't block, and it needs a dated note if it slips.
- **The re-export limit in the plugin document is accurate.**
- **Proof 4 records property 8's reading,** equal to V-W2.

## verifier-1: the reference count

**Closed for the ruled shapes (F-W2).** Each of these now gives `composition-shape`:

- a namespace body (V5);
- an enum initializer (V6);
- a parameter property's default (V7);
- `export =` (V10);
- `import x =` (V11);
- a decorator's argument (V12);
- `<unknown>FooBase` (V13);
- `satisfies` (V14).

A `declare namespace` that names `FooBase` only as a type flattens (V9). A property key (V1) and a `typeof` type (V2) still flatten. With `annotation.ts` restored alone to `2ad5ce059`, the three new rows fail (F-W1).

**Does the count fail safe?** For TypeScript nodes, yes. Every node is walked except type nodes, type-only declarations and `declare` declarations, so an unknown TypeScript node counts its identifiers.

It isn't fail-safe for identifier-like nodes of another type: the count counts only `type === 'Identifier'`.

### final-1 — a JSX element that names the constant is flattened over

- **Tier A, latent.**
- **Current behavior.** In a `.tsx` module, `<FooBase />` and `<FooBase.Inner />` name the constant with a `JSXIdentifier` (F-W3), which `countValueReferences` doesn't count.
  - Both modules flatten. `const FooBase` is removed, and the name is still in the emitted module once (F-W2, V15 and V16).
  - The JSX compiles to a value reference to `FooBase`, which is now bound nowhere. So evaluating the element throws a `ReferenceError`. That is inferred from the emitted text; I didn't run it.
- **Requirement.** The ruling's _"must never be flattened over a live reference"_, and its rule for this class: _"an unrecognized shape refuses … A new shape can then cost a refusal, never a wrong module."_
- **Reach.**
  - The plugin accepts `.tsx` (`CANDIDATE` in `plugin.ts`).
  - `erasableSyntaxOnly` doesn't forbid JSX, so a module in this repository could reach it.
  - No composition in the tree is in a `.tsx` module (F-W4).
  - Rendering an element's base class as JSX is meaningless. So the realistic risk is low, but the module still builds wrong instead of being refused.
- **Blocking.** Under the architect's ruling for verifier-1, this blocks the merge. Whether a meaningless shape needs the same treatment is the architect's call.

**A limit, not a finding:** `eval('FooBase')` in the component's module flattens (V17). A reference inside a string can't be seen by any syntactic count. Trait members refuse `eval` for the same reason, but nothing refuses it in a component's module. It goes to the architect only if the rule is meant to cover direct `eval`.

## verifier-2: the brand's write check

**Closed for the ruled forms (F-W2).** Each of these leaves the class's members alone:

- destructuring (R4);
- `for…of` (R5);
- a parenthesized assignment (R11);
- an object pattern with a default (R12);
- the implementer's top-level second declaration.

A `const` (R1) and an unassigned `var` (R2) are still recognized. With `trait-module.ts` restored alone to `2ad5ce059`, the three new rows fail (F-W1).

### final-2 — a nested `var` redeclaration isn't counted

- **Tier C.**
- **Current behavior.** The second-declaration check reads only `program.body`'s top-level statements. The `for…in`/`for…of` check skips any left side that is a declaration.
  - A `var` is module-scoped wherever it appears outside a function. So these write the brand, and leave the class recognized (F-W2):
    - `if (…) { var $linked = Symbol("Other"); }` (R8);
    - `for (var $linked of …) {}` (R9).
  - R10, `while (false) { var $linked; }`, is recognized too, but it writes nothing.
- **Requirement.** The ruling: _"a second module-scope declaration of the name"_, and _"the left side of `for…in` or `for…of` that isn't a declaration"_. R9's `var` is both a declaration and a module-scope write. The ruling's wording exempts it, but its _"never written again"_ doesn't.
- **Not merge-blocking.** As the ruling says, recognition still requires the generated method token for token, so no realistic class is reached. If it slips, it needs a dated note.

## The plugin document's limit

**`trait-flattener-plugin.md`, under _A composition_,** says:

> Import a trait or a base from the module that declares it. … a trait imported through a re-export is `trait-unresolved`, and a base whose static kind it must read is `static-kind`.

That matches K4 and K5 of my repair verification, and `repo:RF-66`. The transform section's recognition text now lists the write forms the code counts. Because of final-2, it is broader than the code by the nested `var` cases.

## Proof 4

**The proofs record's proof 4** now reads property 8 through an application build with the plugin: 12,936 B, 3,819 B brotli, against 13,252 B, 3,866 B without. That equals V-W2, as the ruling asks.

## Scope

**Covered:**

- The repair's diff to `annotation.ts`, `trait-module.ts` and the plugin document.
- A rebuild, and the plugin suite.
- Each repaired file restored alone.
- F-W2's 23 shapes.
- Proof 4's lines in the proofs record.

**Not covered:**

- The root `just test`, core's and material-x's suites, and proof 7, at this head.
- CI run 44566829848.
- The new rows' bodies, beyond their names and the restore runs.

## Next

- **The architect:** final-1, whether it is repaired before the merge, as verifier-1's ruling implies, and whether direct `eval` is in the rule's scope.
- **The implementer:** final-2, or a dated note.