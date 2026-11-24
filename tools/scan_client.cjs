// Report locations and rule names only, never matched credentials.
const fs=require('node:fs'),path=require('node:path'),{files}=require('./build_csp.cjs');
function entropy(s){const counts={};for(const c of s)counts[c]=(counts[c]||0)+1;return Object.values(counts).reduce((n,c)=>n-c/s.length*Math.log2(c/s.length),0);}
function scan(text){const issues=[];if(/(?:KV_REST_API_(?:URL|TOKEN)|UPSTASH_REDIS_REST_(?:URL|TOKEN)|STATS_KEY|PROMO_SALT|CLOUDFLARE_API_TOKEN)/.test(text))issues.push('server configuration name');
 if(/https?:\/\/[a-z0-9.-]+\.upstash\.io\b|(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{15,2048}\.[A-Za-z0-9_-]{15,2048}\.[A-Za-z0-9_-]{15,2048})/.test(text))issues.push('credential signature');
 // Quoted token-like literals only: generated media blobs, shader text and public hashes are not secrets.
 for(const m of text.matchAll(/["']([A-Za-z0-9_+\/=.-]{32,160})["']/g)){const v=m[1];if((/^[a-f0-9]{64}$/i.test(v)&&/"sha256"\s*:\s*$/.test(text.slice(Math.max(0,m.index-24),m.index)))||/^(?:sha256-|[.\/])/.test(v)||v.includes('.')||v==='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/')continue;if((/^[a-f0-9]{32,128}$/i.test(v)&&entropy(v)>3.4)||(entropy(v)>4.5&&/[A-Z]/.test(v)&&/[a-z]/.test(v)&&/[0-9]/.test(v)))issues.push('high-entropy token literal');}
 return [...new Set(issues)];}
function all(root=path.resolve(__dirname,'../web')){const result=[];for(const file of files(root).filter(f=>/\.(?:html|js|css|json|map|md|txt|webmanifest)$/.test(f)))for(const rule of scan(fs.readFileSync(file,'utf8')))result.push({file:path.relative(root,file),rule});return result;}
if(require.main===module){const found=all();if(found.length){console.error(JSON.stringify(found));process.exitCode=1;}else console.log('Built client secret scan passed.');}
module.exports={scan,all};
