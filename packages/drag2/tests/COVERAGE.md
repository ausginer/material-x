# Test matrix coverage

Every row of [05 §Test matrix](../../../.agents/docs/drag/contract/05-lifecycle-invariants.md)
against the file that closes it and the invariant it is about. Phase 10's *done
when* is this table: **every row maps to a passing test or to a written,
justified exclusion.**

Paths are relative to `packages/drag2`. Where a row is closed by several tests
the entry names the one that would fail first.

---

## Basic flow

| Row | Test | ID |
| --- | --- | --- |
| press below threshold | `tests/sortable/composition.browser.test.ts` — *should not activate before the threshold is crossed* | D-1 |
| activation after threshold | `tests/sortable/composition.browser.test.ts` — *should activate on a press that crosses the threshold* | D-1 |
| placeholder insertion | `tests/sortable/sortable.browser.test.ts` — *should create the placeholder detached and insert it after the item* | I-17, D-27 |
| continuous pointer following | `tests/sortable/sortable.browser.test.ts` — *should render the committed sample and coalesce the spatial search* | I-26 |
| downward reorder | `tests/sortable/composition.browser.test.ts` — *should move the gap once another centre is nearer* | — |
| upward reorder | `tests/sortable/composition.browser.test.ts` — *should return to an earlier gap when the pointer comes back* | — |
| release at the current insertion | `tests/sortable/composition.browser.test.ts` — *should propose the gap the pointer settled on* | I-12 |
| no-op release | `tests/sortable/composition.browser.test.ts` — *should finish a drop that never left its own gap as a no-op* | F-29, F-37 |
| immediate landing | `tests/sortable/features.browser.test.ts` — *should hold the gate even with a zero duration* | I-9 |

## Boundary

| Row | Test | ID |
| --- | --- | --- |
| no oscillation at an insertion threshold | `tests/sortable/vertical.browser.test.ts` — *should keep the incumbent gap on a tie*; `tests/sortable/displacement.browser.test.ts` — *should not propose a reversal while a displacement is running* | D-7 |
| rapid alternating samples preserve FIFO | `tests/sortable/sortable.browser.test.ts` — *should render the committed sample and coalesce the spatial search* (three samples, one frame) | 02 §Queue |
| release uses the final synchronous geometry | `tests/sortable/sortable.browser.test.ts` — *should render the final sample, not the last processed move* | I-12 |
| pending frame work cannot alter the released proposal | `tests/sortable/sortable.browser.test.ts` — *should discard a spatial action at RELEASING* | I-4, I-12 |

## Readiness

| Row | Test | ID |
| --- | --- | --- |
| consumer accepts but readiness is delayed | `tests/sortable/composition.browser.test.ts` — *should hold settlement open for a pending readiness promise* | I-9 |
| landing before React | `tests/kernel/kernel.browser.test.ts` — *should not finalize in the resolution drain while readiness is held* | I-9 |
| React before landing | `tests/kernel/kernel.browser.test.ts` — *should re-anchor and retarget when readiness settles first* | F-16 |
| both immediate | `tests/kernel/kernel.browser.test.ts` — *should finalize in the resolution drain when neither gate is held* | I-9 |
| stale readiness from an older operation | `tests/sortable/composition.browser.test.ts` — *should ignore readiness that settles after a newer operation began* | F-25 |
| readiness never settles and the timeout applies | `tests/kernel/kernel.browser.test.ts` — *should replace the settlement when readiness times out*; `tests/sortable/landing-space.browser.test.ts` — *should apply the configured bound rather than the default* | I-9 |
| **readiness resolved from a real `useLayoutEffect()` fixture** | `tests/sortable/react.browser.test.ts` — *should resolve readiness from a real layout effect*, *should not finalize before React has committed* | I-9, I-25 |

## Reentrancy

