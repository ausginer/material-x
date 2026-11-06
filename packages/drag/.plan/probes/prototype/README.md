# Prototype evidence

The saved output of the [prototype report](../../prototype-report.md). From `packages/drag`:

| Command | Writes |
| --- | --- |
| `npx just prototype-check` | `checks.json`: every scenario per engine |
| `npx just prototype-size` | `size.txt`: bytes per composition, module attribution, lines |
| `npx just prototype-cost` | `cost.json`: per-move and per-press cost, and allocation by function |