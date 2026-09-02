# Checkpoint E — final independent closure challenge before optimization

- **Reviewer:** Codex
- **Date:** 2026-08-19
- **Subject:** the remaining high-risk Checkpoint E seams after D-88, D-90, D-92 and D-93
- **Tree:** `f4e8ceda` on `drag2/phase21`

**Scope.** This is a narrow closure challenge, not a fresh package audit. It checks only whether the finalized contract, implementation and executable evidence remain mutually honest at the shared sortable/free-drag calling convention; the five-site instruments in each tier; D-88's deliberately bounded contribution-type exclusion; accepted-anchor behavior; finite `moveTo`; the activation snapshot; action legality; and the earlier teardown/failure findings. It also checks for a source or normative statement that would be unsafe to carry into code-shape and size optimization. No implementation was modified and no general improvement is proposed.

## Baseline

| Gate                                      | Result                         |
| ----------------------------------------- | ------------------------------ |
| `npx just typecheck`                      | clean                          |
| seven focused declaration/browser files   | **213 passed**, no type errors |
| three remaining lifecycle/packaging files | **33 passed**, no type errors  |

The first browser attempt was unable to bind `0.0.0.0:9876` inside the filesystem sandbox (`EPERM`). The same focused command was rerun with local-port access and passed. The final review artifact is the only worktree change.

## Verdict

**Checkpoint E is not yet safe to close. Phase 21 optimization should not begin against the current wording.**

The implementation and the discriminating instruments agree, and I found no remaining runtime defect in the challenged seams. Two related contract blockers remain in the calling-convention account:

| # | Finding | State |
| --- | --- | --- |
| CE6-01 | the published and evidence prose names the outer installer return while the invariant and instruments concern the nested capability record | **open — blocker** |
| CE6-02 | D-93's obligation-only rule still coexists with published mechanism promises and one stale three-site statement | **open — blocker** |

These are not optimization opportunities. They are source-of-truth contradictions that make it unclear which transformations Phase 21 is allowed to perform. The code needs no behavior change for either finding; the contract must identify the actual forbidden receiver and separate the author-visible obligation from the current lifting mechanism.

## CE6-01 — the receiver invariant names the wrong record

**Blocker. Published contract, normative evidence and executable evidence do not name the same object.**

