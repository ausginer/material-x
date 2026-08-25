# Code of Size

This document defines how we reduce bundle size.

The goal is **not code golf**. The goal is to remove runtime machinery the library does not need, move guarantees to compile time where possible, preserve tree-shaking, and keep the public API and lifecycle semantics clear.

A size pass must make the implementation smaller **without making the contract worse**.

**Some rules here have measurements behind them and some are priors, and the difference matters when they collide.** Where a rule was tested, this document says so and points at the record; where a measurement has falsified an earlier rule, the old wording is struck rather than deleted, because other documents cite it. Sections 0, 1.1, 1.3, 4, 15 and 18 carry evidence from one package's Phase 23 finalization work. A rule with no measurement beside it is a default to be argued with, not a finding. **§1.1's reachability gate, added 2026-08-25 and made decisive the same day, is one of those defaults**: it is a design principle about what a library owes, and the audits cited beneath it are worked examples of applying it rather than evidence for it. It is also the one rule here that can **reopen** a settled outcome without any new measurement, so where it does, this document says which outcome and leaves the earlier reasoning standing.

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

**A byte figure cannot answer a runtime question, and it will look like it did.** Two pieces of code can be neighbours in a size report and nothing alike in a profile. Measured in one package: a re-entry latch on a per-sample path cost **~1 ns** — two predictable branches and an assignment, 0.04 % of a pointer sample, a cost that does not exist — while a shape assertion sitting cold at once per operation cost **~0.5 µs per call and allocated one descriptor object per key**, scaling with the data's width. A size ablation ranks those two together and tells you nothing about either. If a candidate's real cost is _when it runs_ or _what it allocates_, measure when it runs and what it allocates.

For this library, bundle size matters because the code ships to every consumer; runtime performance matters more because interaction code runs under latency-sensitive input.

---

## 1. Delete runtime policy before compressing code

### 1.1 No nannying — trust the integrator

Do not protect consumers from mistakes that are already their responsibility.

**Correctness has a domain, and the domain is correct use.** The library must be correct under:

- valid use of its public API;
- anything the **end user** does — input, timing, ordering, abandonment;
- anything the **platform** does — reentrancy, event ordering, scroll, resize, visibility, deferred work;
- any state **the library itself** creates, owns, or hands out and later reads back.

None of that is negotiable and no size pass touches it (§13). **Outside it, the library owes nothing at runtime.** It does not need machinery to protect an integrator from values or usage that violate its published contract. A good API is convenient and clearly specified; it is not a second type-and-semantics checker running beside the first one, in every consumer's bundle, forever.

**The contract does not have to be unconstructible in JavaScript.** It may be stated by TypeScript, by documentation, or by an obvious semantic precondition — _a duration is finite_, _`resolve` returns a position in the list you were handed_, _do not call this after you destroyed it_. An integrator who reaches an invalid state through `any`, a cast, a `@ts-expect-error` or plain JavaScript has **left** the contract; they have not found a hole in it. Demanding that a precondition be compiler-enforceable before it counts as a contract term is precisely how a library ends up re-checking its own types at runtime.

**So reachability is a gate, not the first of two questions.**

1. **Is this state reachable through correct use of the public contract?** If it is **not — stop.** The library owes no runtime machinery for it, and nothing considered later reopens the question.
2. **Only for a state that survives (1):** does a library-owned invariant require a runtime check here?

~~Runtime validation is justified only when it protects a library-owned invariant that cannot reasonably be expressed or enforced elsewhere.~~ **Sharpened 2026-08-25.** That sentence made _bad input could make our internals incoherent_ a sufficient justification, and it is not one: the internals are incoherent **because** something invalid was fed to them, and the library never owed correctness under invalid input. Ownership is the right second question and the wrong first one — asked first, it justifies almost any check, because almost any bad value eventually touches something the library owns.

**Made decisive 2026-08-25, because the first draft of the ordering was not.** It wrote the two as _ordered questions_ and then let ownership rescue a check that had already failed (1) — the struck sentence returning one step later, in better clothes. That failure mode is worth naming because it is a comfortable one: **every check has a story about what the library would go on to compute without it**, and under a merely-ordered reading that story is always available. **What happens after invalid input is not a justification for refusing the input.** An integrator who violates the contract may get a natural failure, silent nonsense, or plainly undefined behaviour — and the library subsequently computing or publishing nonsense is **part of that undefined behaviour**, not a separate harm that converts the misuse into the library's runtime responsibility.

