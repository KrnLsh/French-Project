import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const coreSource=await fs.readFile(new URL('../dist/hero-ascii-renderer.js',import.meta.url),'utf8');
const performanceSource=await fs.readFile(new URL('../dist/render-performance.js',import.meta.url),'utf8');
const source=await fs.readFile(new URL('../dist/hero-ascii.js',import.meta.url),'utf8');
const workerSource=await fs.readFile(new URL('../dist/hero-ascii-worker.js',import.meta.url),'utf8');
class Events{
 listeners=new Map();
 addEventListener(type,callback){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback);}
 removeEventListener(type,callback){this.listeners.get(type)?.delete(callback);}
 fire(type,event={}){for(const callback of this.listeners.get(type)||[])callback(event);}
}
function fixture({workers=false}={}){
 const window=new Events(),document=new Events(),pending=new Map(),intersections=[],sizes=[],mutations=[];
 const flags={reduced:false,dialog:false},frames=[];
 let frameId=0,time=0,unsubscribed=false;
 const classNames=new Set(['ready']),root={classList:{contains:name=>classNames.has(name)}};
 const host=new Events();host.clientWidth=960;host.clientHeight=632;
 host.classList={add:name=>classNames.add(name),remove:name=>classNames.delete(name)};
 host.getBoundingClientRect=()=>({left:0,top:0,width:host.clientWidth,height:host.clientHeight});
 const context={setTransform(){},clearRect(){frames.push([]);},drawImage(_atlas,glyph){frames[frames.length-1].push(glyph);},fillRect(){}};
 const replacements=[],workerList=[];
 const canvas={getContext:()=>context,width:0,height:0,dataset:{}};context.canvas=canvas;
 canvas.transferControlToOffscreen=()=>({});
 canvas.cloneNode=()=>{
  const replacement={width:0,height:0,dataset:{},getContext(){context.canvas=replacement;return context;}};
  replacements.push(replacement);return replacement;
 };
 canvas.replaceWith=()=>{};
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
 if(workers){
  document.baseURI='http://127.0.0.1:4173/';scope.URL=URL;
  scope.createImageBitmap=async()=>({close(){}});
  scope.Worker=class {
   messages=[];terminated=false;
   constructor(){workerList.push(this);}
   postMessage(message,transfer){this.messages.push(message.type==='pointer'?structuredClone(message,{transfer}):message);}
   terminate(){this.terminated=true;}
  };
 }
 vm.runInNewContext(performanceSource+'\n'+coreSource+'\n'+source,scope);
 const controller=window.createHeroAscii({isReduced:()=>flags.reduced,isDialogOpen:()=>flags.dialog});
 function step(delta=34){time+=delta;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(callback=>callback(time));}
 step(0);
 return {window,document,host,canvas,flags,frames,pending,controller,intersections,sizes,mutations,step,workerList,replacements,
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
 const paints=f.frames.length;f.step(1000/165);assert.equal(f.frames.length,paints+1,'every 165 Hz display callback paints; no artificial 30 FPS gate');
 f.host.clientWidth=390;f.host.clientHeight=263;f.sizes[1].callback();f.step(0);
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
 assert.equal(f.intersections[0].disconnected,true);assert.ok(f.sizes.every(observer=>observer.disconnected));assert.equal(f.mutations[0].disconnected,true);
});

test('unrelated root-class changes do not repaint the ASCII world behind a reading panel',()=>{
 const f=fixture();f.visible(true);f.step();f.flags.dialog=true;f.mutations[0].callback();
 const paints=f.frames.length;
 for(let i=0;i<100;i++)f.mutations[0].callback();
 assert.equal(f.frames.length,paints);assert.equal(f.pending.size,0);
 f.controller.destroy();
});

