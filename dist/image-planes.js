/* Hover-only image effects. Each plane owns and releases all of its GPU resources. */
(() => {
  'use strict';
  window.createImagePlanes=({THREE,isReduced,isDesktop,pointerQuery})=>{
    if(!THREE)return {destroy(){}};
    const controllers=new Map();
    let suspended=false,destroyed=false;
    const allowed=()=>!destroyed&&!suspended&&!document.hidden&&!isReduced()&&isDesktop()&&pointerQuery.matches;
    const damp=(value,target,rate,dt)=>value+(target-value)*-Math.expm1(-rate*dt);
    const intersection=new IntersectionObserver(entries=>{
      entries.forEach(entry=>controllers.get(entry.target)?.setVisible(entry.isIntersecting));
    },{rootMargin:'150px'});
    const sizes=new ResizeObserver(entries=>{
      entries.forEach(entry=>controllers.get(entry.target)?.resize());
    });
    for(const container of document.querySelectorAll('.image-distort')){
      const image=container.querySelector('img');if(!image)continue;
      let renderer=null,scene=null,camera=null,material=null,texture=null,geometry=null;
      let visible=false,hover=false,lost=false,frame=0,lastTime=0,elapsed=0,dirty=false;
      let lastWidth=0,lastHeight=0;
      const target=new THREE.Vector2(.5,.5);
      function stop(){cancelAnimationFrame(frame);frame=0;lastTime=0;}
      function release(){
        stop();container.classList.remove('webgl-ready');
        if(renderer){
          const canvas=renderer.domElement;
          canvas.removeEventListener('webglcontextlost',onLost);
          canvas.removeEventListener('webglcontextrestored',onRestored);
          geometry?.dispose();material?.dispose();texture?.dispose();
          canvas.remove();renderer.dispose();renderer.forceContextLoss?.();
        }
        renderer=scene=camera=material=texture=geometry=null;
        lost=false;dirty=false;lastWidth=lastHeight=0;
      }
      function onLost(event){
        event.preventDefault();lost=true;stop();container.classList.remove('webgl-ready');
      }
      function onRestored(){
        lost=false;dirty=true;container.classList.add('webgl-ready');sync();
      }
      function resize(){
        if(!allowed()){release();return;}
        if(!renderer||lost)return;
        const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight);
        if(width===lastWidth&&height===lastHeight)return;
        lastWidth=width;lastHeight=height;
        renderer.setPixelRatio(Math.min(devicePixelRatio,1.5,Math.sqrt(1000000/(width*height))));
        renderer.setSize(width,height,false);
        material.uniforms.uPlaneAspect.value=width/height;dirty=true;
        if(visible)queue();
      }
      function start(){
        if(renderer||!visible||!allowed()||!image.complete||!image.naturalWidth)return;
        try{
          renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
          renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
          renderer.domElement.setAttribute('aria-hidden','true');
          const source=document.createElement('canvas'),pixelArt=image.classList.contains('pixel-art');
          const scale=pixelArt?1:Math.min(1,1600/image.naturalWidth,1600/image.naturalHeight,Math.sqrt(1500000/(image.naturalWidth*image.naturalHeight)));
          source.width=Math.max(1,Math.round(image.naturalWidth*scale));
          source.height=Math.max(1,Math.round(image.naturalHeight*scale));
          const context=source.getContext('2d');if(!context)throw new Error('Image texture canvas unavailable');
          context.drawImage(image,0,0,source.width,source.height);
          texture=new THREE.CanvasTexture(source);texture.colorSpace=THREE.NoColorSpace;
          if(pixelArt){texture.minFilter=THREE.NearestFilter;texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;}
          material=new THREE.ShaderMaterial({
            uniforms:{uTexture:{value:texture},uMouse:{value:new THREE.Vector2(.5,.5)},uStrength:{value:0},uTime:{value:0},uImageAspect:{value:image.naturalWidth/image.naturalHeight},uPlaneAspect:{value:1}},
            vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
            fragmentShader:'precision highp float;varying vec2 vUv;uniform sampler2D uTexture;uniform vec2 uMouse;uniform float uStrength,uTime,uImageAspect,uPlaneAspect;void main(){vec2 uv=vUv;vec2 scale=vec2(min(uPlaneAspect/uImageAspect,1.),min(uImageAspect/uPlaneAspect,1.));uv=(uv-.5)*scale+.5;vec2 offset=vUv-uMouse;float d=length(offset);float ripple=sin(d*22.-uTime*2.)*exp(-d*5.)*uStrength*.013;uv+=offset/(d+.18)*ripple;gl_FragColor=texture2D(uTexture,clamp(uv,vec2(.001),vec2(.999)));}'
          });
          geometry=new THREE.PlaneGeometry(2,2);scene=new THREE.Scene();
          scene.add(new THREE.Mesh(geometry,material));camera=new THREE.Camera();
          renderer.domElement.addEventListener('webglcontextlost',onLost);
          renderer.domElement.addEventListener('webglcontextrestored',onRestored);
          container.insertBefore(renderer.domElement,image.nextSibling);
          container.classList.add('webgl-ready');resize();dirty=true;
        }catch{release();}
      }
      function draw(time){
        frame=0;
        if(!renderer||!visible||!allowed()||lost){lastTime=0;return;}
        const dt=lastTime?Math.min((time-lastTime)*.001,.05):1/60;lastTime=time;elapsed+=dt;
        const strength=material.uniforms.uStrength;
        strength.value=damp(strength.value,hover?1:0,8,dt);
        material.uniforms.uMouse.value.lerp(target,-Math.expm1(-12*dt));
        material.uniforms.uTime.value=elapsed;
        renderer.render(scene,camera);dirty=false;
        if(hover||strength.value>.005)frame=requestAnimationFrame(draw);else lastTime=0;
      }
      function queue(){if(!frame&&renderer&&visible&&allowed()&&!lost)frame=requestAnimationFrame(draw);}
      function sync(){
        stop();
        if(!allowed()){release();return;}
        if(visible&&hover)start();
        if(visible&&(hover||dirty||material?.uniforms.uStrength.value>.005))queue();
      }
      function enter(){hover=true;start();queue();}
      function leave(){hover=false;queue();}
      function move(event){
        if(!renderer||!allowed())return;
        const box=container.getBoundingClientRect();
        target.set((event.clientX-box.left)/box.width,1-(event.clientY-box.top)/box.height);queue();
      }
      function loaded(){if(visible&&hover){start();queue();}}
      container.addEventListener('pointerenter',enter);
      container.addEventListener('pointerleave',leave);
      container.addEventListener('pointermove',move,{passive:true});
      image.addEventListener('load',loaded);
      controllers.set(container,{
        setVisible(value){visible=value;if(!value){hover=false;release();}else sync();},
        resize,sync,
        destroy(){
          release();container.removeEventListener('pointerenter',enter);
          container.removeEventListener('pointerleave',leave);container.removeEventListener('pointermove',move);
          image.removeEventListener('load',loaded);
        }
      });
      intersection.observe(container);sizes.observe(container);
    }
    const sync=()=>controllers.forEach(controller=>controller.sync());
    const hide=()=>{suspended=true;sync();};
    const show=()=>{suspended=false;sync();};
    document.addEventListener('visibilitychange',sync);
    addEventListener('lart-motion-change',sync);addEventListener('pagehide',hide);addEventListener('pageshow',show);
    pointerQuery.addEventListener('change',sync);
    return {destroy(){
      if(destroyed)return;destroyed=true;intersection.disconnect();sizes.disconnect();
      controllers.forEach(controller=>controller.destroy());controllers.clear();
      document.removeEventListener('visibilitychange',sync);
      removeEventListener('lart-motion-change',sync);removeEventListener('pagehide',hide);removeEventListener('pageshow',show);
      pointerQuery.removeEventListener('change',sync);
    }};
  };
})();
