/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type SwitchIconButton from '../switch-icon-button.ts';
import type { SwitchIconButtonAttributes } from '../switch-icon-button.ts';

export * from '../switch-icon-button.ts';

type SwitchIconButtonJSX = DetailedHTMLProps<
  HTMLAttributes<SwitchIconButton> & SwitchIconButtonAttributes,
  SwitchIconButtonAttributes
>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-switch-icon-button': SwitchIconButtonJSX;
    }
  }
}
