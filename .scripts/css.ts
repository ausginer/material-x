import { basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';
import MagicString from 'magic-string';
import type { SourceMap } from 'rollup';
import { compileStringAsync } from 'sass-embedded';
// eslint-disable-next-line import-x/no-unresolved
import * as sorcery from 'sorcery';
import functions from './sass-functions.js';
import { findFileUrl } from './utils.js';

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
    // import css from './style.css' with { type: 'css' };
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

function createSourcePath(previousURL: URL, ext: string) {
  const previousPath = fileURLToPath(previousURL);
  return new URL(
    `${basename(previousPath, extname(previousPath))}${ext}`,
    new URL('./', previousURL),
  );
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function compileCSS(
  url: URL,
  code: string,
): Promise<CSSCompilationResult> {
  const path = fileURLToPath(url);

  const { css: firstProcessedCode, loadedUrls } = await compileStringAsync(
    code,
    {
      url,
      functions,
      importers: [{ findFileUrl }],
    },
  );

  const { code: _secondProcessedCode, map: _secondProcessedSourceMap } =
    transform({
      filename: basename(path),
      code: encoder.encode(firstProcessedCode),
      minify: true,
      sourceMap: true,
      visitor: {
        StyleSheet(ss) {
          return {
            ...ss,
            licenseComments: [],
          };
        },
      },
    });

  const secondProcessedCode = decoder.decode(_secondProcessedCode);
  const secondProcessedMap = JSON.parse(
    decoder.decode(_secondProcessedSourceMap!),
  );

  if (!secondProcessedCode) {
    return {
      code: `const css = new CSSStyleSheet();export default css;`,
    };
  }

  const interPath = fileURLToPath(createSourcePath(url, '.min.css'));

  const m = new MagicString(secondProcessedCode);
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
      [interPath]: secondProcessedCode,
      [path]: firstProcessedCode,
    },
    sourcemaps: {
      [finalPath]: JSON.parse(compiledMap.toString()),
      [interPath]: secondProcessedMap,
    },
  });

  const map = chain.apply();
  map.sources = map.sources.map((source) => basename(source));

  return {
    code: compiled,
    map,
    urls: loadedUrls,
  };
}
