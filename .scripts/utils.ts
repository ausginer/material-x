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
