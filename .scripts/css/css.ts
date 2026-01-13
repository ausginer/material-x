import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import MagicString from 'magic-string';
import type { SourceMap } from 'rollup';
import { cssCache, type JSONModule } from '../utils.ts';
import { CSS_VARIABLE_NAME_REGEXP } from './collect-props.ts';
import format from './format.ts';
import transform from './transform.ts';

const { default: propList }: JSONModule<Readonly<Record<string, string>>> =
  await import(fileURLToPath(new URL('css-private-props.json', cssCache)), {
    with: { type: 'json' },
  });

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
  const cssPath = path.replace(/\.ts$/, '');

  let css = options?.isProd
    ? code.replace(CSS_VARIABLE_NAME_REGEXP, (propName) => {
        const mangled = propList[propName];

        if (!mangled) {
          throw new Error(`Property ${propName} is not collected.`);
        }

        return mangled;
      })
    : code;

  const fileName = basename(cssPath);

  const { code: processedCode } = transform(
    await format(css, fileName),
    fileName,
    false,
    options?.isProd,
  );

  if (!processedCode) {
    return {
      code: `export default new CSSStyleSheet();`,
    };
  }

  const m = new MagicString(processedCode);
  m.prepend('const css = new CSSStyleSheet();css.replaceSync(`');
  m.append('`);export default css;');

  const compiled = m.toString();
  const compiledMap = m.generateMap({
    hires: true,
    source: cssPath,
    includeContent: true,
  });

  return {
    code: compiled,
    map: compiledMap,
  };
}
