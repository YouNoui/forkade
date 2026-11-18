const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('each game page has exactly one correct social title/image and canonical',()=>{
 for(const file of fs.readdirSync('web/entries')){const id=file.replace('.html',''),s=fs.readFileSync('web/entries/'+file,'utf8');
  for(const tag of ['og:title','og:image','og:url','twitter:card','twitter:image'])assert.equal((s.match(new RegExp('(?:property|name)="'+tag+'"','g'))||[]).length,1,id+' '+tag);
  assert.ok(s.includes('content="https://playforkade.com/og/'+id+'.png"'));
  const png=fs.readFileSync('web/og/'+id+'.png');assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 }
});
