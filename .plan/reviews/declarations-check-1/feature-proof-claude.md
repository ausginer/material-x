# Declarations check and `RF-54`'s repair — feature proof

**Files were read at:** `e129624a8c23e8c9e2fc751b1df17eb6ccedb20f` (`repo/declarations-check-1`, slot `b`, clean), the head of pull request [#37](https://github.com/ausginer/material-x/pull/37). **Diff reviewed:** `83a985b99` (the base, exclusive) to `e129624a8` (inclusive). **Records read at the same commit.**

**Governing records:** the [declarations-check handoff](../../declarations-check-1/declarations-check-handoff.md), items 1 and 2; the implementer's [report](../../declarations-check-1/declarations-check-report.md) and its readings under [`checks/`](../../declarations-check-1/checks/); `repo:RF-54`'s _Decided_ block, `repo:RF-51`'s _Form_ bullet, `repo:RD-6` property 3 as amended by `RF-51`, and `repo:RF-57`, in [`00-index.md`](../../00-index.md); [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) Part I, _Comments and JSDoc_ and _Unit tests_.

**Lens:** feature proof. Each claim below is my own reading of the tree, of CI or of a local run, unless it says otherwise. My commands and their outputs are in [`checks/feature-proof-readings.txt`](checks/feature-proof-readings.txt). Nothing is repaired, and no record is amended.

**Verdict: the proof holds. No findings.** Both items are implemented as the records require. Every witness I repeated agrees with the report, and the emitted JavaScript hashes match the implementer's byte for byte. I accept both deviations that the implementer names (below). `verify` on #37 is red only because `docs` was cancelled in `playwright install`, which this unit doesn't touch.

## The two deviations

**1. Item 1, witness 2: 118 of 119 `.js` files hash the same, not all 119.** Accepted.

- The handoff requires two things that conflict here. It requires rewriting `trait()`'s `@remarks`, and it requires the before and after lists to be equal. tsdown keeps JSDoc in the built `.js`, so the rewrite changes `core/traits/attributes.js`.
- **I repeated the reading.** I built from clean with `83a985b99`'s `primitives.ts`, `attributes.ts` and `TextFieldCore.ts`, and again at the head. Of the 119 built `.js` files of core and material-x, only `core/traits/attributes.js` differs, and its `diff` is the seven `@remarks` comment lines replaced by eight. Both hashes (`5e892ebe…` before, `846a119e…` after) equal the implementer's. `primitives.js` hashes the same in both builds, so the `Branded` change emits no JavaScript, which is the property the witness exists to show.
- **I also read the declarations.** I restored only the old `Branded` and kept everything else at the head. Then I compared all 108 built `.d.ts` files with the head's. Only `core/traits/primitives.d.ts` differs, in the `Branded` line. material-x's declarations are identical, so the mapped type changes no type that a declaration names. Only the checker's override rule sees the difference.

**2. The added JSDoc paragraph on `Branded`.** Accepted, with one note for `RF-57`.

- The handoff says _"Nothing else in the file changes"_ for `primitives.ts`. The paragraph is the only other change there. It is comment-only (deviation 1 shows that `primitives.js` is unchanged).
- **It meets _Comments and JSDoc_.** It is in the present tense and states a reason for the current implementation, which the section lists as a reason to keep a comment. It carries no record pointer. Its claim is accurate. _"Reports `TS2611` only when the property is not mapped"_ is the contrapositive of `RF-54`'s _"doesn't apply TS2610 and TS2611 to a base property that a mapped type produces"_, and the mutation in deviation 1 reproduces it.
- **It reaches a published declaration.** The built `core/traits/primitives.d.ts` carries the paragraph above the unexported `Branded`. `@ydinjs/core` exports `./traits/primitives.js`, so under _Comments and JSDoc_ the paragraph counts as consumer documentation.
- **Note for `RF-57`, not a finding.** The paragraph says that the mapped form _"lets a subclass override a trait field with `get` and `set`"_. That is true of the types. For the transformer `trait()`, which also returns `Branded`, the runtime doesn't honour that override when the transformer declares the field as a class field. That is `RF-57`'s hazard, and this sentence neither creates it nor widens it: `Omit` already made the transformer's fields mapped. `RF-57`'s required property is due before the transformer `trait()` is published outside the repository, and `@ydinjs/core` is unreleased. So nothing is owed now. When `RF-57` is scheduled, this sentence is one of the published sentences that its contract will have to agree with. The report's _Limits_ already says this.

## Scope

**Covered.**

- The non-record diff, line by line: `primitives.ts`, `attributes.ts`, `TextFieldCore.ts`, `overrides.declaration.test.ts`, `tsconfig.declarations.json`, the `Justfile` recipe and the `verify.yml` step.
- Each _Required_ bullet of items 1 and 2 against that diff, and the three commits' contents against the handoff's order: item 1 is `00e3f5448`, item 2 is `f6f5c1818`, and the report is `e129624a8`. None of the implementer's commits touches `00-index.md`.
- The records `RF-54`, `RF-51` (_Form_), `RD-6` property 3 and `RF-57` against the implementation.
- **Repeated in slot `b`:**
  - from `aube exec just clean-build`, `aube exec just typecheck-declarations` at the head: exit 0;
  - the file set: `--listFilesOnly` under `packages/` outside `node_modules`, against the handoff's `find`: 108 and 108, no difference. No `*.d.mts` or `*.d.cts`. No tracked `.d.ts` outside `src/` and `tests/`, so every checked file is build output;
  - item 1 witness 1, the mutation (old `Branded` only): the recipe exits 2 with exactly TS2611 at `material-x/text-field/TextFieldCore.d.ts(40,16)`. material-x's `typecheck` fails with TS2611 at `TextFieldCore.ts(223,16)`. The declaration projects fail exactly one case, _"should allow an accessor override of a trait field"_ (1 failed, 45 passed);
  - item 2 witness 2, with the three source files at `83a985b99`: the recipe exits 2 with the same single TS2611;
  - item 2 witness 3: with `react.d.ts:21` edited to the absolute React path and no rebuild, `tsc -p tsconfig.declarations.json` exits 2 with TS7016 for that file. Restored, it exits 0;
  - **the new type test's other two cases, each mutated in turn.** A property override of the right type (`string | null = null`) leaves the `@ts-expect-error` unused, and the case fails. An object typed as `Valuable & {…}` leaves the brand case's directive unused, and the case fails. So each `@ts-expect-error` catches the error it names and nothing else;
  - at the head: `just fmt-check`, `just lint` and `just typecheck` exit 0, and `just test --project 'declaration/*'` passes 8 files and 46 tests with no type errors.
- **CI,** from `gh run view`. The `static` durations in the report's table are correct: 80 s and 9 s for the step (44237109069), 86 s and 10 s (44237471520), and 82 s on `main` (44233935238). At the head (44240485947), `static` passed in 67 s, with the step at 8 s.

**Not covered.** These areas are unread, which isn't the same as clean.

- I ran no browser, visual or docs test locally. Item 1 changes types and one comment, and no emitted JavaScript apart from that comment, so the handoff doesn't require them. `chromium`, `firefox` and `webkit` passed at the head in run 44240485947.
- I didn't re-run the architect's probe ([`rf54-mapped-brand-probe.txt`](../../declarations-check-1/checks/rf54-mapped-brand-probe.txt)) or read TypeScript's checker source. I rely on the mutation above, which shows the exemption with the root's `tsc` 7.0.2.
- I didn't check `bundler` resolution. The handoff settles on `nodenext`, and `RF-51`'s _Form_ records the probe's equal result.

## Items that hold, with no finding

- **Item 1 (`RF-54`).** `Branded<P, B>` is `{ [K in keyof P]: P[K] } & Readonly<Record<B, true>>`, exactly as decided. The `@ts-expect-error` above `override get value()` is gone. `trait()`'s second `@remarks` says what the handoff asks: the fields are accessors on the prototype, typed as mapped properties. An accessor override type-checks with no directive, in source and in declarations, and #54879 stays as the reason that a directive wouldn't reach a consumer. That is accurate for the attribute `trait()`, which installs every field with `Object.defineProperty` on `traited.prototype`. The test sits beside `traits.declaration.test.ts`, which the handoff allows, and it holds the probe's three part-B checks over core's own `Valuable` and `impl(ControlledElement, [Valuable] as const)`. It meets _Unit tests_: one `describe`, and one behaviour per `it`, each named with _should_.
- **Item 2 (`RF-51`).** `tsconfig.declarations.json` has no `extends` and exactly the handoff's options, and no others. It includes `packages/*/**/*.d.ts` and excludes each package's `node_modules`, `src` and `tests`. The `typecheck-declarations` recipe sits in the `Justfile`'s _Type checking_ section, directly after `typecheck`. Its comment names `repo:RF-51`. It builds the eight packages that the handoff lists, the same set as `typecheck`, with `--skipNxCache`, then runs `tsc`. So it builds what it reads, as `RD-6` property 3 requires. `verify.yml`'s `static` job runs `aube exec just typecheck-declarations` directly after `aube exec just typecheck`. No other job changed.
- **`RD-6` property 3** as amended now matches the workflow: `static` runs `fmt-check`, `lint`, `typecheck` and `typecheck-declarations`. The amendment line already says _"Unimplemented until that handoff's pull request merges"_. That is for the architect to record on merge, as the report says.
- **The report's claims** agree with its transcripts and with my readings. They include the TS2611 positions, the 108-file set, the 46 tests (43 before), the hashes and the CI durations.

## CI: the cancelled `docs` job

**Nothing in this unit touches it.** In run 44240485947, `docs` was cancelled at its 5-minute limit inside `aube exec -- playwright install --with-deps chromium` (04:54:46 to 04:59:38 UTC), before any recipe ran. The unit doesn't change the `docs` job, its install step, `package-lock.json`, any manifest or the `docs-build` recipe. In `.github/`, the only change is one line in `static`. Every other job of the run's mode passed, so `verify` is red for that cancellation alone.

**The same code passed `docs` once.** In run 44237109069, at `f6f5c1818`, `docs` succeeded, and that commit already holds both of the unit's code commits. The later commits, `7b49d1604` and `e129624a8`, change only records. After that, `docs` was cancelled in the same install step in all three attempts of run 44237471520 and in run 44240485947. The push of this review starts a new run. If `docs` times out in the same step again, that is the condition that the report's _Next_ describes, not a defect of this unit.

**Out of this lens, for the coordinator.** `repo/host-invariant-1`'s run 44236329357 timed out in the same step at the same time (the report's reading, which I didn't repeat). Whether a 5-minute limit leaves enough room for that install is a question about `RD-14`'s job and not about this unit. I record it without a tier.

## Findings

None. The feature proof found no defect against the handoff, `RF-54`'s decision, `RF-51`'s form or `RD-6` property 3. The two deviations are judged above. The note on `Branded`'s JSDoc falls under `RF-57`, which is already registered.