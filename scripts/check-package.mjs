/** Fail-closed local npm-package inventory audit. Does not publish or create a git tag. */
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const meta=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
if(meta.license!=='BSD-3-Clause OR GPL-3.0-only')throw Error('Zog dual-license metadata missing');
if(meta.private!==true)throw Error('Release candidate must remain private until approval');
if(!meta.exports?.['./presenter']?.types || !meta.exports?.['.']?.types)throw Error('Missing typed entrypoints');
const raw=execFileSync('npm',['pack','--dry-run','--ignore-scripts','--json'],{encoding:'utf8'});
const output=JSON.parse(raw)[0];
const files=new Set(output.files.map(x=>x.path));
const required=['dist/index.js','dist/index.d.ts','dist/presenter.js','dist/presenter.d.ts','LICENSE',
 'LICENSES/BSD-3-Clause.txt','LICENSES/GPL-3.0-only.txt','THIRD-PARTY-NOTICES.md',
 'docs/INTEGRATION.md','docs/VISUAL_BASELINES.md','docs/BROWSER_COMPATIBILITY.md','docs/RELEASE_CHECKLIST.md','README.md'];
for(const item of required)if(!files.has(item))throw Error('Package missing '+item);
for(const item of files)if(/^(?:tests|demo|scripts|playground|visual-output|node_modules|\.github|src)\//.test(item))throw Error('Development-only path in package: '+item);
console.log('Package inventory OK:',output.filename,'files:',files.size,'size:',output.size);
