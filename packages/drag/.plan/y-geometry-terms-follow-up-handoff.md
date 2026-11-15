# Handoff: a still consumer transform, the bench's `__DEV__` define, and one comment line

**Folded on 2026-11-15, before it was routed, into [`drag2-guarantees-remediation-handoff.md`](drag2-guarantees-remediation-handoff.md),** whose items 1 to 3 are the items below, unchanged. Don't run this handoff on its own. The text below is unchanged.

**Recipient:** the implementer. **Branch:** `drag2/removal`, or one the owner names. **Input:** the architect's record commit on `drag2/removal` that adds this handoff.

**Governing records:** `drag:DRD-67` property 2 and its decided property 7 stop, and `drag:DRD-65` property 6, in [`00-index.md`](00-index.md), with §Disposition of the `y()` geometry terms report. The evidence is the architect's [probe](probes/y-geometry-terms-ruling/README.md).

**Scope:** `tests/layout-animation.browser.test.ts`, `bench/size/measure.ts`, `bench/compare.ts` and `src/sortable/y.ts`'s module comment. Code in `src` and `bench` doesn't change. The emitted `.js` differs from the input's only in comments.

## 1. The consumer's transform animation holds the row still (`DRD-67` property 7)

At `tests/layout-animation.browser.test.ts:266`, _should leave a consumer animation on transform running_, the consumer's animation stays on `transform`, and its two keyframes are equal, for example `translateX(10px)` in both. A comment of one line says why: a row that moves during the drag without `invalidate()` is outside `drag:DRI-14`. The neighbouring `translate` test's comment is a model. The title and the assertions don't change, and no mismatch is consumed. The probe's [`consumer-transform-constant.diff`](probes/y-geometry-terms-ruling/consumer-transform-constant.diff) is one form, without the comment.

## 2. The bench says why it keeps the define (`DRD-67` property 2)

At `bench/size/measure.ts:199` and `bench/compare.ts:115`, the `__DEV__: 'false'` define stays. A comment at each site says why. These tools build source from earlier revisions (`--prototype` in `measure.ts`, `--before` in `compare.ts`), and that source reads `__DEV__`. The define reproduces those revisions' own `tsdown` define, and current source doesn't read it.

## 3. One comment line rewrapped (`DRD-65` property 6)

`src/sortable/y.ts:17` is 132 characters long. Rewrap the paragraph to the width of the module comment's other lines, without changing its words.

## Checks

- `npx just test` in `packages/drag`: only the five `size.node.test.ts` ceiling rows fail (`DRO-4`).
- `npx just test-engines --project browser --project browser/firefox --project shipped --project shipped/firefox` exits 0. WebKit isn't owed locally (`DRO-18`).
- `npx just typecheck` and `npx just lint` in `packages/drag` exit 0 on the edited files.
- The Verify steps of [`handoff.md`](../../../.agents/docs/handoff.md) for every edited file.
- Against a build of the input, the emitted `.js` differs only in comments, or not at all.

A test that newly fails is a stop. Report it with its assertion and don't adjust it.

## Report

`packages/drag/.plan/y-geometry-terms-follow-up-report.md`: each edit as `file:line`, the checks with their results, the comparison of the emitted `.js`, any stop, and the commits. The unit stops at the pushed report.