#### DRD-63 — The owner's class conversions keep every published slot type an interface, and every built-in method passed with its receiver declares `this`

**Status:** active, decided on 2026-11-14 by the architect on the owner's uncommitted class refactor (diff `019cd456…c508` against `5b581fbdf`). It reads the [verification report](../owner-refactor-verification-report.md) at `00fc1aa28` and the [feature proof](../reviews/owner-class-refactor/proof-reviewer.md) at `b4bca69f7` ([assessment](../owner-class-refactor-assessment.md)). Amends `DRD-34` property 8, `DRD-35` property 7, `DRD-37` property 4, `DRD-61` property 6 and two statements of `DRD-33`, and applies `DRO-13`. [`owner-class-refactor-handoff.md`](../owner-class-refactor-handoff.md) implements it. **When decided, not implemented, and the refactor not accepted.** **Property 5 was revised on 2026-11-14 on the owner's answer to Q2:** the reads stay inline, the getters stay, and the false "read once" comments go. The owner holds Q1, Q3 and Q4, and Q1 and Q3 have defaults. **Remediated at `42f42a164`** from the snapshot's commit `d1df32018` ([report](../owner-class-refactor-report.md) at `6ec32ad06`), and **rechecked** at `8a4548e96` ([recheck](../reviews/owner-class-refactor-remediation/recheck-reviewer.md)). **Property 2 was revised in place on 2026-11-14 on `class-refactor-recheck-1`:** the declared receiver is the type through which the site reads the member ([assessment](../class-refactor-recheck-assessment.md)). [`class-refactor-receiver-handoff.md`](../class-refactor-receiver-handoff.md) implements the revision. Q1 was built on its default. **Implemented at `c9e728bad`, reported at `f6b4bdf4c`, rechecked at `cb24e927e` and accepted on 2026-11-15** ([assessment](../class-refactor-acceptance-assessment.md)). The owner accepted the end's costs (Q4), with budgets unchanged and no speed claim. Q3's defaults stand. `class-refactor-reviewer-1` to `-6` and `class-refactor-recheck-1` are closed **Property 2 is superseded on 2026-11-15 by `DRD-69`.**

**The owner's conversion of the built-in closures to classes is adopted in form, on the properties below:**

- `DropTargetTracker` and `MotionConstraint` stay published interfaces, which module-private classes implement.
- Every built-in method that `requestStep` or `use` receives with its receiver declares `this` as the type the site reads it through. So passing the method alone fails typecheck, and so does passing it with another built-in as the receiver.
- Behavior equals `5b581fbdf`'s on every path, including a fresh `bounds` constraint.
- Dev-only state is typed, and is absent from the publication.
- The scan reads stay inline, through `RectIndex`'s getters, on the owner's decision. No comment says that they are read once.

**The refactor is accepted only after its remediation, an independent recheck and the owner's reading of the costs.**

**Implemented at `c9e728bad` and accepted on 2026-11-15** ([acceptance assessment](../class-refactor-acceptance-assessment.md)). The owner accepted the costs at the end (§Costs).

Decided on 2026-11-14 by the architect on the owner's refactor. The refactor is an uncommitted snapshot on `drag/class-refactor`: its tracked diff against `5b581fbdf` has SHA-256 `019cd456…c508`, and its 16 files are listed in [`input/hashes.txt`](../measurements/2026-11-14-owner-refactor/input/hashes.txt). The decision reads the snapshot with the [verification report](../owner-refactor-verification-report.md) at `00fc1aa28` and the [feature proof](../reviews/owner-class-refactor/proof-reviewer.md) at `b4bca69f7`. Assessment: [`owner-class-refactor-assessment.md`](../owner-class-refactor-assessment.md). [`owner-class-refactor-handoff.md`](../owner-class-refactor-handoff.md) implements it.

**Adopted from the snapshot, in form:**

- **The classes:**
  - `FrameTask`, which replaces `createFrameTask`;
  - the drop-target tracker, the `bounds` constraint, `layoutAnimation`'s sink, `linearShift`, `y()` and `xy()`, each as a class with `#private` state and prototype methods.
- **`Retirable` and `Invalidatable`,** as supertypes of `InsertionGeometry`, `DisplacementSink` and `RectIndex`.
- **The receiver forms:**
  - `sortable`'s `invalidate` step is a prototype method of `SortableBehavior`, requested with `behavior` as its receiver, and it coalesces by the pair;
  - the tracker's release and resolve are private methods passed with the tracker.
- **`layoutAnimation`** as a function declaration.
- **The field order** in both behaviors.

The box-quad edit is box-quad's, and the proof found it equivalent. This register decides nothing about it.

**Required properties:**

