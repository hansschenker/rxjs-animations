export type AnimationKeyframes = Keyframe[];

export interface AnimationPlan {
  readonly kind: 'plan';
  readonly keyframes: AnimationKeyframes;
  readonly options: KeyframeAnimationOptions;
}

export interface AnimationSequence {
  readonly kind: 'sequence';
  readonly steps: readonly AnimationDescription[];
}

export interface AnimationGroup {
  readonly kind: 'group';
  readonly steps: readonly AnimationDescription[];
}

export type AnimationDescription =
  | AnimationPlan
  | AnimationSequence
  | AnimationGroup;

export type AnimationLifecycleEvent =
  | AnimationStartEvent
  | AnimationFinishEvent
  | AnimationCancelEvent;

export interface AnimationStartEvent {
  readonly type: 'start';
  readonly animation: Animation;
}

export interface AnimationFinishEvent {
  readonly type: 'finish';
  readonly animation: Animation;
}

export interface AnimationCancelEvent {
  readonly type: 'cancel';
  readonly animation: Animation;
}

export interface AnimatableElement {
  animate(
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions,
  ): Animation;
}

export const keyframes = (frames: readonly Keyframe[]): AnimationKeyframes =>
  frames.map((frame) => ({ ...frame }));

export const animationPlan = (
  frames: AnimationKeyframes,
  options: KeyframeAnimationOptions = {},
): AnimationPlan => ({
  kind: 'plan',
  keyframes: frames,
  options,
});

export const sequence = (
  steps: readonly AnimationDescription[],
): AnimationSequence => ({
  kind: 'sequence',
  steps: [...steps],
});

export const group = (
  steps: readonly AnimationDescription[],
): AnimationGroup => ({
  kind: 'group',
  steps: [...steps],
});
