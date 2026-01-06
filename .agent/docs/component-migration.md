# Component Migration Guide (src -> src2)

This doc captures the rules and workflow used to migrate components from `src/`
to `src2/`. The goal is to produce components that match the new token pipeline
and file naming conventions, while keeping runtime code free of `.tproc`.

## Non-negotiable rules

- Do not modify anything under `src/`. If a change is needed, copy to `src2/`.
- Use Baseline-2025 features and prefer native APIs over libraries.
- Keep runtime component code free of `.tproc` imports; `.tproc` is build-time.
- Use only private fields; avoid public property declarations.
- Follow naming conventions: `.tpl.html`, `.ctr.css`, `.tokens.css.ts`.
- For any implementation work, prepare a plan and get approval before editing.
- After source changes: run `npm run typecheck`, then `npm run fmt`,
  then `npm run lint:fix`.
- Use `src2/button` as the layout reference for new migrations.

## File and folder layout

Use the `src2/button` structure as the template:

```
src2/<component>/
  <component>.ts
  <component>.tpl.html
  <variant>.tpl.html (optional, if multiple templates)
  styles/
    utils.ts
    <variant>/
      main.ctr.css
      main.tokens.css.ts
      tokens.ts
      switch.tokens.css.ts (optional, if switch variants exist)
  <component>.stories.tsx
  <variant>.stories.tsx (optional)
```

Notes:

- Structural CSS goes into `.ctr.css`.
- Token CSS goes into `.tokens.css.ts`.
- Templates must live in `.tpl.html` and be imported with
  `with { type: 'html' }`.
- Component styles should be imported with `with { type: 'css' }`.

## Migration workflow (checklist)

1. Inventory the `src/` component
   - List templates, variants, and token sets.
   - Identify shared controllers or core helpers used in `src/core`.
   - Note any related stories (`*.stories.tsx`).

2. Scaffold in `src2/`
   - Create `src2/<component>/` mirroring the `src2/button` layout.
   - Create `.tpl.html` files for templates.
   - Create `styles/utils.ts` for token grouping and selector helpers.
   - If the component has a switch variant, plan separate `main` and `switch`
     token outputs.
   - Ensure `types.d.ts` has module declarations for new file types.

3. Move core dependencies into `src2/core/`
   - Copy any needed core utilities from `src/core` into `src2/core`.
   - Update all imports to `src2/core` (or other `src2` modules).
   - Do not modify `src/core` directly.

4. Migrate tokens to `.tproc`
   - Use `.tproc` in `styles/*/tokens.ts` only.
   - Prefer `@preact/signals-core` `computed()` for token packages.
   - Use `t.set(...)` with `group(...)`, `extend(...)`, and `allowTokens(...)`.
   - Use `append(...)` to add extra tokens before `resolveSet`.
   - Use `adjustTokens(...)` for token value fixes.
   - Use `adjustRender(...)` for selector or block tweaks.
   - Use helpers from `.tproc/selector.ts` (`attribute`, `pseudoClass`,
     `pseudoSelector`) instead of manual `[attr="x"]` strings.
   - If a token depends on an un-migrated resource, replace it with a private
     variable and add a `TODO`.
   - Keep `.tokens.css.ts` minimal:

     ```ts
     import { tokens } from './tokens.ts';
     const styles: string = tokens.value.render();
     export default styles;
     ```

5. Convert CSS
   - Move structural CSS into `main.ctr.css` (layout, spacing, static rules).
   - Keep token values and CSS variables in token outputs.
   - Use `.ctr.css` only for non-tokenized styling.

6. Update component runtime
   - Extend `ReactiveElement` from `src2/core`.
   - Wire behavior through `useCore` or component-specific `useX` helpers.
   - Use private fields and accessors instead of public property declarations.
   - Import templates and styles using `with { type: 'html' | 'css' }`.
   - Keep `.tproc` out of runtime imports.

7. Migrate stories
   - Move `*.stories.tsx` to `src2/<component>/`.
   - Update imports to `src2` component entry points.
   - Ensure any dependencies (icons, other components) also point to `src2`.

8. Validate
   - If `.css.ts` output needs inspection, use
     `npm run debug -- <path>.css.ts`.
   - Run `npm run typecheck`, `npm run fmt`, `npm run lint:fix`.
   - Confirm no new changes under `src/`.

## Token and selector conventions

- Use token grouping rules consistent with `src2/button/styles/utils.ts`.
- Use explicit inheritance with `extend(...)` (see
  `.agent/docs/css-inheritance.md`).
- Keep `main` and `switch` token outputs separate if the component needs both.
  If logic is shared, create a shared `tokens.ts` and re-export from
  `main.tokens.css.ts` and `switch.tokens.css.ts` to avoid duplication.

## Component boundaries

- Runtime: `src2/<component>/*.ts`, `.tpl.html`, `.ctr.css`.
- Build-time tokens only: `src2/<component>/styles/**/tokens.ts`,
  `*.tokens.css.ts`.
- Never import `.tproc` from runtime component modules.

## Checklist for new migrations

- [ ] `src/` unchanged; new code lives in `src2/`.
- [ ] Templates in `.tpl.html`, styles in `.ctr.css`.
- [ ] Tokens via `.tproc` in `tokens.ts` and exported by `.tokens.css.ts`.
- [ ] Runtime code uses only `src2/core` and `src2` components.
- [ ] Stories moved and imports updated.
- [ ] `npm run typecheck`, `npm run fmt`, `npm run lint:fix` completed.