**(a) is the gate; (b) is the only justification.** They are not two ways to earn a check:

- **(a) the invalid state can arise despite correct integration** — the platform did it, a race did it, a reentrant callback did it, the end user did it, or the library minted the value itself and must read it back later. This is test (1) in the form a check has to satisfy. **Fail it and there is nothing further to argue**, whatever (b) would have said.
- **(b) with (a) satisfied**, the library would itself violate an invariant it owns — it would corrupt its own state and keep operating on it, or publish under its own name a value its own contract promises is well-formed.

Clause (b) is what stops the rule collapsing into _delete every check_ **across the states the contract actually admits**, and that is where its work is — on reachable states, and especially on surfaces with more than two parties. **It has no force over a state (a) has already excluded.**

**The gate moves the argument out of the runtime and into the contract, which is the point rather than a side effect.** A check you want to keep is a claim that its state is reachable under correct use, so make the claim where it can be examined — in the type, in the documentation, in the stated precondition — instead of in a branch. The consequence runs both ways and is worth saying plainly: **you cannot both accept an input in your contract and refuse it at runtime as _not our problem_.** Either the precondition is published, and the input is outside the contract, and the library owes nothing however badly it would behave — or it is not published, the input is valid, and (b) is a live question about it.

**Which is exactly why the gate is not a rubber stamp.** A precondition invented at deletion time to disqualify an inconvenient input is not a contract term; it is the deletion wearing one. A term counts when an integrator can **meet** it and can **find** it: expressed by the type, written where the integrator reads, or genuinely obvious from the operation's own semantics — _a duration is finite_, _do not call this after you destroyed it_. Where that takes an argument, the argument belongs in the record beside the deletion, and _we could declare this a precondition_ is not the same claim as _it is one_. **Deciding what the contract says is the expensive half of applying this rule, and it is a contract decision with a contract's consequences — not a size finding.**

**Past the gate, "let it fail naturally" is still not automatic.** For a state that _is_ reachable under correct integration, that phrase carries two assumptions, and both are checkable.

**It assumes the failure lands on the party who caused it.** With one integrator and one library it usually does, and the ordinary lifecycle/error path is the right answer. It stops being true the moment the library re-publishes someone else's value to a **third** party under its own name — a plugin's output folded into an application callback, an authoring API's return value handed on as library-computed data. The party at fault is then not the party who is harmed, and _naturally_ means silent corruption in someone else's data with the library's name on it. **That is what (b) is for, and it is not a way past (a):** a check on an authoring API's return value has to establish that a conforming author can produce the state, exactly like any other check. Multi-party structure decides _who is harmed_; it never decides _whether the input was admitted_.

**It also assumes there is a failure at all**, which is the quieter half. _Naturally_ has to mean the library's existing lifecycle or error path actually runs. Where it does, the integrator meets their own mistake at their own site — a non-function throws where it is called, a `NaN` threshold arms a press that never activates, a bad slot surfaces at the seam that reads it. Where it does not, the code **succeeds and does the wrong thing**: an unbounded animation duration hangs a gate that nothing can classify, because classification needs something to happen. **So run the counterfactual to the end and ask what the library is left _doing_, not only what it stops throwing** — and then ask (a) about it, because a silent wrong answer to input the contract never accepted is undefined behaviour, not a finding.

**Silence promotes nothing on its own.** One audit deleted a check whose absence leaves a third-party author with a listener that binds and never fires — invisible, and still the author's, because nothing outside their own inert feature is left holding anything wrong. Quietness is a property of the symptom; (a) and (b) are about the input and the owner.

In particular:

- do not validate inputs merely to provide nicer error messages;
- do not validate values already constrained by the type system;
- do not reject harmless object shapes just because the implementation prefers a narrower shape;
- do not normalize consumer data defensively unless the library must take ownership of it;
- do not add checks for unsupported use that would naturally fail through the library's existing lifecycle/error path.