| Row | Test | ID |
| --- | --- | --- |
| `onStart` cancels → canceled at `AT_PROPOSAL`, null proposal, never `ACTIVE` | `tests/sortable/composition.browser.test.ts` — *should settle a cancel from inside onStart as canceled* | I-31, F-33 |
| `onStart` destroys | `tests/sortable/composition.browser.test.ts` — *should destroy from inside onStart without leaving presentation behind* | I-6 |
| `onReorder` cancels → the cancel wins | `tests/kernel/kernel.browser.test.ts` — *should let a cancel raised from inside invoke win* | F-25, I-22 |
| `onReorder` destroys | `tests/sortable/composition.browser.test.ts` — *should tear down without a terminal callback when onReorder destroys* | I-6 |
| a callback queues work and then throws | `tests/sortable/composition.browser.test.ts` — *should apply work a callback queued before it threw* | I-22, I-31 |
| a terminal callback destroys | `tests/sortable/composition.browser.test.ts` — *should tolerate a destroy from inside the terminal callback* | I-6 |

## Async attempts

| Row | Test | ID |
| --- | --- | --- |
| late reorder resolution after a newer operation | `tests/sortable/composition.browser.test.ts` — *should ignore a resolution that settles after a newer operation began* | F-25 |
| late landing completion | `tests/kernel/kernel.browser.test.ts` — *should make a completion for a retired attempt inert* | I-24 |
| interrupted landing | `tests/sortable/features.browser.test.ts` — *should not report a cancelled animation as a failure* | I-24 |
| stale layout-animation completion | `tests/sortable/displacement.browser.test.ts` — *should release a row still running from an earlier move* | D-7 |

## Resource cleanup

| Row | Test | ID |
| --- | --- | --- |
| partial activation failure | `tests/sortable/sortable.browser.test.ts` — *should stop when the placeholder insertion destroyed the controller* | I-17, F-22 |
| placeholder factory throws | `tests/sortable/features.browser.test.ts` — *should classify a factory that throws and leave nothing acquired* | I-17 |
| presentation acquisition throws | `tests/kernel/presentation.browser.test.ts` — *should restore the inline styles when top-layer acquisition throws* | I-17 |
| animation creation throws | `tests/sortable/features.browser.test.ts` — *should cancel the animation when subscribing to it throws* | F-22 |
| destroy during active movement | `tests/sortable/composition.browser.test.ts` — *should tear down an in-flight drag on destroy* | I-6 |
| destroy during consumer resolution | `tests/kernel/kernel.browser.test.ts` — *should drop a resolution that settles after the controller was destroyed* | I-6, F-25 |
| destroy during long landing | `tests/kernel/kernel.browser.test.ts` — *should destroy a live runner when the controller is destroyed* | I-6, I-24 |
| disposer failure does not prevent remaining cleanup | `tests/kernel/lifetimes.node.test.ts` — *should run the remaining disposers when one throws* | D-21, F-22 |

## Collection

| Row | Test | ID |
| --- | --- | --- |
| update during active movement | `tests/sortable/sortable.browser.test.ts` — *should rebase a surviving gap during an active drag* | D-25 |
| dragged item disappears | `tests/sortable/sortable.browser.test.ts` — *should cancel with item-removed when the dragged item vanishes* | D-25, F-28 |
| neighbour identity changes | `tests/sortable/sortable.browser.test.ts` — *should cancel when an internal gap loses its adjacency* | F-31 |
| update during release | `tests/sortable/sortable.browser.test.ts` — *should not rewrite the frozen snapshot after release* | I-12 |
| update during settlement | `tests/sortable/react.browser.test.ts` — the fixture dispatches `updateItems` from every layout effect, including the commit that resolves readiness | I-12, D-25 |

## Styling and animation

| Row | Test | ID |
| --- | --- | --- |
| no-animation default | `tests/sortable/composition.browser.test.ts` — the minimal composition installs neither `landing()` nor `layoutAnimation()` | 03 §composition |
| CSS layout transition | `tests/sortable/composition.browser.test.ts` — *should propose the same gap when the rows carry a CSS transition* | D-7 |
| long landing duration | `tests/sortable/features.browser.test.ts` — *should hold settlement open until the animation finishes* | I-9 |
| custom animation runner | `tests/sortable/features.browser.test.ts` — *should let a custom runner replace the default entirely* | I-24 |
| interrupted and retargeted displacement | `tests/sortable/displacement.browser.test.ts` — *should replay a still-running row from where it visually is* | D-7 |

## Construction model — new

