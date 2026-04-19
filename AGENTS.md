## Code style

- Install dependencies via `npm i` rather than editing `package.json` directly, to get the latest compatible version.
- Always use Baseline-2025 features.
- Prefer native browser / Node.js APIs over pulling in a library when the native API covers the use case (e.g. use `fetch` instead of axios, use `Array.groupBy` instead of lodash, use # instead of `private` keyword). This does not apply to libraries that provide substantial value beyond what native APIs offer (e.g. TanStack Query, React Router).
- Prefer TypeScript `type` over `interface` unless it is an interface the class to implement or it is required for extending global interfaces.
- Always use `Readonly<>` wrapper type / `readonly` modifier for TS `type`/`interface` unless mutability is required.
- Always prefer CSS classes over inline style.
- Each edited source file (`.tsx?`, `.css`, `.html`) should be:
  - formatted via `npx just fmt-mx <changed files>` (material-x) or `npx just fmt-ydin <changed files>` (ydin),
  - linted and fixed via `npx just lint-fix-mx <changed files>` or `npx just lint-fix-ydin <changed files>`. If autofix fails for any file, list those files — do not attempt to resolve lint errors manually; report them and continue,
  - typechecked via `npx just typecheck`. This checks all packages. Ignore errors in files you did not touch — unless your change caused them, in which case fix them.
  - File paths passed to `npx just` recipes are relative to the package directory (`packages/material-x` or `packages/ydin`).
- Codestyle priorities (in order):
  1. **Performance** — code should be as fast as possible for the end user.
  2. **Code size** — a smaller bundle can outperform a faster-but-larger one due to load time. Keep code size minimal unless it hurts runtime performance. Private identifiers can have long names — they are mangled in production builds.
  3. **Readability** — code must be maintainable. DX should not prevail over UX. A comment is sometimes better than a less performant but "cleaner" implementation.
- Always put the block expression like `if`, `for`, etc. into `{}`. Never use "one-liners".
- Always use `AbortController` instead of `removeEventListener` where applicable.
- Always use `{ once: true }` instead of `removeEventListener` where applicable.
- All top-level functions should be declared via `function` unless they are a product of another function. All internal functions (e.g., created inside another function) should be declared via arrow functions. Note: this rule doesn't apply to object methods, they should remain shorthand as much as possible.
- Never use `sync` versions of `node:fs`.

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

You can find architecture insights from your analysis in `.agents/docs/architecture.md`.
You can find CSS architecture reiteration in `.agents/docs/css-inheritance.md`.
You can find accessibility review in `.agents/docs/accessibility.md`

`src/button` is currently a component closest to the ideal as possible. While migrating other components please follow its layout.

## Sub-agents and teams

Use sub-agents for research and exploration tasks that can run in parallel (e.g. investigating different parts of the codebase simultaneously).

Use an agent team (`TeamCreate`) only when the task has clearly independent parallel work — for example, migrating several components at the same time. Do not create teams for review, small changes, or tasks with sequential dependencies.
