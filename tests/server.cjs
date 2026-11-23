const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {Redis}=require('./redis.cjs');
const HEADERS=(JSON.parse(fs.readFileSync(path.resolve(__dirname,'..','vercel.json'),'utf8')).headers||[])
  .map(r=>({re:new RegExp('^'+r.source.replace(/\(\.\*\)/g,'.*').replace(/\./g,'\\.').replace(/\\\.\*/g,'.*')+'$'),headers:r.headers}));
function server(){const db=new Redis();const restore=db.install();process.env.STATS_KEY='owner-test';
 const root=path.resolve(__dirname,'..'),types={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.webmanifest':'application/manifest+json'};
 const app=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),p=url.pathname;
  if(p.startsWith('/api/')){let data='';for await(const x of req)data+=x;try{req.body=JSON.parse(data||'{}');}catch{req.body={};}
    const fn=p==='/api/leaderboard'?require('../api/leaderboard'):require('../api/stats');return fn(req,res);}
  let file=p.startsWith('/dist/')?path.join(root,p):path.join(root,'web',p);
  if(!file.startsWith(root)){res.writeHead(403);return res.end();}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){const entry=path.join(root,'web','entries',p+'.html');file=fs.existsSync(entry)?entry:path.join(root,'web','index.html');}
  // same security headers as production (vercel.json), applied in order so later rules win
  for(const rule of HEADERS) if(rule.re.test(p)) for(const h of rule.headers) res.setHeader(h.key,h.value);
  res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));
 });return {app,db,restore};}
if(require.main===module){server().app.listen(8089,'127.0.0.1');console.log('Forkade test server :8089');}
module.exports=server;
