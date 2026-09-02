# Contributing

The single source of truth for **how code is written here**: source conventions in Part I, the size and ownership policy in Part II. Where a document is supposed to live is in [`documentation.md`](.agents/docs/documentation.md).

**Part II's section numbers are permanent.** Records cite them, so they are never reused and never re-sorted, and a section whose rule is withdrawn keeps its number. This document states the rules in force; what it used to say is in the [Change record](#change-record).

**Some rules were measured and some are priors.** Where a rule was tested, this document says so and links the record. A rule with no measurement beside it is a default to be argued with, not a finding.

---

# Part I — Code style

## Priorities, in order

1. **Performance** — as fast as possible for the end user.
2. **Code size** — load time is part of the user's experience, so a smaller bundle can beat a faster-but-larger one. Keep size minimal unless it costs runtime performance. Private identifiers may have long names; they are mangled in production builds.
3. **Readability** — code must be maintainable. DX does not prevail over UX. A comment is sometimes better than a less performant but cleaner implementation.

Part II is senior to Part I wherever the two meet.

## Language and platform

- Use **Baseline-2025** features.
- Prefer native browser and Node.js APIs wherever the native API covers the use case — `fetch` over axios, `Array.groupBy` over lodash, `#private` over the `private` keyword. This does not apply to libraries providing substantial value beyond a native API, such as TanStack Query or React Router.
- Never use the `sync` variants of `node:fs` unless there is genuinely no async alternative. `registerHooks` from `node:module` requires synchronous hooks and is the only known exception.
- Use `AbortController` and `{ once: true }` instead of `removeEventListener` wherever they apply.
- Treat `Object.assign` as an ordered multi-source assignment primitive. When the sources already exist independently, pass them as separate arguments rather than pre-merging with object spread: pre-merging materialises a combined source, copies later-source properties twice, and can change observable assignment behaviour for setters, proxies, accessors and other non-plain targets.

## TypeScript

- Prefer `type` over `interface`, unless it is an interface a class implements or the declaration extends a global interface.
- Wrap types in `Readonly<>` and mark members `readonly` unless mutability is required.

## Nullish checks

The check states what the value's absence _means_. The fourth case is the one a mechanical sweep breaks.

- **Truthiness for reference-or-null values.** Where the non-null side is an object, array, function, DOM node or class instance, no valid value is falsy, so `if (handle)` says everything `!== null` said and reads as _is there one_. This is the common case.
- **`== null` where `null` and `undefined` are deliberately the same answer.** An absent property and an explicitly cleared one are the same absence. `eqeqeq` is configured with `"null": "ignore"`, and this is the only loose equality the repository permits.
- **`=== null` / `!== null` only where the distinction carries information** — `null` and `undefined` are different answers, or `null` is a named sentinel the surrounding code reasons about: a documented _there is no such thing_ against a value that merely has not arrived.
- **Never convert an exact check to truthiness over a domain with a meaningful falsy value.** `number | null` is the trap: `0` is an ordinary member and `if (count)` silently drops it. Likewise `string | null` where `''` is reachable, `boolean | null`, and any union containing a literal `0`, `''` or `false`. **A domain that happens to exclude its falsy values today is still an exact check** — a numeric union starting at 1 is one edit from starting at 0.

The rule is about meaning, not byte count. Where both spellings are correct, the shorter one wins on §Priorities; where they are not, the correct one wins.

## Shape

- Declare top-level functions with `function`. Declare internal functions — those created inside another function — as arrow functions. Object methods stay shorthand.
- Always brace block statements. No one-liners.

## CSS

- Prefer CSS classes over inline styles.
- Files with a `.css.ts` extension are compiled to CSS for browser use rather than executed as modules.

## Unit tests

- Use `describe` for the unit under test.
- Each `it` covers one specific piece of that unit's logic; do not combine several. Three unrelated assertions in one bare `it` is three cases, not one.
- An `it` name starts with — or at least contains — the word `should`.

```ts
describe('buildSelector', () => {
  it('should build scoped selector', () => {
    /* one behaviour */
  });
  it('should build built-in state selector', () => {
    /* one behaviour */
  });
});
```

Placement, file suffixes and Vitest project routing for `@ydinjs/material-x` component tests belong to the `test-component` skill; the layering behind them is in [`test-architecture.md`](.agents/docs/test-architecture.md).

## Comments and JSDoc

