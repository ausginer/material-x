/**
 * **The input policy, against real input** (D-46, D-50, D-54).
 *
 * This file began as probe E — a throwaway that *observed* what `src/` did to
 * interactive descendants of a draggable row, and whose output is
 * `.plan/probes/api-3-input-policy.md`. Phase R promoted it: its ten cases are
 * each a case the shipped package passes silently and wrongly, so every
 * snapshot below now records the **repaired** behavior and fails if it
 * regresses. The observation-era snapshots are in the write-up.
 *
 * The two decisions divide the cases and neither covers them alone. **D-54**
 * moves *when* the pointer path prevents — to the activation threshold
 * crossing — which fixes every case where the press never becomes a drag.
 * **D-46** narrows *what* may be admitted, which fixes the cases that do cross
 * the threshold: a drag-select inside a text input, a slider thumb, arrow keys
 * in a descendant, an IME composition.
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
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  type SortableConfig,
  sortable,
} from '../../src/sortable.ts';

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
  let { x } = local;
  let { y } = local;
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
    // Sequential by necessity: this is real input against a real browser, and
    // a threshold crossing is a *sequence* of samples. `Promise.all` would
    // dispatch four moves with no frame between them, which is a different
    // gesture from the one the policy is being measured against.
    // oxlint-disable-next-line no-await-in-loop
    await mouse(
      'mouseMoved',
      { x: from.x + (dx * step) / 4, y: from.y + (dy * step) / 4 },
      1,
      modifiers,
    );
    // oxlint-disable-next-line no-await-in-loop
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

type BuildOptions = Readonly<{
  useHandle?: boolean;
  /**
   * Which descendant the handle resolves to, `.grip` by default. D-50's case
   * needs a handle that is *itself* one of the declined members, which is the
   * whole point: the list is a default, not a prohibition.
   */
  handleSelector?: string;
}>;

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
    controls.set(spec.name, row.querySelector('[data-c]')!);
    grips.set(spec.name, row.querySelector('.grip')!);
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

  const fragments: Array<Partial<SortableConfig>> = [
    y(),
    {
      onReorder: (request) => {
        requests.push(request);
        return ReorderResolution.accept();
      },
      onStart: (item) => {
        starts.push(item);
      },
      onEnd: (result) => {
        // D-62: the fixture partitions the four arms the library no longer
        // partitions for it.
        if (result.type === 'accepted' || result.type === 'noop') {
          finishes.push(result);
        } else {
          cancels.push(result);
        }
      },
      onError: (error) => {
        errors.push(error);
      },
    },
  ];

  if (options.useHandle) {
    const selector = options.handleSelector ?? '.grip';

    fragments.push({ handle: (item) => item.querySelector(selector) });
  }

  const controller = sortable(root, { items: () => rows }, ...fragments);

  cleanup.push(() => {
    listeners.abort();
    void controller.destroy();
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

describe('input policy / calibration', () => {
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

describe('input policy / nested controls', () => {
  it('should leave a sub-threshold tap on a nested <button> alone', async () => {
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
        "activeIsButton": true,
        "clicks": [
          "button/button[control]:live",
        ],
        "dragStarted": 0,
        "focusinTargets": [
          "button/button[control]",
        ],
        "mousedownFired": true,
        "pointerdownPrevented": [
          false,
        ],
      }
    `);
  });

  it('should leave a sub-threshold tap on a nested <a href> alone', async () => {
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
        "activeIsLink": true,
        "clicks": [
          "link/a[control]:live",
        ],
        "dragStarted": 0,
        "mousedownFired": true,
        "pointerdownPrevented": [
          false,
        ],
      }
    `);
  });

  it('should place focus and a caret in a nested text input', async () => {
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
        "caret": 16,
        "dragStarted": 0,
        "focused": true,
        "mousedownFired": true,
        "pointerdownPrevented": [
          false,
        ],
      }
    `);
  });

  it('should decline a drag-select inside a nested text input', async () => {
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
        "dragStarted": 0,
        "focused": true,
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
        "selected": "alpha bravo charlie",
        "selectstartFired": false,
      }
    `);
  });

  it('should let a tap operate a nested <input type="range">', async () => {
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
        "mousedownFired": true,
        "moved": true,
        "pointerdownPrevented": [
          false,
        ],
        "value": "78",
      }
    `);
  });

  it('should decline a drag on the thumb of a nested <input type="range">', async () => {
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
        "dragStarted": 0,
        "moved": true,
        "reorderRequests": 0,
        "value": "52",
      }
    `);
  });

  it('should let a tap select an option of a nested <select size="3">', async () => {
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
        "after": "b",
        "before": "",
        "dragStarted": 0,
        "focused": true,
        "mousedownFired": true,
        "pointerdownPrevented": [
          false,
        ],
        "selectionChanged": true,
      }
    `);
  });

  it('should leave the arrow keys to a nested popup <select>', async () => {
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
        "dragStarted": 0,
        "keydownPrevented": [
          false,
        ],
        "optionAdvanced": true,
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
        "value": "b",
      }
    `);
  });

  it('should drag the row when an unmodified gesture crosses prose', async () => {
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
        "selectstartFired": true,
      }
    `);
  });

  it('should let a nested contenteditable take focus, a caret and text', async () => {
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
        "beforeinputFired": true,
        "caretAfterPointer": 10,
        "dragStarted": 0,
        "focusedByPointer": true,
        "pointerdownPrevented": [
          false,
        ],
        "text": "quick broXYn fox",
        "typed": true,
      }
    `);
  });
});

