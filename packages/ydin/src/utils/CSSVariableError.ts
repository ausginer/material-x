/**
 * Error thrown when a CSS variable cannot be parsed as the expected shape.
 */
export default class CSSVariableError extends Error {
  override readonly name: string = this.constructor.name;

  /**
   * Creates a parse error for a CSS variable on a specific element.
   *
   * @param cssVar - Variable name or key used for reporting.
   * @param element - Element whose computed variable value was invalid.
   */
  constructor(cssVar: string, element: HTMLElement) {
    super(`Invalid value for ${cssVar} on element '${element.localName}'`);
  }
}
