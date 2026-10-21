/** Pack and install outside the checkout so missing exports/data cannot be hidden. */
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
if(!process.env.npm_execpath)throw Error('Run through npm run check:consumer');
const npm=(args,cwd)=>execFileSync(process.execPath,[process.env.npm_execpath,...args],{cwd,encoding:'utf8'});
const temp=mkdtempSync(join(tmpdir(),'pose-consumer-'));
try{
 const [pack]=JSON.parse(npm(['pack','--ignore-scripts','--json','--pack-destination',temp],process.cwd()));
 const archive=join(temp,pack.filename);
 console.log('Archive SHA-256:',createHash('sha256').update(readFileSync(archive)).digest('hex'));
 writeFileSync(join(temp,'package.json'),JSON.stringify({private:true,type:'module'}));
 npm(['install','--ignore-scripts','--no-audit','--no-fund',archive],temp);
 writeFileSync(join(temp,'consumer.mjs'),`import assert from 'node:assert/strict';
import {renderSvg,createSkiff} from '@zog/pose-animate';
import {createSkiffPresenter} from '@zog/pose-animate/presenter';
assert.equal(typeof renderSvg,'function');assert.equal(typeof createSkiff,'function');
const container={innerHTML:'',ownerDocument:{defaultView:{matchMedia:()=>({matches:true})}}};
const p=createSkiffPresenter(container);p.setState('thinking');assert.match(container.innerHTML,/<svg/);
assert.equal((await p.playSequence('greeting')).status,'completed');p.destroy();assert.equal(container.innerHTML,'');
console.log('Installed consumer exports, reduced motion and teardown OK');`);
 console.log(execFileSync(process.execPath,['consumer.mjs'],{cwd:temp,encoding:'utf8'}));
}finally{rmSync(temp,{recursive:true,force:true});}
