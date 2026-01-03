## Code style

- Always use Baseline-2025 features. Choose modern features over their older analogues even though they could have less support.
- Use native browser / NodeJS features wherever possible over libraries (e.g., you should use native private fields / methods over TypeScript ones).
- Each edited source file (.tsx?, .css, .html) should be formatted afterwards. Use `npm run fmt` for that.
- After every source-related task completed run `npm run lint:fix` command to find and fix ESLint issues. If autofix didn't work, the linting issue should be addressed.
  - It is preferred that linting issue is addressed correctly without suppressing.
  - However, if addressing linting issue looks too cumbersome, issue should be suppressed.
- Codestyle component importance:
  - Performance. This is the essential part of the code. Code should be as fast as possible for the end user.
  - Code size. Sometimes, the smaller codebase gives more performance (loading speed) over the performance bigger codebase could give. So, code size should also be as small as possible unless it starts to hurt performance. However, keep in mind that the code will be shipped to production minified, so the private variables/fields/functions/methods could have long names since they eventually are mangled.
  - Readability. Though readability has the less priority, it doesn't mean it is not important. Code has to be maintainable. The least priority just means that DX shouldn't preveal over UX. Sometimes, comment is better than less performant / more robust implementation.

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

## CSS.TS

Files with `.css.ts` extensions are ment to be compiled for browser usage. They are transformed into regular CSS files. To debug them and check how they look in CSS form, you should use `npm run debug -- <relative file path>` command. E.g., if you want to see how `src/button/styles/default/main.css.ts` file gonna look like in the CSS format, you have to run `npm run debug -- src/button/styles/default/main.css.ts`. Then, stdout will give you the CSS text.

## Core

Eventually, I plan to extract core implementation (`ReactiveElement` and other parts) to a separate package. That's why `useCore` function is implemented separately from other controllers: it is going to be used only in `material-x` package. So, if you have to implement something for core, make it as independent as possible.

## Implementation

When you are going to implement any feature, fix or anything else, first prepare a plan. Then you have to discuss the plan with me, and only then you can start the real implementation.

## Architecture

You can find architecture insights from your analysis in `.agents/docs/architecture.md`.
