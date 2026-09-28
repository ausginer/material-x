# The kernel implements the behavior-facing interface, and the façade object goes

**The interface is named `BehaviorContext`, not `BehaviorKernel`** — owner correction, 2026-09-07, settled in [`f309-q18-context-and-view-claude.md`](f309-q18-context-and-view-claude.md) §1. Every substantive conclusion below stands; read `BehaviorKernel` as `BehaviorContext` throughout. This record is dated provenance and is not rewritten.

**Owner correction to F-305 and to D-170 §The ownership boundary**, against `f375e6b1`. The governing policy is the owner's and is not re-argued here:

> The project does not treat deliberate JavaScript access, casts or reflection around a TypeScript boundary as a threat that runtime machinery must prevent. Receiving an object through a narrower TypeScript interface is an accepted boundary; deliberately escaping it is governed by "do not do that".

**The result in one line.** The kernel class implements a hand-written `BehaviorKernel` interface directly, the separate `host` object is deleted, `KernelHost` is renamed outright with no alias, and the receiver gate becomes **live at the two published controller sites** — which F-305 claimed and my own adjudication denied. That denial is withdrawn.

---

## 1. What my previous adjudication got wrong

`§The step-6 boundary` gave three reasons for keeping `KernelHost` a separate record. One is overruled by policy, one is satisfied without the object, and one was wrong on its own terms.

- **"Assembled from four owners."** Overruled, and it was the weakest of the three: `realm` and `root` are the kernel's own constructor arguments, `closed` is a getter over `queue.closed`, and `fail` forwards one call to the seam driver. **Delegation is what a method body does.** A class whose members forward to collaborators is not thereby two objects, and treating it as two is how the façade came to exist.
- **"It withholds deliberately."** True as an intent and unchanged — and §2 shows this package already expresses that intent with a type rather than an object, twice, in the same file.
- **"Publishing it would conflict with the structural authoring surface (D-47/D-48)."** **Wrong.** That argued against publishing a _class instance type_, and the owner's model publishes no such thing: `interface BehaviorKernel` is structural, an author still writes a factory literal and reads a structural type, and D-47/D-48 are satisfied verbatim. It answered a question nobody asked.

## 2. Does any published contract require runtime withholding?

**No — and the decisive evidence is not an absence. It is that the package already does exactly what the owner is asking for, and says so in the same file.**

`KernelHost` is not the kernel's only capability projection. It is the **only one implemented as a second runtime object**:

- **`LifetimeScope` / `Lifetime`** — [`kernel/lifetimes.ts:31-40`](../../src/kernel/lifetimes.ts). `LifetimeScope` is `signal`, `use`, `useWhile`; `Lifetime` is `LifetimeScope & Readonly<{ dispose(): void }>`; and `createLifetime` returns **one object**. §05 says _"`LifetimeScope` withholds `dispose()`, so the behavior cannot close motion itself"_ and §02 says it _"exists precisely so `dispose` is unreachable"_. There is no second object and no runtime barrier — the withholding is a type, and the wide type is literally defined as the narrow one plus the extra member.
- **`BehaviorLiftSession` / `VisualLiftSession`** — and the SPI states the model outright at [`kernel/spec.ts:224-227`](../../src/kernel/spec.ts):

  > **A projection, not the session**: `rendered` and `dispose` are kernel-only. **The same physical object arrives under the narrower type.**

  §02 adds that its member list is _"**Positively selected, not `Omit`-ed** … so a member added to `VisualLiftSession` later is kernel-only by default instead of leaking until someone remembers to exclude it"_ — which is the argument for a hand-written interface over a mapped one, already made and already applied.

**So the owner's correction is not a new policy for this package. It is the policy of two of its three capability projections, and `host` is the outlier.**

The negative census supports it and adds nothing surprising:

- **No runtime hardening exists anywhere in `src/`** — no `Object.freeze`, `seal`, `defineProperty`, `Proxy` or `WeakMap`. The `host` literal is a plain object returned by reference.
- **Nothing depends on its object identity** — no identity comparison, no weak-keyed structure.
- **No executable assertion checks that a member is absent at runtime.** The four negative probe assertions are `@ts-expect-error` declarations that must **fail to compile** — a type instrument, and §3 keeps it.
- **Nothing in the package concerns untrusted or adversarial authors.** "Third-party" always means a cooperating extension author writing against a published type — the same trust position as a consumer supplying a `box` resolver, which the package documents rather than guards.

