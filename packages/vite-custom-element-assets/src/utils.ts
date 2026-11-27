import { basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root: URL = new URL('../../', import.meta.url);
export const cssCache: URL = new URL('node_modules/.cache/css/', root);

export type JSONModule<T> = Readonly<{
  default: T;
}>;

export type JSModule<T> = Readonly<{
  default: T;
}>;

/** Each private custom property's name, mapped to its mangled name. */
export type PropList = Readonly<Record<string, string>>;

let propList: Promise<PropList> | undefined;

/**
 * The private-property list that a production build mangles the names with,
 * read once, on its first use. Only `just build-prepare` in
 * `packages/material-x` writes it, so a tree without one reads it only when it
 * builds, and the error names that step.
 */
export function loadPropList(): Promise<PropList> {
  const url = new URL('css-private-props.json', cssCache);

  propList ??= import(fileURLToPath(url), {
    with: { type: 'json' },
  }).then(
    ({ default: list }: JSONModule<PropList>) => list,
    (error: unknown) => {
      throw new Error(
        `Can't read the private-property list ${fileURLToPath(url)}. \`just build-prepare\` in packages/material-x writes it.`,
        { cause: error },
      );
    },
  );

  return propList;
}

export function createSourcePath(previousURL: URL, ext: string): URL {
  const previousPath = fileURLToPath(previousURL);
  return new URL(
    `${basename(previousPath, extname(previousPath))}${ext}`,
    new URL('./', previousURL),
  );
}

export function escapeTemplateLiteral(str: string): string {
  return str.trim().replaceAll('`', '\\`').replaceAll('${', '\\${');
}
