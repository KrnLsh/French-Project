/* L’Art du Jeu — exhibition direction, motion, and interaction. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function targetFromHash(hash) {
    try{return hash?.startsWith('#')?document.getElementById(decodeURIComponent(hash.slice(1))):null;}
    catch{return null;}
  }
  const finePointer = matchMedia('(pointer:fine)');
  const reducedPreference = matchMedia('(prefers-reduced-motion:reduce)');
  const desktop = () => innerWidth > 760;
  const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
  const root = document.documentElement;
  let motionOverride = null;
  try { const saved = localStorage.getItem('lart-motion'); if (saved) motionOverride = saved === 'reduce'; } catch {}
  let reduced = motionOverride ?? reducedPreference.matches;
  let lenis = null, lenisTicker = null, motionContext = null, galleryTrigger = null;
  let splits = [], started = false, resizing = false, heroTitleTimeline = null, heroEntranceTimeline = null, launchTimeline = null;
  let scrollVelocity = 0, velocitySmoothed = 0, galleryProgress = 0;
  const headlines=window.createHeadlineReveals({gsap:hasGSAP?gsap:null,isReduced:()=>reduced});
  window.lartHeadlines=headlines;
  const scrollKinetics=window.createScrollKinetics({isReduced:()=>reduced});
  let restoringDialogFocus = false;
  let keyboardNavigation = false;
  let lastScroll = scrollY, lastScrollTime = performance.now();
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, nx: .5, ny: .5, moved: false, active: false };
  const ripples = Array.from({length:4}, () => ({x:.5,y:.5,time:-100}));
  let rippleIndex = 0, ambientElapsed = 0;
  const damp = (current, target, rate, dt) => current + (target-current) * -Math.expm1(-rate*dt);
  // Exact critically damped spring: the same trajectory at 30, 60, or 144 Hz.
  function springAxis(state, key, velocityKey, target, rate, dt) {
    const offset=state[key]-target, impulse=(state[velocityKey]+rate*offset)*dt, decay=Math.exp(-rate*dt);
    state[key]=target+(offset+impulse)*decay;
    state[velocityKey]=(state[velocityKey]-rate*impulse)*decay;
  }
  function trackPointer(event) {
    pointer.x=event.clientX;pointer.y=event.clientY;
    pointer.nx=event.clientX/innerWidth;pointer.ny=1-event.clientY/innerHeight;
    pointer.moved=true;pointer.active=true;
  }
  addEventListener('pointermove',trackPointer,{passive:true});
  document.addEventListener('pointerleave',()=>{pointer.active=false;});
  addEventListener('blur',()=>{pointer.active=false;});
  addEventListener('pointerdown',event=>{
    keyboardNavigation=false;
    trackPointer(event);
    const ripple=ripples[rippleIndex];ripple.x=pointer.nx;ripple.y=pointer.ny;ripple.time=ambientElapsed;
    rippleIndex=(rippleIndex+1)%ripples.length;
  },{passive:true,capture:true});
  addEventListener('keydown',event=>{
    if(['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))keyboardNavigation=true;
  },true);
  const artifacts = {
    'another-world': { title: 'Another World', year: '1991', creator: 'Éric Chahi', studio: 'Delphine Software', image: 'another-world-alt.jpg', deck: 'An alien planet. An unlikely friendship. A whole new language.', copy: 'Created largely by Éric Chahi, with music by Jean-François Freitas, Another World made economy an expressive force. Flat polygons, carefully observed movement, and a wordless narrative turn the player’s uncertainty into the story itself.\n\nChahi’s rotoscoped animation gives Lester a fragile, human presence. The cinematic cuts are not simply decoration: they guide perception, frame danger, and make the bond with an alien companion legible without dialogue. Here, technical constraint becomes an artistic signature.', url: 'https://www.anotherworld.fr/anotherworld_uk/', credit: 'Éric Chahi / Delphine Software. Image: 20th Anniversary Edition, via the official Steam listing. Original release: 1991.' },
    'alone-in-the-dark': { title: 'Alone in the Dark', year: '1992', creator: 'Frédérick Raynal', studio: 'Infogrames', image: 'alone-in-the-dark.jpg', deck: 'The camera becomes an accomplice to fear.', copy: 'At Derceto Manor, a shift of viewpoint can be as unnerving as a monster. Frédérick Raynal and the Infogrames team combine real-time polygonal characters with pre-rendered backgrounds, making the house an instrument of suspense.\n\nExploration, puzzles, vulnerable protagonists, and limited supplies help establish the grammar of 3D survival horror. Its historical importance is inseparable from its atmosphere: danger lives in what the frame refuses to show.', url: 'https://store.steampowered.com/app/548090/', credit: 'Infogrames / THQ Nordic. Official store screenshot of the classic game. Exhibition date refers to the original 1992 release.' },
    flashback: { title: 'Flashback', year: '1992', creator: 'Paul Cuisset', studio: 'Delphine Software', image: 'flashback.jpg', deck: 'Science fiction told through the smallest human gesture.', copy: 'Paul Cuisset’s Flashback follows Conrad B. Hart through a science-fiction conspiracy with an unusually tactile sense of movement. Running, reaching, landing: rotoscoped animation makes the body feel present in every frame.\n\nIts deliberate platforming and cinematic storytelling helped define an auteur tradition in which illustration, film, and code meet. Fluidity is more than spectacle here. It is how the player learns the character’s relationship to the world.', url: 'https://store.steampowered.com/app/961620/', credit: 'Delphine Software / Microids. Official Flashback store imagery, from a later commercial edition. Original release: 1992.' },
    dune: { title: 'Dune', year: '1992', creator: 'The Cryo team', studio: 'Cryo Interactive', image: 'dune.gif', deck: 'A hybrid form for a world that resists simple categories.', copy: 'Cryo’s Dune moves between illustrated adventure and strategic command. On Arrakis, conversation, ecology, politics, and resource management inhabit the same experience. It is distinct from Westwood’s Dune II, also released in 1992.\n\nThe electronic music of Stéphane Picq and Philip Ulrich gives the desert a dreamlike, intimate character. The result feels less like a checklist of genres than a coherent act of world-building: a place to inhabit as well as a conflict to direct.', url: 'https://www.myabandonware.com/game/dune-23h', credit: 'Cryo Interactive / Virgin Games, 1992. Archival game screenshot via My Abandonware. Dune is based on Frank Herbert’s work.' },
    rayman: { title: 'Rayman', year: '1995', creator: 'Michel Ancel', studio: 'Ubisoft', image: 'rayman.jpg', deck: 'A hand-drawn invitation to take imagination seriously.', copy: 'Created at Ubisoft Montpellier in 1995, Rayman gives platforming a vivid, painterly personality. Michel Ancel’s limbless protagonist moves through worlds of music, vegetation, and visual invention.\n\nThe game’s expressive 2D animation and detailed environments made it an international success. Its place in this exhibition is also a reminder that the French Touch can be exuberant: curiosity and playfulness belong beside melancholy and cinematic ambition.', url: 'https://www.ubisoft.com/en-us/company/about-us/our-brands/rayman', credit: 'Ubisoft. Image from the Rayman Forever collection via GOG. The original Rayman was released in 1995.' },
    loriciels: { title: 'Loriciels', year: 'FOUNDED 1983', creator: 'Laurent Weill & Marc Bayle', studio: 'French publisher', image: null, deck: 'An independent scene finds its publisher.', copy: 'The name Loriciels joins “Oric” and “logiciels”: a compact record of the company’s beginnings in home-computer software. Founded in 1983, the publisher became a meeting point for French creators working across the Oric, Amstrad, Thomson, and other platforms.\n\nÉric Chahi’s early work, including Doggy and Infernal Runner, is part of that history. The bedroom pioneer was rarely truly alone: a developing network of publishers helped experiments reach players.', url: 'https://www.anotherworld.fr/anotherworld_es/page_ludographie.htm', credit: 'Historical entry. No original hardware or publisher artifact is represented by an illustrative image.' },
    infogrames: { title: 'Infogrames', year: 'FOUNDED 1983', creator: 'Bruno Bonnell & Christophe Sapet', studio: 'Lyon, France', image: 'alone-in-the-dark.jpg', deck: 'From a Lyon start-up to an international publishing name.', copy: 'Founded in Lyon in 1983, Infogrames helped turn a young creative scene into a structured industry. Its armadillo identity became familiar to a generation of players.\n\nThe company’s history spans adaptations, experiments, and international expansion. In this exhibition, Alone in the Dark represents the moment when technical innovation and a distinctly authored atmosphere could travel together to a worldwide audience.', url: 'https://www.kinephanos.ca/Revue_files/2015_Sidre_Fr.pdf', credit: 'Illustrated with Alone in the Dark, Infogrames, 1992. Official store screenshot.' },
    titus: { title: 'Titus Interactive', year: 'FOUNDED 1985', creator: 'Éric & Hervé Caen', studio: 'France', image: null, deck: 'A new publishing voice in the home-computer generation.', copy: 'Founded in 1985 by the Caen brothers, Titus is part of the wave of French companies that grew around home computers. Its games and publishing activity belong to a period in which small teams could experiment quickly and reach audiences across competing machines.\n\nIts inclusion here marks the widening of the scene: French game development was becoming a network of businesses, tastes, and technical approaches rather than a single local tradition.', url: 'https://www.abandonware-france.org/', credit: 'Historical publisher entry. No original artifact image is reproduced.' },
    ubisoft: { title: 'Ubisoft', year: 'FOUNDED 1986', creator: 'The five Guillemot brothers', studio: 'Brittany → the world', image: 'rayman.jpg', deck: 'A local beginning. A global canvas.', copy: 'Founded in Brittany in 1986, Ubisoft grew into a major international developer and publisher. Rayman reflects the company’s early creative ambition; later series, including Assassin’s Creed, made large-scale open worlds central to its identity.\n\nThese worlds are collaborative productions made across an international studio network. A history of French gaming therefore has to hold two ideas together: local cultural origins and the global exchange of people, techniques, and imagination.', url: 'https://www.ubisoft.com/en-us/company/about-us/our-story', credit: 'Ubisoft. Illustrated with imagery from the Rayman Forever collection via GOG.' },
    dishonored: { title: 'Dishonored', year: '2012', creator: 'Raphaël Colantonio & Harvey Smith', studio: 'Arkane Studios', image: 'dishonored.jpg', deck: 'A city that rewards looking—and doing things your own way.', copy: 'Arkane’s immersive-simulation tradition makes the environment an active participant. Arx Fatalis (2002) had already explored interlocking systems and player discovery. Dishonored develops that ambition in Dunwall, an industrial city whose architecture, social divisions, and strange technologies tell their own stories.\n\nDeveloped across Arkane’s Lyon and Austin teams, it offers multiple routes and consequences rather than one prescribed performance. The player does not simply pass through the world; their choices give it a particular shape.', url: 'https://bethesda.net/en-US/news/arx-fatalis-birth-of-a-dynasty', credit: 'Arkane Studios / Bethesda Softworks. Official Dishonored screenshot via Steam. Released 2012.' },
    'quantic-dream': { title: 'Quantic Dream', year: 'FOUNDED 1997', creator: 'David Cage', studio: 'Paris, France', image: null, deck: 'Cinema becomes a space for decisions.', copy: 'Quantic Dream explores the meeting point of performance, cinematic framing, and player choice. Fahrenheit (2005), Heavy Rain (2010), and Beyond: Two Souls (2013) place dramatic interaction at the centre of the experience.\n\nThese works form a different strand of French authorship from Arkane’s systems or Rayman’s animation. Their presence makes the exhibition’s central point: the French Touch is a conversation between approaches, not one fixed aesthetic.', url: 'https://www.quanticdream.com/en/our-games', credit: 'Historical studio entry. Game titles and trademarks belong to their respective rights holders.' },
    'life-is-strange': { title: 'Life is Strange', year: '2015', creator: 'Michel Koch & Raoul Barbet', studio: 'DON’T NOD', image: 'life-is-strange.jpg', deck: 'The extraordinary power of an ordinary moment.', copy: 'Developed by the Paris studio then known as Dontnod Entertainment, Life is Strange began its episodic release in January 2015. Max Caulfield’s ability to rewind time makes a familiar coming-of-age question into a playable system: what would happen if I chose differently?\n\nPhotography, music, friendship, and uncertainty create an intimate scale for interactive storytelling. Although its setting is American, the work belongs to a French studio’s search for new emotional forms.', url: 'https://dont-nod.com/en/about-us/', credit: 'DON’T NOD / Square Enix. Official Life is Strange screenshot via Steam. Original episodic release: 2015.' },
    'dead-cells': { title: 'Dead Cells', year: '2018', creator: 'Motion Twin', studio: 'Bordeaux, France', image: 'dead-cells.jpg', deck: 'Repetition becomes a form of discovery.', copy: 'Developed by Bordeaux’s Motion Twin, Dead Cells reached its full release in 2018. Its combination of run-based structure, precise combat, and interconnected spaces makes failure the beginning of another attempt.\n\nElaborate pixel art and fluid animation give each action a distinctive physicality. Here, the independent tradition is expressed through craft and iteration: the pleasure of a game that keeps inviting the player to understand it more deeply.', url: 'https://store.steampowered.com/app/588650/', credit: 'Motion Twin / Evil Empire. Official Dead Cells screenshot via Steam. Full release: 2018.' },
    'plague-tale': { title: 'A Plague Tale', year: '2019 / 2022', creator: 'Asobo Studio', studio: 'Bordeaux, France', image: 'plague-tale.jpg', deck: 'History becomes an intimate, unsettling landscape.', copy: 'A Plague Tale: Innocence (2019) and Requiem (2022) follow Amicia and Hugo through a darkly imagined medieval world. Asobo Studio pairs environmental detail with a story built around a sibling bond.\n\nLight, architecture, and overwhelming swarms turn the landscape into a dramatic force. These are historical fictions, not documentary reconstructions: their power comes from making a vast, hostile world feel personal.', url: 'https://www.asobostudio.com/games', credit: 'Asobo Studio / Focus Entertainment. Official A Plague Tale: Innocence screenshot via Steam. Innocence: 2019; Requiem: 2022.' },
    stray: { title: 'Stray', year: '2022', creator: 'BlueTwelve Studio', studio: 'Montpellier, France', image: 'stray.jpg', deck: 'Change the body. Change the way a city is seen.', copy: 'BlueTwelve’s Stray asks the player to explore from the scale of a cat. Ledges become roads; furniture becomes architecture; familiar urban spaces acquire new affordances.\n\nReleased in 2022, the game builds its character through movement, curiosity, and attention to small gestures. Beneath its futuristic setting sits an unusually quiet proposition: empathy can begin with seeing the world from somewhere else.', url: 'https://stray.game/', credit: 'BlueTwelve Studio / Annapurna Interactive. Official Stray screenshot via Steam. Released 2022.' },
    'clair-obscur': { title: 'Clair Obscur', year: '2025', creator: 'Sandfall Interactive', studio: 'Montpellier, France', image: 'clair-obscur.jpg', deck: 'Expedition 33. A painted world with something to lose.', copy: 'Released on 24 April 2025, Sandfall Interactive’s debut brings a French artistic sensibility to a role-playing tradition shaped by Japanese games. Its world draws on Belle Époque imagery while combining turn-based choices with real-time reactions.\n\nThe contrast between beauty and erasure runs through its story, art direction, and music. At the end of this exhibition’s route, Expedition 33 offers a new answer to an old creative impulse: absorb influences from everywhere, then make them your own.', url: 'https://www.expedition33.com/post/out-now', credit: 'Sandfall Interactive / Kepler Interactive. Official Clair Obscur: Expedition 33 screenshot via Steam. Released 24 April 2025.' }
  };

  Object.assign(artifacts, window.lartHistory?.artifacts || {});

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  function applyMotionPreference() {
    root.classList.toggle('motion-reduced', reduced);
    root.classList.toggle('motion-full', !reduced);
    const toggle = $('.motion-toggle');
    toggle.setAttribute('aria-pressed', String(reduced));
    toggle.setAttribute('aria-label','Reduced motion');
    toggle.title=reduced?'Restore full motion':'Reduce motion';
    toggle.innerHTML = `${reduced ? 'Full motion' : 'Reduce motion'} <span>${reduced ? '●' : '○'}</span>`;
    if (reduced) root.classList.remove('custom-cursor');
    if (reduced && (heroTitleTimeline || heroEntranceTimeline)) settleHeroEntrance();
    dispatchEvent(new Event('lart-motion-change'));
  }
  applyMotionPreference();

  const progressLabel=$('.scroll-progress'),progressLine=$('.header-progress');
  const eraSections=['pioneers','auteurs','worlds','renaissance'].map(id=>({id,element:document.getElementById(id)}));
  const eraLinks=$$('.era-nav a');
  let lastProgress=-1,lastActiveEra=null,progressGeometryDirty=true,maximumScroll=1,eraOffsets=new Float32Array(eraSections.length);
  function measureProgressGeometry(){
    maximumScroll=Math.max(1,root.scrollHeight-innerHeight);
    for(let i=0;i<eraSections.length;i++)eraOffsets[i]=eraSections[i].element.getBoundingClientRect().top+scrollY;
    headerHeight=parseInt(getComputedStyle(root).getPropertyValue('--header-height'))||78;
    progressGeometryDirty=false;window.museumFrames.write(updateProgress);
  }
  let headerHeight=110;
  const invalidateProgressGeometry=()=>{progressGeometryDirty=true;window.museumFrames.read(measureProgressGeometry);};
  if(hasGSAP)ScrollTrigger.addEventListener('refresh',invalidateProgressGeometry);
  new ResizeObserver(invalidateProgressGeometry).observe($('#main'));
  addEventListener('resize',invalidateProgressGeometry,{passive:true});
  invalidateProgressGeometry();
  function updateProgress() {
    // Read geometry before changing text or styles to avoid an extra layout pass.
    const progress=clamp(scrollY/maximumScroll,0,1);
    let active='';
    for(let i=0;i<eraOffsets.length;i++)if(eraOffsets[i]<scrollY+innerHeight*.5)active=eraSections[i].id;
    const now=performance.now();
    if(now>lastScrollTime)scrollVelocity=(scrollY-lastScroll)/Math.max(1,now-lastScrollTime)*1000;
    lastScroll=scrollY;lastScrollTime=now;
    const percent=Math.round(progress*100);
    if(percent!==lastProgress){progressLabel.textContent=String(percent).padStart(3,'0')+'%';lastProgress=percent;}
    progressLine.style.transform='scaleX('+progress+')';
    if(active!==lastActiveEra){
      lastActiveEra=active;
      eraLinks.forEach(link=>{
        const current=link.dataset.era===active;link.classList.toggle('is-active',current);
        if(current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
      });
    }
  }
  let scrollQueued = false;
  function flushScroll(){scrollQueued=false;updateProgress();}
  addEventListener('scroll',()=>{if(!lenis&&!scrollQueued){window.museumFrames.write(flushScroll);scrollQueued=true;}},{passive:true});

  function initSmoothScroll() {
    if (lenis) {lenis.destroy();lenis=null;}
    if (lenisTicker && hasGSAP) gsap.ticker.remove(lenisTicker);
    lenisTicker = null;
    if (!reduced && desktop() && hasGSAP && window.Lenis && finePointer.matches) {
      lenis = new Lenis({duration:.92, easing:t => Math.min(1,1.001-Math.pow(2,-10*t)), smoothWheel:true, syncTouch:false});
      lenis.on('scroll',()=>{ScrollTrigger.update();updateProgress();});
      lenisTicker = time => lenis?.raf(time*1000);
      gsap.ticker.add(lenisTicker);
      gsap.ticker.lagSmoothing(0);
      if (dialogOpen) lenis.stop();
    }
  }
  let navigationUntil=0;
  function scrollToTarget(target, options={}) {
    // Long chapter jumps cross pinned rooms; suspend their settling snaps until arrival.
    if(typeof target!=='number'){
      navigationUntil=performance.now()+(options.immediate?350:((options.duration??1.6)*1000+500));
      if(hasGSAP)ScrollTrigger.getAll().forEach(trigger=>trigger.getTween(true)?.kill());
    }
    if (lenis) lenis.scrollTo(target, {offset:typeof target==='number'?0:-headerHeight, duration:1.6,...options});
    else {const top=typeof target==='number'?target:target.getBoundingClientRect().top+scrollY-headerHeight;scrollTo({top,behavior:reduced||options.immediate?'instant':'smooth'});}
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const target = targetFromHash(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();closeMenu();
    scrollToTarget(target);
    history.replaceState(null,'',a.getAttribute('href'));
    if(a.classList.contains('skip-link')) {target.tabIndex=-1;target.focus({preventScroll:true});}
  }));
  const menuToggle = $('.mobile-menu-toggle');
  function closeMenu(){menuToggle.setAttribute('aria-expanded','false');$('#mobile-nav').hidden=true;}
  menuToggle.addEventListener('click',()=>{const open=menuToggle.getAttribute('aria-expanded')==='true';menuToggle.setAttribute('aria-expanded',String(!open));$('#mobile-nav').hidden=open;});
  addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});

  const sectionRules=$$('.section-rule');
  for(let i=0;i<sectionRules.length;i++){
    const rule=document.createElement('span');rule.className='section-progress-rule';rule.setAttribute('aria-hidden','true');sectionRules[i].prepend(rule);
  }
  function setupMotion() {
    if (!hasGSAP) return;
    headlines.reset();scrollKinetics.reset();
    motionContext?.revert();
    studioChronicle.reset();
    frenchSignature.reset();
    splits.forEach(s=>s.revert());splits=[];
    galleryTrigger = null;
    initSmoothScroll();
    if (reduced) {
      gsap.set('.reveal',{clearProps:'all'});gsap.set('.section-progress-rule',{scaleX:1});
      headlines.setup({animated:false});
      $('.gallery-window').style.overflowX='auto';
      studioChronicle.setup({animated:false});
      frenchSignature.setup({animated:false});
      updateProgress();return;
    }
    $('.gallery-window').style.removeProperty('overflow-x');
    motionContext = gsap.context(()=>{
      $$('.reveal').filter(el=>!el.matches('h2,h3,h4,.quote-text')).forEach(el=>{
        if(window.SplitType) {
          const split=new SplitType(el,{types:'lines',lineClass:'split-line'});splits.push(split);
          const masks=split.lines.map(line=>{
            const mask=document.createElement('span');mask.className='line-mask';
            line.parentNode.insertBefore(mask,line);mask.appendChild(line);return mask;
          });
          // Leave room for italic overhangs and descenders, then unclip finished text.
          gsap.from(split.lines,{
            yPercent:170,rotation:1.5,opacity:.2,duration:1.05,stagger:.075,ease:'power4.out',
            onComplete:()=>masks.forEach(mask=>mask.classList.add('is-revealed')),
            scrollTrigger:{trigger:el,start:'top 91%',once:true}
          });
        } else gsap.from(el,{y:35,opacity:0,duration:.9,scrollTrigger:{trigger:el,start:'top 92%',once:true}});
      });
      sectionRules.forEach(section=>gsap.fromTo(section.querySelector('.section-progress-rule'),{scaleX:0},{scaleX:1,duration:1.2,ease:'power3.inOut',scrollTrigger:{trigger:section,start:'top 92%',once:true}}));
      $$('.timeline-entry').forEach(entry=>ScrollTrigger.create({trigger:entry,start:'top 60%',end:'bottom 40%',onToggle:self=>{entry.classList.toggle('is-active',self.isActive);if(self.isActive) changeYear(entry.dataset.timelineYear);}}));
      studioChronicle.setup({animated:true});
      if (desktop()) {
        const sticky=$('.timeline-sticky'),layout=$('.timeline-layout');
        ScrollTrigger.create({trigger:sticky,start:'top 125px',end:()=>`+=${Math.max(0,layout.offsetHeight-sticky.offsetHeight)}`,pin:true,pinSpacing:false,invalidateOnRefresh:true});
        const track=$('.gallery-track'),pin=$('.gallery-pin');
        const distance=()=>Math.max(0,track.scrollWidth-innerWidth);
        const tween=gsap.to(track,{x:()=>-distance(),ease:'none',scrollTrigger:{trigger:pin,start:()=>`top ${headerHeight}px`,end:()=>`+=${distance()*1.12}`,pin:true,scrub:.85,invalidateOnRefresh:true,anticipatePin:1,onUpdate:self=>setGalleryProgress(self.progress)}});
        galleryTrigger=tween.scrollTrigger;
        gsap.to('.hero-artifact',{y:-45,rotation:0,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1.2}});
        gsap.fromTo('.worlds-image',{y:60},{y:-40,ease:'none',scrollTrigger:{trigger:'.worlds-intro',start:'top bottom',end:'bottom top',scrub:1.5}});
        gsap.fromTo('.footer-art h2',{scale:.93,y:30},{scale:1,y:0,ease:'none',scrollTrigger:{trigger:'.footer-art',start:'top bottom',end:'bottom 75%',scrub:1.4}});
      }
      gsap.to('.origins-orbits',{rotation:72,svgOrigin:'250 240',ease:'none',scrollTrigger:{trigger:'.history-origins',start:'top bottom',end:'bottom top',scrub:1.5}});
      gsap.fromTo('.archive-disc',{rotation:-9},{rotation:13,ease:'none',scrollTrigger:{trigger:'.history-disc',start:'top bottom',end:'bottom top',scrub:1.6}});
      frenchSignature.setup({animated:true});
      gsap.fromTo('.worlds-backdrop',{opacity:0},{opacity:1,ease:'none',scrollTrigger:{trigger:'.worlds',start:'top 90%',end:'top 30%',scrub:true}});
    });
    headlines.setup({animated:true,enabled:root.classList.contains('ready')});
    ScrollTrigger.refresh();lenis?.resize();updateProgress();
  }
  function changeYear(year) {
    const el=$('.era-year');
    if(el.dataset.year===year)return;
    el.dataset.year=year;
    if(!hasGSAP||reduced){el.textContent=year;return;}
    gsap.killTweensOf(el);
    el.innerHTML=[...year].map(c=>`<span class="year-char">${c}</span>`).join('');
    gsap.fromTo(el.children,{yPercent:100},{yPercent:0,duration:.65,stagger:.045,ease:'power4.out',overwrite:true});
  }
  function setGalleryProgress(progress) {
    galleryProgress=progress;
    const index=Math.round(progress*4);
    if(index!==lastGalleryIndex){galleryCount.textContent=`0${index+1} / 05`;lastGalleryIndex=index;}
    galleryBar.style.transform=`scaleX(${Math.max(.03,progress)})`;
  }
  const galleryWindow=$('.gallery-window'),galleryTrack=$('.gallery-track'),galleryCount=$('.gallery-count'),galleryBar=$('.gallery-progress span');
  let lastGalleryIndex=-1,galleryRange=1,galleryStride=0,galleryDistance=1;
  function measureGallery(){galleryRange=Math.max(1,galleryWindow.scrollWidth-galleryWindow.clientWidth);galleryStride=$('.exhibit-card').offsetWidth+(desktop()?42:22);galleryDistance=Math.max(1,galleryTrack.scrollWidth-innerWidth);}
  const queueGalleryMeasure=()=>window.museumFrames.read(measureGallery);
  new ResizeObserver(queueGalleryMeasure).observe(galleryWindow);
  if(hasGSAP)ScrollTrigger.addEventListener('refresh',queueGalleryMeasure);
  queueGalleryMeasure();
  function updateNativeGallery(){if(!desktop()||reduced)setGalleryProgress(galleryWindow.scrollLeft/galleryRange);}
  galleryWindow.addEventListener('scroll',()=>window.museumFrames.write(updateNativeGallery),{passive:true});
  function moveGallery(direction) {
    const next=clamp(Math.round(galleryProgress*4)+direction,0,4);
    if(galleryTrigger)scrollToTarget(galleryTrigger.start+(galleryTrigger.end-galleryTrigger.start)*next/4);
    else galleryWindow.scrollTo({left:next*galleryStride,behavior:reduced?'instant':'smooth'});
  }
  $('.gallery-prev').addEventListener('click',()=>moveGallery(-1));$('.gallery-next').addEventListener('click',()=>moveGallery(1));
  $$('.exhibit-card').forEach((card,index)=>card.addEventListener('focusin',()=>{if(keyboardNavigation&&galleryTrigger&&!restoringDialogFocus){const position=galleryTrigger.start+(galleryTrigger.end-galleryTrigger.start)*index/4;if(scrollY<position-20||scrollY>position+innerWidth*.4)scrollToTarget(position,{immediate:true});}}));
  let dragging=null,dragged=false,dragResetTimer;
  function cancelGalleryDrag() {
    dragging=null;dragged=false;clearTimeout(dragResetTimer);
  }
  galleryWindow.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.pointerType==='touch'||!finePointer.matches||reduced||e.target.closest('.round-button'))return;
    clearTimeout(dragResetTimer);dragged=false;
    dragging={x:e.clientX,y:e.clientY,scroll:scrollY,left:galleryWindow.scrollLeft,id:e.pointerId};
  });
  const dragPoint=new Float32Array(2),immediateDrag={immediate:true};
  function applyGalleryDrag(){
    if(!dragging||!dragged)return;
    const delta=dragPoint[0]-dragging.x;
    if(galleryTrigger){
      const position=dragging.scroll-delta*(galleryTrigger.end-galleryTrigger.start)/galleryDistance;
      if(lenis)lenis.scrollTo(position,immediateDrag);else scrollTo(0,position);
    }else galleryWindow.scrollLeft=dragging.left-delta;
  }
  addEventListener('pointermove',e=>{
    if(!dragging||e.pointerId!==dragging.id)return;
    const delta=e.clientX-dragging.x,vertical=e.clientY-dragging.y;
    if(!dragged&&Math.abs(vertical)>12&&Math.abs(vertical)>Math.abs(delta)){cancelGalleryDrag();return;}
    if(Math.abs(delta)>12&&Math.abs(delta)>Math.abs(vertical))dragged=true;
    if(!dragged)return;
    dragPoint[0]=e.clientX;dragPoint[1]=e.clientY;window.museumFrames.write(applyGalleryDrag);
  });
  addEventListener('pointerup',()=>{dragging=null;dragResetTimer=setTimeout(()=>dragged=false,0);});
  addEventListener('pointercancel',cancelGalleryDrag);
  addEventListener('blur',cancelGalleryDrag);
  galleryWindow.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopPropagation();}},true);
  galleryWindow.addEventListener('dragstart',e=>e.preventDefault());

  const studioChronicle=window.createStudioChronicle({
    gsap:hasGSAP?gsap:null,ScrollTrigger:hasGSAP?ScrollTrigger:null,
    isReduced:()=>reduced,isDialogOpen:()=>dialogOpen,isNavigating:()=>performance.now()<navigationUntil,scrollTo:scrollToTarget
  });
  const frenchSignature=window.createFrenchSignature({
    gsap:hasGSAP?gsap:null,ScrollTrigger:hasGSAP?ScrollTrigger:null,
    isReduced:()=>reduced,isDialogOpen:()=>dialogOpen,isNavigating:()=>performance.now()<navigationUntil,scrollTo:scrollToTarget
  });

  let previousFocus=null,dialogOpen=false,activeDialog=null,scrollLock=null;
  let dialogTrigger=null,dialogTransition=null;
  const artifactDialog=$('.artifact-dialog'),sourcesDialog=$('.sources-dialog');
  const modalBackdrop=$('.modal-backdrop');
  const backgroundElements=$$('#main,.site-header,#mobile-nav,.skip-link');
  const inertStates=new Map();
  const dialogParts=dialog=>$$('.dialog-top,.dialog-body,.sources-body',dialog);
  function dialogControls(dialog) {
    return $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',dialog)
      .filter(element=>!element.closest('[hidden]')&&element.getClientRects().length>0);
  }
  function originFrame(element) {
    if(!element?.isConnected)return null;
    const rect=element.getBoundingClientRect();
    const left=Math.max(0,rect.left),top=Math.max(0,rect.top);
    const width=Math.min(innerWidth,rect.right)-left,height=Math.min(innerHeight,rect.bottom)-top;
    if(width<2||height<2)return null;
    const corner=getComputedStyle(element).borderTopLeftRadius;
    const radius=corner.endsWith('%')?Math.min(width,height)*parseFloat(corner)/100:parseFloat(corner)||0;
    return {left,top,width,height,borderRadius:Math.min(radius,width/2,height/2)};
  }
  function originImage(element) {
    return [...element.querySelectorAll('img')].find(img=>img.complete&&img.naturalWidth&&img.getClientRects().length&&getComputedStyle(img).visibility!=='hidden')||$('canvas#hero-ascii-canvas',element)||null;
  }
  function frameOf(element) {
    const {left,top,width,height}=element.getBoundingClientRect();
    return {left,top,width,height,borderRadius:0};
  }
  function pictureFrame(image,frame) {
    const rect=image.getBoundingClientRect();
    return {left:rect.left-frame.left,top:rect.top-frame.top,width:rect.width,height:rect.height};
  }
  function morphTransform(frame,base){return {x:frame.left-base.left,y:frame.top-base.top,scaleX:frame.width/base.width,scaleY:frame.height/base.height,transformOrigin:'0 0'};}
  function createDialogMorph(frame,image,imageFrame) {
    const shell=document.createElement('div');shell.className='dialog-morph';
    shell.setAttribute('aria-hidden','true');shell.inert=true;
    for(const [key,value] of Object.entries(frame))shell.style[key]=value+'px';
    if(image&&imageFrame){
      const picture=document.createElement('img');
      if(image.tagName==='CANVAS'){try{picture.src=image.toDataURL('image/png');}catch{picture.src='assets/another-world-alt.jpg';}}
      else picture.src=image.currentSrc||image.src;
      picture.alt='';
      picture.draggable=false;picture.style.objectPosition=getComputedStyle(image).objectPosition;
      if(image.classList.contains('pixel-art'))picture.classList.add('pixel-art');
      for(const [key,value] of Object.entries(imageFrame))picture.style[key]=value+'px';
      shell.append(picture);
    }
    document.body.append(shell);return shell;
  }
  function resetDialogTransition() {
    const transition=dialogTransition;if(!transition)return;
    dialogTransition=null;clearTimeout(transition.timer);transition.timeline?.kill();transition.shell.remove();
    transition.dialog.classList.remove('is-morphing');
    if(hasGSAP)gsap.set([transition.dialog,modalBackdrop,...dialogParts(transition.dialog)],{clearProps:'opacity,transform'});
  }
  function finishDialogClose(dialog,restoreFocus) {
    resetDialogTransition();
    headlines.releaseWithin(dialog);
    dialog.hidden=true;dialog.setAttribute('aria-hidden','true');
    dialog.style.removeProperty('transform');dialog.style.removeProperty('opacity');
    modalBackdrop.hidden=true;activeDialog=null;dialogOpen=false;dialogTrigger=null;
    root.classList.remove('modal-open');document.body.classList.remove('modal-open');
    dispatchEvent(new Event('lart-dialog-change'));
    root.style.overflow=scrollLock?.root??'';document.body.style.overflow=scrollLock?.body??'';
    scrollLock=null;
    inertStates.forEach((wasInert,element)=>{element.inert=wasInert;});inertStates.clear();
    if(!document.body.classList.contains('loading'))lenis?.start();
    cancelGalleryDrag();
    if(restoreFocus&&previousFocus?.isConnected){
      restoringDialogFocus=true;
      try{previousFocus.focus({preventScroll:true});}finally{restoringDialogFocus=false;}
    }
  }
  function openDialog(dialog,trigger=document.activeElement) {
    if(activeDialog===dialog)return;
    if(activeDialog)closeDialog(activeDialog,false,true);
    previousFocus=trigger;dialogTrigger=trigger;
    const origin=originFrame(trigger),image=originImage(trigger);
    const imageOrigin=image&&origin?pictureFrame(image,origin):null;
    cancelGalleryDrag();
    // Keep the actual reading layout stable while an inert visual frame grows from the trigger.
    dialog.hidden=false;dialog.setAttribute('aria-hidden','false');
    headlines.revealWithin(dialog,{delay:reduced?0:.7});
    modalBackdrop.hidden=false;dialog.scrollTop=0;
    activeDialog=dialog;dialogOpen=true;
    dispatchEvent(new Event('lart-dialog-change'));
    scrollLock={root:root.style.overflow,body:document.body.style.overflow};
    root.classList.add('modal-open');document.body.classList.add('modal-open');
    root.style.overflow='hidden';document.body.style.overflow='hidden';
    backgroundElements.forEach(element=>{inertStates.set(element,element.inert);element.inert=true;});
    lenis?.stop();root.classList.remove('custom-cursor');
    if(hasGSAP){
      gsap.set('.cursor-dot,.cursor-ring,.floating-preview',{opacity:0});
      if(!reduced&&origin){
        const destination=frameOf(dialog),targetImage=$('.dialog-image:not([hidden]) img',dialog);
        const shell=createDialogMorph(destination,image,targetImage?pictureFrame(targetImage,destination):imageOrigin);
        gsap.set(shell,morphTransform(origin,destination));
        const transition={dialog,shell,base:destination,phase:'opening',timeline:null,timer:0};dialogTransition=transition;
        const finish=()=>{if(dialogTransition===transition)resetDialogTransition();};
        dialog.classList.add('is-morphing');
        gsap.set(dialog,{opacity:0});gsap.set(modalBackdrop,{opacity:0});
        gsap.set(dialogParts(dialog),{opacity:0,y:18});
        const timeline=gsap.timeline({onComplete:finish});transition.timeline=timeline;
        timeline.to(shell,{x:0,y:0,scaleX:1,scaleY:1,duration:.86,ease:'power4.inOut'},0)
          .to(modalBackdrop,{opacity:1,duration:.55,ease:'power3.out'},.04)
          .to(dialog,{opacity:1,duration:.32,ease:'power3.out'},.52)
          .to(dialogParts(dialog),{opacity:1,y:0,duration:.44,stagger:.045,ease:'power3.out'},.58)
          .to(shell,{opacity:0,duration:.22,ease:'power2.out'},.64);
        // A suspended tab or animation ticker must never strand an invisible dialog.
        transition.timer=setTimeout(finish,1500);
      }
    }
    $('.cursor-ring').classList.remove('is-context');$('.cursor-ring span').textContent='';
    $('.dialog-close',dialog).focus({preventScroll:true});
  }
  function closeDialog(dialog=activeDialog,restoreFocus=true,immediate=false) {
    if(!dialog||dialog!==activeDialog)return;
    if(dialogTransition?.phase==='closing'&&!immediate)return;
    const destination=originFrame(dialogTrigger);
    if(immediate||reduced||!hasGSAP||!destination){finishDialogClose(dialog,restoreFocus);return;}
    const existing=dialogTransition,image=originImage(dialogTrigger);
    const source=frameOf(dialog),targetImage=$('.dialog-image:not([hidden]) img',dialog);
    const shell=existing?.shell||createDialogMorph(source,image,targetImage?pictureFrame(targetImage,source):null);
    if(existing){clearTimeout(existing.timer);existing.timeline?.kill();}
    else gsap.set(shell,{opacity:0});
    const base=existing?.base||source;
    const transition={dialog,shell,base,phase:'closing',restoreFocus,timeline:null,timer:0};dialogTransition=transition;
    const finish=()=>{if(dialogTransition===transition)finishDialogClose(dialog,restoreFocus);};
    dialog.classList.add('is-morphing');
    const timeline=gsap.timeline({onComplete:finish});transition.timeline=timeline;
    timeline.to(dialog,{opacity:0,duration:.15,ease:'power2.out'},0)
      .to(shell,{opacity:1,duration:.12,ease:'power2.out'},0)
      .to(shell,{...morphTransform(destination,base),duration:.66,ease:'power4.inOut'},.02)
      .to(modalBackdrop,{opacity:0,duration:.5,ease:'power3.inOut'},.1)
      .to(shell,{opacity:0,duration:.12,ease:'power2.in'},.56);
    transition.timer=setTimeout(finish,1100);
  }
  function settleDialogTransition() {
    if(!dialogTransition)return;
    if(dialogTransition.phase==='closing')finishDialogClose(dialogTransition.dialog,dialogTransition.restoreFocus);
    else resetDialogTransition();
  }
  addEventListener('resize',settleDialogTransition,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)settleDialogTransition();});
  addEventListener('lart-motion-change',()=>{if(reduced)settleDialogTransition();});
  modalBackdrop.addEventListener('click',()=>closeDialog());
  document.addEventListener('keydown',event=>{
    if(!activeDialog)return;
    if(event.key==='Escape'){event.preventDefault();closeDialog();return;}
    if(event.key!=='Tab')return;
    const controls=dialogControls(activeDialog),first=controls[0],last=controls.at(-1);
    if(!first){event.preventDefault();activeDialog.focus({preventScroll:true});return;}
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===activeDialog)){
      event.preventDefault();last.focus({preventScroll:true});
    }else if(!event.shiftKey&&(document.activeElement===last||!activeDialog.contains(document.activeElement))){
      event.preventDefault();first.focus({preventScroll:true});
    }
  },true);
  document.addEventListener('focusin',event=>{
    if(activeDialog&&!activeDialog.contains(event.target)){
      (dialogControls(activeDialog)[0]||activeDialog).focus({preventScroll:true});
    }
  });
  [artifactDialog,sourcesDialog].forEach(dialog=>{
    dialog.addEventListener('wheel',event=>event.stopPropagation(),{passive:true});
    dialog.addEventListener('touchmove',event=>event.stopPropagation(),{passive:true});
  });
  $$('.dialog-close').forEach(button=>button.addEventListener('click',()=>closeDialog(button.closest('[role="dialog"]'))));
  $$('[data-inspect]').forEach(button=>button.addEventListener('click',()=>{
    if(dragged)return;
    const key=button.dataset.inspect,a=artifacts[key];if(!a)return;
    $('.dialog-catalog').textContent=`THE COLLECTION / ${key.replaceAll('-',' ').toUpperCase()}`;
    $('.dialog-image').hidden=!a.image;
    if(a.image){$('.dialog-image img').src=`assets/${a.image}`;$('.dialog-image img').alt=`${a.title} — exhibition image`;}
    $('.dialog-year').textContent=a.year;headlines.setContent($('#artifact-title'),a.title,{animate:false,textOnly:true});$('.dialog-deck').textContent=a.deck;$('.dialog-copy').textContent=a.copy;
    const details=$('.dialog-details');details.replaceChildren();
    for(const [label,value] of [['CREATOR / TEAM',a.creator],['STUDIO / ORIGIN',a.studio]]){const cell=document.createElement('div'),small=document.createElement('span'),strong=document.createElement('strong');small.textContent=label;strong.textContent=value;cell.append(small,strong);details.append(cell);}
    $('.dialog-source').href=a.url;$('.dialog-credit').textContent=a.credit;openDialog(artifactDialog,button);
  }));
  $('#sources-button').addEventListener('click',event=>openDialog(sourcesDialog,event.currentTarget));
  fetch('assets/image-credits.json').then(r=>{if(!r.ok)throw Error('Image credits');return r.json();}).then(credits=>{
    credits.forEach(credit=>{const li=document.createElement('li'),a=document.createElement('a');a.href=credit.url;a.textContent=`${credit.title||credit.slug.replaceAll('-',' ')} — ${credit.credit} ↗`;a.target='_blank';a.rel='noopener noreferrer';li.append(a);$('#image-credit-list').append(li);});
  }).catch(()=>{$('#image-credit-list').textContent='Individual image credits and source links appear in each artifact’s exhibition notes.';});

  let audioContext=null,audioGain=null,audioEnabled=false;
  function createAudio() {
    const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return false;
    audioContext=new Context();audioGain=audioContext.createGain();audioGain.gain.value=0;
    const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1100;filter.Q.value=.3;filter.connect(audioGain);audioGain.connect(audioContext.destination);
    [130.81,196,261.63,329.63].forEach((hz,i)=>{
      const osc=audioContext.createOscillator(),gain=audioContext.createGain(),lfo=audioContext.createOscillator(),depth=audioContext.createGain();osc.type='sine';osc.frequency.value=hz;osc.detune.value=(i-1.5)*3;gain.gain.value=.12;osc.connect(gain);gain.connect(filter);lfo.frequency.value=.03+i*.013;depth.gain.value=.025;lfo.connect(depth);depth.connect(gain.gain);osc.start();lfo.start();
    });return true;
  }
  $('.sound-toggle').addEventListener('click',async()=>{
    try {
      if(!audioContext&&!createAudio())throw Error('Audio unavailable');
      await audioContext.resume();audioEnabled=!audioEnabled;
      audioGain.gain.cancelScheduledValues(audioContext.currentTime);audioGain.gain.setTargetAtTime(audioEnabled ? .15 : 0,audioContext.currentTime,.65);
      $('.sound-toggle').setAttribute('aria-pressed',String(audioEnabled));$('.sound-toggle').setAttribute('aria-label',audioEnabled?'Disable ambient sound':'Enable ambient sound');$('.sound-label').textContent=audioEnabled?'SOUND ON':'SOUND OFF';
    } catch {$('.sound-label').textContent='UNAVAILABLE';$('.sound-toggle').setAttribute('aria-label','Ambient audio is unavailable in this browser');}
  });
  document.addEventListener('visibilitychange',()=>{if(audioContext){if(document.hidden)audioContext.suspend();else if(audioEnabled)audioContext.resume();}});

  function initCursor(){window.createMuseumCursor({gsap:hasGSAP?gsap:null,isReduced:()=>reduced,isDesktop:desktop,pointerQuery:finePointer,isDialogOpen:()=>dialogOpen,artifacts});}
  initCursor();
  window.createHeroAscii?.({isReduced:()=>reduced,isDialogOpen:()=>dialogOpen});
  window.createCursorFog?.({isReduced:()=>reduced,isDesktop:desktop,pointerQuery:finePointer});
  const trailGrid=$('.trail-grid');
  window.createFooterTrail(trailGrid,()=>reduced);

  function initAmbientFallback() {
    const surface=$('.ambient-fallback'),position={x:0,y:0};
    let frame=0,lastFrame=0;
    const draw=time=>{
      frame=0;
      if(document.hidden||reduced||dialogOpen)return;
      const dt=lastFrame?Math.min((time-lastFrame)*.001,.05):1/60;lastFrame=time;
      position.x=damp(position.x,(pointer.nx-.5)*45,5,dt);
      position.y=damp(position.y,(.5-pointer.ny)*35,5,dt);
      surface.style.transform=`translate3d(${position.x.toFixed(3)}px,${position.y.toFixed(3)}px,0)`;
      frame=requestAnimationFrame(draw);
    };
    const sync=()=>{cancelAnimationFrame(frame);frame=0;lastFrame=0;if(!document.hidden&&!reduced&&!dialogOpen)frame=requestAnimationFrame(draw);};
    document.addEventListener('visibilitychange',sync);
    addEventListener('lart-motion-change',sync);addEventListener('lart-dialog-change',sync);sync();
    return ()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',sync);removeEventListener('lart-motion-change',sync);removeEventListener('lart-dialog-change',sync);};
  }

  function initWebGL() {
    if(!window.THREE){initAmbientFallback();return;}
    const canvas=$('#ambient-canvas');
    let renderer;
    try { renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:false,powerPreference:'high-performance'}); } catch {canvas.hidden=true;initAmbientFallback();return;}
    // Keep fill cost bounded on large / Retina screens without capping frame rate.
    const budget=window.createRenderBudget({onChange:()=>{renderer.setPixelRatio(pixelRatio());renderer.setSize(innerWidth,innerHeight);}});
    const pixelRatio=()=>Math.min(devicePixelRatio,1.25,Math.sqrt(budget.pixels/(innerWidth*innerHeight)));
    renderer.setPixelRatio(pixelRatio());renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
    const motion={x:.5,y:.5,vx:0,vy:0},wake={x:.5,y:.5,vx:0,vy:0};
    const uniforms={
      uTime:{value:0},uMouse:{value:new THREE.Vector2(.5,.5)},uWake:{value:new THREE.Vector2(.5,.5)},
      uFlow:{value:new THREE.Vector2()},uVelocity:{value:0},uPresence:{value:0},uScroll:{value:scrollY/innerHeight},
      uPaper:{value:new THREE.Vector3(.9647,.9608,.9412)},uCream:{value:new THREE.Vector3(.9176,.9020,.8745)},
      uStone:{value:new THREE.Vector3(.71,.69,.65)},uBlue:{value:new THREE.Vector3(0.,.1843,.6549)},
      uResolution:{value:new THREE.Vector2(innerWidth,innerHeight)},
      uRipples:{value:ripples.map(ripple=>new THREE.Vector4(ripple.x,ripple.y,ripple.time,1))}
    };
    const material=new THREE.ShaderMaterial({uniforms,extensions:{derivatives:true},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uMouse,uWake,uFlow;
      uniform float uVelocity,uPresence;
      uniform float uScroll;
      uniform vec2 uResolution;
      uniform vec4 uRipples[4];
      uniform vec3 uPaper,uCream,uStone,uBlue;
      void main(){
        float aspect=uResolution.x/uResolution.y;
        vec2 uv=vUv;vec2 p=uv*vec2(aspect,1.);vec2 m=uMouse*vec2(aspect,1.);
        vec2 delta=p-m;float distanceToMouse=length(delta);
        float influence=exp(-dot(delta,delta)*5.)*uPresence;
        vec2 wakeDelta=p-uWake*vec2(aspect,1.);
        float wakeInfluence=exp(-dot(wakeDelta,wakeDelta)*4.)*uPresence;
        p+=delta*influence*(.21+uVelocity*.10);
        p-=uFlow*vec2(aspect,1.)*influence*.028;
        p+=wakeDelta*wakeInfluence*uVelocity*.08;
        p+=.13*vec2(sin(p.y*1.7+uTime*.15),cos(p.x*1.5-uTime*.12));
        p.y+=uScroll*.045;
        float wave=sin(distanceToMouse*16.-uTime*.9)*influence*(.006+uVelocity*.012);
        for(int i=0;i<4;i++){
          float age=uTime-uRipples[i].z;
          if(age>=0.&&age<5.){
            vec2 origin=uRipples[i].xy*vec2(aspect,1.);
            float front=length(uv*vec2(aspect,1.)-origin)-age*.22;
            float envelope=smoothstep(0.,.28,age)*(1.-smoothstep(3.,5.,age));
            wave+=sin(front*30.)*exp(-front*front*85.)*exp(-age*.8)*envelope*.035;
          }
        }
        float field=sin(p.x*1.65+p.y*1.4+uTime*.12)*.43
          +cos(p.y*2.4-p.x*.8-uTime*.09)*.31
          +sin(p.x*3.1+p.y*.9+uTime*.07)*.14+wave;
        // Denser elevation bands continuously arrive as the field drifts through them.
        float level=field*14.5-uTime*.32;
        float edge=max(fwidth(level),.0005);
        // The static DOM grain supplies paper texture without another per-pixel hash.
        vec3 paper=uPaper,cream=uCream;
        vec3 stone=uStone,blue=uBlue;
        // A soft blue crest travels along the field, coloring only its contour ink.
        float chromaticWave=.5+.5*sin(p.x*4.1+p.y*2.7+field*2.4-uTime*1.35);
        float pulse=chromaticWave*chromaticWave*chromaticWave;
        pulse*=pulse*(.8+.2*sin(uTime*.55));
        // The blue crest widens the stroke; antialiasing stays one pixel soft.
        float halfWidth=edge*(.9+pulse*1.6);
        float contours=1.-smoothstep(halfWidth-edge*.55,halfWidth+edge*.55,abs(fract(level+.5)-.5));
        float blueAmount=clamp(.12+pulse*.84+influence*.48,0.,1.);
        vec3 ink=mix(stone,blue,blueAmount);
        vec3 color=mix(paper,cream,.12+.06*sin(field*2.+uTime*.25));
        color=mix(color,ink,contours*(.22+pulse*.38+influence*.10));
        color=mix(color,blue,influence*uVelocity*.010);
        gl_FragColor=vec4(color,1.);
      }`});
    const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));const camera=new THREE.Camera();
    let frame=0,lastFrame=0,contextLost=false,pointerEstablished=false,stopFallback=null;
    window.lartTheme?.subscribe(palette=>{
      for(const [uniform,key] of [['uPaper','background'],['uCream','secondary'],['uStone','contour'],['uBlue','accent']]){
        // The custom shader writes display-space RGB directly, as its original palette did.
        const color=new THREE.Color(palette[key]).convertLinearToSRGB();
        uniforms[uniform].value.set(color.r,color.g,color.b);
      }
      if(!contextLost&&!frame)renderer.render(scene,camera);
    });
    const render=time=>{
      frame=0;
      if(document.hidden||reduced||contextLost||dialogOpen)return;
      if(lastFrame)budget.sample(time-lastFrame);
      const dt=lastFrame?Math.min((time-lastFrame)*.001,.05):1/60;lastFrame=time;
      ambientElapsed+=dt;uniforms.uTime.value=ambientElapsed;
      if(pointer.moved&&!pointerEstablished){motion.x=wake.x=pointer.nx;motion.y=wake.y=pointer.ny;pointerEstablished=true;}
      springAxis(motion,'x','vx',pointer.nx,14,dt);springAxis(motion,'y','vy',pointer.ny,14,dt);
      springAxis(wake,'x','vx',motion.x,6,dt);springAxis(wake,'y','vy',motion.y,6,dt);
      uniforms.uMouse.value.set(motion.x,motion.y);uniforms.uWake.value.set(wake.x,wake.y);
      const speed=Math.hypot(motion.vx,motion.vy),limit=1/Math.max(1,speed/1.4);
      uniforms.uFlow.value.set(motion.vx*limit,motion.vy*limit);
      uniforms.uVelocity.value=damp(uniforms.uVelocity.value,Math.min(speed*.65,1),4,dt);
      uniforms.uPresence.value=damp(uniforms.uPresence.value,pointer.active?1:0,3.5,dt);
      uniforms.uScroll.value=damp(uniforms.uScroll.value,scrollY/innerHeight,4,dt);
      for(let i=0;i<ripples.length;i++){const ripple=ripples[i];uniforms.uRipples.value[i].set(ripple.x,ripple.y,ripple.time,1);}
      renderer.render(scene,camera);frame=requestAnimationFrame(render);
    };
    const syncAmbient=()=>{
      cancelAnimationFrame(frame);frame=0;lastFrame=0;budget.reset();
      if(document.hidden||contextLost||dialogOpen)return;
      if(reduced)renderer.render(scene,camera);else frame=requestAnimationFrame(render);
    };
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(frame);frame=0;canvas.style.opacity='0';root.classList.remove('webgl-active');stopFallback=initAmbientFallback();});
    canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;stopFallback?.();stopFallback=null;canvas.style.opacity='';root.classList.add('webgl-active');syncAmbient();});
    document.addEventListener('visibilitychange',syncAmbient);
    addEventListener('lart-motion-change',syncAmbient);
    addEventListener('lart-dialog-change',syncAmbient);
    addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;lastFrame=0;});
    addEventListener('pageshow',syncAmbient);
    renderer.render(scene,camera);root.classList.add('webgl-active');syncAmbient();
    addEventListener('resize',()=>{renderer.setPixelRatio(pixelRatio());renderer.setSize(innerWidth,innerHeight);uniforms.uResolution.value.set(innerWidth,innerHeight);if(reduced&&!contextLost)renderer.render(scene,camera);},{passive:true});

  }
  initWebGL();
  window.createImagePlanes({THREE:window.THREE,isReduced:()=>reduced,isDesktop:desktop,pointerQuery:finePointer,isDialogOpen:()=>dialogOpen});
  if(hasGSAP) {
    const compass=$('.compass');let angle=0;
    gsap.ticker.add((time,deltaTime)=>{
      if(reduced||document.hidden)return;
      const dt=Math.min(deltaTime*.001,.05);
      velocitySmoothed=damp(velocitySmoothed,scrollVelocity,4,dt);scrollVelocity*=Math.exp(-2.5*dt);
      scrollKinetics.update(velocitySmoothed);
      if(Math.abs(velocitySmoothed)>.1){angle+=clamp(velocitySmoothed*.042,-90,90)*dt;compass.style.transform=`rotate(${angle}deg)`;}
    });
  }

  function settleHeroTitle() {
    heroTitleTimeline?.kill();heroTitleTimeline=null;
    if(hasGSAP){gsap.set('.hero-line-text',{clearProps:'transform,opacity,visibility'});gsap.set('.hero-line-wipe',{clearProps:'transform,transformOrigin,visibility'});}
    root.classList.remove('hero-title-entering');
  }
  function settleHeroEntrance() {
    heroEntranceTimeline?.kill();heroEntranceTimeline=null;
    settleHeroTitle();
    if(hasGSAP){
      gsap.set('.hero-artifact',{clearProps:'clipPath,scale,opacity,visibility'});
      gsap.set('.site-header,.hero-intro,.hero-kicker,.hero-side-note,.hero-bottom',{clearProps:'transform,opacity,visibility'});
    }
    root.classList.remove('entrance-pending');
  }
  function animateHeroTitle(paused=false) {
    settleHeroTitle();
    if(!hasGSAP||reduced)return;
    const lines=$$('.hero-line');
    root.classList.add('hero-title-entering');
    gsap.set('.hero-line-text',{xPercent:18,autoAlpha:0});
    gsap.set('.hero-line-wipe',{x:0,xPercent:102,scaleX:1,transformOrigin:'0% 50%',visibility:'visible'});
    heroTitleTimeline=gsap.timeline({paused,onComplete:settleHeroTitle});
    lines.forEach((line,index)=>{
      const block=$('.hero-line-wipe',line),text=$('.hero-line-text',line),start=.28+index*.18;
      // Sweep from the right; collapse toward the left to release the following text.
      heroTitleTimeline
        .to(block,{xPercent:0,duration:.58,ease:'power3.inOut'},start)
        .set(text,{autoAlpha:1},start+.6)
        .to(block,{scaleX:0,duration:.88,ease:'power4.inOut'},start+.66)
        .to(text,{xPercent:0,duration:1.02,ease:'power3.out'},start+.66);
    });
  }
  function prepareHeroEntrance() {
    // Seed every initial state while the opaque curtain still covers the page.
    animateHeroTitle(true);
    gsap.set('.hero-artifact',{scale:.94,autoAlpha:0});
    gsap.set('.hero-intro,.hero-kicker,.hero-side-note,.hero-bottom',{y:20,autoAlpha:0});
    gsap.set('.site-header',{y:-12,autoAlpha:0});
    heroEntranceTimeline=gsap.timeline({paused:true,onComplete:()=>{
      gsap.set('.hero-artifact',{clearProps:'clipPath,scale,opacity,visibility'});
      gsap.set('.site-header,.hero-intro,.hero-kicker,.hero-side-note,.hero-bottom',{clearProps:'transform,opacity,visibility'});
      heroEntranceTimeline=null;
    }})
      .to('.site-header',{y:0,autoAlpha:1,duration:.85,ease:'power3.out'},.12)
      .to('.hero-artifact',{scale:1,autoAlpha:1,duration:1.6,ease:'power4.inOut'},.12)
      .to('.hero-intro,.hero-kicker,.hero-side-note,.hero-bottom',{y:0,autoAlpha:1,duration:1,stagger:.1,ease:'power3.out'},.4);
    // Inline GSAP states now own visibility; CSS covered the earlier first paint.
    root.classList.remove('entrance-pending');
  }
  function finishOpening() {
    $('.preloader')?.remove();
    root.classList.add('ready');document.body.classList.remove('loading');lenis?.start();headlines.start();
    setTimeout(()=>{
      if(hasGSAP)ScrollTrigger.refresh();
      if(location.hash){const destination=targetFromHash(location.hash);if(destination)scrollToTarget(destination,{immediate:true});}
      updateProgress();
    },200);
  }
  function forceEntranceVisible() {
    launchTimeline?.kill();launchTimeline=null;
    settleHeroEntrance();finishOpening();
  }
  // The head's fail-open watchdog can always release an interrupted entrance.
  window.lartRevealEntrance=forceEntranceVisible;
  addEventListener('lart-motion-change',()=>{
    if(reduced&&launchTimeline)forceEntranceVisible();
  });
  async function launch() {
    if(started)return;started=true;
    await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1800))]);
    setupMotion();
    if(!hasGSAP||reduced||!$('.preloader')){settleHeroEntrance();finishOpening();return;}
    lenis?.stop();
    prepareHeroEntrance();
    const loader=$('.preloader'),paths=$$('.loader-emblem path');
    gsap.set(paths,{opacity:.08});
    const count={value:0},countLabel=$('.loader-count'),yearLabel=$('.loader-year'),logLabel=$('.loader-log');
    const years=['1983','1991','1998','2012','PRESENT'];
    const logs=['INDEXING // THE FIRST PIXELS','LOADING // ANOTHER_WORLD_POLYGON_DATA','MAPPING // THE AUTEUR GENERATION','TRACING // WORLDS_WITHOUT_LIMITS','ARCHIVE READY // ENTER THE EXHIBITION'];
    const loadingDuration=5.7,curtainStart=loadingDuration+.15;let lastLoadingCount=-1,lastLoadingIndex=-1;
    const timeline=gsap.timeline({onComplete:()=>{launchTimeline=null;finishOpening();}});launchTimeline=timeline;
    timeline
      .to(paths,{opacity:1,duration:3.6,stagger:.1,ease:'power2.inOut'},0)
      .to(count,{value:100,duration:loadingDuration,ease:'power2.inOut',onUpdate:()=>{
        const n=Math.round(count.value),index=Math.min(4,Math.floor(n/22));
        if(n!==lastLoadingCount){countLabel.textContent=String(n).padStart(3,'0')+'%';lastLoadingCount=n;}
        if(index!==lastLoadingIndex){yearLabel.textContent=years[index];logLabel.textContent=logs[index];lastLoadingIndex=index;}
      }},0)
      .call(()=>loader.classList.remove('is-glitching'),null,loadingDuration)
      .to('.loader-top,.loader-center,.loader-bottom',{opacity:0,y:-20,duration:.3,stagger:.04,ease:'power3.in'},loadingDuration+.05)
      .to('.loader-panels span',{scaleY:0,duration:.8,stagger:.04,ease:'power4.inOut'},curtainStart)
      .call(()=>{
        // Play prepared timelines as the curtain opens; nothing resets after exposure.
        root.classList.add('ready');
        heroTitleTimeline?.play(0);heroEntranceTimeline?.play(0);
      },null,curtainStart+.18);
    for(const at of [.65,1.7,2.85,4.1,5.25]){
      timeline.call(()=>loader.classList.add('is-glitching'),null,at)
        .call(()=>loader.classList.remove('is-glitching'),null,at+.2);
    }
  }
  launch().catch(forceEntranceVisible);
  function rebuildMotionKeepingPlace(anchor) {
    const top=anchor?.isConnected?anchor.getBoundingClientRect().top:null;
    applyMotionPreference();setupMotion();
    if(top!==null&&anchor.isConnected){
      scrollToTarget(scrollY+anchor.getBoundingClientRect().top-top,{immediate:true,force:true});
      if(hasGSAP)ScrollTrigger.update();
      updateProgress();
    }
  }
  $('.motion-toggle').addEventListener('click',event=>{
    reduced=!reduced;motionOverride=reduced;
    try{localStorage.setItem('lart-motion',reduced?'reduce':'full');}catch{}
    rebuildMotionKeepingPlace(event.currentTarget);
  });
  reducedPreference.addEventListener('change',e=>{if(motionOverride===null){
    const anchor=dialogOpen?previousFocus:document.elementFromPoint(innerWidth*.5,innerHeight*.5)?.closest('section[id],footer[id]');
    reduced=e.matches;rebuildMotionKeepingPlace(anchor);
  }});
  let resizeTimer,lastWidth=innerWidth,lastHeight=innerHeight;
  addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(Math.abs(innerWidth-lastWidth)<3&&(innerWidth<=760||Math.abs(innerHeight-lastHeight)<40))return;lastWidth=innerWidth;lastHeight=innerHeight;resizing=true;setupMotion();resizing=false;},250);},{passive:true});
})();
