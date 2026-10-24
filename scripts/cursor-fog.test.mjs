import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../dist/cursor-fog.js',import.meta.url),'utf8');
class Events{
  listeners=new Map();
  addEventListener(type,callback){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback);}
  removeEventListener(type,callback){this.listeners.get(type)?.delete(callback);}
  fire(type,event={}){for(const callback of this.listeners.get(type)||[])callback(event);}
}
function fixture(){
  const window=new Events(),document=new Events(),query=new Events(),pending=new Map();
  let time=0,id=0,reduced=false,desktop=true;
  const draws=[],clears=[];
  const brush={createRadialGradient:()=>({addColorStop(){}}),fillRect(){}};
  const context={setTransform(){},clearRect(...args){clears.push(args);},drawImage(...args){draws.push(args);}};
  const canvas={width:0,height:0,getContext:()=>context};
  document.documentElement={dataset:{theme:'light'}};
  document.body={classList:{contains:()=>false}};document.hidden=false;
  document.querySelector=()=>canvas;document.createElement=()=>({getContext:()=>brush});
  query.matches=true;
  const scope={window,document,innerWidth:3840,innerHeight:2160,devicePixelRatio:2,
    performance:{now:()=>time},requestAnimationFrame(callback){pending.set(++id,callback);return id;},
    cancelAnimationFrame:key=>pending.delete(key)};
  vm.runInNewContext(source,scope);
  const fog=window.createCursorFog({isReduced:()=>reduced,isDesktop:()=>desktop,pointerQuery:query});
  const move=(x,y,pointerType='mouse')=>window.fire('pointermove',{clientX:x,clientY:y,pointerType});
  function step(){time+=16;const batch=[...pending];pending.clear();for(const [,callback]of batch)callback(time);}
  return {window,document,query,pending,draws,clears,canvas,fog,move,step,
    reduce(value){reduced=value;window.fire('lart-motion-change');},
    desktop(value){desktop=value;window.fire('resize');}};
}
test('fog rendering stays bounded and sleeps after the wake fades',()=>{
  const f=fixture();assert.equal(f.pending.size,0);
  f.move(100,100);f.move(200,110);f.move(300,130);
  assert.equal(f.pending.size,1);f.step();assert.ok(f.draws.length>0);assert.ok(f.draws.every(draw=>draw[3]<=36),'compact trail width');
  assert.ok(f.canvas.width*f.canvas.height<905000,'high-DPI drawing budget');
  for(let i=0;i<100;i++)f.move(i*30,200);
  f.draws.length=0;f.step();assert.ok(f.draws.length<=320,'fixed particle pool');
  for(let i=0;i<35;i++)f.step();
  assert.equal(f.pending.size,0,'trail fades within half a second and stops rendering');
});
test('fog clears on motion and page lifecycle changes and resumes without bridging stale positions',()=>{
  const f=fixture();f.move(100,100);f.move(200,100);f.step();
  f.reduce(true);assert.equal(f.pending.size,0);f.move(400,200);assert.equal(f.pending.size,0);
  f.reduce(false);f.move(400,200);assert.equal(f.pending.size,0);
  f.move(450,200);assert.equal(f.pending.size,1);
  f.document.hidden=true;f.document.fire('visibilitychange');assert.equal(f.pending.size,0);
  f.document.hidden=false;f.document.fire('visibilitychange');
  f.move(800,400);assert.equal(f.pending.size,0);
  f.move(850,400);f.document.fire('pointerleave');assert.equal(f.pending.size,0);
  f.move(900,400);assert.equal(f.pending.size,0);
  f.move(950,400);f.window.fire('pagehide');assert.equal(f.pending.size,0);
  f.window.fire('pageshow');f.move(1100,400);assert.equal(f.pending.size,0);
  f.fog.destroy();f.move(1150,400);assert.equal(f.pending.size,0);
});
test('fog ignores touch and small screens, then works when a desktop pointer returns',()=>{
  const f=fixture();f.move(100,100,'touch');f.move(150,100,'touch');assert.equal(f.pending.size,0);
  f.desktop(false);f.move(200,100);f.move(250,100);assert.equal(f.pending.size,0);
  f.desktop(true);f.query.matches=false;f.move(300,100);f.move(350,100);assert.equal(f.pending.size,0);
  f.query.matches=true;f.query.fire('change');f.move(400,100);f.move(450,100);f.step();
  assert.ok(f.draws.length>0);
});

test('moving fog repaints a small dirty region rather than clearing the viewport every frame',()=>{
  const f=fixture();f.move(100,100);f.move(150,110);f.step();f.clears.length=0;
  for(let i=0;i<5;i++)f.step();
  assert.ok(f.clears.length>0);
  assert.ok(f.clears.every(([, ,width,height])=>width*height<50000),'stationary fading wisps only damage their narrow bounds');
  f.fog.destroy();
});
