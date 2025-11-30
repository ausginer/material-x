/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type LinkButton from '../link-button.ts';
import type { LinkButtonAttributes } from '../link-button.ts';

export * from '../link-button.ts';

type LinkButtonJSX = DetailedHTMLProps<
  HTMLAttributes<LinkButton> & LinkButtonAttributes,
  LinkButton
>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-link-button': LinkButtonJSX;
    }
  }
}
