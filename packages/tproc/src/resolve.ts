import camelCase from 'just-camel-case';
import db from './DB/index.ts';
import processToken from './processToken.ts';
import type {
  ProcessedTokenSet,
  ProcessedTokenValue,
} from './processTokenSet.ts';
import type { TokenTypeVariationAxes } from './TokenTable.ts';
import * as CSSVariable from './variable.ts';

const COLOR_SET = 'md.sys.color';
const TYPEFACE_SET = 'md.ref.typeface';

export type ResolvedTokenValue = string | number;
export type ResolvedTokenSet = Readonly<Record<string, string | number>>;

export function isLinkedToken(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('md.');
}

export type ResolveAdjuster = (
  value: ProcessedTokenValue,
  path: readonly string[],
) => ProcessedTokenValue | null;

function defineSetAdjuster(setName: string): ResolveAdjuster {
  return (value, path) => {
    const colorToken = path.find((p) => p.includes(setName));

    if (colorToken) {
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new Error(`"${setName}" token value must be string or number`);
      }

      return CSSVariable.ref(colorToken, String(value), true);
    }

    return value;
  };
}

const AXIS_VALUE_SECTION = [
  'wdth',
  'wght',
  'slnt',
  'opsz',
  'GRAD',
  'ROND',
  'CRSV',
  'HEXP',
  'FILL',
] as const;

function isAxisValue(
  value: ProcessedTokenValue,
): value is Partial<TokenTypeVariationAxes> {
  return (
    typeof value === 'object' &&
    value != null &&
    AXIS_VALUE_SECTION.some((section) => section in value)
  );
}

function axisValueAdjuster(
  value: ProcessedTokenValue,
  path: readonly string[],
): ProcessedTokenValue | null {
  if (isAxisValue(value)) {
    const axes: string[] = [];

    for (const section of AXIS_VALUE_SECTION) {
      const axis = value[section];

      if (!axis) {
        continue;
      }

      // Cross-usage: `axisValueAdjuster` uses `resolveValue`, `resolveValue`
      // uses `axisValueAdjuster`). Also, `axisValueAdjuster` is nested, so we
      // suppress the warning here.
      // oxlint-disable-next-line no-use-before-define
      const resolved = resolveValue(axis.axisValueTokenName, [
        ...path,
        section,
      ]);

      if (resolved == null) {
        return null;
      }

      if (typeof resolved !== 'string' && typeof resolved !== 'number') {
        throw new Error(`"${section}" axis value must be string or number`);
      }

      axes.push(`"${section}" ${String(resolved)}`);
    }

    return axes.length > 0 ? axes.join(', ') : null;
  }

  return value;
}

const defaultAdjusters = [
  defineSetAdjuster(COLOR_SET),
  defineSetAdjuster(TYPEFACE_SET),
  axisValueAdjuster,
];

function resolveValue(
  value: ProcessedTokenValue | null | undefined,
  path: readonly string[] = [],
  ...adjusts: readonly ResolveAdjuster[]
): ProcessedTokenValue | null | undefined {
  const seen = new Set<string>();
  const p = [...path];
  let v: ProcessedTokenValue | null | undefined = value;

  while (isLinkedToken(v)) {
    if (seen.has(v)) {
      console.error(
        `Token reference cycle detected: ${[...path, v].join(' -> ')}`,
      );
      return null;
    }

    seen.add(v);

    if (v.includes(COLOR_SET)) {
      p.push(v);
      v = db.theme.schemes.light[camelCase(v.replace(`${COLOR_SET}.`, ''))];
      break;
    }

    // Since function is executed immediately, it's ok.
    const token = db.getToken(v);

    if (!token) {
      return null;
    }

    p.push(v);
    v = processToken(token);

    if (v === null) {
      return null;
    }
  }

  return [...adjusts, ...defaultAdjusters].reduce(
    (acc, adjust) => (acc == null ? null : adjust(acc, p)),
    v,
  );
}

export function resolve(
  tokenName: string,
  value: ProcessedTokenValue | null | undefined,
  ...adjusts: readonly ResolveAdjuster[]
): ProcessedTokenValue | null | undefined {
  return resolveValue(value, [tokenName], ...adjusts);
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
