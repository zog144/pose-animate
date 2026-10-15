/** Pure Skiff pose data, deterministic frame sampling, and an optional browser SVG adapter. */
export type Point = readonly [number, number];
export type Face = 'open'|'happy'|'blink'|'focused'|'concerned'|'sleeping';
export type PoseName = 'idle'|'greet'|'wave'|'listen'|'ponder'|'present'|'celebrate';
export type PaletteName = 'blue'|'green'|'amber'|'red'|'purple'|'cyan';
export interface Pose { readonly head:Point; readonly limbs:readonly (readonly Point[])[]; readonly face:Face; }
export interface Frame { readonly pose:Pose; readonly palette:PaletteName; readonly pulse:'none'|'inward'|'outward'; readonly phase:number; }
export interface Palette { body:string; dark:string; mid:string; light:string; tip:string; eye:string; outline:string; }
export const palettes:Readonly<Record<PaletteName,Palette>> = {
  blue:{body:'#32aae1',dark:'#1675b2',mid:'#1d91cc',light:'#55c8ee',tip:'#8ce5f5',eye:'#102a49',outline:'#123c60'},
  green:{body:'#3acb9b',dark:'#16866b',mid:'#22ae86',light:'#6de0b5',tip:'#a2edd2',eye:'#103c39',outline:'#12554e'},
  amber:{body:'#f5b73c',dark:'#b8781e',mid:'#db9428',light:'#ffcf70',tip:'#ffe4a5',eye:'#453016',outline:'#60401b'},
  red:{body:'#ef766d',dark:'#b33c4e',mid:'#dc5a61',light:'#ffa099',tip:'#ffc3b6',eye:'#491c30',outline:'#6c2836'},
  purple:{body:'#a78de9',dark:'#6348b8',mid:'#886acb',light:'#c0a9f5',tip:'#daceff',eye:'#241e4c',outline:'#40316f'},
  cyan:{body:'#45d9dd',dark:'#168caa',mid:'#1fb6c4',light:'#8beced',tip:'#c4f6f3',eye:'#133b50',outline:'#185c6e'}
};
// Head occupies logical [0,8] x [0,8]. Limb identities run clockwise.
const limbs:readonly (readonly Point[])[] = [
 [[-1,1],[-2,0],[-3,-1],[-4,-2],[-5,-2],[-6,-3]],
 [[8,1],[9,0],[10,-1],[11,-2],[12,-2],[13,-3]],
 [[8,3],[9,3],[10,2],[11,2],[12,1],[13,1]],
 [[7,8],[8,9],[9,10],[10,11],[11,11],[12,12]],
 [[5,8],[5,9],[6,10],[6,11],[7,12],[7,13]],
 [[2,8],[2,9],[1,10],[1,11],[0,12],[0,13]],
 [[0,8],[-1,9],[-2,10],[-3,11],[-4,11],[-5,12]],
 [[-1,4],[-2,4],[-3,5],[-4,5],[-5,6],[-6,6]]
];
function pose(face:Face, overrides:ReadonlyArray<readonly [number, readonly Point[]]> = []):Pose {
 const copy:Point[][]=limbs.map(l=>l.map(([x,y]):Point=>[x,y]));
 for(const [i,points] of overrides)copy[i]=points.map(([x,y]):Point=>[x,y]);
 return {head:[0,0],limbs:copy,face};
}
export const poses:Readonly<Record<PoseName,Pose>> = {
 idle:pose('open'),
 greet:pose('happy',[[1,[[8,1],[9,0],[10,-1],[10,-2],[9,-3],[9,-4]]]]),
 wave:pose('happy',[[1,[[8,1],[9,0],[10,-1],[11,-1],[11,-2],[10,-3]]]]),
 listen:pose('focused',[[2,[[8,3],[9,2],[10,2],[11,1],[12,1],[12,0]]]]),
 ponder:pose('focused',[[4,[[5,8],[6,9],[7,9],[8,8],[8,7],[7,6]]]]),
 present:pose('happy',[[2,[[8,3],[9,3],[10,3],[11,3],[12,3],[13,3]]]]),
 celebrate:pose('happy',[[0,[[-1,1],[-2,0],[-3,-1],[-4,-2],[-5,-3],[-6,-4]]],[1,[[8,1],[9,0],[10,-1],[11,-2],[12,-3],[13,-4]]]])
};
export function validatePose(p:Pose):void {
 if(p.limbs.length!==8||p.limbs.some(l=>l.length!==6))throw new Error('Skiff requires eight six-segment limbs');
 if(![...p.head,...p.limbs.flatMap(l=>l.flat())].every(Number.isFinite))throw new Error('Non-finite pose coordinate');
}
export function interpolate(from:Pose,to:Pose,progress:number):Pose {
 validatePose(from);validatePose(to);
 const t=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
 const mix=(a:Point,b:Point):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 return {head:mix(from.head,to.head),limbs:from.limbs.map((l,i)=>l.map((s,j)=>mix(s,to.limbs[i]![j]!))),face:t<.5?from.face:to.face};
}
/** Semantic gestures own their motion. Time is quantized to 12 visual steps/s. */
export function samplePose(name: PoseName, seconds=0, motion=true): Pose {
  if (!Object.hasOwn(poses,name)) throw new Error('Unknown Skiff pose');
  const base=poses[name];
  if (!motion) return base;
  const safeTime=Number.isFinite(seconds)?Math.max(0,seconds):0;
  const tick=Math.floor(safeTime*12);
  const t=tick/12;
  const phase=t*Math.PI*2;
  let headBob=Math.sin(phase/6)*.12;
  const limbs=base.limbs.map((limb,i)=>limb.map(([x,y],j):Point=>{
    const reach=Math.pow(j/5,1.5);
    let dx=Math.sin(phase/8+i*1.7)*.09*reach;
    let dy=0;
    switch(name){
      case 'greet':
      case 'wave':
        if(i===1){
          const swing=Math.sin(phase*(name==='wave'?.95:.6));
          dx+=reach*swing*(name==='wave'?2.2:1.15);
          dy+=reach*(Math.cos(phase*(name==='wave'?.95:.6))-1)*.5;
        }
        break;
      case 'listen':
        if(i===2){dx+=reach*Math.sin(phase*.65)*.55;dy-=reach*(.3+.25*Math.cos(phase*.65));}
        break;
      case 'ponder':
        if(i===4){dx-=reach*(.4+.55*Math.sin(phase*.44));dy+=reach*Math.cos(phase*.44)*.48;}
        break;
      case 'present':
        if(i===2){dx+=reach*(.55+.5*Math.sin(phase*.75));}
        break;
      case 'celebrate':
        if(i===0||i===1||i===3||i===6){
          dy-=reach*(.75+.75*Math.sin(phase*1.3+(i%2)*Math.PI));
          dx+=(i===0||i===6?-1:1)*reach*.45*Math.sin(phase*1.3);
        }
        break;
    }
    return [x+dx,y+dy];
  }));
  if(name==='listen')headBob=Math.sin(phase*.5)*.1;
  if(name==='ponder')headBob=Math.sin(phase*.35)*.08;
  if(name==='celebrate')headBob=-.35-.4*Math.sin(phase*1.3);
  const blink=(tick%79===42||tick%79===43);
  return {head:[base.head[0],base.head[1]+headBob],limbs,face:blink?'blink':base.face};
}
/** Smooth, clamped, pure transition of all 48 persistent segment identities. */
export function sampleTransition(from:Pose,to:Pose,progress:number):Pose {
  const t=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
  return interpolate(from,to,t*t*(3-2*t));
}
/** Head uses 70% of the previous linear dimensions. Pose coordinates stay canonical. */
export const SKIFF_HEAD_SCALE=0.7;
const HEAD_UNITS=8;
const HEAD_INSET=HEAD_UNITS*(1-SKIFF_HEAD_SCALE)/2;
const fmt=(n:number)=>String(Number(n.toFixed(3)));
const rect=(x:number,y:number,w:number,h:number,fill:string,stroke?:string,sw=0)=>
 '<rect x="'+fmt(x)+'" y="'+fmt(y)+'" width="'+fmt(w)+'" height="'+fmt(h)+'" fill="'+fill+'"'+
 (stroke?' stroke="'+stroke+'" stroke-width="'+fmt(sw)+'"':'')+'/>';
