import type { ProcessedTokenValue } from './ProcessedTokenSet.ts';
import * as prettier from 'prettier';

function toCSSName(name: string): string {
  return name.replaceAll('.', '-');
}

export function v(name: string): string {
  return `--_${toCSSName(name)}`;
}

export function pub(name: string, prefix?: string): string {
  return `--${prefix ? `${prefix}-` : ''}${toCSSName(name)}`;
}

export function ref(v: string, fallback?: ProcessedTokenValue): string {
  return `var(${v}${fallback ? `, ${fallback}` : ''})`;
}

export default async function css(
  strings: TemplateStringsArray,
  ...values: readonly unknown[]
): Promise<string> {
  let result = '';

  for (let i = 0; i < strings.length; i++) {
    const string = strings[i];
    result += string;
    if (i < values.length) {
      result += String(values[i]);
    }
  }

  return await prettier.format(result, { parser: 'css' });
}
