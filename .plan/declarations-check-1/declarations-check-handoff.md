# Handoff: the declarations check (`RF-51`) and `RF-54`'s repair

**Recipient:** the implementer, in slot `b`.

**Branch:** `repo/declarations-check-1`, from `origin/main` at `83a985b99`. **Input:** the architect's commit that adds this file.

**Begins after** the main slot's architect records the proposals below (`RD-17` property 4 and property 7). If that architect records something different, the recorded entry binds, and the implementer returns here before implementing anything it changes.

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RF-51`, its _Answered_ bullet: the check is decided as a TypeScript program over every published declaration file, as a consumer reads them, with `skipLibCheck` off and no ambient `types`, a configuration and a recipe that the gate runs after the build. The gate fails when a published declaration file doesn't type-check that way. It needs no custom rule, which is the owner's condition.
- `repo:RF-54`: material-x's built `TextFieldCore.d.ts` fails that check with TS2611. Its repair is the first proposal below.
- `repo:RD-6` property 3: the steps of the gate's `static` job. The third proposal amends it.

**Evidence:** [the architect's probe](checks/rf54-mapped-brand-probe.txt) at `83a985b99`, and `RF-51`'s [reading](../aube-isolated-1/checks/rf51-declarations-typecheck.txt).

**Not part of this unit: `RF-55`.** Its repair is a choice about the two Vite plugins' manifests and public types, which belongs to their owner. The check doesn't see it: the workspace installs one `rolldown`, and the plugins' declarations type-check against it. It doesn't block this unit, and this unit doesn't block it. If `rolldown` later becomes a peer, the check covers the plugins' declarations as it does today.

## Proposals for the main slot's architect

### 1. Amend `RF-54`: the repair is decided

Replace the _Not decided_ bullet with a _Decided_ block. Proposed text:

> **Decided 2026-11-18** by the architect, from slot `b`'s [handoff](declarations-check-1/declarations-check-handoff.md) and [probe](declarations-check-1/checks/rf54-mapped-brand-probe.txt) at `83a985b99`: **a trait's instance fields are typed by a mapped type.** `@ydinjs/core`'s `Branded<P, B>` (`src/traits/primitives.ts`) becomes `{ [K in keyof P]: P[K] } & Readonly<Record<B, true>>`. The `@ts-expect-error` at `TextFieldCore.ts:223` is removed.
>
> - **Why it works.** TypeScript doesn't apply TS2610 and TS2611 to a base property that a mapped type produces (read in TypeScript 6.0.3's checker, `checkKindsOfPropertyMemberOverrides`, and reproduced with 7.0.2). A trait's fields are declared in a type literal today, so the check applies to them.
> - **Why it is correct.** `trait()` installs each field as an accessor on the prototype (`Object.defineProperty`), so a subclass's accessor overrides it at runtime. TS2611 protects against a base field, defined on the instance, that shadows a subclass accessor. A trait never creates that field.
> - **What it costs.** It changes no emitted JavaScript. With the mapped type, a property override of the wrong type is still an error, and the brand stays nominal (probe B). The exemption also covers TS2610, a subclass field over a trait field. TS2610 couldn't fire before either, because a trait field was typed as a property.
> - **Why at the source.** `@ts-expect-error` doesn't survive declaration emit (microsoft/TypeScript#54879, open). The mapped type makes the source and the declaration agree, so neither needs a directive. It also covers every later accessor override of a trait field.
> - **The risk.** The exemption is checker behaviour, not a documented rule. If TypeScript drops it, core's type test and `RF-51`'s check both fail, so the change can't go unnoticed.
> - **Not adopted:**
>   - **Carrying the directive into the declaration** by post-processing tsdown's output. That is a custom build step for one line, and it hides the error from consumers instead of removing it.
>   - **Declaring each trait's fields as accessors** (`{ get value(): …; set value(…) }`). That would be every trait's annotation, `trait()`'s mapped `FieldReadersFromConverters` can't produce accessors, and `Props` reads the same `P`.
>   - **Excluding the file from the check.** That fails `RF-51`'s property.
>
> **Routed** to the same handoff, which lands the repair before the check.

### 2. Amend `RF-51`: the check's form

Proposed addition under the _Answered_ bullet's _Decided_ sub-bullet:

> **Form** (slot `b`'s [handoff](declarations-check-1/declarations-check-handoff.md)): the root `tsconfig.declarations.json`, run by the root recipe `just typecheck-declarations`, which builds every package that writes declarations first. Every built declaration file is checked, including those of private packages. The program resolves modules as `nodenext`, and resolved the same in `bundler` mode at `83a985b99`. The gate's `static` job runs it after `just typecheck` (`RD-6` property 3).

### 3. Amend `RD-6` property 3

`static` runs the root `just fmt-check`, `just lint`, `just typecheck` **and `just typecheck-declarations`**. The amendment line names `RF-51` as the cause. The old wording goes in the entry's change record, as its earlier amendments do.

## Item 1. `RF-54`'s repair (one commit)

**Required:**

- `packages/core/src/traits/primitives.ts`: `Branded<P, B>` is the homomorphic mapped type over `P`, intersected with the brand, as proposal 1 says. Nothing else in the file changes.
- `packages/material-x/src/text-field/TextFieldCore.ts`: the `@ts-expect-error` line above `override get value()` is removed.
- `packages/core/src/traits/attributes.ts`, `trait()`'s `@remarks` (`:111`–`:117`): it says that an accessor override may hit TS2611 and recommends a local `@ts-expect-error`. It now says that a trait's fields are typed as mapped properties, so an accessor override of a trait field type-checks, in source and in declarations, with no directive. It may keep #54879 as the reason a directive wouldn't reach the declaration. Follow `CONTRIBUTING.md` Part I, _Comments and JSDoc_.
- **A type test in core's `declaration` project,** in `tests/traits/traits.declaration.test.ts` or beside it. It holds the three checks of the probe's part B:
  - a class that extends `impl(ControlledElement, [Valuable])` and overrides `value` with `get` and `set` type-checks with no directive;
  - a property override of the wrong type is an error, under `@ts-expect-error`;
  - an object that has `value` but not the brand isn't assignable to `Valuable`, under `@ts-expect-error`.

**Witnesses:**

1. **The mutation.** Restore the old `Branded` and keep the rest. material-x's `typecheck` (after rebuilding core) fails with TS2611 at `TextFieldCore.ts`, and the new type test fails on the accessor class. Save both outputs, then undo the mutation.
2. **No emitted JavaScript changes.** Take `sha256sum` of every built `.js` file of core and material-x, before and after the commit, from clean builds. The two lists are equal. Save them.
3. `aube exec just typecheck` and `aube exec just lint` exit 0, and `aube exec -- just test --project 'declaration/*'` passes.

**Stop and return to the architect** if any other file needs a change to type-check, or if a declaration test that existed before the change fails.

## Item 2. The check (one commit)

**Required:**

- **`tsconfig.declarations.json` at the root.**
  - It doesn't extend `tsconfig.base.json`. That file sets `skipLibCheck: true` and ambient `types` for Vitest, Vite and jest-dom, and overriding both leaves nothing worth inheriting. A consumer has neither.
  - The options: `strict`, `skipLibCheck: false`, `types: []`, `noEmit`, `target: "esnext"`, `module` and `moduleResolution` `"nodenext"`, `lib: ["esnext", "dom", "dom.iterable"]`. Add no other option unless a declaration file needs it to type-check. If one does, return to the architect.
  - **The files: every `.d.ts` that a package's build writes,** by glob: `packages/*/**/*.d.ts`, excluding each package's `node_modules`, `src` and `tests`. That also covers the private packages. Their privacy is a release choice, and the glob needs no list to keep up to date.
- **`nodenext`, not `bundler`.** It rejects a relative specifier without an extension, which `bundler` accepts, and both resolve through the packages' `exports`. At `83a985b99` the two modes reported the same result. One program is enough.
- **The root recipe `typecheck-declarations`,** in the _Type checking_ section of the `Justfile`, with a comment that names `repo:RF-51`. It builds all eight packages that write declarations (`box-quad`, `core`, `drag`, `material-x`, `size-limit-preset-rolldown`, `tproc`, `vite-custom-element-assets` and `vite-traits-plugin`), then runs `tsc -p tsconfig.declarations.json`. Neither `build` nor `_package-builds` builds all eight. A recipe builds what it reads, because `RD-6` property 3 forbids relying on a developer's tree. Whether the build is a private recipe or a line in this one is the implementer's choice.
- **`.github/workflows/verify.yml`'s `static` job** runs `aube exec just typecheck-declarations` as a step after `aube exec just typecheck`. No other job changes.

**Witnesses:**

1. **The file set.** After `aube exec just clean-build` and the recipe's build, the files in `tsc -p tsconfig.declarations.json --listFilesOnly` that are under `packages/` and outside any `node_modules` are exactly the files that `find packages -name '*.d.ts' -not -path '*/node_modules/*' -not -path '*/src/*' -not -path '*/tests/*'` lists. Save both lists and the comparison. At `83a985b99` there were 108. The same `find` for `*.d.mts` and `*.d.cts` lists nothing; if it lists a file, the glob misses it, so return to the architect.
2. **It discriminates `RF-54`.** At the parent of item 1's commit, the recipe exits non-zero with exactly the TS2611 at `material-x/text-field/TextFieldCore.d.ts:40`. After item 1, it exits 0. Save both outputs.
3. **It discriminates `RF-51`'s class.** Edit the built `packages/material-x/react.d.ts` so it imports React by the absolute path in [the earlier reading](../aube-isolated-1/checks/abs-import-search-before.txt), then run `tsc -p tsconfig.declarations.json` without rebuilding. It reports TS7016 for that file. Save the output, then rebuild.
4. `aube exec just fmt-check` and `aube exec just lint` exit 0 with the new files.
5. **The gate.** The pull request's `static` job runs the step and passes. Record its duration and the duration of `static` in `main`'s last full run.

**Stop and return to the architect** if a declaration file other than `TextFieldCore.d.ts` fails, or if the two file lists differ.

## Verification and handoff

- Follow [`.agents/docs/handoff.md`](../../.agents/docs/handoff.md) for every changed file.
- **The report** is `.plan/declarations-check-1/declarations-check-report.md`. It covers each item, its commit and its witnesses, with saved outputs under `checks/`, and any stop. Don't change the findings' status in `00-index.md`: the main slot's architect closes `RF-54` and records `RF-51`'s check as implemented, from the report and the review.
- Commit item 1, item 2, then the report, and push `repo/declarations-check-1`. Open no pull request unless asked.