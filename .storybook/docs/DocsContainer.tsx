import {
  DocsContainer as OriginalDocsContainer,
  Unstyled,
  type DocsContainerProps,
} from '@storybook/addon-docs/blocks';
import type { JSX, PropsWithChildren } from 'react';

export function DocsContainer(
  props: PropsWithChildren<DocsContainerProps>,
): JSX.Element {
  return (
    <OriginalDocsContainer {...props}>
      <Unstyled>{props.children}</Unstyled>
    </OriginalDocsContainer>
  );
}
