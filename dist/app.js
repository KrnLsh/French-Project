/* L’Art du Jeu — exhibition direction, motion, and interaction. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const finePointer = matchMedia('(pointer:fine)');
  const reducedPreference = matchMedia('(prefers-reduced-motion:reduce)');
  const desktop = () => innerWidth > 760;
  const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
  const root = document.documentElement;
  let motionOverride = null;
  try { const saved = localStorage.getItem('lart-motion'); if (saved) motionOverride = saved === 'reduce'; } catch {}
  let reduced = motionOverride ?? reducedPreference.matches;
  let lenis = null, lenisTicker = null, motionContext = null, galleryTrigger = null;
  let splits = [], started = false, resizing = false, heroTitleTimeline = null;
  let scrollVelocity = 0, velocitySmoothed = 0, galleryProgress = 0;
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
    ripples[rippleIndex]={x:pointer.nx,y:pointer.ny,time:ambientElapsed};
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

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  function applyMotionPreference() {
    root.classList.toggle('motion-reduced', reduced);
    const toggle = $('.motion-toggle');
    toggle.setAttribute('aria-pressed', String(reduced));
    toggle.innerHTML = `${reduced ? 'Full motion' : 'Reduce motion'} <span>${reduced ? '●' : '○'}</span>`;
    if (reduced) root.classList.remove('custom-cursor');
    if (reduced && heroTitleTimeline) settleHeroTitle();
    dispatchEvent(new Event('lart-motion-change'));
  }
  applyMotionPreference();

  function updateProgress() {
    const maximum = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = clamp(scrollY / maximum, 0, 1);
    $('.scroll-progress').textContent = `${String(Math.round(progress * 100)).padStart(3, '0')}%`;
    $('.header-progress').style.transform = `scaleX(${progress})`;
    const now = performance.now();
    if (!lenis) scrollVelocity = (scrollY - lastScroll) / Math.max(16, now - lastScrollTime) * 1000;
    lastScroll = scrollY; lastScrollTime = now;
    let active = '';
    for (const id of ['pioneers', 'auteurs', 'worlds', 'renaissance']) if ($(`#${id}`).getBoundingClientRect().top < innerHeight * .5) active = id;
    $$('.era-nav a').forEach(a => {const current = a.dataset.era === active; a.classList.toggle('is-active', current); if(current) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');});
  }
  let scrollQueued = false;
  addEventListener('scroll', () => {if (!scrollQueued) {requestAnimationFrame(() => {updateProgress();scrollQueued=false;});scrollQueued=true;}}, {passive:true});

  function initSmoothScroll() {
    if (lenis) {lenis.destroy();lenis=null;}
    if (lenisTicker && hasGSAP) gsap.ticker.remove(lenisTicker);
    lenisTicker = null;
    if (!reduced && desktop() && hasGSAP && window.Lenis && finePointer.matches) {
      lenis = new Lenis({duration:1.12, easing:t => Math.min(1,1.001-Math.pow(2,-10*t)), smoothWheel:true, syncTouch:false});
      lenis.on('scroll', e => {scrollVelocity=e.velocity*55;ScrollTrigger.update();});
      lenisTicker = time => lenis?.raf(time*1000);
      gsap.ticker.add(lenisTicker);
      gsap.ticker.lagSmoothing(0);
      if (dialogOpen) lenis.stop();
    }
  }
  function scrollToTarget(target, options={}) {
    if (lenis) lenis.scrollTo(target, {offset:typeof target==='number'?0:-parseInt(getComputedStyle(root).getPropertyValue('--header-height')), duration:1.6,...options});
    else {const top=typeof target==='number'?target:target.getBoundingClientRect().top+scrollY-parseInt(getComputedStyle(root).getPropertyValue('--header-height'));scrollTo({top,behavior:reduced||options.immediate?'instant':'smooth'});}
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const target = $(a.getAttribute('href'));
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

  function setupMotion() {
    if (!hasGSAP) return;
    motionContext?.revert();
    studioChronicle.reset();
    splits.forEach(s=>s.revert());splits=[];
    galleryTrigger = null;
    initSmoothScroll();
    if (reduced) {
      gsap.set('.reveal',{clearProps:'all'});
      $('.gallery-window').style.overflowX='auto';
      studioChronicle.setup({animated:false});
      updateProgress();return;
    }
    $('.gallery-window').style.removeProperty('overflow-x');
    motionContext = gsap.context(()=>{
      $$('.reveal').forEach(el=>{
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
      $$('.section-rule').forEach(section=>gsap.fromTo(section,{'--line-progress':0},{'--line-progress':1,duration:1.2,ease:'power3.inOut',scrollTrigger:{trigger:section,start:'top 92%',once:true}}));
      $$('.timeline-entry').forEach(entry=>ScrollTrigger.create({trigger:entry,start:'top 60%',end:'bottom 40%',onToggle:self=>{entry.classList.toggle('is-active',self.isActive);if(self.isActive) changeYear(entry.dataset.timelineYear);}}));
      studioChronicle.setup({animated:true});
      if (desktop()) {
        const sticky=$('.timeline-sticky'),layout=$('.timeline-layout');
        ScrollTrigger.create({trigger:sticky,start:'top 125px',end:()=>`+=${Math.max(0,layout.offsetHeight-sticky.offsetHeight)}`,pin:true,pinSpacing:false,invalidateOnRefresh:true});
        const track=$('.gallery-track'),pin=$('.gallery-pin');
        const distance=()=>Math.max(0,track.scrollWidth-innerWidth);
        const tween=gsap.to(track,{x:()=>-distance(),ease:'none',scrollTrigger:{trigger:pin,start:()=>`top ${parseInt(getComputedStyle(root).getPropertyValue('--header-height'))}px`,end:()=>`+=${distance()*1.12}`,pin:true,scrub:.85,invalidateOnRefresh:true,anticipatePin:1,onUpdate:self=>setGalleryProgress(self.progress)}});
        galleryTrigger=tween.scrollTrigger;
        gsap.to('.hero-artifact',{y:-45,rotation:0,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1.2}});
        gsap.fromTo('.worlds-image',{y:60},{y:-40,ease:'none',scrollTrigger:{trigger:'.worlds-intro',start:'top bottom',end:'bottom top',scrub:1.5}});
        gsap.fromTo('.footer-art h2',{scale:.93,y:30},{scale:1,y:0,ease:'none',scrollTrigger:{trigger:'.footer-art',start:'top bottom',end:'bottom 75%',scrub:1.4}});
      }
      gsap.fromTo('.worlds',{backgroundColor:'#F6F5F0'},{backgroundColor:'#EAE6DF',ease:'none',scrollTrigger:{trigger:'.worlds',start:'top 90%',end:'top 30%',scrub:true}});
    });
    ScrollTrigger.refresh();updateProgress();
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
    $('.gallery-count').textContent=`0${index+1} / 05`;
    $('.gallery-progress span').style.transform=`scaleX(${Math.max(.03,progress)})`;
  }
  const galleryWindow=$('.gallery-window');
  galleryWindow.addEventListener('scroll',()=>{if(!desktop()||reduced)setGalleryProgress(galleryWindow.scrollLeft/Math.max(1,galleryWindow.scrollWidth-galleryWindow.clientWidth));},{passive:true});
  function moveGallery(direction) {
    const next=clamp(Math.round(galleryProgress*4)+direction,0,4);
    if(galleryTrigger)scrollToTarget(galleryTrigger.start+(galleryTrigger.end-galleryTrigger.start)*next/4);
    else {const card=$('.exhibit-card');galleryWindow.scrollTo({left:next*(card.offsetWidth+(desktop()?42:22)),behavior:reduced?'instant':'smooth'});}
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
  addEventListener('pointermove',e=>{
    if(!dragging||e.pointerId!==dragging.id)return;
    const delta=e.clientX-dragging.x,vertical=e.clientY-dragging.y;
    if(!dragged&&Math.abs(vertical)>12&&Math.abs(vertical)>Math.abs(delta)){cancelGalleryDrag();return;}
    if(Math.abs(delta)>12&&Math.abs(delta)>Math.abs(vertical))dragged=true;
    if(!dragged)return;
    if(galleryTrigger){
      const total=Math.max(1,$('.gallery-track').scrollWidth-innerWidth);
      scrollToTarget(dragging.scroll-delta*(galleryTrigger.end-galleryTrigger.start)/total,{immediate:true});
    }else galleryWindow.scrollLeft=dragging.left-delta;
  });
  addEventListener('pointerup',()=>{dragging=null;dragResetTimer=setTimeout(()=>dragged=false,0);});
  addEventListener('pointercancel',cancelGalleryDrag);
  addEventListener('blur',cancelGalleryDrag);
  galleryWindow.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopPropagation();}},true);
  galleryWindow.addEventListener('dragstart',e=>e.preventDefault());

  const studioChronicle=window.createStudioChronicle({
    gsap:hasGSAP?gsap:null,ScrollTrigger:hasGSAP?ScrollTrigger:null,
    isReduced:()=>reduced,isDialogOpen:()=>dialogOpen,scrollTo:scrollToTarget
  });
  const themes={
    visual:{number:'01 / VISUAL CULTURE',title:'Beyond the<br><em>drawn panel.</em>',copy:'Bande dessinée offers a way to think in striking compositions, expressive silhouettes, and worlds suggested beyond the frame. Another World and Rayman take radically different routes through that visual imagination.',reference:'SEE ALSO / ANOTHER WORLD, RAYMAN',shape:'m200 54 130 116-130 113L76 170Z',node:0},
    world:{number:'02 / SYSTEMIC WORLD-BUILDING',title:'A place that<br><em>answers back.</em>',copy:'Arkane’s spaces are built for interpretation. A roof, an open window, a conversation: each can become a route. From Arx Fatalis to Dishonored, the environment is a system the player learns to read and change.',reference:'SEE ALSO / ARX FATALIS, DISHONORED',shape:'m200 92 145 78-145 79L108 170Z',node:1},
    music:{number:'03 / ELECTRONIC MUSIC SCORING',title:'The sound<br><em>of elsewhere.</em>',copy:'Dune’s electronic score, composed by Stéphane Picq and Philip Ulrich, turns an unfamiliar planet into an intimate dream. Music becomes a form of world-building, carrying emotion beyond what the screen can show.',reference:'SEE ALSO / DUNE, ANOTHER WORLD',shape:'m200 107 84 63-84 135L94 170Z',node:2},
    mood:{number:'04 / MELANCHOLIC ATMOSPHERE',title:'Beauty with<br><em>an ache.</em>',copy:'Vulnerability, absence, and uncertain futures run through very different works. Another World’s isolation, Life is Strange’s fragile memories, and Clair Obscur’s threatened lives each let emotion shape the experience of play.',reference:'SEE ALSO / LIFE IS STRANGE, CLAIR OBSCUR',shape:'m200 91 94 79-94 91L55 170Z',node:3}
  };
  $$('.diagram-tab').forEach(button=>button.addEventListener('click',()=>{
    const item=themes[button.dataset.theme];
    $$('.diagram-tab').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});
    $('.diagram-number').textContent=item.number;$('.diagram-title').innerHTML=item.title;$('.diagram-copy').textContent=item.copy;$('.diagram-reference').textContent=item.reference;$('.radar-shape').setAttribute('d',item.shape);
    $$('.radar-nodes circle').forEach((c,i)=>c.classList.toggle('selected',i===item.node));
    if(hasGSAP&&!reduced)gsap.fromTo('.diagram-commentary',{opacity:.25,y:12},{opacity:1,y:0,duration:.6,ease:'power3.out',overwrite:true});
  }));
  $('.radar-nodes circle').classList.add('selected');
  $$('.radar-nodes circle').forEach((node,index)=>{node.style.cursor='pointer';node.addEventListener('click',()=>$$('.diagram-tab')[index].click());node.addEventListener('pointerenter',()=>$$('.diagram-tab')[index].click());});

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
    return $$('img',element).find(img=>img.complete&&img.naturalWidth&&img.getClientRects().length&&getComputedStyle(img).visibility!=='hidden')||null;
  }
  function frameOf(element) {
    const {left,top,width,height}=element.getBoundingClientRect();
    return {left,top,width,height,borderRadius:0};
  }
  function pictureFrame(image,frame) {
    const rect=image.getBoundingClientRect();
    return {left:rect.left-frame.left,top:rect.top-frame.top,width:rect.width,height:rect.height};
  }
  function createDialogMorph(frame,image,imageFrame) {
    const shell=document.createElement('div');shell.className='dialog-morph';
    shell.setAttribute('aria-hidden','true');shell.inert=true;
    for(const [key,value] of Object.entries(frame))shell.style[key]=value+'px';
    if(image&&imageFrame){
      const picture=document.createElement('img');picture.src=image.currentSrc||image.src;picture.alt='';
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
    dialog.hidden=true;dialog.setAttribute('aria-hidden','true');
    dialog.style.removeProperty('transform');dialog.style.removeProperty('opacity');
    modalBackdrop.hidden=true;activeDialog=null;dialogOpen=false;dialogTrigger=null;
    root.classList.remove('modal-open');document.body.classList.remove('modal-open');
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
    modalBackdrop.hidden=false;dialog.scrollTop=0;
    activeDialog=dialog;dialogOpen=true;
    scrollLock={root:root.style.overflow,body:document.body.style.overflow};
    root.classList.add('modal-open');document.body.classList.add('modal-open');
    root.style.overflow='hidden';document.body.style.overflow='hidden';
    backgroundElements.forEach(element=>{inertStates.set(element,element.inert);element.inert=true;});
    lenis?.stop();root.classList.remove('custom-cursor');
    if(hasGSAP){
      gsap.set('.cursor-dot,.cursor-ring,.floating-preview',{opacity:0});
      if(!reduced&&origin){
        const destination=frameOf(dialog),shell=createDialogMorph(origin,image,imageOrigin);
        const transition={dialog,shell,phase:'opening',timeline:null,timer:0};dialogTransition=transition;
        const finish=()=>{if(dialogTransition===transition)resetDialogTransition();};
        dialog.classList.add('is-morphing');
        gsap.set(dialog,{opacity:0});gsap.set(modalBackdrop,{opacity:0});
        gsap.set(dialogParts(dialog),{opacity:0,y:18});
        const timeline=gsap.timeline({onComplete:finish});transition.timeline=timeline;
        timeline.to(shell,{...destination,duration:.86,ease:'power4.inOut'},0)
          .to(modalBackdrop,{opacity:1,duration:.55,ease:'power3.out'},.04)
          .to(dialog,{opacity:1,duration:.32,ease:'power3.out'},.52)
          .to(dialogParts(dialog),{opacity:1,y:0,duration:.44,stagger:.045,ease:'power3.out'},.58)
          .to(shell,{opacity:0,duration:.22,ease:'power2.out'},.64);
        const targetImage=$('.dialog-image:not([hidden]) img',dialog);
        if(image&&targetImage)timeline.to($('img',shell),{...pictureFrame(targetImage,destination),duration:.86,ease:'power4.inOut'},0);
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
    const transition={dialog,shell,phase:'closing',restoreFocus,timeline:null,timer:0};dialogTransition=transition;
    const finish=()=>{if(dialogTransition===transition)finishDialogClose(dialog,restoreFocus);};
    dialog.classList.add('is-morphing');
    const timeline=gsap.timeline({onComplete:finish});transition.timeline=timeline;
    timeline.to(dialog,{opacity:0,duration:.15,ease:'power2.out'},0)
      .to(shell,{opacity:1,duration:.12,ease:'power2.out'},0)
      .to(shell,{...destination,duration:.66,ease:'power4.inOut'},.02)
      .to(modalBackdrop,{opacity:0,duration:.5,ease:'power3.inOut'},.1)
      .to(shell,{opacity:0,duration:.12,ease:'power2.in'},.56);
    const picture=$('img',shell);
    if(picture&&image)timeline.to(picture,{...pictureFrame(image,destination),duration:.66,ease:'power4.inOut'},.02);
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
    $('.dialog-year').textContent=a.year;$('#artifact-title').textContent=a.title;$('.dialog-deck').textContent=a.deck;$('.dialog-copy').textContent=a.copy;
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

  function initCursor() {
    if(!hasGSAP||!finePointer.matches)return;
    const dot=$('.cursor-dot'),ring=$('.cursor-ring');
    const toX=gsap.quickTo(ring,'x',{duration:.22,ease:'power3.out'}),toY=gsap.quickTo(ring,'y',{duration:.22,ease:'power3.out'});
    const contentSelector='a,button,input,select,textarea,label,legend,h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,dt,dd,em,strong,small,img,svg,canvas,[data-cursor],[role="button"],[role="tab"],[tabindex="0"],.mono,.era-year,.trail-grid>span';
    let headingRects=[],regionFrame=0,pointerInside=false;
    $('span',ring).textContent='';
    function updateCursorHover(target=document.elementFromPoint(pointer.x,pointer.y)) {
      const overElement=Boolean(target?.closest?.(contentSelector));
      // Display headings deliberately ignore pointer events for overlapping artwork.
      // Cache their visual bounds so their letters still activate the inversion ball.
      const overHeading=!dialogOpen&&headingRects.some(rect=>pointer.x>=rect.left&&pointer.x<=rect.right&&pointer.y>=rect.top&&pointer.y<=rect.bottom);
      const overContent=overElement||overHeading;
      ring.classList.toggle('is-ball',overContent);
      dot.classList.toggle('is-over-content',overContent);
    }
    function refreshCursorRegions() {
      regionFrame=0;
      headingRects=$$('h1,h2,h3,h4,h5,h6').map(heading=>heading.getBoundingClientRect())
        .filter(rect=>rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight);
      if(pointerInside)updateCursorHover();
    }
    function queueCursorRefresh(){if(!regionFrame)regionFrame=requestAnimationFrame(refreshCursorRegions);}
    document.addEventListener('scroll',queueCursorRefresh,{passive:true,capture:true});
    addEventListener('resize',queueCursorRefresh,{passive:true});
    document.fonts.ready.then(queueCursorRefresh);
    if(window.ResizeObserver)new ResizeObserver(queueCursorRefresh).observe($('#main'));
    queueCursorRefresh();
    addEventListener('pointermove',e=>{
      if(reduced||!desktop()){pointerInside=false;root.classList.remove('custom-cursor');gsap.set([dot,ring],{opacity:0});return;}
      if(!pointerInside)gsap.set(ring,{x:e.clientX,y:e.clientY});
      pointerInside=true;root.classList.add('custom-cursor');
      gsap.set(dot,{x:e.clientX,y:e.clientY,opacity:1});gsap.set(ring,{opacity:1});toX(e.clientX);toY(e.clientY);
      updateCursorHover(e.target);
    },{passive:true});
    document.addEventListener('pointerleave',()=>{pointerInside=false;gsap.to([dot,ring],{opacity:0,duration:.2});root.classList.remove('custom-cursor');});
    addEventListener('blur',()=>{pointerInside=false;gsap.set([dot,ring],{opacity:0});root.classList.remove('custom-cursor');});
    $$('.magnetic').forEach(element=>{
      const x=gsap.quickTo(element,'x',{duration:.65,ease:'power3.out'}),y=gsap.quickTo(element,'y',{duration:.65,ease:'power3.out'});
      element.addEventListener('pointermove',e=>{if(reduced||!desktop())return;const rect=element.getBoundingClientRect(),dx=e.clientX-rect.left-rect.width/2,dy=e.clientY-rect.top-rect.height/2;x(clamp(dx*.18,-12,12));y(clamp(dy*.22,-10,10));});
      element.addEventListener('pointerleave',()=>{x(0);y(0);});
    });
    $$('.tilt-card').forEach(card=>{
      const target=$('.image-distort',card);if(!target)return;
      card.addEventListener('pointermove',e=>{if(reduced||!desktop())return;const b=card.getBoundingClientRect(),x=(e.clientX-b.left)/b.width,y=(e.clientY-b.top)/b.height;card.style.setProperty('--glare-x',`${x*100}%`);card.style.setProperty('--glare-y',`${y*100}%`);gsap.to(target,{rotationX:(.5-y)*3,rotationY:(x-.5)*4,transformPerspective:1200,duration:.7,ease:'power3.out',overwrite:'auto'});});
      card.addEventListener('pointerleave',()=>gsap.to(target,{rotationX:0,rotationY:0,duration:1,ease:'power3.out'}));
    });
    const preview=$('.floating-preview'),previewImage=$('img',preview);
    const previewX=gsap.quickTo(preview,'x',{duration:.5,ease:'power3.out'}),previewY=gsap.quickTo(preview,'y',{duration:.6,ease:'power3.out'});
    $$('.ledger-row').forEach(row=>{
      row.addEventListener('pointerenter',e=>{if(reduced||!desktop())return;const a=artifacts[row.dataset.preview];previewImage.src=`assets/${a.image}`;$('span',preview).textContent=`${a.studio} // ${a.year}`;gsap.set(preview,{x:clamp(e.clientX+80,180,innerWidth-180),y:clamp(e.clientY-90,180,innerHeight-130)});gsap.fromTo(preview,{opacity:0,clipPath:'inset(50% 0 50% 0)'},{opacity:1,clipPath:'inset(0% 0 0% 0)',duration:.4,ease:'power3.out',overwrite:true});});
      row.addEventListener('pointermove',e=>{if(reduced||!desktop())return;previewX(clamp(e.clientX+90,180,innerWidth-180));previewY(clamp(e.clientY-95,180,innerHeight-130));gsap.to(preview,{rotation:clamp((e.movementX||0)*.25,-8,8),duration:.6,overwrite:'auto'});});
      row.addEventListener('pointerleave',()=>gsap.to(preview,{opacity:0,rotation:0,duration:.3,overwrite:true}));
      row.addEventListener('click',()=>gsap.set(preview,{opacity:0}));
    });
  }
  initCursor();
  const trailGrid=$('.trail-grid');
  for(let i=0;i<108;i++){const cell=document.createElement('span');let timer;cell.addEventListener('pointerenter',()=>{if(reduced)return;clearTimeout(timer);cell.classList.add('active');timer=setTimeout(()=>cell.classList.remove('active'),100);});trailGrid.append(cell);}

  function initAmbientFallback() {
    const surface=$('.ambient-fallback'),position={x:0,y:0};
    let frame=0,lastFrame=0;
    const draw=time=>{
      frame=0;
      if(document.hidden||reduced)return;
      const dt=lastFrame?Math.min((time-lastFrame)*.001,.05):1/60;lastFrame=time;
      position.x=damp(position.x,(pointer.nx-.5)*45,5,dt);
      position.y=damp(position.y,(.5-pointer.ny)*35,5,dt);
      surface.style.transform=`translate3d(${position.x.toFixed(3)}px,${position.y.toFixed(3)}px,0)`;
      frame=requestAnimationFrame(draw);
    };
    const sync=()=>{cancelAnimationFrame(frame);frame=0;lastFrame=0;if(!document.hidden&&!reduced)frame=requestAnimationFrame(draw);};
    document.addEventListener('visibilitychange',sync);
    addEventListener('lart-motion-change',sync);sync();
    return ()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',sync);removeEventListener('lart-motion-change',sync);};
  }

  function initWebGL() {
    if(!window.THREE){initAmbientFallback();return;}
    const canvas=$('#ambient-canvas');
    let renderer;
    try { renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:false,powerPreference:'high-performance'}); } catch {canvas.hidden=true;initAmbientFallback();return;}
    // Keep fill cost bounded on large / Retina screens without capping frame rate.
    const pixelRatio=()=>Math.min(devicePixelRatio,1.5,Math.sqrt(2000000/(innerWidth*innerHeight)));
    renderer.setPixelRatio(pixelRatio());renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
    const motion={x:.5,y:.5,vx:0,vy:0},wake={x:.5,y:.5,vx:0,vy:0};
    const uniforms={
      uTime:{value:0},uMouse:{value:new THREE.Vector2(.5,.5)},uWake:{value:new THREE.Vector2(.5,.5)},
      uFlow:{value:new THREE.Vector2()},uVelocity:{value:0},uPresence:{value:0},uScroll:{value:scrollY/innerHeight},
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
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
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
        float grain=(hash(gl_FragCoord.xy)-.5)*.008;
        vec3 paper=vec3(.9647,.9608,.9412),cream=vec3(.9176,.9020,.8745);
        vec3 stone=vec3(.71,.69,.65),blue=vec3(0.,.1843,.6549);
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
        color=mix(color,blue,influence*uVelocity*.010)+grain;
        gl_FragColor=vec4(color,1.);
      }`});
    const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));const camera=new THREE.Camera();
    let frame=0,lastFrame=0,contextLost=false,pointerEstablished=false,stopFallback=null;
    const render=time=>{
      frame=0;
      if(document.hidden||reduced||contextLost)return;
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
      ripples.forEach((ripple,index)=>uniforms.uRipples.value[index].set(ripple.x,ripple.y,ripple.time,1));
      renderer.render(scene,camera);frame=requestAnimationFrame(render);
    };
    const syncAmbient=()=>{
      cancelAnimationFrame(frame);frame=0;lastFrame=0;
      if(document.hidden||contextLost)return;
      if(reduced)renderer.render(scene,camera);else frame=requestAnimationFrame(render);
    };
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(frame);frame=0;canvas.style.opacity='0';root.classList.remove('webgl-active');stopFallback=initAmbientFallback();});
    canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;stopFallback?.();stopFallback=null;canvas.style.opacity='';root.classList.add('webgl-active');syncAmbient();});
    document.addEventListener('visibilitychange',syncAmbient);
    addEventListener('lart-motion-change',syncAmbient);
    addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;lastFrame=0;});
    addEventListener('pageshow',syncAmbient);
    renderer.render(scene,camera);root.classList.add('webgl-active');syncAmbient();
    addEventListener('resize',()=>{renderer.setPixelRatio(pixelRatio());renderer.setSize(innerWidth,innerHeight);uniforms.uResolution.value.set(innerWidth,innerHeight);if(reduced&&!contextLost)renderer.render(scene,camera);},{passive:true});
    // Each image plane owns an isolated, short-lived draw loop; offscreen planes do not render.
    if(!finePointer.matches||!desktop())return;
    $$('.image-distort').forEach(container=>{
      const img=$('img',container);if(!img)return;
      let planeRenderer=null,planeScene,planeCamera,planeMaterial,visible=false,hover=false,frame=0,dirty=false,lastDraw=0,planeTime=0;
      const planeTarget=new THREE.Vector2(.5,.5);
      const start=()=>{
        if(reduced||planeRenderer||!img.complete||!img.naturalWidth)return;
        try {
          planeRenderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});planeRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));planeRenderer.setSize(container.clientWidth,container.clientHeight,false);planeRenderer.outputColorSpace=THREE.LinearSRGBColorSpace;
          // Three.js must receive intrinsic dimensions, not the styled image's layout size.
          const textureSource=document.createElement('canvas');
          textureSource.width=img.naturalWidth;textureSource.height=img.naturalHeight;
          const textureContext=textureSource.getContext('2d');
          if(!textureContext)throw new Error('Image texture canvas unavailable');
          textureContext.drawImage(img,0,0);
          const texture=new THREE.CanvasTexture(textureSource);texture.colorSpace=THREE.NoColorSpace;
          if(img.classList.contains('pixel-art')){texture.minFilter=THREE.NearestFilter;texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;}
          planeMaterial=new THREE.ShaderMaterial({uniforms:{uTexture:{value:texture},uMouse:{value:new THREE.Vector2(.5,.5)},uStrength:{value:0},uTime:{value:0},uImageAspect:{value:img.naturalWidth/img.naturalHeight},uPlaneAspect:{value:container.clientWidth/container.clientHeight}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D uTexture;uniform vec2 uMouse;uniform float uStrength,uTime,uImageAspect,uPlaneAspect;void main(){vec2 uv=vUv;vec2 scale=vec2(min(uPlaneAspect/uImageAspect,1.),min(uImageAspect/uPlaneAspect,1.));uv=(uv-.5)*scale+.5;vec2 offset=vUv-uMouse;float d=length(offset);float ripple=sin(d*22.-uTime*2.)*exp(-d*5.)*uStrength*.013;uv+=offset/(d+.18)*ripple;gl_FragColor=texture2D(uTexture,clamp(uv,vec2(.001),vec2(.999)));}`});
          planeScene=new THREE.Scene();planeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),planeMaterial));planeCamera=new THREE.Camera();container.insertBefore(planeRenderer.domElement,img.nextSibling);container.classList.add('webgl-ready');dirty=true;
        }catch{planeRenderer?.dispose();planeRenderer=null;}
      };
      const draw=time=>{
        frame=0;if(!planeRenderer||reduced||!visible||document.hidden){lastDraw=0;return;}
        const dt=lastDraw?Math.min((time-lastDraw)*.001,.05):1/60;lastDraw=time;planeTime+=dt;
        const strength=planeMaterial.uniforms.uStrength;
        strength.value=damp(strength.value,hover?1:0,8,dt);
        planeMaterial.uniforms.uMouse.value.lerp(planeTarget,-Math.expm1(-12*dt));
        planeMaterial.uniforms.uTime.value=planeTime;
        planeRenderer.render(planeScene,planeCamera);dirty=false;
        if(hover||strength.value>.005)frame=requestAnimationFrame(draw);else lastDraw=0;
      };
      const queue=()=>{if(!frame)frame=requestAnimationFrame(draw);};
      const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){start();if(dirty||hover)queue();}else{cancelAnimationFrame(frame);frame=0;lastDraw=0;}},{rootMargin:'150px'});observer.observe(container);
      img.addEventListener('load',()=>{if(visible){start();queue();}},{once:true});
      container.addEventListener('pointerenter',()=>{hover=true;start();queue();});container.addEventListener('pointerleave',()=>{hover=false;queue();});
      container.addEventListener('pointermove',e=>{if(!planeMaterial||reduced)return;const box=container.getBoundingClientRect();planeTarget.set((e.clientX-box.left)/box.width,1-(e.clientY-box.top)/box.height);queue();});
      const syncPlane=()=>{cancelAnimationFrame(frame);frame=0;lastDraw=0;if(!document.hidden&&!reduced&&visible){start();if(hover||dirty||planeMaterial?.uniforms.uStrength.value>.005)queue();}};
      document.addEventListener('visibilitychange',syncPlane);addEventListener('lart-motion-change',syncPlane);
      const resizePlane=()=>{
        if(!planeRenderer)return;
        const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight);
        // CSS owns the visible size; the renderer only resizes its drawing buffer.
        planeRenderer.setSize(width,height,false);
        planeMaterial.uniforms.uPlaneAspect.value=width/height;
        dirty=true;if(visible)queue();
      };
      const planeResizeObserver=new ResizeObserver(resizePlane);planeResizeObserver.observe(container);
    });
  }
  initWebGL();
  if(hasGSAP) {
    const compass=$('.compass');let angle=0,lastSkew='',lastStretch='';
    gsap.ticker.add((time,deltaTime)=>{
      if(reduced)return;
      const dt=Math.min(deltaTime*.001,.05);
      velocitySmoothed=damp(velocitySmoothed,scrollVelocity,4,dt);scrollVelocity*=Math.exp(-2.5*dt);
      const skew=clamp(velocitySmoothed/1800,-1.5,1.5).toFixed(3),stretch=clamp(Math.abs(velocitySmoothed)/180000,0,.018).toFixed(4);
      if(skew!==lastSkew){root.style.setProperty('--scroll-velocity',skew);lastSkew=skew;}
      if(stretch!==lastStretch){root.style.setProperty('--scroll-stretch',stretch);lastStretch=stretch;}
      if(Math.abs(velocitySmoothed)>.1){angle+=clamp(velocitySmoothed*.042,-90,90)*dt;compass.style.transform=`rotate(${angle}deg)`;}
    });
  }

  function settleHeroTitle() {
    heroTitleTimeline?.kill();heroTitleTimeline=null;
    if(hasGSAP){gsap.set('.hero-line-text',{clearProps:'transform,opacity,visibility'});gsap.set('.hero-line-wipe',{clearProps:'transform,transformOrigin,visibility'});}
    root.classList.remove('hero-title-entering');
  }
  function animateHeroTitle() {
    settleHeroTitle();
    if(!hasGSAP||reduced)return;
    const lines=$$('.hero-line');
    root.classList.add('hero-title-entering');
    gsap.set('.hero-line-text',{xPercent:-18,autoAlpha:0});
    gsap.set('.hero-line-wipe',{x:0,xPercent:-102,scaleX:1,transformOrigin:'100% 50%',visibility:'visible'});
    heroTitleTimeline=gsap.timeline({delay:.28,onComplete:settleHeroTitle});
    lines.forEach((line,index)=>{
      const block=$('.hero-line-wipe',line),text=$('.hero-line-text',line),start=index*.18;
      // Sweep in first; then collapse toward the right to uncover the moving text.
      heroTitleTimeline
        .to(block,{xPercent:0,duration:.58,ease:'power3.inOut'},start)
        .set(text,{autoAlpha:1},start+.6)
        .to(block,{scaleX:0,duration:.88,ease:'power4.inOut'},start+.66)
        .to(text,{xPercent:0,duration:1.02,ease:'power3.out'},start+.66);
    });
  }

  async function launch() {
    if(started)return;started=true;
    await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1800))]);
    setupMotion();
    const revealHero=()=>{
      root.classList.add('ready');document.body.classList.remove('loading');lenis?.start();
      animateHeroTitle();
      if(hasGSAP&&!reduced){gsap.from('.hero-artifact',{clipPath:'inset(100% 0 0 0)',duration:1.6,ease:'power4.inOut',delay:.12});gsap.from('.hero-intro,.hero-kicker,.hero-side-note',{y:20,opacity:0,duration:1,stagger:.1,delay:.4,ease:'power3.out'});}
      setTimeout(()=>{if(hasGSAP)ScrollTrigger.refresh();if(location.hash){const destination=$(location.hash);if(destination)scrollToTarget(destination,{immediate:true});}updateProgress();},200);
    };
    if(!hasGSAP||reduced||!$('.preloader')){ $('.preloader')?.remove();revealHero();return; }
    lenis?.stop();
    const paths=$$('.loader-emblem path');paths.forEach(path=>{const length=path.getTotalLength();gsap.set(path,{strokeDasharray:length,strokeDashoffset:length});});
    const count={value:0};const years=['1983','1991','1998','2012','PRESENT'];const logs=['INDEXING // THE FIRST PIXELS','LOADING // ANOTHER_WORLD_POLYGON_DATA','MAPPING // THE AUTEUR GENERATION','TRACING // WORLDS_WITHOUT_LIMITS','ARCHIVE READY // ENTER THE EXHIBITION'];
    const loadingDuration=4.2,curtainStart=loadingDuration+.15;
    const timeline=gsap.timeline();
    timeline
      .to(paths,{strokeDashoffset:0,duration:2.8,stagger:.1,ease:'power2.inOut'},0)
      .to(count,{value:100,duration:loadingDuration,ease:'power2.inOut',onUpdate:()=>{
        const n=Math.round(count.value),index=Math.min(4,Math.floor(n/22));
        $('.loader-count').textContent=`${String(n).padStart(3,'0')}%`;
        $('.loader-year').textContent=years[index];$('.loader-log').textContent=logs[index];
      }},0)
      .to('.loader-top,.loader-center,.loader-bottom',{opacity:0,y:-20,duration:.3,stagger:.04,ease:'power3.in'},loadingDuration+.05)
      .to('.loader-panels span',{scaleY:0,duration:.8,stagger:.04,ease:'power4.inOut'},curtainStart)
      .call(revealHero,null,curtainStart+.6)
      .set('.preloader',{display:'none'});
  }
  launch().catch(()=>{settleHeroTitle();$('.preloader')?.remove();root.classList.add('ready');document.body.classList.remove('loading');lenis?.start();});
  $('.motion-toggle').addEventListener('click',()=>{
    reduced=!reduced;motionOverride=reduced;
    try{localStorage.setItem('lart-motion',reduced?'reduce':'full');}catch{}
    applyMotionPreference();setupMotion();
  });
  reducedPreference.addEventListener('change',e=>{if(motionOverride===null){reduced=e.matches;applyMotionPreference();setupMotion();}});
  let resizeTimer,lastWidth=innerWidth;
  addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(Math.abs(innerWidth-lastWidth)<3)return;lastWidth=innerWidth;resizing=true;setupMotion();resizing=false;},250);},{passive:true});
})();
