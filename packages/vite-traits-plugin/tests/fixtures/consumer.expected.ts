// oxlint-disable typescript/no-unsafe-call, typescript/no-unsafe-member-access -- the build-only export has no declaration
import attr, { Str } from '@ydinjs/core/attribute.js';
import { impl } from '@ydinjs/core/traits/composition.js';
import { Base } from './base.ts';
import { $checkable, CHECKABLE_ATTRS } from './checkable.ts';
import {
  $forwarding,
  __mxflat_targets_4683e789 as targets,
  useForwarding,
  type ForwardTarget,
} from './forwarding.ts';
import { $nameable } from './nameable.ts';

// What consumer.ts flattens to, written by hand: the traits' members in list
// order before the class's own, the merged list and the brands. The private
// map is reached through the build-only export that the trait module's
// transform adds.

export default class Foo extends Base {
  static observedAttributes = [
    ...(Base.observedAttributes ?? []),
    'checked',
    'name',
  ];

  get checked(): boolean {
    return attr.get(this, 'checked', CHECKABLE_ATTRS.checked);
  }

  set checked(value: boolean) {
    attr.set(this, 'checked', value, CHECKABLE_ATTRS.checked);
  }

  get name(): string | null {
    return attr.get(this, 'name', Str);
  }

  set name(value: string | null) {
    attr.set(this, 'name', value, Str);
  }

  focus(options?: unknown): string {
    const target = targets.get(this)!;
    target.calls += 1;
    target.options = options;
    return 'trait';
  }

  get forwarded(): number {
    return targets.get(this)?.calls ?? 0;
  }

  set forwarded(calls: number) {
    targets.set(this, { calls, options: undefined });
  }

  static {
    impl(this, $checkable, $nameable, $forwarding);
  }

  readonly target: ForwardTarget = { calls: 0, options: undefined };

  constructor() {
    super();
    useForwarding(this, this.target);
  }
}

export class Sub extends Foo {
  override focus(options?: unknown): string {
    return `sub+${super.focus(options)}`;
  }
}
