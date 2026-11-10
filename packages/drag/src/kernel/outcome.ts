export type CancelOrigin = 'request' | 'escape' | 'interrupted' | 'fault';

/** `drop` returned nothing to ask, or the behavior has no `drop`. */
export type SkippedOutcome = Readonly<{ type: 'skipped' }>;

export type VerdictOutcome<Verdict> = Readonly<{
  type: 'verdict';
  value: Verdict;
}>;

/** A fault decides as `origin: 'fault'`, with the reported `DragFault`. */
export type CanceledOutcome = Readonly<{
  type: 'canceled';
  reason: unknown;
  origin: CancelOrigin;
}>;

export type Outcome<Verdict = unknown> =
  | SkippedOutcome
  | VerdictOutcome<Verdict>
  | CanceledOutcome;
