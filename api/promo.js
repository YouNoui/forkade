'use strict';
const crypto=require('node:crypto'),LB=require('./leaderboard'),Catalog=require('../web/promo-catalog');
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789', validCode=c=>typeof c==='string'&&/^[A-Z0-9]{6,16}$/.test(c);
const generate=()=>Array.from({length:8},()=>ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
// Redis Lua's cjson encodes an empty table as {}, including decoded empty arrays.
function normalizeReward(r){return {...r,skins:Array.isArray(r.skins)?r.skins:[],parts:Array.isArray(r.parts)?r.parts:[]};}
// All code changes and uses share one atomic Redis operation. Redemption sets contain
// only per-code HMACs, never device IDs, names, raw addresses or private owner notes.
const SCRIPT=`-- forkade-promo-v1
local action=ARGV[1]; local code=ARGV[2]; local raw=redis.call('HGET',KEYS[1],code)
if action=='create' then
 if raw then return cjson.encode({status=409,error='That code already exists.'}) end
 if redis.call('HLEN',KEYS[1])>=1000 then return cjson.encode({status=409,error='Limit of 1000 codes. Delete an old code first.'}) end
 redis.call('HSET',KEYS[1],code,ARGV[3]); return cjson.encode({ok=true})
end
if not raw then return cjson.encode({status=404,error="That code doesn't work"}) end
local c=cjson.decode(raw)
if action=='delete' then redis.call('HDEL',KEYS[1],code); redis.call('DEL',KEYS[2]); return cjson.encode({ok=true}) end
if action=='enable' then c.enabled=ARGV[3]=='true'; redis.call('HSET',KEYS[1],code,cjson.encode(c)); return cjson.encode({ok=true}) end
if not c.enabled then return cjson.encode({status=404,error="That code doesn't work"}) end
if c.expires>0 and tonumber(ARGV[4])>=c.expires then return cjson.encode({status=410,error='That code has expired.'}) end
local receipt={id=c.id,reward=c.reward}
if redis.call('SISMEMBER',KEYS[2],ARGV[3])==1 then return cjson.encode({status=409,error='Already redeemed on this device.',receipt=receipt}) end
if c.maxUses>0 and c.used>=c.maxUses then return cjson.encode({status=409,error='That code is used up.'}) end
c.used=c.used+1; redis.call('SADD',KEYS[2],ARGV[3]); redis.call('HSET',KEYS[1],code,cjson.encode(c))
return cjson.encode({ok=true,receipt=receipt})`;
const RATE=`-- forkade-promo-rate-v1
local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n`;
function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Stats-Key');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.end(JSON.stringify(body));}
async function body(req){if(req.body){const b=typeof req.body==='string'?JSON.parse(req.body):req.body;if(JSON.stringify(b).length>8192)throw Error('Request too large.');return b;}let raw='';for await(const c of req){raw+=c;if(raw.length>8192)throw Error('Request too large.');}return JSON.parse(raw||'{}');}
module.exports=async(req,res)=>{
  if(req.method==='OPTIONS')return send(res,204,{});if(req.method!=='POST')return send(res,405,{error:'Use POST.'});
  let b;try{b=await body(req);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();}catch{return send(res,400,{error:'Invalid request.'});}
  const owner=['create','list','enable','delete','generate'].includes(b.action);
  if(owner&&!LB.ownerOk(req.headers['x-stats-key']))return send(res,401,{error:'Wrong key.'});
  if(!owner&&b.action!=='redeem')return send(res,400,{error:'Unknown action.'});
  if(b.action==='generate')return send(res,200,{code:generate()});
  const R=LB.redis();if(!R)return send(res,503,{error:'Codes are unavailable. Try again later.'});
  try{
    if(b.action==='list'){const[flat]=await R([['HGETALL','promo:codes']]);const items=[];for(let i=1;i<flat.length;i+=2){const item=JSON.parse(flat[i]);item.reward=normalizeReward(item.reward);items.push(item);}return send(res,200,{items:items.sort((a,b)=>b.created-a.created)});}
    const code=typeof b.code==='string'?b.code.trim().toUpperCase():'';
    let arg;
    if(!owner){
      const salt=process.env.PROMO_SALT;if(!salt)return send(res,503,{error:'Codes are unavailable. Try again later.'});
      const ip=String(req.headers['x-forwarded-for']||'unknown').split(',')[0].trim();
      const hash=(type,value)=>crypto.createHmac('sha256',salt).update(type+'\0'+value).digest('hex');
      const[n]=await R([['EVAL',RATE,'1','promo:rate:'+hash('rate',ip)]]);if(n>10)return send(res,429,{error:'Too many tries. Try again in one minute.'});
      if(!/^[a-f0-9]{32}$/.test(b.device||''))return send(res,400,{error:'Device storage is unavailable. Enable local storage to redeem.'});
      arg=hash('device:'+code,b.device);
    }
    if(!validCode(code))return send(res,400,{error:owner?'Use 6–16 letters or numbers.':"That code doesn't work"});
    if(b.action==='create'){
      let reward;try{reward=Catalog.reward(b.reward);}catch(e){return send(res,400,{error:e.message});}
      if(![0,1,10,100].includes(b.maxUses))return send(res,400,{error:'Choose 1, 10, 100 or unlimited uses.'});
      const expires=b.expires??0;if(!Number.isSafeInteger(expires)||expires<0||(expires&&expires<=Date.now()))return send(res,400,{error:'Choose a future expiry in Singapore time.'});
      if(typeof b.note!=='string'||b.note.length>240)return send(res,400,{error:'Keep your private note within 240 characters.'});
      arg=JSON.stringify({id:crypto.randomUUID(),code,reward,maxUses:b.maxUses,used:0,expires,note:b.note.trim(),enabled:true,created:Date.now()});
    }else if(b.action==='enable'){if(typeof b.enabled!=='boolean')return send(res,400,{error:'Choose enabled or disabled.'});arg=String(b.enabled);}
    const[raw]=await R([['EVAL',SCRIPT,'2','promo:codes','promo:redeemed:'+code,b.action,code,arg||'',String(Date.now())]]);
    const result=JSON.parse(raw);if(result.receipt)result.receipt.reward=normalizeReward(result.receipt.reward);return send(res,result.status||200,result);
  }catch{return send(res,502,{error:'Codes are unavailable. Try again shortly.'});}
};
module.exports.generate=generate;module.exports.SCRIPT=SCRIPT;module.exports.RATE=RATE;
