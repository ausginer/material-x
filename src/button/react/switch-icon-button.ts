import type * as React from 'react';
import type SwitchIconButton from '../switch-icon-button.ts';
import type { SwitchIconButtonAttributes } from '../switch-icon-button.ts';

export * from '../switch-icon-button.ts';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
      'mx-switch-icon-button': React.DetailedHTMLProps<
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
        React.HTMLAttributes<SwitchIconButton> & SwitchIconButtonAttributes,
        SwitchIconButtonAttributes
      >;
    }
  }
}
