# Terminology and English clarity pilot

**Status: proposal for the owner to assess, 2026-11-05.** Nothing here is approved. This pilot changes no source file and no existing document.

**Files read at:** `88b1bdf2e` on `drag2/terminology-ste`.

**Scope.** The pilot covers `src/kernel/seams.ts`, `src/kernel/unwind.ts`, the settlement and movement parts of `src/kernel/kernel.ts`, and the landing parts of `src/kernel/spec.ts`, `src/shared/composition.ts` and `src/shared/landing.ts`. For each sampled name, I also searched `src`, `tests`, the README and the contract to see where the name reaches. I did not audit the sortable or free-drag behaviors, or the other kernel modules.

**Input.** The [agent brief](../terminology-ste-brief.md), with `startTail` and `runLeaf` as the starting examples.

## Summary

The owner's two starting examples are sound, but both reach further than the brief's table shows.

- **`tail` is not only a private name.** `BehaviorSpec.landingTail` and the `LandingTail` type are published. If only `#startTail` changes, `#startLandingAnimation` calls `spec.landingTail`, and the code has two names for one concept.
- **`leaf` is part of a larger family.** `runCallback` is a good name for `runLeaf`, but `runCore` and `#runPhase` also need new names. `runLeafValue` has no production caller, so it may need deletion instead of a new name.
- **The wider sample found three other kinds of problem.** One word has several meanings (`release`, `phase`). A technical word has a misleading meaning (`unwind`). A name suggests waiting where nothing waits (`#joinSettlement`).
- **Rewriting the comments exposed possible defects.** The most important one: a landing measurement that calls `kernel.fail` and then throws reports two warnings, but the comment promises one. [Questions for separate handling](#questions-for-separate-handling) lists these items. This pilot does not repair them.

### Decisions needed from the owner

1. **Landing names.** Should the private `tail` names change now, and should the architect assess the SPI names at the same time? I recommend yes to both, so that the mixed state is short.
2. **Driver family.** Do you accept `runCallback`, `runTransition`, `runCallbackWarningOnFailure` and `#callBehavior`? Should `runLeafValue` be removed through a separate cleanup task?
3. **`seam`.** Should this word be replaced in a later batch, using the existing words _transition_ and _behavior callback_? I recommend yes, but not in the first batch. It has about 210 occurrences in `src`, and it also appears in runtime warning messages.
4. **`retire`.** Is it acceptable to keep this word? I recommend keeping it for now (see [terms to keep](#terms-to-keep)).
5. **Brief.** Which of the [suggested brief changes](#suggested-changes-to-the-brief) should be applied?

## Proposed names

These tables are the proposed rename map. "Internal" means the name is not in any published declaration. "SPI" means the name is published, so a rename goes to the architect first.

| Current | Reach | Candidate | Problem removed |
| --- | --- | --- | --- |
| `#tail` | private | `#landingAnimation` | Metaphor |
| `#startTail` | private | `#startLandingAnimation` | Metaphor |
| `#cancelTail` | private | `#cancelLandingAnimation` | Metaphor |
| `BehaviorSpec.landingTail` | **SPI** | `landingAnimationTiming` | Metaphor; the name does not say that it returns timing |
| `LandingTail` | **SPI** | `LandingAnimationTiming` | Metaphor; the type holds only timing |
| `SeamDriver.runCore` | internal | `runTransition` | "Core" is no longer the shared part |
| `SeamDriver.runLeaf` | internal | `runCallback` | Metaphor |
| `SeamDriver.runLeafValue` | internal | Remove, or `runCallbackForResult` if it stays | No production caller |
| `SeamDriver.runUnclassifiedValue` | internal | `runCallbackWarningOnFailure` | The name states a type of failure route, not its effect |
| `SeamDriver.#runPhase` | private | `#callBehavior` | Conflicts with the lifecycle `Phase` |
| `SeamDriver.#unclassifiedReason` | private | `#warningMessage` | The value is the warning message |
| `#movedLeaf` | private | `#callMoved` | Metaphor |
| `#joinSettlement` | private | `#finalizeSettlement` | Nothing is joined or awaited |
| `#release` | private | `#disposeOperationState` | Fourth meaning of "release" |
| `Unwind`, `createUnwind`, `unwind` | internal | `WarnOnThrow`, `createWarnOnThrow`, `warnOnThrow` | Conflicts with stack unwinding |

### Landing animation (`#startTail`)

**What the code does.** `#startTail` starts an optional animation on the visual after presentation is disposed (`kernel.ts:1562`). The animation adds to `translate` and moves to zero. It starts nothing if no target was measured, if the displacement is zero, or if the behavior returns no timing.

**Assessment of the brief's candidate.** `#startLandingAnimation` is accurate. "Landing" is a useful domain term that the package already publishes through `landing()`. "Animation" adds a real distinction: a landing also includes the measurement and the return to flow, and the animation is only one part. The word "tail" adds no distinction, and it already has two other meanings in the tests: the end of a list (`commit-window.browser.test.ts:608`) and the end of a statistical distribution (`m1-prime.browser.test.ts:44`).

**The name reaches the SPI.** The call site shows the problem:

```ts
// Before
this.#startTail(/* … */);
const timing = this.#unwind(() => this.#spec.landingTail?.(/* … */));

// Private rename only: two names for one concept
this.#startLandingAnimation(/* … */);
const timing = this.#warnOnThrow(() => this.#spec.landingTail?.(/* … */));

// Private and SPI rename
this.#startLandingAnimation(/* … */);
const timing = this.#warnOnThrow(() =>
  this.#spec.landingAnimationTiming?.(/* … */),
);
```

**A possible collision.** `LandingTiming` already exists as the function type that returns `LandingTail` (`composition.ts:77`), so `LandingTail` cannot simply become `LandingTiming`. I recommend `LandingAnimationTiming`, because the platform also uses "timing" for `duration` and `easing` (`EffectTiming`). The two similar names are the cost. The architect may prefer another name, but should keep the word "timing": the source itself says that the type "carries timing and nothing else" (`spec.ts:379`).

### Running behavior code (`runLeaf`)

**What the code does.** The driver has four public ways to run behavior code. All of them end in one private method, `#runPhase`, which refuses re-entry and handles failures (`seams.ts:495`). They differ as follows:

| Current | Frame transaction | On failure | Production callers |
| --- | --- | --- | --- |
| `runCore` | Yes | Failure at `stage` | 5: `kernel.ts:1730`, `2339`, `2450`; `seams.ts:584`, `618` |
| `runLeaf` | No | Failure at `stage` | 3: `kernel.ts:1691`, `1906`, `2434` |
| `runLeafValue` | No | Failure at `stage` | **None** |
| `runUnclassifiedValue` | No | Warning with `reason` | 1: `kernel.ts:1496` |

**Assessment of the brief's candidates.** `runCallback` is good for `runLeaf`. The `stage` argument at the call site tells the reader that a failure is classified:

```ts
// Before
this.#driver.runLeaf(this.#movedLeaf, FAILURE_RENDERER_WRITE, lift);
// After
this.#driver.runCallback(this.#callMoved, FAILURE_RENDERER_WRITE, lift);
```

`runCallbackWithResult` follows the wrong distinction. In production, the important difference is the failure route, not the return value. No production caller reads the boolean from `runLeaf`, and the only production method that returns a value is the one that warns. So the family should name the route:

```ts
const anchor = this.#driver.runCallbackWarningOnFailure(
  () => this.#spec.anchorTarget(this.#frames.current),
  'drag: landing/target-unavailable',
);
```

The shorter `runCallbackWithWarning` could suggest that the method always warns.

**Other names in the family.** After `leaf` goes, `runCore` becomes the unclear name. The callback methods do not pass through it, so it is not the "core" of the family. Its parameter is already a `Transition`, so `runTransition` needs no new concept.

`#runPhase` conflicts with `Phase`, the lifecycle type. In `runCore`, the parameter `phase: Phase | null` is the lifecycle phase to commit, while `#runPhase` runs one callback. The word `stage` has a similar problem, because the module header calls prepare, commit and effect "three stages" while `stage` everywhere else means `FailureStage`. `#callBehavior` removes the first conflict. The second needs only a comment change.

### Reused movement callback (`#movedLeaf`)

**What the code does.** It is an arrow function, stored in a field, that calls `spec.moved` with the current frame and the lift it receives (`kernel.ts:1878`). I agree with the brief's candidate, `#callMoved`. It names the action and the callback, and it still reads clearly as an argument to `runCallback`.

### Finishing a settlement (`#joinSettlement`)

**What the code does.** It commits `FINALIZING`, reads the rendered position, disposes presentation, starts the landing animation, calls `spec.finalized` and queues `RETIRE` (`kernel.ts:1643`).

**Problem.** A reader expects "join" to mean waiting for parallel work, as in `Thread.join` or `Promise.all`. Nothing waits here. The source says so: "One synchronous sequence, and nothing suspends it" (`kernel.ts:1706`). `drag2:D-155` removed the landing gate, and the README states that nothing waits on the animation.

**Candidate.** `#finalizeSettlement` uses words already in the method: it commits `FINALIZING` and calls `finalized`. The published comments should stop using "the join", because a consumer cannot know what it means.

### Calling code and reporting a throw (`unwind`)

**What the code does.** `unwind(step)` runs `step`, catches a throw, reports a `DraggableWarning`, and returns `undefined` (`unwind.ts:44`).

**Problem.** For most developers, "unwinding" is what the stack does when an error is thrown. This helper does the opposite: it stops the throw. The word also has a second local meaning, the rollback after a failed construction (`kernel.ts:350`, `composition.ts:49`), and that meaning appears in published text (`spec.ts:99`). A name should show what the reader needs at the call site:

```ts
// Before
this.#unwind(this.#spec.retire);
// After
this.#warnOnThrow(this.#spec.retire);
```

The word "rollback" could replace the second meaning in comments. The runtime message `drag: unwind/step-failed` stays until someone decides about runtime strings (see [`seam`](#the-word-seam)).

### One word with four meanings: `release`

| Meaning | Examples | Proposal |
| --- | --- | --- |
| The user ends the drag | `RELEASING`, `spec.release`, `FAILURE_RELEASE`, `runReleaseSeam` | Keep. This is the normal meaning for pointer input. |
| Presentation lifetime closes | `owned.presentation.dispose()`; comments such as "after presentation has been released" | Write "dispose presentation", as the code does. |
| Kernel clears one operation's state | `#release()` at `kernel.ts:613` | Rename to `#disposeOperationState`. |
| Platform or resource release | `releasePointerCapture`; "another resource to release" | Keep for the platform. Use "dispose" for a `Disposer`. |

This affects the brief's own examples, such as "Start the landing animation after releasing presentation". In the same module, "release" also names the phase that starts when the pointer goes up. So the phrase "released visual" can make a reader think of the wrong moment.

### The word `seam`

**Meaning in this code.** A seam is a place where the kernel calls behavior code under its own failure policy. The general software term (from Feathers' _Working Effectively with Legacy Code_) is related but different, and many readers do not know it.

**The code already has the words.** The transactional seams are objects with `prepare` and `effect`, typed as `Transition` or a close variant of it. The non-transactional seams are callbacks. The SPI already separates the two groups (`spec.ts:458`, `464`).

| Current | Candidate for a later batch |
| --- | --- |
| "settlement seam", "release seam" | "settlement transition", "release transition" |
| "non-transactional seam" | "behavior callback" |
| `SeamOutcome`, `SEAM_COMMITTED` | `TransitionOutcome`, `TRANSITION_COMMITTED` |
| `runActivationSeam`, `runReleaseSeam` | `runActivationTransition`, `runReleaseTransition` |
| `SeamDriver`, `seams.ts` | `BehaviorRunner`, `behavior-runner.ts` |

**Why it is not in the first batch.** The word has about 210 occurrences in `src` and 255 in `tests`. It also appears in published JSDoc and in three runtime messages, such as `drag: seam/fail-outside-seam`. A consumer can read those messages through `onError`, and `tests/consumer.node.test.ts:1710` asserts two of them in the packed package. Changing a message changes runtime output, so that is not a wording edit.

### Terms to keep

A clearer name is not needed everywhere. These terms need no rename in this sample:

| Term | Reason to keep it |
| --- | --- |
| `settlement`, `SETTLED_*` | Close to the Promise term, and it names a real step. Avoid looser uses such as "a position to settle" (`kernel.ts:691`). |
| `prepare`, `commit`, `effect`, `draft` | Established transaction vocabulary. |
| `drain` | Established queue vocabulary. |
| `lift`, `visual`, `box`, `placeholder` | Domain terms that keep real differences (`spec.ts:164`). |
| `dispose`, `Disposer` | Established resource-cleanup vocabulary. |
| `landing`, `landing()` | Domain term and public API. |
| `#measureTarget`, `#handleMove` | Already direct. |
| `retire`, `spec.retire` | See below. |

**`retire` is a judgment call.** It is figurative, but it has one consistent meaning: end one operation's state and keep the controller. It is also part of the SPI. The natural replacement, "dispose", would be confusing because disposal of lifetimes is only one step of retirement (`kernel.ts:620`). I recommend keeping it for now, and reviewing it again with the wider audit.

**For the next batch, not assessed here:** `latch`, `foreign code`, `mint`, `scrub`, `bracket`, `unit`, `staged` versus `prepared`, and `frame` (a state record here, but an animation frame in `FAILURE_SCHEDULED_FRAME`).

## Comments: before and after

Each example keeps its original meaning unless it says otherwise. All "after" examples use the proposed names.

### Example 1: an internal comment with many real reasons

Before (`kernel.ts:1527`):

```ts
/**
 * Starts the landing tail on the **released** visual: the residual
 * displacement, decaying to zero.
 *
 * **It claims nothing, which is the whole of why it may outlive the
 * operation.** The animation has no fill, so it writes no inline style and is
 * invisible to a consumer reading or setting one; it reverts by itself, so
 * there is no cleanup obligation to place anywhere; one call cancels it to a
 * settled state; and it dies with the element, so removal, reparenting and
 * replacement need no handling.
 *
 * **The individual `translate` property, added rather than assigned.**
 * `transform` would be wrong twice over: it *replaces* an authored
 * `rotate(4deg)` for the duration, and it overrides a consumer's own running
 * transform animation. Additive `transform` is wrong too — additive transform
 * lists concatenate, so the offset would land inside the element's own
 * `scale()` and move it by a multiple of a delta measured in viewport space.
 * `translate` applies *before* `transform` in the used-value chain
 * (`translate → rotate → scale → transform`), so the offset sits outside the
 * element's own transform and needs no correction; it is also
 * origin-independent, where an inverse `transform` would have to correct for
 * whatever `transform-origin` the visual was restored to.
 *
 * **The one expression that changes units.** The endpoints are viewport
 * deltas and a `translate` is a local quantity, so the vector is projected
 * through the inverse of the space above the visual — captured at activation,
 * which is the ancestry the released element returns to. It is deliberately
 * not the session's own projection: that one is `null` for both lifted modes,
 * correctly, because a `fixed` element's local space is viewport space, while
 * the released element is in flow in every mode.
 *
 * Visual continuity is best-effort and resource safety is not: an ancestry
 * change during the tail sends it along the wrong path, and it still ends at
 * a zero contribution, so the element lands exactly where flow puts it.
 */
```

After:

```ts
/**
 * Starts the optional landing animation, which reduces the remaining
 * displacement to zero. Call this after presentation is disposed, when the
 * element is back in flow. It starts nothing if no target was measured, if the
 * displacement is zero, or if the behavior returns no timing.
 *
 * The animation can outlive the operation because it owns nothing:
 * - It has no fill, so it writes no inline style. A consumer that reads or sets
 *   an inline style does not see it.
 * - It reverts by itself, so it needs no cleanup code.
 * - One `cancel()` call ends it.
 * - It ends with the element, so removal, reparenting and replacement need no
 *   handling.
 *
 * The animation adds to the `translate` property. Do not use `transform`:
 * - A normal `transform` animation replaces an authored `rotate(4deg)` and
 *   overrides a running transform animation of the consumer.
 * - An additive `transform` puts the offset inside the element's own `scale()`.
 *   The element then moves by a multiple of a viewport distance.
 *
 * `translate` applies before `transform`
 * (`translate → rotate → scale → transform`). So the offset stays outside the
 * element's own transform and needs no correction, and it does not depend on
 * `transform-origin`.
 *
 * The endpoints are viewport distances, and `translate` uses local units. So
 * this method converts the vector with the inverse of `space`. `space` is the
 * space above the visual, measured at activation, because the released element
 * returns to that ancestry. Do not use the lift session's projection. It is
 * `null` in both lifted modes, because the local space of a `fixed` element is
 * viewport space. The released element is in flow in every mode.
 *
 * If the ancestry changes during the animation, the element takes the wrong
 * path. The offset still ends at zero, so the element ends where flow puts it.
 */
```

**Meaning kept.** All four reasons stay, including every rejected property and why it fails.

**Difficulty removed.** The metaphors "claims nothing", "dies with" and "the whole of why" are gone. Lists replace long sentences with several claims. The stated conditions under which nothing starts are new in this comment, but they only describe `kernel.ts:1570`, `1577` and `1595`.

**Result on length.** It is about the same length as the original. Most of this comment prevents plausible mistakes, so it should stay. Simple English does not always mean fewer lines.

### Example 2: the reused callback

Before (`kernel.ts:1866`):

```ts
/**
 * The active-movement leaf, hoisted to **one** controller-stable closure.
 *
 * **Wrapped, not detached**: the seam calls it with no receiver of its own,
 * so a bare prototype read would arrive without one. A field rather than an
 * arrow at the call site because inlining allocates a fresh closure on every
 * active pointer sample — the one path whose allocations count — and the
 * emitted bundle keeps the arrow rather than folding it away. The lift
 * arrives as the leaf's argument, resolved by the `MOVE` unit's entry, and
 * the swappable `current` frame is read at call time, so nothing is captured
 * by value.
 */
```

After:

```ts
/**
 * Calls `spec.moved`. Create this callback once per controller and reuse it.
 *
 * An arrow at the call site would allocate a closure for each active pointer
 * sample, and allocation matters most on this path. The bundler does not remove
 * that arrow. The driver calls this function without `this`, so it must be an
 * arrow field and not a prototype method.
 *
 * `#handleMove` passes the lift as the argument. The callback reads the current
 * frame when it runs, so it never holds an old frame.
 */
```

**Meaning kept.** The allocation reason, the `this` constraint and the time of the frame read all stay. I did not check the bundler claim again; the text only restates it.

**Difficulty removed.** "Leaf", "hoisted", "wrapped, not detached" and "`MOVE` unit's entry" are gone. "Receiver" becomes `this`, the word JavaScript developers already use for this value.

**Compared with the brief's version.** The brief's three lines are shorter and work well as an introduction. I added the reason for the field and changed "Read the current frame" because the imperative suggests an instruction to the reader.

### Example 3: a method contract

Before (`seams.ts:297`):

```ts
/**
 * A non-transactional seam returning nothing — `moved`, `finalized`. Returns
 * `false` when it threw or latched a failure.
 *
 * This exists so those seams behave **identically** whether the behavior
 * throws or calls `kernel.fail`. Without it a `moved` throw would escape the
 * handler and become a *panic* that destroyed the controller, contradicting
 * the existence of `FAILURE_RENDERER_WRITE`.
 *
 * `argument` is handed to `run`, so a caller on a per-sample path can keep
 * one controller-stable `run` and still pass it what its unit resolved,
 * without a closure per call.
 */
```

After:

```ts
/**
 * Runs one behavior callback without a frame transaction, such as `moved` or
 * `finalized`. Returns `false` if the callback throws or calls `kernel.fail`.
 *
 * A throw and `kernel.fail` have the same result here. Without this method, a
 * throw from `moved` would leave the handler and cause a panic. The panic would
 * destroy the controller instead of reporting `FAILURE_RENDERER_WRITE`.
 *
 * `run` receives `argument`. So a caller on the pointer-sample path can reuse
 * one function and pass a new value without creating a closure.
 */
```

**Meaning kept.** The return value, the panic it prevents, and the reason for `argument`.

**Difficulty removed.** "Contradicting the existence of" is an indirect way to state the actual consequence. The new text states it. "Latched" and "unit" are no longer needed here.

### Example 4: a method with a required order

Before (`kernel.ts:1625`):

```ts
/**
 * Release presentation completely, then hand the rest to the tail.
 *
 * **The position is already decided and the join writes nothing.** Where the
 * drop ends is `attempt.targetX`/`.targetY`, measured once before the join;
 * the visual reaches it by being **released into it**, in flow, and the tail
 * carries the residual displacement to zero. A write here could only restate
 * the position the release is about to produce, on an element whose inline
 * `transform` the very next statement restores.
 *
 * **Ordering is normative and it is what makes the tail sound.** The release
 * gives the visual's inline styles, its place in flow and the behavior's own
 * presentation back to the consumer; only then does anything interpolate. So
 * the terminal callback runs in a world the library holds no claim on.
 *
 * The release is in a `finally`: the join calls into code the kernel does not
 * own, and none of it may strand the placeholder or the inline styles.
 */
```

After:

```ts
/**
 * Finishes a committed settlement. This method commits `FINALIZING`, disposes
 * presentation, starts the optional landing animation, calls `spec.finalized`
 * and queues `RETIRE`.
 *
 * This method does not write the position. `attempt.targetX` and `.targetY` hold
 * the final position, measured once before this call. Disposing presentation
 * returns the visual to flow at that position, and the animation reduces the
 * remaining displacement to zero. A write here would only repeat that position
 * on an element whose inline `transform` is about to be restored.
 *
 * Keep this order. Disposal gives the inline styles, the place in flow and the
 * behavior's presentation back to the consumer. Only then can an animation
 * start. So the library owns nothing when the terminal callback runs.
 *
 * Disposal is in `finally`, so that no failure before it can leave the
 * placeholder inserted or the inline styles overwritten.
 */
```

**Meaning kept.** The position rule, the required order and the purpose of `finally`.

**Difficulty removed.** The first sentence of the old comment omitted three of the five actions. "Hand the rest", "a world the library holds no claim on" and "strand" are gone.

**One intended change.** The old text says that the `finally` exists because the method calls foreign code. But the `try` block contains only a kernel-private read, as the inner comment says (`kernel.ts:1665`). The foreign calls come after the `finally`. So I stated the rule only, and I report the difference [below](#questions-for-separate-handling).

### Example 5: an ordering comment that exposed a gap

Before (`kernel.ts:1673`):

```ts
// **After the release and before the terminal.** After, because a tail
// installed while the visual is still lifted would interpolate a fixed,
// top-layer element and would then have to be released by something;
// before, because the consumer's terminal callback may remove the very
// element this is about, and an animation started onto a removed node is a
// no-op rather than a fault.
```

After:

```ts
// Start the animation after disposing presentation and before the terminal
// callback.
//
// After disposal: an animation started on the lifted visual would animate a
// fixed, top-layer element, and later code would have to cancel it.
//
// Before the terminal callback: that callback may remove this element. Calling
// `animate()` on a removed element does nothing and does not throw.
```

**Meaning kept.** Both statements stay, and the rewrite does not add a reason.

**What the rewrite exposed.** In simple sentences, the second reason does not explain the order. If starting on a removed element is harmless, then starting after the callback is also harmless for that element. The original long sentence hid this. A word pass should not invent a reason, so the question is [listed below](#questions-for-separate-handling).

### Example 6: a module header

Before (`unwind.ts:1`):

```ts
/**
 * **The unwind must be total.**
 *
 * **This module is named for the rule it expresses, not for a destination.**
 * Routing an error to the consumer and letting the caller continue are two
 * separate jobs; only the second one is here, and it is a lifecycle rule rather
 * than a reporting one.
 *
 * The rule at every site is the same sentence: **the statement after this call
 * is load-bearing.** Another resource to release, another teardown step, or the
 * original error to rethrow. Most of the sites are literal multi-resource
 * releases, some of them `for` loops over installer disposers. Unwrapped, a
 * throw from step *n* skips steps *n+1* onward — which is exactly how
 * destruction stops being terminal.
 *
 * The catch reports a {@link DraggableWarning} rather than an error, because an
 * unwind step that failed is by construction not consequential — the
 * operation's terminal result, phase sequence and settlement are already
 * decided by the time anything unwinds.
 */
```

After:

```ts
/**
 * Runs a function and reports a throw as a warning, so that the caller's next
 * statement still runs.
 *
 * Use this when the next statement must run: it releases another resource, runs
 * another teardown step, or rethrows the original error. Without this helper, a
 * throw from one step skips the later steps, and destruction does not finish.
 *
 * The report is a {@link DraggableWarning}, not an error. The operation's
 * terminal result, phase sequence and settlement are already decided when this
 * helper runs, so a failure here cannot change them.
 */
```

**Meaning kept.** The purpose, the consequence of removing it, and the reason for a warning.

**Comment reduced.** The second paragraph defended the old module name, so it can go when the name changes. The description of the sites ("most of the sites…") adds nothing that a reader can act on.

### Example 7: published JSDoc

This text ships to behavior authors, so it follows [the rules for published JSDoc](../../../../.agents/docs/documentation.md#51-published-jsdoc). It may contain no internal history, and it must keep every precondition.

Before (`spec.ts:492`):

```ts
/**
 * **The tail's timing for this settlement, or `null` for no tail.** Called at
 * the join, after presentation has been released and before the terminal
 * callback, and only when a target was measured.
 *
 * The four coordinates are the tail's endpoints in the one landing space —
 * origin-relative viewport deltas, where the visual is and where the drop
 * decided it belongs — so a behavior offering a distance-derived duration has
 * everything it needs and reads no DOM to get it.
 *
 * **The answer is a policy decision and nothing else.** A behavior returns
 * `null` where the drop has no journey to interpolate — a visual that stayed
 * where it landed, a recovery that must be immediate — and a behavior that
 * omits the member never tails at all.
 */
```

After:

```ts
/**
 * Returns the landing animation timing for this settlement, or `null` for no
 * animation. The kernel calls this after presentation is disposed and before
 * the terminal callback, and only when it has measured a target.
 *
 * The four coordinates are origin-relative viewport distances: where the visual
 * is and where the drop decided it belongs. A behavior can derive a duration
 * from the distance without reading the DOM.
 *
 * Return `null` when the drop needs no animation, for example when the visual
 * stayed where it landed or a recovery must be immediate. A behavior that omits
 * this member has no landing animation.
 */
```

**Meaning kept.** The timing of the call, its condition, the coordinate space and both `null` examples.

**Difficulty removed.** "The join" is internal vocabulary that the published reader cannot look up. "Journey" and "never tails" are figurative. "A policy decision and nothing else" is replaced by a direct instruction.

### Example 8: comments to remove or keep

The first two sentences repeat information that a reader already has, so they can go without a rewrite. The third looks similar but should stay, because a deletion needs a reason and not only a shorter target.

| Location | Text | Decision |
| --- | --- | --- |
| `seams.ts:281` | `// classified, from the committed state` | Remove. It repeats the documentation of `SEAM_EFFECT_FAILED` at `seams.ts:75`. |
| `seams.ts:338` | "A target that cannot be produced and one that cannot be trusted are the same fault…" | Remove. It repeats `kernel.ts:1481` at the only caller, and the method does not depend on it. |
| `seams.ts:363` | "Either would execute a resolution belonging to a transaction that is over." | Keep. It states the consequence of removing either clear of the staged value. |

## English patterns

The sample showed that the larger difficulty is often sentence patterns and not single words. The brief does not name them yet. The counts below are approximate text-search counts over `src`, and they miss phrases that wrap across two lines.

| Pattern | Count | Example | More direct |
| --- | --- | --- | --- |
| "which is what", "is what" | 140 "is what", of which 56 "which is what" | "…which is what makes "the behavior never calls…" hold" (`seams.ts:53`) | "This keeps the rule that…" or two sentences |
| Bold fragment with no verb: "X, not Y" | 54 on one line | "**Cancel, not finish.**" (`kernel.ts:690`) | "Use `cancel()`, not `finish()`." |
| "load-bearing" | 12 | "the statement after this call is load-bearing" (`unwind.ts:9`) | "the statement after this call must run" |
| "the whole of", "whole point" | 25 | "the whole of why it may outlive the operation" (`kernel.ts:1531`) | "It can outlive the operation because…" |
| "deliberately", "on purpose" with no reason beside it | 46 uses in all; not all lack a reason | "**`null`, and deliberately.**" (`seams.ts:471`) | State the reason only |
| "by construction" | 21 | "is by construction not consequential" (`unwind.ts:17`) | "cannot change the result, because…" |
| Moral or human words for code | 4 "honest" | "A jump cut is honest." (`kernel.ts:1508`) | "The visual jumps to its final place. It shows the true result." |
| Figurative verbs | 33 "mint" (including `mintOperation`), 11 "hoist" | "hoisted to one controller-stable closure" | "created once per controller" |

**Bold text is a separate question.** `src` contains about 850 bold spans, and many paragraphs open with one. Editor hovers render bold in JSDoc, but in a line comment the reader sees only asterisks. When most paragraphs are bold, the emphasis no longer identifies what is important. I suggest using bold rarely in JSDoc and not at all in line comments.

These are patterns to examine, not banned words. For example, "by construction" is acceptable with a clear reason after it.

## Suggested changes to the brief

1. **Section 1: add the reverse check.** The brief asks about "several names for the same concept". Add "one name for several concepts". This is the problem with `release`, `phase`, `stage`, `unwind` and `tail`.
2. **Section 1: find a name's reach before proposing a new name.** Check whether the name is private, a member of an internal class, SPI, published prose, a runtime string or text in the normative contract. This single step would have shown the SPI issue for `startTail`.
3. **Section 1 table.**
   - Add to the `#startTail` row: the family includes the published `landingTail` and `LandingTail`.
   - Replace the `runLeaf` rows with the four-method family. Note that `runLeafValue` has no production caller.
   - Add `runCore` and `#runPhase`.
4. **Section 2 table and section 3 example: avoid "release".** "After releasing presentation" and "after releasing the visual" use a word that also names the pointer phase. Use "after disposing presentation". The method also does not perform the release; it requires that the caller has done so. Suggested text:

   ```ts
   /**
    * Starts the optional landing animation, which reduces the remaining
    * displacement to zero. Call this after presentation is disposed.
    */
   ```

5. **Section 3 movement comment.** Use `this` in place of "receiver". Change "Read the current frame when the callback runs" to "The callback reads the current frame when it runs". Add the reason for reuse: an inline arrow allocates a closure for each active pointer sample.
6. **Section 2: add sentence patterns.** Add the patterns above, as examples and not as a list of banned words. Also state a preference for bold text in comments.
7. **Section 4: separate the normative tree from the archive.** The brief says to leave journals, decisions, measurements and reviews unchanged. But `tests/references.node.test.ts` treats `.plan/contract/` and `.plan/obligations.md` as a description of the code as it is now, and it skips dated ledger rows. So a rename also owes present-tense contract text. `SeamDriver` has 31 occurrences in the contract and `runCore` has 28, though some of them are dated rows. Please decide which text changes with a rename. I suggest: present-tense contract text and the README change; dated rows stay.
8. **Section 4: keep a rename map.** Because old records keep the old names, a future reader who searches for `startTail` needs a way to the new name. The map in this report could become that record. It supports the names and does not replace them.
9. **Section 4: state the size check for renames.** [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) says that private identifiers are mangled in production builds. Members such as `runLeaf` and `landingTail` are not `#private`, and names like these appear in the emitted package output. A longer name may therefore add bytes. Use the existing `just size` measurement once for such a batch. No statistical performance round is needed.

## Questions for separate handling

A wording pass must not repair these items. Each one needs a decision or a task of its own. The ids are local to this report. Tiers follow [the review vocabulary](../../../../.agents/docs/review-findings.md#tier).

| Id | Tier | Claim | Evidence |
| --- | --- | --- | --- |
| `pilot-1` | A if the comment states the intended rule; otherwise C | An unclassified callback that calls `kernel.fail` and then throws reports two warnings. The comment promises "one report per phase". | `seams.ts:334` promises it. `requestFailure` warns at `seams.ts:392`, and `#runPhase` warns again at `seams.ts:536`. Probe result below. The classified path handles this case with `seam/failed-then-threw`. No test calls this method directly. |
| `pilot-2` | C | `runLeafValue` has no production caller, and its comment names the wrong use. | Text search finds it only in `seams.ts` and `tests/kernel/seams.node.test.ts`. `seams.ts:319` names `anchorTarget`, but `anchorTarget` uses `runUnclassifiedValue` (`kernel.ts:1496`). |
| `pilot-3` | C | No production caller reads the boolean that `runLeaf` returns. Only tests read it. | `kernel.ts:1691`, `1906`, `2434` are statement calls. |
| `pilot-4` | B | The published `landingTail` documentation gives one condition, "only when a target was measured". The kernel also skips the call when the displacement is zero. | `spec.ts:493`; `kernel.ts:1577`. `landing.ts:49` says "once per landing", and it has the same gap. Example 7 keeps the current text and does not repair this. |
| `pilot-5` | C | The stated reason for starting the animation before the terminal callback does not explain the order. | `kernel.ts:1676` (Example 5). `.plan/contract/05-lifecycle-invariants.md:774` states the order. My search of the contract and of the record that `drag2:D-155` cites found no other reason. That search was limited to phrases, so a reason may exist. |
| `pilot-6` | C | The comment says that the `finally` exists because the method calls foreign code, but the foreign calls come after the `finally`. | `kernel.ts:1640` against `kernel.ts:1657` and `1665`. |
| `pilot-7` | C | A comment says "exactly one `runCore`" clears the re-entry flag, but any method that uses `#runPhase` can do it. | `seams.ts:517`; `tests/kernel/seams.node.test.ts:1134` nests `runLeaf` inside `runLeaf`. |
| `pilot-8` | C | "Arm-time landing measurement" appears to be out of date. The measurement runs during settlement. | `seams.ts:338`; `kernel.ts:1743`. |
| `pilot-9` | C | The `unwind.ts` comment says every site is inside a teardown, but two sites are in the landing animation start. | `unwind.ts:40`; `kernel.ts:1585`, `1603`. The next statements there do matter, so only the word "teardown" may be too narrow. |

**Probe for `pilot-1`.** A throwaway script constructed `SeamDriver` directly, called `runUnclassifiedValue` with each callback body, and counted the reports. The last line runs the same fail-then-throw body through `runLeaf`. The script did not go through a full controller.

```text
throw only: result=undefined warnings=1 failures=0
fail only: result=undefined warnings=1 failures=0
fail then throw: result=undefined warnings=2 failures=0
classified fail then throw: warnings=1 failures=1 messages=drag: seam/failed-then-threw
```

## Suggested first batch

If the owner accepts this pilot, I suggest three separate commits, so that review can assess each one:

1. **Internal renames only.** The private landing names, the driver family except `runLeafValue`, `#callMoved`, `#finalizeSettlement` and `#disposeOperationState`, with the matching present-tense contract text. `unwind` has about 99 occurrences in `src` across more modules, so it could be a fourth commit or the start of the next batch.
2. **Comment removal.** Only sentences that repeat other text, with the reason for each one.
3. **Comment rewrite** of the sampled kernel comments, with the agreed vocabulary.

The SPI names go to the architect. `seam`, runtime messages and `retire` wait for the owner's decisions. The items in [Questions for separate handling](#questions-for-separate-handling) go to their own tasks. `pilot-1` should come first, because it may be a behavior defect, and a later comment rewrite depends on its answer.

**Checks for the batch.** Typecheck, the kernel tests and the package's reference tests. Also run `just size` once for the non-`#` renames. My estimate is about 66 bytes before compression for the driver methods, and about 77 more for `landingTail`. These figures are arithmetic from name length and call count. I did not measure them.

## Evidence and limits

- **References.** The language server returned incomplete results: for `runLeaf` it found only the definition, and none of the three kernel callers. So all reference claims here come from text search and from reading the call sites.
- **Published reach.** I read the build output in the working tree, which git ignores. It is older than the last `src` commit (build 09:55 UTC, commit 12:07 UTC). I used it only to confirm that names appear in published declarations and emitted code. The SPI claims also rest on `src/kernel.ts` and `tests/kernel/vocabulary.node.test.ts`.
- **Readability was not measured.** The rewrites are my judgment. No developer from the target audience has read them, and an independent reader could disagree. The owner's assessment is the first check.
- **Rewrites are examples.** They were not compiled into the source. An implementer should compare each one with the code again.
- **Not run.** Build, tests and `just size`, because this unit changes no source. The probe ran once with `node`.
- **Checks on this file.** `just fmt` and `git diff --check` pass, and a scripted check found no broken link or anchor. Neither linter checks Markdown: `oxlint` reports no files to lint, so `just lint` stops there, and ESLint run directly reports the file as ignored.

**Next action.** The owner assesses this proposal and answers the five decisions above. Work stops here until then.