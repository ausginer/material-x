# Material X

Material X is a set of framework-agnostic Web Components inspired by Material
Design 3 (Expressive), with a token-driven styling system.

Project status: early-stage / pre-release.

## Components

Current custom elements in the repo:

- `mx-button`
- `mx-icon-button`
- `mx-link-button`
- `mx-split-button`
- `mx-switch-button`
- `mx-switch-icon-button`
- `mx-button-group`
- `mx-connected-button-group`
- `mx-fab`
- `mx-icon`
- `mx-text-field`

## Installation

Node.js `>=24` is required for local development.

```bash
npm install
```

## Quick Start (Vanilla)

```js
import 'material-x/button/button.js';
import 'material-x/button/icon-button.js';

const button = document.createElement('mx-button');
button.textContent = 'Save';
document.body.append(button);
```

## Quick Start (React)

```jsx
import { useState } from 'react';
import 'material-x/button/button.js';
import 'material-x/button/switch-button.js';

export function App() {
  const [enabled, setEnabled] = useState(false);

  return (
    <>
      <mx-button>Save</mx-button>
      <mx-switch-button
        checked={enabled}
        onChange={() => {
          setEnabled((value) => !value);
        }}
      >
        Notifications
      </mx-switch-button>
    </>
  );
}
```

## Local Demo

Run Storybook locally:

```bash
npm run demo:dev
```

Build the demo:

```bash
npm run docs
```

## Usage Notes

- Switch variants are currently best used as controlled components:
  update `checked` in response to `change`.
- For `mx-button-group` / `mx-connected-button-group`, provide an accessible
  group label (`aria-label` or `aria-labelledby`) in your app.
- For `mx-text-field`, always provide a visible or explicit accessible label.

## License

Apache-2.0