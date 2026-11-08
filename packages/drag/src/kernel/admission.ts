/** What `admit` and `command` name. */
export type Admission<State> = Readonly<{
  item: HTMLElement;
  /**
   * Where the press must land. A hop before it marked `data-drag-ignore` owns
   * its own interaction and refuses the admission. Defaults to `item`.
   */
  handle?: HTMLElement;
  /** What `activate` receives as its `state`. */
  state?: State;
}>;
