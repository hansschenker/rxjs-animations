import { Observable } from 'rxjs';
import type {
  AnimatableElement,
  AnimationLifecycleEvent,
  AnimationPlan,
} from '../core/animation.js';

const isSettledPlayState = (playState: AnimationPlayState): boolean =>
  playState === 'finished' || playState === 'idle';

export const animate$ = (
  element: AnimatableElement,
  plan: AnimationPlan,
): Observable<AnimationLifecycleEvent> =>
  new Observable<AnimationLifecycleEvent>((subscriber) => {
    let animation: Animation;

    try {
      animation = element.animate(plan.keyframes, plan.options);
    } catch (error) {
      subscriber.error(error);
      return undefined;
    }

    let settled = false;

    const finish = (): void => {
      if (settled) return;
      settled = true;
      subscriber.next({ type: 'finish', animation });
      subscriber.complete();
    };

    const cancel = (): void => {
      if (settled) return;
      settled = true;
      subscriber.next({ type: 'cancel', animation });
      subscriber.complete();
    };

    animation.addEventListener('finish', finish);
    animation.addEventListener('cancel', cancel);

    subscriber.next({ type: 'start', animation });

    return () => {
      animation.removeEventListener('finish', finish);
      animation.removeEventListener('cancel', cancel);

      if (!settled && !isSettledPlayState(animation.playState)) {
        animation.cancel();
      }
    };
  });
