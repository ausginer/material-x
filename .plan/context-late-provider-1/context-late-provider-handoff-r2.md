# Handoff, revision 2: a context consumer names its parent (`RF-69`)

**Recipient:** the implementer. **Branch:** `core/context-late-provider-1`, the head of #100. **Input:** the architect's commit that adds this file, on `2f36dd486`. **Authorized** by the owner on 2026-11-21, relayed by the coordinator. The plan and its implementation share this branch and one pull request (`RD-32`): continue here, merge `origin/main` when needed, and don't rebase.

**It supersedes** [revision 1](context-late-provider-handoff.md), of `ce1544fed`, which `13d64e449` implements. Revision 1's reading, its decisions 2 to 4, and its rejected alternatives still hold, and this file names what changed. Revision 1's decision 1 and decision 5 are replaced, and so are its required properties and its proofs.

**Governing records:**

- `RF-69` in [`../00-index.md`](../00-index.md), and its re-plan dated there today;
- core's `useContext` contract, in `packages/core/src/controllers/useContext.ts`;
- the [feature proof](../reviews/context-late-provider-1/feature-proof-claude.md) of `13d64e449`, at `2f36dd486`: `reviewer-1` and `reviewer-2`;
- CONTRIBUTING's _Parent and child components_, which #96 adds (open, not merged).

## The owner's direction

In translation, relayed by the coordinator: _"Stop, #100 went the wrong way. It's overcomplicated. It is enough for `useContext` to take the parent's name."_ His earlier direction still holds: the consumer always waits, even when the parent is already defined, which also covers a lazily imported parent. He accepts the asynchronous request as minor.

## What revision 1 built, and what the name replaces

`13d64e449`'s consumer works out on every connect whether it should wait, and where:

- **The hyphen check.** It treats any parent whose local name has a hyphen as a custom element.
- **The shadow host.** At the top level of a shadow root, it takes the root's host as the parent.
- **The registry.** It waits through `parent.customElementRegistry ?? customElements`, and reviewer-2 found that no row checks this.
- **The rejection handler.** It also settles on a rejected wait, for a reserved hyphenated name such as `font-face`.

With the parent's name given by the caller, the consumer doesn't need any of the four. The caller knows which element provides its context, so nothing has to be inferred.

## The decision

### 1. The signature

```ts
export function useContext<T>(
  host: ControlledElement,
  ctx: Context<T>,
  parents: readonly string[],
  effect: ContextEffect<T>,
): void;
```

`parents` names the elements that provide `ctx` to this consumer as its parent. **It is a list, because the button family has two:** `mx-button-group` and `mx-connected-button-group` both provide `BUTTON_GROUP_CTX` through `ButtonGroupCore`. A single name couldn't express a button's parent, and two `useContext` calls with one name each would run the effect twice under one group, because the event bubbles to whichever provider is nearest.

material-x's wrapper, `src/core/utils/useContext.ts`, takes the same `parents` after `ctx` and passes it through. Its other parameters don't change.

### 2. The wait

On every connect:

- **The parent is named:** the consumer's `parentElement` has a local name in `parents`. The consumer waits for `customElements.whenDefined(thatName)` and then dispatches its request. The wait happens even when the parent is already defined, so the effect runs a microtask after the connect at the earliest. This is the owner's _"always wait"_.
- **Any other parent, or none:** the consumer dispatches its request synchronously, as before `RF-69`. That covers a `<div>`, a custom element that isn't named, and the top level of a shadow root.

The request is the same event as today, and the nearest provider answers it.

**Why the comparison with the parent stays.** The shape with no comparison, where the consumer always waits for the name it's given, fails twice:

- **It can't settle with two names.** Waiting for both never settles on a page that imports only one group, and waiting for either one sends the request to an undefined parent once the other group is defined, which is `RF-69` again.
- **It retains every consumer.** A pending `whenDefined` keeps each `.then` callback until the name is defined, and the callback holds the host. On a page that never imports a group, every button that ever connected would stay in memory, one reaction for each connect. With the comparison, only a consumer whose parent is named waits, and a parent is named only when the page has that markup.

The comparison is one `includes` on the parent's local name. It replaces the hyphen check and doesn't bring back the parent lookup that revision 1 needed for the registry and the shadow host.

### 3. The registry

**The wait uses the global `customElements`.** core's `define` registers every element there (`packages/core/src/element.ts`), so a name that `define` registers is defined in that registry. A scoped registry is outside this contract, as it is outside `define`'s, and the JSDoc says the wait goes through the global registry.

That closes reviewer-2: the registry choice that it found unwitnessed no longer exists, so no row is owed for it.

### 4. What stays from revision 1, and why

