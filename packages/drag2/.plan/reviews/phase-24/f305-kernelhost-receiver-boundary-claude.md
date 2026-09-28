# `KernelHost` is not an entity, and the gate fires where the receiver is lost rather than where it is missing

**F-305**, raised by the implementation of D-170 steps 1a to 5 at `12311981`, against `.plan/contract/00-index.md` §D-170 and its two sub-clauses, `05-lifecycle-invariants.md` §Q-17, and the scope record's §3.4.

**The answer in one line.** §3.4 governs: `KernelHost` stays a `Readonly<{ … }>` capability record and does not become the class. The clause it appears to contradict is not contradicted, because **the gate covers a detached prototype method at the site that _produces_ it, not at the site that consumes it** — and production always reads through the owning object's own type, which clause 4 makes the class instance type. The `cancel: host.cancel` reads are not the hazard; they are two sites where the value has already, correctly, become a plain function.

---

## 1. What the step-6 entity is

The **kernel controller** — the object `createKernel` currently returns a two-member handle onto. It owns the frame pair, ingress, the action queue, the seam driver, the operation and activation records, the attempt trio, teardown and the destroy promise. §3.4 named it correctly and nothing here disturbs that.

Its published alias is `Kernel<Part, Activation>` ([`kernel/kernel.ts:256`](../../src/kernel/kernel.ts)), today `Readonly<{ host; arm(spec) }>`. Under clause 4 that alias is deleted in favour of the class instance type. **This is free and unobserved**: `kernel/kernel.js` is not in `package.json`'s `exports`, `createKernel` has exactly one call site in `src/` ([`kernel.ts:245`](../../src/kernel.ts)) and `Kernel` exactly one read site — `behavior(kernel.host)` then `kernel.arm(spec)`, two lines later.

**One constraint the conversion inherits from that alias.** The alias publishes two members; a class publishes everything not `#private`. The class's non-private surface must therefore be exactly `host` and `arm`. This is not a style preference: `Kernel` is what `draggable()` holds, and D-1's two-phase handshake is the reason `arm` exists as a separate member at all — a behavior may not arm itself, re-arm, or observe the kernel object.

## 2. `KernelHost`'s role, and three independent reasons it stays a record

`KernelHost` is a **capability façade at a tier boundary** — a projection assembled for behavior code, deliberately narrower than the entity behind it. Three reasons, and any one of them is sufficient:

1. **It is assembled from four owners**, as §3.4 states and [`kernel.ts:2365`](../../src/kernel/kernel.ts) shows: `realm`/`root` are data, `closed` is a live getter over `queue.closed`, `dispatch`/`cancel`/`destroy` are the kernel's, `fail` is the seam driver's. There is no single object it could be the instance type _of_. Making one means either handing the behavior tier the kernel entity — a boundary widening about what that tier may reach, which D-170 has no mandate for and which would publish `arm` to every behavior — or minting a second class that forwards, which re-detaches the same members one level down.

2. **It withholds deliberately.** `KernelHost`'s own docblock is _"The whole construction-time surface. No member lets the behavior drive a transition."_ A narrowing projection is the opposite of an entity's published alias: clause 4 exists so an entity's alias stops being narrower than the entity, and here the narrowness is the design.

3. **It is published authoring vocabulary, and that surface is decided to be structural.** `KernelHost` is pinned by [`tests/kernel/vocabulary.node.test.ts:78`](../../tests/kernel/vocabulary.node.test.ts) as part of the `@ydinjs/drag2/kernel` surface, and §01 already decided the shape of that tier: _"at the kernel tier the authoring surface is deliberately **structural**: an author writes a factory literal and reads `KernelHost`, which is what authoring means."_ Converting it publishes an implementation where a protocol was decided. That is a conflict with D-47/D-48, not only with §3.4.

**So `KernelHost` is reclassified, not converted**: it moves from the ownership amendment's implied "deleted at step 6" list to the residue, and the residue's justification is strengthened rather than merely tolerated.

## 3. Where a receiver-sensitive method can actually become detached

Measured with the repository's own configuration — `eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts`, effective rules `@typescript-eslint/unbound-method: [2, {"ignoreStatic": true}]` and `@typescript-eslint/method-signature-style: [2, "method"]` — against one probe file placed inside `src/` so the project service resolves it:

| read site | declared type at the read | reports |
| --- | --- | --- |
| `{ a: this.proto }` inside the class | class instance type | **yes** |
| `{ b: this.arrow }` inside the class | class instance type, arrow field | no |
| `{ a: f.a }`, `f: Readonly<{ a(…): void }>` | mapped alias | no |
| `{ a: f.a }`, `f: { a(…): void }` | plain type literal | **yes** |
| `{ p: k.proto }`, `k: Kern` | class instance type | **yes** |
| `{ r: k.arrow }`, `k: Kern` | class instance type, arrow field | no |

