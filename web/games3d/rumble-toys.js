/* Original procedural cast. All shapes, faces, hats and dance poses are ours. */
window.RumbleToys=(T,scene)=>{
  const box=new T.BoxGeometry(1,1,1),ball=new T.IcosahedronGeometry(1,1),cone=new T.ConeGeometry(.6,1.5,8),materials=new Map();
  const material=c=>{if(!materials.has(c))materials.set(c,new T.MeshToonMaterial({color:c}));return materials.get(c);};
  function part(g,geo,c,x,y,z,sx=1,sy=1,sz=1){const m=new T.Mesh(geo,material(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;}
  function label(text,color='#ffffff',bg='#182336'){const cv=document.createElement('canvas');cv.width=256;cv.height=96;const c=cv.getContext('2d');c.fillStyle=bg;c.beginPath();c.roundRect(3,3,250,90,25);c.fill();c.fillStyle=color;c.font='bold 32px monospace';c.textAlign='center';c.fillText(text,128,61);const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(cv),depthTest:false}));sprite.scale.set(2.8,1.05,1);return sprite;}
  function duck(g,x,y,z,size=1){const root=new T.Group();g.add(root);root.position.set(x,y,z);root.scale.setScalar(size);part(root,ball,0xffd84d,0,.35,0,.5,.35,.65);part(root,ball,0xffd84d,0,.75,.3,.32,.32,.32);part(root,box,0xff873e,0,.7,.64,.35,.12,.3);part(root,box,0x192438,.19,.82,.5,.07,.07,.07);return root;}
  function actor(index){const root=new T.Group();scene.add(root);const tint=index?0x75d8b9:0x1687e8;
    const body=part(root,box,tint,0,1.1,0,1.25,1.25,.9),head=new T.Group();head.position.y=2.1;root.add(head);
    const skull=part(head,box,tint,0,0,0,1.65,1.35,1.25),eyes=[-1,1].map(x=>{const e=new T.Group();e.position.set(x*.42,.12,.66);head.add(e);part(e,ball,0xffffff,0,0,0,.32,.38,.17);const pupil=part(e,ball,0x152238,0,0,.16,.14,.18,.08);return {root:e,pupil};});
    const brows=[-1,1].map(x=>part(head,box,0x152238,x*.42,.57,.72,.46,.10,.08)),mouth=part(head,box,0x152238,0,-.4,.68,.5,.12,.08);
    const moustache=new T.Group();head.add(moustache);for(const x of[-1,1]){const m=part(moustache,ball,0x533328,x*.25,-.23,.76,.3,.1,.1);m.rotation.z=x*.25;}
    const hat=new T.Group();hat.position.y=.85;head.add(hat);const toast=part(hat,box,0xb96d38,0,.22,0,1.65,.6,1.2);part(toast,box,0xffd19a,0,.05,0,.84,.8,.82);const traffic=part(hat,cone,0xff793b,0,.5,0);part(traffic,box,0xffffff,0,-.1,0,.6,.12,.6);
    const cape=part(root,box,0xe44d86,0,1,-.65,1.3,1.5,.08);cape.rotation.x=-.2;
    const feet=[-1,1].map(x=>part(root,box,0x253149,x*.43,.3,.1,.47,.6,.65)),arms=[-1,1].map(x=>part(root,ball,tint,x*.85,1.1,0,.25,.6,.25));
    const badge=label('#'+index,'#182336','#92ffe0');badge.position.set(0,3.7,0);badge.visible=!!index;root.add(badge);
    const bubble=label(index%2?'got you!':'me again');bubble.position.set(0,4.6,0);root.add(bubble);bubble.visible=false;
    const stars=new T.Group();root.add(stars);for(let n=0;n<3;n++){const a=n*Math.PI*2/3;part(stars,ball,0xffd84d,Math.sin(a)*1.2,3.3,Math.cos(a)*1.2,.16,.16,.16);}
    return {root,body,head,skull,eyes,brows,mouth,moustache,toast,traffic,cape,feet,arms,badge,bubble,stars,index,helpUntil:0};
  }
  function dress(a,look){const tint=a.index?(look.colour?0xc89fff:0x75d8b9):(look.colour?0xef5b39:0x1687e8);for(const m of[a.body,a.skull,...a.arms])m.material=material(tint);a.head.scale.setScalar(look.head===1?1.6:look.head===2?.55:1.1);a.body.scale.set(look.body?1.4:1.25,look.body?1:1.25,.9);a.moustache.visible=!!look.moustache;a.toast.visible=look.hat===1;a.traffic.visible=look.hat===2;a.cape.visible=!!look.cape;for(const e of a.eyes)e.root.scale.setScalar(look.visor===1?1.45:1);}
  function pose(a,p,t,still,chaos,look,victory=false){const k=still?0:Math.sin(t*.24);a.root.rotation.set(0,p.yaw,0);a.root.position.set(p.x,p.y,p.z);a.root.scale.setScalar(chaos===1?.65:1.45);a.head.scale.setScalar((look.head===1?1.6:look.head===2?.55:1.1)*(chaos===2?1.7:1));
    a.body.scale.y=(look.body?1:1.25)*(still?1:1+Math.sin(t*.2)*.035);a.feet.forEach((m,i)=>{m.rotation.x=still?0:k*(i?-1:1)*.6;});a.arms.forEach((m,i)=>m.rotation.z=still?0:k*(i?-1:1)*.15);
    const panic=!victory&&p.face==='panic',shock=p.face==='shock'||p.bonk>0;a.mouth.scale.y=panic||shock?.45:.12;a.mouth.scale.x=victory?.8:panic||shock?.3:.5;a.brows.forEach((m,i)=>m.rotation.z=(panic?-.5:.2)*(i?1:-1));a.eyes.forEach((e,i)=>{e.pupil.position.x=still?0:Math.sin(t*.09+i)*.05;e.root.scale.y=(panic||shock?1.25:1)*(look.visor?1.45:1);});
    a.stars.visible=p.bonk>0;a.stars.rotation.y=still?0:t*.12;a.cape.rotation.x=still?-.2:-.2+Math.sin(t*.15)*.12;
    if(!still&&p.bonk>0)a.root.rotation.z=Math.sin(p.bonk*.2)*.65;
    if((p.emote>0||victory)&&!still){const dance=victory?look.pose:p.emoteKind;if(dance===0){a.root.rotation.z=k*.22;a.root.position.y+=Math.abs(k)*.4;}if(dance===1){a.arms[0].rotation.z=-1+k*.4;a.arms[1].rotation.z=1-k*.4;}if(dance===2){a.root.rotation.y=Math.floor(t/12)*.5;a.head.rotation.z=Math.floor(t/9)%2?.22:-.22;}if(dance===3){a.root.rotation.y=t*.13;a.root.rotation.z=Math.sin(t*.07)*.9;}}else a.head.rotation.z=0;
  }
  function enemy(variant){const root=new T.Group();scene.add(root);let body;
    if(variant===0){body=part(root,box,0xf18aba,0,.8,0,1.6,1.6,1.6);}
    if(variant===1){body=part(root,ball,0x8b9cba,0,.9,0,.7,.9,.65);part(root,box,0x253149,0,.55,.35,.95,.8,.35);part(root,box,0xffffff,0,.9,.57,.16,.55,.1);part(root,cone,0xffb53f,0,1.25,.65,.35,.35,.35).rotation.x=Math.PI/2;}
    if(variant===2){body=part(root,box,0xf59654,0,.7,0,1.5,1.4,1);part(root,box,0x253149,0,1.43,0,.95,.1,.25);part(root,box,0xffd19a,0,1.75,0,.8,.6,.18);}
    if(variant===3){body=part(root,ball,0x62c87b,0,1,0,.55,1.2,.55);for(const x of[-1,1]){part(root,box,0x62c87b,x*.65,.9,0,.6,.25,.3);part(root,box,0x62c87b,x*.9,1.2,0,.25,.8,.3);}part(root,ball,0xf6a6ff,0,2.3,0,.55,.3,.55);}
    const eyes=[-1,1].map(x=>{const e=part(root,box,0x152238,x*.3,1,.78,.17,.2,.08);const cross=part(e,box,0x152238,0,0,.05,1,1,1);cross.rotation.z=Math.PI/2;return e;});return {root,body,eyes,variant};
  }
  const boss=new T.Group();scene.add(boss);const jelly=part(boss,ball,0xef73b4,0,2.6,0,2.8,2.8,2.2);for(const x of[-1,1]){part(boss,ball,0xffffff,x*.8,3.1,1.9,.6,.7,.25);part(boss,box,0x172238,x*.8,3.05,2.13,.25,.4,.1);}part(boss,box,0x172238,0,1.8,2,.9,.16,.15);for(const x of[-1,0,1])part(boss,cone,0xffd84d,x*.9,5.6,0,.8,.9,.8);
  return {actor,dress,pose,enemy,boss,jelly,duck,label,part,box,ball,material};
};
