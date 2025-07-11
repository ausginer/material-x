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

declare module '@csstools/postcss-sass' {
  import type { Options } from 'sass';

  function postcssSass(options?: Options);

  export default postcssSass;
}
