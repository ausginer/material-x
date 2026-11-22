# `@ydinjs/signals` — design draft

**Author:** the architect, on `repo/signals-design-1` from `origin/main` at `7dbef17bb`, 2026-11-22. **Input:** the owner's sketch, [`ydinjs-signals-brainstorm.md`](ydinjs-signals-brainstorm.md), added to this branch as written (`oxfmt` added semicolons and parentheses to its two code samples and nothing else), and the coordinator's four questions (issue #111). **Status:** a draft for the owner. It adopts no decision and claims no record identifier. The labels Q1 to Q11, P1 to P10 and C1 to C5 are local to this document.

**Revision 2, 2026-11-22,** on the owner's answers to Q1 to Q8, relayed by the coordinator (§6.1). Revision 1 is `e35b5693d`. What changed:

- **The first consumer is ydin's core,** and `@ydinjs/signals` replaces `EventEmitter` there (Q1, Q5). Revision 1 designed for Readymag and recommended keeping `EventEmitter`. Section 4 is rewritten for the new goal: its readings stay as evidence, and it now says what the replacement costs, how to keep it small and how the version pin is handled.
- **An effect narrows like a computed** (Q3 is (a)). Revision 1 recommended (b), every declared input triggers. Section 2.4 and P6 changed.
- **The prototype shows a declared family for collections** (Q4 stays open). Section 2.6's options are relabelled (a) to (c) so that the owner's _"option (c), a declared family"_ names the same option here. Revision 1 called it (ii).
- **Q2, a Solid-only inspector probe first, is dropped.** Section 2.2 keeps the comparison with `on()` as background.
- **New open questions:** Q9 to Q11 (§6.2).
- **The prototype task** is [`signals-prototype-task.md`](signals-prototype-task.md). Section 7 points to it.

## 0. Summary

- **The model holds.** A declared input list with positional accessors gives a bounded, inspectable answer to _"what could this depend on?"_ before the first run, and records _"what did it read?"_ without an ambient tracking context. Computeds and effects both subscribe, on every run, to exactly the inputs that run read.
- **The weak points are known and bounded.** An effect whose only reason to run is an input it never reads runs once and stops (§2.4). A collection whose members change needs a declared family (§2.6). The claim that the model is cheaper than Preact's read path is unmeasured (§2.8). The prototype tests each.
- **A narrow core is `signal`, `computed`, `effect` and `batch`,** with node names and the retained declaration as the seam for inspection. The prototype adds a declared family for Q4. The DevTools panel, the collector, the inspection interface and the bridges stay out (§3).
- **Replacing `EventEmitter`** means: core deletes `emitter.ts`; the button group carries its forwarded attributes as signals; and core depends on signals once a core module imports it (§4). Every button row pays for the runtime unless the provider keeps it on its side, and the prototype measures both shapes. Two installed copies of the runtime break batching, so signals is a peer of each package that imports it, as `repo:RD-31` made drag a peer of material-x (§4.5).
- **The package fits the existing rules:** its own `packages/signals/.plan/` scope under `repo:RD-1`, `baseline newly available` before 1.0.0 under `repo:RD-27` property 3, the one release workflow, and size rows from its first commit (§5). Its release comes before core's.
- **Next:** the prototype in [`signals-prototype-task.md`](signals-prototype-task.md), for an implementer in an isolated worktree on this branch. The owner evaluates it before any contract.

## 1. What the sketch proposes, and for whom

The sketch's own problem statement is Readymag's: a Solid effect calls a helper several calls deep and subscribes to whatever that helper reads, so nobody can say what can trigger the effect or what triggered it in a given update. Its answer has three parts:

1. **A declared input list.** `computed([a, b, c], (a, b, c) => …)` names every possible direct dependency.
2. **Positional accessors.** The callback receives one accessor per input. Calling it reads the value and marks that edge as used in this run. After the run, the runtime drops subscriptions on edges the run didn't use.
3. **An untracked read.** `x.get()` reads the current value and subscribes to nothing.

Around it the sketch places a DevTools panel, bridges to Solid, Preact and Vue, and an inspection interface.

**The consumers, in the owner's order** (Q1): ydin's core and its components first, replacing `EventEmitter`; then the owner's own projects, which use ydin with Solid; Readymag is a side effect. So the smallest composition has to be small, because each grouped button pays for it (§4.4), and the bridge to Solid matters later but not for the core.

## 2. The model, examined

### 2.1 What the model gets right

- **The possible-dependency set is data.** The node holds its declared sources, which it needs anyway to build its accessors, so a tool can show every possible edge, both branches included, before the first run and without evaluating anything. Ambient tracking can't show this, because a dependency exists only once a run reads it.
- **No ambient context.** Each accessor knows its source and its consumer, so a read needs no global "current observer". That removes the class of bugs where a helper subscribes the wrong computation, which is the sketch's motivating problem.
- **The untracked read is the default for method reads.** Every `get()` is untracked, and the only tracked read is an accessor call. So one rule tells a reader what subscribes, without `untrack()` wrappers.
- **Ordinary control flow.** Branches, loops and early returns narrow the used edges without library operators. The sketch rightly rejected `if()` and `firstDefined` nodes for this.

### 2.2 What explicitness adds to Solid's `on()`

Solid 1.x has `on(deps, fn)`. It tracks the listed accessors and runs `fn` untracked, so in Solid an effect written with `on` has a declared trigger list, and a helper called from `fn` subscribes nothing. What `on()` doesn't do, and the sketch does:

- **Narrowing.** `on()` subscribes to every listed dependency on every run. The sketch subscribes to the subset a run read.
- **A declaration a tool can read.** `on()` returns a closure. Solid's graph learns its dependencies only by running it.
- **One rule for everything.** `on()` is opt-in per computation. In the sketch, every computation declares its inputs.

This matters for the later Solid bridge: a Solid computation wrapped by `fromSolid` has no declaration to show, so the inspector can show its observed edges only.

### 2.3 Positional binding and duplication

- **Reordering hazard.** The input list and the parameter list are bound by position. Swapping two entries of the same type, say two `Signal<boolean>`, type-checks and silently swaps their meanings. React's dependency arrays don't have this hazard, because they aren't bound to parameters. Solid's `on()` with an array has the same one.
- **Each input is named twice,** once in the list and once as a parameter. This is the price of explicitness, and it is acceptable.
- **The alternative was a record,** `computed({ show, archived }, ({ show, archived }) => …)`. The owner took positional inputs (Q8).

### 2.4 Effect trigger semantics

**The owner's answer (Q3): (a). An effect narrows like a computed.** On each run it subscribes to the inputs that run read and unsubscribes from the declared inputs it didn't read. That is the main idea of the sketch, and it is why the inputs are accessor functions. One mechanism serves both kinds of node.

What follows from it:

- **An effect runs again only when an input its last run read changes.** An effect that declares an input only as a trigger and never calls its accessor, such as a refresh tick, runs once and never again, with no error. The documentation states the rule. The development build's inspector can list declared inputs that the last run didn't read, which is where such an effect shows up. The runtime doesn't guard it (`CONTRIBUTING.md` §1.1).
- **Declared computed inputs that a run doesn't read stay lazy.** An effect with `if (!enabled()) return` doesn't evaluate the computeds behind its other inputs while it is disabled.
- **Effects mark edges, as computeds do,** so the marking code is shared and is in every composition that has an effect.

The alternative, (b), made the declaration the exact trigger list, as Solid's `on()` does. It is no longer proposed.

### 2.5 Untracked reads, escaped accessors and `await`

- **A `get()` inside a computed makes its cached value depend on state it doesn't track.** The value stays stale until a tracked input changes. In an effect this is the intended "sample at run time". In a computed it breaks the rule that a computed is a function of its inputs. Recommendation: allow it and document it, and don't guard it at runtime. An inspector can show sampled reads only if `get()` reports to it while a node runs, which needs a "current node" in the development build only (§3).
- **A branch decided by untracked state can leave a needed edge unsubscribed.** If a computed reads `mode.get()` and then calls `a()` or `b()`, a change of `mode` doesn't rerun it, and the other edge stays inactive. This is the same hazard as `untrack` anywhere. It needs a sentence in the documentation and nothing in the runtime.
- **An accessor called outside its consumer's run** — stored and called later, called from a timer or called after an `await` — reads like `get()`: the current value, untracked, with no edge marked. It costs one check of a flag the consumer sets for its run. Throwing would be a runtime guard against a usage error. Marking the edge for the next run would subscribe from an evaluation that has ended, after its edges were reconciled.
- **Reads after `await` stay untracked,** as in Solid and Preact. Async computeds stay out of the core (§3).

### 2.6 Dynamic collections

The declared tuple is fixed when the node is built. A collection whose members change has no place in it.

**How Preact handles it, for comparison:** Preact has no declarations. A computed that loops over the current members reads each one, ambient tracking records those reads, and the next run records the next set. The set of possible dependencies is whatever the last run touched.

Three answers in this model:

- **(a) A keyed mapping primitive,** like Solid's `mapArray`: one node per member, each with a fixed declaration, created and disposed as keys come and go. It keeps the invariant that a node's possible edges are fixed at construction. It doesn't cover the sketch's scan for the first matching row, because the scan's inputs are the per-member nodes, and their number changes.
- **(b) Rebuild the node** when the collection's length or identity changes. Simple, and it disposes and recreates subscriptions on every structural change.
- **(c) A declared family.** The collection is the declared input: a signal whose value is a list of member nodes. The callback's accessor for it gives the current members, and reading a member through it marks an edge within that family. The inspector shows _"could depend on any member of `items`"_ before the first run, and the members actually read after it. This covers the scan, and the possible edges stay bounded by a declaration. The cost is edges created at runtime, per consumer and member, and the bookkeeping to reuse them.

**Status (Q4): open.** The owner leans towards (c) and wants to see it in code before he chooses. The prototype builds (c) against C1 to C5 below, and builds (a) or (b) only where (c) breaks one of P1 to P10.

**What (c) must show,** as proposals:

- **C1, bounded family.** The family edge is declared. Member edges are created only by reads through the family's accessor, and only to members of the collection's current value.
- **C2, narrowing within the family.** After a run, exactly the members that run read are subscribed, as P5 states for declared edges.
- **C3, removal.** A member removed from the collection, and not read by the consumer's next run, holds no link to the consumer after that run, so a live member doesn't keep a disposed row's consumer reachable.
- **C4, steady-state allocation.** A run that reads the same members as the previous run allocates nothing in the runtime, as P8 states.
- **C5, inspection.** The declared family is visible before the first run, and the member edges after it, through the same seam as P9.

### 2.7 Propagation: glitch-free, lazy, no leak

Declared edges change nothing about the propagation algorithm. The runtime still needs the familiar push–pull scheme: writes mark consumers along active edges as dirty, or as possibly dirty when the change is indirect, computeds recompute on read, and effects run after the batch. Section 2.10 states the properties as requirements rather than an algorithm. Two interactions with the sketch's model are specific:

- **Only active edges propagate.** A write to a declared but unused input reaches nobody. That is the point of narrowing, and it needs no extra work.
- **An unobserved computed must hold no subscription,** or every computed ever read stays reachable from its sources. With accessors that close over `(source, consumer)`, the source has to link the consumer only while the consumer is observed. The accessor's reference to its source is harmless: it points from consumer to source.

### 2.8 Allocation and the cost claim

- **Accessors and declared edges can be created once per node,** at construction, and reused for every run. The sketch's worry about allocating accessors for a large input array is then a memory cost proportional to the declaration, paid once. It is not a cost per run.
- **The used-edge mark needs no clearing** if it is a run counter: an edge is used in this run when its mark equals the consumer's run number. The active subscriptions can be an intrusive linked list of the preallocated edge objects. Then a run that reads the same edges as the previous run allocates nothing (P8).
- **A large declaration that is usually read sparsely is a collection in disguise,** and belongs to §2.6.
- **The comparison with Preact is weaker than the sketch states.** Preact's read already reuses the previous run's dependency node through a pointer on the signal in the common case, so its lookup is constant time. The saving from declared edges has to be measured. The line counts, 600–900 against roughly 1,300, measure nothing the repository's policy prices: `CONTRIBUTING.md` §15 forbids pricing a change by reading source, and the figure that governs is Brotli bytes per composition.

### 2.9 Ownership and cleanup

- **No owner tree in the core.** `effect` returns its disposer, and its callback may return a cleanup that runs before the next run and on disposal. That is the shape core's `ContextEffect` already uses. An effect created inside another effect isn't disposed with it unless the outer cleanup disposes it.
- **An owner tree is Solid's answer to nested lifetimes.** If the Solid bridge needs one, it belongs in the bridge, where Solid's owner already exists.
- **Errors:** a throwing computed rethrows to its reader, and a throwing effect rethrows from the flush. The core has no error-handler API. `EventEmitter.err()` was the precedent for one, and it has no caller in the repository.

### 2.10 Properties a contract would require

These are proposals for a contract after the prototype, not decisions.

- **P1, consistency.** An effect run sees every write committed before it, and no value a later write in the same batch would replace.
- **P2, single evaluation.** Each computed evaluates at most once per propagation.
- **P3, equality cut-off.** A computed whose new value equals its previous value under its equality function, `Object.is` by default, marks no consumer dirty.
- **P4, laziness.** A computed with no observer evaluates only when read, and holds no subscription.
- **P5, narrowing.** After a computed's run, exactly the edges that run read are subscribed.
- **P6, effect narrowing.** After an effect's run, exactly the edges that run read are subscribed, as P5 states for a computed. An input the run didn't read doesn't trigger the effect until a later run reads it. _(Revision 1 said: every declared input of an effect triggers it.)_
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
| `effect(inputs, fn)` | narrowing; returns its disposer; `fn` may return a cleanup |
| `batch(fn)` | defers propagation to its end |
| a `name` option on each node | the label an inspector shows |

The functions are standalone exports, not methods of one class hierarchy, so a composition that imports only `signal` carries no propagation scheduler (`CONTRIBUTING.md` §7). `subscribe(listener)` from the sketch's adapter contract is `effect([node], …)` and needs no separate export until a bridge needs one. Equality is per node.

**In the prototype, provisionally:** the declared family of §2.6 (c), as the input form it needs. Whether it joins the core is Q4.

**Out of the core, for now:**

- **The DevTools panel and the browser extension.** An extension is packaged and published through a browser store, not npm, so `repo:RD-27`'s workflow doesn't cover it. Where it lives is decided when it is built (Q6).
- **The collector and the inspection interface,** `snapshot()` and an event stream. The core provides only P9's seam. The recommended seam is a development build of the same source, with hooks, selected by the `development` export condition, which Vite and other bundlers resolve in development. The production build then pays nothing, and the application changes nothing. That follows `CONTRIBUTING.md` §1.3: no diagnostics shipped by default.
- **The bridges to Solid, Preact and Vue,** and cross-runtime edges, as separate packages in this repository after the core (Q6). Each has its own peer, and Solid 1.x and 2 have different APIs. A peer's range must name only majors the workspace builds and tests against (`CONTRIBUTING.md`, Dependencies of a published package).
- **Keyed mapping, async computeds and an owner tree** (§2.5, §2.6, §2.9).
- **Cross-runtime batching.** Each runtime keeps its own scheduler, as the sketch says. What several bridges firing together guarantee is a bridge question.

## 4. `EventEmitter`: the replacement

### 4.1 What it does today

`EventEmitter` is `packages/core/src/emitter.ts`: a `Set` of subscribers, `on`, `emit` and `err`. It reads **198 B** Brotli against a ceiling of **210 B**, as `.plan/drop-field-sizing-polyfill-1/checks/size-report-after-main-71a516e92.md` reports. Its uses:

- **core's `useContext`** imports only the `Unsubscribe` type, and its JSDoc recommends _"a nested `EventEmitter` or another manual observable mechanism"_ for changing provider state.
- **material-x's `button-group-context.ts`** creates one emitter per group and emits `(attr, oldValue, newValue)` from `useAttributes` for each forwarded attribute. The two group elements import it.
- **material-x's `core/utils/useContext.ts`** subscribes one listener per connected button, filters by attribute and converts both values. `ButtonCore` uses the old value to remove the previous state, and `SwitchCore` uses it to clear a selection the group's `value` made. The buttons import the class only as a type, so the button rows don't contain it today.

`err()` has no caller in the repository.

### 4.2 The goal

**The owner's answer (Q5): `@ydinjs/signals` replaces `EventEmitter`, and core depends on it.** `EventEmitter` was a compromise: no third-party dependency in core, and no runtime of his own yet. The readings in §4.1 stay as evidence of what the replacement costs, and they no longer decide whether it happens.

### 4.3 What the replacement consists of

- **The group carries its forwarded attributes as signals.** One signal per forwarded attribute per group, set from the group's `useAttributes` callbacks. The context value holds them beside `provider`.
- **A button has one effect,** not one per attribute. Its declared inputs are the signals of the attributes it forwards. Each run reads them all, so under P6 it is subscribed to all of them, and it compares each with the converted value it kept from the previous run, so that the component's callback still receives `(attr, oldValue, newValue)` for each attribute that changed. Batching can coalesce two writes to one attribute, and the callback then sees the first old value and the last new one, which both consumers accept: they replace a state, and they don't count changes.
- **The effect's disposer is the context cleanup.** `ContextEffect` already returns `Unsubscribe`, and the disposer has that shape, so core's `useContext` doesn't change its logic.
- **Core deletes `emitter.ts`,** its export, its test and its size row. The package is unreleased, so no compatibility is owed (`CONTRIBUTING.md` §8). `Unsubscribe` moves to `useContext.ts`, its only importer, or becomes signals' disposer type. Core's `useContext` JSDoc names signals where it named `EventEmitter`.
- **Core depends on signals once a core module imports it.** A manifest names what its published files import (`CONTRIBUTING.md`, Dependencies of a published package), and after the deletion nothing in core imports signals: the flow above lives in material-x. The candidate import is a controller that binds an effect to the host's connection, created on connect and disposed on disconnect. Every component that uses signals outside a context needs that lifetime, and the context flow above already has it by hand. Q10.

### 4.4 What it costs, and how to keep it small

**Bytes, by row.** Section 15 of `CONTRIBUTING.md` asks which consumers pay.

- **The group rows** lose `EventEmitter` and gain `signal`. They gain `effect` and the scheduler only if the consumer side lives in a module they import.
- **Every button row** gains what the consumer needs. Today a button contains only its listener, so this is the larger cost: `effect`, edge marking and the scheduler in each of `button/*` and `button-group/*`.
- **Control rows** that import no context, such as `icon/icon` and `list/list`, must not move (§18).

**Two shapes, measured by the prototype:**

- **(A) The consumer imports `effect`.** The plain shape. Every button row pays for the runtime.
- **(B) The provider keeps the runtime on its side.** The context value carries a function that creates the button's effect, so the button imports nothing from signals, and a standalone button pays nothing. This is the shape `EventEmitter` has today: the button calls `on` on an object the group made. It costs one indirection in the context value.

The architect expects (B) to be the smaller in the button rows and equal in the group rows. The prototype reads both, and the owner chooses (Q11).

**Keeping the runtime small:**

- standalone exports, so that `signal` alone carries no scheduler;
- one node shape for signals, computeds and effects, so that the hot paths see one hidden class;
- no error-handler API, no `subscribe` export and no owner tree;
- `Object.is` as the default equality, with the function as an optional argument;
- no inspection code in the production build (P9);
- the declared family in its own module, so that a composition without it doesn't pay for it, if Q4 adopts it.

**Runtime.** One effect node and one edge per forwarded attribute per connected button, in place of one `Set` entry and one closure. That is a cost at every connect, which `CONTRIBUTING.md` §0 and §14 rank above bytes. The prototype reads it for a group of buttons connected and disconnected repeatedly.

### 4.5 The version pin

**What `repo:RD-27` property 1 says:** _"A dependency on another `@ydinjs` package is an exact version that is on the registry when the dependent package is released."_ Under it, core and material-x would each pin one signals version, and:

- **release order** is signals, then core, then material-x, and every signals change that core needs is a release of both;
- **an application that also imports signals,** at any other version, installs a second copy.

**Two copies break the runtime.** Each copy has its own batch and its own effect queue. An effect of one copy subscribed to a signal of the other runs outside that copy's batch, so P1 and P10 don't hold across copies, with no error. This is a real case: the owner's projects will use ydin's components and signals of their own.

**This is the case `repo:RD-31` settled for drag.** Its property 5 makes `@ydinjs/drag` a peer of material-x because _"the package must share the consumer's copy"_: drag's nesting rule holds within one copy. `CONTRIBUTING.md`'s second placement question asks the same thing.

**Recommendation:** signals is a peer of each package that imports it, and a dev dependency in the workspace, as drag is. material-x's peer is required. Core's is optional if only an optional entry, such as the controller of Q10, imports it, as `CONTRIBUTING.md` states for an optional entry. The range is set at the dependent package's release, as `repo:RD-31` property 5 sets drag's. Until then the workspace links the package. RD-27 property 1's exact version then governs `dependencies`, which is what it names. Whether a peer between `@ydinjs` packages is an exact version or a range is open for drag already. It is answered at the first release that has one, and once for both. Signals is still released before the first core or material-x release that imports it, because a peer has to be on the registry too. Q9.

## 5. Where the package fits

- **Record.** A new package gets its own record, `packages/signals/.plan/`, and its own scope with a scope marker under `repo:RD-1`, which `RD-1` illustrates with box-quad's `BQD-`. The scope and its marker are minted when the package is adopted, not in this draft or in the prototype. Until then the design lives here, in the repository's `.plan/`. The decision to create the package and to replace `EventEmitter` is a repository decision, and the runtime's semantics are decisions in the package's scope.
- **Browser floor.** The package's code runs in a browser, so `repo:RD-27` property 3 and `repo:RD-20` property 1 apply: current Baseline before 1.0.0, and `browserslist` set to `baseline newly available` by its first release, without `with downstream`. The core uses language features only, such as private fields, which are long Baseline. The development build might use `WeakRef` for a registry of nodes, which is Baseline too. A reading against web-features is owed only at a 1.0.0 release.
- **Node.** The package also runs in Node, for tests and server rendering. No record states a Node floor for a package that runs in both. Recommendation: none until a Node consumer exists, with no `engines` field.
- **Version.** `0.1.0` at its first release, on the owner's agreement (Q7). The first version is his at the release (`repo:RD-27` property 1).
- **Release order.** signals, then core, then material-x (§4.5).
- **Size.** Rows from the first source commit, per `CONTRIBUTING.md` §15: `signal` alone; `signal` with `computed`; and the complete core. `@preact/signals-core` and `alien-signals` are measured once in the prototype's report as feature-matched baselines, not as rows. Ceilings are set at the first release with no slack, and raising one needs the owner (`repo:RD-27` property 2).
- **Release.** The same workflow, tag `@ydinjs/signals@<version>`, a staged publish with provenance, and the owner's approval (`repo:RD-27` property 4). Nothing about the package needs a new rule.
- **Dependencies.** None at runtime. The bridges, as separate packages, name their framework as a peer.

## 6. Questions

### 6.1 The owner's answers

Relayed by the coordinator on 2026-11-22. They are recorded here and become decisions when the direction is adopted after the prototype.

| # | Question | Answer |
| --- | --- | --- |
| Q1 | The first consumer | ydin, from the start, replacing `EventEmitter` in core. The owner's own projects will use ydin with Solid later. Readymag is a side effect. _(Revision 1 recommended Readymag first.)_ |
| Q2 | A Solid-only inspector probe first | Dropped. |
| Q3 | Effect trigger semantics | (a): an effect narrows to the edges it read, like a computed (§2.4, P6). _(Revision 1 recommended (b).)_ |
| Q4 | Changing collections | Open. The owner leans towards (c), a declared family, and wants to see it in code (§2.6). |
| Q5 | Replace `EventEmitter` in core | Yes. `@ydinjs/signals` becomes core's dependency (§4). _(Revision 1 recommended keeping `EventEmitter`.)_ |
| Q6 | Where the extension and bridges live | As recommended: the bridges as separate packages here after the core, and the extension decided when it is built. |
| Q7 | First version | As recommended: `0.1.0`, with `baseline newly available`. |
| Q8 | Positional or named inputs | As recommended: positional. |

### 6.2 Open

| # | Question | Recommendation |
| --- | --- | --- |
| Q4 | Declared family (c), keyed mapping (a) or rebuild (b)? | Decide after the prototype shows (c) against C1 to C5. |
| Q9 | Is signals a dependency of core and material-x, pinned exactly under `repo:RD-27` property 1, or a peer? | A peer, as drag is under `repo:RD-31`, because two copies break batching (§4.5). Its range is set at the dependent's release. |
| Q10 | Which core module imports signals, so that core depends on it? | A controller that binds an effect to the host's connection, as an optional entry. The prototype builds it and shows whether the context flow uses it (§4.3). |
| Q11 | Does the button import `effect` (A), or does the provider keep the runtime on its side (B)? | Decide on the prototype's readings. The architect expects (B) (§4.4). |

## 7. The next step

[`signals-prototype-task.md`](signals-prototype-task.md) is the prototype task: an implementer builds the narrow core, the declared family, and the button group's flow on signals, on this branch, in an isolated worktree, and stops for the owner's evaluation. It is not production adoption.

## Handoff

- **Input:** revision 1 at `e35b5693d`; the owner's answers as relayed (§6.1); the sketch at [`ydinjs-signals-brainstorm.md`](ydinjs-signals-brainstorm.md); `packages/core/src/emitter.ts`, `packages/core/src/controllers/useContext.ts`, `packages/material-x/src/core/utils/useContext.ts`, `packages/material-x/src/button-group/button-group-context.ts`, `packages/material-x/src/button/ButtonCore.ts` and `SwitchCore.ts` at `7dbef17bb`; `repo:RD-1`, `repo:RD-20`, `repo:RD-27`, `repo:RD-31`; `CONTRIBUTING.md` Part I and Part II §0, §1, §6, §7, §8, §14, §15 and §18; `agent-workflow.md` §Architecture prototypes and §One branch and one pull request per unit.
- **Outcome:** this revision and the prototype task. No decision, no identifier, no source.
- **Verification:** the emitter's size is the recorded reading in §4.1, not a new measurement. The claims about Solid's `on()` and Preact's read path come from the architect's knowledge of those libraries, and the prototype's comparison confirms or corrects the one about Preact. Everything else is read from the files above.
- **Open:** Q4, Q9, Q10 and Q11.
- **Next:** the owner reads the summary. Then the implementer runs the prototype task, and the owner evaluates the prototype.