import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const index=read('dist/index.js');
const presenter=read('dist/presenter.js');
const controller=read('demo/host-welcome-controller.mjs');
const template=read('demo/host-welcome.html');
function standalone(code){
  const result=code
    .replace(/^\s*import\s+[^;\n]*;?\s*$/gm,'')
    .replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm,'')
    .replace(/^\s*export\s+(?=(?:const|function|class)\b)/gm,'');
  if(/^\s*(?:import|export)\b/m.test(result))throw new Error('ES module syntax remains in offline demo');
  if(/<\/script/i.test(result))throw new Error('Unexpected inline closing script tag');
  return result;
}
const block=template.match(/<script\s+type="module">([\s\S]*?)<\/script>/i);
if(!block)throw new Error('Expected one module script in demo template');
const app=standalone(block[1]);
const combined=[index,presenter,controller,app].map(standalone).join('\n;\n');
const html=template.replace(block[0],'<script>\n'+combined+'\n<\/script>');
if(/<script[^>]*\bsrc=|<script[^>]*\btype="module"|<link[^>]*\bhref=/i.test(html))throw new Error('Offline HTML has external dependencies');
mkdirSync(resolve(root,'docs'),{recursive:true});
writeFileSync(resolve(root,'docs/host-welcome-demo.html'),html);
console.log('Wrote docs/host-welcome-demo.html (self-contained, offline, simulated)');
