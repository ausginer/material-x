# Mangle selection audit

**Question:** which internal property declarations in `src` does the publish mangle leave unprefixed, although `DRD-56` property 1 admits them? **Base:** `436b105c6` on `drag/size`, whose `packages/drag/src`, `build/` and tests are `31f92f5a9`'s. Line numbers below are at that base. **Scope:** analysis only. No production code changes, and nothing ran in a browser. The architect audited the selection on 2026-11-13 at the owner's request. **Governing records:** `drag:DRD-56` properties 1 and 2, and `DRO-15` step 3. **Decided here:** `DRD-57` in [`00-index.md`](00-index.md). **Next:** [`mangle-selection-handoff.md`](mangle-selection-handoff.md).

**Outcome:**

- **The 29 names missed 30 internal declarations.** Each one shares its name with a platform member or a published member. The exploration counted a name as eligible only when every use of that name resolved to this package. With a `_` prefix, the build renames one declaration and leaves every other declaration with the same name alone, so that rule no longer applies (§1).
- **The revised selection adds those 30 declarations under 24 new names,** so the map grows from 29 keys to 53 (§3). Every one of them is a member of a class, an interface or an object that only this package creates and reads.
- **Every other declaration stays unprefixed,** for a reason that §4 states: a `.d.ts` declares it, it implements a published member, the platform reads it, a test reads it through a global, or its name is one character long.
- **The installer members stay outside the extension.** That includes every member of `InsertionGeometry`, `DisplacementSink`, `AxisQuery`, `AxisContext`, `CollectionSnapshot` and `Insertion`, and of the objects that implement them. `LinearShift` and `RectIndex` have members named `moved`, `invalidate` and `retire`. Those are other declarations, and they are selected (§5).
- **Expected effect:** about 128 occurrences in the emitted modules, about 600 characters before compression across the whole publication. This is an estimate. The gate's reading is the booked figure (§6).

## 1. Why the starting set missed these declarations

`DRD-56` property 2 took its starting set from the exploration's tier 1. The exploration's eligibility rule ([exploration](property-mangling-exploration.md) §1) was a rule about **names**: a name was eligible only when every use of it, anywhere in `src`, resolved to a declaration in this package's `src`, and no use resolved to the platform or to a published type. That was necessary for a mangle by name, because Rolldown's `mangleProps` renames every occurrence of a name.

`DRD-56` changed the mechanism. The type checker's rename prefixes one declaration and its uses, and the build renames only names that carry the prefix. A name can now be renamed on one declaration and kept on another. But the starting set still came from the rule about names, so every internal declaration whose name the platform or a published type also uses was left out.

`RectIndex.values` is the case the owner found. `Map.values()` and `Float64Array.values()` are platform members, so `values` failed the name rule, although `RectIndex`'s getter is internal. The audit finds the same cause behind every addition:

| Name | Also a member of | So the name rule excluded |
| --- | --- | --- |
| `values` | `Map`, `Float64Array` (platform) | `RectIndex.values` |
| `cancel` | `Animation` (platform) | `FrameTask.cancel` |
| `add`, `has`, `clear` | `WeakSet`, `Set`, `Map` (platform) | the callback `List`'s methods |
| `left`, `top`, `right`, `bottom` | `DOMRectReadOnly` (platform) | the box that `bounds()` keeps |
| `duration`, `easing` | `LandingOptions` (published), animation options (platform) | `NamedLanding`'s fields |
| `axis`, `bounds`, `landing`, `displacement` | `FreeDragConfig`, `SortableConfig` (published) | the behaviors' fields |
| `visual`, `box` | `Lift`, `PlaceholderContext` (published) | `PressState`'s fields |
| `translate` | `Lift` (published) | `FreeDragOperation.translate` |
| `moveTo`, `invalidate` | `FreeDragController`, `SortableController` (published) | `FreeDragOperation.moveTo`, `SortableBehavior.invalidate` |
| `items`, `end` | `CollectionSnapshot`, `BehaviorOperation` (published) | `RectIndex`'s getters |
| `invalidate`, `retire`, `moved` | `InsertionGeometry`, `DisplacementSink` (published installer types) | `RectIndex`'s and `LinearShift`'s members |

## 2. Method