Governed by [`documentation.md`](.agents/docs/documentation.md) §5. Comments describe **the code that exists now**.

- Present tense, self-contained.
- Explain a non-obvious invariant, ordering constraint, ownership boundary, performance property, or reason for the current implementation.
- No planning or review bookkeeping — no `D-*`, `F-*`, `I-*`, phase numbers, review names, commit hashes or `.plan` sections. An internal comment may carry one bare decision pointer as an index entry; published JSDoc may not.
- Do not narrate history: no "used to", "was changed", "replaces", "previously", "this was added because". If a past decision holds reasoning still needed to understand the code, restate **the reason**, not its provenance. If removing the historical reference leaves nothing useful, remove the comment.
- A JSDoc block reaching a published `.d.ts` is consumer documentation: it carries only what a reader outside this repository can act on, and **preconditions the compiler cannot state are load-bearing there** — §1.1 deletes runtime guards on the strength of those sentences existing.

In short: **argue for what is, never about what was.**

---

# Part II — Code of Size

How we reduce bundle size. The goal is **not code golf**: it is to remove runtime machinery the library does not need, move guarantees to compile time, preserve tree-shaking, and keep the public API and lifecycle semantics clear. A size pass must make the implementation smaller **without making the contract worse**.

## 0. Runtime performance wins

Bundle size is a secondary performance goal. If reducing it would make runtime behaviour meaningfully slower, more allocation-heavy, more layout-heavy or algorithmically worse, **runtime performance wins by default**. Do not trade bytes for extra work on hot paths, forced layout or DOM measurement, allocation in pointer-move or animation paths, worse asymptotic complexity, recomputation that was intentionally cached, or slower admission, movement, settlement or teardown. Such a trade-off is not an automatic optimization: measure it and report it for owner review.

**A byte figure cannot answer a runtime question, and it will look like it did.** Measured in one package: a re-entry latch on a per-sample path cost **~1 ns** — two predictable branches and an assignment — while a shape assertion sitting cold at once per operation cost **~0.5 µs per call and allocated one descriptor object per key**, scaling with the data's width. A size ablation ranks those together and tells you nothing about either. If a candidate's real cost is _when it runs_ or _what it allocates_, measure that.

## 1. Delete runtime policy before compressing code

### 1.1 No nannying — trust the integrator

Do not protect consumers from mistakes that are already their responsibility.

**Correctness has a domain, and the domain is correct use.** The library must be correct under valid use of its public API; under anything the **end user** does — input, timing, ordering, abandonment; under anything the **platform** does — reentrancy, event ordering, scroll, resize, visibility, deferred work; and under any state **the library itself** creates, owns or hands out and later reads back. None of that is negotiable and no size pass touches it (§13). **Outside that domain the library owes nothing at runtime**; it is not a second type-and-semantics checker running in every consumer's bundle, forever.

**The contract does not have to be unconstructible in JavaScript.** It may be stated by TypeScript, by documentation, or by an obvious semantic precondition — _a duration is finite_, _`resolve` returns a position in the list you were handed_, _do not call this after you destroyed it_. An integrator reaching an invalid state through `any`, a cast, a `@ts-expect-error` or plain JavaScript has **left** the contract, not found a hole in it.

**So reachability is a gate, not the first of two questions.**

- **(a) the gate — can the invalid state arise despite correct integration?** The platform did it, a race did it, a reentrant callback did it, the end user did it, or the library minted the value itself and must read it back later. **If none of those: stop.** Nothing considered later reopens the question.
- **(b) the only justification, asked only of what survives (a)** — the library would itself violate an invariant it owns: corrupt its own state and keep operating on it, or publish under its own name a value its contract promises is well-formed.

**Fail (a) and there is nothing further to argue.** _Bad input could make our internals incoherent_ is not a justification: the internals are incoherent **because** something invalid was fed to them. **What happens after invalid input is not a justification for refusing the input** — silent nonsense downstream is _part of_ that undefined behaviour, not a separate harm that converts misuse into the library's responsibility. Ownership is the right second question and the wrong first one; asked first it justifies almost any check, because almost any bad value eventually touches something the library owns.

