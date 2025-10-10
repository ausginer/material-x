export function attribute(name: string, value?: string): string {
  return value == null ? `[${name}]` : `[${name}="${value}"]`;
}

export function pseudoClass(name: string, value?: string): string {
  return value == null ? `:${name}` : `:${name}(${value})`;
}

export function pseudoElement(name: string): string {
  return `::${name}`;
}

export function selector(name: string, ...params: readonly string[]): string {
  if (params.length === 0) {
    return name;
  }

  if (name === ':host') {
    return `${name}(${params.join('')})`;
  }

  return `${name}${params.join('')}`;
}
