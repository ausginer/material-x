# Type check: the kernel knows no lift

**Question, as revised on 2026-11-07:** can the types that `DRD-27` decides compile without assertions about the operation object's members, when the kernel names no lift? In particular:

- Can one `Behavior` type, with no `lift` member and no overload, serve both a plain behavior and a lifted behavior?
- Can the kernel hold its own `Drag` under a writable type without `Writable` from `type-fest`?
- Can a behavior pass its `Drag<State>` to the lift's `acquire`?

**Method:** [`types.ts.txt`](types.ts.txt) is a small model of the public and kernel types, written by the architect on 2026-11-07. It is not production code, and nothing in `src` imports it. It covers:

- `Drag<State>` with the kernel's members only;
- `Behavior`, whose `settle` returns `void`;
- a kernel-internal mapped type that makes the `Drag`'s members writable;
- a session that builds the `Drag` when it opens, writes its `x`, and calls a hook;
- `draggable` with one signature;
- `lift.js`'s `Lifter`, `Lift` and `Landing`, with `createLifter` declared but not implemented;
- a lifted behavior that keeps the `Lift` in `drag.state` as `Lift | null`, acquires it in `activate` and calls `land` in `settle`.

Its `@ts-expect-error` lines assert that:

- a plain behavior's hook can't name `drag.lift`;
- an `Admission` can't have `visual`.

To run it, copy it to `types.ts` and [`tsconfig.json.txt`](tsconfig.json.txt) to `tsconfig.json` in one directory, then run `tsc -p tsconfig.json` with the repository's TypeScript.

**Result:** exit 0 with TypeScript 7.0.2 under two option sets:

- the options in `tsconfig.json.txt`, which are `strict` and `exactOptionalPropertyTypes`;
- `strict` with `noUncheckedIndexedAccess`, without `exactOptionalPropertyTypes`.

Findings:

- **`draggable` needs no overload and no assertion.**
- **A `Drag<State>` is assignable to `acquire`'s `Drag<unknown>`,** because the `Drag`'s hooks and `requestStep` are declared with method syntax.
- **The kernel's writable type is a mapped type over `Drag<State>`.** The object literal is assigned to it with no assertion, and passes to hooks as `Drag<State>`.
- **The one assertion left is `admission.state as State`,** which predates this question and stays open.

**Superseded model.** The first version of this check, at `6d5ba89e7`, modelled the text of `DRD-27` at that commit: a `Drag<State, L>` with a `lift` member, overloads of `draggable`, and a kernel type for a `Drag` whose `lift` is a `Lift` or `undefined`. That text was revised before it was implemented. That commit holds the earlier files.

**Limits:** this checks types only. It measures no size, allocation or behavior, and it doesn't show that the session's code can be written without an assertion. The handoff's checks cover those.