**One claim reads like a runtime guarantee and is not.** [`01-construction-ownership.md:112`](../../.plan/contract/01-construction-ownership.md) and the `Kernel` docblock both say _"A behavior cannot arm itself, re-arm, or observe the kernel object."_ Under direct implementation a behavior **does** hold the kernel object, narrowed. The sentence states a contract in the grammar of an impossibility, and only the separate object ever made it literally true. **It is corrected to state the contract, not repaired by machinery** — F-308. `arm` gains no runtime guard: a second `arm()` call is deliberate escape from a documented once-only contract, which is what the policy assigns to "do not do that". This is the same move §01 already makes one line later, where _"No input can be admitted before `install()` returns" stays unexpressible rather than enforced._

## 3. The behavior-facing interface

```
interface BehaviorKernel {
  readonly realm: DOMRealm;
  readonly root: HTMLElement;
  readonly closed: boolean;
  dispatch(tag: number, argument: unknown): void;
  fail(stage: FailureStage, error: unknown): void;
  cancel(reason?: unknown): void;
  destroy(): Promise<void>;
}
```

Seven members — the same seven `KernelHost` carries today, with the same documentation. `class Kernel<Part, Activation> implements BehaviorKernel`, and **`arm` is on the class and not on the interface**: a behavior receives `BehaviorKernel` and reaches `arm` only by deliberately escaping the contract. Verified — `void kernel.arm` through the interface is a type error, and a `@ts-expect-error` on it is satisfied.

**The internal `Kernel` alias disappears.** `Readonly<{ host; arm }>` existed only to pair the façade with the arming member. `createKernel` becomes `new Kernel(root)`, and [`kernel.ts:245`](../../src/kernel.ts) reads `behavior(kernel)` then `kernel.arm(spec)` — the narrowing happens structurally at the call, which is the entire mechanism, exactly as `LifetimeScope` narrows at its own.

**Member forms follow the owner's data taxonomy** (§7): `realm` and `root` are assigned once and are **public `readonly` fields**; `closed` is a **getter**, and keeps that form for an independent reason — D-38 requires the latch be read _live_, since _"a captured boolean would be a copy of a liveness answer, which is the failure mode the whole invariant is about."_

**The narrowing keeps its existing instrument.** Probe 13a's N-2, N-3 and N-5 and probe 13c's N-4 are `@ts-expect-error` assertions that the host offers no ingress member, no operation minting and no return channel from `dispatch`, and §01 records that _"Each of those four assertions still fails to compile, which is the property the probes exist to keep."_ They are written against the published type, so they transfer to `BehaviorKernel` unchanged and are what proves the projection survived becoming an interface. Step 6 does not need a new instrument for the narrowing half — only for the receiver half.

## 4. The rename is direct, and an alias is forbidden rather than merely unnecessary

**`KernelHost` → `BehaviorKernel`**, and the parameter renames with it: `host` → `kernel`, in `BehaviorFactory`, both spec classes' `#host` field, both controllers, and the prose that names it. Leaving the parameter as `host` keeps the implication the rename exists to remove.

**Why this name.** The package already publishes a family for _the thing as a behavior author meets it_ — `BehaviorSpec`, `BehaviorInstall`, `BehaviorFactory`, and above all `BehaviorLiftSession`, which is this exact pattern: the narrower published projection of one object, handed to every behavior. `BehaviorKernel` joins that family and makes the implements-clause honest — `class Kernel implements BehaviorKernel` says the kernel implements the behavior-facing kernel interface, where `implements KernelHost` would say the kernel is somebody's host.

**Direct, decided from the packaging contract.** `CONTRIBUTING.md` §8 governs and is unambiguous:

> **Do not preserve compatibility for an unreleased API.** … Do not keep deprecated aliases, compatibility wrappers, legacy argument forms, retired subpaths, transitional factories, old callback names, or exports kept "just in case". If the API is not yet shipped, delete the obsolete shape completely.

The package is `"private": true` at `0.1.0`, and its own README says it stays private until the merge with `@ydinjs/drag`. So an alias is not a cost decision — it is refused by repository policy, and it would leave the misleading name in the published vocabulary, which is the one place the rename is for.

**The Phase 9 freeze does not reach this, and the reason is worth stating.** The README freezes _"any change to a seam signature, or any addition to the export table"_ behind a failing-executable-case justification. A rename is neither: no seam signature moves, and the export table gains nothing. What it touches is the table's own text ([README:100, 122](../../README.md)), [`vocabulary.node.test.ts`](../../tests/kernel/vocabulary.node.test.ts), the consumer declaration suites and the probes — all of which are updated with it. The **value** export equality `tests/exports.node.test.ts` enforces is untouched, because `KernelHost` is a type.

## 5. The receiver gate, and where wrapping is required

