import test from 'node:test';
import assert from 'node:assert/strict';
import {poses,palettes,validatePose,interpolate,samplePose,renderSvg,SKIFF_HEAD_SCALE,sampleTransition,createSkiff} from '../dist/index.js';
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


test('wave, listen, ponder, and celebrate have distinct, reproducible animation',()=>{
 for(const name of ['wave','listen','ponder','celebrate']){
  const begin=samplePose(name,0),later=samplePose(name,.25);
  assert.notDeepEqual(begin,later,name+' should visibly move');
  assert.deepEqual(later,samplePose(name,.25),name+' must be deterministic');
  assert.deepEqual(samplePose(name,.25,false),poses[name],name+' should honor reduced motion');
  assert.equal(later.limbs.flat().length,48);
  validatePose(later);
 }
 const wave=samplePose('wave',.25),idle=samplePose('idle',.25);
 assert.ok(Math.abs(wave.limbs[1][5][0]-poses.wave.limbs[1][5][0])>1);
 assert.ok(Math.abs(idle.limbs[1][5][0]-poses.idle.limbs[1][5][0])<.2);
});
test('eased transition is clamped, deterministic and preserves 48 identities',()=>{
 assert.deepEqual(sampleTransition(poses.idle,poses.wave,-.1),poses.idle);
 assert.deepEqual(sampleTransition(poses.idle,poses.wave,2),poses.wave);
 const between=sampleTransition(poses.idle,poses.wave,.25);
 validatePose(between);assert.equal(between.limbs.flat().length,48);
 assert.deepEqual(between,sampleTransition(poses.idle,poses.wave,.25));
});
test('browser adapter supports interrupted transitions and reduced motion',()=>{
 let raf=0;const callbacks=new Map();const canceled=[];
 const win={matchMedia(){return {matches:false}},requestAnimationFrame(fn){callbacks.set(++raf,fn);return raf},cancelAnimationFrame(id){callbacks.delete(id);canceled.push(id)}};
 const container={innerHTML:'',ownerDocument:{defaultView:win}};
 const skiff=createSkiff(container,{reducedMotion:false});
 const before=container.innerHTML;
 assert.equal(callbacks.size,1);
 skiff.transitionTo('wave',{duration:300});assert.equal(container.innerHTML,before);
 skiff.renderAt(.15);assert.notEqual(container.innerHTML,before);
 const halfway=container.innerHTML;
 skiff.transitionTo('ponder',{duration:300});assert.equal(container.innerHTML,halfway);
 skiff.renderAt(.45);assert.match(container.innerHTML,/id="skiff-head"/);
 skiff.setMotionEnabled(false);const paused=container.innerHTML;
 skiff.renderAt(5);assert.equal(container.innerHTML,paused);
 skiff.setMotionEnabled(true);skiff.replay();skiff.destroy();
 assert.equal(container.innerHTML,'');assert.equal(callbacks.size,0);
 assert.ok(canceled.length>=1);
 const reducedContainer={innerHTML:'',ownerDocument:{defaultView:win}};
 const still=createSkiff(reducedContainer,{reducedMotion:true});
 const requests=raf;still.transitionTo('wave');still.renderAt(1);
 assert.equal(raf,requests);
 assert.equal(reducedContainer.innerHTML,renderSvg({pose:poses.wave,palette:'blue',pulse:'none',phase:1}));
 still.destroy();
});
