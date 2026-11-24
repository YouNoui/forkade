'use strict';
// Header precedence is explicit at each trusted edge; never X-Forwarded-For.
function trustedIP(headers,edge,valid,fallback='unknown'){
 const get=k=>typeof headers.get==='function'?headers.get(k):headers[k];
 for(const key of edge==='cloudflare'?['cf-connecting-ip']:['x-real-ip','x-vercel-forwarded-for']){
  const value=get(key);if(typeof value==='string'&&valid(value.trim()))return value.trim();
 }return fallback;
}
module.exports={trustedIP};
