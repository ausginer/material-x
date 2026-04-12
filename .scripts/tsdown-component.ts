// oxlint-disable typescript/no-unsafe-type-assertion
import type { Rolldown } from 'tsdown';
import { constructLibraryTsdownPlugins } from './tsdown-library.ts';
import {
  constructCSSStyles,
  constructCSSTokens,
  constructHTMLTemplate,
} from './vite-plugins.ts';

export function constructComponentTsdownPlugins(): readonly Rolldown.Plugin[] {
  return [
    ...constructLibraryTsdownPlugins(),
    constructCSSStyles({ isProd: true }),
    constructHTMLTemplate(),
    constructCSSTokens({ isProd: true }),
  ];
}
