# `@ydinjs/signals` — design draft

**Author:** the architect, on `repo/signals-design-1` from `origin/main` at `7dbef17bb`, 2026-11-22. **Input:** the owner's sketch, [`ydinjs-signals-brainstorm.md`](ydinjs-signals-brainstorm.md), added to this branch as written (`oxfmt` added semicolons and parentheses to its two code samples and nothing else), and the coordinator's four questions (issue #111). **Status:** a draft for the owner. It adopts no decision and claims no record identifier. The labels Q1 to Q8 and P1 to P10 are local to this document. Section 6 lists the questions that need the owner, each with a recommendation.

## 0. Summary

- **The model holds for `computed`.** A declared input list with positional accessors gives a bounded, inspectable answer to _"what could this depend on?"_ before the first run, and records _"what did it read?"_ without an ambient tracking context. That is new. Solid's `on()` already gives a declared trigger list with an untracked body, but it doesn't narrow to the edges a run used, and it doesn't expose the declaration to a tool.
- **The weak points are effects, collections and the cost claim, not the core idea.** Effect trigger semantics decide whether an effect can silently stop running (§2.4). A collection whose members change has no declaration in the sketch's model (§2.6). The claim that the model is cheaper than Preact's read path is unmeasured, and Preact's read is already constant time in the common case (§2.8). The case for the package is inspectability, and the draft argues it on that ground only.
- **A narrow core is `signal`, `computed`, `effect` and `batch`,** plus node names and the retained declaration as the seam for inspection. The DevTools panel, the collector, the inspection interface, the bridges and dynamic collections stay out (§3).
- **`EventEmitter` should stay in core, and core should not depend on the new package.** Its consumers forward attribute changes, which is an event stream with old and new values, not derived state. A reactive runtime would add bytes to every button-group row and allocations to every grouped button for no capability those consumers need. Core's `useContext` already carries any value, so a provider can put a signal in its context later without core knowing (§4).
- **The package fits the existing rules without new ones:** its own `packages/signals/.plan/` scope under `repo:RD-1`, `baseline newly available` before 1.0.0 under `repo:RD-27` property 3, the one release workflow, and size rows from its first commit (§5).
- **Next step, if the owner takes the direction:** an architecture prototype of the narrow core in an isolated worktree, measured against `@preact/signals-core` and `alien-signals` and run against a propagation test suite, before any contract is written (§7).

## 1. What the sketch proposes, and for whom

The sketch's own problem statement is Readymag's: a Solid effect calls a helper several calls deep and subscribes to whatever that helper reads, so nobody can say what can trigger the effect or what triggered it in a given update. Its answer has three parts:

1. **A declared input list.** `computed([a, b, c], (a, b, c) => …)` names every possible direct dependency.
2. **Positional accessors.** The callback receives one accessor per input. Calling it reads the value and marks that edge as used in this run. After the run, the runtime drops subscriptions on edges the run didn't use.
3. **An untracked read.** `x.get()` reads the current value and subscribes to nothing.

Around it the sketch places a DevTools panel, bridges to Solid, Preact and Vue, and an inspection interface.

**Two consumers pull this design in different directions.** Readymag needs an application-scale runtime that can coexist with Solid and be inspected. `@ydinjs/core` needs a 198-byte event channel between a group and its buttons. A single package can serve both only if its smallest composition is small, and §4 concludes that core shouldn't be a consumer now. The draft designs for Readymag and keeps core's case as a measurement question.

## 2. The model, examined

### 2.1 What the model gets right

- **The possible-dependency set is data.** The node holds its declared sources, which it needs anyway to build its accessors, so a tool can show every possible edge, both branches included, before the first run and without evaluating anything. Ambient tracking can't show this, because a dependency exists only once a run reads it.
- **No ambient context.** Each accessor knows its source and its consumer, so a read needs no global "current observer". That removes the class of bugs where a helper subscribes the wrong computation, which is the sketch's motivating problem.
- **The untracked read is the default for method reads.** Every `get()` is untracked, and the only tracked read is an accessor call. So one rule tells a reader what subscribes, without `untrack()` wrappers.
- **Ordinary control flow.** Branches, loops and early returns narrow the used edges without library operators. The sketch rightly rejected `if()` and `firstDefined` nodes for this.

### 2.2 What explicitness buys over Solid's `on()`

Solid 1.x already has `on(deps, fn)`. It tracks the listed accessors and runs `fn` untracked, so in Solid an effect written with `on` has a declared trigger list today, and a helper called from `fn` subscribes nothing. That covers _"what can trigger this effect"_ for effects that use it.

What `on()` doesn't do, and the sketch does:

- **Narrowing.** `on()` subscribes to every listed dependency on every run. The sketch subscribes to the subset a run read.
- **A declaration a tool can read.** `on()` returns a closure. Solid's graph learns its dependencies only by running it.
- **One rule for everything.** `on()` is opt-in per computation. In the sketch, every computation declares its inputs.

So the package's value over a discipline in Solid is narrowing plus inspection. Q2 asks whether that difference is worth a runtime before a Solid-only inspector has been tried. The sketch already suggests that inspector as useful on its own.

### 2.3 Positional binding and duplication

- **Reordering hazard.** The input list and the parameter list are bound by position. Swapping two entries of the same type, say two `Signal<boolean>`, type-checks and silently swaps their meanings. React's dependency arrays don't have this hazard, because they aren't bound to parameters. Solid's `on()` with an array has the same one.
- **Each input is named twice,** once in the list and once as a parameter. This is the price of explicitness, and it is acceptable.
- **The alternative is a record:** `computed({ show, archived }, ({ show, archived }) => …)`. Names bind instead of positions, so reordering is safe, and the keys label the edges in an inspector for free. Destructuring an object of accessor functions reads nothing, so the sketch's objection to getter objects doesn't apply to it. The cost is key iteration at construction, which is negligible.
- **Recommendation:** positional, as the sketch has it. Inputs are few in practice, the tuple types are exact, and the nodes carry names for the inspector anyway. Q8 asks the owner, at low priority.

### 2.4 Effect trigger semantics

This is the sketch's first open question, and the choice decides a failure mode.

- **(a) An effect narrows like a computed.** Only the edges its last run read can trigger it. One mechanism for both kinds of node. But an effect that declares an input only as a trigger and never calls its accessor, such as a refresh tick, runs once and never again, with no error. The declaration then lies about what can trigger the effect.
- **(b) Every declared input triggers an effect.** The declaration is the trigger list, exactly, as in Solid's `on()`. An effect with a guard, `if (!enabled()) return`, runs and returns early when another input changes. That costs a call, and nothing fails silently. Effects need no edge marking, so they are smaller and faster. A branch that is expensive to re-run belongs in a computed upstream, whose equality check stops the propagation.

**Recommendation: (b).** Computeds derive values and narrow; effects act and are triggered by their declaration. The package exists to make _"what can trigger this effect"_ answerable by reading code, and (b) answers it exactly where (a) answers _"a subset, depending on the last run"_. One consequence: under (b) each declared computed input of an observed effect is evaluated on every propagation to learn whether it changed, as it is in any push–pull runtime. Q3.

### 2.5 Untracked reads, escaped accessors and `await`

- **A `get()` inside a computed makes its cached value depend on state it doesn't track.** The value stays stale until a tracked input changes. In an effect this is the intended "sample at run time". In a computed it breaks the rule that a computed is a function of its inputs. Recommendation: allow it and document it, and don't guard it at runtime (`CONTRIBUTING.md` §1.1). An inspector can show sampled reads only if `get()` reports to it while a node runs, which needs a "current node" in the development build only (§3).
- **A branch decided by untracked state can leave a needed edge unsubscribed.** If a computed reads `mode.get()` and then calls `a()` or `b()`, a change of `mode` doesn't rerun it, and the other edge stays inactive. This is the same hazard as `untrack` anywhere. It needs a sentence in the documentation and nothing in the runtime.
- **An accessor called outside its consumer's run** — stored and called later, called from a timer or called after an `await` — should read like `get()`: the current value, untracked, with no edge marked. It costs one check of a flag the consumer sets for its run. The alternatives are worse. Throwing is a runtime guard against a usage error. Marking the edge for the next run would subscribe from an evaluation that has ended, after its edges were reconciled.
- **Reads after `await` stay untracked,** as in Solid and Preact. The positional model could track them, because the accessor knows its consumer, but that would need async computeds with a defined staleness model. They stay out of the core (§3).

### 2.6 Dynamic collections

The declared tuple is fixed when the node is built. A collection whose members change has no place in it. Three answers:

- **(i) A keyed mapping primitive,** like Solid's `mapArray`: one node per member, each with a fixed declaration, created and disposed as keys come and go. It keeps the invariant that a node's possible edges are fixed at construction. It doesn't cover the sketch's scan for the first matching row, because the scan's inputs are the per-member nodes, and their number changes.
- **(ii) A declared family.** The node declares the collection signal, whose value is a list of member signals, and the callback receives a way to read a member that marks an edge within that family. The inspector shows _"could depend on any member of `items`"_. This covers the scan, and the possible-edge set is still bounded by a declaration, but edges are created at runtime and the bookkeeping grows.
- **(iii) Rebuild the node** when the collection's length or identity changes. Simple, and it disposes and recreates subscriptions on every structural change.

**Recommendation:** in the narrow core a node's declaration is fixed, and the documentation says so. (i) is the first extension, because it is a composition of nodes that already exist. (ii) waits for a real Readymag case, because its shape depends on whether members are signals, records of signals or plain values in one signal. Q4.

### 2.7 Propagation: glitch-free, lazy, no leak

Declared edges change nothing about the propagation algorithm. The runtime still needs the familiar push–pull scheme: writes mark consumers along active edges as dirty, or as possibly dirty when the change is indirect, computeds recompute on read, and effects run after the batch. Section 2.10 states the properties as requirements rather than an algorithm. Two interactions with the sketch's model are specific:

- **Only active edges propagate.** A write to a declared but unused input reaches nobody. That is the point of narrowing, and it needs no extra work.
- **An unobserved computed must hold no subscription,** or every computed ever read stays reachable from its sources. With accessors that close over `(source, consumer)`, the source has to link the consumer only while the consumer is observed. The accessor's reference to its source is harmless: it points from consumer to source.

### 2.8 Allocation and the cost claim

- **Accessors and edges can be created once per node,** at construction, and reused for every run. The sketch's worry about allocating accessors for a large input array is then a memory cost proportional to the declaration, paid once. It is not a cost per run.
- **The used-edge mark needs no clearing** if it is a run counter: an edge is used in this run when its mark equals the consumer's run number. The active subscriptions can be an intrusive linked list of the preallocated edge objects. Then a run that reads the same edges as the previous run allocates nothing (P8).
- **A large declaration that is usually read sparsely is a collection in disguise,** and belongs to §2.6.
- **The comparison with Preact is weaker than the sketch states.** Preact's read already reuses the previous run's dependency node through a pointer on the signal in the common case, so its lookup is constant time. The saving from declared edges has to be measured. The line counts, 600–900 against roughly 1,300, measure nothing the repository's policy prices: `CONTRIBUTING.md` §15 forbids pricing a change by reading source, and the figure that governs is Brotli bytes per composition.

### 2.9 Ownership and cleanup

- **No owner tree in the core.** `effect` returns its disposer, and its callback may return a cleanup that runs before the next run and on disposal. That is the shape core's `ContextEffect` already uses. An effect created inside another effect isn't disposed with it unless the outer cleanup disposes it.
- **An owner tree is Solid's answer to nested lifetimes.** If Readymag's migration needs one, it belongs in the Solid bridge, where Solid's owner already exists.
- **Errors:** a throwing computed rethrows to its reader, and a throwing effect rethrows from the flush. The core has no error-handler API. `EventEmitter.err()` is the precedent for one, and it has no caller in the repository.

### 2.10 Properties a contract would require

These are proposals for a contract after the prototype, not decisions.

- **P1, consistency.** An effect run sees every write committed before it, and no value a later write in the same batch would replace.
- **P2, single evaluation.** Each computed evaluates at most once per propagation.
- **P3, equality cut-off.** A computed whose new value equals its previous value under its equality function, `Object.is` by default, marks no consumer dirty.
- **P4, laziness.** A computed with no observer evaluates only when read, and holds no subscription.
- **P5, narrowing.** After a computed's run, exactly the edges that run read are subscribed.
- **P6, effect triggers.** As Q3 settles it, under (b): every declared input of an effect triggers it.
- **P7, escaped reads.** An accessor called outside its consumer's run reads the current value and marks no edge.
- **P8, steady-state allocation.** A run that reads the same edges as the previous run allocates nothing in the runtime.
- **P9, inspection seam.** Each node exposes its name and its declared sources to an inspector, and the production build contains no inspection code (§3).
- **P10, batching.** Writes inside `batch()` propagate once, at its end. Nested batches flush at the outermost end.

## 3. The narrow core, and what stays out

**In the core:**

| Export | Shape |
| --- | --- |
| `signal(value, equals?)` | a node with `get()` and `set(value)` |
| `computed(inputs, fn, equals?)` | lazy, narrowing, with `get()` |
| `effect(inputs, fn)` | returns its disposer; `fn` may return a cleanup |
| `batch(fn)` | defers propagation to its end |
| a `name` option on each node | the label an inspector shows |

The functions are standalone exports, not methods of one class hierarchy, so a composition that imports only `signal` carries no propagation scheduler (`CONTRIBUTING.md` §7). `subscribe(listener)` from the sketch's adapter contract is `effect([node], …)` and needs no separate export until a bridge needs one. Equality is per node.

**Out of the core, for now:**

- **The DevTools panel and the browser extension.** An extension is packaged and published through a browser store, not npm, so `repo:RD-27`'s workflow doesn't cover it. Q6.
- **The collector and the inspection interface,** `snapshot()` and an event stream. The core provides only P9's seam. The recommended seam is a development build of the same source, with hooks, selected by the `development` export condition, which Vite and other bundlers resolve in development. The production build then pays nothing, and the application changes nothing. That follows `CONTRIBUTING.md` §1.3: no diagnostics shipped by default.
- **The bridges to Solid, Preact and Vue,** and cross-runtime edges. Each bridge has its own peer, and Solid 1.x and 2 have different APIs. A peer's range must name only majors the workspace builds and tests against (`CONTRIBUTING.md`, Dependencies of a published package). Separate packages keep that matrix out of the core's release.
- **Dynamic collections, async computeds and an owner tree** (§2.5, §2.6, §2.9).
- **Cross-runtime batching.** Each runtime keeps its own scheduler, as the sketch says. What several bridges firing together guarantee is a bridge question.

## 4. `EventEmitter`: replace it or keep it

### 4.1 What it does today

`EventEmitter` is `packages/core/src/emitter.ts`: a `Set` of subscribers, `on`, `emit` and `err`. It reads **198 B** Brotli against a ceiling of **210 B**, as `.plan/drop-field-sizing-polyfill-1/checks/size-report-after-main-71a516e92.md` reports. Its uses:

- **core's `useContext`** imports only the `Unsubscribe` type, and its JSDoc recommends _"a nested `EventEmitter` or another manual observable mechanism"_ for changing provider state.
- **material-x's `button-group-context.ts`** creates one emitter per group and emits `(attr, oldValue, newValue)` from `useAttributes` for each forwarded attribute.
- **material-x's `core/utils/useContext.ts`** subscribes one listener per connected button, filters by attribute and converts both values. `ButtonCore` uses the old value to remove the previous state, and `SwitchCore` uses it to clear a selection the group's `value` made.

`err()` has no caller in the repository.

### 4.2 What replacing it would cost

- **Bytes.** Each button-group row would carry the narrow core in place of 198 B. Rows that import the context only for its identifier might not, which a measurement settles. The core's size is unmeasured: the prototype measures it (§7). The policy's question is which consumers pay (§15), and here every grouped button pays for propagation, batching and equality it doesn't use.
- **Runtime.** One signal per forwarded attribute per group, and one effect per attribute per button, in place of one listener per button. That is more nodes, edges and closures at every connect, which `CONTRIBUTING.md` §0 and §14 rank above bytes.
- **Semantics.** Attribute forwarding is an event stream with both values. A signal deduplicates by equality and coalesces a batch, so a consumer keeps the previous value in its own closure. This works, and it adds code to each consumer for no behaviour they lack.
- **Dependencies.** Core would depend on `@ydinjs/signals` at an exact version that is on the registry when core is released (`repo:RD-27` property 1). Every core release would then wait for a signals release, and core's install graph would grow by one package.
- **Direction.** Core has just lost `define()`, `$`/`$$` and the attribute operator (#106). A reactive runtime in core reverses that direction for one consumer.

### 4.3 Recommendation

**Keep `EventEmitter` in core as it is, and don't make core depend on `@ydinjs/signals`.** Nothing in core needs to change for signals to be adopted later. `useContext<T>` carries any value, so a provider can put a signal, or any object with `get()` and a subscription, in its context value without core knowing it. If material-x ever wants derived state across the context, material-x depends on signals, and the measurement decides it per provider.

**Revisit the question when** a core or material-x consumer needs derived state, a computed and not an event stream, or when a released signals package shows a composition cost on the button-group rows that the owner accepts. Until then the JSDoc in core's `useContext` stays as it is. Q5.

## 5. Where the package fits

- **Record.** A new package gets its own record, `packages/signals/.plan/`, and its own scope with a scope marker under `repo:RD-1`, which `RD-1` illustrates with box-quad's `BQD-`. The scope and its marker are minted when the package is scaffolded, not in this draft. Until then the design lives here, in the repository's `.plan/`. The decision to create the package is a repository decision, and the runtime's semantics are decisions in the package's scope.
- **Browser floor.** The package's code runs in a browser, so `repo:RD-27` property 3 and `repo:RD-20` property 1 apply: current Baseline before 1.0.0, and `browserslist` set to `baseline newly available` by its first release, without `with downstream`. The core uses language features only, such as private fields, which are long Baseline. The development build might use `WeakRef` for a registry of nodes, which is Baseline too. A reading against web-features is owed only at a 1.0.0 release.
- **Node.** The package also runs in Node, for tests and server rendering. No record states a Node floor for a package that runs in both. Recommendation: none until a Node consumer exists, with no `engines` field.
- **Version.** The first version is the owner's at the release (`repo:RD-27` property 1). Recommendation: `0.1.0`. The semantics are a prototype's, and Readymag's migration will change the API, which semver allows in a 0.x minor. Q7.
- **Size.** Rows from the first source commit, per `CONTRIBUTING.md` §15: `signal` alone; `signal` with `computed`; and the complete core. `@preact/signals-core` and `alien-signals` are measured once in the prototype's report as feature-matched baselines, not as rows. Ceilings are set at the first release with no slack, and raising one needs the owner (`repo:RD-27` property 2).
- **Release.** The same workflow, tag `@ydinjs/signals@<version>`, a staged publish with provenance, and the owner's approval (`repo:RD-27` property 4). Nothing about the package needs a new rule.
- **Dependencies.** None at runtime. The bridges, as separate packages, name their framework as a peer.

## 6. Questions for the owner

Each question has the architect's recommendation. None is decided.

| # | Question | Recommendation |
| --- | --- | --- |
| Q1 | Is the package's first consumer Readymag, with ydin's components a later candidate, or is ydin's core a consumer from the start? | Readymag first. Core isn't a consumer now (§4). |
| Q2 | Before a runtime: should a Solid-only inspector, with `on()` as the convention for effects, be tried in Readymag first, to test whether inspection alone solves the problem? | Yes, as a short probe. If it shows that narrowing and declarations a tool can read are the missing parts (§2.2), build the prototype (§7). |
| Q3 | Does an effect narrow to the edges it read, like a computed (a), or does every declared input trigger it (b)? | (b). The declaration is the exact trigger list, and nothing can stop running silently (§2.4). |
| Q4 | How do changing collections declare their edges? | Fixed declarations in the core. A keyed mapping primitive is the first extension. A declared family waits for a real case (§2.6). |
| Q5 | Should `@ydinjs/signals` replace `EventEmitter` in core? | No. Keep `EventEmitter`. Revisit on the conditions in §4.3. |
| Q6 | Where do the DevTools extension and the bridges live: this repository as separate packages, or elsewhere? | Bridges as separate packages here, after the core. The extension outside `repo:RD-27`'s workflow, in its own repository or decided when it is built (§3). |
| Q7 | What is the first version? | `0.1.0`, with `baseline newly available` (§5). |
| Q8 | Positional inputs, or a record of named inputs? | Positional, as sketched. Low priority (§2.3). |

## 7. The proposed next step

If the owner takes the direction, one bounded unit follows: **an architecture prototype** of §3's narrow core, as provisional code in an isolated worktree, under `agent-workflow.md`'s rules for prototypes. It delivers:

- the core, with P1 to P10 as a test suite, including the classic diamond, a branch switch and an escaped accessor;
- Brotli readings of the three compositions in §5, and of `@preact/signals-core` and `alien-signals` matched to the same features;
- a benchmark of a run that reads the same edges as the previous run and of a branch switch, against Preact, to test the cost claim in §2.8;
- a report that answers Q3 and Q4 with code, or names what is still open.

It is not production adoption. The owner evaluates it before any contract, scaffold or record identifier.

## Handoff

- **Input:** the sketch, as added and formatted, at [`ydinjs-signals-brainstorm.md`](ydinjs-signals-brainstorm.md); `packages/core/src/emitter.ts`, `packages/core/src/controllers/useContext.ts`, `packages/material-x/src/core/utils/useContext.ts` and `packages/material-x/src/button-group/button-group-context.ts` at `7dbef17bb`; `repo:RD-1`, `repo:RD-20`, `repo:RD-27`; `CONTRIBUTING.md` Part I, Language and platform and Dependencies of a published package, and Part II §0, §1, §4, §6, §7, §14, §15 and §18.
- **Outcome:** this draft. No decision, no identifier, no source.
- **Verification:** the emitter's size is the recorded reading cited in §4.1, not a new measurement. The claims about Solid's `on()` and Preact's read path come from the architect's knowledge of those libraries, not from a reading in this unit, and the prototype confirms them. Everything else is read from the files above.
- **Open:** Q1 to Q8, for the owner.
- **Next:** the owner chooses a direction. If he takes it, the prototype in §7, for an architect in an isolated worktree.