# host-welcome ↔ pose-animate — refreshed consumer handoff
Date: 2026-10-16
Owner: `pose-animate` Regular implementation
Candidate: `zog144/pose-animate` `unstable`, implementation source `4227ab2fe3ad0c417a4d47ce0d889f99c4c0d3d4`
Release status: `0.3.0-rc.0` (`private: true`; no npm publication or GitHub Pages)

This handoff **updates an existing, partially successful host-welcome adoption**;
it does not assume that integration must start from scratch. Keep the working
adapter, replace only integration points that differ from the current contract,
and provide a concrete regression report for any gaps.

## Use the application-facing boundary

```ts
import {createSkiffPresenter} from '@zog/pose-animate/presenter';

const mascot=createSkiffPresenter(mascotElement,{
  palette:'blue',
  reducedMotion:'auto'
});
const unsubscribe=mascot.subscribe(event=>{
  // state-changed, sequence-completed, sequence-cancelled
  // UI status and host authority must not be inferred from these events.
});
mascot.setState('working');
// Other supported states: idle, ready, receiving, thinking, output-ready,
// waiting, connection-interrupted, recovering, warning, error, sleeping.
mascot.setMood('focused');
// When the UI view is torn down:
unsubscribe();
mascot.destroy();
```

Use only the `./presenter` public entrypoint for host-welcome. The root
renderer and direct square controls are for demos and pose-animate development.

## Presenter contract (v0.3 candidate)

- `setState(state)`: authoritative **visual representation** of an already
  established host-welcome state; rejects unknown states; interrupts a pending
  animation with reason `state-change`.
- `setMood(mood)`: optional expression; warnings, errors, sleeping and
  connection interruptions override inappropriate cheerful expressions.
- `getState()`: current visual system-state selection; not an authoritative
  query to the installation controller.
- `playSequence(name)`: visual-only `Promise`, resolving once to
  `{name,status:'completed'}` or
  `{name,status:'cancelled',reason}`, with cancellation reasons
  `superseded`, `state-change`, `stopped`, `destroyed`.
- `stop()`, `subscribe(callback)` / unsubscribe, and idempotent `destroy()`
  are the lifecycle controls.
- Reduced motion is read at creation time (`'auto'`, `true`, or `false`).
  In reduced motion, a named sequence **immediately displays its final visual
  state and completes**. Do not interpret this as work completion.
- The renderer namespacing prevents conflicting SVG IDs across multiple
  Skiffs sharing the same document. Do not target private SVG element IDs.

Named demonstration sequences are `request-flow`, `connection-recovery`,
`greeting`. Timings and labels are **illustrative**, not host-install
milestones. In particular, `connection-recovery` ends visually at `ready`;
host-welcome must **never invoke it to assert recovery in advance** of real
authenticated connectivity/readiness evidence. For a live recovery attempt,
prefer verified `setState('recovering')` followed only on positive verification
by `setState('ready')`, or select a separately authorized choreography.

## Real progress and authentication boundary

The console-based `host-welcome` comes first. X11, greetd, Firefox/Chromium
and TurboVNC are later compiled/deployed as supervised applications, outside
the base root filesystem. The simulator's six stages are **not** a producer
contract. The host-install/controller side should provide authenticated,
replay-safe, durable progress reports with session identity, monotonic revision,
stage identity, status, evidence-backed progress, retry/error status, and a
separate readiness/graphical-handoff gate.

Keep status text, error details and progress accessible outside SVG. Reboots,
reconnections and interrupted subscriptions must replay the verified current
host state, not resurrect a stale animation. Every initial `ready` indication
must be gated by independent host verification.

## Requested acceptance return from host-welcome implementation

1. State the currently adopted pose-animate commit and import path; identify
   code that already works so it is preserved.
2. Confirm the new presenter entrypoint and semantic states map to the real
   progress contract; record any unsupported or ambiguous states.
3. Verify connection interruption, verified recovery, failed app compilation,
   retry, console-to-graphical handoff, and reboot resumption **without**
   inferring success from a completed animation.
4. Test reduced motion, second Skiff instance (if present), replay safety,
   cleanup, and errors from an unmounted UI.
5. Return exact tests/logs and any bounded requests for pose-animate changes.
   Keep the actual authenticated progress reader and privileged operations
   outside pose-animate.

References:
- `docs/INTEGRATION.md`
- `docs/HOST_WELCOME_DEMO.md`
- `docs/BROWSER_COMPATIBILITY.md`
- `docs/RELEASE_CHECKLIST.md`
- `https://github.com/zog144/pose-animate/tree/unstable`

Do not publish a package, enable GitHub Pages or treat demo progress as real
host execution without separate authorization.
