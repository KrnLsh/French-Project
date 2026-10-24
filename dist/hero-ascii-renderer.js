/* Shared allocation-free glyph field, used by the worker and compatibility renderer. */
(() => {
  'use strict';
  globalThis.createAsciiRenderer=(context,atlas)=>{
    const ramp=' .,:;i1tfLCG08@#';
    const clamp=(value,low,high)=>Math.min(high,Math.max(low,value));
    let width=0,height=0,columns=0,rows=0,cellW=0,cellH=0,stars,xs,horizons;
    function resize(w,h,ratio){
      width=w;height=h;
      context.canvas.width=Math.ceil(w*ratio);context.canvas.height=Math.ceil(h*ratio);
      context.setTransform(ratio,0,0,ratio,0,0);context.imageSmoothingEnabled=true;
      columns=clamp(Math.round(width/6.5),64,128);cellW=width/columns;
      rows=Math.min(72,Math.max(22,Math.round(height/(cellW*1.5))));cellH=height/rows;
      xs=new Float32Array(columns);horizons=new Float32Array(columns);
      stars=new Float32Array(columns*rows);
      for(let index=0;index<stars.length;index++){
        const value=Math.sin((index%columns)*127.1+Math.floor(index/columns)*311.7)*43758.5453;
        stars[index]=value-Math.floor(value);
      }
    }
    function paint(elapsed,mx,my,hover,reduced){
      if(!columns)return;
      const t=reduced?0:elapsed,aspect=width/height;
      const formScale=width<500?.88:1,centerX=.54+mx*.012,centerY=(width<500?.43:.405)+my*.014;
      const tilt=.32+Math.sin(t*.21)*.08+mx*.12,ct=Math.cos(tilt),st=Math.sin(tilt);
      const baseRadius=.315*formScale,outerRadius2=(baseRadius*1.025)**2;
      const ringX2=(.57*formScale)**2,ringY2=(.132*formScale)**2;
      const lightX=-.48+mx*.15,lightY=-.48+my*.1,hovering=hover>.01;
      for(let column=0;column<columns;column++){
        const u=(column+.5)/columns;
        xs[column]=(u-centerX)*aspect;
        horizons[column]=.72+.022*Math.sin(u*11+t*.15)+.012*Math.sin(u*23-t*.18);
      }
      context.clearRect(0,0,width,height);
      for(let row=0;row<rows;row++){
        const v=(row+.5)/rows,y=v-centerY,y2=y*y;
        for(let column=0;column<columns;column++){
          const u=(column+.5)/columns,x=xs[column],ground=v-horizons[column];
          let value=0;
          // Terrain replaces the sky; do not shade a hidden planet underneath it.
          if(ground>0){
            const depth=1/(ground+.055),across=(u-.52)*depth;
            const gridX=Math.abs(Math.sin(across*2.6+Math.sin(depth*.55+t*.16)));
            const gridZ=Math.abs(Math.sin(depth*.9-t*.56+Math.sin(across*.8)*.2));
            value=gridX<.095||gridZ<.13?.33+Math.min(ground,.3)*.6:.025;
          }else{
            const star=stars[row*columns+column];
            if(star>.995&&v<.68)value=.21+.11*Math.sin(t*.65+star*900);
            const rx=x*ct+y*st,ry=-x*st+y*ct;
            const ring=Math.abs(rx*rx/ringX2+ry*ry/ringY2-1);
            if(ring<.043)value=.45+.24*Math.sin(rx*28-t*.5);
            const distance2=x*x+y2;
            if(distance2<outerRadius2){
              const angle=Math.atan2(y,x),radius=baseRadius*(1+.024*Math.sin(angle*6+t*.38));
              const r2=distance2/(radius*radius);
              if(r2<1){
                const nx=x/radius,ny=y/radius,nz=Math.sqrt(1-r2);
                const latitude=Math.asin(clamp(ny,-1,1)),longitude=Math.atan2(nx,nz)+t*.21+mx*.35;
                const surface=Math.sin(longitude*7+Math.sin(latitude*5)*1.8)*Math.sin(latitude*9+longitude*2-t*.09);
                const light=Math.max(0,nx*lightX+ny*lightY+nz*.76);
                const contours=Math.pow(.5+.5*Math.sin(longitude*21+latitude*25+surface*2),10);
                value=.08+light*.64+surface*.13+contours*.2;
                if(ring<.043&&ry>0)value=.67;
              }
            }
          }
          if(hovering){const d=Math.hypot(u-(mx*.5+.5),v-(my*.5+.5));value+=Math.sin(d*65-t*4)*Math.exp(-d*12)*hover*.12;}
          const glyph=clamp(Math.round(value*(ramp.length-1)),0,ramp.length-1);
          if(glyph)context.drawImage(atlas,glyph*16,0,16,24,column*cellW,row*cellH,cellW,cellH);
        }
      }
    }
    return {resize,paint,setAtlas(value){atlas=value;}};
  };
})();
