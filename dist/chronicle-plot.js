/* Static accessible SVG axes; one GPU draw replaces per-frame SVG geometry mutation. */
(() => {
  'use strict';
  window.createChroniclePlot=chart=>{
    const T=window.THREE;if(!T)return null;
    let renderer;
    try{renderer=new T.WebGLRenderer({alpha:true,antialias:false,powerPreference:'high-performance'});}catch{return null;}
    const wrapper=document.createElement('div');wrapper.className='chronicle-plot';
    chart.parentNode.insertBefore(wrapper,chart);wrapper.append(chart,renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden','true');renderer.outputColorSpace=T.LinearSRGBColorSpace;
    const uniforms={uStep:{value:0},uBaseline:{value:340},uUnit:{value:40},uHeight:{value:420},uPixel:{value:1},uInk:{value:new T.Vector3(0,.1843,.6549)},uPaper:{value:new T.Vector3(.9647,.9608,.9412)}};
    const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
      precision highp float;
      varying vec2 vUv;
      uniform float uStep,uBaseline,uUnit,uHeight,uPixel;
      uniform vec3 uInk,uPaper;
      float count(float i){return i<.5?0.:min(i+1.,7.);}
      float segment(vec2 p,vec2 a,vec2 b){vec2 ab=b-a;return length(p-a-ab*clamp(dot(p-a,ab)/dot(ab,ab),0.,1.));}
      void main(){
        vec2 p=vec2(vUv.x*800.,(1.-vUv.y)*uHeight);
        float whole=floor(uStep),part=fract(uStep),headX=68.+96.*uStep;
        float headY=uBaseline-mix(count(whole),count(min(whole+1.,7.)),part)*uUnit;
        float aa=max(.65,uPixel),line=0.,bars=0.;
        for(int i=0;i<7;i++){
          float n=float(i);vec2 a=vec2(68.+96.*n,uBaseline-count(n)*uUnit),b=vec2(a.x+96.,uBaseline-count(n+1.)*uUnit);
          line=max(line,1.-smoothstep(.8,1.4+aa,segment(p,a,b)));
        }
        for(int i=0;i<8;i++){
          float n=float(i),h=count(n)*uUnit*clamp(uStep-n+1.,0.,1.);
          if(abs(p.x-(68.+96.*n))<20.&&p.y<uBaseline&&p.y>uBaseline-h)bars=max(bars,abs(n-floor(uStep+.5))<.5?.16:.08);
        }
        float column=clamp((p.x-68.)/96.,0.,7.),cell=floor(column);
        float curve=uBaseline-mix(count(cell),count(min(cell+1.,7.)),fract(column))*uUnit;
        float fill=p.x>=68.&&p.x<=headX&&p.y>curve&&p.y<uBaseline?.12*(uBaseline-p.y)/max(1.,uBaseline-60.):0.;
        float guide=abs(p.x-headX)<.5&&p.y>25.&&p.y<uBaseline&&mod(p.y,9.)<3.?.3:0.;
        float alpha=max(max(fill,bars),guide);alpha=max(alpha,line*step(p.x,headX));
        vec3 color=uInk;float d=length(p-vec2(headX,headY));
        float halo=(1.-smoothstep(13.,14.+aa,d))*.09;
        alpha=max(alpha,halo);
        if(d<7.+aa){float head=1.-smoothstep(5.,6.+aa,d);color=mix(uPaper,vec3(.898,.224,.208),head);alpha=1.-smoothstep(7.,7.+aa,d);}
        else if(halo>alpha*.5)color=vec3(.898,.224,.208);
        gl_FragColor=vec4(color,alpha);
      }
    `});
    const scene=new T.Scene(),geometry=new T.PlaneGeometry(2,2),camera=new T.Camera();scene.add(new T.Mesh(geometry,material));
    let lost=false,width=0,height=0;
    function resize(){
      if(lost)return;
      width=Math.max(1,chart.clientWidth);height=Math.max(1,chart.clientHeight);
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25,Math.sqrt(500000/(width*height))));renderer.setSize(width,height,false);
      uniforms.uPixel.value=800/width;renderer.render(scene,camera);
    }
    function draw(value,baseline,unit){
      if(lost)return false;
      uniforms.uStep.value=value*7;uniforms.uBaseline.value=baseline;uniforms.uUnit.value=unit;uniforms.uHeight.value=baseline===204?280:420;
      renderer.render(scene,camera);return true;
    }
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;chart.classList.remove('gpu-plot-ready');});
    renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;chart.classList.add('gpu-plot-ready');resize();});
    chart.classList.add('gpu-plot-ready');
    const sizes=new ResizeObserver(()=>window.museumFrames.write(resize));sizes.observe(chart);resize();
    const unsubscribe=window.lartTheme?.subscribe(palette=>{
      const ink=new T.Color(palette.accent).convertLinearToSRGB(),paper=new T.Color(palette.background).convertLinearToSRGB();
      uniforms.uInk.value.set(ink.r,ink.g,ink.b);uniforms.uPaper.value.set(paper.r,paper.g,paper.b);
      if(!lost)renderer.render(scene,camera);
    });
    return {draw,destroy(){window.museumFrames.cancel(resize);sizes.disconnect();unsubscribe?.();geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();chart.classList.remove('gpu-plot-ready');}};
  };
})();
