import type { MaterialTheme } from './MaterialTheme.ts';
import type { JSONModule } from './utils.ts';

// The URL resolves to `src/default-theme.json` from the source and to the copy
// the build places beside `theme.js` from the package root.
const themeModule: JSONModule<MaterialTheme> = await import(
  String(new URL('./default-theme.json', import.meta.url)),
  { with: { type: 'json' } }
);

/** The Material Theme Builder export whose `md.sys.color` values tproc uses. */
const theme: MaterialTheme = themeModule.default;

export default theme;
