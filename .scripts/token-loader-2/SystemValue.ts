import type { ResolvedValue, Value } from './TokenTable.ts';

export default class SystemValue {
  readonly resolved: ResolvedValue | null;
  readonly #value: Value;

  constructor(value: Value, resolvedValue: ResolvedValue | null) {
    this.#value = value;
    this.resolved = resolvedValue;
  }

  valueOf(): Value {
    return this.#value;
  }
}
