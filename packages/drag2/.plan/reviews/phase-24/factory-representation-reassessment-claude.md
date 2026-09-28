# The factory representation, reassessed against the system drag2 has become

**Run 2026-09-02** on `eb77edfa`, branch `drag2/fin-review`. The question put: the closure-factory representation was inherited rather than decided here, so is it still the right one — judged against the current lifecycle, ownership, snapshot, receiver and maintenance evidence rather than against whatever argument produced it.

**No production change is proposed and none was made.** One decision lands (D-167), two findings are recorded, and one standing condition is registered. The sketches used for the measurements below were generated outside the repository and are not checked in.

**One thing found while doing this needs the owner's eye before anything else here matters, and it is in the working tree rather than in the record — see §7.**

---

## 1. The archaeology, bounded — and the one thing it found that was not being looked for

**The premise of the question is only half right.** There is no ancestor `reorderable` package: every `reorderable` path in history is a trait module (`packages/core/src/traits/reorderable.ts`, later `packages/ydin/…`) or a review document, and its representation was module-level functions with a per-gesture closure — neither a class nor a factory. There is no class-to-factory transition commit in this lineage. The nearest match anywhere, `52e94182 refactor: use objects instead of full classes for simple controller logic`, has a one-line message with no rationale and touches the material-x controller layer, not drag.

**But drag2 does have a decision, and it is measured.** [00-index.md](../../contract/00-index.md) §Decision ledger:

> **D-4** | The behavior's runtime is **captured by closures**, not stored by the kernel. | H-2 verbatim. Alternative recorded as F-4. | replaces C-3

and F-4 carries its measurement, [`m2.md`](../../measurements/m2.md), run 2026-08-02 in Chromium with precise memory info, minimum of five runs after three warm-ups:

| controllers | closure model         | static spec + state   | ratio |
| ----------- | --------------------- | --------------------- | ----- |
| 100         | 49.8 kB (509 B each)  | 13.8 kB (142 B each)  | 3.60  |
| 1000        | 493.7 kB (506 B each) | 137.9 kB (141 B each) | 3.58  |

> the closure call is 2.5× faster than the static-spec call (0.0015 µs vs 0.0038 µs), because a captured closure is a direct call while the spec form is a property load plus an indirect call with an extra argument.
>
> So the trade is not "pay heap for ergonomics". It is **pay heap for speed on the hot path**.

**Read the arms.** M-2 compared the factory against **`static spec + state`** — a state record driven by one shared spec object. That is the question's third alternative. **The class arm was never measured, and D-4 never considered it.** So D-4 is a real decision with real evidence, and its evidence covers two of the three representations at issue.

**The governing rule is permissive in both directions.** [CONTRIBUTING.md §10](../../../../../CONTRIBUTING.md):

> Use a class when the class itself provides required semantics: public identity, `instanceof`, stable error behaviour, or meaningful lifecycle identity. For internal records, commands, handles and carriers, a plain object or function may be smaller and clearer. Do not replace an accepted public class merely for bundle size.

It is not a preference for closures, and its last clause restrains de-classing rather than classing.

**And the immediate predecessor package measured the class arm, against a per-gesture object.** `packages/drag/.plan/experiments/02-classes.md` took a ~540-line `FreeDragGesture` class — 2 readonly fields, 5 mutable resource fields, ~14 private methods, which is the shape of drag2's per-operation state — and tried both replacements:

> ### 2a. Closure factory (first attempt — _not_ the planned design)
>
> … Runtime **worse**: allocates ~14 closures + the `s` object _per gesture start_. Rejected on both axes and discarded.
>
> ### 2b. Mutable context + module functions … Size: still a **small regression**, ~40–70 bytes.
>
> On this toolchain, **classes are already the compact, allocation-cheap form** for stateful per-gesture objects; declassing does not pay at default field naming.

**That finding does not transfer, and the reason is the axis this whole question turns on.** drag/02 measured a **per-gesture** object; drag2's factories are **per-controller**. `createKernel` runs once per `draggable()`, `createSortableSpec` once per controller. A cost that recurs on every press and a cost paid once per list are not the same cost, and the two records reach opposite conclusions because they are measuring different objects. Neither is wrong.

**What is not recoverable**: whether drag2 knew about drag/02 when it chose. I am not reconstructing that, and nothing below depends on it.

---

## 2. The seven questions, answered against `eb77edfa`

