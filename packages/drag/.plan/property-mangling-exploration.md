# Property mangling: exploration

**Question:** which property names survive minification, what the library's own internal names cost per row, and whether a tool could shorten them without renaming source (CONTRIBUTING §11). **Base:** `b0287f1ae` on `drag/size`, whose `packages/drag/src` is `237d65d2f`'s. **Scope:** analysis and probes only. No production source, build configuration or instrument changes, and the budgets are unchanged. Explored by the architect on 2026-11-12, during P4 ([`performance-plan.md`](performance-plan.md) §2).

**Outcome.** The library's internal property names that the minifier keeps take about 950 B of a 28,664 B minified bundle of every entry. Shortening them by name takes **30 to 66 B Brotli off the rows without `sortable`, and 103 to 119 B off the three `sortable` rows.** That is more than P4's machinery has taken. **But neither the tests nor the size gate can see the published build**, and the first runtime check found a break that type analysis had missed. Delivering it is a build and instrument change, so it goes to the owner as `DRO-15`.

**This corrects the opening assessment.** [`size-pass-assessment.md`](size-pass-assessment.md) §2 says that the surviving property names are DOM names and published members. That was read from a ranking of names, not a classification, and it is wrong: 30 internal names survive in the bundle.

## 1. Method

The probes are in [`probes/property-mangling/`](probes/property-mangling/), and the readings in [`2026-11-12-property-mangling-readings.txt`](measurements/2026-11-12-property-mangling-readings.txt) with the JSON in [`2026-11-12-property-mangling-json/`](measurements/2026-11-12-property-mangling-json/).

- **The tool.** Rolldown 1.2.15's minifier mangles properties whose names match a regular expression, with a reserved list and a name cache. In a bundle it needs one output chunk. `rolldown/utils`' `minifySync` does the same to one module and returns the updated cache, so modules processed in turn with one cache agree on every name.
- **Every name in the bundle** (`inventory.ts`): one minified bundle of all thirteen published entries, parsed, with each non-computed member access and each object, class or method key counted.
- **Published names** (`published.ts`): the type checker walks every export of every entry in `package.json`'s exports map, through properties, signatures, unions, intersections, type arguments and base types. Platform interfaces end the walk. A second walk treats `AxisInstaller` and `DisplacementInstaller` as opaque, because `DRD-39` keeps them unpublished.
- **Eligible names** (`ownership.ts`): the type checker resolves every property-name use site in `src`. A name is eligible when:
  - every use resolves to a declaration in this package's `src`, none to the platform or a dependency, and none to nothing;
  - it isn't published;
  - at least one declaration is a value, a class member or an object literal's property. `RectIndex`'s `ReadonlyFloat64Array` declares `slice`, which runs on a real `Float64Array`;
  - no module exports it, because a namespace import reads exports as properties, as `Callbacks.queue()` does;
  - the platform doesn't call it by name. `addEventListener(type, this)` makes the browser call `handleEvent`.
- **Two paths, measured on every row of `bench/size/measure.ts`** with `DRD-51` property 1's settings:
  - **in the row's bundle** (`size-mangle.ts`): `minify: { mangleProps }` on the consumer's build. This is the upper bound, and it is what a consumer would have to configure;
  - **at publish** (`publish.ts`): every entry built as unbundled modules, as `tsdown --unbundle` builds them, then each module passed through `minifySync` with only `mangleProps` and one shared cache. Each row is then bundled from those modules with the gate's ordinary `minify: true`. This is what a consumer would receive.
- **The runtime check:** the Chromium `browser` and `shipped` projects, 363 tests, run against the published-path modules through a scratch config that resolves every `src` import to a built tree (`vitest.tree.config.ts.txt`). The unmangled tree is the control. A test that fails on the mangled tree only is either a white-box test that names an internal member, or a break.

## 2. Where the names are

In the bundle of every entry, 28,664 B minified, property names take 8,653 B:

| Class | Names | Minified bytes | Examples |
| --- | --: | --: | --- |
| Used on a platform object at least once, or a platform member that the library doesn't declare | 180 | 5,482 | `getBoundingClientRect`, `ownerDocument`, `placeholder`, `item` |
| Published: reachable from a published type | 53 | 1,772 | `invalidate`, `requestStep`, `landing`, `onDrop` |
| Reachable only through the unpublished installer types | 10 | 452 | `insertion`, `snapshot`, `retire`, `moved` |
| **Internal and eligible** | **30** | **947** | `config` 26 times, `enter` 12, `raise` 10, `first` 9, `root` 8 |

The classes partition the 8,653 B. A library name that the code also uses once on a platform object, such as `placeholder` or `translate`, can't be mangled by name, and is counted in the first class.

Seventeen of the 30 eligible names are also platform member names, such as `collect`, `first`, `measure`, `root` and `window`. A list of platform names would exclude them. The use-site analysis keeps them, because this package never uses them on a platform object.

**One eligible name was wrong:** `zIndex`. `shared/landing.ts` builds a keyframe as an object literal in a `const` and passes it to `visual.animate()`. The literal has no contextual type, so every declaration the checker sees is the library's own, and the browser reads the key by name. Mangled, the landing's elevation is lost, and four `DRI-13` landing tests fail. The type-based rule doesn't see a value flowing into a platform API. **The runtime check found it, and the readings below leave `zIndex` out.**

## 3. Readings

Brotli-11 bytes against each path's own base. Minified and gzip-9 figures are in the readings file, and no row disagrees in sign.

