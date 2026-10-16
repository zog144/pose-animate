import test from 'node:test';
import assert from 'node:assert/strict';
import {createSkiff,renderSvg,semanticPresentation,samplePose} from '../dist/index.js';
import {createSkiffPresenter} from '../dist/presenter.js';
function harness(){
 let next=0;const callbacks=new Map();const stopped=[];
 const win={matchMedia(){return {matches:false}},requestAnimationFrame(fn){callbacks.set(++next,fn);return next},cancelAnimationFrame(id){callbacks.delete(id);stopped.push(id)}};
 const container=()=>({innerHTML:'',ownerDocument:{defaultView:win}});
 const tick=t=>{const frames=[...callbacks];callbacks.clear();frames.forEach(([,fn])=>fn(t))};
 return {win,container,tick,callbacks,stopped};
}
function ids(html){return [...html.matchAll(/\bid="(skiff-\d+-[^\"]+)"/g)].map(m=>m[1]);}
function checkReferences(html){
 const names=new Set(ids(html));
 const refs=[...html.matchAll(/\bhref="#(skiff-\d+-[^\"]+)"/g)].map(x=>x[1]);
 assert.ok(refs.length>=3,'foreground pondering squares have references');
 for(const ref of refs)assert.ok(names.has(ref),`same SVG instance owns ${ref}`);
}
test('multiple simultaneous Skiffs have disjoint SVG IDs and contained <use> references',()=>{
 const {container,tick,callbacks}=harness();
 const c1=container(),c2=container(),c3=container();
 const a=createSkiff(c1),b=createSkiff(c2),c=createSkiff(c3);
 a.setState('thinking');b.setState('thinking');c.setState('thinking');
 a.renderAt(1);b.renderAt(1);c.renderAt(1);
 for (const item of [c1,c2,c3]){
  assert.equal(ids(item.innerHTML).filter(x=>/limb-\d-segment-\d$/.test(x)).length,48);
  checkReferences(item.innerHTML);
 }
 const all=[...ids(c1.innerHTML),...ids(c2.innerHTML),...ids(c3.innerHTML)];
 assert.equal(new Set(all).size,all.length,'no duplicate IDs across character instances');
 const second=c2.innerHTML;
 a.setColor('red');assert.equal(c2.innerHTML,second,'changing instance A cannot change B');
 a.destroy();assert.equal(c1.innerHTML,'');assert.equal(c2.innerHTML,second);
 tick(120);assert.equal(ids(c2.innerHTML).length,ids(second).length);
 b.destroy();c.destroy();assert.equal(callbacks.size,0,'all RAF handles removed');
});
test('presenters can run independently; destroyed instance cannot cancel another',async()=>{
 const {container,tick,callbacks}=harness();
 const aContainer=container(),bContainer=container();
 const a=createSkiffPresenter(aContainer),b=createSkiffPresenter(bContainer);
 a.setState('thinking');b.setState('connection-interrupted');
 assert.equal(a.getState(),'thinking');assert.equal(b.getState(),'connection-interrupted');
 assert.notEqual(aContainer.innerHTML,bContainer.innerHTML);
 const aSeq=a.playSequence('greeting');
 const bSeq=b.playSequence('connection-recovery');
 tick(100);a.destroy();
 assert.deepEqual(await aSeq,{name:'greeting',status:'cancelled',reason:'destroyed'});
 assert.equal(b.getState(),'working');
 tick(6200);tick(6400);
 assert.deepEqual(await bSeq,{name:'connection-recovery',status:'completed'});
 assert.equal(aContainer.innerHTML,'');assert.ok(bContainer.innerHTML.includes('<svg'));
 b.destroy();assert.equal(callbacks.size,0);
});
test('pure static baseline is not affected by the live instance namespace',()=>{
 const preset=semanticPresentation('thinking');
 const frame={pose:{...samplePose(preset.pose,0,false),face:preset.face},palette:'blue',pulse:preset.pulse,phase:.25};
 const baseline=renderSvg(frame);
 assert.match(baseline,/id="skiff-limb-4-segment-5"/);
 assert.match(baseline,/<use href="#skiff-limb-4-segment-5"\/>/);
});
