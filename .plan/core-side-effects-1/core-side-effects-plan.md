# `@ydinjs/core` declares `"sideEffects": false`

**Planned 2026-11-20 by the architect** on `core/side-effects-1`, from `origin/main` at `e4b0e475d`. `RD-30` in [`00-index.md`](../00-index.md) records the decision.

**Input:** the owner's answer to question 1 of the [`@trait` follow-ups plan](https://github.com/ausginer/material-x/blob/repo/trait-decorator-2/.plan/trait-decorator-2/trait-decorator-2-plan.md#questions-for-the-owner), relayed by the coordinator: _"Да, давай по обоим пунктам"_ ("Yes, go on both"). `RD-26`'s fourth amendment, on `repo/trait-decorator-2`, records the answer.

**Probes,** all at `e4b0e475d`, with rolldown 1.3.2 and esbuild 0.28.1, on a root `just build`. Each one that compares the field's two states ran once with `"sideEffects": false` added to core's `package.json` and once without it:

- [`top-level.ts`](probes/top-level.ts) ([transcript](checks/top-level.txt)): every top-level statement of the 27 built modules;
- [`consumer-drop.ts`](probes/consumer-drop.ts) ([transcript](checks/consumer-drop.txt)): a bare import of each module, bundled by rolldown and esbuild;
- [`oracle.ts`](probes/oracle.ts) ([transcript](checks/oracle.txt)): which rolldown setting still sees a real effect when a package declares the field;
- [`consumer-entries.ts`](probes/consumer-entries.ts) ([transcript](checks/consumer-entries.txt)): each material-x runtime entry, and all of them together, bundled by rolldown and esbuild;
- the root `just size-reading` ([transcript](checks/size-reading.txt)), and the built files of core and material-x ([transcript](checks/build-identity.txt)).

## What the field claims

`"sideEffects": false` tells a consumer's bundler that no module of the package does anything at import that a consumer needs. A bundler may then leave out a module, with all of its top-level code, when the consumer uses none of its exports. A bare `import '@ydinjs/core/x.js'` is then an import of nothing.

It doesn't change what a used module keeps. A bundler still drops or keeps each statement of a used module by its own analysis.

## Why it is true of the 27 modules

### What their top levels evaluate

The 27 modules are the `.js` targets of core's `exports`. Every top-level statement is one of these ([transcript](checks/top-level.txt)):

| Statement | Where | What evaluating it does |
| --- | --- | --- |
| An import with specifiers | 22 modules | Imports another core module. All 55 are relative, so no core module imports another package at runtime. None is bare |
| An export list, a function declaration | every module | Binds names |
| A `const` or `let` with a literal, an object or array literal, or nothing | 13 modules | Creates a value |
| `Symbol("…")`, and `new WeakMap()` | the 8 trait modules, and `reorderable.js` | Creates a value |
| `bound()` | `attribute-traits.js`, twice | Calls `bound` in `composition.js`, which returns `null` |
| `createEventNotifier({ … })` | `useRovingTabindex.js` | Calls a function in `utils/DOM.js` that returns a closure |
| A class with no static part | `emitter.js`, `useRovingTabindex.js`, `utils/DOM.js` | Creates a class |
| A class that extends `Event`, `Error` or `HTMLElement` | `useContext.js`, `useCSSProps.js`, `reorderable.js`, `element.js` | Reads that global, and creates a class |
| A trait class: `extends AnyElement`, a `static observedAttributes` array, a computed `[Symbol.hasInstance]` method | the 8 trait modules | `AnyElement` is `null`. Creates a class |
| `ControlledElement`'s static block | `element.js` | Assigns its module's own `use` and `internals` |

None of them writes to a global or to another module's state, defines an element, adopts a stylesheet or adds a listener. core imports no CSS, and no module has a top-level expression statement, loop or condition. `element.js`'s `define` calls `customElements.define`, and only a component module calls it.

**The one observable thing is a throw.** Where `HTMLElement` or `Event` doesn't exist, as in Node without a DOM, evaluating `element.js` or a module that extends `Event` throws a `ReferenceError`. A bundler that leaves the module out removes only that failure, which no consumer relies on.

### What a bundler reads

