/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type SwitchButton from '../switch-button.ts';
import type { SwitchButtonAttributes } from '../switch-button.ts';

export * from '../switch-button.ts';

type SwitchButtonJSX = DetailedHTMLProps<
  HTMLAttributes<SwitchButton> & SwitchButtonAttributes,
  SwitchButton
>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-switch-button': SwitchButtonJSX;
    }
  }
}
