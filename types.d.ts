/* eslint-disable import-x/unambiguous */
declare module 'sorcery' {
  import type { SourceMap } from 'rollup';

  export type ChainWriteOptions = Readonly<{
    inline?: boolean;
    absolutePath?: boolean;
  }>;

  export interface Chain {
    apply(): SourceMap;
    toString(): string;
    toUrl(): string;
    write(name: string, options: ChainWriteOptions): Promise<void>;
  }

  export type LoadMap = Readonly<{
    content: Readonly<Record<string, string>>;
    sourcemaps: Readonly<Record<string, string>>;
  }>;

  export function load(source: string, map: LoadMap): Promise<Chain>;
}

declare module '*.module.css' {
  const styles: Readonly<Record<string, string>>;
  export default styles;
}

declare module '*.ctr.css' {
  const styles: CSSStyleSheet;
  export default styles;
}

declare module '*.css.ts' {
  const styles: CSSStyleSheet;
  export default styles;
}

declare module '*.styles.css' {
  const styles: string;
  export default styles;
}

declare module '*.tpl.html' {
  const html: HTMLTemplateElement;
  export default html;
}

/* @internal */
interface ObjectConstructor {
  keys<O extends object>(o: O): ReadonlyArray<keyof O>;
  values<O extends object>(o: O): ReadonlyArray<O[keyof O]>;
  entries<const O extends object>(
    o: O,
  ): ReadonlyArray<Required<{ [K in keyof O]: [K, O[K]] }>[keyof O]>;
  fromEntries<const T extends ReadonlyArray<readonly [PropertyKey, any]>>(
    entries: T,
  ): Readonly<{ [K in T[number] as K[0]]: K[1] }>;
  fromEntries<T extends Iterable<readonly [PropertyKey, any]>>(
    entries: T,
  ): T extends Iterable<readonly [infer K, infer V]>
    ? Readonly<Record<K & PropertyKey, V>>
    : never;
}

/* @internal */

interface ReadonlyArray<T> {
  includes(searchElement: unknown, fromIndex?: number): boolean;
}

/* @internal */

interface Array<T> {
  includes(searchElement: unknown, fromIndex?: number): boolean;
}

/* @internal */
interface ArrayConstructor {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  isArray<T = unknown>(arg: unknown): arg is readonly T[];
}
