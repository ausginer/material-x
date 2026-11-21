# A context consumer waits for its parent's definition (`RF-69`) — feature proof

**Files were read at:** `13d64e449` (`core/context-late-provider-1`, the head of #100, clean, equal to `origin`). **Diff reviewed:** `f12db1ced` to `13d64e449`. **Before** means `packages/core/src/controllers/useContext.ts` at `f12db1ced` in the same tree.

**Governing records:**

- `repo:RF-69` in [`00-index.md`](../../00-index.md): the required property and the owner's direction.
- The [handoff](../../context-late-provider-1/context-late-provider-handoff.md): decisions 1 to 5, required properties 1 to 7, proofs 1 to 6.
- The implementer's [report](../../context-late-provider-1/context-late-provider-report.md), whose claims I checked.

**Lens:** feature proof. Each claim below is my own reading or a run saved in [`checks/feature-proof-checks.txt`](checks/feature-proof-checks.txt) (§1 to §9). I repaired nothing and amended no record. Every scratch probe and mutation was reverted or removed, and the tree is clean.

**Verdict: the implementation meets required properties 1 to 7, and proofs 1 to 4 and 6 reproduce. The test changes don't fully keep their intent.** Four existing rows that the unit didn't edit now read the group's state before the lookup runs, so they pass with or without the behavior they test ([`reviewer-1`](#reviewer-1), Tier B). The registry choice is right in every engine, but no committed row would catch its loss ([`reviewer-2`](#reviewer-2), Tier C). I consider `reviewer-1` owed before the merge.

## Scope

**Covered:**

- `useContext.ts` against decisions 1 to 5 and properties 1 to 6.
- Every changed and added row in core's `useContext.browser.test.ts` and in material-x's `button-group-order`, `button-group`, `SwitchCore` and `button` browser files.
- The unchanged rows in those files that build a group, checked for whether they still test something.
- Isolation between test files, the registry choice, the sizes, the committed probe, and `RF-69`'s entry.
- Five source mutations of `useContext.ts`, and three of material-x's consumers.

**Not covered:**

- Safari: the owner deferred it.
- CONTRIBUTING's wording for #96: out of this unit's scope (`RD-32`).
- A declarative shadow root with a `null` registry (`shadowrootcustomelementregistry`). A consumer there isn't upgraded, and the handoff doesn't name the case.

## Property by property

| Property | Reading | Evidence |
| --- | --- | --- |
| 1. Resolves in any order | **Holds.** The provider defined first, defined later in the same task or by `import()`, and parsed markup before either is defined: all resolve in the three engines. | `useContext.ts:136`–`147`. Core row `:529`. The order row. The probe, every row `true` ([§7](checks/feature-proof-checks.txt)) |
| 2. With a custom-element parent the request waits for its definition, and is synchronous otherwise. At most one effect for each connection | **Holds.** The hyphen test selects the wait (`:136`), and any other parent, or none, takes `resolve()` synchronously (`:148`–`149`). | Rows `:545`, `:559` and `:575`. With the wait removed, 7 rows fail in each engine, and so does the order row ([§4](checks/feature-proof-checks.txt)) |
| 3. A stale connection does nothing | **Holds.** The count advances on connect and on disconnect (`:129`, `:153`), and the settlement runs only for the current connection (`:140`). | Rows `:603` and `:621`. With the check removed, rows `:603`, `:621` and `:656` fail in each engine |
| 4. Each cleanup runs exactly once | **Holds.** A disconnect calls the disposer and clears it (`:154`–`155`). | Row `:656`. Without the clearing, that row fails in each engine |
| 5. The provider and the event are unchanged | **Holds.** The diff starts at `:69`. `CONTEXT_EVENT_INIT` (`:7`–`11`), `ContextEvent` and `useProvider` (`:56`–`67`) are untouched. | The three event rows pass in each engine |
| 6. The JSDoc states the contract | **Holds.** `ContextEffect` (`:69`–`78`) states at most one run for each connection, and one cleanup. `useContext` (`:83`–`102`) states the wait and its registry, the asynchronous effect even under a defined parent, no effect while the parent is undefined, and that only the parent is waited for. The old _"on connection boundaries only"_ is gone. | Read |
| 7. `mx-button-group`'s buttons follow the group in every load order, applied before the next frame | **Holds.** Each load order: the order row and the probe. Before the next frame: a single microtask (`contextResolved`) is enough in every changed material-x row. The order row awaits a frame, so it doesn't itself show the timing. | [§1](checks/feature-proof-checks.txt), [§7](checks/feature-proof-checks.txt) |

The shadow-host branch of decision 1 (`:131`–`133`) is covered as well. With `parent = host.parentElement`, row `:587` fails in each engine.

## The proofs the coordinator named

**The failing-before row** (`button-group-order.browser.test.ts:14`–`29`). **It holds.**

- Before the fix, it fails in Chromium, Firefox and WebKit, with `[true, [false, false], …]`. The precondition at `:15` is the `true`: the group isn't defined at the start ([§1](checks/feature-proof-checks.txt)).
- After the fix, it passes in all three.
- The precondition is inside the single assertion, so a group defined by another file would fail the row. It can't pass that way.
- **Isolation:** the browser projects don't set `isolate` (`.scripts/vitest-config.ts`), so Vitest's default applies. I verified that default rather than relying on it. Three scratch files ran in sequence on one worker, each asserting that a custom element name and a global were unset, then setting both. All three passed in each engine ([§2](checks/feature-proof-checks.txt)), so each file gets a fresh window and registry.

**The changed synchronous rows.** **They hold.** Each of the report's rows gains one `await lookup()` or `await contextResolved()`, one microtask, immediately after the connect or the move, and asserts what it asserted before. I read every hunk of the diff, and none relaxed an assertion. The two renamed core rows still assert the value on connect, and the value again after a reconnect. Unchanged rows are a different matter: see [`reviewer-1`](#reviewer-1).

**The stale-connection, move, non-custom-parent and never-defined rows, and the exactly-once cleanup.** **They hold.** These are rows `:603`, `:621`, `:575`, `:643` and `:656`. Without the fix, 7 rows fail in each engine, which matches the report's mutation. I also mutated each mechanism separately ([§4](checks/feature-proof-checks.txt)):

| Mutation | Rows that fail, in each engine |
| --- | --- |
| The wait removed | `:529`, `:545`, `:587`, `:603`, `:621`, `:643`, `:656`, and the order row |
| The connection check removed | `:603`, `:621`, `:656` |
| The disposer not cleared | `:656` |
| The shadow host not read | `:587` |
| Always the global registry | none ([`reviewer-2`](#reviewer-2)) |

**The registry choice.** **It holds.** A scratch probe read it ([§5](checks/feature-proof-checks.txt)):

- **A scoped registry**, in Chromium and Firefox: the undefined parent's `customElementRegistry` is the shadow root's registry, and the consumer resolves once the parent is defined there. With the global registry instead, the effect never runs.
- **WebKit 27.2** has no `Element.prototype.customElementRegistry`, so the property reads `undefined`, and `??` takes the global registry, the only one there is.
- **A `DOMParser` tree:** the parsed element's registry is `null` in Chromium and Firefox, and `undefined` in WebKit. Once appended to the document, Chromium and Firefox give it the global registry. In all three engines the consumer resolves when the parent is defined globally.
- So `?? customElements` is reached only when the property is missing, or when the parent stays in a document with no registry. The global registry is right in both cases.

**Sizes.** **They hold.** My run reproduces the report's figures exactly ([§8](checks/feature-proof-checks.txt)):

- the six button rows: +97 to +118 B;
- `complete`: +94 B (16,975 to 17,069);
- both group rows: unchanged.

Every row is under the 200 B stop. A caution for anyone who reruns it: `complete.js` is cached under `node_modules/.cache/size-limit/`. In this worktree it was stale, from another branch's `files.json`, until `.size-limit.ts` ran again.

**`RF-69` in `00-index.md`** (`:3244`). **It holds.**

- It is open, registered and decided on 2026-11-21, and _"**Unimplemented.**"_
- That follows the index's convention: the architect dates an entry implemented when its pull request merges, as `:132` shows for #72. The report asks for this.
- The entry's repair, consumer change and size match the code. Its _"one material-x test"_ undercounts the files touched, but the handoff's scope allows the timing edits.

**Gates.** **They hold.**

- core's browser suite, in three engines: 783 rows pass.
- material-x's browser suite, in three engines: 656 rows pass, and the one expected failure fails as expected.
- the root `aube exec just test`: 148 files, 2,354 rows pass.
- `typecheck` in core and material-x, and `fmt-check` and `lint` on the changed `.ts` files: clean.

## Findings

### reviewer-1

**Tier B.** Four unchanged group rows now read the state before the lookup runs, so they pass whether or not the behavior they name works.

- **Current behavior:** each row connects a group with its buttons and reads, or changes then reads, in the same task. After this unit the lookup runs a microtask later. So each row reads a button that hasn't joined the group yet, whose state is the default, and the default is the expected value. The rows:
  - `button-group.browser.test.ts:120`: _"should re-enable child buttons when the group clears disabled"_;
  - `button.browser.test.ts:213`: _"should re-enable when the group context clears disabled"_;
  - `SwitchCore.browser.test.ts:375`: _"should uncheck only the selected switch when the group value is removed"_;
  - `SwitchCore.browser.test.ts:396`: _"should keep a checked switch checked when it joins a group with no value"_.
- **Evidence** ([§6](checks/feature-proof-checks.txt)), three mutations of material-x's consumers:
  - **A:** the group never re-enables (`ButtonCore.ts:131`).
  - **B:** removing the group's value unchecks nothing (`SwitchCore.ts:83`–`85`).
  - **C:** a join with no group value unchecks (`SwitchCore.ts:81`).
  - With core before the fix, A fails the two re-enable rows, B fails `:375` and C fails `:396`, in each engine. With core at `13d64e449`, all four rows pass under all three mutations.
  - The whole material-x browser and spec suites in Chromium also pass under each mutation. So no row in the package guards these three behaviors now.
- **Why it is a problem:** the handoff limits the unit to _"the timing of existing tests that read a resolved context synchronously"_, and its proof 5 lists the tests whose timing changed. These four rows read a resolved context synchronously, and their timing changed, but they weren't listed or edited. The report says they _"already passed, because the state they read ends up the same whichever way the lookup is ordered"_. They pass because they no longer observe the transition they test. The instrument now accepts the regressions A, B and C.
- **Required property:** each existing row that tests a group's effect on a button observes the button after its lookup has run, so each mutation above fails it again.
- **Routed** to the implementer, inside the handoff's scope (an awaited resolution and nothing else).

### reviewer-2

**Tier C.** No committed row discriminates which registry the wait uses.

- **Current behavior:** `useContext.ts:145` waits on `parent.customElementRegistry ?? customElements`. The JSDoc promises _"through the registry that defines it"_ (`:87`–`88`).
- **Evidence:** with `customElements` in place of that expression, every core row and the order row pass in all three engines ([§4](checks/feature-proof-checks.txt)). The scratch probe shows the consequence in Chromium and Firefox: a consumer under a parent defined in a shadow root's scoped registry never runs its effect ([§5](checks/feature-proof-checks.txt)). The implementer's own registry reading wasn't committed either.
- **Why it is a problem:** the handoff names the failure (_"A wait on the wrong registry would never settle"_), and two engines in the gate expose scoped registries. Yet nothing in the repository would catch a regression. The current behavior is correct, so no consumer sees anything today. The handoff's proofs don't ask for this row, so the unit doesn't deviate from them.
- **Required property:** in an engine that exposes `Element.customElementRegistry`, a consumer resolves a parent defined only in its shadow root's registry, and the suite fails if the wait uses another registry.
- **Routed** to the architect, who owns the proof list, to decide whether the row is owed in this unit.

## Next

- **The implementer:** `reviewer-1`.
- **The architect:** `reviewer-2`. After the merge, date `RF-69` implemented.