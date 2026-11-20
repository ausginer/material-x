# Artifact 3 — Failure table

## 1. Failure boundary

A function returns `false` only for a condition that this document explicitly recognizes as unsupported or unrepresentable.

Before returning `false`, the function leaves every slot of its own `out` unchanged. In the read of [artifact 1](01-public-api.md) §2, a failing measurement ends the read before `projection` writes, so the caller's quad is unchanged too. Every read is fresh, so repaired geometry is observable at the next measurement.

The table doesn't authorize broad exception handling. Contract violations, unexpected platform exceptions and implementation defects escape normally and are not rewritten as geometry failures.

## 2. Recognized failures

| ID | Condition | Recognized by | Result |
| --- | --- | --- | --- |
| `FAIL-NO-SOURCE-BOX` | The source is disconnected or generates no principal border box, including `display:none` or the source's own `display:contents` | `coordinates`, before it composes the source's space. `ancestry` doesn't fail for it | `false`, unchanged output |
| `FAIL-SOURCE-FRAGMENTED` | The source produces more than one CSS box or fragment | `coordinates`, before it accepts the source's dimensions. `ancestry` doesn't fail for it | `false`, unchanged output |
| `FAIL-NO-TARGET-BOX` | The target is disconnected or generates no principal border box | `coordinates` on the target, so the read ends before `projection` | `false`, unchanged output |
| `FAIL-TARGET-FRAGMENTED` | The target produces more than one CSS box or fragment | `coordinates` on the target, so the read ends before `projection` | `false`, unchanged output |
| `FAIL-3D` | The measured element, or a node above it in the rendered ancestry, has a computed transform that isn't 2D, including an individual `rotate` about another axis that isn't a whole turn, and a `scale` or `translate` with a z component | `ancestry` for a node above the element; `coordinates` for the element or a node above it | `false`, unchanged output |
| `FAIL-PERSPECTIVE` | A node in the rendered ancestry, or the measured element, has a `perspective` other than `none` | As `FAIL-3D` | `false`, unchanged output |
| `FAIL-PRESERVE-3D` | A node in the rendered ancestry, or the measured element, uses `transform-style: preserve-3d` | As `FAIL-3D` | `false`, unchanged output |
| `FAIL-TARGET-NONINVERTIBLE` | The target's local-to-viewport matrix can't be inverted to finite 2D values | `projection`, before it applies the target's inverse | `false`, unchanged output |
| `FAIL-BASIS-NONINVERTIBLE` | The basis passed to `localDelta` is singular | `localDelta` | `false`, unchanged output |
| `FAIL-NONFINITE` | A recognized geometry calculation produces a non-finite value: a matrix entry or size in `coordinates`, a corner in `projection`, or a delta in `localDelta` | The function that computes it, before its output commit | `false`, unchanged output |

**`FAIL-CROSS-DOCUMENT` is withdrawn** (2026-11-20). It made a source and a target with different `ownerDocument` identities a recognized `false`. No function can recognize it, because a `Box` carries no document. It is a precondition of `projection` (§4 below, and artifact 1 §4.3). The ID isn't reused.

The _rendered ancestry_ is the flat-tree path above an element: assigned slots, parent elements and shadow hosts. Fixed containing blocks and scrolling ancestors contribute through the element's client rect. It doesn't mean scanning unrelated document elements.

## 3. Boundary cases that succeed

These cases must not be confused with recognized failures:

| Case | Required result |
| --- | --- |
| An otherwise supported connected source with a principal box whose width or height is zero | Succeeds with coincident corners |
| An otherwise supported source transformed by a singular 2D matrix, such as `scale(0)` | Its measurement and its viewport projection succeed with a degenerate quad |
| An otherwise supported source transformed by a negative 2D scale | Succeeds and keeps corner identity |
| `display:contents` in the ancestry of an otherwise supported source that has its own principal box | Succeeds. An ancestor without a box isn't a source failure |
| A `display:contents`, fragmented or disconnected element passed to `ancestry` | `ancestry` succeeds. It never reads the element's own box |
| A 2D-equivalent computed transform represented as a 2D matrix | Succeeds whatever the authored syntax |
| A fixed, sticky, vertical-writing or slotted source within the supported model | Succeeds |
| A source and target wholly inside the same iframe document | Succeeds in that document's realm and layout viewport |

If the singular source in the second row is also the target, the projection fails with `FAIL-TARGET-NONINVERTIBLE`. This includes projecting a box against itself:

```ts
coordinates(element, box);
projection(box, out, box); // false
```

The source and the target being the same `Box` doesn't bypass the target-invertibility rule.

## 4. Contract violations and escaping errors

The following are outside the boolean failure contract:

| Situation | Contract |
| --- | --- |
| `element` isn't an `HTMLElement`, after TypeScript is bypassed | No validation or particular error type is required |
| An output is too short, the wrong typed-array kind, detached or not writable | No validation or particular error type is required |
| A `Box` or `Space` passed as input wasn't written by a successful call | No validation; the result has no meaning |
| `source` and `relativeTo` were measured in different documents | Not detected, and the result has no meaning (artifact 1 §4.3) |
| `above` isn't the element's own `ancestry` | Not detected, and the result has no meaning (artifact 1 §4.2) |
| A platform property getter or `DOMMatrix` method unexpectedly throws | The exception escapes |
| The owner document lacks a usable `defaultView` or matrix primitive | An environment error escapes. It isn't a `false` result |
| Internal implementation code throws | The exception escapes |

The implementation may throw naturally while using malformed values. It must not add validation only to produce an exception, and it must not catch an unexpected exception only to return `false`.

The unchanged-output guarantee is binding for the rows in §2. It isn't promised for an escaping exception.

## 5. Detection and commit rule

Each function has two observable stages:

```text
recognize + calculate into private state
                    ↓
       commit every slot of its out
```

Every §2 failure ends before the commit stage. The contract doesn't prescribe the private state's shape. Later performance work decides it.

## Change record

| Date | Section | Change |
| --- | --- | --- |
| 2026-11-20 | All | **Rewritten for the exported API** (`F-1`). The table named one single-call read function as the place every failure was recognized. Each failure now names the function that recognizes it, and §5 applies to each function's own output. **`FAIL-CROSS-DOCUMENT` is withdrawn** and becomes a §4 precondition, because a `Box` carries no document. It had been unimplemented since `162f300fa` split measurement from projection, and the `REL-10` test asserts that it isn't detected. **`FAIL-BASIS-NONINVERTIBLE` is added** for `localDelta`, which the table didn't cover. Two §4 rows are added for the preconditions of `coordinates` and `projection`, and §3 gains the `ancestry` row |