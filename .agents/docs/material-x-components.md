# `@ydinjs/material-x` components

> Retrieved when a change adds, removes or restructures a Material X component.

- `packages/material-x/src/button` is the closest thing to the intended component layout; follow it when migrating others.
- Runtime entrypoints are listed in `packages/material-x/files.json`. **Update it when adding or removing a component** — a component absent from that list exists in the tree and not in the package.
- To see what a `.css.ts` file compiles to, run `npx just debug <path relative to the package>`; the CSS is printed to stdout.