**rolldown agrees, without the field.** Told that every module has side effects unless its own analysis proves otherwise, rolldown keeps 0 bytes for a bare import of each of the 27 modules ([transcript](checks/consumer-drop.txt), column `rolldown-ignoring`). This plan doesn't read how rolldown proves `bound()` and `createEventNotifier(…)` free of effects.

**esbuild needs the field.** Without it, esbuild keeps code for 21 of the 27:

- 712 bytes for `element.js`, and for each of the 10 controllers that import it: `ControlledElement` and what it calls;
- 41 bytes for `attribute-traits.js`: `bound` and its two calls;
- 753 bytes for each trait module, which is those two together;
- 959 bytes for `useRovingTabindex.js`.

With the field, it keeps 0 for every module.

## The size reading

| Where | What the field changes |
| --- | --- |
| The root size reading, 33 rows | **No row** ([transcript](checks/size-reading.txt)) |
| core's and material-x's built files, 175 | **No file** ([transcript](checks/build-identity.txt)) |
| An esbuild bundle of a material-x entry | **42 to 51 bytes less** in 14 of 18 entries ([transcript](checks/consumer-entries.txt)) |

- **The size rows don't move, because size-limit bundles with rolldown,** and rolldown already drops each of these modules by its own analysis. material-x's rows include the five bare imports that rolldown keeps in material-x's own build:
  - `IconButtonCore.js`'s import of `attribute.js` and `attribute-traits.js`;
  - `TextFieldCore.js`'s, `ButtonGroupCore.js`'s and `focus-forwarding.js`'s import of `attribute-traits.js`.

  Each costs 0 bytes in a rolldown bundle with or without the field. So do the three bare imports of `composition.js` that `RD-26`'s fourth amendment removes.

- **material-x's published files don't change,** and they keep the five imports. material-x's build treats core as external and reads no external package's `package.json`. core's own build output doesn't change either, and tsdown's writing of `exports` keeps the field.
- **An esbuild consumer gains.** esbuild keeps `attribute-traits.js`'s `bound` and its two calls in an entry that imports the module and uses none of its exports. With the field it drops them. That is the five imports' cost, because `attribute.js` costs esbuild 0 bytes without the field:
  - 14 of material-x's 18 runtime entries lose 42 to 51 minified bytes, uncompressed;
  - `button/split-button`, both button groups and `icon/icon` don't change. In `split-button`, `bound` and its two calls stay with the field, so a binding of the module is used. The other three aren't read;
  - the bundle of all 18 entries loses 2 bytes.
- **Any esbuild consumer of core** that bare-imports a module, or imports one and uses none of its exports, drops up to the 959 bytes above.
- **Not read:** webpack, Rollup and Parcel.

## Keeping a module with an effect out of the claim

### Decision: `false`, and a release check that proves it

The field is `false`. The release workflow's consumer step, step 7, checks the claim of every package whose manifest makes it, on the tarball that is published. box-quad declares `"sideEffects": false` already, so it is checked too.

**The check's required properties:**

1. **Which packages:** a packed manifest whose `sideEffects` is `false`. A manifest without the field isn't checked. A manifest whose field has another value, such as an array, is reported: the check doesn't read arrays yet, and a claim it can't verify isn't accepted.
2. **What it bundles:** for each module that `exportSpecifiers` names, a module whose only statement is a bare import of that specifier. It resolves the specifier from the consumer project, where step 7 installed the tarball.
3. **How it bundles:** with rolldown, the repository's own copy, with `treeshake.moduleSideEffects` set to a function that returns `true`. That function overrides the package's field. `true`, `'no-external'` or the default don't: with the field present, rolldown leaves out a module that writes to `globalThis` or defines an element ([transcript](checks/oracle.txt)).
4. **When it passes:** the bundle emits no code and no asset for any entry. An asset counts because a CSS import produces one.
5. **What it reports:** a problem under the name `side-effects` for each entry that keeps output, with the specifier and the bytes kept. The message says how to repair it: remove the effect, or list the module in the field. It's reported alongside step 7's other problems, as every check is.

**When a module gains an effect,** its author has two repairs:

- remove the effect, or mark a call that rolldown can't prove free of effects with `/* @__PURE__ */`;
- change the field to an array of the modules that have effects, and extend the check to read arrays. That unit decides how the check matches an entry against the array.

### Why this design

