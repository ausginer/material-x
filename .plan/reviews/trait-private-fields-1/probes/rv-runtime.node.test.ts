import { writeFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { materialize, type Materialized } from './helpers.ts';

const OUT = process.env.RV_OUT ?? '/dev/null';
type Any = Record<string, unknown> & { new (...a: unknown[]): any };
let gen: Materialized;
let m: Record<string, Any>;
let h: Record<string, Any>;
let e: { log: string[] } & Record<string, Any>;
const results: Record<string, unknown> = {};

beforeAll(async () => {
  gen = await materialize({
    transformed: ['rv-consumer.ts', 'rv-traits.ts'],
    verbatim: ['rv-base.ts', 'rv-log.ts', 'rv-handwritten.ts'],
    exported: ['rv-traits.ts', 'rv-log.ts'],
  });
  m = await import(gen.url('rv-consumer.ts'));
  e = await import(gen.entryUrl);
  h = await import(gen.url('rv-handwritten.ts'));
});

afterAll(async () => {
  results.code = gen.code['rv-consumer.ts'];
  await writeFile(OUT, JSON.stringify(results, null, 2));
  await gen.dispose();
});

function run(label: string, make: () => any): any {
  e.log.length = 0;
  const instance = make();
  results[label] = [...e.log];
  return instance;
}

it('records', () => {
  const k = run('K order', () => new m.K!('arg'));
  results['K values'] = [
    k.sx,
    k.ax,
    k.bx,
    k.cx,
    k.kx,
    k.who(),
    k.sm,
    k.am,
    k.bm,
  ];
  k.ax = 'A2';
  k.kx = 'K2';
  k.sx = 'S2';
  results['K after writes'] = [k.sx, k.ax, k.bx, k.cx, k.kx];
  results['K own keys'] = Reflect.ownKeys(k);
  results['K proto keys'] = Reflect.ownKeys(Object.getPrototypeOf(k));
  results['K instanceof'] = [
    k instanceof e.S!,
    k instanceof e.A!,
    k instanceof e.B!,
    k instanceof e.C!,
    k instanceof e.D!,
  ];
  results['K observedAttributes'] = (m.K as any).observedAttributes;
  const k2 = new m.K!('x');
  results['K two instances separate'] = k2.ax === 'a' && k.ax === 'A2';
  const g = run('G order', () => new m.G!(1, 2));
  results['G args'] = g.args;
  run('K3 order', () => new m.K3!());
  run('Sub order', () => new m.Sub!());
  const later = run('Later order', () => new m.Later!());
  results['Later who'] = later.who();
  const earlier = run('Earlier order', () => new m.Earlier!());
  results['Earlier who'] = earlier.who();
  run('Asi order', () => new m.Asi!());
  results['asi'] = (globalThis as any).asi;
  run('KE order (flattened)', () => new m.KE!());
  run('KEHand order (hand-written)', () => new h.KEHand!());
  results['KE code'] = gen.code['rv-consumer.ts'].slice(
    gen.code['rv-consumer.ts'].indexOf('export class KE'),
  );
  expect(true).toBe(true);
});
