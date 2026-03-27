import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from '../src/emitter.ts';

async function nextMicrotask(): Promise<void> {
  return await Promise.resolve();
}

describe('EventEmitter', () => {
  it('should deliver the exact emitted argument list to a subscriber', () => {
    const emitter = new EventEmitter<[string, number, boolean]>();
    const subscriber = vi.fn();

    emitter.on(subscriber);
    emitter.emit('value', 42, true);

    expect(subscriber).toHaveBeenCalledOnce();
    expect(subscriber).toHaveBeenNthCalledWith(1, 'value', 42, true);
  });

  it('should deliver updates to all registered subscribers', () => {
    const emitter = new EventEmitter<[string]>();
    const firstSubscriber = vi.fn();
    const secondSubscriber = vi.fn();

    emitter.on(firstSubscriber);
    emitter.on(secondSubscriber);
    emitter.emit('value');

    expect(firstSubscriber).toHaveBeenCalledOnce();
    expect(firstSubscriber).toHaveBeenNthCalledWith(1, 'value');
    expect(secondSubscriber).toHaveBeenCalledOnce();
    expect(secondSubscriber).toHaveBeenNthCalledWith(1, 'value');
  });

  it('should deduplicate the same subscriber callback', () => {
    const emitter = new EventEmitter<[string]>();
    const subscriber = vi.fn();

    emitter.on(subscriber);
    emitter.on(subscriber);
    emitter.emit('value');

    expect(subscriber).toHaveBeenCalledOnce();
    expect(subscriber).toHaveBeenNthCalledWith(1, 'value');
  });

  it('should unsubscribe a subscriber through the returned cleanup', () => {
    const emitter = new EventEmitter<[string]>();
    const subscriber = vi.fn();

    const unsubscribe = emitter.on(subscriber);

    unsubscribe();
    emitter.emit('value');

    expect(subscriber).not.toHaveBeenCalled();
  });

  it('should keep other subscribers active after one subscriber unsubscribes', () => {
    const emitter = new EventEmitter<[string]>();
    const firstSubscriber = vi.fn();
    const secondSubscriber = vi.fn();

    const unsubscribe = emitter.on(firstSubscriber);

    emitter.on(secondSubscriber);
    unsubscribe();
    emitter.emit('value');

    expect(firstSubscriber).not.toHaveBeenCalled();
    expect(secondSubscriber).toHaveBeenCalledOnce();
    expect(secondSubscriber).toHaveBeenNthCalledWith(1, 'value');
  });

  it('should allow emitting without subscribers', () => {
    const emitter = new EventEmitter<[string]>();

    expect(() => emitter.emit('value')).not.toThrow();
  });

  it('should route a synchronous subscriber throw through the installed error handler', () => {
    const emitter = new EventEmitter<[string]>();
    const error = new Error('sync subscriber error');
    const subscriber = vi.fn(() => {
      throw error;
    });
    const handler = vi.fn();

    emitter.on(subscriber);
    emitter.err(handler);

    expect(() => emitter.emit('value')).not.toThrow();
    expect(subscriber).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenNthCalledWith(1, error);
  });

  it('should continue delivering to later subscribers when the error handler handles a synchronous throw', () => {
    const emitter = new EventEmitter<[string]>();
    const error = new Error('sync subscriber error');
    const firstSubscriber = vi.fn(() => {
      throw error;
    });
    const secondSubscriber = vi.fn();
    const handler = vi.fn();

    emitter.on(firstSubscriber);
    emitter.on(secondSubscriber);
    emitter.err(handler);
    emitter.emit('value');

    expect(firstSubscriber).toHaveBeenCalledOnce();
    expect(secondSubscriber).toHaveBeenCalledOnce();
    expect(secondSubscriber).toHaveBeenNthCalledWith(1, 'value');
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenNthCalledWith(1, error);
  });

  it('should route an async subscriber rejection through the installed error handler', async () => {
    const emitter = new EventEmitter<[string]>();
    const error = new Error('async subscriber error');
    const subscriber = vi.fn( async () => await Promise.reject(error));
    const handler = vi.fn();

    emitter.on(subscriber);
    emitter.err(handler);
    emitter.emit('value');
    await nextMicrotask();

    expect(subscriber).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenNthCalledWith(1, error);
  });

  it('should still deliver to other subscribers when one async subscriber rejects', async () => {
    const emitter = new EventEmitter<[string]>();
    const error = new Error('async subscriber error');
    const firstSubscriber = vi.fn( async () => await Promise.reject(error));
    const secondSubscriber = vi.fn();
    const handler = vi.fn();

    emitter.on(firstSubscriber);
    emitter.on(secondSubscriber);
    emitter.err(handler);
    emitter.emit('value');
    await nextMicrotask();

    expect(firstSubscriber).toHaveBeenCalledOnce();
    expect(secondSubscriber).toHaveBeenCalledOnce();
    expect(secondSubscriber).toHaveBeenNthCalledWith(1, 'value');
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenNthCalledWith(1, error);
  });

  it('should rethrow a synchronous subscriber throw when no error handler is installed', () => {
    const emitter = new EventEmitter<[string]>();
    const error = new Error('sync subscriber error');

    emitter.on(() => {
      throw error;
    });

    expect(() => emitter.emit('value')).toThrow(error);
  });

  it('should interrupt dispatch when the error handler throws', () => {
    const emitter = new EventEmitter<[string]>();
    const originalError = new Error('sync subscriber error');
    const handlerError = new Error('handler error');
    const secondSubscriber = vi.fn();

    emitter.on(() => {
      throw originalError;
    });
    emitter.on(secondSubscriber);
    emitter.err(() => {
      throw handlerError;
    });

    expect(() => emitter.emit('value')).toThrow(handlerError);
    expect(secondSubscriber).not.toHaveBeenCalled();
  });
});
