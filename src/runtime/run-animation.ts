import {
  EMPTY,
  concat,
  defer,
  merge,
  type Observable,
} from 'rxjs';

import type {
  AnimatableElement,
  AnimationDescription,
  AnimationLifecycleEvent,
} from '../core/animation.js';
import { animate$ } from '../drivers/web-animation.js';

const runChild$ = (
  element: AnimatableElement,
  description: AnimationDescription,
): Observable<AnimationLifecycleEvent> =>
  defer(() => runAnimation$(element, description));

const assertNever = (value: never): never => {
  throw new TypeError(`Unknown animation description: ${String(value)}`);
};

export const runAnimation$ = (
  element: AnimatableElement,
  description: AnimationDescription,
): Observable<AnimationLifecycleEvent> => {
  switch (description.kind) {
    case 'plan':
      return animate$(element, description);

    case 'sequence':
      return description.steps.length === 0
        ? EMPTY
        : concat(
            ...description.steps.map((step) => runChild$(element, step)),
          );

    case 'group':
      return description.steps.length === 0
        ? EMPTY
        : merge(
            ...description.steps.map((step) => runChild$(element, step)),
          );

    default:
      return assertNever(description);
  }
};