**Measured**, one probe run through the package's own `eslint` invocation, `unbound-method` at `[2, {"ignoreStatic": true}]`:

| read site | declared type at the read | reports |
| --- | --- | --- |
| `{ cancel: kernel.cancel, destroy: kernel.destroy }` | hand-written interface, method syntax | **both report** |
| the same two wrapped in arrows | — | silent |
| `void kernel.arm` through the interface | — | type error, as intended |

**F-305's original claim comes true, and my denial of it is withdrawn.** `cancel: host.cancel` and `destroy: host.destroy` in [`sortable/controller.ts:59,64`](../../src/sortable/controller.ts) and [`free-drag/controller.ts:89,90`](../../src/free-drag/controller.ts) become reported detached reads of a prototype method, and reporting them is **correct**: after step 6 there genuinely is a receiver to lose. My earlier reasoning — that the value is contractually a plain function — held only while `cancel` _was_ a plain function, which is what the closure factory made it. The correction changes the implementation, and the gate's answer changes with it.

**The rule, stated once for the migration.** A class method that crosses into any position where it will be called without its receiver — a field of a record, a callback argument, an entry in a hook array — **is wrapped at the crossing**, never read bare and never silenced with a disable:

```
cancel: (reason?: unknown): void => { kernel.cancel(reason); },
destroy: (): Promise<void> => kernel.destroy(),
```

`destroy`'s wrapper is a plain arrow rather than an `async` one, so the memoized promise is returned **by identity** — the docblock's _settles once_ is a statement about that object.

**This is the practice the tree already established, and the two controllers are the last sites without it.** [`y.ts:269,295`](../../src/sortable/y.ts) wraps `invalidate` and `retire` for the `retireHooks` array under the comment _"the lint gate is what would have caught the bare read"_, and [`kernel.ts:2402`](../../src/kernel/kernel.ts) already wraps `fail` where it forwards to the seam driver — a wrap that survives unchanged as a method body.

**The alternative is worse and is declined on measurement.** Declaring `cancel` and `destroy` as arrow-valued instance fields removes the need to wrap, but `method-signature-style: [2, "method"]` is enforced repository-wide, so the interface must still declare them with method syntax — and the read then reports anyway, as a false positive needing two permanent disables at the library's most-read boundary. Wrapping costs one closure per member per controller, on one controller per `draggable()` call.

## 6. Clause 4 reassessed, and it changes no landed code

Clause 4 said _the published alias is the class instance type_. Its purpose was never the class type as such — it was to stop a **mapped** type being used as the boundary, because a mapped type erases method-ness and silences the gate the migration runs behind. Any _declared_ type serves that purpose. **Amended:**

> **An entity's published type is declared, never derived.** It is the **class instance type** where that type is the contract — a package-internal entity whose collaborators are named modules that already hold it. It is a **hand-written interface the class implements** where the entity crosses a tier: the recipient is handed the value, never constructs it, and must not reach members the tier does not grant. A mapped type over the entity — `Readonly<E>`, `Pick<E, …>`, a record of function-typed properties — is what remains forbidden, and each conversion still lands with a falsifier showing the gate reports through whichever form it published.

**The distinguishing question is who constructs the value.** Where the recipient is handed it, the narrow type is what it _receives_ — narrowing is the default and cannot be forgotten. Where the holder is also the constructor, narrowing is opt-in at every binding, so an interface makes the wide type the default and the boundary a thing to remember.

**Applied to the completed steps, nothing in the tree changes:**

- **`RectIndex`, `LinearShift`** — package-internal, three collaborating modules in one feature, each constructing the instance or handed it by the module that does. Class instance type stays.
- **`SeamDriver`** — package-internal, one collaborator.
- **Both behavior spec classes** — `SortableBehavior` and `FreeDragBehavior` are **module-private and export no alias at all**; `BehaviorSpec` is the protocol record their adapter returns. Clause 4 never reached them.
- **The kernel** — the one entity that crosses a tier, and the one the amended clause treats differently.

**A one-entity result is the confirming signal**: the clause was written from four package-internal conversions and is right for all of them; step 6 is the first case it did not describe.

## 7. Exposed data: the taxonomy applied

`LinearShift` and `SeamDriver` expose **no data at all** — every field is `#private`. The subject is `RectIndex`'s four accessors and the kernel's own fields.

| member | category | form |
| --- | --- | --- |
| `Kernel.realm`, `Kernel.root` | reference never reassigned | **public `readonly` field** |
| `Kernel.closed` | protects a genuine runtime invariant | **getter**, and D-38 is the reason |
| `RectIndex.values` | reassigned on growth, mutable contents | accessor returning `ReadonlyFloat64Array` |
| `RectIndex.count` | reassigned scalar | accessor |
| `RectIndex.hole` | reference never reassigned, mutable contents | accessor returning `ReadonlyFloat64Array` |
| `RectIndex.items` | reference never reassigned, mutable contents | accessor returning `readonly HTMLElement[]` |