**Discovery** used [`2026-11-13-mangle-audit.ts.txt`](measurements/2026-11-13-mangle-audit.ts.txt), a language-service probe, with its output in [`2026-11-13-mangle-audit.txt`](measurements/2026-11-13-mangle-audit.txt), and the one-line summary per group in [`2026-11-13-mangle-audit-summary.tsv.txt`](measurements/2026-11-13-mangle-audit-summary.tsv.txt), made by [`2026-11-13-mangle-audit-summary.mjs.txt`](measurements/2026-11-13-mangle-audit-summary.mjs.txt). Two runs gave the same output. The probe:

- lists every property declaration in `src` that isn't `#private`, isn't already `_`-prefixed, and isn't in a `*.stories.tsx` file: class fields, methods and accessors, interface and type-literal members, and object-literal keys;
- groups an object-literal key with the member that its contextual type declares, so that an object which implements an interface is one group with it;
- marks a group whose declaration an emitted `.d.ts` file also declares, matched by module, container and member name, against the 27 declaration files in the built tree at the base;
- marks a key whose literal has no contextual type from `src`, because where that literal goes has to be read;
- lists every reference that the language service finds, in `src`, `tests`, `bench` and the allocation probe.

It found 312 groups: 174 that a `.d.ts` declares, and 138 that none declares.

**No tool chose a declaration** (`DRD-56` property 2). Each of the 138 groups was decided by reading its declaration and its use sites against `DRD-56` property 1. The probe proves nothing on its own. A name that it marks as declared by a `.d.ts` stays unprefixed under property 1 in any case, so a false mark can only leave a declaration out.

**Name-dependent reads.** `src` has no `Object.keys`, `Object.entries`, `Object.assign`, `for … in`, `in` test with a string, `Reflect`, `JSON` call or string-keyed access, apart from indexed types and `__dragRefused`. `tests` and `bench` name a selected member as text only in `bench/compare.ts` line 1180, the replacement text of the "one entry on the step list per frame" injection: `this.#steps.add(step, receiver);`.

## 3. The revised selection

Each row is a declaration, not a name. Uses are the references in `src` that the language service found, at the base.

