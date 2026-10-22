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
 assert.match(env.container.innerHTML,/id="skiff-\d+-mouth"/);
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


function steppedHarness(systemReduced=true){
  let now=0,next=0;
  const timers=new Map(),raf=new Map(),cancelled=[];
  const win={
    performance:{now(){return now}},
    matchMedia(){return {matches:systemReduced}},
    requestAnimationFrame(fn){raf.set(++next,fn);return next;},
    cancelAnimationFrame(id){raf.delete(id);cancelled.push(id);},
    setTimeout(fn,delay){const id=++next;timers.set(id,{due:now+delay,fn});return id;},
    clearTimeout(id){timers.delete(id);cancelled.push(id);}
  };
  const container=()=>({innerHTML:'',ownerDocument:{defaultView:win}});
  function advance(ms){
    const end=now+ms;
    for(let iterations=0;iterations<3000;iterations++){
      const due=[...timers].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due);
      if(!due.length)break;
      const [id,t]=due[0];timers.delete(id);now=t.due;t.fn();
      if(iterations===2999)throw Error('unbounded scheduler');
    }
    now=end;
  }
  return {win,container,advance,timers,raf,cancelled,get now(){return now}};
}
test('reduced motion plays every connection state at 5 FPS, not instant ready',async()=>{
  const env=steppedHarness(true),p=createSkiffPresenter(env.container(),{reducedMotion:'auto'});
  const events=[];p.subscribe(e=>events.push(e));
  let settled=false;const promise=p.playSequence('connection-recovery').then(v=>{settled=true;return v});
  assert.equal(p.getState(),'working');
  assert.equal(p.getPlayback().elapsedMs,0);
  assert.equal(env.raf.size,0,'no continuous RAF work in reduced mode');
  assert.equal(env.timers.size,1,'only one bounded timeout');
  env.advance(199);assert.equal(p.getPlayback().elapsedMs,0);
  env.advance(1);assert.equal(p.getPlayback().elapsedMs,200);
  env.advance(1000);assert.equal(p.getState(),'connection-interrupted');
  env.advance(1900);assert.equal(p.getState(),'recovering');
  env.advance(1400);assert.equal(p.getState(),'recovering');
  env.advance(200);assert.equal(p.getState(),'ready');
  assert.equal(settled,false,'ready frame is not completion');
  env.advance(1100);
  assert.deepEqual(await promise,{name:'connection-recovery',status:'completed'});
  assert.deepEqual(events.filter(e=>e.type==='state-changed').map(e=>e.state),
    ['working','connection-interrupted','recovering','ready']);
  assert.equal(events.filter(e=>e.type==='sequence-completed').length,1);
  assert.equal(env.timers.size,0);assert.equal(env.raf.size,0);
  p.destroy();
});
test('reduced pause/resume retains elapsed time; cancellation clears deadlines',async()=>{
  const env=steppedHarness(false),p=createSkiffPresenter(env.container(),{reducedMotion:true});
  const done=p.playSequence('connection-recovery');
  env.advance(1600);
  assert.equal(p.getState(),'connection-interrupted');
  const elapsed=p.getPlayback().elapsedMs;
  p.pause();assert.equal(p.getPlayback().paused,true);
  assert.equal(env.timers.size,0);
  env.advance(2000);
  assert.equal(p.getPlayback().elapsedMs,elapsed);
  p.resume();assert.equal(p.getPlayback().paused,false);
  env.advance(199);assert.equal(p.getPlayback().elapsedMs,elapsed);
  env.advance(1);assert.equal(p.getPlayback().elapsedMs,elapsed+200);
  p.setState('warning');
  assert.deepEqual(await done,{name:'connection-recovery',status:'cancelled',reason:'state-change'});
  assert.equal(env.timers.size,0);
  const next=p.playSequence('request-flow');
  assert.equal(env.timers.size,1);
  p.stop();
  assert.equal((await next).reason,'stopped');
  assert.equal(env.timers.size,0);
  const last=p.playSequence('greeting');
  p.destroy();p.destroy();
  assert.equal((await last).reason,'destroyed');
  assert.equal(env.timers.size,0);assert.equal(env.raf.size,0);
});
test('two reduced-motion instances use separate clocks and SVG IDs',async()=>{
  const env=steppedHarness(true);
  const a=env.container(),b=env.container();
  const first=createSkiffPresenter(a),second=createSkiffPresenter(b);
  const pa=first.playSequence('greeting'),pb=second.playSequence('connection-recovery');
  assert.equal(env.timers.size,2);
  env.advance(1200);
  assert.equal(first.getState(),'ready');
  assert.equal(second.getState(),'connection-interrupted');
  assert.notEqual(a.innerHTML,b.innerHTML);
  first.pause();
  const paused=first.getPlayback().elapsedMs;
  env.advance(1900);
  assert.equal(first.getPlayback().elapsedMs,paused);
  assert.equal(second.getState(),'recovering');
  first.destroy();
  assert.equal((await pa).reason,'destroyed');
  assert.equal(env.timers.size,1);
  env.advance(2700);
  assert.equal((await pb).status,'completed');
  second.destroy();
  assert.equal(env.timers.size,0);assert.equal(env.raf.size,0);
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
