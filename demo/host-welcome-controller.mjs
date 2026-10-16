/** Simulation-only progress contract; never probes or asserts real host readiness.
 * Each milestone is a simulated receipt, not a compiler or service-health report. */
export const WELCOME_STEPS = Object.freeze([
  {id:'console',title:'Console welcome',detail:'Start with a console and explain that applications will be prepared after host installation.',duration:1000,skiff:'receiving'},
  {id:'network',title:'Network and identity checks',detail:'Simulate network reachability and host identity checks.',duration:1800,skiff:'thinking'},
  {id:'sources',title:'Application source preparation',detail:'Simulate retrieval of source archives and application definitions.',duration:2200,skiff:'receiving'},
  {id:'session',title:'Display and login applications',detail:'Simulate building supervised X11 and greetd applications outside the root filesystem.',duration:2400,skiff:'working'},
  {id:'browser',title:'Browser and remote display',detail:'Simulate building Firefox/Chromium and TurboVNC as supervised applications.',duration:2500,skiff:'working'},
  {id:'verify',title:'Service readiness verification',detail:'Simulate verification before handing over to a graphical session.',duration:1700,skiff:'focused'}
]);
export const RECOVERY_DEMO_MS=650;

export function createHostWelcomeSimulation() {
  let phase='idle', index=0, stageMs=0, recoveryMs=0;
  let events=[];
  const push=(message)=>{events=[{id:events.length?events[events.length-1].id+1:1,message},...events].slice(0,24)};
  const reset=()=>{phase='idle';index=0;stageMs=0;recoveryMs=0;events=[];push('Demonstration reset; no host operations were performed.');};
  reset();
  function snapshot(){
    const finished=index>=WELCOME_STEPS.length;
    const step=finished?null:WELCOME_STEPS[index];
    const total=WELCOME_STEPS.reduce((sum,s)=>sum+s.duration,0);
    const completed=WELCOME_STEPS.slice(0,index).reduce((sum,s)=>sum+s.duration,0);
    const elapsed=finished?total:completed+stageMs;
    const percent=finished?100:Math.min(99,Math.floor(100*elapsed/total));
    const skiffState=phase==='interrupted'?'connection-interrupted':phase==='recovering'?'recovering':phase==='failed'?'error':phase==='ready'?'ready':phase==='idle'?'idle':step?.skiff==='focused'?'thinking':step?.skiff??'idle';
    return Object.freeze({phase,index,stageMs,recoveryMs,step,percent,skiffState,events:events.slice(),
      finished, total,elapsed,steps:WELCOME_STEPS.map((s,i)=>({id:s.id,title:s.title,detail:s.detail,
        status:i<index?'complete':i>index?'pending':phase==='failed'?'failed':phase==='interrupted'?'blocked':phase==='ready'?'complete':phase==='idle'?'pending':'active'}))});
  }
  function start(){if(phase!=='idle'&&phase!=='ready')return false;reset();phase='running';push('Simulated installation started at the console.');push('Preparing stage: '+WELCOME_STEPS[0].title);return true;}
  function advance(milliseconds){
    if(!Number.isFinite(milliseconds)||milliseconds<0)throw new RangeError('Advance requires nonnegative finite milliseconds');
    let left=Math.min(milliseconds,60_000);
    if(phase==='recovering'){
      const delta=Math.min(left,RECOVERY_DEMO_MS-recoveryMs);
      recoveryMs+=delta;left-=delta;
      if(recoveryMs>=RECOVERY_DEMO_MS){phase='running';recoveryMs=0;push('Simulated connection verification succeeded; continuing paused stage.');}
    }
    if(phase!=='running')return snapshot();
    while(left>0&&phase==='running'){
      const stage=WELCOME_STEPS[index];
      if(!stage){phase='ready';break;}
      const delta=Math.min(left,stage.duration-stageMs);
      stageMs+=delta;left-=delta;
      if(stageMs>=stage.duration){
        push('Simulated step complete: '+stage.title);
        index++;stageMs=0;
        if(index>=WELCOME_STEPS.length){phase='ready';push('Demo readiness checks complete. This is NOT actual host readiness.');}
        else push('Preparing stage: '+WELCOME_STEPS[index].title);
      }
    }
    return snapshot();
  }
  function pause(){if(phase!=='running')return false;phase='paused';push('Simulation paused.');return true;}
  function resume(){if(phase!=='paused')return false;phase='running';push('Simulation resumed.');return true;}
  function interrupt(){if(phase!=='running')return false;phase='interrupted';push('Simulated connection interrupted. Progress is frozen.');return true;}
  function reconnect(){if(phase!=='interrupted')return false;phase='recovering';recoveryMs=0;push('Simulating connection recovery and verification.');return true;}
  function fail(){if(phase!=='running')return false;phase='failed';push('Simulated application step failed: '+WELCOME_STEPS[index].title);return true;}
  function retry(){if(phase!=='failed')return false;phase='running';stageMs=0;push('Retrying simulated step: '+WELCOME_STEPS[index].title);return true;}
  return Object.freeze({snapshot,start,advance,pause,resume,interrupt,reconnect,fail,retry,reset});
}
