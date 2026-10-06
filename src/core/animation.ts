export type AnimationKeyframes = Keyframe[];

export interface AnimationPlan {
  readonly keyframes: AnimationKeyframes;
  readonly options: KeyframeAnimationOptions;
}

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

export const animationPlan = (
  keyframes: AnimationKeyframes,
  options: KeyframeAnimationOptions = {},
): AnimationPlan => ({
  keyframes,
  options,
});