- **Why `false` and not an array.** An empty array means the same as `false`. Neither one keeps a module with an effect out of the claim by itself: an array works only when its author writes the module into it. The check is what catches a module that nobody listed, whichever form the field has.
- **Why rolldown judges it.** The claim is about what a bundler may leave out, and rolldown is the repository's bundler: it builds every package and measures every size row. It keeps what it can't prove free of effects. So when it is wrong, it reports an effect that isn't one, and a release fails until the author marks the call or lists the module. A list of allowed statement forms would be a second analysis that someone must maintain, and it would need the same answer for every call.
- **Why at release.** The field becomes a contract when the package is published. Step 7 already installs the tarball that will be published into a consumer project, and it runs in every check run, every release run and `just release-check`. A pull request that adds an effect to core passes CI, and the next release's check run fails before anything is staged.

### Not adopted

- **The check in the pull-request workflow too.** It would catch the effect in the pull request that adds it. But no job there packs a package, and the check would need a build and a pack of its own. Catching it at the check run that comes before each release is early enough: nothing is published in between.
- **`"sideEffects": []`:** it means the same as `false`, and a reader is more likely to take it for a list that someone forgot to fill.
- **A test in core that reads the top level of the source.** The claim is about the published modules, and the plugin and tsdown write them. A test of the source would miss what they add.

## Tasks

1. **`packages/core/package.json`:** `"sideEffects": false`, after `"type"`, where box-quad's manifest has it.
2. **`.scripts/release-check.ts`:** the `side-effects` check of properties 1 to 5 in step 7, after the install. Add it to the module's doc comment, `checkConsumer`'s doc comment, and the `Check` type.
3. **`.scripts/release-check.node.test.ts`:** the rows of proof 1.
4. **`.agents/docs/releasing.md`:** step 7 of _What the workflow checks_ says that the bare import of each export emits nothing when the manifest declares `"sideEffects": false`, and that a manifest with another value fails.
5. **The report:** `.plan/core-side-effects-1/core-side-effects-report.md`, with the proofs' runs. `RD-30` gets its _Implemented_ line.

## Proofs

Each proof names what it witnesses. A test fails without its change, and the implementer records the failing run beside the passing one.

1. **The check discriminates** (`release-check.node.test.ts`, on fixture packages installed as step 7 installs them):
   - a package with `"sideEffects": false` whose modules write to `globalThis`, call `customElements.define` and import CSS: three `side-effects` problems, each naming its specifier;
   - the same package's pure module: no problem;
   - a package without the field and with the same modules: no `side-effects` problem;
   - a package whose field is an array: one problem that says the check doesn't read arrays.

   **Mutations:**

   - `moduleSideEffects: true` in place of the function fails the three effect rows: rolldown then reads the field and drops the modules;
   - counting only chunks fails the CSS row.

2. **core passes, and fails when it should.** `just release-check core` lists no `side-effects` problem. Its other problems are expected, because core isn't ready for release: its manifest has no `files`, `repository` or changelog. Then, in a scratch change that isn't committed, add a top-level `globalThis.ydinProbe = 1;` to `src/utils/runtime.ts`. The run names `@ydinjs/core/utils/runtime.js` under `side-effects`, and the other problems are the same.
3. **box-quad passes:** `just release-check box-quad` lists no `side-effects` problem.
4. **The tree.** Build at the branch's base and after: every file that the build writes in core and material-x is byte-identical. core's `package.json` keeps the field after the build.
5. **Size:** the root `just size-reading` changes no row. If one changes, the report names it and says why.
6. **The consumer reading:** `consumer-entries.ts` and `consumer-drop.ts` rerun on the branch match this plan's transcripts. This is evidence for the record, not a gate.
7. **Gates:** root `just typecheck`, `just lint`, `just fmt-check`, and root `just test`, which runs `release-check.node.test.ts`.

## Not in scope

- **material-x's own field.** Its component modules define their elements at import, so it can't declare `false`. Whether it declares an array is a separate question.
- **The five bare imports in material-x's published files.** Each costs 0 bytes in a rolldown bundle, and nothing in an esbuild bundle once core declares the field. Removing them from the files would need material-x's build to declare core free of effects, which the [follow-ups plan](https://github.com/ausginer/material-x/blob/repo/trait-decorator-2/.plan/trait-decorator-2/trait-decorator-2-plan.md#ii-and-cores-sideeffects-for-the-owner) didn't adopt.
- **Readings with webpack, Rollup or Parcel.**