// P5. A trait declares an attribute with an accessor decorator, which types
// the converter against the field.
import { ControlledElement } from './element.ts';

type Converter<T> = Readonly<{
  from(value: string | null): T;
  to(value: T): string | null;
}>;
declare const Bool: Converter<boolean>;
declare const Str: Converter<string | null>;

export function attr<T>(
  _converter: Converter<T>,
): <This extends HTMLElement>(
  target: ClassAccessorDecoratorTarget<This, T>,
  context: ClassAccessorDecoratorContext<This, T>,
) => void {
  throw new Error('removed by the flattener');
}

export class Disableable extends ControlledElement {
  @attr(Bool) accessor disabled: boolean = false; // expected: ok
}

export class Wrong extends ControlledElement {
  @attr(Str) accessor disabled: boolean = false; // expected: error, converter type
}

export class NoInit extends ControlledElement {
  @attr(Str) accessor href: string | null; // expected: unknown without an initializer
}

export class Definite extends ControlledElement {
  @attr(Bool) accessor checked!: boolean; // expected: unknown
}
