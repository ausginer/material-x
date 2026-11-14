# Final cleanup: drag lint, the shared plugin types and the DRI-13 grab test

**Input:** `drag/size` at `f9e56fe7d`. The owner approved this cleanup of `drag:DRF-38`, `repo:RF-31` and `drag:DRF-40` on 2026-11-14. **Code:** `27c60a9ac`. This report proposes no finding's closure. That stays with the independent review and the architect.

## `drag:DRF-38`: drag's lint

`npx just lint` from `packages/drag` exits 0 at `27c60a9ac` ([output](measurements/2026-11-14-final-cleanup-lint.txt)). No rule is turned off, no diagnostic is suppressed and no assertion changes. Autofix alone isn't enough: it turns the 39 `no-meaningless-void-operator` errors into 39 `chai-friendly/no-unused-expressions` errors, because those two rules together allow no bare expression statement. The manual edits are these:

- **`void <expr>;` becomes `assertType(<expr>);`** at the 39 sites. This is Vitest's form for a value that only has to typecheck, and core's declaration tests use it. The expression on each line is unchanged, so each `@ts-expect-error` still fails on the same member access. To verify this, each directive was removed from the `f9e56fe7d` version and from the new version. The two versions give the same sequence of error codes and messages: 37 errors in `authoring.declaration.test.ts`, 13 in `callbacks.declaration.test.ts` and none in `published-types.declaration.test.ts`. Each error is on the line after its directive ([probe](measurements/2026-11-14-final-cleanup-drf38-directives.txt)).
- **`prefer-arrow-callback`:** the step with `this: unknown` is now the module-level function `unknownReceiverStep`. An arrow function can't declare `this`, so it would remove what the test checks. The receiver-dependent functions in the four `func-name-matching` helpers stay function expressions.
- **`no-useless-assignment`:** the two heap tests now create, use and destroy the controller inside an inner async function. The controller is unreachable when that function returns, before the heap count. `behavior` keeps its explicit `= null`, and `onStart` still reads it. **The drop is required:** without `controller = null`, both `f9e56fe7d` tests fail (`expected 1 to be +0`). The new tests pass. They fail again when the controller is kept in the test's frame ([matrix](measurements/2026-11-14-final-cleanup-heap-matrix.txt)).
- **`func-name-matching`:** each replacement function is named after the property it patches. In `landing` and `order`, the destructured originals are renamed to `nativeAnimate` and `nativeFocus`. Without that change, the patched function would shadow the original and then call itself.
- **`bench/compare.ts`:** `self` is now `selfTimeById`. `coreSets` is built from the sysfs device names, because the formatter removes quotes from the `cpu_core` and `cpu_atom` keys. The record is the same JSON. `--prove --dry` and `--floors --dry` give the same output with `f9e56fe7d`'s script and with the new one, except for the path and line numbers in the stack trace ([output](measurements/2026-11-14-final-cleanup-bench-dry.txt)). Both versions exit 1 because the third entry is stale, as `drag:DRD-45` property 9 already records. The injections didn't change.

## `repo:RF-31`: the shared plugin types

**Cause:** the root `overrides` pin `rolldown` 1.3.2 under `vite` 8.3.8. Vite's `Plugin` still declares the `load` options as `{ ssr? }`, and Rolldown 1.3.2's `LoadExtraOptions` has no property in common with that weak type. `viteTraitsPlugin` has no `load` hook, and the three `@ydinjs/vite-custom-element-assets` plugins take only `id`. The error was in their declared types, not in any hook they implement. The same error also failed `material-x`'s typecheck through `.scripts/tsdown-component.ts`, which the finding doesn't record.

**Fix:** each of the four plugins now returns `Plugin & RolldownPlugin`, and its object literal ends with `satisfies Plugin`. `satisfies` gives each hook Vite's contextual types. Assigning the result to the intersection then checks every implemented hook against Rolldown's signature. There is no cast and no dependency or lockfile change. A type probe shows what the check does and doesn't catch ([probe](measurements/2026-11-14-final-cleanup-rf31-probe.ts.txt)):

