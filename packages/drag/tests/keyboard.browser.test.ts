/**
 * `drag:DRI-14` commands and `drag:DRI-6` refusal, against real key presses:
 * which keys name a command, which keys keep their native meaning, how `handle`
 * and `data-drag-ignore` scope the keyboard path, and when a command is refused.
 */
import { describe, expect, it } from 'vitest';
import { cdp } from 'vitest/browser';
import {
  basicSortable,
  commands,
  focusableList,
  frames,
  grab,
  isChromium,
  log,
  makeList,
  onCleanup,
  order,
  press,
  release,
  row,
  rowsOf,
} from './support/harness.ts';

/**
 * Whether each `keydown` was prevented, read at `document` after the root's
 * listener has run.
 */
function recordPrevented(): boolean[] {
  const prevented: boolean[] = [];
  const listening = new AbortController();

  onCleanup(() => {
    listening.abort();
  });
  document.addEventListener(
    'keydown',
    (event) => {
      prevented.push(event.defaultPrevented);
    },
    { signal: listening.signal },
  );
  return prevented;
}

/** A row's text input, focused with its caret at offset 5. */
function focusedInput(id: string, marked: boolean): HTMLInputElement {
  const input = document.createElement('input');

  input.value = 'hello world';

  if (marked) {
    input.setAttribute('data-drag-ignore', '');
  }

  row(id).replaceChildren(input);
  input.focus();
  input.setSelectionRange(5, 5);
  return input;
}

describe('drag:DRI-14 commands', () => {
  it('should move the focused row one slot toward the start on ArrowLeft', async () => {
    const list = focusableList(3);

    basicSortable(list);
    row('r2').focus();
    await commands.keyPress('ArrowLeft');
    await frames();
    expect(log).toEqual(['start', 'end:accepted']);
    expect(order(list)).toBe('r0,r2,r1');
  });

  it('should move the focused row one slot toward the end on ArrowRight', async () => {
    const list = focusableList(3);

    basicSortable(list);
    row('r0').focus();
    await commands.keyPress('ArrowRight');
    await frames();
    expect(log).toEqual(['start', 'end:accepted']);
    expect(order(list)).toBe('r1,r0,r2');
  });

  it('should prevent an arrow that moves the row', async () => {
    const list = focusableList(3);
    const prevented = recordPrevented();

    basicSortable(list);
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(prevented).toEqual([true]);
  });

  it('should not prevent ArrowUp on the first row', async () => {
    const list = focusableList(3);
    const prevented = recordPrevented();

    basicSortable(list);
    row('r0').focus();
    await commands.keyPress('ArrowUp');
    await frames();
    expect(prevented).toEqual([false]);
    expect(log).toEqual([]);
  });

  it('should not prevent ArrowDown on the last row', async () => {
    const list = focusableList(3);
    const prevented = recordPrevented();

    basicSortable(list);
    row('r2').focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(prevented).toEqual([false]);
    expect(log).toEqual([]);
  });

  it('should not prevent a key that names no command', async () => {
    const list = focusableList(3);
    const prevented = recordPrevented();

    basicSortable(list);
    row('r0').focus();
    await commands.keyPress('Enter');
    await frames();
    expect(prevented).toEqual([false]);
    expect(log).toEqual([]);
    expect(order(list)).toBe('r0,r1,r2');
  });
});

describe('drag:DRI-14 commands with a handle', () => {
  /** Focusable rows, each with a grip that takes focus only if `focusable`. */
  function gripList(focusable: boolean): HTMLElement {
    const list = focusableList(3);

    for (const item of rowsOf(list)) {
      const grip = document.createElement('span');

      grip.className = 'grip';
      grip.textContent = 'grip';

      if (focusable) {
        grip.tabIndex = 0;
      }

      item.prepend(grip);
    }

    basicSortable(list, {
      handle: (item) => item.querySelector<HTMLElement>('.grip'),
    });
    return list;
  }

  it('should not reorder from a focused row whose handle cannot take focus', async () => {
    const list = gripList(false);
    const prevented = recordPrevented();

    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(prevented).toEqual([false]);
    expect(log).toEqual([]);
    expect(order(list)).toBe('r0,r1,r2');
  });

  it('should reorder from a focused handle', async () => {
    const list = gripList(true);

    row('r0').querySelector<HTMLElement>('.grip')!.focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(log).toEqual(['start', 'end:accepted']);
    expect(order(list)).toBe('r1,r0,r2');
  });
});

