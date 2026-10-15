/** The Skiff logical grid is independent of SVG pixels and browser frame rate. */
export type Point = readonly [number, number];
export type Limb = readonly Point[];
export type Face = 'open' | 'happy' | 'blink' | 'concerned' | 'focused' | 'sleeping' | 'surprised';
export type PaletteName = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan';
export type PoseName = 'idle' | 'greet' | 'wave' | 'listen' | 'ponder' | 'present' | 'celebrate';
export interface Pose { readonly head: Point; readonly limbs: readonly Limb[]; readonly face: Face; }
export interface Frame { readonly pose: Pose; readonly palette: PaletteName; readonly pulse: 'none' | 'inward' | 'outward'; readonly phase: number; }
export interface Palette { readonly body: string; readonly dark: string; readonly mid: string; readonly light: string; readonly tip: string; readonly eye: string; readonly outline: string; }
export const palettes: Readonly<Record<PaletteName, Palette>> = {
  blue: { body:'#32aae1', dark:'#1675b2', mid:'#1d91cc', light:'#55c8ee', tip:'#8ce5f5', eye:'#102a49', outline:'#123c60' },
  green: { body:'#3acb9b', dark:'#16866b', mid:'#22ae86', light:'#6de0b5', tip:'#a2edd2', eye:'#103c39', outline:'#12554e' },
  amber: { body:'#f5b73c', dark:'#b8781e', mid:'#db9428', light:'#ffcf70', tip:'#ffe4a5', eye:'#453016', outline:'#60401b' },
  red: { body:'#ef766d', dark:'#b33c4e', mid:'#dc5a61', light:'#ffa099', tip:'#ffc3b6', eye:'#491c30', outline:'#6c2836' },
  purple: { body:'#a78de9', dark:'#6348b8', mid:'#886acb', light:'#c0a9f5', tip:'#daceff', eye:'#241e4c', outline:'#40316f' },
  cyan: { body:'#45d9dd', dark:'#168caa', mid:'#1fb6c4', light:'#8beced', tip:'#c4f6f3', eye:'#133b50', outline:'#185c6e' }
};

// Clockwise: upper-left, upper-right, middle-right, lower-right,
// inner-lower-right, inner-lower-left, lower-left, middle-left.
// Head: 8 x 8 logical units, origin (0,0). All segment centres lie outside it.
const idleLimbs: readonly Limb[] = [
  [[-1,1],[-2,0],[-3,-1],[-4,-2],[-5,-2],[-6,-3]],
  [[8,1],[9,0],[10,-1],[11,-2],[12,-2],[13,-3]],
  [[8,3],[9,3],[10,2],[11,2],[12,1],[13,1]],
  [[7,8],[8,9],[9,10],[10,11],[11,11],[12,12]],
  [[5,8],[5,9],[6,10],[6,11],[7,12],[7,13]],
  [[2,8],[2,9],[1,10],[1,11],[0,12],[0,13]],
  [[0,8],[-1,9],[-2,10],[-3,11],[-4,11],[-5,12]],
  [[-1,4],[-2,4],[-3,5],[-4,5],[-5,6],[-6,6]]
];
const cloneLimbs = (limbs: readonly Limb[]): Point[][] => limbs.map(limb=>limb.map(([x,y])=>[x,y]));
const pose = (face: Face, overrides: ReadonlyArray<readonly [number, Limb]> = []): Pose => {
  const limbs = cloneLimbs(idleLimbs);
  for (const [index, coords] of overrides) limbs[index] = coords.map(([x,y])=>[x,y]);
  return {head:[0,0],limbs,face};
};
export const poses: Readonly<Record<PoseName, Pose>> = {
  idle: pose('open'),
  greet: pose('happy', [[1,[[8,1],[9,0],[10,-1],[10,-2],[9,-3],[9,-4]]]]),
  wave: pose('happy', [[1,[[8,1],[9,0],[10,-1],[11,-1],[11,-2],[10,-3]]]]),
  listen: pose('focused', [[2,[[8,3],[9,2],[10,2],[11,1],[12,1],[12,0]]]]),
  ponder: pose('focused', [[4,[[5,8],[6,9],[7,9],[8,8],[8,7],[7,6]]]]),
  present: pose('happy', [[2,[[8,3],[9,3],[10,3],[11,3],[12,3],[13,3]]]]),
  celebrate: pose('happy', [[0,[[-1,1],[-2,0],[-3,-1],[-4,-2],[-5,-3],[-6,-4]]],[1,[[8,1],[9,0],[10,-1],[11,-2],[12,-3],[13,-4]]],[6,[[0,8],[-1,9],[-2,10],[-3,11],[-4,12],[-5,13]]]])
};
export function validatePose(p: Pose): void {
  if (p.limbs.length !== 8 || p.limbs.some(l=>l.length!==6)) throw new Error('Skiff requires eight six-segment limbs');
  if (![...p.head,...p.limbs.flatMap(l=>l.flat())].every(Number.isFinite)) throw new Error('Pose has non-finite coordinate');
}
export function interpolate(from: Pose, to: Pose, progress: number): Pose {
  validatePose(from); validatePose(to);
  const t = Math.min(1,Math.max(0, Number.isFinite(progress) ? progress : 0));
  const mix = (a: Point,b:Point): Point => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  return {head:mix(from.head,to.head),limbs:from.limbs.map((l,i)=>l.map((s,j)=>mix(s,to.limbs[i]![j]!))),face:t<0.5?from.face:to.face};
}
/** Every limb travels as a six-segment articulated wave, rather than a rigid arm.
 *  Sampling is clock-independent, reproducible and quantized to twelve steps/sec.
 *  Headward segments stay close to their original anchor, while later squares
 *  receive delayed displacement. Rectangles remain axis aligned at all times.
 */
