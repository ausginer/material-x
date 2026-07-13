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