**Clause (b) is what stops the rule collapsing into _delete every check_** across the states the contract does admit, and its real work is on surfaces with more than two parties. _Let it fail naturally_ assumes the failure lands on whoever caused it, which stops being true the moment the library re-publishes someone else's value to a **third** party under its own name — a plugin's output folded into an application callback, an authoring API's return value handed on as library-computed data. That is what (b) is for, and it is not a way past (a): a check on an authoring API's return value must still establish that a _conforming_ author can produce the state. Multi-party structure decides _who is harmed_; it never decides _whether the input was admitted_. Nor does quietness: a check whose absence leaves a third-party author with a listener that binds and never fires is invisible and still theirs.

**_Naturally_ also assumes there is a failure at all.** It has to mean the existing lifecycle or error path actually runs — a non-function throws where it is called, a `NaN` threshold arms a press that never activates. Where it does not, the code **succeeds and does the wrong thing**: an unbounded animation duration hangs a gate nothing can classify. Run the counterfactual to the end and ask what the library is left _doing_, not only what it stops throwing — then ask (a) about it.

**The gate moves the argument out of the runtime and into the contract, which is the point: you cannot both accept an input in your contract and refuse it at runtime as _not our problem_.** Either the precondition is published and the input is outside the contract, or it is not published, the input is valid, and (b) is live. Which is why the gate is not a rubber stamp — a precondition invented at deletion time to disqualify an inconvenient input is not a contract term, it is the deletion wearing one. A term counts when an integrator can **meet** it and can **find** it: expressed by the type, written where the integrator reads, or genuinely obvious from the operation's own semantics. Where that takes an argument, the argument belongs in the record beside the deletion. Deciding what the contract says is a contract decision with a contract's consequences, not a size finding.

**Verify the failure before you argue about it**, whether deleting a check or defending one — the justification is a claim about what happens without it, and that claim is executable. One audit found a check describing a failure that **cannot occur at all**: it rejected a non-writable key because the composed record "would throw on write", while the composition used `[[Set]]` on a fresh extensible object and produced an ordinary writable property. Only running it finds that.

In particular:

- do not validate inputs merely to provide nicer error messages;
- do not validate values already constrained by the type system;
- do not reject harmless object shapes just because the implementation prefers a narrower one;
- do not normalize consumer data defensively unless the library must take ownership of it;
- do not add checks for unsupported use that would naturally fail through the existing lifecycle/error path.

**This section decides whether a check exists; §1.3 decides whether its message ships.** A check can survive here on (b) and still be gated under §1.3, because the party who can trigger it is outside the library. _Whose state breaks_ selects the check; _who can reach the condition_ selects the payload.

If consumer misuse causes an operation to fail, prefer the normal `onError` path over a synchronous `throw`. Ideally, public runtime code contains very few explicit `throw` statements.

### 1.2 Prefer types over runtime guards

If a constraint can be made impossible or visible at compile time, prefer that over a runtime check — reserved kernel keys, callback shapes, discriminated unions, construction-time slot ownership, impossible combinations of public configuration. Do not pay runtime bytes to enforce a rule the compiler already enforces.

**A constraint the compiler cannot state is still a constraint.** The absence of a type-level expression is not an argument for a runtime one. _No duplicates in this array_, _finite_, _still open_, _one of the elements I gave you_ are contract terms whether or not TypeScript can spell them. Write them where the integrator will meet them — and note that under §1.1 writing one down is what puts the input **outside** the contract, so the statement is the alternative to the runtime check, not a companion to it. The compiler is the cheapest place to put a rule, not the only legitimate one.

### 1.3 Do not ship verbose diagnostics by default

Long diagnostic strings are runtime payload, and they are easy to under-rate: in one measured package the diagnostic text was the **single largest attributable class of shipped bytes**, larger than any optional feature the package had.

**Classification is contract; prose is not.** If a failure is already classified by a stable error code, a large explanatory string needs a strong justification — and _the code alone does not say which failure it was_ is not one; that is a fault in the classification. When a sentence is the only thing telling apart several distinct faults sharing one code, the published vocabulary is doing less work than the design claims. Fix the vocabulary, or accept the coarseness deliberately; do not let English carry a discrimination the API refuses to make.

**A shipped message is an identity, not a narrative.** It names the fault and interpolates the offending value. Explanation, remedy, reassurance and restatement of the rule belong in the source and the contract — and where the build ships source maps carrying `sourcesContent`, they are _already_ in the tarball beside the site, in a file a bundling consumer never fetches.