**All four `RectIndex` accessors survive, and none for the reason currently recorded** — F-309. The docblock says _"What crosses this boundary is a read through an accessor whose type forbids content mutation … No collaborator holds a reference it can write through"_, which reads as protection against mutation. Under the correction that is not a reason for anything.

**The reason that does hold: a class field declares one type, and these four need two.** `#hole` and `#items` are references the class never reassigns, so they clear the first category — but the class mutates their _contents_ and its collaborators must not, so the owner's type and the reader's type differ. A public `readonly hole: ReadonlyFloat64Array` field cannot be written by the class that owns it, and making it work needs either a cast at every internal write — the owner deliberately escaping its own declaration, which is worse than what the rule was guarding — or a duplicate field. **An accessor is how a class gives one field two types with neither.** `#values` and `#count` need the same and are additionally reassigned.

**The interface alternative is available here and is worse.** `RectIndex` could declare a `RectIndexView` and let the axes bind `const view: RectIndexView = index`. That deletes four accessors at the cost of a second binding in two files — and it inverts the default, because the axis _constructs_ the cache and so holds the wide type unless it remembers to narrow. Which is §6's rule arriving from the other direction.

**Nothing is retained merely to prevent intentional JavaScript mutation.** The two members that would have failed that test — `realm` and `root`, had the façade become a class with getters over them — become plain `readonly` fields instead.

## 8. What step 6 must now do

1. `createKernel` → `class Kernel<Part, Activation>`, attempt trio extracted in the same pass. `arm` is a public method; the `Kernel` alias is deleted with the handle it described.
2. The `host` literal at [`kernel.ts:2365`](../../src/kernel/kernel.ts) is **deleted**. Its seven members become class members: `realm` and `root` public `readonly` fields, `closed` a getter, the rest methods. `fail`'s existing forwarding body survives as a method body.
3. `KernelHost` → `interface BehaviorKernel` in `kernel/spec.ts`, method syntax throughout, same seven members and same documentation. Direct rename, no alias (§8 of `CONTRIBUTING.md`). Parameter and field names `host` → `kernel`. README, vocabulary test, consumer declaration suites and the probes update with it.
4. **Both controllers wrap `cancel` and `destroy`.** The gate reports the bare reads; the wraps are the fix, and no disable is admissible.
5. `01-construction-ownership.md:112` and `Kernel`'s docblock stop claiming a behavior _cannot_ observe the kernel object, and state the contract instead (F-308). `arm` gains no runtime guard.
6. `RectIndex`'s boundary docblock is restated from protection to two-types-per-field (F-309). No code change.
7. **Two falsifiers**, both at real construction sites rather than probes. **Narrowing**: N-2…N-5 must still fail to compile through `BehaviorKernel` — the instrument already exists and must not be rewritten to pass. **Receiver**: detaching `cancel` in either controller fails the package `lint` recipe on the file as shipped and is clean when restored. The second is now the migration's stated sharpest hazard, caught at the site §3.4 named.

## 9. Findings

- **F-308 — the contract states a type-level narrowing as a runtime impossibility.** _"A behavior cannot arm itself, re-arm, or observe the kernel object"_ appears in `01-construction-ownership.md:112` and in the `Kernel` docblock, and was literally true only of the separate object. Corrected in prose at step 6, with no runtime guard added.
- **F-309 — `RectIndex`'s ownership docblock justifies four accessors as protection against mutation.** They survive for a different reason: a class field declares one type and these four need two. Restated at step 6; no code change.

## 10. Method

Owner correction read against `.plan/contract/00-index.md` §D-170 and its three sub-clauses, `05-lifecycle-invariants.md` §Q-17, and `CONTRIBUTING.md` §8 retrieved by section. `KernelHost` and its construction read in full; `cancel` and `destroy` traced from [`kernel.ts:697,806`](../../src/kernel/kernel.ts) into both controllers. `LifetimeScope`/`Lifetime` and `BehaviorLiftSession`/`VisualLiftSession` read at their declarations and confirmed to be one object under two types. `RectIndex` read in full; `LinearShift` and `SeamDriver` field lists enumerated; both spec classes confirmed module-private. One probe file run through the package `eslint` invocation and deleted; its rows are the table in §5. The runtime-withholding census was delegated as discovery and every citation it returned was re-read here. `package.json` and both READMEs read for the packaging and freeze contracts.