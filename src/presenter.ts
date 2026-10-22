/** Narrow semantic integration boundary for host-welcome and other Zog interfaces.
 * The application remains authoritative for factual status and accessibility. */
import {createSkiff, semanticPresentation, sequenceDuration} from './index.js';
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
  pause():void;
  resume():void;
  getPlayback():ReturnType<ReturnType<typeof createSkiff>['getPlayback']>;
  stop():void;
  subscribe(callback:(event:SkiffPresenterEvent)=>void):()=>void;
  destroy():void;
}

/** No low-level SVG/limb controls escape this application-facing API. */
export function createSkiffPresenter(container:Element,options:SkiffOptions={}):SkiffPresenter {
  const win=container.ownerDocument.defaultView;
  const engine=createSkiff(container,options);
  let destroyed=false;
  let task:{name:SequenceName;resolve:(result:SkiffSequenceResult)=>void}|null=null;
  let lastSequenceState:SkiffState|null=null;
  const listeners=new Set<(event:SkiffPresenterEvent)=>void>();
  const ensureLive=()=>{if(destroyed)throw new Error('Skiff presenter is destroyed');};
  const notify=(event:SkiffPresenterEvent)=>{
    for(const listener of [...listeners]){
      try{listener(event);}catch{ /* Consumer callbacks cannot break the renderer or settlement. */ }
    }
  };
  const cancel=(reason:SkiffCancellationReason)=>{
    if(!task)return;
    const previous=task;task=null;lastSequenceState=null;
    const result:SkiffSequenceResult={name:previous.name,status:'cancelled',reason};
    previous.resolve(result);
    notify({type:'sequence-cancelled',name:previous.name,reason});
  };
  const complete=()=>{
    if(!task)return;
    const previous=task;task=null;lastSequenceState=null;
    previous.resolve({name:previous.name,status:'completed'});
    notify({type:'sequence-completed',name:previous.name});
  };
  /** Renderer owns the clock; presenter observes factual timeline frames. */
  const unsubscribePlayback=engine.subscribePlayback(frame=>{
    if(destroyed||!task||frame.name!==task.name)return;
    if(frame.state!==lastSequenceState){
      lastSequenceState=frame.state;
      notify({type:'state-changed',state:frame.state});
    }
    if(frame.finished)complete();
  });
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
      lastSequenceState=null;
      return new Promise<SkiffSequenceResult>(resolve=>{
        task={name,resolve};
        engine.play(name);
      });
    },
    pause(){ensureLive();engine.pause();},
    resume(){ensureLive();engine.resume();},
    getPlayback(){ensureLive();return engine.getPlayback();},
    stop(){ensureLive();cancel('stopped');engine.stopSequence();},
    subscribe(callback){
      ensureLive();listeners.add(callback);
      return ()=>{listeners.delete(callback);};
    },
    destroy(){
      if(destroyed)return;
      cancel('destroyed');destroyed=true;unsubscribePlayback();engine.destroy();listeners.clear();
    }
  };
}
