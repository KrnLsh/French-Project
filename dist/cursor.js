/* Input only mutates scalars; a shared read phase precedes every cursor write. */
(() => {
 'use strict';
 window.createMuseumCursor=({gsap,isReduced,isDesktop,pointerQuery,isDialogOpen,artifacts})=>{
  if(!gsap)return {destroy(){}};
  const root=document.documentElement,dot=document.querySelector('.cursor-dot'),ring=document.querySelector('.cursor-ring');
  const preview=document.querySelector('.floating-preview'),previewImage=preview.querySelector('img'),previewLabel=preview.querySelector('span');
  const layers=[dot,ring],pipeline=window.museumFrames,point=new Float32Array(3);
  const dotX=gsap.quickSetter(dot,'x','px'),dotY=gsap.quickSetter(dot,'y','px');
  const ringX=gsap.quickTo(ring,'x',{duration:.12,ease:'power2.out'}),ringY=gsap.quickTo(ring,'y',{duration:.12,ease:'power2.out'});
  const previewX=gsap.quickTo(preview,'x',{duration:.22,ease:'power3.out'}),previewY=gsap.quickTo(preview,'y',{duration:.25,ease:'power3.out'});
  const previewR=gsap.quickTo(preview,'rotation',{duration:.3,ease:'power3.out'}),previewAlpha=gsap.quickTo(preview,'opacity',{duration:.2});
  const previewScale=gsap.quickTo(preview,'scaleY',{duration:.3,ease:'power3.out'});
  const content='a,button,input,select,textarea,label,legend,h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,dt,dd,em,strong,small,img,svg,canvas,[data-cursor],[role="button"],[role="tab"],[tabindex="0"],.mono,.era-year';
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const magnets=new Map(),tilts=new Map(),headingStates=[],geometryRecords=[];
  function cacheGeometry(element,x=null,y=null){const geometry=window.createFrameGeometry(element,x,y);geometry.setActive(false);geometryRecords.push(geometry);return geometry;}
  for(const element of document.querySelectorAll('.magnetic')){
   const geometry=cacheGeometry(element,()=>Number(gsap.getProperty(element,'x'))||0,()=>Number(gsap.getProperty(element,'y'))||0);
   magnets.set(element,{element,geometry,x:gsap.quickTo(element,'x',{duration:.35,ease:'power3.out'}),y:gsap.quickTo(element,'y',{duration:.35,ease:'power3.out'})});
  }
  for(const element of document.querySelectorAll('.tilt-card')){
   const target=element.querySelector('.image-distort');if(!target)continue;
   gsap.set(target,{transformPerspective:1200});
   tilts.set(element,{element,geometry:cacheGeometry(element),x:gsap.quickTo(target,'rotationX',{duration:.4,ease:'power3.out'}),y:gsap.quickTo(target,'rotationY',{duration:.4,ease:'power3.out'})});
  }
  const headingMap=new Map();
  for(const element of document.querySelectorAll('#hero-title,#footer-title')){
   const record={element,visible:false,geometry:cacheGeometry(element)};headingStates.push(record);headingMap.set(element,record);
  }
  let queued=false,inside=false,shown=false,destroyed=false,dirty=true,ball=null,target=null;
  let magnet=null,tilt=null,row=null,nextMagnet=null,nextTilt=null,nextRow=null,nextBall=false;
  const showState={opacity:1},hideState={opacity:0},ringState={x:0,y:0};
  const allowed=()=>!destroyed&&!document.hidden&&!isReduced()&&isDesktop()&&pointerQuery.matches;
  const headings=new IntersectionObserver(entries=>{
   for(let i=0;i<entries.length;i++){const record=headingMap.get(entries[i].target);if(record){record.visible=entries[i].isIntersecting;record.geometry.setActive(record.visible);}}
   invalidate();
  });
  for(let i=0;i<headingStates.length;i++)headings.observe(headingStates[i].element);
  function hidePreview(){if(row){row=null;previewAlpha(0);previewR(0);}}
  function hide(){
   pipeline.cancel(sample);pipeline.cancel(flush);queued=false;inside=false;dirty=true;
   if(shown){gsap.set(layers,hideState);root.classList.remove('custom-cursor');shown=false;}
   if(magnet){magnet.x(0);magnet.y(0);magnet.geometry.setActive(false);magnet=null;}
   if(tilt){tilt.x(0);tilt.y(0);tilt.geometry.setActive(false);tilt=null;}
   hidePreview();
  }
  function sample(){
   if(!inside||!allowed())return;
   if(dirty)target=document.elementFromPoint(point[0],point[1])||target;
   nextMagnet=magnets.get(target?.closest?.('.magnetic'))||null;
   nextTilt=tilts.get(target?.closest?.('.tilt-card'))||null;
   nextRow=isDialogOpen()?null:target?.closest?.('.ledger-row');
   if(nextMagnet&&nextMagnet!==magnet)nextMagnet.geometry.setActive(true);
   if(nextTilt&&nextTilt!==tilt)nextTilt.geometry.setActive(true);
   nextBall=Boolean(target?.closest?.(content));dirty=false;
  }
  function flush(){
   queued=false;if(!inside||!allowed()){hide();return;}
   if(!nextBall&&!isDialogOpen())for(let i=0;i<headingStates.length;i++){
    const record=headingStates[i],b=record.geometry.bounds;
    if(record.visible&&point[0]>=b[0]&&point[0]<=b[0]+b[2]&&point[1]>=b[1]&&point[1]<=b[1]+b[3]){nextBall=true;break;}
   }
   if(nextMagnet!==magnet&&magnet){magnet.x(0);magnet.y(0);magnet.geometry.setActive(false);}magnet=nextMagnet;
   if(nextTilt!==tilt&&tilt){tilt.x(0);tilt.y(0);tilt.geometry.setActive(false);}tilt=nextTilt;
   if(!shown){ringState.x=point[0];ringState.y=point[1];gsap.set(ring,ringState);gsap.set(layers,showState);root.classList.add('custom-cursor');shown=true;}
   dotX(point[0]);dotY(point[1]);ringX(point[0]);ringY(point[1]);
   if(nextBall!==ball){ring.classList.toggle('is-ball',nextBall);dot.classList.toggle('is-over-content',nextBall);ball=nextBall;}
   if(magnet){const b=magnet.geometry.bounds;magnet.x(clamp((point[0]-b[0]-b[2]/2)*.18,-12,12));magnet.y(clamp((point[1]-b[1]-b[3]/2)*.22,-10,10));}
   if(tilt){const b=tilt.geometry.bounds;if(b[2]&&b[3]){const x=clamp((point[0]-b[0])/b[2],0,1),y=clamp((point[1]-b[1])/b[3],0,1);tilt.element.style.setProperty('--glare-x',x*100+'%');tilt.element.style.setProperty('--glare-y',y*100+'%');tilt.x((.5-y)*3);tilt.y((x-.5)*4);}}
   if(nextRow!==row){
    hidePreview();row=nextRow;
    if(row){const a=artifacts[row.dataset.preview];if(a?.image){
     previewImage.src='assets/'+a.image;previewLabel.textContent=a.studio+' // '+a.year;
     previewScale(.88);previewAlpha(1);previewScale(1);
    }}
   }
   if(row){previewX(clamp(point[0]+90,180,innerWidth-180));previewY(clamp(point[1]-95,180,innerHeight-130));previewR(clamp(point[2]*.16,-6,6));}
  }
  function queue(){if(!queued&&!destroyed){queued=true;pipeline.read(sample);pipeline.write(flush);}}
  function move(event){
   if(event.pointerType==='touch'||!allowed()){hide();return;}
   point[2]=event.movementX||event.clientX-point[0];point[0]=event.clientX;point[1]=event.clientY;target=event.target;
   inside=true;queue();
  }
  function invalidate(){dirty=true;if(inside)queue();}
  function modal(){hide();invalidate();}
  const listeners=[
   [window,'pointermove',move],[document,'scroll',invalidate],[window,'resize',invalidate],
   [window,'blur',hide],[document,'pointerleave',hide],[document,'visibilitychange',hide],
   [window,'pagehide',hide],[window,'lart-motion-change',hide],[window,'lart-dialog-change',modal],[pointerQuery,'change',hide]
  ];
  listeners.forEach(([target,type,listener])=>target.addEventListener(type,listener,{passive:true,capture:type==='scroll'}));
  return {destroy(){
   if(destroyed)return;hide();destroyed=true;headings.disconnect();for(let i=0;i<geometryRecords.length;i++)geometryRecords[i].destroy();
   listeners.forEach(([target,type,listener])=>target.removeEventListener(type,listener,{capture:type==='scroll'}));
  }};
 };
})();
