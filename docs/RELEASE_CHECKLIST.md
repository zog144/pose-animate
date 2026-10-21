# pose-animate — 0.3.0-rc.0 release gate checkpoint
Date: 2026-10-16
Source candidate: `4227ab2fe3ad0c417a4d47ce0d889f99c4c0d3d4` on `unstable`
Status: **integration-ready candidate; release/publication not authorized**

The project owner approved advancing the release gates and requested an updated
handoff to the already-running `host-welcome` implementation. This is an
approval of the development milestone, **not** an assertion of tests that have
not been independently witnessed.

## Completed or accepted

- [x] Character appearance and expressive animations accepted by the project
  owner in the Windows offline review iterations.
- [x] Five deterministic SVG snapshots pinned, with 48-segment geometry,
  compact head, joined mouth and corrected thinking tip.
- [x] Narrow, typed `@zog/pose-animate/presenter` consumer API with semantic
  state, mood, completion/cancellation events and teardown.
- [x] Multi-instance SVG ID isolation and lifecycle regression coverage.
- [x] Local package inventory and separate consumer installation tested during
  Step 4; no npm release performed.
- [x] Distribution licensing texts and notices prepared using the wider Zog
  `BSD-3-Clause OR GPL-3.0-only` convention.
- [x] Simulated host-welcome first-boot interface delivered and reviewed,
  **without claiming real host integration or verified installation progress**.
- [x] Owner approved continuing toward gate closure on 2026-10-16 and confirmed
  that earlier pose-animate sharing with host-welcome achieved some integration.

## Independently verifiable evidence still required

- [ ] Successful GitHub Actions **Check** and **Standalone Skiff preview** runs
  against this checkpoint revision, including Linux and Windows build/package
  checks. The available GitHub status integration returned no check statuses
  and no eligible workflow runs for candidate `4227ab2fe3ad0c417a4d47ce0d889f99c4c0d3d4`; this is
  **unknown**, not a pass or a fail.
- [ ] Record Windows Edge and Chrome versions, execution of the two-instance
  foreground-tip test, reduced-motion test and resource/cleanup review. The
  project owner approved the visuals, but that does not establish each separate
  browser test.
- [ ] Final first-party copyright ownership and artwork-provenance signoff for
  the published dual-license grant. Prepared files are not independent legal
  proof or a source-by-source licensing review.
- [ ] Verify the exact committed source and packed archive for redistributable
  content, and record that result with a checksum.
- [ ] Real `host-welcome` status-producer integration acceptance, independently
  authenticated and correlated with real host state.

## Separate publication decision (not implied by gate approval)

- [ ] Project owner explicitly specifies registry/scope, release version,
  signed tag, npm publication and GitHub Pages visibility. None are done here.

The package remains `0.3.0-rc.0` with `"private": true`. Do not remove
this guard, publish a release, tag it, or enable GitHub Pages based solely on
this checkpoint. Continue using the `unstable` branch and downloaded offline
HTML for integration review. See `docs/HOST_WELCOME_INTEGRATION_HANDOFF_2026-10-16.md`.

## Verification commands (development host)

```sh
npm ci --no-audit --no-fund
npm run release:check
npm pack --ignore-scripts
```

The Check workflow runs tests and package inventory on both `ubuntu-latest`
and `windows-latest`. Windows CI executes Node, **not** an interactive Edge or
Chrome visual-acceptance session. The Standalone workflow creates unpublished
offline demos and package artifacts; it does not publish them.

## Verification follow-up — 2026-10-21

The earlier CI-unknown statement above is historical. Candidate `4227ab2` has a
successful Linux Check run (38943576249) and Standalone run (38943576271).
Checkpoint `ec5e8986` added the Windows matrix: its Linux tests/package passed,
but Windows package inventory failed after tests passed (38967433272).
The package checker now invokes npm's JavaScript entrypoint through Node instead
of attempting to execute the Windows command shim. The new candidate also adds
locked development dependencies, installation testing outside the checkout,
and required real Edge/Chrome headless checks on the Windows runner.

Use the exact commit's Actions results, not the historical revision above, when
assessing these changes. Automated browser checks report versions and exercise
reduced motion, instance isolation, offline demos and teardown. Human Windows
visual review, laptop resource/power review, final artwork/ownership signoff,
real host integration and publication decisions remain separate open gates.
