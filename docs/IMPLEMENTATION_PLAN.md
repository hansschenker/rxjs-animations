# rxjs-animations implementation plan

## Goal

Reconstruct the useful **animation semantics** of Angular's legacy animation system as a framework-independent **RxJS 7.8.2 + TypeScript** library.

This is a semantic conversion, not a source-code port.

```text
Angular animation idea
        |
        v
identify observable behavior
        |
        +---------------------------+
        |                           |
        v                           v
clean RxJS mapping exists      Angular-runtime coupling
        |                           |
        v                           v
implement compatible          mark NOT COMPATIBLE
RxJS semantics                and design RxJS-native replacement
```

## Compatibility rule

Every Angular feature is classified as one of:

- **Compatible** — its observable animation semantics can be represented directly in framework-independent RxJS/TypeScript.
- **Adapted** — the useful behavior is preserved, but execution/API/lifecycle must be expressed differently.
- **Not compatible with RxJS/TypeScript animations** — the behavior depends on Angular renderer/component/runtime machinery rather than animation semantics. We do not imitate it. We document an RxJS-native design instead.

**Compatibility does not mean API identity.** It means the same meaningful animation behavior can be expressed without requiring Angular.

## Permanent design constraints

- RxJS baseline: **7.8.2**.
- TypeScript-first, strict mode.
- Core is class-free where practical: descriptions + pure functions + Observables.
- Cold by default; sharing explicit.
- Time comes from the Web Animations API or an explicit RxJS time source.
- Cancellation is represented by subscription lifecycle and higher-order policies.
- Flattening operators are concurrency/cancellation policies.
- DOM access is isolated at the driver/query boundary.
- No Angular dependency, Renderer2 dependency, NgZone dependency, or DI requirement.

---

# F00 — Structural Foundation

**Status: implemented**

### Deliverables

- package/build/test structure
- RxJS 7.8.2 dependency contract
- strict TypeScript configuration
- `AnimationPlan`
- lifecycle event union: `start | finish | cancel`
- lazy Web Animations API primitive `animate$()`
- unsubscribe -> `Animation.cancel()`
- cold independent execution per subscription
- initial architecture and compatibility documentation

### Angular inspiration

- `AnimationDriver.animate(...)`
- `WebAnimationsDriver`
- `WebAnimationsPlayer` lifecycle

### RxJS design

```text
AnimationPlan
    |
    v
animate$(element, plan)
    |
subscribe
    v
Element.animate(...)
```

`AnimationPlayer` is intentionally **not** recreated as a class hierarchy.

---

# F01 — Composition Foundation

### Angular concepts

- `sequence()`
- `group()`
- `keyframes()`

### RxJS design

```text
sequence = serial composition
         = concat / concatMap policy

group    = concurrent composition
         = merge policy

keyframes = ordered values over normalized animation progress
```

### Deliverables

- composable animation description AST/data model
- `sequence(...)`
- `group(...)`
- `keyframes(...)`
- compiler from composite description -> executable plans
- deterministic composition tests

### Compatibility

**Compatible**, implemented with RxJS composition rather than Angular player groups.

---

# F02 — Style and Timing Semantics

### Angular concepts

- `style()`
- `animate()`
- timing strings such as `500ms 100ms ease-out`
- style normalization
- keyframe offsets

### RxJS design

Keep styles/timing as pure data. Parse timing before execution. Validate Web Animations API compatible values at the driver boundary.

### Deliverables

- `style(...)`
- `animate(...)`
- timing parser
- duration/delay/easing model
- keyframe offset validation
- style normalization utilities

### Compatibility

Mostly **Compatible**.

Angular's internal style-normalizer implementation is not copied; use standards-based CSS/WAAPI normalization.

---

# F03 — State and Transition Model

### Angular concepts

- `state()`
- `transition()`
- `* => state`
- `state <=> state`
- `:increment`
- `:decrement`

### RxJS design

State is a stream. Consecutive states form transition candidates.

```text
state$
  |
  v
pairwise()
  |
  v
[from, to]
  |
  v
transition matcher
```

### Deliverables

- state descriptions
- transition matcher functions
- wildcard/bidirectional matching
- increment/decrement aliases
- pure transition selection
- transition tests independent of DOM

### Compatibility

**Compatible** for state matching semantics.

---

# F04 — Trigger Runtime and Explicit Concurrency Policies

### Angular concept

- `trigger()`
- previous/current state tracking
- interruption of active animations

### RxJS design

A trigger is a named state-transition stream machine, not renderer metadata.

Default same-element/same-trigger replacement behavior can be represented with latest-wins execution:

```text
state transition requests
        |
        v
     switchMap
        |
        v
latest animation survives
```

Other policies remain available deliberately:

```text
mergeMap   = overlap
switchMap  = latest
concatMap  = queue
exhaustMap = ignore while active
```

### Deliverables

- `trigger(...)` description
- `runTrigger(...)`
- latest/queue/overlap/ignore policy helpers or direct operator composition
- state retention
- cancellation tests

### Compatibility

**Adapted**. Angular's trigger syntax can be represented, but Angular renderer binding such as `[@openClose]` is **not compatible with RxJS/TypeScript animations**. Replacement: explicit element + state Observable binding.

---

# F05 — DOM Query and Stagger

### Angular concepts

