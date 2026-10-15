# pose-animate

Framework-independent, deterministic SVG animation engine for Zog. **Skiff** is the first character.

## First implementation (0.1)

- Canonical square head; eight independent limbs, each with six addressable squares (48 total).
- Seven named poses, deterministic interpolation and 12-step-per-second idle sampling.
- Six discrete palettes, face expressions and optional travelling illumination pulses.
- Pure `renderSvg(frame)`, and `createSkiff(element)` browser adapter with reduced-motion support.
- Playground, node tests and GitHub Actions.

**Visual approval is pending.** This is a hand-authored geometry interpretation, *not* a pixel-traced reproduction of the approved variation #3. Confirm its appearance before production integration.

## Run

```sh
npm install
npm test
python3 -m http.server 8000
# open http://localhost:8000/playground/
```

The playground imports `dist/index.js`, created by the build. The renderer has no runtime dependencies.

## Example

```ts
import { createSkiff } from '@zog/pose-animate';
const skiff = createSkiff(document.querySelector('#skiff')!, {palette:'blue',reducedMotion:'auto'});
skiff.setPose('greet');
skiff.setExpression('happy');
skiff.pulse('outward');
skiff.destroy();
```

Next: visual calibration to canonical art, animation timeline and transitions in the browser adapter, browser snapshot tests and semantic state integration. The 0.1 browser adapter currently switches poses immediately; the pure `interpolate` function is available to future timelines.
