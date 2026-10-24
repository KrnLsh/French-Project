/* Bounded optional graphics work; scrolling and input keep their native cadence. */
(() => {
 'use strict';
 // One read phase for every geometry consumer, followed by deferred visual writes.
 const reads=[],writes=[];
 let scheduled=0,flushing=false;
 function flush(){
  scheduled=0;flushing=true;
  try{
   while(reads.length)reads.shift()();
   while(writes.length)writes.shift()();
  }finally{
   flushing=false;if(reads.length||writes.length)scheduled=requestAnimationFrame(flush);
  }
 }
 function enqueue(queue,callback){
  if(queue.indexOf(callback)<0)queue.push(callback);
  if(!scheduled&&!flushing)scheduled=requestAnimationFrame(flush);
 }
 window.museumFrames={
  read(callback){enqueue(reads,callback);},write(callback){enqueue(writes,callback);},
  cancel(callback){
   let index=reads.indexOf(callback);if(index>=0)reads.splice(index,1);
   index=writes.indexOf(callback);if(index>=0)writes.splice(index,1);
   if(!reads.length&&!writes.length){cancelAnimationFrame(scheduled);scheduled=0;}
  }
 };
 const geometries=[];
 function invalidateGeometry(){for(let i=0;i<geometries.length;i++)geometries[i].invalidate();}
 window.createFrameGeometry=(element,offsetX=null,offsetY=null)=>{
  const bounds=new Float32Array(4);
  let destroyed=false,active=true;
  function measure(){
   if(destroyed||!active)return;
   const rect=element.getBoundingClientRect();
   bounds[0]=rect.left-(offsetX?offsetX():0);bounds[1]=rect.top-(offsetY?offsetY():0);bounds[2]=rect.width;bounds[3]=rect.height;
  }
  function invalidate(){if(!destroyed&&active)window.museumFrames.read(measure);}
  const observer=new ResizeObserver(invalidate);
  const record={bounds,invalidate,setActive(value){if(active!==value){active=value;if(value)invalidate();else window.museumFrames.cancel(measure);}},destroy(){destroyed=true;observer.disconnect();window.museumFrames.cancel(measure);const index=geometries.indexOf(record);if(index>=0)geometries.splice(index,1);}};
  geometries.push(record);observer.observe(element);invalidate();
  return record;
 };
 if(typeof document!=='undefined'&&typeof addEventListener==='function'){
  document.addEventListener('scroll',invalidateGeometry,{passive:true,capture:true});
  addEventListener('resize',invalidateGeometry,{passive:true});
  document.fonts?.ready.then(invalidateGeometry);
 }
 window.createRenderBudget=({maximum=1100000,minimum=420000,onChange=()=>{}}={})=>{
  let pixels=maximum,frames=0,slow=0,fast=0,base=1000/60;
  function reset(){frames=slow=fast=0;}
  return {
   get pixels(){return pixels;},
   sample(milliseconds){
    if(!Number.isFinite(milliseconds)||milliseconds<=0||milliseconds>150){reset();return;}
    base=Math.min(base,Math.max(6,milliseconds));frames++;
    if(frames<45)return;
    const threshold=base*1.4;
    if(milliseconds>threshold){slow+=milliseconds;fast=0;}
    else{slow=Math.max(0,slow-milliseconds*2);fast+=milliseconds;}
    if(slow>900&&pixels>minimum){pixels=Math.max(minimum,Math.round(pixels*.78));slow=fast=0;frames=0;onChange(pixels);}
    else if(fast>10000&&pixels<maximum){pixels=Math.min(maximum,Math.round(pixels*1.12));fast=slow=0;frames=0;onChange(pixels);}
   },
   reset
  };
 };
 window.createScrollKinetics=({isReduced})=>{
  const active=new Set(),records=new Map();
  for(const element of document.querySelectorAll('.hero-deck,.exhibit-card>p,.image-distort>img')){
   records.set(element,{element,property:element.matches('img')?'--scroll-stretch':'--scroll-velocity',value:''});
  }
  const reset=record=>{if(record.value!=='0'){record.element.style.setProperty(record.property,'0');record.value='0';}};
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
    const record=records.get(entry.target);if(!record)continue;
    if(entry.isIntersecting)active.add(record);else{active.delete(record);reset(record);}
   }
  },{rootMargin:'60px'});
  records.forEach(record=>observer.observe(record.element));
  return {
   update(velocity){
    const skew=isReduced()?'0':String(Math.abs(velocity)<1?0:Math.max(-1.5,Math.min(1.5,velocity/1800)).toFixed(2));
    const stretch=isReduced()?'0':String(Math.abs(velocity)<1?0:Math.min(.018,Math.abs(velocity)/180000).toFixed(3));
    for(const record of active){
     const value=record.property==='--scroll-stretch'?stretch:skew;
     if(value!==record.value){record.element.style.setProperty(record.property,value);record.value=value;}
    }
   },
   reset(){records.forEach(reset);},
   destroy(){observer.disconnect();records.forEach(reset);active.clear();}
  };
 };
})();