| Row | Over its ceiling now | In the row's bundle, tier 1 | At publish, tier 1 | At publish, tier 2 |
| --- | --: | --: | --: | --: |
| draggable alone | +57 | −40 | −35 | −32 |
| draggable + lift | — | −37 | −38 | −27 |
| example: resize handle | +8 | −60 | −54 | −53 |
| example: drop zone | +172 | −51 | −45 | −28 |
| example: canvas group | — | −44 | −30 | −32 |
| freeDrag | +56 | −67 | −66 | −57 |
| freeDrag + bounds + landing | +249 | −63 | −65 | −57 |
| sortable + y | — | −94 | −106 | −140 |
| sortable + xy | — | −111 | −103 | −139 |
| complete | +219 | −107 | −119 | −156 |

Tier 1 is the 29 eligible names in the bundle without `zIndex`. Tier 2 adds the 10 names reachable only through the installer types.

- **At publish, tier 1 delivers about what the consumer's own mangle would.** Each module keeps its names readable to the consumer's minifier, which then shortens identifiers as usual.
- **Tier 2 pays only on the `sortable` rows,** 34 to 37 B more than tier 1. On six of the seven other rows it takes 1 to 17 B less than tier 1, and on "example: canvas group" 2 B more. Why isn't established. The shared cache assigns the short output names across all modules, which is one candidate.
- **On these readings, "freeDrag" and "example: resize handle" would fall below their ceilings,** if the gate measured the published build. No other red row would.
- **The gate reads `src`, not the published build.** Bundled from the unbundled modules without mangling, the rows differ from the gate's figures by −7 to +16 B Brotli: +5 B on "freeDrag", +16 B on "freeDrag + bounds + landing" and −7 B on the two `sortable` rows. The gate already measures something slightly different from what a consumer installs.

## 4. The runtime check

| Tree                     | Passed | Failed |
| ------------------------ | -----: | -----: |
| Unmangled, the control   |    358 |      5 |
| Mangled with `zIndex`    |    347 |     16 |
| Mangled without `zIndex` |    351 |     12 |

The control's five failures are the built tree's, not mangling's. Two heap-sampling tests filter by `/src/` in the module URL. Three read development-only instruments that `__DEV__` folds away: two read the refusal counter, and one is `DRD-52`'s witness. That the witness fails also shows that the tests ran against the tree. With `zIndex`, the mangled tree failed eleven more: the four landing tests above, and seven `callback-list` tests that call a list's internal `run`, `add` and `empty` directly. The second group is white-box and expected.

### 4.1 Without `zIndex`

**Only the seven white-box `callback-list` tests fail beyond the control.** Every landing test passes, and no test passes on the mangled tree that fails on the control. The test tree also mangled `slice` in the development check, which the all-entries build keeps as an export. No test calls it there, because `__DEV__` is false, and §1's rules now exclude `slice`. Both runs went through `bench/campaign.ts`.

## 5. What delivery would need

Shortening the names takes no runtime work: a shorter property name is the same property access (§0, §14). What it needs is build and instrument work:

1. **A test project that runs the suite against the published build.** Today every test and the gate read `src`, so nothing checks what a consumer installs. The `zIndex` break shows that the type-based rule alone isn't enough. This project is worth having without the mangle, because the published build already differs from `src` (§3).
2. **The gate measures the published build.** That is an instrument change under `DRD-23`, and it moves every figure by −7 to +16 B before any mangle. `DRO-4`'s re-base would then be against those figures.
3. **The publish step.** A `tsdown` plugin or a step after the build passes each module through `minifySync` with only `mangleProps` and one cache. Rolldown's own `mangleProps` can't run on the unbundled build, which has many chunks. The step needs:
   - the eligible names computed by the type checker with §1's rules, and a test that fails when that set changes, so that every new name is reviewed;
   - the cache committed, so a build is reproducible;
   - the source maps chained through the step;
   - published modules whose internal member names are short letters. A stack trace shows them, and a reader of `node_modules` sees them.
4. **Tier 2 is not recommended.** Its names are reachable through `DRD-39`'s unpublished installer types. Mangling them makes those types' member names a build detail, so publishing the installers later would change the build. It also costs the rows without `sortable` bytes.

**What CONTRIBUTING says.** §11: "Let the minifier handle identifier shortening." A tool that shortens internal names fits that, and no source changes for it. Part I's priorities already rely on `#private` names being mangled in production builds. A publish step extends that to internal names that cross a module, which `#` can't reach. §17 applies to the trade-off: the published modules get harder to read, and the build gets a failure class that the `src` tests can't see.

## 6. Recommendation

**Owner decision `DRO-15`.** The architect recommends taking tier 1, as three steps in this order, each a unit with its own handoff:

1. the suite against the published build, which is worth having on its own;
2. the gate on the published build, with the injection `DRD-23` requires, before any re-base;
3. the publish step with tier 1.

The alternative is to record the measured gain and take nothing. The red rows that tier 1 doesn't close, "draggable alone", "example: drop zone", "freeDrag + bounds + landing" and "complete", stay `DRO-4`'s either way.

## 7. Limits

- **One toolchain:** Rolldown 1.2.15 and its minifier. The publish path is emulated with Rolldown's `preserveModules`, not with `tsdown` and the repository's library plugins. A real build may differ by a few bytes.
- **One engine** for the runtime check: Chromium, in two projects. The node and declaration projects didn't run against the tree.
- **The runtime check covers what the suite exercises.** A key that reaches a platform API on a path no test takes would break silently. That risk is the reason for step 1, and for reviewing every new eligible name.
- **Consumer code isn't analyzed.** At publish, only the library's modules change. A consumer that reads an internal member through a cast would break, and the contract doesn't promise those members.