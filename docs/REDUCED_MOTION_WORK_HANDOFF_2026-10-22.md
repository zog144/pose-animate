# pose-animate 0.3 — reduced-motion Windows acceptance handoff
Date: 2026-10-22
Implementation source candidate: `a1ec04587ec2a6d2707f54d57b9e6d88ce31aea1` (`unstable`)
Owner for next check: pose-animate Work / Windows Edge and Chrome
Status: **acceptance OPEN; publication disabled**

## What changed

The reduced-motion implementation no longer freezes the opening frame or
immediately completes at `ready`. The low-level renderer uses a single
cancellable 200-ms timeout per active reduced-motion sequence, preserving
each semantic stage's configured duration. Exact stage boundaries are also
rendered, even between fixed-step boundaries. The mode displays stable
pose changes without continuous interpolation, limb sway, or light pulses.

The presenter's `playSequence` now observes real renderer stage changes and
completion. Its public API includes `pause()`, `resume()`, and
`getPlayback()`. Pausing cancels the timer and holds elapsed time; resuming
reanchors the clock. Superseding, setting a factual state, stopping and
destroying settle pending promises and clean up scheduling. Multiple Skiff
instances have separate state, timers and SVG ID namespaces.

## Source and review artifacts

- Exact committed source:
  `https://github.com/zog144/pose-animate/commit/a1ec04587ec2a6d2707f54d57b9e6d88ce31aea1`.
- Generated Windows artifact of record: download the latest
  `skiff-standalone` artifact from the **Standalone Skiff preview** workflow
  associated with that commit. The artifact contains `docs/index.html`
  compiled from the exact source and the updated playground.
- An accompanying offline HTML review file was also generated locally for
  manual preliminary Chromium validation. Treat it as a **behavioral review
  aid**, not byte-identical evidence of the committed build.

## Required Edge and Chrome checks on Windows

1. In both Edge and Chrome, open the exact standalone artifact locally
   (without an HTTP server).
2. With the OS `prefers-reduced-motion: reduce` setting, select
   `connection-recovery` and Play. Verify the four states
   `working → connection-interrupted → recovering → ready` appear in
   that order, retaining the intended total duration (5,800 ms excluding
   manual pauses).
3. Pause during `connection-interrupted`; confirm timeline and SVG hold
   indefinitely and Resume continues from that position.
4. Repeat with the **Reduced motion (5 FPS)** checkbox selected explicitly
   while the OS preference is normal.
5. Confirm no smooth interpolation, decorative sway, or traveling pulses in
   reduced mode. Observe discrete updates around every 200 ms and at exact
   semantic stage transitions.
6. Start the second Skiff and pause, resume or destroy it without affecting
   the first. Verify no active scheduled work survives destruction.
7. Supersede an active sequence using a manual factual state. Verify a single
   cancellation result and no false completion event.
8. Check normal-motion mode remains functional and record browser versions,
   evidence screenshots/logs, any console exceptions, and CPU impact.

## Current evidence and limitations

The code contains fake-clock regression tests for progression, stage order,
timing, pause/resume, cancellation, completion and two concurrent instances.
A separate locally assembled offline page was exercised in headless Linux
Chromium under both emulated OS reduced-motion and an explicit checkbox:
both passed scripted connection-recovery and cleanup checks. That result is
preliminary; it is **not** the exact artifact and is not Windows Edge/Chrome
acceptance.

GitHub Actions green-run evidence on the candidate remains to be checked.
Do not close this gate without recording those findings.

## Publication guard

Keep `package.json` private; no npm publication, version tag, GitHub Release
or GitHub Pages activation. These remain separate decisions requiring explicit
authorization.

## Visual FPS correction after user acceptance feedback

The earlier candidate's static per-stage shapes produced only about four
visibly different poses across 7.3 seconds despite a nominal 200-ms timer.
A new `sampleReducedPose` returns visibly different, deterministic limb
shapes at consecutive 200-ms samples *inside* each semantic stage, retaining
the original stage boundaries and no smooth interpolation. Verify rendered
frame differences in both Edge and Chrome—not just timer executions or
changes in labels. Preserve the approved pondering chin-contacting limb.
The exact corrected source is the revision containing this documentation
change. The prior pinned `a1ec0458` revision is superseded.