- **The connection count.** Each connect and each disconnect advances it, and a settlement does nothing unless its connection is still current. A disconnect before the wait settles must leave no request, which also happens when the parent is already defined and the consumer is removed in the same task. A move is a disconnect followed by a connect before the old wait settles. `host.isConnected` can't tell the old connection from the new one, so the old settlement would run a second lookup for one connection.
- **The cleared disposer.** A disconnect calls the disposer and clears it. A connection whose effect never ran would otherwise call the previous connection's cleanup a second time.
- **No effect while a named parent is never defined.** That connection keeps one reaction on that name's promise until the name is defined, as revision 1's decision 3 says. It happens only when a page has a group's markup and never loads its module.
- **Revision 1's decision 4,** the first render: unchanged.

### 5. What goes

- the hyphen check;
- the shadow host as a parent;
- `Element.customElementRegistry`;
- the rejection handler. `parents` holds custom element names, and `whenDefined` rejects only for a name that isn't one. Guarding against that is the defensive check CONTRIBUTING §1.1 rules out.

### 6. The callers

| Caller | Context | `parents` |
| --- | --- | --- |
| `ButtonCore`, through the wrapper | `BUTTON_GROUP_CTX` | `mx-button-group`, `mx-connected-button-group` |
| `SwitchCore`, through the wrapper | `BUTTON_GROUP_CTX` | the same |
| `ListItemCore` on `repo/list-sortable-1` (#90), directly | `SORTABLE_LIST_CTX` | `mx-sortable-list` |

- **The button family's two names** are one constant beside `BUTTON_GROUP_CTX` in `button-group/button-group-context.ts`, which both cores already import. Both cores pass that constant, so a bundle with both carries the list once. The groups' `define` calls don't need to read it.
- **`ListItemCore`** is `RD-31`'s and isn't edited here. Once #90's branch takes this unit, it passes `['mx-sortable-list']`, and its constant belongs beside `SORTABLE_LIST_CTX`. A list item under a plain `mx-list` then requests synchronously and gets `undefined`, as today. That branch's `it.fails` row, _"should make a static item a tab stop when list-item.js is evaluated first"_, should then pass and become `it`.

## Required properties

1. **A consumer resolves a named parent provider whatever order the two are defined and connected in:** the provider defined first, defined later in the same task or any time later, `import()` included, and markup parsed before either is defined. This holds for each name in `parents`, including when another name in the list is never defined.
2. **With a named parent, the request is dispatched only after that name's definition in the global registry**, through `whenDefined`, on every connect. **With any other parent, or none, it is dispatched synchronously**, including under a custom element that isn't named. The effect runs at most once for each connection.
3. **A stale connection does nothing.** A disconnect, or a move, before the wait settles leaves no request, effect or subscription from that connection.
4. **Each cleanup runs exactly once,** on the disconnect that ends its connection.
5. **The provider and the event don't change:** the token, the event's type, `bubbles`, `composed`, `cancelable` and `useProvider` stay as they are.
6. **`useContext`'s JSDoc states the contract:** what `parents` names; the wait for a named parent, through the global registry; the asynchronous effect under a named parent, even a defined one; the synchronous request otherwise; no effect while a named parent is undefined. `ContextEffect`'s JSDoc stays as it is at `13d64e449`. Nothing mentions the shadow host or `customElementRegistry`.
7. **`mx-button-group`'s and `mx-connected-button-group`'s buttons follow their group in every load order.** For parsed markup, and for a group with its buttons appended in one task, the grouped state is applied before the next frame.
8. **Every existing row that tests a group's effect on a button observes the button after its lookup has run**, so it fails when that effect breaks. This is reviewer-1's required property.

## Scope and boundaries

**In scope:**

- `packages/core/src/controllers/useContext.ts` and its JSDoc;
- material-x's `src/core/utils/useContext.ts`, `button-group/button-group-context.ts`, `button/ButtonCore.ts` and `button/SwitchCore.ts`, for the new parameter and the constant;
- core's `useContext` test file, material-x's group order file, and the rows below;
- the report.

**Out of scope:** `useProvider`; `RD-31`'s list (#90); CONTRIBUTING's wording, below.

**Stop and report if:**

- a required property needs a change to `useProvider` or to the event;
- an existing row needs more than an awaited resolution, other than the parameter that every consumer now passes;
- a material-x consumer's parent turns out not to be its provider's element, for instance a button whose parent is a slot or a wrapper inside a group.

## Proofs

### 1. core's rows

In `packages/core/tests/controllers/useContext.browser.test.ts`. The consumer factories take `parents`.

- **The rows in _"useContext"_** name their provider's element and keep their awaited lookups, as at `13d64e449`. _"should call effect with undefined…"_ rows whose consumer sits under `<body>` stay synchronous.
- **_"useContext with a custom-element parent"_ becomes _"useContext with a named parent"_:**

| Row at `13d64e449` | Disposition |
| --- | --- |
| `:529` a provider defined after the consumer connected | stays |
| `:545` not synchronous under a defined provider | stays |
| `:559` after one microtask under a defined provider | stays |
| `:575` synchronous under a parent that isn't a custom element | stays, under a `<div>` |
| `:587` the host of the shadow root it is at the top level of | **goes**: the shadow host is no longer a parent |
| `:603` a connection that ended before the definition | stays |
| `:621` a move between two undefined providers | stays |
| `:643` a parent never defined | stays |
| `:656` each cleanup once | stays |

- **New rows:**
  - **a defined provider that isn't named:** the effect runs synchronously on connect, with the provider's value. This shows that the name decides, not the hyphen;
  - **the second name of two:** the parent is the second name and the first is never defined. The consumer resolves after the second's definition.

### 2. material-x's order rows

In `tests/button-group/button-group-order.browser.test.ts`:

- **The `mx-button-group` row stays as it is.**
- **A new row** for `mx-connected-button-group`: the same fixture and assertion, with that group's module imported after the buttons have upgraded, and the precondition that `mx-connected-button-group` isn't defined. It fails if `ButtonCore` names only `mx-button-group`.

### 3. reviewer-1's rows

Each row gains one `await contextResolved()` after the connect and before the change it tests, and nothing else:

- `button-group.browser.test.ts`: _"should re-enable child buttons when the group clears disabled"_, between the `disabled` toggle on and the toggle off;
- `button.browser.test.ts`: _"should re-enable when the group context clears disabled"_, after `document.body.append(group)`;
- `SwitchCore.browser.test.ts`: _"should uncheck only the selected switch when the group value is removed"_, after `document.body.append(group)`;
- `SwitchCore.browser.test.ts`: _"should keep a checked switch checked when it joins a group with no value"_, after `document.body.append(group)`.

**Witness:** rerun the feature proof's mutations A, B and C (§6 of its [checks](../reviews/context-late-provider-1/checks/feature-proof-checks.txt)). With core at this revision, A fails both re-enable rows, B fails the value-removal row and C fails the join row, in each engine. Revert them. Recheck the other group rows that the report says _"already passed"_. Any row that reads a button's group state in the same task as the connect gets the same await. List every row that gained one.

### 4. Mutations

Revert each after the run:

- **The wait removed,** so the request is always synchronous: proof 1's ordering rows and both order rows fail.
- **The comparison replaced by a wait for any custom-element parent:** the new row with an unnamed defined provider fails.
- **Only the first name compared:** the new two-name row and the connected order row fail.
- **The connection check removed:** the stale-connection, move and cleanup rows fail.
- **The disposer not cleared:** the cleanup row fails.

### 5. The probe

Rerun [`probes/context-order.ts`](probes/context-order.ts) on the branch's build in all three engines. Every row resolves.

### 6. The gates

- core's and material-x's tests in every engine of the gate;
- the root `aube exec just test`;
- `fmt`, `lint` and `typecheck`, with core rebuilt before material-x's typecheck.

### 7. Sizes

Read them with [`probes/size-rows.ts`](probes/size-rows.ts), regenerating `complete.js` with `node .size-limit.ts` from `packages/material-x` first. Report the three columns below, and stop if a row grows by more than 200 B over the _before_ column.

The architect read a scratch sketch of this revision: core's consumer as decision 2, the wrapper's parameter, and one shared constant for the two group names. The sketch was built from `2f36dd486` and reverted, and its 92 rows in the four group-related material-x files passed in the default browser project. Brotli bytes:

| Row | Before `RF-69` (`f12db1ced`) | Revision 1 (`13d64e449`) | Sketch of revision 2 | Against revision 1 |
| --- | --: | --: | --: | --: |
| `button/button` | 4,843 | 4,946 | 4,930 | −16 |
| `button/icon-button` | 5,108 | 5,205 | 5,195 | −10 |
| `button/link-button` | 4,809 | 4,919 | 4,910 | −9 |
| `button/switch-button` | 5,187 | 5,301 | 5,288 | −13 |
| `button/switch-icon-button` | 5,598 | 5,702 | 5,690 | −12 |
| `button/split-button` | 7,406 | 7,524 | 7,502 | −22 |
| `button-group/button-group` | 3,126 | 3,126 | 3,126 | 0 |
| `button-group/connected-button-group` | 3,888 | 3,888 | 3,888 | 0 |
| `complete` | 16,975 | 17,069 | 17,019 | −50 |

Against _before_, that is +87 to +101 B on the button rows and +44 B on `complete`. The core consumer gets smaller, and the two names, which no button row carried before, cost most of what it saves.

## CONTRIBUTING's new section

Revision 1 proposed wording for #96. **It becomes:**

> A child resolves the context through the DOM tree when it connects, once the parent it names is defined, so the link keeps no module state and holds in whatever order the two are defined.

It is project documentation, so it goes in #96 or in a documentation pull request of its own, not in this unit (`RD-32`).

## The report

Append a dated _Revision 2_ section to [`context-late-provider-report.md`](context-late-provider-report.md), and keep revision 1's text, which is the record of `13d64e449`. Include:

- each proof's result, with links to its saved output under `checks/`;
- the rows that gained an await under proof 3;
- the sizes in the three columns.

The architect dates `RF-69` when #100 merges.