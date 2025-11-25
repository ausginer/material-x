import type * as React from 'react';
import type LinkButton from '../link-button.ts';
import type { LinkButtonAttributes } from '../link-button.ts';

export * from '../button.ts';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
      'mx-link-button': React.DetailedHTMLProps<
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
        React.HTMLAttributes<LinkButton> & LinkButtonAttributes,
        LinkButton
      >;
    }
  }
}
