/**
 * The accessor microbenchmark. One page loads three variants of material-x's
 * built components: `flattened`, the packages' own build, and the two mixin
 * forms of `../probe/build-mixin.ts`, `inline` and `helper`. For each variant
 * it creates the elements of every component class that has the `disabled`
 * trait accessor (15 classes) and times reading and writing it.
 *
 * The variants are measured in rotation: each sample round times every
 * variant once, in an order that rotates by one each round, so drift in the
 * machine's load reaches all three alike.
 *
 * Workloads, in this order, each with call sites of its own made by
 * `new Function`, so no workload or variant shares a call site's feedback:
 *
 * - `get, 1 class`: one site reads `disabled` on 240 buttons;
 * - `get, 15 classes, a site per class`: 15 sites, each reading its class's 16
 *   elements, as a component's own code reads its own accessor;
 * - `get, 15 classes, one site`: one site reads all 240 elements, 16 of each
 *   class, interleaved, as a consumer's generic code does;
 * - `set, …`: the same three, writing `disabled`, alternating `true` and
 *   `false` on each pass, so each write changes the attribute;
 * - `create, 15 classes`: `document.createElement` for each class, which runs
 *   the constructor chain.
 *
 * Each workload is calibrated to at least 25 ms a sample on the flattened
 * variant, runs 4 rotations of warm-up and records 15. A sample is
 * nanoseconds per accessor call (or per element created). In Chromium, the
 * run also records whether each class's instances share one map, and prints
 * the accessors' functions with their SharedFunctionInfo.
 */
import { commands } from 'vitest/browser';

declare const __ROOT__: string;
declare const __MIXIN__: string;
declare const __ENGINE__: string;

const VARIANTS = ['flattened', 'inline', 'helper'] as const;

type Variant = (typeof VARIANTS)[number];

const PREFIX: Readonly<Record<Variant, string>> = {
  flattened: 'mxf',
  inline: 'mxi',
  helper: 'mxh',
};

/** Each component class with the `disabled` accessor: its tag and entry. */
const ENTRIES: Readonly<Record<string, string>> = {
  button: 'button/button',
  'icon-button': 'button/icon-button',
  'link-button': 'button/link-button',
  'switch-button': 'button/switch-button',
  'switch-icon-button': 'button/switch-icon-button',
  'split-button': 'button/split-button',
  'button-group': 'button-group/button-group',
  'connected-button-group': 'button-group/connected-button-group',
  checkbox: 'checkbox/checkbox',
  fab: 'fab/fab',
  'list-button-item': 'list/list-button-item',
  'list-link-item': 'list/list-link-item',
  radio: 'radio/radio',
  'text-field': 'text-field/text-field',
  'multiline-text-field': 'text-field/multiline-text-field',
};

const NAMES = Object.keys(ENTRIES);
const PER_CLASS = 16;
const SAMPLE_MS = 25;
const WARMUP = 4;
const SAMPLES = 15;

type Pass = (pass: number) => void;
type Reader = (els: readonly HTMLElement[]) => number;
type Writer = (els: readonly HTMLElement[], value: boolean) => void;

function roots(variant: Variant): Readonly<{ mx: string; core: string }> {
  return variant === 'flattened'
    ? {
        mx: `${__ROOT__}packages/material-x/`,
        core: `${__ROOT__}packages/core/`,
      }
    : {
        mx: `${__MIXIN__}${variant}/material-x/`,
        core: `${__MIXIN__}${variant}/core/`,
      };
}

async function load(path: string): Promise<Record<string, any>> {
  return (await import(/* @vite-ignore */ `/@fs${path}`)) as Record<
    string,
    any
  >;
}

/** A call site of its own, named in V8's log by its `sourceURL`. */
function reader(name: string): Reader {
  return new Function(
    'els',
    `let n = 0; for (let i = 0; i < els.length; i += 1) { if (els[i].disabled) n += 1; } return n;\n//# sourceURL=site-${name}.js`,
  ) as Reader;
}

function writer(name: string): Writer {
  return new Function(
    'els',
    'value',
    `for (let i = 0; i < els.length; i += 1) { els[i].disabled = value; }\n//# sourceURL=site-${name}.js`,
  ) as Writer;
}

function accessorOf(element: HTMLElement): PropertyDescriptor {
  for (
    let proto: object | null = Object.getPrototypeOf(element);
    proto != null;
    proto = Object.getPrototypeOf(proto)
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'disabled');

    if (descriptor) {
      return descriptor;
    }
  }

  throw new Error(`${element.localName} has no disabled accessor`);
}

type Fixture = Readonly<{
  variant: Variant;
  tags: readonly string[];
  single: readonly HTMLElement[];
  byClass: readonly (readonly HTMLElement[])[];
  mixed: readonly HTMLElement[];
  workloads: ReadonlyArray<readonly [string, number, Pass]>;
}>;

