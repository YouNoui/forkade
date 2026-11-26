const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{inlineHashes}=require('../tools/build_csp.cjs');
test('CSP includes exact decoded srcdoc scripts without trusting external or data scripts',()=>{
 const code='window.assets={label:"écho",path:"a/b"};\n',child='<script>'+code+'</script><script src="external.js"></script><script type="application/ld+json">{}</script>';
 const html='<script>window.__RUMBLE_HTML__ = '+JSON.stringify(child).replace(/<\//g,'<\\/')+';</script>';
 const hashes=inlineHashes(html);assert.equal(hashes.size,2);assert.ok(hashes.has("'sha256-"+crypto.createHash('sha256').update(code).digest('base64')+"'"));
});
