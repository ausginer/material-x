// oxlint-disable typescript/prefer-optional-chain, typescript/no-unsafe-member-access -- the brand install as the build emits it
import { record } from './record.mjs';

// Another package's built JavaScript of a layer (a) trait, as its own build
// emits it: no types, the brand installed as a static method, a relative import that a
// consumer reaches through the package's name, and a private binding exported
// under its build-only name.
const $forwarding = Symbol('Forwarding');
const targets = new WeakMap();

const targetOf = (host) => {
  let target = targets.get(host);
  if (!target) {
    target = { calls: 0, options: undefined };
    targets.set(host, target);
  }
  return target;
};

class Forwarding {
  static [Symbol.hasInstance](o) {
    return o != null && o[$forwarding] === true;
  }

  focus(options) {
    record(targetOf(this), options);
    return 'package';
  }

  get target() {
    return targetOf(this);
  }
}

export {
  $forwarding,
  Forwarding,
  targetOf as __mxflat_targetOf_80ee63e5,
  targetOf,
};
