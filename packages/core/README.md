# @ydinjs/core

A framework-agnostic foundation for building custom elements. It provides a controller-based lifecycle, a trait composition system for attribute-backed properties, and a set of ready-made controllers for common Web Components patterns.

## Installation

```bash
npm install @ydinjs/core
```

## Core Concepts

### ControlledElement

`ControlledElement` is the base class for all custom elements. It forwards DOM lifecycle callbacks to registered controllers and exposes `ElementInternals`.

```ts
import {
  ControlledElement,
  use,
  getInternals,
  define,
} from '@ydinjs/core/element.js';

class MyElement extends ControlledElement {
  constructor() {
    super();
    use(this, myController); // register a controller
    const internals = getInternals(this); // access ElementInternals
  }
}

define('my-element', MyElement);
```

An `ElementController` is any object with optional lifecycle methods:

```ts
import type { ElementController } from '@ydinjs/core/element.js';

const myController: ElementController = {
  connected() {
    /* element connected to DOM */
  },
  disconnected() {
    /* element disconnected */
  },
  attrChanged(name, oldValue, newValue) {
    /* observed attribute changed */
  },
};
```

### Attribute Converters

`Bool`, `Num`, and `Str` map HTML attributes to typed JS properties.

```ts
import { Bool, Num, Str } from '@ydinjs/core/attribute.js';
```

| Converter | HTML attribute     | JS property        |
| --------- | ------------------ | ------------------ |
| `Bool`    | presence / absence | `true` / `false`   |
| `Num`     | `"42"`             | `42` / `null`      |
| `Str`     | `"hello"`          | `"hello"` / `null` |

### Traits

Traits add attribute-backed properties to an element class without manual `observedAttributes` wiring.

```ts
import { trait, impl } from '@ydinjs/core/traits/attributes.js';
import { Bool, Str } from '@ydinjs/core/attribute.js';

const brand = Symbol('MyTrait');
const MyTrait = trait({ disabled: Bool, label: Str }, brand);

// Compose with ControlledElement (or any subclass)
const MyCore = impl(ControlledElement, [MyTrait] as const);

class MyElement extends MyCore {
  constructor() {
    super();
    // this.disabled → boolean
    // this.label    → string | null
  }
}
```

Pre-built traits:

```ts
import { Disableable } from '@ydinjs/core/traits/disableable.js'; // disabled: boolean
import { Valuable } from '@ydinjs/core/traits/valuable.js'; // value: string | null
import { Checkable } from '@ydinjs/core/traits/checkable.js'; // checked: boolean, indeterminate: boolean
```

### Controllers

All controllers are registered with `use(host, controller)` in the constructor.

| Import | Purpose |
| --- | --- |
| `@ydinjs/core/controllers/useShadowDOM.js` | Attach shadow root, adopt stylesheets |
| `@ydinjs/core/controllers/useAttributes.js` | Mirror host attributes to an internal element |
| `@ydinjs/core/controllers/useARIA.js` | Sync `aria-*` host attributes to `ElementInternals` |
| `@ydinjs/core/controllers/useAnchor.js` | Wire host navigation attrs to a shadow anchor |
| `@ydinjs/core/controllers/useContext.js` | Lightweight provider / consumer context |
| `@ydinjs/core/controllers/useEvents.js` | Declarative event listener registration |
| `@ydinjs/core/controllers/useConnected.js` | Connected / disconnected callbacks |
| `@ydinjs/core/controllers/useSlot.js` | React to slot content changes |
| `@ydinjs/core/controllers/useRovingTabindex.js` | Keyboard focus management for groups |
| `@ydinjs/core/controllers/useKeyboard.js` | Keyboard event handling |
| `@ydinjs/core/controllers/useMutationObserver.js` | DOM mutation tracking |
| `@ydinjs/core/controllers/useResizeObserver.js` | Element resize tracking |

### Utils

```ts
import {
  $,
  $$,
  createEventNotifier,
  toggleState,
} from '@ydinjs/core/utils/DOM.js';

$(host, selector); // host.shadowRoot?.querySelector(selector)
$$(host, selector); // host.shadowRoot?.querySelectorAll(selector)
const notify = createEventNotifier({
  input: { cancelable: false },
  change: { cancelable: false, composed: false },
});
notify(host, 'input', 'change'); // create and dispatch configured events in order
toggleState(internals, 'checked', true); // add/remove a custom state from ElementInternals.states
```

## Building a Component

```ts
import { ControlledElement, define } from '@ydinjs/core/element.js';
import { trait, impl } from '@ydinjs/core/traits/traits.js';
import { Disableable } from '@ydinjs/core/traits/disableable.js';
import { useShadowDOM } from '@ydinjs/core/controllers/useShadowDOM.js';
import {
  useAttributes,
  transfer,
} from '@ydinjs/core/controllers/useAttributes.js';
import { Str } from '@ydinjs/core/attribute.js';
import { $ } from '@ydinjs/core/utils/DOM.js';

const brand = Symbol('MyButton');
const MyButtonTrait = trait({ color: Str }, brand);
const MyButtonCore = impl(ControlledElement, [
  MyButtonTrait,
  Disableable,
] as const);

const template = document.createElement('template');
template.innerHTML = `<button type="button"><slot></slot></button>`;

const styles = new CSSStyleSheet();
styles.replaceSync(`
  :host { display: inline-flex; }
  button { all: inherit; cursor: pointer; }
  :host([disabled]) button { opacity: 0.38; pointer-events: none; }
`);

class MyButton extends MyButtonCore {
  static override readonly formAssociated = true;

  constructor() {
    super();
    useShadowDOM(this, [template], [styles]);

    const button = $(this, 'button')!;
    useAttributes(this, {
      disabled: transfer(button, 'disabled'),
    });
  }
}

define('my-button', MyButton);
```

## License

Apache-2.0