**Ask whose invariant, not whose mistake — once reachability has not already answered you.** The two questions come apart the moment a package publishes an authoring surface. _Who caused this_ selects an audience; _whose state is corrupted_ selects a rule. A check that stops a third party from silently overwriting the library's own state is the library's, however plainly the third party caused it — and a check that costs that third party only their own field is theirs, however severe the message makes it sound. One audit split a six-check validator on exactly this line and kept three: the three whose violation overwrote the library's own record, mutated its prototype, or retained a reference past a reset. The four it deleted cost the library nothing, in any build, for any author.

**Under the gate that split is the (b) half of the answer and not the whole of it.** The audit asked _whose state breaks_ and answered it correctly for all six. What it did not ask — because the ordering was not yet written down — is (a): whether a **conforming** author can produce any of the three states it kept. Its own observation that none of the three is reachable by an author who honours the contract reads, under this section as it now stands, as a **failed gate rather than a supporting detail**, so those three keeps are **re-put rather than confirmed**. That is the rule doing its work on the record that produced it, and the record is left standing rather than quietly rewritten, because the reasoning was sound under the rule it was decided under. The four deletions are untouched: they fail (a) and (b) alike.

**Verify the failure before you argue about it.** A check's justification is a claim about what happens without it, and that claim is executable: construct the shape the check rejects, let the code take it, and look at what the library actually ends up holding. The same audit found one check describing a failure that **cannot occur at all** — it rejected a non-writable key because the composed record "would throw on write", while the composition used `[[Set]]` on a fresh extensible object and produced an ordinary writable property. No amount of reasoning about ownership finds that; only running it does. Do this before deleting a check _and_ before defending one — the counterfactual is as likely to be worse than recorded as it is to be absent.

**What the sharpening changed, and what the decisive form changed again.** The first, merely-ordered draft reversed nothing: every audit outcome cited in this section survived it, which is precisely what made it feel like a sharper statement of the same rule. **The decisive form does not have that property, and that difference is the finding.**

- Checks deleted because they cost an author only their own feature stay deleted, and are now settled at (a) with ownership never reached.
- Checks kept because the library owns what would break are **not** thereby settled. Each owes (a) an answer on the record: can a conforming integrator — or a conforming third-party author — produce the state at all? Where the answer is no, the check is a deletion candidate however clearly the library owned the wreckage.
- **The class this reopens is the one the struck sentence protected**: a check on input the published contract already forbids, kept because the library would otherwise go on to compute or publish something malformed. Under the ordered draft that was clause (b). Under the gate it never reaches clause (b), and the question becomes a **contract** question — _is this input actually outside the published contract, and where does it say so?_ — which an audit answers by reading the contract, not by preferring an outcome.

**A worked question, left deliberately open, because it is the shape this rule will be tested on.** A collection API takes an ordered array of elements and publishes a `{ from, to }` pair its consumer applies to that same array. Element identity is the positional key, so a duplicated element puts the two index spaces one apart and the published pair moves the consumer's element to the wrong position — silently, with no throw and no cancellation. Under the struck sentence that is an easy keep. Under the gate, every word of that harm is downstream of one unanswered question: **does the public contract say the array's elements are distinct?**

- **If it does** — in the type, in the documentation, or as an obvious semantic precondition of an identity-keyed list — then a duplicated array is outside the contract, the gate closes, and the silent wrong position is undefined behaviour the integrator bought. This section owes the check nothing, and any case for keeping it is a different case, made elsewhere and on its own terms.
- **If it does not** — if the published surface accepts any array of elements and says nothing about identity — then duplicates are **valid input**, the gate opens, and (b) applies squarely: the library computes a position in one index space and publishes it under its own name as though it were in another.

**This document does not choose between the two readings**, because the choice is a claim about what one particular contract says and has to be made by reading it. What the rule does is force the question into that order, and force it to be answered before anyone mentions a byte count.

**This section decides whether a check exists; §1.3 decides whether its message ships.** They are different questions with different answers and they are routinely conflated. A check can survive here on clause (b) — the library owns what would break — and still be **P1** under §1.3, because the person who can trigger it is a third-party author outside the library. _Whose state breaks_ selects the check; _who can reach the condition_ selects the payload. Decide them in that order and neither answer contaminates the other.

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

