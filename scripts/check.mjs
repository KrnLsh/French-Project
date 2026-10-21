import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist'),html=await fs.readFile(path.join(root,'index.html'),'utf8');
const inspected=new Set();
async function localFile(reference,base=root){
  if(/^(?:[a-z][a-z\d+.-]*:|#)/i.test(reference))return null;
  const clean=decodeURIComponent(reference.split(/[?#]/)[0]);
  if(clean.startsWith('#'))return null;
  const file=path.resolve(base,clean);
  if(file!==root&&!file.startsWith(root+path.sep))throw Error('Reference escapes dist: '+reference);
  await fs.access(file);inspected.add(file);return file;
}
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
const scripts=[],styles=[];
for(const reference of refs){
  const file=await localFile(reference);if(!file)continue;
  if(file.endsWith('.js')&&!file.includes(path.sep+'vendor'+path.sep))scripts.push(await fs.readFile(file,'utf8'));
  if(file.endsWith('.css'))styles.push(file);
}
const seenStyles=new Set();
for(let i=0;i<styles.length;i++){
  const file=styles[i];if(seenStyles.has(file))continue;seenStyles.add(file);
  const css=await fs.readFile(file,'utf8');
  for(const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)){
    const asset=await localFile(match[1],path.dirname(file));
    if(asset?.endsWith('.css'))styles.push(asset);
  }
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]),idSet=new Set(ids);
if(ids.length!==idSet.size)throw Error('Duplicate element identifiers');
for(const match of html.matchAll(/href="#([^"]+)"/g))if(!idSet.has(decodeURIComponent(match[1])))throw Error('Broken anchor: '+match[1]);
for(const match of html.matchAll(/\baria-(?:controls|labelledby|describedby)="([^"]+)"/g)){
  for(const id of match[1].split(/\s+/))if(!idSet.has(id))throw Error('Missing accessibility target: '+id);
}
const app=scripts.join('\n');
const keys=new Set([...app.matchAll(/^\s*(?:["\']([^"\']+)["\']|([\w-]+)):\s*\{\s*["\']?title["\']?:/gm)].map(match=>match[1]||match[2]));
for(const match of html.matchAll(/data-(?:inspect|preview)="([^"]+)"/g))if(!keys.has(match[1]))throw Error('Missing artifact: '+match[1]);
for(const source of scripts){
  for(const match of source.matchAll(/\bimage:\s*'([^']+)'/g))await localFile('assets/'+match[1]);
  for(const match of source.matchAll(/works:\[(.*?)\],pose:/g)){
    for(const work of match[1].matchAll(/\['([^']+)'/g))if(!keys.has(work[1]))throw Error('Missing chapter artifact: '+work[1]);
  }
}
const credits=JSON.parse(await fs.readFile(path.join(root,'assets/image-credits.json'),'utf8'));
if(credits.length<12)throw Error('Incomplete image credits');
console.log('Verified '+inspected.size+' local files, '+ids.length+' unique IDs, navigation and accessibility targets, dynamic artifacts, and '+credits.length+' image credits.');
