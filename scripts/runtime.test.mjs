import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const performanceSource=await fs.readFile(new URL('../dist/render-performance.js',import.meta.url),'utf8');
const themeSource=await fs.readFile(new URL('../dist/theme.js',import.meta.url),'utf8');
const planesSource=await fs.readFile(new URL('../dist/image-planes.js',import.meta.url),'utf8');
class Events {
  listeners=new Map();
  addEventListener(type,callback){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback);}
  removeEventListener(type,callback){this.listeners.get(type)?.delete(callback);}
  fire(type,event={}){for(const callback of [...this.listeners.get(type)||[]])callback(event);}
}
function classes(){
  const values=new Set();return {add(...items){items.forEach(item=>values.add(item));},remove(...items){items.forEach(item=>values.delete(item));},contains(item){return values.has(item);}};
}
function scheduler(){
  const pending=new Map();let id=0,time=0;
  return {pending,request(callback){pending.set(++id,callback);return id;},cancel(key){pending.delete(key);},now:()=>time,
    step(){time+=16;const batch=[...pending];pending.clear();for(const [,callback] of batch)callback(time);}};
}
function themeFixture({reduce=false}={}){
  const globalEvents=new Events(),document=new Events(),button=new Events(),frames=scheduler();
  const root={dataset:{},classList:classes()},label={textContent:''},meta={content:''},attributes=new Map();
  button.setAttribute=(name,value)=>attributes.set(name,value);
  button.querySelector=()=>label;
  root.classList.add('motion-full');
  document.documentElement=root;document.hidden=false;
  document.querySelector=selector=>selector==='#theme-toggle'?button:meta;
  const colourScheme=new Events();colourScheme.matches=false;
  const reduced=new Events();reduced.matches=reduce;
  const storage=new Map();
  const context={
    window:{},document,matchMedia:query=>query.includes('color-scheme')?colourScheme:reduced,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    getComputedStyle:()=>({getPropertyValue:()=> 'rgb(20, 20, 20)'}),
    performance:{now:frames.now},requestAnimationFrame:callback=>frames.request(callback),cancelAnimationFrame:id=>frames.cancel(id),
    addEventListener:(...args)=>globalEvents.addEventListener(...args),
    dispatchEvent:event=>globalEvents.fire(event.type,event),
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options?.detail;}}
  };
  vm.runInNewContext(themeSource,context);
  document.fire('DOMContentLoaded');frames.step();frames.step();
  return {root,document,button,frames,globalEvents,colourScheme,attributes,storage};
}
test('appearance commits palette once and stays idle across lifecycle events',()=>{
  const fixture=themeFixture();fixture.button.fire('click');
  assert.equal(fixture.frames.pending.size,1);
  fixture.globalEvents.fire('pageshow');fixture.document.fire('visibilitychange');
  assert.equal(fixture.frames.pending.size,0,'the palette is committed without a polling loop');
  fixture.document.hidden=true;fixture.document.fire('visibilitychange');
  assert.equal(fixture.frames.pending.size,0);
  fixture.document.hidden=false;fixture.document.fire('visibilitychange');
  assert.equal(fixture.frames.pending.size,0);
});
test('appearance remembers explicit choices and resets after storage is cleared',()=>{
  const fixture=themeFixture();fixture.button.fire('click');
  assert.equal(fixture.storage.get('lart-theme'),'dark');
  fixture.colourScheme.fire('change',{matches:false});
  assert.equal(fixture.root.dataset.theme,'dark');
  fixture.globalEvents.fire('storage',{key:null,newValue:null});
  assert.equal(fixture.root.dataset.theme,'light');
  assert.equal(fixture.attributes.get('aria-pressed'),'false');
});
test('full-motion override works with a reduced-motion system preference',()=>{
  const fixture=themeFixture({reduce:true});fixture.button.fire('click');
  assert.equal(fixture.frames.pending.size,1);
  fixture.root.classList.remove('motion-full');fixture.root.classList.add('motion-reduced');
  fixture.globalEvents.fire('lart-motion-change');fixture.frames.step();
  assert.equal(fixture.frames.pending.size,0);
});
class Element extends Events {
  classList=classes();children=[];attributes=new Map();
  constructor(){super();this.clientWidth=640;this.clientHeight=360;}
  setAttribute(name,value){this.attributes.set(name,value);}
  getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}
  insertBefore(child){child.parent=this;this.children.push(child);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
}
function planeFixture({desktop=true,reduced=false}={}){
  const stats={created:0,disposed:0,draws:0,textures:[],geometryReleased:0,materialReleased:0,textureReleased:0};
  const frames=scheduler(),globalEvents=new Events(),document=new Events();
  const containers=Array.from({length:2},()=>{
    const container=new Element(),image=new Element();image.complete=true;image.naturalWidth=1920;image.naturalHeight=1080;
    container.querySelector=()=>image;container.image=image;return container;
  });
  document.hidden=false;document.querySelectorAll=()=>containers;
  document.createElement=()=>{const canvas=new Element();canvas.getContext=()=>({drawImage(){}});return canvas;};
  const intersections=[],resizes=[];
  function observer(list){return class {
    targets=[];constructor(callback){this.callback=callback;list.push(this);}
    observe(target){this.targets.push(target);}disconnect(){this.targets=[];}
    emit(target,visible=true){this.callback([{target,isIntersecting:visible}]);}
  };}
  const pointer=new Events();pointer.matches=true;
  const flags={desktop,reduced,dialog:false};
  const THREE={
    Vector2:class {constructor(x=0,y=0){this.x=x;this.y=y;}set(x,y){this.x=x;this.y=y;}lerp(target,value){this.x+=(target.x-this.x)*value;this.y+=(target.y-this.y)*value;}},
    WebGLRenderer:class {
      constructor(){stats.created++;this.domElement=new Element();}
      setPixelRatio(){}setSize(){}render(){stats.draws++;}forceContextLoss(){}
      dispose(){stats.disposed++;}
    },
    CanvasTexture:class {constructor(source){this.image=source;stats.textures.push(this);}dispose(){stats.textureReleased++;}},
    ShaderMaterial:class {constructor(options){Object.assign(this,options);}dispose(){stats.materialReleased++;}},
    PlaneGeometry:class {dispose(){stats.geometryReleased++;}},
    Scene:class {add(){}},Mesh:class {},Camera:class {},
    NearestFilter:'nearest',LinearSRGBColorSpace:'linear',NoColorSpace:'none'
  };
  const context={window:{},document,THREE,devicePixelRatio:2,
    IntersectionObserver:observer(intersections),ResizeObserver:observer(resizes),
    requestAnimationFrame:callback=>frames.request(callback),cancelAnimationFrame:id=>frames.cancel(id),
    addEventListener:(...args)=>globalEvents.addEventListener(...args),
    removeEventListener:(...args)=>globalEvents.removeEventListener(...args)};
  vm.runInNewContext(performanceSource+'\n'+planesSource,context);
  const controller=context.window.createImagePlanes({THREE,isReduced:()=>flags.reduced,isDesktop:()=>flags.desktop,pointerQuery:pointer,isDialogOpen:()=>flags.dialog});
  return {controller,stats,containers,frames,intersections,resizes,flags,globalEvents,document};
}
test('image effects allocate only on hover and release every resource offscreen',()=>{
  const fixture=planeFixture(),container=fixture.containers[0];
  fixture.intersections[0].emit(container);
  assert.equal(fixture.stats.created,0);
  container.fire('pointerenter');fixture.frames.step();
  assert.equal(fixture.stats.created,1);assert.equal(fixture.stats.draws,1);
  assert.equal(container.children.length,1);
  const source=fixture.stats.textures[0].image;
  assert.ok(source.width<=1600);assert.ok(source.width*source.height<=1500000);
  fixture.intersections[0].emit(container,false);
  assert.equal(container.children.length,0);assert.equal(fixture.frames.pending.size,0);
  assert.equal(fixture.stats.disposed,1);assert.equal(fixture.stats.geometryReleased,1);
  assert.equal(fixture.stats.materialReleased,1);assert.equal(fixture.stats.textureReleased,1);
});
test('image effects keep pixel art intrinsic and recover safely from context loss',()=>{
  const fixture=planeFixture(),container=fixture.containers[0];
  container.image.classList.add('pixel-art');
  container.image.naturalWidth=320;container.image.naturalHeight=200;
  fixture.intersections[0].emit(container);container.fire('pointerenter');
  assert.equal(fixture.stats.textures[0].image.width,320);
  assert.equal(fixture.stats.textures[0].minFilter,'nearest');
  const canvas=container.children[0];let prevented=false;
  canvas.fire('webglcontextlost',{preventDefault(){prevented=true;}});
  assert.ok(prevented);assert.equal(fixture.frames.pending.size,0);assert.equal(container.classList.contains('webgl-ready'),false);
  canvas.fire('webglcontextrestored');
  assert.equal(container.classList.contains('webgl-ready'),true);assert.equal(fixture.frames.pending.size,2,'one shared read phase and one render callback');
  fixture.frames.step();assert.equal(fixture.frames.pending.size,1,'only the render loop continues');
  fixture.controller.destroy();assert.equal(container.children.length,0);assert.equal(fixture.frames.pending.size,0);
});
test('image effects handle mobile-to-desktop changes, motion settings, and page restoration',()=>{
  const fixture=planeFixture({desktop:false}),container=fixture.containers[0];
  fixture.intersections[0].emit(container);container.fire('pointerenter');
  assert.equal(fixture.stats.created,0);
  fixture.flags.desktop=true;fixture.resizes[0].emit(container);container.fire('pointerenter');
  assert.equal(fixture.stats.created,1);
  fixture.flags.reduced=true;fixture.globalEvents.fire('lart-motion-change');
  assert.equal(fixture.stats.disposed,1);assert.equal(fixture.frames.pending.size,0);
  fixture.flags.reduced=false;fixture.globalEvents.fire('lart-motion-change');
  assert.equal(fixture.stats.created,2);
  fixture.globalEvents.fire('pagehide');assert.equal(fixture.frames.pending.size,0);
  fixture.globalEvents.fire('pageshow');assert.equal(fixture.stats.created,3);assert.equal(fixture.frames.pending.size,2);
  fixture.frames.step();assert.equal(fixture.frames.pending.size,1);
  fixture.controller.destroy();fixture.controller.destroy();
  assert.equal(fixture.stats.created,fixture.stats.disposed);
  container.fire('pointerenter');assert.equal(fixture.frames.pending.size,0);
});

test('image pointer events batch geometry reads and reading panels suspend GPU work',()=>{
  const fixture=planeFixture(),container=fixture.containers[0];let reads=0;
  container.getBoundingClientRect=()=>{reads++;return {left:0,top:0,width:640,height:360};};
  fixture.intersections[0].emit(container);container.fire('pointerenter');
  for(let i=0;i<250;i++)container.fire('pointermove',{clientX:i,clientY:150});
  assert.equal(reads,0);fixture.frames.step();assert.equal(reads,1);
  fixture.flags.dialog=true;fixture.globalEvents.fire('lart-dialog-change');
  assert.equal(fixture.frames.pending.size,0);assert.equal(fixture.stats.created,fixture.stats.disposed);
  fixture.flags.dialog=false;fixture.globalEvents.fire('lart-dialog-change');
  assert.equal(fixture.frames.pending.size,0,'closing a panel does not restart a stale hover');
  container.fire('pointerenter');assert.equal(fixture.frames.pending.size,2);fixture.frames.step();assert.equal(fixture.frames.pending.size,1);
  fixture.controller.destroy();
});