**A constraint the compiler cannot state is still a constraint** (2026-08-25, with §1.1). Prefer types where types reach — but the absence of a type-level expression is not an argument for a runtime one. _No duplicates in this array_, _finite_, _still open_, _one of the elements I gave you_ are contract terms whether or not TypeScript can spell them. Write them down where the integrator will meet them — and note that under §1.1 writing one down is what puts the input **outside** the contract, so the statement is the alternative to the runtime check rather than a companion to it. Whether anything has to run is then §1.1's gate to answer, not this section's. The compiler is the cheapest place to put a rule, not the only legitimate one.

### 1.3 Do not ship verbose diagnostics by default

Long diagnostic strings are runtime payload, and they are easy to under-rate: in one measured package the diagnostic text was the **single largest attributable class of shipped bytes**, larger than any optional feature the package had.

**Classification is contract; prose is not.** If a failure is already classified by a stable error code or failure category, a large explanatory string needs a strong justification — and _the code alone does not say which failure it was_ is not one. That is a fault in the classification, not a licence for the prose. When a sentence is the only thing telling several distinct faults apart that share one code, the published vocabulary is doing less work than the design claims and the sentence is quietly holding the contract together. Fix the vocabulary, or accept the coarseness deliberately; do not let English carry a discrimination the API refuses to make.

**A shipped message is an identity, not a narrative.** It names the fault and interpolates the offending value. Explanation, remedy, reassurance and restatement of the rule belong in the source and in the contract — and where the build ships source maps carrying `sourcesContent`, they are _already_ in the tarball beside the site, in the form a maintainer reads, in a file a bundling consumer never fetches.

~~Development-only diagnostics are preferable when they can be removed from production output.~~ **Corrected 2026-08-24. That is false whenever the trigger is outside the library**, and it stays false however cheap the gate looks. Gate by **provenance** — by what must be true for the diagnostic to fire, never by who happens to receive it:

- **only this package's own defect can produce it** → gate it. Nobody outside can reach the condition, so nobody outside loses anything;
- **someone outside can trigger it** — a consumer, a third-party author of a _published_ authoring API, or the environment → **ship it**. A gate strips it from precisely the build the person who needs it installs, and hands them an empty stub they cannot fill.

The failure mode here is slow and quiet. A package that published its authoring API after writing its dev-gating rule kept the gate for three revisions: the justification — _authoring is not on the public surface_ — had expired at a named release and nobody noticed until an unrelated bundle sweep tripped over it.

**And a gate is a boundary decision, not a size one.** Giving a module or a tier a build-time flag it does not already have changes what that tier depends on and what its authors have to know. Decide that on the boundary; a rule that lets bytes buy a new dependency edge will eventually buy one that matters.

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

## 4. Public runtime vocabulary is governed by surface and permanence

Do not export numbered implementation constants merely to give internal values names.

Public runtime values should exist only when consumers genuinely need to use them.

### The size premise was measured and is false

**Corrected 2026-08-24.** This section used to argue the rule on bundle size. It does not hold, and the section's own closing line was the whole rule all along.

Thirteen public numeric failure-stage constants, exported from a package root, cost a bundling consumer **0 minified, 0 Brotli, 0 modules**. Byte-identical artifacts across fourteen compositions _and_ across a purpose-built fixture that names all thirteen reachably — and identical again when that fixture is rewritten with bare numeric literals instead of the names. A bundler that folds cross-module constants inlines every small-integer `const` at its use site and drops the module: **the symbolic name _is_ the number by the time the minifier finishes.** Evidence: [`packages/drag2/.plan/reviews/phase-23/failure-vocabulary-cost-claude.md`](packages/drag2/.plan/reviews/phase-23/failure-vocabulary-cost-claude.md).

So the first bullet this section used to carry — ~~_avoid exported numeric phase/state/failure constants unless they are part of the supported consumer contract_~~ — keeps only the clause after **unless**. The prohibition is withdrawn; the condition is the rule.

### Three costs survive, and none of them is the bundle

**(a) Surface.** Every exported value is one more thing a reader of the API may believe they have to understand before writing anything. That cost is paid in documentation, in review, and in the questions a consumer asks; it is invisible to every instrument in this document and it does not shrink when the bytes do.

