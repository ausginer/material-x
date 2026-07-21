import { describe, expect, it } from 'vitest';
import {
  canReleasePresentation,
  isLandingSettled,
  LANDING_COMPLETING,
  LANDING_PREPARING,
  LANDING_RUNNING,
  LANDING_SETTLED,
  LANDING_SKIPPED,
  LIFECYCLE_ACTIVATE,
  LIFECYCLE_ACTIVATION_FAILED,
  LIFECYCLE_ACTIVATION_READY,
  LIFECYCLE_ADMIT,
  LIFECYCLE_CANCEL,
  LIFECYCLE_DISARM,
  LIFECYCLE_IGNORE,
  LIFECYCLE_MOVE,
  LIFECYCLE_RELEASE,
  LIFECYCLE_RESOLVED,
  LIFECYCLE_SETTLE_COMPLETE,
  LIFECYCLE_SETTLE_PROGRESS,
  LIFECYCLE_START_SUCCEEDED,
  type DragPhase,
  type LandingState,
  type LifecycleEvent,
  OUTCOME_ACCEPTED,
  PHASE_ACTIVATING,
  PHASE_AWAITING_RESULT,
  PHASE_DRAGGING,
  PHASE_IDLE,
  PHASE_PENDING,
  PHASE_SETTLING,
  PRESENTATION_PENDING,
  PRESENTATION_READY,
  type PresentationReadiness,
  RECOVERY_IMMEDIATE,
  sameLanding,
  type SettlementState,
  transitionKernelPhase,
} from '../../src/kernel/protocol.ts';

/** Every phase, in lifecycle order. */
const PHASES: readonly DragPhase[] = [
  PHASE_IDLE,
  PHASE_PENDING,
  PHASE_ACTIVATING,
  PHASE_DRAGGING,
  PHASE_AWAITING_RESULT,
  PHASE_SETTLING,
];

/**
 * Applies `event` to every phase, so one assertion states a whole row of the
 * graph: the edge it defines *and* the phases it deliberately leaves alone.
 */
const row = (event: LifecycleEvent): DragPhase[] =>
  PHASES.map((phase) => transitionKernelPhase(phase, event));

/** `from` unchanged for every phase — the shape of an event with no edge. */
const UNCHANGED: readonly DragPhase[] = PHASES;

const currency = (operationId: number, landingId: number) => ({
  operationId,
  landingId,
});

function settlement(
  landing: LandingState,
  presentation: PresentationReadiness,
): SettlementState<unknown> {
  return {
    outcome: { result: OUTCOME_ACCEPTED },
    recovery: RECOVERY_IMMEDIATE,
    domain: null,
    landing,
    presentation,
  };
}

describe('transitionKernelPhase', () => {
  it('should arm an idle controller on admit and leave every other phase alone', () => {
    expect(row(LIFECYCLE_ADMIT)).toEqual([
      PHASE_PENDING,
      PHASE_PENDING,
      PHASE_ACTIVATING,
      PHASE_DRAGGING,
      PHASE_AWAITING_RESULT,
      PHASE_SETTLING,
    ]);
  });

  it('should return pending to idle on disarm', () => {
    expect(row(LIFECYCLE_DISARM)).toEqual([
      PHASE_IDLE,
      PHASE_IDLE,
      PHASE_ACTIVATING,
      PHASE_DRAGGING,
      PHASE_AWAITING_RESULT,
      PHASE_SETTLING,
    ]);
  });

  it('should move pending to activating on activate', () => {
    expect(row(LIFECYCLE_ACTIVATE)).toEqual([
      PHASE_IDLE,
      PHASE_ACTIVATING,
      PHASE_ACTIVATING,
      PHASE_DRAGGING,
      PHASE_AWAITING_RESULT,
      PHASE_SETTLING,
    ]);
  });

  it('should keep the phase on activation-ready, which only commits candidate data', () => {
    expect(row(LIFECYCLE_ACTIVATION_READY)).toEqual(UNCHANGED);
  });

  it('should move activating to dragging only once start succeeds', () => {
    expect(row(LIFECYCLE_START_SUCCEEDED)).toEqual([
      PHASE_IDLE,
      PHASE_PENDING,
      PHASE_DRAGGING,
      PHASE_DRAGGING,
      PHASE_AWAITING_RESULT,
      PHASE_SETTLING,
    ]);
  });

  it('should return activating to idle when activation fails', () => {
    expect(row(LIFECYCLE_ACTIVATION_FAILED)).toEqual([
      PHASE_IDLE,
      PHASE_PENDING,
      PHASE_IDLE,
      PHASE_DRAGGING,
      PHASE_AWAITING_RESULT,
      PHASE_SETTLING,
    ]);
  });

  it('should move dragging to awaiting-result on release', () => {
    expect(row(LIFECYCLE_RELEASE)).toEqual([
      PHASE_IDLE,
      PHASE_PENDING,
      PHASE_ACTIVATING,
      PHASE_AWAITING_RESULT,
      PHASE_AWAITING_RESULT,
      PHASE_SETTLING,
    ]);
  });

  it('should move awaiting-result to settling once resolved', () => {
    expect(row(LIFECYCLE_RESOLVED)).toEqual([
      PHASE_IDLE,
      PHASE_PENDING,
      PHASE_ACTIVATING,
      PHASE_DRAGGING,
      PHASE_SETTLING,
      PHASE_SETTLING,
    ]);
  });

  it('should settle a cancel from dragging or awaiting-result only', () => {
    expect(row(LIFECYCLE_CANCEL)).toEqual([
      PHASE_IDLE,
      PHASE_PENDING,
      PHASE_ACTIVATING,
      PHASE_SETTLING,
      PHASE_SETTLING,
      PHASE_SETTLING,
    ]);
  });

  it('should return settling to idle once settlement completes', () => {
    expect(row(LIFECYCLE_SETTLE_COMPLETE)).toEqual([
      PHASE_IDLE,
      PHASE_PENDING,
      PHASE_ACTIVATING,
      PHASE_DRAGGING,
      PHASE_AWAITING_RESULT,
      PHASE_IDLE,
    ]);
  });

  it('should keep the phase while settlement is still progressing', () => {
    expect(row(LIFECYCLE_SETTLE_PROGRESS)).toEqual(UNCHANGED);
  });

  it('should keep the phase on move, which never crosses a phase boundary', () => {
    expect(row(LIFECYCLE_MOVE)).toEqual(UNCHANGED);
  });

  // The safety property the classifiers rely on: anything a feature reducer
  // declines to interpret is inert, so foreign, duplicate, and stale events
  // cannot advance the lifecycle.
  it('should keep the phase for an ignored event from every phase', () => {
    expect(row(LIFECYCLE_IGNORE)).toEqual(UNCHANGED);
  });

  it('should never invent a phase outside the declared graph', () => {
    const events: readonly LifecycleEvent[] = [
      LIFECYCLE_ADMIT,
      LIFECYCLE_DISARM,
      LIFECYCLE_ACTIVATE,
      LIFECYCLE_ACTIVATION_READY,
      LIFECYCLE_START_SUCCEEDED,
      LIFECYCLE_ACTIVATION_FAILED,
      LIFECYCLE_MOVE,
      LIFECYCLE_RELEASE,
      LIFECYCLE_RESOLVED,
      LIFECYCLE_CANCEL,
      LIFECYCLE_SETTLE_PROGRESS,
      LIFECYCLE_SETTLE_COMPLETE,
      LIFECYCLE_IGNORE,
    ];

    for (const event of events) {
      for (const phase of PHASES) {
        expect(PHASES).toContain(transitionKernelPhase(phase, event));
      }
    }
  });
});

