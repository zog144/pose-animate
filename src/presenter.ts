/** Narrow semantic integration boundary for host-welcome and other Zog interfaces.
 * The application remains authoritative for factual status and accessibility. */
import {createSkiff, semanticPresentation, sequenceDuration, skiffSequences} from './index.js';
import type {SkiffState, SkiffMood, SequenceName, SkiffOptions} from './index.js';

export type SkiffCancellationReason = 'superseded'|'state-change'|'stopped'|'destroyed';
export type SkiffSequenceResult =
  | {readonly name:SequenceName; readonly status:'completed'}
  | {readonly name:SequenceName; readonly status:'cancelled'; readonly reason:SkiffCancellationReason};
export type SkiffPresenterEvent =
  | {readonly type:'state-changed'; readonly state:SkiffState}
  | {readonly type:'sequence-completed'; readonly name:SequenceName}
  | {readonly type:'sequence-cancelled'; readonly name:SequenceName; readonly reason:SkiffCancellationReason};
export interface SkiffPresenter {
  setState(state:SkiffState):void;
  setMood(mood:SkiffMood):void;
  getState():SkiffState|null;
  playSequence(name:SequenceName):Promise<SkiffSequenceResult>;
  stop():void;
  subscribe(callback:(event:SkiffPresenterEvent)=>void):()=>void;
  destroy():void;
}

/** No low-level SVG/limb controls escape this application-facing API. */
export function createSkiffPresenter(container:Element,options:SkiffOptions={}):SkiffPresenter {
  const win=container.ownerDocument.defaultView;
  const reduced=options.reducedMotion===true ||
    (options.reducedMotion!==false && !!win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const engine=createSkiff(container,options);
  let destroyed=false;
  let task:{name:SequenceName;resolve:(result:SkiffSequenceResult)=>void}|null=null;
  let watcher=0;
  const listeners=new Set<(event:SkiffPresenterEvent)=>void>();
  const ensureLive=()=>{if(destroyed)throw new Error('Skiff presenter is destroyed');};
  const notify=(event:SkiffPresenterEvent)=>{
    for(const listener of [...listeners]){
      try{listener(event);}catch{ /* Consumer callbacks cannot break the renderer or settlement. */ }
    }
  };
  const clearWatcher=()=>{if(watcher && win)win.cancelAnimationFrame(watcher);watcher=0;};
  const cancel=(reason:SkiffCancellationReason)=>{
    if(!task)return;
    const previous=task;task=null;clearWatcher();
    const result:SkiffSequenceResult={name:previous.name,status:'cancelled',reason};
    previous.resolve(result);
    notify({type:'sequence-cancelled',name:previous.name,reason});
  };
  const complete=()=>{
    if(!task)return;
    const previous=task;task=null;clearWatcher();
    previous.resolve({name:previous.name,status:'completed'});
    notify({type:'sequence-completed',name:previous.name});
  };
  const observe=()=>{
    watcher=0;
    if(destroyed||!task)return;
    if(engine.getPlayback()?.finished){complete();return;}
    watcher=win?.requestAnimationFrame(observe)??0;
  };
  return {
    setState(next){
      ensureLive();semanticPresentation(next); // validate before interrupting a valid sequence
      cancel('state-change');engine.setState(next);
      notify({type:'state-changed',state:next});
    },
    setMood(next){ensureLive();engine.setMood(next);},
    getState(){ensureLive();return engine.getPlayback()?.state??engine.getState();},
    playSequence(name){
      ensureLive();sequenceDuration(name); // fail closed on unknown choreography
      cancel('superseded');
      if(reduced||!win?.requestAnimationFrame){
        // No ongoing loop or hanging completion promise in reduced-motion mode.
        // Display the final, factual state as a still frame.
        const finalState=skiffSequences[name].at(-1)!.state;
        engine.setState(finalState);
        notify({type:'state-changed',state:finalState});
        notify({type:'sequence-completed',name});
        return Promise.resolve({name,status:'completed'} as const);
      }
      engine.play(name);
      return new Promise<SkiffSequenceResult>(resolve=>{
        task={name,resolve};
        watcher=win.requestAnimationFrame(observe);
      });
    },
    stop(){ensureLive();cancel('stopped');engine.stopSequence();},
    subscribe(callback){
      ensureLive();listeners.add(callback);
      return ()=>{listeners.delete(callback);};
    },
    destroy(){
      if(destroyed)return;
      cancel('destroyed');destroyed=true;clearWatcher();engine.destroy();listeners.clear();
    }
  };
}
