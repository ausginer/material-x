export function add(a: number, b: number): number {
  return a + b;
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

export function greet(engine: string): string {
  return engine === 'a' ? 'hello, a' : 'hello';
}

export function unused(): string {
  return 'unused';
}
