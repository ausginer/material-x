/**
 * Type probe for the numeric storage contracts. It compiles exactly when every
 * recorded fact holds: `npx tsc -p packages/box-quad/.plan/probes/numeric-storage`.
 *
 * `Storage` is the proposed writable contract and `Readonly<Storage>` the input
 * contract. Each `Is<…, true | false>` line is one row of the compatibility
 * table in the record.
 */
type Storage = Record<number, number>;
type Input = Readonly<Storage>;

type Extends<A, B> = [A] extends [B] ? true : false;
type Is<Actual extends boolean, Expected extends Actual> = [Actual, Expected];

class Indexed {
  [index: number]: number;
}

class Fields {
  0 = 0;
  1 = 0;
}

interface WithLength {
  [index: number]: number;
  readonly length: number;
}

// Accepted as writable outputs.
export type Facts = [
  Is<Extends<number[], Storage>, true>,
  Is<Extends<[number, number], Storage>, true>,
  Is<Extends<Float64Array, Storage>, true>,
  Is<Extends<Float64Array<SharedArrayBuffer>, Storage>, true>,
  Is<Extends<{ 0: number; 1: number }, Storage>, true>,
  Is<Extends<Indexed, Storage>, true>,
  Is<Extends<WithLength, Storage>, true>,
  // Accepted, and outside the precision contract: the type cannot see the element type.
  Is<Extends<Float32Array, Storage>, true>,
  Is<Extends<Int32Array, Storage>, true>,
  Is<Extends<Uint8ClampedArray, Storage>, true>,
  // TypeScript does not check `readonly` in assignability, so a read-only
  // array is accepted where the contract writes. Writing through it is what
  // the compiler refuses, and box-quad's own body never holds one.
  Is<Extends<readonly number[], Storage>, true>,
  Is<Extends<Readonly<Storage>, Storage>, true>,
  // Rejected as writable outputs.
  Is<Extends<string, Storage>, false>,
  Is<Extends<Array<number | string>, Storage>, false>,
  Is<Extends<Array<number | undefined>, Storage>, false>,
  Is<Extends<bigint[], Storage>, false>,
  Is<Extends<BigInt64Array, Storage>, false>,
  Is<Extends<DOMMatrix, Storage>, false>,
  Is<Extends<Fields, Storage>, false>,
  Is<Extends<Map<number, number>, Storage>, false>,
  // Inputs.
  Is<Extends<Storage, Input>, true>,
  Is<Extends<readonly number[], Input>, true>,
  Is<Extends<readonly [number, number, number, number, number], Input>, true>,
  Is<Extends<ArrayLike<number>, Input>, true>,
  Is<Extends<Float64Array, Input>, true>,
  Is<Extends<string, Input>, false>,
  Is<Extends<DOMMatrixReadOnly, Input>, false>,
];

declare const input: Input;
declare const output: Storage;

// Reads of either contract are `number | undefined` under
// `noUncheckedIndexedAccess`, as reads of `Float64Array` already are.
export const read: number | undefined = input[0];

// @ts-expect-error The input contract refuses a write.
input[0] = 1;
output[0] = 1;

// The rejected alternative: excluding narrower typed arrays by their
// `Symbol.toStringTag` literal. It works for the built-in typed arrays and
// nothing else, and it puts an unrelated symbol into four public types.
type Tagged = Storage & {
  readonly [Symbol.toStringTag]?: 'Float64Array';
};

export type TaggedFacts = [
  Is<Extends<number[], Tagged>, true>,
  Is<Extends<Float64Array, Tagged>, true>,
  Is<Extends<{ 0: number }, Tagged>, true>,
  Is<Extends<Float32Array, Tagged>, false>,
  Is<Extends<Int32Array, Tagged>, false>,
  // A storage class that names itself is refused although it holds doubles.
  Is<
    Extends<
      { [index: number]: number; [Symbol.toStringTag]: 'Samples' },
      Tagged
    >,
    false
  >,
];
