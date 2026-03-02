import {
  Source as OriginalSource,
  type SourceProps,
} from '@storybook/addon-docs/blocks';
import type { JSX } from 'react';

export function Source({ dark, ...other }: SourceProps): JSX.Element {
  return <OriginalSource dark={dark ?? true} {...other} />;
}
