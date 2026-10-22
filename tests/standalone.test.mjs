import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');

test('offline HTML has no external scripts, stylesheet links or module imports',()=>{
 assert.doesNotMatch(html,/<script[^>]*\bsrc=/i);
 assert.doesNotMatch(html,/<script[^>]*\btype=["']module/i);
 assert.doesNotMatch(html,/<link[^>]*\bhref=/i);
 assert.match(html,/sampleSequence/);
});
test('standalone scenario and character controls operate without a server',()=>{
 const stage={innerHTML:'',ownerDocument:{defaultView:{matchMedia(){return {matches:true}}}}};
 const ids=['pose','palette','face','pulse','motion','reduced','replay','description','state','mood','scenario','play','pause','replay-scenario','stop','status','timeline','timeline-label','scenario-feedback','second-stage','second-play','second-pause','second-stop','second-status'];
 const nodes=new Map(ids.map(id=>[id,{options:[],value:'0',checked:true,textContent:'',listeners:{},
  append(option){this.options.push(option)},addEventListener(event,cb){this.listeners[event]=cb},matches(){return false}}]));
 nodes.get('second-stage').ownerDocument=stage.ownerDocument;
 const document={querySelector(sel){return sel==='#stage'?stage:nodes.get(sel.slice(1))},
  createElement(tag){assert.equal(tag,'option');return {}}};
 const script=html.match(/<script>([\s\S]*?)<\/script>/i);
 assert.ok(script);
 runInNewContext(script[1],{document,setInterval(){return 1}});
 assert.match(stage.innerHTML,/<svg/);
 assert.equal((stage.innerHTML.match(/id="skiff-\d+-limb-\d-segment-\d"/g)||[]).length,48);
 assert.equal(nodes.get('pose').options.length,9);
 assert.equal(nodes.get('state').options.length,13);
 assert.equal(nodes.get('scenario').options.length,3);
 const scenario=nodes.get('scenario');scenario.value='connection-recovery';
 nodes.get('play').listeners.click();
 nodes.get('pause').listeners.click();
 nodes.get('timeline').value='650';nodes.get('timeline').listeners.input();
 assert.match(nodes.get('status').textContent,/Restoring the connection/);
 nodes.get('replay-scenario').listeners.click();
 nodes.get('reduced').checked=true;
 nodes.get('reduced').listeners.change({target:{checked:true}});
 assert.match(nodes.get('scenario-feedback').textContent,/about 5 FPS/);
 nodes.get('play').listeners.click();
 nodes.get('pause').listeners.click();
 assert.equal(nodes.get('pause').textContent,'Resume');
 nodes.get('pause').listeners.click();
 assert.equal(nodes.get('pause').textContent,'Pause');
 nodes.get('second-play').listeners.click();
 assert.match(nodes.get('second-stage').innerHTML,/<svg/);
 nodes.get('second-pause').listeners.click();
 assert.equal(nodes.get('second-pause').textContent,'Resume second');
 nodes.get('second-stop').listeners.click();
 assert.equal(nodes.get('second-stage').innerHTML,'');
 nodes.get('stop').listeners.click();
 const pose=nodes.get('pose');pose.value='wave';pose.listeners.change();
 assert.match(nodes.get('description').textContent,/Wave:/);
 nodes.get('motion').checked=false;nodes.get('motion').listeners.change({target:{checked:false}});
 assert.equal((stage.innerHTML.match(/id="skiff-\d+-limb-\d-segment-\d"/g)||[]).length,48);
});