**A development-only diagnostic is not automatically preferable to none.** Gate by **provenance** — what must be true for it to fire — never by who happens to receive it:

- **only this package's own defect can produce it** → gate it. Nobody outside can reach the condition, so nobody outside loses anything;
- **someone outside can trigger it** — a consumer, a third-party author of a _published_ authoring API, or the environment → **ship it**. A gate strips it from precisely the build the person who needs it installs, and hands them an empty stub they cannot fill.

The failure mode is slow and quiet: one package kept its gate for three revisions after publishing its authoring API, because the justification — _authoring is not on the public surface_ — had expired at a named release and nobody noticed.

**And a gate is a boundary decision, not a size one.** Giving a module or tier a build-time flag it does not already have changes what that tier depends on and what its authors must know. A rule that lets bytes buy a new dependency edge will eventually buy one that matters.

## 2. Be suspicious of abstraction that exists once

### 2.1 Single-use functions are inline candidates

If a function has one call site, seriously consider inlining it. The same applies to wrappers, factories, adapters, one-off helper objects, functions that merely rename another call, and functions that construct an object only for the callee to immediately unpack it.

Do **not** inline automatically when the function is a meaningful semantic or invariant boundary. If keeping a single-use abstraction materially improves the design, record it in the size report for owner review.

### 2.2 Do not build a framework to remove duplication

A generic runtime mechanism is not automatically cheaper than two direct paths. Prefer the smallest structure matching the actual extension contract, and be especially suspicious of registries, service locators, dynamic handler maps, generic runtime pipelines, schema walkers, plugin-manager-like infrastructure, and runtime discriminators introduced only to make code look generic.

Static construction-time topology is usually preferable when the set of slots is known.

## 3. Do not pay runtime for type-level architecture

Type-level structure should disappear from the bundle wherever possible. Prefer type-only brands, literal unions over runtime enums when the values are not part of the public runtime vocabulary, type-only extension vocabulary, compile-time closure over runtime adapters, and direct structural typing over identity wrappers.

A public type graph must not accidentally force an equivalent runtime graph.

## 4. Public runtime vocabulary is governed by surface and permanence

Do not export numbered implementation constants merely to give internal values names. Public runtime values should exist only when consumers genuinely need to use them.

**The bundle is not the cost, and that was measured.** Thirteen public numeric failure-stage constants, exported from a package root, cost a bundling consumer **0 minified, 0 Brotli, 0 modules** — byte-identical across fourteen compositions and across a fixture naming all thirteen reachably. A bundler that folds cross-module constants inlines every small-integer `const` at its use site and drops the module: **the symbolic name _is_ the number by the time the minifier finishes.** Record: [`failure-vocabulary-cost-claude.md`](packages/drag2/.plan/reviews/phase-23/failure-vocabulary-cost-claude.md).

So there is **no prohibition on exported numeric phase, state or failure constants, and there is a condition**: they must be _part of the supported consumer contract_. Three costs survive, and none is the bundle.

- **(a) Surface.** Every exported value is one more thing a reader of the API may believe they must understand. Paid in documentation, review and consumer questions; invisible to every instrument here, and it does not shrink when the bytes do.
- **(b) Permanence — the sharp one.** _The same inlining that makes the export free makes the value permanent._ A folded constant is copied into consumers' compiled output, so repointing it later changes nothing in their build and everything in yours: their already-compiled `2` keeps arriving, now meaning something else. **An exported number is a wire value from the day it ships**, and unpublishing the name does not retire the number.
- **(c) Install weight, and consumers who do not bundle.** The zero above is a _bundled_ zero. The same publication cost several thousand raw tarball bytes and about a kilobyte of Brotli across one entry's fetch closure, which a native-ESM or CDN consumer fetches and every consumer downloads at install. Most of it was the **doc comment about** the constants: when a vocabulary looks expensive, check whether you are pricing the values or the prose about them.

**The test:**

> Would a consumer, or a third-party author the package supports, have to **write this value** to do something the API supports?

If yes, publish it and accept that it is frozen from that day. If no, keep it internal — not to save bytes, which it will not, but because an exported value is a promise you cannot withdraw. So: prefer local literals or non-exported constants for implementation-only states; do not preserve an export merely because tests or internal code use its symbolic name; write internal discriminants so a minifier can inline or fold them.

