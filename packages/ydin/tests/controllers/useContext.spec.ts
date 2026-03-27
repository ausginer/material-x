import type { Constructor } from 'type-fest';
import { describe, expect, it, vi, type Mock } from 'vitest';
import {
  createContext,
  useContext,
  useProvider,
  type ContextEffect,
} from '../../src/controllers/useContext.ts';
import { ControlledElement } from '../../src/element.ts';
import { EventEmitter, type UpdateCallback } from '../../src/emitter.ts';
import { defineCE, nameCE } from '../browser.ts';

type ContextValue = Readonly<{
  emitter: EventEmitter<[string]>;
  name: string;
}>;

type ContextToken = ReturnType<typeof createContext<ContextValue>>;

function createProvider(
  ctx: ContextToken,
  value: ContextValue,
): Constructor<ControlledElement> {
  return class Provider extends ControlledElement {
    constructor() {
      super();
      useProvider(this, ctx, value);
    }
  };
}

function createMutableProvider(
  ctx: ContextToken,
  value: ContextValue,
): Constructor<ControlledElement & { value: ContextValue }> {
  return class Provider extends ControlledElement {
    value = value;

    constructor() {
      super();
      useProvider(this, ctx, this.value);
    }
  };
}

function createConsumerWithEffect(
  ctx: ContextToken,
  effect: Mock<ContextEffect<ContextValue>>,
): Constructor<ControlledElement> {
  return class Consumer extends ControlledElement {
    constructor() {
      super();
      useContext(this, ctx, effect);
    }
  };
}

function createConsumer(
  ctx: ContextToken,
): readonly [
  effectMock: Mock<ContextEffect<ContextValue>>,
  updateMock: Mock<UpdateCallback<[string]>>,
  ctr: Constructor<ControlledElement>,
] {
  const updateMock = vi.fn<UpdateCallback<[string]>>();
  const effectMock = vi.fn<ContextEffect<ContextValue>>((value) =>
    value?.emitter.on(updateMock),
  );

  return [effectMock, updateMock, createConsumerWithEffect(ctx, effectMock)];
}

