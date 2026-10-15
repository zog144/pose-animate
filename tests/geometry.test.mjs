import test from 'node:test';
import assert from 'node:assert/strict';
import {poses,palettes,validatePose,interpolate,samplePose,renderSvg,SKIFF_HEAD_SCALE} from '../dist/index.js';
test('every named pose retains exactly 48 limb squares',()=>{
 for(const pose of Object.values(poses)){validatePose(pose);assert.equal(pose.limbs.length,8);assert.equal(pose.limbs.flat().length,48);}
});
test('interpolation endpoints and midpoints remain valid',()=>{
 assert.deepEqual(interpolate(poses.idle,poses.wave,0),poses.idle);
 assert.deepEqual(interpolate(poses.idle,poses.wave,1),poses.wave);
 validatePose(interpolate(poses.idle,poses.wave,.5));
});
test('sampling and SVG output are deterministic',()=>{
 assert.deepEqual(samplePose('greet',1.25),samplePose('greet',1.25));
 const frame={pose:samplePose('greet',1.25),palette:'blue',pulse:'outward',phase:1.25};
 assert.equal(renderSvg(frame),renderSvg(frame));
 assert.equal((renderSvg(frame).match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
});
test('every palette renders',()=>{
 for(const palette of Object.keys(palettes))assert.match(renderSvg({pose:poses.idle,palette,pulse:'none',phase:0}),/^<svg /);
});
test('invalid poses fail closed',()=>{
 assert.throws(()=>validatePose({...poses.idle,limbs:[]}));
 assert.throws(()=>validatePose({...poses.idle,head:[NaN,0]}));
});

test('smaller head is centred without losing square segments or changing tentacle tips',()=>{
 assert.equal(SKIFF_HEAD_SCALE,.7);
 const svg=renderSvg({pose:poses.idle,palette:'blue',pulse:'none',phase:0});
 const head=svg.match(/<g id="skiff-head"><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/);
 assert.ok(head);
 assert.deepEqual(head.slice(1).map(Number),[1.2,1.2,5.6,5.6]);
 assert.equal((svg.match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
 const tip=svg.match(/<g id="skiff-limb-0-segment-5"><rect x="([^"]+)" y="([^"]+)"/);
 assert.deepEqual(tip?.slice(1).map(Number),[-6,-3]);
});
