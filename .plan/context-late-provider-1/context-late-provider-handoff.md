# Handoff: a context consumer waits for its parent's definition (`RF-69`)

**Recipient:** the implementer. **Branch:** `core/context-late-provider-1`, from `main` at `640658b5c`. **Input:** the architect's commit that adds this file. **Authorized** by the owner on 2026-11-21, relayed by the coordinator. The plan and its implementation share this branch and one pull request (`RD-32`): continue here, and open the pull request after the implementation.

**Governing records:**

- `RF-69` in [`../00-index.md`](../00-index.md): its required property and the owner's direction;
- core's `useContext` contract, in `packages/core/src/controllers/useContext.ts`;
- CONTRIBUTING's _Parent and child components_, which #96 adds (open, not merged).

**Order with `RD-31`.** This unit merges before `RD-31` needs it: the sortable list resolves its items through context, and `mx-button-group` on `main` is already affected.

## What the reading shows

The [probe](probes/context-order.ts) parses `<mx-button-group disabled>` around two `<mx-button>`s before any element is defined. `button.js` and `button-group.js` are separate entries of one build, so they share core and the context token, as an application's chunks do. A button resolved the group's context when its inner `<button>` is disabled.

| Load order | Chromium 158 | Firefox 159 | WebKit 27.2 |
| --- | --- | --- | --- |
| the group, then the button | resolved | resolved | resolved |
| the button, then the group, once the button has upgraded | **not resolved** | **not resolved** | **not resolved** |
| the button, then the group 200 ms later by `import()` | **not resolved** | **not resolved** | **not resolved** |

The [reading](checks/context-order.txt) has the rows.

- **The cause:** `useContext` dispatches its request only in the consumer's `connected`. A provider listens only once its host is upgraded. A button that upgrades first asks an element that isn't a provider yet, and nothing asks again.
- **The consequence:** a disabled group's buttons stay enabled, and none follows the group's size, color or shape.

## The decision

**The owner's direction, translated:** _"So let's do it this way from the start"_: the consumer waits for its parent's definition, and then requests. On the timing: _"Yes, 'always wait' is exactly what I meant. `whenDefined` resolves in any case if the definition exists, so we can just call it and wait. The only downside is an asynchronous event, but I think that's minor."_

**So, on every connect, a consumer whose parent is a custom element waits for `customElements.whenDefined(parent.localName)`, and then dispatches its request.** The resolution is asynchronous even when the parent is already defined. The provider doesn't change.

**Considered and not preferred, by the owner:**

