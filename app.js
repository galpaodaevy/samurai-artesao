'use strict';
const works=JSON.parse(document.getElementById('works-data').textContent);
const collection=JSON.parse(document.getElementById('collection-data').textContent);
const gallery=document.getElementById('gallery');
const image=document.getElementById('gallery-image');
const thumbs=document.getElementById('gallery-thumbs');
let current=null,position=0,opener=null;
function showPhoto(index){
 if(!current)return;
 position=(index+current.photos.length)%current.photos.length;
 const photo=current.photos[position];if(photo.width&&photo.height){image.width=photo.width;image.height=photo.height;}image.src=photo.src;image.alt=`${current.title} — vista ${position+1} de ${current.photos.length}`;
 document.getElementById('gallery-counter').textContent=`${String(position+1).padStart(2,'0')} / ${String(current.photos.length).padStart(2,'0')}`;
 [...thumbs.children].forEach((b,i)=>b.setAttribute('aria-current',String(i===position)));
 const onlyOne=current.photos.length<2;document.getElementById('gallery-prev').disabled=onlyOne;document.getElementById('gallery-next').disabled=onlyOne;
}
function openGallery(work,trigger){
 if(!work)return;current=work;opener=trigger;
 document.getElementById('gallery-title').textContent=work.title;document.getElementById('gallery-series').textContent=work.series;document.getElementById('gallery-text').textContent=work.text;
 document.getElementById('gallery-details').replaceChildren(...work.details.map(text=>{const li=document.createElement('li');li.textContent=text;return li}));
 const quote=document.getElementById('gallery-quote');quote.textContent=work.quote||'';quote.hidden=!work.quote;
 for(const [id,url] of [['gallery-video',work.video],['gallery-post',work.post]]){const a=document.getElementById(id);a.hidden=!url;if(url)a.href=url;else a.removeAttribute('href')}
 thumbs.replaceChildren(...work.photos.map((photo,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Ver foto ${i+1} de ${work.title}`);const img=document.createElement('img');img.src=photo.thumb;img.alt='';img.loading='lazy';b.append(img);b.addEventListener('click',()=>showPhoto(i));return b}));
 showPhoto(0);gallery.showModal();document.body.classList.add('modal-open');gallery.scrollTop=0;
}
document.querySelectorAll('[data-work]').forEach(b=>b.addEventListener('click',()=>openGallery(works.find(w=>w.id===b.dataset.work),b)));
document.querySelectorAll('[data-collection]').forEach(b=>b.addEventListener('click',()=>openGallery(collection,b)));
document.querySelector('.gallery-close').addEventListener('click',()=>gallery.close());
document.getElementById('gallery-prev').addEventListener('click',()=>showPhoto(position-1));document.getElementById('gallery-next').addEventListener('click',()=>showPhoto(position+1));
gallery.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(position-1)}if(e.key==='ArrowRight'){e.preventDefault();showPhoto(position+1)}});
gallery.addEventListener('click',e=>{if(e.target===gallery){const r=gallery.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)gallery.close()}});
gallery.addEventListener('close',()=>{document.body.classList.remove('modal-open');opener?.focus();current=null});

// The dark theme is the default; remember only the visitor's explicit choice.
const themeButton=document.querySelector('.theme-toggle');
function syncTheme(){const day=document.documentElement.dataset.theme==='day';themeButton.setAttribute('aria-pressed',String(day));themeButton.setAttribute('aria-label',day?'Ativar modo noite':'Ativar modo dia');themeButton.querySelector('.theme-label').textContent=day?'Noite':'Dia';themeButton.querySelector('.theme-icon').textContent=day?'☾':'☀';document.querySelector('meta[name="theme-color"]').content=day?'#efe7cf':'#251b17'}
themeButton.addEventListener('click',()=>{const value=document.documentElement.dataset.theme==='night'?'day':'night';document.documentElement.dataset.theme=value;try{localStorage.setItem('samurai-theme',value)}catch(e){}syncTheme()});syncTheme();
const details=[{title:'Tem costura no portão.',text:'Um aviso escrito à mão revela que a casa também é lugar de trabalho. Uma história inteira em um pequeno papel.',position:'30% 50%',alt:'Ampliação do aviso de costura no portão'},{title:'A planta encontra um lugar.',text:'Perto da entrada, vasos e plantas ocupam pequenos espaços. O improviso também é um jeito de cuidar da casa.',position:'27% 33%',alt:'Ampliação das plantas e dos vasos junto à entrada'},{title:'Até o entulho conta.',text:'Madeira, restos de obra e sacos se acumulam na caçamba. Os materiais e as marcas de uso fazem parte da cena, como na rua.',position:'74% 72%',alt:'Ampliação da caçamba e seus pequenos materiais'}];
document.querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.detail),d=details[i];document.getElementById('detail-title').textContent=d.title;document.getElementById('detail-text').textContent=d.text;document.getElementById('detail-number').textContent='DETALHE '+String(i+1).padStart(2,'0')+' / 03';const zoom=document.getElementById('detail-zoom');zoom.style.backgroundPosition=d.position;zoom.setAttribute('aria-label',d.alt);document.querySelectorAll('[data-detail]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}));

// Mobile index is a disclosure menu: normal links remain usable by keyboard.
const menuToggle=document.querySelector('.menu-toggle');
const mobileMenu=document.getElementById('mobile-menu');
function setMobileMenu(open){mobileMenu.hidden=!open;menuToggle.setAttribute('aria-expanded',String(open));}
menuToggle.addEventListener('click',()=>setMobileMenu(mobileMenu.hidden));
mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMobileMenu(false)));
document.addEventListener('click',e=>{if(!mobileMenu.hidden&&!mobileMenu.contains(e.target)&&!menuToggle.contains(e.target))setMobileMenu(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mobileMenu.hidden){setMobileMenu(false);menuToggle.focus()}});
window.addEventListener('resize',()=>{if(window.innerWidth>900)setMobileMenu(false)});
// Swiping the photograph changes the view without blocking vertical scrolling or pinch zoom.
let galleryTouch=null;
image.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')galleryTouch={x:e.clientX,y:e.clientY}});
image.addEventListener('pointercancel',()=>{galleryTouch=null});
image.addEventListener('pointerup',e=>{if(!galleryTouch)return;const dx=e.clientX-galleryTouch.x,dy=e.clientY-galleryTouch.y;galleryTouch=null;if(Math.abs(dx)>=45&&Math.abs(dx)>Math.abs(dy)*1.4)showPhoto(position+(dx<0?1:-1))});