| Row | Test | ID |
| --- | --- | --- |
| a discarded `activation.prepare` leaves nothing behind and retires | `tests/kernel/seams.node.test.ts` — *should retire the operation when activation discards* | I-17 |
| a reentrant `destroy()` from the placeholder factory discards the prepare | `tests/sortable/sortable.browser.test.ts` — *should stop when the placeholder insertion destroyed the controller* | I-6 |
| `spec.retire()` throwing does not prevent lifetime disposal or ingress abort | `tests/kernel/kernel.browser.test.ts` — *should complete every later step after spec.retire throws* | F-12 |
| one throwing retire hook does not prevent the rest, reverse order | `tests/sortable/sortable.browser.test.ts` — *should run the retire hooks, each wrapped*; `tests/sortable/assemble.browser.test.ts` — *should expose retire hooks in reverse installation order* | F-22 |
| a feature factory throwing mid-`assemble` unwinds collected hooks | `tests/sortable/assemble.browser.test.ts` — *should retire the hooks already collected when a factory throws* | F-19 |
| `arm()` throwing leaves no half-armed controller | `tests/kernel/kernel.browser.test.ts` — *should unwind and rethrow when a frame factory throws* | F-2 |
| both frames share a key set | `tests/kernel/frames.node.test.ts` — *should produce two frames with an identical key set* | F-2 |
| a `resetFramePart` that adds or deletes a key is caught in `__DEV__` | `tests/kernel/frames.node.test.ts` — *should reject a reset that adds a key* / *deletes a key* | F-2 |
| a frame part declaring `phase` is rejected in production | `tests/kernel/frames.node.test.ts` — *should reject a part declaring a kernel frame key* | F-20 |
| a symbol-keyed frame part is rejected | `tests/kernel/frames.node.test.ts` — *should reject a symbol key* | F-20 |
| a displacement hook cannot reach `SettlementScope` | `tests/sortable/feature.declaration.test.ts` — *should not reach the settlement scope* | I-10 |
| `arm()` validates the tag count; `dispatch()` rejects a bad tag before enqueue | `tests/kernel/kernel.browser.test.ts` — *should drop a tag outside the declared range* | 02 §ActionTransition |

## Gates and drivers — new

| Row | Test | ID |
| --- | --- | --- |
| no `landing()` but a pending readiness still holds one gate | `tests/sortable/composition.browser.test.ts` — *should hold settlement open for a pending readiness promise* | I-9 |
| neither gate held finalizes in the resolution drain | `tests/kernel/kernel.browser.test.ts` — *should finalize in the resolution drain when neither gate is held* | I-9 |
| a duplicate `holdForReadiness` is ignored and reported | `tests/kernel/kernel.browser.test.ts` — *should ignore and report a duplicate hold* | F-6 |
| a hold requested after sealing is ignored and reported | `tests/kernel/kernel.browser.test.ts` — *should ignore and report a hold requested after sealing* | F-6 |
| `settlement.prepare` returning a `SeamRejection` classifies at the named stage | `tests/kernel/kernel.browser.test.ts` — *should classify a prepare rejection at the stage it names* | F-20 |
| an `effect` that throws is classified, not a panic | `tests/kernel/seams.node.test.ts` — *should classify a throwing effect from the committed state* | F-19 |
| a `rollback` that throws is reported, not classified | `tests/kernel/seams.node.test.ts` — *should report a throwing rollback without classifying it* | F-19 |
| `use()` on a disposed lifetime invokes the disposer immediately | `tests/kernel/lifetimes.node.test.ts` — *should invoke a disposer registered after dispose immediately* | D-21 |

## Landing completion — new

