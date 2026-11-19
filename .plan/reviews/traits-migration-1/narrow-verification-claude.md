# PR #76: final-1 and final-2, narrow verification

**Files were read at:** `7c0306417`, the head of `repo/traits-migration-1`, in a detached scratch worktree outside the slots.

**Diff reviewed:** `4dea13f38..7c0306417` outside `.plan/`. That is the repair `9db2f67f5`: `annotation.ts`, `trait-module.ts`, their tests, and the plugin document.

**Governing records:** my [final verification](final-verification-claude.md), and the plan's _Rulings on the repair verification_.

**Lens:** a narrow check of final-1 and final-2, not a new pass. My runs are saved in [`checks/narrow-verification-witnesses.txt`](checks/narrow-verification-witnesses.txt). After `aube exec just build`, the plugin suite passes: 8 files, 100 tests. Nothing is repaired, and nothing was written to GitHub.

**Verdict:**

- final-1 and final-2 are closed.
- The implementer's claim about oxc's identifier-like nodes holds.
- The plugin document's text matches the code.
- There is no new finding, and nothing in this scope blocks the merge.

## final-1: a JSX name counts

**Closed (N-W3).** Each of these gives `composition-shape`:

- `<FooBase />` (J1);
- `<FooBase.Inner />` (J2);
- an element with children and a closing tag (J3);
- an attribute value `{FooBase}` (J4);
- a spread attribute (J5);
- a child expression (J6);
- a fragment that holds the name (J10).

**The positions that aren't references still flatten:**

- an attribute named `FooBase` (J7);
- `<ns.FooBase />`, where the name is a member's property (J8);
- `<a:FooBase />`, a namespaced name (J9).

With `annotation.ts` restored alone to `4dea13f38`, the two new rows fail (N-W1).

**oxc has no other identifier-like node type (N-W2).** In `@oxc-project/types` 0.158.0, the version the plugin uses, the interfaces that declare a string `name` are:

- `IdentifierName`, `IdentifierReference`, `BindingIdentifier`, `LabelIdentifier` and `TSIndexSignatureName`, all tagged `"Identifier"`;
- `PrivateIdentifier`;
- `JSXIdentifier`.

The only other type tag with `Ident` or a JSX name is `JSXNamespacedName`, which holds two `JSXIdentifier`s and has no `name` string of its own. `JSXSpreadAttribute` and `TSConstructSignatureDeclaration` show up in the witness only because the search window reaches back into the interface before. Neither declares a `name`.

The count matches every tag ending in `Identifier` that has a string `name`, and returns early for `PrivateIdentifier` and `JSXNamespacedName`. So every identifier-like node counts unless a known non-reference position skips it.

**`eval('FooBase')` still flattens (J11).** The document now states that no syntactic count can see it, as I recorded it: a limit, not a finding.

## final-2: every `var` is a declaration

**Closed (N-W3).** Each of these leaves the class's members alone:

- a `var` in a block (N1);
- `for (var … of …)` (N2);
- a `var` with no write, in a loop body (N3);
- a `var` in a `catch` block (N4);
- a `var` in a labelled statement (N5).

A `let` in a block, which is its own binding and writes nothing at module scope, leaves the brand recognized (N7), and so does the `const` control (N8). With `trait-module.ts` restored alone to `4dea13f38`, the two new rows fail (N-W1).

**A note, not a finding.** A `var` inside a function is function-scoped, but the count reads it as a second declaration too, so recognition fails (N6). That is the fail-closed direction the ruling asks for: the module is left untouched, and its members stay.

## The plugin document

**The transform section matches `assignedNames`.** It names:

- assignment, including each name in a destructuring pattern with its defaults and rest elements;
- update;
- the left side of a `for…in` or `for…of` that isn't a declaration;
- a second declaration, counting each `var` in a block or a loop head.

It doesn't say that a `var` inside a function counts too. That only makes the code stricter than the text, so it can't mislead anyone into expecting a deletion that doesn't happen.

**The composition section matches `countValueReferences`.** It says:

- any identifier-like node counts, `<X />` and `<X.Inner />` included;
- a JSX attribute's name doesn't count;
- a direct `eval('X')` can't be seen.

It doesn't name the two other skips, a JSX member's property and a namespaced JSX name. Neither is a reference, so the document's _"with no other value reference"_ still describes the rule.

## Scope

**Covered:**

- The repair's diff.
- A rebuild.
- The plugin suite.
- Each repaired file restored alone.
- N-W3's 20 shapes.
- `@oxc-project/types`' interfaces.

**Not covered:** the root `just test`, core's and material-x's suites, and proof 7. The implementer reports them as passing; I didn't re-run them.

**CI:** run 44568417311 on `7c0306417` is reported to the coordinator with this record's push. This record doesn't wait on it.