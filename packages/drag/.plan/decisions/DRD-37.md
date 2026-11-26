#### DRD-37 — `@typescript-eslint/unbound-method` is off for `packages/drag`

**Status:** active, decided on 2026-11-09 on the owner's direction. Supersedes `DRD-34` property 9 and `DRD-35` property 8. Implemented at `50ed18a17`, reported at `36dbd55db`. Read by the architect ([assessment](../callback-list-completion-assessment.md)): conforms. Property 3 was clarified on 2026-11-10: it is checked by reading lint's output. **Amended on 2026-11-14 by `DRD-63`:** property 4 covers all six built-in receiver sites **Property 4 is superseded on 2026-11-15 by `DRD-69`.**

**ESLint doesn't apply `@typescript-eslint/unbound-method` to `packages/drag`'s TypeScript files, and no file in the package carries a directive for it. Every other package keeps the rule at `error`.**

Decided on 2026-11-09 on the owner's direction: disable the rule only for `packages/drag`, and remove the package's suppressions that this makes obsolete. The repository's configuration and `CONTRIBUTING.md` are unchanged.

_Why, as the architect reads it:_ `DRD-34` and `DRD-35` make passing a method with its receiver part of the package's API, for internal work through `enter` and for consumers through `requestStep` and `use`. The rule doesn't read the receiver argument, so it reports every such call, and each call needed a disable that restated it.

**Required properties:**

1. **Where.** The setting is in `packages/drag/eslint.config.ts`, the configuration that the package's `just lint` and `just lint-fix` load. It is a block after the shared configuration, scoped to the package's TypeScript files, with a comment that gives the reason and cites `drag:DRD-37`. The root `eslint.config.ts`, `.oxlintrc.json` and every other package's configuration are unchanged.
2. **Its reach.** With the package's configuration, `eslint --print-config` gives the rule as off for a file in `src/`, in `tests/` and in `.plan/probes/`. With another package's configuration, for example `packages/core`'s, it still gives `error` for that package's files.
3. **No directive remains.** No `eslint-disable`, `eslint-disable-next-line` or `eslint-enable` comment in `packages/drag` names `@typescript-eslint/unbound-method`. Every directive for another rule stays. The package's lint reports no unused directive.
4. **The types still guard the built-in sites.** `DRD-35` property 7 holds: `InsertionGeometry.invalidate`, `InsertionGeometry.retire` and `DisplacementSink.retire` declare their `this`, so removing the receiver at one of `sortable`'s three sites fails typecheck. The overloads without a receiver keep `this: undefined`.

**Clarified 2026-11-10,** from the completion's M8 ([assessment](../callback-list-completion-assessment.md) §4): property 3 is checked by reading lint's output. ESLint reports an unused directive as a warning, which is its default and is not set in any configuration, so `just lint` exits with status 0 with one. Making it fail lint is a repository question, outside this decision. The properties are unchanged.

**Accepted consequence:** in `packages/drag`, lint no longer reports a method read without its receiver. Typecheck reports it where the method declares `this`, and otherwise only a test can. The root configuration's reason for enforcing the rule still governs every other package.

**What this amends:**

- **`DRD-34` property 9** is superseded: the package has no `unbound-method` directive.
- **`DRD-35` property 8** is superseded, except its last sentence: `CallbackList`'s types pass lint without a disable and don't use the `Function` type.
- **`DRD-35`'s direction "Lint policy stays unchanged for this unit"** applied to that unit, which is complete.

**Amended 2026-11-14 by `DRD-63`.** Property 4 covers every built-in method passed with its receiver: the three named here, `sortable`'s `invalidate` step, and the drop-target tracker's release and resolve. Removing the receiver at any of them fails typecheck. The text above is unchanged.