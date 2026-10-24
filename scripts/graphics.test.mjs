import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const performanceSource=await fs.readFile(new URL('../dist/render-performance.js',import.meta.url),'utf8');
const signatureSource=await fs.readFile(new URL('../dist/signature.js',import.meta.url),'utf8');
const plotSource=await fs.readFile(new URL('../dist/chronicle-plot.js',import.meta.url),'utf8');

class Element {
 listeners=new Map();style={setProperty(){}};dataset={};clientWidth=640;clientHeight=480;children=[];
 classList={add(){},remove(){},toggle(){}};
 addEventListener(type,callback){this.listeners.set(type,callback);}
 removeEventListener(type){this.listeners.delete(type);}
 fire(type,event={}){this.listeners.get(type)?.(event);}
 setAttribute(){}removeAttribute(){}
 getBoundingClientRect(){return {left:0,top:0,width:640,height:480};}
 append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
 insertBefore(node){node.parentNode=this;}
 remove(){}
}
function fixture(source){
 const events=new Element(),document=new Element(),pending=new Map(),intersections=[],materials=[],attributes=[];
 const stats={queries:0,draws:0,uploads:0},nodes=new Map(),tabs=Array.from({length:4},()=>new Element());
 const section=new Element();
 section.querySelector=selector=>{stats.queries++;if(!nodes.has(selector))nodes.set(selector,new Element());return nodes.get(selector);};
 section.querySelectorAll=selector=>selector.includes('data-signature-theme')?tabs:[];
 document.querySelector=()=>section;document.querySelectorAll=()=>[];document.createElement=()=>new Element();
 document.hidden=false;document.fonts={ready:new Promise(()=>{})};document.documentElement=new Element();
 let id=0;
 class Vector {constructor(){this.set(0,0,0,0);}set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this;}}
 class Group {rotation=new Vector();position=new Vector();children=[];add(value){this.children.push(value);}}
 class Geometry {attributes={};setAttribute(key,value){this.attributes[key]=value;}setIndex(value){this.index=value;}dispose(){}}
 class Mesh {constructor(geometry,material){this.geometry=geometry;this.material=material;}}
 const THREE={
  Vector3:Vector,Vector4:Vector,Scene:Group,Group,Mesh,LineSegments:Mesh,Points:Mesh,BufferGeometry:Geometry,PlaneGeometry:Geometry,Camera:class{},
  PerspectiveCamera:class {position=new Vector();updateProjectionMatrix(){}},
  BufferAttribute:class {constructor(array){this.array=array;attributes.push(this);}set needsUpdate(value){if(value)stats.uploads++;}},
  ShaderMaterial:class {constructor(options){Object.assign(this,options);materials.push(this);}dispose(){}},
  Color:class {r=.1;g=.2;b=.8;convertLinearToSRGB(){return this;}},
  WebGLRenderer:class {domElement=new Element();setClearColor(){}setPixelRatio(){}setSize(){}render(){stats.draws++;}dispose(){}forceContextLoss(){}}
 };
 const window=new Element();window.THREE=THREE;
 let theme;
 window.lartTheme={subscribe(callback){theme=callback;callback({accent:'#002FA7',background:'#F6F5F0'});return ()=>{};}};
 const scope={window,document,THREE,devicePixelRatio:1,innerWidth:1280,innerHeight:900,
  requestAnimationFrame(callback){pending.set(++id,callback);return id;},cancelAnimationFrame:key=>pending.delete(key),
  addEventListener:(...args)=>events.addEventListener(...args),setTimeout:()=>1,clearTimeout(){},
  ResizeObserver:class {observe(){}disconnect(){}},
  IntersectionObserver:class {constructor(callback){intersections.push(callback);}observe(){}disconnect(){}}
 };
 vm.runInNewContext(performanceSource+'\n'+source,scope);
 let time=1000;
 function step(delta=1000/165){time+=delta;const batch=[...pending.values()];pending.clear();for(const callback of batch)callback(time);}
 return {window,section,nodes,tabs,document,events,stats,intersections,pending,materials,attributes,step,theme:()=>theme};
}

test('sculpture geometry remains immutable while shared GPU uniforms animate at display cadence',()=>{
 const f=fixture(signatureSource),flags={dialog:false,reduced:false};
 f.window.createFrenchSignature({gsap:null,ScrollTrigger:null,isReduced:()=>flags.reduced,isDialogOpen:()=>flags.dialog,scrollTo(){}});
 f.step();
 const before=f.attributes.map(attribute=>[...attribute.array]),queryCount=f.stats.queries;
 f.intersections[0]([{isIntersecting:true}]);
 const start=f.stats.draws;
 for(let i=0;i<166;i++)f.step();
 assert.equal(f.stats.draws-start,166);assert.equal(f.stats.uploads,0,'no dynamic vertex-buffer uploads');
 assert.equal(f.stats.queries,queryCount,'the render loop performs no DOM queries');
 assert.deepEqual(f.attributes.map(attribute=>[...attribute.array]),before);
 assert.equal(f.materials.length,4);
 assert.ok(f.materials.every(material=>material.uniforms.uShape===f.materials[0].uniforms.uShape));
 assert.ok(f.materials[0].uniforms.uTime.value>1);
 flags.dialog=true;f.events.fire('lart-dialog-change');assert.equal(f.pending.size,0);
 flags.dialog=false;f.events.fire('lart-dialog-change');assert.equal(f.pending.size,1);
 flags.reduced=true;f.events.fire('lart-motion-change');assert.equal(f.pending.size,0);
});

test('GPU chart updates uniforms without mutating accessible SVG geometry',()=>{
 const f=fixture(plotSource),chart=new Element(),parent=new Element();parent.append(chart);
 let mutations=0;chart.setAttribute=()=>{mutations++;};
 const plot=f.window.createChroniclePlot(chart);f.step();
 const before=f.stats.draws;
 for(let i=0;i<=165;i++)assert.equal(plot.draw(i/165,340,40),true);
 assert.equal(f.stats.draws-before,166);assert.equal(mutations,0);
 const uniforms=f.materials[0].uniforms;
 assert.equal(uniforms.uStep.value,7);assert.equal(uniforms.uBaseline.value,340);
 plot.draw(.5,204,24);assert.equal(uniforms.uHeight.value,280);assert.equal(uniforms.uUnit.value,24);
 plot.destroy();
});
