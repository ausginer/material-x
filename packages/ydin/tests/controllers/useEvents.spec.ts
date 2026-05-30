import { describe, expect, it, vi } from 'vitest';
import { useEvents } from '../../src/controllers/useEvents.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, host, nameCE } from '../browser.ts';

describe('useEvents', () => {
  it('should attach listeners on connect', () => {
    const click = vi.fn();
    const el = host((h) => {
      useEvents(h, { click });
    });

    document.body.append(el);
    el.dispatchEvent(new MouseEvent('click'));

    expect(click).toHaveBeenCalledOnce();
  });

  it('should ignore dispatched events before connection', () => {
    const click = vi.fn();
    const el = host((h) => {
      useEvents(h, { click });
    });

    el.dispatchEvent(new MouseEvent('click'));

    expect(click).not.toHaveBeenCalled();
  });

  it('should remove listeners on disconnect', () => {
    const click = vi.fn();
    const el = host((h) => {
      useEvents(h, { click });
    });

    document.body.append(el);
    el.remove();
    el.dispatchEvent(new MouseEvent('click'));

    expect(click).not.toHaveBeenCalled();
  });

  it('should reattach listeners after reconnect', () => {
    const click = vi.fn();
    const el = host((h) => {
      useEvents(h, { click });
    });

    document.body.append(el);
    el.dispatchEvent(new MouseEvent('click'));
    el.remove();
    document.body.append(el);
    el.dispatchEvent(new MouseEvent('click'));

    expect(click).toHaveBeenCalledTimes(2);
  });

  it('should attach listeners to a custom target when provided', () => {
    const click = vi.fn();
    const target = document.createElement('button');
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useEvents(this, { click }, target);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const el = new Host();

    document.body.append(el);
    target.dispatchEvent(new MouseEvent('click'));

    expect(click).toHaveBeenCalledOnce();
  });
});
