/**
 * **Probe E — input policy. THROWAWAY.**
 *
 * Not a regression suite. This file exists to *observe* what the current
 * `src/` does to interactive descendants of a draggable row; its output is
 * `.plan/probes/api-3-input-policy.md`. Delete it once that write-up is
 * accepted — nothing here is a contract.
 *
 * Real Chromium input only: presses, moves and releases go through CDP
 * `Input.dispatchMouseEvent` and keystrokes through Playwright's keyboard, so
 * the events are trusted and the browser's own default actions (focus, caret
 * placement, text selection, form-control operation) actually run. Synthetic
 * `dispatchEvent` would answer none of the ten questions.
 *
 * Every observation is an inline snapshot, so what is written below is what
 * Chromium did, not what anyone expected it to do.
 *
 * Two harness limits, both deliberate:
 *
 * - **No real navigation.** The `<a href>` case records the click event's
 *   `defaultPrevented` at `document` — after every library handler — and only
 *   then suppresses the navigation. That is the exact quantity that decides
 *   whether the link activates.
 * - **No popup `<select>`.** Pressing a popup `<select>` opens a native menu
 *   that blocks the renderer and kills the test channel. The pointer case uses
 *   `<select size="3">`, which is a real listbox with no popup; the popup
 *   `<select>` is exercised by keyboard only.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';
import { draggable } from '../src/drag.ts';
import { callbacks } from '../src/sortable/callbacks.ts';
import { handle } from '../src/sortable/handle.ts';
import { y } from '../src/sortable/y.ts';
import {
  ReorderResolution,
  type SortableFeature,
  sortable,
} from '../src/sortable.ts';

const ROW_WIDTH = 340;

type EventLogEntry = Readonly<{
  type: string;
  target: string;
  defaultPrevented: boolean;
}>;

type Fixture = Readonly<{
  root: HTMLElement;
  rows: readonly HTMLElement[];
  control(name: string): HTMLElement;
  row(name: string): HTMLElement;
  grip(name: string): HTMLElement;
  log: EventLogEntry[];
  starts: HTMLElement[];
  requests: unknown[];
  finishes: unknown[];
  cancels: unknown[];
  errors: unknown[];
  clicks: string[];
  placeholder(): HTMLElement | null;
  order(): string[];
}>;

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }

  document.getSelection()?.removeAllRanges();
});

// ---------------------------------------------------------------------------
// Real input
// ---------------------------------------------------------------------------

type Point = Readonly<{ x: number; y: number }>;

/**
 * The tester runs inside an iframe; CDP coordinates are main-frame viewport
 * coordinates. Walk the (same-origin) frame chain to convert.
 */
function toPage(local: Point): Point {
  let x = local.x;
  let y = local.y;
  let view: Window = window;

  while (view.frameElement !== null) {
    const rect = view.frameElement.getBoundingClientRect();

    x += rect.left;
    y += rect.top;
    view = view.parent;
  }

  return { x, y };
}

/** The local-coordinate centre of `element`. */
function centre(element: Element): Point {
  const rect = element.getBoundingClientRect();

  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** A point `fraction` of the way across `element`, vertically centred. */
function across(element: Element, fraction: number): Point {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left + rect.width * fraction,
    y: rect.top + rect.height / 2,
  };
}

const MODIFIER_ALT = 1;
const MODIFIER_CTRL = 2;
const MODIFIER_META = 4;
const MODIFIER_SHIFT = 8;

async function mouse(
  type: 'mousePressed' | 'mouseMoved' | 'mouseReleased',
  local: Point,
  buttons: number,
  modifiers: number,
): Promise<void> {
  const page = toPage(local);

  await cdp().send('Input.dispatchMouseEvent', {
    type,
    x: page.x,
    y: page.y,
    button: type === 'mouseMoved' && buttons === 0 ? 'none' : 'left',
    buttons,
    clickCount: type === 'mouseMoved' ? 0 : 1,
    modifiers,
    pointerType: 'mouse',
  });
}

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });

/** Press, move in steps, release. Crosses the 8px threshold when it can. */
async function dragFrom(
  from: Point,
  dx: number,
  dy: number,
  modifiers = 0,
): Promise<void> {
  await mouse('mousePressed', from, 1, modifiers);

  for (let step = 1; step <= 4; step += 1) {
    await mouse(
      'mouseMoved',
      { x: from.x + (dx * step) / 4, y: from.y + (dy * step) / 4 },
      1,
      modifiers,
    );
    await nextFrame();
  }

  await mouse(
    'mouseReleased',
    { x: from.x + dx, y: from.y + dy },
    0,
    modifiers,
  );
  await nextFrame();
}