The question was posed from the maintainer's seat: can these distinctions be seen and preserved? Answered per category, with the count that makes the answer checkable.

| Category | Where it lives today | Visible? |
| --- | --- | --- |
| **Stable instance dependencies** | `createKernel`'s `realm`, `queue`, `ingress` — `const`, lines 198–200 | **Yes, weakly.** `const` marks them, but so does it mark the 64 methods beside them |
| **Mutable entity state** | 29 `let` bindings in `createKernel`; 11 in `createSortableSpec`; 6 in `createFreeDragSpec` | **Partly.** `let` marks mutability and nothing else |
| **Per-operation inputs** | 9 of the kernel's 29 `let`s, plus `resolution`/`settlement`/`settlementInput` | **No.** Distinguished only by a comment banner — `/* ---- per-operation state, all cleared by retirement ---- */` — and enforced by two hand-written clear functions, `clearOperationState` (9 assignments) and `retireAttempts` |
| **Deliberate snapshots of a live value** | 16 sites across the three factories alias a closure `let` into a local; ~58 destructuring sites package-wide alias a record field | **No, and this is the sharp end.** §3 |
| **Functions depending on lexical capture** | All 64 kernel closures; all 12 sortable-spec closures | **Yes** — that is what the factory is |
| **Callbacks depending on receiver-free invocation** | 10 detached-reference sites in `kernel.ts` alone (`unwind(spec.retire)`, `owned.presentation.use(session.dispose)`, `drain(queue, handle, panic)`, `addEventListener(POINTER_DOWN, onPointerDown, …)`, `unwind(lifetimes.presentation.dispose)`, …), plus `cancel: host.cancel` / `destroy: host.destroy` spread into both controllers, `fail: driver.requestFailure`, `scope.motion.use(spatialFrame.cancel)` | **No.** Nothing marks a member as safe to detach, and §5 shows the one place the package already gets this wrong |
| **Where the representation hides them** | `createKernel` | §2.1 |

### 2.1 The one place the factory measurably fails

`createKernel` is a **2 240-line closure**. Its 29 mutable bindings are read as bare identifiers at these distances from their declaration:

| binding | declared | reads | farthest read | span |
| --- | --- | --- | --- | --- |
| `spec` | 202 | 31 | 2427 | **2 225** |
| `draft` | 204 | 29 | 2423 | 2 219 |
| `current` | 203 | 57 | 2419 | 2 216 |
| `lifetimes` | 208 | 15 | 2209 | 2 001 |
| `settlement` | 240 | 33 | 2186 | 1 946 |
| `visual` | 211 | 33 | 1626 | 1 415 |
| `originRect` | 210 | 7 | 1459 | 1 249 |
| … 22 more, median span ≈ 1 200 |  |  |  |  |

A maintainer standing in `joinSettlement` at line 1588 reads `lift`, `visual`, `box` and `originRect` as ordinary identifiers. Nothing at the point of use says _this is entity state, it is nullable, and retirement clears it 1 380 lines above_.

**The navigation evidence is mechanical.** `documentSymbol` over `kernel.ts` returns a single flat alphabetical list under `createKernel` in which

- `realm (Constant) - Line 198` — a stable dependency,
- `visual (Variable) - Line 211` — per-operation state,
- `joinSettlement (Constant) - Line 1588` — a method,
- `dx (Constant) - Line 1821` — a local inside a method

are four entries of the same two kinds. The outline has exactly two categories, `Variable` and `Constant`, for four semantic ones, and `Constant` covers both `realm` and `joinSettlement`. A class outline would separate 29 fields from 64 methods from 3 public members without anyone writing a comment. **This is a real, structural loss, and it is the strongest thing that can be said against the current representation.**

It is also confined. `createSortableSpec` has 11 mutable bindings and returns a nested protocol literal whose shape is dictated by `BehaviorSpec`; `createFreeDragSpec` has 6. Every other factory in the package — `createActionQueue`, `createLifetime`, `createInvalidator`, `createUnwind`, `createRealm`, `createRectIndex`, `makeSession` — is small enough that declaration and use are on one screen.

---

## 3. The destructuring difficulty: incidental, or structural to the factory?

**Structural — but to something else, and that is the finding.**

The 16 sites where a local aliases a closure `let` are the factory's contribution:

