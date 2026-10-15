# pose-animate

Framework-independent, deterministic SVG animation engine for Zog. **Skiff** is the first character.

## First implementation (0.1)

Visual-review adjustment: Skiff's head and face features are **30% smaller in both dimensions**, centred on the previous head position. The 48 limb squares retain their size; proximal anchors shift to meet the smaller head and distal tips are unchanged. Existing poses are intentionally unchanged while more meaningful animation is planned. GitHub Pages remains disabled.

- Square head; eight independent limbs, each with six addressable squares (48 total).
- Seven named poses, deterministic interpolation and 12-step-per-second idle sampling.
- Six discrete palettes, face expressions and travelling illumination pulses.
- Pure `renderSvg(frame)`, and `createSkiff(element)` browser adapter with reduced-motion support.
- Browser playground, offline self-contained HTML packaging, node tests, and GitHub Actions.

**Visual approval is pending.** This is a hand-authored interpretation, not an exact pixel-traced reproduction of approved Skiff variation #3. Do not treat it as final character artwork yet.

## Review Skiff without installing npm

Download the generated **skiff-standalone** artifact from the latest successful **Standalone Skiff preview** run under the repository's **Actions** tab. Unzip it and double-click `index.html` in Microsoft Edge or Chrome on Windows. It contains its SVG renderer, CSS, animations and controls in one HTML file. No local server, installation, or network connection is required. The artifact is built on GitHub-hosted Linux runners.

The generated page can also be hosted on GitHub Pages when Pages is configured for this repository; Pages activation has not been assumed.

## Developers

```sh
npm install
npm test
# Generates docs/index.html for double-click offline use
```

For the module-based source playground, build first, start a local server, and open `/playground/`. That server is required only by the module-based development preview, **not** by the standalone HTML.

## API

```ts
import { createSkiff } from '@zog/pose-animate';
const skiff = createSkiff(document.querySelector('#skiff')!, {palette:'blue',reducedMotion:'auto'});
skiff.setPose('greet');
skiff.setExpression('happy');
skiff.pulse('outward');
skiff.destroy();
```

Next: compare Skiff with canonical art, refine geometry, add timed pose transitions and browser visual-regression tests. The 0.1 browser adapter switches poses immediately, although the pure `interpolate` function is available.
