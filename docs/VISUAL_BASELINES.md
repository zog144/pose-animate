# Skiff 0.3 — approved visual reference baseline

The five pinned visuals are generated from the 0.2 source at commit `b7eaa88f6035373a1a287e1ffaf9e5fa6c3f3352` and record the user-reviewed compact head, eight gently curled six-square limbs, connected mouth, and chin-touching pondering tip.

`visual/baselines.v1.json` records the SHA-256 of each exact deterministic SVG string: `idle`, `thinking`, `working`, `connection-interrupted`, and `recovering`. Every frame uses blue palette, **static geometry** (`samplePose(pose, 0, false)`), its factual preset face and pulse, and pulse phase `0.25`. Working and recovering deliberately retain the frozen signal highlight; those pixels distinguish them from thinking and other states.

`npm test` regenerates each SVG in memory and compares the digest against this file, then asserts the 48 unique segment IDs, 5.6-unit compact head, one-piece pixel mouth, and pondering foreground overlay. **Never update these hashes automatically when a test fails.** Inspect the difference, get explicit visual approval, and only then update the manifest with new provenance.

Run `node scripts/capture-visuals.mjs` after building to produce deterministic SVG files plus local HTML wrappers in `visual-output/`. Optional `node scripts/capture-visuals.mjs --png` attempts Chromium/Chrome screenshots with a fixed viewport, if installed. PNG captures are **review artifacts**, not byte-for-byte CI gates, because browser rasterization can vary; SVG hashes provide the strict structural regression gate.

The GitHub Actions preview workflow uploads the generated SVG/HTML review artifacts. The standalone HTML playground continues to be built for Windows users. This does **not** enable GitHub Pages or publish a formal package release.
