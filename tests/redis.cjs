// Deliberately small Redis test double; exercises the real HTTP handlers without production data.
class Redis {
  constructor(){this.data=new Map();this.expiry=new Map();}
  get(k){if(this.expiry.has(k)&&this.expiry.get(k)<=Date.now()){this.data.delete(k);this.expiry.delete(k);}return this.data.get(k);}
  run(c){let [op,k,...a]=c; op=op.toUpperCase();let v=this.get(k);
    const map=()=>{if(!v){v=new Map();this.data.set(k,v);}return v;};
    switch(op){
      case 'GET':return v??null;
      case 'SET':if(a.includes('NX')&&v!==undefined)return null;this.data.set(k,a[0]);if(a.includes('EX'))this.expiry.set(k,Date.now()+Number(a[a.indexOf('EX')+1])*1000);return 'OK';
      case 'DEL':return this.data.delete(k)?1:0;
      case 'EXPIRE':this.expiry.set(k,Date.now()+Number(a[0])*1000);return 1;
      case 'EXPIREAT':this.expiry.set(k,Number(a[0])*1000);return 1;
      case 'INCR':this.data.set(k,Number(v||0)+1);return this.data.get(k);
      case 'HSET':map().set(a[0],a[1]);return 1;
      case 'HDEL':return v?.delete(a[0])?1:0;
      case 'HMGET':return a.map(x=>v?.get(x)??null);
      case 'HGETALL':return v?[...v].flat():[];
      case 'HLEN':return v?.size||0;
      case 'HINCRBY':map().set(a[0],Number(v.get(a[0])||0)+Number(a[1]));return v.get(a[0]);
      case 'SADD':case 'PFADD':if(!v){v=new Set();this.data.set(k,v);}const n=v.size;v.add(a[0]);return v.size-n;
      case 'SCARD':case 'PFCOUNT':return v?.size||0;
      case 'SREM':return v?.delete(a[0])?1:0;
      case 'SISMEMBER':return v?.has(a[0])?1:0;
      case 'SMISMEMBER':return a.map(x=>v?.has(x)?1:0);
      case 'ZADD':{const [score,id]=a.slice(-2);map();if(!a.includes('GT')||!v.has(id)||Number(score)>v.get(id))v.set(id,Number(score));return 1;}
      case 'ZCOUNT':return [...(v?.values()||[])].filter(n=>a[1].startsWith('(')?n<Number(a[1].slice(1)):n<=Number(a[1])).length;
      case 'ZCARD':return v?.size||0;
      case 'ZSCORE':return v?.get(a[0])??null;
      case 'ZREM':return v?.delete(a[0])?1:0;
      case 'ZREVRANK':{const i=[...(v||[])].sort((x,y)=>y[1]-x[1]).findIndex(x=>x[0]===a[0]);return i<0?null:i;}
      case 'ZRANGE':{let rows=[...(v||[])].sort((x,y)=>a.includes('REV')?y[1]-x[1]:x[1]-y[1]);rows=rows.slice(Number(a[0]),Number(a[1])<0?undefined:Number(a[1])+1);return a.includes('WITHSCORES')?rows.flatMap(([id,n])=>[id,String(n)]):rows.map(x=>x[0]);}
      case 'ZREMRANGEBYSCORE':if(v)for(const [id,n]of v)if(n<=Number(a[1]))v.delete(id);return 1;
      case 'EVAL':{const key=a[1],raw=this.get(key);if(!raw)return null;const r=JSON.parse(raw);if(r.game!==a[3])return null;this.data.delete(key);return raw;}
      default:throw Error('Unsupported Redis command '+op);
    }
  }
  install(){process.env.KV_REST_API_URL='https://redis.test';process.env.KV_REST_API_TOKEN='test-only';const original=global.fetch;
    global.fetch=async(url,opts)=>String(url).startsWith('https://redis.test')?new Response(JSON.stringify(JSON.parse(opts.body).map(c=>({result:this.run(c)})))):original(url,opts);
    return ()=>{global.fetch=original;};
  }
}
function request(handler,method,body={},url='/api/leaderboard',headers={}){
  return new Promise((resolve,reject)=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(raw){resolve({status:this.statusCode,headers:this.headers,body:raw?JSON.parse(raw):null});}};
    Promise.resolve(handler({method,body,url,headers},res)).catch(reject);});
}
module.exports={Redis,request};
