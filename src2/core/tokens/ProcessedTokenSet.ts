export type ProcessedTokenValue =
  | string
  | number
  | Readonly<Record<string, string | number | null | undefined>>;

export type ProcessedTokens = Readonly<
  Record<string, ProcessedTokenValue | undefined>
>;

export type ProcessedTokenGroup = Readonly<{
  [group: string]: ProcessedTokens | ProcessedTokenGroup | undefined;
}>;