- It rejects hooks that are genuinely incompatible. A `load` parameter that Rolldown's `rawId: string` can't satisfy fails (P4), and the same hook typed as `Plugin` alone passes (P5). An unacceptable transform result fails (P6).
- **Limit:** through an intersection target, TypeScript doesn't apply its weak-type check, the check that reported RF-31. A hook written with Vite's exact `options?: { ssr?: boolean }` passes (P7). This is sound, because `ssr` is optional and reads as `undefined` from Rolldown's argument. A second `satisfies RolldownPlugin` would apply the weak-type check (P8). It also checks Rolldown's type for excess properties, so it rejects Vite-only members such as `enforce` and `configResolved`. Using it would require restructuring the plugins.

Every package typechecks except for known errors, and the root `tsconfig` that covers `.scripts/` exits 0 ([output](measurements/2026-11-14-final-cleanup-typecheck.txt)). Drag has only its two `TS2724`. Drag2 is excluded and unsuppressed and has the same four errors as at `f9e56fe7d`. The builds of box-quad, core, tproc, drag, drag2 and material-x are byte-identical to `f9e56fe7d`'s, with 1,920 files in total. Both plugins' `index.js` files are identical. Their source maps differ only in `sourcesContent` and `mappings` for the edited sources, and `vite-traits-plugin/index.d.ts` contains the new return type ([hashes](measurements/2026-11-14-final-cleanup-build-identity.txt)). The 52 `vite-traits-plugin` tests pass ([log](measurements/2026-11-14-final-cleanup-vite-traits-plugin-tests.log)). `vite-custom-element-assets` has no test suite. Some plugin lint errors exist at `f9e56fe7d` in lines this unit doesn't change: `require-unicode-regexp` twice in `src/index.ts`, `no-multi-assign` in `css/generation.ts`, and `no-restricted-syntax` in `analyze.ts`. They are listed in the [lint output](measurements/2026-11-14-final-cleanup-lint.txt) and weren't fixed.

## `drag:DRF-40`: the DRI-13 grab test

After the release, the test pauses the visual's landing animations at the midpoint (`currentTime = 10_000` of 20 s, linear) and checks that at least one exists. The visual then doesn't move however long the grab takes. It is half the flight from both ends: 45 px for the rejected landing and 5 px for the accepted landing. The duration, the 1 px tolerance and both assertions are unchanged. The `wait(300)` and its comment were removed.

The results for each case in the Chromium browser and consumer projects ([matrix](measurements/2026-11-14-final-cleanup-drf40-matrix.txt)):

| `Lifter.acquire` change | New test | `f9e56fe7d` test |
| --- | --- | --- |
| None | 4 passed | 4 passed |
| M1: the landing is cancelled before measurement | 4 failed, off by 45 and 5 px | 4 failed |
| M2: measured without the flight's current offset (effects detached) | 4 failed, off by 45 and 5 px | 4 failed |
| M3: measured at the flight's start offset | 4 failed | 2 failed, 2 passed |
| None, with a 1 s wait between the read and the grab | **4 passed** | **rejected case failed, 4.72 px** |

## Suite and size at `27c60a9ac`

The tree was clean before and after the run ([size and status](measurements/2026-11-14-final-cleanup-size.txt)). The Chromium suite gave [747 passed and 5 failed out of 752](measurements/2026-11-14-final-cleanup-drag-suite.log). All five failures are the known size rows: draggable alone, example: drop zone, freeDrag, freeDrag + bounds + landing, and complete. The `just size` table is byte-identical to the [main integration's](measurements/2026-11-14-main-integration-size.txt). No budget or control changed. No timing, allocation, campaign, Firefox or WebKit check ran.

## Open and next

`DRF-38`, `RF-31` and `DRF-40` stay open until they are reviewed. The P7 limit is for the reviewer to judge against RF-31's "no cast that hides a real hook mismatch". The pre-existing plugin lint errors are listed above but aren't registered as findings. **Next:** an independent review of `27c60a9ac` and this report, which the owner starts.