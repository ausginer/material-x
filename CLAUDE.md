## LSP

Prefer LSP over grep for code-symbol tasks (definitions, references, types, call hierarchy); grep is still right for plain-text/non-symbol searches.

The LSP plugin is a deferred tool and can be unavailable. At the start of any code task, load it via ToolSearch and try it. If it errors, re-probe once, then fall back to grep.

In every completion report, state both its availability and actual use with exactly one of:

- `LSP plugin - unavailable.`
- `LSP plugin - available; used: <operations and purpose>.`
- `LSP plugin - available; not used: <brief reason>.`

Do not report availability alone. For code-symbol work, an available-but-unused LSP requires an explicit reason.

## Code style

- Install dependencies via `npm i` rather than editing `package.json` directly, to get the latest compatible version.
- Always use Baseline-2025 features.
- Prefer native browser / Node.js APIs over pulling in a library when the native API covers the use case (e.g. use `fetch` instead of axios, use `Array.groupBy` instead of lodash, use # instead of `private` keyword). This does not apply to libraries that provide substantial value beyond what native APIs offer (e.g. TanStack Query, React Router).
- Prefer TypeScript `type` over `interface` unless it is an interface the class to implement or it is required for extending global interfaces.
- Always use `Readonly<>` wrapper type / `readonly` modifier for TS `type`/`interface` unless mutability is required.
- Always prefer CSS classes over inline style.
- Each edited source file (`.tsx?`, `.css`, `.html`) should be:
  - formatted via `npx just fmt <changed files>`,
  - linted and fixed via `npx just lint-fix <changed files>`. If autofix fails for any file, list those files — do not attempt to resolve lint errors manually; report them and continue,
  - typechecked via `npx just typecheck`. This checks all packages. Ignore errors in files you did not touch — unless your change caused them, in which case fix them.
  - The `fmt`, `lint-fix`, and `typecheck` recipes live in each package's own Justfile, so run them from the relevant `@ydinjs` package directory (`packages/core`, `packages/tproc`, `packages/material-x`, or another package workspace). File paths passed to them are relative to that package directory.
  - When you change a core source file that `@ydinjs/material-x` consumes, rebuild core (`npx just build` from `packages/core`) before typechecking Material X — it resolves `@ydinjs/core` through its built `.d.ts` at the package root, not `src`, so type changes are invisible until rebuilt.
- Codestyle priorities (in order):
  1. **Performance** — code should be as fast as possible for the end user.
  2. **Code size** — a smaller bundle can outperform a faster-but-larger one due to load time. Keep code size minimal unless it hurts runtime performance. Private identifiers can have long names — they are mangled in production builds.
  3. **Readability** — code must be maintainable. DX should not prevail over UX. A comment is sometimes better than a less performant but "cleaner" implementation.
- Always put the block expression like `if`, `for`, etc. into `{}`. Never use "one-liners".
- Always use `AbortController` instead of `removeEventListener` where applicable.
- Always use `{ once: true }` instead of `removeEventListener` where applicable.
- All top-level functions should be declared via `function` unless they are a product of another function. All internal functions (e.g., created inside another function) should be declared via arrow functions. Note: this rule doesn't apply to object methods, they should remain shorthand as much as possible.
- Never use `sync` versions of `node:fs` unless there is truly no async alternative (e.g. `registerHooks` from `node:module` requires synchronous hooks — that is the only known exception).
- Treat `Object.assign` as an ordered multi-source assignment primitive. When sources already exist independently, pass them as separate arguments instead of pre-merging them with object spread. Pre-merging needlessly materializes a combined source and copies later-source properties twice; it may also change observable assignment behavior for setters, proxies, accessors, or other non-plain targets.

### Unit-tests

When you are working on unit tests, follow the rules:

- Always use `describe` for a unit you're testing.
- Each `it` should describe only one specific logic part of a unit. Do not mix them up.
- `it` should start with (in most cases) or should include `should` word.

Example of incorrect test:

```ts
// Testing a `buildSelector` function in `it` without `describe.
it('buildSelector builds state and scoped selectors', () => {
  // Testging three different logic parts at once:

  // Scope testing
  expect(buildSelector('default', { name: 'color', value: 'elevated' })).toBe(
    ':host([color="elevated"])',
  );

  // Built-in state testing
  expect(buildSelector('hovered', undefined)).toBe(':host(:hover)');

  // Custom state testing
  expect(buildSelector('selected', undefined)).toBe(':host(:state(selected))');
});
```

Correct test:

```ts
describe('buildSelector', () => {
  it('should build scoped selector', () => {
    expect(buildSelector('default', { name: 'color', value: 'elevated' })).toBe(
      ':host([color="elevated"])',
    );
  });

  it('should build built-in state selector', () => {
    expect(buildSelector('hovered', undefined)).toBe(':host(:hover)');
  });

  it('should build custom state selector', () => {
    expect(buildSelector('selected', undefined)).toBe(
      ':host(:state(selected))',
    );
  });
});
```

## CLI commands

You don't need anything to run TS in this repo. Just use direct `node my-file.ts`, and this project's node will do the rest.

## .css.ts files

Files with `.css.ts` extensions are meant to be compiled for browser usage. They are transformed into regular CSS files. To debug them and check how they look in CSS form, use `npx just debug <relative file path>`. E.g., to see how `src/button/styles/default/main.css.ts` will look in CSS format, run `npx just debug src/button/styles/default/main.css.ts`. The CSS output is printed to stdout.

## Architecture

You can find `@ydinjs` architecture insights in `.agents/docs/architecture.md`. You can find CSS architecture reiteration in `.agents/docs/css-inheritance.md`. You can find accessibility review in `.agents/docs/accessibility.md`

`src/button` is currently a component closest to the ideal as possible. While migrating other components please follow its layout.

`@ydinjs/material-x` runtime entrypoints are listed in `packages/material-x/files.json`; update it when adding or removing a component.

## Testing

When adding, moving, or reviewing an `@ydinjs/material-x` component's tests, use skill `test-component` (placement under `packages/material-x/tests`, file suffixes and Vitest project routing, rendering/interaction rules, definition of done). When writing or debugging an `@ydinjs/tproc`-backed visual contract — a `*.spec.browser.test.ts`, a token binding, the resolve-token bridge, or a normalization adapter — use skill `test-visual-contract`. Both skills apply even if the request doesn't name them. The reasoning behind the layers lives in `.agents/docs/test-architecture.md`.

## Sub-agents and teams

Delegating is the default here, not the exception. Do not wait to be told to use a sub-agent, and do not ask which type to use — pick one and go. Announce the delegation in one line, then get on with it.

Reach for a sub-agent whenever any of these is true:

- The answer requires sweeping many files, directories, or naming conventions.
- Two or more parts of the work are independent and could run at the same time.
- The task is exploratory — "where is X", "how does Y work", "what would it take to Z".
- The work would otherwise flood this conversation with file dumps you only need a conclusion from.

Choosing the type (your call, no need to confirm):

- `Explore` — read-only fan-out search; you want the conclusion, not the excerpts. State the breadth ("medium" or "very thorough") in the prompt.
- `Plan` — design an implementation strategy, weigh architectural trade-offs, identify the critical files, before any code is written.
- `general-purpose` — multi-step research or execution that may also need to edit, run commands, or iterate.
- `claude-code-guide` — questions about Claude Code, the Agent SDK, or the Claude API.

Fan out in parallel by default: when several sub-questions are independent, launch them in a single message rather than one after another. Before spawning, check whether a running or recently finished agent can be continued via `SendMessage` instead — a continued agent keeps its context, a new one starts cold.

Give every sub-agent the context it needs up front (paths, package, constraints, relevant CLAUDE.md rules) — it does not see this conversation. Its final report is not shown to the user, so relay what matters yourself.

Handle inline, without delegating: single-file edits you already know how to make, follow-up questions about work you just did, code review of a diff, anything with tight sequential dependencies, and anything where spawning costs more than doing.

Use an agent team (`TeamCreate`, when available) only for clearly independent parallel work — for example, migrating several components at the same time. Not for review, small changes, or sequential tasks.

## Tokens DB

If you need to access any file in `.data/tokens`, use skill `use-tokens-db`.