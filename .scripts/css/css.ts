import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import MagicString from 'magic-string';
import type { SourceMap } from 'rollup';
// eslint-disable-next-line import-x/no-unresolved
import * as sorcery from 'sorcery';
import { createSourcePath, cssCache, type JSONModule } from '../utils.ts';
import { CSS_VARIABLE_NAME_REGEXP } from './collect-props.ts';
import format from './format.ts';
import transform from './transform.ts';

const { default: propList }: JSONModule<Readonly<Record<string, string>>> =
  await import(fileURLToPath(new URL('css-private-props.json', cssCache)), {
    with: { type: 'json' },
  });

export type CSSImportParseResult = Readonly<{
  code: string;
  files: Set<string>;
}>;

export function parseCSSImports(
  code: string,
  replace = false,
): CSSImportParseResult {
  const files = new Set<string>();

  code = code.replaceAll(
    // Matches import statements like:
    // ```ts
    // import css from './style.css.ts' with { type: 'css' };
    // ```
    /["'](.*)["']\s*with\s*\{\s*type:\s*['"]css['"]\s*\};/giu,
    (substring, file) => {
      files.add(file);
      return replace ? `'${file}.js'` : substring;
    },
  );

  return { code, files };
}

export type CSSCompilationResult = Readonly<{
  code: string;
  map?: SourceMap;
  urls?: readonly URL[];
}>;

export type CompileCSSOptions = Readonly<{
  isProd: boolean;
}>;

export async function compileCSS(
  url: URL,
  code: string,
  options?: CompileCSSOptions,
): Promise<CSSCompilationResult> {
  const path = fileURLToPath(url);

  let css = options?.isProd
    ? code.replace(CSS_VARIABLE_NAME_REGEXP, (propName) => {
        const mangled = propList[propName];

        if (!mangled) {
          throw new Error(`Property ${propName} is not collected.`);
        }

        return mangled;
      })
    : code;

  const fileName = basename(path);

  const { code: processedCode, map: processedMap } = transform(
    await format(css, fileName),
    fileName,
    true,
  );

  if (!processedCode) {
    return {
      code: `export default new CSSStyleSheet();`,
    };
  }

  const interPath = fileURLToPath(createSourcePath(url, '.min.css'));

  const m = new MagicString(processedCode);
  m.prepend('const css = new CSSStyleSheet();css.replaceSync(`');
  m.append('`);export default css;');

  const compiled = m.toString();
  const compiledMap = m.generateMap({
    hires: true,
    source: interPath,
    includeContent: true,
  });

  const finalPath = fileURLToPath(createSourcePath(url, '.min.js'));

  const chain = await sorcery.load(finalPath, {
    content: {
      [finalPath]: compiled,
      [interPath]: processedCode,
      [path]: code,
    },
    sourcemaps: {
      [finalPath]: JSON.parse(compiledMap.toString()),
      [interPath]: processedMap,
    },
  });

  const map = chain.apply();
  map.sources = map.sources.map((source) => basename(source));

  return {
    code: compiled,
    map,
  };
}
