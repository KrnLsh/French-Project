/* This worker owns its canvas and display clock; no per-frame bitmap copies. */
'use strict';
importScripts('hero-ascii-renderer.js');
let renderer=null,atlas=null,frame=0,lastTime=0,elapsed=0,running=false,reduced=false;
const state=new Float32Array(6); // smoothed x/y/hover, target x/y/hover
const pointReply={type:'pointer',point:null};
function paint(){renderer.paint(elapsed,state[0],state[1],state[2],reduced);}
function tick(now){
  frame=0;if(!running||!renderer)return;
  const dt=lastTime?Math.min((now-lastTime)*.001,.05):0;lastTime=now;elapsed+=dt;
  const blend=-Math.expm1(-7*dt);
  for(let i=0;i<3;i++)state[i]+=(state[i+3]-state[i])*blend;
  paint();frame=requestAnimationFrame(tick);
}
function sync(){
  cancelAnimationFrame(frame);frame=0;lastTime=0;
  if(running&&!reduced)frame=requestAnimationFrame(tick);
  else if(renderer)paint();
}
self.onmessage=event=>{
  const message=event.data;
  if(message.type==='init'){
    const context=message.canvas.getContext('2d',{alpha:true,desynchronized:true});
    if(!context)throw new Error('Offscreen 2D context unavailable');
    atlas=message.atlas;renderer=createAsciiRenderer(context,atlas);
    renderer.resize(message.width,message.height,message.ratio);paint();
    postMessage({type:'painted'});
  }else if(message.type==='resize'){
    renderer.resize(message.width,message.height,message.ratio);paint();
  }else if(message.type==='atlas'){
    atlas?.close();atlas=message.atlas;renderer.setAtlas(atlas);paint();
  }else if(message.type==='pointer'){
    state[3]=message.point[0];state[4]=message.point[1];state[5]=message.point[2];
    pointReply.point=message.point;
    postMessage(pointReply,[message.point.buffer]);pointReply.point=null;
  }else if(message.type==='state'){
    running=message.running;reduced=message.reduced;sync();
  }
};
postMessage({type:'ready',supported:typeof requestAnimationFrame==='function'&&typeof OffscreenCanvas==='function'});
