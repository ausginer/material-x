/** Converts token names to CSS custom property names. */
export function cssify(name: string): string {
  return name.replaceAll('.', '-');
}

/**
 * References a CSS variable in code.
 *
 * @param name - A token name.
 * @param fallback - A CSS variable fallback value.
 * @param isPublic - A flag to make CSS variable name private (`var(--_private)`)
 * or public (`var(--public)`). Note underscore in the private name. Private
 * values can be mangled in production.
 *
 * @example
 * ```ts
 * ref('md.sys.color.primary', '#3E6700', true) // => 'var(--md-sys-color-primary, #3E6700)'
 * ```
 */
export function ref(name: string, fallback?: string, isPublic = false): string {
  let result = `var(--`;

  if (!isPublic) {
    result += '_';
  }

  result += cssify(name);

  if (fallback) {
    result += `, ${fallback}`;
  }

  return result + ')';
}
