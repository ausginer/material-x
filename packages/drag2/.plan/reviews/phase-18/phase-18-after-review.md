# D-77 landing review — the required first argument

Independent review of the landed D-77 step only (commit `e331adfb`, _"drag: address second pre-phase 19 gate"_), against `.plan/plan.md` §Phase 19's second gate, `.plan/contract/00-index.md` D-77, `03-feature-composition.md` §Assembly / §Validation / §Public option domains, `05-lifecycle-invariants.md` §The required first argument, `07-free-drag-contract.md` §Validation and B-9, and the parity ledger.

Gates re-run unchanged from `packages/drag2`: `npx just typecheck` clean; `npx just test` — **38 files, 832 passed, 25 skipped, no type errors**; `npx just lint src/sortable src/sortable.ts` clean; `npx just size` reproduces the README's D-77 table byte for byte. One temporary compiled probe was used for P18A-04 and removed afterwards.

**The implementation is correct.** All five review axes hold in code: the required-first-config surface, the `AxisInstaller` typing, the five deletions, the unwind ordering around the slot record, and B-9's three clauses. No free-drag production code landed. Every finding below is in the **documentation, coverage and evidence layer** — stale normative prose the commit did not carry forward, one contract claim that is empirically false, one load-bearing measurement with no artifact, one retained check that almost nothing pins, and one part of the change that the commit could not carry at all.

## Verdict

| Axis | Result |
| --- | --- |
| Required-first-config surface | **Correct.** `sortable(root, config: SortableConfig, ...fragments: ReadonlyArray<Partial<SortableConfig>>)` (`src/sortable.ts:115-121`) matches 00-index:329, 05:612 and the README. Merge threading verified. Two stale doc sites (P18A-01, P18A-02). |
| `AxisInstaller` / `y()` / `xy()` typing | **Correct.** The intersection makes `insertion` required and refuses a plugin-shaped installer. Three doc sites still describe the pre-D-77 shape, and one of them was already false (P18A-03, P18A-04, P18A-05, P18A-06). |
| Removal of superseded runtime validation | **Correct and complete.** Six explicit sortable-construction checks → one (`claim`). Survivors all satisfy the new rule. Doc-vs-doc and doc-vs-code disagreements at P18A-07, P18A-09, P18A-10, P18A-11. The empirical premise is unwitnessed (P18A-08), and the one **retained** check is the thinnest-covered thing in the change (P18A-19). |
| Unwind safety around slot-record construction | **Correct, and pinned in the strong form.** The record is inside the bracket, `reverse()` is after the last throwing statement, the test asserts retirement and not only the throw. Scope of "total" is narrower than stated (P18A-12, P18A-13). |
| B-9 (a) compile | **Satisfied for the sortable.** Five live `@ts-expect-error`s. The `freeDrag` pair is correctly deferred under D-69's marked row. |
| B-9 (b) positive | **Satisfied.** One gap between what B-9 says the fixture asserts and what it asserts (P18A-14). |
| B-9 (c) later `Partial`/`undefined` | **Satisfied.** Asserted only below the public entry (P18A-15). |
| Implementation vs normative docs | **Do not fully agree.** Fourteen findings below carry a doc-vs-code or doc-vs-doc disagreement; P18A-03, P18A-04 and P18A-07 are the load-bearing ones. |
| No free-drag production code | **Confirmed.** |
| 07's forward half (Phase 19) | **Signature, §Validation, parity row and B-9 all consistent.** B-4 (a)'s amendment prescribes a technique that does not compile (P18A-20). |
| Contract 02's one-line change | **Cosmetic.** An `oxfmt` italics normalization at `:748`; no semantic content. |
| Landing integrity | **One defect.** Part of the change is in a gitignored file (P18A-16). |

## What I verified positively

Recorded so the findings are read against a checked baseline, not an unchecked one.

- **The signature and the merge threading.** `sortable()` → `createComposedSortableBehavior(config, fragments)` → `mergeFragments(config, fragments)` (`src/sortable.ts:120`, `src/sortable/behavior.ts:73-98`, `src/sortable/config.ts:155-195`). The `undefined` skip at `config.ts:174` is the sole surviving guard and is reached by the required argument and the fragments on the same path.
- **`AxisInstaller`'s required member actually binds.** `SortableContribution & Readonly<{ insertion: InsertionGeometry }>` (`src/sortable/feature.ts:191-193`) makes an optional-in-one/required-in-the-other property required in the intersection; `tests/revision/revision-2.ts:422-424`'s `@ts-expect-error` on `axis: installMyPlugin` is live, and `tsc` errors on unused directives, so a green typecheck is the assertion.
- **The five deletions, individually.** `assemble.ts`'s three required-slot checks and its axis-geometry check are gone (diff against `ea01013a`); `requireFinite` is deleted from `slots.ts` along with all three call sites; `behavior.ts`'s `typeof config.items === 'function'` guard is gone and `merged.items()` is called unguarded at `behavior.ts:94`, evaluated **before** `assemble()` in argument order, which is what makes 05:612's "breaks the consumer's own `sortable()` call" true — `draggable()` invokes the factory synchronously (`src/kernel.ts:246-250`).
- **The survivors all satisfy the new rule.** `claim` (`assemble.ts:31-52`) is an invariant over what installers contribute; `copyUniqueItems` (`collection.ts:46-50`) throws inside the pull seam; `placement.ts:266` and `:337` throw inside `activation.prepare` and the committed-move bracket; `landing.ts:144-148`'s `=== Infinity` is at settle time and precedes the reduced-motion collapse, as D4 requires.
- **The unwind ordering.** The slot record is built inside `try` (`assemble.ts:154-206`), the resolver dereference `insertion!.resolve` is the first statement in it, `retireHooks.reverse()` runs after the record and after the last statement that can throw (`:212`), and the `catch` walks backwards so it sees installation order for as long as anything can still throw (`:220-226`). Nested hook failures go to `context.report` and do not stop the walk. `tests/sortable/assemble.browser.test.ts:489-519` asserts the throw **and** `seen === ['plugin']`, which is the pairing 05:612 demands.
- **Size.** `npx just size` reproduces the README's post-D-77 table exactly: 10.69 / 10.75 / 11.13 / 10.97 / 11.39 / 11.12 / 6.89 kB brotli at 31 / 31 / 32 / 32 / 33 / 28 / 26 modules, overage 194–373 B. Baseline A's module drop to 28 is real and the stated cause holds — `landing.ts` and `layout-animation.ts` were `slots.ts`'s only importers outside the assembler.
- **No free-drag production code.** `src/` contains no free-drag module; `files.json` and `package.json` `exports` are untouched by the commit. The only `freeDrag` occurrences in the tree are `tests/probes/13c-free-drag.ts` and `tests/revision/phase-14.ts` (both last touched at `6b279e97`) and two prose comments (`src/sortable/domain.ts:176`, `src/kernel/failures.ts:21`). The commit's `src/` footprint is the sortable and nothing else, which is what the gate asked for.
- **The deferred half is instrumented.** D-77's `freeDrag` half is carried by D-69's row, which does hold the `**Unimplemented (Phase 19).**` marker (00-index:321) and a matching `absent: src/free-drag.ts` witness (00-index:341), so `tests/decisions.node.test.ts` still holds it.