/** Press and release 1px apart — never crosses the 8px threshold. */
async function tapAt(local: Point, modifiers = 0): Promise<void> {
  await mouse('mousePressed', local, 1, modifiers);
  await mouse('mouseMoved', { x: local.x + 1, y: local.y }, 1, modifiers);
  await mouse('mouseReleased', { x: local.x + 1, y: local.y }, 0, modifiers);
  await nextFrame();
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

type ControlSpec = Readonly<{ name: string; html: string }>;

const CONTROLS: readonly ControlSpec[] = [
  { name: 'button', html: '<button type="button" data-c>press me</button>' },
  { name: 'link', html: '<a href="#probe-e" data-c>go somewhere</a>' },
  {
    name: 'text',
    html: '<input type="text" data-c value="alpha bravo charlie" style="width:200px">',
  },
  {
    name: 'range',
    html: '<input type="range" data-c min="0" max="100" value="0" style="width:200px">',
  },
  {
    name: 'listbox',
    html: '<select data-c size="3"><option value="a">a</option><option value="b">b</option><option value="c">c</option></select>',
  },
  {
    name: 'combobox',
    html: '<select data-c><option value="a">a</option><option value="b">b</option></select>',
  },
  {
    name: 'prose',
    html: '<span data-c>lorem ipsum dolor sit amet</span>',
  },
  {
    name: 'editable',
    html: '<div data-c contenteditable="true" style="min-width:200px">quick brown fox</div>',
  },
];

type BuildOptions = Readonly<{ useHandle?: boolean }>;

function build(options: BuildOptions = {}): Fixture {
  const root = document.createElement('div');

  root.style.cssText = [
    'position:fixed',
    'left:0px',
    'top:0px',
    `width:${ROW_WIDTH}px`,
    'background:#fff',
    'z-index:2147483000',
    'font:14px/1.2 monospace',
    'margin:0',
    'padding:0',
  ].join(';');
  document.body.append(root);

  const rows: HTMLElement[] = [];
  const controls = new Map<string, HTMLElement>();
  const grips = new Map<string, HTMLElement>();
  const rowByName = new Map<string, HTMLElement>();

  for (const spec of CONTROLS) {
    const row = document.createElement('div');

    row.dataset['name'] = spec.name;
    row.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:8px',
      'min-height:44px',
      `width:${ROW_WIDTH}px`,
      'box-sizing:border-box',
      'background:#eef',
      'border:0',
      'margin:0',
    ].join(';');
    row.innerHTML = `<span class="grip" style="width:28px;height:28px;flex:none;background:#99f">::</span>${spec.html}`;
    root.append(row);
    rows.push(row);
    rowByName.set(spec.name, row);
    controls.set(spec.name, row.querySelector('[data-c]') as HTMLElement);
    grips.set(spec.name, row.querySelector('.grip') as HTMLElement);
  }

  const log: EventLogEntry[] = [];
  const starts: HTMLElement[] = [];
  const requests: unknown[] = [];
  const finishes: unknown[] = [];
  const cancels: unknown[] = [];
  const errors: unknown[] = [];
  const clicks: string[] = [];
  const listeners = new AbortController();

  const describeTarget = (target: EventTarget | null): string => {
    if (!(target instanceof Element)) {
      return 'non-element';
    }

    const row = target.closest('[data-name]');
    const name = row instanceof HTMLElement ? row.dataset['name'] : 'outside';

    return `${name}/${target.tagName.toLowerCase()}${
      target.hasAttribute('data-c') ? '[control]' : ''
    }`;
  };

  // Bubble-phase, on `document` — strictly after the kernel's own `root`
  // listener, so `defaultPrevented` reflects what the library did.
  for (const type of [
    'pointerdown',
    'mousedown',
    'mouseup',
    'click',
    'focusin',
    'selectstart',
    'keydown',
    'beforeinput',
  ]) {
    document.addEventListener(
      type,
      (event) => {
        log.push({
          type,
          target: describeTarget(event.target),
          defaultPrevented: event.defaultPrevented,
        });

        if (type === 'click') {
          clicks.push(
            `${describeTarget(event.target)}:${
              event.defaultPrevented ? 'prevented' : 'live'
            }`,
          );
          // Never navigate: the tester is the page.
          event.preventDefault();
        }
      },
      { signal: listeners.signal },
    );
  }

  const features: SortableFeature[] = [
    y(),
    callbacks({
      onReorder: (request) => {
        requests.push(request);
        return ReorderResolution.accept();
      },
      onStart: (item) => {
        starts.push(item);
      },
      onFinish: (result) => {
        finishes.push(result);
      },
      onCancel: (result) => {
        cancels.push(result);
      },
      onError: (error) => {
        errors.push(error);
      },
    }),
  ];

  if (options.useHandle) {
    features.push(
      handle((item) => item.querySelector('.grip')),
    );
  }

  const controller = draggable(root, sortable(rows, ...features));

  cleanup.push(() => {
    listeners.abort();
    controller.destroy();
    root.remove();
  });

  return {
    root,
    rows,
    control: (name) => controls.get(name)!,
    row: (name) => rowByName.get(name)!,
    grip: (name) => grips.get(name)!,
    log,
    starts,
    requests,
    finishes,
    cancels,
    errors,
    clicks,
    placeholder: () => root.querySelector('[data-drag-placeholder]'),
    order: () =>
      [...root.children]
        .filter((node): node is HTMLElement => node instanceof HTMLElement)
        .map((node) => node.dataset['name'] ?? 'placeholder'),
  };
}

