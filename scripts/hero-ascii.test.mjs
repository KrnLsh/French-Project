import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../dist/hero-ascii.js',import.meta.url),'utf8');
class Events{
 listeners=new Map();
 addEventListener(type,callback){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback);}
 removeEventListener(type,callback){this.listeners.get(type)?.delete(callback);}
 fire(type,event={}){for(const callback of this.listeners.get(type)||[])callback(event);}
}
function fixture(){
 const window=new Events(),document=new Events(),pending=new Map(),intersections=[],sizes=[],mutations=[];
 const flags={reduced:false,dialog:false},frames=[];
 let frameId=0,time=0,unsubscribed=false;
 const classNames=new Set(['ready']),root={classList:{contains:name=>classNames.has(name)}};
 const host=new Events();host.clientWidth=960;host.clientHeight=632;
 host.classList={add:name=>classNames.add(name),remove:name=>classNames.delete(name)};
 host.getBoundingClientRect=()=>({left:0,top:0,width:host.clientWidth,height:host.clientHeight});
 const context={setTransform(){},clearRect(){frames.push([]);},drawImage(_atlas,glyph){frames[frames.length-1].push(glyph);},fillRect(){}};
 const canvas={getContext:()=>context,width:0,height:0};
 const brush={clearRect(){},fillText(){}};
 document.querySelector=selector=>selector==='.hero-ascii'?host:canvas;
 document.createElement=()=>({getContext:()=>brush,width:0,height:0});
 document.documentElement=root;document.hidden=false;document.fonts={ready:new Promise(()=>{})};
 window.lartTheme={subscribe(callback){callback({accent:'#002FA7'});return ()=>{unsubscribed=true;};}};
 const scope={window,document,devicePixelRatio:2,getComputedStyle:()=>({getPropertyValue:()=> '#002FA7'}),
 requestAnimationFrame(callback){pending.set(++frameId,callback);return frameId;},cancelAnimationFrame:id=>pending.delete(id),
 IntersectionObserver:class{constructor(callback){this.callback=callback;intersections.push(this);}observe(){}disconnect(){this.disconnected=true;}},
 ResizeObserver:class{constructor(callback){this.callback=callback;sizes.push(this);}observe(){}disconnect(){this.disconnected=true;}},
 MutationObserver:class{constructor(callback){this.callback=callback;mutations.push(this);}observe(){}disconnect(){this.disconnected=true;}}};
 vm.runInNewContext(source,scope);
 const controller=window.createHeroAscii({isReduced:()=>flags.reduced,isDialogOpen:()=>flags.dialog});
 function step(delta=34){time+=delta;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(callback=>callback(time));}
 return {window,document,host,canvas,flags,frames,pending,controller,intersections,sizes,mutations,step,
 visible(value){intersections[0].callback([{isIntersecting:value}]);},unsubscribed:()=>unsubscribed};
}
test('ASCII world changes its glyph field and respects its rendering budget',()=>{
 const f=fixture();assert.ok(f.frames[0].length>200,'a real glyph scene is painted before animation');
 assert.equal(f.pending.size,0,'offscreen scene stays idle');
 assert.ok(f.canvas.width*f.canvas.height<1005000,'bounded high-DPI canvas');
 const initial=f.frames[f.frames.length-1].join(',');
 f.visible(true);for(let i=0;i<24;i++)f.step();
 assert.notEqual(f.frames[f.frames.length-1].join(','),initial,'the planet and terrain animate');
 assert.ok(f.frames.every(frame=>frame.length<=156*88),'bounded glyph count');
 const paints=f.frames.length;f.step(5);assert.equal(f.frames.length,paints,'rendering is rate limited');
 f.host.clientWidth=390;f.host.clientHeight=263;f.sizes[0].callback();
 assert.ok(f.frames[f.frames.length-1].length>50,'small screens retain the artwork');
 f.controller.destroy();
});
test('ASCII world sleeps offscreen, behind panels, and in reduced motion, then resumes cleanly',()=>{
 const f=fixture();f.visible(true);assert.equal(f.pending.size,1);
 f.visible(false);assert.equal(f.pending.size,0);
 f.visible(true);f.flags.dialog=true;f.mutations[0].callback();assert.equal(f.pending.size,0);
 f.flags.dialog=false;f.mutations[0].callback();assert.equal(f.pending.size,1);
 f.document.hidden=true;f.document.fire('visibilitychange');assert.equal(f.pending.size,0);
 f.document.hidden=false;f.document.fire('visibilitychange');assert.equal(f.pending.size,1);
 f.flags.reduced=true;f.window.fire('lart-motion-change');assert.equal(f.pending.size,0);
 const paints=f.frames.length;f.step();assert.equal(f.frames.length,paints);
 f.flags.reduced=false;f.window.fire('lart-motion-change');assert.equal(f.pending.size,1);
 f.window.fire('pagehide');assert.equal(f.pending.size,0);
 f.window.fire('pageshow');assert.equal(f.pending.size,1);
 f.controller.destroy();f.controller.destroy();
 assert.equal(f.pending.size,0);assert.equal(f.unsubscribed(),true);
 assert.equal(f.intersections[0].disconnected,true);assert.equal(f.sizes[0].disconnected,true);assert.equal(f.mutations[0].disconnected,true);
});
