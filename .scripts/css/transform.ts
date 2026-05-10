import {
  composeVisitors,
  transform as t,
  type CustomAtRules,
  type Visitor,
} from 'lightningcss';
import type { SourceMap } from 'rollup';
import hasSlottedFallbackVisitor from './hasSlottedFallbackVisitor.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// oxlint-disable-next-line typescript/no-empty-object-type
export type TransformOptions<C extends CustomAtRules = {}> = Readonly<{
  sourceMap?: boolean;
  minify?: boolean;
  visitor?: Visitor<C>;
}>;

export default function transform(
  input: string,
  fileName = 'unknown.css',
  options?: TransformOptions,
): Readonly<{ code: string; map?: SourceMap }> {
  const { code: encoded, map } = t({
    filename: fileName,
    code: encoder.encode(input),
    minify: options?.minify ?? false,
    sourceMap: options?.sourceMap ?? false,
    visitor: options?.visitor
      ? composeVisitors([hasSlottedFallbackVisitor, options.visitor])
      : hasSlottedFallbackVisitor,
  });

  return {
    code: decoder.decode(encoded),
    map: map ? JSON.parse(decoder.decode(map)) : undefined,
  };
}