```
kernel.ts:406  const previous = current        kernel.ts:1542 const space = visualSpace
kernel.ts:475  const active = spec             kernel.ts:1961 const request = cancelRequest
kernel.ts:562  const running = tail            sortable/spec.ts:761  const ledger = placeholderUndo
kernel.ts:609  const settle = settleDestroyed  sortable/spec.ts:1260 const view = presentation
free-drag/spec.ts:536, :588  const origin = originRect        … and 5 more
```

Each is a deliberate snapshot of entity state, and each reads as a plain local. Under a class each would read `this.#originRect` — self-evidently a field read. **16 sites.**

**The other ~58 are not the factory's, and no representation change touches them.** They alias fields of records passed as parameters — `const { values, count, hole } = index`, `const { phase } = draft`, `const { x } = home` — where `index` is a `RectIndex` whose `values` buffer `refresh` may _replace_, `draft` is a live frame the seam mutates, and `home` is a **consumer-owned point whose accessors may be live**. Whether the enclosing function is a method or a closure changes nothing about any of them.

**And the difficulty is real, at a level worse than "hard to review".** `free-drag/spec.ts` documents its own read/write ordering in twenty-seven lines above the site:

> **Each axis is read exactly once, and the reads precede the writes.** The cache removes the allocation and nothing else: reading `home` twice, or writing `anchor.x = home.x` and then `anchor.y = home.y`, would still be two reads of a live accessor — the second separated from the first by a field write. The destructuring below is the copy this seam already owed.

Driven against V8, the two forms are:

```
shipped                        :  read home.x | read home.y | write anchor.x | write anchor.y
({x: anchor.x, y: anchor.y} = home) :  read home.x | write anchor.x | read home.y | write anchor.y
```

The second form is the one the comment forbids, and it is one mechanical rewrite away — destructuring assignment into member expressions evaluates each target reference, read and write in source order. The comment saying so sits directly above the line and does not move when the line does.

**So: the alias problem is owned by mutable records whose read/write timing is load-bearing and stated only in prose.** A class conversion would address 16 of ~74 sites and leave the dangerous ones — the ones crossing a seam or touching a consumer accessor — exactly as they are. **Buying a package-wide rewrite to fix under a quarter of the problem, none of its severe end, is not a trade this package should take.**

---

## 4. The three alternatives, measured

Since no arm in this package's record covers classes, one was built. A generated sketch at `createKernel`'s scale — **29 mutable fields, 64 methods, three field accesses per method body** — in all three representations, bundled with the same toolchain the size bench uses (`rolldown`, `minify: true`, brotli):

| representation                       | minified | brotli  | Δ brotli   |
| ------------------------------------ | -------- | ------- | ---------- |
| closure factory                      | 2 694    | **578** | —          |
| class, `#private` fields and methods | 6 208    | 680     | **+102 B** |
| record + module functions            | 12 580   | 798     | +220 B     |

| representation            | construct + run, 200k | run only, 200k |
| ------------------------- | --------------------- | -------------- |
| closure factory           | 121–139 ms            | 54–55 ms       |
| class                     | **43.5–43.9 ms**      | **42–44 ms**   |
| record + module functions | 46.2–46.4 ms          | 42.3–42.9 ms   |

**What holds up.** The minifier mangles `#private` fields and methods to one character (`#e`, `#k`) — drag/02's claim, still true on `rolldown` 1.1.5. A record's property keys mangle **not at all** (`e.stateFieldNumber18` survives verbatim), which is why the third form is twice the minified size of the second and 4.7× the first. **The class does not regress runtime**: it constructs ~2.8× faster than the factory, because 64 closures per instance become one object plus a shared prototype, and it is not slower on the call path.

**What does not, and must be said plainly.** This sketch has three field accesses in a two-statement method — an access density far above real code, so `+102 B` is an upper bound and the real figure for classing `kernel.ts` would be smaller. The timings are Node, synthetic, and 200 000 constructions of a controller is not a workload this library has: **drag2 builds one controller per list and one operation per gesture.** The construction advantage the class shows is real and lands on nothing.

**Against M-2 the sketch disagrees in direction, and the arms explain it.** M-2 found the closure call 2.5× _faster_ than its static-spec arm; the sketch finds the record form slightly faster. M-2's arm went through a spec **property load plus an indirect call**; the sketch's calls a module-level function directly. Both are correct about what they measured. **I am not overturning M-2, and nothing here should be read as having done so** — it was a real browser, precisely instrumented, and this is a model. What the sketch establishes is narrower and sufficient: **on the current toolchain a class is not a performance regression and costs bytes in the low hundreds.** Performance does not veto the class option. It simply does not recommend it either.