## P18A-01 — 03 §Assembly's normative merge sketch still has the pre-D-77 signature

`.plan/contract/03-feature-composition.md:269-286` is the contract's own statement of what the merge is, and it was not updated:

```ts
const merge = (
  fragments: readonly Partial<SortableConfig>[],
): SortableConfig => {
```

The shipped function is `mergeFragments(config: SortableConfig, fragments: ReadonlyArray<Partial<SortableConfig>>)` (`src/sortable/config.ts:155-158`). The whole of D-77 is that the first source is not a `Partial`, and the section that shows the merge shows it as one. The commit edited 71 lines of this document, so this is an omission rather than an untouched file.

Severity: **medium**. It is the sketch a reader consults to answer "what does the merge require", and it answers the pre-D-77 question.

## P18A-02 — three sites say the merge owns the `threshold` default; the assembler owns it

`mergeFragments` applies no defaults at all. The default is applied in the slot record: `threshold: config.threshold ?? DEFAULT_THRESHOLD` (`src/sortable/assemble.ts:185`). Three places say otherwise:

- `.plan/contract/03-feature-composition.md:285` — `return withDefaults(merged); // defaults derived AFTER the merge`, inside the merge function.
- `.plan/contract/03-feature-composition.md:452` — the D-77 verdict table: "`threshold` … **No failure ever.** Defaulted by the merge and never judged". This row is **new in this commit**, so it restated the error rather than inheriting it.
- `src/sortable/assemble.ts:183-184` — "what the merge still owns is the default, which is a value rather than a guard", written three lines above the line that applies the default in the assembler.

Severity: **low–medium**. Nothing misbehaves; a reader tracing where a default comes from is sent to the wrong function by the contract and by the file that actually does it.

## P18A-03 — 03 §The schema and `feature.ts` still tell the consumer to write `axis: y().axis`

`.plan/contract/03-feature-composition.md:110`:

> a consumer writing only `sortable.js` can write `axis: y().axis`, cannot write `axis: (ctx) => ({ … })`, and never sees what one is.

and `src/sortable/feature.ts:161-166` repeats it verbatim.

Under D-77 `y()` **is** the installer (`src/sortable/y.ts:87`), so `y().axis` does not exist and does not compile. `bench/size/noncomposed.js:45-46` was updated for exactly this and says so ("`y()` **is** the installer since D-77; it was `y().axis` while a required slot still needed a fragment position"); the contract and the source doc were not.

Severity: **medium**. This is the sentence that states the ordinary tier's authoring model, in the contract document D-77 amended, and it now instructs the consumer to write a compile error.

## P18A-04 — the opacity claim that same sentence rests on is false, and D-77 widens the gap

The other half of 03:110 — "cannot write `axis: (ctx) => ({ … })`, because the alias has no structure there" — does not hold. TypeScript resolves a parameter's type structurally whether or not its alias is re-exported, so contextual typing hands an ordinary consumer the full shape of `AxisInstaller`, `SortableContribution` and `InsertionGeometry`.

Reproduced. A file importing **only** `src/sortable.ts` was compiled with the package's own `tsconfig.json`:

```ts
import { ReorderResolution, sortable } from './sortable.ts';

sortable(root, {
  items: () => rows,
  onReorder: () => ReorderResolution.accept(),
  axis: () => ({
    insertion: { resolve: () => null, invalidate: () => {}, retire: () => {} },
  }),
});
```

`npx just typecheck`: clean. Expected, per 03:110: a compile error. The probe was removed.

This predates D-77 — the same was true of `SortableInstaller` in `landing` and `plugins` — but D-77 is what makes it consequential: it moved the axis slot to a type with a **required** member, and the entire stated justification for deleting the assembler's check is that the type refuses what the check refused. The type does refuse a plugin-shaped installer; what it does not do is keep an ordinary consumer out of the middle tier, and three sites now rest on the claim that it does (`03:110`, `src/sortable/feature.ts:161-166`, `src/sortable/config.ts:61-67`).

