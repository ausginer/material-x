# Code of Size

This document defines how we reduce bundle size.

The goal is **not code golf**. The goal is to remove runtime machinery the library does not need, move guarantees to compile time where possible, preserve tree-shaking, and keep the public API and lifecycle semantics clear.

A size pass must make the implementation smaller **without making the contract worse**.

---

## 0. Runtime performance wins

Bundle size is a secondary performance goal.

If reducing bundle size would make runtime behavior meaningfully slower, more allocation-heavy, more layout-heavy, or algorithmically worse, **runtime performance wins by default**.

In particular, do not trade bytes for:

- extra work on hot paths;
- additional forced layout or DOM measurement;
- new allocation in pointer-move or animation paths;
- worse asymptotic complexity;
- repeated computation that was intentionally cached;
- slower admission, movement, settlement, or teardown.

A size reduction that introduces a runtime-performance trade-off is not an automatic optimization. Measure it and report it for owner review.

For this library, bundle size matters because the code ships to every consumer; runtime performance matters more because interaction code runs under latency-sensitive input.

---

## 1. Delete runtime policy before compressing code

### 1.1 No nannying

Do not protect consumers from mistakes that are already their responsibility.

Runtime validation is justified only when it protects a library-owned invariant that cannot reasonably be expressed or enforced elsewhere.

In particular:

- do not validate inputs merely to provide nicer error messages;
- do not validate values already constrained by the type system;
- do not reject harmless object shapes just because the implementation prefers a narrower shape;
- do not normalize consumer data defensively unless the library must take ownership of it;
- do not add checks for unsupported use that would naturally fail through the library's existing lifecycle/error path.

If consumer misuse causes an operation to fail, prefer the normal `onError` path over a synchronous `throw`.

Ideally, public runtime code should contain very few explicit `throw` statements.

### 1.2 Prefer types over runtime guards

If a constraint can be made impossible or visible at compile time, prefer that over a runtime check.

Examples:

- reserved kernel keys;
- callback shapes;
- discriminated unions;
- construction-time slot ownership;
- impossible combinations of public configuration.

Do not pay runtime bytes to enforce a rule the compiler can already enforce.

### 1.3 Do not ship verbose diagnostics by default

Long diagnostic strings are runtime payload.

If a failure is already classified by a stable error code or failure category, a large explanatory string should need a strong justification.

Development-only diagnostics are preferable when they can be removed from production output.

---

## 2. Be suspicious of abstraction that exists once

### 2.1 Single-use functions are inline candidates

If a function has one call site, seriously consider inlining it.

The same applies to:

- wrappers;
- factories;
- adapters;
- one-off helper objects;
- functions that merely rename another call;
- functions that construct an object only for the callee to immediately unpack it.

Do **not** inline automatically when the function is a meaningful semantic or invariant boundary.

If keeping a single-use abstraction materially improves the design, record it in the size report for owner review.

### 2.2 Do not build a framework to remove duplication

A generic runtime mechanism is not automatically cheaper than two direct paths.

Prefer the smallest structure that matches the actual extension contract.

Be especially suspicious of:

- registries;
- service locators;
- dynamic maps of handlers;
- generic runtime pipelines;
- schema walkers;
- plugin-manager-like infrastructure;
- runtime discriminators introduced only to make code look generic.

Static construction-time topology is usually preferable when the set of slots is known.

---

## 3. Do not pay runtime for type-level architecture

Type-level structure should disappear from the bundle wherever possible.

Prefer:

- type-only brands;
- literal unions over runtime enums when values are not part of the public runtime vocabulary;
- type-only extension vocabulary;
- compile-time closure over runtime adapters;
- direct structural typing over identity wrappers.

A public type graph must not accidentally force an equivalent runtime graph.

---

## 4. Public runtime vocabulary must earn its bytes

Do not export numbered implementation constants merely to give internal values names.

Public runtime values should exist only when consumers genuinely need to use them.

Internal discriminants should be written so that a minifier can inline or fold them.

In particular:

- avoid exported numeric phase/state/failure constants unless they are part of the supported consumer contract;
- prefer local literals or non-exported constants for implementation-only states;
- do not preserve an export merely because tests or internal code currently use its symbolic name.

If an exported value is required for public authoring, that is an API decision, not a size trick.

---

## 5. Do not store what can be derived cheaply

Duplicate state costs code as well as memory.

Avoid keeping multiple representations of the same fact, such as:

- `closed`, `alive`, and `signal.aborted` when one authoritative source is enough;
- booleans derivable from an existing phase/progress state;
- cached aliases of objects already stored in operation state;
- duplicate verdict/result representations;
- counters or flags whose meaning is already encoded structurally.

Prefer one authoritative representation and derive cheap facts from it.

Do not replace O(1) state with expensive recomputation merely to save a few bytes.

---

## 6. One mechanism, but not one framework

When two paths differ only slightly, prefer one shared mechanism with a small point of variation.

But do not introduce generic machinery solely to deduplicate a few statements.

The target is:

> shared semantics without abstract machinery that costs more than the duplication it replaces.

This is a measurement question, not a style rule.

---

## 7. Preserve tree-shaking aggressively

Local source size is not the same thing as composition size.

A helper can make one module smaller while forcing `minimal` to import code it previously did not need.

Therefore:

- optional features should pay for themselves;
- landing code should not leak into a composition that does not use landing;
- layout-animation code should not leak into a composition that does not use layout animation;
- middle-tier or kernel authoring machinery should not leak into the ordinary tier merely because it is convenient to share a helper;
- a shared helper is suspect if it causes a lower tier to retain an otherwise optional module.

Small duplication across optional modules can be preferable to a shared abstraction when it preserves tree-shaking.

