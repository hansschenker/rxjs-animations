# rxjs-animations

Declarative animations modeled as **values and state transitions over time**, implemented with **RxJS 7.8.2** and TypeScript.

```text
Animation Description
        |
        v
   Pure Compiler
        |
        v
Observable<AnimationPlan>
        |
        v
 RxJS Orchestration
        |
        v
 Animation Driver
        |
        v
DOM / Web Animations API
```

The project is inspired by the useful semantics of Angular's legacy animation system—states, transitions, sequences, groups, keyframes, queries, and staggering—but it is **not an Angular port or dependency**. The goal is to express those behaviors as a small framework-independent RxJS machine.

## Core model

```text
Animation
=
State Transition
+
Time Policy
+
Concurrency Policy
+
Cancellation Policy
+
Rendering Action
```

RxJS owns orchestration and lifecycle policy. A driver owns rendering.

For the default Web Animations API driver:

```text
subscribe
   |
   +--> element.animate(...)
   +--> start

browser finish
   |
   +--> finish
   +--> complete

browser cancel
   |
   +--> cancel
   +--> complete

unsubscribe while active
   |
   +--> animation.cancel()
```

Nothing runs until subscription. Every subscription creates an independent animation execution.

## F00 — Structural Foundation

F00 establishes:

- RxJS **7.8.2** as the permanent reactive baseline.
- Strict TypeScript configuration with DOM types.
- Pure animation-plan and driver types.
- A lazy `animate$()` Web Animations API primitive.
- Explicit start / finish / cancel lifecycle notifications.
- Unsubscription-to-`Animation.cancel()` teardown.
- Cold execution: each subscription calls `element.animate(...)` independently.
- Unit tests for laziness, independent subscriptions, completion, cancellation, and driver errors.
- A roadmap for translating the Angular animation vocabulary into RxJS composition.

## Install

```bash
npm install
```

## Check

```bash
npm run check
```

This runs strict type checking, tests, and the production build.

## First primitive

```ts
import { animate$, animationPlan } from 'rxjs-animations';

const fade = animationPlan(
  [
    { opacity: 0 },
    { opacity: 1 },
  ],
  {
    duration: 300,
    easing: 'ease-out',
    fill: 'both',
  },
);

const animation$ = animate$(element, fade);

const subscription = animation$.subscribe({
  next: event => console.log(event.type),
  complete: () => console.log('done'),
});

// Cancels the active browser animation if it has not already settled.
subscription.unsubscribe();
```

The `animation$` value is only a description of execution. `element.animate(...)` is not called until subscription.

## Angular semantics → RxJS policies

Planned translations:

| Animation concept | RxJS interpretation |
| --- | --- |
| `trigger()` | named state-transition machine |
| `state()` | persistent style state |
| `transition()` | matcher over previous/current state |
| `animate()` | timed animation plan |
| `keyframes()` | ordered style values over normalized time |
| `sequence()` | serial composition |
| `group()` | concurrent composition |
| `query()` | DOM selection source |
| `stagger()` | indexed time offset |
| same element + same trigger replacement | latest-wins cancellation policy |
| player destruction | subscription teardown |

The implementation will keep policy explicit. For higher-order animation requests:

```text
mergeMap   = allow overlap
switchMap  = latest wins
concatMap  = queue
exhaustMap = ignore while busy
```

## Scope

This library will provide two execution modes over time:

1. **Web Animations API driver** — browser interpolation/compositor; RxJS controls orchestration and cancellation.
2. **RxJS frame driver** — `animationFrames()` supplies time for numeric, canvas, SVG, PixiJS, or other non-DOM interpolation.

F00 implements the first primitive for mode 1.

## Project structure

```text
src/
  core/
    animation.ts
  drivers/
    web-animation.ts
  index.ts

tests/
  web-animation.test.ts

docs/
  ARCHITECTURE.md
  ROADMAP.md
```

The structure will grow only as later milestones require it.

## Design principles

- RxJS 7.8.2 only.
- Values move over time; animation is not modeled as callbacks.
- Observables are lazy descriptions; execution starts at subscription.
- Cold by default; sharing must be explicit.
- Time comes from the browser animation clock or an RxJS time source.
- Cancellation is explicit and tied to subscription lifecycle.
- Flattening operators are animation concurrency policies.
- Business/domain interpolation lives in user functions; operators only rewire streams.
- Core descriptions and compiler functions remain class-free and side-effect free.
- DOM effects remain at the driver boundary.

## Status

**F00 complete once the repository passes `npm run check`.**

Next: **F01 — Composition Foundation**: `sequence`, `group`, and `keyframes`.

## License

MIT
