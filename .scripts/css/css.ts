import { basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';
import MagicString from 'magic-string';
import type { SourceMap } from 'rollup';
// eslint-disable-next-line import-x/no-unresolved
import * as sorcery from 'sorcery';
import { createMangler } from './css-prop-mangler.ts';

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

function createSourcePath(previousURL: URL, ext: string) {
  const previousPath = fileURLToPath(previousURL);
  return new URL(
    `${basename(previousPath, extname(previousPath))}${ext}`,
    new URL('./', previousURL),
  );
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type CompileCSSOptions = Readonly<{
  isProd: boolean;
}>;

export async function compileCSS(
  url: URL,
  code: string,
  options?: CompileCSSOptions,
): Promise<CSSCompilationResult> {
  const path = fileURLToPath(url);

  const { code: encodedProcessedCode, map: encodedProcessedSourceMap } =
    transform({
      filename: basename(path),
      code: encoder.encode(code),
      minify: true,
      sourceMap: true,
      ...(options?.isProd ? { visitor: createMangler() } : {}),
    });

  const processedCode = decoder.decode(encodedProcessedCode);
  const processedMap = JSON.parse(decoder.decode(encodedProcessedSourceMap!));

  if (!processedCode) {
    return {
      code: `const css = new CSSStyleSheet();export default css;`,
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