Measure compositions, not just the complete bundle.

---

## 8. Do not preserve compatibility for an unreleased API

Before release, obsolete surface is pure cost.

Do not keep:

- deprecated aliases;
- compatibility wrappers;
- legacy argument forms;
- retired subpaths;
- transitional factories;
- old callback names;
- old exports kept "just in case".

If the API is not yet shipped, delete the obsolete shape completely.

---

## 9. Copies and intermediate objects need an ownership reason

Do not copy data defensively by default.

A copy is justified when the library needs to:

- take ownership;
- stabilize a snapshot across consumer mutation;
- enforce an actual lifecycle boundary.

Otherwise, prefer the consumer-owned reference.

Likewise, be suspicious of repeated packing and unpacking:

```ts
foo({ x, y, item });
```

followed immediately by:

```ts
bar(x, y, item);
```

or the inverse pattern across several layers.

Repeated shape conversion is a size-pass candidate.

---

## 10. Classes need semantics, not prestige

Use a class when the class itself provides required semantics, such as:

- public identity;
- `instanceof`;
- stable error behavior;
- an object with meaningful lifecycle identity.

For internal records, commands, handles, and carriers, a plain object or function may be smaller and clearer.

Do not replace an accepted public class merely for bundle size.

---

## 11. Do not write source code like a minifier

Do not manually shorten identifiers or distort clear control flow for a few bytes.

Avoid tricks whose only justification is that the minified source might be shorter.

Let the minifier handle:

- identifier shortening;
- constant folding;
- boolean simplification;
- dead branches;
- local inlining where it already can.

A size pass should primarily remove **semantics and machinery the runtime does not need**, not imitate terser output by hand.

---

## 12. Public API clarity is not a size budget

Do not reduce size by making consumers pay the complexity cost.

Do not:

- shorten public names;
- replace clear API with bit flags;
- merge semantically distinct callbacks only to save bytes;
- weaken progressive disclosure;
- expose implementation concepts so internal code can be shorter;
- make a common use case more awkward to save a small amount in the implementation.

The implementation is the thing being optimized.

---

## 13. Correctness and lifecycle semantics are fixed during a size pass

A size optimization must preserve the accepted contract.

If an optimization requires changing:

- lifecycle ordering;
- failure semantics;
- public API;
- ownership;
- supported composition behavior;
- observable timing;

then it is no longer a size optimization.

Stop and report it as a separate design finding.

Do not silently trade correctness for bytes.

---

## 14. Do not trade runtime performance for bundle size

A smaller bundle is not automatically a better implementation.

Do not introduce:

- new O(n) work on a hot path;
- additional layout reads;
- avoidable allocation;
- repeated DOM queries;
- worse asymptotic behavior;

for a bundle-size reduction without explicit measurement and owner approval.

When runtime performance and bundle size genuinely conflict, **runtime performance has priority by default**. Bundle size is a secondary performance dimension.

---

## 15. Measure every meaningful change by composition

Do not accept "this should be smaller" as evidence.

For meaningful changes, record before/after measurements for the relevant compositions, including at least:

- minimal;
- minimal `xy`;
- minimal + optional features;
- complete;
- feature-matched non-composed baseline.

When possible, record the reason for the delta:

- module removed;
- branch removed;
- wrapper inlined;
- diagnostic string deleted;
- import edge removed;
- optional code stopped leaking into minimal;
- runtime validation removed.

The important question is not only **how many bytes changed**, but **which consumers pay them**.

---

## 16. Prefer deleting machinery over rebasing syntax

The highest-value size reductions usually come from removing:

- validation;
- duplicate state;
- compatibility;
- wrappers;
- runtime indirection;
- unnecessary exports;
- optional feature leakage;
- abstractions that exist only for internal neatness.

Do those before syntax-level micro-optimization.

---

## 17. Questionable optimizations go into the report

Do not automatically apply a change when its size win depends on making the code materially less obvious.

Report it for owner review when it involves:

- deliberate duplication;
- unusual syntax;
- removing a meaningful semantic boundary;
- changing a helpful internal abstraction;
- a performance trade-off;
- a public API trade-off;
- a very small gain relative to readability cost.

The report should include the measured delta and the trade-off.

---

# Litmus test

For every suspicious piece of runtime code, ask:

> **What library-owned invariant requires this code to exist at runtime?**

Not:

> What bad thing could a consumer theoretically do?

If the answer is:

- "the type system already prevents it",
- "the consumer would only break their own code",
- "this was added for a nicer error",
- "this mirrors state we already have",
- "this supports an API we deleted",
- "this only makes the implementation more generic",

then the code is a strong candidate for deletion.

---

# Order of attack

A size pass should generally proceed in this order:

1. remove nannying and redundant runtime validation;
2. remove compatibility and dead public/runtime vocabulary;
3. remove duplicate state and unnecessary carriers;
4. inspect single-use abstractions and wrappers;
5. inspect runtime genericity and indirection;
6. inspect module boundaries and optional-feature leakage;
7. inspect copies, intermediate objects, and repeated shape conversions;
8. only then consider local syntax-level simplification;
9. measure every meaningful change by composition;
10. re-base budgets only after the remaining size is understood and accepted.

---

# Definition of success

A successful size pass leaves the library:

- behaviorally identical;
- **no slower in latency-sensitive runtime paths unless an explicit measured trade-off was accepted**;
- easier or no harder to understand;
- at least as type-safe;
- no more defensive toward consumer misuse than necessary;
- no more coupled across optional features;
- smaller in the compositions that actually pay for the removed machinery;
- with every remaining significant byte attributable to an accepted runtime responsibility.

The target is not the smallest code we can write.

The target is the **smallest runtime the contract actually requires**.