/* Compact, distance-sampled blue wisps. No rendering work survives an idle pointer. */
(() => {
  'use strict';
  window.createCursorFog = ({isReduced,isDesktop,pointerQuery}) => {
    const canvas=document.querySelector('#cursor-fog');
    if(!canvas)return null;
    const context=canvas.getContext('2d',{alpha:true});
    if(!context)return null;
    const limit=80,spacing=6;
    const stride=8,particles=new Float32Array(limit*stride),point=new Float32Array(2),previous=new Float32Array(2),bounds=new Float32Array(4);
    const sprites=[];
    let frame=0,lastFrame=0,index=0,width=0,height=0,ratio=1,hasPrevious=false,pendingPoint=false,dirtyBounds=false;
    let pointTime=0,previousTime=0;
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
      cancelAnimationFrame(frame);frame=0;lastFrame=0;hasPrevious=false;pendingPoint=false;dirtyBounds=false;
      particles.fill(0);
      context.clearRect(0,0,width,height);
    }
    function resize(){clear();if(allowed())size();}
    function spawn(x,y,dx,dy,speed){
      const offset=index*stride;index=(index+1)%limit;
      const side=Math.random()-.5;
      particles[offset]=x-dy*side*1.5;particles[offset+1]=y+dx*side*1.5;
      particles[offset+2]=-dx*(2+speed*2)-dy*side*5;
      particles[offset+3]=-dy*(2+speed*2)+dx*side*5-1;
      particles[offset+4]=9+speed*4+Math.random()*2;
      particles[offset+5]=particles[offset+6]=.32+Math.random()*.12;
      particles[offset+7]=Math.random()*Math.PI*2;
    }
    function draw(now){
      frame=0;
      if(!allowed()){clear();return;}
      const dt=Math.min(Math.max((now-lastFrame)*.001,0),.05);lastFrame=now;
      samplePointer();
      const target=document.documentElement.dataset.theme==='dark'?1:0;
      darkMix+=(target-darkMix)*-Math.expm1(-7*dt);
      if(dirtyBounds)context.clearRect(bounds[0],bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]);
      dirtyBounds=false;let active=false;
      for(let offset=0;offset<particles.length;offset+=stride){
        if(particles[offset+5]<=0)continue;
        const life=Math.max(0,particles[offset+5]-dt);particles[offset+5]=life;if(!life)continue;
        active=true;
        const ttl=particles[offset+6],age=ttl-life,progress=age/ttl;
        particles[offset]+=particles[offset+2]*dt;particles[offset+1]+=particles[offset+3]*dt;
        const radius=particles[offset+4]*(1+progress*.2),phase=particles[offset+7];
        const x=particles[offset]+Math.sin(phase+age*2.1)*age*2-radius;
        const y=particles[offset+1]+Math.cos(phase+age*1.7)*age*1.5-radius;
        const right=x+radius*2+2,bottom=y+radius*2+2;
        if(!dirtyBounds){bounds[0]=x-2;bounds[1]=y-2;bounds[2]=right;bounds[3]=bottom;dirtyBounds=true;}
        else{bounds[0]=Math.min(bounds[0],x-2);bounds[1]=Math.min(bounds[1],y-2);bounds[2]=Math.max(bounds[2],right);bounds[3]=Math.max(bounds[3],bottom);}
        const alpha=.22*Math.min(age/.025,1)*Math.pow(1-progress,1.6);
        if(darkMix<.998){context.globalAlpha=alpha*(1-darkMix);context.drawImage(sprites[0],x,y,radius*2,radius*2);}
        if(darkMix>.002){context.globalAlpha=alpha*darkMix;context.drawImage(sprites[1],x,y,radius*2,radius*2);}
      }
      context.globalAlpha=1;
      if(active)frame=requestAnimationFrame(draw);
      else{dirtyBounds=false;lastFrame=0;}
    }
    function samplePointer(){
      if(!pendingPoint||!hasPrevious)return;
      pendingPoint=false;
      const x=point[0],y=point[1],now=pointTime,dx=x-previous[0],dy=y-previous[1],distance=Math.hypot(dx,dy);
      if(distance<.35)return;
      const speed=Math.min(distance/Math.max(8,now-previousTime)/2,1),steps=Math.min(24,Math.max(1,Math.ceil(distance/spacing)));
      for(let step=1;step<=steps;step++){const t=step/steps;spawn(previous[0]+dx*t,previous[1]+dy*t,dx/distance,dy/distance,speed);}
      previous.set(point);previousTime=pointTime;
    }
    function move(event){
      if(event.pointerType==='touch'||!allowed()){if(frame||hasPrevious)clear();return;}
      const now=performance.now();point[0]=event.clientX;point[1]=event.clientY;pointTime=now;
      if(!hasPrevious){previous.set(point);previousTime=pointTime;hasPrevious=true;return;}
      pendingPoint=true;
      if(!frame){lastFrame=now;frame=requestAnimationFrame(draw);}
    }
    if(!prepare())return null;size();
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
