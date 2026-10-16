import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createHostWelcomeSimulation,WELCOME_STEPS,RECOVERY_DEMO_MS} from '../demo/host-welcome-controller.mjs';
const offline=readFileSync(new URL('../docs/host-welcome-demo.html',import.meta.url),'utf8');

test('simulation requires all six stages before readiness and does not imply a real host check',()=>{
 const sim=createHostWelcomeSimulation();
 assert.equal(WELCOME_STEPS.length,6);
 assert.equal(sim.snapshot().phase,'idle');
 assert.equal(sim.snapshot().percent,0);
 assert.ok(sim.start());
 const duration=WELCOME_STEPS.reduce((s,step)=>s+step.duration,0);
 sim.advance(duration-1);
 assert.equal(sim.snapshot().phase,'running');
 assert.ok(sim.snapshot().percent<100);
 sim.advance(1);
 assert.equal(sim.snapshot().phase,'ready');
 assert.equal(sim.snapshot().percent,100);
 assert.equal(sim.snapshot().skiffState,'ready');
 assert.match(sim.snapshot().events[0].message,/NOT actual host readiness/);
});

test('pause, interrupt and recovery block progress until explicit simulated verification',()=>{
 const sim=createHostWelcomeSimulation();sim.start();sim.advance(700);
 const frozen=sim.snapshot().elapsed;
 assert.equal(sim.pause(),true);sim.advance(4500);assert.equal(sim.snapshot().elapsed,frozen);
 assert.equal(sim.resume(),true);assert.equal(sim.interrupt(),true);
 assert.equal(sim.snapshot().skiffState,'connection-interrupted');
 sim.advance(9999);assert.equal(sim.snapshot().elapsed,frozen);
 assert.equal(sim.reconnect(),true);assert.equal(sim.snapshot().phase,'recovering');
 assert.equal(sim.snapshot().skiffState,'recovering');
 sim.advance(RECOVERY_DEMO_MS-1);assert.equal(sim.snapshot().elapsed,frozen);
 sim.advance(1);assert.equal(sim.snapshot().phase,'running');
 sim.advance(300);assert.ok(sim.snapshot().elapsed>frozen);
});

test('step failure retains evidence of failure and retry explicitly restarts the stage',()=>{
 const sim=createHostWelcomeSimulation();sim.start();sim.advance(1100);
 const target=sim.snapshot().index;
 assert.equal(sim.fail(),true);assert.equal(sim.snapshot().steps[target].status,'failed');
 const frozen=sim.snapshot().elapsed;sim.advance(5000);assert.equal(sim.snapshot().elapsed,frozen);
 assert.equal(sim.retry(),true);assert.equal(sim.snapshot().index,target);
 assert.equal(sim.snapshot().stageMs,0);
 assert.ok(sim.snapshot().events.some(entry=>/Retrying simulated step/.test(entry.message)));
 sim.reset();assert.equal(sim.snapshot().percent,0);
 assert.throws(()=>sim.advance(-1),/nonnegative/);
 assert.throws(()=>sim.advance(Infinity),/nonnegative/);
});

test('offline welcome HTML contains full renderer, presenter and simulator without network/module resources',()=>{
 assert.equal((offline.match(/<script>/g)||[]).length,1);
 assert.doesNotMatch(offline,/<script[^>]*\bsrc=|<script[^>]*\btype="module"|<link[^>]*\bhref=/i);
 assert.match(offline,/function createSkiffPresenter/);
 assert.match(offline,/function createHostWelcomeSimulation/);
 assert.match(offline,/Simulated environment/);
 assert.match(offline,/actual first-boot path starts with a console/);
});

function domHarness(){
 let nextId=0;const queue=new Map();
 class NodeMock{
  constructor(){this.children=[];this.attributes={};this.dataset={};this.innerHTML='';this.textContent='';this.listeners={};this.disabled=false;this.value=0;}
  setAttribute(k,v){this.attributes[k]=v;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  addEventListener(type,fn){this.listeners[type]=fn;}
  click(){this.listeners.click?.();}
 }
 const win={matchMedia(){return {matches:false}},requestAnimationFrame(fn){queue.set(++nextId,fn);return nextId},cancelAnimationFrame(id){queue.delete(id)},addEventListener(){}};
 const elements=new Map();
 const document={createElement(){return new NodeMock()},createTextNode(s){const n=new NodeMock();n.textContent=s;return n},
  getElementById(id){if(!elements.has(id))elements.set(id,new NodeMock());return elements.get(id)}};
 document.getElementById('skiff').ownerDocument={defaultView:win};
 const callbacks=(timestamp)=>{const pending=[...queue.values()];queue.clear();pending.forEach(fn=>fn(timestamp));};
 const match=offline.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(match);
 runInNewContext(match[1],{window:win,document,console});
 return {nodes:elements,callbacks};
}

test('offline demo buttons connect to factual state, blocked progress, retry and reset',()=>{
 const {nodes,callbacks}=domHarness();const el=id=>nodes.get(id);
 assert.equal(el('percent').textContent,'0%');
 assert.equal((el('skiff').innerHTML.match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
 el('start').click();assert.equal(el('phase').textContent,'Preparing applications');
 for(let i=0;i<12;i++)callbacks(i*200);
 assert.ok(Number(el('progress').value)>0);
 el('interrupt').click();assert.equal(el('phase').textContent,'Connection interrupted');
 const stalled=el('progress').value;callbacks(4000);assert.equal(el('progress').value,stalled);
 el('reconnect').click();assert.equal(el('phase').textContent,'Checking reconnection');
 el('reset').click();el('start').click();el('fail').click();
 assert.equal(el('phase').textContent,'A stage failed');
 el('retry').click();assert.equal(el('phase').textContent,'Preparing applications');
 el('reset').click();assert.equal(el('percent').textContent,'0%');
});