**(b) Permanence — and this is the sharp one.** _The same inlining that makes the export free makes the value permanent._ A folded constant is copied into consumers' compiled output, so repointing it later changes nothing in their build and everything in yours: their already-compiled `2` keeps arriving, now meaning something else. **An exported number is a wire value from the day it ships, whether or not it was designed as one** — and unpublishing the name does not retire the number. The measurement did not remove the argument for a small public vocabulary. It replaced a negotiable argument with one you cannot negotiate with.

**(c) Install weight, and consumers who do not bundle.** The zero above is a _bundled_ zero. The same publication cost several thousand raw bytes in the tarball and about a kilobyte of Brotli across one entry's fetch closure — which a native-ESM or CDN consumer fetches and every consumer downloads at install. Most of that was the **doc comment about** the constants rather than the constants, which is its own lesson: when a vocabulary looks expensive, check whether you are pricing the values or the prose about them.

### The test

> Would a consumer, or a third-party author the package supports, have to **write this value** to do something the API supports?

If yes, publish it and accept that it is frozen from that day. If no, keep it internal — not to save bytes, which it will not, but because an exported value is a promise you cannot withdraw.

Still true, and now for surface reasons rather than size ones:

- prefer local literals or non-exported constants for implementation-only states;
- do not preserve an export merely because tests or internal code currently use its symbolic name;
- write internal discriminants so a minifier can inline or fold them — the zero above is exactly what that buys.

**One scenario is unmeasured, and it is the one where the zero fails.** A toolchain that preserves ESM without concatenating, or that bundles with module wrappers, pays the import binding and the module. If a package's supported consumers include one, the measurement above does not describe them, and the size question reopens on its own terms.

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

**This fixes the contract, and behaviour outside the contract is not part of it** (2026-08-25, with §1.1). Deleting a nannying check changes what happens on input the contract already forbids, and that is not a failure-semantics change under this section. The exception is the case where the contract **fixed** the outcome — a documented _this call is ignored_ is a promise, and the check and the discard that implement it are contract. So say which of the two you have before deleting: a specified no-op stays; an incidental _we happen to throw here_ was never promised to anyone. If you cannot tell which it is, you have found a contract gap, and this section's real instruction applies — stop and report it.

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

### Four ways a size measurement lies, all of them observed

**Do not add ablations.** Compression deltas do not decompose. Two changes measured separately and then summed do not predict the pair measured together, and the error has a direction: related changes share tokens, so the parts **understate** the whole. One decision's recorded total and its recorded halves never reconciled for exactly this reason; a later pass measured its parts at −479 B and the joint change at −502 B on the same composition, with the same sign on every row. **Rank with separate ablations if that helps you choose. Book only a joint measurement of what actually landed.**

**Say which figure governs, because they disagree in direction.** Minified bytes are not a proxy for shipped bytes. Padding two unreachable slots of a lookup table with a repeated existing value measured **8 B worse minified and 7 B better after Brotli** — a repeat is cheaper to the compressor than a novel token. Shipped bytes are compressed bytes; read minified figures as a second opinion, and record both wherever they disagree.

**Check that the instrument can see the change.** A composition that never reaches the affected module reports 0 for any change to it — which is true, and is not evidence. One entry-point row in the package above is structurally incapable of observing its own failure vocabulary: publishing thirteen constants, none, or thirty all produce the same number, including a change that regressed it. Before reading a 0, confirm the module is in that composition's graph.

**Do not price a change by reading a file.** Source characters and artifact characters are counted before the compressor and usually before the bundler. Counting rendered source length overstated every candidate in one sweep by three to eight times and mis-ordered them, mostly because it counted doc comments; an entry file separately made one decision look like 11 % of itself while a consumer's bundler paid nothing for it. Ablate, build, compress, then read.

---

## 16. Prefer deleting machinery over rebasing syntax

The highest-value size reductions usually come from removing:

- validation;
- duplicate state;
- compatibility;
- wrappers;
- runtime indirection;
- shipped diagnostic payload;
- unnecessary exports;
- optional feature leakage;
- abstractions that exist only for internal neatness.

