import test from 'node:test';
import assert from 'node:assert/strict';
import {poses,sampleSequence,skiffSequences,sequenceDuration,semanticPresentation,validatePose,createSkiff} from '../dist/index.js';

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
