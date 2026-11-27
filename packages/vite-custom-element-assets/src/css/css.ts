import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RolldownMagicString, type SourceMapInput } from 'rolldown';
import { escapeTemplateLiteral, loadPropList } from '../utils.ts';
import format from './format.ts';
import transform from './transform.ts';

const CSS_VARIABLE_NAME_REGEXP = /(--_[\w-]+)/gu;

export type CSSCompilationResult = Readonly<{
  code: string;
  map?: SourceMapInput;
  urls?: readonly URL[];
}>;

export type CompileCSSOptions = Readonly<{
  isProd?: boolean;
}>;

export async function compileCSS(
  url: URL,
  code: string,
  options?: CompileCSSOptions,
): Promise<CSSCompilationResult> {
  const path = fileURLToPath(url);
  const cssPath = path.replace(/\.ts$/u, '');

  const propList = options?.isProd ? await loadPropList() : undefined;
  const css = propList
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
    {
      minify: options?.isProd,
      sourceMap: options?.isProd,
    },
  );

  if (!processedCode) {
    return {
      code: `export default new CSSStyleSheet();`,
    };
  }

  const escaped = escapeTemplateLiteral(processedCode);
  const m = new RolldownMagicString(escaped);
  m.prepend('const css = new CSSStyleSheet();css.replaceSync(`');
  m.append('`);export default css;');

  const compiled = m.toString();
  const compiledMap = m
    .generateMap({
      hires: true,
      source: cssPath,
      includeContent: true,
    })
    .toString();

  return {
    code: compiled,
    map: compiledMap,
  };
}
