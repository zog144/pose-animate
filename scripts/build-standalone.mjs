import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

// Build one HTML file with inline JavaScript and styles. It works through file://
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const compiled=readFileSync(resolve(root,'dist/index.js'),'utf8');
const template=readFileSync(resolve(root,'playground/index.html'),'utf8');
if (/^\s*import\s/m.test(compiled)) throw new Error('Runtime imports are unsupported in standalone HTML');
if (/\bexport\s+(?!(?:const|function)\b)/.test(compiled)) throw new Error('Unexpected module export');
const code=compiled.replace(/^export\s+(?=(?:const|function)\b)/gm,'');
if (/^\s*(?:import|export)\s/m.test(code)) throw new Error('ES module syntax remains');
const match=template.match(/<script\s+type=["']module["']>([\s\S]*?)<\/script>/i);
if (!match) throw new Error('Expected the module script in playground/index.html');
const setup=match[1].replace(/^import\s+\{[^}]*\}\s+from\s+['"]\.\.\/dist\/index\.js['"];?\s*$/m,'');
if (/\bimport\s+[\s\S]*?from\b/.test(setup)) throw new Error('Unexpected playground import');
const html=template.replace(match[0],'<script>\n/* Self-contained Skiff preview, compiled offline */\n'+code+'\n'+setup+'\n<\/script>')
 .replace('</head>', '<meta name="description" content="Offline Skiff animation playground"></head>');
if (/<(?:script|link)[^>]+(?:src|href)=['"]https?:/i.test(html)) throw new Error('External dependency');
mkdirSync(resolve(root,'docs'),{recursive:true});
writeFileSync(resolve(root,'docs/index.html'),html);
console.log('Wrote docs/index.html (standalone; no server needed)');
