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

function splitTokenMap(args: Value[]): SassMap {
  const map = args[0].assertMap('map');
  const states = args[1].asList.toArray().map((v) => v.assertString());

  const stateGroups = Object.groupBy(map.contents.toArray(), ([key]) => {
    const _key = key.assertString();
    return (
      states.find((state) => _key.text.startsWith(state.text))?.text ??
      'default'
    );
  });

  const splitMap = Object.entries(stateGroups).reduce<Map<Value, Value>>(
    (acc, [state, grouped]) => {
      const map = new Map(
        grouped!.map(([key, value]) => [
          new SassString(
            key.assertString().text.replace(`${state}-`, '').trim(),
          ),
          value,
        ]),
      );
      acc.set(new SassString(state), new SassMap(OrderedMap(map)));
      return acc;
    },
    new Map(),
  );

  return new SassMap(OrderedMap(splitMap));
}