const prevented = (log: readonly EventLogEntry[], type: string): boolean[] =>
  log.filter((entry) => entry.type === type).map((e) => e.defaultPrevented);

const saw = (log: readonly EventLogEntry[], type: string): boolean =>
  log.some((entry) => entry.type === type);

// ---------------------------------------------------------------------------
// 0 — harness calibration
// ---------------------------------------------------------------------------

describe('probe E / calibration', () => {
  it('should land CDP input on the intended element', async () => {
    const fixture = build();
    const target = fixture.control('button');
    const point = centre(target);

    await mouse('mouseMoved', point, 0, 0);
    await nextFrame();

    expect({
      hitTestIsTarget: document.elementFromPoint(point.x, point.y) === target,
      hovered: target.matches(':hover'),
    }).toMatchInlineSnapshot(`
      {
        "hitTestIsTarget": true,
        "hovered": true,
      }
    `);
  });

  it('should reorder from the grip with real input', async () => {
    // The wiring sanity check: without this, every "nothing happened" below
    // could just mean the fixture is dead.
    const fixture = build();

    await dragFrom(centre(fixture.grip('button')), 0, 100);

    expect({
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
      finishes: fixture.finishes.length,
      errors: fixture.errors.length,
      order: fixture.order(),
    }).toMatchInlineSnapshot(`
      {
        "dragStarted": 1,
        "errors": 0,
        "finishes": 1,
        "order": [
          "button",
          "link",
          "text",
          "range",
          "listbox",
          "combobox",
          "prose",
          "editable",
        ],
        "reorderRequests": 1,
      }
    `);
  });
});

// ---------------------------------------------------------------------------
// 1..6 — nested controls
// ---------------------------------------------------------------------------

