/* A continuous, parameterised kite: four ideas share one living surface. */
(() => {
 'use strict';
 const themes=[
  {name:'The drawn image',number:'01 / VISUAL CULTURE',title:'Beyond the<br><em>drawn panel.</em>',copy:'Bande dessinée offers a way to think in striking compositions, expressive silhouettes, and worlds suggested beyond the frame. Another World and Rayman take radically different routes through that visual imagination.',principle:'Composition becomes a language. A silhouette can tell a story before a word is spoken.',works:[['another-world','Another World'],['rayman','Rayman']],pose:[.28,.10,.10,1.04,0]},
  {name:'Living systems',number:'02 / SYSTEMIC WORLD-BUILDING',title:'A place that<br><em>answers back.</em>',copy:'Arkane’s spaces are built for interpretation. A roof, an open window, a conversation: each can become a route. From Arx Fatalis to Dishonored, architecture, character, and interlocking rules invite the player to discover a personal way through.',principle:'A world becomes convincing when it responds. The player’s curiosity completes the design.',works:[['dishonored','Dishonored'],['ubisoft','Ubisoft’s worlds']],pose:[1.20,1.65,.38,.91,.18]},
  {name:'Electronic dreams',number:'03 / ELECTRONIC MUSIC SCORING',title:'The sound<br><em>of elsewhere.</em>',copy:'Dune’s electronic score, composed by Stéphane Picq and Philip Ulrich, turns an unfamiliar planet into an intimate dream. Synthesised textures, repeating motifs, and spacious rhythms make music a form of world-building, carrying emotion beyond what the screen can show.',principle:'Sound gives an imagined place its own gravity. Rhythm becomes another way to travel.',works:[['dune','Dune'],['another-world','Another World']],pose:[.88,-1.45,.64,1.12,.42]},
  {name:'Beautiful melancholy',number:'04 / EMOTIONAL ATMOSPHERE',title:'Beauty with<br><em>an ache.</em>',copy:'Vulnerability, absence, and uncertain futures run through very different works. Another World’s isolation, Life is Strange’s fragile memories, and Clair Obscur’s threatened lives each let emotion shape the experience of play.',principle:'A feeling can outlive a mechanic. The world stays with us because something in it is fragile.',works:[['life-is-strange','Life is Strange'],['clair-obscur','Clair Obscur']],pose:[.55,.68,.30,.79,-.30]}
 ];
 window.createFrenchSignature=({gsap,ScrollTrigger,isReduced,isDialogOpen,isNavigating=()=>false,scrollTo})=>{
  const section=document.querySelector('#french-signature');
  if(!section)return {setup(){},reset(){}};
  const $=selector=>section.querySelector(selector),stage=$('.signature-stage'),art=$('.signature-art'),story=$('.signature-story-content');
  const tabs=[...section.querySelectorAll('[data-signature-theme]')],playhead={value:0};
  let index=-1,trigger=null,animation=null,entry=null,selectingUntil=0,announcement=0;
  let visible=false,frame=0,lastTime=0,elapsed=0,poseValue=0,contextLost=false;
  const mouse=new Float32Array(4),artGeometry=window.createFrameGeometry(art),artBounds=artGeometry.bounds;
  const fallbackForm=$('.signature-fallback-form');
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const damp=(a,b,rate,dt)=>a+(b-a)*-Math.expm1(-rate*dt);
  function showTheme(next,animate=true){
   if(index===next)return;
   index=next;const theme=themes[next];
   section.dataset.signatureTheme=String(next);
   $('.signature-number').textContent=theme.number;
   if(window.lartHeadlines)window.lartHeadlines.setContent($('#signature-story-title'),theme.title,{animate});else $('#signature-story-title').innerHTML=theme.title;
   $('.signature-copy').textContent=theme.copy;
   $('.signature-principle>p').textContent=theme.principle;
   $('.signature-form-name').textContent=theme.name;
   $('.signature-form-index').textContent=String(next+1).padStart(2,'0')+' / 04';
   [...section.querySelectorAll('.signature-work')].forEach((button,i)=>{
    button.dataset.inspect=theme.works[i][0];button.querySelector('span').textContent=theme.works[i][1];
   });
   tabs.forEach((button,i)=>{
    button.classList.toggle('is-current',i===next);button.setAttribute('aria-pressed',String(i===next));
    if(i===next)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
   });
   clearTimeout(announcement);
   announcement=setTimeout(()=>{$('.signature-live').textContent=theme.number+'. '+theme.name+'.';},350);
   if(animate&&gsap&&!isReduced()){
    gsap.killTweensOf(story);
    gsap.fromTo(story,{opacity:.15,y:17},{opacity:1,y:0,duration:.65,ease:'power3.out',clearProps:'opacity,transform'});
   }
  }
  function update(value,animate=true){
   playhead.value=clamp(value,0,1);
   showTheme(Math.round(playhead.value*3),animate);
   tabs.forEach((button,i)=>button.style.setProperty('--chapter-fill',String(clamp(playhead.value*3-i+1,0,1))));
   if(!visible||isReduced())renderOnce();
  }
  function select(next){
   if(isDialogOpen())return;
   next=clamp(next,0,3);
   if(trigger&&section.classList.contains('is-pinned')){
    trigger.getTween(true)?.kill?.();selectingUntil=performance.now()+1500;
    const target=clamp(trigger.start+(trigger.end-trigger.start)*next/3,trigger.start+1,trigger.end-1);
    scrollTo(target,{duration:1.15});
   }else if(gsap&&!isReduced()){
    gsap.to(playhead,{value:next/3,duration:1.25,ease:'power3.inOut',overwrite:true,onUpdate:()=>update(playhead.value)});
   }else update(next/3,false);
   if(innerWidth<=760)scrollTo(art,{duration:1.15,immediate:isReduced()});
  }
  tabs.forEach((button,i)=>{
   button.addEventListener('click',()=>select(i));
   button.addEventListener('keydown',event=>{
    const next=event.key==='ArrowRight'?i+1:event.key==='ArrowLeft'?i-1:event.key==='Home'?0:event.key==='End'?3:null;
    if(next===null)return;event.preventDefault();
    const target=clamp(next,0,3);tabs[target].focus({preventScroll:true});select(target);
   });
  });
  art.addEventListener('pointermove',event=>{
   if(artBounds[2]&&artBounds[3]){mouse[2]=(event.clientX-artBounds[0])/artBounds[2]-.5;mouse[3]=(event.clientY-artBounds[1])/artBounds[3]-.5;}
  },{passive:true});
  art.addEventListener('pointerleave',()=>{mouse[2]=mouse[3]=0;});

  // All vertices remain static parameters. The GPU evaluates the membrane in parallel.
  let renderer=null,scene,camera,sculpture,shapeUniforms;
  const rings=38,sides=64,vertices=(rings+1)*(sides+1),pose=new Float32Array(5);
  const canvas=$('.signature-canvas');
  const deformation=`
    uniform vec4 uShape;
    uniform float uAsymmetry,uPulse,uTime;
    vec3 surface(float theta,float u){
      float taper=pow(max(0.,1.-abs(u)),.94),envelope=sin((u+1.)*3.14159265*.5),bend=sin(u*3.14159265);
      float travelling=sin(theta*3.+u*5.-uTime*.7);
      float angle=theta+uShape.y*u+bend*uPulse*travelling*.72;
      float rib=1.+cos(theta*4.+u*3.+uTime*.35)*(uShape.z*.19+uPulse*.11)*envelope;
      float x=cos(angle)*taper*2.70*uShape.w*rib;
      float y=u*(u>0.?2.62:2.92)+sin(theta*3.+u*4.+uTime*.45)*uShape.z*envelope*.16;
      float z=sin(angle)*taper*(uShape.x+uPulse*.68)+sin(theta*4.+u*5.-uTime*.55)*uShape.z*envelope*.46+uAsymmetry*taper*cos(theta*2.);
      return vec3(x,y,z);
    }
    void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(surface(position.x,position.y),1.);gl_PointSize=5.5;}
  `;
  function createSculpture(){
   if(!window.THREE)return;
   const T=window.THREE;
   try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'high-performance'});}catch{return;}
   renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
   scene=new T.Scene();camera=new T.PerspectiveCamera(36,1,.1,60);camera.position.z=11.8;
   sculpture=new T.Group();scene.add(sculpture);
   shapeUniforms={uShape:{value:new T.Vector4()},uAsymmetry:{value:0},uPulse:{value:0},uTime:{value:0},uColor:{value:new T.Vector3(0,.1843,.6549)}};
   const params=new Float32Array(vertices*3),triangles=[],lattice=[];
   for(let r=0;r<=rings;r++)for(let c=0;c<=sides;c++){
    const offset=(r*(sides+1)+c)*3;params[offset]=c/sides*Math.PI*2;params[offset+1]=r/rings*2-1;
   }
   for(let r=0;r<rings;r++)for(let c=0;c<sides;c++){
    const a=r*(sides+1)+c,b=a+1,d=a+sides+1,e=d+1;
    triangles.push(a,d,b,b,d,e);lattice.push(a,b,a,d);if((r+c)%4===0)lattice.push(a,e);
   }
   function geometry(values,indices){const result=new T.BufferGeometry();result.setAttribute('position',new T.BufferAttribute(values,3));if(indices)result.setIndex(indices);return result;}
   function material(opacity){return new T.ShaderMaterial({uniforms:{...shapeUniforms,uOpacity:{value:opacity}},vertexShader:deformation,fragmentShader:'uniform vec3 uColor;uniform float uOpacity;void main(){gl_FragColor=vec4(uColor,uOpacity);}',transparent:true,side:T.DoubleSide,depthWrite:false});}
   const membrane=new T.Mesh(geometry(params,triangles),material(.028));membrane.frustumCulled=false;sculpture.add(membrane);
   const wire=new T.LineSegments(geometry(params,lattice),material(.33));wire.frustumCulled=false;sculpture.add(wire);
   const spines=new Float32Array(rings*4*6);let offset=0;
   for(let c=0;c<4;c++)for(let r=0;r<rings;r++)for(let end=0;end<2;end++){
    spines[offset++]=c*Math.PI*.5;spines[offset++]=(r+end)/rings*2-1;spines[offset++]=0;
   }
   const spine=new T.LineSegments(geometry(spines),material(.9));spine.frustumCulled=false;sculpture.add(spine);
   const nodes=new Float32Array([0,-1,0,0,1,0,0,0,0,Math.PI,0,0]);
   const points=new T.Points(geometry(nodes),material(.9));points.frustumCulled=false;sculpture.add(points);
   section.classList.add('has-sculpture');
  }
  function resize(){
   if(!renderer)return;
   const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.25,Math.sqrt(850000/(width*height))));
   renderer.setSize(width,height,false);camera.aspect=width/height;
   camera.position.z=9.8*Math.max(1,1.04/camera.aspect);camera.updateProjectionMatrix();
   renderOnce();
  }
  function renderSculpture(dt=0,settled=false){
   const target=playhead.value*3;
   poseValue=settled?target:damp(poseValue,target,7,dt);
   const part=Math.min(2,Math.floor(poseValue)),fraction=clamp(poseValue-part,0,1);
   const t=fraction*fraction*(3-2*fraction),pulse=Math.sin(fraction*Math.PI);
   const from=themes[part].pose,to=themes[part+1].pose;
   for(let i=0;i<pose.length;i++)pose[i]=from[i]+(to[i]-from[i])*t;
   if(!renderer||contextLost){
    const skew=Math.sin(poseValue*2)*36;
    fallbackForm.setAttribute('transform','rotate('+(poseValue*12)+' 320 320) skewX('+skew*.3+')');
    return;
   }
   const time=isReduced()?0:elapsed;
   mouse[0]=damp(mouse[0],mouse[2],5,dt);mouse[1]=damp(mouse[1],mouse[3],5,dt);
   shapeUniforms.uShape.value.set(pose[0],pose[1],pose[2],pose[3]);
   shapeUniforms.uAsymmetry.value=pose[4];shapeUniforms.uPulse.value=pulse;shapeUniforms.uTime.value=time;
   sculpture.rotation.set(.08+Math.sin(time*.22)*.035+mouse[1]*.16,.35+poseValue*.21+Math.sin(time*.18)*.10+mouse[0]*.24,Math.sin(time*.15)*.025+Math.sin(poseValue*1.8)*.08);
   sculpture.position.y=.12+Math.sin(time*.5)*.045;
   renderer.render(scene,camera);
  }
  function renderOnce(){renderSculpture(1/60,true);}
  function tick(time){
   frame=0;
   if(!visible||document.hidden||contextLost||isDialogOpen())return;
   const dt=lastTime?Math.min((time-lastTime)*.001,.05):1/60;lastTime=time;
   if(!isDialogOpen()){elapsed+=dt;renderSculpture(dt);}
   if(!isReduced())frame=requestAnimationFrame(tick);
  }
  function sync(){
   cancelAnimationFrame(frame);frame=0;lastTime=0;
   if(visible&&!document.hidden&&!contextLost&&!isDialogOpen()){if(isReduced())renderOnce();else frame=requestAnimationFrame(tick);}
  }
  createSculpture();
  new ResizeObserver(()=>window.museumFrames.write(resize)).observe(art);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{rootMargin:'120px'}).observe(stage);
  document.addEventListener('visibilitychange',sync);
  addEventListener('lart-motion-change',sync);
  addEventListener('lart-dialog-change',sync);
  addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;lastTime=0;});
  addEventListener('pageshow',sync);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;section.classList.remove('has-sculpture');sync();});
  canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;section.classList.add('has-sculpture');resize();sync();});

  function reset(){
   trigger?.kill(true);animation?.kill();entry?.kill();trigger=null;animation=null;entry=null;
   gsap?.killTweensOf([story,playhead]);
   if(gsap)gsap.set([stage,story],{clearProps:'transform,opacity,clipPath'});
   selectingUntil=0;section.classList.remove('is-pinned','is-active','is-compact','is-condensed');
  }
  function storiesFit(){
   const main=$('.signature-main'),style=getComputedStyle(main);
   const available=main.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
   const probe=story.cloneNode(true);probe.setAttribute('aria-hidden','true');probe.inert=true;
   probe.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
   probe.style.cssText='position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;width:'+story.clientWidth+'px;height:auto;transform:none;';
   story.parentNode.append(probe);
   let tallest=0;
   for(const theme of themes){
    probe.querySelector('h4').innerHTML=theme.title;
    probe.querySelector('.signature-copy').textContent=theme.copy;
    probe.querySelector('.signature-principle>p').textContent=theme.principle;
    [...probe.querySelectorAll('.signature-work')].forEach((button,i)=>button.querySelector('span').textContent=theme.works[i][1]);
    tallest=Math.max(tallest,probe.getBoundingClientRect().height);
   }
   probe.remove();return tallest+18<=available;
  }
  function setup({animated=true}={}){
   const header=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
   const available=innerHeight-header();
   let pin=Boolean(animated&&gsap&&ScrollTrigger&&!isReduced()&&innerWidth>=1000&&available>=620);
   section.classList.remove('is-compact','is-condensed');
   section.classList.toggle('is-pinned',pin);
   if(pin&&!storiesFit()){
    section.classList.add('is-compact');
    if(!storiesFit())section.classList.add('is-condensed');
    pin=storiesFit();section.classList.toggle('is-pinned',pin);
    if(!pin)section.classList.remove('is-compact','is-condensed');
   }
   $('.signature-instruction').textContent=pin?'SCROLL TO TRANSFORM / PAUSE TO DISCOVER':'SELECT A CHAPTER TO TRANSFORM THE STUDY';
   if(pin){
    entry=gsap.fromTo(stage,{scale:.96,opacity:.65},{scale:1,opacity:1,ease:'none',scrollTrigger:{trigger:stage,start:'top 90%',end:()=> 'top '+header()+'px',scrub:.8,invalidateOnRefresh:true}});
    playhead.value=0;
    animation=gsap.to(playhead,{value:1,ease:'none',onUpdate:()=>update(playhead.value),scrollTrigger:{
     id:'french-signature',trigger:stage,start:()=> 'top '+header()+'px',
     end:()=>'+='+Math.max(innerHeight*.98,780)*3,pin:true,scrub:1.05,anticipatePin:1,invalidateOnRefresh:true,
     snap:{snapTo:(value,self)=>self.isActive&&!isDialogOpen()&&!isNavigating()&&performance.now()>=selectingUntil?Math.round(value*3)/3:value,directional:false,inertia:false,delay:.3,duration:{min:.4,max:.85},ease:'power3.inOut'},
     onToggle:self=>section.classList.toggle('is-active',self.isActive),
     onRefresh:self=>{update(self.progress,false);resize();},
     onLeave:()=>update(1,false),onLeaveBack:()=>update(0,false)
    }});
    trigger=animation.scrollTrigger;
   }else update(Math.max(0,index)/3,false);
   resize();sync();
  }
  update(0,false);resize();
  window.lartTheme?.subscribe(palette=>{
   if(!renderer)return;
   const color=new THREE.Color(palette.accent).convertLinearToSRGB();
   shapeUniforms.uColor.value.set(color.r,color.g,color.b);
   if(!contextLost)renderer.render(scene,camera);
  });

  return {setup,reset};
 };
})();
