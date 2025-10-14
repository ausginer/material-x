export default class CSSVariableError extends Error {
  override readonly name: string = this.constructor.name;
  constructor(cssVar: string, element: HTMLElement) {
    super(`Invalid value for ${cssVar} on element '${element.localName}'`);
  }
}