| Declaration | Declared by | Uses in `src` | Tests and others | Why it is internal |
| --- | --- | --- | --- | --- |
| `values` (getter) | `RectIndex`, `sortable/rect-index.ts:112` | `rect-index.ts` 328, 347; `xy.ts` 74, 141, 162; `linear-shift.ts` 169, 236; `y.ts` 57 | none | `RectIndex` is created by each axis rule for itself and is in no `.d.ts`. The getter returns a real `Float64Array`, and `slice` and `length` on it stay |
| `items` (getter) | `RectIndex`, `rect-index.ts:120` | `rect-index.ts` 336, 349; `xy.ts` 77, 162; `linear-shift.ts` 221, 244; `y.ts` 82 | none | As above. The array it returns is spread and indexed, not read by name |
| `end` (getter) | `RectIndex`, `rect-index.ts:133` | `rect-index.ts` 327; `xy.ts` 39; `linear-shift.ts` 175 to 184; `y.ts` 57 | none | As above |
| `invalidate()` | `RectIndex`, `rect-index.ts:290` | `rect-index.ts` 338; `xy.ts` 54, 148; `linear-shift.ts` 210, 263 | none | As above |
| `retire()` | `RectIndex`, `rect-index.ts:298` | `xy.ts` 178; `linear-shift.ts` 272 | none | As above |
| `moved`, `invalidate`, `retire` | `LinearShift`, `sortable/linear-shift.ts:71`, `73`, `75`, and the object that `linearShift()` returns (196, 259, 266) | `y.ts` 103, 86, 98, 107 | none | `LinearShift` is in no `.d.ts`. `y()`'s installer calls it, and the object `y()` returns is a different object, whose `InsertionGeometry` members stay. `_refresh` on the same interface is already prefixed |
| `has()`, `add()`, `clear()` | the callback `List`, `kernel/callbacks.ts:43`, `60`, `77` | `kernel/gesture.ts` 285, 286, 328, 419; `kernel/session.ts` 202 | `tests/callback-list.browser.test.ts`: `add` at 14 places, `has` at 4 (62 to 66), `clear` at 169; the allocation probe, line 50; `bench/compare.ts` 1180 | No module exports `List`'s members, and no entry publishes `List`. `_empty` and `_run` on the same class are already prefixed. The `WeakSet`s `admitted` and `countedRefusals` in `gesture.ts` keep `has` and `add` |
| `cancel()` | `FrameTask`, `shared/invalidation.ts:17`, and the object that `createFrameTask()` returns (34) | `free-drag/drop-targets.ts` 113, 126; `sortable/operation.ts` 106; `sortable/behavior.ts` 205 | none | `FrameTask` is in no `.d.ts`, and the platform calls only the closure `fire`. `_schedule` on the same interface is already prefixed. `Animation.cancel()` calls in `shared/landing.ts` and `sortable/layout-animation.ts` stay |
| `axis`, `bounds`, `landing` (fields) | `FreeDragBehavior`, `free-drag/behavior.ts:66`, `67`, `68` | `free-drag/behavior.ts` 77 to 79, 116, 126; `free-drag/operation.ts` 57, 137, 143, 155, 157, 161 | none | As for `_root`, `_config` and `_window` on the same class. The kernel reads only `Behavior`'s members. The objects these fields hold are published types, whose members stay |
| `axis`, `displacement`, `landing`, `invalidate` (fields) | `SortableBehavior`, `sortable/behavior.ts:97`, `98`, `99`, `124` | `sortable/behavior.ts` 117 to 119, 207, 209, 224, 229; `sortable/operation.ts` 109, 113, 142, 146, 175, 183, 199, 203; `sortable.ts` 67 | none | As for `_config`. `invalidate` is the step that `sortable.ts` passes to `requestStep` as a function value. The controller's own `invalidate` key stays |
| `translate()`, `moveTo()` | `FreeDragOperation`, `free-drag/operation.ts:62`, `68` | `free-drag/operation.ts` 73, 81; `free-drag/behavior.ts` 130; `free-drag.ts` 72 | none | `BehaviorOperation` doesn't declare them, and no `.d.ts` names the class. The platform calls only `handleEvent`. `Lift.translate` and `FreeDragController.moveTo` stay |
| `duration`, `easing`, `landing` | `NamedLanding`, `lift.ts:59`, `60`, `61`, and the record at 303 | `lift.ts` 306 to 308, 319, 324, 325 | none | The record lives in the lift's closure and is read only there. Its values are passed to `Landing.start` as arguments, not as an object |
| `visual`, `box` | `PressState`, `sortable/behavior.ts:66`, `68`, and the literal at 279 | `sortable/behavior.ts` 145, 280, 281 | none | As for `_direction` on the same type. The kernel passes an admission's `state` back to `activate` as an opaque value |
| `left`, `top`, `right`, `bottom` | the box that `bounds()` keeps, `free-drag/bounds.ts:23` | `bounds.ts` 38 to 41, 56 to 59, 71, 72, 75, 76 | none | The object never leaves the closure. It copies a `DOMRectReadOnly`, whose `left` to `bottom` stay, and `apply` reads it beside `originRect`, whose members stay too |

**Two shorthand keys change form,** as `_direction: direction` did in `DRD-56`'s unit: `landing` in `lift.ts` 308 becomes `_landing: landing`, and `visual` in `sortable/behavior.ts` 280 becomes `_visual: visual`.

**Comments that name a selected member in code font follow the rename:** the `RectIndex` class comment at `rect-index.ts` 74 and 75 names `values` and `items`, and the `List` class comment at `callbacks.ts` 24 and 25 names `has` and `add`.

## 4. What stays unprefixed, and why

The 138 groups that no `.d.ts` declares, apart from the 30 declarations in §3, and the 174 groups that a `.d.ts` declares:

