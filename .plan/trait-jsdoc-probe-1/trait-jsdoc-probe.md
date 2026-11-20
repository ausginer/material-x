# A decorated trait's JSDoc in the published `.d.ts`: three ways probed, and a fourth found

**What this record answers:** how the `@trait` pass of [RD-26](../00-index.md#rd-26--traits-are-plain-classes-in-two-layers-a-component-names-its-traits-in-a-composed-annotation-and-the-flattener-is-a-required-build-step) can keep a trait's JSDoc in the published `.d.ts`. It gives the result for each way and a recommendation, as **P47**. It was written by the architect on `repo/trait-jsdoc-probe-1`, from `origin/repo/attributes-decorator-1` at `dfd49e683`. It decides nothing. The source form is RD-26's, and the owner chooses.

**Chosen 2026-11-20 by the owner: way 1,** a `load` stage, with the written form unchanged. `RD-26`'s third amendment of that date records it. The [`@trait` plan](../trait-decorator-1/trait-decorator-plan.md#the-doc-in-the-declarations-a-load-stage) holds the design. Its internal form is `export @trait class`, not this probe's stand-in. **P48** ([`probes/p48/`](probes/p48/), [transcript](checks/p48-run.txt)) measured that form on the implementer's compile at `eda3b1bfc`.

**The owner's authorization,** relayed by the coordinator on 2026-11-20: _"Давай сделаем пробу, и попроси проверить ещё один способ: заранее сохранить ноду комментария перед декоратором, и потом просто добавить его обратно к классу."_ ("Let's run a probe, and ask for one more way to be checked: save the comment node in front of the decorator beforehand, and then simply add it back to the class.")

**The defect,** found by the implementer and reproduced by the coordinator: when the source reads `/** doc */`, then `@trait`, then `export class X`, the `.d.ts` that tsdown emits has no doc. It affects 10 published files: core's `checkable`, `disableable`, `linkable`, `nameable`, `reorderable`, `selectable`, `typeable` and `valuable`, and material-x's `focus-forwarding` and `IconButtonCore`.

## Why the doc drops

- **tsdown 0.23.7 puts its dts plugins ahead of the user's** (`node_modules/tsdown/dist/build-S0sSJY-K.mjs`, lines 494 and 526).
- **rolldown-plugin-dts 0.30.2 records the code it receives,** in a `transform` hook with `order: "pre"` (`dist/index.mjs`, line 732). Its `load` hook for the `.d.ts` id later emits declarations from that code, through rolldown's `isolatedDeclarationSync`, which is oxc's emitter (lines 120 and 794).
- **No transform of ours can run before it.** `order: 'pre'` only sorts plugins within the pre group, and array position breaks ties, so the dts plugin goes first. The `control-pre` row below shows this. A `load` hook runs before every transform, so it is what can force an early step.
- **oxc and TypeScript disagree about where a doc belongs** ([`p47-placement.txt`](checks/p47-placement.txt)):

  | Placement | oxc (rolldown 1.3.2) | TypeScript 6.0.2: emit and editor doc | tsc 7.0.2 emit |
  | --- | --- | --- | --- |
  | doc, `export class` (today) | kept | kept | kept |
  | doc, `@trait` [`@attributes(T)`], `export class` (RD-26's form) | **dropped** | kept | kept |
  | `@trait` [`@attributes(T)`], doc, `export class` | kept | **dropped** | **dropped** |
  | doc, `export @trait` [`@attributes(T)`] `class`, in any layout | kept | kept | kept |
  | `export`, doc or decorators, then `class` | dropped | dropped | dropped |
  | doc, `@trait class`, not exported | kept | kept | kept |

  "Editor doc" is the documentation TypeScript's checker gives the class symbol, which is what a hover shows.

- **rolldown 1.3.3, the latest release on 2026-11-20, still drops it.** Checked on RD-26's form only, in a scratch install. No upstream report was found.

## Method

- **The `@trait` compile isn't on this branch.** The implementer is writing it. The probe has a stand-in ([`decorators.ts`](probes/decorators.ts), `desugar`), which rewrites `@trait` and `@attributes(T)` back into today's `static { trait(this); attributes(this, T); }`. The current plugin then compiles that, through the plugin's own `lowerAttributes` and `flattenModule` ([`build.ts`](probes/build.ts)).
- **The stand-in compiles exactly as today.** On today's source, the `standin` build matches the `real` one in every `.js` and `.d.ts`.
- **The migration** ([`migrate.ts`](probes/migrate.ts), then `oxfmt`) moves all 16 trait classes to RD-26's form, `@trait` and `@attributes(T)` below the JSDoc. Its `--after-export` option writes `export @trait class` instead.
- **Each mode builds `@ydinjs/core` and `@ydinjs/material-x`** with each package's own `tsdown.config.ts`. Only its plugins, its `outDir` and its `exports` and `publint` steps change.
- **The comparison** is against `real`, today's source with today's plugins. It checks:
  - every `.js` and `.d.ts`, byte for byte;
  - whether every doc in the 10 trait `.d.ts` files is present;
  - the source maps of the 18 trait modules ([`maps.ts`](probes/maps.ts)). Each map's `sourcesContent` must be the file on disk. Each trait getter must map to its `accessor` line and the class to its `class` line. Each map is also compared byte for byte with `control`'s.
- **Two failures appear in every build, `real` included:** a component's flattened copy of a getter is unmapped, in `split-button`, `checkbox`, `fab` and `TextFieldCore`. They are not a result of any way.
- **To re-run**, from the worktree root after `aube exec just build`, run [`run.sh`](probes/run.sh) and [`run-placement.sh`](probes/run-placement.sh). [`way2-dts.ts`](probes/way2-dts.ts) runs on migrated sources. The transcripts are [`p47-run.txt`](checks/p47-run.txt), [`p47-placement.txt`](checks/p47-placement.txt) and [`p47-way2-dts.txt`](checks/p47-way2-dts.txt).

## Results

| Mode | Docs in the 10 `.d.ts` | `.js` vs today | `.d.ts` vs today | Trait maps |
| --- | --- | --- | --- | --- |
| `control`: the decorator compiled in a transform, as planned | 0/10 | identical | 10 files differ | the reference |
| `control-pre`: the same transform with `order: 'pre'` | 0/10 | identical | 10 files differ | identical to `control` |
| **Way 1**: decorators rewritten in a `load` hook | 10/10 | identical | identical | identical to `control` |
| **Way 2**: the whole trait transform in a `load` hook | build fails | — | — | — |
| **Way 3a**: the doc moved below the decorators in a `load` hook | 10/10 | identical | identical | identical to `control` |
| **Way 3b**: the doc re-attached in the emitted `.d.ts` | 10/10 | identical | identical | identical to `control` |
| **Form**: sources written `export @trait class`, compiled as `control` | 10/10 | identical | identical | the class maps to its `export` line |

### Way 1: the decorators rewritten before the dts plugin

- **It works,** and the `.d.ts` is today's by construction, because the emitter sees no decorator at all.
- **The order is forced by the `load` hook,** whatever the plugin's position in the array.
- **What it costs:**
  - **A second reader.** The plugin reads every candidate module itself, to find out whether it has anything to rewrite.
  - **A compile in two stages.** The decorator's compile splits around an internal form, and the analysis loader, which reads a trait from source, has to apply the first stage too. The stand-in's loader does.
  - **The internal form can't be `trait(this)`,** because `trait-decorator` rejects that call in source. It needs a form that source can't write, or state kept per module.

### Way 2: the whole trait transform before the dts plugin

- **The build fails,** with 8 errors in core and 16 in material-x: `TS9010` on `export const $brand = Symbol(…)` and `TS9017` on a component's spread `observedAttributes`.
- **The declarations change even where oxc emits them anyway** ([`p47-way2-dts.txt`](checks/p47-way2-dts.txt)):
  - the doc moves onto `export declare const $checkable: unknown`;
  - the accessors become untyped `get checked(); set checked(value);`;
  - `static [Symbol.hasInstance](o)` and an untyped `static observedAttributes` appear;
  - the generated `__mxflat_*` helpers become exports.
- **The public surface changes,** so this way is out.

### Way 3a: the comment saved and moved below the decorators

- **It works.** The `load` hook moves the comment with `magic.move`, and the maps come out byte-identical to `control`'s. The planned `@trait` compile is unchanged, as long as it removes only the decorators' text.
- **The order is forced by the `load` hook,** as in way 1.
- **It depends on the one placement where oxc keeps a doc that TypeScript drops.** That is oxc diverging from TypeScript, the same divergence that causes the defect. If oxc aligns its comment attachment with TypeScript, RD-26's form starts keeping the doc, and way 3a's moved form starts losing it. The workaround would then become the cause.

### Way 3b: the comment re-attached to the class in the emitted `.d.ts`

- **It works.** A `transform` on `.d.ts` ids reads the trait's source, finds the JSDoc in front of its decorators, and inserts it in front of `declare class Name`.
- **It doesn't need to run before anything on the source side.** Its `.d.ts` hook does need `order: 'pre'`, to run before `rolldown-plugin-dts:fake-js`, which has no order. The probe didn't run it without `order: 'pre'`.
- **It is coupled to rolldown-plugin-dts internals:**
  - how a `.d.ts` module id is named;
  - that the generated declarations pass through user transform hooks;
  - that `fake-js` has no order;
  - the text of a class's line in the emitted declarations.

  A change to any of them makes it do nothing, silently.

- **It parses every trait source a second time.** Returned as a string without a map, it also prints `SOURCEMAP_BROKEN`. The recorded run returns rolldown's magic string, which prints nothing.

### Found: the source form `export @trait class`

- **It works with no machinery at all,** and it is the only placement that oxc, TypeScript 6 and tsc 7 all keep, both in declarations and in the editor's doc.
- **How `oxfmt` prints it:**

  ```ts
  /**
   * Element trait that exposes a presence-based `checked` boolean field.
   */
  export
  @trait
  @attributes(CHECKABLE_ATTRS)
  class Checkable extends AnyElement {
    accessor checked!: boolean;
  }
  ```

- **Lint and maps.** oxlint and ESLint pass on two migrated traits. A class's position maps to its `export` line, two or three lines above `class`, which is a consequence of the layout and not a broken map.
- **What it costs:**
  - **The layout.** This is the layout that RD-26 records as "not adopted", and layout was the only reason it gave.
  - **A silent failure mode.** A trait written `@trait export class` would lose its doc without any error. The plugin would have to reject that position for an exported trait.

### The fallback: `@trait` written above the comment

**oxc keeps the doc, and TypeScript drops it,** both from tsc's declarations and from the doc the checker gives the class. The editor and anything that reads docs through TypeScript lose it, and so would the published `.d.ts` if the generator ever became tsc. TypeDoc was not run. The fallback is out.

## Recommendation

**Write an exported trait as `export @trait class`, and have the plugin accept only that position for an exported trait.** The rejection is one more row in `trait-decorator`: "`@trait` before `export` drops the class's doc from the declarations: write `export @trait class`".

- **It is the only placement every tool keeps,** so neither an oxc fix nor a switch of the declaration generator to tsc can lose the doc.
- **It adds no build step,** no `load` hook and no dependence on rolldown-plugin-dts internals. The `.js` and `.d.ts` stay byte-identical.
- **The planned compile already accepts `export @trait class`** (P45, case (h)). Adopting this narrows the accepted forms from two to one, and the plugin already knows both positions.

**If the owner rejects the layout, use way 1, not way 3a or way 3b.**

- Way 1 relies only on rolldown's contract that `load` runs before `transform`, and the emitter never sees a decorator.
- Way 3a relies on exactly the divergence between oxc and TypeScript that causes the defect.
- Way 3b relies on rolldown-plugin-dts internals and fails silently.

**Adopting either one amends RD-26,** the source-form bullets of both amendments and their "not adopted" bullet, and with it the [`@trait` plan](../trait-decorator-1/trait-decorator-plan.md) and the [`@attributes` plan](../attributes-decorator-1/attributes-decorator-plan.md). The architect makes that amendment once the owner has chosen. The proof it adds is that every published trait `.d.ts` keeps each of its docs.

## Limits

- **The stand-in is not the implementer's compile.** It recognizes `trait` and `attributes` by name, not by import. The probe measures where the declaration emitter sees the doc, not the decorator's compile.
- **Builds ran on rolldown 1.3.2 only.** rolldown 1.3.3 was checked on one case. The Vite dev path emits no declarations and was not exercised, and watch mode was not tested.
- **TypeDoc was not run.** The editor-doc column is TypeScript 6's checker API.

## Evidence

- **P47, a decorated trait's JSDoc in the published declarations** ([`probes/`](probes/); transcripts [`p47-run.txt`](checks/p47-run.txt), [`p47-placement.txt`](checks/p47-placement.txt) and [`p47-way2-dts.txt`](checks/p47-way2-dts.txt)), by the architect on 2026-11-20 at `dfd49e683`, with tsdown 0.23.7, rolldown-plugin-dts 0.30.2, rolldown 1.3.2 and 1.3.3, TypeScript 6.0.2 and tsc 7.0.2.