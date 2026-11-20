/**
 * Summarizes `checks/bench.jsonl`. For each engine and workload: the
 * flattened variant's time, the median over runs of each run's median, in
 * nanoseconds per call; and each mixin form's difference from flattened, the
 * median over runs of the ratio of the two medians in the same run, with the
 * range of those ratios. The variants of one run share a page and rotate
 * sample by sample, so a ratio within a run is free of drift between runs.
 *
 * `node .plan/trait-mixin-measure-1/probe/summarize.ts [checks/bench.jsonl]`
 */
import { readFile } from 'node:fs/promises';

type Variant = 'flattened' | 'inline' | 'helper';

type Row = Readonly<{
  engine: string;
  run: string;
  workload?: string;
  median?: Readonly<Record<Variant, number>>;
  variant?: Variant;
  maps?: Readonly<{ sameClass: boolean; distinctClasses: number }>;
}>;

const path =
  process.argv[2] ?? new URL('../checks/bench.jsonl', import.meta.url).pathname;
const rows: Row[] = (await readFile(path, 'utf8'))
  .split('\n')
  .filter((line: string) => line.trim() !== '')
  .map((line: string) => JSON.parse(line) as Row);

function median(values: readonly number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  const mid = sorted.length >> 1;

  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const ns = (n: number) => (n >= 100 ? n.toFixed(0) : n.toFixed(1));
const pct = (ratio: number) =>
  `${ratio >= 1 ? '+' : '−'}${Math.abs((ratio - 1) * 100).toFixed(1)} %`;

for (const engine of [...new Set(rows.map((r) => r.engine))]) {
  const timed = rows.filter((r) => r.engine === engine && r.workload != null);
  const runs = new Set(timed.map((r) => r.run)).size;

  console.log(`\n${engine}, ${runs} runs\n`);
  console.log(
    '| Workload | Flattened, ns | Mixin, inline | Range over runs | Mixin, helper | Range over runs |',
  );
  console.log('| --- | --: | --: | --: | --: | --: |');

  for (const workload of [...new Set(timed.map((r) => r.workload!))]) {
    const of = timed.filter((r) => r.workload === workload);
    const ratios = (variant: Variant) =>
      of.map((r) => r.median![variant] / r.median!.flattened);
    const cell = (variant: Variant) => {
      const values = ratios(variant);

      return [
        pct(median(values)),
        `${pct(Math.min(...values))} to ${pct(Math.max(...values))}`,
      ];
    };

    console.log(
      `| ${workload} | ${ns(median(of.map((r) => r.median!.flattened)))} | ${cell('inline').join(' | ')} | ${cell('helper').join(' | ')} |`,
    );
  }

  const maps = new Set(
    rows
      .filter((r) => r.engine === engine && r.maps != null)
      .map(
        (r) =>
          `${r.variant}: one map per class: ${r.maps!.sameClass}; distinct maps across the 15 classes: ${r.maps!.distinctClasses}`,
      ),
  );

  for (const line of maps) {
    console.log(`\n${line}`);
  }
}
