# Checkpoint E — final closure verification of CE6-01 and CE6-02

- **Reviewer:** Codex
- **Date:** 2026-08-19
- **Subject:** D-94 closure of the receiver referent and mechanism-as-promise findings
- **Tree:** `4f4fb679` on `drag2/phase21`

**Scope.** CE6-01 and CE6-02 only, against D-94 and commit `4f4fb679`. This pass checks the two published capability declarations, the permanent receiver instruments, live calling-convention wording, the corrected D-90/D-92/D-93 account, and D-94's marker/deferred state. It does not reopen the other contribution hooks, D-88, or any other Checkpoint E/package concern.

## Verification

| Gate | Result |
| --- | --- |
| `npx just typecheck` | clean |
| `npx just test tests/decisions.node.test.ts` | **12 passed**, no type errors |
| focused browser command | not independently rerun: local-browser permission review timed out twice before execution |

The browser limitation does not conceal an executable change. From the CE6 review tree through `4f4fb679`, the two browser instruments changed only comments and one test title; `expectDetached`, the nested `own()` identities and every site assertion are unchanged. Those same instruments passed in the CE6 baseline. The D-94 source changes are documentation comments, and the two D-94 commits otherwise change normative/coverage prose.

## Verdict

**CE6-01 and CE6-02 are closed. Checkpoint E is safe to close, and Phase 21 optimization may begin.**

No remaining blocker or material contradiction was found within the requested scope.

## CE6-01 — closed: declaration and instrument name the same capability record

Both published declarations now state the receiver negative self-referentially, on the object whose members it governs:

