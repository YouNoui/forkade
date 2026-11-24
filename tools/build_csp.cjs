// Hash the exact shipped inline scripts; no wildcard inline script permission.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function build(){const hashes=new Set();for(const file of files(path.join(root,'web')).filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\bsrc\s*=/.test(m[1])||/application\/ld\+json/.test(m[1]))continue;hashes.add("'sha256-"+crypto.createHash('sha256').update(m[2]).digest('base64')+"'");}}
 const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));for(const rule of config.headers)for(const h of rule.headers)if(h.key==='Content-Security-Policy')h.value=h.value.replace(/script-src [^;]+/,"script-src 'self' "+[...hashes].sort().join(' ')+(rule.source.includes('playground')?" 'unsafe-eval'":" 'wasm-unsafe-eval'"));
 config.headers=config.headers.filter(r=>!['/admin(\\.html)?','/stats(\\.html)?'].includes(r.source));
 for(const source of ['/admin','/admin.html','/stats','/stats.html'])if(!config.headers.some(r=>r.source===source&&r.headers.some(h=>h.key==='X-Robots-Tag')))config.headers.push({source,headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]});
 if(!config.redirects.some(r=>r.source==='/stats'))config.redirects.push({source:'/stats',destination:'/admin',permanent:false});
 return JSON.stringify(config,null,2)+'\n';}
if(require.main===module){const result=build();if(process.argv.includes('--check')){if(fs.readFileSync(path.join(root,'vercel.json'),'utf8').replace(/\r\n/g,'\n')!==result)throw Error('Run node tools/build_csp.cjs after building all bundles.');console.log('CSP hashes match shipped scripts.');}else{fs.writeFileSync(path.join(root,'vercel.json'),result);console.log('Built script hashes and private-page robots headers.');}}
module.exports={build,files};