**The property that answers F-305 is row 1.** A detached prototype method has to be _produced_ before it can be consumed, and production reads the member off the object that owns it. That read's declared type is the entity's own — `this` inside the class, or the class instance type at an external supply site. Both report. By the time the value reaches a capability record it is a plain function, and the mapped alias's silence is describing that correctly.

**The tree already demonstrates this, twice, and neither is a synthetic probe.**

- [`y.ts:269,295`](../../src/sortable/y.ts) — step 2 converted `LinearShift` to a class and hit exactly this situation. The axis publishes `invalidate` and `retire` into an `InsertionGeometry` record that `assemble.ts` pushes into `retireHooks` and calls with no owner. The landed code wraps: `invalidate: () => { shift.invalidate(); }`, with the comment _"**Wrapped, not detached.** … a bare prototype read would arrive with no receiver. The closure is what carries it, and the lint gate is what would have caught the bare read."_ `assemble.ts:77` reads `axis.insertion.retire` through a mapped alias and is silent — correctly, because the value there is already a closure.
- [`kernel.ts:2402`](../../src/kernel/kernel.ts) — the `host` literal already carries the identical comment for `fail`, which crosses from the seam driver.

So the practice this decision prescribes is the practice steps 2 and 3 landed. Linting `y.ts`, `xy.ts` and `assemble.ts` today produces **no errors and contains no disable directives**: the silence is compliance, not blindness.

## 4. Which read sites the gate should and should not report

**Should report**, and does:

- any detached read of a `Kernel` prototype method through `this` inside the class — including the constructor line that composes `host`;
- any detached read of a `Kernel` prototype method through the class instance type at its one external read site, `src/kernel.ts`.

**Should not report**, and does not:

- `cancel: host.cancel` and `destroy: host.destroy` in [`sortable/controller.ts:59,64`](../../src/sortable/controller.ts) and [`free-drag/controller.ts:89,90`](../../src/free-drag/controller.ts);
- `controller.cancel` / `controller.destroy` detached by a consumer.

**Not because of the wrapper, but because there is no receiver to lose at those sites.** These members are _detachable by contract_: [`sortable.ts:89`](../../src/sortable.ts) describes `host.cancel` as _"a party supplying a value exactly as a consumer is"_, both controller docblocks say the members are _"the kernel's own members, spread through unchanged"_, and `destroy` is documented for the consumer as `void controller.destroy();`. A report at those sites would be a **false positive at the library's most-read boundary**, and the only remedy would be a permanent disable at exactly the two sites the migration cares most about.

**And the workaround that would have made the type say so is unavailable.** `method-signature-style: [2, "method"]` is in force repository-wide: declaring `cancel: (reason?: unknown) => void` in a type literal is an error, in the mapped form and the plain form alike (measured — probe lines 26 and 32). So a type-literal member's report is decided _solely_ by whether the alias is mapped, and `Readonly<…>` is the only mechanism this configuration leaves for a record whose members are contractually plain functions. That is **F-306**, and it converts Q-17's residue from a tolerated gap into the only available correct answer.

## 5. The "sharpest hazard" acceptance criterion was wrong, and is corrected

§3.4 states the hazard correctly: _"Converting `cancel` and `destroy` to prototype methods breaks the public API at a site three files away from the change, with `this` undefined, and nothing in the pipeline would say so."_

What was wrong is the inference that the gate must therefore fire **at** those two sites. It fires **at the change**, in `kernel.ts`, on the composition read that performs the detachment — one file from the mistake rather than three, and on the statement that made it. The corrected criterion:

> The migration's sharpest hazard is making a **detach-by-contract** member receiver-sensitive. It is discharged at the production site, inside the converting file, and the two consuming reads in `controller.ts` are required to stay silent.

The clause in `§The ownership boundary` that says the library's own production of `cancel` _"becomes visible at step 6"_ is withdrawn. It is visible at step 6 only in the failure case, and in `kernel.ts` rather than in either controller.

## 6. The step-6 implementation boundary

1. `createKernel` becomes `class Kernel<Part, Activation>`; the `Readonly<{ host; arm }>` alias is deleted and the class instance type takes its name. Non-private surface exactly `host` and `arm`; the attempt trio (`resolution`, `settlement`, `settlementInput`) is extracted in the same pass, as §3.4 specifies.
2. `KernelHost` is **unchanged** — same members, same `Readonly<{ … }>`, still assembled in what is now the constructor. Its docblock gains one sentence saying it is a capability façade rather than an entity alias, so the next reader does not re-derive F-305.
3. **Detach-by-contract members are receiver-free.** `cancel` and `destroy` reach the host, then both controllers, then consumer code, and must survive every hop. They stay plain functions: arrow-valued instance fields, or constructor-scope closures assigned into the host literal. If any of them is written as a prototype method, the host literal wraps it in the form `kernel.ts` already uses for `fail` and `y.ts` uses for `invalidate`/`retire` — never a bare `this.cancel`.
4. **Falsifier, in the form step 2 established** — the real construction site, not a probe. Two mutations of the shipped file, each failing the package-local `lint` recipe and clean when restored:
   - **(a) the alias came across.** Detach one `Kernel` prototype method at its real read site in `src/kernel.ts` — `const arm = kernel.arm;`. Reports through the class instance type.
   - **(b) the sharpest hazard is covered where it happens.** Declare `cancel` as a prototype method and compose the host from `cancel: this.cancel`. Reports on the composition line inside `kernel.ts`, before the value ever reaches a controller.

   (b) is the one that matters, because it is the mutation §3.4 says nothing in the pipeline would catch.

