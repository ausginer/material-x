// P9b. Which type-only brand form passes isolatedDeclarations.
import { ControlledElement } from './element.ts';

// (i) An exported unique symbol as a computed key.
export const $exported: unique symbol = Symbol('Exported');
export class ExportedKey extends ControlledElement {
  declare readonly [$exported]: true; // expected: unknown
}

// (ii) A declared, not initialized, unique symbol.
declare const $declared: unique symbol;
export class DeclaredKey extends ControlledElement {
  declare readonly [$declared]: true; // expected: unknown
}

// (iii) An ES private brand, which TypeScript compares nominally. Optional,
// it is no brand: (iv) shows that.
export class PrivateBrand extends ControlledElement {
  #brand!: true; // expected: ok
}
export interface Adopter extends PrivateBrand {}
export class Adopter extends ControlledElement {}
export function usePrivate(_host: PrivateBrand): void {}
export function check(adopter: Adopter, element: ControlledElement): void {
  usePrivate(adopter); // expected: ok?
  usePrivate(element); // expected: an error
}

// (iv) An optional ES private brand.
export class OptionalBrand extends ControlledElement {
  #brand?: true;
}
export function useOptional(_host: OptionalBrand): void {}
export function checkOptional(element: ControlledElement): void {
  useOptional(element); // expected: no error, so it isn't a brand
}
