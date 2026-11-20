# Flattened traits against mixins: size and runtime

**The question,** from the owner, relayed by the coordinator on 2026-11-20: would `RD-26`'s traits have been better as plain mixins, `(base) => class extends base {}`? With mixins, each trait's code would ship once, not once per component that uses it, and the owner expects no runtime cost.

This record measures that question and decides nothing. `RD-26` is unchanged. Measured by the architect on `repo/trait-mixin-measure-1`, branched from `origin/main` at `162ead02b` (PR #76 merged), in slot f, with rolldown 1.3.2, tsdown 0.23.7, Vitest 5.1.0 and Playwright's pinned Chromium, Firefox and WebKit.

## Verdict: keep RD-26

Neither claim that would justify reopening `RD-26` holds:

- **Size.** Mixins save 0.2 % to 0.5 % on the whole library, Brotli. Any smaller graph pays for them: in 14 or 15 of the 18 entries, depending on the form, a page with one component is 6 to 116 B larger.
- **Runtime.** Where a call site sees one class, the two forms run alike in all three engines. Where one site sees many classes, mixins are slower: 8 % to 12 % in Chromium and 30 % to 33 % in Firefox.
- **Types.** Mixins lose `RD-26` property 4's last-wins types. They also lose a trait's private brand, and need each trait's instance type written out under `isolatedDeclarations`.

What mixins would remove, the required build step and its limits such as `RF-66`, is outside this measurement.

| Reading | Flattened (`RD-26`) | Mixin, inline | Mixin, shared helper |
| --- | --: | --: | --: |
| `complete`, Brotli | 16,949 B | 16,918 B (−31, −0.18 %) | 16,861 B (−88, −0.52 %) |
| `complete`, gzip | 19,814 B | 19,686 B (−128) | 19,564 B (−250) |
| `complete`, raw | 88,343 B | 84,503 B (−3,840) | 82,650 B (−5,693) |
| `complete` + `instanceof` on each of core's 8 traits, Brotli | 17,136 B | 17,018 B (−118) | 17,013 B (−123) |
| Single entries, Brotli: the mixin form is larger in | — | 15 of 18 (+12 to +116 B) | 14 of 18 (+6 to +90 B) |
| `get disabled`, 15 classes through one site: Chromium | 39.1 ns | +11.9 % | +8.3 % |
| the same: Firefox | 57.0 ns | +33.3 % | +29.6 % |
| the same: WebKit | 23.4 ns | +6.5 % (range crosses 0) | +8.7 % (range crosses 0) |
| `get disabled` where each site sees one class: all three engines | — | within the noise, up to +5.9 % | within the noise, up to +5.9 % |

**The owner's two claims, read against these numbers:**

1. _"Copying costs little after compression":_ it holds.
   - The whole library's copies cost 31 B to 88 B Brotli against mixins.
   - One copied member is a getter and a setter that call `operator.get`/`operator.set` with a table entry, and Brotli compresses the repetition.
   - The size row's "before" side (17,137 B) wasn't a mixin. It was the old trait factory with `RF-63`'s dead spreads, which explains why it read larger.
2. _"A shared mixin accessor goes polymorphic":_ for these accessors it doesn't.
   - The mixin's getter is one function for all 15 classes, which V8 confirms: one SharedFunctionInfo, [`sfi-chromium.txt`](checks/sfi-chromium.txt).
   - Its own inline caches stay monomorphic anyway, because a thin accessor reads only module bindings (`operator.get` and `DISABLEABLE_ATTRS.disabled`) and passes `this` on.
   - The megamorphic sites are core's `operator.getRaw`/`setRaw` (`host.getAttribute` and the rest), which both forms share. Under `RD-26` the generic call site is megamorphic too.
   - So V8 does reach the megamorphic state, in the same places for both forms ([`ic-chromium.txt`](checks/ic-chromium.txt)). The one difference that shows is in the opposite direction from what the claim predicts.

## Size

**Method** ([`probe/size.ts`](probe/size.ts)). Each row is bundled the way a consumer's bundler would, with the bundling of `size-limit-preset-rolldown`:

- rolldown, `platform: 'neutral'`, ES output, minified;
- no plugins, so none of our plugins runs in the consumer;
- gzip at level 9 and Brotli at quality 11, as `@size-limit/file` measures.

The rows:

- **`complete`** is one module that imports every runtime entry, which is size-limit's `complete` row.
- **The two `instanceof` rows** add a module that imports core's trait `X` and exports `(o) => o instanceof X`. This is the consumer without our plugin that keeps a trait class.
- **Every other row** is one entry on its own.

**The three variants:**

- **Flattened:** the packages' own build, `just build`.
- **The two mixin forms** come from [`probe/build-mixin.ts`](probe/build-mixin.ts), which runs each package's own tsdown configuration with [`probe/mixin-plugin.ts`](probe/mixin-plugin.ts) appended after the repository's plugins. The plugin reads the flattener's output and rewrites it:
  - **Each trait class** becomes `const T = (base) => class extends base { …members }`. Its `observedAttributes` concatenates the base's, its prototype is branded as `impl` brands it, and `Symbol.hasInstance` reads the brand.
  - **Each component** drops the flattener's merged statics, its copied members and its `impl` block, and extends `Tn(…T1(Base))` in list order, so the later trait still wins.
  - **`inline`** writes each mixin's brand and `Symbol.hasInstance` in the mixin itself. **`helper`** calls one shared `mixin(brand, apply)` helper added to core's `traits/composition`, which is the leanest mixin form.
  - The member text, the trait lists and their order are the flattener's own, so the forms differ only in composition.

**Witnesses:**

- With the probe plugin left out (`build-mixin.ts none`), the script reproduces the packages' own output: all 119 `.js` files are identical apart from source map comments.
- The flattened `complete` reads **16,949 B**, which is the reading in [`size.md`](../trait-migration-1/checks/size.md) at commit 7.
- The mixin builds run in the benchmark's page.
- An accessor reached the variant's own `operator.getRaw`: the benchmark checks this for each variant and fails otherwise.

**Readings:** [`checks/size.txt`](checks/size.txt) (raw, gzip and Brotli tables) and [`checks/size.json`](checks/size.json). The Brotli rows for single entries:

| Entry                               | Flattened | Inline Δ | Helper Δ |
| ----------------------------------- | --------: | -------: | -------: |
| button/button                       |     4,834 |      +58 |      +61 |
| button/icon-button                  |     5,079 |      +54 |      +67 |
| button/link-button                  |     4,798 |      +67 |      +42 |
| button/switch-button                |     5,184 |      +56 |      +60 |
| button/switch-icon-button           |     5,563 |      +86 |      +88 |
| button/split-button                 |     7,331 |      +43 |      −14 |
| button-group/button-group           |     3,110 |      +12 |       +6 |
| button-group/connected-button-group |     3,866 |      −15 |      −34 |
| checkbox/checkbox                   |     3,914 |      +98 |      +90 |
| fab/fab                             |     4,121 |      +61 |      +57 |
| icon/icon                           |       642 |        0 |        0 |
| list/list                           |     3,656 |      +27 |      +37 |
| list/list-item                      |     2,594 |      −44 |      −44 |
| list/list-button-item               |     4,542 |      +51 |      +54 |
| list/list-link-item                 |     4,754 |      +64 |      +34 |
| radio/radio                         |     3,571 |      +67 |      +75 |
| text-field/multiline-text-field     |     4,421 |     +108 |      +83 |
| text-field/text-field               |     8,099 |     +116 |      +76 |

**How to read them:**

- **Why mixins cost more in small graphs.** Each mixin pays for its wrapper, its brand install and its own `observedAttributes` concatenation. A graph that uses a trait once gains nothing from sharing it.
- **`list/list-item`'s −44 B isn't a mixin effect.** ListItem's trait list is empty, and the flattener still emits `static { impl(this); }`, which imports `impl`. The mixin form has nothing to apply and drops it. This is an observation, not a finding registered here.
- **The `instanceof` rows.** A consumer without our plugin that tests `instanceof Disableable` keeps the trait class with its members beside the copies: +40 B Brotli over `complete`. Testing all 8 of core's traits adds +187 B. Mixins always keep the trait, so `instanceof` adds only the import: +25 and +100 B (inline), +40 and +152 B (helper).

## Runtime

**Method** ([`bench/`](bench/), run by [`probe/run-bench.sh`](probe/run-bench.sh)). The benchmark runs in Vitest browser mode with Playwright's pinned Chromium, Firefox and WebKit, the repository's browser tooling. Each engine ran 5 times, each run in a fresh browser.

**One page holds all three variants.**

- Each variant's material-x modules get their own tag prefix (`mxf-`, `mxi-`, `mxh-`).
- Each sample round times every variant once, in an order that rotates each round, so changes in the machine's load reach all three alike. The machine is shared with other sessions, and a first design, one run per variant, varied by up to ±100 % between runs.
- The table gives each mixin form's difference from flattened: the median, over runs, of the ratio of the two medians within one run, with the range of those ratios.

**The elements:**

- **15 shapes:** the 15 component classes that have the `disabled` trait accessor, with 16 elements of each.
- V8 confirms that every class's instances share one map and that the 15 maps are distinct, in all three variants (`%HaveSameMap`).

**The workloads** each use call sites of their own, made with `new Function`:

- **one class:** one site reads 240 buttons;
- **a site per class:** the way a component's own code reads its own accessor;
- **one site:** a single site reads all 240 elements, interleaved, the way a consumer's generic code does;
- **the same three for `set`:** each write changes the attribute, so `attributeChangedCallback` runs;
- **`create`:** `document.createElement` for each class.

**Timer resolution:** a sample is at least 25 ms. Firefox's timer is coarse, which is why its medians often read exactly `+0.0 %`.

Readings: [`checks/bench-summary.txt`](checks/bench-summary.txt) and [`checks/bench.jsonl`](checks/bench.jsonl), with every sample.

| Workload | Chromium flattened | inline | helper | Firefox flattened | inline | helper | WebKit flattened | inline | helper |
| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| get, 1 class | 17.4 ns | +0.6 % | −0.9 % | 28.5 ns | 0.0 % | 0.0 % | 20.3 ns | −4.1 % | −2.7 % |
| get, a site per class | 18.0 ns | +2.3 % | +1.1 % | 44.8 ns | 0.0 % | 0.0 % | 18.3 ns | +5.9 % | +5.9 % |
| get, one site, 15 classes | 39.1 ns | **+11.9 %** | **+8.3 %** | 57.0 ns | **+33.3 %** | **+29.6 %** | 23.4 ns | +6.5 % | +8.7 % |
| set, 1 class | 1,260 ns | −3.9 % | −2.2 % | 2,669 ns | 0.0 % | +2.4 % | 1,563 ns | +2.0 % | 0.0 % |
| set, a site per class | 1,445 ns | −0.2 % | −0.9 % | 2,930 ns | +7.1 % | 0.0 % | 1,563 ns | −4.2 % | 0.0 % |
| set, one site, 15 classes | 1,673 ns | +5.0 % | +1.2 % | 3,385 ns | 0.0 % | 0.0 % | 1,953 ns | 0.0 % | 0.0 % |
| create, 15 classes | 16.6 µs | +15.7 % | +0.7 % | 36.5 µs | +4.3 % | −2.9 % | 22.9 µs | +2.4 % | +2.4 % |

**Which differences the runs resolve:**

- **Through one site with 15 classes, `get` is slower with mixins** in every Chromium run (+5.5 % to +17.5 %) and every Firefox run (+28.6 % to +38.5 %). WebKit's runs cross zero.
- **Everything else is inside the spread between runs.** A write costs 1.3 to 3.4 µs, and creating an element 17 to 36 µs, almost all of it in the component's own code, which hides any difference in the accessor.
- **The cause of the slower generic site isn't isolated.** It is consistent with depth: flattened, `disabled` sits on the class's own prototype, or one up for the two text fields; with mixins it sits two to five prototypes up.

**V8's inline caches** ([`checks/ic-chromium.txt`](checks/ic-chromium.txt), from `--log-ic --log-code`, read by [`probe/ic-log.ts`](probe/ic-log.ts)):

| Site | Flattened | Mixin, both forms |
| --- | --- | --- |
| A site that sees one class (`site-*-get-1-class`, `site-*-get-<component>`) | monomorphic | monomorphic |
| The site that sees 15 classes (`site-*-get-one-site`, `site-*-set-one-site`) | megamorphic, 15 and 16 maps | megamorphic, 15 and 16 maps |
| The accessor's own loads, `operator.get` and `DISABLEABLE_ATTRS.disabled` | monomorphic, in each of the 15 copies | monomorphic, in the one shared getter |
| `operator.getRaw`'s `host.getAttribute` | megamorphic, 15 maps | megamorphic, 15 maps |
| `operator.setRaw`'s `setAttribute` and `removeAttribute` | megamorphic | megamorphic |

## What the mixin form brings back that RD-26 removed

The probe is [`probe/types/`](probe/types/), with TypeScript 7.0.2 and 6.0.3 and the trait probes' options. The transcript is [`checks/types.txt`](checks/types.txt).

- **Last-wins types are lost.** A mixin's instance type is an intersection, so a key that two traits declare takes both types. Under `Wide(Narrow(Base))`, `color` is `'a' | null`, and `'b'` fails with TS2322 although the runtime accepts it. That contradicts `RD-26` property 4: _"The types agree"_.
- **A trait's instance type must be written out under `isolatedDeclarations`.** An exported mixin with no return annotation fails: TS9007 in 6.0.3, TS9039 in 7.0.2. So each trait states its members twice, which is the boilerplate of the forms that `RD-26`'s _Not adopted_ rejects (the study's forms A and B).
- **A private member can't be declared.** A `private` or `#` member in an exported mixin fails declaration emit with TS4094, with `isolatedDeclarations` on or off. So a nominal trait such as FocusForwarding, whose type is made nominal by `#brand!: true` (`RD-26`, _the owner's earlier answers_), has no mixin form.
- **Statics merge by hand.** Each mixin writes its own `[...(base.observedAttributes ?? []), …]`, where `RD-26` property 3 merges every static by the kind its declaration states.

**Not brought back:**

- **`RF-57`'s hidden override.** A class-expression mixin keeps each member's kind: a field over a mixin's accessor is TS2610, and an accessor over its field is TS2611.
- **TS2425.** It came from the `Omit` that `RD-26`'s trimmed traits use, and a method override through a mixin chain checks clean.

## Limits

- **These mixins are generated, not written by hand.** A hand-written library might inline `observedAttributes` literals or brand differently. The `helper` form bounds what sharing can save, and it saves 88 B on `complete`.
- **The trait accessors are layer (b)'s thin getters and setters.** A trait whose members read `this`'s own properties is the case where shared feedback would matter, and no trait in the repository has one. FocusForwarding's `focus()` reads a `WeakMap`, and the element it focuses varies by component.
- **Only V8's inline-cache states were read.** SpiderMonkey's and JavaScriptCore's appear only in the timings.
- **The application build with our plugin** (property 8 deletes trait members) **wasn't measured.** It can only make the flattened `instanceof` rows smaller.

## Reproduce

From the repository root, after `aube install` and `just build`:

```sh
node .plan/trait-mixin-measure-1/probe/build-mixin.ts inline helper none
node .plan/trait-mixin-measure-1/probe/size.ts            # size.txt; --json for size.json
.plan/trait-mixin-measure-1/probe/run-bench.sh            # bench.jsonl, sfi-chromium.txt, ic-chromium.txt
node .plan/trait-mixin-measure-1/probe/summarize.ts       # bench-summary.txt
.plan/trait-mixin-measure-1/probe/types/run-types.sh      # types.txt
```

The mixin builds go to `.build/`, which is ignored.