## 7. The narrowed rule, and what it reclassifies

Clause 4 of `§The ownership boundary` says _the published alias is the class instance type_. It needs a subject, and this is it:

> **An alias is an entity alias** — clause 4 applies, and the conversion deletes it in favour of the class instance type — **when one object implements every member and owns the state those members read and write.** The alias is that object's published name; a receiver exists, and losing it is a defect.
>
> **An alias is a capability or protocol record** — clause 4 does not apply, and it stays a `Readonly<{ … }>` — **when it is assembled**: its members come from two or more owners, or from a party other than the object that constructs it, so no single receiver exists that the alias could be the type of.
>
> **The test, so it is not re-derived per alias: name the object the alias would be the instance type of.** If one already exists and owns the state, it is an entity alias. If naming it requires inventing an object that exists only to hold the alias, or requires publishing an entity the alias was written to narrow, it is a capability record.

**Applied to the census.** Twenty declarations in `src/` carry method members today (nineteen distinct names, `InsertionRuntimeView` declared in three axis modules, plus `Kernel`, whose `Activation extends {} = true` parameter default hides it from a naive scan). At `cbaf0227`, before steps 1a to 5, it was twenty-two distinct; `SeamDriver` and `LinearShift` have since become classes.

The distinction reclassifies **exactly one alias, `KernelHost`**, and every other alias is already on the side it needs to be:

- **Entity alias, converted:** `Kernel` (step 6). `SeamDriver` and `LinearShift` already are.
- **Capability or protocol record, stays:** `KernelHost`; `SortableController` and `FreeDragController` (each assembles its own member with the host's two); `ActionTransition`, `ReleaseTransition`, `SettlementTransition`, `CommandAdmission`, `SeamContext` (author-implemented protocol namespaces and the per-call façade handed to them); `SortableSlots`, `InsertionGeometry`, `InsertionRuntimeView`, `LinearRuntime`, `MotionConstraint`, `FeatureContext` (SPI and consumer-declared views, filled by installers); `FrameTask`, `LifetimeScope`, `VisualLiftSession`, `DOMRealm` (handles and data-plus-predicate records whose factories D-170 already keeps as functions); `PointerCoordinates` (a structural view over an object the library does not own).

**A one-alias result is the confirming signal**, not a weak one: the classification the tree already had was right everywhere except at the one alias F-305 is about.

**The residue's justification is restated.** It was _"protocol and SPI records whose members are closures over a factory scope with no `this` to lose"_ — true today, but a property of the current implementations. It is now structural: these aliases are assembled, so a detached prototype method reaching one had to be produced through its owner's type, where the gate reports. The uncovered set is exactly the set in which the gate's silence is the correct answer.

## 8. Findings

- **F-305 — closed by this decision.** §3.4 governs; the two clauses did not in fact disagree about a fact, they disagreed about where the instrument fires.
- **F-306 — `method-signature-style: "method"` makes the mapped-type erasure the only available declaration form**, and Q-17's residue is therefore structural rather than tolerated. Recorded because the ownership amendment measured that a record of function-typed properties is silent without recording that writing one is a lint error here, which reads as an option that does not exist.
- **F-307 — the residue census in `§The ownership boundary` and Q-17 says _fourteen_; the count is twenty-two distinct aliases at `cbaf0227` and twenty declarations now.** Corrected in place. The count is illustrative rather than load-bearing, and the argument it appears in does not change.

## 9. Method

`.scripts/entry.sh drag2:F-305`; §3.4 and §6 of [`d170-class-migration-scope-claude.md`](d170-class-migration-scope-claude.md); `§The ownership boundary` and `§Step 6 is blocked …` in `00-index.md`; Q-17 in `05-lifecycle-invariants.md`. `KernelHost` read in full at [`kernel/spec.ts:33`](../../src/kernel/spec.ts) and its construction at [`kernel/kernel.ts:2365`](../../src/kernel/kernel.ts); `cancel` and `destroy` traced from [`kernel.ts:697,806`](../../src/kernel/kernel.ts) through the host literal into both controllers, read in full. Effective lint options read with `--print-config`. One probe file, `src/probe-f305.ts`, run through the package `eslint` invocation and deleted; its six rows are the table in §3. `npx just typecheck` clean at `12311981` — the IDE's `createSeamDriver` diagnostic is stale against step 3's landed class.