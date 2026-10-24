/* Apply the saved appearance before the first paint, then share its live palette. */
(() => {
 'use strict';
 const root=document.documentElement,system=matchMedia('(prefers-color-scheme:dark)');
 const storageKey='lart-theme',listeners=new Set();
 let explicit=false,frame=0,cachedPalette=null;
 let saved=null;
 try{saved=localStorage.getItem(storageKey);}catch{}
 if(saved==='light'||saved==='dark')explicit=true;
 const initial=explicit?saved:(system.matches?'dark':'light');
 root.dataset.theme=initial;
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.content=initial==='dark'?'#191B1B':'#F6F5F0';
 function palette(){
  if(cachedPalette)return cachedPalette;
  const style=getComputedStyle(root),read=name=>style.getPropertyValue(name).trim();
  cachedPalette={background:read('--bg-primary'),secondary:read('--bg-secondary'),accent:read('--accent-primary'),contour:read('--contour-ink')};
  return cachedPalette;
 }
 function paint(){
  cancelAnimationFrame(frame);frame=0;if(document.hidden)return;
  const value=palette();listeners.forEach(listener=>listener(value));

 }
 function syncControl(){
  const button=document.querySelector('#theme-toggle');if(!button)return;
  const dark=root.dataset.theme==='dark';
  button.setAttribute('aria-pressed',String(dark));button.title='Switch to '+(dark?'light':'dark')+' mode';
  button.querySelector('.theme-label').textContent=dark?'DARK':'LIGHT';
 }
 function setTheme(theme,{persist=false}={}){
  if(theme!=='light'&&theme!=='dark')return;
  if(persist){explicit=true;try{localStorage.setItem(storageKey,theme);}catch{}}
  if(root.dataset.theme===theme){syncControl();return;}
  root.dataset.theme=theme;cachedPalette=null;syncControl();
  if(meta)meta.content=theme==='dark'?'#191B1B':'#F6F5F0';
  cancelAnimationFrame(frame);frame=requestAnimationFrame(paint);
  dispatchEvent(new CustomEvent('lart-theme-change',{detail:{theme}}));
 }
 window.lartTheme={
  subscribe(listener){listeners.add(listener);listener(palette());return ()=>listeners.delete(listener);},
  get current(){return root.dataset.theme;}
 };
 document.addEventListener('DOMContentLoaded',()=>{
  syncControl();
  document.querySelector('#theme-toggle')?.addEventListener('click',()=>setTheme(root.dataset.theme==='dark'?'light':'dark',{persist:true}));
  requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('theme-ready')));
 });
 system.addEventListener('change',event=>{if(!explicit)setTheme(event.matches?'dark':'light');});
 addEventListener('storage',event=>{
  if(event.key!==null&&event.key!==storageKey)return;
  explicit=event.newValue==='dark'||event.newValue==='light';
  setTheme(explicit?event.newValue:(system.matches?'dark':'light'));
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){cancelAnimationFrame(frame);frame=0;}else paint();
 });
 addEventListener('lart-motion-change',()=>{
  if(!cachedPalette){cancelAnimationFrame(frame);frame=requestAnimationFrame(paint);}
 });
 addEventListener('pageshow',()=>{syncControl();paint();});
})();
