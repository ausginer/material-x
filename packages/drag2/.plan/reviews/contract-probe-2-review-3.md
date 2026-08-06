The consolidated contract is now substantially clearer and the central model looks ready to move toward an implementation probe.

Before that, I noticed a few local inconsistencies and underspecified failure paths. None of these appears to challenge the kernel / behavior / feature boundary, so this should hopefully be a small correction pass rather than another architecture pass.

Please review the points below, update the existing normative documents where appropriate, and provide a brief change report. There is no need for a new document set or another broad verdict.

## 1. `retarget()` appears callable after landing has already completed

The settlement attempt intentionally retains the landing handle until the join, even after the landing hold is released.

The readiness path currently appears to do roughly:

    if (attempt.landing !== null) {
      const target = spec.anchorTarget(current, true);
      attempt.landing.retarget?.(target);
    }

But when landing finishes before readiness:

    attempt.landingHeld = false
    attempt.landing remains non-null until the join
    readiness settles
    retarget() is still invoked

That conflicts with F-16’s description: once the trajectory has completed, late readiness cannot improve it and the authoritative correction happens at the join.

The likely condition seems to be:

    if (attempt.landingHeld && attempt.landing !== null) {
      const target = spec.anchorTarget(current, true);
      attempt.landing.retarget?.(target);
    }

Otherwise the contract would need to impose a new runner obligation: `retarget()` after `done()` must be a safe no-op. That obligation does not appear useful.

Please clarify the intended rule and make the trace and runner contract agree.

## 2. The readiness-time re-anchor has no explicit failure path

The join defines what happens when `anchorTarget()` throws:

- classify `FAILURE_LANDING_TARGET`;
- skip the pin;
- still release presentation.

The readiness path may also call:

    spec.anchorTarget(current, true)
    landingHandle.retarget?.(target)

Both may throw, but the contract does not appear to define what happens there.

These failures have different meanings:

- `anchorTarget()` failure means the authoritative target could not be established;
- optional `retarget()` failure means only the trajectory-quality improvement failed.

Please define separately:

1. whether either failure replaces the settlement;
2. whether the landing runner is destroyed or allowed to continue;
3. whether the landing hold is released;
4. which failure stage is reported;
5. whether an optional `retarget()` failure may simply continue toward the old provisional target and rely on the authoritative join pin.

My initial expectation is that `retarget()` failure should not normally destroy correctness: the old trajectory may continue and the join still performs the authoritative pin. `anchorTarget()` failure is more serious and probably belongs to the existing landing-target failure model.

## 3. Register placeholder cleanup before inserting it

`activation.effect` is currently ordered approximately as:

    item.after(placeholder);
    scope.presentation.use(() => placeholder.remove());

If insertion succeeds and disposer registration or a later effect step throws, the placeholder is already visible in the DOM but may not yet be owned by cleanup.

Because removing a detached placeholder is harmless, the safer order seems to be:

    scope.presentation.use(() => placeholder.remove());
    item.after(placeholder);

More generally, the effect should follow the local rule:

    register cleanup
    → make the resource externally visible
    → publish private-runtime references
    → invoke consumer callbacks

Please inspect the full activation effect ordering for partial post-commit failure, including invalidation registration, `rt.placeholder`, `rt.lift`, and `onStart`.

## 4. Feature frame parts are described as unbuilt, but kernel sketches already implement their machinery

The contract says feature-owned frame state is a reserved extension point:

- no first-iteration feature uses it;
- its prepare-phase seam is not specified;
- the mechanism is not implemented.

However, the frame composition and reset sketches already contain a `frameParts` fold:

    for (...) {
      Object.assign(frame, frameParts[i].createPart());
    }

and the corresponding `resetPart()` loop.

That leaves the first iteration in an ambiguous state:

- the feature contribution API cannot provide frame parts;
- no feature prepare seam exists;
- yet the kernel appears to contain runtime machinery for them.

It may be cleaner to choose explicitly between:

A. The extension point is documented only. Remove `frameParts` from the executable first-iteration sketches and implementation plan.

B. The composition mechanism exists now. Specify exactly how frame parts reach the kernel, even though no current feature uses them.

Given the anti-speculative-generalisation goal, A seems more consistent. The contract can still state that D-10’s earlier prohibition was incorrect without prebuilding unused kernel machinery.

## 5. The non-null `Prepared` rule can be represented in the type

The transition contract says `Prepared` must not admit `null`, but currently leaves this as prose.

A constraint such as:

    type Transition<
      Part extends object,
      Prepared extends {} = true,
      Capability = void,
    > = ...

would retain primitives such as the `true` sentinel while excluding `null` and `undefined`.

Please check whether this works cleanly with the intended TypeScript target and use it if there is no inference or declaration-emission downside.

## Provenance document

Keeping `challenge-response.md` as provenance makes sense, especially with the explicit rule that documents 00–06 are normative.

From this point onward it may be better to freeze it except for factual errata. Further contract changes can go only into the normative documents, otherwise the provenance file risks gradually becoming another live version of the contract.

## Requested result

A short response is enough:

- agree / partly agree / disagree for each point;
- the chosen correction;
- which normative files changed;
- any new failure stage or invariant introduced.

Please do not reopen the central construction model unless one of these local issues genuinely requires it.