1. **Published slot types are interfaces.**
   - `MotionConstraint` from `free-drag/bounds.js` and `DropTargetTracker` from `free-drag/drop-targets.js` are exported as interfaces, because a third party implements them (`DRO-13`, CONTRIBUTING §TypeScript).
   - Each class that implements one is module-private, declares `implements`, and is named apart from the interface.
   - The published `free-drag/bounds.d.ts` and `free-drag/drop-targets.d.ts` equal `5b581fbdf`'s.
   - **Witness:** a declaration test types three cases through the entries: a third party's own `DropTargets` that returns its own tracker; one whose tracker wraps the built-in one; and a `BoundsInstaller` that returns its own constraint. If either type is exported as a class with `#private`, that test fails.
2. **Receivers are declared.**
   - Each built-in method that is passed to `requestStep` or `use` with its receiver declares its `this`, so the overload without a receiver refuses it.
   - That covers `DRD-35` property 7's three members, as `sortable` reads them through `InsertionGeometry` and `DisplacementSink`. It also covers the three sites that the conversions add: `sortable`'s `invalidate` step, the tracker's release and the tracker's resolve.
   - Where a member is declared through `Retirable` or `Invalidatable`, that declaration carries `this`.
   - **The declared receiver is the type through which the site reads the member,** so a receiver of another built-in type is refused, as at `5b581fbdf`:
     - `InsertionGeometry` for the axis's `retire` and `invalidate`, at sites 1 and 2;
     - `DisplacementSink` for the sink's `retire`, at site 3;
     - `SortableBehavior` for its `invalidate`, at site 4;
     - the tracker's class for its release and resolve, at sites 5 and 6.

     A receiver typed only as `Retirable` or `Invalidatable` doesn't meet this, because every built-in that has the member satisfies the supertype. Types are structural, so this doesn't refuse another object of the same type, such as a second axis. The form is the implementer's, and it costs no bytes.

   - `tests/callbacks.declaration.test.ts` keeps every existing line, and passes. Its descriptions say that `retire` declares the axis and the sink as its receiver, and the declarations make that true.
   - **Witnesses:**
     - removing the receiver at any of the six sites fails typecheck;
     - `drag:DRD-63` cases appended to `tests/callbacks.declaration.test.ts` pass the axis's `retire` with the sink as its receiver, the sink's `retire` with the axis, and the axis's `invalidate` with a `RectIndex`. Each one fails typecheck. Declaring the receivers as `Retirable` and `Invalidatable` again, as at `42f42a164`, makes each case fail.

   _Revised in place on 2026-11-14 on `class-refactor-recheck-1`_ ([assessment](../class-refactor-recheck-assessment.md) §2). This property used to say only that a declaration through `Retirable` or `Invalidatable` carries `this`. A receiver of the supertype met that, and it accepts a swapped receiver, which then throws on the other class's private fields.

3. **Behavior equals `5b581fbdf`'s.**
   - Each converted unit does what its closure did on every path. That includes one that no host takes today: a fresh `MotionConstraint` measures at its first `apply`, before any `invalidate()`.
   - **Witness:** a test applies a fresh constraint, with a source and without one, and expects the clamp.
4. **Dev-only state.**
   - `src` carries no `@ts-expect-error` and no `@ts-ignore`.
   - State that only `__DEV__` code reads or writes is typed, and isn't on the class's public surface (CONTRIBUTING §Class encapsulation).
   - The publication carries none of it, as at `5b581fbdf`. A class field ships whatever its initializer, so such state can't be a field of the class.
   - **Witness:** misspelling the development flag at one write fails typecheck, and `DRD-52`'s development check still fails under its witness.
5. **The scan reads stay inline, and no comment says otherwise.** This is the owner's decision of 2026-11-14 on the assessment's Q2.
   - The reads that the snapshot moved into their loops stay there, as the snapshot has them:
     - `y()`'s resolution: the index's `first` and `end`, and the pointer's y;
     - `xy()`'s resolution: the index's `count`, and the pointer's x and y;
     - `xy()`'s `moved`: the displacement;
     - `linearShift`'s refresh: the index's `count`.
   - `RectIndex` keeps `first`, `end` and `count` as getters.
   - **No comment says that a value is read once, or outside a loop, unless the code does that.** In the snapshot, two comments say so and are false:
     - `linear-shift.ts`'s "Read once, outside the loops.", which no longer stands above any read;
     - `RectIndex`'s class comment, which says that each axis rule reads its slot range once per resolution.

     Each one is removed, or corrected to state what the code reads. The comments that are true stay: `y.ts`'s comment above the placeholder's anchor, `rect-index.ts`'s "Read once: each is used twice below." and `drop-targets.ts`'s comment above the drag's `x` and `y`.

   - **The owner approves the per-candidate reads under CONTRIBUTING Part II §14,** on the existing readings:
     - case C of the `xy()` harness: higher in 7 of 7 rounds, inside the A/A bound, so no difference shown;
     - a temporary Godbolt (Compiler Explorer) probe, which gave identical optimized loop bodies for six variants. It is a diagnostic for that example and that engine, and not a timing result for drag ([`performance-plan.md`](../performance-plan.md) §1). **Its files weren't kept** ([remediation report](../owner-class-refactor-report.md) §Commit A), so the record holds only its reported result. The owner's approval doesn't depend on reading it again ([recheck assessment](../class-refactor-recheck-assessment.md) §3).

   _Revised in place on 2026-11-14 on the owner's answer:_ this property used to restore the hoisted reads by default, and left their approval to the owner.

