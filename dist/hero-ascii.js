/* Main thread owns input/layout only; the worker owns the glyph field and vsync. */
(() => {
  'use strict';
  window.createHeroAscii=({isReduced,isDialogOpen})=>{
    const host=document.querySelector('.hero-ascii');
    let canvas=document.querySelector('#hero-ascii-canvas');
    if(!host||!canvas)return {destroy(){}};
    const root=document.documentElement,atlas=document.createElement('canvas');
    atlas.width=16*16;atlas.height=24;
    const brush=atlas.getContext('2d');
    if(!brush)return {destroy(){}};
    const geometry=window.createFrameGeometry(host),bounds=geometry.bounds;
    const point=new Float32Array(3),state=new Float32Array(3);
    const pointMessage={type:'pointer',point:null};
    let transferPoint=new Float32Array(3),pointDirty=false,inputFrame=0;
    let renderer=null,worker=null,workerReady=false,transferred=false,atlasVersion=0;
    let width=0,height=0,ratio=1,frame=0,lastTime=0,elapsed=0;
    let visible=false,suspended=false,destroyed=false,workerRunning=null,workerReduced=null;
    let ink=getComputedStyle(root).getPropertyValue('--accent-primary').trim()||'#002FA7';
    const canRun=()=>!destroyed&&!suspended&&!document.hidden&&visible&&!isReduced()&&!isDialogOpen()&&root.classList.contains('ready');
    function makeAtlas(){
      const ramp=' .,:;i1tfLCG08@#';
      brush.clearRect(0,0,atlas.width,atlas.height);brush.fillStyle=ink;
      brush.font='700 18px "Space Mono",monospace';brush.textAlign='center';brush.textBaseline='middle';
      for(let i=1;i<ramp.length;i++)brush.fillText(ramp[i],i*16+8,12);
    }
    function ready(){if(!destroyed)host.classList.add('is-ascii-ready');}
    function paint(){if(renderer&&width){renderer.paint(elapsed,state[0],state[1],state[2],isReduced());ready();}}
    function stop(){cancelAnimationFrame(frame);frame=0;lastTime=0;}
    function tick(now){
      frame=0;if(!canRun()){lastTime=0;return;}
      const dt=lastTime?Math.min((now-lastTime)*.001,.05):0;lastTime=now;elapsed+=dt;
      const blend=-Math.expm1(-7*dt);
      for(let i=0;i<3;i++)state[i]+=(point[i]-state[i])*blend;
      paint();queue();
    }
    function queue(){if(!worker&&renderer&&!frame&&canRun())frame=requestAnimationFrame(tick);}
    function sync(){
      const running=canRun(),reduced=isReduced();
      if(workerReady){
        if(running!==workerRunning||reduced!==workerReduced){worker.postMessage({type:'state',running,reduced});workerRunning=running;workerReduced=reduced;}
      }else if(!worker){if(running)queue();else{stop();if(visible&&!document.hidden&&!suspended&&!isDialogOpen()&&reduced)paint();}}
    }
    function resize(){
      if(destroyed)return;
      const nextW=Math.round(host.clientWidth),nextH=Math.round(host.clientHeight);
      if(!nextW||!nextH||nextW===width&&nextH===height)return;
      width=nextW;height=nextH;ratio=Math.min(devicePixelRatio||1,1.25,Math.sqrt(650000/(width*height)));
      geometry.invalidate();
      if(workerReady)worker.postMessage({type:'resize',width,height,ratio});
      else if(renderer){renderer.resize(width,height,ratio);paint();queue();}
    }
    function sendPointer(){
      inputFrame=0;
      if(!workerReady||!transferPoint||!pointDirty||destroyed)return;
      transferPoint.set(point);pointMessage.point=transferPoint;pointDirty=false;
      worker.postMessage(pointMessage,[transferPoint.buffer]);transferPoint=null;pointMessage.point=null;
    }
    function queuePointer(){if(workerReady&&transferPoint&&!inputFrame)inputFrame=requestAnimationFrame(sendPointer);}
    function move(event){
      if(event.pointerType==='touch'||isReduced())return;
      if(bounds[2]&&bounds[3]){
        point[0]=Math.max(-1,Math.min(1,(event.clientX-bounds[0])/bounds[2]*2-1));
        point[1]=Math.max(-1,Math.min(1,(event.clientY-bounds[1])/bounds[3]*2-1));
      }
      point[2]=1;pointDirty=true;queuePointer();
    }
    function leave(){point.fill(0);pointDirty=true;queuePointer();}
    function fallback(){
      worker?.terminate();worker=null;workerReady=false;
      if(destroyed)return;
      if(transferred){const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;transferred=false;}
      const context=canvas.getContext('2d',{alpha:true,desynchronized:true});
      if(!context)return;
      canvas.dataset.renderer='main';renderer=globalThis.createAsciiRenderer(context,atlas);renderer.resize(width,height,ratio);paint();sync();
    }
    async function updateAtlas(){
      makeAtlas();
      if(!workerReady){if(renderer)paint();return;}
      const version=++atlasVersion;
      try{
        const bitmap=await createImageBitmap(atlas);
        if(destroyed||!workerReady||version!==atlasVersion){bitmap.close();return;}
        worker.postMessage({type:'atlas',atlas:bitmap},[bitmap]);
      }catch{fallback();}
    }
    async function startWorker(){
      if(typeof Worker!=='function'||typeof createImageBitmap!=='function'||!canvas.transferControlToOffscreen){fallback();return;}
      try{
        worker=new Worker(new URL('hero-ascii-worker.js',document.baseURI));
        worker.onerror=event=>{event.preventDefault();fallback();};
        worker.onmessage=async event=>{
          if(destroyed)return;
          const message=event.data;
          if(message.type==='ready'){
            if(!message.supported){fallback();return;}
            try{
              const bitmap=await createImageBitmap(atlas);
              if(destroyed||!worker){bitmap.close();return;}
              const offscreen=canvas.transferControlToOffscreen();transferred=true;
              worker.postMessage({type:'init',canvas:offscreen,atlas:bitmap,width,height,ratio},[offscreen,bitmap]);
              workerReady=true;canvas.dataset.renderer='worker';workerRunning=workerReduced=null;sync();pointDirty=true;queuePointer();
            }catch{fallback();}
          }else if(message.type==='painted')ready();
          else if(message.type==='pointer'){transferPoint=message.point;if(pointDirty)queuePointer();}
        };
      }catch{fallback();}
    }
    function hide(){suspended=true;sync();}
    function show(){suspended=false;sync();}
    makeAtlas();resize();startWorker();
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0});
    const sizes=new ResizeObserver(()=>{window.museumFrames.read(resize);});
    const mutations=new MutationObserver(sync);
    intersection.observe(host);sizes.observe(host);mutations.observe(root,{attributes:true,attributeFilter:['class']});
    const unsubscribe=window.lartTheme?.subscribe(palette=>{if(ink!==palette.accent){ink=palette.accent;updateAtlas();}});
    const listeners=[
      [host,'pointermove',move],[host,'pointerleave',leave],[host,'pointercancel',leave],
      [document,'visibilitychange',sync],[window,'lart-motion-change',sync],[window,'lart-dialog-change',sync],
      [window,'pagehide',hide],[window,'pageshow',show]
    ];
    listeners.forEach(([target,type,listener])=>target.addEventListener(type,listener,{passive:true}));
    document.fonts.ready.then(()=>{if(!destroyed)updateAtlas();});
    return {destroy(){
      if(destroyed)return;destroyed=true;stop();window.museumFrames.cancel(resize);cancelAnimationFrame(inputFrame);worker?.terminate();unsubscribe?.();geometry.destroy();
      intersection.disconnect();sizes.disconnect();mutations.disconnect();
      listeners.forEach(([target,type,listener])=>target.removeEventListener(type,listener));
      atlas.width=atlas.height=1;if(!transferred)canvas.width=canvas.height=1;
      host.classList.remove('is-ascii-ready');
    }};
  };
})();
