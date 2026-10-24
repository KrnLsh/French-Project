import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const cursorSource=await fs.readFile(new URL('../dist/cursor.js',import.meta.url),'utf8');
const performanceSource=await fs.readFile(new URL('../dist/render-performance.js',import.meta.url),'utf8');
class Events{
 listeners=new Map();
 addEventListener(type,callback){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback);}
 removeEventListener(type,callback){this.listeners.get(type)?.delete(callback);}
 fire(type,event={}){for(const listener of [...this.listeners.get(type)||[]])listener(event);}
}
function cursorFixture(){
 const window=new Events(),document=new Events(),query=new Events(),pending=new Map(),intersections=[];
 const flags={reduced:false,desktop:true,dialog:false},stats={bounds:0,rootAdds:0,dotWrites:0,headingBounds:0};
 const values=new Set(),root={classList:{add(name){stats.rootAdds++;values.add(name);},remove(name){values.delete(name);},contains:name=>values.has(name)}};
 const classes=()=>({toggle(){},add(){},remove(){}});
 const dot={classList:classes()},ring={classList:classes()},image={},label={};
 const preview={querySelector:s=>s==='img'?image:label};
 const heading={getBoundingClientRect(){stats.headingBounds++;return {left:0,top:100,width:500,height:200,right:500,bottom:300};}};
 const magnet={classList:classes(),style:{setProperty(){}},getBoundingClientRect(){stats.bounds++;return {left:100+(magnet.x||0),top:100+(magnet.y||0),width:100,height:40};},closest(selector){return selector==='.magnetic'||selector.startsWith('a,button')?magnet:null;}};
 let id=0;
 document.documentElement=root;document.hidden=false;document.fonts={ready:new Promise(()=>{})};
 document.querySelector=s=>s==='.cursor-dot'?dot:s==='.cursor-ring'?ring:s==='.floating-preview'?preview:{};
 document.querySelectorAll=selector=>selector==='.magnetic'?[magnet]:selector==='.tilt-card'?[]:[heading];document.elementFromPoint=()=>magnet;
 query.matches=true;
 const gsap={
  quickSetter:(element,key)=>value=>{element[key]=value;if(element===dot)stats.dotWrites++;},
  quickTo:(element,key)=>value=>{element[key]=value;},getProperty:(element,key)=>element[key]||0,
  set(elements,properties){for(const element of Array.isArray(elements)?elements:[elements])Object.assign(element,properties);},
  to(element,properties){Object.assign(element,properties);},fromTo(element,_from,to){Object.assign(element,to);}
 };
 const context={window,document,innerWidth:1280,innerHeight:720,addEventListener:(...args)=>window.addEventListener(...args),
  requestAnimationFrame(callback){pending.set(++id,callback);return id;},cancelAnimationFrame:key=>pending.delete(key),
  IntersectionObserver:class{constructor(callback){this.callback=callback;intersections.push(this);}observe(){}disconnect(){}},
  ResizeObserver:class{constructor(callback){this.callback=callback;}observe(){}disconnect(){}}
 };
 vm.runInNewContext(performanceSource+'\n'+cursorSource,context);
 const cursor=window.createMuseumCursor({gsap,isReduced:()=>flags.reduced,isDesktop:()=>flags.desktop,pointerQuery:query,isDialogOpen:()=>flags.dialog,artifacts:{}});
 const move=(x=160,y=120)=>window.fire('pointermove',{clientX:x,clientY:y,target:magnet,pointerType:'mouse',movementX:1});
 const step=()=>{const batch=[...pending.values()];pending.clear();batch.forEach(callback=>callback(16));};
 return {window,document,query,pending,flags,stats,dot,root,cursor,move,step,intersections,heading};
}
test('pointer storms update the cursor once per frame and reuse magnetic bounds',()=>{
 const f=cursorFixture();
 for(let i=0;i<250;i++)f.move(100+i,120);
 assert.equal(f.pending.size,1);assert.equal(f.stats.bounds,0);
 f.step();assert.equal(f.dot.x,349);assert.equal(f.stats.dotWrites,2);assert.equal(f.stats.bounds,1);assert.equal(f.stats.rootAdds,1);
 for(let i=0;i<250;i++)f.move(200+i,130);
 f.step();assert.equal(f.stats.bounds,1,'hover geometry is cached');assert.equal(f.stats.rootAdds,1,'root classes do not churn with mouse input');
 for(let i=0;i<30;i++)f.document.fire('scroll');
 assert.equal(f.pending.size,1);f.step();assert.equal(f.stats.bounds,2,'scroll invalidation is coalesced');
 f.cursor.destroy();
});
test('cursor work stops on lifecycle and motion changes, then resumes with fresh input',()=>{
 const f=cursorFixture();f.move();f.step();f.move();f.window.fire('blur');assert.equal(f.pending.size,0);
 f.flags.reduced=true;f.move();assert.equal(f.pending.size,0);
 f.flags.reduced=false;f.move();assert.equal(f.pending.size,1);
 f.document.hidden=true;f.document.fire('visibilitychange');assert.equal(f.pending.size,0);
 f.document.hidden=false;f.move();f.window.fire('lart-dialog-change');assert.equal(f.pending.size,0);
 f.move();f.step();assert.equal(f.root.classList.contains('custom-cursor'),true,'the inversion lens still works in reading panels');
 f.cursor.destroy();f.move();assert.equal(f.pending.size,0);
});
test('only intersecting display headings require geometry sampling',()=>{
 const f=cursorFixture();f.move();f.step();assert.equal(f.stats.headingBounds,0);
 f.intersections[0].callback([{target:f.heading,isIntersecting:true}]);f.step();assert.equal(f.stats.headingBounds,1);
 for(let i=0;i<100;i++)f.move();f.step();assert.equal(f.stats.headingBounds,1);
 f.intersections[0].callback([{target:f.heading,isIntersecting:false}]);f.step();assert.equal(f.stats.headingBounds,1);
 f.cursor.destroy();
});
test('graphics budgets ignore isolated pauses, scale down under sustained load, and recover slowly',()=>{
 const context={window:{}};vm.runInNewContext(performanceSource,context);
 const changes=[],budget=context.window.createRenderBudget({onChange:pixels=>changes.push(pixels)});
 const maximum=budget.pixels;
 for(let i=0;i<100;i++)budget.sample(16);
 budget.sample(100);for(let i=0;i<100;i++)budget.sample(16);
 assert.equal(budget.pixels,maximum,'a single long task must not lower quality');
 for(let i=0;i<1400;i++)budget.sample(34);
 assert.ok(budget.pixels<maximum);assert.ok(budget.pixels>=420000);
 const low=budget.pixels;budget.sample(5000);assert.equal(budget.pixels,low,'hidden-tab gaps do not affect quality');
 for(let i=0;i<1000;i++)budget.sample(16);
 assert.ok(budget.pixels>low);assert.ok(budget.pixels<=maximum);assert.ok(changes.length<20,'quality changes are bounded, not per-frame resizes');
});
test('scroll deformation updates only visible artwork and releases it in reduced motion',()=>{
 const writes=[],records=[false,true,false].map((image,index)=>({matches:()=>image,style:{setProperty:(key,value)=>writes.push({index,key,value})}}));
 let observer,reduced=false;
 const context={window:{},document:{querySelectorAll:()=>records},IntersectionObserver:class{constructor(callback){observer=callback;}observe(){}disconnect(){}}};
 vm.runInNewContext(performanceSource,context);
 const effects=context.window.createScrollKinetics({isReduced:()=>reduced});
 observer([{target:records[0],isIntersecting:true},{target:records[1],isIntersecting:true}]);
 effects.update(900);assert.equal(writes.length,2);assert.ok(writes.every(write=>write.index!==2));
 effects.update(900);assert.equal(writes.length,2,'unchanged values do not invalidate styles');
 reduced=true;effects.update(900);assert.ok(writes.slice(-2).every(write=>write.value==='0'));
 effects.destroy();
});