| Row | Test | ID |
| --- | --- | --- |
| synchronous `done()` from inside `start` | `tests/kernel/kernel.browser.test.ts` — *should honour a done() called synchronously inside start* | F-30 |
| synchronous `fail()` from inside `start` | `tests/kernel/kernel.browser.test.ts` — *should destroy the handle and refuse to finalize after a synchronous fail()* | F-30 |
| duplicate completion is inert | `tests/kernel/kernel.browser.test.ts` — *should ignore a duplicate completion* | I-24 |
| `done()` followed by a throw | `tests/kernel/kernel.browser.test.ts` — *should retain a synchronously completed handle for the join* | F-30 |
| `start` itself throws | `tests/kernel/kernel.browser.test.ts` — *should roll the hold back and classify when start throws* | F-27 |
| `start` calls `destroy()` and returns a live handle | `tests/kernel/kernel.browser.test.ts` — *should destroy a handle returned by a start that destroyed the controller* | F-30 |
| `settlement.effect` requests a hold then throws | `tests/kernel/kernel.browser.test.ts` — *should arm nothing when the effect throws after requesting a hold* | F-27 |
| a returned handle whose `destroy()` throws | `tests/kernel/kernel.browser.test.ts` — *should report a throwing runner destroy and still pin* | F-22 |
| the final `lift.write` throws | `tests/kernel/kernel.browser.test.ts` — *should release presentation and skip the callback when the pin throws* | F-22 |
| `spec.finalized` throws | `tests/kernel/kernel.browser.test.ts` — *should retire after a throwing terminal callback* | F-22 |

## Collection staging — new

| Row | Test | ID |
| --- | --- | --- |
| a reentrant `cancel()` during `action.prepare(COLLECTION)` leaves `rt.snapshot` unchanged | `tests/sortable/sortable.browser.test.ts` — *should publish and then cancel when the gap cannot survive* | F-19, F-28 |
| a discarded collection action is not observable by a later queued action | `tests/sortable/sortable.browser.test.ts` — *should give two updates queued in one drain distinct versions* | D-25 |
| a collection replacement at `SETTLING` publishes in `effect`, not `prepare` | `tests/sortable/sortable.browser.test.ts` — *should not rewrite the frozen snapshot after release* | I-12 |
| an invalidating replacement publishes **and then** cancels | `tests/sortable/composition.browser.test.ts` — *should cancel when the replacement invalidates the gap* | F-28 |
| a replacement at `IDLE` publishes but leaves no item elements in either frame | `tests/sortable/sortable.browser.test.ts` — *should publish an idle replacement without binding it to a frame* | I-20 |
| a replacement at `RELEASING`/`SETTLING` does not rewrite the frozen snapshot | `tests/sortable/sortable.browser.test.ts` — *should refuse to build a proposal across versions* | I-12 |
| `onStart` calls `updateItems()` → applied at `ACTIVATING` | `tests/sortable/sortable.browser.test.ts` — *should apply an update from inside onStart at ACTIVATING* | F-32 |

## Failure continuation — new

| Row | Test | ID |
| --- | --- | --- |
| `activation.prepare` throws → one `onError`, retirement after failure handling | `tests/kernel/kernel.browser.test.ts` — *should not retire a failed activation* | F-27 |
| `release.effect` throws → `onReorder` never invoked | `tests/kernel/seams.node.test.ts` — *should never invoke the consumer after a failed release effect* | F-34 |
| join target or write failure → presentation releases, no `onFinish`, one `onError` | `tests/kernel/kernel.browser.test.ts` — *should release presentation and skip the pin when the measurement throws* | F-22 |
| `finalized` throws → `FAILURE_TERMINAL_CALLBACK`, still retires | `tests/kernel/kernel.browser.test.ts` — *should retire after a throwing terminal callback* | F-22 |
| an admission resolver calls `destroy()` → no operation is minted | `tests/kernel/kernel.browser.test.ts` — *should not mint an operation when admit destroyed the controller* | F-30 |

## Settlement mapping — new

| Row | Test | ID |
| --- | --- | --- |
| a skipped resolution → `OUTCOME_NOOP`, immediate recovery, `onFinish` | `tests/sortable/sortable.browser.test.ts` — *should skip the round-trip for a proven no-op* | F-29, F-37 |
| a rejected resolution *promise* → `FAILURE_REORDER_RESOLUTION` | `tests/sortable/sortable.browser.test.ts` — *should classify a rejected round-trip promise* | F-20 |
| a fulfilled non-resolution → `FAILURE_REORDER_RESOLUTION` | `tests/sortable/sortable.browser.test.ts` — *should classify a fulfilled non-resolution* | F-20 |
| an accepted resolution → destination recovery | `tests/sortable/sortable.browser.test.ts` — *should map an accepted resolution to a destination recovery* | D-16 |
| a rejected `ReorderResolution` value → home recovery and `onCancel` | `tests/sortable/sortable.browser.test.ts` — *should map a rejected resolution to onCancel with its reason* | F-33 |

