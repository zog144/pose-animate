# pose-animate 0.3 — application-facing presenter contract

**Status:** `0.3.0-dev.0` integration candidate on `unstable`. The `@zog/pose-animate/presenter` entrypoint is the intended consumer API; the richer root entrypoint remains for playground and renderer development. It is not a published stable release.

```ts
import {createSkiffPresenter} from '@zog/pose-animate/presenter';

const mascot=createSkiffPresenter(document.querySelector('#skiff')!, {
  palette:'blue', reducedMotion:'auto'
});
const unsubscribe=mascot.subscribe(event=>{
  if(event.type==='sequence-cancelled') console.info(event.name, event.reason);
});
mascot.setState('working');
mascot.setMood('focused');

// Play only after the application has chosen the appropriate factual sequence.
const result=await mascot.playSequence('connection-recovery');
if(result.status==='completed') console.info('Visual sequence ended');

// The application, not an animation, verifies actual readiness.
mascot.setState('ready');
unsubscribe();
mascot.destroy();
```

## Methods

- `setState(state)` — apply a factual application state, cancelling unfinished visual playback. Rejects invalid states before mutation.
- `setMood(mood)` — request an expressive mood; critical system conditions retain appropriate facial precedence.
- `getState()` — returns the current factual state (including the current stage of a visual sequence), or `null` before one is selected.
- `playSequence(name)` — returns a `Promise<SkiffSequenceResult>` that resolves exactly once with `completed` or `cancelled`.
- `stop()` — stop the current scenario; its promise resolves `cancelled` with reason `stopped`.
- `subscribe(handler)` — receives `state-changed`, `sequence-completed`, or `sequence-cancelled`; returns an unsubscribe function. Listener exceptions cannot break playback settlement.
- `destroy()` — idempotent cleanup: cancel pending playback, release animation-frame watcher, clear listeners, and destroy the underlying SVG character.

Cancellation reasons: `superseded`, `state-change`, `stopped`, `destroyed`. Invalid commands fail closed. Calling mutating methods after `destroy()` throws.

## Reduced motion

With `{reducedMotion:true}` or an initially detected OS reduced-motion preference, `playSequence()` immediately shows its final **static** scene, does not schedule a presenter RAF watcher, and resolves `completed`. The app should still expose its factual status via accessible HTML. `false` overrides OS detection for explicit developer testing; `auto` (default) consults the preference at creation time.

## Integration boundary

`pose-animate` owns Skiff geometry, pose interpolation, and visual expression only. It does **not** perform readiness checks, DNS operations, network recovery, user enrollment, or application status transitions. Do not equate a `completed` visual sequence with successful host installation or restored connectivity. A caller must authorize the named sequence according to independently verified host facts. In particular, `connection-recovery` includes an illustrative `ready` stage and must not be used to imply successful restoration prematurely.

The presenter does not expose SVG coordinates or limb-square controls. The development playground can continue using the existing lower-level `createSkiff` API.
