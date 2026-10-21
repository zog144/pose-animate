/** Real browser smoke checks. Windows channels are required, never silently skipped. */
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const channels=process.platform==='win32'?['msedge','chrome']:['chromium'];
const server=createServer(async(req,res)=>{
 const paths={'/':'','/index.js':'dist/index.js','/presenter.js':'dist/presenter.js'};
 if(!(req.url in paths)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',req.url==='/'?'text/html':'text/javascript');
 res.end(req.url==='/'?'<html><body></body></html>':await readFile(paths[req.url]));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 for(const channel of channels){
  const browser=await chromium.launch(channel==='chromium'
   ?{executablePath:process.env.POSE_CHROMIUM_PATH,headless:true}
   :{channel,headless:true});
  try{
   for(const reducedMotion of ['no-preference','reduce']){
    const context=await browser.newContext({reducedMotion});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const result=await page.evaluate(async()=>{
     const {createSkiff}=await import('/index.js');
     const {createSkiffPresenter}=await import('/presenter.js');
     const check=(v,msg)=>{if(!v)throw Error(msg)};
     const wait=()=>new Promise(r=>setTimeout(r,100));
     const nativeRAF=window.requestAnimationFrame.bind(window),nativeCancel=window.cancelAnimationFrame.bind(window);
     const pending=new Set();let calls=0;
     window.requestAnimationFrame=fn=>{const id=nativeRAF(t=>{pending.delete(id);calls++;fn(t)});pending.add(id);return id};
     window.cancelAnimationFrame=id=>{pending.delete(id);nativeCancel(id)};
     const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
     const containers=Array.from({length:3},()=>{const e=document.createElement('div');e.style.width='320px';document.body.append(e);return e});
     const a=createSkiff(containers[0],{reducedMotion:'auto'}),b=createSkiff(containers[1],{reducedMotion:'auto'});
     // Both thinking characters must own their foreground references. The
     // interruption state uses the accepted droop pose, without a face overlay.
     a.setState('thinking');b.setState('thinking');a.renderAt(1);b.renderAt(1);
     const all=[...document.querySelectorAll('[id]')].map(e=>e.id);check(new Set(all).size===all.length,'duplicate SVG ids');
     for(const c of containers.slice(0,2)){
      const uses=[...c.querySelectorAll('use')];check(uses.length>=3,'foreground tip absent');
      for(const u of uses){const ref=u.getAttribute('href');check(c.querySelector(ref),'reference crosses instance');check(u.getBBox().width>0,'foreground tip not rendered');}
     }
     a.play('request-flow');a.pause();const frozen=a.getPlayback().elapsedMs;
     await wait();check(a.getPlayback().elapsedMs===frozen,'paused sequence advances');a.resume();
     if(!reduced){
      // A loaded hosted runner need not deliver a frame within 100 ms.
      // Require actual progress within a bounded deadline, not a fixed sleep.
      const deadline=performance.now()+5000;
      while(a.getPlayback().elapsedMs<=frozen && performance.now()<deadline)await wait();
      check(a.getPlayback().elapsedMs>frozen,'resume failed within 5 seconds');
     }
     const p=createSkiffPresenter(containers[2],{reducedMotion:'auto'});
     const outcome=p.playSequence('connection-recovery');
     if(reduced){check((await outcome).status==='completed','reduced sequence did not settle');check(p.getState()==='ready','wrong reduced final state');check(pending.size===0,'reduced motion schedules RAF');}
     else{p.setState('connection-interrupted');check((await outcome).reason==='state-change','interrupt did not cancel');}
     if(reduced){const html=document.body.innerHTML;await wait();check(document.body.innerHTML===html,'reduced frame animates');}
     a.destroy();b.destroy();p.destroy();check(pending.size===0,'RAF survives teardown');
     const before=calls;await wait();check(calls===before,'callback runs after teardown');
     check(containers.every(c=>c.innerHTML===''),'DOM survives teardown');
     return {reduced,callbacksAfterTeardown:pending.size,instances:3};
    });
    // file:// is the supported offline Windows review path.
    for(const file of ['docs/index.html','docs/host-welcome-demo.html']){
     await page.goto(pathToFileURL(resolve(file)).href);await page.locator('svg').first().waitFor();
     assert.ok(await page.locator('svg rect').count()>0);
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({channel,version:browser.version(),platform:process.platform,reducedMotion,...result,offlinePages:2}));
    await context.close();
   }
  }finally{await browser.close();}
 }
}finally{await new Promise(r=>server.close(r));}
