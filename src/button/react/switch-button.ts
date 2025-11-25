import type * as React from 'react';
import type SwitchButton from '../switch-button.ts';
import type { SwitchButtonAttributes } from '../switch-button.ts';

export * from '../switch-button.ts';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
      'mx-switch-button': React.DetailedHTMLProps<
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
        React.HTMLAttributes<SwitchButton> & SwitchButtonAttributes,
        SwitchButton
      >;
    }
  }
}
