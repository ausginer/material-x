#### DRD-38 — `Drag` and `Lift` are types of values the library creates

**Status:** active, decided on 2026-11-09 on the owner's direction, under CONTRIBUTING's TypeScript section as clarified at `2bec0c431`. Amends the contract's public surface. `DRO-13` holds the other declarations, and the owner deferred it on 2026-11-10. Implemented at `50ed18a17`, reported at `36dbd55db`. Read by the architect ([assessment](../callback-list-completion-assessment.md)): conforms

**`Drag` and `Lift` are declared with `type`, as shapes wrapped in `Readonly<>`, and not as interfaces. The library creates both and gives them to a behavior, and no other code is expected to implement them.**

Decided on 2026-11-09 on the owner's direction, applying CONTRIBUTING's TypeScript section as the owner clarified it at `2bec0c431`. An interface is a contract that other code is expected to implement. The shape of a concrete value that the library creates and gives to callers is a `type`, also when it has function members. Neither the presence of methods nor lint behavior decides the kind.

**Required properties:**

1. **The declarations.** `Drag<Operation = unknown>` in `src/kernel/drag.ts` and `Lift` in `src/lift.ts` are `type` aliases of an object type wrapped in `Readonly<>`. The member-level `readonly` modifiers, which `Readonly<>` makes redundant, are dropped. Members, overloads, the generic default and JSDoc are otherwise unchanged.
2. **No new promise about the members.** They stay declared as methods. This decision doesn't promise that a member of a `Drag` or a `Lift` works when detached, and the contract still doesn't.
3. **Every user typechecks without change:** `KernelDrag<Operation>` as `Writable<Drag<Operation>>`, which the session writes; `DropTargetDrag`'s `Pick`; `Behavior.activate`; the built-ins; and the tests. The declaration tests that assert what a `Drag` lacks still pass. The public entries export the same names.
4. **No other declaration changes kind in this unit.** `DRO-13` puts the others to the owner.

**What this amends:** the contract's public surface, which now says that `Drag` and `Lift` are values the library creates (see its change record). A consumer could augment an interface by declaration merging, and can't augment a type, so the change is recorded there.

**Cost:** none in bytes, because types emit nothing.