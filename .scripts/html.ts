import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  GenMapping,
  addMapping,
  setSourceContent,
  toEncodedMap,
} from '@jridgewell/gen-mapping';
import minifier from '@minify-html/node';
import MagicString from 'magic-string';
import type { SourceMap } from 'rollup';
// eslint-disable-next-line import-x/no-unresolved
import * as sorcery from 'sorcery';
import { createSourcePath } from './utils.ts';

export type HTMLCompilationResult = Readonly<{
  code: string;
  map: SourceMap;
}>;

const MINIFY_CONFIG = {
  minify_css: true,
  minify_js: true,
  keep_comments: false,
} as const;

function locAtEndOf(text: string): { line: number; column: number } {
  // sourcemap: line 1-based, column 0-based
  let line = 1;
  let lastLineStart = 0;

  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      // '\n'
      line++;
      lastLineStart = i + 1;
    }
  }

  return { line, column: text.length - lastLineStart };
}

export async function compileHTML(
  source: string,
  id: string,
): Promise<HTMLCompilationResult> {
  const url = pathToFileURL(id);

  const minified = JSON.stringify(
    minifier.minify(Buffer.from(source), MINIFY_CONFIG).toString(),
  );

  const interPath = fileURLToPath(createSourcePath(url, '.min.html'));

  const map = new GenMapping({ file: interPath, sourceRoot: '' });
  setSourceContent(map, id, source);

  addMapping(map, {
    generated: { line: 1, column: 0 },
    source: id,
    original: { line: 1, column: 0 },
  });

  const srcEnd = locAtEndOf(source);
  addMapping(map, {
    generated: { line: 1, column: minified.length },
    source: id,
    original: srcEnd,
  });

  const m = new MagicString(minified);
  m.prepend(`const tpl = document.createElement('template');tpl.innerHTML = `);
  m.append(';export default tpl;');

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
      [interPath]: minified,
      [id]: source,
    },
    sourcemaps: {
      [finalPath]: JSON.parse(compiledMap.toString()),
      [interPath]: toEncodedMap(map),
    },
  });

  return {
    code: compiled,
    map: chain.apply(),
  };
}