test('the shared pipeline deduplicates reads, includes newly activated geometry, and defers late reads',()=>{
 const pending=new Map(),events=[];let id=0;
 const scope={window:{},requestAnimationFrame(callback){pending.set(++id,callback);return id;},cancelAnimationFrame:key=>pending.delete(key)};
 vm.runInNewContext(performanceSource,scope);
 const frames=scope.window.museumFrames;
 const late=()=>events.push('late read'),nested=()=>events.push('nested read');
 const read=()=>{events.push('read');frames.read(nested);};
 const write=()=>{events.push('write');frames.read(late);};
 for(let i=0;i<250;i++){frames.write(write);frames.read(read);}
 assert.equal(pending.size,1);
 const first=[...pending.values()];pending.clear();first[0]();
 assert.deepEqual(events,['read','nested read','write']);assert.equal(pending.size,1);
 const second=[...pending.values()];pending.clear();second[0]();
 assert.deepEqual(events,['read','nested read','write','late read']);assert.equal(pending.size,0);
 frames.write(write);frames.cancel(write);assert.equal(pending.size,0);
});

test('165 Hz graphics budgets detect sustained missed 6.06 ms slots',()=>{
 const scope={window:{}};vm.runInNewContext(performanceSource,scope);
 const budget=scope.window.createRenderBudget(),maximum=budget.pixels;
 for(let i=0;i<200;i++)budget.sample(1000/165);
 budget.sample(12.12);for(let i=0;i<100;i++)budget.sample(1000/165);
 assert.equal(budget.pixels,maximum,'an isolated missed slot is ignored');
 for(let i=0;i<1000;i++)budget.sample(1000/82.5);
 assert.ok(budget.pixels<maximum,'the former 12 ms floor must not hide doubled 165 Hz frame intervals');
});
