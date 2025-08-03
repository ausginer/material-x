import type { ResolvedValue, Value } from './TokenTable.ts';

export default class SystemValue {
  readonly resolved: ResolvedValue | null;
  readonly order: number;
  readonly #value: Value;

  constructor(
    value: Value,
    resolvedValue: ResolvedValue | null,
    order: number,
  ) {
    this.#value = value;
    this.resolved = resolvedValue;
    this.order = order;
  }

  valueOf(): Value {
    return this.#value;
  }
}
