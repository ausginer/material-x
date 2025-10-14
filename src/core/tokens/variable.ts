import type { ResolvedTokenSet } from './resolve.ts';

export type CSSVariableSet = Readonly<Record<string, CSSVariable>>;

export class CSSVariable {
  static withValue(variable: CSSVariable, value: string | number): CSSVariable {
    return new CSSVariable(variable.name, value, variable.#prefix);
  }

  static equals(
    v1: CSSVariable | null | undefined,
    v2: CSSVariable | null | undefined,
  ): boolean {
    return (
      (v1 && v2 && v1.#name === v2.#name && v1.#value === v2.#value) ??
      v1 === v2
    );
  }

  static cssify(name: string): string {
    return name.replaceAll('.', '-');
  }

  static ref(name: string): string {
    return `var(--_${CSSVariable.cssify(name)})`;
  }

  readonly #name: string;
  readonly #cssName: string;
  readonly #prefix?: string;
  readonly #value: string | number;

  constructor(name: string, value: string | number, prefix?: string) {
    this.#name = name;
    this.#cssName = CSSVariable.cssify(name);
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
    if (this.isPublic) {
      return `var(--${this.#prefix}-${this.#cssName}, ${this.#value})`;
    }

    return this.#value;
  }

  get isPublic(): boolean {
    return !!this.#prefix;
  }

  get ref(): string {
    return `var(${this.name}, ${this.#value})`;
  }

  toString(): string {
    return `${this.name}: ${this.value};`;
  }
}

export type PublicVars = Readonly<{
  vars: readonly string[];
  prefix: string;
}>;

export function createVariables(
  tokens: ResolvedTokenSet,
  publicVars?: PublicVars,
  allowedVars?: readonly string[],
): CSSVariableSet {
  let arr = Object.entries(tokens);

  if (allowedVars) {
    arr = arr.filter(([key]) => allowedVars.includes(key));
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

export function packSet(set: CSSVariableSet): string {
  return Object.values(set)
    .map((v) => v.toString())
    .join('\n');
}
