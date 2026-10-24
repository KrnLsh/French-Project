/* A scroll-driven archive of selected French studio foundations. */
(() => {
  'use strict';
  const records = [
    {year:1982,count:0,added:0,kicker:'BEFORE THE FIRST FOUNDATIONS',title:'Before the <em>big bang.</em>',copy:'Before the names on this graph, there is a culture of experimentation. Home computers offer a personal space to learn, draw, and make games. This year is our starting point, not the beginning of French gaming.',studios:'The home-computing generation',context:'A baseline for seven selected companies.',source:'https://www.kinephanos.ca/Revue_files/2015_Sidre_Fr.pdf'},
    {year:1983,count:2,added:2,kicker:'THE FIRST INDEPENDENTS',title:'Two names.<br><em>A new scene.</em>',copy:'Loriciels and Infogrames are founded in 1983. Around home computers such as the Oric, small teams turn personal experiments into published games. A network begins to form between the people who make software and the people who play it.',studios:'Loriciels + Infogrames',context:'Home computers / independent publishing',source:'https://www.kinephanos.ca/Revue_files/2015_Sidre_Fr.pdf'},
    {year:1984,count:3,added:1,kicker:'PLAY, LEARNING & CURIOSITY',title:'A wider idea<br><em>of play.</em>',copy:'Coktel Vision joins the sample. Its early work moves between games and educational software on Thomson and Amstrad computers. Alongside adventure and simulation, learning becomes another space for French creators to experiment with the screen.',studios:'Coktel Vision',context:'Thomson / Amstrad / games & education',source:'https://www.abandonware-france.org/ltf_abandon/ltf_infos_fic.php?id=103372'},
    {year:1985,count:4,added:1,kicker:'A NEW PUBLISHING VOICE',title:'The network<br><em>gets bigger.</em>',copy:'Éric and Hervé Caen found Titus. Another independent company enters a landscape of competing home computers, small teams, and fast experimentation. The story is becoming an industry of different publishers and creative approaches, rather than one isolated school.',studios:'Titus Interactive',context:'Éric & Hervé Caen / founded 1985',source:'https://www.kinephanos.ca/Revue_files/2015_Sidre_Fr.pdf'},
    {year:1986,count:5,added:1,kicker:'FROM BRITTANY, OUTWARD',title:'A family.<br><em>A world ahead.</em>',copy:'The five Guillemot brothers establish Ubisoft in 1986. Publishing and distribution help finance original development; Zombi arrives on the Amstrad CPC that same year. A local beginning already carries the ambition to create and distribute games internationally.',studios:'Ubisoft',context:'Brittany / five Guillemot brothers / Zombi',source:'https://news.ubisoft.com/en-us/article/SMtnr8joN2PMcBfRpQUgG/ceo-yves-guillemot-on-ubisofts-35th-anniversary-game-makers-podcast'},
    {year:1987,count:6,added:1,kicker:'ADVENTURE FINDS A VOICE',title:'Stories that<br><em>speak back.</em>',copy:'Lankhor emerges from the association of Kyilkhor Création with Béatrice and Jean-Luc Langlois. Le Manoir de Mortevielle brings detective fiction and speech synthesis together. Atmosphere, dialogue, and technical ingenuity become part of the same authored experience.',studios:'Lankhor',context:'Le Manoir de Mortevielle / speech synthesis',source:'https://lankhor.net/societelankhor.php?menu=presentation'},
    {year:1988,count:7,added:1,kicker:'THE AUTEUR GENERATION TAKES SHAPE',title:'A new home<br><em>for imagination.</em>',copy:'Delphine Software is established in 1988, with Paul de Senneville and Paul Cuisset central to its story. The company will publish Another World and create Flashback: two very different expressions of the cinematic imagination explored in the next room.',studios:'Delphine Software',context:'Paris / the road to Another World & Flashback',source:'https://www.mobygames.com/company/105/delphine-software-international/history/'},
    {year:1989,count:7,added:0,kicker:'FROM FOUNDATIONS TO CREATIONS',title:'The future<br><em>comes into view.</em>',copy:'Future Wars appears under the Delphine name in 1989, with Éric Chahi contributing its visual world. The graph stays at seven because this selected sample adds no new foundation here. Creative output continues, opening the door to the auteur decade.',studios:'Future Wars / Delphine Software',context:'Amiga / Atari ST / PC DOS',source:'https://www.anotherworld.fr/anotherworld_es/page_ludographie.htm'}
  ];

  window.createStudioChronicle = ({gsap,ScrollTrigger,isReduced,isDialogOpen,isNavigating=()=>false,scrollTo}) => {
    const chapter=document.querySelector('#studio-growth');
    if(!chapter)return {setup(){},reset(){}};
    const nodes=new Map();
    const $=selector=>{if(!nodes.has(selector))nodes.set(selector,chapter.querySelector(selector));return nodes.get(selector);};
    const stage=$('.chronicle-stage'),panel=$('.chronicle-panel'),chart=$('#studios-chart');
    const buttons=[...chapter.querySelectorAll('[data-chart-year]')];
    const points=records.map((record,index)=>({x:68+96*index,y:340-record.count*40}));
    const lengths=[0];
    for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
    let baseline=340,unit=40,total=lengths.at(-1);
    const line=$('.chronicle-line'),area=$('.chronicle-area'),guide=$('.chronicle-guide');
    const heads=[$('.chronicle-head'),$('.chronicle-halo')];
    const playhead={value:0};
    const content=[$('.chronicle-story')];
    let index=-1,trigger=null,entry=null,animation=null,announcementTimer=0,selectingUntil=0;
    const create=(tag,attrs,parent)=>{
      const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
      Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value));
      parent.append(node);return node;
    };
    const bars=[],dots=[],labels=[];
    const barHeights=records.map(()=>NaN),pointReached=records.map(()=>null);
    [0,2,4,6,7].forEach(count=>{
      const y=340-count*40;
      create('path',{d:'M52 '+y+'H760'},$('.chronicle-grid'));
      create('text',{x:34,y:y+5,'text-anchor':'end'},$('.chronicle-axis')).textContent=count;
    });
    records.forEach((record,i)=>{
      const point=points[i],height=record.count*40;
      create('rect',{x:point.x-20,y:point.y,width:40,height,'aria-hidden':'true'},$('.chronicle-ghost-bars'));
      bars.push(create('rect',{x:point.x-20,y:point.y,width:40,height},$('.chronicle-bars')));
      dots.push(create('circle',{cx:point.x,cy:point.y,r:4},$('.chronicle-points')));
      labels.push(create('text',{x:point.x,y:382,'text-anchor':'middle'},$('.chronicle-axis')));
      labels[i].textContent=record.year;
      const hit=create('rect',{class:'chronicle-hit',x:point.x-25,y:25,width:50,height:330,fill:'transparent','pointer-events':'all','aria-hidden':'true'},$('.chronicle-points'));
      hit.addEventListener('click',()=>selectYear(i));
    });
    line.style.strokeDasharray=String(total);
    const plot=window.createChroniclePlot?.(chart);
    const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
    const padded=number=>String(number).padStart(2,'0');

    function showYear(next,animate=true) {
      if(next===index)return;
      index=next;const record=records[index];
      chapter.dataset.activeYear=String(record.year);
      $('.chronicle-year').textContent=record.year;
      $('.chronicle-kicker').textContent=record.kicker;
      if(window.lartHeadlines)window.lartHeadlines.setContent($('#chronicle-story-title'),record.title.replaceAll('<br>','<br> '),{animate});else $('#chronicle-story-title').innerHTML=record.title.replaceAll('<br>','<br> ');
      $('.chronicle-copy').textContent=record.copy;
      $('.chronicle-studios').textContent=record.studios;
      $('.chronicle-context').textContent=record.context;
      $('.chronicle-source').href=record.source;
      $('.chronicle-count').textContent=padded(record.count);
      $('.chronicle-addition').textContent=index===0?'BASELINE':'+'+padded(record.added)+' THIS YEAR';
      $('.chronicle-graph-label').textContent=record.year+' / '+padded(record.count)+' SELECTED STUDIOS';
      $('#chart-title').textContent=record.year+': '+record.count+' of seven selected French studio foundations';
      buttons.forEach((button,i)=>{
        const current=i===index;button.setAttribute('aria-pressed',String(current));
        if(current)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
        button.classList.toggle('is-complete',i<index);
        labels[i].classList.toggle('is-current',current);dots[i].classList.toggle('is-current',current);bars[i].classList.toggle('is-current',current);
      });
      $('.chronicle-prev').disabled=index===0;$('.chronicle-next').disabled=index===records.length-1;
      clearTimeout(announcementTimer);
      announcementTimer=setTimeout(()=>{$('.chronicle-live').textContent=record.year+'. '+record.studios+'. '+record.count+' of seven selected foundations.';},280);
      if(animate&&gsap&&!isReduced()){
        gsap.killTweensOf(content);
        gsap.fromTo(content,{y:13,opacity:.3},{y:0,opacity:1,duration:.42,stagger:.025,ease:'power3.out',clearProps:'opacity,transform'});
      }
    }

    function draw(value,animate=true) {
      const step=clamp(value,0,1)*7,whole=Math.floor(step),fraction=step-whole;
      const point=points[whole],next=points[Math.min(whole+1,7)];
      const x=point.x+(next.x-point.x)*fraction,y=point.y+(next.y-point.y)*fraction;
      const travelled=lengths[whole]+(lengths[Math.min(whole+1,7)]-lengths[whole])*fraction;
      const gpu=plot?.draw(value,baseline,unit);
      if(!gpu){
      line.style.strokeDashoffset=String(total-travelled);
      let visited='';for(let i=0;i<=whole;i++)visited+=(i?' L':'')+points[i].x+' '+points[i].y;
      area.setAttribute('d','M68 '+baseline+' L'+visited+' L'+x+' '+y+' L'+x+' '+baseline+' Z');
      guide.setAttribute('d','M'+x+' 25V'+baseline);
      for(let i=0;i<heads.length;i++)heads[i].style.transform='translate3d('+(x-68)+'px,'+(y-340)+'px,0)';
      }
      for(let i=0;i<bars.length;i++){const bar=bars[i];
        const growth=clamp(step-i+1,0,1),height=records[i].count*unit*growth;
        if(!gpu&&height!==barHeights[i]){bar.style.transform='scale3d(1,'+growth+',1)';barHeights[i]=height;}
        const reached=i<=step+.001;
        if(reached!==pointReached[i]){dots[i].classList.toggle('is-reached',reached);pointReached[i]=reached;}
      }
      panel.style.setProperty('--chronicle-progress',String(value));
      showYear(Math.round(step),animate);
    }

    function selectYear(next) {
      if(isDialogOpen())return;
      next=clamp(next,0,7);
      if(trigger){
        trigger.getTween(true)?.kill?.();
        selectingUntil=performance.now()+1200;
        const target=clamp(trigger.start+(trigger.end-trigger.start)*next/7,trigger.start+1,trigger.end-1);
        scrollTo(target,{duration:.9,immediate:innerWidth<=760});
      }else{
        playhead.value=next/7;draw(playhead.value);
      }
    }
    buttons.forEach((button,i)=>{
      button.addEventListener('click',()=>selectYear(i));
      button.addEventListener('keydown',event=>{
        let next;
        if(event.key==='ArrowRight')next=clamp(i+1,0,7);
        else if(event.key==='ArrowLeft')next=clamp(i-1,0,7);
        else if(event.key==='Home')next=0;
        else if(event.key==='End')next=7;
        else return;
        event.preventDefault();buttons[next].focus({preventScroll:true});selectYear(next);
      });
    });
    $('.chronicle-prev').addEventListener('click',()=>selectYear(index-1));
    $('.chronicle-next').addEventListener('click',()=>selectYear(index+1));
    const resizeLabels=()=>{
      const compact=innerWidth<=760;
      baseline=compact?204:340;unit=compact?24:40;barHeights.fill(NaN);
      chart.setAttribute('viewBox','0 0 800 '+(compact?280:420));
      lengths.length=1;
      points.forEach((point,i)=>{
        point.y=baseline-records[i].count*unit;
        dots[i].setAttribute('cy',point.y);bars[i].setAttribute('y',point.y);bars[i].setAttribute('height',records[i].count*unit);
        labels[i].setAttribute('y',compact?252:382);
        const ghost=$('.chronicle-ghost-bars').children[i];
        ghost.setAttribute('y',point.y);ghost.setAttribute('height',records[i].count*unit);
        if(i)lengths.push(lengths[i-1]+Math.hypot(point.x-points[i-1].x,point.y-points[i-1].y));
      });
      [0,2,4,6,7].forEach((count,i)=>{
        const y=baseline-count*unit;
        $('.chronicle-grid').children[i].setAttribute('d','M52 '+y+'H760');
        $('.chronicle-axis').children[i].setAttribute('y',y+5);
      });
      chapter.querySelectorAll('.chronicle-hit').forEach(hit=>hit.setAttribute('height',baseline-5));
      const path='M'+points.map(point=>point.x+' '+point.y).join(' L');
      line.setAttribute('d',path);$('.chronicle-ghost-line').setAttribute('d',path);
      total=lengths.at(-1);line.style.strokeDasharray=String(total);
      const scale=Math.min(chart.clientWidth/800,chart.clientHeight/(compact?280:420));
      if(scale>0)chart.style.setProperty('--chronicle-label-size',Math.max(12,12/scale).toFixed(2)+'px');
      $('.chronicle-axis').children[4].style.display=compact?'none':'';
      draw(playhead.value,false);
    };
    new ResizeObserver(resizeLabels).observe(chart);
    draw(0,false);resizeLabels();

    function reset() {
      trigger?.kill(true);animation?.kill();entry?.kill();trigger=null;animation=null;entry=null;
      gsap?.killTweensOf(content);
      if(gsap)gsap.set([panel,...content],{clearProps:'transform,opacity,clipPath'});
      selectingUntil=0;
      chapter.classList.remove('is-scroll-driven','is-active','is-compact');
    }
    function storiesFit() {
      const main=$('.chronicle-main'),story=$('.chronicle-story');
      const mainStyle=getComputedStyle(main);
      const available=main.clientHeight-parseFloat(mainStyle.paddingTop)-parseFloat(mainStyle.paddingBottom);
      const probe=story.cloneNode(true);
      probe.classList.add('chronicle-measure');
      probe.removeAttribute('aria-labelledby');probe.setAttribute('aria-hidden','true');probe.inert=true;
      probe.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
      probe.style.cssText='position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;width:'+story.clientWidth+'px;height:auto;max-height:none;transform:none;opacity:0;align-self:start;';
      main.append(probe);
      let tallest=0;
      for(const record of records){
        probe.querySelector('.chronicle-year').textContent=record.year;
        probe.querySelector('.chronicle-kicker').textContent=record.kicker;
        probe.querySelector('h4').innerHTML=record.title.replaceAll('<br>','<br> ');
        probe.querySelector('.chronicle-copy').textContent=record.copy;
        probe.querySelector('.chronicle-studios').textContent=record.studios;
        probe.querySelector('.chronicle-context').textContent=record.context;
        tallest=Math.max(tallest,probe.getBoundingClientRect().height);
      }
      probe.remove();
      if(innerWidth<=760){
        const visualStyle=getComputedStyle($('.chronicle-visual'));
        const gap=parseFloat(visualStyle.rowGap)||0;
        const plotSpace=$('.chronicle-summary').offsetHeight+$('.chronicle-legend').offsetHeight+104+gap*2;
        return tallest+plotSpace+(parseFloat(mainStyle.rowGap)||0)+14<=available;
      }
      return tallest+14<=available;
    }
    function setup({animated=true}={}) {
      const available=innerHeight-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
      let canPin=Boolean(animated&&gsap&&ScrollTrigger&&!isReduced()&&available>=(innerWidth<=760?740:640));
      chapter.classList.remove('is-compact');
      chapter.classList.toggle('is-scroll-driven',canPin);
      if(canPin&&!storiesFit()){
        if(innerWidth>760)chapter.classList.add('is-compact');
        canPin=storiesFit();
        chapter.classList.toggle('is-scroll-driven',canPin);
        if(!canPin)chapter.classList.remove('is-compact');
      }
      $('.chronicle-instruction').textContent=canPin?(innerWidth<=760?'SCROLL / PAUSE TO LOCK':'SCROLL TO TRAVEL · PAUSE TO LOCK A YEAR'):'SELECT A YEAR · USE ← → TO EXPLORE';
      if(!canPin){draw(Math.max(0,index)/7,false);return;}
      const header=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
      entry=gsap.fromTo(panel,{scale:.94,opacity:.6},{
        scale:1,opacity:1,ease:'none',
        scrollTrigger:{trigger:stage,start:'top 90%',end:()=> 'top '+header()+'px',scrub:.55,invalidateOnRefresh:true}
      });
      playhead.value=0;
      animation=gsap.to(playhead,{
        value:1,ease:'none',onUpdate:()=>draw(playhead.value),
        scrollTrigger:{
          id:'studio-chronicle',trigger:stage,start:()=> 'top '+header()+'px',
          end:()=>'+='+Math.max(innerHeight*.72,520)*7,pin:true,scrub:.38,
          anticipatePin:1,invalidateOnRefresh:true,
          snap:{snapTo:(value,self)=>self.isActive&&!isDialogOpen()&&!isNavigating()&&performance.now()>=selectingUntil?Math.round(value*7)/7:value,
            directional:false,inertia:false,delay:.22,duration:{min:.25,max:.65},ease:'power3.inOut'},
          onToggle:self=>chapter.classList.toggle('is-active',self.isActive),
          onRefresh:self=>{playhead.value=self.progress;draw(self.progress,false);},
          onLeave:()=>draw(1,false),onLeaveBack:()=>draw(0,false)
        }
      });
      trigger=animation.scrollTrigger;
    }
    return {setup,reset};
  };
})();
