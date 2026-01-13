import { basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root: URL = new URL('../', import.meta.url);
export const src: URL = new URL('src/', root);
export const cache: URL = new URL('node_modules/.cache/', root);
export const cssCache: URL = new URL('css/', cache);

export type JSONModule<T> = Readonly<{
  default: T;
}>;

export type JSModule<T> = Readonly<{
  default: T;
}>;

export function* execPattern(
  pattern: RegExp,
  target: string,
): Generator<RegExpExecArray, void, unknown> {
  let result: RegExpExecArray | null;
  while ((result = pattern.exec(target)) !== null) {
    yield result;
  }
}
export function createSourcePath(previousURL: URL, ext: string): URL {
  const previousPath = fileURLToPath(previousURL);
  return new URL(
    `${basename(previousPath, extname(previousPath))}${ext}`,
    new URL('./', previousURL),
  );
}
