import type * as React from 'react';
import type Button from '../button.ts';
import type { ButtonAttributes } from '../button.ts';

export * from '../button.ts';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
      'mx-button': React.DetailedHTMLProps<
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
        React.HTMLAttributes<Button> & ButtonAttributes,
        Button
      >;
    }
  }
}