**One scenario is unmeasured, and it is the one where the zero fails.** A toolchain preserving ESM without concatenating, or bundling with module wrappers, pays the import binding and the module. If a package's supported consumers include one, the size question reopens on its own terms.

If an exported value is required for public authoring, that is an API decision, not a size trick.

## 5. Do not store what can be derived cheaply

Duplicate state costs code as well as memory. Avoid keeping multiple representations of one fact: `closed`, `alive` and `signal.aborted` where one authoritative source is enough; booleans derivable from an existing phase/progress state; cached aliases of objects already in operation state; duplicate verdict/result representations; counters or flags whose meaning is already encoded structurally.

Prefer one authoritative representation and derive cheap facts from it. Do not replace O(1) state with expensive recomputation to save a few bytes.

## 6. One mechanism, but not one framework

When two paths differ only slightly, prefer one shared mechanism with a small point of variation — but do not introduce generic machinery solely to deduplicate a few statements. The target is **shared semantics without abstract machinery that costs more than the duplication it replaces**. This is a measurement question, not a style rule.

## 7. Preserve tree-shaking aggressively

Local source size is not composition size. A helper can make one module smaller while forcing `minimal` to import code it previously did not need. Therefore:

- optional features should pay for themselves;
- landing code should not leak into a composition that does not use landing;
- layout-animation code should not leak into a composition that does not use layout animation;
- middle-tier or kernel authoring machinery should not leak into the ordinary tier merely because sharing a helper is convenient;
- a shared helper is suspect if it causes a lower tier to retain an otherwise optional module.

Small duplication across optional modules can be preferable to a shared abstraction when it preserves tree-shaking. Measure compositions, not just the complete bundle.

## 8. Do not preserve compatibility for an unreleased API

Before release, obsolete surface is pure cost. Do not keep deprecated aliases, compatibility wrappers, legacy argument forms, retired subpaths, transitional factories, old callback names, or exports kept "just in case". If the API is not yet shipped, delete the obsolete shape completely.

## 9. Copies and intermediate objects need an ownership reason

Do not copy data defensively by default. A copy is justified when the library must take ownership, stabilize a snapshot across consumer mutation, or enforce an actual lifecycle boundary. Otherwise prefer the consumer-owned reference.

Likewise be suspicious of repeated packing and unpacking — `foo({ x, y, item })` followed immediately by `bar(x, y, item)`, or the inverse across several layers. Repeated shape conversion is a size-pass candidate.

## 10. Classes need semantics, not prestige

Use a class when the class itself provides required semantics: public identity, `instanceof`, stable error behaviour, or meaningful lifecycle identity. For internal records, commands, handles and carriers, a plain object or function may be smaller and clearer. Do not replace an accepted public class merely for bundle size.

## 11. Do not write source code like a minifier

Do not manually shorten identifiers or distort clear control flow for a few bytes, and avoid tricks whose only justification is that the minified source might be shorter. Let the minifier handle identifier shortening, constant folding, boolean simplification, dead branches, and local inlining it already does.

A size pass should primarily remove **semantics and machinery the runtime does not need**, not imitate terser output by hand.

## 12. Public API clarity is not a size budget

Do not reduce size by making consumers pay the complexity cost: no shortened public names, no bit flags replacing clear API, no merging semantically distinct callbacks to save bytes, no weakened progressive disclosure, no exposing implementation concepts so internal code can be shorter, and no making a common use case more awkward to save a little in the implementation.

The implementation is the thing being optimized.

## 13. Correctness and lifecycle semantics are fixed during a size pass

A size optimization must preserve the accepted contract. If it requires changing lifecycle ordering, failure semantics, public API, ownership, supported composition behaviour or observable timing, it is no longer a size optimization: stop and report it as a separate design finding. Do not silently trade correctness for bytes.

**This fixes the contract, and behaviour outside the contract is not part of it.** Deleting a nannying check changes what happens on input the contract already forbids, which is not a failure-semantics change here. The exception is where the contract **fixed** the outcome — a documented _this call is ignored_ is a promise, and the check and discard implementing it are contract. Say which of the two you have before deleting: a specified no-op stays; an incidental _we happen to throw here_ was never promised. If you cannot tell, you have found a contract gap — stop and report it.

## 14. Do not trade runtime performance for bundle size

Do not introduce new O(n) work on a hot path, additional layout reads, avoidable allocation, repeated DOM queries or worse asymptotic behaviour for a bundle-size reduction without explicit measurement and owner approval. When the two genuinely conflict, **runtime performance has priority by default**.

