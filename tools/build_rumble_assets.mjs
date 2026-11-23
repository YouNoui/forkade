import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,resample,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {build} from 'esbuild';
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const source=process.env.RUMBLE_SOURCE_DIR||path.join(root,'.cache/rumble-source');
const out=path.join(root,'web/assets/rumble');
await mkdir(source,{recursive:true});await mkdir(out,{recursive:true});
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const base='https://raw.githubusercontent.com/KayKit-Game-Assets/';
async function fetchFile(url,destination){try{return await readFile(destination);}catch{}const response=await fetch(url);if(!response.ok)throw Error(`${response.status}: ${url}`);const bytes=Buffer.from(await response.arrayBuffer());await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,bytes);return bytes;}
const manifest={version:1,license:'CC0-1.0',assets:{}};
async function emit(name,doc,url){for(const texture of doc.getRoot().listTextures()){const image=texture.getImage();if(image)texture.setImage(await sharp(Buffer.from(image)).resize(256,256,{fit:"inside"}).png({palette:true}).toBuffer()).setMimeType("image/png");}await doc.transform(resample(),dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));const bytes=Buffer.from(await io.writeBinary(doc));await writeFile(path.join(out,name+'.glb'),bytes);manifest.assets[name]={file:name+'.glb',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),source:url,animations:doc.getRoot().listAnimations().map(a=>a.getName())};console.log(name,bytes.length);}
const keep=new Set(['Idle','Running_A','1H_Melee_Attack_Chop','1H_Ranged_Shoot','Spellcast_Shoot','2H_Melee_Attack_Spin','Hit_A','Cheer','Death_A','Dodge_Forward']);
for(const [name,model] of Object.entries({volt:'Knight',lumen:'Mage',flick:'Rogue',mason:'Barbarian'})){
const url=base+`KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/${model}.glb`;
const file=path.join(source,model+'.glb');await fetchFile(url,file);const doc=await io.read(file);for(const animation of doc.getRoot().listAnimations())if(!keep.has(animation.getName()))animation.dispose();await emit(name,doc,url);
}
for(const model of ['Floor','Pillar_A','Box_A','Barrel_A','Primitive_Stairs']){
const url=base+`KayKit-Prototype-Bits-1.0/main/addons/kaykit_prototype_bits/Assets/gltf/${model}.gltf`;
const file=path.join(source,'prototype',model+'.gltf');const json=JSON.parse((await fetchFile(url,file)).toString());
for(const entry of [...(json.buffers||[]),...(json.images||[])])if(entry.uri&&!entry.uri.startsWith('data:'))await fetchFile(new URL(entry.uri,url),path.join(path.dirname(file),decodeURIComponent(entry.uri)));
await emit(model.toLowerCase(),await io.read(file),url);
}
await mkdir(path.join(root,'web/games3d/vendor'),{recursive:true});
const decoder=await build({stdin:{contents:"import {MeshoptDecoder} from 'meshoptimizer';globalThis.MeshoptDecoder=MeshoptDecoder;",resolveDir:root},bundle:true,minify:true,write:false,format:'iife',target:'es2020'});
const vendor=[decoder.outputFiles[0].text,await readFile(path.join(root,'node_modules/three/examples/js/loaders/GLTFLoader.js'),'utf8'),await readFile(path.join(root,'node_modules/three/examples/js/utils/SkeletonUtils.js'),'utf8')].join('\n');
const bundled=await build({stdin:{contents:vendor,resolveDir:root},minify:true,write:false,target:'es2020',legalComments:'inline'});
const notices=await Promise.all(['node_modules/meshoptimizer/LICENSE.md','node_modules/three/LICENSE'].map(file=>readFile(path.join(root,file),'utf8')));
await writeFile(path.join(root,'web/games3d/vendor/rumble-loaders.js'),'/*\n'+notices.join('\n\n').replaceAll('*/','* /')+'\n*/\n'+bundled.outputFiles[0].text);
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const total=Object.values(manifest.assets).reduce((n,a)=>n+a.bytes,0);const largestHero=Math.max(...["volt","lumen","flick","mason"].map(k=>manifest.assets[k].bytes));const worldBytes=Object.entries(manifest.assets).filter(([k])=>!["volt","lumen","flick","mason"].includes(k)).reduce((n,[,a])=>n+a.bytes,0);if(largestHero+worldBytes>2300000)throw Error("Selected hero + worlds exceed 2.3MB asset budget");
console.log('Total compressed assets:',total);
