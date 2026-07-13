import { describe, expect, it, vi, type Mock } from 'vitest';
import {
  useKeyboard,
  type KeyboardListener,
} from '../../src/controllers/useKeyboard.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, host, nameCE } from '../browser.ts';

describe('useKeyboard', () => {
  it('should call the down listener for a matching keydown event', () => {
    const down: Mock<KeyboardListener> = vi.fn();
    const el = host((h) => {
      useKeyboard(h, { Enter: { down } });
    });

    document.body.append(el);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(down).toHaveBeenCalledOnce();
  });

  it('should call the up listener for a matching keyup event', () => {
    const up: Mock<KeyboardListener> = vi.fn();
    const el = host((h) => {
      useKeyboard(h, { Enter: { up } });
    });

    document.body.append(el);
    el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));

    expect(up).toHaveBeenCalledOnce();
  });

  it('should ignore keys without listeners', () => {
    const down: Mock<KeyboardListener> = vi.fn();
    const el = host((h) => {
      useKeyboard(h, { Enter: { down } });
    });

    document.body.append(el);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(down).not.toHaveBeenCalled();
  });

  it('should not call the wrong phase listener', () => {
    const down: Mock<KeyboardListener> = vi.fn();
    const el = host((h) => {
      useKeyboard(h, { Enter: { down } });
    });

    document.body.append(el);
    el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));

    expect(down).not.toHaveBeenCalled();
  });

  it('should attach keyboard listeners to a custom target when provided', () => {
    const down: Mock<KeyboardListener> = vi.fn();
    const target = document.createElement('button');
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useKeyboard(this, { Enter: { down } }, target);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const el = new Host();

    document.body.append(el);
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(down).toHaveBeenCalledOnce();
  });
});