---

## 5. The risks, and the one that decides it

- **Receiver-sensitive invocation — and the package already has this bug.** `LifetimeScope` is published from `./kernel.js` and its `useWhile` is implemented as `this.use(() => …)` (`kernel/lifetimes.ts:81`). It is **one of exactly two `this.` in the entire `src/` tree**; the other is `DraggableError`'s constructor. Every sibling on the package's public and internal surfaces is receiver-free and is _relied upon_ to be — `cancel: host.cancel` and `destroy: host.destroy` are spread through both controllers detached. A behavior author who writes `const { useWhile } = scope` gets a `TypeError`. **Recorded as F-274.** The point for this question: the factory representation did not prevent receiver sensitivity, it only made the one instance invisible.

- **Binding and arrow-field allocation — this is the decisive one.** The package's disposal, reporting and unwind protocols are **receiver-free function-value protocols**. `Disposer` is `() => void`; `unwind(fn)` takes fourteen bare references; `lifetime.use(session.dispose)`, `unwind(spec.retire)`, `unwind(lifetimes.dispose)`, `drain(queue, handle, panic)` and both `addEventListener` registrations all pass a member detached from its object. Making any of those objects a class requires every detached member to be an arrow field or a bound function — **which allocates one closure per instance per member, reinstating exactly the per-instance closure cost that is the class's only measured advantage.** For `Lifetime` and `PresentationSession`, allocated per operation, that is the whole of the gain. The classes drag2 could most cleanly justify are the ones for which the conversion pays for nothing.

- **Per-operation state on a long-lived instance.** Named as a risk of classing; **it is the current state of the code.** Nine per-operation fields live on the controller-lifetime closure and are returned to `null` by a hand-written list. A class would inherit that shape unchanged. §6 is the answer to it, and it is not a class.

- **God-object shape.** Likewise already present. `createKernel` is a 2 240-line scope with 29 mutable bindings and 64 functions, all of which can reach all of the state. A `Kernel` class would be an honest name for it rather than a new problem — but naming it does not decompose it.

- **Testing.** Low risk in both directions. Tests drive `createKernel` through `draggable()`/`arm()` and exercise `createLifetime`, `createRectIndex`, `createActionQueue` through their published shapes. Nothing reaches inside a closure, so nothing would need to reach inside a class.

- **Navigation.** The one axis where classing wins outright. §2.1.

---

## 6. The narrowest boundary that is worth crossing — and it is not a class

**A class should correspond to an entity with a stable lifetime, owned dependencies and meaningful invariants.** Applying that test rather than assuming the conclusion:

| candidate | stable lifetime | owned dependencies | invariant | methods | verdict |
| --- | --- | --- | --- | --- | --- |
| `Kernel` | yes | yes | yes | 64 | **The best class case, and still declined.** Its members are the ones passed detached; §5 |
| `BehaviorSpec` producers | per controller | yes | the protocol's | nested groups | **No.** A vtable whose shape is fixed by an interface, with `activation`/`action`/`release`/`settlement` sub-objects that would be literals anyway |
| Controllers | — | none | none | 3 | **No.** Stateless adapters; `createSortableController` holds nothing |
| `Lifetime`, `PresentationSession` | per operation | yes | yes | 3, 2 | **No** — their members are the detached ones. §5 |
| `RectIndex` | per controller | Float64Array buffers | `dirty`/`measured`/`count`/`items.length` coherent | 4 | **The one honest class in the package** — and note it already simulates a receiver, declaring `let index: RectIndex` before the literal so a method can call `index.retire()`. Not worth converting alone |
| **The operation** | **admission → retirement** | **`lifetimes`, `lift`, `visual`, `box`, `item`, `originRect`, `visualSpace`, `pinned`, plus the two attempts** | **all live or all dead together** | **none** | **This is the boundary.** And it needs no class |

**The operation is the entity the code does not name.** Twelve correlated nullable bindings, cleared by two hand-written functions that must be kept in step with the declarations 250 lines above them, distinguished from stable dependencies by a comment. Collapsing them into **one nullable record with the operation's lifetime** — `let operation: Operation | null` — would:

