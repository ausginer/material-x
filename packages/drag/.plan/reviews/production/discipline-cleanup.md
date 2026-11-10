# Production `@ydinjs/drag`: discipline pass (cleanup)

**Commit read:** `d7e7b0d3ac21800e12efb0c023aef1b11dc5756d` on `drag/production` (range `a1d31e0d2..d7e7b0d3a`).

## Scope

**Covered (read in full):** every file under `packages/drag/src` except the stories: `draggable.ts`, `lift.ts`, `fault.ts`, `globals.d.ts`, `sortable.ts`, `free-drag.ts`, `shared/*`, `sortable/*`, `free-drag/*`. Checked against `CONTRIBUTING.md` (Priorities, Language, TypeScript, Shape, Naming, Comments, Part II §1, §2, §3, §5, §9, §10, §11), `technical-english.md`, and `contract.md` / `00-index.md` / `implementation-report.md` for what the decisions require.

**Not covered:** tests, stories, CSS, `bench/` (only grepped: its references to the prototype and drag2 are measurement arms read from git history, which the instrument needs, and I report no defect there). Behavior correctness is another lens. I ran nothing.

## Result

No planning bookkeeping (`D-*`, `F-*`, review names, hashes) and no history narration ("previously", "used to") in `src` comments. `grep` for these found nothing. No `lab` hooks remain. The kernel (`draggable.ts`) carries no machinery beyond what DRI-1..DRI-8 require: the slot reader, request coalescing, click guard, verdict and teardown each own a rule or protocol transition. `lift.ts` capture/restore, `acquireTopLayer` and `showKeepingFocus` own real platform behavior. `createFrameTask`, `listenForInvalidation`, `RectIndex` and `layoutAnimation` own a value or algorithm. These are findings of no defect.

The findings below are all tier C: internal only, no consumer-observable effect.

## Demonstrated findings

### cleanup-1 (C): `Insertion.version` is written and never read

`Insertion` carries `version`. It is set in `insertionAt` (`sortable/domain.ts:31`) and `homeInsertion` (`sortable/collection.ts:62`). `grep` over `src` and `tests` for `.version` finds readers only of `snapshot.version` (`rect-index.ts`, `linear-shift.ts`). Nothing reads an insertion's version. **Property:** a field of a shared type exists because something reads it. It is a stored fact with no consumer (§5), and `insertionAt`'s `snapshot` parameter exists only to supply it.

### cleanup-2 (C): one mapped type declared twice

`SessionView<State>` (`draggable.ts:210`) and `WritableLiftedDrag<State>` (`lift.ts:204`) are the same `-readonly` mapping of `LiftedDrag`, under two names, each with its own comment. **Property:** one concept has one name (technical-english "one concept, one name"; §3 type-level structure should not be duplicated).

### cleanup-3 (C): the command sentinel is a literal in `sortable.ts`

`draggable.ts` names `COMMAND_POINTER_ID = -1`. `sortable.ts` tests `drag.pointerId !== -1` twice (lines 356 and 423) with the bare literal. `Drag.pointerId` documents `-1`, but the name that carries the meaning is private. **Property:** a value with a meaning is named where it is read (Naming; one concept, one name).

### cleanup-4 (C): `view` and `panel` name different things in different places

- `view` is the `Window` in `sortable.ts`, `free-drag.ts`, `shared/invalidation.ts` and `free-drag/geometry.ts`, and the `Drag` object in `draggable.ts` (`Session.view`, `Hooks<View, ...>`, `SessionView`). `lift.ts` calls the Window `realm`, and `draggable.ts` calls it `#window`. One concept has three names and one name has two concepts. `sortable/y.ts` and `LinearShift` add a third use: `view` / `#view` for a read-only alias of the cache (see cleanup-6).
- `const panel = draggable(...)` (`sortable.ts:333`, `free-drag.ts`) names the controller returned by `draggable`. The name is not a familiar term for it and the call site does not explain it.
- `describe` (`fault.ts`) is the vocabulary of the test framework used in this repository, and it reads a cause's message.

**Property:** names describe the operation or value in familiar terms, and one name does not carry two concepts (technical-english "Name the concept clearly").

### cleanup-5 (C): unreachable `from === -1` guard in `keyboardInsertion`

`keyboardInsertion` (`sortable/keyboard.ts:51`) returns `null` when `items.indexOf(item) === -1`. Its only caller (`sortable.ts` `command`, through `resolveAdmission`) selects `item` as `path.find(node => snapshot.items.includes(node))` from the same `snapshot` it then passes in. The state cannot arise from correct use or from platform timing. `homeInsertion` and `buildReorderRequest` take the same pair without the check. **Property:** §1.1 gate (a): a check against a state no correct integration, platform event or library-created value can produce does not ship.

### cleanup-6 (C): a second reference to one object, only to narrow its type

- `LinearShift` stores `#index` and `#view`, the same object (`this.#view = index`). `y()` makes `const view: RectIndexView = index` beside `index`. The type-narrowed alias costs an own field per axis instance and a second spelling of the same fact (§5 "cached aliases of objects already in operation state").
- `rect-index.ts:245` exports `const DEV: boolean = __DEV__`, while `draggable.ts` uses `__DEV__` directly. One flag has two spellings, and the alias adds an import edge from `linear-shift.ts`.

