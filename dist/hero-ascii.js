/* A live world made only from ASCII glyphs; no image texture or WebGL readback. */
(() => {
  'use strict';
  window.createHeroAscii=({isReduced,isDialogOpen})=>{
    const host=document.querySelector('.hero-ascii'),canvas=document.querySelector('#hero-ascii-canvas');
    if(!host||!canvas)return {destroy(){}};
    const context=canvas.getContext('2d',{alpha:true});
    if(!context)return {destroy(){}};
    const root=document.documentElement,ramp=' .,:;i1tfLCG08@#';
    const atlas=document.createElement('canvas');atlas.width=ramp.length*16;atlas.height=24;
    const brush=atlas.getContext('2d');
    if(!brush)return {destroy(){}};
    let width=0,height=0,columns=0,rows=0,cellW=0,cellH=0,stars=[];
    let frame=0,lastTime=0,lastPaint=0,elapsed=0,visible=false,suspended=false,destroyed=false,painted=false;
    let ink=getComputedStyle(root).getPropertyValue('--accent-primary').trim()||'#002FA7';
    let mx=0,my=0,tx=0,ty=0,hover=0,over=false;
    const clamp=(value,low,high)=>Math.min(high,Math.max(low,value));
    const canRun=()=>!destroyed&&!suspended&&!document.hidden&&visible&&!isReduced()&&!isDialogOpen()&&root.classList.contains('ready');
    function makeAtlas(){
      brush.clearRect(0,0,atlas.width,atlas.height);brush.fillStyle='#FFFFFF';
      brush.font='700 18px "Space Mono",monospace';brush.textAlign='center';brush.textBaseline='middle';
      for(let i=1;i<ramp.length;i++)brush.fillText(ramp[i],i*16+8,12);
    }
    function resize(){
      if(destroyed)return;
      const nextW=Math.round(host.clientWidth),nextH=Math.round(host.clientHeight);
      if(!nextW||!nextH)return;
      if(nextW===width&&nextH===height)return;
      width=nextW;height=nextH;
      const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1000000/(width*height)));
      canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);
      context.setTransform(ratio,0,0,ratio,0,0);context.imageSmoothingEnabled=true;
      columns=clamp(Math.round(width/5.5),68,156);cellW=width/columns;
      rows=Math.min(88,Math.max(22,Math.round(height/(cellW*1.5))));cellH=height/rows;
      stars=Array.from({length:columns*rows},(_,index)=>{
        const value=Math.sin((index%columns)*127.1+Math.floor(index/columns)*311.7)*43758.5453;
        return value-Math.floor(value);
      });
      paint();queue();
    }
    function paint(){
      if(destroyed||!columns)return;
      const t=isReduced()?0:elapsed,aspect=width/height;
      const compact=width<500,formScale=compact?.88:1;
      const centerX=.54+mx*.012,centerY=(compact?.43:.405)+my*.014;
      const tilt=.32+Math.sin(t*.21)*.08+mx*.12,ct=Math.cos(tilt),st=Math.sin(tilt);
      context.clearRect(0,0,width,height);
      for(let row=0;row<rows;row++){
        const v=(row+.5)/rows;
        for(let column=0;column<columns;column++){
          const u=(column+.5)/columns;
          const x=(u-centerX)*aspect,y=v-centerY;
          const angle=Math.atan2(y,x),radius=.315*formScale*(1+.024*Math.sin(angle*6+t*.38));
          const r2=(x*x+y*y)/(radius*radius);
          const rx=x*ct+y*st,ry=-x*st+y*ct;
          const ring=Math.abs(rx*rx/(.57*.57*formScale*formScale)+ry*ry/(.132*.132*formScale*formScale)-1);
          let value=0;
          const star=stars[row*columns+column];
          if(star>.995&&v<.68)value=.21+.11*Math.sin(t*.65+star*900);
          if(ring<.043)value=.45+.24*Math.sin(rx*28-t*.5);
          if(r2<1){
            const nx=x/radius,ny=y/radius,nz=Math.sqrt(1-r2);
            const latitude=Math.asin(clamp(ny,-1,1)),longitude=Math.atan2(nx,nz)+t*.21+mx*.35;
            const surface=Math.sin(longitude*7+Math.sin(latitude*5)*1.8)*Math.sin(latitude*9+longitude*2-t*.09);
            const light=Math.max(0,nx*(-.48+mx*.15)+ny*(-.48+my*.1)+nz*.76);
            const contours=Math.pow(.5+.5*Math.sin(longitude*21+latitude*25+surface*2),10);
            value=.08+light*.64+surface*.13+contours*.2;
            if(ring<.043&&ry>0)value=.67;
          }
          const horizon=.72+.022*Math.sin(u*11+t*.15)+.012*Math.sin(u*23-t*.18);
          const ground=v-horizon;
          if(ground>0){
            const depth=1/(ground+.055),across=(u-.52)*depth;
            const gridX=Math.abs(Math.sin(across*2.6+Math.sin(depth*.55+t*.16)));
            const gridZ=Math.abs(Math.sin(depth*.9-t*.56+Math.sin(across*.8)*.2));
            value=gridX<.095||gridZ<.13?.33+Math.min(ground,.3)*.6:.025;
          }
          if(hover>.01){
            const d=Math.hypot(u-(mx*.5+.5),v-(my*.5+.5));
            value+=Math.sin(d*65-t*4)*Math.exp(-d*12)*hover*.12;
          }
          const glyph=clamp(Math.round(value*(ramp.length-1)),0,ramp.length-1);
          if(glyph)context.drawImage(atlas,glyph*16,0,16,24,column*cellW,row*cellH,cellW,cellH);
        }
      }
      context.globalCompositeOperation='source-in';context.fillStyle=ink;
      context.fillRect(0,0,width,height);context.globalCompositeOperation='source-over';
      if(!painted){host.classList.add('is-ascii-ready');painted=true;}
    }
    function stop(){cancelAnimationFrame(frame);frame=0;lastTime=0;lastPaint=0;}
    function tick(now){
      frame=0;if(!canRun()){lastTime=0;return;}
      if(lastPaint&&now-lastPaint<32){queue();return;}
      const dt=lastTime?Math.min((now-lastTime)*.001,.08):1/30;
      lastTime=lastPaint=now;elapsed+=dt;
      const blend=-Math.expm1(-7*dt);
      mx+=(tx-mx)*blend;my+=(ty-my)*blend;hover+=((over?1:0)-hover)*blend;
      paint();queue();
    }
    function queue(){if(!frame&&canRun())frame=requestAnimationFrame(tick);}
    function sync(){if(canRun())queue();else{stop();if(!document.hidden&&visible)paint();}}
    function move(event){
      if(event.pointerType==='touch'||isReduced())return;
      const rect=host.getBoundingClientRect();if(!rect.width||!rect.height)return;
      tx=clamp((event.clientX-rect.left)/rect.width*2-1,-1,1);
      ty=clamp((event.clientY-rect.top)/rect.height*2-1,-1,1);over=true;
    }
    function leave(){tx=ty=0;over=false;}
    function hide(){suspended=true;stop();}
    function show(){suspended=false;sync();}
    makeAtlas();resize();
    const intersection=new IntersectionObserver(entries=>{
      visible=entries.some(entry=>entry.isIntersecting);sync();
    },{threshold:0});
    const sizes=new ResizeObserver(resize);
    const mutations=new MutationObserver(sync);
    intersection.observe(host);sizes.observe(host);
    mutations.observe(root,{attributes:true,attributeFilter:['class']});
    const unsubscribe=window.lartTheme?.subscribe(palette=>{ink=palette.accent;if(!frame&&!document.hidden)paint();});
    const listeners=[
      [host,'pointermove',move],[host,'pointerleave',leave],[host,'pointercancel',leave],
      [document,'visibilitychange',sync],[window,'lart-motion-change',sync],
      [window,'pagehide',hide],[window,'pageshow',show]
    ];
    listeners.forEach(([target,type,listener])=>target.addEventListener(type,listener,{passive:true}));
    document.fonts.ready.then(()=>{if(!destroyed){makeAtlas();paint();}});
    return {destroy(){
      if(destroyed)return;destroyed=true;stop();unsubscribe?.();
      intersection.disconnect();sizes.disconnect();mutations.disconnect();
      listeners.forEach(([target,type,listener])=>target.removeEventListener(type,listener));
      atlas.width=atlas.height=canvas.width=canvas.height=1;
      host.classList.remove('is-ascii-ready');
    }};
  };
})();
