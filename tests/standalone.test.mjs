import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const html=readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');
test('standalone HTML uses no external modules or styles',()=>{
 assert.doesNotMatch(html,/<script[^>]*\bsrc=/i);
 assert.doesNotMatch(html,/<script[^>]*\btype=["']module/i);
 assert.doesNotMatch(html,/<link[^>]*\bhref=/i);
});
test('inline preview renders eight six-square limbs and populates controls',()=>{
 const stage={innerHTML:'',ownerDocument:{defaultView:{matchMedia(){return {matches:true}}}}};
 const controls=new Map(['pose','palette','face','pulse','motion','replay','description'].map(k=>[k,{options:[],textContent:'',checked:true,listeners:{},append(o){this.options.push(o)},addEventListener(event,handler){this.listeners[event]=handler}}]));
 const document={querySelector(sel){return sel==='#stage'?stage:controls.get(sel.slice(1));},createElement(){return {}}};
 const script=html.match(/<script>([\s\S]*?)<\/script>/i);
 assert.ok(script);
 runInNewContext(script[1],{document});
 assert.match(stage.innerHTML,/<svg[^>]+>/);
 assert.equal((stage.innerHTML.match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
 assert.equal(controls.get('pose').options.length,7);
 assert.equal(controls.get('palette').options.length,6);
 const pose=controls.get('pose');pose.value='wave';pose.listeners.change();
 assert.match(controls.get('description').textContent,/Wave:/);
 controls.get('replay').listeners.click();
 controls.get('motion').checked=false;
 controls.get('motion').listeners.change({target:{checked:false}});
 assert.equal((stage.innerHTML.match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);

});