## 15. Measure every meaningful change by composition

"This should be smaller" is not evidence. For meaningful changes record before/after measurements for the relevant compositions, including at least: minimal; minimal `xy`; minimal + optional features; complete; feature-matched non-composed baseline. Where possible record the reason for the delta — module removed, branch removed, wrapper inlined, diagnostic string deleted, import edge removed, optional code stopped leaking into minimal, runtime validation removed. The important question is not only **how many bytes changed** but **which consumers pay them**.

**Four ways a size measurement lies, all of them observed:**

- **Do not add ablations.** Compression deltas do not decompose, and the error has a direction: related changes share tokens, so the parts **understate** the whole. One pass measured its parts at −479 B and the joint change at −502 B on the same composition. Rank with separate ablations if that helps you choose; book only a joint measurement of what actually landed.
- **Say which figure governs, because they disagree in direction.** Minified bytes are not a proxy for shipped bytes. Padding two unreachable lookup-table slots with a repeated existing value measured **8 B worse minified and 7 B better after Brotli** — a repeat is cheaper to the compressor than a novel token. Shipped bytes are compressed bytes; record both wherever they disagree.
- **Check that the instrument can see the change.** A composition that never reaches the affected module reports 0 for any change to it — true, and not evidence. One entry-point row was structurally incapable of observing its own failure vocabulary: thirteen constants, none, or thirty all produced the same number, including a change that regressed it. Before reading a 0, confirm the module is in that composition's graph.
- **Do not price a change by reading a file.** Source characters are counted before the compressor and usually before the bundler. Counting rendered source length overstated every candidate in one sweep by three to eight times and mis-ordered them, mostly by counting doc comments. Ablate, build, compress, then read.

## 16. Prefer deleting machinery over rebasing syntax

The highest-value reductions usually come from removing validation, duplicate state, compatibility, wrappers, runtime indirection, shipped diagnostic payload, unnecessary exports, optional feature leakage, and abstractions existing only for internal neatness. Do those before syntax-level micro-optimization.

**Two entries need calibrating, and the measurement is the reason.** **Diagnostic payload belongs here rather than among the syntax work**: where it was measured, the text class outweighed the whole clean-deletion set — dead members, duplicate state, inert checks and unreachable vocabulary together — by roughly two to one. **Removing an unnecessary export usually buys surface, not bytes**: a tree-shaken export costs zero shipped bytes, and two were measured at exactly zero. Still worth doing (§4), but book it as hygiene. An export a consumer _can_ reach is §7's case.

## 17. Questionable optimizations go into the report

Do not automatically apply a change whose size win depends on making the code materially less obvious. Report it for owner review when it involves deliberate duplication, unusual syntax, removing a meaningful semantic boundary, changing a helpful internal abstraction, a performance trade-off, a public API trade-off, or a very small gain relative to readability cost. Include the measured delta and the trade-off.

## 18. A budget is an instrument, and its slack is its sensitivity

A per-composition budget exists to make a change visible. Read as a target instead, it stops doing that.

- **A deliberately tight row is tight on purpose.** Absorbing a small regression into it by re-basing is the single thing it exists to prevent. Where a row's ceiling was sized against a regression it once suffered, a two-byte move is a finding rather than noise.
- **A row that does not move is a result.** When a change should touch nothing in a composition, that unchanged number is the evidence it behaved. Design at least one control row into every pass and say beforehand what it should do.
- **Re-base after a shrink, never during one.** A pass landing well under budget ends in a re-base; a pass landing over it ends in a decision. Re-basing mid-pass turns the instrument into a record of what happened rather than a check on it.
- **State the re-base trigger before you need it**, and prefer a condition an observer meets — _a row goes negative_, _the drift stops being attributable to a named landed change_ — over a schedule. An absorbed number is a number nobody reads again.

---

# Litmus test

For every suspicious piece of runtime code, ask the gate first:

> **Is this state reachable through correct use of the public contract?**

**If it is not, you are finished** — the code is a deletion candidate and the second question is never asked. Only for a state that survives:

> **What library-owned invariant requires this code to exist at runtime?**

Neither of them is _what bad thing could a consumer theoretically do?_ nor _what would we go on to compute if they did?_