Severity: **medium**. The mechanism is stated as a property of the type system and is a property of neither the type system nor the entry map. 03:1244 already concedes the general form of this ("a consumer who wants past it types one more import rather than defeating anything"); §The schema still asserts the strong form.

## P18A-05 — `AxisInstaller` is not on `sortable.js`, and the instrument that should catch it structurally cannot

`src/sortable.ts:21-36` states the rule and names its enforcement:

> The config schema **and every alias it names** (D-45, F-51). A public type that references an unexported one is a surface a consumer cannot fully write down … `tests/docs.node.test.ts` enforces the closure rather than leaving it to review.

D-77 adds `AxisInstaller` to the names `SortableConfig` makes (`src/sortable/config.ts:68`). It is not re-exported from `sortable.js`; a consumer can fill the slot but cannot hoist the installer into a typed `const`.

`tests/docs.node.test.ts` cannot see this. Its strict check runs TypeDoc over **all eight entries at once** (`:99`), so `AxisInstaller` resolves through `sortable/feature.js` and no warning is raised. The per-entry closure check exists only for `kernel.js ∪ drag.js` (`:113-142`) — and that test's own header explains why the whole-run form is insufficient: it is the F-60 inversion, "a name in `kernel.js`'s closure that only resolves through `sortable.js` or `sortable/feature.js` reads as clean". The same inversion is now present at the ordinary tier, in the opposite direction, with no instrument on it.

Severity: **low**. The behaviour may well be intended — 03:110 says installer aliases are deliberately not on the ordinary tier — but then `src/sortable.ts:21-36`'s "every alias it names" is wrong as written, and the cited enforcement does not cover the case either way.

## P18A-06 — 03's declaration-identity clause still worked-examples `Pick<SortableConfig, 'axis'>` from `sortable/y.js`

`.plan/contract/03-feature-composition.md:1218`, clause 2:

> `Pick<SortableConfig, 'axis'>` from `sortable/y.js` means the same type as `SortableConfig['axis']` in `sortable.js`

`sortable/y.js` no longer produces that type; `y(): AxisInstaller` (`src/sortable/y.ts:87`, built `sortable/y.d.ts:9`). The rule it illustrates is still correct; the illustration is not.

Severity: **low**.

## P18A-07 — 03 §Public option domains contradicts itself on `layoutAnimation`

`.plan/contract/03-feature-composition.md:1198`:

> both `duration` domains narrow to **one comparison against `Infinity`**

`layoutAnimation({ duration })` has **no** check. `src/sortable/layout-animation.ts:39-46` is `const duration = options.duration ?? DEFAULT_DURATION;` with a comment saying so explicitly, and `tests/sortable/options.node.test.ts:238-252` asserts it. The contradiction is internal to the section: the paragraph at `:1200` ("`layoutAnimation` … holds nothing, and therefore keeps no check") and the table row at `:1214` ("**No**") both state it correctly, two and four lines later.

Severity: **medium**. This is the section D-77 rewrote, and the wrong sentence is the one that states the outcome.

## P18A-08 — the platform measurement the deletions rest on has no artifact and no test

Five sites carry the same empirical claim, and it is the sole justification for deleting `requireFinite` rather than merely relocating it:

- `src/sortable/slots.ts:255-258`
- `src/sortable/landing.ts:88-98`
- `README.md` §Option domains — "Measured (Chrome 150): `animate()` rejects `NaN`, negatives, `-Infinity`, strings and objects itself, and **accepts `'auto'` and `undefined`**"
- `.plan/contract/03-feature-composition.md:1198`
- `.plan/contract/07-free-drag-contract.md` B-4 (e)

Nothing records it. `grep` over `.plan/measurements/`, `.plan/probes/` and `tests/probes/` returns no mention of Chrome 150 or of `animate()`'s domain. No test pins any clause of it. The only executable evidence in the tree is `tests/sortable/features.browser.test.ts:751-763`, which runs `landing({ duration: () => -1 })` and asserts one error with code `presentation` — that shows _a_ throw arrives at the landing-create stage, not that `animate()` is the thrower, and it covers one of the six values named.

This is the evidence type this package otherwise refuses. `.plan/measurements/` exists for exactly this, D-76's gate required M-1/M-3 re-measurement before it could land, and `tests/decisions.node.test.ts` exists because "a green suite is evidence about the implemented contract only". A platform behaviour asserted in a contract, restated in three source files and a README, and used to justify deleting a check, is currently a claim with no witness — and the tree gives no way to tell whether it drifts.

Severity: **medium**. Not a defect in behaviour; a gap in the evidence chain of a decision whose whole argument is empirical.

## P18A-09 — half of that measurement is unreachable on the path it justifies

`accepts … `undefined`, which a finiteness test would have wrongly refused` cannot apply to `landing({ duration })`. The option is coalesced at `src/sortable/landing.ts:87`:

```ts
const declared = options.duration ?? DEFAULT_DURATION;
```

so `undefined` becomes `200` and can never reach `animate()`. `'auto'` does reach it, but only from a JS consumer, since `LandingOptions['duration']` is `number | LandingDuration` and `LandingDuration` returns `number`.

So the stated reason `requireFinite` was _wrong_ rather than merely _unnecessary_ — that it would have refused values the platform accepts — reduces, on this call path, to a single JS-only string. The verdict may still be right on the byte argument alone; the reason given for it is not a property of this code.

Severity: **low–medium**.

## P18A-10 — README and 00-index give two different fives for the same "six to one"

Both use the same headline. They do not enumerate the same set.

