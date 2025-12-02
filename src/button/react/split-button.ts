/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type SplitButton from '../split-button.ts';
import type { SplitButtonAttributes } from '../split-button.ts';

export * from '../split-button.ts';

type SplitButtonJSX = DetailedHTMLProps<
  HTMLAttributes<SplitButton> & SplitButtonAttributes,
  SplitButton
>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-split-button': SplitButtonJSX;
    }
  }
}
