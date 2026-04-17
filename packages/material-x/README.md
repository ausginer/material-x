# @ausginer/material-x

Material X is a set of framework-agnostic Web Components inspired by Material Design 3 (Expressive), with a token-driven styling system.

Project status: early-stage / pre-release.

## Components

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
- `mx-multiline-text-field`

## Installation

```bash
npm install @ausginer/material-x
```

## Quick Start (Vanilla)

```js
import '@ausginer/material-x/button/button.js';
import '@ausginer/material-x/button/icon-button.js';

const button = document.createElement('mx-button');
button.textContent = 'Save';
document.body.append(button);
```

## Quick Start (React)

```jsx
import { useState } from 'react';
import '@ausginer/material-x/button/button.js';
import '@ausginer/material-x/button/switch-button.js';

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

```bash
npm run docs:dev   # start Storybook locally
npm run docs:build # build the demo
```

## Usage Notes

All components are designed as controlled: they reflect state through attributes/properties and fire events, but do not update themselves. Your app is responsible for writing state back.

- For switch variants, update `checked` in response to `change`.
- For `mx-text-field`, update `value` in response to `input` or `change`.
- For `mx-button-group` / `mx-connected-button-group`, provide an accessible group label (`aria-label` or `aria-labelledby`) in your app.
- For `mx-text-field`, always provide a visible or explicit accessible label.

Form-participating components (`mx-button`, `mx-icon-button`, `mx-split-button`, `mx-switch-button`, `mx-switch-icon-button`, `mx-text-field`, `mx-multiline-text-field`) use `formAssociated = true` and integrate natively with `<form>` — no wrappers needed.

## License

Apache-2.0