describe('sameLanding', () => {
  it('should match currencies with the same operation and landing', () => {
    expect(sameLanding(currency(1, 2), currency(1, 2))).toBeTruthy();
  });

  it('should reject a different landing within the same operation', () => {
    expect(sameLanding(currency(1, 2), currency(1, 3))).toBeFalsy();
  });

  // Guards the half-comparison this helper replaced: ids happen to be globally
  // unique today, so only comparing `landingId` would wrongly match here.
  it('should reject the same landing id under a different operation', () => {
    expect(sameLanding(currency(1, 2), currency(9, 2))).toBeFalsy();
  });
});

describe('isLandingSettled', () => {
  it('should treat a completed landing as settled', () => {
    expect(isLandingSettled({ stage: LANDING_SETTLED })).toBeTruthy();
  });

  it('should treat a skipped landing as settled, since neither holds the visual', () => {
    expect(isLandingSettled({ stage: LANDING_SKIPPED })).toBeTruthy();
  });

  it('should not treat a preparing landing as settled', () => {
    expect(
      isLandingSettled({
        stage: LANDING_PREPARING,
        currency: currency(1, 1),
        plan: null,
      }),
    ).toBeFalsy();
  });

  it('should not treat a running landing as settled', () => {
    expect(
      isLandingSettled({
        stage: LANDING_RUNNING,
        currency: currency(1, 1),
        plan: { from: { x: 0, y: 0 }, target: { x: 1, y: 1 } },
      }),
    ).toBeFalsy();
  });

  it('should not treat a completing landing as settled until it is pinned', () => {
    expect(
      isLandingSettled({
        stage: LANDING_COMPLETING,
        currency: currency(1, 1),
        plan: { from: { x: 0, y: 0 }, target: { x: 1, y: 1 } },
      }),
    ).toBeFalsy();
  });
});

describe('canReleasePresentation', () => {
  it('should release once landing settled and the authored presentation is ready', () => {
    expect(
      canReleasePresentation(
        settlement({ stage: LANDING_SETTLED }, PRESENTATION_READY),
      ),
    ).toBeTruthy();
  });

  it('should hold while the authored presentation is still pending', () => {
    expect(
      canReleasePresentation(
        settlement({ stage: LANDING_SETTLED }, PRESENTATION_PENDING),
      ),
    ).toBeFalsy();
  });

  it('should hold while landing is still running', () => {
    expect(
      canReleasePresentation(
        settlement(
          {
            stage: LANDING_RUNNING,
            currency: currency(1, 1),
            plan: { from: { x: 0, y: 0 }, target: { x: 1, y: 1 } },
          },
          PRESENTATION_READY,
        ),
      ),
    ).toBeFalsy();
  });

  // The reduced-motion path: landing is skipped, so readiness is the only
  // remaining barrier and it alone decides when the lift may be torn down.
  it('should release a skipped landing as soon as the presentation is ready', () => {
    expect(
      canReleasePresentation(
        settlement({ stage: LANDING_SKIPPED }, PRESENTATION_READY),
      ),
    ).toBeTruthy();
  });

  it('should hold a skipped landing whose presentation is still pending', () => {
    expect(
      canReleasePresentation(
        settlement({ stage: LANDING_SKIPPED }, PRESENTATION_PENDING),
      ),
    ).toBeFalsy();
  });
});
