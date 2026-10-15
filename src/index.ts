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
export function samplePose(name:PoseName,seconds=0,motion=true):Pose {
 const base=poses[name];if(!base)throw new Error('Unknown pose');
 if(!motion)return base;
 const tick=Math.floor(Math.max(0,seconds)*12);
 const bob=Math.sin(tick/12*Math.PI/3)*.12;
 const moving=base.limbs.map((l,i)=>l.map(([x,y],j):Point=>[x+Math.sin(tick/18+i*1.7)*.13*j/5,y]));
 return {head:[base.head[0],base.head[1]+bob],limbs:moving,face:tick%79<2?'blink':base.face};
}
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
   result.push('<g id="skiff-limb-'+i+'-segment-'+j+'">'+rect(x,y,1,1,color,c.outline,.09)+'</g>');
  });
  result.push('</g>');
 });
 result.push('<g id="skiff-head">',rect(hx,hy,8,8,c.body,c.outline,.15));
 const eye=(x:number):string=>{
  const y=hy+2.2;
  if(['happy','blink','sleeping'].includes(frame.pose.face))return rect(hx+x,y+.9,1.5,.28,c.eye);
  const height=frame.pose.face==='concerned'?1.35:1.65;
  return rect(hx+x,y,1.55,height,c.eye)+rect(hx+x+.25,y+.2,.42,.42,'#f8ffff')+rect(hx+x+.98,y+.99,.25,.25,c.light);
 };
 result.push('<g id="skiff-eye-left">'+eye(1.35)+'</g>','<g id="skiff-eye-right">'+eye(5.1)+'</g>');
 result.push('<g id="skiff-mouth">'+rect(hx+3.1,hy+5.55,.32,.32,c.eye)+rect(hx+3.78,hy+5.87,.32,.32,c.eye)+rect(hx+4.46,hy+5.55,.32,.32,c.eye)+'</g></g></svg>');
 return result.join('');
}
export interface SkiffOptions { palette?:PaletteName; reducedMotion?:boolean|'auto'; }
/** Browser adapter: only touches its supplied container. */
export function createSkiff(container:Element,options:SkiffOptions={}) {
 let palette=options.palette??'blue',name:PoseName='idle',face:Face|null=null,pulse:Frame['pulse']='none';
 const win=container.ownerDocument.defaultView;
 const reduced=options.reducedMotion===undefined||options.reducedMotion==='auto'?
 Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches):options.reducedMotion;
 let active=false,handle=0,origin=0;
 const draw=(time=0)=>{const p=samplePose(name,time,!reduced);container.innerHTML=renderSvg({pose:face?{...p,face}:p,palette,pulse,phase:time});};
 const loop=(now:number)=>{if(!active)return;if(!origin)origin=now;draw((now-origin)/1000);handle=win?.requestAnimationFrame(loop)??0;};
 draw();if(win&&!reduced){active=true;handle=win.requestAnimationFrame(loop);}
 return {
  setPose(value:PoseName){if(!(value in poses))throw new Error('Unknown pose');name=value;draw();},
  setExpression(value:Face|null){face=value;draw();},
  setColor(value:PaletteName){if(!(value in palettes))throw new Error('Unknown palette');palette=value;draw();},
  pulse(value:Frame['pulse']){pulse=value;draw();},
  renderAt(seconds:number){draw(seconds);},
  destroy(){active=false;if(win)win.cancelAnimationFrame(handle);container.innerHTML='';}
 };
}