## Placeholder movement — new

| Row | Test | ID |
| --- | --- | --- |
| move to a **start** gap (`before === null`) | `tests/sortable/sortable.browser.test.ts` — *should reach a start gap* | F-31, D-27 |
| move to an **end** gap (`after === null`) | `tests/sortable/placement.browser.test.ts` — *should append for an end gap* | F-31, D-27 |
| `homeInsertion` carries the item's real neighbours | `tests/sortable/sortable.browser.test.ts` — *should recover to the home gap of the frozen transaction* | F-31 |
| release and the spatial action produce identical placement | `tests/sortable/sortable.browser.test.ts` — *should move the placeholder to the final gap before resolving* | D-27 |

## Terminal protocol — new

| Row | Test | ID |
| --- | --- | --- |
| a kernel `CANCEL` produces a complete canceled result | `tests/sortable/composition.browser.test.ts` — *should cancel an active drag on demand* | F-33 |
| a failure checkpoint produces immediate recovery and no `finalized` call | `tests/sortable/sortable.browser.test.ts` — *should hold no landing gate for an immediate recovery* | F-27 |
| a no-op settlement calls `onFinish`, never `onCancel` | `tests/sortable/composition.browser.test.ts` — *should finish a drop that never left its own gap as a no-op* | F-37 |
| a rejected `ReorderResolution` value calls `onCancel` with a reason | `tests/sortable/composition.browser.test.ts` — *should cancel a rejected reorder* | F-33 |
| a rejected resolution *promise* is `FAILURE_REORDER_RESOLUTION`, not `onCancel` | `tests/sortable/sortable.browser.test.ts` — *should classify a rejected round-trip promise* | F-20 |
| public results narrow without an internal constant, carrying version/from/to/neighbours | `tests/consumer.node.test.ts` — the packed-consumer fixture narrows on `type` alone | F-41, D-31 |

## Explicit failure latching — new

| Row | Test | ID |
| --- | --- | --- |
| each seam calls `host.fail` and returns normally → no success continuation | `tests/kernel/seams.node.test.ts` — *should treat host.fail in prepare as a prepare failure*, *should not run the effect after a latched prepare failure*, *should never invoke the consumer after a latched release failure*, *should not dispatch the checkpoint on a latched effect failure* | F-34 |
| arm-time `anchorTarget` throws → the settlement never finalizes | `tests/kernel/kernel.browser.test.ts` — *should classify an arm-time anchorTarget failure and never start* | F-35 |
| `LandingStart` calls `fail()` synchronously and returns a live handle | `tests/kernel/kernel.browser.test.ts` — *should destroy the handle and refuse to finalize after a synchronous fail()* | F-30 |
| `fail()` then `done()`, and `done()` then `fail()` | `tests/kernel/kernel.browser.test.ts` — *should let the first completion win* | I-24 |
| `anchorTarget` destroys before `start` → `start` is never called | `tests/kernel/kernel.browser.test.ts` — *should never call start after anchorTarget destroyed the controller* | F-38 |
| `moved` throws from compose, the style write and `schedule` | `tests/kernel/kernel.browser.test.ts` — *should classify a throwing moved instead of panicking*; `tests/sortable/sortable.browser.test.ts` — *should classify a scheduling failure as SCHEDULED_FRAME* | F-40 |

## Teardown totality — new

| Row | Test | ID |
| --- | --- | --- |
| `resetFramePart(current)` throws → the draft is still scrubbed and ingress aborted | `tests/kernel/kernel.browser.test.ts` — *should scrub the draft after the current frame reset throws* | F-36 |
| `resetFramePart(draft)` throws → ingress is still aborted | `tests/kernel/kernel.browser.test.ts` — *should release ingress after a reset throws* | F-36 |
| a reset throw during a failed `arm()` unwind does not replace the arm error | `tests/kernel/kernel.browser.test.ts` — *should scrub both frames when the shape assertion throws* | F-36 |
| the reset error is reported, never substituted for the destroy error | `tests/kernel/kernel.browser.test.ts` — *should report a reset failure rather than swallow it* | F-36 |