- `InsertionGeometry`: “These members are never invoked with this `InsertionGeometry` as their receiver” ([sortable/feature.ts:72-80](../../../src/sortable/feature.ts#L72-L80));
- `MotionConstraint`: “These members are never invoked with this `MotionConstraint` as their receiver” ([free-drag/feature.ts:88-96](../../../src/free-drag/feature.ts#L88-L96)).

Each declaration explicitly distinguishes that nested capability record from the outer contribution object. Both give the discriminating counterexample: `contribution.insertion.resolve(…)` or `contribution.constrain.apply(…)` binds the nested capability and never uses the contribution object, so a guarantee against the outer record would forbid nothing ([sortable/feature.ts:74-78](../../../src/sortable/feature.ts#L74-L78), [free-drag/feature.ts:90-94](../../../src/free-drag/feature.ts#L90-L94)). This is the exact nested-versus-outer distinction CE6-01 required.

The permanent instruments enforce the same identity:

- the sortable fixture constructs a distinct nested `insertion`, stores that object as `own`, and returns a new outer `{ ...contribution, insertion }` ([calling-convention.browser.test.ts:61-70](../../../tests/sortable/calling-convention.browser.test.ts#L61-L70), [calling-convention.browser.test.ts:82-122](../../../tests/sortable/calling-convention.browser.test.ts#L82-L122));
- `expectDetached` compares every reached receiver with that nested `recording.own()` ([calling-convention.browser.test.ts:218-230](../../../tests/sortable/calling-convention.browser.test.ts#L218-L230));
- the free-drag fixture similarly returns `{ constrain }` from the installer while `own()` returns the nested `MotionConstraint` itself ([anchor.browser.test.ts:119-149](../../../tests/free-drag/anchor.browser.test.ts#L119-L149));
- its shared assertion receives that nested object and rejects only receiver identity with it ([anchor.browser.test.ts:152-180](../../../tests/free-drag/anchor.browser.test.ts#L152-L180)).

The coverage ledger now names the same referent and explains why comparing against the outer contribution would be non-discriminating ([COVERAGE.md:758-768](../../../tests/COVERAGE.md#L758-L768)). Contract 03 and contract 07 state the same capability-record identity ([03-feature-composition.md:250-254](../../../.plan/contract/03-feature-composition.md#L250-L254), [07-free-drag-contract.md:412-416](../../../.plan/contract/07-free-drag-contract.md#L412-L416)). There is no remaining contract/evidence split over which object is forbidden.

## CE6-02 — closed: representation is no longer the guarantee

The published declarations now separate obligation from representation:

- `InsertionGeometry` says every concrete receiver is unspecified, labels flattening “mechanism, not promise,” and expressly permits a later representation that stops lifting a member while preserving the receiver negative ([sortable/feature.ts:82-96](../../../src/sortable/feature.ts#L82-L96));
- `MotionConstraint` gives the same unspecified-receiver rule and labels the current lift locations “mechanism, not promise” and “measured code,” free to change while the negative holds ([free-drag/feature.ts:98-116](../../../src/free-drag/feature.ts#L98-L116)).

The test/coverage wording has the same boundary. The sortable header labels the lift layout and concrete receiver distribution “measured code, not the guarantee,” then says no row asserts those values ([calling-convention.browser.test.ts:12-31](../../../tests/sortable/calling-convention.browser.test.ts#L12-L31)). Free drag labels the `undefined`/array distribution measured evidence and states that the rows assert only `receiver !== own()` ([anchor.browser.test.ts:152-170](../../../tests/free-drag/anchor.browser.test.ts#L152-L170)). `COVERAGE.md` says every other receiver value is unspecified and no row names one ([COVERAGE.md:758-768](../../../tests/COVERAGE.md#L758-L768)).

Normative contract 03 now says the obligation, not the flattening, binds the author; the former mechanism promises are struck, and the surviving flattening/lift/value account is expressly current mechanism and measured code ([03-feature-composition.md:246-256](../../../.plan/contract/03-feature-composition.md#L246-L256)). Contract 07 states only the capability-record negative as the obligation; its bare-call and call-origin statements are struck history, while the surviving lift/site material appears under “How closure was measured” and “code, not guarantee” ([07-free-drag-contract.md:412-430](../../../.plan/contract/07-free-drag-contract.md#L412-L430)).

No live source, normative or test statement found in the scoped sweep turns flattening, lift location, bare invocation or a concrete receiver value back into the author-visible guarantee.

## D-90, D-92, D-93 and D-94 bookkeeping

The earlier rows now agree on the material facts:

- D-90's live obligation names `MotionConstraint` itself, and its operative count is five sites. The superseded detached/three-site sentence is struck, followed by the live “five sites, not three” correction ([00-index.md:383](../../../.plan/contract/00-index.md#L383)). Because the raw row contains nested strike delimiters, I rendered it with the repository's `markdown-it`; the old “The three call sites” text is inside `<s>`, not live.
- D-92 keeps the scope on the two geometry/constraint capability records, explicitly declines the wider package/contribution-hook claim, names the nested `InsertionGeometry`, and retains five sites plus the six-row aggregate falsifier ([00-index.md:388-394](../../../.plan/contract/00-index.md#L388-L394)).
- D-93 states the receiver-negative-only guarantee, treats every positive receiver value as unpromised, and records five sites in both tiers ([00-index.md:398-406](../../../.plan/contract/00-index.md#L398-L406)). Its lift and receiver-value detail is the recorded falsifier/evidence, not the guarantee.
- D-94 is marked **Implemented, 2026-08-19**, states the capability-record referent, forbids mechanism promises, and expressly preserves D-92's two-record scope ([00-index.md:408-418](../../../.plan/contract/00-index.md#L408-L418)).

The “Decisions not yet implemented” table is empty ([00-index.md:420-435](../../../.plan/contract/00-index.md#L420-L435)); no `Unimplemented (…)` marker remains; and the bidirectional decision instrument passes all 12 tests. The marker, deferred state and tree therefore agree.

## Closure

CE6-01's falsifier and its published promise now identify the same nested capability record. CE6-02's promise is now representation-independent, while current call shape survives only as explicitly identified mechanism, history or measured evidence. The D-94 decision is implemented and retired from the deferred ledger.

**Checkpoint E is safe to close. Phase 21 may begin.**