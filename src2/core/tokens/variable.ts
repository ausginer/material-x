import type { ResolveAdjuster, ResolvedTokenSet } from './resolve.ts';

export type CSSVariableSet = Readonly<Record<string, CSSVariable>>;

export class CSSVariable {
  static withValue(variable: CSSVariable, value: string | number): CSSVariable {
    return new CSSVariable(variable.name, value, variable.#prefix);
  }

  readonly #name: string;
  readonly #cssName: string;
  readonly #prefix?: string;
  readonly #value: string | number;

  constructor(name: string, value: string | number, prefix?: string) {
    this.#name = name;
    this.#cssName = name.replaceAll('.', '-');
    this.#prefix = prefix;
    this.#value = value;
  }

  get raw(): string {
    return this.#name;
  }

  get name(): string {
    return `--_${this.#cssName}`;
  }

  get value(): string | number {
    return this.#value;
  }

  get isPublic(): boolean {
    return !!this.#prefix;
  }

  get ref(): string {
    if (this.isPublic) {
      return `var(--${this.#prefix}-${this.#cssName}, ${this.#value})`;
    }

    return `var(${this.name}, ${this.#value})`;
  }

  toString(): string {
    return `${this.name}: ${this.#value};`;
  }
}

export type VariableOptions = Readonly<{
  public?: { vars: readonly string[]; prefix: string };
  allowed?: readonly string[];
}>;

export function createVariables(
  tokens: ResolvedTokenSet,
  { public: publicVars, allowed }: VariableOptions,
): CSSVariableSet {
  const arr = Object.entries(tokens);

  if (allowed) {
    arr.filter(([key]) => allowed.includes(key));
  }

  return Object.fromEntries(
    arr.map(([key, token]) => {
      if (publicVars?.vars.includes(key)) {
        return [key, new CSSVariable(key, token, publicVars.prefix)];
      }

      return [key, new CSSVariable(key, token)];
    }),
  );
}
