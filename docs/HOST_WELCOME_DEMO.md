# Host-welcome first-boot demonstration — pose-animate 0.3 Step 3

**Status:** Demonstration only. No host authentication, host services, application
compilation, network request, or runtime verification is performed by this page.
This is an integration review prototype, **not** the real first-boot UI.

## View it on Windows

Download `skiff-host-welcome-demo` from the `Standalone Skiff preview` GitHub
Actions artifact list, unzip and double-click `host-welcome-demo.html` in Edge
or Chrome. Alternatively, run `npm run build:welcome-demo` as a developer and
open `docs/host-welcome-demo.html` directly. It embeds the production-preview
compiled renderer and presenter, simulator, CSS and controls; no server or npm
is necessary on the review machine. GitHub Pages is intentionally disabled.

## What the demonstration represents

The actual installation starts at the **console**, with a human-readable
progress contract. This browser preview represents a *later, hypothetical*
graphical interface once the required applications exist. The simulated order:

1. Console host welcome and explanation of post-install application preparation.
2. Network and host identity checks.
3. Application source preparation.
4. X11 and greetd compiled/deployed as supervised applications, not built into the base root filesystem.
5. Browser (Firefox/Chromium) and TurboVNC as supervised applications.
6. Readiness verification before graphical handoff.

Stages and lengths in `demo/host-welcome-controller.mjs` are **illustrative
only**, not actual host milestones, performance estimates, or build durations.
The only source of demo state is the in-memory simulator. Reopening the file
starts a fresh simulation.

## Controls and invariants

- Start, Pause/Resume, Reset allow review of the progress presentation.
- Interrupt Connection freezes stage progress and applies Skiff's
  `connection-interrupted` state.
- Restore Connection enters a distinct `recovering` presentation, but resumes
  progress only when the *mock* verification interval finishes.
- Fail Current Step stops progress with an error; Retry restarts the failed
  simulated stage without skipping it.
- A simulated Ready state is impossible until every demo stage finishes.
- Progress never rounds to 100% before the final stage has completed.
- The progress text and event history, not Skiff's expression/color alone,
  communicate status. A running animation is **not** readiness evidence.
- Reduced-motion browser preferences are respected by the presenter.

## Host-welcome owner handoff

Keep the factual progress producer outside `pose-animate` and implement it
under the host-welcome / controller integration ownership. The producer will
need an authenticated, replay-safe and durable source of records for:

- installation/session identity and monotonic event/step revision;
- stage ID, human-readable description, pending/active/complete/blocked/failed status;
- completed work and estimated work only where evidence supports them;
- retry, network interruption and verification outcomes;
- explicit service readiness and graphical handoff gate;
- resumption after reconnect/reboot without claiming that animation playback is evidence.

Until that producer contract is approved, `WELCOME_STEPS` remains intentionally
simulation-local and **must not** be adopted as a real producer schema. An
application can map its verified factual state to
`presenter.setState('working')`, `presenter.setState('connection-interrupted')`,
`presenter.setState('recovering')`, or `presenter.setState('ready')` as appropriate,
but it must not infer host state from the renderer.

## Boundaries and acceptance

The demo calls `createSkiffPresenter()` from the package's narrow public
`./presenter` entrypoint, using `setState` only when the simulated factual state
changes. It does not access internal SVG squares. Separate labels and a
semantic progress bar expose status and simulated progress. The existing
approved Skiff 0.3 visual baselines remain unchanged.

Automated checks in `tests/host-welcome-demo.test.mjs` cover all-six-step
completion, interruption freeze, explicit recovery, retry, reset, offline
packaging, buttons, and 48-square geometry. A full visual acceptance review in
Windows Edge/Chrome is still required before host-welcome integration.
