import { basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pxToRem from '@minko-fe/postcss-pxtorem';
import cssnanoPlugin from 'cssnano';
import MagicString from 'magic-string';
import postcss from 'postcss';
import type { SourceMap } from 'rollup';
import { type CanonicalizeContext, compileStringAsync } from 'sass-embedded';
// eslint-disable-next-line import-x/no-unresolved
import * as sorcery from 'sorcery';

const cssTransformer = postcss([
  pxToRem({
    unitPrecision: 3,
    propList: ['*'],
  }),
  cssnanoPlugin(),
]);

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

const root = new URL('../', import.meta.url);
const nodeModules = new URL('node_modules/', root);

export async function compileCSS(
  url: URL,
  code: string,
): Promise<CSSCompilationResult> {
  const path = fileURLToPath(url);

  const {
    css: firstProcessedCode,
    sourceMap: firstProcessedMap,
    loadedUrls,
  } = await compileStringAsync(code, {
    url,
    sourceMap: true,
    sourceMapIncludeSources: true,
    importers: [
      {
        findFileUrl(
          url: string,
          { containingUrl }: CanonicalizeContext,
        ): URL | null {
          if (url.startsWith('~')) {
            return new URL(url.substring(1), nodeModules);
          } else if (containingUrl?.pathname.includes('node_modules/')) {
            return new URL(url, nodeModules);
          }

          return null;
        },
      },
    ],
  });

  const [secondProcessedCode, secondProcessedMap] = await cssTransformer
    .process(firstProcessedCode, {
      map: {
        from: path,
        inline: false,
        annotation: false,
        prev: firstProcessedMap,
      },
      from: path,
    })
    .then(({ content: c, map }) => [c, map.toJSON()] as const);

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
      [path]: code,
    },
    sourcemaps: {
      [finalPath]: JSON.parse(compiledMap.toString()),
      [interPath]: secondProcessedMap,
    },
  });

  return {
    code: compiled,
    map: chain.apply(),
    urls: loadedUrls,
  };
}
