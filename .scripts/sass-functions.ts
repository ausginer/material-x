import { OrderedMap } from 'immutable';
import { type Value, SassNumber, SassString, SassMap } from 'sass-embedded';

export type CustomFunctions = Readonly<
  Record<string, (args: Value[]) => Value>
>;

const FUNCTIONS: CustomFunctions = {
  'map-size($map)': getMapSize,
  'split-token-map($map, $states)': splitTokenMap,
};

export default FUNCTIONS;

function getMapSize(args: Value[]): SassNumber {
  return new SassNumber(args[0].assertMap('map').contents.size);
}

function _splitTokenMap(
  tokens: ReadonlyMap<string, unknown>,
  states: readonly string[],
): ReadonlyMap<string, ReadonlyMap<string, unknown>> {
  const stateGroups = Object.groupBy(tokens, ([key]) => {
    return states.find((state) => key.includes(state)) ?? 'default';
  });

  return states.reduce<Map<string, ReadonlyMap<string, unknown>>>(
    (acc, state) => {
      const grouped = stateGroups[state] ?? [];
      const map = new Map(
        grouped.map(([key, value]) => [
          key.replace(`${state}-`, '').trim(),
          value,
        ]),
      );
      acc.set(state, map);
      return acc;
    },
    new Map(),
  );
}

function splitTokenMap(args: Value[]): SassMap {
  const map = args[0].assertMap('map');
  const states = args[1].asList.toArray().map((v) => v.assertString().text);

  const stateGroups = Object.groupBy(map.contents.toArray(), ([key]) => {
    const _key = key.assertString().text;
    return states.find((state) => _key.includes(state)) ?? 'default';
  });

  const splitMap = states.reduce<Map<Value, Value>>((acc, state) => {
    const grouped = stateGroups[state] ?? [];
    const map = new Map(
      grouped.map(([key, value]) => [
        new SassString(key.assertString().text.replace(`${state}-`, '').trim()),
        value,
      ]),
    );
    acc.set(new SassString(state), new SassMap(OrderedMap(map)));
    return acc;
  }, new Map());

  return new SassMap(OrderedMap(splitMap));
}
