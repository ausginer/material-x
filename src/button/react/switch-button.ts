import * as React from 'react';
import type SwitchButton from '../switch-button.ts';
import type { SwitchButtonAttributes } from '../switch-button.ts';
export * from '../switch-button.ts';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-switch-button': React.DetailedHTMLProps<
        React.HTMLAttributes<SwitchButton> & SwitchButtonAttributes,
        SwitchButton
      >;
    }
  }
}
