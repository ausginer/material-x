// oxlint-disable no-new
import { describe, expect, it, vi, type Mock } from 'vitest';
import {
  useConnected,
  type ConnectedSetupCallback,
} from '../../src/controllers/useConnected.ts';
import { host } from '../browser.ts';

describe('useConnected', () => {
  it('should call the callback when the host connects', () => {
    const callback: Mock<ConnectedSetupCallback> = vi.fn();
    const el = host((h) => {
      useConnected(h, callback);
    });

    document.body.append(el);

    expect(callback).toHaveBeenCalledOnce();
  });

  it('should not call the callback before connection', () => {
    const callback: Mock<ConnectedSetupCallback> = vi.fn();

    host((h) => {
      useConnected(h, callback);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should call the callback again after reconnect', () => {
    const callback: Mock<ConnectedSetupCallback> = vi.fn();
    const el = host((h) => {
      useConnected(h, callback);
    });

    document.body.append(el);
    el.remove();
    document.body.append(el);

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
