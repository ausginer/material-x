import type * as React from 'react';
import type Icon from '../icon.ts';

export * from '../icon.ts';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
      'mx-icon': React.DetailedHTMLProps<React.HTMLAttributes<Icon>, Icon>;
    }
  }
}
