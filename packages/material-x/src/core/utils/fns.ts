import {
  type CSSPropParser,
  CSSVariableError,
} from '@ydinjs/core/controllers/useCSSProps.js';

export const identity = <T>(v: T): T => v;

export const parseMs: CSSPropParser<number> = (v, target, prop) => {
  const result = parseFloat(v) * 1000;

  if (isNaN(result)) {
    throw new CSSVariableError(prop, target);
  }

  return result;
};
