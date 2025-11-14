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

declare module '*.ts?type=css' {
  const styles: CSSStyleSheet;
  export default styles;
}
