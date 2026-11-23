/**
 * Reads the owner's DevTools performance trace of a _Live Demo_ range drag and
 * attributes its main-thread time to the manager frame, the preview iframe and
 * box-quad.
 *
 * The trace isn't tracked: it is 66 MB. Run from the repository root with its
 * path: `node packages/box-quad/.plan/probes/storybook-demo/trace-attribution.ts
 * <trace.json>`.
 *
 * - The frames come from `TracingStartedInBrowser`: the outermost main frame is
 *   the manager, and its child is the preview iframe.
 * - The drag window runs from the `pointerdown` dispatch to the end of the last
 *   main-thread task that follows the `pointerup`.
 * - `FunctionCall` events carry the frame whose script they run, so they split
 *   the drag's script time by frame.
 * - The CPU profile's samples are attributed by the URL of the nearest script
 *   frame on their stack, as `controls-cost.ts` does.
 */
import { readFile } from 'node:fs/promises';

type TraceEvent = Readonly<{
  name: string;
  ph: string;
  pid: number;
  tid: number;
  ts: number;
  dur?: number;
  args?: Readonly<Record<string, any>>;
}>;

const trace = JSON.parse(await readFile(process.argv[2]!, 'utf8')) as {
  traceEvents: readonly TraceEvent[];
};
const events = trace.traceEvents;
const origin = Math.min(...events.filter((e) => e.ts).map((e) => e.ts));
const at = (e: TraceEvent): number => (e.ts - origin) / 1000;

const started = events.find((e) => e.name === 'TracingStartedInBrowser')!;
const frames = started.args!['data'].frames as readonly {
  frame: string;
  url: string;
  isOutermostMainFrame: boolean;
  processId: number;
}[];
const manager = frames.find((f) => f.isOutermostMainFrame)!;
const preview = frames.find((f) => !f.isOutermostMainFrame)!;
const pid = manager.processId;
const mainThread = events.find(
  (e) =>
    e.ph === 'M' &&
    e.name === 'thread_name' &&
    e.pid === pid &&
    e.args!['name'] === 'CrRendererMain',
)!.tid;

console.log(`manager frame ${manager.frame.slice(0, 6)}: ${manager.url}`);
console.log(`preview frame ${preview.frame.slice(0, 6)}: ${preview.url}`);

const tasks = events.filter(
  (e) => e.pid === pid && e.tid === mainThread && e.name === 'RunTask' && e.dur,
);
const dispatches = events.filter(
  (e) => e.pid === pid && e.name === 'EventDispatch',
);
const down = dispatches.find((e) => e.args!['data'].type === 'pointerdown')!;
const up = dispatches.find((e) => e.args!['data'].type === 'pointerup')!;
const inputs = dispatches.filter((e) => e.args!['data'].type === 'input');
// The last task to start before the main thread goes idle for 100 ms after the
// pointerup.
const after = tasks
  .filter((e) => e.ts >= up.ts && e.dur! > 1000)
  .sort((a, b) => a.ts - b.ts);
let end = up.ts;

for (const task of after) {
  if (task.ts - end > 100_000) {
    break;
  }

  end = Math.max(end, task.ts + task.dur!);
}

const from = at(down);
const to = (end - origin) / 1000;
const inWindow = (e: TraceEvent): boolean => at(e) >= from && at(e) < to;
const windowTasks = tasks.filter(inWindow);
const longTasks = windowTasks.filter((e) => e.dur! > 16_700);
const longest = tasks.reduce((a, b) => (b.dur! > a.dur! ? b : a));

