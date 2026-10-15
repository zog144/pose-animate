import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');

test('single-file preview is network-free and contains no module imports',()=>{
 assert.doesNotMatch(html, /<script[^>]*\bsrc=/i);
 assert.doesNotMatch(html, /<script[^>]*\btype=["']module/i);
 assert.doesNotMatch(html, /<link[^>]*\bhref=/i);
 assert.match(html, /createSkiff/);
});

test('standalone preview script runs without a web server or file imports',()=>{
 const stage={innerHTML:'',ownerDocument:{defaultView:{matchMedia(){return {matches:true}}}}};
 const controls=new Map(['pose','palette','face','pulse','motion','replay','description','state','mood'].map(k=>[k,{options:[],textContent:'',checked:true,listeners:{},append(option){this.options.push(option)},addEventListener(name,callback){this.listeners[name]=callback}}]));
 const document={querySelector(selector){return selector==='#stage'?stage:controls.get(selector.slice(1))},createElement(tag){assert.equal(tag,'option');return {}}};
 const script=html.match(/<script>([\s\S]*?)<\/script>/i);
 assert.ok(script,'classic inline script exists');
 runInNewContext(script[1],{document});
 assert.match(stage.innerHTML,/<svg[^>]+>/);
 assert.equal((stage.innerHTML.match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
 assert.equal(controls.get('pose').options.length,7);
 assert.equal(controls.get('palette').options.length,6);
 assert.equal(controls.get('state').options.length,12);
 assert.equal(controls.get('mood').options.length,8);
 const state=controls.get('state');state.value='receiving';state.listeners.change();
 assert.match(controls.get('description').textContent,/System state: receiving/);
 const mood=controls.get('mood');mood.value='pleased';mood.listeners.change();
 const pose=controls.get('pose');pose.value='wave';pose.listeners.change();
 assert.match(controls.get('description').textContent,/Wave:/);
 assert.equal(state.value,'manual');
 controls.get('replay').listeners.click();
 controls.get('motion').checked=false;controls.get('motion').listeners.change({target:{checked:false}});
 assert.equal((stage.innerHTML.match(/id="skiff-limb-\d-segment-\d"/g)||[]).length,48);
});