- `query()`
- `stagger()`

### RxJS design

DOM query produces elements; elements become a stream; index supplies stagger offset.

```text
root element
   |
querySelectorAll
   |
from(elements)
   |
indexed delay policy
   |
mergeMap / concatMap animation execution
```

### Deliverables

- standards-based CSS query support
- optional query semantics
- limit support where useful
- stagger timing from element index
- explicit concurrency choice

### Compatibility

Plain CSS selector querying is **Compatible/Adapted**.

Angular-only query tokens such as trigger-aware selectors (`@trigger`, `@*`, `:animating`) are **not compatible with RxJS/TypeScript animations** because they depend on Angular engine metadata. Replacement: explicit element streams or user-defined predicates/registries.

---

# F06 — Reusable Animations and Parameters

### Angular concepts

- `animation()`
- `useAnimation()`
- animation parameters

### RxJS design

Reusable animation descriptions are pure functions/data factories.

```text
params -> AnimationDescription
```

### Deliverables

- reusable description factory
- parameter interpolation
- parameter validation/defaults
- composition tests

### Compatibility

**Compatible**, without Angular metadata objects.

---

# F07 — Enter / Leave Lifecycle

### Angular concepts

- `:enter`
- `:leave`
- delayed DOM removal until leave animation completion

### Problem

Angular knows when framework views/elements are inserted or scheduled for removal. A framework-independent RxJS library does not own application DOM lifecycle.

### Classification

Automatic Angular `:enter` / `:leave` lifecycle detection is **not compatible with RxJS/TypeScript animations**.

### RxJS-native replacement

Make lifecycle explicit:

```text
enter$ -> animate enter
leave$ -> animate leave -> removal action
```

or supply helpers where the caller explicitly delegates DOM ownership to the library.

### Deliverables

- explicit `enterAnimation(...)`
- explicit `leaveAnimation(...)`
- optional helper that removes an element only after completion
- cancellation behavior documented

---

# F08 — Interruption Snapshots and AUTO_STYLE

### Angular concepts

- previous-player style merging
- current style snapshot when interrupted
- pre/post styles
- `AUTO_STYLE` / computed styles

### RxJS design

At transition replacement:

```text
active animation
      |
get current computed/WAAPI state
      |
cancel old execution
      |
use snapshot as next animation start
```

### Compatibility

**Adapted**. The useful visual continuity can be reproduced, but Angular's internal player/style-merging implementation will not be copied.

### Deliverables

- computed style adapter
- interrupted animation snapshot strategy
- automatic-from-current-value support where WAAPI permits it
- tests for continuity

---

# F09 — Child / Hierarchical Animation Orchestration

### Angular concept

- `animateChild()`
- parent animation can query/block/start child trigger animations

### Problem

Angular derives parent/child animation relationships from its renderer and component/view tree.

### Classification

Automatic Angular `animateChild()` semantics are **not compatible with RxJS/TypeScript animations**.

### RxJS-native replacement

Child animations are explicit streams/compositions:

```text
parentAnimation$
childAnimation$

concat(...)     // parent then child
merge(...)      // together
combineLatest   // state coordination if appropriate
```

The application supplies the relationship rather than an Angular renderer discovering it implicitly.

### Deliverables

- documented parent/child composition patterns
- optional combinators for explicit child animation groups

---

# F10 — AnimationFrames Driver

### Reference

Ben Lesh's `benlesh/rxjs-web-animation` is a useful semantic reference here. Its decomposition of frame source -> elapsed time -> normalized duration -> easing -> tween maps directly to this milestone. We will modernize that idea with RxJS 7.8.2 `animationFrames()`, injectable time sources, and explicit sharing rather than its custom global shared frame loop.

See `REFERENCES.md`.

### Purpose

Remove the assumption that animation means DOM + WAAPI.

### RxJS design

```text
animationFrames()
      |
 elapsed time
      |
 normalize 0..1
      |
 easing
      |
 interpolate
      |
 T values over time
```

### Deliverables

- frame clock source
- normalized progress stream
- easing functions
- generic interpolation functions
- numeric/object adapters
- canvas/SVG/PixiJS examples

### Compatibility

This is an **RxJS-native extension**, not an Angular compatibility feature.

---

# F11 — Disable / No-op Policies

### Angular concepts

- `NoopAnimationsModule`
- `@.disabled`

### Classification

Angular module/provider disabling and `@.disabled` renderer semantics are **not compatible with RxJS/TypeScript animations**.

### RxJS-native replacement

Execution policy is explicit:

```text
enabled$ ? animation$ : noopAnimation$
```

or select a no-op driver.

### Deliverables

- `noop` driver
- conditional animation composition examples
- deterministic test behavior

---

# F12 — Documentation, Migration Examples, Verification

### Deliverables

- Angular-to-RxJS cookbook
- animation behavior timelines
- examples for trigger/state/transition, list stagger, enter/leave, interruption, and frame animation
- compatibility matrix kept current
- implementation checked against Angular behavior where semantic parity is claimed

## Verification method

For every Angular-derived feature:

1. **Intuition** — describe what changes over time.
2. **Specification** — define state, input, transition, action, time, cancellation, and completion.
3. **Verification** — compare with Angular source/tests where parity is claimed, then test the RxJS implementation independently.

No feature is called compatible merely because the API has a similar name.