function workerFixture(){
 const pending=new Map(),messages=[],samples=[];let id=0;
 const canvas={width:0,height:0},context={canvas,setTransform(){},clearRect(){},drawImage(){}};
 canvas.getContext=()=>context;
 const scope={self:{},OffscreenCanvas:class{},
  requestAnimationFrame(callback){pending.set(++id,callback);return id;},cancelAnimationFrame:key=>pending.delete(key),
  postMessage(message,transfer){messages.push(structuredClone(message,transfer?{transfer}:undefined));}
 };
 vm.createContext(scope);
 scope.importScripts=()=>{
  vm.runInContext(coreSource,scope);
  const create=scope.createAsciiRenderer;
  scope.createAsciiRenderer=(context,atlas)=>{
   const renderer=create(context,atlas),paint=renderer.paint;
   renderer.paint=(...args)=>{samples.push(args);paint(...args);};return renderer;
  };
 };
 vm.runInContext(workerSource,scope);
 const send=data=>scope.self.onmessage({data});
 send({type:'init',canvas,atlas:{},width:390,height:263,ratio:1});
 function step(now){const callbacks=[...pending.values()];pending.clear();callbacks.forEach(callback=>callback(now));}
 return {pending,messages,samples,send,step};
}

test('worker animation advances by elapsed seconds equally at 60 and 165 Hz',()=>{
 function simulate(hz){
  const f=workerFixture();f.send({type:'state',running:true,reduced:false});f.step(1000);
  for(let i=1;i<=hz;i++)f.step(1000+i*1000/hz);
  return f.samples.at(-1)[0];
 }
 assert.ok(Math.abs(simulate(60)-1)<1e-9);
 assert.ok(Math.abs(simulate(165)-1)<1e-9);
});

test('worker owns its clock, recycles transferable pointer storage, and sleeps on pause',()=>{
 const f=workerFixture();assert.equal(f.messages[0].supported,true);
 const point=new Float32Array([.5,-.25,1]);
 f.send({type:'pointer',point});
 assert.equal(point.byteLength,0,'worker transfers the buffer back instead of copying or retaining it');
 assert.deepEqual([...f.messages.at(-1).point],[.5,-.25,1]);
 f.send({type:'state',running:true,reduced:false});
 for(let i=0;i<120;i++)f.step(1000+i*1000/165);
 const last=f.samples.at(-1);assert.ok(last[1]>.49&&last[2]<-.24&&last[3]>.98);
 f.send({type:'state',running:false,reduced:false});assert.equal(f.pending.size,0);
 f.send({type:'state',running:true,reduced:true});assert.equal(f.pending.size,0,'reduced motion paints once');
});

test('main-thread worker bridge coalesces input with one recyclable buffer and recovers after transfer failure',async()=>{
 const f=fixture({workers:true}),worker=f.workerList[0];
 f.visible(true);await worker.onmessage({data:{type:'ready',supported:true}});
 assert.equal(f.canvas.dataset.renderer,'worker');assert.equal(f.frames.length,0,'main thread does not paint the worker canvas');
 f.step();
 let pointers=worker.messages.filter(message=>message.type==='pointer');
 assert.equal(pointers.length,1);
 for(let i=0;i<500;i++)f.host.fire('pointermove',{clientX:100+i,clientY:200,pointerType:'mouse'});
 assert.equal(f.pending.size,0,'backpressure prevents another transfer while its buffer is in flight');
 await worker.onmessage({data:pointers[0]});f.step();
 pointers=worker.messages.filter(message=>message.type==='pointer');assert.equal(pointers.length,2);
 assert.ok(Math.abs(pointers[1].point[0]-(599/960*2-1))<1e-6,'latest pointer wins');
 f.flags.dialog=true;f.window.fire('lart-dialog-change');
 assert.equal(worker.messages.at(-1).running,false);
 f.flags.dialog=false;f.window.fire('lart-dialog-change');
 worker.onerror({preventDefault(){}});
 assert.equal(worker.terminated,true);assert.equal(f.replacements.length,1,'a transferred canvas must be replaced before main-thread recovery');
 assert.ok(f.frames.length>0);assert.equal(f.pending.size,1);
 f.controller.destroy();assert.equal(f.pending.size,0);
});
