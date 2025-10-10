import setDeep from 'just-safe-set';
import type { Writable } from 'type-fest';

export type Groups<T extends Readonly<{ [key: string]: unknown }>> = Readonly<{
  [group: string]: Groups<T> | T | undefined;
}>;

export function group<T extends Readonly<{ [key: string]: unknown }>>(
  tokens: T,
  by: (key: string) => readonly string[],
): Groups<T> {
  const groups = Object.entries(tokens)
    .map(([tokenName, value]) => {
      return [by(tokenName), value] as const;
    })
    .reduce<Writable<Groups<T>>>((acc, [groups, entries]) => {
      setDeep(acc, groups as string[], entries);
      return acc;
    }, {});

  return groups;
}

export function inherit<T>(
  groups: Readonly<Record<string, T>>,
  ...extensions: ReadonlyArray<Readonly<Record<string, T>> | undefined>
): Readonly<Record<string, T>> {
  if (!groups) {
    return {};
  }

  if (extensions.length === 0) {
    return groups;
  }

  const nonNullExtensions = extensions.filter((ext) => ext != null);

  return Object.fromEntries(
    Object.entries(groups).filter(([name, value]) =>
      nonNullExtensions.every((ext) => ext[name] !== value),
    ),
  );
}
