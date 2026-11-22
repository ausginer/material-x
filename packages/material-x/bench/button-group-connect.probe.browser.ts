/* oxlint-disable no-console -- a measurement probe: it prints its readings */
/**
 * Connects and disconnects a group of 50 buttons 1,000 times and reads the
 * time, and Chromium's `performance.memory.usedJSHeapSize` before and after.
 * Each connection waits for the buttons' context lookup, which runs in a
 * microtask after the connect, so each cycle creates and disposes the
 * forwarding of 50 buttons. The probe runs the cycles five times and reports
 * each run.
 *
 * `aube exec vitest run -c bench/vitest.config.ts`
 */
import { expect, it } from 'vitest';
import '../src/button-group/button-group.ts';
import '../src/button/button.ts';

const BUTTONS = 50;
const CYCLES = 1000;
const RUNS = 5;

type MemoryPerformance = Performance & {
  memory?: { usedJSHeapSize: number };
};

function usedHeap(): number | undefined {
  return (performance as MemoryPerformance).memory?.usedJSHeapSize;
}

it('should read the connect and disconnect cost of a group of 50 buttons', async () => {
  const group = document.createElement('mx-button-group');
  group.setAttribute('color', 'tonal');

  for (let index = 0; index < BUTTONS; index += 1) {
    group.append(document.createElement('mx-button'));
  }

  const runs: Array<{ ms: number; heapBefore?: number; heapAfter?: number }> =
    [];

  for (let run = 0; run < RUNS; run += 1) {
    const heapBefore = usedHeap();
    const start = performance.now();

    for (let cycle = 0; cycle < CYCLES; cycle += 1) {
      document.body.append(group);
      // The lookup waits for the parent's definition: one reaction after the
      // connect, and the effect is created in it.
      // oxlint-disable-next-line no-await-in-loop
      await Promise.resolve();
      group.remove();
    }

    runs.push({
      ms: performance.now() - start,
      heapBefore,
      heapAfter: usedHeap(),
    });
  }

  document.body.append(group);
  await Promise.resolve();
  const button = group.firstElementChild!;
  // The forwarding ran: the button carries the group's color as a state.
  expect(button.matches(':state(tonal)')).toBe(true);

  console.log(JSON.stringify({ buttons: BUTTONS, cycles: CYCLES, runs }));
});
