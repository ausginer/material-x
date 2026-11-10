# Test title follow-up handoff

**For:** one `implementer` unit on `drag/feature-composition`. **Base:** the commit that carries this handoff and [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md).

**Governing records:** `DRF-19` in [`00-index.md`](00-index.md), the assessment's §3, and CONTRIBUTING §Unit tests. The [feature proof](reviews/combined-ownership/remediation-reviewer.md) reports the two instances as `RR-a` and `RR-b`, with probes H1 to H3.

**Goal:** after this unit, the two test titles that `DRF-19` names state only what their bodies do.

## Boundaries

**In scope:** the two items below, in `packages/drag/tests/terminals.browser.test.ts` and `packages/drag/tests/faults.browser.test.ts`.

**Out of scope.** Don't change anything else, even where a file is already open:

- any file under `src/` or `bench/`, and any other test;
- the optional findings `DRF-13`, `DRF-14`, `DRF-15`, `DRF-17` and `DRF-18`;
- the first `expect(log).toEqual([])` in the hidden-visual test. It can fail (probe H1), and no finding requires removing it;
- any size ceiling, control figure or test threshold.

## Items

### 1. The `fault` case label (`DRF-19` (a))

**Site:** `tests/terminals.browser.test.ts`, the first `it.each` in `drag:DRI-3 terminals`, titled "should report a throw from activate once and leave the list clean: %s before the throw".

**Required properties:**

1. Each case's rendered title describes what that case's body does before the throw. The case in which nothing runs before the throw doesn't name a step before it.
2. Each case still asserts that exactly its own throw is reported, and that the list is clean. If the case value also serves as the thrown message, keep the message assertion matched to the throw.
3. The three cases and their bodies stay as they are, apart from what properties 1 and 2 need.

### 2. The hidden-visual test (`DRF-19` (b))

**Site:** `tests/faults.browser.test.ts`, `drag:DRI-7 faults` › "should report a platform throw and keep the controller: a hidden visual has no box".

**Required properties:**

1. The title names no platform call. It names what the assertions can fail on: the lift's acquisition reports one fault for a visual with no box, and the controller still runs a later drag.
2. The fault assertion identifies the fault. Exactly one fault is reported, and its cause's message is `lift/visual-no-box-space`. A count alone doesn't meet this property.
3. The second drag and its `expect(log).toEqual(['start'])` stay. They witness that the controller is kept.

**Mutation M3,** in the working tree or a scratch copy, and not committed:

- **M3a:** in `Lifter.acquire` (`src/lift.ts`), make the box check throw an error with a different message. The test must fail on the assertion that property 2 adds.
- **M3b:** probe H1 from the proof: `acquire` doesn't throw for a visual with no box. The test must still fail.

Report each mutation's diff and the assertion that failed. Restore the source afterwards.

## Verification

Follow [`handoff.md`](../../../.agents/docs/handoff.md) for both changed `.ts` files and for the report. Run these in `packages/drag`:

| Check | Required result |
| --- | --- |
| `npx just typecheck`, `npx just lint` | Exit 0. Lint prints nothing from either tool |
| `git diff --stat <base>..HEAD -- src bench` | Empty. No emitted JavaScript can change, so no build comparison is owed |
| The two changed files in Chromium, Firefox and WebKit, with `~/.cache/ms-playwright/webkit-env.sh` sourced | All pass. Report the counts per engine |
| M3a, M3b | Each fails as item 2 requires |

A full `npx just test` or `npx just test-engines` run is not owed. The unit changes two titles and one assertion in two test files.

## Commits, report and push

- **Commits:** subject-only, one per item or one for both. Don't amend, rebase or squash.
- **Report:** `packages/drag/.plan/test-title-follow-up-report.md`, committed last. It gives the new titles and assertion, each check's result, each mutation's diff and failing assertion, and any deviation with its reason.
- **Push** `drag/feature-composition` after the report's commit. No PR.

## Return conditions

Stop, commit what holds, report, and return to the architect if:

- a property can't be met without a change outside the two test files;
- M3a or M3b doesn't fail.

## After the report

The architect reads the report and the unit's diff and closes `DRF-19`. No separate review pass is owed.