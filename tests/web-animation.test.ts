import { describe, expect, it, vi } from 'vitest';
import { animate$, animationPlan, type AnimatableElement } from '../src/index.js';

type AnimationListener = () => void;

interface FakeAnimationController {
  readonly animation: Animation;
  readonly cancel: ReturnType<typeof vi.fn>;
  setPlayState(playState: AnimationPlayState): void;
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
    setPlayState(nextPlayState) {
      playState = nextPlayState;
    },
    emit(type) {
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

const fade = animationPlan(
  [{ opacity: 0 }, { opacity: 1 }],
  { duration: 300, easing: 'ease-out', fill: 'both' },
);

describe('animate$', () => {
  it('is lazy and starts execution only on subscription', () => {
    const fake = createFakeAnimation();
    const { element, animate } = createElement(fake);

    const animation$ = animate$(element, fade);

    expect(animate).not.toHaveBeenCalled();

    const subscription = animation$.subscribe();

    expect(animate).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('creates independent execution for each subscription', () => {
    const first = createFakeAnimation();
    const second = createFakeAnimation();
    const { element, animate } = createElement(first, second);
    const animation$ = animate$(element, fade);

    const firstSubscription = animation$.subscribe();
    const secondSubscription = animation$.subscribe();

    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate).toHaveBeenNthCalledWith(1, fade.keyframes, fade.options);
    expect(animate).toHaveBeenNthCalledWith(2, fade.keyframes, fade.options);

    firstSubscription.unsubscribe();
    secondSubscription.unsubscribe();
  });

  it('emits start, then finish, then completes', () => {
    const fake = createFakeAnimation();
    const { element } = createElement(fake);
    const events: string[] = [];
    const complete = vi.fn();

    animate$(element, fade).subscribe({
      next: (event) => events.push(event.type),
      complete,
    });

    fake.setPlayState('finished');
    fake.emit('finish');

    expect(events).toEqual(['start', 'finish']);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(fake.cancel).not.toHaveBeenCalled();
  });

  it('emits cancel and completes when the browser animation is cancelled externally', () => {
    const fake = createFakeAnimation();
    const { element } = createElement(fake);
    const events: string[] = [];
    const complete = vi.fn();

    animate$(element, fade).subscribe({
      next: (event) => events.push(event.type),
      complete,
    });

    fake.setPlayState('idle');
    fake.emit('cancel');

    expect(events).toEqual(['start', 'cancel']);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('cancels an active animation on unsubscription', () => {
    const fake = createFakeAnimation();
    const { element } = createElement(fake);
    const events: string[] = [];

    const subscription = animate$(element, fade).subscribe((event) => {
      events.push(event.type);
    });

    subscription.unsubscribe();

    expect(events).toEqual(['start']);
    expect(fake.cancel).toHaveBeenCalledTimes(1);
  });

  it('forwards element.animate errors through the Observable error channel', () => {
    const error = new Error('Web Animations API unavailable');
    const element = {
      animate() {
        throw error;
      },
    } as AnimatableElement;
    const received = vi.fn();

    animate$(element, fade).subscribe({ error: received });

    expect(received).toHaveBeenCalledWith(error);
  });
});
