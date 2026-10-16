import test from 'node:test';
import assert from 'node:assert/strict';
import {createSkiffPresenter} from '../dist/presenter.js';

function actor(reducedMotion=false){
 let serial=0;const queued=new Map();let cancelled=0;
 const win={matchMedia(){return {matches:reducedMotion}},requestAnimationFrame(fn){queued.set(++serial,fn);return serial},cancelAnimationFrame(id){queued.delete(id);cancelled++}};
 const container={innerHTML:'',ownerDocument:{defaultView:win}};
 return {container,queued,win,get cancelled(){return cancelled},step(ms){const next=[...queued.values()];queued.clear();next.forEach(fn=>fn(ms))}};
}

test('factual state, critical mood and no low-level commands escape the presenter',()=>{
 const env=actor();const presenter=createSkiffPresenter(env.container,{reducedMotion:false});
 const events=[];const off=presenter.subscribe(ev=>events.push(ev));
 assert.equal(presenter.getState(),null);
 presenter.setState('warning');presenter.setMood('excited');
 assert.equal(presenter.getState(),'warning');
 assert.match(env.container.innerHTML,/id="skiff-mouth"/);
 assert.equal(events[0].type,'state-changed');
 assert.ok(!('setPose' in presenter));assert.ok(!('renderAt' in presenter));
 assert.throws(()=>presenter.setState('no-such-state'));
 assert.equal(presenter.getState(),'warning');
 off();presenter.destroy();assert.equal(env.queued.size,0);
 assert.throws(()=>presenter.setState('ready'),/destroyed/);
 presenter.destroy();
});

test('sequence completion resolves exactly once after deterministic animation time',async()=>{
 const env=actor();const presenter=createSkiffPresenter(env.container,{reducedMotion:false});
 const events=[];presenter.subscribe(ev=>events.push(ev));
 const done=presenter.playSequence('greeting');
 env.step(0);env.step(4010);env.step(6000);
 assert.deepEqual(await done,{name:'greeting',status:'completed'});
 assert.equal(events.filter(ev=>ev.type==='sequence-completed').length,1);
 assert.equal(env.queued.size,1,'the underlying character loop remains active');
 presenter.destroy();assert.equal(env.queued.size,0);
});

test('replacement, explicit state change, stop and destroy all settle pending promises',async()=>{
 const env=actor();const presenter=createSkiffPresenter(env.container,{reducedMotion:false});
 const events=[];presenter.subscribe(ev=>events.push(ev));
 const a=presenter.playSequence('request-flow');
 const b=presenter.playSequence('connection-recovery');
 assert.deepEqual(await a,{name:'request-flow',status:'cancelled',reason:'superseded'});
 presenter.setState('connection-interrupted');
 assert.deepEqual(await b,{name:'connection-recovery',status:'cancelled',reason:'state-change'});
 assert.equal(presenter.getState(),'connection-interrupted');
 const c=presenter.playSequence('greeting');presenter.stop();
 assert.deepEqual(await c,{name:'greeting',status:'cancelled',reason:'stopped'});
 const d=presenter.playSequence('request-flow');presenter.destroy();
 assert.deepEqual(await d,{name:'request-flow',status:'cancelled',reason:'destroyed'});
 assert.equal(events.filter(e=>e.type==='sequence-cancelled').length,4);
 assert.equal(env.queued.size,0);
});

test('reduced-motion sequences end instantly in the final factual state with no RAF',async()=>{
 const env=actor(true);const presenter=createSkiffPresenter(env.container,{reducedMotion:'auto'});
 const events=[];presenter.subscribe(ev=>events.push(ev));
 const outcome=await presenter.playSequence('connection-recovery');
 assert.deepEqual(outcome,{name:'connection-recovery',status:'completed'});
 assert.equal(presenter.getState(),'ready');
 assert.equal(env.queued.size,0);
 assert.deepEqual(events.map(e=>e.type),['state-changed','sequence-completed']);
 presenter.destroy();
});

test('invalid sequence and mood never corrupt active playback; callback faults stay isolated',async()=>{
 const env=actor();const p=createSkiffPresenter(env.container,{reducedMotion:false});
 const promise=p.playSequence('greeting');
 p.subscribe(()=>{throw Error('consumer bug')});
 assert.throws(()=>p.playSequence('invalid'),/Unknown Skiff sequence/);
 assert.throws(()=>p.setMood('nope'),/Unknown Skiff mood/);
 assert.equal(p.getState(),'idle');
 p.stop();assert.equal((await promise).status,'cancelled');p.destroy();
});