---

## The F-6 obligation

> Any fixture installing `landing()` or supplying `presentationReady` fails
> loudly if the corresponding hold is never taken.

Sealing catches a hold taken *late*; nothing structural catches one never taken,
because the observable end state is identical — the operation just finalizes
sooner. Two mechanisms discharge it:

- `tests/support/gates.ts` — armed by `tests/sortable/react.browser.test.ts`.
  Fails the `afterEach` if a terminal callback was delivered with a supplied
  `presentationReady` still pending, or if `landing()` is installed and no
  runner ever started. Both arms are mutation-verified: suppressing
  `scope.holdForLanding` fails 10 of 11 tests with the F-6 message.
- The recording runners in `tests/sortable/landing-space.browser.test.ts` and
  `tests/sortable/features.browser.test.ts` assert on what the runner captured,
  so a runner that never started fails those suites on the recorded value.

## Q-12 — the degraded re-anchor, judged

> A consumer that unmounts or re-keys the dragged item leaves `anchorTarget`
> with no anchor. The fallback measures the still-connected placeholder where it
> stands. **What stays open is whether the fallback is good enough.**

Fixtures: `tests/sortable/react.browser.test.ts` › *that unmounts the dragged
item (Q-12)*.

**The finding: the fallback is sufficient, and the drop is undramatic.** The
operation finishes accepted, the placeholder is removed, no failure is
classified, nothing is reported on the platform channel, and the controller
admits the next press. There is nothing left to strand — the element the pin
would have moved is the element the consumer discarded.

Two things the fixtures made concrete that the contract stated abstractly:

1. **A row React merely drops cannot exercise the guard at all.** A removed node
   is parentless, and `ChildNode.before()` on a parentless node is already a
   no-op, so guarded and unguarded re-anchoring are indistinguishable. The
   hazard needs a *disconnected node that still has a parent* — a recycle pool,
   a keep-alive cache, a virtualizer's spare list — or a *connected* node under
   a different parent, which is a row moved to a second list. Both shapes are
   now fixtures.
2. **The re-anchor happens at the join, not at arm time.** With readiness
   pending, `authoredReady` is false and the re-anchor is skipped entirely, so
   the guard is unreachable until the gate settles. Any test hoping to
   discriminate it through the provisional landing target measures the wrong
   moment; the discriminating probe is a `MutationObserver` on the container the
   consumer moved the row into.

Cancelling the settlement outright — the alternative Q-12 left open — would buy
nothing here and would turn a consumer's own unmount into a reported failure.
**Recommendation: close Q-12 in favour of the fallback as specified.**

## Equivalent mutants — guards no test can falsify

Recorded rather than removed, so a later reader does not mistake them for
coverage gaps. Each was confirmed by mutation: the source change is behaviour-
preserving on every path the suite (or any fixture we could construct) reaches.

| Guard | Why it cannot be falsified |
| --- | --- |
| `item.isConnected` in `anchorTarget`'s destination re-anchor (`src/sortable/spec.ts`) | Strictly implied by the parentage conjunct beside it. A disconnected item either has no parent (blocked, and `before()` would be a no-op anyway) or a different parent (blocked). The only case it alone would catch — item and placeholder in the *same* detached tree — measures the origin either way. The parentage conjunct **is** falsifiable: *should not re-anchor into a container the consumer moved the row to*. |
| `settlement !== attempt` in `watchReadiness` **and** in `handleReadinessSettled` (`src/kernel/kernel.ts`) | Two nested identity checks plus the `readinessHeld` flag and the `SETTLING` phase test. Every route that makes an attempt stale also clears `readinessHeld` or leaves the phase, so removing either identity check individually changes nothing. Defense in depth, deliberately kept. |

The precedent for *removing* an unfalsifiable conjunct rather than recording it
(Checkpoint B's placeholder parentage/adjacency pair) applies when the conjunct
is dead weight in the only shape that reaches it. These two are cheap, and one
of them is a second line of defence on a staleness rule — so they stay, named.
