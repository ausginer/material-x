import { OrderedMap } from 'immutable';
import {
  type Value,
  SassNumber,
  SassString,
  SassMap,
  SassList,
} from 'sass-embedded';

export type CustomFunctions = Readonly<
  Record<string, (args: Value[]) => Value>
>;

const FUNCTIONS: CustomFunctions = {
  'map-size($map)': getMapSize,
  'split-token-map($map, $states)': splitTokenMap,
  'str-split($str, $delimiter)': splitStr,
};

export default FUNCTIONS;

function getMapSize([$map]: Value[]): SassNumber {
  if (!$map) {
    throw new Error('map-size function requires exactly one argument.');
  }

  return new SassNumber($map.assertMap('map').contents.size);
}

function splitTokenMap([$map, $states]: Value[]): SassMap {
  if (!$map || !$states) {
    throw new Error(
      'split-token-map function requires two arguments: map and states.',
    );
  }

  const map = $map.assertMap('map');
  const states = $states.asList.toArray().map((v) => v.assertString().text);

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

function splitStr([$str, $delimiter]: Value[]): SassList {
  if (!$str || !$delimiter) {
    throw new Error(
      'split-str function requires two arguments: string and delimiter.',
    );
  }

  const str = $str.assertString('string').text;
  const delimiter = $delimiter.assertString('delimiter').text;

  const parts = str.split(delimiter).map((part) => new SassString(part.trim()));

  return new SassList(parts);
}