console.log(
  `\ntrace span ${((Math.max(...events.map((e) => e.ts + (e.dur ?? 0))) - origin) / 1000).toFixed(0)} ms`,
);
console.log(
  `longest main-thread task: ${(longest.dur! / 1000).toFixed(1)} ms at ${at(longest).toFixed(0)} ms, ` +
    `of which ${(
      events
        .filter(
          (e) =>
            e.name === 'CpuProfiler::StartProfiling' &&
            e.pid === pid &&
            e.ts >= longest.ts &&
            e.ts < longest.ts + longest.dur!,
        )
        .reduce((sum, e) => sum + (e.dur ?? 0), 0) / 1000
    ).toFixed(1)} ms is CpuProfiler::StartProfiling`,
);
console.log(
  `drag window ${from.toFixed(0)} to ${to.toFixed(0)} ms (${(to - from).toFixed(0)} ms): ` +
    `${inputs.length} input events, main thread busy ${(windowTasks.reduce((s, e) => s + e.dur!, 0) / 1000).toFixed(0)} ms, ` +
    `${longTasks.length} tasks over one 60 Hz frame totalling ${(longTasks.reduce((s, e) => s + e.dur!, 0) / 1000).toFixed(0)} ms, ` +
    `longest ${(Math.max(...windowTasks.map((e) => e.dur!)) / 1000).toFixed(1)} ms`,
);

const byFrame = new Map<string, number>();

for (const call of events.filter(
  (e) => e.name === 'FunctionCall' && e.pid === pid && e.dur && inWindow(e),
)) {
  const data = call.args!['data'];
  const frame =
    data.frame === manager.frame
      ? 'manager'
      : data.frame === preview.frame
        ? 'preview'
        : data.frame;
  const url = String(data.url ?? '')
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/\?.*/, '');
  const file = url.includes('/packages/box-quad/src/')
    ? url
    : url.includes('/sb-manager/') || url.includes('/sb-addons/')
      ? url.replace(/^.*\/(sb-[a-z]+\/[^/]+).*$/, '$1')
      : url
        ? '(other scripts)'
        : '(no url)';
  const key = `${frame}\t${file}`;
  byFrame.set(key, (byFrame.get(key) ?? 0) + call.dur! / 1000);
}

console.log('\nFunctionCall time in the drag window, by frame and script:');

for (const [key, ms] of [...byFrame].sort((a, b) => b[1] - a[1])) {
  console.log(`${ms.toFixed(1).padStart(8)} ms\t${key}`);
}

type ProfileNode = Readonly<{
  id: number;
  parent?: number;
  callFrame: Readonly<{ functionName: string; url?: string }>;
}>;
const nodes = new Map<number, ProfileNode>();
const samples: (readonly [number, number])[] = [];
let time = 0;

for (const event of events) {
  if (event.pid !== pid) {
    continue;
  }

  if (event.name === 'Profile') {
    time = event.args!['data'].startTime;
  } else if (event.name === 'ProfileChunk') {
    const data = event.args!['data'];

    for (const node of data.cpuProfile?.nodes ?? []) {
      nodes.set(node.id, node);
    }

    for (const [index, sample] of (data.cpuProfile?.samples ?? []).entries()) {
      time += data.timeDeltas[index];
      samples.push([sample, time]);
    }
  }
}

function classify(id: number): string {
  const name = nodes.get(id)!.callFrame.functionName;

  if (name === '(idle)') {
    return 'idle';
  }

  if (name === '(garbage collector)') {
    return 'gc';
  }

  for (let node = nodes.get(id); node; node = nodes.get(node.parent ?? -1)) {
    const url = node.callFrame.url ?? '';

    if (url.includes('/sb-manager/') || url.includes('/sb-addons/')) {
      return 'manager';
    }

    if (url.includes('/packages/box-quad/src/')) {
      return 'box-quad';
    }

    if (url) {
      return 'preview';
    }
  }

  return 'program';
}

const classes = new Map<string, number>();

for (let index = 0; index + 1 < samples.length; index += 1) {
  const [id, ts] = samples[index]!;

  if ((ts - origin) / 1000 >= from && (ts - origin) / 1000 < to) {
    const key = classify(id);
    classes.set(
      key,
      (classes.get(key) ?? 0) + (samples[index + 1]![1] - ts) / 1000,
    );
  }
}

console.log('\nCPU samples in the drag window, by the nearest script frame:');

for (const [key, ms] of [...classes].sort((a, b) => b[1] - a[1])) {
  console.log(`${ms.toFixed(1).padStart(8)} ms\t${key}`);
}
