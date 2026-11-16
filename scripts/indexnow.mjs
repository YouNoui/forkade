import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const config=JSON.parse(await readFile(new URL('./search-config.json',import.meta.url),'utf8'));
export function sitemapUrls(xml,site=config.site){return [...new Set([...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].trim().replaceAll('&amp;','&')).filter(value=>{try{const u=new URL(value);return u.origin===site&&!u.username&&!u.password}catch{return false}}))]}
export async function notify(fetcher=fetch){
 try{
  const options={signal:AbortSignal.timeout(20000)};
  const keyResponse=await fetcher(`${config.site}/${config.key}.txt`,options);
  if(!keyResponse.ok||(await keyResponse.text()).trim()!==config.key)throw Error('Public ownership key not ready');
  const r=await fetcher(`${config.site}/sitemap.xml`,{signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error(`Sitemap HTTP ${r.status}`);
  const xml=await r.text();if(!xml.includes('<urlset'))throw Error('Expected URL sitemap');
  const urls=sitemapUrls(xml);if(!urls.length)throw Error('Empty sitemap');
  for(let i=0;i<urls.length;i+=10000){const response=await fetcher('https://api.indexnow.org/indexnow',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({host:new URL(config.site).hostname,key:config.key,keyLocation:`${config.site}/${config.key}.txt`,urlList:urls.slice(i,i+10000)}),signal:AbortSignal.timeout(20000)});console.log(`IndexNow: ${urls.slice(i,i+10000).length} URLs; HTTP ${response.status}`)}
 }catch(error){console.log(`IndexNow: skipped (${error.message}); deployment remains successful`)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await notify();
