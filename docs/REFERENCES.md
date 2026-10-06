# Design references

This project is a framework-independent RxJS 7.8.2 + TypeScript design. External projects are used as semantic references, not as APIs that must be copied.

## Angular animations

Source reference:

- `angular/angular/packages/animations`
- `angular/angular/packages/animations/browser`
- `angular/angular/packages/platform-browser/animations`

Use:

- identify observable behavior of `sequence`, `group`, `keyframes`, state/transition matching, interruption, querying, and lifecycle;
- distinguish animation semantics from Angular renderer/component/runtime machinery;
- verify behavior where this project claims semantic compatibility.

The Angular API and internal class hierarchy are not implementation requirements.

## Ben Lesh — rxjs-web-animation

Repository:

- `benlesh/rxjs-web-animation`

The project is an early RxJS 6-era alpha, but it contains a useful reactive decomposition for frame-based animation:

```text
frame source
    |
    v
elapsed time
    |
    v
duration normalization
    |
    v
progress 0..1
    |
    v
easing
    |
    v
tween / physical value
```

Particularly useful ideas:

- animation time can itself be an Observable;
- a duration stream can normalize elapsed time to `0..1`;
- easing is a pure `progress -> progress` function;
- tweening is a pure mapping from normalized progress to values;
- the frame source can be injected, which is valuable for deterministic testing;
- velocity and acceleration are naturally values evolving over a frame stream.

### What we will reuse semantically

For F10, `rxjs-animations` will use the same broad decomposition:

```text
animationFrames()
      |
 elapsed
      |
 progress(duration)
      |
 easing
      |
 interpolate
      |
 Observable<T>
```

### What we will not copy

The old library implements its own globally shared `requestAnimationFrame` loop with module-level mutable subscriber state.

That does not match this project's rules:

- RxJS 7.8.2 already supplies `animationFrames()`;
- cold execution is the default;
- sharing must be explicit;
- time sources should be injectable rather than hidden global machinery;
- the implementation should avoid unnecessary mutable global registries.

Therefore Ben Lesh's library is a **design reference for frame/progress/tween semantics**, especially F10, not the runtime foundation of this project.
