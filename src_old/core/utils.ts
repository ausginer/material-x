export type Point = Readonly<{
  x: number;
  y: number;
}>;

export function createRem(base: number): (size: number) => string {
  return (size) => `${size / base}rem`;
}

export class CSSVariableError extends Error {
  override readonly name: string = this.constructor.name;

  constructor(cssVar: string, element: HTMLElement) {
    super(`Invalid value for ${cssVar} on element '${element.localName}'`);
  }
}
