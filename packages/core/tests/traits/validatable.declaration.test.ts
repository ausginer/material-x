import { describe, expectTypeOf, it } from 'vitest';
import type {
  Validatable,
  ValidatableProps,
} from '../../src/traits/validatable.ts';

describe('Validatable', () => {
  it('should type the read-only validation state', () => {
    expectTypeOf<Validatable['validity']>().toEqualTypeOf<ValidityState>();
    expectTypeOf<Validatable['validationMessage']>().toEqualTypeOf<string>();
    expectTypeOf<Validatable['willValidate']>().toEqualTypeOf<boolean>();
    expectTypeOf<Validatable['form']>().toEqualTypeOf<HTMLFormElement | null>();
    expectTypeOf<Validatable['labels']>().toEqualTypeOf<NodeList>();
  });

  it('should type the validation methods', () => {
    expectTypeOf<Validatable['checkValidity']>().toEqualTypeOf<() => boolean>();
    expectTypeOf<Validatable['reportValidity']>().toEqualTypeOf<
      () => boolean
    >();
    expectTypeOf<Validatable['setCustomValidity']>().toEqualTypeOf<
      (message: string) => void
    >();
  });

  it('should type error and required as booleans', () => {
    expectTypeOf<Validatable['error']>().toEqualTypeOf<boolean>();
    expectTypeOf<Validatable['required']>().toEqualTypeOf<boolean>();
  });
});

describe('ValidatableProps', () => {
  it('should hold only error and required', () => {
    expectTypeOf<ValidatableProps>().toEqualTypeOf<{
      error?: boolean;
      required?: boolean;
    }>();
  });
});