// ---------------------------------------------------------------------------
// 7 — arrow keys inside an interactive descendant
// ---------------------------------------------------------------------------

describe('input policy / arrow keys inside a descendant', () => {
  it('should leave ArrowRight to a nested text input', async () => {
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
        "caret": 6,
        "caretMoved": true,
        "dragStarted": 0,
        "finishes": 0,
        "keydownPrevented": [
          false,
        ],
        "reorderRequests": 0,
        "requested": [],
      }
    `);
  });

  it('should ask what the event landed on before asking whether the move is feasible', async () => {
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

  it('should leave the arrow keys to a nested contenteditable', async () => {
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
          "caretMoved": true,
          "caretOffset": 4,
          "dragStarted": 0,
          "keydownPrevented": [
            false,
          ],
          "reorderRequests": 0,
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

  it('should leave Shift+ArrowRight to a nested text input', async () => {
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
        "dragStarted": 0,
        "keydownPrevented": [
          false,
          false,
        ],
        "reorderRequests": 0,
        "selected": " ",
      }
    `);
  });
});

// ---------------------------------------------------------------------------
// 8 — modifier keys at admission
// ---------------------------------------------------------------------------

describe('input policy / modifiers', () => {
  it('should decline an Alt-held press and admit under every other modifier', async () => {
    const outcomes: Record<string, unknown> = {};

    for (const [name, mask] of [
      ['none', 0],
      ['shift', MODIFIER_SHIFT],
      ['ctrl', MODIFIER_CTRL],
      ['meta', MODIFIER_META],
      ['alt', MODIFIER_ALT],
    ] as const) {
      const fixture = build();

      // One fixture at a time, deliberately: each iteration drives the real
      // pointer, and overlapping two drags would let one modifier's gesture
      // observe another's DOM.
      // oxlint-disable-next-line no-await-in-loop
      await dragFrom(centre(fixture.grip('prose')), 0, -60, mask);

      outcomes[name] = {
        // **Renamed from `admitted` when the probe became a suite.** Under the
        // old policy `pointerdown` was prevented exactly when admission
        // succeeded, so the flag doubled as the admission signal; since D-54 it
        // is false for every press, and `dragStarted` is the only honest
        // reading of whether the gesture became a drag.
        pressPrevented: prevented(fixture.log, 'pointerdown'),
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
          "dragStarted": 0,
          "pressPrevented": [
            false,
          ],
          "reorderRequests": 0,
        },
        "ctrl": {
          "dragStarted": 1,
          "pressPrevented": [
            false,
          ],
          "reorderRequests": 1,
        },
        "meta": {
          "dragStarted": 1,
          "pressPrevented": [
            false,
          ],
          "reorderRequests": 1,
        },
        "none": {
          "dragStarted": 1,
          "pressPrevented": [
            false,
          ],
          "reorderRequests": 1,
        },
        "shift": {
          "dragStarted": 1,
          "pressPrevented": [
            false,
          ],
          "reorderRequests": 1,
        },
      }
    `);
  });

  it('should leave a modified sub-threshold tap on a nested link alone', async () => {
    const outcomes: Record<string, unknown> = {};

    for (const [name, mask] of [
      ['shift', MODIFIER_SHIFT],
      ['ctrl', MODIFIER_CTRL],
      ['meta', MODIFIER_META],
    ] as const) {
      const fixture = build();

      // Sequential for the same reason as the modifier sweep above.
      // oxlint-disable-next-line no-await-in-loop
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
            false,
          ],
        },
        "meta": {
          "clicks": [
            "link/a[control]:live",
          ],
          "dragStarted": 0,
          "pointerdownPrevented": [
            false,
          ],
        },
        "shift": {
          "clicks": [
            "link/a[control]:live",
          ],
          "dragStarted": 0,
          "pointerdownPrevented": [
            false,
          ],
        },
      }
    `);
  });
});

