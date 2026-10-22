import test from 'node:test';
import assert from 'node:assert/strict';
import {poses,sampleSequence,skiffSequences,sequenceDuration,semanticPresentation,validatePose,createSkiff,sampleReducedPose,SKIFF_REDUCED_FPS,renderSvg} from '../dist/index.js';

test('declarative scenarios are ordered, finite and deterministic',()=>{
 for(const name of Object.keys(skiffSequences)){
  const steps=skiffSequences[name],duration=sequenceDuration(name);
  assert.ok(duration>0);assert.equal(duration,steps.reduce((a,s)=>a+s.durationMs,0));
  let elapsed=0;
  for(let index=0;index<steps.length;index++){
   const frame=sampleSequence(name,elapsed);
   assert.equal(frame.state,steps[index].state);
   assert.equal(frame.stepIndex,index);
   validatePose(frame.pose);
   assert.equal(frame.pose.limbs.flat().length,48);
   assert.deepEqual(frame,sampleSequence(name,elapsed));
   elapsed+=steps[index].durationMs;
  }
  const end=sampleSequence(name,duration);
  assert.equal(end.stepIndex,steps.length-1);
  assert.equal(end.state,steps.at(-1).state);
  assert.equal(end.finished,true);
  assert.deepEqual(end,sampleSequence(name,duration+100_000));
 }
});
test('disconnected Skiff droops and restores light on recovery',()=>{
 const scene=skiffSequences['connection-recovery'];
 assert.deepEqual(scene.map(s=>s.state),['working','connection-interrupted','recovering','ready']);
 const interrupted=sampleSequence('connection-recovery',1900);
 assert.equal(interrupted.state,'connection-interrupted');
 assert.equal(interrupted.pose.face,'concerned');
 assert.equal(interrupted.pulse,'none');
 assert.equal(interrupted.pose.foregroundTipLimb,undefined);
 const recovered=sampleSequence('connection-recovery',4000);
 assert.equal(recovered.state,'recovering');
 assert.equal(recovered.pulse,'outward');
 assert.notDeepEqual(recovered.pose.limbs,interrupted.pose.limbs);
 assert.equal(semanticPresentation('thinking').pose,'ponder');
});
test('reduced-motion scenarios retain informative static stages',()=>{
 let elapsed=0;
 for(const step of skiffSequences['request-flow']){
  const f=sampleSequence('request-flow',elapsed+100,false);
  assert.equal(f.pulse,'none');
  assert.equal(f.state,step.state);
  assert.deepEqual(f.pose.limbs,poses[semanticPresentation(step.state).pose].limbs);
  elapsed+=step.durationMs;
 }
 assert.throws(()=>sequenceDuration('unknown'));
 assert.throws(()=>sampleSequence('unknown',1));
});
test('playback can pause, seek, resume, replay and exit without orphaned animation',()=>{
 let id=0;const handles=new Map();
 const win={matchMedia(){return {matches:false}},requestAnimationFrame(fn){handles.set(++id,fn);return id},cancelAnimationFrame(n){handles.delete(n)}};
 const container={innerHTML:'',ownerDocument:{defaultView:win}};
 const skiff=createSkiff(container,{reducedMotion:false});
 skiff.play('connection-recovery');
 assert.equal(skiff.getPlayback().elapsedMs,0);
 skiff.renderAt(1.5);
 assert.equal(skiff.getPlayback().state,'connection-interrupted');
 skiff.pause();skiff.renderAt(5);
 assert.equal(skiff.getPlayback().elapsedMs,1500);
 skiff.seekSequence(4000);
 assert.equal(skiff.getPlayback().state,'recovering');
 assert.equal(skiff.getPlayback().paused,true);
 skiff.resume();skiff.renderAt(6);
 assert.equal(Math.round(skiff.getPlayback().elapsedMs),5000);
 assert.throws(()=>skiff.seekSequence(NaN));
 skiff.setState('thinking');
 assert.equal(skiff.getPlayback(),null);
 assert.equal(skiff.getState(),'thinking');
 skiff.play('request-flow');skiff.replay();
 assert.equal(skiff.getPlayback().elapsedMs,0);
 skiff.stopSequence();assert.equal(skiff.getPlayback(),null);
 skiff.destroy();assert.equal(handles.size,0);
});

test('pure reduced sequence has static shapes, all states and exact duration',()=>{
  const name='connection-recovery',steps=skiffSequences[name];
  let t=0;
  for(const step of steps){
    const frame=sampleSequence(name,t+199,false);
    assert.equal(frame.state,step.state);
    assert.equal(frame.pulse,'none');
    assert.deepEqual(frame.pose.limbs,poses[semanticPresentation(step.state).pose].limbs);
    t+=step.durationMs;
  }
  assert.equal(sampleSequence(name,t,false).finished,true);
  assert.equal(t,sequenceDuration(name));
});


test('reduced 5 FPS means distinct visible frames, not identical redraws',()=>{
  assert.equal(SKIFF_REDUCED_FPS,5);
  for(const name of ['request-flow','connection-recovery','greeting']){
    const steps=skiffSequences[name];
    let start=0,rendered=0;
    for(const step of steps){
      let prior=null;
      // Compare only foreground geometry; constant pulse/phase rules out
      // decorative illumination as a false positive for visible movement.
      for(let ms=0;ms<step.durationMs;ms+=200){
        const scene=sampleSequence(name,start+ms,false);
        const svg=renderSvg({pose:scene.pose,palette:'blue',pulse:'none',phase:0});
        assert.equal(scene.state,step.state);
        if(prior!==null)assert.notEqual(svg,prior,
          name+' must visibly change every 200ms during '+step.state+' at '+ms);
        assert.equal(scene.pose.limbs.flat().length,48);
        prior=svg;rendered++;
      }
      start+=step.durationMs;
    }
    assert.equal(start,sequenceDuration(name));
    assert.ok(rendered>=Math.floor(start/200),name+' sampled all 5FPS frames');
  }
});
test('reduced keyframe variations remain deterministic with 48 distinct squares and stable thinking chin',()=>{
  const initial=poses.ponder;
  assert.equal(sampleReducedPose('ponder',0).foregroundTipLimb,4);
  const hashes=new Set();
  for(let n=0;n<15;n++){
    const pose=sampleReducedPose('ponder',n);
    validatePose(pose);
    assert.equal(pose.limbs.flat().length,48);
    assert.deepEqual(pose.limbs[4],initial.limbs[4],
      'approved chin-contacting limb is not moved in reduced mode');
    assert.deepEqual(pose,sampleReducedPose('ponder',n));
    hashes.add(renderSvg({pose,palette:'blue',pulse:'none',phase:0}));
  }
  assert.ok(hashes.size>=5,'five intentional stepped poses');
  assert.deepEqual(sampleReducedPose('ponder',0),initial);
});