describe('probe E / nested controls', () => {
  it('should observe a sub-threshold tap on a nested <button>', async () => {
    const fixture = build();
    const button = fixture.control('button');

    await tapAt(centre(button));

    expect({
      pointerdownPrevented: prevented(fixture.log, 'pointerdown'),
      mousedownFired: saw(fixture.log, 'mousedown'),
      clicks: fixture.clicks,
      focusinTargets: fixture.log
        .filter((e) => e.type === 'focusin')
        .map((e) => e.target),
      activeIsButton: document.activeElement === button,
      dragStarted: fixture.starts.length,
    }).toMatchInlineSnapshot(`
      {
        "activeIsButton": false,
        "clicks": [
          "button/button[control]:live",
        ],
        "dragStarted": 0,
        "focusinTargets": [],
        "mousedownFired": false,
        "pointerdownPrevented": [
          true,
        ],
      }
    `);
  });

  it('should observe a sub-threshold tap on a nested <a href>', async () => {
    const fixture = build();
    const link = fixture.control('link');

    await tapAt(centre(link));

    expect({
      pointerdownPrevented: prevented(fixture.log, 'pointerdown'),
      mousedownFired: saw(fixture.log, 'mousedown'),
      // `live` means the click reached `document` with its default intact —
      // the navigation would have happened.
      clicks: fixture.clicks,
      activeIsLink: document.activeElement === link,
      dragStarted: fixture.starts.length,
    }).toMatchInlineSnapshot(`
      {
        "activeIsLink": false,
        "clicks": [
          "link/a[control]:live",
        ],
        "dragStarted": 0,
        "mousedownFired": false,
        "pointerdownPrevented": [
          true,
        ],
      }
    `);
  });

  it('should observe focus and caret placement in a nested text input', async () => {
    const fixture = build();
    const input = fixture.control('text') as HTMLInputElement;

    await tapAt(across(input, 0.5));

    expect({
      pointerdownPrevented: prevented(fixture.log, 'pointerdown'),
      mousedownFired: saw(fixture.log, 'mousedown'),
      focused: document.activeElement === input,
      caret: input.selectionStart,
      dragStarted: fixture.starts.length,
    }).toMatchInlineSnapshot(`
      {
        "caret": 0,
        "dragStarted": 0,
        "focused": false,
        "mousedownFired": false,
        "pointerdownPrevented": [
          true,
        ],
      }
    `);
  });

  it('should observe drag-selecting text inside a nested input', async () => {
    const fixture = build();
    const input = fixture.control('text') as HTMLInputElement;
    const rect = input.getBoundingClientRect();

    await dragFrom({ x: rect.left + 6, y: rect.top + rect.height / 2 }, 120, 0);

    expect({
      focused: document.activeElement === input,
      selected: input.value.slice(
        input.selectionStart ?? 0,
        input.selectionEnd ?? 0,
      ),
      selectstartFired: saw(fixture.log, 'selectstart'),
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
      order: fixture.order(),
    }).toMatchInlineSnapshot(`
      {
        "dragStarted": 1,
        "focused": false,
        "order": [
          "button",
          "link",
          "text",
          "range",
          "listbox",
          "combobox",
          "prose",
          "editable",
        ],
        "reorderRequests": 0,
        "selected": "",
        "selectstartFired": false,
      }
    `);
  });

  it('should observe a tap on a nested <input type="range">', async () => {
    const fixture = build();
    const range = fixture.control('range') as HTMLInputElement;

    await tapAt(across(range, 0.75));

    expect({
      pointerdownPrevented: prevented(fixture.log, 'pointerdown'),
      mousedownFired: saw(fixture.log, 'mousedown'),
      value: range.value,
      moved: range.value !== '0',
      dragStarted: fixture.starts.length,
    }).toMatchInlineSnapshot(`
      {
        "dragStarted": 0,
        "mousedownFired": false,
        "moved": false,
        "pointerdownPrevented": [
          true,
        ],
        "value": "0",
      }
    `);
  });

  it('should observe dragging the thumb of a nested <input type="range">', async () => {
    const fixture = build();
    const range = fixture.control('range') as HTMLInputElement;

    await dragFrom(across(range, 0.02), 100, 0);

    expect({
      value: range.value,
      moved: range.value !== '0',
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
    }).toMatchInlineSnapshot(`
      {
        "dragStarted": 1,
        "moved": false,
        "reorderRequests": 0,
        "value": "0",
      }
    `);
  });

  it('should observe a tap on a nested <select size="3"> option', async () => {
    const fixture = build();
    const listbox = fixture.control('listbox') as HTMLSelectElement;
    const option = listbox.options[1]!;
    // A multi-row `<select>` starts with nothing selected, so the baseline is
    // the empty string, not the first option.
    const before = listbox.value;

    await tapAt(centre(option));

    expect({
      pointerdownPrevented: prevented(fixture.log, 'pointerdown'),
      mousedownFired: saw(fixture.log, 'mousedown'),
      before,
      after: listbox.value,
      selectionChanged: listbox.value !== before,
      focused: document.activeElement === listbox,
      dragStarted: fixture.starts.length,
    }).toMatchInlineSnapshot(`
      {
        "after": "",
        "before": "",
        "dragStarted": 0,
        "focused": false,
        "mousedownFired": false,
        "pointerdownPrevented": [
          true,
        ],
        "selectionChanged": false,
      }
    `);
  });

  it('should observe keyboard operation of a nested popup <select>', async () => {
    const fixture = build();
    const combobox = fixture.control('combobox') as HTMLSelectElement;

    combobox.focus();
    await userEvent.keyboard('{ArrowDown}');
    await nextFrame();

    expect({
      value: combobox.value,
      optionAdvanced: combobox.value !== 'a',
      keydownPrevented: prevented(fixture.log, 'keydown'),
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
      order: fixture.order(),
    }).toMatchInlineSnapshot(`
      {
        "dragStarted": 1,
        "keydownPrevented": [
          true,
        ],
        "optionAdvanced": false,
        "order": [
          "button",
          "link",
          "text",
          "range",
          "listbox",
          "combobox",
          "prose",
          "editable",
        ],
        "reorderRequests": 1,
        "value": "a",
      }
    `);
  });

  it('should observe selecting prose inside a row', async () => {
    const fixture = build();
    const prose = fixture.control('prose');
    const rect = prose.getBoundingClientRect();

    await dragFrom(
      { x: rect.left + 2, y: rect.top + rect.height / 2 },
      Math.max(60, rect.width - 6),
      0,
    );

    expect({
      selection: document.getSelection()?.toString() ?? '',
      selectstartFired: saw(fixture.log, 'selectstart'),
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
    }).toMatchInlineSnapshot(`
      {
        "dragStarted": 1,
        "reorderRequests": 0,
        "selection": "",
        "selectstartFired": false,
      }
    `);
  });

  it('should observe focus, caret and typing in a nested contenteditable', async () => {
    const fixture = build();
    const editable = fixture.control('editable');

    await tapAt(across(editable, 0.4));

    const focusedByPointer = document.activeElement === editable;
    const caretAfterPointer = document.getSelection()?.focusOffset ?? -1;

    await userEvent.keyboard('XY');
    await nextFrame();

    expect({
      pointerdownPrevented: prevented(fixture.log, 'pointerdown'),
      focusedByPointer,
      caretAfterPointer,
      text: editable.textContent,
      typed: editable.textContent !== 'quick brown fox',
      beforeinputFired: saw(fixture.log, 'beforeinput'),
      dragStarted: fixture.starts.length,
    }).toMatchInlineSnapshot(`
      {
        "beforeinputFired": false,
        "caretAfterPointer": 0,
        "dragStarted": 0,
        "focusedByPointer": false,
        "pointerdownPrevented": [
          true,
        ],
        "text": "quick brown fox",
        "typed": false,
      }
    `);
  });
});

