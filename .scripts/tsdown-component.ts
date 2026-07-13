// oxlint-disable typescript/no-unsafe-type-assertion
import type { Rolldown } from 'tsdown';
import { constructLibraryTsdownPlugins } from './tsdown-library.ts';
import {
  constructCSSStyles,
  constructCSSTokens,
  constructHTMLTemplate,
} from '@ydinjs/vite-custom-element-assets';

export function constructComponentTsdownPlugins(): Rolldown.Plugin[] {
  return [
    ...constructLibraryTsdownPlugins(),
    constructCSSStyles({ isProd: true }),
    constructHTMLTemplate(),
    constructCSSTokens({ isProd: true }),
  ];
}
