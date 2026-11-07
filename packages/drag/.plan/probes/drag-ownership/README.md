# Type check: the operation object and the lift's view

**Question:** can the types that `DRD-27` decides compile with no assertion about the operation object's members? Specifically: can a `Behavior` and a `LiftedBehavior` both pass to one kernel type that says only what exists, and can `draggable`'s overloads accept them, without the `as unknown as` and `Writable` that `bb644d6d7` uses?

**Method:** [`types.ts.txt`](types.ts.txt) is a small model of the public and kernel types, written by the architect on 2026-11-07. It is not production code, and nothing in `src` imports it. It covers:

- `Drag<State, L>`, where `L` is the lift's view or `undefined`;
- the lift's view `Lift`, built by `lift` and returned in its hold;
- the kernel's behavior type, whose hooks receive `Drag<State, Lift | undefined>`;
- the overloads of `draggable`;
- a session that builds the `Drag` at activation, writes its `x`, and calls a hook.

Its `@ts-expect-error` lines assert that:

- a behavior without `lift` cannot name `drag.lift.visual`, from a hook or from a controller step;
- an admission without `lift` cannot name `visual`.

To run it, copy it to `types.ts` and [`tsconfig.json.txt`](tsconfig.json.txt) to `tsconfig.json` in one directory, then run `tsc -p tsconfig.json` with the repository's TypeScript.

**Result:** exit 0 with TypeScript 7.0.2, both with the options in `tsconfig.json.txt` (`strict`, `exactOptionalPropertyTypes`) and with the repository's base options (`strict`, `noUncheckedIndexedAccess`, without `exactOptionalPropertyTypes`).

- The overloads need no assertion. Hooks are declared with method syntax, so both public behavior types are assignable to the kernel's type.
- The kernel type must declare `lift?: typeof lift | undefined` under `exactOptionalPropertyTypes`.
- **The one assertion left is `admission.state as State`, which predates this question.** The probe also tried a public `Admission` whose `state` is required when `State` excludes `undefined`. Inside the generic kernel that conditional type is deferred, so the read still needs an assertion. A kernel admission type with a required `state` makes the overloads incompatible. `DRD-27` leaves this open.

**Limits:** this checks types only. It measures no size, allocation or behavior, and it doesn't show that the session's code can be written without an assertion. The handoff's checks cover those.