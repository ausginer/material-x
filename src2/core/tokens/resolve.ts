import { pub, ref } from './css.ts';
import db from './DB.ts';
import type { ProcessedTokenValue } from './ProcessedTokenSet.ts';
import type { ProcessedTokenSet } from './processTokenSet.ts';
import processToken from './processToken.ts';

export type ResolvedTokenValue = string | number;
export type ResolvedTokenSet = Readonly<Record<string, string | number>>;

export function isLinkedToken(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('md.');
}

function makeColorTokenOverridable(
  value: ProcessedTokenValue,
  path: readonly string[],
): ProcessedTokenValue {
  const colorToken = path.find((p) => p.includes('md.sys.color'));

  if (colorToken) {
    return ref(pub(colorToken.replaceAll('.', '-')), String(value));
  }

  return value;
}

export type ResolveAdjuster = (
  value: ProcessedTokenValue,
  path: readonly string[],
) => ProcessedTokenValue | null;

export function resolve(
  tokenName: string,
  value: ProcessedTokenValue | null | undefined,
  ...adjusts: readonly ResolveAdjuster[]
): ProcessedTokenValue | null | undefined {
  const path = [tokenName];
  let v: ProcessedTokenValue | null | undefined = value;

  while (isLinkedToken(v)) {
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

  return [...adjusts, makeColorTokenOverridable].reduce<typeof value>(
    (acc, adjust) => (acc == null ? null : adjust(acc, path)),
    v,
  );
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
        (entry): entry is readonly [string, string | number] =>
          entry[1] != null,
      ),
  );
}
