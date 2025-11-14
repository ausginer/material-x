import * as React from 'react';
import type IconButton from '../icon-button.ts';
import type { IconButtonAttributes } from '../icon-button.ts';
export * from '../icon-button.ts';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-icon-button': React.DetailedHTMLProps<
        React.HTMLAttributes<IconButton> & IconButtonAttributes,
        IconButton
      >;
    }
  }
}