// ---------------------------------------------------------------------------
// 7 — arrow keys inside an interactive descendant
// ---------------------------------------------------------------------------

describe('probe E / arrow keys inside a descendant', () => {
  it('should observe ArrowRight in a nested text input', async () => {
    const fixture = build();
    const input = fixture.control('text') as HTMLInputElement;

    input.focus();
    input.setSelectionRange(5, 5);
    fixture.log.length = 0;

    await userEvent.keyboard('{ArrowRight}');
    await nextFrame();

    expect({
      caret: input.selectionStart,
      caretMoved: input.selectionStart !== 5,
      keydownPrevented: prevented(fixture.log, 'keydown'),
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
      requested: fixture.requests.map((request) => ({
        from: (request as { from: number }).from,
        to: (request as { to: number }).to,
      })),
      finishes: fixture.finishes.length,
    }).toMatchInlineSnapshot(`
      {
        "caret": 5,
        "caretMoved": false,
        "dragStarted": 1,
        "finishes": 1,
        "keydownPrevented": [
          true,
        ],
        "reorderRequests": 1,
        "requested": [
          {
            "from": 2,
            "to": 3,
          },
        ],
      }
    `);
  });

  it('should observe ArrowUp at the collection edge vs away from it', async () => {
    // The edge case is the one place the command declines, so the *same*
    // keystroke has two meanings depending on which row holds focus.
    const fixture = build();
    const edgeInput = document.createElement('input');

    edgeInput.type = 'text';
    edgeInput.value = 'edge row';
    fixture.row('button').append(edgeInput);
    edgeInput.focus();
    edgeInput.setSelectionRange(4, 4);
    fixture.log.length = 0;

    await userEvent.keyboard('{ArrowUp}');
    await nextFrame();

    const atEdge = {
      keydownPrevented: prevented(fixture.log, 'keydown'),
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
    };

    fixture.log.length = 0;

    await userEvent.keyboard('{ArrowDown}');
    await nextFrame();

    expect({
      atEdge,
      awayFromEdge: {
        keydownPrevented: prevented(fixture.log, 'keydown'),
        dragStarted: fixture.starts.length,
        reorderRequests: fixture.requests.length,
      },
      order: fixture.order(),
    }).toMatchInlineSnapshot(`
      {
        "atEdge": {
          "dragStarted": 0,
          "keydownPrevented": [
            false,
          ],
          "reorderRequests": 0,
        },
        "awayFromEdge": {
          "dragStarted": 1,
          "keydownPrevented": [
            true,
          ],
          "reorderRequests": 1,
        },
        "order": [
          "button",
          "link",
          "text",
          "range",
          "listbox",
          "combobox",
          "prose",
          "editable",
        ],
      }
    `);
  });

  it('should observe arrow keys in a nested contenteditable', async () => {
    // The editable is the **last** row, so ArrowRight maps to the infeasible
    // direction and ArrowLeft to the feasible one. Both are recorded, because
    // the difference between them is entirely positional.
    const fixture = build();
    const editable = fixture.control('editable');
    const selection = document.getSelection()!;

    const putCaret = (offset: number): void => {
      const range = document.createRange();

      editable.focus();
      range.setStart(editable.firstChild!, offset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      fixture.log.length = 0;
    };

    putCaret(5);
    await userEvent.keyboard('{ArrowRight}');
    await nextFrame();

    const towardTheEdge = {
      caretOffset: document.getSelection()?.focusOffset ?? -1,
      caretMoved: (document.getSelection()?.focusOffset ?? -1) !== 5,
      keydownPrevented: prevented(fixture.log, 'keydown'),
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
    };

    putCaret(5);
    await userEvent.keyboard('{ArrowLeft}');
    await nextFrame();

    expect({
      towardTheEdge,
      awayFromTheEdge: {
        caretOffset: document.getSelection()?.focusOffset ?? -1,
        caretMoved: (document.getSelection()?.focusOffset ?? -1) !== 5,
        keydownPrevented: prevented(fixture.log, 'keydown'),
        dragStarted: fixture.starts.length,
        reorderRequests: fixture.requests.length,
      },
    }).toMatchInlineSnapshot(`
      {
        "awayFromTheEdge": {
          "caretMoved": false,
          "caretOffset": 5,
          "dragStarted": 1,
          "keydownPrevented": [
            true,
          ],
          "reorderRequests": 1,
        },
        "towardTheEdge": {
          "caretMoved": true,
          "caretOffset": 6,
          "dragStarted": 0,
          "keydownPrevented": [
            false,
          ],
          "reorderRequests": 0,
        },
      }
    `);
  });

  it('should observe Shift+ArrowRight (extend selection) in a nested input', async () => {
    const fixture = build();
    const input = fixture.control('text') as HTMLInputElement;

    input.focus();
    input.setSelectionRange(5, 5);
    fixture.log.length = 0;

    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await nextFrame();

    expect({
      selected: input.value.slice(
        input.selectionStart ?? 0,
        input.selectionEnd ?? 0,
      ),
      keydownPrevented: prevented(fixture.log, 'keydown'),
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
    }).toMatchInlineSnapshot(`
      {
        "dragStarted": 1,
        "keydownPrevented": [
          false,
          true,
        ],
        "reorderRequests": 1,
        "selected": "",
      }
    `);
  });
});

// ---------------------------------------------------------------------------
// 8 — modifier keys at admission
// ---------------------------------------------------------------------------

describe('probe E / modifiers', () => {
  it('should observe whether a modified press admits and activates', async () => {
    const outcomes: Record<string, unknown> = {};

    for (const [name, mask] of [
      ['none', 0],
      ['shift', MODIFIER_SHIFT],
      ['ctrl', MODIFIER_CTRL],
      ['meta', MODIFIER_META],
      ['alt', MODIFIER_ALT],
    ] as const) {
      const fixture = build();

      await dragFrom(centre(fixture.grip('prose')), 0, -60, mask);

      outcomes[name] = {
        admitted: prevented(fixture.log, 'pointerdown'),
        dragStarted: fixture.starts.length,
        reorderRequests: fixture.requests.length,
      };

      for (const dispose of cleanup.splice(0)) {
        dispose();
      }
    }

    expect(outcomes).toMatchInlineSnapshot(`
      {
        "alt": {
          "admitted": [
            true,
          ],
          "dragStarted": 1,
          "reorderRequests": 1,
        },
        "ctrl": {
          "admitted": [
            true,
          ],
          "dragStarted": 1,
          "reorderRequests": 1,
        },
        "meta": {
          "admitted": [
            true,
          ],
          "dragStarted": 1,
          "reorderRequests": 1,
        },
        "none": {
          "admitted": [
            true,
          ],
          "dragStarted": 1,
          "reorderRequests": 1,
        },
        "shift": {
          "admitted": [
            true,
          ],
          "dragStarted": 1,
          "reorderRequests": 1,
        },
      }
    `);
  });

  it('should observe a modified sub-threshold tap on a nested link', async () => {
    const outcomes: Record<string, unknown> = {};

    for (const [name, mask] of [
      ['shift', MODIFIER_SHIFT],
      ['ctrl', MODIFIER_CTRL],
      ['meta', MODIFIER_META],
    ] as const) {
      const fixture = build();

      await tapAt(centre(fixture.control('link')), mask);

      outcomes[name] = {
        pointerdownPrevented: prevented(fixture.log, 'pointerdown'),
        clicks: fixture.clicks,
        dragStarted: fixture.starts.length,
      };

      for (const dispose of cleanup.splice(0)) {
        dispose();
      }
    }

    expect(outcomes).toMatchInlineSnapshot(`
      {
        "ctrl": {
          "clicks": [
            "link/a[control]:live",
          ],
          "dragStarted": 0,
          "pointerdownPrevented": [
            true,
          ],
        },
        "meta": {
          "clicks": [
            "link/a[control]:live",
          ],
          "dragStarted": 0,
          "pointerdownPrevented": [
            true,
          ],
        },
        "shift": {
          "clicks": [
            "link/a[control]:live",
          ],
          "dragStarted": 0,
          "pointerdownPrevented": [
            true,
          ],
        },
      }
    `);
  });
});

// ---------------------------------------------------------------------------
// 10 — handle() as the mitigation
// ---------------------------------------------------------------------------

describe('probe E / handle() scoping', () => {
  it('should observe the pointer cases again with handle() composed', async () => {
    const fixture = build({ useHandle: true });
    const button = fixture.control('button');

    await tapAt(centre(button));

    const buttonCase = {
      pointerdownPrevented: prevented(fixture.log, 'pointerdown'),
      mousedownFired: saw(fixture.log, 'mousedown'),
      clicks: [...fixture.clicks],
      focused: document.activeElement === button,
    };

    const input = fixture.control('text') as HTMLInputElement;

    await tapAt(across(input, 0.5));

    const textCase = {
      focused: document.activeElement === input,
      caret: input.selectionStart,
    };

    const inputRect = input.getBoundingClientRect();

    await dragFrom(
      { x: inputRect.left + 6, y: inputRect.top + inputRect.height / 2 },
      120,
      0,
    );

    const textDragCase = {
      selected: input.value.slice(
        input.selectionStart ?? 0,
        input.selectionEnd ?? 0,
      ),
      dragStarted: fixture.starts.length,
    };

    const prose = fixture.control('prose');
    const proseRect = prose.getBoundingClientRect();

    await dragFrom(
      { x: proseRect.left + 2, y: proseRect.top + proseRect.height / 2 },
      Math.max(60, proseRect.width - 6),
      0,
    );

    const proseCase = {
      selection: document.getSelection()?.toString() ?? '',
      dragStarted: fixture.starts.length,
    };

    const range = fixture.control('range') as HTMLInputElement;

    await tapAt(across(range, 0.75));

    const rangeCase = { value: range.value, moved: range.value !== '0' };

    const listbox = fixture.control('listbox') as HTMLSelectElement;

    await tapAt(centre(listbox.options[1]!));

    const listboxCase = {
      value: listbox.value,
      changed: listbox.value !== 'a',
    };

    const editable = fixture.control('editable');

    await tapAt(across(editable, 0.4));
    await userEvent.keyboard('XY');
    await nextFrame();

    const editableCase = {
      focused: document.activeElement === editable,
      text: editable.textContent,
      typed: editable.textContent !== 'quick brown fox',
    };

    expect({
      buttonCase,
      textCase,
      textDragCase,
      proseCase,
      rangeCase,
      listboxCase,
      editableCase,
      errors: fixture.errors.length,
    }).toMatchInlineSnapshot(`
      {
        "buttonCase": {
          "clicks": [
            "button/button[control]:live",
          ],
          "focused": true,
          "mousedownFired": true,
          "pointerdownPrevented": [
            false,
          ],
        },
        "editableCase": {
          "focused": true,
          "text": "quick broXYn fox",
          "typed": true,
        },
        "errors": 0,
        "listboxCase": {
          "changed": true,
          "value": "b",
        },
        "proseCase": {
          "dragStarted": 0,
          "selection": "lorem ipsum dolor sit amet",
        },
        "rangeCase": {
          "moved": true,
          "value": "78",
        },
        "textCase": {
          "caret": 16,
          "focused": true,
        },
        "textDragCase": {
          "dragStarted": 0,
          "selected": "alpha bravo charlie",
        },
      }
    `);
  });

  it('should observe the keyboard cases again with handle() composed', async () => {
    const fixture = build({ useHandle: true });
    const input = fixture.control('text') as HTMLInputElement;

    input.focus();
    input.setSelectionRange(5, 5);
    fixture.log.length = 0;

    await userEvent.keyboard('{ArrowRight}');
    await nextFrame();

    const inputCase = {
      caret: input.selectionStart,
      caretMoved: input.selectionStart !== 5,
      keydownPrevented: prevented(fixture.log, 'keydown'),
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
    };

    // Is the keyboard command reachable at all once a handle is composed?
    // `resolveItem` requires the handle to be in the event's composed path.
    const grip = fixture.grip('prose');

    grip.tabIndex = 0;
    grip.focus();
    fixture.log.length = 0;

    await userEvent.keyboard('{ArrowUp}');
    await nextFrame();

    expect({
      inputCase,
      fromGrip: {
        focusedGrip: document.activeElement === grip,
        keydownPrevented: prevented(fixture.log, 'keydown'),
        dragStarted: fixture.starts.length,
        reorderRequests: fixture.requests.length,
      },
      order: fixture.order(),
    }).toMatchInlineSnapshot(`
      {
        "fromGrip": {
          "dragStarted": 1,
          "focusedGrip": true,
          "keydownPrevented": [
            true,
          ],
          "reorderRequests": 1,
        },
        "inputCase": {
          "caret": 6,
          "caretMoved": true,
          "dragStarted": 0,
          "keydownPrevented": [
            false,
          ],
          "reorderRequests": 0,
        },
        "order": [
          "button",
          "link",
          "text",
          "range",
          "listbox",
          "combobox",
          "prose",
          "editable",
        ],
      }
    `);
  });

  it('should observe that the grip still drags with handle() composed', async () => {
    const fixture = build({ useHandle: true });

    await dragFrom(centre(fixture.grip('prose')), 0, -60);

    expect({
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
      errors: fixture.errors.length,
    }).toMatchInlineSnapshot(`
      {
        "dragStarted": 1,
        "errors": 0,
        "reorderRequests": 1,
      }
    `);
  });
});

// ---------------------------------------------------------------------------
// 9 — IME composition (attempted last: it may not be synthesizable)
// ---------------------------------------------------------------------------

describe('probe E / IME composition', () => {
  it('should observe whether a composition can be synthesized at all', async () => {
    const fixture = build();
    const input = fixture.control('text') as HTMLInputElement;
    const composition: string[] = [];
    const composingFlags: boolean[] = [];

    input.value = '';
    input.focus();

    for (const type of [
      'compositionstart',
      'compositionupdate',
      'compositionend',
    ]) {
      input.addEventListener(type, () => {
        composition.push(type);
      });
    }

    document.addEventListener('keydown', (event) => {
      composingFlags.push(event.isComposing);
    });

    let imeError: string | null = null;

    try {
      await cdp().send('Input.imeSetComposition', {
        text: 'にほ',
        selectionStart: 2,
        selectionEnd: 2,
      });
    } catch (error) {
      imeError = String(error);
    }

    await nextFrame();

    const established = composition.includes('compositionstart');

    if (established) {
      await userEvent.keyboard('{ArrowDown}');
      await nextFrame();
    }

    expect({
      imeError,
      composition,
      established,
      value: input.value,
      keydownIsComposing: composingFlags,
      dragStarted: fixture.starts.length,
      reorderRequests: fixture.requests.length,
    }).toMatchInlineSnapshot(`
      {
        "composition": [
          "compositionstart",
          "compositionupdate",
        ],
        "dragStarted": 1,
        "established": true,
        "imeError": null,
        "keydownIsComposing": [
          true,
        ],
        "reorderRequests": 1,
        "value": "にほ",
      }
    `);
  });
});
