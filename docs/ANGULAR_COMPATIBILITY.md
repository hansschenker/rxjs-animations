# Angular animation compatibility

## Meaning of the status labels

| Status | Meaning |
| --- | --- |
| **Compatible** | The meaningful animation semantics map directly to framework-independent RxJS/TypeScript. |
| **Adapted** | The behavior is retained, but lifecycle/API/execution differs intentionally. |
| **Not compatible** | The feature depends on Angular runtime/renderer/component machinery. The project uses an explicit RxJS-native replacement instead. |

The goal is behavioral clarity, not Angular API emulation.

## Compatibility matrix

| Angular feature | Status | rxjs-animations design |
| --- | --- | --- |
| `style()` | Compatible | Pure style description. |
| `animate()` | Compatible | Timed animation description compiled to a driver plan. |
| `keyframes()` | Compatible | Ordered styles over normalized progress. |
| `sequence()` | Compatible | Serial Observable composition. |
| `group()` | Compatible | Concurrent Observable composition. |
| `state()` | Compatible | Named persistent style state. |
| `transition()` | Compatible | Pure matcher over previous/current states. |
| `* => *`, `<=>` | Compatible | Wildcard and bidirectional transition predicates. |
| `:increment`, `:decrement` | Compatible | Numeric transition predicates. |
| `trigger()` | Adapted | Named state-transition stream machine. No Angular renderer binding. |
| `query()` with standard CSS selectors | Adapted | `querySelectorAll`/element streams at explicit DOM boundary. |
| `stagger()` | Compatible | Indexed time offset + explicit flattening policy. |
| `animation()` / `useAnimation()` | Compatible | Reusable pure descriptions/factories. |
| timing strings | Compatible | Standalone timing parser. |
| animation params | Compatible | Typed parameter substitution/factories. |
| `AUTO_STYLE` / computed style | Adapted | `getComputedStyle`/WAAPI snapshot at driver boundary. |
| interruption / previous-player style continuity | Adapted | Snapshot active visual state, unsubscribe/cancel, start successor from snapshot. |
| `AnimationPlayer` class API | Not compatible | Observable lifecycle + Subscription + optional command streams; no player class hierarchy. |
| `BrowserAnimationsModule` | Not compatible | No Angular module. Import normal TypeScript functions. |
| `provideAnimations()` / DI providers | Not compatible | No dependency injection requirement; pass drivers/policies explicitly. |
| `AnimationRendererFactory` / `Renderer2` integration | Not compatible | Explicit element streams and driver effects. |
| synthetic `[@trigger]` property bindings | Not compatible | `runTrigger(element, state$, spec)` or equivalent explicit binding. |
| synthetic `(@trigger.start/done)` events | Not compatible | Subscribe to lifecycle event streams. |
| `NgZone` animation integration | Not compatible | RxJS/browser scheduling only; framework adapters may be separate packages later. |
| automatic `:enter` detection | Not compatible | Caller supplies explicit enter/insert stream. |
| automatic `:leave` detection and framework-delayed removal | Not compatible | Caller supplies leave request; helper may remove after animation completion. |
| `animateChild()` automatic component-tree behavior | Not compatible | Explicit parent/child Observable composition. |
| Angular query selectors `@trigger`, `@*`, `:animating` | Not compatible | Explicit registries, predicates, or element streams. |
| `@.disabled` | Not compatible | Explicit enabled stream or no-op driver. |
| `NoopAnimationsModule` | Not compatible | No-op driver / conditional stream policy. |
| namespace/host-element renderer bookkeeping | Not compatible | Not part of framework-independent animation semantics. |
| Angular flush cycle / renderer microtask coordination | Not compatible | Observable scheduling and browser animation lifecycle. |

## Rule for future work

If exact Angular behavior requires hidden knowledge of Angular's component tree, renderer namespace, synthetic property binding, view insertion/removal process, or zone/flush lifecycle, it must **not** be smuggled into the RxJS core.

Instead:

1. mark the Angular feature **Not compatible with RxJS/TypeScript animations**;
2. identify the useful user-visible behavior;
3. design an explicit RxJS source/policy/combinator for that behavior;
4. keep framework-specific integration outside the core library.
