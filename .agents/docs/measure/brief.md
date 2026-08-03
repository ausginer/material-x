# A measurement tool for this repository

**Status: brief.** Nothing here is built yet. `packages/drag2/bench/size/measure.ts`
is a working prototype of the size half, written for M-3 (contract
[05](../drag/contract/05-lifecycle-invariants.md) §Measurements) and confined to
one package. This document records why Size Limit was not enough for it, what
the prototype does, and what a repository-wide replacement would have to be.

The repository publishes nothing and is pre-alpha throughout, so the
replacement is free to be opinionated and to break its own interfaces.

---

## What we needed, and why a byte count is only half of it

M-3 asks whether four compositions of `@ydinjs/drag2` weigh what the
tree-shaking design claims. The important word is *claims*: contract
[03](../drag/contract/03-feature-composition.md) §Tree-shaking does not say
"minimal is small", it says a minimal composition's import graph **physically
cannot reach** the features it did not install. That is the property the export
topology exists to create, and it is what a regression would break first.

A byte count cannot express it. **A module can be pulled into a graph, shaken
down to almost nothing, and show up as a delta small enough to read like
success.** The budget would still pass; the design claim would already be dead.
So a composition is really two declarations:

1. the exact named imports a consumer writes, and a budget for what they weigh;
2. the set of modules its graph must, and must not, contain.

Both are properties of the same composition. A tool that owns only the first
forces the second to be declared somewhere else, in another format, against
another copy of the same fixture list — and then the two can disagree without
anything noticing.

## Why Size Limit is not sufficient

Size Limit is a good tool for what it does. Three specific things stopped it
here, and only the first is a limitation rather than a bug.

### 1. It reports a number and nothing else

There is no hook that exposes the bundled module graph, and no config vocabulary
for asserting about it. This is not an oversight — Size Limit's whole premise is
"one number per check, compared against one limit" — but it means the half of
M-3 that is *not* a number has to live outside it.

We ran this way briefly: `.size-limit.json` owning bytes and budgets, a separate
harness reading that same config and owning graphs. It works, and it is what the
prototype did for one commit. It also puts a seam through the middle of a single
idea, and every future property that is not a byte count — a module's presence,
an export's absence, a side-effect-free re-export chain — has to be bolted onto
the same seam.

### 2. `import` is gated on a plugin *name*, not a capability

Size Limit's `import` option is exactly the right shape for our fixtures:

```json
{ "path": "index.js", "import": "{ createStore }" }
```

It is gated:

```js
// size-limit/get-config.js
const OPTIONS = { import: ['webpack', 'esbuild'], … }
// size-limit/load-plugins.js
has(type) {
  return this.list.some(
    i => i.name === `@size-limit/${type}` || i.name === `size-limit-${type}`
  )
}
```

The check is on the loaded modules' `name` field. A third-party bundler plugin
cannot declare the capability; it can only *rename itself* to `size-limit-esbuild`
and inherit the whole esbuild option surface — including `config`, `ignore` and
`modifyEsbuildConfig`, which it would then silently ignore.

`packages/size-limit-preset-rolldown` **already implements `import`**
(`createImportEntry`). That code has never run, because the preset answers to its
own name. We tried the rename, with explicit rejection of the three options it
does not implement, and it worked — the numbers matched the custom path to the
byte. It was still a package claiming to be a different package to get past a
string comparison, and it is not a thing to spread across the repository.

### 3. A documentation trap worth recording

The multi-file form is documented as `{ "a.js": "{ a }", "b.js": "{ b }" }`. The
keys are **file paths relative to the config**, not package specifiers. Only
`peerDependencies` go through `require.resolve`; everything else is
`join(cwd, key)` (`get-config.js`). So `"@ydinjs/drag2/sortable.js"` resolves to
`<cwd>/@ydinjs/drag2/sortable.js` and fails, with an error that reads like the
package is broken.

That matters for us specifically: measuring through the **published `exports`
map** is a property we want to assert, and this form cannot express it.

## What the prototype does

`packages/drag2/bench/size/measure.ts`, ~230 lines, no dependency beyond
`rolldown` and `node:zlib`.

**A composition is one declaration.**

