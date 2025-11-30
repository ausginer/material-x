/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type IconButton from '../icon-button.ts';
import type { IconButtonAttributes } from '../icon-button.ts';

export * from '../icon-button.ts';

type IconButtonJSX = DetailedHTMLProps<
  HTMLAttributes<IconButton> & IconButtonAttributes,
  IconButton
>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-icon-button': IconButtonJSX;
    }
  }
}
