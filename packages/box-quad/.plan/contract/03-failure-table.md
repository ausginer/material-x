# Artifact 3 — Failure table

## 1. Failure boundary

`readBoxQuad` returns `false` only for an explicitly recognized unsupported or unrepresentable geometry condition in this document.

Before returning `false`, the implementation must leave all eight caller-owned output values unchanged. Every read is fresh, so repaired geometry is observable on the next call.

The table does not authorize blanket exception handling. Contract violations, unexpected platform exceptions and implementation defects escape normally and are not rewritten as geometry failures.

## 2. Recognized failures

| ID | Condition | Detection boundary | Result |
| --- | --- | --- | --- |
| `FAIL-NO-SOURCE-BOX` | Source is disconnected or does not generate a principal border box, including `display:none` or source `display:contents` | Before composing source space | `false`, unchanged output |
| `FAIL-SOURCE-FRAGMENTED` | Source produces more than one CSS box/fragment | Before accepting source dimensions | `false`, unchanged output |
| `FAIL-NO-TARGET-BOX` | Target is disconnected or does not generate a principal border box | Before target inversion | `false`, unchanged output |
| `FAIL-TARGET-FRAGMENTED` | Target produces more than one CSS box/fragment | Before target inversion | `false`, unchanged output |
| `FAIL-CROSS-DOCUMENT` | Source and target have different `ownerDocument` identities, including parent/child iframe documents | Before composing the target conversion | `false`, unchanged output |
| `FAIL-3D` | Source, target or a relevant rendered ancestry contribution has a genuinely non-2D computed transform | During space construction, before output commit | `false`, unchanged output |
| `FAIL-PERSPECTIVE` | A relevant rendered ancestry contribution has non-`none` perspective | During space construction, before output commit | `false`, unchanged output |
| `FAIL-PRESERVE-3D` | A relevant rendered ancestry contribution uses `transform-style: preserve-3d` | During space construction, before output commit | `false`, unchanged output |
| `FAIL-TARGET-NONINVERTIBLE` | Target local-to-viewport matrix cannot be inverted to finite 2D values | Before applying the target inverse | `false`, unchanged output |
| `FAIL-NONFINITE` | An otherwise recognized geometry calculation produces a non-finite corner coordinate | Before output commit | `false`, unchanged output |

“Relevant rendered ancestry” means the geometry path needed to construct the requested source and target spaces. It includes flat-tree host/slot relationships, fixed containing blocks and applicable scrolling ancestors. It does not mean scanning unrelated document elements.

## 3. Boundary cases that succeed

These cases must not be confused with recognized failures:

| Case | Required result |
| --- | --- |
| Otherwise supported connected source with a principal box whose width or height is zero | Succeeds with coincident corners |
| Otherwise supported source transformed by a singular 2D matrix, such as `scale(0)` | Succeeds for viewport output with a degenerate quad |
| Otherwise supported source transformed by a negative 2D scale | Succeeds and preserves corner identity |
| `display:contents` in ancestry while an otherwise supported source has its own usable principal box | Succeeds; absence of an ancestor box is not itself a source failure |
| 2D-equivalent computed transform represented as a 2D matrix | Succeeds regardless of authored syntax |
| Fixed, sticky, vertical-writing or slotted source within the supported model | Succeeds |
| Source and target wholly inside the same iframe document | Succeeds in that document's realm and layout viewport |

If the singular source in the second row is also used as `relativeTo`, it becomes `FAIL-TARGET-NONINVERTIBLE`. This includes the self-relative request:

```ts
readBoxQuad(element, out, element);
```

Identity of the source and target does not bypass the target-invertibility rule.

## 4. Contract violations and escaping errors

The following are outside the boolean failure contract:

| Situation | Contract |
| --- | --- |
| `element` or `relativeTo` is not an `HTMLElement` after TypeScript is bypassed | No validation or particular error type is required |
| `out` is too short, the wrong typed-array kind, detached or non-writable | No hot-path validation or particular error type is required |
| A platform property getter or `DOMMatrix` method unexpectedly throws | The exception escapes |
| The owner document lacks a usable `defaultView` or required matrix primitive | An environment error escapes; it is not `false` geometry |
| Internal implementation code throws | The exception escapes |

The implementation may naturally throw while using malformed values. It must not add validation only to manufacture an exception, and it must not catch an unexpected exception merely to return `false`.

The unchanged-output guarantee is binding for rows in §2. It is not promised for an escaping exception.

## 5. Detection and commit rule

A conforming read has two observable stages:

```text
recognize + calculate into private state
                    ↓
          commit all eight values
```

Any §2 failure ends before the commit stage. The contract does not prescribe whether private state is eight scalars, a temporary array or another representation; later performance work decides that shape.
