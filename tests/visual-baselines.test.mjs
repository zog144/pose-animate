import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {semanticPresentation, samplePose, renderSvg} from '../dist/index.js';

const manifest=JSON.parse(readFileSync(new URL('../visual/baselines.v1.json',import.meta.url),'utf8'));
const expectedStates=['idle','thinking','working','connection-interrupted','recovering'];
function capture(state){
 const presentation=semanticPresentation(state,'neutral');
 const pose={...samplePose(presentation.pose,0,false),face:presentation.face};
 return renderSvg({pose,palette:manifest.palette,pulse:presentation.pulse,phase:manifest.phase});
}
test('visual baseline metadata lists all approved static states',()=>{
 assert.equal(manifest.schema,'zog-skiff-visual-baselines-v1');
 assert.deepEqual(Object.keys(manifest.states),expectedStates);
 assert.equal(manifest.palette,'blue');
 assert.equal(manifest.phase,.25);
});
for(const state of expectedStates){
 test(`approved visual SVG: ${state}`,()=>{
  const svg=capture(state);
  const digest=createHash('sha256').update(svg,'utf8').digest('hex');
  assert.equal(digest,manifest.states[state].sha256,`Visual regression for ${state}; review before re-baselining`);
  assert.equal((svg.match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
  assert.match(svg,/width="5.6" height="5.6"/);
  assert.match(svg,/<g id="skiff-mouth"><path/);
  if(state==='thinking'||state==='working'){
   assert.match(svg,/id="skiff-foreground-tip"/);
   assert.match(svg,/<use href="#skiff-limb-4-segment-5"\/>/);
  }
 });
}
