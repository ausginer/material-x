/* oxlint-disable no-console -- a measurement script: it prints its readings */
/**
 * Compares `@ydinjs/signals` with `@preact/signals-core`, `alien-signals`,
 * `usignal` (its synchronous effects, `usignal/sync`) and
 * `@webreflection/signals` on the prototype task's five cases. Each case builds its graph once per
 * library and times one operation repeated: warm-up samples first, then timed
 * samples, each of the same number of operations. It prints the median time
 * per operation and the spread of the samples, from the fastest to the
 * slowest.
 *
 * `node bench/speed.ts [--samples=N]`
 */
import * as preact from '@preact/signals-core';
import * as webreflection from '@webreflection/signals';
import * as alien from 'alien-signals';
import * as usignal from 'usignal/sync';
import { family } from '../src/family.ts';
import * as ydin from '../src/index.ts';

type Case = Readonly<{
  name: string;
  /** Operations per sample. */
  operations: number;
  /** Builds the graph and returns one operation. */
  ydin(): () => void;
  preact(): () => void;
  alien(): () => void;
  usignal(): () => void;
  webreflection(): () => void;
}>;

const WARMUP_SAMPLES = 10;
const SAMPLES = Number(
  process.argv.find((arg) => arg.startsWith('--samples='))?.slice(10) ?? 30,
);

let sink: unknown;

function range(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}

