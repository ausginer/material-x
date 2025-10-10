import type { ProcessedTokens } from './ProcessedTokenSet.ts';

export default function inheritTokenSets(
  tokens?: ProcessedTokens,
  ...extensions: ReadonlyArray<ProcessedTokens | undefined>
): ProcessedTokens {
  if (!tokens) {
    return {};
  }

  if (extensions.length === 0) {
    return tokens;
  }

  const nonNullExtensions = extensions.filter((tokens) => tokens != null);

  const inherited = Object.fromEntries(
    Object.entries(tokens).filter(([name, value]) =>
      nonNullExtensions.every((tokens) => tokens[name] !== value),
    ),
  );

  return inherited;
}