6. **The project includes the probe.** `tsconfig.json` equals its text at `5b581fbdf`, as `DRD-60` property 2 requires, and drag's lint exits 0.
7. **Unchanged:**
   - `DRD-20`'s binding and lifetime rules;
   - `DRD-33` C1 to C10, and its tracker order: allocate, register the release, then pull `targets()`, now in the constructor;
   - `DRD-35`'s coalescing by the pair;
   - each per-operation object is released with its operation, and each per-controller object at destruction, as the proof witnessed;
   - DRI-1 to DRI-21;
   - every budget.

**What this amends:**

- **`DRD-35` property 7:**
  - `sortable`'s `invalidate` step leaves the list of steps that keep their form. It is a method passed with `behavior`.
  - The three members' receiver declaration extends to every built-in method passed with its receiver (property 2).
- **`DRD-34` property 8,** as `DRD-35` amends it: the same for `sortable`'s `invalidate` step. `freeDrag`'s step keeps its form.
- **`DRD-37` property 4:** typecheck guards every site that property 2 names. Its reason and its accepted consequence now cover them all.
- **`DRD-61` property 6:** "holds `dx` and `dy` in closure variables behind getters" now reads "in private fields behind getters".
- **`DRD-33`:**
  - the owner's term "the owner's closure-based `layoutAnimation`" is superseded by the owner's class form;
  - "The factory runs in this order" applies to the tracker's construction.

**`DRO-13` is unchanged.** Property 1 applies it.

**What this supersedes.** Property 5 supersedes the hoisted reads that the [feature-composition handoff](../feature-composition-handoff.md) required ("each axis reads the getters once per resolution, outside the candidate loop") and that the [alias cleanup](../alias-cleanup-report.md) kept. Both records stay as history.

**Withdrawn by the owner on 2026-11-14:** the proposal to replace `RectIndex`'s getters with methods. The record never held it, and nothing replaces it.

**Rejected:**

- **Closing the two slots to third parties.** It would reverse `DRO-13`, `DRD-33` choice 4 and the contract's Capabilities paragraph. The class form doesn't need it, because one `implements` keeps it.
- **Leaving a missing receiver to the suite.** The reason that `DRD-37` gave for turning the lint rule off would then hold at no built-in site.
- **A runtime check for a missing receiver** (CONTRIBUTING Part II §1.1).

**Costs.** They are reported and not accepted, as `DRD-20` left the class form's costs for the owner to read.

- **The snapshot's size,** against `5b581fbdf`:
  - Brotli: −32 to +40 B per row. Two red rows grow: "freeDrag + bounds + landing" by 40 B and "complete" by 18 B. "freeDrag" shrinks by 2 B;
  - minified: +53 to +895 B per row.
- **The snapshot's allocation:**
  - −118 to −732 B per controller lifetime;
  - −728 B retained after 200 operations and destruction;
  - about +24 B per committed move over `y()`'s first 200 cold moves, which falls as the code warms up.
- **Timing:** no difference shown, which is inconclusive.
- **What the properties cost, by reading:**
  - properties 1 and 2 are types, so they cost no bytes;
  - property 3 is one initial value;
  - property 4 changes bytes;
  - property 5 changes comments only.
- **The handoff measures size and allocation again at its end,** and the owner reads those figures before acceptance (the assessment's Q4).
- _Corrected on 2026-11-14:_ three red rows grow at the snapshot, not two. "example: drop zone" also grows, by 8 B Brotli. **The figures at the remediated end** are in the [recheck assessment](../class-refactor-recheck-assessment.md) §4.
- **Accepted by the owner** (Q4), recorded by the architect on 2026-11-15 at the owner's instruction, at the remediated end's figures in the [recheck assessment](../class-refactor-recheck-assessment.md) §4. The receiver follow-up left every emitted `.js` file byte-identical to `42f42a164`'s, so those figures are final ([acceptance assessment](../class-refactor-acceptance-assessment.md) §4):
  - size against `5b581fbdf`: Brotli −32 to +39 B and minified 0 to +895 B per row. The five red rows are those of `5b581fbdf`, and three of them grow: "example: drop zone" by 8 B Brotli, "freeDrag + bounds + landing" by 39 B and "complete" by 18 B;
  - allocation: +21.9 B per cold committed move on `y()`, which falls as the code warms up, and −420.3 to −442.7 B per `y()` lifetime;
  - timing: no difference shown at the snapshot, which is inconclusive.

  **Budgets are unchanged:** the acceptance re-bases nothing, and the red rows stay red until a re-base under `DRO-4`. **No speed claim is made,** and no timing campaign is owed.