# A context consumer waits for its parent's definition (`RF-69`) — report

**Implemented 2026-11-21 by the implementer (Mx Implementer B)** on `core/context-late-provider-1`, against the [handoff](context-late-provider-handoff.md) at `ce1544fed` and `repo:RF-69`, in the commit that adds this report. The branch merges `origin/main` at `bd1dee7df` first, in `f12db1ced`. No stop condition was met.

## What changed

- **`useContext`** (`packages/core/src/controllers/useContext.ts`). On each connect it finds the parent: the parent element, or the host of the shadow root the consumer is at the top level of. If the parent's local name has a hyphen, the consumer waits for `whenDefined(parent.localName)` and then dispatches the unchanged request. The wait uses `parent.customElementRegistry`, or `customElements` when that is `null` or missing. Any other parent, or none, gets the request synchronously.
  - A count advances on each connect and disconnect, and the settlement does nothing unless its connection is still current. So a disconnect or a move before the wait settles leaves no request, effect or subscription.
  - A disconnect calls the disposer and clears it, so each cleanup runs once.
  - A rejected wait settles too, because only a reserved hyphenated name such as `font-face` rejects, and that isn't a custom element.
- **The JSDoc** of `useContext` and `ContextEffect` states the wait, the asynchronous effect, the effect at most once for each connection, that the effect doesn't run while the parent is undefined, and that only the parent is waited for.
- **Unchanged:** `useProvider`, the token, and the event's type, `bubbles`, `composed` and `cancelable`. material-x's `useContext` wrapper is unchanged too.

## Decision 1: the registry

Read in Playwright's builds, from a scratch probe that is not committed:

| Engine | `'customElementRegistry' in Element.prototype` | A connected element in the document | An element parsed by `DOMParser` | Under a shadow root with its own registry |
| --- | --- | --- | --- | --- |
| Chromium 158 | yes | the global `customElements` | `null` | that registry |
| Firefox 159 | yes | the global `customElements` | `null` | that registry |
| WebKit 27.2 | no | `undefined` | `undefined` | `new CustomElementRegistry()` throws _Illegal constructor_ |

The behavior is the platform's, with no ambiguity, so this isn't a stop. `parent.customElementRegistry ?? customElements` waits on the scoped registry where one defines the parent, and on the global one otherwise. That covers WebKit's missing property and the `null` of an element with no browsing context.

## Proofs

1. **The failing-before row,** `packages/material-x/tests/button-group/button-group-order.browser.test.ts`. `mx-button` is defined and the group isn't. The row inserts the static markup `<mx-button-group disabled size="large">` with two `<mx-button>` children, imports the group's module, and awaits a frame. It first asserts that `mx-button-group` isn't defined.
   - **Before the fix,** at `f12db1ced`, it fails in Chromium, Firefox and WebKit. The precondition holds, and both inner buttons are enabled and not `large` ([output](checks/button-group-order-before.txt)).
   - **After the fix,** it passes in all three ([output](checks/button-group-order-after.txt)).
   - **Isolation:** the browser projects don't set `isolate`, so Vitest's default applies: each test file runs in its own iframe, with its own registry. The file imports no group module statically, and the precondition would catch a group that another file defined anyway.
   - **A second witness,** on `repo/list-sortable-1` and not edited here: `RD-31`'s `it.fails` row, _"should make a static item a tab stop when list-item.js is evaluated first"_, fails today, as the same gap predicts. Once this unit is on that branch's base, it should pass, so its `it.fails` turns red and becomes `it`.
2. **Core's rows,** in `packages/core/tests/controllers/useContext.browser.test.ts`, under _"useContext with a custom-element parent"_:
   - a provider defined after the consumer connected resolves after the definition;
   - under a defined provider, the effect hasn't run synchronously after the connect, and has run after one microtask (two rows);
   - under a `<div>`, the effect runs synchronously;
   - at the top level of a shadow root whose host is defined later, the consumer waits for the host;
   - a disconnect before the definition: no effect, and no update after the provider is defined and emits;
   - a move from one undefined provider to another, both defined afterwards: the first's definition changes nothing, and only the second resolves;
   - a parent never defined: no effect after three tasks;
   - over a connect, a disconnect, a connect under an undefined provider and a disconnect, the effect runs once and its cleanup once.

   _"should resolve provider value synchronously on connect"_ is now _"should resolve the provider value on connect"_, and _"should rerun provider lookup synchronously after reconnect"_ is _"should rerun provider lookup after reconnect"_. Both keep their intent, with an awaited resolution after each connect.

