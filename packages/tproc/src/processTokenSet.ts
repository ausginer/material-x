import processToken from './processToken.ts';
import store from './store/index.ts';

export type ProcessedTokenValue =
  | string
  | number
  | Readonly<{ [key: string]: ProcessedTokenValue | null }>;

export type ProcessedTokenSet = Readonly<Record<string, ProcessedTokenValue>>;

export default function processTokenSet(name: string): ProcessedTokenSet {
  const set = store.getSet(name);

  // A set that no table carries has only its name, and isn't processed.
  if (set?.displayName == null) {
    throw new Error(`Token set not found: ${name}`);
  }

  const prefixLength = set.tokenSetName.length + 1;

  return Object.fromEntries(
    set.tokens
      .map(
        (token) =>
          [token.tokenName.slice(prefixLength), processToken(token)] as const,
      )
      .filter(
        (result): result is readonly [string, ProcessedTokenValue] =>
          result[1] != null,
      ),
  );
}
