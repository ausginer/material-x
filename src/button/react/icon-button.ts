import type * as React from 'react';
import type IconButton from '../icon-button.ts';
import type { IconButtonAttributes } from '../icon-button.ts';

export * from '../icon-button.ts';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
      'mx-icon-button': React.DetailedHTMLProps<
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
        React.HTMLAttributes<IconButton> & IconButtonAttributes,
        IconButton
      >;
    }
  }
}
