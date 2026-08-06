# Checkpoint C micro-review — final normative cleanup

Hey, the architecture is closed. The follow-up pass resolves the substantive review points, and I do not think D-32…D-35 need another redesign.

There are only two small contradictions left before Checkpoint C can close, plus two wording/order nits. Let’s fix these narrowly and avoid reopening the protocol.

## 1. Early acknowledgement without a declared presentation: choose one normative result

Document 02 still contains both of these meanings:

```text
an early acknowledgement for an operation that later declares no presentation
→ simply dropped
```

and:

```text
presentation not declared, but acknowledgement received
→ ignored and reported
```

Document 06 follows the second meaning.

Please make the second one normative everywhere:

```text
controller.ready(request)
→ identity matches, so the resolution attempt latches the acknowledgement
→ fulfilled resolution later declares presentation: false
→ report a contradictory acknowledgement
→ drop the latch
→ do not add or release a readiness hold
→ settlement outcome is unchanged
```

This is not a classified operation failure. It is a consumer-protocol report, analogous to a stale, forged or duplicate request: loud, but never applied.

Replace wording such as “simply dropped” with “reported as contradictory and then dropped”, and align the matrix row, trace and invariant/finding language.

## 2. The compiled fixture promises reporting but only returns

`phase-14.ts` currently has the effective shape:

```ts
ready(request): void {
  if (request !== runtime.pendingRequest) {
    // Stale, forged, or duplicate: reported, never applied.
    return;
  }

  host.presentationCommitted();
}
```

The comment and contract promise **ignored and reported**, but the fixture demonstrates only **ignored**.

Please make the report path explicit in the fixture. For example:

```ts
if (request !== runtime.pendingRequest) {
  reportInvalidAcknowledgement(request);
  return;
}
```

The exact reporting surface is open, but it must not classify or fail the current operation.

Also show the kernel-side report for the other contradictory case:

```text
an early matching acknowledgement was latched
the resolution later declares presentation: false
→ report and discard the latch
```

This matters because the accepted C2-01 position relies on invalid protocol states being visible even though omitting `{ presentation: true }` remains tier-C discipline.

## Small consistency nits

### Fixture size comment

The fixture still says that it is “400 lines”; it is now roughly twice that. Remove the number or update the wording so it does not immediately drift again.

A stable version would be:

> This file is large enough to look executable, but remains a type-only fixture.

### `pendingRequest` publication order

The fixture publishes `rt.pendingRequest` before the final `lift.write`, while the trace appears to publish it after that write.

Both orders satisfy D-33 as long as publication happens before `onReorder(request)` can run. Still, choose one order and use it consistently.

My preference is:

```text
release.effect:
  perform the committed presentation writes
  publish pendingRequest
kernel:
  invoke onReorder(request)
```

That keeps `pendingRequest` from becoming visible if the final renderer write fails and the staged resolution command is therefore never executed. If there is a reason to publish first, state it and make the trace match.

## Requested outcome

Let’s make one micro-pass:

1. Normalize “early ready + presentation false” to **report and discard**.
2. Demonstrate the report path in `phase-14.ts` for mismatched and contradictory acknowledgements.
3. Remove the stale fixture line-count claim.
4. Align `pendingRequest` publication order between the fixture and document 06.
5. Run typecheck and the existing test suite.

After that, Checkpoint C can close without another architectural review.