```ts
{
  name: 'minimal + landing',
  imports: {
    'drag.js': '{ draggable }',
    'sortable.js': '{ sortable }',
    'sortable/vertical.js': '{ vertical }',
    'sortable/callbacks.js': '{ callbacks }',
    'sortable/landing.js': '{ landing }',
  },
  budget: 9850,
  absent: ['sortable/layout-animation.js', 'sortable/placeholder.js', 'sortable/handle.js'],
  present: ['sortable/landing.js'],
}
```

**The pipeline.** Write a virtual entry that re-exports the named imports →
bundle with Rolldown (`platform: 'neutral'`, ESM, `minify: true`) → collect
`chunk.modules` keys as the graph → `TextEncoder` for minified bytes,
`brotliCompressSync` for the reported figure.

Four decisions in that pipeline are load-bearing:

- **Re-export, not import-and-use.** The generated entry is
  `export { landing } from '…'`. Retaining an import by *using* it — Size Limit
  emits `console.log(x)` — adds the use to the measured bytes. A re-export
  retains every name for the graph and contributes nothing.
- **No wrapper module.** An earlier version of this used checked-in fixture
  files with a `mount()` function. That measured the fixture's own body along
  with the features, ~20 bytes per composition. Import maps removed it.
- **Absolute paths in the generated entry**, because the entry lives in a temp
  directory. This is where a specifier form would go if we want to measure
  through the `exports` map rather than at built files.
- **Some things are not a set of imports.** Two of the six M-3 entries are
  checked-in modules: the non-composed baseline has to assemble a slot record by
  hand, and the migration baseline is a different package. The declaration
  carries `entry` instead of `imports` for those.

**Violations are computed, not thrown.** `violations(measurement)` returns every
way a measurement broke its declaration — over budget, pulled something absent,
missed something present — so one composition reports all of its problems at
once, in the CLI and in the test.

**Two consumers, one declaration.** `just size` runs it and exits non-zero on any
violation. `tests/bench/size.node.test.ts` builds the package, measures every
composition, and asserts the same `violations` are empty — plus determinism
(two runs, byte-identical) and a fidelity check that the hand-written
non-composed baseline still fills exactly the slots `assemble()` fills.

## What a repository-wide tool would have to add

The prototype is package-local by design. A shared tool needs:

- **Multiple packages, one command**, with per-package declarations discovered
  the way `files.json` already is.
- **Specifier resolution through the `exports` map**, so a composition measures
  what a consumer can actually import. The prototype resolves to built file
  paths, which cannot catch a subpath the export map does not expose. There is
  already a separate test for that in drag2 (`tests/consumer.node.test.ts`);
  folding it in would make one mechanism out of two.
- **A place for the non-size measurements.** drag2 also has M-1 (move-path
  timing, allocation) and M-2 (heap per controller, frame-task policies) as
  opt-in browser suites under `tests/perf/`, with their own conventions — median
  of calibrated batches, `gc()` before every heap reading, minimum-of-N because
  heap noise is one-sided, and a hard requirement to run one file at a time
  because parallel test files inflate every absolute by ~2×. Those conventions
  should be a library, not a comment repeated in each suite.
- **Budgets that are easy to re-baseline.** They were set by hand from the first
  measurement here. A `--update` flag that rewrites them, with the diff visible
  in review, would remove the incentive to widen a budget quietly.
- **A stable report format.** Currently a padded table for humans. CI wants
  something diffable, and the measurement write-ups
  (`.agents/docs/drag/measurements/`) want something quotable.

Two things the prototype got right that are worth keeping:

- **The declaration is the specification.** Everything 05 calls a
  reproducibility precondition — bundler, target, minifier, compression,
  aliases, repetition policy — is a value in the file, not a flag in a command
  line or a CI job. A measurement whose configuration lives somewhere else is
  not reproducible.
- **Determinism is asserted, not assumed.** It is what allows single numbers
  with no statistical policy, and it is one assertion.

## Prior art in this repository

- `packages/size-limit-preset-rolldown` — the Rolldown builder for Size Limit.
  Its `createImportEntry` is the same idea as the prototype's `importEntry`, and
  is unreachable for the reason in §2.
- `packages/drag2/prune-declarations.ts` — walks emitted declarations from the
  declared entries and removes what nothing reaches. Same shape of question
  (what does this entry actually pull), different artifact.
- `packages/drag2/tests/packaging.node.test.ts` — walks the source import graph
  to check the published `files` list covers it.

Three separate reachability walks over the same package. That is the clearest
signal that this belongs in one tool.
