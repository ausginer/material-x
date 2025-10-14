import * as prettier from 'prettier';

export async function prettify(str: string): Promise<string> {
  return await prettier.format(str, { parser: 'css' });
}

function processValue(value: unknown): string {
  if (value == null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((v) => processValue(v)).join('');
  }

  if (typeof value === 'object') {
    throw new Error('Object values are not allowed');
  }

  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(value);
}

export function css(
  strings: TemplateStringsArray,
  ...values: readonly unknown[]
): string {
  let result = '';

  for (let i = 0; i < strings.length; i++) {
    const string = strings[i];
    result += string;
    if (i < values.length) {
      result += processValue(values[i]);
    }
  }

  return result;
}
