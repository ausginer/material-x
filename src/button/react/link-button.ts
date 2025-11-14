import * as React from 'react';
import type LinkButton from '../link-button.ts';
import type { LinkButtonAttributes } from '../link-button.ts';
export * from '../button.ts';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-link-button': React.DetailedHTMLProps<
        React.HTMLAttributes<LinkButton> & LinkButtonAttributes,
        LinkButton
      >;
    }
  }
}
