import test from 'node:test';
import assert from 'node:assert/strict';
import {poses,palettes,validatePose,interpolate,samplePose,renderSvg,SKIFF_HEAD_SCALE,SKIFF_LIMB_CURL} from '../dist/index.js';
test('all named poses preserve canonical Skiff topology',()=>{
  for(const pose of Object.values(poses)) {validatePose(pose);assert.equal(pose.limbs.length,8);assert.equal(pose.limbs.flat().length,48);}
});
test('interpolation preserves endpoints and finite geometry',()=>{
  assert.deepEqual(interpolate(poses.idle,poses.wave,0),poses.idle);
  assert.deepEqual(interpolate(poses.idle,poses.wave,1),poses.wave);
  validatePose(interpolate(poses.idle,poses.wave,.5));
});
test('deterministic frame and SVG across calls',()=>{
  assert.deepEqual(samplePose('greet',1.25),samplePose('greet',1.25));
  const frame={pose:samplePose('greet',1.25),palette:'blue',pulse:'outward',phase:1.25};
  assert.equal(renderSvg(frame),renderSvg(frame));
  assert.equal((renderSvg(frame).match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
});
test('all six palettes produce valid SVG',()=>{
  for(const palette of Object.keys(palettes)) assert.match(renderSvg({pose:poses.idle,palette,pulse:'none',phase:0}),/^<svg /);
});
test('invalid geometry fails closed',()=>{
  assert.throws(()=>validatePose({...poses.idle,limbs:[]}));
  assert.throws(()=>validatePose({...poses.idle,head:[NaN,0]}));
});

test('head remains 30 percent smaller, while curled limbs tuck inward',()=>{
  assert.equal(SKIFF_HEAD_SCALE,0.7);
  const svg=renderSvg({pose:poses.idle,palette:'blue',pulse:'none',phase:0});
  const body=svg.match(/<g id="skiff-head"><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/);
  assert.ok(body);
  assert.deepEqual(body.slice(1).map(Number),[1.2,1.2,5.6,5.6]);
  assert.equal((svg.match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
  const tip=svg.match(/<g id="skiff-limb-0-segment-5"><rect x="([^"]+)" y="([^"]+)"/);
  assert.equal(SKIFF_LIMB_CURL,.14);
  const [tipX,tipY]=tip.slice(1).map(Number);
  assert.ok(tipX>-6 && tipX<-3.5);
  assert.ok(tipY>-3);
});

import {sampleTransition,createSkiff} from '../dist/index.js';

test('wave, listen, ponder, and celebrate have distinct, reproducible animation',()=>{
  for(const name of ['wave','listen','ponder','celebrate']){
    const begin=samplePose(name,0),later=samplePose(name,.25);
    assert.notDeepEqual(begin,later,`${name} should visibly move`);
    assert.deepEqual(later,samplePose(name,.25),`${name} must be deterministic`);
    assert.deepEqual(samplePose(name,.25,false),poses[name],`${name} should honor reduced motion`);
    assert.equal(later.limbs.flat().length,48);
    validatePose(later);
  }
  const wave=samplePose('wave',.25),idle=samplePose('idle',.25);
  assert.ok(Math.abs(wave.limbs[1][5][0]-poses.wave.limbs[1][5][0]) > 1);
  assert.ok(Math.abs(idle.limbs[1][5][0]-poses.idle.limbs[1][5][0]) < .2);
});

test('eased transition is clamped, deterministic and preserves 48 identities',()=>{
  assert.deepEqual(sampleTransition(poses.idle,poses.wave,-.1),poses.idle);
  assert.deepEqual(sampleTransition(poses.idle,poses.wave,2),poses.wave);
  const between=sampleTransition(poses.idle,poses.wave,.25);
  validatePose(between);
  assert.equal(between.limbs.flat().length,48);
  assert.deepEqual(between,sampleTransition(poses.idle,poses.wave,.25));
});

test('browser adapter animates, changes direction mid-transition and respects reduced motion',()=>{
  let raf=0,callbacks=new Map(),canceled=[];
  const win={matchMedia(){return {matches:false}},requestAnimationFrame(fn){callbacks.set(++raf,fn);return raf},cancelAnimationFrame(id){callbacks.delete(id);canceled.push(id)}};
  const container={innerHTML:'',ownerDocument:{defaultView:win}};
  const skiff=createSkiff(container,{reducedMotion:false});
  const before=container.innerHTML;
  assert.equal(callbacks.size,1);
  skiff.transitionTo('wave',{duration:300});
  assert.equal(container.innerHTML,before,'transition begins at prior frame with no snap');
  skiff.renderAt(.15);
  assert.notEqual(container.innerHTML,before);
  const halfway=container.innerHTML;
  skiff.transitionTo('ponder',{duration:300});
  assert.equal(container.innerHTML,halfway,'interruption retains the current visible frame');
  skiff.renderAt(.45);
  assert.match(container.innerHTML,/id="skiff-head"/);
  skiff.setMotionEnabled(false);
  const paused=container.innerHTML;
  skiff.renderAt(5);
  assert.equal(container.innerHTML,paused,'disabled motion stays in static pose');
  skiff.setMotionEnabled(true);
  skiff.replay();
  skiff.destroy();
  assert.equal(container.innerHTML,'');
  assert.equal(callbacks.size,0);
  assert.ok(canceled.length>=1);

  const reducedContainer={innerHTML:'',ownerDocument:{defaultView:win}};
  const still=createSkiff(reducedContainer,{reducedMotion:true});
  const requests=raf;
  still.transitionTo('wave');
  still.renderAt(1);
  assert.equal(raf,requests,'no RAF scheduled when reduced motion requested');
  assert.equal(reducedContainer.innerHTML,renderSvg({pose:poses.wave,palette:'blue',pulse:'none',phase:1}));
  still.destroy();
});

import {semanticPresentation,skiffStates,skiffMoods} from '../dist/index.js';

test('six square joints propagate gesture waves, and companion limbs respond',()=>{
  const time=.25;
  for (const name of ['wave','listen','ponder','celebrate']) {
    const animated=samplePose(name,time);
    const base=poses[name];
    const changed=animated.limbs.map((l,i)=>l.some((point,j)=>Math.hypot(point[0]-base.limbs[i][j][0],point[1]-base.limbs[i][j][1])>.09));
    assert.ok(changed.filter(Boolean).length>=3,name+' moves at least three limbs');
    const first=animated.limbs[1][0],root=base.limbs[1][0];
    const tip=animated.limbs[1][5],tipBase=base.limbs[1][5];
    assert.ok(Math.hypot(first[0]-root[0],first[1]-root[1])<.001,'proximal attachment stable');
    assert.ok(Math.hypot(tip[0]-tipBase[0],tip[1]-tipBase[1])>.01,'tip is articulated');
  }
  const wave=samplePose('wave',.25);
  const first=wave.limbs[1][1][0]-poses.wave.limbs[1][1][0];
  const tip=wave.limbs[1][5][0]-poses.wave.limbs[1][5][0];
  assert.ok(Math.abs(tip)>Math.abs(first)*4,'segment displacement grows along limb');
});

test('facial grammar renders different pixel expressions without enlarging the head',()=>{
  const faceSvg=face=>renderSvg({pose:{...poses.idle,face},palette:'blue',pulse:'none',phase:0});
  for(const face of ['open','happy','blink','concerned','focused','sleeping','surprised']){
    const svg=faceSvg(face);
    assert.match(svg,/width="5.6" height="5.6"/);
    assert.match(svg,/id="skiff-mouth"/);
    assert.equal((svg.match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
  }
  assert.notEqual(faceSvg('focused'),faceSvg('open'));
  assert.notEqual(faceSvg('concerned'),faceSvg('happy'));
  assert.notEqual(faceSvg('surprised'),faceSvg('open'));
  assert.notEqual(faceSvg('sleeping'),faceSvg('happy'));
});

test('semantic state is complete; critical warnings cannot be visually contradicted by mood',()=>{
  assert.equal(skiffStates.length,11);
  assert.equal(skiffMoods.length,8);
  for(const state of skiffStates){
    const p=semanticPresentation(state,'pleased');
    assert.ok(Object.hasOwn(poses,p.pose));
    assert.ok(['none','inward','outward'].includes(p.pulse));
  }
  assert.equal(semanticPresentation('thinking').pose,'ponder');
  assert.equal(semanticPresentation('receiving').pulse,'inward');
  assert.equal(semanticPresentation('output-ready').pulse,'outward');
  assert.equal(semanticPresentation('warning','excited').face,'concerned');
  assert.equal(semanticPresentation('error','pleased').face,'concerned');
  assert.equal(semanticPresentation('sleeping','excited').face,'sleeping');
  assert.equal(semanticPresentation('ready','pleased').face,'happy');
  assert.throws(()=>semanticPresentation('not-a-state'));
  assert.throws(()=>semanticPresentation('ready','not-a-mood'));
});

test('semantic adapter precedence, manual exit, and reduced motion preserve safety',()=>{
  let calls=0;
  const win={matchMedia(){return {matches:true}},requestAnimationFrame(){calls++;return calls},cancelAnimationFrame(){}};
  const container={innerHTML:'',ownerDocument:{defaultView:win}};
  const skiff=createSkiff(container,{reducedMotion:true});
  assert.equal(skiff.getState(),null);
  skiff.setState('warning');
  assert.equal(skiff.getState(),'warning');
  const warning=container.innerHTML;
  skiff.setMood('excited');
  skiff.setExpression('happy');
  assert.equal(container.innerHTML,warning,'critical warning cannot become happy');
  skiff.setState('receiving');
  assert.equal(skiff.getState(),'receiving');
  assert.equal(container.innerHTML,renderSvg({pose:{...poses.listen,face:'surprised'},palette:'blue',pulse:'none',phase:0}));
  skiff.setMood('pleased');
  assert.notEqual(container.innerHTML,warning);
  skiff.setPose('idle');
  assert.equal(skiff.getState(),null);
  assert.equal(container.innerHTML,renderSvg({pose:poses.idle,palette:'blue',pulse:'none',phase:0}));
  assert.throws(()=>skiff.setState('invalid'));
  assert.throws(()=>skiff.setMood('invalid'));
  assert.equal(calls,0);
  skiff.destroy();
});
test('all poses retain eight six-square limbs with tips curled inward',()=>{
  for(const p of Object.values(poses)){
    validatePose(p);assert.equal(p.limbs.length,8);
    assert.equal(p.limbs.flat().length,48);
  }
  assert.ok(poses.idle.limbs[1][5][0]<13);
  assert.ok(poses.idle.limbs[7][5][0]>-6);
});
test('mouth expressions use one connected path rather than separate points',()=>{
  for(const face of ['open','happy','blink','concerned','focused','sleeping','surprised']){
    const svg=renderSvg({pose:{...poses.idle,face},palette:'blue',pulse:'none',phase:0});
    const mouth=svg.match(/<g id="skiff-mouth">([\s\S]*?)<\/g>/)?.[1];
    assert.ok(mouth);
    assert.equal((mouth.match(/<path /g)||[]).length,1);
    assert.doesNotMatch(mouth,/<rect /);
    assert.equal((svg.match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
  }
});
test('thinking tentacle tips are connected in front of the face without extra squares',()=>{
  const tip=poses.ponder.limbs[4][5];
  assert.equal(poses.ponder.foregroundTipLimb,4);
  assert.ok(tip[0]>=1.2&&tip[0]<=6.8);
  assert.ok(tip[1]>=1.2&&tip[1]<=6.8);
  const svg=renderSvg({pose:poses.ponder,palette:'blue',pulse:'none',phase:0});
  assert.ok(svg.indexOf('id="skiff-foreground-tip"')>svg.indexOf('id="skiff-mouth"'));
  for(let j=3;j<=5;j++)assert.ok(svg.includes('<use href="#skiff-limb-4-segment-'+j+'"/>'));
  assert.equal((svg.match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
  assert.ok(renderSvg({pose:samplePose('ponder',1.25),palette:'blue',pulse:'none',phase:1.25}).includes('skiff-foreground-tip'));
  assert.equal(semanticPresentation('thinking').pose,'ponder');
  assert.throws(()=>validatePose({...poses.ponder,foregroundTipLimb:9}));
});
