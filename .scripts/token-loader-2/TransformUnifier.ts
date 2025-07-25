import type { TypedObjectConstructor } from '../../src/interfaces';
import type {
  ProcessedTokenDescriptor,
  ProcessedTokenSet,
  ProcessedTokenSetDescriptor,
} from '../utils.ts';

export default class TransformUnifier {
  static async create(
    setLoader: AsyncIteratorObject<ProcessedTokenSetDescriptor>,
  ): Promise<TransformUnifier> {
    return new TransformUnifier(await Array.fromAsync(setLoader));
  }

  readonly #sets: readonly ProcessedTokenSetDescriptor[];

  private constructor(sets: readonly ProcessedTokenSetDescriptor[]) {
    this.#sets = sets;
  }

  get tokens(): IteratorObject<ProcessedTokenDescriptor> {
    return this.#tokens();
  }

  *#tokens(): IteratorObject<ProcessedTokenDescriptor, void, void> {
    for (const [setName, set] of this.#sets) {
      for (const [name, token] of (Object as TypedObjectConstructor).entries(
        set,
      )) {
        yield [setName, name, token] as const;
      }
    }
  }
}