describe('useContext', () => {
  it('should call effect with undefined when no provider is found', () => {
    const ctx = createContext<ContextValue>();
    const effectMock = vi.fn<ContextEffect<ContextValue>>();
    const Consumer = createConsumerWithEffect(ctx, effectMock);
    const consumerTag = nameCE();

    defineCE(consumerTag, Consumer);
    document.body.append(new Consumer());

    expect(effectMock).toHaveBeenCalledOnce();
    expect(effectMock).toHaveBeenCalledWith(undefined);
  });

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

  it('should resolve the nearest provider when providers are nested', () => {
    const ctx = createContext<ContextValue>();
    const outerValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'outer',
    } as const;
    const innerValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'inner',
    } as const;
    const OuterProvider = createProvider(ctx, outerValue);
    const InnerProvider = createProvider(ctx, innerValue);
    const [effectMock, _, Consumer] = createConsumer(ctx);
    const outerTag = nameCE();
    const innerTag = nameCE();
    const consumerTag = nameCE();

    defineCE(outerTag, OuterProvider);
    defineCE(innerTag, InnerProvider);
    defineCE(consumerTag, Consumer);

    const outerProvider = new OuterProvider();
    const innerProvider = new InnerProvider();
    const consumer = new Consumer();

    innerProvider.append(consumer);
    outerProvider.append(innerProvider);
    document.body.append(outerProvider);

    expect(effectMock).toHaveBeenCalledOnce();
    expect(effectMock).toHaveBeenCalledWith(innerValue);
  });

  it('should ignore providers registered for another context', () => {
    const providerCtx = createContext<ContextValue>();
    const consumerCtx = createContext<ContextValue>();
    const Provider = createProvider(providerCtx, {
      emitter: new EventEmitter<[string]>(),
      name: 'provider',
    });
    const effectMock = vi.fn<ContextEffect<ContextValue>>();
    const Consumer = createConsumerWithEffect(consumerCtx, effectMock);
    const providerTag = nameCE();
    const consumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(consumerTag, Consumer);

    const provider = new Provider();
    const consumer = new Consumer();

    provider.append(consumer);
    document.body.append(provider);

    expect(effectMock).toHaveBeenCalledOnce();
    expect(effectMock).toHaveBeenCalledWith(undefined);
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

  it('should dispose previous subscription before rerunning effect after reconnect', () => {
    const ctx = createContext<ContextValue>();
    const firstValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'first',
    } as const;
    const secondValue = {
      emitter: new EventEmitter<[string]>(),
      name: 'second',
    } as const;
    const firstCleanup = vi.fn();
    const secondCleanup = vi.fn();
    const effectMock = vi
      .fn<ContextEffect<ContextValue>>()
      .mockReturnValueOnce(firstCleanup)
      .mockReturnValueOnce(secondCleanup);
    const Consumer = createConsumerWithEffect(ctx, effectMock);
    const FirstProvider = createProvider(ctx, firstValue);
    const SecondProvider = createProvider(ctx, secondValue);
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

    expect(effectMock).toHaveBeenNthCalledWith(1, firstValue);
    expect(firstCleanup).not.toHaveBeenCalled();

    secondProvider.append(consumer);

    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(effectMock).toHaveBeenNthCalledWith(2, secondValue);
    expect(secondCleanup).not.toHaveBeenCalled();
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

  it('should unsubscribe from the previous provider after moving to another provider', () => {
    const ctx = createContext<ContextValue>();
    const firstEmitter = new EventEmitter<[string]>();
    const secondEmitter = new EventEmitter<[string]>();
    const FirstProvider = createProvider(ctx, {
      emitter: firstEmitter,
      name: 'first',
    });
    const SecondProvider = createProvider(ctx, {
      emitter: secondEmitter,
      name: 'second',
    });
    const [_, updateMock, Consumer] = createConsumer(ctx);
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

    firstEmitter.emit('first-update');

    expect(updateMock).toHaveBeenCalledWith('first-update');

    secondProvider.append(consumer);
    firstEmitter.emit('stale-update');
    secondEmitter.emit('second-update');

    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenNthCalledWith(2, 'second-update');
  });

  it('should call effect with undefined after reconnect without any provider', () => {
    const ctx = createContext<ContextValue>();
    const value = {
      emitter: new EventEmitter<[string]>(),
      name: 'provider',
    } as const;
    const Provider = createProvider(ctx, value);
    const effectMock = vi.fn<ContextEffect<ContextValue>>();
    const Consumer = createConsumerWithEffect(ctx, effectMock);
    const providerTag = nameCE();
    const consumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(consumerTag, Consumer);

    const provider = new Provider();
    const consumer = new Consumer();

    provider.append(consumer);
    document.body.append(provider);
    document.body.append(consumer);

    expect(effectMock).toHaveBeenNthCalledWith(1, value);
    expect(effectMock).toHaveBeenNthCalledWith(2, undefined);
  });

  it('should not react to provider value replacement without reconnect', () => {
    const ctx = createContext<ContextValue>();
    const firstEmitter = new EventEmitter<[string]>();
    const secondEmitter = new EventEmitter<[string]>();
    const firstValue = {
      emitter: firstEmitter,
      name: 'first',
    } as const;
    const secondValue = {
      emitter: secondEmitter,
      name: 'second',
    } as const;
    const Provider = createMutableProvider(ctx, firstValue);
    const [effectMock, updateMock, Consumer] = createConsumer(ctx);
    const providerTag = nameCE();
    const consumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(consumerTag, Consumer);

    const provider = new Provider();
    const consumer = new Consumer();

    provider.append(consumer);
    document.body.append(provider);

    expect(effectMock).toHaveBeenCalledOnce();
    expect(effectMock).toHaveBeenCalledWith(firstValue);

    provider.value = secondValue;
    firstEmitter.emit('first-update');
    secondEmitter.emit('second-update');

    expect(effectMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith('first-update');
  });

  it('should keep multiple consumers isolated when one disconnects', () => {
    const ctx = createContext<ContextValue>();
    const emitter = new EventEmitter<[string]>();
    const Provider = createProvider(ctx, {
      emitter,
      name: 'provider',
    });
    const [_a, firstUpdateMock, FirstConsumer] = createConsumer(ctx);
    const [_b, secondUpdateMock, SecondConsumer] = createConsumer(ctx);
    const providerTag = nameCE();
    const firstConsumerTag = nameCE();
    const secondConsumerTag = nameCE();

    defineCE(providerTag, Provider);
    defineCE(firstConsumerTag, FirstConsumer);
    defineCE(secondConsumerTag, SecondConsumer);

    const provider = new Provider();
    const firstConsumer = new FirstConsumer();
    const secondConsumer = new SecondConsumer();

    provider.append(firstConsumer, secondConsumer);
    document.body.append(provider);
    emitter.emit('first-update');

    expect(firstUpdateMock).toHaveBeenCalledWith('first-update');
    expect(secondUpdateMock).toHaveBeenCalledWith('first-update');

    firstConsumer.remove();
    emitter.emit('second-update');

    expect(firstUpdateMock).toHaveBeenCalledTimes(1);
    expect(secondUpdateMock).toHaveBeenCalledTimes(2);
    expect(secondUpdateMock).toHaveBeenNthCalledWith(2, 'second-update');
  });
});
