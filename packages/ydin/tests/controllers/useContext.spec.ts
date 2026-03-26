import type { Constructor } from 'type-fest';
import { describe, expect, it, vi, type Mock } from 'vitest';
import {
  createContext,
  useContext,
  useProvider,
  type ContextEffect,
} from '../../src/controllers/useContext.ts';
import { EventEmitter, type UpdateCallback } from '../../src/emitter.ts';
import { ControlledElement } from '../../src/controlled-element.ts';
import { defineCE, nameCE } from '../browser.ts';

type ContextValue = Readonly<{
  emitter: EventEmitter<[string]>;
  name: string;
}>;

function createProvider(
  ctx: ReturnType<typeof createContext<ContextValue>>,
  value: ContextValue,
): Constructor<ControlledElement> {
  return class Provider extends ControlledElement {
    constructor() {
      super();
      useProvider(this, ctx, value);
    }
  };
}

function createConsumer(
  ctx: ReturnType<typeof createContext<ContextValue>>,
): readonly [
  effectMock: Mock<ContextEffect<ContextValue>>,
  updateMock: Mock<UpdateCallback<[string]>>,
  ctr: Constructor<ControlledElement>,
] {
  const updateMock = vi.fn();
  const effectMock = vi.fn((value: ContextValue | undefined) =>
    value?.emitter.on(updateMock),
  );

  return [
    effectMock,
    updateMock,
    class Consumer extends ControlledElement {
      constructor() {
        super();
        useContext(this, ctx, effectMock);
      }
    },
  ];
}

describe('useContext', () => {
  it('should resolve provider value synchronously on connect', () => {
    const ctx = createContext<ContextValue>();
    const value = {
      emitter: new EventEmitter<[string]>(),
      name: 'provider',
    } as const;
    const Provider = createProvider(ctx, value);
    const [effectMock, _, Consumer] = createConsumer(ctx);
    const providerTag = nameCE();
    const consumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(consumerTag, Consumer);

    const provider = new Provider();
    const consumer = new Consumer();

    provider.append(consumer);
    document.body.append(provider);

    expect(effectMock).toHaveBeenCalledWith(value);
  });

  it('should rerun provider lookup synchronously after reconnect', () => {
    const ctx = createContext<ContextValue>();

    const firstValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'first',
    } as const;

    const secondValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'second',
    } as const;

    const FirstProvider = createProvider(ctx, firstValue);
    const SecondProvider = createProvider(ctx, secondValue);

    const [effectMock, _, Consumer] = createConsumer(ctx);

    const firstProviderTag = nameCE();
    const secondProviderTag = nameCE();
    const consumerTag = nameCE();

    defineCE(firstProviderTag, FirstProvider);
    defineCE(secondProviderTag, SecondProvider);
    defineCE(consumerTag, Consumer);

    const firstProvider = new FirstProvider();
    const secondProvider = new SecondProvider();
    const consumer = new Consumer();

    firstProvider.append(consumer);
    document.body.append(firstProvider, secondProvider);
    secondProvider.append(consumer);

    expect(effectMock).toHaveBeenNthCalledWith(1, firstValue);
    expect(effectMock).toHaveBeenNthCalledWith(2, secondValue);
  });

  it('should rely on manual subscriptions inside the provided value', () => {
    const ctx = createContext<ContextValue>();
    const emitter = new EventEmitter<[string]>();
    const Provider = createProvider(ctx, {
      emitter,
      name: 'provider',
    });
    const [_, updateMock, Consumer] = createConsumer(ctx);
    const providerTag = nameCE();
    const consumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(consumerTag, Consumer);

    const provider = new Provider();
    const consumer = new Consumer();

    provider.append(consumer);
    document.body.append(provider);
    emitter.emit('first-update');

    expect(updateMock).toHaveBeenCalledWith('first-update');

    consumer.remove();
    emitter.emit('second-update');

    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});