describe('drag:DRI-14 commands from a nested text input', () => {
  it('should reorder on ArrowRight from an unmarked input and keep its caret', async () => {
    const list = makeList(3);
    const prevented = recordPrevented();

    basicSortable(list);

    const input = focusedInput('r1', false);

    await commands.keyPress('ArrowRight');
    await frames();
    expect(prevented).toEqual([true]);
    expect(order(list)).toBe('r0,r2,r1');
    expect(input.selectionStart).toBe(5);
  });

  it('should leave ArrowRight to an input marked data-drag-ignore', async () => {
    const list = makeList(3);
    const prevented = recordPrevented();

    basicSortable(list);

    const input = focusedInput('r1', true);

    await commands.keyPress('ArrowRight');
    await frames();
    expect(prevented).toEqual([false]);
    expect(log).toEqual([]);
    expect(order(list)).toBe('r0,r1,r2');
    expect(input.selectionStart).toBe(6);
  });

  it('should leave ArrowRight to an unmarked input inside a marked region', async () => {
    const list = makeList(3);
    const prevented = recordPrevented();

    basicSortable(list);

    // The mark is on an element between the row and the input.
    const region = document.createElement('div');
    const input = document.createElement('input');

    region.setAttribute('data-drag-ignore', '');
    input.value = 'hello world';
    region.append(input);
    row('r1').replaceChildren(region);
    input.focus();
    input.setSelectionRange(5, 5);
    await commands.keyPress('ArrowRight');
    await frames();
    expect(prevented).toEqual([false]);
    expect(log).toEqual([]);
    expect(order(list)).toBe('r0,r1,r2');
    expect(input.selectionStart).toBe(6);
  });

  // An IME composition is driven through CDP, which only Chromium has.
  it.runIf(isChromium)(
    'should run no command during an IME composition',
    async () => {
      const list = makeList(3);
      const composing: boolean[] = [];
      const listening = new AbortController();

      onCleanup(() => {
        listening.abort();
      });
      document.addEventListener(
        'keydown',
        (event) => {
          composing.push(event.isComposing);
        },
        { signal: listening.signal },
      );
      basicSortable(list);

      const input = focusedInput('r1', false);

      onCleanup(() => {
        input.blur();
      });
      await cdp().send('Input.imeSetComposition', {
        text: 'にほ',
        selectionStart: 2,
        selectionEnd: 2,
      });
      await commands.keyPress('ArrowDown');
      await frames();
      expect(composing).toEqual([true]);
      expect(log).toEqual([]);
      expect(order(list)).toBe('r0,r1,r2');
    },
  );
});

describe('drag:DRI-6 commands during an operation', () => {
  it('should refuse a command while a press is pending', async () => {
    const list = focusableList(3);
    const prevented = recordPrevented();

    basicSortable(list);
    await press('#r0');
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(prevented).toEqual([false]);
    expect(log).toEqual([]);
    expect(order(list)).toBe('r0,r1,r2');
  });

  it('should refuse a command while a drag is active', async () => {
    const list = focusableList(3);
    const prevented = recordPrevented();

    basicSortable(list);
    await grab('#r0', 0, 12);
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(prevented).toEqual([false]);
    expect(log).toEqual(['start']);
    await release();
    expect(log).toEqual(['start', 'end:noop']);
    expect(order(list)).toBe('r0,r1,r2');
  });
});
