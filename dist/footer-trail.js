/* One bounded canvas replaces 108 DOM cells, listeners, timers, and color repaints. */
(() => {
  'use strict';
  window.createFooterTrail=(host,isReduced)=>{
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{alpha:true});
    if(!context)return {destroy(){}};
    canvas.setAttribute('aria-hidden','true');host.append(canvas);
    const geometry=window.createFrameGeometry(host),bounds=geometry.bounds,life=new Float32Array(108);
    let frame=0,lastTime=0,width=0,height=0,columns=18,dirty=-1,destroyed=false;
    function clear(){cancelAnimationFrame(frame);frame=0;lastTime=0;dirty=-1;life.fill(0);context.clearRect(0,0,width,height);}
    function resize(){
      if(destroyed)return;
      width=host.clientWidth;height=host.clientHeight;columns=innerWidth<=760?12:18;
      const ratio=Math.min(devicePixelRatio||1,1.25,Math.sqrt(600000/Math.max(1,width*height)));
      canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);context.setTransform(ratio,0,0,ratio,0,0);
      context.fillStyle=ink;geometry.invalidate();
    }
    function draw(now){
      frame=0;if(destroyed||document.hidden||isReduced())return;
      const dt=lastTime?Math.min((now-lastTime)*.001,.05):0;lastTime=now;
      if(dirty>=0){life[dirty]=1;dirty=-1;}
      const decay=Math.exp(-3.5*dt),cellW=width/columns,cellH=height/6;
      context.clearRect(0,0,width,height);let active=false;
      for(let i=0;i<columns*6;i++){
        life[i]*=decay;if(life[i]<.003){life[i]=0;continue;}
        active=true;context.globalAlpha=life[i];context.fillRect((i%columns)*cellW,Math.floor(i/columns)*cellH,cellW,cellH);
      }
      context.globalAlpha=1;
      if(active)frame=requestAnimationFrame(draw);else lastTime=0;
    }
    function move(event){
      if(isReduced()||document.hidden||!bounds[2]||!bounds[3])return;
      const x=Math.max(0,Math.min(columns-1,Math.floor((event.clientX-bounds[0])/bounds[2]*columns)));
      const y=Math.max(0,Math.min(5,Math.floor((event.clientY-bounds[1])/bounds[3]*6)));
      dirty=y*columns+x;if(!frame)frame=requestAnimationFrame(draw);
    }
    let ink='#002FA7';
    const unsubscribe=window.lartTheme?.subscribe(palette=>{ink=palette.accent;context.fillStyle=ink;});
    const sizes=new ResizeObserver(()=>window.museumFrames.write(resize));sizes.observe(host);resize();
    host.addEventListener('pointermove',move,{passive:true});
    document.addEventListener('visibilitychange',clear);window.addEventListener('lart-motion-change',clear);window.addEventListener('pagehide',clear);
    return {destroy(){destroyed=true;clear();window.museumFrames.cancel(resize);sizes.disconnect();geometry.destroy();unsubscribe?.();host.removeEventListener('pointermove',move);document.removeEventListener('visibilitychange',clear);window.removeEventListener('lart-motion-change',clear);window.removeEventListener('pagehide',clear);canvas.remove();}};
  };
})();
