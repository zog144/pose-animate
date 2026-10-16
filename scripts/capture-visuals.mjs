/** Recreate inspectable baseline SVGs and optionally PNG screenshots.
 * SVG hash comparison is the deterministic regression gate; PNGs are review artifacts.
 */
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {semanticPresentation,samplePose,renderSvg} from '../dist/index.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'visual-output');
mkdirSync(out,{recursive:true});
const states=['idle','thinking','working','connection-interrupted','recovering'];
let chrome=process.argv.includes('--png') ? process.env.CHROME_BIN||null : null;
if(process.argv.includes('--png') && !chrome){
 for(const executable of ['google-chrome','chromium','chromium-browser']){
  try{execFileSync('which',[executable],{stdio:'ignore'});chrome=executable;break;}catch{}
 }
}
for(const state of states){
 const preset=semanticPresentation(state,'neutral');
 const p={...samplePose(preset.pose,0,false),face:preset.face};
 const svg=renderSvg({pose:p,palette:'blue',pulse:preset.pulse,phase:.25});
 writeFileSync(resolve(out,state+'.svg'),svg+'\n');
 const doc=`<!doctype html><html lang="en"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:640px;height:640px;display:grid;place-items:center;background:#f0fbff}svg{width:560px;height:560px}</style>${svg}</html>`;
 const htmlFile=resolve(out,state+'.html');
 writeFileSync(htmlFile,doc);
 if(chrome){
  try{
   execFileSync(chrome,['--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars','--disable-background-networking','--force-device-scale-factor=1','--window-size=640,640','--screenshot='+resolve(out,state+'.png'),pathToFileURL(htmlFile).href],{timeout:8000,stdio:'ignore'});
   console.log('Captured '+state+'.png');
  }catch(error){console.warn('PNG capture unavailable for '+state+': '+error.message)}
 }
}
console.log('Visual review artifacts: '+out);
