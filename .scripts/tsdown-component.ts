import type { Rolldown } from 'tsdown';
import { constructLibraryTsdownPlugins } from './tsdown-library.ts';
import {
  constructCSSStyles,
  constructCSSTokens,
  constructHTMLTemplate,
} from './vite-plugins.ts';

function asRolldownPlugin(plugin: unknown): Rolldown.Plugin {
  return plugin as Rolldown.Plugin;
}

export function constructComponentTsdownPlugins(): Rolldown.Plugin[] {
  return [
    ...constructLibraryTsdownPlugins(),
    asRolldownPlugin(constructCSSStyles({ isProd: true })),
    asRolldownPlugin(constructHTMLTemplate()),
    asRolldownPlugin(constructCSSTokens({ isProd: true })),
  ];
}
