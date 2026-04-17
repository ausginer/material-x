# ydin

A framework-agnostic foundation for building custom elements. It provides a controller-based lifecycle, a trait composition system for attribute-backed properties, and a set of ready-made controllers for common Web Components patterns.

## Installation

```bash
npm install ydin
```

## Core Concepts

### ControlledElement

`ControlledElement` is the base class for all custom elements. It forwards DOM lifecycle callbacks to registered controllers and exposes `ElementInternals`.

```ts
import { ControlledElement, use, getInternals, define } from 'ydin/element.js';

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
import type { ElementController } from 'ydin/element.js';

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
import { Bool, Num, Str } from 'ydin/attribute.js';
```

| Converter | HTML attribute     | JS property        |
| --------- | ------------------ | ------------------ |
| `Bool`    | presence / absence | `true` / `false`   |
| `Num`     | `"42"`             | `42` / `null`      |
| `Str`     | `"hello"`          | `"hello"` / `null` |

### Traits

Traits add attribute-backed properties to an element class without manual `observedAttributes` wiring.

```ts
import { trait, impl } from 'ydin/traits/traits.js';
import { Bool, Str } from 'ydin/attribute.js';

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
import { Disableable } from 'ydin/traits/disableable.js'; // disabled: boolean
import { Valuable } from 'ydin/traits/valuable.js'; // value: string | null
import { Checkable } from 'ydin/traits/checkable.js'; // checked: boolean, indeterminate: boolean
```

### Controllers

All controllers are registered with `use(host, controller)` in the constructor.

| Import                                    | Purpose                                             |
| ----------------------------------------- | --------------------------------------------------- |
| `ydin/controllers/useShadowDOM.js`        | Attach shadow root, adopt stylesheets               |
| `ydin/controllers/useAttributes.js`       | Mirror host attributes to an internal element       |
| `ydin/controllers/useARIA.js`             | Sync `aria-*` host attributes to `ElementInternals` |
| `ydin/controllers/useContext.js`          | Lightweight provider / consumer context             |
| `ydin/controllers/useEvents.js`           | Declarative event listener registration             |
| `ydin/controllers/useConnected.js`        | Connected / disconnected callbacks                  |
| `ydin/controllers/useSlot.js`             | React to slot content changes                       |
| `ydin/controllers/useRovingTabindex.js`   | Keyboard focus management for groups                |
| `ydin/controllers/useKeyboard.js`         | Keyboard event handling                             |
| `ydin/controllers/useMutationObserver.js` | DOM mutation tracking                               |
| `ydin/controllers/useResizeObserver.js`   | Element resize tracking                             |

### Utils

```ts
import { $, $$, notify, toggleState } from 'ydin/utils/DOM.js';

$(host, selector); // host.shadowRoot?.querySelector(selector)
$$(host, selector); // host.shadowRoot?.querySelectorAll(selector)
notify(host, 'change', 'input'); // dispatch multiple bubbling composed events in order
toggleState(internals, 'checked', true); // add/remove a custom state from ElementInternals.states
```

## Building a Component

```ts
import { ControlledElement, define } from 'ydin/element.js';
import { trait, impl } from 'ydin/traits/traits.js';
import { Disableable } from 'ydin/traits/disableable.js';
import { useShadowDOM } from 'ydin/controllers/useShadowDOM.js';
import { useAttributes, transfer } from 'ydin/controllers/useAttributes.js';
import { Str } from 'ydin/attribute.js';
import { $ } from 'ydin/utils/DOM.js';

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