The code is a strong deletion candidate if the answer is any of: "the type system already prevents it"; "only an integrator ignoring the documented contract can get here, and the library is left holding nothing"; "the consumer would only break their own code"; "the failure it describes cannot actually happen"; "this was added for a nicer error"; "this string is the only thing telling two same-coded failures apart"; "this mirrors state we already have"; "this supports an API we deleted"; "this only makes the implementation more generic".

**One answer looks like a rebuttal and is not one**: _"an integrator could only reach this by ignoring the contract — but the library would then keep operating on state it owns, or hand a third party a value its own contract calls well-formed."_ The first half has already ended the matter. Clause (b) speaks only about input the contract **admits**. If you want that check, the argument to make is that the input is admitted — and that argument is made in the contract, not here.

# Order of attack

1. remove nannying and redundant runtime validation — **reachability is a gate: unreachable through correct use, stop and delete; ownership is asked only of what survives** (§1.1);
2. remove compatibility and dead public/runtime vocabulary;
3. reduce shipped diagnostic payload to identities, and gate what only your own defect can produce;
4. remove duplicate state and unnecessary carriers;
5. inspect single-use abstractions and wrappers;
6. inspect runtime genericity and indirection;
7. inspect module boundaries and optional-feature leakage;
8. inspect copies, intermediate objects and repeated shape conversions;
9. only then consider local syntax-level simplification;
10. measure every meaningful change by composition;
11. re-base budgets only after the remaining size is understood and accepted.

**Step 3 is placed rather than appended.** Diagnostic payload reads like syntax and behaves like machinery: deleting an explanation changes nothing a program can observe, which is what puts it above step 9 and beside step 1.

# Definition of success

A successful size pass leaves the library:

- behaviorally identical;
- **no slower in latency-sensitive runtime paths unless an explicit measured trade-off was accepted**;
- easier or no harder to understand;
- at least as type-safe;
- **defensive only where the state is reachable through correct use of the contract _and_ the library would otherwise corrupt state it owns or publish a malformed value under its own name** — both, never either;
- with every shipped diagnostic attributable to something outside the library, and every gated one to something inside it;
- no more coupled across optional features;
- smaller in the compositions that actually pay for the removed machinery;
- with every remaining significant byte attributable to an accepted runtime responsibility.

The target is not the smallest code we can write. The target is the **smallest runtime the contract actually requires**.

---

# Change record

What this document used to say, and what changed it, so a measurement already made is not commissioned twice. Evidence lives in the package records. Section numbers are permanent, so every entry names one.

| Date | Section | Change |
| --- | --- | --- |
| 2026-08-24 | §1.3 | **Withdrawn:** _development-only diagnostics are preferable when they can be removed from production output._ False whenever the trigger is outside the library. Replaced by gating on **provenance** rather than audience |
| 2026-08-24 | §4 | **Withdrawn:** _avoid exported numeric phase/state/failure constants **unless** they are part of the supported consumer contract._ The rule was argued on bundle size and the premise was measured false; the `unless` clause becomes the rule, now resting on surface, permanence and install weight. Record: [`failure-vocabulary-cost-claude.md`](packages/drag2/.plan/reviews/phase-23/failure-vocabulary-cost-claude.md) |
| 2026-08-24 | §16 | **Added:** diagnostic payload as a removal class in its own right, ranked ahead of syntax work |
| 2026-08-25 | §1.1 | **Withdrawn:** _runtime validation is justified only when it protects a library-owned invariant that cannot reasonably be expressed or enforced elsewhere._ Ownership is the right second question and the wrong first one. Replaced by **reachability**, and then by reachability as a **gate**, because merely ordering the two lets ownership rescue a check reachability already rejected |
| 2026-08-25 | §1.2 | **Added:** a constraint the compiler cannot state is still a constraint, and writing it down is what puts the input outside the contract |
| 2026-08-25 | §13 | **Clarified:** deleting a nannying check is not a failure-semantics change; a **documented** no-op is the exception and stays |
| 2026-08-26 | §18 | **Removed** the live byte figures from the worked example; the rule they illustrated is unchanged |
| 2026-08-26 | — | Amendment narrative, dates and struck wording moved into this section; section numbers declared permanent |
| 2026-08-29 | — | `CODE_OF_SIZE.md` and `.agents/docs/code-style.md` merged here as Part II and Part I. Section numbers carried over unchanged; §1.1's worked audit narratives dropped to the records that already hold them |