Do those before syntax-level micro-optimization.

**Two entries on that list need calibrating, and the measurement is the reason.**

**Diagnostic payload was added here 2026-08-24** and belongs here rather than among the syntax work: in the package that measured it, the text class outweighed the whole clean-deletion set — dead members, duplicate state, inert checks and unreachable vocabulary, all of it together — by roughly two to one. The instinct that puts validation first is right about _what kind of thing to look for_ and was wrong about _where the bytes were_.

**Removing an unnecessary export usually buys surface, not bytes.** A tree-shaken export costs zero shipped bytes; two of them were measured at exactly zero. That is still worth doing — see §4 — but book it as hygiene and do not expect it in a budget row. An export that a consumer _can_ reach is a different case and is §7's.

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

## 18. A budget is an instrument, and its slack is its sensitivity

A per-composition budget exists to make a change visible. Once it is read as a target instead, it stops doing that.

- **A deliberately tight row is tight on purpose.** Absorbing a small regression into it by re-basing is the single thing it exists to prevent. One package carries a 121 B vocabulary root with 29 B of slack, sized that way because it had once regressed to 190 B; a 2 B move on that row is a finding, not noise.
- **A row that does not move is a result.** When a change is supposed to touch nothing in a given composition, that composition's unchanged number is the evidence that it behaved. Design at least one control row into every pass and say beforehand what it should do.
- **Re-base after a shrink, never during one.** A pass that lands well under budget ends in a re-base; a pass that lands over it ends in a decision. Re-basing mid-pass turns the instrument into a record of what happened rather than a check on it.
- **State the re-base trigger before you need it**, and prefer a condition an observer meets — _a row goes negative_, _the drift stops being attributable to a named landed change_ — over a schedule. An absorbed number is a number nobody reads again.

---

# Litmus test

For every suspicious piece of runtime code, ask the gate first:

> **Is this state reachable through correct use of the public contract?**

**If it is not, you are finished** — the code is a deletion candidate and the second question is never asked. Only for a state that survives the gate:

> **What library-owned invariant requires this code to exist at runtime?**

Neither of them is:

> What bad thing could a consumer theoretically do?

nor:

> What would we go on to compute if they did?

If the answer is:

- "the type system already prevents it",
- "only an integrator ignoring the documented contract can get here, and the library is left holding nothing",
- "the consumer would only break their own code",
- "the failure it describes cannot actually happen",
- "this was added for a nicer error",
- "this string is the only thing telling two same-coded failures apart",
- "this mirrors state we already have",
- "this supports an API we deleted",
- "this only makes the implementation more generic",

then the code is a strong candidate for deletion.

**One answer looks like a rebuttal to that list and is not one**: _"an integrator could only reach this by ignoring the contract — but the library would then keep operating on state it owns, or hand a third party a value its own contract calls well-formed."_ The first half of that sentence has already ended the matter. Clause (b) speaks only about input the contract **admits**; it does not license a check against input the contract excludes, however bad the downstream behaviour would be. If you want that check, the argument to make is that the input is admitted — and it is an argument about the contract, made in the contract, not here.

---

# Order of attack

A size pass should generally proceed in this order:

1. remove nannying and redundant runtime validation — **reachability is a gate: unreachable through correct use, stop and delete; ownership is asked only of what survives** (§1.1);
2. remove compatibility and dead public/runtime vocabulary;
3. reduce shipped diagnostic payload to identities, and gate what only your own defect can produce;
4. remove duplicate state and unnecessary carriers;
5. inspect single-use abstractions and wrappers;
6. inspect runtime genericity and indirection;
7. inspect module boundaries and optional-feature leakage;
8. inspect copies, intermediate objects, and repeated shape conversions;
9. only then consider local syntax-level simplification;
10. measure every meaningful change by composition;
11. re-base budgets only after the remaining size is understood and accepted.

**Step 3 is new, and it is placed rather than appended.** Diagnostic payload reads like syntax and behaves like machinery: deleting an explanation changes nothing a program can observe, which is what puts it above step 9 and beside step 1. The package that measured it found the text class larger than any of its optional features.

---

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

The target is not the smallest code we can write.

The target is the **smallest runtime the contract actually requires**.