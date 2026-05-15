# Attribute vs Custom State Styling

Material X components often have two possible CSS hooks for the same visual condition:

- a public attribute, such as `[disabled]`, `[selected]`, or `[color='elevated']`
- an internal custom state, such as `:state(disabled)`, `:state(selected)`, or `:state(elevated)`

Both are useful, but they describe different layers of the component model.

## Public Attributes

Attributes are the public API. They are authored by users, visible in markup, and available before the custom element is upgraded.

```css
:host([disabled]) {
}
:host([selected]) {
}
:host([color='elevated']) {
}
```

### Advantages

- Declarative and easy to inspect in DevTools.
- Works before JavaScript upgrades the element, which helps first paint and SSR.
- Clearly documents the public contract: if the user sets the attribute, styles follow.
- Requires no runtime synchronization for simple standalone states.
- Universally supported and simple for generated selectors.

### Disadvantages

- Represents authored input, not necessarily the effective state.
- Becomes awkward when state is contextual, inherited, or resolved from multiple sources.
- Pushes precedence logic into CSS when parent context can provide defaults:

  ```css
  :host([color='elevated']),
  :host(:state(elevated):not([color])) {
  }
  ```

- Parent components would need to mutate child attributes to project context — which breaks the contract that attributes are authored by users, not by the component tree.

## Custom States

Custom states are the component's internal, resolved styling model. They are set through `ElementInternals.states` and consumed with `:state(...)`.

```css
:host(:state(disabled)) {
}
:host(:state(selected)) {
}
:host(:state(elevated)) {
}
```

### Advantages

- Represents the effective condition rather than only the authored attribute.
- Lets CSS ignore where a state came from: own attribute, parent group, default, controller, or future context.
- Keeps generated token selectors smaller and more uniform.
- Gives parent components a clean way to project context into children without mutating public attributes.
- Supports private/derived states that should not become public API, such as `has-lead`, `group-start`, or `pressed`.

### Disadvantages

- Requires the custom element to be upgraded before the selector can match.
- Less visible in markup; the source of a visual state is not as obvious from HTML alone.
- Can create hidden duplicate sources of truth if attributes and states are not resolved in one place.
- Less useful for consumer-authored external CSS, because custom states are an internal component styling surface.

## Native Pseudo-Classes

Native pseudo-classes such as `:disabled` are preferred on native elements because they represent browser-owned semantics, not just attributes.

```css
button:disabled {
}
```

For autonomous custom elements, a host attribute does not automatically make the host match native pseudo-classes:

```html
<mx-list-button-item disabled></mx-list-button-item>
```

```css
:host(:disabled) {
  /* Does not match only because the custom element has [disabled]. */
}
```

When a component has an internal native control, native pseudo-classes remain useful on that internal element:

```css
.host:disabled {
}
```

But host-level token generation should not rely on native pseudo-classes unless the host itself has the relevant browser semantics.

## Why not reflect resolved state back to attributes?

A common alternative is to resolve effective state in JS and write it back as an attribute — for example, setting `disabled` on a child when a parent group is disabled. This avoids the upgrade-dependency of `:state()` and keeps attributes as the sole styling surface.

Material X rejects this pattern for the same reason the browser rejects it. When a `<button>` inside a `<fieldset disabled>` becomes disabled, the browser does not stamp `disabled` onto the `<button>` element — it simply makes `:disabled` match. The attribute on the element remains what the author wrote. Mutating a child's attribute to reflect a parent's state conflates the public contract (what the developer authored) with the resolved runtime condition (what the component tree produced). These are separate concerns and should be represented separately.

Custom states are the web platform's intended mechanism for this second layer. Attributes remain the author's input; states carry the component's resolved answer.

## SSR and pre-upgrade rendering

Because the flow is strictly `attribute → state` (never the reverse), the original authored attribute is always present in SSR-rendered HTML. For the window before JavaScript upgrades the element, `[disabled]` or `[color]` attribute selectors can be used as a CSS fallback if needed — the attribute is reliably there because nothing in the component tree mutates it.

## Decision

Material X treats public attributes as **inputs** and custom states as the CSS-facing **resolved styling model**. This mirrors the browser's own separation: attribute = what the author wrote, pseudo-class / state = what is effectively true.

Component logic should resolve all relevant inputs into custom states:

```ts
effectiveColor = ownColor ?? groupColor ?? defaultColor;
effectiveDisabled = ownDisabled || groupDisabled;
```

Token and variant CSS should target resolved states:

```css
:host(:state(elevated)) {
}
:host(:state(disabled)) {
}
:host(:state(selected)) {
}
```

Public attributes remain the external API and should be documented and transferred to native or ARIA targets where appropriate. They should not be treated as the primary styling surface.

**When to use each:**

- Use **custom states** for any condition that can come from more than one source: parent context, group membership, internal resolution, or own attribute. This is the default for interactive and variant states.
- Use **attributes directly** in CSS only when the condition is purely local and authored — it will never be set by a parent, a controller, or internal logic — and no contextual resolution is expected now or in the future.
