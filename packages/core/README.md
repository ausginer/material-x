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

A trait is a plain class. It adds attribute-backed properties, or methods and accessors, to an element class without manual `observedAttributes` wiring. A component names its base and its traits once, in the annotation of a constant:

```ts
import { Bool, Str } from '@ydinjs/core/attribute.js';
import { ControlledElement } from '@ydinjs/core/element.js';
import {
  AnyElement,
  attributes,
} from '@ydinjs/core/traits/attribute-traits.js';
import {
  compose,
  trait,
  type Composed,
} from '@ydinjs/core/traits/composition.js';

@trait
@attributes({ disabled: Bool, label: Str })
export class Labelled extends AnyElement {
  accessor disabled!: boolean;
  accessor label!: string | null;
}

const MyCore: Composed<typeof ControlledElement, [typeof Labelled]> =
  compose(ControlledElement);

class MyElement extends MyCore {
  constructor() {
    super();
    // this.disabled → boolean
    // this.label    → string | null
  }
}
```

`@ydinjs/vite-traits-plugin` is a required build step. In a trait's own build it compiles `@trait`, and turns each `accessor` line that `@attributes(TABLE)` declares into a getter and a setter that read and write the attribute through the table's converter. In a component's build it copies each trait's members into the class, in list order, merges `observedAttributes` with the base's, and brands the class, so `element instanceof Labelled` is `true`. Without the plugin, a trait's or a component's module fails when it is evaluated: `@trait`, `@attributes()` and `compose()` throw.

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
import {
  AnyElement,
  attributes,
} from '@ydinjs/core/traits/attribute-traits.js';
import {
  compose,
  trait,
  type Composed,
} from '@ydinjs/core/traits/composition.js';
import { Disableable } from '@ydinjs/core/traits/disableable.js';
import { useShadowDOM } from '@ydinjs/core/controllers/useShadowDOM.js';
import {
  useAttributes,
  transfer,
} from '@ydinjs/core/controllers/useAttributes.js';
import { Str } from '@ydinjs/core/attribute.js';
import { $ } from '@ydinjs/core/utils/DOM.js';

@trait
@attributes({ color: Str })
class Colored extends AnyElement {
  accessor color!: string | null;
}

const MyButtonCore: Composed<
  typeof ControlledElement,
  [typeof Colored, typeof Disableable]
> = compose(ControlledElement);

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