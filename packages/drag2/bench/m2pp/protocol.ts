/**
 * Protocol M-2″'s fixed schedule: which run happens when, and nothing about
 * what a run reads.
 *
 * One round is one run in each of its arms, back to back. Rounds are numbered
 * within their set. The first-named arm runs first in odd rounds and second in
 * even ones, so a drift across a block falls on both arms alike.
 */
export type Tree = 'base' | 'input' | 'candidate';
export type Mode = 'plain' | 'inject' | 'd1' | 'd2';
export type Project = 'browser' | 'shipped';
export type SetName = 'G' | 'AB' | 'AC' | 'P' | 'D' | 'Alloc';

export type Run = Readonly<{
  id: string;
  block: number;
  set: SetName;
  round: number;
  arm: string;
  tree: Tree;
  mode: Mode;
  project: Project;
}>;

type Arm = Readonly<{
  arm: string;
  tree: Tree;
  mode?: Mode;
  project?: Project;
}>;

export const BLOCK_RUNS: Readonly<Record<number, number>> = {
  1: 48,
  2: 24,
  3: 48,
  4: 48,
};
const BLOCK_ONE_CYCLES = 6;
const ROUNDS = 12;

function runsOf(
  block: number,
  set: SetName,
  round: number,
  arms: readonly Arm[],
): readonly Run[] {
  return arms.map(({ arm, tree, mode = 'plain', project = 'browser' }) => ({
    id: `${set}-${round}-${arm}`,
    block,
    set,
    round,
    arm,
    tree,
    mode,
    project,
  }));
}

/** The first-named arm first in odd rounds, second in even ones. */
function paired(
  block: number,
  set: SetName,
  round: number,
  first: Arm,
  second: Arm,
): readonly Run[] {
  return runsOf(
    block,
    set,
    round,
    round % 2 === 1 ? [first, second] : [second, first],
  );
}

const G = (round: number): readonly Run[] =>
  paired(
    1,
    'G',
    round,
    { arm: 'candidate', tree: 'candidate' },
    { arm: 'base', tree: 'base' },
  );

/** One tree against itself, in the tip's role and in the base's. */
const same = (set: 'AB' | 'AC', tree: Tree, round: number): readonly Run[] =>
  paired(1, set, round, { arm: 'tip', tree }, { arm: 'base', tree });

/** The fixed cycle G, AB, G, AC, six times. */
function blockOne(): readonly Run[] {
  return Array.from({ length: BLOCK_ONE_CYCLES }, (_, cycle) => [
    ...G(2 * cycle + 1),
    ...same('AB', 'base', cycle + 1),
    ...G(2 * cycle + 2),
    ...same('AC', 'candidate', cycle + 1),
  ]).flat();
}

function blockTwo(): readonly Run[] {
  return Array.from({ length: ROUNDS }, (_, i) =>
    paired(
      2,
      'P',
      i + 1,
      { arm: 'tip', tree: 'base', mode: 'inject' },
      { arm: 'base', tree: 'base' },
    ),
  ).flat();
}

const PROBES: readonly Arm[] = [
  { arm: 'd1-base', tree: 'base', mode: 'd1' },
  { arm: 'd1-candidate', tree: 'candidate', mode: 'd1' },
  { arm: 'd2-base', tree: 'base', mode: 'd2' },
  { arm: 'd2-candidate', tree: 'candidate', mode: 'd2' },
];

/** D1 and D2, each at base and candidate, order reversed in even rounds. */
function blockThree(): readonly Run[] {
  return Array.from({ length: ROUNDS }, (_, i) =>
    runsOf(3, 'D', i + 1, i % 2 === 0 ? PROBES : PROBES.toReversed()),
  ).flat();
}

/** Candidate against input, in the shipped project and then in DEV. */
function blockFour(): readonly Run[] {
  return Array.from({ length: ROUNDS }, (_, i) =>
    (['shipped', 'browser'] as const).flatMap((project) => {
      const suffix = project === 'shipped' ? 'shipped' : 'dev';

      return paired(
        4,
        'Alloc',
        i + 1,
        { arm: `candidate-${suffix}`, tree: 'candidate', project },
        { arm: `input-${suffix}`, tree: 'input', project },
      );
    }),
  ).flat();
}

export function schedule(): readonly Run[] {
  return [...blockOne(), ...blockTwo(), ...blockThree(), ...blockFour()];
}