// ---------------------------------------------------------------------------
// 10 — { handle:  } as the mitigation
// ---------------------------------------------------------------------------

describe('input policy / { handle:  } scoping', () => {
  it('should admit only from the grip for the pointer cases with { handle:  } composed', async () => {
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

  it('should admit only from the grip for the keyboard cases with { handle:  } composed', async () => {
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

  it('should still drag from the grip with { handle:  } composed', async () => {
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

describe('input policy / IME composition', () => {
  it('should never admit while an IME composition is in progress', async () => {
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
        "dragStarted": 0,
        "established": true,
        "imeError": null,
        "keydownIsComposing": [
          true,
        ],
        "reorderRequests": 0,
        "value": "にほ",
      }
    `);
  });
});

// ---------------------------------------------------------------------------
// 10 — the cases the probe had no reason to run
// ---------------------------------------------------------------------------

describe('input policy / explicit opt-out', () => {
  it('should decline a press inside a [data-drag-ignore] region', async () => {
    // The one row of the decline table that is not a platform element. It
    // exists because the list is a default and a consumer needs a way to name a
    // region the list does not describe — a chart, a canvas, a custom element
    // that owns its own gestures.
    const fixture = build();
    const prose = fixture.control('prose');

    prose.setAttribute('data-drag-ignore', '');

    await dragFrom(centre(prose), 0, -60);

    const marked = fixture.starts.length;

    // The control: the *same* gesture on the *same* element with the attribute
    // gone drags. A `<span>` is in no other row of the table, so the attribute
    // is the only thing that differs between the two halves.
    prose.removeAttribute('data-drag-ignore');

    await dragFrom(centre(prose), 0, -60);

    expect({
      marked,
      unmarked: fixture.starts.length - marked,
    }).toMatchInlineSnapshot(`
      {
        "marked": 0,
        "unmarked": 1,
      }
    `);
  });
});

describe('input policy / D-50, explicit scoping wins', () => {
  it('should admit from a handle that is itself an interactive element', async () => {
    // **The override.** A consumer who resolves the handle *to* the button has
    // scoped dragging to that interaction on purpose, and the default decline
    // must not re-veto it. The test walks the path between the event target and
    // the resolved subject, and a handle shortens that path to nothing.
    const fixture = build({ useHandle: true, handleSelector: '[data-c]' });

    await dragFrom(centre(fixture.control('button')), 0, 100);

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

describe('input policy / the trailing click', () => {
  it('should suppress the drop click and keep the next one', async () => {
    // Real input, because the quantity that matters is what reaches a
    // document-level handler: the suppressor runs in the **capture** phase, so
    // a suppressed click is not a logged-and-prevented click — it is one the
    // fixture's own bubble-phase listener never sees at all.
    const fixture = build();

    await dragFrom(centre(fixture.grip('button')), 0, 100);

    const afterTheDrop = [...fixture.clicks];

    await tapAt(centre(fixture.control('button')));

    expect({
      afterTheDrop,
      afterTheNextTap: fixture.clicks,
    }).toMatchInlineSnapshot(`
      {
        "afterTheDrop": [],
        "afterTheNextTap": [
          "button/button[control]:live",
        ],
      }
    `);
  });
});