The public `InsertionGeometry` declaration says its members are never invoked with “the record you return” as receiver, then makes that more specific as “your contribution object” ([sortable/feature.ts:75-80](../../../src/sortable/feature.ts#L75-L80)). But an `AxisInstaller` returns an outer `SortableContribution & { insertion: InsertionGeometry }` ([sortable/feature.ts:242-244](../../../src/sortable/feature.ts#L242-L244)). The record whose methods are under the convention is the nested `InsertionGeometry`, not that outer contribution object.

The sortable instrument implements the intended invariant rather than the literal prose:

- `Recording.own()` is typed as `InsertionGeometry`, and its comment calls that value “the record the installer handed back” ([calling-convention.browser.test.ts:56-61](../../../tests/sortable/calling-convention.browser.test.ts#L56-L61));
- `recordingAxis` constructs a nested `insertion`, stores that object in `own`, then returns a distinct outer `{ ...contribution, insertion }` ([calling-convention.browser.test.ts:72-112](../../../tests/sortable/calling-convention.browser.test.ts#L72-L112));
- every site assertion compares its observed receiver with the nested `recording.own()` ([calling-convention.browser.test.ts:213-220](../../../tests/sortable/calling-convention.browser.test.ts#L213-L220)).

Free drag has the same evidence-label defect. Its fixture returns `{ constrain }` from the installer but calls the nested `MotionConstraint` “the record the installer returned” and makes `own()` return that nested value ([anchor.browser.test.ts:119-143](../../../tests/free-drag/anchor.browser.test.ts#L119-L143)). The shared coverage sentence repeats the outer-return wording for both tiers ([COVERAGE.md:758-768](../../../tests/COVERAGE.md#L758-L768)), as do contract 03's sortable evidence paragraph ([03-feature-composition.md:250-254](../../../.plan/contract/03-feature-composition.md#L250-L254)) and D-92's row ([00-index.md:394](../../../.plan/contract/00-index.md#L394)).

This distinction is load-bearing for optimization. A refactor that calls `insertion.resolve()` or `constrain.apply()` bound to the nested capability record still never uses the **outer contribution object** as receiver, so it satisfies the literal published sentence while failing every intended convention row. Conversely, the current tests would correctly reject it. A contract and its falsifier cannot use different identities for the one forbidden receiver.

The durable statement is: a contributed member is never invoked with the **capability record that owns that member** — the `InsertionGeometry` or `MotionConstraint` object — as its receiver; an author cannot depend on `this`; every other receiver value is unspecified. That is the invariant the existing fixtures already discriminate.

## CE6-02 — mechanism remains mixed into D-93's obligation-only promise

**Blocker. The current authoritative texts simultaneously withdraw and publish a call-shape obligation.**

D-93 says the published guarantee is the negative obligation alone and the receiver is otherwise unspecified ([00-index.md:398-406](../../../.plan/contract/00-index.md#L398-L406)). The free-drag contract is even more explicit: the former “calls them as bare functions” clause is withdrawn, and no guarantee sentence may say where a member is called from because that is code shape that must be re-derived after a refactor ([07-free-drag-contract.md:412-428](../../../.plan/contract/07-free-drag-contract.md#L412-L428)).

The published `InsertionGeometry` comment still makes the mechanism normative:

> The assembler flattens the members into direct slot fields … **That flattening is a calling convention, and it binds the author**.

That wording appears at [sortable/feature.ts:72-78](../../../src/sortable/feature.ts#L72-L78). It promises the flattening and the location of the lifts on the exported declaration instead of promising only the receiver invariant. `MotionConstraint` also names which module lifts each member and carries the one-property-read/one-call rationale on its public declaration ([free-drag/feature.ts:88-109](../../../src/free-drag/feature.ts#L88-L109)). That attribution is accurate today, but contract 07 correctly classifies it as “code, not guarantee”; the public comments do not make that distinction.

Normative contract 03 retains a direct contradiction. It first records the flat-slot mechanism ([03-feature-composition.md:244-248](../../../.plan/contract/03-feature-composition.md#L244-L248)), then says lifting and calling a member “bare” is the calling convention ([03-feature-composition.md:250](../../../.plan/contract/03-feature-composition.md#L250)). Two lines later it accurately records that `resolve` and `invalidate` are property calls on the flat slot record and therefore receive that record, while other sites receive `undefined` or the hook array ([03-feature-composition.md:252-254](../../../.plan/contract/03-feature-composition.md#L252-L254)). “Called bare” and “receives the slot record” cannot both describe those sites.

There is also one uncorrected enumeration in the D-90 decision row. It says “The three call sites are consistent with it,” then later in the same row correctly describes three members reached through **five** sites and the normal/unwind split for `retire` ([00-index.md:383](../../../.plan/contract/00-index.md#L383)). D-93 corrected the operative count everywhere the instruments use it, but this live sentence still leaves the normative record internally inconsistent.

This blocks optimization because a representation change can preserve the actual author-visible obligation while ceasing to flatten a particular member. D-93 says such a change is conforming; the exported comment and contract 03 currently say it breaks the convention. The mechanism may remain as implementation rationale or measured evidence, but it cannot still be described as the promise that binds an installer author.

## The five-site instruments are discriminating

No blocker found.

Both tiers now have five actual sites, not five labels over fewer exercised paths:

- free drag drives `apply`, the scroll/resize invalidator, the policy invalidator, normal retirement and construction unwind separately ([anchor.browser.test.ts:265-352](../../../tests/free-drag/anchor.browser.test.ts#L265-L352));
- sortable drives `resolve`, `invalidate`, optional `measure`, normal retirement and construction unwind separately ([calling-convention.browser.test.ts:222-304](../../../tests/sortable/calling-convention.browser.test.ts#L222-L304)).

The instruments genuinely observe receiver identity. Their methods use function shorthand with an explicit `this` parameter, record each receiver, prove the selected site was reached, and compare against `own()`. They do not assert `undefined`, so the tests do not pin the incidental slot-record/undefined/hook-array distribution. The sortable aggregate row compares all recorded sites with the nested geometry ([calling-convention.browser.test.ts:307-325](../../../tests/sortable/calling-convention.browser.test.ts#L307-L325)).

The first-party `bounds()`, `y()` and `xy()` rows are explicitly labeled non-discriminating controls because those features close over their state and would pass under either bound or lifted invocation ([COVERAGE.md:748-769](../../../tests/COVERAGE.md#L748-L769)). This is an honest limitation, not missing convention evidence.

The only defect is CE6-01's terminology: the fixtures observe the right nested record while their prose calls it the installer return.

## D-88's structural bound is honest

No blocker found.

D-88 states exactly what the type mechanism guarantees: the two contribution records have the same seven known keys, and every capability absent from one behavior is declared there as `?: never`. It also expressly records what the mechanism cannot guarantee: an eighth unknown property can still pass structurally and be discarded, and exact/branded machinery was deliberately declined ([00-index.md:379-382](../../../.plan/contract/00-index.md#L379-L382)).

The declarations implement the asymmetric boundary:

- sortable implements six keys and excludes `constrain` ([sortable/feature.ts:127-175](../../../src/sortable/feature.ts#L127-L175));
- free drag implements three and excludes `insertion`, `placeholder`, `beforeInsertionMove` and `afterInsertionMove` ([free-drag/feature.ts:119-174](../../../src/free-drag/feature.ts#L119-L174)).

The declaration fixture checks key equality and each exclusion directly ([composition.declaration.test.ts:120-153](../../../tests/composition.declaration.test.ts#L120-L153)). Its unannotated counterexamples include `retire`, deliberately defeating weak-type detection so the `?: never` exclusions are what reject them ([composition.declaration.test.ts:156-201](../../../tests/composition.declaration.test.ts#L156-L201)). The shared-slot positive control remains assignable ([composition.declaration.test.ts:203-220](../../../tests/composition.declaration.test.ts#L203-L220)). The executable evidence therefore proves the bounded claim D-88 actually makes and does not pretend to prove structural exactness.

## Earlier Checkpoint E seams

No blocker or contract contradiction found in the remaining requested seams.

### Accepted anchor

The accepted arm reads `originRect + motion` from committed state and does not call `deriveMotion` or the constraint ([free-drag/spec.ts:820-849](../../../src/free-drag/spec.ts#L820-L849)). Its test holds the drop resolver pending, records the constraint count after release, then resolves and observes no additional call through the join ([anchor.browser.test.ts:177-210](../../../tests/free-drag/anchor.browser.test.ts#L177-L210)). The file states honestly that the accepted anchor's value itself has no public observable and uses the two landing-producing home arms as value controls ([anchor.browser.test.ts:212-225](../../../tests/free-drag/anchor.browser.test.ts#L212-L225)).

### Finite `moveTo`

`moveTo` reads both coordinates before writing, reports and discards a non-finite pair, and writes the rebase offsets only after the check ([free-drag/spec.ts:500-541](../../../src/free-drag/spec.ts#L500-L541)). The evidence separately proves no committed-state poisoning, platform reporting, normal completion, a finite positive control and the malformed-point boundary that still reaches `FAILURE_ACTION_PREPARE` ([anchor.browser.test.ts:398-475](../../../tests/free-drag/anchor.browser.test.ts#L398-L475)). Those rows distinguish the finite-value policy from general argument validation.

### Activation snapshot

The kernel derives `inheritedSpace` from the same pre-mutation measurement used to acquire the lift and puts it on `ActivationScope` ([kernel/kernel.ts:1136-1178](../../../src/kernel/kernel.ts#L1136-L1178)); free drag consumes that value without taking a second traversal ([free-drag/spec.ts:283-295](../../../src/free-drag/spec.ts#L283-L295)). The regression changes transform or zoom from overridden `setPointerCapture` in the exact interval where the deleted second traversal ran and checks both in-place and lifted modes plus the release request ([activation-snapshot.browser.test.ts:50-154](../../../tests/free-drag/activation-snapshot.browser.test.ts#L50-L154)). This is a discriminating snapshot test rather than a same-state geometry check.

### Action legality

Free drag admits both behavior tags only in `ACTIVATING` and `ACTIVE`; later phases return the existing no-op sentinel before tag-specific work ([free-drag/spec.ts:430-477](../../../src/free-drag/spec.ts#L430-L477)). The action suite covers late calls from `onDrop`, the landing runner and `onEnd`, a live `onStart` positive control, absence of failure publication, and the late policy-source/constraint path ([actions.browser.test.ts:82-235](../../../tests/free-drag/actions.browser.test.ts#L82-L235)). The sortable's settling-time collection invalidation is separately retained as the cross-behavior control recorded in [COVERAGE.md:720-726](../../../tests/COVERAGE.md#L720-L726), so the evidence does not accidentally impose free drag's legality on the kernel.

### Teardown and failure closure

The kernel guards both admission reporting and quality reporting against logical closure before invoking the behavior-owned reporting hook ([kernel/kernel.ts:734-748](../../../src/kernel/kernel.ts#L734-L748), [kernel/kernel.ts:831-850](../../../src/kernel/kernel.ts#L831-L850)). The focused lifecycle suites cover destroy-then-throw versus throw-without-destroy, and both behaviors' final activation barriers; the validation suite covers the landing-quality route. The late-action evidence above verifies that teardown leaves no transform and publishes no extra failure or terminal. These focused suites all passed, and I found no live normative sentence contradicting their behavior.

## Closure condition

Checkpoint E can close without a runtime change once the calling-convention account is made singular and precise:

1. name the nested `MotionConstraint` / `InsertionGeometry` capability record as the forbidden receiver everywhere, rather than “the record the installer returned” or “contribution object”;
2. keep only that negative author obligation on the published declarations and in live normative statements, leaving lift location, flattening and current receiver values explicitly as implementation/evidence rather than promise;
3. correct D-90's remaining “three call sites” sentence to five.

After those corrections, the implementation and the existing five-site instruments already provide the evidence needed to close Checkpoint E and begin Phase 21 optimization.