const CASES: readonly Case[] = [
  {
    name: '1a. chain of 10 computeds and an effect, write the head',
    operations: 20_000,
    ydin() {
      const head = ydin.signal(0);
      let tail: ydin.Readable<number> = head;

      for (let index = 0; index < 10; index += 1) {
        tail = ydin.computed([tail], (previous) => previous() + 1);
      }

      ydin.effect([tail], (tail) => {
        sink = tail();
      });
      let value = 0;
      return () => {
        value += 1;
        head.set(value);
      };
    },
    preact() {
      const head = preact.signal(0);
      let tail: preact.ReadonlySignal<number> = head;

      for (let index = 0; index < 10; index += 1) {
        const previous = tail;
        tail = preact.computed(() => previous.value + 1);
      }

      const last = tail;
      preact.effect(() => {
        sink = last.value;
      });
      let value = 0;
      return () => {
        value += 1;
        head.value = value;
      };
    },
    alien() {
      const head = alien.signal(0);
      let tail: () => number = head;

      for (let index = 0; index < 10; index += 1) {
        const previous = tail;
        tail = alien.computed(() => previous() + 1);
      }

      const last = tail;
      alien.effect(() => {
        sink = last();
      });
      let value = 0;
      return () => {
        value += 1;
        head(value);
      };
    },
    usignal() {
      const head = usignal.signal(0);
      let tail: { readonly value: number } = head;

      for (let index = 0; index < 10; index += 1) {
        const previous = tail;
        tail = usignal.computed<number, undefined, number>(
          () => previous.value + 1,
        );
      }

      const last = tail;
      usignal.effect(() => {
        sink = last.value;
      });
      let value = 0;
      return () => {
        value += 1;
        head.value = value;
      };
    },
    webreflection() {
      const head = webreflection.signal(0);
      let tail: { readonly value: number } = head;

      for (let index = 0; index < 10; index += 1) {
        const previous = tail;
        tail = webreflection.computed(() => previous.value + 1);
      }

      const last = tail;
      webreflection.effect(() => {
        sink = last.value;
      });
      let value = 0;
      return () => {
        value += 1;
        head.value = value;
      };
    },
  },
  {
    name: '1b. diamond a → b, c → d and an effect, write a',
    operations: 50_000,
    ydin() {
      const a = ydin.signal(0);
      const b = ydin.computed([a], (a) => a() * 2);
      const c = ydin.computed([a], (a) => a() * 3);
      const d = ydin.computed([b, c], (b, c) => b() + c());
      ydin.effect([d], (d) => {
        sink = d();
      });
      let value = 0;
      return () => {
        value += 1;
        a.set(value);
      };
    },
    preact() {
      const a = preact.signal(0);
      const b = preact.computed(() => a.value * 2);
      const c = preact.computed(() => a.value * 3);
      const d = preact.computed(() => b.value + c.value);
      preact.effect(() => {
        sink = d.value;
      });
      let value = 0;
      return () => {
        value += 1;
        a.value = value;
      };
    },
    alien() {
      const a = alien.signal(0);
      const b = alien.computed(() => a() * 2);
      const c = alien.computed(() => a() * 3);
      const d = alien.computed(() => b() + c());
      alien.effect(() => {
        sink = d();
      });
      let value = 0;
      return () => {
        value += 1;
        a(value);
      };
    },
    usignal() {
      const a = usignal.signal(0);
      const b = usignal.computed(() => a.value * 2);
      const c = usignal.computed(() => a.value * 3);
      const d = usignal.computed(() => b.value + c.value);
      usignal.effect(() => {
        sink = d.value;
      });
      let value = 0;
      return () => {
        value += 1;
        a.value = value;
      };
    },
    webreflection() {
      const a = webreflection.signal(0);
      const b = webreflection.computed(() => a.value * 2);
      const c = webreflection.computed(() => a.value * 3);
      const d = webreflection.computed(() => b.value + c.value);
      webreflection.effect(() => {
        sink = d.value;
      });
      let value = 0;
      return () => {
        value += 1;
        a.value = value;
      };
    },
  },
  {
    name: '2. branch switch on every write',
    operations: 50_000,
    ydin() {
      const show = ydin.signal(true);
      const left = ydin.signal(1);
      const right = ydin.signal(2);
      const picked = ydin.computed([show, left, right], (show, left, right) =>
        show() ? left() : right(),
      );
      ydin.effect([picked], (picked) => {
        sink = picked();
      });
      let value = true;
      return () => {
        value = !value;
        show.set(value);
      };
    },
    preact() {
      const show = preact.signal(true);
      const left = preact.signal(1);
      const right = preact.signal(2);
      const picked = preact.computed(() =>
        show.value ? left.value : right.value,
      );
      preact.effect(() => {
        sink = picked.value;
      });
      let value = true;
      return () => {
        value = !value;
        show.value = value;
      };
    },
    alien() {
      const show = alien.signal(true);
      const left = alien.signal(1);
      const right = alien.signal(2);
      const picked = alien.computed(() => (show() ? left() : right()));
      alien.effect(() => {
        sink = picked();
      });
      let value = true;
      return () => {
        value = !value;
        show(value);
      };
    },
    usignal() {
      const show = usignal.signal(true);
      const left = usignal.signal(1);
      const right = usignal.signal(2);
      const picked = usignal.computed(() =>
        show.value ? left.value : right.value,
      );
      usignal.effect(() => {
        sink = picked.value;
      });
      let value = true;
      return () => {
        value = !value;
        show.value = value;
      };
    },
    webreflection() {
      const show = webreflection.signal(true);
      const left = webreflection.signal(1);
      const right = webreflection.signal(2);
      const picked = webreflection.computed(() =>
        show.value ? left.value : right.value,
      );
      webreflection.effect(() => {
        sink = picked.value;
      });
      let value = true;
      return () => {
        value = !value;
        show.value = value;
      };
    },
  },
  {
    name: '3. 100 declared inputs, 3 read per run, write a read one',
    operations: 50_000,
    ydin() {
      const inputs = range(100).map((index) => ydin.signal(index));
      const sum = ydin.computed(
        inputs,
        (...accessors) => accessors[7]!() + accessors[42]!() + accessors[93]!(),
      );
      ydin.effect([sum], (sum) => {
        sink = sum();
      });
      let value = 0;
      return () => {
        value += 1;
        inputs[42]!.set(value);
      };
    },
    preact() {
      const inputs = range(100).map((index) => preact.signal(index));
      const sum = preact.computed(
        () => inputs[7]!.value + inputs[42]!.value + inputs[93]!.value,
      );
      preact.effect(() => {
        sink = sum.value;
      });
      let value = 0;
      return () => {
        value += 1;
        inputs[42]!.value = value;
      };
    },
    alien() {
      const inputs = range(100).map((index) => alien.signal(index));
      const sum = alien.computed(
        () => inputs[7]!() + inputs[42]!() + inputs[93]!(),
      );
      alien.effect(() => {
        sink = sum();
      });
      let value = 0;
      return () => {
        value += 1;
        inputs[42]!(value);
      };
    },
    usignal() {
      const inputs = range(100).map((index) => usignal.signal(index));
      const sum = usignal.computed(
        () => inputs[7]!.value + inputs[42]!.value + inputs[93]!.value,
      );
      usignal.effect(() => {
        sink = sum.value;
      });
      let value = 0;
      return () => {
        value += 1;
        inputs[42]!.value = value;
      };
    },
    webreflection() {
      const inputs = range(100).map((index) => webreflection.signal(index));
      const sum = webreflection.computed(
        () => inputs[7]!.value + inputs[42]!.value + inputs[93]!.value,
      );
      webreflection.effect(() => {
        sink = sum.value;
      });
      let value = 0;
      return () => {
        value += 1;
        inputs[42]!.value = value;
      };
    },
  },
  ...[1, 10, 100].map((width): Case => ({
    name: `4. create and dispose an effect reading ${width} inputs`,
    operations: Math.round(20_000 / width),
    ydin() {
      const inputs = range(width).map((index) => ydin.signal(index));
      return () => {
        ydin.effect(inputs, (...accessors) => {
          for (const read of accessors) {
            sink = read();
          }
        })();
      };
    },
    preact() {
      const inputs = range(width).map((index) => preact.signal(index));
      return () => {
        preact.effect(() => {
          for (const input of inputs) {
            sink = input.value;
          }
        })();
      };
    },
    alien() {
      const inputs = range(width).map((index) => alien.signal(index));
      return () => {
        alien.effect(() => {
          for (const input of inputs) {
            sink = input();
          }
        })();
      };
    },
    usignal() {
      const inputs = range(width).map((index) => usignal.signal(index));
      return () => {
        usignal.effect(() => {
          for (const input of inputs) {
            sink = input.value;
          }
        })();
      };
    },
    webreflection() {
      const inputs = range(width).map((index) => webreflection.signal(index));
      return () => {
        webreflection.effect(() => {
          for (const input of inputs) {
            sink = input.value;
          }
        })();
      };
    },
  })),
  {
    name: '5. scan 100 rows for the first over a threshold (match at 50), write row 10',
    operations: 10_000,
    ydin() {
      const rows = range(100).map((index) =>
        ydin.signal(index === 50 ? 100 : 0),
      );
      const list = ydin.signal<ReadonlyArray<ydin.Signal<number>>>(rows);
      const threshold = ydin.signal(10);
      const firstMatch = ydin.computed(
        [family(list), threshold],
        (rows, threshold) => {
          const limit = threshold();
          const { length } = rows();

          for (let index = 0; index < length; index += 1) {
            if (rows.at(index) > limit) {
              return index;
            }
          }

          return -1;
        },
      );
      ydin.effect([firstMatch], (firstMatch) => {
        sink = firstMatch();
      });
      let value = 0;
      return () => {
        value = (value + 1) % 5;
        rows[10]!.set(value);
      };
    },
    preact() {
      const rows = range(100).map((index) =>
        preact.signal(index === 50 ? 100 : 0),
      );
      const list = preact.signal(rows);
      const threshold = preact.signal(10);
      const firstMatch = preact.computed(() => {
        const limit = threshold.value;
        const members = list.value;

        for (let index = 0; index < members.length; index += 1) {
          if (members[index]!.value > limit) {
            return index;
          }
        }

        return -1;
      });
      preact.effect(() => {
        sink = firstMatch.value;
      });
      let value = 0;
      return () => {
        value = (value + 1) % 5;
        rows[10]!.value = value;
      };
    },
    alien() {
      const rows = range(100).map((index) =>
        alien.signal(index === 50 ? 100 : 0),
      );
      const list = alien.signal(rows);
      const threshold = alien.signal(10);
      const firstMatch = alien.computed(() => {
        const limit = threshold();
        const members = list();

        for (let index = 0; index < members.length; index += 1) {
          if (members[index]!() > limit) {
            return index;
          }
        }

        return -1;
      });
      alien.effect(() => {
        sink = firstMatch();
      });
      let value = 0;
      return () => {
        value = (value + 1) % 5;
        rows[10]!(value);
      };
    },
    usignal() {
      const rows = range(100).map((index) =>
        usignal.signal(index === 50 ? 100 : 0),
      );
      const list = usignal.signal(rows);
      const threshold = usignal.signal(10);
      const firstMatch = usignal.computed(() => {
        const limit = threshold.value;
        const members = list.value;

        for (let index = 0; index < members.length; index += 1) {
          if (members[index]!.value > limit) {
            return index;
          }
        }

        return -1;
      });
      usignal.effect(() => {
        sink = firstMatch.value;
      });
      let value = 0;
      return () => {
        value = (value + 1) % 5;
        rows[10]!.value = value;
      };
    },
    webreflection() {
      const rows = range(100).map((index) =>
        webreflection.signal(index === 50 ? 100 : 0),
      );
      const list = webreflection.signal(rows);
      const threshold = webreflection.signal(10);
      const firstMatch = webreflection.computed(() => {
        const limit = threshold.value;
        const members = list.value;

        for (let index = 0; index < members.length; index += 1) {
          if (members[index]!.value > limit) {
            return index;
          }
        }

        return -1;
      });
      webreflection.effect(() => {
        sink = firstMatch.value;
      });
      let value = 0;
      return () => {
        value = (value + 1) % 5;
        rows[10]!.value = value;
      };
    },
  },
];