- the provider prompting its children to request again when it connects, which costs one event for each child on every connect;
- the WCCG Context Community Protocol's `context-provider` event with a document-level `ContextRoot`, a store of pending requests. That is close to the registry that CONTRIBUTING's new section (#96) rules out for a parent–child link.

The first option is the repair that `RD-31`'s plan proposed for `RF-69` on #90 (`6214e3b57`), before the owner's direction. This unit replaces it.

### 1. The wait

- **Which parent:** the consumer's parent element, or its shadow root's host when the consumer is at the top level of a shadow root.
- **A custom element** is a parent whose local name is a valid custom element name. The wait uses the registry that defines the parent: the global `customElements`, unless the platform gives the element a registry of its own (`Element.customElementRegistry`, for a scoped registry). Read which engines in the gate expose it, and state it in the report. A wait on the wrong registry would never settle.
- **Any other parent, or none,** gets the request synchronously, as today. A built-in element can't be a provider, so a wait would buy nothing.
- **The request after the wait** is the same event as today. It bubbles and is composed, so the nearest provider answers. The effect runs once for the connection, with the value or with `undefined`.

### 2. Disconnect and moves

- **Each connection's request belongs to that connection.** If the consumer disconnects before the wait settles, the settlement does nothing: no request and no effect.
- **A move is a disconnect followed by a connect.** The new connection waits for its own parent. The old wait's settlement does nothing, even if the old parent is defined later.
- **Each cleanup that an effect returns runs exactly once,** on the disconnect that ends its connection. A disconnect whose connection never ran its effect runs no cleanup. Today the disposer isn't cleared after a disconnect, which a pending connection would expose as a second call of an earlier cleanup.

### 3. A parent that is never defined

The effect doesn't run for that connection. Today it runs with `undefined`. The pending wait holds one reaction on the registry's promise for that name, released when the name is defined. This is what waiting means, and the JSDoc says so. In material-x, an effect with `undefined` does nothing, so no element's behavior changes.

### 4. The first render, for `mx-button-group`

- **Parsed markup, or a group with its buttons appended in one task:** each button applies the group's state in a microtask after it connects. Microtasks run before the browser renders, so no frame shows an ungrouped button.
- **Script that reads a button's grouped state in the same task as the insertion** sees it ungrouped, until that microtask has run. That is the asynchronous event the owner accepts. A test that reads the state synchronously awaits the resolution first.

### 5. Only the parent, not a chain

The wait reads only the consumer's parent. Every context link in material-x is a direct parent–child link, and CONTRIBUTING's new section makes that the rule. A provider further up still answers if it is defined when the request is dispatched, because the event bubbles. An undefined custom element between a consumer and a provider further up isn't waited past. Walking a chain would cost a wait for each undefined ancestor on every connect, and no link needs it.

## Required properties

1. **A consumer resolves its parent provider whatever order the two are defined and connected in:**
   - with the provider defined before the consumer;
   - defined after it, in the same task or any time later, `import()` included;
   - with the markup parsed before either is defined.
2. **With a custom-element parent, the request is dispatched only after the parent's definition**, through `whenDefined`, on every connect. With any other parent, or none, it is dispatched synchronously. The effect runs at most once for each connection.
3. **A stale connection does nothing.** A disconnect, or a move, before the wait settles leaves no request, effect or subscription from that connection.
4. **Each cleanup runs exactly once,** on the disconnect that ends its connection.
5. **The provider and the event don't change:** the token, the event's type, `bubbles`, `composed`, `cancelable` and `useProvider` stay as they are.
6. **`useContext`'s and `ContextEffect`'s JSDoc state the contract:**
   - the wait;
   - the asynchronous effect with a custom-element parent;
   - the effect at most once for each connection;
   - an effect that never runs while the parent is undefined;
   - that only the parent is waited for.

   It no longer says the lookup runs on connection boundaries only, without that qualification.

7. **`mx-button-group`'s buttons follow the group in every load order.** For parsed markup, and for a group with its buttons appended in one task, the grouped state is applied before the next frame.

## Scope and boundaries

**In scope:**

- `packages/core/src/controllers/useContext.ts` and its JSDoc;
- core's `useContext` test file;
- a material-x browser test for `mx-button-group`;
- the timing of existing tests that read a resolved context synchronously, by awaiting the resolution and nothing else;
- the report.

**Out of scope:**

- `useProvider`;
- material-x's `useContext` wrapper, which needs no change;
- `RD-31`'s sortable list;
- CONTRIBUTING's wording, below.

**Stop and report if:**

- a required property needs a change to `useProvider` or to the event;
- an existing test needs more than an awaited resolution;
- an engine in the gate exposes `Element.customElementRegistry` and its behavior isn't clear from the platform.

## Proofs

1. **The failing-before row, in material-x**, in the Chromium, Firefox and WebKit projects.
   - **The fixture:** with `mx-button` defined and `mx-button-group` not yet defined, insert the static markup `<mx-button-group disabled size="…">` with two `<mx-button>` children. Then import the group's module, and await a frame.
   - **The assertion:** each button's inner `<button>` is disabled and carries the group's size.
   - **The precondition:** the row first asserts that `mx-button-group` isn't defined, so it can't pass on a group that another file defined. Read whether the browser projects isolate test files, and report it.
   - **Run it before the fix:** it fails in all three engines. Save the output under `checks/`, then implement, and save the passing run.
2. **Core's rows**, with test elements:
   - the provider defined after the consumer connected: the consumer resolves it after the definition;
   - a provider already defined: the effect hasn't run synchronously after the connect, and has run after one microtask;
   - a parent that isn't a custom element: the effect runs synchronously;
   - a disconnect before the definition: no effect, and no subscription once the provider is defined and emits;
   - a move from one undefined provider to another, with both defined afterwards: only the second resolves, and the first's definition changes nothing;
   - a parent never defined: no effect after several tasks;
   - each cleanup runs once over connect, disconnect, connect before the definition, and disconnect.

   **Rewrite** _"should resolve provider value synchronously on connect"_ and _"should rerun provider lookup synchronously after reconnect"_ to the new contract, and keep their intent: the value resolves on connect and again after a reconnect. The other rows stay, with an awaited resolution where they need one.

3. **Mutation:** with the wait removed, proof 1 and proof 2's ordering rows fail. Revert it.
4. **The committed probe on the branch's build:** rerun [`probes/context-order.ts`](probes/context-order.ts) in all three engines. Every row resolves.
5. **The existing gates:**
   - core's and material-x's tests in every engine of the gate;
   - the root `aube exec just test`;
   - `fmt`, `lint` and `typecheck`.

   List every existing test whose timing changed, with the one `await` it gained.

6. **Sizes,** before and after. core has no `useContext` row, so the cost shows in material-x. The readings at `640658b5c`'s source, in Brotli bytes:

   | Row                                   | Before |
   | ------------------------------------- | ------ |
   | `button/button`                       | 4,844  |
   | `button/icon-button`                  | 5,109  |
   | `button/link-button`                  | 4,808  |
   | `button/switch-button`                | 5,188  |
   | `button/switch-icon-button`           | 5,603  |
   | `button/split-button`                 | 7,408  |
   | `button-group/button-group`           | 3,120  |
   | `button-group/connected-button-group` | 3,884  |
   | `complete`                            | 16,929 |

   **Estimated:** about 50 to 120 B on each row that contains `useContext`, the six button rows and `complete`. The two group rows use only `useProvider` and shouldn't change. The rows have no limits (`RD-24`). Report each difference, and stop if a row grows by more than 200 B.

## CONTRIBUTING's new section

#96 says: _"A child resolves the context through the DOM tree when it connects, so the link keeps no module state."_ After this unit, the resolution happens after the parent's definition. **Proposed wording, for #96 before it merges:**

> A child resolves the context through the DOM tree when it connects, once its parent is defined, so the link keeps no module state and holds in whatever order the two are defined.

It is project documentation, so it goes in #96 or in a documentation pull request of its own, not in this unit (`RD-32`). If #96 merges first, that pull request follows this one.

## The report

Write `context-late-provider-report.md` beside this handoff. Include:

- each proof's result, with links to its saved output;
- the registry finding from decision 1;
- the test files' isolation;
- the existing tests whose timing changed;
- the sizes after.

The architect dates `RF-69` from the report.