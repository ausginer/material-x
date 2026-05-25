import {
  type CSSPropParser,
  CSSVariableError,
} from 'ydin/controllers/useCSSProps.js';

export const identity = <T>(v: T): T => v;

function createNumberParser(
  callback: (v: string) => number,
): CSSPropParser<number> {
  return (v: string, target: HTMLElement, prop: string) => {
    const result = callback(v);

    if (isNaN(result)) {
      throw new CSSVariableError(prop, target);
    }

    return result;
  };
}

export const parseMs: CSSPropParser<number> = createNumberParser(
  (v) => parseFloat(v) * 1000,
);
export const parseNum: CSSPropParser<number> = createNumberParser((v) =>
  parseFloat(v),
);
