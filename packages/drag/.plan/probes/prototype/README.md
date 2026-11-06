# Prototype evidence

The saved output of the [prototype report](../../prototype-report.md). From `packages/drag`:

| Command | Writes |
| --- | --- |
| `npx just prototype-check` | `checks.json`: every scenario per engine |
| `npx just prototype-size` | `size.txt`: bytes per composition, module attribution, lines |
| `npx just prototype-cost` | `cost.json`: per-move and per-press cost, and allocation by function |
| **Two files were ignored by git at `599684791` and are not in its tree:** `prototype/pages/shared.css` and `prototype/src/globals.d.ts`. They are copied here as `shared.css.txt` and `globals.d.ts.txt`, so that the code at that revision can be rebuilt. |