**Property:** one authoritative representation per fact; a type-only concern (read-only access) does not cost a runtime field (§3).

### cleanup-7 (C): `interface` where the repository requires `type`

`ReadonlyFloat64Array` (`rect-index.ts`) is an `interface` that no class implements and that does not extend a global interface. `RectIndexView` is an interface that `RectIndex` implements, which is the allowed case. **Property:** CONTRIBUTING §TypeScript, "Prefer `type` over `interface`, unless it is an interface a class implements or the declaration extends a global interface".

### cleanup-8 (C): positional packing and unpacking in free-drag geometry

- `buildGeometry` takes nine positional arguments and `buildRequest` eight, mostly adjacent `number`s (`pointerX, pointerY, originX, originY, dx, dy`), all read from `drag` at the single call site. `buildRequest` also takes a `FreeDragSubject` that the caller builds as `{ item: root, visual: drag.visual }` only for the callee to read `.item` and `.visual`. `settle` builds the same literal again for `config.home`.
- The call sites feed the same `drag` fields through both functions, so one transposed pair of arguments is a silent wrong value.

**Property:** §9: repeated packing and unpacking across layers is a candidate; a same-typed positional list does not make the transposition visible.

### cleanup-9 (C): the same values and fallback written twice

- Landing defaults: `DEFAULT_LANDING_DURATION = 200` / `'ease'` in `lift.ts`, `DEFAULT_DURATION = 200` / `'ease'` in `shared/landing.ts`. Both are needed (the `Landing` type has optional timing; `landing()` always fills it), but nothing ties them, so changing one leaves the other.
- The singular-ancestor fallback ("`localDelta` false: the viewport delta stands in") is `toLocal` in `free-drag/geometry.ts` and is inlined in `sortable/layout-animation.ts` (`if (!localDelta(...)) { local[0] = sx; local[1] = sy; }`), with a comment each.
- `ACCEPTED`, the `RESOLUTION` brand, `RejectedResolution` and the `{ accept, reject }` factory are written in both `sortable/domain.ts` and `free-drag/domain.ts`. The two public types are distinct on purpose; the mechanism is not.

**Property:** one concept, one definition (§2.2 states the cost of a framework to remove duplication, so I name the duplication and do not prescribe sharing it).

### cleanup-10 (C): `bounds()` holds three facts where one carries them

`bounds.ts` keeps `box`, `bounded` and `stale`. `bounded` is `true` exactly when the last resolve produced a rect, and `resolve` returns `bounded ? box : null` when not stale. **Property:** §5 (booleans derivable from existing state are not stored).

### cleanup-11 (C): `handle` is defaulted twice in `freeDrag`

`freeDrag`'s `admit` returns `handle: handle ?? root` where `item: root` is also returned and `Admission.handle` documents "Defaults to `item`". `sortable.ts` instead spreads `...(handle ? { handle } : {})`. Two spellings of one default, and the kernel owns it. **Property:** a default is applied in one place.

## Open questions (not demonstrated defects)

- **oq-1: generality in `LinearShift` / `RectIndex` serving no composition.** `LinearShift` takes `start`, `end`, `center`, `ux`, `uy`; `RectIndex.advance` and `remeasurePlaceholder` take axis offsets; `edge()` branches over all four edges; `moved` has `this.#start === TOP ? rect.top : rect.left`. The only caller is `y()` with `(TOP, BOTTOM, CENTER_Y, 0, 1)`, and `00-index.md` publishes no axis seam, so the horizontal branches and the `ux` parameter have no consumer. If the architect intends a horizontal linear axis the parameters are justified. If not, they are speculative generality (§2.1, §2.2). I did not find a decision requiring them.
- **oq-2: throws for a state the consumer can create.** `sortable/anchor-outside-container` (`placement.ts`) and `sortable/insertion-placeholder-lost` (`sortable.ts`) throw as faults. `landing-placeholder-lost` is reachable by a framework unmounting the item during an async verdict and is tested. The other two guard a consumer moving a gap's neighbor out of the container without calling `invalidate()`, or a placeholder factory that returns the item. `implementation-report.md` decision 6 says the factory case has no guard. `grep` finds no test naming either of these two messages. Whether each passes §1.1 gate (a) is a failure-semantics question for the architect (§13), not a cleanup.
- **oq-3: `RectIndex` capacity policy.** The grow-by-doubling / shrink-at-4x logic (with the `n === 0` special case documented in the comment) is more policy than a per-axis cache of at most a few hundred slots needs, unless the measurements require it. I did not find a measurement tying it to a decision. Performance is Priority 1, so this stays a question.

## Verification limits

Nothing was executed. "Never read" claims (cleanup-1) and "unreachable" (cleanup-5) rest on `grep` and reading the call path, not on a probe. Test files were searched for the quoted fault messages only. I did not compare the built bundle, so a claim about bytes (cleanup-6) is about source, not output.