export function samplePose(name:PoseName,seconds=0,motion=true):Pose {
  if(!Object.hasOwn(poses,name))throw new Error('Unknown Skiff pose');
  const base=poses[name];
  if(!motion)return base;
  const time=Math.floor(Math.max(0,Number.isFinite(seconds)?seconds:0)*12)/12;
  const tau=Math.PI*2;
  const wave=(rate:number,delay=0)=>Math.sin(tau*rate*time-delay);
  let headBob=.1*wave(.16);
  const moving=base.limbs.map((limb,i)=>limb.map(([x,y],j):Point=>{
    const reach=Math.pow(j/5,1.55);  // proximal joint nearly fixed
    const delay=j*.16;               // wave arrives later at the tip
    const small=.07*reach*wave(.18,i*.8+delay);
    let dx=small,dy=.025*reach*wave(.2,i*.9+delay);
    switch(name){
      case 'greet':
        if(i===1){dx+=reach*1.15*wave(.65,delay);dy-=reach*(.25+.2*wave(.65,delay+.8));}
        if(i===0){dx-=reach*.28*wave(.65,delay+.4);dy+=reach*.12*wave(.65,delay);}
        break;
      case 'wave':
        if(i===1){dx+=reach*2.15*wave(.95,delay);dy+=reach*.38*wave(.95,delay+Math.PI/2);}
        if(i===0||i===2){dx-=reach*.36*wave(.95,delay+.5);dy+=reach*.13*wave(.95,delay);}
        if(i===6){dy+=reach*.1*wave(.45,delay);}
        break;
      case 'listen':
        if(i===2){dx+=reach*.75*wave(.55,delay);dy-=reach*(.45+.32*wave(.55,delay+.6));}
        if(i===7){dx-=reach*.5*wave(.55,delay+1);dy-=reach*.24*wave(.55,delay);}
        if(i===4||i===5){dy+=reach*.12*wave(.4,delay+i);}
        break;
      case 'ponder':
        if(i===4){dx-=reach*(.45+.75*wave(.43,delay));dy-=reach*.45*wave(.43,delay+.8);}
        if(i===5){dx+=reach*.34*wave(.43,delay+1);dy-=reach*.26*wave(.43,delay+.5);}
        if(i===1){dy+=reach*.13*wave(.43,delay+.4);}
        break;
      case 'present':
        if(i===2){dx+=reach*(.55+.55*wave(.55,delay));dy-=reach*.22*wave(.55,delay);}
        if(i===3){dx+=reach*.35*wave(.55,delay+.9);dy-=reach*.14*wave(.55,delay);}
        if(i===7){dx-=reach*.3*wave(.55,delay);}
        break;
      case 'celebrate':
        if([0,1,3,4,5,6].includes(i)){
          const offset=(i%2)*Math.PI*.65;
          dy-=reach*(.55+.72*wave(1.15,delay+offset));
          dx+=(i===0||i===5||i===6?-1:1)*reach*.48*wave(1.15,delay+offset+.5);
        }
        if(i===2||i===7){dy-=reach*.35*wave(1.15,delay+i);}
        break;
      case 'idle':
        // Gentle micro-sway only, with no expressive choreography.
        break;
    }
    return [x+dx,y+dy];
  }));
  if(name==='listen')headBob=.08*wave(.4);
  if(name==='ponder')headBob=.07*wave(.32);
  if(name==='celebrate')headBob=-.25-.38*wave(1.15);
  const tick=Math.floor(time*12);
  let expression=base.face;
  if(tick%79===42||tick%79===43)expression='blink';
  else if(name==='celebrate'&&wave(1.15)>.85)expression='surprised';
  return {head:[base.head[0],base.head[1]+headBob],limbs:moving,face:expression};
}
/** Smooth, clamped, pure transition of all 48 persistent segment identities. */
export function sampleTransition(from:Pose,to:Pose,progress:number):Pose {
  const t=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
  return interpolate(from,to,t*t*(3-2*t));
}
/** Keep the established eight-unit pose grid; only the rendered head is 30% smaller. */
export const SKIFF_HEAD_SCALE = 0.7;
const HEAD_UNITS = 8;
const HEAD_INSET = HEAD_UNITS * (1-SKIFF_HEAD_SCALE) / 2;
const fmt = (n:number): string => Number(n.toFixed(3)).toString();
const esc = (s:string): string => s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const rect=(x:number,y:number,w:number,h:number,fill:string,stroke?:string,sw=0):string=>`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${esc(fill)}"${stroke?` stroke="${esc(stroke)}" stroke-width="${fmt(sw)}"`:''}/>`;
/** A pure SVG renderer; its output depends only on Frame. No DOM or image assets required. */
export function renderSvg(frame: Frame): string {
  validatePose(frame.pose);
  const colors=palettes[frame.palette];
  if (!colors) throw new Error('Unknown Skiff palette');
  const [hx,hy]=frame.pose.head;
  const output: string[] = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="-9 -7 30 29" role="img" aria-label="Skiff pixel octopus">'];
  frame.pose.limbs.forEach((limb,li)=>{
    output.push(`<g id="skiff-limb-${li}">`);
    limb.forEach(([x,y],si)=>{
      let color=si<2?colors.dark:si<4?colors.mid:si===4?colors.light:colors.tip;
      if (frame.pulse!=='none' && Math.floor(frame.phase*12)%6 === (frame.pulse==='inward'?5-si:si)) color=colors.tip;
      // Re-anchor the proximal squares to the smaller head while preserving
      // the six segment identities and every distal tip position.
      const weight=(1-SKIFF_HEAD_SCALE)*(1-si/5);
      const sx=x+(hx+HEAD_UNITS/2-(x+.5))*weight;
      const sy=y+(hy+HEAD_UNITS/2-(y+.5))*weight;
      output.push(`<g id="skiff-limb-${li}-segment-${si}">${rect(sx,sy,1,1,color,colors.outline,.09)}</g>`);
    });
    output.push('</g>');
  });
  // Scale the head and all face features together, around the original centre.
  // Tentacle squares remain 1 x 1 logical units and never rotate.
  const px=(x:number)=>hx+HEAD_INSET+x*SKIFF_HEAD_SCALE;
  const py=(y:number)=>hy+HEAD_INSET+y*SKIFF_HEAD_SCALE;
  const dim=(size:number)=>size*SKIFF_HEAD_SCALE;
  output.push('<g id="skiff-head">',rect(px(0),py(0),dim(8),dim(8),colors.body,colors.outline,dim(.15)));
  const eye=(x:number)=>{
    const y=2.2;
    if(frame.pose.face==='blink'||frame.pose.face==='sleeping'||frame.pose.face==='happy')
      return rect(px(x),py(y+.9),dim(1.5),dim(.28),colors.eye);
    const focused=frame.pose.face==='focused';
    const surprised=frame.pose.face==='surprised';
    const height=focused?1.05:surprised?1.9:frame.pose.face==='concerned'?1.35:1.65;
    const offset=focused?.4:surprised?-.18:0;
    const width=surprised?1.7:1.55;
    return rect(px(x),py(y+offset),dim(width),dim(height),colors.eye)
      +rect(px(x+.25),py(y+offset+.2),dim(.42),dim(.42),'#f8ffff')
      +rect(px(x+1.02),py(y+offset+height-.47),dim(.25),dim(.25),colors.light);
  };
  output.push(`<g id="skiff-eye-left">${eye(1.35)}</g>`,`<g id="skiff-eye-right">${eye(5.1)}</g>`);
  const mouth=():string=>{
    const pixel=(x:number,y:number)=>rect(px(x),py(y),dim(.32),dim(.32),colors.eye);
    switch(frame.pose.face){
      case 'sleeping':return pixel(3.42,5.7)+pixel(3.9,5.7);
      case 'focused':return pixel(3.35,5.67)+pixel(3.85,5.67)+pixel(4.35,5.67);
      case 'concerned':return pixel(3.1,5.95)+pixel(3.78,5.62)+pixel(4.46,5.95);
      case 'surprised':return pixel(3.65,5.35)+pixel(4.05,5.35)+pixel(3.65,5.75)+pixel(4.05,5.75);
      default:return pixel(3.1,5.55)+pixel(3.78,5.87)+pixel(4.46,5.55);
    }
  };
  output.push(`<g id="skiff-mouth">${mouth()}</g>`,'</g>','</svg>');
  return output.join('');
}
/** Host applications report factual state separately from expressive mood. */
export type SkiffState='idle'|'ready'|'receiving'|'thinking'|'working'|'output-ready'|'waiting'|'connection-interrupted'|'warning'|'error'|'sleeping';
export type SkiffMood='neutral'|'curious'|'pleased'|'excited'|'focused'|'cautious'|'concerned'|'puzzled';
export interface Presentation { readonly pose:PoseName; readonly face:Face; readonly pulse:Frame['pulse']; }
const statePresets:Readonly<Record<SkiffState,Presentation>>={
  idle:{pose:'idle',face:'open',pulse:'none'},
  ready:{pose:'greet',face:'happy',pulse:'outward'},
  receiving:{pose:'listen',face:'focused',pulse:'inward'},
  thinking:{pose:'ponder',face:'focused',pulse:'none'},
  working:{pose:'ponder',face:'focused',pulse:'inward'},
  'output-ready':{pose:'present',face:'happy',pulse:'outward'},
  waiting:{pose:'listen',face:'open',pulse:'none'},
  'connection-interrupted':{pose:'ponder',face:'concerned',pulse:'none'},
  warning:{pose:'listen',face:'concerned',pulse:'none'},
  error:{pose:'idle',face:'concerned',pulse:'none'},
  sleeping:{pose:'idle',face:'sleeping',pulse:'none'}
};
const moodFaces:Readonly<Record<SkiffMood,Face>>={
  neutral:'open',curious:'open',pleased:'happy',excited:'surprised',
  focused:'focused',cautious:'focused',concerned:'concerned',puzzled:'focused'
};
/** Critical factual conditions override cosmetic moods and manual faces. */
export function semanticPresentation(state:SkiffState,mood:SkiffMood='neutral'):Presentation {
  if(!Object.hasOwn(statePresets,state))throw new Error('Unknown Skiff state');
  if(!Object.hasOwn(moodFaces,mood))throw new Error('Unknown Skiff mood');
  const result=statePresets[state];
  const critical=['connection-interrupted','warning','error','sleeping'].includes(state);
  return {...result,face:critical||mood==='neutral'?result.face:moodFaces[mood]};
}
export const skiffStates:readonly SkiffState[]=Object.freeze(Object.keys(statePresets) as SkiffState[]);
export const skiffMoods:readonly SkiffMood[]=Object.freeze(Object.keys(moodFaces) as SkiffMood[]);
export interface SkiffOptions { palette?:PaletteName; reducedMotion?:boolean|'auto'; }
export interface TransitionOptions { duration?:number; }
/** Uses one RAF loop and exposes a semantic boundary for host-welcome. */
export function createSkiff(container:Element,options:SkiffOptions={}) {
  let palette:PaletteName=options.palette??'blue';
  let name:PoseName='idle',faceOverride:Face|null=null,pulse:Frame['pulse']='none';
  let state:SkiffState|null=null,mood:SkiffMood='neutral';
  let enabled=true,destroyed=false,running=false,handle=0,origin:number|null=null;
  let lastSeconds=0,poseStart=0;
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
    if(destroyed)return;
    lastSeconds=Number.isFinite(time)?Math.max(0,time):0;
    const pose=poseAt(lastSeconds);
    const presentation=state===null?null:semanticPresentation(state,mood);
    const critical=state!==null&&['connection-interrupted','warning','error','sleeping'].includes(state);
    const shownFace=critical?presentation!.face:faceOverride??(pose.face==='blink'?'blink':presentation?.face??pose.face);
    const visual={...pose,face:shownFace};
    container.innerHTML=renderSvg({pose:visual,palette,pulse:hasMotion()?pulse:'none',phase:lastSeconds});
  };
  const loop=(now:number)=>{
    if(!running||destroyed)return;
    if(origin===null)origin=now-lastSeconds*1000;
    draw((now-origin)/1000);
    handle=win?.requestAnimationFrame(loop)??0;
  };
  const start=()=>{if(!destroyed&&!running&&hasMotion()&&win){running=true;handle=win.requestAnimationFrame(loop);}};
  const stop=()=>{running=false;if(win&&handle)win.cancelAnimationFrame(handle);handle=0;};
  const changePose=(next:PoseName,settings:TransitionOptions={})=>{
    if(!Object.hasOwn(poses,next))throw new Error('Unknown Skiff pose');
    const ms=settings.duration??420;
    if(!Number.isFinite(ms)||ms<0)throw new RangeError('Transition duration must be finite and nonnegative');
    const from=poseAt(lastSeconds);
    name=next;poseStart=lastSeconds;
    transition=hasMotion()&&ms>0?{from,start:lastSeconds,duration:ms/1000}:null;
    draw();
  };
  const transitionTo=(next:PoseName,settings:TransitionOptions={})=>{
    // Switching to a manual pose intentionally exits semantic state control.
    const leavingState=state!==null;
    state=null;
    if(leavingState)pulse='none';
    changePose(next,settings);
  };
  draw();start();
  return {
    setPose(next:PoseName){transitionTo(next);},
    transitionTo,
    replay(){const from=poses.idle;poseStart=lastSeconds;
      transition=hasMotion()?{from,start:lastSeconds,duration:.42}:null;draw();},
    setState(next:SkiffState){
      const preset=semanticPresentation(next,mood); // validate before changing state
      state=next;faceOverride=null;pulse=preset.pulse;changePose(preset.pose);
    },
    getState(){return state;},
    setMood(next:SkiffMood){
      if(!Object.hasOwn(moodFaces,next))throw new Error('Unknown Skiff mood');
      mood=next;draw();
    },
    setExpression(next:Face|null){
      if(next!==null&&!['open','happy','blink','focused','concerned','sleeping','surprised'].includes(next))throw new Error('Unknown Skiff face');
      faceOverride=next;draw();
    },
    setColor(next:PaletteName){if(!Object.hasOwn(palettes,next))throw new Error('Unknown palette');palette=next;draw();},
    pulse(next:Frame['pulse']){if(!['none','inward','outward'].includes(next))throw new Error('Unknown pulse');pulse=next;draw();},
    setMotionEnabled(value:boolean){enabled=Boolean(value);if(!hasMotion()){
      stop();transition=null;draw();
    }else{draw();start();}},
    renderAt(seconds:number){draw(seconds);},
    destroy(){destroyed=true;stop();container.innerHTML='';}
  };
}