/** What `admit` and `command` name. */
export type Admission<State> = Readonly<{
  item: HTMLElement;
  /**
   * Where the press must land. A hop before it marked `data-drag-ignore` owns
   * its own interaction and refuses the admission. Defaults to `item`.
   */
  handle?: HTMLElement;
  state?: State;
  /** Needs `lift`. */
  visual?: never;
  /** Needs `lift`. */
  box?: never;
}>;

/** An admission for a behavior composed with `lift`. */
export type LiftedAdmission<State> = Omit<Admission<State>, 'visual' | 'box'> &
  Readonly<{
    /** The element lifted and translated. Defaults to `item`. */
    visual?: HTMLElement;
    /** The element whose offset size `boxWidth`/`boxHeight` report. */
    box?: HTMLElement;
  }>;