function sample(operation: () => void, operations: number): number {
  const start = performance.now();

  for (let index = 0; index < operations; index += 1) {
    operation();
  }

  return ((performance.now() - start) * 1e6) / operations;
}

function measure(operation: () => void, operations: number) {
  for (let index = 0; index < WARMUP_SAMPLES; index += 1) {
    sample(operation, operations);
  }

  const samples = range(SAMPLES)
    .map(() => sample(operation, operations))
    .sort((a, b) => a - b);

  return {
    median: samples[Math.floor(samples.length / 2)]!,
    min: samples[0]!,
    max: samples.at(-1)!,
  };
}

function format(ns: number): string {
  return ns >= 1000 ? `${(ns / 1000).toFixed(2)} µs` : `${ns.toFixed(1)} ns`;
}

console.log(
  `Node ${process.version}, ${SAMPLES} samples after ${WARMUP_SAMPLES} warm-up samples; median per operation, and the spread from the fastest sample to the slowest\n`,
);
console.log(
  '| Case | @ydinjs/signals | @preact/signals-core | alien-signals | usignal | @webreflection/signals |',
);
console.log('| --- | --- | --- | --- | --- | --- |');

for (const benchCase of CASES) {
  const cells = (
    ['ydin', 'preact', 'alien', 'usignal', 'webreflection'] as const
  ).map((library) => {
    const { median, min, max } = measure(
      benchCase[library](),
      benchCase.operations,
    );
    return `${format(median)} (${format(min)}–${format(max)})`;
  });

  console.log(`| ${benchCase.name} | ${cells.join(' | ')} |`);
}

if (sink === Symbol.for('never')) {
  console.log(sink);
}