async function fixture(variant: Variant): Promise<Fixture> {
  const { mx, core } = roots(variant);

  for (const entry of Object.values(ENTRIES)) {
    await load(`${mx}${entry}.js`);
  }

  const tags = NAMES.map((name) => `${PREFIX[variant]}-${name}`);
  const { operator } = await load(`${core}attribute.js`);

  // The operator this module loaded must be the one the accessors call, or
  // the sites printed for it would be another instance's.
  const getRaw = operator.getRaw;
  let calls = 0;
  operator.getRaw = (...args: unknown[]) => {
    calls += 1;
    return getRaw(...args);
  };
  void (document.createElement(tags[0]!) as any).disabled;
  operator.getRaw = getRaw;

  if (calls !== 1) {
    throw new Error(
      `${variant}: the accessors call another attribute operator`,
    );
  }

  const single = Array.from({ length: NAMES.length * PER_CLASS }, () =>
    document.createElement(tags[0]!),
  );
  const byClass = tags.map((tag) =>
    Array.from({ length: PER_CLASS }, () => document.createElement(tag)),
  );
  const mixed: HTMLElement[] = [];

  for (let i = 0; i < PER_CLASS; i += 1) {
    for (const elements of byClass) {
      mixed.push(elements[i]!);
    }
  }

  const getSingle = reader(`${variant}-get-1-class`);
  const getPerClass = NAMES.map((name) => reader(`${variant}-get-${name}`));
  const getMixed = reader(`${variant}-get-one-site`);
  const setSingle = writer(`${variant}-set-1-class`);
  const setPerClass = NAMES.map((name) => writer(`${variant}-set-${name}`));
  const setMixed = writer(`${variant}-set-one-site`);
  const created: HTMLElement[] = [];

  return {
    variant,
    tags,
    single,
    byClass,
    mixed,
    workloads: [
      ['get, 1 class', 1, () => void getSingle(single)],
      [
        'get, 15 classes, a site per class',
        NAMES.length,
        () => {
          for (let c = 0; c < byClass.length; c += 1) {
            getPerClass[c]!(byClass[c]!);
          }
        },
      ],
      ['get, 15 classes, one site', NAMES.length, () => void getMixed(mixed)],
      ['set, 1 class', 1, (p) => setSingle(single, (p & 1) === 0)],
      [
        'set, 15 classes, a site per class',
        NAMES.length,
        (p) => {
          for (let c = 0; c < byClass.length; c += 1) {
            setPerClass[c]!(byClass[c]!, (p & 1) === 0);
          }
        },
      ],
      [
        'set, 15 classes, one site',
        NAMES.length,
        (p) => setMixed(mixed, (p & 1) === 0),
      ],
      [
        'create, 15 classes',
        NAMES.length,
        () => {
          created.length = 0;

          for (const tag of tags) {
            created.push(document.createElement(tag));
          }
        },
      ],
    ],
  };
}

function time(run: Pass, passes: number): number {
  const start = performance.now();

  for (let p = 0; p < passes; p += 1) {
    run(p);
  }

  return performance.now() - start;
}

function median(values: readonly number[]): number {
  const sorted = values.toSorted((a, b) => a - b);

  return sorted[Math.floor(sorted.length / 2)]!;
}

export async function bench(): Promise<void> {
  const fixtures = [];

  for (const variant of VARIANTS) {
    fixtures.push(await fixture(variant));
  }

  const run = `${__ENGINE__}-${Date.now()}`;

  for (let w = 0; w < fixtures[0]!.workloads.length; w += 1) {
    const [workload, classes] = fixtures[0]!.workloads[w]!;
    const ops = workload.startsWith('create')
      ? NAMES.length
      : fixtures[0]!.mixed.length;
    let passes = 1;

    while (time(fixtures[0]!.workloads[w]![2], passes) < SAMPLE_MS) {
      passes *= 2;
    }

    const samples: Record<Variant, number[]> = {
      flattened: [],
      inline: [],
      helper: [],
    };

    for (let s = 0; s < WARMUP + SAMPLES; s += 1) {
      for (let k = 0; k < fixtures.length; k += 1) {
        const f = fixtures[(s + k) % fixtures.length]!;
        const elapsed = time(f.workloads[w]![2], passes);

        if (s >= WARMUP) {
          samples[f.variant].push((elapsed * 1e6) / (passes * ops));
        }
      }
    }

    await commands.record(
      JSON.stringify({
        engine: __ENGINE__,
        run,
        workload,
        classes,
        elements: ops,
        passes,
        median: Object.fromEntries(
          VARIANTS.map((variant) => [variant, median(samples[variant])]),
        ),
        samples,
      }),
    );
  }

  if (__ENGINE__ !== 'chromium') {
    return;
  }

  const sameMap = new Function('a', 'b', 'return %HaveSameMap(a, b);') as (
    a: unknown,
    b: unknown,
  ) => boolean;
  const print = new Function(
    'label',
    'value',
    '%DebugPrint(label); %DebugPrint(value);',
  ) as (label: string, value: unknown) => void;

  for (const f of fixtures) {
    const button = f.byClass[0]![0]!;
    const checkbox = f.byClass[NAMES.indexOf('checkbox')]![0]!;

    print(`MXBENCH ${f.variant} get disabled, button`, accessorOf(button).get);
    print(
      `MXBENCH ${f.variant} get disabled, checkbox`,
      accessorOf(checkbox).get,
    );
    print(`MXBENCH ${f.variant} set disabled, button`, accessorOf(button).set);
    print(
      `MXBENCH ${f.variant} set disabled, checkbox`,
      accessorOf(checkbox).set,
    );

    await commands.record(
      JSON.stringify({
        engine: __ENGINE__,
        run,
        variant: f.variant,
        maps: {
          // One map for the instances of one class, and distinct maps across
          // classes, make the class count the shape count.
          sameClass: f.byClass.every((elements) =>
            elements.every((element) => sameMap(element, elements[0])),
          ),
          distinctClasses: new Set(
            f.byClass.map((elements) =>
              f.byClass.findIndex((other) => sameMap(other[0], elements[0])),
            ),
          ).size,
        },
      }),
    );
  }
}
