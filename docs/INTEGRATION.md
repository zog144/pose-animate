# pose-animate 0.3 — application-facing presenter contract

**Status:** `0.3.0-rc.0` unpublished integration candidate on `unstable`. The `@zog/pose-animate/presenter` entrypoint is the intended consumer API; the richer root entrypoint remains for playground and renderer development. It is not a published stable release.

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
- `pause()` and `resume()` — freeze or continue visual sequence time, including in reduced-motion mode. The sequence promise stays pending while paused.
- `getPlayback()` — inspect the renderer's current visual stage and elapsed/duration values (not authoritative host facts).
- `stop()` — stop the current scenario; its promise resolves `cancelled` with reason `stopped`.
- `subscribe(handler)` — receives `state-changed`, `sequence-completed`, or `sequence-cancelled`; returns an unsubscribe function. Listener exceptions cannot break playback settlement.
- `destroy()` — idempotent cleanup: cancel pending playback, release animation-frame watcher, clear listeners, and destroy the underlying SVG character.

Cancellation reasons: `superseded`, `state-change`, `stopped`, `destroyed`. Invalid commands fail closed. Calling mutating methods after `destroy()` throws.

## Reduced motion

With `{reducedMotion:true}` or an initially detected OS `prefers-reduced-motion: reduce` preference, `playSequence()` progresses through **every semantic stage for its full intended duration**, updating the SVG in discrete static poses at approximately **5 FPS (200 ms)**. It uses a single bounded timeout only during active playback, with **no continuous RAF, interpolation or decorative movement**. `pause()` cancels pending scheduling and freezes time; `resume()` continues from the held stage without skipping duration. Completion events and promises occur only when the actual timeline finishes, including its final stage. State replacement, stop, destroy and superseding sequences cancel outstanding work and settle promises. `false` overrides OS detection for explicit full-motion testing; `auto` (default) consults the preference at creation time. The application still exposes authoritative status through accessible HTML rather than treating Skiff as evidence.


**Visual FPS clarification (October 22, 2026):** An earlier reduced-mode
candidate updated its DOM every 200 ms but repeatedly drew the same static
pose; a full sequence therefore showed only its semantic stage changes. This
was not acceptable. `sampleReducedPose(pose, frameIndex)` now chooses among
five deterministic, visibly different limb configurations at 200 ms intervals
*within every stage*, while keeping full stage duration, no interpolation,
no decorative pulses, and the approved pondering chin-tip geometry. These
visible changes—not scheduler callbacks—are asserted in regression tests.

## Integration boundary

`pose-animate` owns Skiff geometry, pose interpolation, and visual expression only. It does **not** perform readiness checks, DNS operations, network recovery, user enrollment, or application status transitions. Do not equate a `completed` visual sequence with successful host installation or restored connectivity. A caller must authorize the named sequence according to independently verified host facts. In particular, `connection-recovery` includes an illustrative `ready` stage and must not be used to imply successful restoration prematurely.

The presenter does not expose SVG coordinates or limb-square controls. The development playground can continue using the existing lower-level `createSkiff` API.
