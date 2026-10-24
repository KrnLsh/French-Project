/* Shared right-to-left blue-block reveals, with explicit resize/motion cleanup. */
(() => {
  'use strict';
  window.createHeadlineReveals = ({gsap,isReduced}) => {
    const entries=new Map(),completed=new WeakSet();
    let observer=null,enabled=false;
    const selector='main h2, main h3, main h4, main .quote-text, main .ledger-title';
    function release(element,restore=true){
      const entry=entries.get(element);if(!entry)return;
      observer?.unobserve(element);entry.timeline?.kill();
      entry.split?.revert();
      if(restore)element.innerHTML=entry.html;
      if(entry.aria===null)element.removeAttribute('aria-label');else element.setAttribute('aria-label',entry.aria);
      element.classList.remove('headline-prepared','headline-revealing');
      entries.delete(element);
    }
    function prepare(element,delay=0){
      if(!gsap||isReduced()||!element?.textContent.trim())return null;
      if(entries.has(element))return entries.get(element);
      const entry={element,html:element.innerHTML,aria:element.getAttribute('aria-label'),timeline:null,lines:[],blocks:[],masks:[],delay};
      try{
        if(entry.aria===null)element.setAttribute('aria-label',element.innerText.replace(/\s+/g,' ').trim());
        const decorations=[...element.querySelectorAll('[data-headline-decoration]'),...(element.matches('.ledger-title')?element.querySelectorAll('small'):[])];
        decorations.forEach(node=>node.remove());
        if(window.SplitType){
          const split=new SplitType(element,{types:'lines',tagName:'span',lineClass:'headline-copy'});
          entry.split=split;entry.lines=split.lines;
        }
        if(!entry.lines.length){
          const line=document.createElement('span');line.className='headline-copy';
          line.append(...element.childNodes);element.append(line);entry.lines=[line];
        }
        for(const line of entry.lines){
          const mask=document.createElement('span'),block=document.createElement('span');
          mask.className='headline-mask';block.className='headline-block';
          block.setAttribute('aria-hidden','true');
          line.parentNode.insertBefore(mask,line);mask.append(line,block);
          entry.masks.push(mask);entry.blocks.push(block);
        }
        decorations.forEach(node=>element.append(node));
        element.classList.add('headline-prepared');
        entries.set(element,entry);
        gsap.set(entry.lines,{xPercent:14,autoAlpha:0});
        gsap.set(entry.blocks,{x:0,y:0,xPercent:102,scaleX:1,transformOrigin:'0% 50%',visibility:'visible'});
        return entry;
      }catch{
        entry.split?.revert();element.innerHTML=entry.html;if(entry.aria===null)element.removeAttribute('aria-label');element.classList.remove('headline-prepared');
        entries.delete(element);return null;
      }
    }
    function play(element,delay=0){
      const entry=entries.get(element)||prepare(element,delay);
      if(!entry||entry.timeline||!enabled)return;
      observer?.unobserve(element);element.classList.add('headline-revealing');
      entry.timeline=gsap.timeline({delay:entry.delay,onComplete:()=>{
        if(entries.get(element)!==entry)return;
        gsap.set(entry.lines,{clearProps:'transform,opacity,visibility'});
        entry.blocks.forEach(block=>block.style.visibility='hidden');
        entry.masks.forEach(mask=>mask.classList.add('headline-settled'));
        element.classList.remove('headline-revealing');completed.add(element);
      }});
      entry.lines.forEach((line,index)=>{
        const start=index*.12,block=entry.blocks[index];
        entry.timeline
          .to(block,{xPercent:0,duration:.6,ease:'power3.inOut'},start)
          .set(line,{autoAlpha:1},start+.7)
          .to(block,{scaleX:0,duration:.85,ease:'power4.inOut'},start+.73)
          .to(line,{xPercent:0,duration:.9,ease:'power3.out'},start+.53);
      });
    }
    function watch(element){
      if(!enabled)return;
      if(observer)observer.observe(element);else play(element);
    }
    function start(){
      enabled=true;
      for(const [element,entry] of entries)if(!entry.timeline)watch(element);
    }
    function reset(){
      enabled=false;observer?.disconnect();observer=null;
      for(const element of [...entries.keys()])release(element);
    }
    function setup({animated=true,enabled:active=true}={}){
      reset();if(!animated||!gsap||isReduced())return;
      if(window.IntersectionObserver)observer=new IntersectionObserver(changes=>{
        for(const change of changes)if(change.isIntersecting)play(change.target);
      },{threshold:.08,rootMargin:'-90px 0px -6% 0px'});
      document.querySelectorAll(selector).forEach(element=>{
        if(!completed.has(element))prepare(element);
      });
      if(active)start();
    }
    function setContent(element,value,{animate=true,textOnly=false}={}){
      release(element);
      if(textOnly)element.textContent=value;else element.innerHTML=value;
      if(animate&&enabled&&!isReduced()){prepare(element);play(element);}
    }
    function revealWithin(container,{delay=.7}={}){
      container.querySelectorAll('h2,h3').forEach(element=>{
        completed.delete(element);release(element);prepare(element,delay);watch(element);
      });
    }
    function releaseWithin(container){
      for(const element of [...entries.keys()])if(container.contains(element)){release(element);completed.delete(element);}
    }
    return {setup,start,reset,setContent,revealWithin,releaseWithin};
  };
})();