- answer _which values are per-operation inputs_ **in the type**, where a comment banner answers it now;
- replace nine assignments and a second clear function with `operation = null`, making the all-live-or-all-dead invariant something the compiler holds rather than something a reviewer checks;
- mark every read as `operation.visual` — a field read, greppable, and distinguishable from a local, which is the §3 gain the class was wanted for, at the 16 sites where the factory actually contributes;
- cost **one object per gesture** — a human-scale event, not a hot path — and roughly twelve unmanglable property keys, which is the measurable price and the reason it needs a measurement before it lands.

**It stays inside the closure**, which is what keeps it a narrowing rather than the third representation applied wholesale: the record never crosses a tier boundary, so it never becomes reachable state the way a threaded `ctx` would. That distinction is what makes alternative 3 safe here and unsafe in general — the package's encapsulation of feature-private state is stated as a contract (`sortable.ts`: _"which is what keeps a feature's private state unreachable from the behavior, the kernel, or a sibling feature"_), and a threaded context record gives it away.

**Recorded as F-273, tier C, with a measurement required before it lands.**

---

## 7. What the maintainability problem actually needs — and one thing that needs an answer first

**The working tree at `eb77edfa` holds an uncommitted modification to `src/free-drag/spec.ts`.** I did not make it, I have not touched it, and it is not staged in this pass's commit. It is an alias-elimination sweep of nine sites, and **two of its edits change semantics**:

1. It replaces the `home` copy with `({ x: anchor.x, y: anchor.y } = slots.home(…))`, which produces the interleaved read/write order the twenty-seven-line comment immediately above it exists to forbid (§3). Against a getter-backed `Point` — a shape the same comment calls _"a legitimate shape rather than misuse"_ — the two axes may come from two different points.
2. It removes `const { request } = draft` from the head of `settlement.prepare` and reads `draft.request` at four use sites inside the switch, moving each read to after the resolution arm has run. The original was a snapshot taken before that; whether the value can differ requires reading the whole arm to answer, which is precisely the reconstruction cost that prompted this question.

**This is the strongest evidence in the whole reassessment, and it points away from the representation.** Both edits are in a `spec.ts` seam operating on records passed as parameters. Neither would have been prevented, flagged, or made more visible by a class.

**So the correction is a rule and an instrument, not a rewrite.** What the package is missing is a way to say _this read's timing is load-bearing_ in something other than prose — the same gap `maintainability.md` diagnosed for citations, in a different register. The shape of that rule is out of scope here and belongs to whoever takes F-273; what this pass establishes is that **no representation change substitutes for it**, and that a pass tidying aliases without it can silently break an invariant the code documents in detail.

---

## 8. What is decided

**D-4 is retained and is not amended.** Its subject — the behavior's runtime is captured by closures rather than stored by the kernel — is supported by M-2's measurement, and nothing found here disturbs it. What is true, and is registered rather than folded into it, is that **its evidence covers the record arm and not the class arm** (SC-7).

**D-167 extends the rule to the territory D-4 never covered** — the kernel's own state and the behavior specs — and settles it the same way: closure factories and free functions are retained, classes are not adopted, and CONTRIBUTING §10 continues to govern the exceptions. The argument is not that classes are worse. It is that the class's measured advantages (construction cost, navigation) land on a workload this library does not have or are cancelled by the detached-member protocol it is built on, while the maintainability problem that motivated the question lives in records rather than in the factory and would survive the conversion intact.

**F-273** — the operation record, the one narrowing worth making, with the measurement it owes. **F-274** — `useWhile`'s receiver dependence on a published SPI object. **SC-7** — what would reopen this: a measured class arm at controller scale, or a per-gesture object growing enough state to make drag/02's finding transfer.

## 9. Method

Archaeology was delegated and every load-bearing quotation re-read here: CONTRIBUTING §10, `packages/drag/.plan/experiments/02-classes.md`, D-4's ledger row and `measurements/m2.md`. The subagent's negative result — no ancestor package, no transition commit — was accepted as a negative; **its conclusion that no decision existed was wrong, and D-4 was found by reading F-4's row in this package's own findings register.** The binding-distance and alias-site tables are produced by scripts over the tree at `eb77edfa`. The `documentSymbol` outline is the language server's. The evaluation-order result in §3 was driven, not reasoned. The three sketches were generated outside the repository, bundled with the repository's own `rolldown`, and are not checked in; their timings are two consecutive runs, reported as a range.