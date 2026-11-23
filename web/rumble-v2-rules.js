/* Shared, fixed progression and combat rules. No purchase or random unlocks. */
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.RumbleV2Rules=f();})(globalThis,()=>{
'use strict';
const heroes={
 volt:{name:'Volt',role:'Bruiser',hp:12,damage:3,range:5,cool:24,colour:0x22e1ff,super:'Thunder circle',gadget:'Patch shield',passive:'Tough shell: 12 hearts',model:'volt'},
 lumen:{name:'Lumen',role:'Sniper',hp:8,damage:5,range:14,cool:36,colour:0xffd84d,super:'Daybreak beam',gadget:'Rapid focus',passive:'Long sight: 14-metre reach',model:'lumen'},
 flick:{name:'Flick',role:'Trickster',hp:8,damage:2,range:8,cool:12,colour:0x22e1ff,super:'Mirror storm',gadget:'Blink veil',passive:'Quick feet: shorter dash cooldown',model:'flick'},
 mason:{name:'Mason',role:'Builder',hp:10,damage:3,range:9,cool:24,colour:0xffd84d,super:'Pocket fortress',gadget:'Repair beacon',passive:'Built to last: heal every fifth defeat',model:'mason'}
};
heroes.nova={name:'Nova',role:'Burst scout',hp:9,damage:4,range:11,cool:20,colour:0xffd84d,super:'Sun flare',gadget:'Pulse guard',passive:'Balanced spark: 11-metre reach',model:'lumen',unlockXP:1560};
const difficulties={normal:{name:'Normal',health:1,speed:1,damage:1,xp:1},hard:{name:'Hard',health:1.6,speed:1.3,damage:2,xp:1.5},insane:{name:'Insane',health:2.3,speed:1.6,damage:3,xp:2}};
const upgrades=[{id:'power',name:'Bigger sparks',help:'+1 damage to every basic hit'},{id:'chain',name:'Chain lightning',help:'A basic hit also strikes a nearby foe'},{id:'echo',name:'Echo reactor',help:'Supers charge 25% faster; echoes keep their supers'},{id:'leech',name:'Second wind',help:'Every defeat restores one heart'},{id:'dash',name:'Comet dash',help:'Dashing deals 6 damage nearby'}];
const road=[
 {id:'trail-ion',type:'trail',name:'Ion trail'}, {id:'skin-volt-solar',type:'skin',hero:'volt',name:'Solar Volt'},
 {id:'emote-salute',type:'emote',name:'Spark salute'}, {id:'title-spark',type:'title',name:'First Spark'},
 {id:'frame-circuit',type:'frame',name:'Circuit frame'}, {id:'skin-lumen-night',type:'skin',hero:'lumen',name:'Midnight Lumen'},
 {id:'trail-comet',type:'trail',name:'Comet trail'}, {id:'emote-spin',type:'emote',name:'Victory orbit'},
 {id:'skin-flick-ice',type:'skin',hero:'flick',name:'Ice Flick'}, {id:'title-echo',type:'title',name:'Echo Captain'},
 {id:'skin-mason-solar',type:'skin',hero:'mason',name:'Solar Mason'}, {id:'frame-star',type:'frame',name:'Star frame'}, {id:'hero-nova',type:'hero',hero:'nova',name:'Nova hero'}, {id:'gadget-overdrive',type:'gadget',name:'Overdrive gadget'}
].map((r,i)=>({...r,level:i+1,xp:(i+1)*120}));
const masteryXP=300;
function level(xp){return Math.floor(Math.max(0,Number(xp)||0)/120);}
function rewards(xp){const n=level(xp);return road.filter(r=>r.level<=n);}
function next(xp){const n=level(xp);return Array.from({length:3},(_,i)=>road[n+i]||{id:'cores-'+(n+i+1),type:'cores',name:'25 cores',level:n+i+1,xp:(n+i+1)*120,cores:25});}
function options(o={}){return {hero:Object.hasOwn(heroes,o.hero)?o.hero:'volt',difficulty:Object.hasOwn(difficulties,o.difficulty)?o.difficulty:'normal',assist:o.difficulty!=='hard'&&o.difficulty!=='insane'&&o.assist===true,nightmare:o.nightmare===true,gadget:o.gadget==='overdrive'?'overdrive':'standard'};}
function weeklySeed(date=new Date()){const shifted=new Date(date.getTime()+8*3600000),day=Math.floor(shifted.getTime()/86400000),week=Math.floor((day+3)/7);return (Math.imul(week,2654435761)^0x4543484f)>>>0;}
return {heroes,difficulties,upgrades,road,masteryXP,level,rewards,next,options,weeklySeed,version:3,maxSteps:18000};
});
