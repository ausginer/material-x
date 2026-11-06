/** The pages' log and the verdict toggles. Page code, not part of the library. */
import { DragFault } from '@ydinjs/drag/fault.js';

export type Log = (text: string, kind?: 'fault' | 'request') => void;

export const describeValue = (value: unknown): string => {
  try {
    return typeof value === 'string' ? JSON.stringify(value) : String(value);
  } catch {
    return '[hostile value]';
  }
};

/** Mounts the log beside the page, and listens for every reported fault. */
export function mountLog(): Log {
  const host = document.querySelector<HTMLElement>('#log')!;
  const head = document.createElement('div');
  const clear = document.createElement('button');
  const lines = document.createElement('div');

  head.className = 'log-head';
  head.textContent = 'Log';
  clear.textContent = 'Clear';
  clear.addEventListener('click', () => {
    lines.textContent = '';
  });
  head.append(clear);
  host.append(head, lines);

  const log: Log = (text, kind) => {
    const line = document.createElement('div');

    line.textContent = text;

    if (kind) {
      line.className = kind;
    }

    lines.append(line);
    lines.lastElementChild!.scrollIntoView({ block: 'nearest' });
  };

  addEventListener('error', (event) => {
    if (event.error instanceof DragFault) {
      log(
        `reported DragFault, cause ${describeValue(event.error.cause)}`,
        'fault',
      );
    }
  });

  return log;
}

export type VerdictMode =
  | 'accept'
  | 'reject'
  | 'wait'
  | 'wait-reject'
  | 'throw';

/** The toggle's choice as a verdict: commit on accept, honouring the signal. */
export function runVerdict<R>(
  mode: VerdictMode,
  signal: AbortSignal,
  commit: () => R,
  reject: () => R,
): R | Promise<R> {
  if (mode === 'throw') {
    throw new Error('the verdict threw');
  }

  if (mode === 'accept') {
    return commit();
  }

  if (mode === 'reject') {
    return reject();
  }

  return new Promise<R>((resolve) => {
    const timer = setTimeout(() => {
      resolve(mode === 'wait' ? commit() : reject());
    }, 900);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
    });
  });
}

export const verdictOptions = `
  <label>Verdict
    <select id="verdict">
      <option value="accept">accepts</option>
      <option value="reject">rejects</option>
      <option value="wait">waits, then accepts</option>
      <option value="wait-reject">waits, then rejects</option>
      <option value="throw">throws</option>
    </select>
  </label>`;

export const read = (id: string): string =>
  document.querySelector<HTMLSelectElement | HTMLInputElement>(`#${id}`)!.value;

export const checked = (id: string): boolean =>
  document.querySelector<HTMLInputElement>(`#${id}`)!.checked;

export const describeResult = (result: {
  type: string;
  origin?: string;
  reason?: unknown;
}): string =>
  `onEnd: ${result.type}${result.origin ? ` origin=${result.origin}` : ''}${
    result.reason === undefined ? '' : ` reason=${describeValue(result.reason)}`
  }`;
