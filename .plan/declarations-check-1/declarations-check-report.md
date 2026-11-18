# Report: the declarations check (`RF-51`) and `RF-54`'s repair

**From:** the implementer, in slot `b`, on 2026-11-18.

**Input:** [the handoff](declarations-check-handoff.md) on `repo/declarations-check-1` at `1fb375b88`. **Governing records,** in [`../00-index.md`](../00-index.md): `repo:RF-54` (decided: the mapped `Branded`), `repo:RF-51` (the check's form) and `repo:RD-6` property 3.

**Outcome:** both items are implemented as the handoff says, every witness holds, and no stop was reached. One deviation from witness 2's wording is stated under item 1. Pull request #37 to `main`. The findings' status in `00-index.md` is unchanged: the main slot's architect closes `RF-54` and records `RF-51`'s check as implemented.

TypeScript in every reading is the root's `tsc`, version 7.0.2.

## Item 1. `RF-54`'s repair — `00e3f5448`

- `packages/core/src/traits/primitives.ts`: `Branded<P, B>` is `{ [K in keyof P]: P[K] } & Readonly<Record<B, true>>`. Its JSDoc gains one paragraph that says why the mapped form exists, so that nobody simplifies it back to `P`. Nothing else in the file changes.
- `packages/material-x/src/text-field/TextFieldCore.ts`: the `@ts-expect-error` above `override get value()` is removed.
- `packages/core/src/traits/attributes.ts`: `trait()`'s second `@remarks` now says that the fields are typed as mapped properties, so an accessor override type-checks with no directive in source and in declarations, and keeps #54879 as the reason a directive would not reach a consumer.
- `packages/core/tests/traits/overrides.declaration.test.ts`, beside `traits.declaration.test.ts` because that file already declares a local `Valuable`: three cases over core's own `Valuable` and `impl(ControlledElement, [Valuable])` — an accessor override with no directive, a wrong-type property override under `@ts-expect-error`, and an unbranded object under `@ts-expect-error`.

**Witnesses.**

1. **The mutation** ([output](checks/rf54-mutation.txt)). With the old `Branded` and every other change kept, and core rebuilt, material-x's `typecheck` fails with TS2611 at `TextFieldCore.ts:223`, and the new type test fails only on the accessor case (1 failed, 2 passed). Undone, and core rebuilt.
2. **Emitted JavaScript** ([output](checks/rf54-emitted-js.txt)). Of the 119 built `.js` files of core and material-x, from clean builds, 118 hash the same before and after. **The lists are not equal:** `core/traits/attributes.js` differs, because tsdown keeps JSDoc in the `.js` and the handoff requires the rewritten `@remarks`. The saved `diff` of that file shows only the comment lines. Built with `1fb375b88`'s `attributes.ts` and the new `primitives.ts`, the file hashes the same as before, so the type change itself emits nothing.
3. `aube exec just typecheck` and `aube exec just lint` exit 0. `aube exec -- just test --project 'declaration/*'` passes: 8 files, 46 tests, no type errors ([output](checks/rf54-gate.txt)). Before the change the probe read 7 files and 43 tests; the new file adds 1 and 3.

## Item 2. The check — `f6f5c1818`

- `tsconfig.declarations.json` at the root, with exactly the handoff's options and no `extends`. It includes `packages/*/**/*.d.ts` and excludes each package's `node_modules`, `src` and `tests`.
- The root recipe `typecheck-declarations`, in the `Justfile`'s _Type checking_ section, with a comment that names `repo:RF-51`. It builds the eight packages with one `nx run-many -t build` line, then runs `tsc -p tsconfig.declarations.json`. No private recipe: nothing else uses that build list.
- `.github/workflows/verify.yml`: `static` runs `aube exec just typecheck-declarations` after `aube exec just typecheck`. No other job changes.

**Witnesses.**

1. **The file set** ([output](checks/rf51-file-set.txt)). After `aube exec just clean-build` and the recipe, `--listFilesOnly` under `packages/` outside `node_modules` and the handoff's `find` list the same 108 files. The same `find` for `*.d.mts` and `*.d.cts` lists none.
2. **It discriminates `RF-54`** ([output](checks/rf51-discriminates-rf54.txt)). With the three source files that item 1 changes checked out from `1fb375b88`, the recipe exits 2 with exactly one error, TS2611 at `packages/material-x/text-field/TextFieldCore.d.ts(40,16)`. At item 1, from a clean build, it exits 0.
3. **It discriminates `RF-51`'s class** ([output](checks/rf51-discriminates-absolute-import.txt)). With line 21 of the built `react.d.ts` edited to the absolute React path, `tsc -p tsconfig.declarations.json` without a rebuild exits 2 with TS7016 for that file. The recipe then rebuilt it.
4. `aube exec just fmt-check` and `aube exec just lint` exit 0 with the new files ([output](checks/rf51-fmt-lint.txt)).
5. **The gate.** `static` ran the step and passed in both of #37's runs:

   | Run | Head | `static` | `typecheck-declarations` step |
   | --- | --- | --- | --- |
   | 44237109069 | `f6f5c1818` (item 2) | success, 80 s | success, 9 s |
   | 44237471520 | `7b49d1604` (the architect's `RF-57` record on top) | success, 86 s | success, 10 s |
   | 44233935238, `main`'s last full run | `83a985b99` | success, 82 s | — |

   The step adds about 10 s. `static` stays within its 10-minute limit by a wide margin.

   **`verify` is not green yet, for a reason outside this unit.** Run 44237109069 was cancelled when `7b49d1604` was pushed to the branch. In run 44237471520, `scope`, `static`, `chromium`, `firefox` and `measurements` passed on the first attempt, and `webkit` on the second. `docs` hit its 5-minute limit on all three attempts inside `playwright install --with-deps chromium`, while apt fetched font packages from the Ubuntu mirror at about 60 KB/s (attempt 2: one 5.6 MB package took 100 s). `repo/host-invariant-1`'s run 44236329357 timed out in `docs` and `webkit` in the same step at the same time. The step and the job are unchanged by this unit. The push of this report starts a new run.

## Limits

- Witness 2 of item 1 is met in substance, not in its literal form; see above.
- `just typecheck-declarations` builds every package again although `static` has already built some of them for `just lint` and `just typecheck`. Nx's cache is skipped, as in every root recipe. The duration is in witness 5.
- The new paragraph on `Branded` describes what TypeScript checks, and `Branded` also types the transformer `trait()`'s fields. The runtime hazard there is `repo:RF-57`, which the architect registered on this branch during the unit (`7b49d1604`). This unit doesn't change it.
- `verify` on #37 still needs a green run; see witness 5.

## Next

If the new run's `docs` job times out in the same install step again, re-run it once the mirror recovers; nothing in the unit needs to change. Then the main slot's architect reviews this unit, closes `RF-54`, and records `RF-51`'s check and `RD-6` property 3 as implemented when #37 merges. The owner merges #37.