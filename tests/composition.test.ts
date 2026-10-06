import { describe, expect, it, vi } from 'vitest';

import {
  animationPlan,
  group,
  keyframes,
  runAnimation$,
  sequence,
  type AnimatableElement,
} from '../src/index.js';

type AnimationListener = () => void;

interface FakeAnimationController {
  readonly animation: Animation;
  readonly cancel: ReturnType<typeof vi.fn>;
  emit(type: 'finish' | 'cancel'): void;
}

const createFakeAnimation = (): FakeAnimationController => {
  const listeners = new Map<'finish' | 'cancel', Set<AnimationListener>>([
    ['finish', new Set()],
    ['cancel', new Set()],
  ]);

  let playState: AnimationPlayState = 'running';

  const cancel = vi.fn(() => {
    playState = 'idle';
  });

  const animation = {
    get playState() {
      return playState;
    },
    cancel,
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (type === 'finish' || type === 'cancel') {
        listeners.get(type)?.add(listener as AnimationListener);
      }
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (type === 'finish' || type === 'cancel') {
        listeners.get(type)?.delete(listener as AnimationListener);
      }
    },
  } as unknown as Animation;

  return {
    animation,
    cancel,
    emit(type) {
      playState = type === 'finish' ? 'finished' : 'idle';

      for (const listener of [...(listeners.get(type) ?? [])]) {
        listener();
      }
    },
  };
};

const createElement = (...animations: FakeAnimationController[]) => {
  const animate = vi.fn(() => {
    const next = animations.shift();
    if (!next) throw new Error('No fake animation available');
    return next.animation;
  });

  return {
    element: { animate } as AnimatableElement,
    animate,
  };
};

const fadeIn = animationPlan(
  keyframes([{ opacity: 0 }, { opacity: 1 }]),
  { duration: 100 },
);

const moveRight = animationPlan(
  keyframes([
    { transform: 'translateX(0px)' },
    { transform: 'translateX(100px)' },
  ]),
  { duration: 200 },
);

const scaleUp = animationPlan(
  keyframes([
    { transform: 'scale(1)' },
    { transform: 'scale(1.2)' },
  ]),
  { duration: 150 },
);

describe('keyframes', () => {
  it('preserves frame order and returns independent frame objects', () => {
    const input: Keyframe[] = [
      { opacity: 0, offset: 0 },
      { opacity: 0.5, offset: 0.5 },
      { opacity: 1, offset: 1 },
    ];

    const result = keyframes(input);

    expect(result).toEqual(input);
    expect(result).not.toBe(input);
    expect(result[0]).not.toBe(input[0]);
    expect(result[1]).not.toBe(input[1]);
  });
});

describe('sequence', () => {
  it('starts the next child only after the previous child completes', () => {
    const first = createFakeAnimation();
    const second = createFakeAnimation();
    const { element, animate } = createElement(first, second);
    const events: string[] = [];
    const complete = vi.fn();

    runAnimation$(
      element,
      sequence([fadeIn, moveRight]),
    ).subscribe({
      next: (event) => events.push(event.type),
      complete,
    });

    expect(animate).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['start']);

    first.emit('finish');

    expect(animate).toHaveBeenCalledTimes(2);
    expect(events).toEqual(['start', 'finish', 'start']);
    expect(complete).not.toHaveBeenCalled();

    second.emit('finish');

    expect(events).toEqual(['start', 'finish', 'start', 'finish']);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('cancels only the active child and never starts queued children on unsubscription', () => {
    const first = createFakeAnimation();
    const second = createFakeAnimation();
    const { element, animate } = createElement(first, second);

    const subscription = runAnimation$(
      element,
      sequence([fadeIn, moveRight]),
    ).subscribe();

    subscription.unsubscribe();

    expect(animate).toHaveBeenCalledTimes(1);
    expect(first.cancel).toHaveBeenCalledTimes(1);
    expect(second.cancel).not.toHaveBeenCalled();
  });
});

describe('group', () => {
  it('starts all children concurrently and completes after all children complete', () => {
    const first = createFakeAnimation();
    const second = createFakeAnimation();
    const { element, animate } = createElement(first, second);
    const events: string[] = [];
    const complete = vi.fn();

    runAnimation$(
      element,
      group([fadeIn, moveRight]),
    ).subscribe({
      next: (event) => events.push(event.type),
      complete,
    });

    expect(animate).toHaveBeenCalledTimes(2);
    expect(events).toEqual(['start', 'start']);

    first.emit('finish');

    expect(events).toEqual(['start', 'start', 'finish']);
    expect(complete).not.toHaveBeenCalled();

    second.emit('finish');

    expect(events).toEqual(['start', 'start', 'finish', 'finish']);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('cancels all active children on unsubscription', () => {
    const first = createFakeAnimation();
    const second = createFakeAnimation();
    const { element } = createElement(first, second);

    const subscription = runAnimation$(
      element,
      group([fadeIn, moveRight]),
    ).subscribe();

    subscription.unsubscribe();

    expect(first.cancel).toHaveBeenCalledTimes(1);
    expect(second.cancel).toHaveBeenCalledTimes(1);
  });
});

describe('nested composition', () => {
  it('waits for an inner group before advancing an outer sequence', () => {
    const first = createFakeAnimation();
    const second = createFakeAnimation();
    const third = createFakeAnimation();
    const { element, animate } = createElement(first, second, third);
    const complete = vi.fn();

    runAnimation$(
      element,
      sequence([
        group([fadeIn, moveRight]),
        scaleUp,
      ]),
    ).subscribe({ complete });

    expect(animate).toHaveBeenCalledTimes(2);

    first.emit('finish');
    expect(animate).toHaveBeenCalledTimes(2);

    second.emit('finish');
    expect(animate).toHaveBeenCalledTimes(3);
    expect(complete).not.toHaveBeenCalled();

    third.emit('finish');
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('completes empty sequence and group without starting a browser animation', () => {
    const { element, animate } = createElement();
    const sequenceComplete = vi.fn();
    const groupComplete = vi.fn();

    runAnimation$(element, sequence([])).subscribe({ complete: sequenceComplete });
    runAnimation$(element, group([])).subscribe({ complete: groupComplete });

    expect(animate).not.toHaveBeenCalled();
    expect(sequenceComplete).toHaveBeenCalledTimes(1);
    expect(groupComplete).toHaveBeenCalledTimes(1);
  });
});
