import db from './DB.ts';
import processToken from './processToken.ts';

export type ProcessedTokenValue =
  | string
  | number
  | Readonly<Record<string, string | number | null | undefined>>;

export type ProcessedTokenSet = Readonly<{
  [name: string]: ProcessedTokenValue;
}>;

export default function processTokenSet(name: string): ProcessedTokenSet {
  const set = db.tokenSets.find((s) => s.tokenSetName === name);

  if (!set) {
    throw new Error(`Token set not found: ${name}`);
  }

  return Object.fromEntries(
    db.tokens
      .filter((token) => token.name.startsWith(set.name))
      .map((token) => [token.tokenName, processToken(token)] as const)
      .filter(
        (result): result is readonly [string, ProcessedTokenValue] =>
          result[1] != null,
      )
      .toArray(),
  );
}
