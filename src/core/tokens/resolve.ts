import camelCase from 'just-camel-case';
import kebabCase from 'just-kebab-case';
import db from './DB.ts';
import processToken from './processToken.ts';
import type {
  ProcessedTokenSet,
  ProcessedTokenValue,
} from './processTokenSet.ts';
import { CSSVariable } from './variable.ts';

const COLOR_SET = 'md.sys.color';

export type ResolvedTokenValue = string | number;
export type ResolvedTokenSet = Readonly<Record<string, string | number>>;

export function isLinkedToken(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('md.');
}

export type ResolveAdjuster = (
  value: ProcessedTokenValue,
  path: readonly string[],
) => ProcessedTokenValue | null;

const makeColorTokenOverridable: ResolveAdjuster = (value, path) => {
  const colorToken = path.find((p) => p.includes(COLOR_SET));

  if (colorToken) {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error('Color token value must be string or number');
    }

    const variable = new CSSVariable(
      colorToken.replace(`${COLOR_SET}.`, ''),
      value,
      kebabCase(COLOR_SET),
    );

    return variable.value;
  }

  return value;
};

export function resolve(
  tokenName: string,
  value: ProcessedTokenValue | null | undefined,
  ...adjusts: readonly ResolveAdjuster[]
): ProcessedTokenValue | null | undefined {
  const path = [tokenName];
  let v: ProcessedTokenValue | null | undefined = value;

  while (isLinkedToken(v)) {
    if (v.includes(COLOR_SET)) {
      path.push(v);
      v = db.theme.schemes.light[camelCase(v.replace(`${COLOR_SET}.`, ''))];
      break;
    }

    // Since function is executed immediately, it's ok.
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    const token = db.tokens.find((t) => t.tokenName === v);

    if (!token) {
      return null;
    }

    path.push(token.tokenName);
    v = processToken(token);

    if (v === null) {
      return null;
    }
  }

  return [...adjusts, makeColorTokenOverridable].reduce<
    ProcessedTokenValue | null | undefined
  >((acc, adjust) => (acc == null ? null : adjust(acc, path)), v);
}

export function resolveSet(
  set: ProcessedTokenSet,
  ...adjusts: readonly ResolveAdjuster[]
): ResolvedTokenSet {
  return Object.fromEntries(
    Object.entries(set)
      .map(([name, token]) => [name, resolve(name, token, ...adjusts)] as const)
      .flatMap(([name, token]) => {
        if (typeof token === 'object' && token != null) {
          return Object.entries(token).map(([subName, subToken]) => {
            const fullSubName = `${name}.${subName}`;
            const resolved = resolve(fullSubName, subToken, ...adjusts);

            if (typeof resolved === 'object' && resolved != null) {
              throw new Error('Nested token objects are not supported');
            }

            return [fullSubName, resolved] as const;
          });
        }

        return [[name, token] as const];
      })
      .filter(
        (entry): entry is readonly [string, ResolvedTokenValue] =>
          entry[1] != null,
      ),
  );
}
