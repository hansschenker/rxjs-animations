# Architecture

## Purpose

`rxjs-animations` models animation as data and state changing over time. RxJS owns orchestration; rendering is delegated to a driver.

```text
Animation Description
        |
        v
Composition Tree
        |
        v
Cold Runtime Interpreter
        |
        v
 RxJS Orchestration
        |
        v
 Animation Driver
```

The project is inspired by useful semantics from Angular's legacy animation package, but does not reproduce Angular's renderer, dependency-injection, zone, or component-tree runtime.

## Behavioral model

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

### Teaching perspective

```text
Input Controller
      |
      v
Processing Unit
      |
      v
Action Dispatcher
```

- **Input Controller** receives state changes, DOM element streams, lifecycle signals, or explicit animation requests.
- **Processing Unit** matches transitions and builds animation plans.
- **Action Dispatcher** executes plans through a rendering driver and emits lifecycle notifications.

### Formal perspective

For state-driven animations, the trigger runtime can be treated as a stateful transducer / Mealy-style machine:

```text
T(state, event) -> nextState
G(state, event) -> animation actions
```

The action is not hidden inside the state transition. This matters because an identical state transition may be executed under different time, concurrency, or cancellation policies.

## Layers

### 1. Core descriptions

Pure TypeScript values:

- keyframes
- timing/options
- state descriptions
- transition matchers
- animation plans
- lifecycle events

No DOM mutation and no subscription occurs here.

### 2. Composition and runtime interpretation

F01 introduces a discriminated animation description tree:

```text
AnimationDescription
  |
  +-- plan
  +-- sequence
  +-- group
```

The tree is interpreted recursively by `runAnimation$()`:

```text
plan     -> animate$()
sequence -> concat(children)
group    -> merge(children)
```

This preserves serial/concurrent topology. Flattening the tree to `AnimationPlan[]` would lose that information.

`runAnimation$()` remains cold: traversing the description does not start a browser animation; execution starts only when the returned Observable is subscribed.

A future compiler may normalize richer descriptions such as states, transitions, timing strings, and queries, but its output must preserve this execution topology.

### 3. RxJS orchestration

Operators define execution policy.

```text
mergeMap   = allow overlap
switchMap  = latest wins / cancel previous
concatMap  = queue
exhaustMap = ignore while busy
```

The library will not hide these policies behind one universal animation engine when the policy can remain explicit.

### 4. Drivers

Drivers are the effect boundary.

F00 supplies the Web Animations API driver primitive:

```text
subscribe -> Element.animate(...)
finish    -> next(finish) -> complete
cancel    -> next(cancel) -> complete
unsubscribe while active -> Animation.cancel()
```

A later frame driver will use RxJS `animationFrames()` as the time source for numeric, canvas, SVG, PixiJS, and other non-DOM animations.

## Laziness and sharing

Animation Observables are **cold by default**.

```text
animation$ = animate$(element, plan)
```

constructs a description. It does not call `element.animate()`.

Each subscription creates independent execution:

```text
subscription A -> browser Animation A
subscription B -> browser Animation B
```

If multiple consumers must observe one execution, sharing must be explicit at the application/library boundary.

## Cancellation

Cancellation is part of the stream lifecycle.

- Browser-originated cancellation emits `{ type: 'cancel' }` and completes.
- RxJS unsubscription cancels the active browser animation.
- Superseding animations are expressed later through higher-order policy such as `switchMap`.

Unsubscription does not fabricate a downstream cancellation value after the subscriber is already closed.

## Time

Time is supplied by an execution source, not invented by operators.

Two planned sources:

1. Web Animations API browser clock/compositor.
2. RxJS `animationFrames()` for explicit frame-by-frame interpolation.

The same higher-level animation descriptions should be reusable where driver semantics permit it.

## Angular boundary

Angular's legacy system contains several layers that are not animation semantics themselves:

```text
BrowserAnimationsModule
Dependency Injection
AnimationRendererFactory
Renderer2 synthetic bindings
NgZone integration
Angular component enter/leave lifecycle
```

These layers will not be copied. See `ANGULAR_COMPATIBILITY.md` for the compatibility policy and replacements.
