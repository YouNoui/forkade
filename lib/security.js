'use strict';
const crypto=require('node:crypto'),{isIP}=require('node:net');
// Vercel overwrites these edge headers. Never trust client-supplied X-Forwarded-For.
function ip(req){return require('./trusted-ip.cjs').trustedIP(req.headers,'vercel',isIP,req.socket?.remoteAddress||'unknown');}
function hash(req,purpose){const salt=process.env.PROMO_SALT||process.env.STATS_KEY||process.env.KV_REST_API_TOKEN;if(!salt)throw Error('Security storage unavailable');return crypto.createHmac('sha256',salt).update(purpose+'\0'+ip(req)).digest('hex');}
function ownerOk(value){const wanted=process.env.STATS_KEY;if(!wanted||typeof value!=='string'||value.length>4096)return false;const a=Buffer.from(value),b=Buffer.from(wanted);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
const RATE="-- forkade-security-rate-v1\nlocal n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],tonumber(ARGV[1])) end; return n";
async function owner(req,R){if(ownerOk(req.headers['x-stats-key']))return 200;if(!R)return 503;const[n]=await R([['EVAL',RATE,'1','owner:fail:'+hash(req,'owner'), '600']]);return n>5?429:401;}
async function body(req,max){let raw;if(req.body!==undefined){raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);}else{raw='';let bytes=0;for await(const c of req){bytes+=Buffer.byteLength(c);if(bytes>max)throw Object.assign(Error('Request too large.'),{status:413});raw+=c;}}if(Buffer.byteLength(raw||'')>max)throw Object.assign(Error('Request too large.'),{status:413});let b;try{b=JSON.parse(raw||'{}');}catch{throw Object.assign(Error('Invalid JSON.'),{status:400});}if(!b||typeof b!=='object'||Array.isArray(b))throw Object.assign(Error('Invalid request.'),{status:400});return b;}
const integer=(n,min,max)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
module.exports={ip,hash,ownerOk,owner,body,integer,RATE};
