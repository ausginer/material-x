import db from './DB/index.ts';
import processToken from './processToken.ts';

export type ProcessedTokenValue =
  | string
  | number
  | Readonly<Record<string, string | number | null>>;

export type ProcessedTokenSet = Readonly<Record<string, ProcessedTokenValue>>;

export default function processTokenSet(name: string): ProcessedTokenSet {
  const set = db.tokenSets.find((s) => s.tokenSetName === name);

  if (!set) {
    throw new Error(`Token set not found: ${name}`);
  }

  return Object.fromEntries(
    db.tokens
      .filter((token) => token.name.startsWith(set.name))
      .map((token) => [token.tokenNameSuffix, processToken(token)] as const)
      .filter(
        (result): result is readonly [string, ProcessedTokenValue] =>
          result[1] != null,
      )
      .toArray(),
  );
}
