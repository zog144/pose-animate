# Browser compatibility — pose-animate 0.3 release candidate

The runtime renders standard SVG `<rect>`, `<g>`, `<path>` and `<use>` elements, with ordinary JavaScript DOM APIs. The current target is modern Chromium-based desktop browsers, including Microsoft Edge and Chrome on Windows. Browser-side requirements include ES2022 support, `requestAnimationFrame`, `matchMedia` and `prefers-reduced-motion`.

## Evidence and limits

- Node 22 local tests verify pure rendering, timeline determinism, presenter completion/cancellation, reduced-motion behavior, SVG instance namespace isolation and teardown.
- Chromium headless on Linux is used for the optional manual/CI browser smoke test; this is *not* evidence of a Windows Edge run.
- Firefox, Safari, mobile browsers and older browsers are not yet acceptance-verified. Do not claim cross-browser support from tests that do not execute them.
- An offline HTML demo uses a self-contained `<script>`; the runtime npm package exposes ESM only. Neither requires a backend service.
- `prefers-reduced-motion` is respected; application-owned status text remains the accessible source of truth.

## Multiple SVG instances

`createSkiff` automatically allocates a unique per-document SVG ID namespace and rewrites internal `<use>` references accordingly. The pure `renderSvg(frame)` function remains deterministic and its canonical IDs are unchanged for baseline capture. Consumer code should not rely on the live DOM's exact internal IDs. The public presenter exposes only semantic controls.

## Manual acceptance before release

On current Windows Edge and Chrome: load the offline playground and the host-welcome demo, run two Skiffs on one page, inspect the thinking tentacle overlay, pause/resume and interrupt a scenario, toggle reduced motion, and verify all animations cease on cleanup. Check laptop power/CPU usage with several simultaneous instances. Record versions and results before claiming formal support.

## Reproducible browser acceptance

Run `npm ci`, `npm test`, then `npm run test:browser` on Windows. Both installed
Microsoft Edge and Google Chrome are required; a missing channel fails the check.
The test reports actual browser versions, checks three live DOM instances,
foreground SVG references and geometry, pause/resume, interruption, OS reduced
motion at creation, and zero queued/executed animation callbacks after teardown.
Both generated demos must also load through `file://` without page errors.
These automated headless checks do not replace human visual or laptop power review.
Reduced motion is sampled at creation: recreate the presenter after changing the
OS setting. There is no live media-query listener in this candidate.

For supplemental Linux Chromium checks, install a compatible Chromium and set
`POSE_CHROMIUM_PATH` to its executable. This does not count as Windows acceptance.
Playwright Core is pinned in the lockfile and never included in the runtime package.