- `.plan/contract/00-index.md:329` and `03:446`: `axis` missing, `items` not a function, `onReorder` not a function, the axis installer's missing geometry, `threshold`'s domain. `layoutAnimation`'s duration is outside the count, mentioned separately.
- `README.md` §Option domains: "What goes is `threshold`'s domain, **both** required-slot checks, the axis-installed-no-geometry check and `layoutAnimation`'s duration."

The README's list has two required-slot checks where the contract has three, and substitutes `layoutAnimation`'s duration for the third — which is not a _sortable construction_ diagnostic at all, and so cannot be one of the six that became one.

Severity: **low**. A count stated as a headline number in two normative places should agree on what it counts.

## P18A-11 — 03:456's "two runtime throws remain outside construction" undercounts

`.plan/contract/03-feature-composition.md:456` names `copyUniqueItems` and the landing duration. `src/sortable/placement.ts:266` (the placeholder factory must return a detached element that is neither the item nor its visual, thrown inside `activation.prepare` and classified `FAILURE_ACTIVATION`) and `src/sortable/placement.ts:337` (the insertion anchor is not in the placeholder's container) are also runtime throws outside construction, and are also classified rather than thrown at the consumer's call. If the sentence is scoped to consumer _scalar_ domains it does not say so, and the reader has no way to know the enumeration is partial.

Severity: **low**.

## P18A-12 — the runtime backstop is narrower than the type it replaced, and the docs state it as if it were not

`src/sortable/feature.ts:186-189` and `03:444`:

> A JS-authored violator is not left undiagnosed: it reaches the flat slot record's dereference of the resolver, which throws by itself

That holds when the installer contributes **no** `insertion`. It does not hold when it contributes a malformed one. An axis returning `{ insertion: {} }` passes assembly silently: `insertion` is truthy, so `retireHooks.push(contribution.insertion.retire)` pushes `undefined` (`assemble.ts:110-112`), `insertion!.resolve` is `undefined` rather than a throw, and the record is built with `resolveInsertion: undefined`, `invalidateInsertion: undefined`, `measureInsertion: null`. The failure surfaces later, at the seam that calls the resolver.

Behaviourally this is fine under the new rule — a seam classifies it, which D-77 established is not a defect. But `AxisInstaller` now promises the whole `InsertionGeometry`, while the dereference verifies only that the object exists, and both doc sites describe the pairing as if the backstop covered the type's whole promise. The deleted check had the same blind spot, so this is not a regression; it is an over-broad statement of what replaced it.

Severity: **low**.

## P18A-13 — "the unwind is total" is scoped to `assemble`, and the scope is not stated

`03:444` and `05:612` promote the total unwind to a normative requirement, and `assemble.ts:217-219` restates it ("the unwind is stated as total, so it is total"). It is total _within_ `assemble`. It is not total across construction:

`createComposedSortableBehavior` evaluates `merged.items()`, then `assemble(...)`, then `install(...)` (`src/sortable/behavior.ts:79-99`). If `createSortableRuntime` or `createSortableSpec` throws after `assemble` returned, the collected `retireHooks` are never run — the record holding them is discarded — and `draggable()` has already built a kernel and a realm (`src/kernel.ts:246-247`) that nothing destroys, because `arm()` is never reached.

Pre-existing, and not introduced by D-77. Raised because D-77 is the step that made the sentence normative and the sentence carries no boundary.

Severity: **low**, scope note rather than defect.

## P18A-14 — B-9 (b) claims the type fixture asserts `xy()`; it never names it

`07:481` B-9 (b): "`y()`/`xy()` are asserted to return the **installer**, not a one-key fragment."

`tests/revision/revision-2.ts` — the fixture B-9 (a) names two clauses earlier — imports and exercises `y()` only (`:152`, `:391`). `xy()`'s pin is elsewhere, in `tests/sortable/assemble.browser.test.ts:453-456`, and it is an assignability pin (`axis: xy()` compiling) rather than an assertion. That is sufficient in practice — a one-key fragment is not assignable to the slot — but it is not what B-9 says, and it puts one of the two axis modules' surface pin in a browser test rather than in the type fixture where the clause locates it.

Also minor: B-9 (b) names `landing({ duration: 200 })` as the positive form; the fixture uses the contextual form (`revision-2.ts:401`).

Severity: **low**.

## P18A-15 — B-9 (c) is asserted only below the public entry

All three runtime assertions call `mergeFragments` directly (`tests/sortable/options.node.test.ts:142-161`), with the type-level premise that `{ axis: undefined }` is a legal `Partial` value pinned at `tests/revision/revision-2.ts:445-449`. Nothing exercises the guarantee through `sortable()`.

The clause's own framing is that the `undefined` skip "is the only thing between a legal `Partial` value and a required slot that is `undefined` at the seam" — a statement about the public entry. A change that stops routing `sortable()`'s fragments through `mergeFragments`, or that reorders the required argument relative to the fragments in `createComposedSortableBehavior`, would leave every B-9 (c) assertion green.

Severity: **low**.

## P18A-16 — part of the D-77 change is in a gitignored file

`bench/size/noncomposed.js:45-46` carries a D-77 edit:

```js
// `y()` **is** the installer since D-77; it was `y().axis` while a required
// slot still needed a fragment position to be written from.
const { insertion } = y()(context);
```

`git check-ignore -v` resolves it to `.gitignore:14 /packages/**/*.js`. `noncomposed.d.ts` (`.gitignore:17`) and `shipped.js` are ignored too; `git ls-files bench/` returns only `measure.ts`.

So the M-3 baseline exists only in this working tree. Two consequences:

1. `tests/bench/size.node.test.ts:184` dynamically imports `../../bench/size/noncomposed.js`. On a clean clone there is nothing to resolve — the build step in `beforeAll` produces the package entries, not this file — so §"should fill exactly the slots the assembler fills" cannot run. That test is the only thing keeping the hand-written baseline in step with `assemble()`, and it is the assertion D-77 most needed, since the change altered the assembler's record construction.
2. The README's baseline-A row and its `−47 B, −1 module` D-77 delta are produced from a file the commit does not contain, so the measurement is not reproducible from the repository.

The ignore rule is pre-existing. D-77 is the first step to land content into that file which the commit cannot carry, which is what makes it visible now.

Severity: **medium** as a landing-integrity defect; the pre-existing ignore rule is the root cause and is out of D-77's scope to have fixed.

## P18A-17 — 00-index's explanation of D-77's deferred-table row outlived the row

`.plan/contract/00-index.md:348`:

> **D-77's witness is the sortable's own signature**, and that is the point of listing it here rather than trusting the phase gate: it is the one deferred row whose subject is the behavior that already ships … When the required first parameter lands, the variadic-only text is gone and the row must go with it.

The row was correctly removed — §Decisions not yet implemented now lists D-69, D-70, D-71, D-72, D-73, D-75 (`:341-346`), and the neighbouring sentence at `:350` confirms six. The paragraph explaining the removed row was not removed, and now asserts that D-77 is listed in a table it is absent from.

This is the document `tests/decisions.node.test.ts` reads. The test checks marker-to-row completeness in both directions and passes, because D-77's row carries no `**Unimplemented**` marker — so nothing catches the dangling prose.

Severity: **low**.

## P18A-18 — a test comment now describes a mechanism the change removed

`tests/sortable/features.browser.test.ts:751-763`, _should classify an out-of-domain contextual result at settlement_, uses `landing({ duration: () => -1 })` and comments:

> The same domain as the fixed form, checked at the only moment the value exists. It throws from inside `start`, which the kernel classifies as a landing-create failure.

Post-D-77 the library does not throw for `-1`; `animate()` does, and reaching the same stage is the point being relied on. The test still passes and is still worth keeping — it is now the only executable evidence for any part of P18A-08's premise — but its stated mechanism is the deleted one, which makes it read as coverage of a library check that no longer exists.

Severity: **low**.

## P18A-19 — the one check D-77 kept is the least pinned thing in the change

`src/sortable/landing.ts:144-148` is now the package's **only** remaining domain check, on the one value the contract says the architecture cannot classify — an operation that hangs with no terminal at all. The step pinned each of the five deletions in both directions and left the single retention thinly covered.

- Its message, `sortable: landing({ duration }) must not be Infinity`, is asserted by **no test**. `grep` over `tests/` returns the source line only.
- The **fixed** form — `landing({ duration: Number.POSITIVE_INFINITY })`, the plain default-motion case a consumer is most likely to write — is exercised nowhere in the suite. `tests/sortable/options.node.test.ts:197-202` asserts only that _construction_ does not throw, which is a deletion assertion, not a coverage one.
- The only test that reaches the guard is `tests/sortable/features.browser.test.ts:1022-1050`, and it uses the **thunk** form under `prefers-reduced-motion: reduce`. It does discriminate deletion — with the check gone the collapse would hand `animate()` a duration of `0` and nothing would throw, which is the ordering property it exists for. But its whole assertion is `expect(composed.errors).toHaveLength(1)`: it does not assert the code (`presentation`), the stage (`FAILURE_LANDING_CREATE`), or that a terminal still arrives — all three of which `03:1214` states normatively for this row, and the first two of which the neighbouring `-1` test at `:751-763` does assert.

`tests/COVERAGE.md`'s new row overstates what backs it:

> both `duration` forms are judged at the **same instant**, against the one value that can hang the gate | `tests/sortable/options.node.test.ts` — _should not refuse Infinity at construction either_, _should no longer refuse a negative duration at construction_

Both cited tests assert non-throwing at construction. Neither asserts that either form is judged at the landing, and no test covers the fixed form at all, so the "both forms" and "same instant" halves of the row are unbacked by the tests it names.

This is measured against the change's own governing rule, which `options.node.test.ts:16-18` quotes from 05 §The required first argument: _"a deleted check that nothing pins is a check a later pass re-adds, so every deletion below is asserted as a deletion **and** paired with whatever answers in its place."_ The symmetric hazard — a _retained_ check that nothing pins on its primary input form — is the one the step did not apply the rule to.

Severity: **medium**. Coverage, not behaviour: the fixed and thunk forms share the guard at `landing.ts:127-148`, so the fixed form almost certainly works. What is missing is anything that would notice if it stopped.

(All other D-77 rows added to `tests/COVERAGE.md` in this commit were checked against the actual `it(...)` titles and match exactly.)

## P18A-20 — 07's B-4 (a) amendment prescribes a technique that cannot do what it asks

The commit amended B-4 (a) (`.plan/contract/07-free-drag-contract.md:476`) to route around the new required argument:

> (a) `freeDrag()` throws **nothing** for any config the compiler accepts: a fixture passes garbage into every slot — **via a `Partial` fragment, since D-77 makes the first argument's shape a compile error** — and asserts construction returns a controller.

A `Partial` fragment does not admit garbage. `Partial<T>` makes each property **optional**; it does not widen its type. `Partial<FreeDragConfig>['onDrop']` is still `OnDrop | undefined`, so `{ onDrop: 42 }` in a fragment is exactly as much a compile error as in the first argument.

Reproduced against the landed sortable, which has the same shape:

```ts
sortable(root, valid, { threshold: 'not a number' });
// src/__b4a-probe.ts(15,25): error TS2322:
//   Type 'string' is not assignable to type 'number'.
```

The rationale is also misattributed. D-77 did not make the first argument's _shape_ a compile error — its shape was always checked, in both positions. What D-77 changed is that its required members can no longer be **omitted**. Garbage _values_ were never expressible in either position, so moving them to a fragment buys nothing.

The sortable's own analogue — which landed in this commit and works — uses a different technique entirely: `tests/sortable/options.node.test.ts:51-52` spreads a `Record<string, unknown>` **into the first argument**:

```ts
const assembleWith = (options: Record<string, unknown>): unknown =>
  assemble(mergeFragments({ ...required(), ...options }, []), context);
```

exercised at `:119-130` with `{ items: 'not a function', onReorder: 42 }`. So the working pattern was established in the same commit that wrote the non-working prescription into the acceptance criterion for the behavior that has not been built yet.

Severity: **low–medium**. Nothing is wrong today — B-4 governs Phase 19. It is raised now because it is a criterion an implementer will follow literally, discover does not compile, and then satisfy with an unreviewed cast; and because it is cheap to correct while the section is still fresh.

## Two observations, not findings

- **`mergeFragments` allocates.** `for (const fragment of [config, ...fragments])` (`src/sortable/config.ts:166`) materializes a new array per controller construction. The comment at `:159-162` names the trade deliberately ("rather than buying a second one to save an assignment"). Construction-time and small; noted only because the decision it belongs to is argued on bytes.
- **`bench/size/measure.ts`'s over-budget line prints a negative "under budget"** — e.g. `31 modules, -0.35 kB under budget` immediately above `✗ minimal over budget by 353 B`. Cosmetic, pre-existing, unrelated to D-77.

## What would close this

Nothing in the implementation. The findings divide into three groups:

1. **Stale normative prose the commit did not carry** — P18A-01, P18A-02, P18A-03, P18A-06, P18A-07, P18A-10, P18A-11, P18A-17, P18A-18. Mechanical, but P18A-03 and P18A-07 are in sections a reader consults for the answer D-77 changed.
2. **Claims that need re-derivation rather than editing** — P18A-04 (the ordinary tier is not opaque, and three sites say it is), P18A-05 (the F-51 closure rule versus the installer aliases, and the instrument that covers neither), P18A-08 and P18A-09 (an empirical premise with no artifact, one half of it inapplicable to the path it justifies), P18A-12 and P18A-13 (two statements broader than what holds).
3. **Coverage and landing integrity** — P18A-19 (the retained check is pinned on one input form, by one assertion, under one media query) and P18A-16 (the M-3 baseline is not in the repository, so one of D-77's own measurements and the test that keeps the baseline honest are not reproducible from a clean clone).
4. **One forward defect** — P18A-20, in the Phase 19 acceptance criterion this commit amended. Harmless today, and cheapest to correct while the section is fresh.

None of these blocks Phase 19 on the implementation. P18A-08, P18A-16 and P18A-19 are the three that would be cheapest to close now and most expensive to close later, because all three are about evidence that decays silently — and P18A-19 is the one the step's own rule already names.

---

**LSP plugin - available; used:** `findReferences` on `mergeFragments` (`src/sortable/config.ts:155`) to enumerate every caller — 22 references across 5 files, all of them `src/sortable/behavior.ts` or a test, none from `src/sortable.ts`, which is the corroboration for P18A-15; `hover` on `SortableConfig['axis']` (`src/sortable/config.ts:68`) to confirm the resolved shape of `AxisInstaller` as the compiler sees it at the slot. One caveat worth recording: `findReferences` on the `AxisInstaller` declaration itself (`src/sortable/feature.ts:191`) returned a single self-reference where `grep` finds nine sites across `src/`, `tests/` and `docs/`, so the plugin under-reported on that symbol and grep was the fallback there, per CLAUDE.md. The type-level findings (P18A-04) were settled by compiling a probe rather than by either instrument, because assignability under contextual typing is not a question a reference query can answer.
---

# Resolution — 2026-08-16

Implemented against D-78, D-79 and D-80 (`.plan/contract/00-index.md` §The D-77 landing review), which are the three findings that needed a decision rather than an edit. **No seam, no signature and no runtime outcome moved except the one D-80 (b) names**: the collection is pulled, validated and copied at the construction boundary rather than inside `install`.

| # | Where it was closed |
| --- | --- |
| P18A-01 | `03` §Assembly — the merge sketch is `mergeFragments(config, fragments)` with the required first source, iterating `[config, ...fragments]` |
| P18A-02 | Three sites, all corrected to name the **assembler**: `03`'s sketch (which no longer calls `withDefaults`), `03`'s D-77 verdict table, and `src/sortable/assemble.ts`'s own comment above the line that applies the default |
| P18A-03 | `03` §The schema, `src/sortable/feature.ts`, and `03`'s D-45 sketch — which still showed `sortable(root, config, y(), landing())` and `y(): Pick<SortableConfig, 'axis'>`, a call shape that no longer compiles. Not in the original finding; same class, found while closing it |
| P18A-04 | **D-78.** The opacity claim is struck at all three sites plus two the review did not list: `tests/sortable/feature.declaration.test.ts` and `05`'s middle-tier row (see _Raised_ below) |
| P18A-05 | **D-78.** `AxisInstaller` re-exported from `sortable.js`; the tier-scoped closure rule stated at `src/sortable.ts` and `03` §The schema; `tests/docs.node.test.ts` gains the ordinary tier's per-entry run. **The per-entry run does not pin the re-export** — verified by deleting it, which leaves the run green, because `sortable/feature.js` is inside the union — so the hoistability half is pinned where it can be, in the packed consumer fixture (`tests/consumer.node.test.ts`), which fails to compile without it. The docs test says so in its own comment rather than implying coverage it has not got |
| P18A-06 | `03` §Declaration identity, clause 2 — the worked example is `AxisInstaller`, with the old form struck |
| P18A-07 | `03` §Public option domains — the sentence now separates the two `duration` options, as the paragraph and the table two lines below always did |
| P18A-08 | **D-79.** [`../measurements/animate-duration-domain.md`](../measurements/animate-duration-domain.md), measured 2026-08-16 against `HeadlessChrome/150.0.0.0`: every clause reproduces, including `Infinity` reporting `progress: 0` a second in and `finished` never settling |
| P18A-09 | **D-79.** `undefined` struck at all five sites; `'auto'` kept and marked JavaScript-only. The verdict stands on the byte argument and the `Infinity` invariant, which are the two legs that never depended on it |
| P18A-10 | `README.md` §Option domains now enumerates the same five as `00-index` and `03`, and says explicitly that `layoutAnimation`'s duration is not one of them |
| P18A-11 | `03:467` — four throws, with the two `placement.ts` preconditions named and their stages given, plus the one position D-80 (b) moved |
| P18A-12 | **D-80 (a).** `03` §Validation and `src/sortable/feature.ts` state the pairing as _the type is total for a TypeScript consumer; the runtime dereference exists for a JavaScript one, and checks that the object exists_ |
| P18A-13 | **D-80 (b).** Made true rather than scoped — see F-68 |
| P18A-14 | `tests/revision/revision-2.ts` hoists both `y()` and `xy()` into typed `AxisInstaller` consts and carries the fixed `landing({ duration: 200 })` form; `07` B-9 (b) records why |
| P18A-15 | `tests/sortable/composition.browser.test.ts` §_the required first argument, through the public entry_ — the `undefined` skip asserted through `sortable()`, paired with a positive row so it cannot pass vacuously |
| P18A-16 | `.gitignore` re-includes `packages/*/bench/**/*.js` and `*.d.ts`; `noncomposed.js`, `noncomposed.d.ts` and `shipped.js` are staged. The M-3 baseline and the test that keeps it in step with `assemble()` are reproducible from a clean clone |
| P18A-17 | Closed in the previous pass, with F-70 |
| P18A-18 | The comment now says the thrower is `animate()` and that what the row pins is the **stage** the platform's refusal arrives at — the premise of the deletion |
| P18A-19 | Three new rows in `tests/sortable/features.browser.test.ts`: the **fixed** form, the **contextual** form — both asserting the guard's message and its code, read from `STAGE_TO_CODE` rather than retyped — and the terminal the guard exists to preserve. Falsified: deleting the guard fails all three, and the terminal row fails because no terminal arrives at all, which is the hang stated as a test |
| P18A-20 | `07` B-4 (a) — the `Partial`-fragment technique is struck with its reasoning, replaced by the sortable's working one (spread a `Record<string, unknown>` into the first argument), and the misattributed rationale corrected |

## Raised, and closed in the same pass

- **`05` §Middle-tier authoring carried the retracted opacity claim too.** D-78 names three sites; this was a fourth, and a _test-matrix_ row rather than prose: _"a fixture that imports **only** `sortable.js` still cannot construct one, and the `@ts-expect-error` proving it is the boundary's only remaining enforcement."_ Under D-78 that fixture compiles, so the criterion asked for an assertion that cannot be written.

  ~~**Not edited** — it is an acceptance criterion, and D-78's supersedes list does not reach it.~~ **Superseded: the row was remediated under D-78 in this same commit, and this note described the tree before that edit landed.** `05:598` now splits it into two rows — what a `sortable.js`-only fixture **can** do (author inline _and_ hoist a `const hoistedAxis: AxisInstaller`) and what it **cannot** (name `FeatureContext`, `SortableContribution` or `InsertionGeometry`) — strikes the old clause with its reason, and adds the caution that the per-tier TypeDoc run is **not** that row's evidence. That is the replacement this note anticipated: the line is **vocabulary, not construction**. Corrected 2026-08-16 by the closure pass below, which is the only thing it changed.

---

# Closure verification — 2026-08-16

An independent pass over **P18A-01…P18A-20** against the tree as it stands after D-78, D-79, D-80 and the F-70 instrument widening. Scope was closure of the existing findings only: nothing was reopened, no contract, implementation or test was changed, and Phase 19 and Checkpoint E were left alone. The one edit this pass made to the record is the correction directly above.

**Verdict: all twenty are closed, and no new contradiction was found.**

Gates, re-run from `packages/drag2`: `npx just typecheck` clean; `npx just test` — **38 files, 852 passed, 25 skipped, no type errors**, against 832 at the time of the review. Every probe below was reverted and `npx just build` re-run, so the tree and its emitted declarations were left exactly as found.

## Method

The resolution table was **not** taken on trust. Prose closures were read at each site; the three load-bearing ones were **falsified** — the claimed instrument was broken on purpose and the suite watched to see whether it noticed. A closure that survives deletion of the thing it claims to pin is not a closure, and that is the failure mode this pass existed to catch.

## Falsification evidence

**D-78 — the publication/closure split (P18A-04, P18A-05).** The decision makes an unusually falsifiable claim: that the per-tier TypeDoc run does **not** pin the `AxisInstaller` re-export, and that the packed consumer fixture does. Both directions were tested by deleting `export type { AxisInstaller } from './sortable/feature.ts';` from `src/sortable.ts`:

| Instrument | D-78 predicts | Observed |
| --- | --- | --- |
| `tests/docs.node.test.ts`, per-entry runs | stays green | **green — 3 passed** |
| `tests/consumer.node.test.ts`, packed fixture | fails to compile | **`consumer.ts(20,8): error TS2305: Module '"@ydinjs/drag2/sortable.js"' has no exported member 'AxisInstaller'`** |

Both hold. A document that names what its instrument cannot see, and points at the one that can, is the honest form P18A-05 asked for.

The tier claim itself was compiled rather than read. A file importing **only** `src/sortable.ts` hoists `const hoisted: AxisInstaller = () => ({ insertion: { … } })` and typechecks clean; `import type { InsertionGeometry } from './sortable.ts'` fails with `TS2305`. So the boundary is **vocabulary, not capability** — the ordinary tier can author and hoist, and `sortable/feature.js` buys the names for an installer's parts. That is the shape D-78 states, verified in both directions.

**D-79 — the retained guard (P18A-19).** Deleting the `=== Infinity` throw from `src/sortable/landing.ts`:

- _should refuse an unbounded fixed duration at settlement_ — **fails**
- _should refuse an unbounded contextual duration at settlement_ — **fails**
- _should still publish exactly one terminal for a refused duration_ — **fails, `expected +0 to be 1`**
- _should classify an unbounded thunk result under a reduced-motion preference_ — **fails** (the pre-existing row)

The terminal row's failure mode is the finding's whole point: **zero** terminals arrive, so the assertion is a hang detector rather than an error-count check. Both new rows assert the guard's message and its code, and the code is `toDraggableError(FAILURE_LANDING_CREATE, null).code` — derived from the library's own mapping, so a remap cannot pass. The measurement artifact ([`../measurements/animate-duration-domain.md`](../measurements/animate-duration-domain.md)) carries a harness, a per-value table, the `Infinity` sampling that shows `progress` still `0` a second in with `finished` pending, a stated falsifier, and it strikes the `undefined` leg itself rather than defending it.

**D-80 (b) — the unwind across construction (P18A-13).** `copyUniqueItems` is now a statement ahead of `install`, and `createSortableRuntime` is pure allocation with no consumer-reachable call, so nothing consumer-triggerable throws between the first `retire` hook being recorded and the bracket that unwinds them. It is pinned by `tests/sortable/composition.browser.test.ts` with a **discriminating** assertion — `ran === []` rather than `retired === []`, with the reasoning that a wider bracket would satisfy the latter — plus **two negative controls** that reconstruct the pre-D-80 argument order and demonstrate the leak it removed.

## Where the review under-called its own findings

Recorded because a review's errors are part of its record.

- **P18A-13 was rated "scope note rather than defect", and that was wrong.** F-68 is the correct reading: `copyUniqueItems` threw from inside `createSortableRuntime`, after `assemble` had returned, so a consumer collection holding one element twice stranded every recorded hook plus a kernel and realm `draggable()` had already built. Consumer-triggerable, and the sharper shape is the one the review missed — D-77 retained exactly one construction-time throw and it sat in the one window the unwind did not cover.
- **F-69 was noted only in passing.** That the pull's safety rested on argument-evaluation order alone, with nothing saying so, deserved a finding of its own.

Both were closed by making the sentence true rather than by scoping it, which is the stronger of the two available answers and not the one the review proposed.

## Closures verified at their sites

| # | Verified |
| --- | --- |
| P18A-01 | `03` §Assembly's sketch is `mergeFragments(config, fragments)` over `[config, ...fragments]` |
| P18A-02 | All three sites name the **assembler**; `withDefaults` is gone from the sketch |
| P18A-03 | Struck at `03:114` and `src/sortable/feature.ts:163-171`; the D-45 call-shape sketch was corrected too — beyond the finding, same class |
| P18A-04 | Retracted at all sites, and the retraction states the true rule: a tier decides where a name is declared, never what the compiler lets you write inline |
| P18A-05 | `AxisInstaller` on `sortable.js` and in the emitted `sortable.d.ts`; falsified above |
| P18A-06 | Clause 2's worked example is `AxisInstaller` |
| P18A-07 | `03:1211` separates the two options and strikes the wrong sentence with its correction |
| P18A-08 | The artifact exists, is dated, names its engine, and states its falsifier |
| P18A-09 | `undefined` struck at all five sites; `'auto'` kept and marked JavaScript-only |
| P18A-10 | `README` §Option domains enumerates the same five as `00-index` and `03` |
| P18A-11 | `03:469` — four throws, the `placement.ts` pair named with their stages |
| P18A-12 | Presence, not well-formedness, stated at both sites |
| P18A-14 | `tests/revision/revision-2.ts` hoists `y()` **and** `xy()` into typed consts and carries `landing({ duration: 200 })` |
| P18A-15 | Asserted through `sortable()`, with a positive row that records its installer ran so the negative cannot pass vacuously |
| P18A-16 | `.gitignore` re-includes the bench fixtures; `noncomposed.js`, `noncomposed.d.ts` and `shipped.js` are tracked |
| P18A-17 | The dangling paragraph is gone from `00-index` |
| P18A-18 | The comment names `animate()` as the thrower and states what the row actually pins |
| P18A-20 | `07` B-4 (a) strikes the `Partial`-fragment technique with its reasoning and carries the sortable's working one |

## What this pass did not do

It did not re-examine anything outside P18A-01…P18A-20. Phase 19's remaining criteria, Checkpoint E, and every contract question not raised by the original review were out of scope and were left untouched.

---

**LSP plugin - available; not used:** the pass was diff-driven and falsification-driven — `git show` supplied the exact change set, and the three load-bearing closures were settled by deleting code and running the suite, which is not a question a symbol query can answer. Grep located the prose sites.