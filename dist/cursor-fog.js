/* Compact, distance-sampled blue wisps. No rendering work survives an idle pointer. */
(() => {
  'use strict';
  window.createCursorFog = ({isReduced,isDesktop,pointerQuery}) => {
    const canvas=document.querySelector('#cursor-fog');
    if(!canvas)return null;
    const context=canvas.getContext('2d',{alpha:true});
    if(!context)return null;
    const limit=112,spacing=5;
    const particles=Array.from({length:limit},()=>({life:0}));
    const sprites=[];
    let frame=0,lastFrame=0,previous=null,index=0,width=0,height=0,ratio=1;
    let darkMix=document.documentElement.dataset.theme==='dark'?1:0;
    const allowed=()=>pointerQuery.matches&&isDesktop()&&!isReduced()&&!document.hidden&&!document.body.classList.contains('loading');
    function sprite(rgb){
      const image=document.createElement('canvas');image.width=image.height=128;
      const brush=image.getContext('2d');if(!brush)return null;
      const gradient=brush.createRadialGradient(64,64,0,64,64,64);
      gradient.addColorStop(0,'rgba('+rgb+',.9)');
      gradient.addColorStop(.25,'rgba('+rgb+',.66)');
      gradient.addColorStop(.58,'rgba('+rgb+',.23)');
      gradient.addColorStop(1,'rgba('+rgb+',0)');
      brush.fillStyle=gradient;brush.fillRect(0,0,128,128);
      return image;
    }
    // Build textures only after the first eligible movement.
    function prepare(){
      if(!sprites.length){sprites.push(sprite('0,47,167'),sprite('100,140,255'));}
      return sprites.every(Boolean);
    }
    function size(){
      width=innerWidth;height=innerHeight;
      ratio=Math.min(devicePixelRatio||1,1,Math.sqrt(900000/Math.max(1,width*height)));
      canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);
      context.setTransform(ratio,0,0,ratio,0,0);
    }
    function clear(){
      cancelAnimationFrame(frame);frame=0;lastFrame=0;previous=null;
      particles.forEach(particle=>{particle.life=0;});
      context.clearRect(0,0,width,height);
    }
    function resize(){clear();if(allowed())size();}
    function spawn(x,y,dx,dy,speed){
      const particle=particles[index];index=(index+1)%limit;
      const side=Math.random()-.5;
      particle.x=x-dy*side*1.5;particle.y=y+dx*side*1.5;
      particle.vx=-dx*(2+speed*2)-dy*side*5;
      particle.vy=-dy*(2+speed*2)+dx*side*5-1;
      particle.radius=9+speed*4+Math.random()*2;
      particle.ttl=.32+Math.random()*.12;particle.life=particle.ttl;
      particle.phase=Math.random()*Math.PI*2;
    }
    function draw(now){
      frame=0;
      if(!allowed()){clear();return;}
      const dt=Math.min(Math.max((now-lastFrame)*.001,0),.05);lastFrame=now;
      const target=document.documentElement.dataset.theme==='dark'?1:0;
      darkMix+=(target-darkMix)*-Math.expm1(-7*dt);
      context.clearRect(0,0,width,height);
      let active=false;
      for(const particle of particles){
        if(particle.life<=0)continue;
        particle.life=Math.max(0,particle.life-dt);if(!particle.life)continue;
        active=true;
        const age=particle.ttl-particle.life,progress=age/particle.ttl;
        particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;
        const radius=particle.radius*(1+progress*.2);
        const x=particle.x+Math.sin(particle.phase+age*2.1)*age*2-radius;
        const y=particle.y+Math.cos(particle.phase+age*1.7)*age*1.5-radius;
        const alpha=.22*Math.min(age/.025,1)*Math.pow(1-progress,1.6);
        if(darkMix<.998){context.globalAlpha=alpha*(1-darkMix);context.drawImage(sprites[0],x,y,radius*2,radius*2);}
        if(darkMix>.002){context.globalAlpha=alpha*darkMix;context.drawImage(sprites[1],x,y,radius*2,radius*2);}
      }
      context.globalAlpha=1;
      if(active)frame=requestAnimationFrame(draw);
      else{context.clearRect(0,0,width,height);lastFrame=0;}
    }
    function move(event){
      if(event.pointerType==='touch'||!allowed()){if(frame||previous)clear();return;}
      if(width!==innerWidth||height!==innerHeight)resize();
      const now=performance.now(),x=event.clientX,y=event.clientY;
      if(!previous){previous={x,y,time:now};return;}
      const dx=x-previous.x,dy=y-previous.y,distance=Math.hypot(dx,dy);
      if(distance<.35)return;
      if(!prepare())return;
      const speed=Math.min(distance/Math.max(8,now-previous.time)/2,1);
      const steps=Math.min(32,Math.max(1,Math.ceil(distance/spacing)));
      for(let step=1;step<=steps;step++){
        const t=step/steps;
        spawn(previous.x+dx*t,previous.y+dy*t,dx/distance,dy/distance,speed);
      }
      previous.x=x;previous.y=y;previous.time=now;
      if(!frame){lastFrame=now;frame=requestAnimationFrame(draw);}
    }
    const listeners=[
      [window,'pointermove',move],[window,'resize',resize],
      [window,'blur',clear],[window,'pagehide',clear],[window,'pageshow',clear],
      [window,'pointercancel',clear],[window,'lart-motion-change',clear],
      [document,'pointerleave',clear],[document,'visibilitychange',clear],
      [pointerQuery,'change',clear]
    ];
    listeners.forEach(([target,type,listener])=>target.addEventListener(type,listener,{passive:true}));
    return {destroy(){clear();listeners.forEach(([target,type,listener])=>target.removeEventListener(type,listener));sprites.forEach(image=>{if(image)image.width=image.height=1;});canvas.width=canvas.height=1;}};
  };
})();