3. **Mutation:** with the custom-element test replaced by `false`, so the lookup is always synchronous, the order row fails in all three engines. 7 of the 9 new core rows fail: every ordering row, plus the disconnect and cleanup rows, because a synchronous lookup runs the effect with `undefined` ([output](checks/mutation.txt)). The two rows that still pass are the ones a synchronous lookup also satisfies: the `<div>` parent, and a defined provider after one microtask. Reverted.
4. **The probe,** [`probes/context-order.ts`](probes/context-order.ts), on the branch's build in all three engines: every row resolves, the group first, the button first, and the group by `import()` 200 ms later ([reading](checks/context-order-after.txt), against the architect's [reading before](checks/context-order.txt)).
5. **The gates,** on the final source:
   - core's browser suite in Chromium, Firefox and WebKit: 783 rows pass;
   - material-x's browser suites in the same three: 656 rows pass, and the one expected failure fails as expected;
   - the root `aube exec just test`: 148 files, 2,354 rows pass;
   - `fmt`, `lint` and `typecheck` in core and material-x: clean.
6. **Sizes:** [reading](checks/size.txt), from [`probes/size-rows.ts`](probes/size-rows.ts), a copy of `RD-31`'s module probe. Brotli bytes:

   | Row                                   | Before |  After | Change |
   | ------------------------------------- | -----: | -----: | -----: |
   | `button/button`                       |  4,843 |  4,946 |   +103 |
   | `button/icon-button`                  |  5,108 |  5,205 |    +97 |
   | `button/link-button`                  |  4,809 |  4,919 |   +110 |
   | `button/switch-button`                |  5,187 |  5,301 |   +114 |
   | `button/switch-icon-button`           |  5,598 |  5,702 |   +104 |
   | `button/split-button`                 |  7,406 |  7,524 |   +118 |
   | `button-group/button-group`           |  3,126 |  3,126 |      0 |
   | `button-group/connected-button-group` |  3,888 |  3,888 |      0 |
   | `complete`                            | 16,975 | 17,069 |    +94 |

   Every button row is inside the 50 to 120 B estimate and under the 200 B stop. The two group rows use only `useProvider` and, as predicted, don't move. The before column is read at `f12db1ced`, so it includes `bd1dee7df`. It differs from the handoff's figures at `640658b5c` by 6 B or less on each row, and by 46 B on `complete`.

## Existing tests whose timing changed

Each gained one awaited resolution and nothing else. In core it is `await lookup()`, one microtask. In material-x it is `await contextResolved()`, a helper added to `tests/browser.ts` that awaits one microtask. The await comes right after the connect, or after the move, so each row still tests what it tested.

- **core,** `tests/controllers/useContext.browser.test.ts`:
  - the two renamed rows above;
  - _"should resolve the nearest provider when providers are nested"_;
  - _"should ignore providers registered for another context"_;
  - _"should dispose previous subscription before rerunning effect after reconnect"_, after each connect;
  - _"should rely on manual subscriptions inside the provided value"_;
  - _"should unsubscribe from the previous provider after moving to another provider"_, after each connect;
  - _"should call effect with undefined after reconnect without any provider"_, after the first connect only, because `<body>` gets the synchronous lookup;
  - _"should not react to provider value replacement without reconnect"_;
  - _"should keep multiple consumers isolated when one disconnects"_.
- **material-x,** `tests/button-group/button-group.browser.test.ts`: _"should forward the size / the color / the shape to child buttons as a custom state"_, _"should forward disabled to the native child buttons"_, _"should forward the current context to a late-added child button"_ and _"should check the child whose value matches the group value"_.
- **material-x,** `tests/button/SwitchCore.browser.test.ts`: _"should check the switch whose value matches the group value"_, _"should uncheck the previous switch when the group value changes"_ and _"should check only the matching switch when a checked switch joins a group with a value"_.
- **material-x,** `tests/button/button.browser.test.ts`: _"should derive disabled state from the group context"_.

The other rows that use a group already passed, because the state they read ends up the same whichever way the lookup is ordered.

## Open

- **For the architect:** date `RF-69` from this report.
- **CONTRIBUTING's wording** for #96 is the handoff's proposal. It isn't touched here (`RD-32`).
- **`RD-31`:** once this unit merges, its branch takes it, and its `it.fails` row and the probe's import order are updated there.
- Safari isn't run locally.