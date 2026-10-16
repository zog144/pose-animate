# pose-animate — 0.3.0-rc.0 release gate

Status: **candidate only; no npm publication, GitHub release, tag, or GitHub Pages**.

## Completed implementation work

- [x] Pure SVG static baselines pinned and tested; 8 limbs x 6 squares, compact head, connected mouth, thinking tip.
- [x] Application-facing semantic presenter, cancellation and completion contracts.
- [x] Two-or-more simultaneous Skiffs use unique runtime SVG IDs; foreground references stay local.
- [x] Reduced-motion and lifecycle teardown covered by automated tests.
- [x] Package is scoped and typed; tarball inventory gate excludes tests, CI, mocks and playgrounds.
- [x] Dual-license metadata prepared to mirror Zog convention; full license texts and attribution/notices included.
- [x] Offline Windows review files remain obtainable through GitHub Actions artifacts; no Pages deployment.

## Must pass before formal release

- [ ] Copyright holder confirms the first-party license declaration and any artwork provenance before license is treated as final legal approval.
- [ ] GitHub Actions build/test/package jobs independently green on the candidate commit.
- [ ] Windows Edge and Chrome acceptance, including a real two-instance SVG page, signed off.
- [ ] Full-source and built package archive inspected against any redistribution/provenance requirements.
- [ ] Project owner authorizes an npm scope/registry, version tag and publication explicitly.
- [ ] Host-welcome real status integration is separately tested. Simulation progress alone is not a success signal.

## Build and local pack (development system)

```sh
npm install --no-audit --no-fund
npm run release:check
npm pack --ignore-scripts
```

The tarball can be installed from its local filename in a separate consumer; no npm registry publication is performed. `private: true` prevents accidental publication. The package does not contain the offline demonstration: that is delivered separately through GitHub Actions.
