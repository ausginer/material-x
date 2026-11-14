/**
 * `drag:DRI-1` and `drag:DRI-6`: the tests that read the refusal count, a
 * development instrument that a published build folds away. They run in the
 * source projects only.
 */
import { describe, expect, it } from 'vitest';
import { Lifter } from '../src/lift.ts';
import {
  basicSortable,
  dragAndDrop,
  grab,
  isClean,
  log,
  makeList,
  managed,
  noteOutcome,
  ReactionProbe,
  refusals,
  release,
  targetOf,
} from './support/harness.ts';

type Asked = 'cancel' | 'destroy' | 'press';

describe('drag:DRI-1 a request does not change the running step', () => {
  it.each<Asked>(['press'])(
    'should finish the step when a custom element reaction asks to %s during activate',
    async (asked) => {
      const list = makeList(4);
      const probe = document.createElement('reaction-probe');

      document.body.append(probe);

      const lifter = new Lifter(window);
      const panel = managed(list, {
        admit: (event) => ({ item: targetOf(event) }),
        activate(drag) {
          const lift = lifter.acquire(drag);

          log.push('activate:before');
          probe.setAttribute('data-poke', '1');
          log.push('activate:after');

          return {
            start: () => {
              log.push('start');
            },
            move() {
              lift.translate(drag.x - drag.originX, drag.y - drag.originY);
            },
            end: (outcome) => {
              log.push(`end:${outcome.type}`);
            },
          };
        },
      });

      panel.use(lifter.cancelLanding);
      ReactionProbe.react = () => {
        ReactionProbe.react = null;
        log.push(`request:${asked}`);

        if (asked === 'cancel') {
          panel.requestCancel('reaction');
        } else if (asked === 'destroy') {
          void panel.requestDestroy();
        } else {
          list.firstElementChild!.dispatchEvent(
            new PointerEvent('pointerdown', { bubbles: true, isPrimary: true }),
          );
        }
      };

      await grab('#r1');

      const running = [
        'activate:before',
        `request:${asked}`,
        'activate:after',
        'start',
      ];

      if (asked === 'cancel') {
        expect(log).toEqual([...running, 'end:canceled']);
      } else if (asked === 'destroy') {
        expect(log).toEqual(running);
      } else {
        expect(log).toEqual(running);
        expect(refusals().untrusted).toBe(1);
      }

      await release();

      if (asked === 'press') {
        expect(log.at(-1)).toBe('end:skipped');
      }

      expect(isClean(list)).toBe(true);
    },
  );
});

describe('drag:DRI-6 reentrant input', () => {
  it('should refuse a nested press, and take the next real one', async () => {
    const list = makeList(3);
    const nested = (): void => {
      list.firstElementChild!.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, isPrimary: true }),
      );
    };
    let admissions = 0;

    managed(list, {
      admit(event) {
        admissions += 1;
        return { item: targetOf(event) };
      },
      activate: () => ({
        start: nested,
        end: noteOutcome,
      }),
    });
    await dragAndDrop('#r1', 30);
    expect(admissions).toBe(1);
    expect(refusals()).toEqual({ trusted: 0, untrusted: 1 });
    await dragAndDrop('#r0', 30);
    expect(admissions).toBe(2);
    expect(log).toEqual(['end:skipped', 'end:skipped']);
  });

  it('should refuse no trusted event during ordinary drags', async () => {
    const list = makeList(5);

    basicSortable(list);
    await dragAndDrop('#r0', 90);
    await dragAndDrop('#r1', 90);
    expect(refusals().trusted).toBe(0);
  });
});