/** Rendering is pure: no document, randomness or global clock is consulted. */
export function renderSvg(frame:Frame):string {
 validatePose(frame.pose);
 const c=palettes[frame.palette];if(!c)throw new Error('Unknown palette');
 const [hx,hy]=frame.pose.head;
 const result:string[]=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="-9 -7 30 29" role="img" aria-label="Skiff pixel octopus">'];
 frame.pose.limbs.forEach((l,i)=>{
  result.push('<g id="skiff-limb-'+i+'">');
  l.forEach(([x,y],j)=>{
   let color=j<2?c.dark:j<4?c.mid:j===4?c.light:c.tip;
   if(frame.pulse!=='none'&&Math.floor(frame.phase*12)%6===(frame.pulse==='inward'?5-j:j))color=c.tip;
   // Re-anchor the proximal squares to the smaller face while keeping
   // all six square sizes, segment IDs and distal tip positions unchanged.
   const weight=(1-SKIFF_HEAD_SCALE)*(1-j/5);
   const sx=x+(hx+HEAD_UNITS/2-(x+.5))*weight;
   const sy=y+(hy+HEAD_UNITS/2-(y+.5))*weight;
   result.push('<g id="skiff-limb-'+i+'-segment-'+j+'>'+rect(sx,sy,1,1,color,c.outline,.09)+'</g>');
  });
  result.push('</g>');
 });
 // Preserve the head centre and proportionally shrink its face features.
 const px=(x:number)=>hx+HEAD_INSET+x*SKIFF_HEAD_SCALE;
 const py=(y:number)=>hy+HEAD_INSET+y*SKIFF_HEAD_SCALE;
 const dim=(n:number)=>n*SKIFF_HEAD_SCALE;
 result.push('<g id="skiff-head">',rect(px(0),py(0),dim(8),dim(8),c.body,c.outline,dim(.15)));
 const eye=(x:number):string=>{
  const y=2.2;
  if(['happy','blink','sleeping'].includes(frame.pose.face))
   return rect(px(x),py(y+.9),dim(1.5),dim(.28),c.eye);
  const height=frame.pose.face==='concerned'?1.35:1.65;
  return rect(px(x),py(y),dim(1.55),dim(height),c.eye)
   +rect(px(x+.25),py(y+.2),dim(.42),dim(.42),'#f8ffff')
   +rect(px(x+.98),py(y+.99),dim(.25),dim(.25),c.light);
 };
 result.push('<g id="skiff-eye-left">'+eye(1.35)+'</g>','<g id="skiff-eye-right">'+eye(5.1)+'</g>');
 result.push('<g id="skiff-mouth">'+rect(px(3.1),py(5.55),dim(.32),dim(.32),c.eye)+rect(px(3.78),py(5.87),dim(.32),dim(.32),c.eye)+rect(px(4.46),py(5.55),dim(.32),dim(.32),c.eye)+'</g></g></svg>');
 return result.join('');
}
export interface SkiffOptions { palette?:PaletteName; reducedMotion?:boolean|'auto'; }
export interface TransitionOptions { duration?:number; }
/** Owns one RAF loop; all gestures stay local to the supplied SVG container. */
export function createSkiff(container:Element,options:SkiffOptions={}) {
  let palette:PaletteName=options.palette??'blue';
  let name:PoseName='idle', face:Face|null=null, pulse:Frame['pulse']='none';
  let enabled=true, destroyed=false, running=false, handle=0, origin:number|null=null;
  let lastSeconds=0, poseStart=0;
  let transition:{from:Pose;start:number;duration:number}|null=null;
  const win=container.ownerDocument.defaultView;
  const reduced=options.reducedMotion===undefined||options.reducedMotion==='auto'
    ? Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    : options.reducedMotion;
  const hasMotion=()=>!reduced&&enabled;
  const poseAt=(time:number):Pose=>{
    const target=samplePose(name,time-poseStart,hasMotion());
    if(!transition)return target;
    const progress=(time-transition.start)/transition.duration;
    if(progress>=1){transition=null;return target;}
    return sampleTransition(transition.from,target,progress);
  };
  const draw=(time=lastSeconds)=>{
    lastSeconds=Number.isFinite(time)?Math.max(0,time):0;
    const p=poseAt(lastSeconds);
    container.innerHTML=renderSvg({pose:face?{...p,face}:p,palette,pulse,phase:lastSeconds});
  };
  const loop=(now:number)=>{
    if(!running||destroyed)return;
    if(origin===null)origin=now-lastSeconds*1000;
    draw((now-origin)/1000);
    handle=win?.requestAnimationFrame(loop)??0;
  };
  const start=()=>{if(!destroyed&&!running&&hasMotion()&&win){running=true;handle=win.requestAnimationFrame(loop);}};
  const stop=()=>{running=false;if(win&&handle)win.cancelAnimationFrame(handle);handle=0;};
  const transitionTo=(next:PoseName,settings:TransitionOptions={})=>{
    if(!Object.hasOwn(poses,next))throw new Error('Unknown Skiff pose');
    const ms=settings.duration??420;
    if(!Number.isFinite(ms)||ms<0)throw new RangeError('Transition duration must be finite and nonnegative');
    const from=poseAt(lastSeconds);
    name=next;poseStart=lastSeconds;
    transition=hasMotion()&&ms>0?{from,start:lastSeconds,duration:ms/1000}:null;
    draw();
  };
  draw();start();
  return {
    setPose(next:PoseName){transitionTo(next);},
    transitionTo,
    replay(){const target=name;const from=poses.idle;poseStart=lastSeconds;
      transition=hasMotion()?{from,start:lastSeconds,duration:.42}:null;
      name=target;draw();},
    setExpression(next:Face|null){face=next;draw();},
    setColor(next:PaletteName){if(!Object.hasOwn(palettes,next))throw new Error('Unknown palette');palette=next;draw();},
    pulse(next:Frame['pulse']){if(!['none','inward','outward'].includes(next))throw new Error('Unknown pulse');pulse=next;draw();},
    setMotionEnabled(value:boolean){enabled=Boolean(value);if(!hasMotion()){
      stop();transition=null;draw();
    }else{draw();start();}},
    renderAt(seconds:number){draw(seconds);},
    destroy(){destroyed=true;stop();container.innerHTML='';}
  };
}