| Class | Declarations | Reason (`DRD-56` property 1) |
| --- | --- | --- |
| **A `.d.ts` declares it** | 174 groups, among them every member of `Drag`, `Lift`, `Behavior`, `BehaviorOperation`, the configs, the results and outcomes, the controllers, `DragGeometry`, `FreeDragRequest`, `DropTargetTracker`, `MotionConstraint`, `Landing`, `LandingTimingContext`, `Lifter`, and the installer types (§5) | Published. That includes object literals that the type checker groups with a published member, such as the `Drag` that `kernel/session.ts` builds at 187 |
| **It implements a published member** | `threshold`, `admit`, `command`, `activate` on `FreeDragBehavior` and `SortableBehavior` (`Behavior`); `start`, `move`, `drop`, `settle`, `end` on both operations (`BehaviorOperation`); `requestStep`, `requestCancel`, `requestDestroy`, `use` on `Gesture` (`DraggableController`) | The kernel or the consumer calls it through the published interface |
| **A literal of a published type that the probe couldn't link** | the outcome and result literals in `kernel/session.ts` 274 and 488, `free-drag/operation.ts` 119 to 133 and `sortable/operation.ts` 211 to 234 (`type`, `reason`, `request`, `origin`, `value`); the admissions in `free-drag/behavior.ts` 100 and `sortable/behavior.ts` 276 (`item`, `handle`, `state`); `accept` and `reject` in both `domain.ts` files | Each is read as its published type: a union member, an `Admission`, or a module export that a consumer calls, which `free-drag/domain.d.ts` and `sortable/domain.d.ts` declare |
| **The platform reads it** | `handleEvent` on `Gesture`, `Session` and `FreeDragOperation`; listener options `capture`, `passive`, `signal`; `preventScroll`; the `Error` option `cause`; the keyframes and animation options in `shared/landing.ts` and `sortable/layout-animation.ts` (`translate`, `zIndex`, `position`, `composite`, `duration`, `easing`); `length` and `slice` on `ReadonlyFloat64Array`, a type over a real `Float64Array` | The platform reads the name, or calls it on a platform object |
| **Tests read it through a global** | `trusted`, `untrusted`, the refusal count in `kernel/gesture.ts` 102 to 104 | Property 1, as in `DRD-56` |
| **Its name is one character** | `x`, `y` on `NamedLanding` (`lift.ts` 57, 58) and on `Displacement` (`lift.ts` 221, 278); `x`, `y` on `FreeDragOperation`'s `#motion`, which `MotionConstraint.apply` also receives | The build can't make the name shorter, so the prefix would only add the rename's risk. `DRD-57` property 3 |
| **Not in the publication** | every declaration in `*.stories.tsx` | Storybook source. No entry imports it |

## 5. The installer members

The owner kept the installer members out of `DRD-56` (exploration's tier 2: `confirm`, `index`, `insertion`, `moved`, `report`, `resolve`, `retire`, `snapshot`, `space`, `version`). They stay out. The exclusion is now stated by declaration, as the rest of the selection is:

- **Unchanged:** every member of `InsertionGeometry`, `DisplacementSink`, `AxisQuery`, `AxisContext`, `CollectionSnapshot` and `Insertion`, and every key of an object that implements one of them: the geometry objects that `y()` and `xy()` return, the sink that `layoutAnimation()` returns, and the `AxisContext` and `AxisQuery` literals in `sortable/behavior.ts` and `sortable/operation.ts`. `sortable/axis.d.ts` and `sortable/domain.d.ts` declare all of them, so property 1 keeps them in any case.
- **Selected:** `LinearShift.moved`, `LinearShift.invalidate`, `LinearShift.retire`, `RectIndex.invalidate` and `RectIndex.retire`. They have the installer members' names, but they are members of internal types that no `.d.ts` declares. The installer's methods call them. Renaming them doesn't change any installer type's member name, which was the reason for keeping tier 2 out: publishing the installers later still wouldn't change the build.

## 6. Expected effect

**Estimated from the source,** not measured: the selected declarations have about 128 occurrences that the emitted modules keep, which are declarations that aren't type-only plus their uses. Each occurrence becomes a short output name, so the total is about 600 characters before compression, across every module. `DRD-56`'s first selection replaced 145 names in the emitted modules and took −221 to −599 B minified and −31 to −110 B Brotli per row. The rows that contain `sortable` hold most of the new declarations: `RectIndex`, `LinearShift`, `SortableBehavior` and `PressState`.

`DRD-51` property 1 books only the gate's reading of the published build. Budgets are unchanged, and a verdict that changes goes to `DRO-4`.

## 7. Limits

- **The probe's `.d.ts` match is by module, container and member name.** It can only add exclusions. Every exclusion that §4 doesn't attribute to a `.d.ts` was read in the code.
- **The probe doesn't follow values across calls.** The `zIndex` case of the exploration was a literal passed to a platform API. Every key in the 80 groups whose literal has no contextual type from `src` was read, and §4 names each class.
- **Consumer code isn't analyzed.** A consumer who reads an internal member through a cast breaks, as under `DRD-56`. The contract doesn't promise those members.